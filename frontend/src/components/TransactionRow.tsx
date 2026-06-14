import { Trash2 } from 'lucide-react';
import client from '../api/client';

interface Props {
  transaction: { id: string; amount: number; type: string; category: string; merchant: string; date: string };
  onDelete: (id: string) => void;
}

export default function TransactionRow({ transaction: tx, onDelete }: Props) {
  const handleDelete = async () => {
    try {
      await client.delete(`/transactions/${tx.id}`);
      onDelete(tx.id);
    } catch { /* ignore */ }
  };

  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
      <td data-label="Type" className="py-2 sm:py-3 px-2 sm:px-4">
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
          tx.type === 'income' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
        }`}>
          {tx.type === 'income' ? 'Income' : 'Expense'}
        </span>
      </td>
      <td data-label="Category" className="py-2 sm:py-3 px-2 sm:px-4">
        <span className="text-xs sm:text-sm text-zinc-300">{tx.category}</span>
      </td>
      <td data-label="Amount" className="py-2 sm:py-3 px-2 sm:px-4">
        <span className={`text-xs sm:text-sm font-semibold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
          {tx.type === 'income' ? '+' : '-'}PKR {Math.abs(tx.amount).toLocaleString()}
        </span>
      </td>
      <td data-label="Merchant" className="py-2 sm:py-3 px-2 sm:px-4">
        <span className="text-xs sm:text-sm text-zinc-400">{tx.merchant || '—'}</span>
      </td>
      <td data-label="Date" className="py-2 sm:py-3 px-2 sm:px-4">
        <span className="text-xs sm:text-sm text-zinc-500">{tx.date}</span>
      </td>
      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
        <button onClick={handleDelete} className="p-1 rounded hover:bg-red-900/30 text-zinc-500 hover:text-danger transition-colors" title="Delete">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
