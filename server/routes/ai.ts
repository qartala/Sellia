import { Router, Response } from 'express';
import OpenAI from 'openai';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';
import { sendEmail, bookingEmailHtml, collectionPlanEmailHtml } from '../lib/email.js';
import { sendPlanCreatedNotification } from '../lib/collectionScheduler.js';

const router = Router();

// Split AI response into WhatsApp-style short messages and remove robotic phrases
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

// ─── Calendar helpers ────────────────────────────────────────────────────────

function hasSchedulingIntent(text: string): boolean {
  const keywords = ['agendar','agenda','agendame','agendemos','reservar','reserva','cita',
    'turno','hora','horario','disponibilidad','disponible','cuando','cuándo','fecha',
    'mañana','pasado mañana','semana','lunes','martes','miércoles','jueves','viernes','sábado','domingo',
    'visita','reunión','reunion','citas','appointment','programar','coordinar',
    'cancelar','cancela','cancelame','eliminar','elimina','borrar','borra','no puedo','no voy a poder','no voy'];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function conversationHasSchedulingContext(messages: any[]): boolean {
  // Check last 8 messages (both user and assistant) for scheduling discussion
  const recent = messages.slice(-8);
  return recent.some((m: any) => hasSchedulingIntent(m.content || ''));
}

function getCalendarContext(userId: number): string {
  const db = getDb();
  const now = new Date().toISOString();
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const events = db.prepare(`
    SELECT title, start_datetime, end_datetime, all_day FROM calendar_events
    WHERE user_id = ? AND start_datetime >= ? AND start_datetime <= ?
    ORDER BY start_datetime ASC LIMIT 20
  `).all(userId, now, twoWeeksLater) as any[];
  if (events.length === 0) return 'CALENDARIO COMPLETAMENTE LIBRE: No hay ninguna cita agendada en los próximos 14 días. Toda la disponibilidad está abierta — puedes confirmar CUALQUIER fecha y hora que el cliente pida.';
  const list = events.map((e: any) => {
    const start = new Date(e.start_datetime);
    const dateStr = start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = e.all_day ? 'Todo el día' : start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `- ${dateStr} a las ${timeStr}: ${e.title}`;
  }).join('\n');
  return `CALENDARIO (citas ya ocupadas — NO ofrecer estos horarios):\n${list}`;
}

async function cancelCalendarEvent(userId: number, leadId: number): Promise<boolean> {
  try {
    const db = getDb();
    // Get google_event_id before deleting
    const events = db.prepare(
      'SELECT id, google_event_id FROM calendar_events WHERE user_id = ? AND lead_id = ?'
    ).all(userId, leadId) as any[];
    if (events.length === 0) return false;

    db.prepare('DELETE FROM calendar_events WHERE user_id = ? AND lead_id = ?').run(userId, leadId);

    // Delete from Google Calendar in background
    for (const ev of events) {
      if (ev.google_event_id) {
        deleteEventFromGoogle(userId, ev.google_event_id).catch(() => {});
      }
    }
    return true;
  } catch (err: any) {
    console.error('[AI] Error deleting calendar event:', err.message);
    return false;
  }
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
    console.log(`[AI] Deleted from Google Calendar: ${googleEventId}`);
  } catch (err: any) {
    console.error('[AI] Error deleting from Google Calendar:', err.message);
  }
}

function leadHasCalendarEvents(userId: number, leadId: number): boolean {
  try {
    const db = getDb();
    const row = db.prepare('SELECT id FROM calendar_events WHERE user_id = ? AND lead_id = ? LIMIT 1').get(userId, leadId);
    return !!row;
  } catch { return false; }
}

function detectServerSideCancellation(messages: any[]): boolean {
  const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
  if (!lastUser) return false;
  const text = (lastUser.content || '').toLowerCase();
  const cancelWords = ['cancelar','cancela','cancelame','cancélame','eliminar','elimina','elimíname','borrar','borra','borrame','bórrame','quitar','quitame','quítame'];
  const eventWords = ['cita','reunión','reunion','evento','turno','agendada','agendado','asesor','demo','hoy'];
  return cancelWords.some(w => text.includes(w)) && eventWords.some(w => text.includes(w));
}

// Extractor for PLAN_COBRANZA: marker
function extractColPlanData(text: string): { colPlanData: any; cleanText: string } {
  const marker = 'PLAN_COBRANZA:';
  const idx = text.indexOf(marker);
  if (idx === -1) return { colPlanData: null, cleanText: text };
  const jsonStart = text.indexOf('{', idx);
  if (jsonStart === -1) return { colPlanData: null, cleanText: text };
  let depth = 0, jsonEnd = -1;
  for (let i = jsonStart; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
  }
  if (jsonEnd === -1) return { colPlanData: null, cleanText: text };
  try {
    const colPlanData = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const cleanText = (text.slice(0, idx) + text.slice(jsonEnd + 1)).replace(/\s+/g, ' ').trim();
    return { colPlanData, cleanText };
  } catch { return { colPlanData: null, cleanText: text }; }
}

