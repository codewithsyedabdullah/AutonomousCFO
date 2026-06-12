import { getDb } from '../db/connection';

interface ProjectionRow {
  month: string;
  balance: number;
}

function getMonthlyAverages(userId: string): { avgIncome: number; avgExpenses: number } {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 3
  `).all(userId) as any[];

  if (rows.length === 0) return { avgIncome: 0, avgExpenses: 0 };

  const totalIncome = rows.reduce((s, r) => s + (r.income || 0), 0);
  const totalExpenses = rows.reduce((s, r) => s + (r.expense || 0), 0);
  return {
    avgIncome: totalIncome / rows.length,
    avgExpenses: totalExpenses / rows.length,
  };
}

function getCurrentBalance(userId: string): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
    FROM transactions
    WHERE user_id = ?
  `).get(userId) as any;
  return result?.balance || 0;
}

function getTotalGoal(userId: string): { current: number; target: number } {
  const db = getDb();
  const goals = db.prepare('SELECT current_amount, target_amount FROM goals WHERE user_id = ?').all(userId) as any[];
  if (goals.length === 0) return { current: 0, target: 0 };
  return {
    current: goals.reduce((s, g) => s + g.current_amount, 0),
    target: goals.reduce((s, g) => s + g.target_amount, 0),
  };
}

function generateProjections(monthlySurplus: number, startBalance: number, months: number = 12): ProjectionRow[] {
  const projections: ProjectionRow[] = [];
  const now = new Date();
  let balance = startBalance;

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    balance += monthlySurplus;
    projections.push({ month, balance: Math.round(balance * 100) / 100 });
  }

  return projections;
}

export interface SaveMoreResult {
  monthsToGoal: number;
  newSavingsRate: number;
  projections: ProjectionRow[];
}

export function projectSaveMore(userId: string, extraMonthly: number): SaveMoreResult {
  const { avgIncome, avgExpenses } = getMonthlyAverages(userId);
  const balance = getCurrentBalance(userId);
  const goals = getTotalGoal(userId);

  const newSavingsRate = avgIncome > 0 ? ((avgIncome - avgExpenses + extraMonthly) / avgIncome) * 100 : 0;
  const monthlySurplus = avgIncome - avgExpenses + extraMonthly;

  const needed = goals.target - goals.current;
  const monthsToGoal = monthlySurplus > 0 ? Math.ceil(needed / monthlySurplus) : Infinity;

  return {
    monthsToGoal: monthsToGoal === Infinity ? -1 : monthsToGoal,
    newSavingsRate: Math.round(newSavingsRate * 100) / 100,
    projections: generateProjections(monthlySurplus, balance),
  };
}

export interface MajorPurchaseResult {
  cashFlowImpact: number;
  newNetWorth: number;
  runwayMonths: number;
  projections: ProjectionRow[];
}

export function projectMajorPurchase(userId: string, cost: number, monthlyLoan: number): MajorPurchaseResult {
  const { avgIncome, avgExpenses } = getMonthlyAverages(userId);
  const balance = getCurrentBalance(userId);

  const monthlySurplus = avgIncome - avgExpenses - monthlyLoan;
  const newNetWorth = balance - cost;
  const cashFlowImpact = monthlyLoan;
  const runwayMonths = monthlySurplus <= 0 ? 0 : Math.floor(newNetWorth / monthlySurplus);

  return {
    cashFlowImpact,
    newNetWorth: Math.round(newNetWorth * 100) / 100,
    runwayMonths: Math.max(0, runwayMonths),
    projections: generateProjections(monthlySurplus, newNetWorth),
  };
}

export interface IncomeChangeResult {
  revisedSurplus: number;
  timeToGoal: number;
  projections: ProjectionRow[];
}

export function projectIncomeChange(userId: string, percentChange: number): IncomeChangeResult {
  const { avgIncome, avgExpenses } = getMonthlyAverages(userId);
  const balance = getCurrentBalance(userId);
  const goals = getTotalGoal(userId);

  const newIncome = avgIncome * (1 + percentChange / 100);
  const revisedSurplus = newIncome - avgExpenses;

  const needed = goals.target - goals.current;
  const timeToGoal = revisedSurplus > 0 ? Math.ceil(needed / revisedSurplus) : Infinity;

  return {
    revisedSurplus: Math.round(revisedSurplus * 100) / 100,
    timeToGoal: timeToGoal === Infinity ? -1 : timeToGoal,
    projections: generateProjections(revisedSurplus, balance),
  };
}
