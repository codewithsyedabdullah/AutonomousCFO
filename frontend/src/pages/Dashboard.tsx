import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, PiggyBank, AlertTriangle, Target } from 'lucide-react';
import NetWorthCard from '../components/NetWorthCard';
import HealthScoreGauge from '../components/HealthScoreGauge';
import MonthlyBarChart from '../components/MonthlyBarChart';
import CategoryPieChart from '../components/CategoryPieChart';
import TransactionRow from '../components/TransactionRow';
import client from '../api/client';

interface DashboardData {
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  healthScore: number | null;
  healthBreakdown: any;
  topCategories: { category: string; total: number; percentage: number }[];
  recentTransactions: any[];
  monthlyTrend: { month: string; income: number; expense: number }[];
  activeGoal: { name: string; current_amount: number; target_amount: number } | null;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await client.get('/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle size={40} className="text-danger mx-auto mb-3" />
          <p className="text-danger font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || (data.totalIncome === 0 && data.totalExpenses === 0)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <PiggyBank size={48} className="text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Welcome to Your Financial Twin</h2>
          <p className="text-zinc-400 mb-6">Add your first transaction to bring your Financial Twin to life.</p>
          <a href="/transactions" className="btn-primary">Add Transactions</a>
        </div>
      </div>
    );
  }

  const goalPercent = data.activeGoal
    ? Math.min(100, Math.round((data.activeGoal.current_amount / data.activeGoal.target_amount) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Financial Twin</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">Your real-time financial replica</p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium ${
            data.savingsRate >= 10
              ? 'bg-green-900/30 text-green-400 border border-green-800/50'
              : 'bg-red-900/30 text-red-400 border border-red-800/50'
          }`}>
            {data.savingsRate >= 10 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {data.savingsRate.toFixed(1)}% Savings Rate
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <NetWorthCard
            netWorth={data.netWorth}
            income={data.monthlyIncome}
            expenses={data.monthlyExpenses}
            savingsRate={data.savingsRate}
          />
        </div>
        <div className="lg:col-span-1 flex justify-center">
          <div className="card flex flex-col items-center">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Health Score</h3>
            <HealthScoreGauge score={data.healthScore ?? 0} size={140} />
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="card h-full flex flex-col justify-between">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500">Monthly Income</p>
                <p className="text-lg font-bold text-success">PKR {Math.round(data.monthlyIncome).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Monthly Expenses</p>
                <p className="text-lg font-bold text-danger">PKR {Math.round(data.monthlyExpenses).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Monthly Burn Rate</p>
                <p className="text-lg font-bold text-warning">PKR {Math.round(data.monthlyExpenses).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlyBarChart monthlyData={data.monthlyTrend || []} />
        </div>
        <div className="lg:col-span-1">
          <CategoryPieChart categories={data.topCategories || []} />
        </div>
      </div>

      {data.activeGoal && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-primary" />
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Active Goal</h3>
            </div>
            <span className="text-xs text-zinc-500">{goalPercent}% complete</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-semibold">{data.activeGoal.name}</span>
            <span className="text-sm text-zinc-400">
              PKR {Math.round(data.activeGoal.current_amount).toLocaleString()} / PKR {Math.round(data.activeGoal.target_amount).toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3">
            <div className="bg-primary h-3 rounded-full transition-all duration-500" style={{ width: `${goalPercent}%` }} />
          </div>
        </div>
      )}

      {data.recentTransactions && data.recentTransactions.length > 0 && (
        <div className="card overflow-hidden">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Recent Transactions</h3>
          <div className="table-wrap">
            <table className="w-full table-mobile">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="pb-2 text-xs text-zinc-500 font-medium uppercase tracking-wider px-2 sm:px-4">Type</th>
                  <th className="pb-2 text-xs text-zinc-500 font-medium uppercase tracking-wider px-2 sm:px-4">Category</th>
                  <th className="pb-2 text-xs text-zinc-500 font-medium uppercase tracking-wider px-2 sm:px-4">Amount</th>
                  <th className="pb-2 text-xs text-zinc-500 font-medium uppercase tracking-wider px-2 sm:px-4 hide-mobile">Merchant</th>
                  <th className="pb-2 text-xs text-zinc-500 font-medium uppercase tracking-wider px-2 sm:px-4 hide-mobile">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((tx: any) => (
                  <TransactionRow key={tx.id} transaction={tx} onDelete={() => {}} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