function autoCreateCollectionPlan(userId: number, leadId: number, leadName: string, leadPhone: string, colPlanData: any): void {
  try {
    const db = getDb();
    // Avoid duplicates: if a plan already exists for this lead, skip
    const existing = db.prepare('SELECT id FROM payment_plans WHERE user_id = ? AND lead_id = ?').get(userId, leadId);
    if (existing) { console.log(`[AI] Collection plan already exists for lead ${leadId}, skipping`); return; }

    const count = parseInt(colPlanData.cuotas, 10) || 2;
    const total = parseFloat(colPlanData.monto_total) || 0;
    const amountPerInstallment = parseFloat((total / count).toFixed(2));
    const startDate = colPlanData.fecha_inicio || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const result = db.prepare(`
      INSERT INTO payment_plans (user_id, lead_id, name, debtor_name, debtor_phone, total_amount, installments_count, payment_link, bank_info, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, '', '', 'Plan creado automáticamente por Sellia IA')
    `).run(userId, leadId, `Plan – ${leadName}`, leadName, leadPhone || '', total, count);

    const planId = result.lastInsertRowid as number;
    const installStmt = db.prepare(`INSERT INTO payment_installments (plan_id, installment_number, amount, due_date) VALUES (?, ?, ?, ?)`);
    for (let i = 0; i < count; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + i * 30);
      installStmt.run(planId, i + 1, amountPerInstallment, dueDate.toISOString().split('T')[0]);
    }
    console.log(`[AI] Auto-created collection plan ${planId} for lead ${leadId}: ${count} cuotas de $${amountPerInstallment}`);
  } catch (err: any) {
    console.error('[AI] Error auto-creating collection plan:', err.message);
  }
}

// Robust JSON extractor for CITA_AGENDADA: marker
function extractBookingData(text: string): { bookingData: any; cleanText: string } {
  const marker = 'CITA_AGENDADA:';
  const idx = text.indexOf(marker);
  if (idx === -1) return { bookingData: null, cleanText: text };
  const jsonStart = text.indexOf('{', idx);
  if (jsonStart === -1) return { bookingData: null, cleanText: text };
  let depth = 0, jsonEnd = -1;
  for (let i = jsonStart; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
  }
  if (jsonEnd === -1) return { bookingData: null, cleanText: text };
  try {
    const bookingData = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const cleanText = (text.slice(0, idx) + text.slice(jsonEnd + 1)).replace(/\s+/g, ' ').trim();
    return { bookingData, cleanText };
  } catch { return { bookingData: null, cleanText: text }; }
}

async function createCalendarEvent(userId: number, leadId: number | null, leadName: string, bookingData: any): Promise<void> {
  try {
    const db = getDb();
    const startDt = `${bookingData.fecha}T${bookingData.hora_inicio}:00`;
    const endDt = `${bookingData.fecha}T${bookingData.hora_fin || bookingData.hora_inicio}:00`;

    // Prevent duplicate: skip if this lead already has an event at the same start time
    const dupByLead = leadId
      ? db.prepare('SELECT id FROM calendar_events WHERE user_id = ? AND lead_id = ? AND start_datetime = ?').get(userId, leadId, startDt)
      : null;
    if (dupByLead) {
      console.log(`[AI] Skipping duplicate calendar event for lead ${leadId} at ${startDt}`);
      return;
    }

    // Prevent overlap: skip if there is already ANY event at the exact same start time for this user
    const conflict = db.prepare('SELECT id FROM calendar_events WHERE user_id = ? AND start_datetime = ?').get(userId, startDt);
    if (conflict) {
      console.log(`[AI] Slot ${startDt} already occupied for user ${userId}, skipping new booking`);
      return;
    }

    const insertResult = db.prepare(`
      INSERT INTO calendar_events (user_id, title, description, start_datetime, end_datetime, all_day, type, color, lead_id, location)
      VALUES (?, ?, ?, ?, ?, 0, 'appointment', '#ec4899', ?, '')
    `).run(userId, bookingData.titulo || `Cita con ${leadName}`,
      bookingData.descripcion || `Cita agendada por Sellia IA para ${leadName}`,
      startDt, endDt, leadId);

    const insertId = insertResult.lastInsertRowid;

    // Push to Google Calendar if user has a connected token
    try {
      const tokenRow = db.prepare('SELECT * FROM google_calendar_tokens WHERE user_id = ?').get(userId) as any;
      if (tokenRow) {
        let accessToken: string = tokenRow.access_token;

        // Refresh token if expired (expiry_date is stored as ISO string)
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
            const newExpiry = Date.now() + (refreshData.expires_in || 3600) * 1000;
            db.prepare('UPDATE google_calendar_tokens SET access_token = ?, expiry_date = ? WHERE user_id = ?')
              .run(accessToken, newExpiry, userId);
          } else {
            console.warn('[AI] Failed to refresh Google token, skipping Google Calendar push');
          }
        }

        // Push event to Google Calendar
        const gcalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
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
            db.prepare('UPDATE calendar_events SET google_event_id = ? WHERE id = ?')
              .run(gcalData.id, insertId);
            console.log(`[AI] Event pushed to Google Calendar: ${gcalData.id}`);
          }
        } else {
          const errText = await gcalRes.text();
          console.warn('[AI] Google Calendar push failed:', errText);
        }
      }
    } catch (gcalErr: any) {
      console.error('[AI] Error pushing to Google Calendar:', gcalErr.message);
    }
  } catch (err: any) {
    console.error('[AI] Error creating calendar event:', err.message);
  }
}

