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
  await initDb(config.DB_PATH);
  initSchema();

  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/simulator', simulatorRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/tax', taxRoutes);

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
