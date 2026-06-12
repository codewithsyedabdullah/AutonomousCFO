import { useState, useEffect, FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import GoalCard from '../components/GoalCard';
import client from '../api/client';

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await client.get('/goals');
      setGoals(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await client.post('/goals', {
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount || '0'),
        target_date: targetDate
      });
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setTargetDate('');
      setShowForm(false);
      fetchGoals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-zinc-400 text-sm mt-1">Track your financial goals</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'New Goal'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Goal Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="input-field" placeholder="e.g. Emergency Fund" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Target Amount</label>
            <input type="number" step="0.01" min="0" value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)} className="input-field" placeholder="10000" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Current Amount</label>
            <input type="number" step="0.01" min="0" value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)} className="input-field" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Target Date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="input-field" required />
          </div>
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-zinc-500">No goals yet. Create your first financial goal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onUpdate={fetchGoals} />
          ))}
        </div>
      )}
    </div>
  );
}
