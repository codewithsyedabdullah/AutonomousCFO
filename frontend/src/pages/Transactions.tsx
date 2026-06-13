import { useState, useEffect, FormEvent, useRef } from 'react';
import { Upload, Plus, X } from 'lucide-react';
import TransactionRow from '../components/TransactionRow';
import client from '../api/client';

const CATEGORIES = [
  'Housing', 'Food & Dining', 'Transportation', 'Entertainment',
  'Shopping', 'Utilities', 'Healthcare', 'Education',
  'Salary', 'Freelance', 'Investment', 'Other'
];

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  date: string;
  notes?: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [csvResult, setCsvResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await client.get('/transactions', { params: { limit: 100 } });
      setTransactions(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.post('/transactions', {
        amount: parseFloat(amount),
        type,
        category,
        merchant,
        date,
        notes
      });
      setAmount('');
      setMerchant('');
      setNotes('');
      setShowForm(false);
      fetchTransactions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch {
      // ignore
    }
  };

  const handleCsvUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await client.post('/transactions/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCsvResult(`Imported ${res.data.count} transactions`);
      fetchTransactions();
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error || 'CSV upload failed');
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
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-zinc-400 text-sm mt-1">Track your income and expenses</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'Add Transaction'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {csvResult && (
        <div className="bg-green-900/30 border border-green-800 text-green-400 text-sm rounded-lg px-4 py-3">
          {csvResult}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Amount</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="input-field" placeholder="0.00" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType('expense')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  type === 'expense' ? 'bg-danger/20 text-danger border border-danger/50' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>Expense</button>
              <button type="button" onClick={() => setType('income')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  type === 'income' ? 'bg-green-900/30 text-success border border-green-800/50' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>Income</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Merchant</label>
            <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)}
              className="input-field" placeholder="e.g. Starbucks" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="input-field" placeholder="Any notes..." />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Import Financial Documents</h3>
        </div>
        <form onSubmit={handleCsvUpload} className="flex items-center gap-4">
          <input type="file" ref={fileRef} accept=".csv,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700" />
          <button type="submit" className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={16} /> Upload Document
          </button>
        </form>
        <p className="text-xs text-zinc-600 mt-2">Accepted: CSV, PDF, Word, Excel, images, text files. CSV files are auto-parsed.</p>
      </div>

      <div className="card">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          All Transactions ({transactions.length})
        </h3>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">No transactions yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-4">Type</th>
                  <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-4">Category</th>
                  <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-4">Amount</th>
                  <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-4">Merchant</th>
                  <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-4">Date</th>
                  <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-4"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
