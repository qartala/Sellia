import { Router, Response } from 'express';
import { getDb, seedIntegrations } from '../db.js';
import { hashPassword, comparePassword, generateToken, authMiddleware } from '../auth.js';
import { AuthRequest } from '../types.js';

const router = Router();

// POST /api/auth/register
router.post('/register', (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, company } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Ya existe una cuenta con este email' });
      return;
    }

    const passwordHash = hashPassword(password);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, company) VALUES (?, ?, ?, ?)'
    ).run(email, passwordHash, name || '', company || '');

    const userId = result.lastInsertRowid as number;

    // Seed default data for new user
    seedIntegrations(userId);

    // Create default knowledge base
    db.prepare('INSERT INTO knowledge_base (user_id, content) VALUES (?, ?)').run(
      userId,
      `Somos "TechBoost Agency", una agencia de marketing B2B.\nServicios que ofrecemos:\n- SEO B2B: $500/mes\n- Gestión de Ads: $800/mes\n- Consultoría Estratégica: $150/hora\n\nPolíticas:\n- Contratos mínimos de 3 meses.\n- Soporte de Lunes a Viernes de 9am a 6pm.`
    );

    // Create default team member (self)
    db.prepare('INSERT INTO team_members (user_id, name, email, role, status) VALUES (?, ?, ?, ?, ?)').run(
      userId, name || 'Admin', email, 'Admin', 'Activo'
    );

    const token = generateToken(userId);
    res.status(201).json({ token, user: { id: userId, email, name: name || '', company: company || '', role: 'Admin' } });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' });
      return;
    }

    const db = getDb();
    const user = db.prepare(`
      SELECT u.*, 
        COALESCE(f.has_dashboard, 1) as has_dashboard,
        COALESCE(f.has_chats, 1) as has_chats,
        COALESCE(f.has_flows, 1) as has_flows,
        COALESCE(f.has_ads, 1) as has_ads,
        COALESCE(f.has_integrations, 1) as has_integrations,
        COALESCE(f.has_settings, 1) as has_settings,
        COALESCE(f.plan, 'Básico') as plan
      FROM users u
      LEFT JOIN user_features f ON f.user_id = u.id
      WHERE u.email = ?
    `).get(email) as any;
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    if (!comparePassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        timezone: user.timezone,
        language: user.language,
        date_format: user.date_format,
        currency: user.currency,
        has_dashboard: user.has_dashboard,
        has_chats: user.has_chats,
        has_flows: user.has_flows,
        has_ads: user.has_ads,
        has_integrations: user.has_integrations,
        has_settings: user.has_settings,
        plan: user.plan,
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT u.id, u.email, u.name, u.company, u.role, u.avatar_url, u.timezone, u.language, u.date_format, u.currency, u.created_at,
        COALESCE(f.has_dashboard, 1) as has_dashboard,
        COALESCE(f.has_chats, 1) as has_chats,
        COALESCE(f.has_flows, 1) as has_flows,
        COALESCE(f.has_ads, 1) as has_ads,
        COALESCE(f.has_integrations, 1) as has_integrations,
        COALESCE(f.has_settings, 1) as has_settings,
        COALESCE(f.plan, 'Básico') as plan
      FROM users u
      LEFT JOIN user_features f ON f.user_id = u.id
      WHERE u.id = ?
    `).get(req.userId) as any;
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { name, company, timezone, language, date_format, currency } = req.body;
    const db = getDb();
    db.prepare(`
      UPDATE users SET name = COALESCE(?, name), company = COALESCE(?, company),
      timezone = COALESCE(?, timezone), language = COALESCE(?, language),
      date_format = COALESCE(?, date_format), currency = COALESCE(?, currency)
      WHERE id = ?
    `).run(name, company, timezone, language, date_format, currency, req.userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Ambas contraseñas son obligatorias' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId) as any;
    if (!comparePassword(currentPassword, user.password_hash)) {
      res.status(400).json({ error: 'Contraseña actual incorrecta' });
      return;
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
