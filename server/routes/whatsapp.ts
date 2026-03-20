import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';
import { authMiddleware } from '../auth.js';
import { sendEmail, bookingEmailHtml, saleEmailHtml, newLeadEmailHtml } from '../lib/email.js';

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function splitAndCleanResponse(text: string): string[] {
  const ROBOTIC = [
    /me alegra saber que[^.!?\n]*/gi,
    /gracias por tu (mensaje|consulta|pregunta)[^.!?\n]*/gi,
    /estimado(a)? cliente[^.!?\n]*/gi,
    /espero que est[eé]s (muy )?bien[^.!?\n]*/gi,
    /con (mucho )?gusto (te |le )?ayudo[^.!?\n]*/gi,
    /claro que sí[,.]?\s*/gi,
    /entiendo tu (consulta|pregunta|inquietud)[^.!?\n]*/gi,
    /por supuesto[,.]?\s*/gi,
  ];
  let clean = text;
  for (const re of ROBOTIC) clean = clean.replace(re, '');
  const parts = clean
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0);
  return parts.length > 0 ? parts : [clean.trim()];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getOpenAI(): OpenAI {
  const db = getDb();
  const row = db.prepare("SELECT value FROM global_settings WHERE key = 'openai_api_key'").get() as any;
  const key = row?.value || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('No hay clave de OpenAI configurada en el panel de administración.');
  return new OpenAI({ apiKey: key });
}

async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, to: string, message: string): Promise<string | null> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`WhatsApp API error: ${JSON.stringify(err)}`);
  }
  const data = await resp.json().catch(() => ({}));
  return data?.messages?.[0]?.id || null;
}

// Detect if the message contains scheduling/booking/cancellation intent
function hasSchedulingIntent(text: string): boolean {
  const keywords = [
    'agendar', 'agenda', 'agendame', 'agendemos', 'reservar', 'reserva', 'reservame',
    'cita', 'turno', 'hora', 'horario', 'disponibilidad', 'disponible',
    'cuando', 'cuándo', 'fecha', 'dia', 'día', 'semana',
    'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
    'mañana', 'pasado mañana', 'próxima semana', 'esta semana',
    'appointment', 'book', 'schedule', 'available',
    'puedo ir', 'puedo venir', 'quiero ir', 'quiero venir',
    'me anoto', 'me apunto', 'quiero una cita', 'quiero un turno',
    'cancelar', 'cancela', 'cancelame', 'cancélame', 'eliminar', 'elimina',
    'elimíname', 'borrar', 'borra', 'borrame', 'bórrame', 'quitar', 'quitame',
    'no puedo', 'no voy a poder', 'no voy a ir', 'no podré',
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function detectServerSideCancellation(text: string): boolean {
  const lower = text.toLowerCase();
  const cancelWords = ['cancelar','cancela','cancelame','cancélame','eliminar','elimina','elimíname','borrar','borra','borrame','bórrame','quitar','quitame','quítame'];
  const eventWords = ['cita','reunión','reunion','evento','turno','agendada','agendado','asesor','demo','hoy'];
  return cancelWords.some(w => lower.includes(w)) && eventWords.some(w => lower.includes(w));
}

async function deleteEventFromGoogle(userId: number, googleEventId: string): Promise<void> {
  try {
    const db = getDb();
    const tokenRow = db.prepare('SELECT * FROM google_calendar_tokens WHERE user_id = ?').get(userId) as any;
    if (!tokenRow) return;

    let accessToken: string = tokenRow.access_token;
    const expiry = tokenRow.expiry_date ? new Date(tokenRow.expiry_date).getTime() : 0;
    if (Date.now() >= expiry - 5 * 60 * 1000 && tokenRow.refresh_token) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
      });
      const refreshed = await refreshRes.json() as any;
      if (refreshed.access_token) {
        accessToken = refreshed.access_token;
        const newExpiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
        db.prepare('UPDATE google_calendar_tokens SET access_token = ?, expiry_date = ? WHERE user_id = ?')
          .run(accessToken, newExpiry, userId);
      } else return;
    }

    const calendarId = tokenRow.calendar_id || 'primary';
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    console.log(`[WhatsApp] Deleted from Google Calendar: ${googleEventId}`);
  } catch (err: any) {
    console.error('[WhatsApp] Error deleting from Google Calendar:', err.message);
  }
}

