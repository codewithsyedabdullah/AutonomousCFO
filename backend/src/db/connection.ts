import initSqlJs, { Database as SqlJsDb, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';

let SQL: SqlJsStatic | null = null;
let db: SqlJsDb | null = null;
let dbPath: string = '';

function persist() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export class Statement {
  private sql: string;
  private stmt: any = null;

  constructor(sql: string) {
    this.sql = sql;
  }

  private ensureStmt() {
    if (!this.stmt) {
      this.stmt = db!.prepare(this.sql);
    }
    return this.stmt;
  }

  all(...params: any[]): any[] {
    try {
      const s = this.ensureStmt();
      if (params.length > 0) s.bind(params);
      const rows: any[] = [];
      while (s.step()) {
        rows.push(s.getAsObject());
      }
      s.reset();
      return rows;
    } catch (err) {
      console.error('SQLite all error:', err);
      return [];
    }
  }

  get(...params: any[]): any {
    try {
      const s = this.ensureStmt();
      if (params.length > 0) s.bind(params);
      const hasRow = s.step();
      if (!hasRow) { s.reset(); return undefined; }
      const row = s.getAsObject();
      s.reset();
      return row;
    } catch (err) {
      console.error('SQLite get error:', err);
      return undefined;
    }
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    try {
      const s = this.ensureStmt();
      if (params.length > 0) s.bind(params);
      s.step();
      s.reset();
      persist();
      return { changes: db!.getRowsModified(), lastInsertRowid: 0 };
    } catch (err) {
      console.error('SQLite run error:', err);
      return { changes: 0, lastInsertRowid: 0 };
    }
  }
}

export function prepare(sql: string): Statement {
  return new Statement(sql);
}

export function exec(sql: string): void {
  db!.exec(sql);
  persist();
}

export function getDb() {
  if (!db) throw new Error('Database not initialized yet');
  return { prepare, exec };
}

export async function initDb(dbFile?: string): Promise<void> {
  SQL = await initSqlJs();
  dbPath = dbFile || './data/autocfo.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
}
