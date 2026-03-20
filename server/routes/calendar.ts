import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';
import { authMiddleware } from '../auth.js';
import { sendEmail, bookingEmailHtml } from '../lib/email.js';

const router = Router();

// ─── Google Calendar push helper ─────────────────────────────────────────────
async function pushEventToGoogle(userId: number, eventId: number | bigint, eventData: {
  title: string; description: string; start_datetime: string; end_datetime: string;
  all_day: boolean; location: string;
}): Promise<void> {
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

    const userRow = db.prepare('SELECT timezone FROM users WHERE id = ?').get(userId) as any;
    const tz = userRow?.timezone || 'America/Santiago';
    const calendarId = tokenRow.calendar_id || 'primary';

    const body: any = eventData.all_day
      ? { summary: eventData.title, description: eventData.description || '', location: eventData.location || '',
          start: { date: eventData.start_datetime.split('T')[0] },
          end: { date: eventData.end_datetime.split('T')[0] } }
      : { summary: eventData.title, description: eventData.description || '', location: eventData.location || '',
          start: { dateTime: eventData.start_datetime, timeZone: tz },
          end: { dateTime: eventData.end_datetime, timeZone: tz } };

    const res2 = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res2.ok) {
      const created = await res2.json() as any;
      if (created.id) {
        db.prepare('UPDATE calendar_events SET google_event_id = ? WHERE id = ?').run(created.id, eventId);
        console.log(`[Calendar] Auto-pushed to Google Calendar: ${created.id}`);
      }
    } else {
      console.warn('[Calendar] Google push failed:', await res2.text());
    }
  } catch (err: any) {
    console.error('[Calendar] Error pushing to Google:', err.message);
  }
}

// ─── Google Calendar delete helper ───────────────────────────────────────────
async function deleteFromGoogleCalendar(userId: number, googleEventId: string): Promise<void> {
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
    const delRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (delRes.ok || delRes.status === 410) {
      console.log(`[Calendar] Deleted from Google Calendar: ${googleEventId}`);
    } else {
      console.warn('[Calendar] Google delete failed:', delRes.status, await delRes.text());
    }
  } catch (err: any) {
    console.error('[Calendar] Error deleting from Google:', err.message);
  }
}

// ─── Calendar Events CRUD ────────────────────────────────────────────────────

// GET /api/calendar/events?month=YYYY-MM or ?from=&to=
router.get('/events', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { month, from, to } = req.query as any;

    let events: any[];
    if (from && to) {
      events = db.prepare(
        `SELECT e.*, l.name as lead_name FROM calendar_events e
         LEFT JOIN leads l ON l.id = e.lead_id
         WHERE e.user_id = ? AND e.start_datetime >= ? AND e.start_datetime <= ?
         ORDER BY e.start_datetime ASC`
      ).all(req.userId, from, to);
    } else if (month) {
      // month = "2026-03"
      const start = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      events = db.prepare(
        `SELECT e.*, l.name as lead_name FROM calendar_events e
         LEFT JOIN leads l ON l.id = e.lead_id
         WHERE e.user_id = ? AND e.start_datetime >= ? AND e.start_datetime < ?
         ORDER BY e.start_datetime ASC`
      ).all(req.userId, start, nextMonth);
    } else {
      // Default: current month +/- 2 months
      events = db.prepare(
        `SELECT e.*, l.name as lead_name FROM calendar_events e
         LEFT JOIN leads l ON l.id = e.lead_id
         WHERE e.user_id = ?
         ORDER BY e.start_datetime ASC`
      ).all(req.userId);
    }

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// POST /api/calendar/events
router.post('/events', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, start_datetime, end_datetime, all_day, type, color, lead_id, location } = req.body;
    if (!title || !start_datetime || !end_datetime) {
      res.status(400).json({ error: 'Título, fecha de inicio y fin son requeridos.' });
      return;
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO calendar_events (user_id, title, description, start_datetime, end_datetime, all_day, type, color, lead_id, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId, title.trim(), description || '', start_datetime, end_datetime,
      all_day ? 1 : 0, type || 'meeting', color || '#6366f1',
      lead_id || null, location || ''
    );

    const event = db.prepare(
      `SELECT e.*, l.name as lead_name FROM calendar_events e
       LEFT JOIN leads l ON l.id = e.lead_id WHERE e.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json(event);

    // Background tasks (non-blocking)
    const userId = req.userId!;
    const eventId = result.lastInsertRowid;

    // Auto-push to Google Calendar
    pushEventToGoogle(userId, eventId, {
      title: title.trim(), description: description || '',
      start_datetime, end_datetime, all_day: !!all_day, location: location || '',
    }).catch(() => {});

    // Notifications when event is linked to a lead
    if (lead_id) {
      const db2 = getDb();

      // Notify the operator (in-app)
      const leadRow = db2.prepare('SELECT name, phone_number FROM leads WHERE id = ?').get(lead_id) as any;
      const leadName = leadRow?.name || 'Lead';
      const startDate = start_datetime.split('T')[0];
      const startTime = start_datetime.split('T')[1]?.substring(0, 5) || '';

      db2.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(
        userId, 'success', '📅 Cita agendada manualmente',
        `Cita "${title.trim()}" agendada con ${leadName} para el ${startDate} a las ${startTime}.`
      );

      // Email to admin
      const prefs = db2.prepare('SELECT * FROM notification_prefs WHERE user_id = ?').get(userId) as any;
      const adminEmail = prefs?.notify_email;
      if (adminEmail && prefs?.booking_email) {
        sendEmail(adminEmail, `📅 Nueva cita: ${leadName}`,
          bookingEmailHtml({
            leadName,
            fecha: startDate,
            horaInicio: startTime,
            titulo: title.trim(),
            descripcion: description || '',
            forAdmin: true,
          })
        ).catch(() => {});
      }

      // WhatsApp confirmation to the lead (if they have a phone number)
      const leadPhone = leadRow?.phone_number;
      if (leadPhone) {
        const waConfig = db2.prepare('SELECT * FROM whatsapp_configs WHERE user_id = ? AND enabled = 1').get(userId) as any;
        if (waConfig) {
          const confirmMsg = `✅ *Cita Confirmada*\n\n📌 *${title.trim()}*\n📆 Fecha: ${startDate}\n🕐 Hora: ${startTime}${location ? `\n📍 Lugar: ${location}` : ''}\n\nTe esperamos. Si necesitas reprogramar, escríbenos aquí mismo.`;
          fetch(`https://graph.facebook.com/v21.0/${waConfig.phone_number_id}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${waConfig.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: leadPhone, type: 'text', text: { body: confirmMsg } }),
          }).catch(() => {});
        }
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear evento: ' + error.message });
  }
});

