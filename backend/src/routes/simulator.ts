import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { authMiddleware } from '../middleware/auth';
import { projectSaveMore, projectMajorPurchase, projectIncomeChange } from '../services/projections';
import { calculateHealthScore } from '../services/healthScore';

const router = Router();
router.use(authMiddleware);

function getCurrentBaseline(userId: string) {
  const db = getDb();
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions WHERE user_id = ?
  `).get(userId) as any;

  const monthlyData = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions WHERE user_id = ?
    GROUP BY month ORDER BY month DESC LIMIT 3
  `).all(userId) as any[];

  const avgIncome = monthlyData.length > 0 ? monthlyData.reduce((s: number, r: any) => s + (r.income || 0), 0) / monthlyData.length : 0;
  const avgExpenses = monthlyData.length > 0 ? monthlyData.reduce((s: number, r: any) => s + (r.expense || 0), 0) / monthlyData.length : 0;
  const savingsRate = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;
  const health = calculateHealthScore(userId);
  const netWorth = (totals.income || 0) - (totals.expense || 0);
  const monthlySurplus = avgIncome - avgExpenses;

  return { savingsRate, healthScore: health.score?.composite || 0, netWorth, monthlySurplus };
}

function combineProjections(baseline: any[], simulated: any[]) {
  const maxLen = Math.max(baseline.length, simulated.length);
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    result.push({
      month: i + 1,
      baseline: baseline[i]?.balance || 0,
      simulated: simulated[i]?.balance || 0,
    });
  }
  return result;
}

function generateBaselineProjections(userId: string) {
  const db = getDb();
  const monthlyData = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions WHERE user_id = ?
    GROUP BY month ORDER BY month DESC LIMIT 3
  `).all(userId) as any[];

  const avgIncome = monthlyData.length > 0 ? monthlyData.reduce((s: number, r: any) => s + (r.income || 0), 0) / monthlyData.length : 0;
  const avgExpenses = monthlyData.length > 0 ? monthlyData.reduce((s: number, r: any) => s + (r.expense || 0), 0) / monthlyData.length : 0;

  const balance = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
    FROM transactions WHERE user_id = ?
  `).get(userId) as any;

  const surplus = avgIncome - avgExpenses;
  const projections = [];
  let b = balance?.balance || 0;
  for (let i = 0; i < 12; i++) {
    b += surplus;
    projections.push({ month: i + 1, balance: Math.round(b * 100) / 100 });
  }
  return projections;
}

router.post('/simulate', (req: Request, res: Response) => {
  try {
    const { scenario, params } = req.body;
    const userId = req.user!.userId;

    if (!scenario || !params) {
      res.status(400).json({ error: 'scenario and params are required' });
      return;
    }

    const baseline = getCurrentBaseline(userId);
    const baselineProjections = generateBaselineProjections(userId);

    let result: any;
    switch (scenario) {
      case 'saveMore': {
        const { extraMonthly } = params;
        if (extraMonthly === undefined) {
          res.status(400).json({ error: 'extraMonthly is required for saveMore scenario' });
          return;
        }
        const proj = projectSaveMore(userId, parseFloat(extraMonthly));
        result = {
          monthsToGoal: proj.monthsToGoal,
          newSavingsRate: proj.newSavingsRate,
          healthScoreDelta: proj.newSavingsRate - baseline.savingsRate,
          projections: combineProjections(baselineProjections, proj.projections),
        };
        break;
      }
      case 'majorPurchase': {
        const { cost, monthlyLoan } = params;
        if (cost === undefined || monthlyLoan === undefined) {
          res.status(400).json({ error: 'cost and monthlyLoan are required for majorPurchase scenario' });
          return;
        }
        const proj = projectMajorPurchase(userId, parseFloat(cost), parseFloat(monthlyLoan));
        result = {
          cashFlowImpact: proj.cashFlowImpact,
          newNetWorth: proj.newNetWorth,
          runway: proj.runwayMonths,
          projections: combineProjections(baselineProjections, proj.projections),
        };
        break;
      }
      case 'incomeChange': {
        const { percentChange } = params;
        if (percentChange === undefined) {
          res.status(400).json({ error: 'percentChange is required for incomeChange scenario' });
          return;
        }
        const proj = projectIncomeChange(userId, parseFloat(percentChange));
        result = {
          revisedSurplus: proj.revisedSurplus,
          timeToGoal: proj.timeToGoal,
          newHealthScore: baseline.healthScore + (proj.revisedSurplus > 0 ? 5 : -5),
          projections: combineProjections(baselineProjections, proj.projections),
        };
        break;
      }
      default:
        res.status(400).json({ error: `Unknown scenario: ${scenario}` });
        return;
    }

    result.currentBaseline = baseline;
    res.json(result);
  } catch (err) {
    console.error('Simulator error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
