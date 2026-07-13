require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'autocfo-hackathon-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://autonomous-cfo.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://unqoowulxslqyuxzseah.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const sb = (table) => {
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json', 'Accept': 'application/json',
    'Prefer': 'return=representation',
  };
  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  return {
    select: async (cols = '*', filters = {}) => {
      let url = `${base}?select=${encodeURIComponent(cols)}`;
      for (const [k, v] of Object.entries(filters)) url += `&${k}=eq.${encodeURIComponent(String(v))}`;
      const res = await fetch(url, { headers });
      if (!res.ok) { const t = await res.text(); throw new Error(`Supabase select ${table}: ${res.status} ${t}`); }
      return res.json();
    },
    get: async (cols = '*', filters = {}) => {
      let url = `${base}?select=${encodeURIComponent(cols)}`;
      for (const [k, v] of Object.entries(filters)) url += `&${k}=eq.${encodeURIComponent(String(v))}`;
      url += '&limit=1';
      const res = await fetch(url, { headers });
      if (!res.ok) { const t = await res.text(); throw new Error(`Supabase get ${table}: ${res.status} ${t}`); }
      const arr = await res.json();
      return arr[0] || undefined;
    },
    insert: async (data) => {
      const res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(data) });
      if (!res.ok) { const t = await res.text(); return { error: `Supabase insert ${table}: ${res.status} ${t}`, status: res.status }; }
      const json = await res.json();
      return Array.isArray(json) ? json[0] : json;
    },
  };
};

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const users = sb('users');
  const existing = await users.get('id', { email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  const result = await users.insert({ id, email, password_hash, name: name || null });
  if (result && result.error) return res.status(500).json({ error: result.error });
  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, email, name: name || null } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await sb('users').get('id,email,password_hash,name', { email });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/auth/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = await sb('users').get('id,email,name', { id: decoded.userId });
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

const stubRouter = express.Router();
stubRouter.all('*', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));

app.use('/api/transactions', authMiddleware, stubRouter);
app.use('/api/goals', authMiddleware, stubRouter);
app.use('/api/dashboard', authMiddleware, stubRouter);
app.use('/api/simulator', authMiddleware, stubRouter);
app.use('/api/chat', authMiddleware, stubRouter);
app.use('/api/tax', authMiddleware, stubRouter);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
