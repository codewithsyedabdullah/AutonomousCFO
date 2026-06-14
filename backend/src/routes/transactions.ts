import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { getDb } from '../db/connection';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { limit, offset } = req.query;
  const db = getDb();
  const userId = req.user!.userId;

  let query = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC';
  const params: any[] = [userId];

  const limitNum = limit ? parseInt(limit as string, 10) : null;
  const offsetNum = offset ? parseInt(offset as string, 10) : null;

  if (limitNum !== null && !isNaN(limitNum)) {
    query += ' LIMIT ?';
    params.push(limitNum);
  }
  if (offsetNum !== null && !isNaN(offsetNum)) {
    query += ' OFFSET ?';
    params.push(offsetNum);
  }

  const transactions = await db.prepare(query).all(...params);
  res.json(transactions);
});

router.post('/', async (req: Request, res: Response) => {
  const { amount, type, category, merchant, date, notes } = req.body;
  if (amount === undefined || !type || !category || !date) {
    res.status(400).json({ error: 'amount, type, category, and date are required' });
    return;
  }

  const db = getDb();
  const id = uuidv4();
  await db.prepare(
    'INSERT INTO transactions (id, user_id, amount, type, category, merchant, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user!.userId, parseFloat(amount), type, category, merchant || null, date, notes || null);

  res.status(201).json({ id });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const db = getDb();
  const transaction = await db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.userId) as any;
  if (!transaction) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  await db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Transaction deleted' });
});

router.post('/csv', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'File is required' });
    return;
  }

  const ext = req.file.originalname.split('.').pop()?.toLowerCase() || '';
  const csvExts = ['csv'];
  if (!csvExts.includes(ext)) {
    res.json({ count: 0, message: `File "${req.file.originalname}" received. Only CSV files are auto-parsed. Use manual entry for other formats.` });
    return;
  }

  const csvContent = req.file.buffer.toString('utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const db = getDb();
  let count = 0;
  for (const row of records) {
    const txType = (row.type || 'expense').toLowerCase();
    if (txType !== 'income' && txType !== 'expense') continue;
    await db.prepare(
      'INSERT INTO transactions (id, user_id, amount, type, category, merchant, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      uuidv4(),
      req.user!.userId,
      parseFloat(row.amount),
      txType,
      row.category || 'Uncategorized',
      row.merchant || null,
      row.date,
      row.notes || null
    );
    count++;
  }
  res.json({ count, message: `Imported ${count} transactions from CSV` });
});

router.get('/categories', async (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.userId;

  const rows = await db.prepare(
    `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM transactions
     WHERE user_id = ? AND type = 'expense'
     GROUP BY category
     ORDER BY total DESC`
  ).all(userId) as any[];

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const categories = rows.map(r => ({
    category: r.category,
    total: r.total,
    percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
    count: r.count,
  }));

  res.json(categories);
});

export default router;
