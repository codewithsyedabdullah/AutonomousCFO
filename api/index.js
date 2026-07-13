require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const JWT_SECRET = process.env.JWT_SECRET || 'autocfo-hackathon-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://autonomous-cfo.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://unqoowulxslqyuxzseah.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || 'https://api.groq.com/openai/v1';
const AI_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

const sbHeaders = () => ({
  'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json', 'Accept': 'application/json', 'Prefer': 'return=representation',
});

function sb(table) {
  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  const h = sbHeaders();
  return {
    select: async (cols = '*', filters = {}, opts = {}) => {
      let url = `${base}?select=${encodeURIComponent(cols)}`;
      for (const [k, v] of Object.entries(filters)) {
        if (v === null || v === undefined) continue;
        if (k === 'or') { url += `&or=(${v})`; continue; }
        url += `&${k}=eq.${encodeURIComponent(String(v))}`;
      }
      if (opts.order) url += `&order=${encodeURIComponent(opts.order)}`;
      if (opts.limit) url += `&limit=${opts.limit}`;
      if (opts.offset) url += `&offset=${opts.offset}`;
      const res = await fetch(url, { headers: { ...h, Accept: 'application/json' } });
      if (!res.ok) { const t = await res.text(); throw new Error(`supabase select ${table}: ${res.status} ${t}`); }
      return res.json();
    },
    get: async (cols = '*', filters = {}) => {
      const arr = await sb(table).select(cols, filters, { limit: 1 });
      return arr[0] || undefined;
    },
    insert: async (data) => {
      const res = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify(data) });
      if (!res.ok) { const t = await res.text(); return { error: `${res.status} ${t}`, status: res.status }; }
      const json = await res.json();
      return Array.isArray(json) ? json[0] : json;
    },
    update: async (data, filters = {}) => {
      let url = base;
      const qs = [];
      for (const [k, v] of Object.entries(filters)) qs.push(`${k}=eq.${encodeURIComponent(String(v))}`);
      if (qs.length) url += '?' + qs.join('&');
      const res = await fetch(url, { method: 'PATCH', headers: h, body: JSON.stringify(data) });
      if (!res.ok) { const t = await res.text(); throw new Error(`supabase update ${table}: ${res.status} ${t}`); }
      return res.json();
    },
    delete: async (filters = {}) => {
      let url = base;
      const qs = [];
      for (const [k, v] of Object.entries(filters)) qs.push(`${k}=eq.${encodeURIComponent(String(v))}`);
      if (qs.length) url += '?' + qs.join('&');
      const res = await fetch(url, { method: 'DELETE', headers: { ...h, Accept: 'application/json' } });
      if (!res.ok && res.status !== 204) { const t = await res.text(); throw new Error(`supabase delete ${table}: ${res.status} ${t}`); }
      return res.status === 204 ? null : res.json();
    },
    in: async (cols = '*', filterCol, filterVals) => {
      const vals = filterVals.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '\\"')}"` : v).join(',');
      let url = `${base}?select=${encodeURIComponent(cols)}&${filterCol}=in.(${vals})`;
      const res = await fetch(url, { headers: { ...h, Accept: 'application/json' } });
      if (!res.ok) { const t = await res.text(); throw new Error(`supabase in ${table}: ${res.status} ${t}`); }
      return res.json();
    },
  };
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