// PUT /api/calendar/events/:id
router.put('/events/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, start_datetime, end_datetime, all_day, type, color, lead_id, location } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT id FROM calendar_events WHERE id = ? AND user_id = ?').get(id, req.userId);
    if (!existing) {
      res.status(404).json({ error: 'Evento no encontrado.' });
      return;
    }

    db.prepare(`
      UPDATE calendar_events SET
        title = COALESCE(?, title), description = COALESCE(?, description),
        start_datetime = COALESCE(?, start_datetime), end_datetime = COALESCE(?, end_datetime),
        all_day = COALESCE(?, all_day), type = COALESCE(?, type),
        color = COALESCE(?, color), lead_id = ?, location = COALESCE(?, location)
      WHERE id = ? AND user_id = ?
    `).run(
      title ?? null, description ?? null, start_datetime ?? null, end_datetime ?? null,
      all_day !== undefined ? (all_day ? 1 : 0) : null,
      type ?? null, color ?? null, lead_id ?? null, location ?? null,
      id, req.userId
    );

    const event = db.prepare(
      `SELECT e.*, l.name as lead_name FROM calendar_events e
       LEFT JOIN leads l ON l.id = e.lead_id WHERE e.id = ?`
    ).get(id);

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar evento: ' + error.message });
  }
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    // Get google_event_id before deleting
    const existing = db.prepare('SELECT google_event_id FROM calendar_events WHERE id = ? AND user_id = ?').get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Evento no encontrado.' });
      return;
    }
    db.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').run(id, req.userId);
    res.json({ success: true });
    // Delete from Google Calendar in background
    if (existing.google_event_id) {
      deleteFromGoogleCalendar(req.userId!, existing.google_event_id).catch(() => {});
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar evento: ' + error.message });
  }
});

// ─── Google Calendar OAuth ────────────────────────────────────────────────────

function getGoogleAuthUrl(userId: number): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3001'}/api/calendar/google/callback`;
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
  const state = Buffer.from(String(userId)).toString('base64');
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
}

// GET /api/calendar/google/status
router.get('/google/status', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const token = db.prepare('SELECT user_id, calendar_id, expiry_date FROM google_calendar_tokens WHERE user_id = ?').get(req.userId) as any;
    if (!token) {
      res.json({ connected: false });
      return;
    }
    res.json({ connected: true, calendarId: token.calendar_id, expiryDate: token.expiry_date });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calendar/google/auth — initiates OAuth flow
router.get('/google/auth', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(400).json({ error: 'Google Calendar no está configurado. Añade GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET al .env del servidor.' });
    return;
  }
  const url = getGoogleAuthUrl(req.userId!);
  res.json({ authUrl: url });
});

