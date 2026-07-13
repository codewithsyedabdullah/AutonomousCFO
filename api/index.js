require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'autocfo-hackathon-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://autonomous-cfo.vercel.app';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/autocfo';

let pool;

async function initDb() {
  pool = new Pool({ connectionString: DATABASE_URL, max: 10, ssl: { rejectUnauthorized: false } });
  await Promise.race([
    pool.query('SELECT 1'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timeout')), 10000))
  ]);
}

function convertParams(sql, params) {
  if (params.length === 0) return { text: sql, values: [] };
  let i = 0;
  const text = sql.replace(/\?/g, () => `${i++}`);
  return { text, values: params };
}

class Statement {
  constructor(sql) { this.sql = sql; }
  async all(...params) { const r = await pool.query(convertParams(this.sql, params)); return r.rows; }
  async get(...params) { const r = await pool.query(convertParams(this.sql, params)); return r.rows[0] || undefined; }
  async run(...params) { const r = await pool.query(convertParams(this.sql, params)); return { changes: r.rowCount || 0 }; }
}

function prepare(sql) { return new Statement(sql); }
async function exec(sql) { await pool.query(sql); }
function getDb() {
  if (!pool) throw new Error('Database not initialized');
  return { prepare, exec };
}

async function initSchema() {
  const db = getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      name TEXT, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount REAL NOT NULL,
      type TEXT CHECK(type IN ('income','expense')) NOT NULL, category TEXT NOT NULL,
      merchant TEXT, date DATE NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
      target_amount REAL NOT NULL, current_amount REAL DEFAULT 0, target_date TEXT, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      messages_json TEXT DEFAULT '[]', created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tax_profiles (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      tax_year INTEGER NOT NULL, country TEXT DEFAULT 'PK', cnic TEXT, dependents INTEGER DEFAULT 0,
      additional_income REAL DEFAULT 0, extra_deductions REAL DEFAULT 0,
      exemption_claims TEXT, filing_status TEXT DEFAULT 'individual',
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));

const dbReady = initDb().then(() => initSchema());
dbReady.catch(err => console.error('DB init failed:', err));

app.use((_req, _res, next) => {
  dbReady.then(() => next()).catch(err => {
    console.error('DB init failed:', err);
    _res.status(500).json({ error: 'Database initialization failed', detail: err.message });
  });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const db = getDb();
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  await db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(id, email, password_hash, name || null);
  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, email, name: name || null } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const db = getDb();
  const user = await db.prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?').get(email);
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
    const db = getDb();
    const user = await db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// Basic stub routes for other endpoints
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
