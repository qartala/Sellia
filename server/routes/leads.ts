import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// If the authenticated user is a subadmin, resolve to the superadmin's user_id
// so subadmins operate on Sellia's leads/data transparently.
function getEffectiveUserId(req: AuthRequest): number {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as any;
  if (user?.role === 'subadmin') {
    const superadmin = db.prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1").get() as any;
    if (superadmin) return superadmin.id;
  }
  return req.userId!;
}

// GET /api/leads
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, channel, search } = req.query;
    const effectiveUserId = getEffectiveUserId(req);

    let query = 'SELECT * FROM leads WHERE user_id = ?';
    const params: any[] = [effectiveUserId];

    if (status && status !== 'Todos') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (channel) {
      query += ' AND channel = ?';
      params.push(channel);
    }
    if (search) {
      query += ' AND (name LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const leads = db.prepare(query).all(...params) as any[];

    // Attach tags, messages, insights to each lead
    const enriched = leads.map(lead => {
      const tags = db.prepare('SELECT tag FROM lead_tags WHERE lead_id = ?').all(lead.id).map((t: any) => t.tag);
      const messages = db.prepare('SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC').all(lead.id);
      const insights = db.prepare('SELECT * FROM lead_insights WHERE lead_id = ?').get(lead.id) as any;

      let parsedInsights = null;
      if (insights) {
        parsedInsights = {
          demographics: insights.demographics,
          interests: JSON.parse(insights.interests),
          painPoints: JSON.parse(insights.pain_points),
          needs: JSON.parse(insights.needs),
          opportunities: JSON.parse(insights.opportunities),
          buyingIntent: insights.buying_intent,
          platformParams: JSON.parse(insights.platform_params),
        };
      }

      return { ...lead, tags, messages, insights: parsedInsights, humanMode: !!lead.human_mode };
    });

    res.json(enriched);
  } catch (error: any) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/leads
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, company, channel, status, score, tags, messages } = req.body;
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    const result = db.prepare(
      'INSERT INTO leads (user_id, name, company, channel, status, score) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(effectiveUserId, name, company || '', channel || 'WhatsApp', status || 'Nuevo', score || 0);

    const leadId = result.lastInsertRowid as number;

    // Insert tags
    if (tags && Array.isArray(tags)) {
      const tagStmt = db.prepare('INSERT INTO lead_tags (lead_id, tag) VALUES (?, ?)');
      for (const tag of tags) {
        tagStmt.run(leadId, tag);
      }
    }

    // Insert initial messages
    if (messages && Array.isArray(messages)) {
      const msgStmt = db.prepare('INSERT INTO messages (lead_id, role, content) VALUES (?, ?, ?)');
      for (const msg of messages) {
        msgStmt.run(leadId, msg.role, msg.content);
      }
    }

    // Create default insights
    db.prepare('INSERT INTO lead_insights (lead_id) VALUES (?)').run(leadId);

    // Return the complete lead
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    const allTags = db.prepare('SELECT tag FROM lead_tags WHERE lead_id = ?').all(leadId).map((t: any) => t.tag);
    const allMessages = db.prepare('SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC').all(leadId);

    res.status(201).json({ ...lead, tags: allTags, messages: allMessages, humanMode: false, insights: null });
  } catch (error: any) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/leads/:id
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, effectiveUserId) as any;
    if (!lead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }

    const tags = db.prepare('SELECT tag FROM lead_tags WHERE lead_id = ?').all(lead.id).map((t: any) => t.tag);
    const messages = db.prepare('SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC').all(lead.id);
    const insights = db.prepare('SELECT * FROM lead_insights WHERE lead_id = ?').get(lead.id) as any;

    let parsedInsights = null;
    if (insights) {
      parsedInsights = {
        demographics: insights.demographics,
        interests: JSON.parse(insights.interests),
        painPoints: JSON.parse(insights.pain_points),
        needs: JSON.parse(insights.needs),
        opportunities: JSON.parse(insights.opportunities),
        buyingIntent: insights.buying_intent,
        platformParams: JSON.parse(insights.platform_params),
      };
    }

    res.json({ ...lead, tags, messages, insights: parsedInsights, humanMode: !!lead.human_mode });
  } catch (error: any) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/leads/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, effectiveUserId);
    if (!lead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }

    const { name, company, channel, status, score, human_mode, humanMode, email, tags } = req.body;
    const hm = human_mode !== undefined ? (human_mode ? 1 : 0) : (humanMode !== undefined ? (humanMode ? 1 : 0) : undefined);

    db.prepare(`
      UPDATE leads SET
        name = COALESCE(?, name),
        company = COALESCE(?, company),
        channel = COALESCE(?, channel),
        status = COALESCE(?, status),
        score = COALESCE(?, score),
        human_mode = COALESCE(?, human_mode),
        email = COALESCE(?, email)
      WHERE id = ?
    `).run(name, company, channel, status, score, hm, email !== undefined ? email : null, req.params.id);

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      db.prepare('DELETE FROM lead_tags WHERE lead_id = ?').run(req.params.id);
      const tagStmt = db.prepare('INSERT INTO lead_tags (lead_id, tag) VALUES (?, ?)');
      for (const tag of tags) {
        tagStmt.run(req.params.id, tag);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);
    db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(req.params.id, effectiveUserId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/leads/:id/messages
router.post('/:id/messages', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);
    const lead = db.prepare('SELECT id FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, effectiveUserId);
    if (!lead) {
      res.status(404).json({ error: 'Lead no encontrado' });
      return;
    }

    const { role, content, source } = req.body;
    const result = db.prepare('INSERT INTO messages (lead_id, role, content, source) VALUES (?, ?, ?, ?)').run(req.params.id, role, content, source || 'bot');
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(msg);
  } catch (error: any) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/leads/:id/messages
router.get('/:id/messages', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const messages = db.prepare('SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json(messages);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/leads/:id/insights
router.put('/:id/insights', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { demographics, interests, painPoints, needs, opportunities, buyingIntent, platformParams } = req.body;

    const existing = db.prepare('SELECT id FROM lead_insights WHERE lead_id = ?').get(req.params.id);
    if (existing) {
      db.prepare(`
        UPDATE lead_insights SET
          demographics = COALESCE(?, demographics),
          interests = COALESCE(?, interests),
          pain_points = COALESCE(?, pain_points),
          needs = COALESCE(?, needs),
          opportunities = COALESCE(?, opportunities),
          buying_intent = COALESCE(?, buying_intent),
          platform_params = COALESCE(?, platform_params)
        WHERE lead_id = ?
      `).run(
        demographics,
        interests ? JSON.stringify(interests) : null,
        painPoints ? JSON.stringify(painPoints) : null,
        needs ? JSON.stringify(needs) : null,
        opportunities ? JSON.stringify(opportunities) : null,
        buyingIntent,
        platformParams ? JSON.stringify(platformParams) : null,
        req.params.id
      );
    } else {
      db.prepare(`
        INSERT INTO lead_insights (lead_id, demographics, interests, pain_points, needs, opportunities, buying_intent, platform_params)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.params.id,
        demographics || 'Sin datos',
        JSON.stringify(interests || []),
        JSON.stringify(painPoints || []),
        JSON.stringify(needs || []),
        JSON.stringify(opportunities || []),
        buyingIntent || 'Desconocida',
        JSON.stringify(platformParams || {})
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update insights error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
