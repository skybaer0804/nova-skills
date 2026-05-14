import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import { QaReporter } from '../qa-reporter.mjs';

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

describe('QaReporter', () => {
  let reporter;
  const sessionId = 'test-qa-' + Date.now();
  let conn2;

  beforeAll(async () => {
    reporter = new QaReporter(DB);
    conn2 = await mysql.createConnection(DB);
  });

  afterAll(async () => {
    await conn2.execute('DELETE FROM qa_sessions WHERE id = ?', [sessionId]);
    await reporter.close();
    if (conn2) await conn2.end();
  });

  it('saveSession inserts qa_sessions row', async () => {
    const qaState = {
      qa_session_id: sessionId,
      url: 'http://localhost:3000',
      scenario: '테스트 시나리오',
      status: 'PASS',
      steps: [{ number: 1, label: '로그인', status: 'PASS' }],
      bugs_found: [],
      deferred_bugs: [],
      screenshots: [],
    };
    await reporter.saveSession(qaState);
    const [rows] = await conn2.execute('SELECT * FROM qa_sessions WHERE id = ?', [sessionId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].url).toBe('http://localhost:3000');
    expect(rows[0].status).toBe('PASS');
    expect(rows[0].total_steps).toBe(1);
  });

  it('saveBug inserts qa_bugs row', async () => {
    const bugId = 'bug-test-' + Date.now();
    const bug = {
      id: bugId,
      type: 'NETWORK',
      severity: 'CRITICAL',
      step: 1,
      description: 'POST /api/save → 500',
    };
    await reporter.saveBug(sessionId, bug);
    const [rows] = await conn2.execute('SELECT * FROM qa_bugs WHERE id = ?', [bugId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBe('CRITICAL');
    expect(rows[0].bug_type).toBe('NETWORK');
  });

  it('saveScreenshot inserts qa_screenshots row', async () => {
    const ss = { file: 'step1-before.png', type: 'BEFORE', step: 1 };
    await reporter.saveScreenshot(sessionId, ss);
    const [rows] = await conn2.execute(
      "SELECT * FROM qa_screenshots WHERE qa_session_id = ? AND type = 'BEFORE'",
      [sessionId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].file_path).toBe('step1-before.png');
  });

  it('generateMarkdown returns report string', () => {
    const qaState = {
      qa_session_id: sessionId,
      url: 'http://localhost:3000',
      scenario: '로그인 → 대시보드',
      status: 'PASS',
      steps: [{ number: 1, label: '로그인', status: 'PASS' }],
      bugs_found: [],
      deferred_bugs: [],
      screenshots: [],
    };
    const md = reporter.generateMarkdown(qaState);
    expect(md).toContain('# QA Report');
    expect(md).toContain('http://localhost:3000');
    expect(md).toContain('로그인 → 대시보드');
    expect(md).toContain('1/1 PASS');
  });

  it('cleanScreenshots marks deleted_at and returns count', async () => {
    await conn2.execute(
      "UPDATE qa_screenshots SET deleted_at = NULL WHERE qa_session_id = ? AND type = 'BEFORE'",
      [sessionId]
    );
    const count = await reporter.cleanScreenshots(sessionId);
    expect(count).toBeGreaterThan(0);
    const [rows] = await conn2.execute(
      "SELECT deleted_at FROM qa_screenshots WHERE qa_session_id = ? AND type = 'BEFORE'",
      [sessionId]
    );
    expect(rows[0].deleted_at).not.toBeNull();
  });
});
