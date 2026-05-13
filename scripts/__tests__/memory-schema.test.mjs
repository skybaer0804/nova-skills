import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';

const DB = { host: 'localhost', port: 3377, user: 'nova', password: 'nova_pass', database: 'agent_memory' };

describe('memory schema', () => {
  let conn;
  beforeAll(async () => { conn = await mysql.createConnection(DB); });
  afterAll(async () => { await conn.end(); });

  it('sessions table exists', async () => {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'sessions'");
    expect(rows).toHaveLength(1);
  });
  it('iterations table exists', async () => {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'iterations'");
    expect(rows).toHaveLength(1);
  });
  it('meta_cases table exists', async () => {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'meta_cases'");
    expect(rows).toHaveLength(1);
  });
  it('rules table exists with seeded rows', async () => {
    const [rows] = await conn.execute("SELECT COUNT(*) AS cnt FROM rules");
    expect(rows[0].cnt).toBeGreaterThan(0);
  });
  it('feedback table exists', async () => {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'feedback'");
    expect(rows).toHaveLength(1);
  });
});
