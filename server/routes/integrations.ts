import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';

const router = Router();

// GET /api/integrations
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const integrations = db.prepare('SELECT * FROM integrations WHERE user_id = ?').all(req.userId);
    res.json(integrations);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/integrations/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { status, config } = req.body;
    const db = getDb();
    db.prepare('UPDATE integrations SET status = COALESCE(?, status), config = COALESCE(?, config) WHERE id = ? AND user_id = ?')
      .run(status, config ? JSON.stringify(config) : null, req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
