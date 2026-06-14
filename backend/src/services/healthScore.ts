import { getDb } from '../db/connection';

interface HealthResult {
  composite: number;
  savingsRateScore: number;
  expenseConsistency: number;
  incomeRegularity: number;
  goalProgress: number;
  band: string;
  label: string;
}

function getBand(score: number): { band: string; label: string } {
  if (score >= 80) return { band: 'green', label: 'Excellent' };
  if (score >= 60) return { band: 'blue', label: 'Good' };
  if (score >= 40) return { band: 'yellow', label: 'Fair' };
  if (score >= 20) return { band: 'orange', label: 'At Risk' };
  return { band: 'red', label: 'Critical' };
}

export async function calculateHealthScore(userId: string): Promise<{ score: HealthResult | null; message?: string }> {
  const db = getDb();

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

  if (monthlyData.length < 1) {
    return { score: null, message: 'Not enough transaction data' };
  }

  const totalIncome = monthlyData.reduce((s, r) => s + (r.income || 0), 0);
  const totalExpenses = monthlyData.reduce((s, r) => s + (r.expense || 0), 0);
  const monthCount = monthlyData.length;

  const avgIncome = totalIncome / monthCount;
  const avgExpenses = totalExpenses / monthCount;
  const savingsRate = avgIncome > 0 ? (avgIncome - avgExpenses) / avgIncome : 0;

  const savingsRateScore = Math.min(savingsRate / 0.20, 1.0) * 100;

  const expenses = monthlyData.map(r => r.expense || 0);
  const avgExp = expenses.reduce((s, v) => s + v, 0) / expenses.length;
  const expenseVariance = expenses.reduce((s, v) => s + Math.pow(v - avgExp, 2), 0) / expenses.length;
  const expenseStdDev = Math.sqrt(expenseVariance);
  const expenseConsistency = avgExp > 0 ? (1 - (expenseStdDev / avgExp)) * 100 : 100;
  const expenseConsistencyClamped = Math.max(0, Math.min(100, expenseConsistency));

  const incomes = monthlyData.map(r => r.income || 0);
  const avgInc = incomes.reduce((s, v) => s + v, 0) / incomes.length;
  const incomeVariance = incomes.reduce((s, v) => s + Math.pow(v - avgInc, 2), 0) / incomes.length;
  const incomeStdDev = Math.sqrt(incomeVariance);
  const incomeRegularity = avgInc > 0 ? (1 - (incomeStdDev / avgInc)) * 100 : 100;
  const incomeRegularityClamped = Math.max(0, Math.min(100, incomeRegularity));

  const goals = await db.prepare('SELECT current_amount, target_amount FROM goals WHERE user_id = ?').all(userId) as any[];
  let goalProgress = 0;
  if (goals.length > 0) {
    const goalRatios = goals.map(g => g.target_amount > 0 ? g.current_amount / g.target_amount : 0);
    goalProgress = (goalRatios.reduce((s, v) => s + v, 0) / goalRatios.length) * 100;
  }
  const goalProgressClamped = Math.max(0, Math.min(100, goalProgress));

  const composite = Math.max(0, Math.min(100,
    savingsRateScore * 0.35 +
    expenseConsistencyClamped * 0.25 +
    incomeRegularityClamped * 0.20 +
    goalProgressClamped * 0.20
  ));

  const { band, label } = getBand(composite);

  return {
    score: {
      composite: Math.round(composite * 100) / 100,
      savingsRateScore: Math.round(savingsRateScore * 100) / 100,
      expenseConsistency: Math.round(expenseConsistencyClamped * 100) / 100,
      incomeRegularity: Math.round(incomeRegularityClamped * 100) / 100,
      goalProgress: Math.round(goalProgressClamped * 100) / 100,
      band,
      label,
    },
  };
}