// GET /api/calendar/google/callback — OAuth callback from Google
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query as any;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (oauthError) {
    res.redirect(`${frontendUrl}/calendar?calendar_error=${encodeURIComponent(oauthError)}`);
    return;
  }

  try {
    const userId = parseInt(Buffer.from(state, 'base64').toString(), 10);
    if (isNaN(userId)) throw new Error('Estado inválido');

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3001'}/api/calendar/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as any;
    if (!tokens.access_token) throw new Error('No se recibió access_token de Google');

    const db = getDb();
    const expiryDate = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    const existing = db.prepare('SELECT user_id FROM google_calendar_tokens WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(`
        UPDATE google_calendar_tokens SET
          access_token = ?, refresh_token = COALESCE(?, refresh_token), expiry_date = ?
        WHERE user_id = ?
      `).run(tokens.access_token, tokens.refresh_token || null, expiryDate, userId);
    } else {
      db.prepare(`
        INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, expiry_date)
        VALUES (?, ?, ?, ?)
      `).run(userId, tokens.access_token, tokens.refresh_token || '', expiryDate);
    }

    const frontendUrlFinal = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrlFinal}/calendar?google_connected=1`);
  } catch (err: any) {
    console.error('[Google Calendar OAuth]', err.message);
    const frontendUrlErr = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrlErr}/calendar?calendar_error=${encodeURIComponent(err.message)}`);
  }
});

// POST /api/calendar/google/disconnect
router.post('/google/disconnect', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM google_calendar_tokens WHERE user_id = ?').run(req.userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendar/google/sync — push local events to Google Calendar + pull Google events
router.post('/google/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const tokenRow = db.prepare('SELECT * FROM google_calendar_tokens WHERE user_id = ?').get(req.userId) as any;
    if (!tokenRow) {
      res.status(400).json({ error: 'No hay conexión con Google Calendar. Conecta tu cuenta primero.' });
      return;
    }

    // Refresh token if expired or expiring within 5 minutes
    let accessToken = tokenRow.access_token;
    const expiryDate = tokenRow.expiry_date ? new Date(tokenRow.expiry_date) : new Date(0);
    const shouldRefresh = expiryDate.getTime() <= Date.now() + 5 * 60 * 1000;
    if (shouldRefresh && tokenRow.refresh_token && tokenRow.refresh_token.length > 0) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshed = await refreshRes.json() as any;
      if (refreshed.access_token) {
        accessToken = refreshed.access_token;
        const newExpiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
        db.prepare('UPDATE google_calendar_tokens SET access_token = ?, expiry_date = ? WHERE user_id = ?')
          .run(accessToken, newExpiry, req.userId);
      } else {
        res.status(401).json({ error: 'Token de Google expirado. Reconecta tu cuenta de Google Calendar.' });
        return;
      }
    }

    const calendarId = tokenRow.calendar_id || 'primary';
    const userRow = db.prepare('SELECT timezone FROM users WHERE id = ?').get(req.userId) as any;
    const userTimezone = userRow?.timezone || 'America/Santiago';
    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Fetch upcoming Google Calendar events (next 90 days)
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const listUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=100&singleEvents=true&orderBy=startTime`;

    const googleEventsRes = await fetch(listUrl, { headers });
    const googleEventsData = await googleEventsRes.json() as any;

    let imported = 0;
    for (const gEvent of googleEventsData.items || []) {
      if (!gEvent.summary) continue;
      const existing = db.prepare('SELECT id FROM calendar_events WHERE google_event_id = ? AND user_id = ?').get(gEvent.id, req.userId);
      if (existing) continue;

      const startDt = gEvent.start?.dateTime || gEvent.start?.date + 'T00:00:00';
      const endDt = gEvent.end?.dateTime || gEvent.end?.date + 'T23:59:59';
      const allDay = !gEvent.start?.dateTime ? 1 : 0;

      db.prepare(`
        INSERT INTO calendar_events (user_id, title, description, start_datetime, end_datetime, all_day, type, color, location, google_event_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.userId, gEvent.summary || 'Sin título',
        gEvent.description || '', startDt, endDt, allDay,
        'google', '#0ea5e9', gEvent.location || '', gEvent.id
      );
      imported++;
    }

    // Push local events that don't have a google_event_id
    const localEvents = db.prepare(
      "SELECT * FROM calendar_events WHERE user_id = ? AND (google_event_id IS NULL OR google_event_id = '') AND start_datetime >= ?"
    ).all(req.userId, timeMin) as any[];

    let pushed = 0;
    for (const evt of localEvents) {
      const body: any = {
        summary: evt.title,
        description: evt.description || '',
        location: evt.location || '',
        start: evt.all_day ? { date: evt.start_datetime.split('T')[0] } : { dateTime: evt.start_datetime, timeZone: userTimezone },
        end: evt.all_day ? { date: evt.end_datetime.split('T')[0] } : { dateTime: evt.end_datetime, timeZone: userTimezone },
      };

      const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      const createRes = await fetch(createUrl, { method: 'POST', headers, body: JSON.stringify(body) });
      if (createRes.ok) {
        const created = await createRes.json() as any;
        db.prepare('UPDATE calendar_events SET google_event_id = ? WHERE id = ?').run(created.id, evt.id);
        pushed++;
      }
    }

    res.json({ success: true, imported, pushed, message: `Sincronización completada: ${imported} eventos importados, ${pushed} enviados a Google Calendar.` });
  } catch (error: any) {
    console.error('[Google Calendar Sync]', error.message);
    res.status(500).json({ error: 'Error al sincronizar con Google Calendar: ' + error.message });
  }
});

// GET /api/calendar/leads — get leads for event creation dropdown
router.get('/leads', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const leads = db.prepare('SELECT id, name, company, status FROM leads WHERE user_id = ? ORDER BY name ASC').all(req.userId);
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
