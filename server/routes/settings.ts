import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';
import crypto from 'crypto';

const router = Router();

// GET /api/settings/agent-name — returns the AI agent name for the logged-in user
router.get('/agent-name', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT agent_name FROM knowledge_base WHERE user_id = ?').get(req.userId) as any;
    res.json({ agentName: row?.agent_name || 'Agente IA' });
  } catch (error) {
    res.json({ agentName: 'Agente IA' });
  }
});

// --- Team Members ---
// GET /api/settings/team
router.get('/team', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const members = db.prepare('SELECT * FROM team_members WHERE user_id = ?').all(req.userId);
    res.json(members);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/settings/team
router.post('/team', (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role } = req.body;
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO team_members (user_id, name, email, role, status) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, name || '', email, role || 'Ventas', 'Invitado');

    const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);

    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, actor, action, action_color, details) VALUES (?, ?, ?, ?, ?)').run(
      req.userId, 'Admin', 'Invitó Usuario', 'amber', `Invitó a "${email}" con rol ${role || 'Ventas'}`
    );

    res.status(201).json(member);
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/settings/team/:id
router.put('/team/:id', (req: AuthRequest, res: Response) => {
  try {
    const { role, status } = req.body;
    const db = getDb();
    db.prepare('UPDATE team_members SET role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ? AND user_id = ?')
      .run(role, status, req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/settings/team/:id
router.delete('/team/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM team_members WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// --- Activity Logs ---
// GET /api/settings/activity-logs
router.get('/activity-logs', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { user, action } = req.query;
    let query = 'SELECT * FROM activity_logs WHERE user_id = ?';
    const params: any[] = [req.userId];

    if (user && user !== 'Todos los usuarios') {
      query += ' AND actor = ?';
      params.push(user);
    }
    if (action && action !== 'Todas las acciones') {
      query += ' AND action = ?';
      params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// --- API Keys ---
// GET /api/settings/api-keys
router.get('/api-keys', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const keys = db.prepare('SELECT id, name, key_prefix, last_used, created_at FROM api_keys WHERE user_id = ?').all(req.userId);
    res.json(keys);
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/settings/api-keys
router.post('/api-keys', (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const keyPrefix = rawKey.substring(0, 14) + '...' + rawKey.substring(rawKey.length - 4);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO api_keys (user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?)'
    ).run(req.userId, name || 'Nueva Key', keyPrefix, keyHash);

    res.status(201).json({
      id: result.lastInsertRowid,
      name: name || 'Nueva Key',
      key: rawKey, // Only shown once!
      key_prefix: keyPrefix,
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/settings/api-keys/:id
router.delete('/api-keys/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// --- Notification Preferences ---
// GET /api/settings/notification-prefs
router.get('/notification-prefs', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const prefs = db.prepare('SELECT * FROM notification_prefs WHERE user_id = ?').get(req.userId) as any;
    if (!prefs) {
      res.json({ newLeadsEmail: true, dailySummary: true, billingAlerts: true, pushNotifications: false, bookingEmail: true, saleEmail: true, notifyEmail: '' });
      return;
    }
    res.json({
      newLeadsEmail: !!prefs.new_leads_email,
      dailySummary: !!prefs.daily_summary,
      billingAlerts: !!prefs.billing_alerts,
      pushNotifications: !!prefs.push_notifications,
      bookingEmail: prefs.booking_email !== undefined ? !!prefs.booking_email : true,
      saleEmail: prefs.sale_email !== undefined ? !!prefs.sale_email : true,
      notifyEmail: prefs.notify_email || '',
    });
  } catch (error) {
    console.error('Get notification prefs error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/settings/notification-prefs
router.put('/notification-prefs', (req: AuthRequest, res: Response) => {
  try {
    const { newLeadsEmail, dailySummary, billingAlerts, pushNotifications, bookingEmail, saleEmail, notifyEmail } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM notification_prefs WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare(`
        UPDATE notification_prefs SET
          new_leads_email = COALESCE(?, new_leads_email),
          daily_summary = COALESCE(?, daily_summary),
          billing_alerts = COALESCE(?, billing_alerts),
          push_notifications = COALESCE(?, push_notifications),
          booking_email = COALESCE(?, booking_email),
          sale_email = COALESCE(?, sale_email),
          notify_email = COALESCE(?, notify_email)
        WHERE user_id = ?
      `).run(
        newLeadsEmail !== undefined ? (newLeadsEmail ? 1 : 0) : null,
        dailySummary !== undefined ? (dailySummary ? 1 : 0) : null,
        billingAlerts !== undefined ? (billingAlerts ? 1 : 0) : null,
        pushNotifications !== undefined ? (pushNotifications ? 1 : 0) : null,
        bookingEmail !== undefined ? (bookingEmail ? 1 : 0) : null,
        saleEmail !== undefined ? (saleEmail ? 1 : 0) : null,
        notifyEmail !== undefined ? notifyEmail : null,
        req.userId
      );
    } else {
      db.prepare(
        'INSERT INTO notification_prefs (user_id, new_leads_email, daily_summary, billing_alerts, push_notifications, booking_email, sale_email, notify_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        req.userId,
        newLeadsEmail !== false ? 1 : 0,
        dailySummary !== false ? 1 : 0,
        billingAlerts !== false ? 1 : 0,
        pushNotifications ? 1 : 0,
        bookingEmail !== false ? 1 : 0,
        saleEmail !== false ? 1 : 0,
        notifyEmail || ''
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update notification prefs error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// --- SMTP Config ---
// GET /api/settings/smtp
router.get('/smtp', (_req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const get = (key: string) => (db.prepare('SELECT value FROM global_settings WHERE key = ?').get(key) as any)?.value || '';
    res.json({
      host: get('smtp_host'),
      port: get('smtp_port') || '587',
      secure: get('smtp_secure') === '1',
      user: get('smtp_user'),
      pass: get('smtp_pass') ? '••••••••' : '',
      fromName: get('smtp_from_name'),
      fromEmail: get('smtp_from_email'),
      enabled: get('smtp_enabled') === '1',
    });
  } catch (error) {
    console.error('Get SMTP config error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/settings/smtp
router.put('/smtp', (req: AuthRequest, res: Response) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail, enabled } = req.body;
    const db = getDb();
    const set = (key: string, value: string) => {
      db.prepare("INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
    };
    if (host !== undefined) set('smtp_host', host);
    if (port !== undefined) set('smtp_port', String(port));
    if (secure !== undefined) set('smtp_secure', secure ? '1' : '0');
    if (user !== undefined) set('smtp_user', user);
    // Only update pass if a real value provided (not the masked placeholder)
    if (pass !== undefined && pass !== '••••••••') set('smtp_pass', pass);
    if (fromName !== undefined) set('smtp_from_name', fromName);
    if (fromEmail !== undefined) set('smtp_from_email', fromEmail);
    if (enabled !== undefined) set('smtp_enabled', enabled ? '1' : '0');
    res.json({ success: true });
  } catch (error) {
    console.error('Update SMTP config error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/settings/smtp/test
router.post('/smtp/test', async (req: AuthRequest, res: Response) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes('@')) {
      res.status(400).json({ error: 'Ingresa un email de destino válido para la prueba.' });
      return;
    }
    const { sendEmail, getSmtpConfig } = await import('../lib/email.js');
    const config = getSmtpConfig();
    if (!config) {
      res.status(400).json({ error: 'SMTP no configurado o deshabilitado. Guarda la configuración primero.' });
      return;
    }
    const ok = await sendEmail(
      to,
      '✅ Email de prueba - Sellia',
      `<div style="font-family:Arial,sans-serif;padding:24px;max-width:480px">
        <h2 style="color:#6366f1">✅ SMTP funcionando</h2>
        <p>El servidor de email de <strong>Sellia</strong> está correctamente configurado.</p>
        <p style="color:#64748b;font-size:13px">Enviado desde: <strong>${config.fromEmail}</strong> vía <strong>${config.host}:${config.port}</strong></p>
      </div>`
    );
    if (ok) {
      res.json({ success: true, message: `✓ Email enviado a ${to}` });
    } else {
      res.status(500).json({ error: 'No se pudo enviar. Verifica host, puerto, usuario y contraseña SMTP.' });
    }
  } catch (error: any) {
    console.error('SMTP test error:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

// --- AI Config (OpenAI API Key) ---
// GET /api/settings/ai-config
router.get('/ai-config', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT openai_api_key FROM user_features WHERE user_id = ?').get(req.userId) as any;
    const key = row?.openai_api_key;
    res.json({
      hasKey: !!key,
      keyPreview: key ? key.substring(0, 7) + '...' + key.substring(key.length - 4) : null,
    });
  } catch (error) {
    console.error('Get AI config error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/settings/ai-config
router.put('/ai-config', (req: AuthRequest, res: Response) => {
  try {
    const { geminiApiKey, openaiApiKey } = req.body;
    const key = openaiApiKey || geminiApiKey; // accept both field names
    const db = getDb();
    const existing = db.prepare('SELECT user_id FROM user_features WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare('UPDATE user_features SET openai_api_key = ? WHERE user_id = ?').run(key || null, req.userId);
    } else {
      db.prepare('INSERT INTO user_features (user_id, openai_api_key) VALUES (?, ?)').run(req.userId, key || null);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update AI config error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
