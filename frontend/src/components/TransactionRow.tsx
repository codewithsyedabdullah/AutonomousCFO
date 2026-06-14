import { Trash2 } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  date: string;
  notes?: string;
}

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number): string {
  return 'PKR ' + Math.round(value).toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TransactionRow({ transaction, onDelete }: Props) {
  const isIncome = transaction.type === 'income';

  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
      <td className="py-3 px-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isIncome ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
        }`}>
          {isIncome ? 'Income' : 'Expense'}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
          {transaction.category}
        </span>
      </td>
      <td className={`py-3 px-4 font-medium ${isIncome ? 'text-success' : 'text-danger'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </td>
      <td className="py-3 px-4 text-zinc-300">{transaction.merchant}</td>
      <td className="py-3 px-4 text-zinc-400 text-sm">{formatDate(transaction.date)}</td>
      <td className="py-3 px-4">
        <button
          onClick={() => onDelete(transaction.id)}
          className="text-zinc-500 hover:text-danger transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}
