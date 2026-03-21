import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../types.js';
import { runCollectionScheduler } from '../lib/collectionScheduler.js';

const router = Router();

// If the authenticated user is a subadmin, resolve to the superadmin's user_id
function getEffectiveUserId(req: AuthRequest): number {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as any;
  if (user?.role === 'subadmin') {
    const superadmin = db.prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1").get() as any;
    if (superadmin) return superadmin.id;
  }
  return req.userId!;
}

// ─── GET /api/collections ─────────────────────────────────────────────────────

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    const plans = db.prepare(`
      SELECT * FROM payment_plans
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(effectiveUserId) as any[];

    const enriched = plans.map(plan => {
      const installments = db.prepare(`
        SELECT * FROM payment_installments
        WHERE plan_id = ?
        ORDER BY installment_number ASC
      `).all(plan.id) as any[];

      const nextDue = installments.find(i => i.status === 'pending' || i.status === 'overdue');

      return {
        ...plan,
        installments,
        nextDue: nextDue?.due_date || null,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    console.error('Get collections error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── POST /api/collections ────────────────────────────────────────────────────

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    const {
      name,
      debtorName,
      debtorPhone,
      leadId,
      totalAmount,
      installmentsCount,
      startDate,
      paymentLink,
      bankInfo,
      notes,
    } = req.body;

    if (!name || !debtorName || !totalAmount || !installmentsCount || !startDate) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    const count = parseInt(installmentsCount, 10) || 1;
    const total = parseFloat(totalAmount) || 0;
    const amountPerInstallment = parseFloat((total / count).toFixed(2));

    const result = db.prepare(`
      INSERT INTO payment_plans
        (user_id, lead_id, name, debtor_name, debtor_phone, total_amount, installments_count, payment_link, bank_info, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      effectiveUserId,
      leadId || null,
      name,
      debtorName,
      debtorPhone || '',
      total,
      count,
      paymentLink || '',
      bankInfo || '',
      notes || '',
    );

    const planId = result.lastInsertRowid as number;

    // Auto-generate installments (one per 30 days starting from startDate)
    const start = new Date(startDate);
    const installStmt = db.prepare(`
      INSERT INTO payment_installments (plan_id, installment_number, amount, due_date)
      VALUES (?, ?, ?, ?)
    `);

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + i * 30);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      installStmt.run(planId, i + 1, amountPerInstallment, dueDateStr);
    }

    // Return the created plan with installments
    const plan = db.prepare('SELECT * FROM payment_plans WHERE id = ?').get(planId) as any;
    const installments = db.prepare(`
      SELECT * FROM payment_installments WHERE plan_id = ? ORDER BY installment_number ASC
    `).all(planId) as any[];

    res.status(201).json({ ...plan, installments });
  } catch (error: any) {
    console.error('Create collection error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/collections/all — superadmin: all plans across all users ─────────
// MUST be defined BEFORE /:id to avoid Express matching 'all' as an ID param

router.get('/all', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as any;
    if (user?.role !== 'superadmin') { res.status(403).json({ error: 'Forbidden' }); return; }

    const plans = db.prepare(`
      SELECT pp.*, u.name as user_name, u.company as user_company, l.email as debtor_email
      FROM payment_plans pp
      LEFT JOIN users u ON u.id = pp.user_id
      LEFT JOIN leads l ON l.id = pp.lead_id
      ORDER BY pp.created_at DESC
    `).all() as any[];

    const enriched = plans.map(plan => {
      const installments = db.prepare('SELECT * FROM payment_installments WHERE plan_id = ? ORDER BY installment_number ASC').all(plan.id) as any[];
      const paid = installments.filter((i: any) => i.status === 'paid').length;
      const overdue = installments.filter((i: any) => i.status === 'overdue').length;
      const nextDue = installments.find((i: any) => i.status === 'pending' || i.status === 'overdue');
      return { ...plan, installments, paid, overdue, nextDue: nextDue?.due_date || null };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/collections/:id ─────────────────────────────────────────────────

router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    const plan = db.prepare(`
      SELECT * FROM payment_plans WHERE id = ? AND user_id = ?
    `).get(req.params.id, effectiveUserId) as any;

    if (!plan) {
      res.status(404).json({ error: 'Plan no encontrado' });
      return;
    }

    const installments = db.prepare(`
      SELECT * FROM payment_installments WHERE plan_id = ? ORDER BY installment_number ASC
    `).all(plan.id) as any[];

    // Attach sent messages to each installment
    const installmentsWithMessages = installments.map(inst => {
      const sentMessages = db.prepare(`
        SELECT * FROM collection_messages_sent WHERE installment_id = ? ORDER BY sent_at ASC
      `).all(inst.id) as any[];
      return { ...inst, sentMessages };
    });

    res.json({ ...plan, installments: installmentsWithMessages });
  } catch (error: any) {
    console.error('Get collection error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── PUT /api/collections/:id ─────────────────────────────────────────────────

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    const plan = db.prepare(`
      SELECT * FROM payment_plans WHERE id = ? AND user_id = ?
    `).get(req.params.id, effectiveUserId) as any;

    if (!plan) {
      res.status(404).json({ error: 'Plan no encontrado' });
      return;
    }

    const { name, debtorName, debtorPhone, paymentLink, bankInfo, notes, status } = req.body;

    db.prepare(`
      UPDATE payment_plans SET
        name = COALESCE(?, name),
        debtor_name = COALESCE(?, debtor_name),
        debtor_phone = COALESCE(?, debtor_phone),
        payment_link = COALESCE(?, payment_link),
        bank_info = COALESCE(?, bank_info),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      name || null,
      debtorName || null,
      debtorPhone || null,
      paymentLink !== undefined ? paymentLink : null,
      bankInfo !== undefined ? bankInfo : null,
      notes !== undefined ? notes : null,
      status || null,
      req.params.id,
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update collection error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── DELETE /api/collections/:id ──────────────────────────────────────────────

router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    db.prepare(`DELETE FROM payment_plans WHERE id = ? AND user_id = ?`).run(req.params.id, effectiveUserId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete collection error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── PUT /api/collections/installments/:id/pay ────────────────────────────────

router.put('/installments/:id/pay', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    // Verify the installment belongs to the user via the plan
    const installment = db.prepare(`
      SELECT pi.* FROM payment_installments pi
      JOIN payment_plans pp ON pp.id = pi.plan_id
      WHERE pi.id = ? AND pp.user_id = ?
    `).get(req.params.id, effectiveUserId) as any;

    if (!installment) {
      res.status(404).json({ error: 'Cuota no encontrada' });
      return;
    }

    db.prepare(`
      UPDATE payment_installments SET status = 'paid', paid_at = datetime('now') WHERE id = ?
    `).run(req.params.id);

    // Check if all installments of the plan are now paid
    const remaining = db.prepare(`
      SELECT COUNT(*) as cnt FROM payment_installments WHERE plan_id = ? AND status != 'paid'
    `).get(installment.plan_id) as any;

    if (remaining.cnt === 0) {
      db.prepare(`UPDATE payment_plans SET status = 'completed' WHERE id = ?`).run(installment.plan_id);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── PUT /api/collections/installments/:id/unpay ─────────────────────────────

router.put('/installments/:id/unpay', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);

    // Verify the installment belongs to the user via the plan
    const installment = db.prepare(`
      SELECT pi.* FROM payment_installments pi
      JOIN payment_plans pp ON pp.id = pi.plan_id
      WHERE pi.id = ? AND pp.user_id = ?
    `).get(req.params.id, effectiveUserId) as any;

    if (!installment) {
      res.status(404).json({ error: 'Cuota no encontrada' });
      return;
    }

    // Revert to pending (or overdue if past due date)
    const today = new Date().toISOString().split('T')[0];
    const newStatus = installment.due_date < today ? 'overdue' : 'pending';

    db.prepare(`
      UPDATE payment_installments SET status = ?, paid_at = NULL WHERE id = ?
    `).run(newStatus, req.params.id);

    // If plan was completed, revert to active
    db.prepare(`UPDATE payment_plans SET status = 'active' WHERE id = ? AND status = 'completed'`).run(installment.plan_id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Unmark paid error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/collections/config ─────────────────────────────────────────────
// MUST be before /:id

router.get('/config', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);
    const row = db.prepare('SELECT collection_prompt FROM knowledge_base WHERE user_id = ?').get(effectiveUserId) as any;
    res.json({ collection_prompt: row?.collection_prompt || '' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── PUT /api/collections/config ─────────────────────────────────────────────

router.put('/config', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);
    const { collection_prompt } = req.body;

    // Upsert into knowledge_base
    const existing = db.prepare('SELECT id FROM knowledge_base WHERE user_id = ?').get(effectiveUserId);
    if (existing) {
      db.prepare(`UPDATE knowledge_base SET collection_prompt = ?, updated_at = datetime('now') WHERE user_id = ?`)
        .run(collection_prompt || '', effectiveUserId);
    } else {
      db.prepare(`INSERT INTO knowledge_base (user_id, content, collection_prompt) VALUES (?, '', ?)`)
        .run(effectiveUserId, collection_prompt || '');
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update collection config error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── DELETE /api/collections/:id/messages — clear sent message history ────────

router.delete('/:id/messages', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const effectiveUserId = getEffectiveUserId(req);
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as any;

    const plan = user?.role === 'superadmin'
      ? db.prepare('SELECT id FROM payment_plans WHERE id = ?').get(req.params.id) as any
      : db.prepare('SELECT id FROM payment_plans WHERE id = ? AND user_id = ?').get(req.params.id, effectiveUserId) as any;

    if (!plan) { res.status(404).json({ error: 'Plan no encontrado' }); return; }

    db.prepare(`
      DELETE FROM collection_messages_sent
      WHERE installment_id IN (SELECT id FROM payment_installments WHERE plan_id = ?)
    `).run(req.params.id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── POST /api/collections/run-scheduler ──────────────────────────────────────

router.post('/run-scheduler', async (_req: AuthRequest, res: Response) => {
  try {
    await runCollectionScheduler();
    res.json({ success: true, message: 'Scheduler ejecutado correctamente' });
  } catch (error: any) {
    console.error('Run scheduler error:', error);
    res.status(500).json({ error: 'Error al ejecutar el scheduler' });
  }
});

export default router;
