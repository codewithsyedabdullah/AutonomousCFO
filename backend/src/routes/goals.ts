import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const goals = await db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.userId);
  res.json(goals);
});

router.post('/', async (req: Request, res: Response) => {
  const { name, target_amount, current_amount, target_date } = req.body;
  if (!name || target_amount === undefined) {
    res.status(400).json({ error: 'name and target_amount are required' });
    return;
  }

  const db = getDb();
  const id = uuidv4();
  await db.prepare(
    'INSERT INTO goals (id, user_id, name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user!.userId, name, parseFloat(target_amount), current_amount ? parseFloat(current_amount) : 0, target_date || null);

  res.status(201).json({ id });
});

router.put('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const goal = await db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.userId) as any;
  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  const { name, target_amount, current_amount, target_date } = req.body;
  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (target_amount !== undefined) { updates.push('target_amount = ?'); params.push(parseFloat(target_amount)); }
  if (current_amount !== undefined) { updates.push('current_amount = ?'); params.push(parseFloat(current_amount)); }
  if (target_date !== undefined) { updates.push('target_date = ?'); params.push(target_date); }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  params.push(req.params.id);
  await db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Goal updated' });
});

router.post('/:id/contribute', async (req: Request, res: Response) => {
  const db = getDb();
  const goal = await db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.userId) as any;
  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }
  const { amount } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    res.status(400).json({ error: 'Valid amount is required' });
    return;
  }
  const newAmount = goal.current_amount + parseFloat(amount);
  await db.prepare('UPDATE goals SET current_amount = ? WHERE id = ?').run(newAmount, req.params.id);
  res.json({ current_amount: newAmount });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const goal = await db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.userId) as any;
  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }
  await db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  res.json({ message: 'Goal deleted' });
});

export default router;