function getAI(_userId?: number): OpenAI {
  const db = getDb();
  // 1. Platform-wide key set by admin (global_settings)
  const globalRow = db.prepare("SELECT value FROM global_settings WHERE key = 'openai_api_key'").get() as any;
  if (globalRow?.value) return new OpenAI({ apiKey: globalRow.value });
  // 2. Fallback to environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No hay clave de API configurada. El administrador debe añadirla en el Panel de Admin → Configuración IA.');
  return new OpenAI({ apiKey });
}

// If subadmin, use superadmin's user_id for KB/calendar/notifications
function getEffectiveUserId(req: AuthRequest): number {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as any;
  if (user?.role === 'subadmin') {
    const superadmin = db.prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1").get() as any;
    if (superadmin) return superadmin.id;
  }
  return req.userId!;
}

// POST /api/ai/chat — Generate AI response for a lead conversation
router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, messages, knowledgeBase } = req.body;
    const openai = getAI(req.userId);
    const effectiveUserId = getEffectiveUserId(req);

    // Get knowledge base from DB if not provided
    let kb = knowledgeBase;
    if (!kb) {
      const db = getDb();
      const kbRow = db.prepare('SELECT content FROM knowledge_base WHERE user_id = ?').get(effectiveUserId) as any;
      kb = kbRow?.content || '';
    }

    // Include calendar context if: conversation has scheduling keywords OR lead already has a calendar event
    const needsCalendar = conversationHasSchedulingContext(messages) ||
      (leadId && effectiveUserId ? leadHasCalendarEvents(effectiveUserId, leadId) : false);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    // Pre-compute next 7 days as day-name → date mapping for the AI
    const dayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const upcomingDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() + (i + 1) * 86400000);
      return `- "${dayNames[d.getDay()]}" = ${d.toISOString().split('T')[0]}`;
    }).join('\n');

    const calendarSection = needsCalendar && effectiveUserId
      ? `\n\nAGENDAMIENTO:\n- Hoy es ${todayStr} (${dayNames[today.getDay()]}). Usa esta fecha como referencia absoluta.\n- Próximas fechas para que uses la correcta cuando el cliente diga un día de la semana:\n${upcomingDays}\n- Si el cliente quiere agendar, sugiere horarios disponibles según el calendario.\n- CRÍTICO: Los horarios marcados como "ya ocupados" NO están disponibles. NUNCA ofrezcas ni confirmes una cita en un horario ocupado. Si el cliente pide un horario ocupado, ofrece el siguiente horario libre.\n- En cuanto el cliente confirme una fecha y hora LIBRE, DEBES incluir en tu respuesta el marcador CITA_AGENDADA (ver instrucción crítica abajo).\n- IMPORTANTE: Solo emite CITA_AGENDADA una vez por conversación. Si ya se emitió antes, NO lo repitas.\n- La fecha "mañana" es ${tomorrowStr}.\n- Después del JSON confirma la cita de forma natural (ej: "¡Listo! Te esperamos mañana a las 13:00 🗓️").\n- CANCELACIÓN: Si el cliente pide cancelar, eliminar, borrar o quitar su cita, DEBES incluir exactamente CITA_CANCELADA: en tu respuesta (sin JSON adicional). Luego confirma la cancelación de forma natural y ofrece reagendar.\n\n${getCalendarContext(effectiveUserId!)}`
      : '';

    const systemInstruction = `Eres un agente de ventas IA por WhatsApp. Tu objetivo es CERRAR VENTAS de forma natural.

ESTILO DE RESPUESTA (MUY IMPORTANTE):
- Escribe como una persona real en WhatsApp: mensajes cortos y directos.
- Si necesitas decir varias cosas, sepáralas con una línea en blanco (\\n\\n) — el sistema las enviará como mensajes distintos.
- Máximo 2 líneas por bloque de texto.
- Máximo 1 pregunta por respuesta.
- NUNCA uses frases como "Me alegra saber que...", "Gracias por tu mensaje", "Estimado cliente", "Con gusto te ayudo", "Claro que sí,".
- Usa lenguaje natural, cercano, con emojis ocasionales.

REGLAS DE INFORMACIÓN:
- Responde ÚNICAMENTE con información de la base de conocimientos.
- Si no tienes la info, pregunta: "No tengo esa info. ¿Te puedo ayudar con otra cosa?"
- NUNCA inventes precios, servicios o datos.

DERIVAR A HUMANO:
- Solo si el usuario pide EXPLÍCITAMENTE hablar con una persona real, incluye exactamente "DERIVAR_HUMANO:" al inicio de tu respuesta.
- NO lo uses por no saber un dato.

CAPTURA DE EMAIL:
- Si el usuario menciona o te da su email en cualquier momento, extráelo y agrega al FINAL de tu respuesta: EMAIL_CAPTURADO:correo@ejemplo.com
- Solo pide el email UNA VEZ por conversación. Si ya lo tienes en el historial, no lo vuelvas a pedir.

PLAN DE COBRANZA (AUTOMÁTICO):
- Si el usuario confirma que pagará en CUOTAS (ej: "en 2 cuotas de 150.000", "pagaré en 3 cuotas"), emite AL FINAL de tu respuesta:
  PLAN_COBRANZA:{"cuotas":N,"monto_total":NUMERO,"fecha_inicio":"YYYY-MM-DD"}
- monto_total = total en pesos, número sin puntos ni $. Si dijo "2 cuotas de 150.000" → monto_total=300000.
- fecha_inicio = primer día del mes siguiente si no la indicaron.
- Solo emite PLAN_COBRANZA UNA VEZ por conversación. Si ya aparece en el historial, NO lo repitas.

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
${calendarSection}
BASE DE CONOCIMIENTOS:
${kb}
${needsCalendar ? `
⚠️ INSTRUCCIÓN CRÍTICA DE SISTEMA (PRIORIDAD MÁXIMA, NO IGNORAR):
Si en este turno el cliente confirmó una fecha y hora para agendar → DEBES incluir OBLIGATORIAMENTE en tu respuesta:
CITA_AGENDADA:{"titulo":"[motivo]","fecha":"YYYY-MM-DD","hora_inicio":"HH:MM","hora_fin":"HH:MM","descripcion":"[detalle]"}
Pon el JSON en UNA SOLA LÍNEA sin espacios extra. Sin este tag el agendamiento NO se registra en el sistema.
Si el cliente dijo "mañana a las 12" → fecha=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}, hora_inicio=12:00, hora_fin=13:00.
Si el cliente dijo "mañana a las 10" → fecha=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}, hora_inicio=10:00, hora_fin=11:00.
EJEMPLO de respuesta correcta cuando el cliente confirma cita:
¡Listo! Te esperamos mañana a las 12:00 🗓️
CITA_AGENDADA:{"titulo":"Visita","fecha":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}","hora_inicio":"12:00","hora_fin":"13:00","descripcion":"Visita agendada por el cliente"}
` : ''}`;

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemInstruction },
      ...messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        } as OpenAI.Chat.ChatCompletionMessageParam)),
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      temperature: 0.2,
    });

    const responseText = response.choices[0]?.message?.content || 'Error al generar respuesta.';

    // Extract lead state tag
    const stateMatch = responseText.match(/\[ESTADO:(.+?)\]/);
    let newStatus: string | null = null;
    let cleanResponse = responseText;

    if (stateMatch) {
      newStatus = stateMatch[1].trim();
      cleanResponse = responseText.replace(stateMatch[0], '').trim();
    }

    const saleDetected = cleanResponse.includes('VENTA_CERRADA:');
    if (saleDetected) {
      newStatus = 'Cerrado Ganado';
      cleanResponse = cleanResponse.replace('VENTA_CERRADA:', '').trim();
    }

    const humanRequested = cleanResponse.includes('DERIVAR_HUMANO:');
    if (humanRequested) {
      cleanResponse = cleanResponse.replace('DERIVAR_HUMANO:', '').trim();
    }

    // Detect and extract collection plan marker
    const { colPlanData, cleanText: afterColPlan } = extractColPlanData(cleanResponse);
    if (colPlanData) cleanResponse = afterColPlan;

    // Detect and extract calendar booking
    const { bookingData, cleanText: afterBooking } = extractBookingData(cleanResponse);
    if (bookingData) cleanResponse = afterBooking;

    // Detect cancellation: AI marker OR server-side keyword detection as fallback
    const aiSaidCancel = cleanResponse.includes('CITA_CANCELADA:');
    const serverDetectedCancel = detectServerSideCancellation(messages);
    const cancellationDetected = aiSaidCancel || serverDetectedCancel;
    if (aiSaidCancel) cleanResponse = cleanResponse.replace('CITA_CANCELADA:', '').trim();

    // Capture email if AI extracted one
    let capturedEmail: string | null = null;
    const emailMatch = cleanResponse.match(/EMAIL_CAPTURADO:([^\s\n]+)/);
    if (emailMatch) {
      const candidate = emailMatch[1].trim().replace(/[.,;]$/, '');
      if (candidate.includes('@')) capturedEmail = candidate;
      cleanResponse = cleanResponse.replace(/EMAIL_CAPTURADO:[^\s\n]+/, '').trim();
    }

    // If after stripping all markers the response is empty, add a default confirmation
    if (!cleanResponse.trim() && bookingData) {
      cleanResponse = `¡Listo! Te esperamos el ${bookingData.fecha} a las ${bookingData.hora_inicio} 🗓️`;
    } else if (!cleanResponse.trim()) {
      cleanResponse = 'Entendido 👍';
    }

    // Split into multiple WhatsApp-style parts (filter out any empty strings)
    const parts = splitAndCleanResponse(cleanResponse).filter(p => p.trim().length > 0);

    if (leadId) {
      const db = getDb();
      // Save each part as a separate message
      for (const part of parts) {
        db.prepare('INSERT INTO messages (lead_id, role, content) VALUES (?, ?, ?)').run(leadId, 'assistant', part);
      }

      // If a booking was made, ensure status is at least "En Negociación"
      if (bookingData && (!newStatus || newStatus === 'Nuevo' || newStatus === 'Calificado')) {
        newStatus = 'En Negociación';
      }
      if (newStatus && newStatus !== 'Nuevo') {
        db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(newStatus, leadId);
      }

      if (saleDetected || newStatus === 'Cerrado Ganado') {
        db.prepare("UPDATE leads SET status = 'Cerrado Ganado', score = 100 WHERE id = ?").run(leadId);
        newStatus = 'Cerrado Ganado';
        const lead = db.prepare('SELECT name FROM leads WHERE id = ?').get(leadId) as any;
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
          effectiveUserId, 'success', '🎉 ¡Venta Cerrada!',
          `El agente IA cerró una venta con ${lead?.name || 'el lead'} (ID: ${leadId}).`
        );
      } else if (newStatus === 'Cerrado Perdido') {
        const lead = db.prepare('SELECT name FROM leads WHERE id = ?').get(leadId) as any;
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
          effectiveUserId, 'alert', '❌ Lead perdido',
          `${lead?.name || 'El lead'} rechazó la oferta o se despidió.`
        );
      } else if (humanRequested) {
        db.prepare('UPDATE leads SET human_mode = 1 WHERE id = ?').run(leadId);
        const lead = db.prepare('SELECT name FROM leads WHERE id = ?').get(leadId) as any;
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
          effectiveUserId, 'alert', '👤 Atención humana solicitada',
          `${lead?.name || 'Un lead'} quiere hablar con una persona.`
        );
      }

      if (bookingData && effectiveUserId) {
        const lead = db.prepare('SELECT name, email FROM leads WHERE id = ?').get(leadId) as any;
        await createCalendarEvent(effectiveUserId, leadId, lead?.name || 'lead', bookingData);
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
          effectiveUserId, 'success', '📅 Cita agendada por Sellia',
          `Sellia agendó una cita con ${lead?.name || 'el lead'} para el ${bookingData.fecha} a las ${bookingData.hora_inicio}.`
        );
        // Send confirmation email if we already have one
        const emailForBooking = capturedEmail || lead?.email;
        if (emailForBooking) {
          sendEmail(
            emailForBooking,
            `Confirmación de cita – ${bookingData.titulo || 'Tu cita'}`,
            bookingEmailHtml({ leadName: lead?.name || 'Cliente', fecha: bookingData.fecha, horaInicio: bookingData.hora_inicio, titulo: bookingData.titulo || 'Cita', descripcion: bookingData.descripcion })
          ).catch(() => {});
        } else {
          // No email yet — ask for it
          const emailAsk = '¿Me das tu correo electrónico para enviarte la confirmación de tu cita? 📧';
          parts.push(emailAsk);
          db.prepare('INSERT INTO messages (lead_id, role, content) VALUES (?, ?, ?)').run(leadId, 'assistant', emailAsk);
        }
      }

      // Save captured email and send confirmation if there's a pending booking or collection plan
      if (capturedEmail) {
        db.prepare('UPDATE leads SET email = ? WHERE id = ?').run(capturedEmail, leadId);
        console.log(`[AI] Email captured for lead ${leadId}: ${capturedEmail}`);
        // If this lead already has a calendar event, send the confirmation now
        const existingEvent = db.prepare(
          'SELECT title, start_datetime FROM calendar_events WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1'
        ).get(leadId) as any;
        if (existingEvent) {
          const lead = db.prepare('SELECT name FROM leads WHERE id = ?').get(leadId) as any;
          const startDt = new Date(existingEvent.start_datetime);
          const fechaStr = startDt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          const horaStr = startDt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          sendEmail(
            capturedEmail,
            `Confirmación de cita – ${existingEvent.title}`,
            bookingEmailHtml({ leadName: lead?.name || 'Cliente', fecha: fechaStr, horaInicio: horaStr, titulo: existingEvent.title })
          ).catch(() => {});
        }
        // If this lead already has a collection plan, send the plan confirmation email now
        if (!colPlanData) {
          const existingPlan = db.prepare(
            `SELECT pp.debtor_name, pp.id,
               (SELECT COUNT(*) FROM payment_installments WHERE plan_id = pp.id) as cnt,
               (SELECT SUM(amount) FROM payment_installments WHERE plan_id = pp.id) as total,
               (SELECT due_date FROM payment_installments WHERE plan_id = pp.id ORDER BY installment_number ASC LIMIT 1) as first_due,
               pp.payment_link, pp.bank_info
             FROM payment_plans pp
             WHERE pp.lead_id = ? AND pp.status = 'active'
             ORDER BY pp.created_at DESC LIMIT 1`
          ).get(leadId) as any;
          if (existingPlan) {
            const perInstall = Number((existingPlan.total / existingPlan.cnt).toFixed(0));
            sendEmail(
              capturedEmail,
              '💳 Tu plan de pago ha sido confirmado – Sellia',
              collectionPlanEmailHtml({
                debtorName: existingPlan.debtor_name,
                installmentsCount: existingPlan.cnt,
                amountPerInstallment: perInstall.toLocaleString('es-CL'),
                totalAmount: Number(existingPlan.total).toLocaleString('es-CL'),
                firstDueDate: existingPlan.first_due,
                payLink: existingPlan.payment_link || undefined,
                bankInfo: existingPlan.bank_info || undefined,
              }),
            ).catch(() => {});
          }
        }
      }

      // Auto-create collection plan if AI detected installment payment agreement
      if (colPlanData && effectiveUserId) {
        const lead = db.prepare('SELECT name, phone_number FROM leads WHERE id = ?').get(leadId) as any;
        autoCreateCollectionPlan(effectiveUserId, leadId, lead?.name || 'Cliente', lead?.phone_number || '', colPlanData);
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
          effectiveUserId, 'success', '💳 Plan de cobranza creado',
          `Sellia IA creó automáticamente un plan de ${colPlanData.cuotas} cuotas para ${lead?.name || 'el lead'}.`
        );
        const kb = db.prepare('SELECT collection_prompt FROM knowledge_base WHERE user_id = ?').get(effectiveUserId) as any;
        const firstDue = colPlanData.fecha_inicio || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const cuotas = parseInt(colPlanData.cuotas) || 2;
        const total = parseFloat(colPlanData.monto_total) || 0;
        const perInstallment = (total / cuotas).toFixed(0);
        // Send immediate WhatsApp confirmation to the debtor
        sendPlanCreatedNotification(effectiveUserId, lead?.phone_number || '', lead?.name || 'Cliente', cuotas, total, firstDue, kb?.collection_prompt || '').catch(() => {});
        // Send email confirmation to the lead if we have their email
        const leadEmail = (db.prepare('SELECT email FROM leads WHERE id = ?').get(leadId) as any)?.email || capturedEmail;
        if (leadEmail) {
          sendEmail(
            leadEmail,
            '💳 Tu plan de pago ha sido confirmado – Sellia',
            collectionPlanEmailHtml({ debtorName: lead?.name || 'Cliente', installmentsCount: cuotas, amountPerInstallment: Number(perInstallment).toLocaleString('es-CL'), totalAmount: Number(total).toLocaleString('es-CL'), firstDueDate: firstDue })
          ).catch(() => {});
        }
      }

      if (cancellationDetected && effectiveUserId) {
        const deleted = await cancelCalendarEvent(effectiveUserId, leadId);
        if (deleted) {
          const lead = db.prepare('SELECT name FROM leads WHERE id = ?').get(leadId) as any;
          db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
            effectiveUserId, 'message', '🗑️ Cita cancelada',
            `${lead?.name || 'El lead'} canceló su cita.`
          );
        }
      }
    }

    res.json({ parts, content: parts[0], saleDetected: saleDetected || newStatus === 'Cerrado Ganado', humanRequested, bookingDetected: !!bookingData, bookingData, cancellationDetected, newStatus });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Error al comunicarse con la IA: ' + error.message });
  }
});

