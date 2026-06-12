import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface Props {
  monthlyData: MonthlyData[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-zinc-300 font-medium mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
          {entry.name === 'income' ? 'Income' : 'Expense'}: ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

export default function MonthlyBarChart({ monthlyData }: Props) {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="card flex items-center justify-center h-64">
        <p className="text-zinc-500 text-sm">No monthly data yet</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Monthly Income vs Expenses</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={monthlyData} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-zinc-400 text-sm">{value === 'income' ? 'Income' : 'Expense'}</span>}
          />
          <Bar dataKey="income" name="income" fill="#22C55E" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
