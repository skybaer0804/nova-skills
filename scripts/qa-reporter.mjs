import mysql from 'mysql2/promise';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { parse } from 'yaml';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

export class QaReporter {
  #pool;

  constructor(config = {}) {
    this.#pool = mysql.createPool({
      host: config.host ?? process.env.MYSQL_HOST ?? 'localhost',
      port: config.port ?? Number(process.env.MYSQL_PORT ?? 3377),
      user: config.user ?? process.env.MYSQL_USER ?? 'nova',
      password: config.password ?? process.env.MYSQL_PASSWORD ?? 'nova_pass',
      database: config.database ?? process.env.MYSQL_DATABASE ?? 'agent_memory',
    });
  }

  async close() {
    await this.#pool.end();
  }

  async saveSession(qaState) {
    const {
      qa_session_id, url, scenario, status,
      steps = [], bugs_found = [], deferred_bugs = [], screenshots = [],
    } = qaState;
    const conn = await this.#pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO qa_sessions
          (id, url, scenario, status, total_steps, bugs_found, deferred_bugs, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [qa_session_id, url, scenario, status, steps.length, bugs_found.length, deferred_bugs.length]
      );
      for (const bug of bugs_found) await this.#saveBugConn(conn, qa_session_id, bug);
      for (const ss of screenshots) await this.#saveScreenshotConn(conn, qa_session_id, ss);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async #saveBugConn(conn, sessionId, bug) {
    await conn.execute(
      `INSERT INTO qa_bugs
        (id, qa_session_id, bug_type, severity, step_number, description,
         selector, screenshot_path, console_log, network_detail, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bug.id ?? randomUUID(),
        sessionId,
        bug.type,
        bug.severity,
        bug.step,
        bug.description,
        bug.selector ?? null,
        bug.screenshot_path ?? null,
        bug.console_log ?? null,
        bug.network_detail ?? null,
        bug.status ?? 'OPEN',
      ]
    );
  }

  async #saveScreenshotConn(conn, sessionId, ss) {
    await conn.execute(
      `INSERT INTO qa_screenshots
        (qa_session_id, step_number, bug_id, type, file_path)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, ss.step ?? null, ss.bug_id ?? null, ss.type, ss.file]
    );
  }

  async saveBug(sessionId, bug) {
    await this.#pool.execute(
      `INSERT INTO qa_bugs
        (id, qa_session_id, bug_type, severity, step_number, description,
         selector, screenshot_path, console_log, network_detail, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bug.id ?? randomUUID(),
        sessionId,
        bug.type,
        bug.severity,
        bug.step,
        bug.description,
        bug.selector ?? null,
        bug.screenshot_path ?? null,
        bug.console_log ?? null,
        bug.network_detail ?? null,
        bug.status ?? 'OPEN',
      ]
    );
  }

  async saveScreenshot(sessionId, ss) {
    await this.#pool.execute(
      `INSERT INTO qa_screenshots
        (qa_session_id, step_number, bug_id, type, file_path)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, ss.step ?? null, ss.bug_id ?? null, ss.type, ss.file]
    );
  }

  generateMarkdown(qaState) {
    const {
      url, scenario, status,
      steps = [], bugs_found = [], deferred_bugs = [], screenshots = [],
    } = qaState;
    const today = new Date().toISOString().slice(0, 10);
    const passCount = steps.filter(s => s.status === 'PASS').length;
    const total = steps.length;

    let md = `# QA Report — ${today}\n\n`;
    md += `**URL:** ${url}\n`;
    md += `**시나리오:** ${scenario}\n`;
    md += `**결과:** ${status} — ${passCount}/${total} PASS\n\n`;

    if (bugs_found.length > 0) {
      md += `## 버그 목록\n\n`;
      for (const bug of bugs_found) {
        const icon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' }[bug.severity] ?? '⚪';
        md += `### ${icon} ${bug.severity} — ${bug.description}\n`;
        md += `- **단계:** ${bug.step}\n`;
        if (bug.console_log) md += `- **콘솔:** ${bug.console_log}\n`;
        if (bug.network_detail) md += `- **네트워크:** ${bug.network_detail}\n`;
        const ev = screenshots.find(s => s.bug_id === bug.id && s.type === 'BUG_EVIDENCE');
        if (ev) md += `- **증거:** ![screenshot](../../tmp/qa-screenshots/${ev.file})\n`;
        md += '\n';
      }
    }

    if (deferred_bugs.length > 0) {
      md += `## Deferred (미조사)\n\n`;
      for (const d of deferred_bugs) {
        md += `- [${d.severity ?? 'UNKNOWN'}] ${d.description} — ${d.reason ?? 'depth limit'}\n`;
      }
      md += '\n';
    }

    if (steps.length > 0) {
      md += `## 재현 방법\n\n`;
      steps.forEach((s, i) => { md += `${i + 1}. ${s.label}\n`; });
    }

    return md;
  }

  async cleanScreenshots(sessionId) {
    const [rows] = await this.#pool.execute(
      `SELECT id, file_path FROM qa_screenshots
       WHERE qa_session_id = ?
         AND type IN ('BEFORE','AFTER','RECOVERY')
         AND deleted_at IS NULL`,
      [sessionId]
    );
    for (const row of rows) {
      try { unlinkSync(row.file_path); } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      await this.#pool.execute(
        'UPDATE qa_screenshots SET deleted_at = NOW() WHERE id = ?',
        [row.id]
      );
    }
    return rows.length;
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const cleanMode = args[0] === '--clean';
  const sessionId = cleanMode ? args[1] : args[0];

  if (!sessionId) {
    console.error('Usage: node scripts/qa-reporter.mjs [--clean] <qa_session_id>');
    process.exit(1);
  }

  const reporter = new QaReporter();

  try {
    if (cleanMode) {
      const count = await reporter.cleanScreenshots(sessionId);
      console.log(`Cleaned ${count} screenshot(s) for session ${sessionId}`);
    } else {
      const raw = readFileSync('docs/qa-state.md', 'utf-8');
      const qaState = parse(raw);
      await reporter.saveSession(qaState);
      const md = reporter.generateMarkdown(qaState);
      const today = new Date().toISOString().slice(0, 10);
      const idShort = sessionId.slice(0, 8);
      const reportPath = `docs/qa-reports/${today}-${idShort}.md`;
      writeFileSync(reportPath, md);
      console.log(`Report saved: ${reportPath}`);
    }
  } finally {
    await reporter.close();
  }
}
