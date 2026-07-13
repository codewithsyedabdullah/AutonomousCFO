import { Pool } from 'pg';
import { config } from '../config';

let pool: Pool | null = null;

export async function initDb(): Promise<void> {
  pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  client.release();
}

function convertParams(sql: string, params: any[]): { text: string; values: any[] } {
  if (params.length === 0) return { text: sql, values: [] };
  let i = 0;
  const text = sql.replace(/\?/g, () => $);
  return { text, values: params };
}

export class Statement {
  private sql: string;
  constructor(sql: string) { this.sql = sql; }

  async all(...params: any[]): Promise<any[]> {
    const { text, values } = convertParams(this.sql, params);
    const result = await pool!.query(text, values);
    return result.rows;
  }

  async get(...params: any[]): Promise<any> {
    const { text, values } = convertParams(this.sql, params);
    const result = await pool!.query(text, values);
    return result.rows[0] || undefined;
  }

  async run(...params: any[]): Promise<{ changes: number }> {
    const { text, values } = convertParams(this.sql, params);
    const result = await pool!.query(text, values);
    return { changes: result.rowCount || 0 };
  }
}

export function prepare(sql: string): Statement {
  return new Statement(sql);
}

export async function exec(sql: string): Promise<void> {
  await pool!.query(sql);
}

export function getDb() {
  if (!pool) throw new Error('Database not initialized');
  return { prepare, exec };
}