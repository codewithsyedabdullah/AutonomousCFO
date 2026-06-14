import { useState } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import client from '../api/client';

type Scenario = 'saveMore' | 'majorPurchase' | 'incomeChange';

interface SimulationResult {
  monthsToGoal?: number;
  newSavingsRate?: number;
  healthScoreDelta?: number;
  cashFlowImpact?: number;
  newNetWorth?: number;
  runway?: number;
  revisedSurplus?: number;
  timeToGoal?: number;
  newHealthScore?: number;
  projections: { month: number; baseline: number; simulated: number }[];
  currentBaseline: { savingsRate: number; healthScore: number; netWorth: number; monthlySurplus: number };
}

const scenarios: { key: Scenario; label: string; icon: any; desc: string }[] = [
  { key: 'saveMore', label: 'Save More', icon: TrendingUp, desc: 'See how extra monthly savings accelerates your goals' },
  { key: 'majorPurchase', label: 'Major Purchase', icon: ShoppingBag, desc: 'Plan a big purchase and see the impact' },
  { key: 'incomeChange', label: 'Income Change', icon: DollarSign, desc: 'See how a raise or pay cut affects your finances' },
];

export default function Simulator() {
  const [activeScenario, setActiveScenario] = useState<Scenario>('saveMore');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [extraMonthly, setExtraMonthly] = useState('200');
  const [purchaseCost, setPurchaseCost] = useState('5000');
  const [monthlyLoan, setMonthlyLoan] = useState('200');
  const [percentChange, setPercentChange] = useState('10');

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let params: any = {};
      if (activeScenario === 'saveMore') params = { extraMonthly: parseFloat(extraMonthly) };
      else if (activeScenario === 'majorPurchase') params = { cost: parseFloat(purchaseCost), monthlyLoan: parseFloat(monthlyLoan) };
      else if (activeScenario === 'incomeChange') params = { percentChange: parseFloat(percentChange) };

      const res = await client.post('/simulator/simulate', { scenario: activeScenario, params });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Simulation failed. Add some transactions first.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) => 'PKR ' + Math.round(v).toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Scenario Simulator</h1>
        <p className="text-zinc-400 text-sm mt-1">See the quantified impact of your financial decisions</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {scenarios.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => { setActiveScenario(key); setResult(null); }}
            className={`flex-1 min-w-[200px] card text-left transition-all ${
              activeScenario === key ? 'border-primary/50 ring-1 ring-primary/30' : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Icon size={18} className="text-primary" />
              </div>
              <span className="font-semibold text-white">{label}</span>
            </div>
            <p className="text-xs text-zinc-500">{desc}</p>
          </button>
        ))}
      </div>

      <div className="card">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {activeScenario === 'saveMore' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Extra Monthly Savings</label>
              <input type="number" min="0" value={extraMonthly}
                onChange={(e) => setExtraMonthly(e.target.value)} className="input-field" />
            </div>
          )}
          {activeScenario === 'majorPurchase' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">One-Time Cost</label>
                <input type="number" min="0" value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Monthly Loan Payment</label>
                <input type="number" min="0" value={monthlyLoan}
                  onChange={(e) => setMonthlyLoan(e.target.value)} className="input-field" />
              </div>
            </>
          )}
          {activeScenario === 'incomeChange' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">% Change (negative for decrease)</label>
              <input type="number" value={percentChange}
                onChange={(e) => setPercentChange(e.target.value)} className="input-field" />
            </div>
          )}
        </div>
        <button onClick={handleSimulate} disabled={loading} className="btn-primary">
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Before</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Savings Rate</span>
                  <span className="text-white font-semibold">{result.currentBaseline.savingsRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Health Score</span>
                  <span className="text-white font-semibold">{result.currentBaseline.healthScore.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Net Worth</span>
                  <span className="text-white font-semibold">{formatCurrency(result.currentBaseline.netWorth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Monthly Surplus</span>
                  <span className="text-white font-semibold">{formatCurrency(result.currentBaseline.monthlySurplus)}</span>
                </div>
              </div>
            </div>

            <div className="card border-primary/30">
              <h4 className="text-sm font-medium text-primary uppercase tracking-wider mb-4">After</h4>
              <div className="space-y-3">
                {result.newSavingsRate !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">New Savings Rate</span>
                    <span className="text-success font-semibold">{result.newSavingsRate.toFixed(1)}%</span>
                  </div>
                )}
                {result.healthScoreDelta !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Health Score Change</span>
                    <span className={`font-semibold ${result.healthScoreDelta >= 0 ? 'text-success' : 'text-danger'}`}>
                      {result.healthScoreDelta >= 0 ? '+' : ''}{result.healthScoreDelta.toFixed(1)}
                    </span>
                  </div>
                )}
                {result.newHealthScore !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">New Health Score</span>
                    <span className="text-success font-semibold">{result.newHealthScore.toFixed(0)}</span>
                  </div>
                )}
                {result.monthsToGoal !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Months to Goal</span>
                    <span className="text-white font-semibold">{result.monthsToGoal}</span>
                  </div>
                )}
                {result.newNetWorth !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">New Net Worth</span>
                    <span className="text-white font-semibold">{formatCurrency(result.newNetWorth)}</span>
                  </div>
                )}
                {result.cashFlowImpact !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cash Flow Impact</span>
                    <span className={result.cashFlowImpact >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                      {formatCurrency(result.cashFlowImpact)}
                    </span>
                  </div>
                )}
                {result.runway !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Runway (months)</span>
                    <span className="text-white font-semibold">{result.runway}</span>
                  </div>
                )}
                {result.revisedSurplus !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Revised Monthly Surplus</span>
                    <span className={result.revisedSurplus >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                      {formatCurrency(result.revisedSurplus)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {result.projections && result.projections.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">12-Month Projection</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={result.projections}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#27272a' }}
                    tickFormatter={(v) => `M${v}`} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  <Legend formatter={(value) => <span className="text-zinc-400 text-sm">{value === 'baseline' ? 'Current Path' : 'Simulated Path'}</span>} />
                  <Line type="monotone" dataKey="baseline" name="baseline" stroke="#6C63FF" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="simulated" name="simulated" stroke="#22C55E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