async function cancelCalendarEvent(userId: number, leadId: number): Promise<boolean> {
  try {
    const db = getDb();
    const events = db.prepare(
      'SELECT id, google_event_id FROM calendar_events WHERE user_id = ? AND lead_id = ?'
    ).all(userId, leadId) as any[];
    if (events.length === 0) return false;

    db.prepare('DELETE FROM calendar_events WHERE user_id = ? AND lead_id = ?').run(userId, leadId);

    for (const ev of events) {
      if (ev.google_event_id) {
        deleteEventFromGoogle(userId, ev.google_event_id).catch(() => {});
      }
    }
    return true;
  } catch (err: any) {
    console.error('[WhatsApp] Error cancelling calendar event:', err.message);
    return false;
  }
}

// Get upcoming available-looking slots from the user's calendar
function getCalendarContext(userId: number): string {
  const db = getDb();
  const now = new Date().toISOString();
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const existingEvents = db.prepare(`
    SELECT title, start_datetime, end_datetime, all_day
    FROM calendar_events
    WHERE user_id = ? AND start_datetime >= ? AND start_datetime <= ?
    ORDER BY start_datetime ASC
    LIMIT 20
  `).all(userId, now, twoWeeksLater) as any[];

  if (existingEvents.length === 0) {
    return `CALENDARIO COMPLETAMENTE LIBRE: No hay ninguna cita agendada en los próximos 14 días. Toda la disponibilidad está abierta — puedes confirmar CUALQUIER fecha y hora que el cliente pida.`;
  }

  const eventList = existingEvents.map((e: any) => {
    const start = new Date(e.start_datetime);
    const dateStr = start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = e.all_day ? 'Todo el día' : start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `- ${dateStr} a las ${timeStr}: ${e.title}`;
  }).join('\n');

  return `CALENDARIO (próximas citas ya agendadas, NO ofrecer estos horarios):
${eventList}

Usa esta información para saber qué horarios ya están ocupados y sugerir horarios disponibles.`;
}

