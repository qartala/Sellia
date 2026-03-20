import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// GET /api/campaigns
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/campaigns
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, platform, spend, revenue, reach, clicks, conversions, date, status } = req.body;
    const ctr = reach > 0 ? (clicks / reach) * 100 : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO campaigns (user_id, name, platform, status, spend, revenue, reach, clicks, conversions, roas, cpa, ctr, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId, name, platform || 'Meta Ads', status || 'Active',
      spend || 0, revenue || 0, reach || 0, clicks || 0, conversions || 0,
      Number(roas.toFixed(2)), Number(cpa.toFixed(2)), Number(ctr.toFixed(2)),
      date || new Date().toISOString().split('T')[0]
    );

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/campaigns/bulk — bulk insert from AI extraction
router.post('/bulk', (req: AuthRequest, res: Response) => {
  try {
    const { campaigns } = req.body;
    if (!Array.isArray(campaigns)) {
      res.status(400).json({ error: 'Se esperaba un array de campañas' });
      return;
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO campaigns (user_id, name, platform, status, spend, revenue, reach, clicks, conversions, roas, cpa, ctr, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const inserted: any[] = [];
    const insertMany = db.transaction((camps: any[]) => {
      for (const c of camps) {
        const ctr = c.reach > 0 ? (c.clicks / c.reach) * 100 : 0;
        const cpa = c.conversions > 0 ? c.spend / c.conversions : 0;
        const roas = c.spend > 0 ? c.revenue / c.spend : 0;

        const result = stmt.run(
          req.userId, c.name, c.platform || 'Meta Ads', 'Active',
          c.spend || 0, c.revenue || 0, c.reach || 0, c.clicks || 0, c.conversions || 0,
          Number(roas.toFixed(2)), Number(cpa.toFixed(2)), Number(ctr.toFixed(2)),
          c.date || new Date().toISOString().split('T')[0]
        );
        const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
        inserted.push(row);
      }
    });
    insertMany(campaigns);

    res.status(201).json(inserted);
  } catch (error) {
    console.error('Bulk create campaigns error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/campaigns/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, name, spend, revenue, reach, clicks, conversions } = req.body;

    // First apply the update
    db.prepare(`
      UPDATE campaigns SET
        status = COALESCE(?, status),
        name = COALESCE(?, name),
        spend = COALESCE(?, spend),
        revenue = COALESCE(?, revenue),
        reach = COALESCE(?, reach),
        clicks = COALESCE(?, clicks),
        conversions = COALESCE(?, conversions)
      WHERE id = ? AND user_id = ?
    `).run(status, name, spend, revenue, reach, clicks, conversions, req.params.id, req.userId);

    // Recalculate derived metrics from updated values
    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
    if (updated) {
      const ctr = updated.reach > 0 ? (updated.clicks / updated.reach) * 100 : 0;
      const cpa = updated.conversions > 0 ? updated.spend / updated.conversions : 0;
      const roas = updated.spend > 0 ? updated.revenue / updated.spend : 0;
      db.prepare('UPDATE campaigns SET ctr = ?, cpa = ?, roas = ? WHERE id = ?')
        .run(Number(ctr.toFixed(2)), Number(cpa.toFixed(2)), Number(roas.toFixed(2)), req.params.id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
