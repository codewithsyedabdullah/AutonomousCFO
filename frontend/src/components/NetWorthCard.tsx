interface Props {
  netWorth: number;
  income: number;
  expenses: number;
  savingsRate: number;
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = 'PKR ' + Math.round(abs).toLocaleString();
  return value < 0 ? '-' + formatted : formatted;
}

export default function NetWorthCard({ netWorth, income, expenses, savingsRate }: Props) {
  const isPositive = netWorth >= 0;

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1">Net Worth</h3>
      <p className={`text-3xl font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
        {formatCurrency(netWorth)}
      </p>
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Income</p>
          <p className="text-sm font-semibold text-success mt-1">{formatCurrency(income)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Expenses</p>
          <p className="text-sm font-semibold text-danger mt-1">{formatCurrency(expenses)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Savings Rate</p>
          <p className="text-sm font-semibold text-primary mt-1">{savingsRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