async function getAIResponse(
  userId: number,
  messages: any[],
  knowledgeBase: string,
  includeCalendar: boolean,
  leadEmail?: string
): Promise<{ content: string; newStatus: string | null; saleDetected: boolean; humanRequested: boolean; bookingDetected: boolean; bookingData: any; cancellationDetected: boolean; capturedEmail: string | null }> {
  const openai = getOpenAI();

  const calendarContext = includeCalendar ? getCalendarContext(userId) : '';

  const schedulingInstructions = includeCalendar ? `

CAPACIDAD DE AGENDAMIENTO:
- Si el cliente quiere agendar una cita, consulta el calendario y ofrece horarios disponibles.
- En cuanto el cliente CONFIRME una fecha y hora (aunque sea con "sí", "me parece", "dale", "perfecto" después de haber acordado hora), DEBES incluir en tu respuesta:
  CITA_AGENDADA:{"titulo":"[nombre del servicio o motivo]","fecha":"YYYY-MM-DD","hora_inicio":"HH:MM","hora_fin":"HH:MM","descripcion":"[detalles]"}
- IMPORTANTE: Si en esta conversación ya se acordó una hora y el cliente acaba de confirmar, emite el tag CITA_AGENDADA AHORA, no en el siguiente mensaje.
- La fecha "mañana" es ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}.
- Después del JSON confirma la cita naturalmente (ej: "¡Listo! Te esperamos mañana 🗓️").
- CANCELACIÓN: Si el cliente pide cancelar, eliminar, borrar o quitar su cita, incluye exactamente CITA_CANCELADA: en tu respuesta (sin JSON adicional). Luego confirma la cancelación de forma natural y ofrece reagendar.

${calendarContext}` : '';

  const systemInstruction = `Eres un agente de ventas IA por WhatsApp. Tu objetivo es CERRAR VENTAS y AGENDAR CITAS.

ESTILO DE RESPUESTA (MUY IMPORTANTE):
- Escribe como una persona real en WhatsApp: mensajes cortos y directos.
- Si necesitas decir varias cosas, sepáralas con una línea en blanco (\\n\\n) — el sistema las enviará como mensajes distintos.
- Máximo 2 líneas por bloque de texto.
- Máximo 1 pregunta por respuesta.
- NUNCA uses frases como "Me alegra saber que...", "Gracias por tu mensaje", "Estimado cliente", "Con gusto te ayudo".
- Usa lenguaje natural y cercano. Emojis ocasionales.

REGLAS:
- Responde ÚNICAMENTE con información de la base de conocimientos.
- Si no tienes la info, pregunta: "No tengo esa info. ¿Te puedo ayudar con otra cosa?"
- NUNCA inventes precios, servicios o datos.

DERIVAR A HUMANO:
- Solo si el usuario pide EXPLÍCITAMENTE hablar con una persona real, incluye exactamente "DERIVAR_HUMANO:" al inicio de tu respuesta.
- NO lo uses por no saber un dato. Solo cuando el usuario lo exija explícitamente.

CAPTURA DE EMAIL:
- Si el usuario menciona o te da su email en cualquier momento, extráelo y agrega al FINAL de tu respuesta: EMAIL_CAPTURADO:correo@ejemplo.com
${leadEmail
  ? `- El cliente ya tiene email registrado (${leadEmail}). NO vuelvas a pedirlo.`
  : `- Cuando confirmes una CITA o cierre de VENTA, DEBES pedir el email EN ESE MISMO MENSAJE. Ejemplo: "¡Listo, cita confirmada! 🗓️\\n\\n¿Me das tu correo para enviarte la confirmación?"
- Solo pide el email UNA VEZ. Si ya lo has pedido antes en la conversación, no lo repitas.`}

ESTRATEGIA DE CIERRE:
- Detecta interés real y propón el cierre directamente.
- Si el usuario acepta la compra, incluye "VENTA_CERRADA:" en tu respuesta.

CLASIFICACIÓN (incluye al inicio de CADA respuesta, obligatorio):
[ESTADO:Nuevo] → primer mensaje, no ha mostrado interés claro todavía.
[ESTADO:Calificado] → mostró interés en el producto o servicio, preguntó información.
[ESTADO:En Negociación] → preguntó precio/condiciones, agendó una visita o cita, o está decidiendo activamente.
[ESTADO:Cerrado Ganado] → confirmó la compra o el pago.
[ESTADO:Cerrado Perdido] → dijo que NO quiere, rechazó la oferta o se despidió definitivamente.
REGLA CLAVE: Si el cliente agendó una cita o visita → siempre [ESTADO:En Negociación].
${schedulingInstructions}

BASE DE CONOCIMIENTOS:
${knowledgeBase || 'Sin base de conocimientos configurada.'}
${includeCalendar ? `
⚠️ INSTRUCCIÓN CRÍTICA (PRIORIDAD MÁXIMA):
- Si en este turno el cliente confirmó una fecha/hora → emite CITA_AGENDADA:{...} OBLIGATORIAMENTE.
- Junto con CITA_AGENDADA, ${leadEmail ? `NO pidas el email (ya lo tienes: ${leadEmail}).` : `pide el email: "¿Me das tu correo para enviarte la confirmación?"`}
` : ''}`;

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemInstruction },
    ...messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    } as OpenAI.Chat.ChatCompletionMessageParam)),
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: chatMessages,
    temperature: 0.2,
  });

  const raw = response.choices[0]?.message?.content || '';

  // Extract lead status tag
  const stateMatch = raw.match(/\[ESTADO:(.+?)\]/);
  let newStatus: string | null = stateMatch ? stateMatch[1].trim() : null;
  let content = raw.replace(/\[ESTADO:[^\]]+\]/g, '').trim();

  // Detect sale
  const saleDetected = content.includes('VENTA_CERRADA:');
  if (saleDetected) {
    newStatus = 'Cerrado Ganado';
    content = content.replace('VENTA_CERRADA:', '').trim();
  }

  // Detect human handoff request
  const humanRequested = content.includes('DERIVAR_HUMANO:');
  if (humanRequested) {
    content = content.replace('DERIVAR_HUMANO:', '').trim();
  }

  // Detect booking — robust brace-matching parser
  let bookingDetected = false;
  let bookingData: any = null;
  const markerIdx = content.indexOf('CITA_AGENDADA:');
  if (markerIdx !== -1) {
    const jsonStart = content.indexOf('{', markerIdx);
    if (jsonStart !== -1) {
      let depth = 0, jsonEnd = -1;
      for (let i = jsonStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
      }
      if (jsonEnd !== -1) {
        try {
          bookingData = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
          bookingDetected = true;
          content = (content.slice(0, markerIdx) + content.slice(jsonEnd + 1)).replace(/\s+/g, ' ').trim();
        } catch (_) { /* keep content as-is */ }
      }
    }
  }

  // Detect cancellation: AI marker OR server-side keyword fallback
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
  const aiSaidCancel = content.includes('CITA_CANCELADA:');
  const serverDetectedCancel = lastUserMsg ? detectServerSideCancellation(lastUserMsg.content || '') : false;
  const cancellationDetected = aiSaidCancel || serverDetectedCancel;
  if (aiSaidCancel) content = content.replace('CITA_CANCELADA:', '').trim();

  // Capture email if AI extracted one
  let capturedEmail: string | null = null;
  const emailMatch = content.match(/EMAIL_CAPTURADO:([^\s\n]+)/);
  if (emailMatch) {
    const candidate = emailMatch[1].trim().replace(/[.,;]$/, '');
    if (candidate.includes('@')) capturedEmail = candidate;
    content = content.replace(/EMAIL_CAPTURADO:[^\s\n]+/, '').trim();
  }

  // If after stripping all markers the response is empty, add a fallback
  if (!content.trim() && bookingDetected && bookingData) {
    content = `¡Listo! Te esperamos el ${bookingData.fecha} a las ${bookingData.hora_inicio} 🗓️`;
  } else if (!content.trim()) {
    content = 'Entendido 👍';
  }

  return { content, newStatus, saleDetected, humanRequested, bookingDetected, bookingData, cancellationDetected, capturedEmail };
}