function auth(req, res, next) {
  const a = req.headers.authorization;
  if (!a || !a.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(a.split(' ')[1], JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

// ---- AUTH ----
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const existing = await sb('users').get('id', { email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  const result = await sb('users').insert({ id, email, password_hash, name: name || null });
  if (result && result.error) return res.status(500).json({ error: result.error });
  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, email, name: name || null } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await sb('users').get('id,email,password_hash,name', { email });
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', async (req, res) => {
  const a = req.headers.authorization;
  if (!a || !a.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(a.split(' ')[1], JWT_SECRET);
    const user = await sb('users').get('id,email,name', { id: decoded.userId });
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// ---- TRANSACTIONS ----
const validTxTypes = ['income', 'expense'];
const txCategories = ['Salary', 'Freelance', 'Business', 'Investment', 'Rental', 'Food', 'Transport', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Medical', 'Education', 'Zakat', 'Charity', 'Pension', 'Life Insurance', 'Profit on Debt', 'Other'];

app.get('/api/transactions', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const txs = await sb('transactions').select('*', { user_id: req.user.userId }, { order: 'date.desc', limit: parseInt(limit), offset: parseInt(offset) });
    res.json(txs);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch transactions' }); }
});

app.post('/api/transactions', auth, async (req, res) => {
  const { amount, type, category, date, merchant, notes } = req.body;
  if (!amount || !type || !category || !date) return res.status(400).json({ error: 'amount, type, category, date are required' });
  if (!validTxTypes.includes(type)) return res.status(400).json({ error: 'type must be income or expense' });
  const id = uuidv4();
  const tx = await sb('transactions').insert({ id, user_id: req.user.userId, amount: parseFloat(amount), type, category, merchant: merchant || null, date, notes: notes || null });
  if (tx && tx.error) return res.status(500).json({ error: tx.error });
  res.status(201).json(tx);
});

app.delete('/api/transactions/:id', auth, async (req, res) => {
  try {
    const existing = await sb('transactions').get('id,user_id', { id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });
    if (existing.user_id !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    await sb('transactions').delete({ id: req.params.id });
    res.json({ message: 'Transaction deleted' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete transaction' }); }
});

app.post('/api/transactions/csv', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  try {
    const records = parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true, relax_column_count: true });
    let count = 0;
    for (const r of records) {
      const id = uuidv4();
      const tx = await sb('transactions').insert({ id, user_id: req.user.userId, amount: parseFloat(r.amount), type: r.type, category: r.category, merchant: r.merchant || null, date: r.date, notes: r.notes || null });
      if (tx && !tx.error) count++;
    }
    res.json({ imported: count });
  } catch (e) { console.error(e); res.status(500).json({ error: 'CSV import failed' }); }
});

app.get('/api/transactions/categories', auth, async (req, res) => {
  try {
    const txs = await sb('transactions').select('amount,category,type', { user_id: req.user.userId });
    const expenses = txs.filter(t => t.type === 'expense');
    const total = expenses.reduce((s, t) => s + t.amount, 0);
    const groups = {};
    expenses.forEach(t => { groups[t.category] = (groups[t.category] || 0) + t.amount; });
    const breakdown = Object.entries(groups).map(([category, totalAmt]) => ({
      category, total: Math.round(totalAmt * 100) / 100,
      percentage: total > 0 ? Math.round((totalAmt / total) * 10000) / 100 : 0,
      count: expenses.filter(t => t.category === category).length,
    })).sort((a, b) => b.total - a.total);
    res.json(breakdown);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to get categories' }); }
});

// ---- GOALS ----
app.get('/api/goals', auth, async (req, res) => {
  try {
    const goals = await sb('goals').select('*', { user_id: req.user.userId }, { order: 'created_at.desc' });
    res.json(goals);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch goals' }); }
});

app.post('/api/goals', auth, async (req, res) => {
  const { name, target_amount, current_amount, target_date } = req.body;
  if (!name || !target_amount) return res.status(400).json({ error: 'name and target_amount are required' });
  const id = uuidv4();
  const goal = await sb('goals').insert({ id, user_id: req.user.userId, name, target_amount: parseFloat(target_amount), current_amount: parseFloat(current_amount || 0), target_date: target_date || null });
  if (goal && goal.error) return res.status(500).json({ error: goal.error });
  res.status(201).json(goal);
});

app.put('/api/goals/:id', auth, async (req, res) => {
  try {
    const existing = await sb('goals').get('id,user_id', { id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    if (existing.user_id !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.target_amount !== undefined) update.target_amount = parseFloat(req.body.target_amount);
    if (req.body.current_amount !== undefined) update.current_amount = parseFloat(req.body.current_amount);
    if (req.body.target_date !== undefined) update.target_date = req.body.target_date;
    await sb('goals').update(update, { id: req.params.id });
    const goal = await sb('goals').get('*', { id: req.params.id });
    res.json(goal);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update goal' }); }
});

app.post('/api/goals/:id/contribute', auth, async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  try {
    const goal = await sb('goals').get('*', { id: req.params.id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.user_id !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    const newAmount = (goal.current_amount || 0) + parseFloat(amount);
    await sb('goals').update({ current_amount: newAmount }, { id: req.params.id });
    goal.current_amount = newAmount;
    res.json(goal);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to contribute' }); }
});

app.delete('/api/goals/:id', auth, async (req, res) => {
  try {
    const existing = await sb('goals').get('id,user_id', { id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });
    if (existing.user_id !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
    await sb('goals').delete({ id: req.params.id });
    res.json({ message: 'Goal deleted' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete goal' }); }
});

// ---- DASHBOARD ----
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const txs = await sb('transactions').select('amount,type,category,date', { user_id: userId });
    const goals = await sb('goals').select('*', { user_id: userId });
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netWorth = Math.round((income - expenses) * 100) / 100;
    const byMonth = {};
    const now = new Date();
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = { income: 0, expenses: 0 };
    }
    txs.forEach(t => {
      if (t.date) {
        const key = t.date.substring(0, 7);
        if (byMonth[key]) {
          if (t.type === 'income') byMonth[key].income += t.amount;
          else byMonth[key].expenses += t.amount;
        }
      }
    });
    const months = Object.keys(byMonth).sort();
    const activeGoal = goals.length > 0 ? {
      ...goals[0],
      progress: goals[0].target_amount > 0 ? Math.round((goals[0].current_amount / goals[0].target_amount) * 100) : 0,
    } : null;
    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthsWithData = months.filter(m => byMonth[m].income > 0 || byMonth[m].expenses > 0);
    const monthlyIncome = monthsWithData.length > 0 ? totalIncome / monthsWithData.length : 0;
    const monthlyExpenses = monthsWithData.length > 0 ? totalExpenses / monthsWithData.length : 0;
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
    const savingsRateScore = Math.min(100, Math.round((savingsRate / 20) * 35));
    const expenseConsistency = monthsWithData.length > 1 ? Math.min(25, Math.round(25 - (Math.sqrt(monthsWithData.reduce((s, m) => s + Math.pow(byMonth[m].expenses - monthlyExpenses, 2), 0) / monthsWithData.length) / monthlyExpenses) * 25)) : 25;
    const incomeRegularity = monthsWithData.length > 1 ? Math.min(20, Math.round(20 - (Math.sqrt(monthsWithData.reduce((s, m) => s + Math.pow(byMonth[m].income - monthlyIncome, 2), 0) / monthsWithData.length) / monthlyIncome) * 20)) : 20;
    const goalProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.target_amount > 0 ? g.current_amount / g.target_amount : 0), 0) / goals.length * 20) : 0;
    const healthScore = Math.min(100, savingsRateScore + expenseConsistency + incomeRegularity + goalProgress);
    const catExpenses = txs.filter(t => t.type === 'expense');
    const catTotal = catExpenses.reduce((s, t) => s + t.amount, 0);
    const catMap = {};
    catExpenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, total]) => ({
      category, total: Math.round(total * 100) / 100, percentage: catTotal > 0 ? Math.round((total / catTotal) * 100) : 0,
    }));
    const recentTxs = await sb('transactions').select('*', { user_id: userId }, { order: 'date.desc', limit: 5 });
    res.json({
      activeGoal, netWorth, totalIncome, totalExpenses,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
      savingsRate, healthScore,
      healthBreakdown: { savingsRateScore, expenseConsistency, incomeRegularity, goalProgress },
      topCategories, recentTransactions: recentTxs,
      monthlyTrend: months.map(m => ({ month: m, ...byMonth[m] })),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load dashboard' }); }
});

// ---- SIMULATOR ----
app.post('/api/simulator/simulate', auth, async (req, res) => {
  try {
    const { scenario, params } = req.body;
    const txs = await sb('transactions').select('amount,type,category,date', { user_id: req.user.userId });
    const goals = await sb('goals').select('*', { user_id: req.user.userId });
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const surplus = income - expenses;
    const savingsRate = income > 0 ? Math.round((surplus / income) * 100) : 0;
    const goal = goals[0];
    const baseline = [];
    let bal = surplus;
    for (let m = 0; m < 12; m++) { bal += surplus; baseline.push(Math.round(bal * 100) / 100); }
    let result;
    if (scenario === 'saveMore') {
      const extra = parseFloat(params?.extraMonthly || 0);
      const newSurplus = surplus + extra;
      const newSavingsRate = income > 0 ? Math.round((newSurplus / income) * 100) : 0;
      const monthsToGoal = goal && newSurplus > 0 ? Math.ceil((goal.target_amount - goal.current_amount) / newSurplus) : null;
      const simulated = [];
      let sb = surplus;
      for (let m = 0; m < 12; m++) { sb += newSurplus; simulated.push(Math.round(sb * 100) / 100); }
      const healthScoreDelta = Math.round(((newSavingsRate - savingsRate) / 20) * 35);
      result = { monthsToGoal, newSavingsRate, monthsToGoalBaseline: goal && surplus > 0 ? Math.ceil((goal.target_amount - goal.current_amount) / surplus) : null, healthScoreDelta, projections: { baseline, simulated } };
    } else if (scenario === 'majorPurchase') {
      const cost = parseFloat(params?.cost || 0);
      const monthlyLoan = parseFloat(params?.monthlyLoan || 0);
      const cashFlowImpact = surplus - monthlyLoan;
      const newNetWorth = (income - expenses) - cost;
      const newBal = surplus - monthlyLoan;
      const simulated = [];
      let sb = newBal;
      for (let m = 0; m < 12; m++) { sb += newBal; simulated.push(Math.round(Math.max(sb, 0) * 100) / 100); }
      result = { cashFlowImpact: Math.round(cashFlowImpact * 100) / 100, newNetWorth: Math.round(newNetWorth * 100) / 100, runway: cashFlowImpact > 0 ? 999 : Math.floor(Math.abs(newNetWorth) / Math.max(Math.abs(cashFlowImpact), 1)), projections: { baseline, simulated } };
    } else if (scenario === 'incomeChange') {
      const pct = parseFloat(params?.percentChange || 0);
      const newIncome = income * (1 + pct / 100);
      const revisedSurplus = newIncome - expenses;
      const newSavingsRate = newIncome > 0 ? Math.round((revisedSurplus / newIncome) * 100) : 0;
      const timeToGoal = goal && revisedSurplus > 0 ? Math.ceil((goal.target_amount - goal.current_amount) / revisedSurplus) : null;
      const simulated = [];
      let sb = revisedSurplus;
      for (let m = 0; m < 12; m++) { sb += revisedSurplus; simulated.push(Math.round(sb * 100) / 100); }
      result = { revisedSurplus: Math.round(revisedSurplus * 100) / 100, timeToGoal, newSavingsRate, projections: { baseline, simulated } };
    } else {
      return res.status(400).json({ error: 'Invalid scenario' });
    }
    res.json({ scenario, params, userBaseline: { monthlyIncome: Math.round(income * 100) / 100, monthlyExpenses: Math.round(expenses * 100) / 100, surplus: Math.round(surplus * 100) / 100, savingsRate, activeGoal: goal || null }, ...result });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Simulation failed' }); }
});

// ---- CHAT (AI CFO) ----
app.post('/api/chat', auth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  try {
    const userId = req.user.userId;
    const txs = await sb('transactions').select('amount,type,category', { user_id: userId });
    const goals = await sb('goals').select('*', { user_id: userId });
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const topCats = [...new Set(txs.filter(t => t.type === 'expense').map(t => t.category))].slice(0, 5);
    const snapshot = `User financial snapshot: Monthly income PKR ${Math.round(income)}, monthly expenses PKR ${Math.round(expenses)}, net worth PKR ${Math.round(income - expenses)}, savings rate ${income > 0 ? Math.round((income - expenses) / income * 100) : 0}%, goals: ${goals.map(g => `${g.name} (${g.current_amount}/${g.target_amount})`).join(', ') || 'none'}, top spending categories: ${topCats.join(', ') || 'none'}. Always respond in PKR currency. Only answer financial questions.`;

    const convs = await sb('ai_conversations').select('*', { user_id: userId }, { order: 'created_at.desc', limit: 1 });
    let history = [];
    if (convs.length) {
      try { history = JSON.parse(convs[0].messages_json || '[]'); } catch {}
    }
    const messages = [
      { role: 'system', content: `You are AutonomousCFO, a financial AI assistant. ${snapshot}` },
      ...history.slice(-20),
      { role: 'user', content: message },
    ];

    const aiRes = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages, stream: true }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const mock = `I'm your AI CFO assistant. Based on your finances: income PKR ${Math.round(income)}, expenses PKR ${Math.round(expenses)}, savings rate ${income > 0 ? Math.round((income - expenses) / income * 100) : 0}%. I recommend tracking expenses and setting savings goals.`;
      res.json({ response: mock, mode: 'mock' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';
          full += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch {}
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    const convId = convs.length ? convs[0].id : uuidv4();
    const updatedMessages = [...history, { role: 'user', content: message }, { role: 'assistant', content: full }];
    if (convs.length) {
      await sb('ai_conversations').update({ messages_json: JSON.stringify(updatedMessages) }, { id: convId });
    } else {
      await sb('ai_conversations').insert({ id: convId, user_id: userId, messages_json: JSON.stringify(updatedMessages) });
    }
  } catch (e) {
    console.error(e);
    if (res.headersSent) { res.end(); return; }
    res.status(500).json({ error: 'Chat failed' });
  }
});

// ---- TAX ----
const TAX_YEAR = 2025;
const TAX_SLABS = [
  { min: 0, max: 600000, rate: 0, fixed: 0 },
  { min: 600001, max: 1200000, rate: 0.05, fixed: 0 },
  { min: 1200001, max: 2200000, rate: 0.15, fixed: 30000 },
  { min: 2200001, max: 3200000, rate: 0.25, fixed: 180000 },
  { min: 3200001, max: 4100000, rate: 0.30, fixed: 430000 },
  { min: 4100001, max: Infinity, rate: 0.35, fixed: 700000 },
];
function calcTax(taxable) {
  for (const slab of TAX_SLABS) {
    if (taxable >= slab.min && taxable <= slab.max) {
      return slab.fixed + (taxable - (slab.min === 0 ? slab.min : slab.min - 1)) * slab.rate;
    }
  }
  return 0;
}
function isDeductible(cat) {
  return ['Medical', 'Education', 'Zakat', 'Charity', 'Pension', 'Life Insurance', 'Profit on Debt'].includes(cat);
}
function getFbrSection(cat) {
  const map = { Medical: 'Section 60D', Education: 'Section 61', Zakat: 'Section 61(1)(c)', Charity: 'Section 61(1)(c)', Pension: 'Section 63', 'Life Insurance': 'Section 62', 'Profit on Debt': 'Section 60C' };
  return map[cat] || null;
}

app.get('/api/tax/summary', auth, async (req, res) => {
  try {
    const txs = await sb('transactions').select('*', { user_id: req.user.userId });
    const profile = await sb('tax_profiles').get('*', { user_id: req.user.userId, tax_year: TAX_YEAR });
    const grossIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalIncome = grossIncome + (profile?.additional_income || 0);
    const deductibleTx = txs.filter(t => t.type === 'expense' && isDeductible(t.category));
    const totalDeductions = deductibleTx.reduce((s, t) => s + t.amount, 0) + (profile?.extra_deductions || 0);
    const taxableIncome = Math.max(0, totalIncome - totalDeductions);
    const taxLiability = calcTax(taxableIncome);
    const deductionBreakdown = [];
    const grouped = {};
    deductibleTx.forEach(t => { grouped[t.category] = (grouped[t.category] || 0) + t.amount; });
    Object.entries(grouped).forEach(([category, amount]) => {
      deductionBreakdown.push({ category, amount: Math.round(amount * 100) / 100, deductible: true, fbrSection: getFbrSection(category) });
    });
    const allCats = [...new Set(txs.filter(t => t.type === 'expense').map(t => t.category))];
    const missedDeductions = allCats.filter(c => isDeductible(c) && !grouped[c]).map(c => ({
      category: c, hint: `You have ${c} expenses that may be tax-deductible under ${getFbrSection(c)}.`,
    }));
    res.json({
      grossIncome: Math.round(grossIncome * 100) / 100,
      additionalIncome: profile?.additional_income || 0,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      extraDeductions: profile?.extra_deductions || 0,
      taxableIncome: Math.round(taxableIncome * 100) / 100,
      taxLiability: Math.round(taxLiability * 100) / 100,
      effectiveRate: totalIncome > 0 ? Math.round((taxLiability / totalIncome) * 10000) / 100 : 0,
      deductionBreakdown, missedDeductions, taxYear: TAX_YEAR,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to compute tax summary' }); }
});

app.get('/api/tax/profile', auth, async (req, res) => {
  try {
    const p = await sb('tax_profiles').get('*', { user_id: req.user.userId, tax_year: TAX_YEAR });
    res.json(p || { taxYear: TAX_YEAR, country: 'PK' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to get tax profile' }); }
});

app.post('/api/tax/profile', auth, async (req, res) => {
  try {
    const existing = await sb('tax_profiles').get('id', { user_id: req.user.userId, tax_year: TAX_YEAR });
    const data = { user_id: req.user.userId, tax_year: TAX_YEAR, ...req.body };
    if (existing) {
      data.updated_at = new Date().toISOString();
      await sb('tax_profiles').update(data, { id: existing.id });
    } else {
      data.id = uuidv4();
      data.created_at = new Date().toISOString();
      data.updated_at = data.created_at;
      await sb('tax_profiles').insert(data);
    }
    const profile = await sb('tax_profiles').get('*', { user_id: req.user.userId, tax_year: TAX_YEAR });
    res.json(profile);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to save tax profile' }); }
});

app.post('/api/tax/generate-pdf', auth, async (req, res) => {
  try {
    const txs = await sb('transactions').select('*', { user_id: req.user.userId });
    const profile = await sb('tax_profiles').get('*', { user_id: req.user.userId, tax_year: TAX_YEAR });
    const user = await sb('users').get('*', { id: req.user.userId });
    const grossIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalIncome = grossIncome + (profile?.additional_income || 0);
    const deductibleTx = txs.filter(t => t.type === 'expense' && isDeductible(t.category));
    const totalDeductions = deductibleTx.reduce((s, t) => s + t.amount, 0) + (profile?.extra_deductions || 0);
    const taxableIncome = Math.max(0, totalIncome - totalDeductions);
    const taxLiability = calcTax(taxableIncome);

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let page = doc.addPage([612, 792]);
    const { width, height } = page.getSize();
    let y = height - 50;

    const title = (text, size = 14) => { page.drawText(text, { x: 50, y, size, font: bold, color: rgb(0.1, 0.1, 0.3) }); y -= size + 8; };
    const line = (text, size = 10) => { page.drawText(text, { x: 50, y, size, font, color: rgb(0.2, 0.2, 0.2) }); y -= size + 4; };
    const kv = (k, v, size = 10) => { page.drawText(k, { x: 50, y, size, font: bold, color: rgb(0.2, 0.2, 0.2) }); page.drawText(v, { x: 250, y, size, font, color: rgb(0.2, 0.2, 0.2) }); y -= size + 6; };

    title('Tax Return Summary', 18);
    line('AutonomousCFO - Pakistan FBR Tax Year ' + TAX_YEAR, 9);
    y -= 10;
    title('Personal Information', 12);
    kv('Name:', user?.name || 'N/A');
    kv('Email:', user?.email || 'N/A');
    kv('CNIC:', profile?.cnic || 'N/A');
    kv('Filing Status:', profile?.filing_status || 'Individual');
    kv('Country:', profile?.country || 'PK');
    y -= 10;
    title('Income Summary', 12);
    kv('Gross Income:', `PKR ${Math.round(grossIncome).toLocaleString()}`);
    kv('Additional Income:', `PKR ${Math.round(profile?.additional_income || 0).toLocaleString()}`);
    kv('Total Income:', `PKR ${Math.round(totalIncome).toLocaleString()}`);
    y -= 10;
    title('Deductions', 12);
    kv('Total Deductions:', `PKR ${Math.round(totalDeductions).toLocaleString()}`);
    kv('Extra Deductions:', `PKR ${Math.round(profile?.extra_deductions || 0).toLocaleString()}`);
    y -= 10;
    title('Tax Calculation', 12);
    kv('Taxable Income:', `PKR ${Math.round(taxableIncome).toLocaleString()}`);
    kv('Tax Liability:', `PKR ${Math.round(taxLiability).toLocaleString()}`);
    kv('Effective Rate:', `${totalIncome > 0 ? Math.round((taxLiability / totalIncome) * 10000) / 100 : 0}%`);
    y -= 10;
    title('Filing Instructions', 12);
    line('1. Log in to FBR IRIS (iris.fbr.gov.pk)');
    line('2. Select "Income Tax Return" for Year ' + TAX_YEAR);
    line('3. Enter your personal and income details');
    line('4. Claim deductions for eligible expenses');
    line('5. Verify tax calculation and submit');
    line('6. Download acknowledgment receipt');

    const pdfBytes = await doc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tax-summary-' + TAX_YEAR + '.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (e) { console.error(e); res.status(500).json({ error: 'PDF generation failed' }); }
});

app.post('/api/tax/chat', auth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  try {
    const txs = await sb('transactions').select('*', { user_id: req.user.userId });
    const profile = await sb('tax_profiles').get('*', { user_id: req.user.userId, tax_year: TAX_YEAR });
    const grossIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalIncome = grossIncome + (profile?.additional_income || 0);
    const deductibleCats = [...new Set(txs.filter(t => t.type === 'expense' && isDeductible(t.category)).map(t => t.category))];
    const nonClaimed = ['Medical', 'Education', 'Zakat', 'Charity', 'Pension', 'Life Insurance', 'Profit on Debt'].filter(c => !deductibleCats.includes(c));
    const snapshot = `Tax snapshot: Total income PKR ${Math.round(totalIncome)}, filing status: ${profile?.filing_status || 'individual'}, dependents: ${profile?.dependents || 0}, deductions claimed: ${deductibleCats.join(', ') || 'none'}, missed deductions: ${nonClaimed.join(', ') || 'none'}. Tax year: ${TAX_YEAR}. Pakistan tax slabs: 0-600k: 0%, 600k-1.2M: 5%, 1.2M-2.2M: 15%, 2.2M-3.2M: 25%, 3.2M-4.1M: 30%, 4.1M+: 35%.`;

    const aiRes = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: 'system', content: `You are a Pakistan tax expert. ${snapshot}` }, { role: 'user', content: message }] }),
    });

    if (!aiRes.ok) {
      res.json({ response: `Based on your tax profile: Total income PKR ${Math.round(totalIncome).toLocaleString()}. Consult a tax professional for specific advice.` });
      return;
    }
    const data = await aiRes.json();
    res.json({ response: data.choices?.[0]?.message?.content || 'No response' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Tax chat failed' }); }
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