// POST /api/ai/extract-insights — Extract audience insights from conversation
router.post('/extract-insights', async (req: AuthRequest, res: Response) => {
  try {
    const { messages, leadId } = req.body;
    const openai = getAI(req.userId);

    const historyText = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un analista de marketing y Growth Hacker. Extrae datos demográficos, intereses, puntos de dolor, necesidades, oportunidades de negocio y parámetros específicos para plataformas de Ads basados estrictamente en la conversación. Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto adicional.',
        },
        {
          role: 'user',
          content: `Analiza esta conversación y devuelve un JSON con las claves: demographics (string), interests (array de strings), painPoints (array de strings), needs (array de strings), opportunities (array de strings), buyingIntent (string), platformParams (objeto con claves meta, google, linkedin como strings).\n\nConversación:\n${historyText}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(response.choices[0]?.message?.content || '{}');

    if (leadId) {
      const db = getDb();
      const existing = db.prepare('SELECT id FROM lead_insights WHERE lead_id = ?').get(leadId);
      if (existing) {
        db.prepare(`
          UPDATE lead_insights SET
            demographics = ?, interests = ?, pain_points = ?, needs = ?,
            opportunities = ?, buying_intent = ?, platform_params = ?
          WHERE lead_id = ?
        `).run(
          data.demographics, JSON.stringify(data.interests || []), JSON.stringify(data.painPoints || []),
          JSON.stringify(data.needs || []), JSON.stringify(data.opportunities || []), data.buyingIntent,
          JSON.stringify(data.platformParams || {}), leadId
        );
      } else {
        db.prepare(`
          INSERT INTO lead_insights (lead_id, demographics, interests, pain_points, needs, opportunities, buying_intent, platform_params)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          leadId, data.demographics, JSON.stringify(data.interests || []), JSON.stringify(data.painPoints || []),
          JSON.stringify(data.needs || []), JSON.stringify(data.opportunities || []), data.buyingIntent,
          JSON.stringify(data.platformParams || {})
        );
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error('Extract insights error:', error);
    res.status(500).json({ error: 'Error al analizar: ' + error.message });
  }
});

