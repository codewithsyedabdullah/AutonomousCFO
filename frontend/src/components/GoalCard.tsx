import { useState } from 'react';
import { Plus } from 'lucide-react';
import client from '../api/client';

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

interface Props {
  goal: Goal;
  onUpdate: () => void;
}

function formatCurrency(value: number): string {
  return 'PKR ' + Math.round(value).toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const QUICK_ADD_AMOUNTS = [50, 100, 500];

export default function GoalCard({ goal, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);

  const percent = goal.target_amount > 0
    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    : 0;

  const handleQuickAdd = async (amount: number) => {
    setAdding(true);
    try {
      await client.post(`/goals/${goal.id}/contribute`, { amount });
      onUpdate();
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-white">{goal.name}</h4>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">{percent}%</span>
      </div>

      <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-3">
        <div
          className="bg-primary h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-400">Saved</span>
        <span className="text-zinc-400">Target</span>
      </div>
      <div className="flex justify-between text-sm font-semibold mb-3">
        <span className="text-success">{formatCurrency(goal.current_amount)}</span>
        <span className="text-white">{formatCurrency(goal.target_amount)}</span>
      </div>

      <div className="text-xs text-zinc-500 mb-4">
        Target date: {formatDate(goal.target_date)}
      </div>

      <div className="flex gap-2">
        {QUICK_ADD_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => handleQuickAdd(amt)}
            disabled={adding}
            className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={12} />
            {formatCurrency(amt)}
          </button>
        ))}
      </div>
    </div>
  );
}