// Create a calendar event from booking data and push to Google Calendar
async function createCalendarEventFromBooking(userId: number, leadName: string, bookingData: any, leadId: number): Promise<boolean> {
  try {
    const db = getDb();
    const startDt = `${bookingData.fecha}T${bookingData.hora_inicio}:00`;
    const endDt = `${bookingData.fecha}T${(bookingData.hora_fin || bookingData.hora_inicio)}:00`;

    // Prevent duplicate: skip if this lead already has an event at the same start time
    const dup = db.prepare('SELECT id FROM calendar_events WHERE user_id = ? AND lead_id = ? AND start_datetime = ?').get(userId, leadId, startDt);
    if (dup) {
      console.log(`[WhatsApp] Skipping duplicate calendar event for lead ${leadId} at ${startDt}`);
      return false;
    }

    // Prevent slot conflict: skip if ANY lead already has an event at this time for this user
    const conflict = db.prepare('SELECT id FROM calendar_events WHERE user_id = ? AND start_datetime = ?').get(userId, startDt);
    if (conflict) {
      console.log(`[WhatsApp] Slot ${startDt} already occupied for user ${userId}, skipping`);
      return false;
    }

    const insertResult = db.prepare(`
      INSERT INTO calendar_events (user_id, title, description, start_datetime, end_datetime, all_day, type, color, lead_id, location)
      VALUES (?, ?, ?, ?, ?, 0, 'appointment', '#ec4899', ?, '')
    `).run(
      userId,
      bookingData.titulo || `Cita con ${leadName}`,
      bookingData.descripcion || `Cita agendada automáticamente por Sellia para ${leadName}`,
      startDt,
      endDt,
      leadId
    );

    const insertId = insertResult.lastInsertRowid;

    // Push to Google Calendar if user has a connected token
    try {
      const tokenRow = db.prepare('SELECT * FROM google_calendar_tokens WHERE user_id = ?').get(userId) as any;
      if (tokenRow) {
        let accessToken: string = tokenRow.access_token;
        const expiry = tokenRow.expiry_date ? new Date(tokenRow.expiry_date).getTime() : 0;
        if (Date.now() >= expiry - 5 * 60 * 1000 && tokenRow.refresh_token) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              refresh_token: tokenRow.refresh_token,
              grant_type: 'refresh_token',
            }).toString(),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json() as any;
            accessToken = refreshData.access_token;
            const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();
            db.prepare('UPDATE google_calendar_tokens SET access_token = ?, expiry_date = ? WHERE user_id = ?')
              .run(accessToken, newExpiry, userId);
          }
        }

        const calendarId = tokenRow.calendar_id || 'primary';
        const gcalRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: bookingData.titulo || `Cita con ${leadName}`,
            description: bookingData.descripcion || '',
            start: { dateTime: startDt, timeZone: 'America/Santiago' },
            end: { dateTime: endDt, timeZone: 'America/Santiago' },
          }),
        });

        if (gcalRes.ok) {
          const gcalData = await gcalRes.json() as any;
          if (gcalData.id) {
            db.prepare('UPDATE calendar_events SET google_event_id = ? WHERE id = ?').run(gcalData.id, insertId);
            console.log(`[WhatsApp] Event pushed to Google Calendar: ${gcalData.id}`);
          }
        } else {
          console.warn('[WhatsApp] Google Calendar push failed:', await gcalRes.text());
        }
      }
    } catch (gcalErr: any) {
      console.error('[WhatsApp] Error pushing to Google Calendar:', gcalErr.message);
    }
    return true;
  } catch (err: any) {
    console.error('[WhatsApp] Error creating calendar event:', err.message);
    return false;
  }
}

