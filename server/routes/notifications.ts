import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// GET /api/notifications
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.userId);
    res.json(notifs);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/notifications
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { type, title, message } = req.body;
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)'
    ).run(req.userId, type || 'message', title, message);

    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(notif);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