// POST /api/ai/analyze-ads — Analyze ad data with AI
router.post('/analyze-ads', async (req: AuthRequest, res: Response) => {
  try {
    const { text, historicalData } = req.body;
    const openai = getAI(req.userId);

    const historicalContext = historicalData && historicalData.length > 0
      ? `\n\n--- DATOS HISTÓRICOS ACTUALES DE CAMPAÑAS ---\n${JSON.stringify(historicalData)}\n------------------------------------------\n`
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en marketing digital y análisis de campañas publicitarias. Analiza los datos y responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto adicional.',
        },
        {
          role: 'user',
          content: `Analiza estos NUEVOS datos de campañas publicitarias cruzándolos con mi histórico actual. IMPORTANTE: Solo extrae en el JSON "extractedCampaigns" las campañas que provengan de los NUEVOS datos. Si la fecha no se especifica, usa ${new Date().toISOString().split('T')[0]}. Dame 2 conclusiones clave y 3 recomendaciones.\n\nDevuelve un JSON con las claves: analysis (string en Markdown con conclusiones y recomendaciones), extractedCampaigns (array de objetos con: name, platform, spend, revenue, reach, clicks, conversions, date).\n\nNuevos Datos:\n${text}${historicalContext}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');

    const db = getDb();
    const analysisResult = db.prepare(
      'INSERT INTO ad_analyses (user_id, source, content) VALUES (?, ?, ?)'
    ).run(req.userId, 'Ingreso Manual', result.analysis || '');

    if (result.extractedCampaigns && result.extractedCampaigns.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO campaigns (user_id, name, platform, status, spend, revenue, reach, clicks, conversions, roas, cpa, ctr, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((camps: any[]) => {
        for (const c of camps) {
          const ctr = c.reach > 0 ? (c.clicks / c.reach) * 100 : 0;
          const cpa = c.conversions > 0 ? c.spend / c.conversions : 0;
          const roas = c.spend > 0 ? c.revenue / c.spend : 0;
          stmt.run(req.userId, c.name, c.platform || 'Meta Ads', 'Active',
            c.spend || 0, c.revenue || 0, c.reach || 0, c.clicks || 0, c.conversions || 0,
            Number(roas.toFixed(2)), Number(cpa.toFixed(2)), Number(ctr.toFixed(2)),
            c.date || new Date().toISOString().split('T')[0]
          );
        }
      });
      insertMany(result.extractedCampaigns);
    }

    res.json({
      analysis: {
        id: analysisResult.lastInsertRowid,
        source: 'Ingreso Manual',
        content: result.analysis,
        date: new Date().toLocaleString(),
      },
      extractedCampaigns: result.extractedCampaigns || [],
    });
  } catch (error: any) {
    console.error('Analyze ads error:', error);
    res.status(500).json({ error: 'Error al analizar anuncios: ' + error.message });
  }
});

// POST /api/ai/analyze-file — Analyze ad data from file/image with AI
router.post('/analyze-file', async (req: AuthRequest, res: Response) => {
  try {
    const { base64Data, mimeType, historicalData } = req.body;
    const openai = getAI(req.userId);

    const historicalContext = historicalData && historicalData.length > 0
      ? `\n\n--- DATOS HISTÓRICOS ACTUALES DE CAMPAÑAS ---\n${JSON.stringify(historicalData)}\n------------------------------------------\n`
      : '';

    const promptText = `Analiza estos NUEVOS datos de campañas publicitarias cruzándolos con mi histórico actual. IMPORTANTE: Solo extrae en el JSON "extractedCampaigns" las campañas que provengan de los NUEVOS datos, NO del histórico. Si la fecha no se especifica en los nuevos datos, usa ${new Date().toISOString().split('T')[0]}. Dame 2 conclusiones clave y 3 recomendaciones.\n\nDevuelve un JSON con las claves: analysis (string en Markdown), extractedCampaigns (array con: name, platform, spend, revenue, reach, clicks, conversions, date).${historicalContext}`;

    const isImage = mimeType.startsWith('image/');
    let messages: OpenAI.Chat.ChatCompletionMessageParam[];

    if (isImage) {
      messages = [
        { role: 'system', content: 'Eres un experto en análisis de campañas publicitarias. Responde ÚNICAMENTE con un objeto JSON válido.' },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: promptText },
          ],
        },
      ];
    } else {
      // Text/CSV file — decode base64 to text
      const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
      messages = [
        { role: 'system', content: 'Eres un experto en análisis de campañas publicitarias. Responde ÚNICAMENTE con un objeto JSON válido.' },
        { role: 'user', content: `${promptText}\n\nContenido del archivo:\n${textContent}` },
      ];
    }

    const response = await openai.chat.completions.create({
      model: isImage ? 'gpt-4o' : 'gpt-4o-mini', // use vision model for images
      messages,
      temperature: 0.2,
      response_format: isImage ? undefined : { type: 'json_object' },
    });

    let result: any = {};
    const content = response.choices[0]?.message?.content || '{}';
    try {
      // Strip markdown code blocks if present
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(clean);
    } catch (_) {
      result = { analysis: content, extractedCampaigns: [] };
    }

    const db = getDb();
    const analysisResult = db.prepare(
      'INSERT INTO ad_analyses (user_id, source, content) VALUES (?, ?, ?)'
    ).run(req.userId, 'Archivo Subido', result.analysis || '');

    if (result.extractedCampaigns && result.extractedCampaigns.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO campaigns (user_id, name, platform, status, spend, revenue, reach, clicks, conversions, roas, cpa, ctr, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((camps: any[]) => {
        for (const c of camps) {
          const ctr = c.reach > 0 ? (c.clicks / c.reach) * 100 : 0;
          const cpa = c.conversions > 0 ? c.spend / c.conversions : 0;
          const roas = c.spend > 0 ? c.revenue / c.spend : 0;
          stmt.run(req.userId, c.name, c.platform || 'Meta Ads', 'Active',
            c.spend || 0, c.revenue || 0, c.reach || 0, c.clicks || 0, c.conversions || 0,
            Number(roas.toFixed(2)), Number(cpa.toFixed(2)), Number(ctr.toFixed(2)),
            c.date || new Date().toISOString().split('T')[0]
          );
        }
      });
      insertMany(result.extractedCampaigns);
    }

    res.json({
      analysis: {
        id: analysisResult.lastInsertRowid,
        source: 'Archivo Subido',
        content: result.analysis,
        date: new Date().toLocaleString(),
      },
      extractedCampaigns: result.extractedCampaigns || [],
    });
  } catch (error: any) {
    console.error('Analyze file error:', error);
    res.status(500).json({ error: 'Error al analizar archivo: ' + error.message });
  }
});

// GET /api/ai/analyses
router.get('/analyses', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const analyses = db.prepare('SELECT * FROM ad_analyses WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(analyses);
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/ai/analyses/:id
router.delete('/analyses/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM ad_analyses WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/ai/analyses — delete all
router.delete('/analyses', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM ad_analyses WHERE user_id = ?').run(req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete all analyses error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/ai/alerts
router.get('/alerts', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const alerts = db.prepare('SELECT * FROM ad_alerts WHERE user_id = ?').all(req.userId);
    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/ai/alerts
router.post('/alerts', (req: AuthRequest, res: Response) => {
  try {
    const { metric, condition, value, severity } = req.body;
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO ad_alerts (user_id, metric, condition, value, severity) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, metric, condition, value, severity || 'Normal');
    const alert = db.prepare('SELECT * FROM ad_alerts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(alert);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/ai/alerts/evaluate
router.post('/alerts/evaluate', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const alerts = db.prepare('SELECT * FROM ad_alerts WHERE user_id = ? AND active = 1').all(req.userId) as any[];
    const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ?').all(req.userId) as any[];

    if (alerts.length === 0 || campaigns.length === 0) {
      res.json({ triggered: [] });
      return;
    }

    const metricMap: Record<string, (c: any) => number> = {
      ROAS: (c) => c.roas, CPA: (c) => c.cpa, CTR: (c) => c.ctr,
      Inversión: (c) => c.spend, Ingresos: (c) => c.revenue, Conversiones: (c) => c.conversions,
    };

    const triggered: any[] = [];
    for (const alert of alerts) {
      const getVal = metricMap[alert.metric];
      if (!getVal) continue;
      const threshold = parseFloat(alert.value.replace(/[^0-9.-]+/g, ''));
      if (isNaN(threshold)) continue;

      for (const campaign of campaigns) {
        const val = getVal(campaign);
        let fired = false;
        if (alert.condition === '<' && val < threshold) fired = true;
        if (alert.condition === '>' && val > threshold) fired = true;
        if (alert.condition === '<=' && val <= threshold) fired = true;
        if (alert.condition === '>=' && val >= threshold) fired = true;
        if (alert.condition === '=' && val === threshold) fired = true;

        if (fired) {
          triggered.push({ alert, campaign, currentValue: val });
          db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
            req.userId, 'alert',
            `Alerta de ${alert.metric} (${alert.severity})`,
            `Campaña "${campaign.name}": ${alert.metric} = ${val.toFixed(2)} ${alert.condition} ${threshold}`
          );
        }
      }
    }

    res.json({ triggered, count: triggered.length });
  } catch (error) {
    console.error('Evaluate alerts error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/ai/alerts/:id
router.delete('/alerts/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM ad_alerts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
