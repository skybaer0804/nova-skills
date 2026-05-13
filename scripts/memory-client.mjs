import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

export class MemoryClient {
  #pool = null;

  async connect() {
    this.#pool = mysql.createPool({
      host: process.env.MEMORY_DB_HOST ?? 'localhost',
      port: parseInt(process.env.MEMORY_DB_PORT ?? '3377'),
      user: process.env.MEMORY_DB_USER ?? 'nova',
      password: process.env.MEMORY_DB_PASSWORD ?? 'nova_pass',
      database: process.env.MEMORY_DB_NAME ?? 'agent_memory',
      waitForConnections: true,
      connectionLimit: 5,
    });
  }

  async disconnect() { if (this.#pool) await this.#pool.end(); }

  async createSession(taskDescription) {
    const id = randomUUID();
    await this.#pool.execute(
      'INSERT INTO sessions (id, task_description) VALUES (?, ?)',
      [id, taskDescription]
    );
    return id;
  }

  async getSession(sessionId) {
    const [rows] = await this.#pool.execute('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    return rows[0] ?? null;
  }

  async completeSession(sessionId, finalStatus) {
    await this.#pool.execute(
      'UPDATE sessions SET final_status = ?, completed_at = NOW() WHERE id = ?',
      [finalStatus, sessionId]
    );
  }

  async addIteration(sessionId, { iterationNumber, status, testTypes, lastTestResult, architectDecision, nextAction, researchDone }) {
    await this.#pool.execute(
      `INSERT INTO iterations
         (session_id, iteration_number, status, test_types, last_test_result, architect_decision, next_action, research_done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, iterationNumber, status, JSON.stringify(testTypes ?? []),
       lastTestResult ?? null, architectDecision ?? null, nextAction ?? null, researchDone ?? false]
    );
  }

  async getLatestIteration(sessionId) {
    const [rows] = await this.#pool.execute(
      'SELECT * FROM iterations WHERE session_id = ? ORDER BY iteration_number DESC LIMIT 1',
      [sessionId]
    );
    return rows[0] ?? null;
  }

  async addMetaCase(sessionId, { iterationNumber, caseType, role, level, content, reusePoint, impact }) {
    await this.#pool.execute(
      `INSERT INTO meta_cases
         (session_id, iteration_number, case_type, role, level, content, reuse_point, impact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, iterationNumber, caseType, role, level ?? null,
       content, reusePoint ?? null, impact ?? null]
    );
  }

  async getMetaCases(sessionId, caseType = null) {
    const [rows] = caseType
      ? await this.#pool.execute(
          'SELECT * FROM meta_cases WHERE session_id = ? AND case_type = ? ORDER BY iteration_number',
          [sessionId, caseType]
        )
      : await this.#pool.execute(
          'SELECT * FROM meta_cases WHERE session_id = ? ORDER BY iteration_number',
          [sessionId]
        );
    return rows;
  }

  async getAllBadCases(limitDays = 90) {
    const [rows] = await this.#pool.execute(
      `SELECT mc.*, s.task_description
       FROM meta_cases mc JOIN sessions s ON mc.session_id = s.id
       WHERE mc.case_type IN ('BAD','VIOLATION')
         AND mc.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY mc.created_at DESC`,
      [limitDays]
    );
    return rows;
  }

  async getActiveRules(levels = null) {
    if (levels?.length > 0) {
      const placeholders = levels.map(() => '?').join(',');
      const [rows] = await this.#pool.execute(
        `SELECT * FROM rules WHERE is_active = TRUE AND level IN (${placeholders}) ORDER BY level, rule_name`,
        levels
      );
      return rows;
    }
    const [rows] = await this.#pool.execute(
      'SELECT * FROM rules WHERE is_active = TRUE ORDER BY level, rule_name'
    );
    return rows;
  }

  async updateRule(ruleName, { content, modifiedReason }) {
    await this.#pool.execute(
      'UPDATE rules SET content = ?, version = version + 1, modified_reason = ?, updated_at = NOW() WHERE rule_name = ?',
      [content, modifiedReason, ruleName]
    );
  }

  async saveFeedback(sessionId, { satisfaction, archAligned, comment, ruleChangesRequested }) {
    await this.#pool.execute(
      'INSERT INTO feedback (session_id, satisfaction, arch_aligned, comment, rule_changes_requested) VALUES (?, ?, ?, ?, ?)',
      [sessionId, satisfaction, archAligned, comment ?? null, ruleChangesRequested ?? null]
    );
  }

  async getFeedback(sessionId) {
    const [rows] = await this.#pool.execute(
      'SELECT * FROM feedback WHERE session_id = ? ORDER BY created_at DESC',
      [sessionId]
    );
    return rows;
  }

  async getRepeatingPatterns(minCount = 3) {
    const [rows] = await this.#pool.execute(
      `SELECT role, LEFT(content, 80) AS pattern, COUNT(*) AS cnt
       FROM meta_cases WHERE case_type = 'BAD'
       GROUP BY role, LEFT(content, 80)
       HAVING cnt >= ?
       ORDER BY cnt DESC`,
      [minCount]
    );
    return rows;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, command, ...args] = process.argv;
  const client = new MemoryClient();
  await client.connect();

  switch (command) {
    case 'init': {
      const id = await client.createSession(args.join(' ') || 'unnamed task');
      console.log(`SESSION_ID=${id}`);
      break;
    }
    case 'complete': {
      const [sid, status] = args;
      await client.completeSession(sid, status ?? 'DONE');
      console.log(`Session ${sid} → ${status ?? 'DONE'}`);
      break;
    }
    case 'similar': {
      const keyword = args.join(' ').toLowerCase();
      const cases = await client.getAllBadCases(90);
      const matched = cases.filter(c => c.task_description?.toLowerCase().includes(keyword));
      console.log(matched.length ? JSON.stringify(matched.slice(0, 5), null, 2) : 'No similar cases found');
      break;
    }
    case 'addcase': {
      const [sid, jsonStr] = args;
      const data = JSON.parse(jsonStr);
      await client.addMetaCase(sid, data);
      console.log('Meta case saved');
      break;
    }
    default:
      console.error(`Unknown command: ${command}\nUsage: init|complete|similar|addcase`);
      process.exit(1);
  }

  await client.disconnect();
}
