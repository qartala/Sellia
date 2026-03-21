import { Router, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { getDb, seedIntegrations } from '../db.js';
import { hashPassword } from '../auth.js';
import { AuthRequest } from '../types.js';

function getOpenAI(): OpenAI {
  const db = getDb();
  const row = db.prepare("SELECT value FROM global_settings WHERE key = 'openai_api_key'").get() as any;
  const key = row?.value || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('No hay clave de OpenAI configurada en el panel de administración.');
  return new OpenAI({ apiKey: key });
}

const router = Router();

function requireAdminAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as any;
  if (!user || (user.role !== 'superadmin' && user.role !== 'subadmin')) {
    res.status(403).json({ error: 'Acceso denegado.' });
    return;
  }
  (req as any).adminRole = user.role;
  next();
}

router.use(requireAdminAccess);

// GET /api/admin/stats
router.get('/stats', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'superadmin'").get() as any).c;
    const activeUsers = (db.prepare(`
      SELECT COUNT(*) as c FROM users u
      JOIN user_features f ON f.user_id = u.id
      WHERE u.role != 'superadmin' AND f.is_active = 1
    `).get() as any).c;
    const totalLeads = (db.prepare("SELECT COUNT(*) as c FROM leads").get() as any).c;
    const totalRevenue = (db.prepare("SELECT COALESCE(SUM(revenue),0) as r FROM campaigns").get() as any).r;

    res.json({ totalUsers, activeUsers, totalLeads, totalRevenue });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// GET /api/admin/users
router.get('/users', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT
        u.id, u.email, u.name, u.company, u.role, u.created_at,
        COALESCE(f.has_dashboard, 1) as has_dashboard,
        COALESCE(f.has_chats, 1) as has_chats,
        COALESCE(f.has_flows, 1) as has_flows,
        COALESCE(f.has_ads, 1) as has_ads,
        COALESCE(f.has_integrations, 1) as has_integrations,
        COALESCE(f.has_settings, 1) as has_settings,
        COALESCE(f.plan, 'Básico') as plan,
        COALESCE(f.is_active, 1) as is_active,
        (SELECT COUNT(*) FROM leads WHERE user_id = u.id) as leads_count,
        (SELECT COUNT(*) FROM automations WHERE user_id = u.id) as automations_count
      FROM users u
      LEFT JOIN user_features f ON f.user_id = u.id
      WHERE u.role != 'superadmin'
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// POST /api/admin/users — create a new client user
router.post('/users', (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, company, plan = 'Básico', role: userRole } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son obligatorios' });
      return;
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Ya existe un usuario con este email' });
      return;
    }

    const hash = hashPassword(password);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)'
    ).run(email, hash, name || '', company || '', userRole === 'subadmin' ? 'subadmin' : 'Admin');

    const userId = result.lastInsertRowid as number;

    // Set feature permissions based on plan
    const planFeatures = getPlanFeatures(plan);
    db.prepare(`
      INSERT INTO user_features (user_id, has_dashboard, has_chats, has_flows, has_ads, has_integrations, has_settings, plan, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(userId, ...planFeatures, plan);

    // Seed defaults
    seedIntegrations(userId);
    db.prepare('INSERT INTO knowledge_base (user_id, content) VALUES (?, ?)').run(userId, '');
    db.prepare('INSERT INTO team_members (user_id, name, email, role, status) VALUES (?, ?, ?, ?, ?)').run(
      userId, name || 'Admin', email, 'Admin', 'Activo'
    );

    const user = db.prepare(`
      SELECT u.id, u.email, u.name, u.company, u.role, u.created_at,
        f.has_dashboard, f.has_chats, f.has_flows, f.has_ads, f.has_integrations, f.has_settings, f.plan, f.is_active
      FROM users u JOIN user_features f ON f.user_id = u.id WHERE u.id = ?
    `).get(userId);

    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// PUT /api/admin/users/:id — update user info + features
router.put('/users/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, company, plan, is_active, has_dashboard, has_chats, has_flows, has_ads, has_integrations, has_settings } = req.body;
    const db = getDb();

    if (name !== undefined || company !== undefined) {
      db.prepare('UPDATE users SET name = COALESCE(?, name), company = COALESCE(?, company) WHERE id = ?')
        .run(name ?? null, company ?? null, id);
    }

    // Upsert features
    const existing = db.prepare('SELECT user_id FROM user_features WHERE user_id = ?').get(id);
    if (existing) {
      const sets: string[] = [];
      const vals: any[] = [];
      if (plan !== undefined) { sets.push('plan = ?'); vals.push(plan); }
      if (is_active !== undefined) { sets.push('is_active = ?'); vals.push(is_active ? 1 : 0); }
      if (has_dashboard !== undefined) { sets.push('has_dashboard = ?'); vals.push(has_dashboard ? 1 : 0); }
      if (has_chats !== undefined) { sets.push('has_chats = ?'); vals.push(has_chats ? 1 : 0); }
      if (has_flows !== undefined) { sets.push('has_flows = ?'); vals.push(has_flows ? 1 : 0); }
      if (has_ads !== undefined) { sets.push('has_ads = ?'); vals.push(has_ads ? 1 : 0); }
      if (has_integrations !== undefined) { sets.push('has_integrations = ?'); vals.push(has_integrations ? 1 : 0); }
      if (has_settings !== undefined) { sets.push('has_settings = ?'); vals.push(has_settings ? 1 : 0); }
      if (sets.length > 0) {
        db.prepare(`UPDATE user_features SET ${sets.join(', ')} WHERE user_id = ?`).run(...vals, id);
      }
    } else {
      const planFeatures = getPlanFeatures(plan || 'Básico');
      db.prepare(`
        INSERT INTO user_features (user_id, has_dashboard, has_chats, has_flows, has_ads, has_integrations, has_settings, plan, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, ...planFeatures, plan || 'Básico', is_active !== false ? 1 : 0);
    }

    const user = db.prepare(`
      SELECT u.id, u.email, u.name, u.company, u.role, u.created_at,
        COALESCE(f.has_dashboard,1) as has_dashboard, COALESCE(f.has_chats,1) as has_chats,
        COALESCE(f.has_flows,1) as has_flows, COALESCE(f.has_ads,1) as has_ads,
        COALESCE(f.has_integrations,1) as has_integrations, COALESCE(f.has_settings,1) as has_settings,
        COALESCE(f.plan,'Básico') as plan, COALESCE(f.is_active,1) as is_active
      FROM users u LEFT JOIN user_features f ON f.user_id = u.id WHERE u.id = ?
    `).get(id);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Subadmins cannot delete users
    if ((req as any).adminRole === 'subadmin') {
      res.status(403).json({ error: 'Los sub-administradores no pueden eliminar clientes.' });
      return;
    }
    const db = getDb();
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as any;
    if (user?.role === 'superadmin') {
      res.status(403).json({ error: 'No se puede eliminar al superadmin' });
      return;
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// GET /api/admin/users/:id/features — get a user's features
router.get('/users/:id/features', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const features = db.prepare(`
      SELECT COALESCE(f.has_dashboard,1) as has_dashboard, COALESCE(f.has_chats,1) as has_chats,
        COALESCE(f.has_flows,1) as has_flows, COALESCE(f.has_ads,1) as has_ads,
        COALESCE(f.has_integrations,1) as has_integrations, COALESCE(f.has_settings,1) as has_settings,
        COALESCE(f.plan,'Básico') as plan, COALESCE(f.is_active,1) as is_active
      FROM users u LEFT JOIN user_features f ON f.user_id = u.id WHERE u.id = ?
    `).get(req.params.id);
    res.json(features || {});
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// GET /api/admin/ai-config
router.get('/ai-config', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM global_settings WHERE key = 'openai_api_key'").get() as any;
    const key = row?.value || '';
    res.json({
      hasKey: key.length > 10,
      keyPreview: key.length > 10 ? key.substring(0, 7) + '...' + key.substring(key.length - 4) : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// PUT /api/admin/ai-config
router.put('/ai-config', (req: AuthRequest, res: Response) => {
  try {
    const { openaiApiKey } = req.body;
    if (!openaiApiKey || openaiApiKey.trim().length < 10) {
      res.status(400).json({ error: 'Clave de API inválida' });
      return;
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO global_settings (key, value) VALUES ('openai_api_key', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(openaiApiKey.trim());
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// DELETE /api/admin/ai-config
router.delete('/ai-config', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM global_settings WHERE key = 'openai_api_key'").run();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno: ' + error.message });
  }
});

// ─── Knowledge Base per client ───────────────────────────────────────────────

// GET /api/admin/users/:id/knowledge
router.get('/users/:id/knowledge', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const kb = db.prepare('SELECT content, agent_name FROM knowledge_base WHERE user_id = ?').get(req.params.id) as any;
    res.json({ content: kb?.content || '', agentName: kb?.agent_name || 'Agente IA' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id/knowledge
router.put('/users/:id/knowledge', (req: AuthRequest, res: Response) => {
  try {
    const { content, agentName } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM knowledge_base WHERE user_id = ?').get(req.params.id);
    if (existing) {
      db.prepare("UPDATE knowledge_base SET content = ?, agent_name = ? WHERE user_id = ?").run(content || '', agentName || 'Agente IA', req.params.id);
    } else {
      db.prepare('INSERT INTO knowledge_base (user_id, content, agent_name) VALUES (?, ?, ?)').run(req.params.id, content || '', agentName || 'Agente IA');
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Collection AI prompt per client ─────────────────────────────────────────

// GET /api/admin/users/:id/collection-prompt
router.get('/users/:id/collection-prompt', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT collection_prompt FROM knowledge_base WHERE user_id = ?').get(req.params.id) as any;
    res.json({ collection_prompt: row?.collection_prompt || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id/collection-prompt
router.put('/users/:id/collection-prompt', (req: AuthRequest, res: Response) => {
  try {
    const { collection_prompt } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM knowledge_base WHERE user_id = ?').get(req.params.id);
    if (existing) {
      db.prepare("UPDATE knowledge_base SET collection_prompt = ? WHERE user_id = ?")
        .run(collection_prompt || '', req.params.id);
    } else {
      db.prepare("INSERT INTO knowledge_base (user_id, content, collection_prompt) VALUES (?, '', ?)")
        .run(req.params.id, collection_prompt || '');
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/sellia-collection-prompt — Sellia's own collection AI prompt
router.get('/sellia-collection-prompt', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT collection_prompt FROM knowledge_base WHERE user_id = ?').get(req.userId) as any;
    res.json({ collection_prompt: row?.collection_prompt || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/sellia-collection-prompt
router.put('/sellia-collection-prompt', (req: AuthRequest, res: Response) => {
  try {
    const { collection_prompt } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM knowledge_base WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare("UPDATE knowledge_base SET collection_prompt = ? WHERE user_id = ?")
        .run(collection_prompt || '', req.userId);
    } else {
      db.prepare("INSERT INTO knowledge_base (user_id, content, collection_prompt) VALUES (?, '', ?)")
        .run(req.userId, collection_prompt || '');
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Collection AI preview (generate a sample collection message) ────────────

// POST /api/admin/collection-preview
// body: { userId?, debtorName, installNum, amount, dueDate, payLink?, bankInfo?, msgType, isSellia? }
router.post('/collection-preview', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, debtorName, installNum, amount, dueDate, payLink, bankInfo, msgType, isSellia } = req.body;
    if (!debtorName || !installNum || !amount || !dueDate || !msgType) {
      res.status(400).json({ error: 'Faltan campos requeridos.' });
      return;
    }

    const db = getDb();
    let collectionPrompt = '';
    if (isSellia) {
      const row = db.prepare('SELECT collection_prompt FROM knowledge_base WHERE user_id = ?').get(req.userId) as any;
      collectionPrompt = row?.collection_prompt || '';
    } else if (userId) {
      const row = db.prepare('SELECT collection_prompt FROM knowledge_base WHERE user_id = ?').get(userId) as any;
      collectionPrompt = row?.collection_prompt || '';
    }

    const META: Record<string, { timing: string; tone: string }> = {
      reminder_5d: { timing: 'faltan 5 días para el vencimiento', tone: 'amable y preventivo' },
      due_day:     { timing: 'hoy es el día de vencimiento',       tone: 'directo pero cordial' },
      late_3d:     { timing: 'la cuota venció hace 3 días y no se registró pago', tone: 'preocupado, ofrece ayuda para coordinar' },
      late_7d:     { timing: 'la cuota venció hace 7 días sin respuesta',         tone: 'más serio, menciona posible impacto sin ser agresivo' },
      late_15d:    { timing: 'la cuota venció hace 15 días sin pago',             tone: 'firme y claro, informa suspensión del servicio hasta regularizar' },
    };
    const meta = META[msgType];
    if (!meta) { res.status(400).json({ error: 'Tipo de mensaje inválido.' }); return; }

    const paymentInfo = [
      payLink ? `Link de pago: ${payLink}` : null,
      bankInfo ? `Datos bancarios: ${bankInfo}` : null,
      'Efectivo (coordinar directamente)',
    ].filter(Boolean).join('\n');

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `Eres un asistente de cobranza por WhatsApp. Tu trabajo es redactar mensajes de cobro efectivos, humanos y en el tono correcto según el contexto.\n\n${collectionPrompt ? `CONTEXTO DEL NEGOCIO:\n${collectionPrompt}\n` : ''}REGLAS:\n- Escribe SOLO el mensaje de WhatsApp, sin explicaciones ni metadatos.\n- Usa lenguaje natural y cercano, como lo haría una persona real.\n- Incluye emojis con moderación.\n- Si hay link de pago o datos bancarios, inclúyelos de forma natural.\n- El mensaje debe ser conciso: máximo 4-5 líneas.`,
        },
        {
          role: 'user',
          content: `Redacta un mensaje de WhatsApp para cobro con estas características:\n\n- Contexto de timing: ${meta.timing}\n- Tono requerido: ${meta.tone}\n- Nombre del deudor: ${debtorName}\n- Número de cuota: ${installNum}\n- Monto: $${amount}\n- Fecha de vencimiento: ${dueDate}\n- Opciones de pago:\n${paymentInfo}\n\nResponde SOLO con el mensaje listo para copiar y enviar por WhatsApp.`,
        },
      ],
    });

    const message = completion.choices[0]?.message?.content?.trim() || '';
    res.json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── AI Training Chat (simulate WhatsApp conversation as a client) ────────────

// POST /api/admin/ai-test-chat
// Admin simulates being a user's customer to test how Sellia responds.
// body: { userId, messages: [{role, content}] }
router.post('/ai-test-chat', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, messages } = req.body;
    if (!userId || !Array.isArray(messages)) {
      res.status(400).json({ error: 'userId y messages son requeridos.' });
      return;
    }

    const db = getDb();
    const targetUser = db.prepare("SELECT id, name, company FROM users WHERE id = ? AND role != 'superadmin'").get(userId) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'Cliente no encontrado.' });
      return;
    }

    const kbRow = db.prepare('SELECT content FROM knowledge_base WHERE user_id = ?').get(userId) as any;
    const kb = kbRow?.content || '';

    const openai = getOpenAI();

    const systemInstruction = `Eres un agente de ventas IA proactivo y profesional por WhatsApp. Tu nombre es Sellia. Tu objetivo es CERRAR VENTAS.
Cliente que representas: ${targetUser.name || ''} (${targetUser.company || ''}).

REGLAS:
- Responde ÚNICAMENTE con información de la base de conocimientos del cliente.
- Si te preguntan algo que no está en la base, di: "No tengo esa información. ¿Quieres que un asesor te contacte?"
- NUNCA inventes precios, servicios o datos que no estén en la base de conocimientos.
- Responde de forma conversacional y natural para WhatsApp. Mensajes cortos y directos.
- Usa emojis con moderación para ser más amigable.

ESTRATEGIA DE CIERRE:
- Cuando detectes interés real, propón el cierre directamente.
- Si el usuario acepta la compra, incluye "VENTA_CERRADA:" en tu respuesta.

CLASIFICACIÓN (incluye al inicio de cada respuesta):
[ESTADO:Nuevo] | [ESTADO:Calificado] | [ESTADO:En Negociación] | [ESTADO:Cerrado Ganado] | [ESTADO:Cerrado Perdido]

BASE DE CONOCIMIENTOS DEL CLIENTE:
${kb || 'Sin base de conocimientos configurada. El admin debe añadir información del negocio del cliente.'}`;

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
    const stateMatch = raw.match(/\[ESTADO:(.+?)\]/);
    const newStatus = stateMatch ? stateMatch[1].trim() : null;
    let content = raw.replace(/\[ESTADO:[^\]]+\]/g, '').trim();
    const saleDetected = content.includes('VENTA_CERRADA:');
    if (saleDetected) content = content.replace('VENTA_CERRADA:', '').trim();

    res.json({ content, newStatus, saleDetected });
  } catch (error: any) {
    console.error('[Admin AI Test]', error.message);
    res.status(500).json({ error: 'Error al llamar a la IA: ' + error.message });
  }
});

// ─── Growth Analyzer ──────────────────────────────────────────────────────────

// POST /api/admin/growth-analyze
// body: { userId }
// Analyzes the user's recent conversations and proposes improvements.
router.post('/growth-analyze', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId es requerido.' });
      return;
    }

    const db = getDb();
    const targetUser = db.prepare('SELECT id, name, company FROM users WHERE id = ?').get(userId) as any;
    if (!targetUser) {
      res.status(404).json({ error: 'Cliente no encontrado.' });
      return;
    }

    // Get last 50 messages across all leads
    const messages = db.prepare(`
      SELECT m.role, m.content, m.created_at, l.name as lead_name, l.status as lead_status
      FROM messages m
      JOIN leads l ON l.id = m.lead_id
      WHERE l.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT 100
    `).all(userId) as any[];

    if (messages.length < 3) {
      res.json({
        analysis: 'No hay suficientes conversaciones para analizar. Se necesitan al menos 3 mensajes.',
        suggestions: [],
        kbSuggestions: [],
      });
      return;
    }

    // Get stats
    const totalLeads = (db.prepare('SELECT COUNT(*) as c FROM leads WHERE user_id = ?').get(userId) as any).c;
    const closedWon = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'Cerrado Ganado'").get(userId) as any).c;
    const closedLost = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'Cerrado Perdido'").get(userId) as any).c;
    const kbRow = db.prepare('SELECT content FROM knowledge_base WHERE user_id = ?').get(userId) as any;
    const kb = kbRow?.content || '';

    const conversationSample = messages.slice(0, 60).reverse().map((m: any) =>
      `[${m.lead_name} - ${m.lead_status}] ${m.role === 'user' ? 'Cliente' : 'IA'}: ${m.content}`
    ).join('\n');

    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en ventas consultivas y optimización de chatbots de ventas. Analiza conversaciones de WhatsApp y da recomendaciones accionables. Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto adicional.',
        },
        {
          role: 'user',
          content: `Analiza el desempeño del agente IA de ventas para el negocio "${targetUser.name} (${targetUser.company})".

ESTADÍSTICAS:
- Total leads: ${totalLeads}
- Ventas cerradas: ${closedWon}
- Perdidos: ${closedLost}
- Tasa de conversión: ${totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : 0}%

BASE DE CONOCIMIENTOS ACTUAL:
${kb || 'Vacía'}

MUESTRA DE CONVERSACIONES RECIENTES:
${conversationSample}

Devuelve un JSON con estas claves:
- summary (string): resumen ejecutivo de 2-3 oraciones del desempeño actual
- strengths (array of strings): 2-3 cosas que el agente hace bien
- weaknesses (array of strings): 2-3 problemas o patrones negativos detectados
- suggestions (array of strings): 3-5 recomendaciones concretas y accionables para mejorar las conversiones
- kbSuggestions (array of strings): 3-5 fragmentos de texto concretos que se deberían añadir a la base de conocimientos (información faltante detectada en las conversaciones)
- conversionScore (number 0-100): puntuación del desempeño actual del agente`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('[Growth Analyzer]', error.message);
    res.status(500).json({ error: 'Error al analizar: ' + error.message });
  }
});

function getPlanFeatures(plan: string): number[] {
  switch (plan) {
    case 'Enterprise': return [1, 1, 1, 1, 1, 1];
    case 'Pro':        return [1, 1, 1, 0, 1, 1];
    case 'Básico':
    default:           return [1, 1, 0, 0, 1, 1];
  }
}

// GET /api/admin/sellia-kb — returns admin's own KB for Sellia sales pitch
router.get('/sellia-kb', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT content, agent_name FROM knowledge_base WHERE user_id = ?").get(req.userId) as any;
    res.json({ content: row?.content || '', agentName: row?.agent_name || 'Sellia' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/sellia-whatsapp — returns admin's own WhatsApp config
router.get('/sellia-whatsapp', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const config = db.prepare('SELECT * FROM whatsapp_configs WHERE user_id = ?').get(req.userId) as any;
    if (!config) { res.json({ configured: false, phoneNumberId: '', businessAccountId: '', displayName: '', verifyToken: '' }); return; }
    res.json({ configured: !!config.enabled, phoneNumberId: config.phone_number_id || '', businessAccountId: config.business_account_id || '', displayName: config.display_name || '', verifyToken: config.verify_token || '' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// PUT /api/admin/sellia-whatsapp — saves admin's own WhatsApp config
router.put('/sellia-whatsapp', (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumberId, accessToken, businessAccountId, displayName } = req.body;
    if (!phoneNumberId || !accessToken) { res.status(400).json({ error: 'phoneNumberId y accessToken son obligatorios' }); return; }
    const db = getDb();
    const existing = db.prepare('SELECT id, verify_token FROM whatsapp_configs WHERE user_id = ?').get(req.userId) as any;
    const verifyToken = existing?.verify_token || `sellia_${req.userId}_wh`;
    if (existing) {
      db.prepare('UPDATE whatsapp_configs SET phone_number_id=?, access_token=?, business_account_id=?, display_name=?, enabled=1 WHERE user_id=?')
        .run(phoneNumberId, accessToken, businessAccountId || '', displayName || '', req.userId);
    } else {
      db.prepare('INSERT INTO whatsapp_configs (user_id, phone_number_id, access_token, business_account_id, display_name, verify_token, enabled) VALUES (?,?,?,?,?,?,1)')
        .run(req.userId, phoneNumberId, accessToken, businessAccountId || '', displayName || '', verifyToken);
    }
    res.json({ success: true, verifyToken });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// PUT /api/admin/sellia-kb — saves admin's own KB for Sellia
router.put('/sellia-kb', (req: AuthRequest, res: Response) => {
  try {
    const { content, agentName } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM knowledge_base WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare("UPDATE knowledge_base SET content = ?, agent_name = ? WHERE user_id = ?")
        .run(content || '', agentName || 'Sellia', req.userId);
    } else {
      db.prepare("INSERT INTO knowledge_base (user_id, content, agent_name) VALUES (?, ?, ?)")
        .run(req.userId, content || '', agentName || 'Sellia');
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/leads/recent — recent leads across all clients (for notifications)
router.get('/leads/recent', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const leads = db.prepare(`
      SELECT l.id, l.name, l.status, l.channel, COALESCE(l.updated_at, l.created_at) as updated_at,
        u.id as user_id, u.name as client_name, u.company as client_company,
        (SELECT COUNT(*) FROM messages WHERE lead_id = l.id) as message_count,
        (SELECT content FROM messages WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM leads l
      JOIN users u ON u.id = l.user_id
      WHERE u.role != 'superadmin'
      ORDER BY COALESCE(l.updated_at, l.created_at) DESC
      LIMIT 50
    `).all();
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:id/leads — leads for a specific client
router.get('/users/:id/leads', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const leads = db.prepare(`
      SELECT l.id, l.name, l.company, l.channel, l.status, l.score, l.created_at,
        COALESCE(l.updated_at, l.created_at) as updated_at,
        (SELECT COUNT(*) FROM messages WHERE lead_id = l.id) as message_count,
        (SELECT content FROM messages WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM leads l
      WHERE l.user_id = ?
      ORDER BY COALESCE(l.updated_at, l.created_at) DESC
    `).all(req.params.id);
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:id/leads/:leadId/messages
router.get('/users/:id/leads/:leadId/messages', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const lead = db.prepare('SELECT id, name, status FROM leads WHERE id = ? AND user_id = ?').get(req.params.leadId, req.params.id) as any;
    if (!lead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }
    const messages = db.prepare('SELECT id, role, content, created_at FROM messages WHERE lead_id = ? ORDER BY created_at ASC').all(req.params.leadId);
    res.json({ lead, messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:id/whatsapp — get WhatsApp config for a client
router.get('/users/:id/whatsapp', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    let config: any = null;
    try {
      config = db.prepare('SELECT phone_number_id, access_token, business_account_id, display_name, verify_token FROM whatsapp_configs WHERE user_id = ?').get(req.params.id);
    } catch {
      // Table might not exist
    }
    if (!config) {
      res.json({ phoneNumberId: '', accessToken: '', businessAccountId: '', displayName: '', verifyToken: '', configured: false });
      return;
    }
    res.json({
      phoneNumberId: config.phone_number_id || '',
      accessToken: config.access_token ? config.access_token.substring(0, 8) + '...' : '',
      accessTokenFull: config.access_token || '',
      businessAccountId: config.business_account_id || '',
      displayName: config.display_name || '',
      verifyToken: config.verify_token || '',
      configured: !!(config.phone_number_id && config.access_token),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id/whatsapp — save WhatsApp config for a client
router.put('/users/:id/whatsapp', (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumberId, accessToken, businessAccountId, displayName } = req.body;
    if (!phoneNumberId || !accessToken) {
      res.status(400).json({ error: 'phoneNumberId y accessToken son obligatorios' });
      return;
    }
    const db = getDb();
    const existing = db.prepare('SELECT id, verify_token FROM whatsapp_configs WHERE user_id = ?').get(req.params.id) as any;
    // Keep existing verify token — never regenerate it on update
    const verifyToken = existing?.verify_token || `sellia_${req.params.id}_wh`;

    if (existing) {
      db.prepare(`UPDATE whatsapp_configs SET phone_number_id=?, access_token=?, business_account_id=?, display_name=? WHERE user_id=?`)
        .run(phoneNumberId, accessToken, businessAccountId || '', displayName || '', req.params.id);
    } else {
      db.prepare('INSERT INTO whatsapp_configs (user_id, phone_number_id, access_token, business_account_id, display_name, verify_token) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.params.id, phoneNumberId, accessToken, businessAccountId || '', displayName || '', verifyToken);
    }
    res.json({ success: true, verifyToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:id/stats — per-client stats for Sellia Analyzer
router.get('/users/:id/stats', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const uid = req.params.id;
    const totalLeads = (db.prepare('SELECT COUNT(*) as c FROM leads WHERE user_id = ?').get(uid) as any).c;
    const closedWon = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'Cerrado Ganado'").get(uid) as any).c;
    const closedLost = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'Cerrado Perdido'").get(uid) as any).c;
    const inNegotiation = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'En Negociación'").get(uid) as any).c;
    const qualified = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'Calificado'").get(uid) as any).c;
    const newLeads = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE user_id = ? AND status = 'Nuevo'").get(uid) as any).c;
    const totalMessages = (db.prepare('SELECT COUNT(*) as c FROM messages m JOIN leads l ON l.id = m.lead_id WHERE l.user_id = ?').get(uid) as any).c;
    const automations = (db.prepare('SELECT COUNT(*) as c FROM automations WHERE user_id = ?').get(uid) as any).c;
    const conversionRate = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : '0.0';

    const byChannel = db.prepare(`
      SELECT channel, COUNT(*) as count FROM leads WHERE user_id = ? GROUP BY channel
    `).all(uid);

    const recentLeads = db.prepare(`
      SELECT id, name, status, channel, score, COALESCE(updated_at, created_at) as updated_at FROM leads WHERE user_id = ? ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 10
    `).all(uid);

    res.json({
      totalLeads, closedWon, closedLost, inNegotiation, qualified, newLeads,
      totalMessages, automations, conversionRate, byChannel, recentLeads
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