// ─── Notification helpers ────────────────────────────────────────────────────

function notifySuperAdmins(db: any, type: string, title: string, message: string) {
  try {
    const admins = db.prepare("SELECT id FROM users WHERE role = 'superadmin'").all() as any[];
    const stmt = db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)');
    for (const a of admins) stmt.run(a.id, type, title, message);
  } catch (_) {}
}

// ─── PUBLIC WEBHOOK (no auth) ────────────────────────────────────────────────

// GET /api/webhooks/whatsapp — Meta verification challenge
router.get('/webhooks/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe') {
    const db = getDb();
    const globalToken = process.env.WA_VERIFY_TOKEN || 'sellia_wh_verify';
    const configs = db.prepare('SELECT verify_token FROM whatsapp_configs WHERE enabled = 1').all() as any[];
    const validTokens = new Set([globalToken, ...configs.map((c: any) => c.verify_token)]);

    if (validTokens.has(String(token))) {
      console.log('[WhatsApp] Webhook verified ✓');
      res.status(200).send(challenge);
      return;
    }
  }
  console.warn('[WhatsApp] Webhook verification failed. Token:', token);
  res.status(403).send('Forbidden');
});

// POST /api/webhooks/whatsapp — Receive messages from Meta
router.post('/webhooks/whatsapp', async (req: Request, res: Response) => {
  // Always acknowledge immediately (Meta requires 200 within 5s)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        const phoneNumberId: string = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const db = getDb();
        const config = db.prepare('SELECT * FROM whatsapp_configs WHERE phone_number_id = ? AND enabled = 1').get(phoneNumberId) as any;
        if (!config) {
          console.warn(`[WhatsApp] No config found for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        const userId: number = config.user_id;

        for (const msg of value?.messages || []) {
          if (msg.type !== 'text') continue;
          const fromPhone: string = msg.from;
          const messageText: string = msg.text?.body || '';

          console.log(`[WhatsApp] ← ${fromPhone}: ${messageText} (user ${userId})`);

          // Find or create lead
          let lead = db.prepare('SELECT * FROM leads WHERE user_id = ? AND phone_number = ?').get(userId, fromPhone) as any;
          if (!lead) {
            const displayName = value?.contacts?.[0]?.profile?.name || `WhatsApp +${fromPhone}`;
            const insertResult = db.prepare(
              'INSERT INTO leads (user_id, name, company, channel, status, score, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).run(userId, displayName, '', 'WhatsApp', 'Nuevo', 0, fromPhone);
            const newLeadId = insertResult.lastInsertRowid as number;
            db.prepare('INSERT INTO lead_insights (lead_id) VALUES (?)').run(newLeadId);
            lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(newLeadId);

            db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
              userId, 'lead', '📱 Nuevo Lead por WhatsApp',
              `${displayName} inició una conversación desde WhatsApp.`
            );

            // Email al admin si tiene pref new_leads_email activada
            const prefs = db.prepare('SELECT * FROM notification_prefs WHERE user_id = ?').get(userId) as any;
            const notifyEmail = prefs?.notify_email;
            if (notifyEmail && prefs?.new_leads_email) {
              sendEmail(notifyEmail, `📱 Nuevo Lead: ${displayName}`,
                newLeadEmailHtml({ leadName: displayName, phone: fromPhone, channel: 'WhatsApp' })
              ).catch(() => {});
            }
            // Notify all superadmins
            notifySuperAdmins(db, 'lead', '📱 Nuevo Lead por WhatsApp', `${displayName} inició conversación desde WhatsApp (usuario ${userId}).`);
          }

          // Save incoming message
          db.prepare('INSERT INTO messages (lead_id, role, content) VALUES (?, ?, ?)').run(lead.id, 'user', messageText);

          // Skip AI if human_mode
          if (lead.human_mode) {
            db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
              userId, 'message', `💬 Mensaje de ${lead.name}`,
              `"${messageText.substring(0, 80)}${messageText.length > 80 ? '...' : ''}" — requiere atención manual.`
            );
            continue;
          }

          // Get full conversation history
          const history = db.prepare(
            'SELECT role, content FROM messages WHERE lead_id = ? ORDER BY created_at ASC'
          ).all(lead.id) as any[];

          // Get knowledge base
          const kbRow = db.prepare('SELECT content FROM knowledge_base WHERE user_id = ?').get(userId) as any;
          const kb = kbRow?.content || '';

          // Check if any recent message (current or history) has scheduling context
          const recentMessages = [...history.slice(-8), { role: 'user', content: messageText }];
          const needsCalendar = recentMessages.some((m: any) => hasSchedulingIntent(m.content || ''));

          // Generate AI response
          let aiContent = '';
          let newStatus: string | null = null;
          let saleDetected = false;
          let humanRequested = false;
          let bookingDetected = false;
          let bookingData: any = null;
          let cancellationDetected = false;
          let capturedEmail: string | null = null;

          try {
            const currentLeadEmail = (db.prepare('SELECT email FROM leads WHERE id = ?').get(lead.id) as any)?.email || '';
            const result = await getAIResponse(userId, history, kb, needsCalendar, currentLeadEmail || undefined);
            aiContent = result.content;
            newStatus = result.newStatus;
            saleDetected = result.saleDetected;
            humanRequested = result.humanRequested;
            bookingDetected = result.bookingDetected;
            bookingData = result.bookingData;
            cancellationDetected = result.cancellationDetected;
            capturedEmail = result.capturedEmail;
          } catch (aiErr: any) {
            console.error('[WhatsApp] AI error:', aiErr.message);
            aiContent = 'Disculpa, tuve un problema técnico. Enseguida te atiende alguien.';
            humanRequested = true;
          }

          // Split response into WhatsApp-style parts (filter empty strings)
          const parts = splitAndCleanResponse(aiContent).filter((p: string) => p.trim().length > 0);

          // Save each part as a separate message
          for (const part of parts) {
            db.prepare('INSERT INTO messages (lead_id, role, content) VALUES (?, ?, ?)').run(lead.id, 'assistant', part);
          }

          // If a booking was made, ensure status is at least "En Negociación"
          if (bookingData && (!newStatus || newStatus === 'Nuevo' || newStatus === 'Calificado')) {
            newStatus = 'En Negociación';
          }
          // Update lead status
          if (newStatus && newStatus !== 'Nuevo') {
            db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(newStatus, lead.id);
          }

          // Fetch admin notification prefs once for this user
          const adminPrefs = db.prepare('SELECT * FROM notification_prefs WHERE user_id = ?').get(userId) as any;
          const adminEmail = adminPrefs?.notify_email || '';

          // Save captured email from AI to lead profile (only if not already set)
          let emailJustCaptured = false;
          if (capturedEmail) {
            const currentLead = db.prepare('SELECT email FROM leads WHERE id = ?').get(lead.id) as any;
            if (!currentLead?.email) {
              db.prepare('UPDATE leads SET email = ? WHERE id = ?').run(capturedEmail, lead.id);
              lead = { ...lead, email: capturedEmail };
              emailJustCaptured = true;
              console.log(`[WhatsApp] Email captured for lead ${lead.id}: ${capturedEmail}`);
            }
          }

          // Always read lead email fresh from DB (after potential save above)
          const leadEmail = (db.prepare('SELECT email FROM leads WHERE id = ?').get(lead.id) as any)?.email || '';

          // Handle sale detected
          if (saleDetected) {
            db.prepare("UPDATE leads SET status = 'Cerrado Ganado', score = 100 WHERE id = ?").run(lead.id);
            db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
              userId, 'success', '🎉 ¡Venta Cerrada por WhatsApp!',
              `El agente IA cerró una venta con ${lead.name} (WhatsApp +${fromPhone}).`
            );
            notifySuperAdmins(db, 'success', '🎉 Venta Cerrada', `IA cerró venta con ${lead.name} (+${fromPhone}) — usuario ${userId}.`);
            if (adminEmail && adminPrefs?.sale_email) {
              sendEmail(adminEmail, `🎉 Venta cerrada con ${lead.name}`,
                saleEmailHtml({ leadName: lead.name, phone: fromPhone, forAdmin: true })
              ).catch(() => {});
            }
            if (leadEmail) {
              sendEmail(leadEmail, `¡Gracias por tu compra, ${lead.name}!`,
                saleEmailHtml({ leadName: lead.name, phone: fromPhone, forAdmin: false })
              ).catch(() => {});
            }
          } else if (newStatus === 'Cerrado Perdido') {
            db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
              userId, 'alert', '❌ Lead perdido',
              `${lead.name} rechazó la oferta o se despidió (WhatsApp +${fromPhone}).`
            );
          } else if (humanRequested) {
            db.prepare('UPDATE leads SET human_mode = 1 WHERE id = ?').run(lead.id);
            db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
              userId, 'alert', '👤 Atención humana solicitada',
              `${lead.name} quiere hablar con una persona (WhatsApp +${fromPhone}).`
            );
          }

          // Handle booking detected — create calendar event automatically
          if (bookingDetected && bookingData) {
            const eventCreated = await createCalendarEventFromBooking(userId, lead.name, bookingData, lead.id);
            if (eventCreated) {
              // Only notify/email once when event is first created
              db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
                userId, 'success', '📅 Cita Agendada por Sellia',
                `Sellia agendó una cita con ${lead.name} para el ${bookingData.fecha} a las ${bookingData.hora_inicio}.`
              );
              notifySuperAdmins(db, 'success', '📅 Cita Agendada', `IA agendó cita con ${lead.name} (+${fromPhone}) para ${bookingData.fecha} a las ${bookingData.hora_inicio}.`);
              if (adminEmail && adminPrefs?.booking_email) {
                sendEmail(adminEmail, `📅 Nueva cita agendada: ${lead.name}`,
                  bookingEmailHtml({
                    leadName: lead.name, fecha: bookingData.fecha, horaInicio: bookingData.hora_inicio,
                    titulo: bookingData.titulo || `Cita con ${lead.name}`, descripcion: bookingData.descripcion, forAdmin: true,
                  })
                ).catch(() => {});
              }
              // Send lead confirmation email if we already have it
              if (leadEmail) {
                sendEmail(leadEmail, `✅ Cita confirmada: ${bookingData.titulo || `Cita con ${lead.name}`}`,
                  bookingEmailHtml({
                    leadName: lead.name, fecha: bookingData.fecha, horaInicio: bookingData.hora_inicio,
                    titulo: bookingData.titulo || `Tu cita`, descripcion: bookingData.descripcion, forAdmin: false,
                  })
                ).catch(() => {});
              }
              console.log(`[WhatsApp] Booking created for lead ${lead.id}: ${bookingData.titulo} on ${bookingData.fecha}`);
            }
          }

          // If email was JUST captured and lead already has a calendar booking, send the confirmation email now
          if (emailJustCaptured && leadEmail) {
            const existingBooking = db.prepare(
              'SELECT title, start_datetime FROM calendar_events WHERE user_id = ? AND lead_id = ? ORDER BY start_datetime ASC LIMIT 1'
            ).get(userId, lead.id) as any;
            if (existingBooking && !bookingDetected) {
              const fecha = existingBooking.start_datetime.split('T')[0];
              const hora = existingBooking.start_datetime.split('T')[1]?.substring(0, 5) || '';
              sendEmail(leadEmail, `✅ Cita confirmada: ${existingBooking.title}`,
                bookingEmailHtml({
                  leadName: lead.name, fecha, horaInicio: hora,
                  titulo: existingBooking.title, forAdmin: false,
                })
              ).catch(() => {});
              console.log(`[WhatsApp] Retroactive booking email sent to ${leadEmail} for lead ${lead.id}`);
            }
          }

          // Handle cancellation detected — delete calendar event
          if (cancellationDetected) {
            const deleted = await cancelCalendarEvent(userId, lead.id);
            if (deleted) {
              db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
                userId, 'message', '🗑️ Cita cancelada',
                `${lead.name} canceló su cita (WhatsApp +${fromPhone}).`
              );
              console.log(`[WhatsApp] Calendar event cancelled for lead ${lead.id}`);
            }
          }

          // Send each part to WhatsApp with human-like delay
          for (let i = 0; i < parts.length; i++) {
            if (i > 0) await sleep(1000 + Math.random() * 1000);
            try {
              await sendWhatsAppMessage(phoneNumberId, config.access_token, fromPhone, parts[i]);
              console.log(`[WhatsApp] → ${fromPhone} (${i + 1}/${parts.length}): ${parts[i].substring(0, 60)}`);
            } catch (sendErr: any) {
              console.error('[WhatsApp] Send error:', sendErr.message);
            }
          }
        }

        // Update message delivery/read status
        for (const status of value?.statuses || []) {
          const { id: waMsgId, status: waStatus } = status;
          console.log(`[WhatsApp] Status update: ${waMsgId} → ${waStatus}`);
          if (waMsgId && (waStatus === 'delivered' || waStatus === 'read')) {
            db.prepare("UPDATE messages SET wa_status = ? WHERE wa_message_id = ?").run(waStatus, waMsgId);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp] Webhook processing error:', err);
  }
});

// ─── PROTECTED CONFIG ROUTES (auth required) ─────────────────────────────────

// GET /api/whatsapp/config
router.get('/whatsapp/config', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const config = db.prepare('SELECT * FROM whatsapp_configs WHERE user_id = ?').get(req.userId) as any;
    if (!config) {
      res.json({ connected: false });
      return;
    }
    res.json({
      connected: !!config.enabled,
      phoneNumberId: config.phone_number_id,
      businessAccountId: config.business_account_id,
      displayName: config.display_name,
      verifyToken: config.verify_token,
      hasToken: !!config.access_token,
      tokenPreview: config.access_token ? config.access_token.substring(0, 12) + '...' : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// PUT /api/whatsapp/config
router.put('/whatsapp/config', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumberId, accessToken, businessAccountId, displayName, verifyToken } = req.body;
    if (!phoneNumberId || !accessToken) {
      res.status(400).json({ error: 'Phone Number ID y Access Token son obligatorios.' });
      return;
    }

    const db = getDb();
    const vToken = verifyToken?.trim() || `sellia_${req.userId}_wh`;
    const existing = db.prepare('SELECT id FROM whatsapp_configs WHERE user_id = ?').get(req.userId);

    if (existing) {
      db.prepare(`
        UPDATE whatsapp_configs SET
          phone_number_id = ?, access_token = ?, business_account_id = ?,
          display_name = ?, verify_token = ?, enabled = 1
        WHERE user_id = ?
      `).run(phoneNumberId.trim(), accessToken.trim(), businessAccountId?.trim() || '', displayName?.trim() || '', vToken, req.userId);
    } else {
      db.prepare(`
        INSERT INTO whatsapp_configs (user_id, phone_number_id, access_token, business_account_id, display_name, verify_token, enabled)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(req.userId, phoneNumberId.trim(), accessToken.trim(), businessAccountId?.trim() || '', displayName?.trim() || '', vToken);
    }

    db.prepare("UPDATE integrations SET status = 'connected' WHERE user_id = ? AND name LIKE '%WhatsApp%'").run(req.userId);
    res.json({ success: true, verifyToken: vToken });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// DELETE /api/whatsapp/config
router.delete('/whatsapp/config', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('UPDATE whatsapp_configs SET enabled = 0 WHERE user_id = ?').run(req.userId);
    db.prepare("UPDATE integrations SET status = 'disconnected' WHERE user_id = ? AND name LIKE '%WhatsApp%'").run(req.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// POST /api/whatsapp/send — operator sends a message manually to a lead
router.post('/whatsapp/send', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, content } = req.body;
    if (!leadId || !content) {
      res.status(400).json({ error: 'leadId y content son obligatorios' });
      return;
    }
    const db = getDb();

    // Find lead (admin can send on behalf of any client)
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead?.phone_number) {
      res.status(404).json({ error: 'Lead sin número de teléfono.' });
      return;
    }

    // Use the WhatsApp config of the lead's owner (not necessarily the logged-in user)
    const config = db.prepare('SELECT * FROM whatsapp_configs WHERE user_id = ? AND enabled = 1').get(lead.user_id) as any;
    if (!config) {
      res.status(404).json({ error: 'No hay configuración de WhatsApp activa para este cliente.' });
      return;
    }

    const waMessageId = await sendWhatsAppMessage(config.phone_number_id, config.access_token, lead.phone_number, content);
    db.prepare('INSERT INTO messages (lead_id, role, content, source, wa_message_id, wa_status) VALUES (?, ?, ?, ?, ?, ?)').run(leadId, 'assistant', content, 'human', waMessageId, 'sent');
    db.prepare("UPDATE leads SET updated_at = datetime('now') WHERE id = ?").run(leadId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al enviar: ' + error.message });
  }
});

// POST /api/whatsapp/test
router.post('/whatsapp/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) {
      res.status(400).json({ error: 'Número de teléfono destino requerido (formato: 5491155556666)' });
      return;
    }
    const db = getDb();
    const config = db.prepare('SELECT * FROM whatsapp_configs WHERE user_id = ? AND enabled = 1').get(req.userId) as any;
    if (!config) {
      res.status(404).json({ error: 'No hay configuración de WhatsApp activa. Configura tu número primero.' });
      return;
    }

    await sendWhatsAppMessage(
      config.phone_number_id,
      config.access_token,
      to.replace(/\D/g, ''),
      '✅ Conexión exitosa con Sellia. Tu asistente de ventas IA está activo y listo para responder y agendar citas.'
    );
    res.json({ success: true, message: 'Mensaje de prueba enviado correctamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al enviar: ' + error.message });
  }
});

export default router;
