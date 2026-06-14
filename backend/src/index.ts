import 'express-async-errors';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { initDb } from './db/connection';
import { initSchema } from './db/schema';

import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import goalRoutes from './routes/goals';
import dashboardRoutes from './routes/dashboard';
import simulatorRoutes from './routes/simulator';
import chatRoutes from './routes/chat';
import taxRoutes from './routes/tax';

async function start() {
  await initDb();
  await initSchema();

  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/auth', authRoutes);
  app.use('/transactions', transactionRoutes);
  app.use('/goals', goalRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/simulator', simulatorRoutes);
  app.use('/chat', chatRoutes);
  app.use('/tax', taxRoutes);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(config.PORT, () => {
    console.log(`AutoCFO backend running on http://localhost:${config.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
