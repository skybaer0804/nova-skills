import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';

const DB = { host: 'localhost', port: 3377, user: 'nova', password: 'nova_pass', database: 'agent_memory' };

describe('QA schema tables', () => {
  let conn;
  beforeAll(async () => { conn = await mysql.createConnection(DB); });
  afterAll(async () => { if (conn) await conn.end(); });

  it('qa_sessions table exists', async () => {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'qa_sessions'");
    expect(rows).toHaveLength(1);
  });
  it('qa_bugs table exists', async () => {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'qa_bugs'");
    expect(rows).toHaveLength(1);
  });
  it('qa_screenshots table exists', async () => {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'qa_screenshots'");
    expect(rows).toHaveLength(1);
  });
  it('qa_sessions has required columns', async () => {
    const [rows] = await conn.execute("DESCRIBE qa_sessions");
    const cols = rows.map(r => r.Field);
    expect(cols).toContain('id');
    expect(cols).toContain('url');
    expect(cols).toContain('status');
    expect(cols).toContain('bugs_found');
    expect(cols).toContain('completed_at');
  });
});
