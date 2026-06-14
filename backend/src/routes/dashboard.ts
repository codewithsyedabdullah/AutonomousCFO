import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { authMiddleware } from '../middleware/auth';
import { calculateHealthScore } from '../services/healthScore';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.userId;

  const totals = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses
    FROM transactions WHERE user_id = ?
  `).get(userId) as any;

  const monthlyData = await db.prepare(`
    SELECT
      TO_CHAR(date, 'YYYY-MM') as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all(userId) as any[];

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  if (monthlyData.length > 0) {
    monthlyIncome = monthlyData.reduce((s, r) => s + (r.income || 0), 0) / monthlyData.length;
    monthlyExpenses = monthlyData.reduce((s, r) => s + (r.expense || 0), 0) / monthlyData.length;
  }

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const healthResult = await calculateHealthScore(userId);

  const topCategories = await db.prepare(`
    SELECT category, SUM(amount) as total
    FROM transactions
    WHERE user_id = ? AND type = 'expense'
    GROUP BY category
    ORDER BY total DESC
    LIMIT 5
  `).all(userId) as any[];

  const grandTotal = topCategories.reduce((s, r) => s + r.total, 0);
  const categories = topCategories.map(r => ({
    category: r.category,
    total: r.total,
    percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
  }));

  const recentTransactions = await db.prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 5
  `).all(userId);

  const monthlyTrend = await db.prepare(`
    SELECT
      TO_CHAR(date, 'YYYY-MM') as month,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY month
    ORDER BY month ASC
  `).all(userId);

  const activeGoal = await db.prepare('SELECT name, current_amount, target_amount, target_date FROM goals WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;

  const netWorth = totals.totalIncome - totals.totalExpenses;

  res.json({
    activeGoal,
    netWorth: Math.round(netWorth * 100) / 100,
    totalIncome: totals.totalIncome,
    totalExpenses: totals.totalExpenses,
    monthlyIncome: Math.round(monthlyIncome * 100) / 100,
    monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
    savingsRate: Math.round(savingsRate * 100) / 100,
    healthScore: healthResult.score?.composite ?? null,
    healthBreakdown: healthResult.score ? {
      savingsRateScore: healthResult.score.savingsRateScore,
      expenseConsistency: healthResult.score.expenseConsistency,
      incomeRegularity: healthResult.score.incomeRegularity,
      goalProgress: healthResult.score.goalProgress,
      composite: healthResult.score.composite,
    } : null,
    topCategories: categories,
    recentTransactions,
    monthlyTrend,
  });
});

export default router;
