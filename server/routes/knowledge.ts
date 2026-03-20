import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// GET /api/knowledge
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const kb = db.prepare('SELECT * FROM knowledge_base WHERE user_id = ?').get(req.userId) as any;
    res.json(kb || { content: '' });
  } catch (error) {
    console.error('Get knowledge error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/knowledge
router.put('/', (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM knowledge_base WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare("UPDATE knowledge_base SET content = ?, updated_at = datetime('now') WHERE user_id = ?")
        .run(content, req.userId);
    } else {
      db.prepare('INSERT INTO knowledge_base (user_id, content) VALUES (?, ?)').run(req.userId, content);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update knowledge error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
