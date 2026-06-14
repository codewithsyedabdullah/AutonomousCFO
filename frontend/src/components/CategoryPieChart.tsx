import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Category {
  category: string;
  total: number;
  percentage: number;
}

interface Props {
  categories: Category[];
}

const COLORS = ['#6C63FF', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-zinc-300">{data.category}</p>
      <p className="text-white font-semibold">PKR {Math.round(data.total).toLocaleString()}</p>
      <p className="text-zinc-400">{data.percentage.toFixed(1)}%</p>
    </div>
  );
}

export default function CategoryPieChart({ categories }: Props) {
  if (!categories || categories.length === 0) {
    return (
      <div className="card flex items-center justify-center h-64">
        <p className="text-zinc-500 text-sm">No category data yet</p>
      </div>
    );
  }

  const sorted = [...categories].sort((a, b) => b.total - a.total);
  const top5 = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const chartData = [...top5];
  if (rest.length > 0) {
    const otherTotal = rest.reduce((s, c) => s + c.total, 0);
    const otherPct = rest.reduce((s, c) => s + c.percentage, 0);
    chartData.push({ category: 'Other', total: otherTotal, percentage: otherPct });
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={90}
            stroke="none"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5">
        {chartData.map((item, i) => (
          <div key={item.category} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-zinc-400">{item.category}</span>
            </div>
            <span className="text-zinc-300">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
