# QA Browser Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playwright MCP 기반 3역할 QA 에이전트(Architect → Browser → Reporter) + DB/마크다운 저장 인프라 구축

**Architecture:** QA Architect(Opus)가 시나리오를 단계 분해 → QA Browser(Sonnet+MCP)가 브라우저를 직접 제어하며 4중 검증 + 복구 프로토콜 실행 → QA Reporter(Opus)가 qa-reporter.mjs로 MySQL + 마크다운 저장

**Tech Stack:** Node.js ESM, Playwright MCP (`@playwright/mcp`), MySQL 8.0 (기존 포트 3377), yaml npm 패키지, Vitest

---

## File Structure

| 경로 | 상태 | 역할 |
|------|------|------|
| `.gitignore` | Create | `.claude/settings.local.json` + `tmp/qa-screenshots/` 제외 |
| `.claude/settings.local.json` | Create | Playwright MCP 서버 등록 (local only) |
| `tmp/qa-screenshots/.gitkeep` | Create | 스크린샷 임시 저장 디렉터리 |
| `docs/qa-reports/.gitkeep` | Create | 완료 리포트 저장 디렉터리 |
| `docker/memory/qa-schema.sql` | Create | QA 전용 3개 테이블 (마이그레이션 + init.sql 추가용) |
| `docker/memory/init.sql` | Modify | qa-schema.sql 내용 append |
| `scripts/qa-reporter.mjs` | Create | QaReporter 클래스 + CLI 진입점 |
| `scripts/__tests__/qa-reporter.test.mjs` | Create | QaReporter Vitest 테스트 |
| `skills/agent-qa-browser/SKILL.md` | Create | 3역할 에이전트 스킬 문서 |
| `README.md` | Modify | QA 에이전트 섹션 추가 |

---

## Task 1: Setup — .gitignore, MCP 설정, 디렉터리

**Files:**
- Create: `.gitignore`
- Create: `.claude/settings.local.json`
- Create: `tmp/qa-screenshots/.gitkeep`
- Create: `docs/qa-reports/.gitkeep`

- [ ] **Step 1: .gitignore 생성**

```bash
cat > .gitignore << 'EOF'
# Local MCP configuration (personal, not shared)
.claude/settings.local.json

# QA temporary screenshots (auto-cleaned after session)
tmp/qa-screenshots/

# Node
node_modules/
EOF
```

- [ ] **Step 2: .claude 디렉터리 + settings.local.json 생성**

```bash
mkdir -p .claude
```

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

파일 경로: `.claude/settings.local.json`

- [ ] **Step 3: 디렉터리 플레이스홀더 생성**

```bash
mkdir -p tmp/qa-screenshots docs/qa-reports
touch tmp/qa-screenshots/.gitkeep docs/qa-reports/.gitkeep
```

- [ ] **Step 4: 파일 존재 확인**

```bash
ls .gitignore .claude/settings.local.json tmp/qa-screenshots/.gitkeep docs/qa-reports/.gitkeep
```

Expected: 4개 파일 모두 출력

- [ ] **Step 5: Commit**

```bash
git add .gitignore .claude/settings.local.json tmp/qa-screenshots/.gitkeep docs/qa-reports/.gitkeep
git commit -m "feat: add QA agent setup — .gitignore, MCP config, screenshot dirs"
```

---

## Task 2: QA DB Schema

**Files:**
- Create: `docker/memory/qa-schema.sql`
- Modify: `docker/memory/init.sql`
- Create: `scripts/__tests__/qa-reporter.test.mjs` (schema 부분만 먼저)

**사전 조건:** `npm run memory:up` (MySQL 3377 실행 중)

- [ ] **Step 1: 스키마 테스트 작성 (qa_sessions 테이블 존재 확인)**

파일: `scripts/__tests__/qa-reporter.test.mjs`

```javascript
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
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run scripts/__tests__/qa-reporter.test.mjs
```

Expected: 3개 테스트 모두 FAIL (테이블 없음)

- [ ] **Step 3: qa-schema.sql 생성**

파일: `docker/memory/qa-schema.sql`

```sql
USE agent_memory;

CREATE TABLE IF NOT EXISTS qa_sessions (
  id VARCHAR(36) PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  scenario TEXT NOT NULL,
  status ENUM('IN_PROGRESS','PASS','FAIL','STUCK','PARTIAL') DEFAULT 'IN_PROGRESS',
  total_steps INT DEFAULT 0,
  bugs_found INT DEFAULT 0,
  deferred_bugs INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS qa_bugs (
  id VARCHAR(36) PRIMARY KEY,
  qa_session_id VARCHAR(36) NOT NULL,
  bug_type ENUM('CONSOLE','UI','NETWORK','BEHAVIOR') NOT NULL,
  severity ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
  step_number INT NOT NULL,
  description TEXT NOT NULL,
  selector VARCHAR(512),
  screenshot_path VARCHAR(512),
  console_log TEXT,
  network_detail TEXT,
  status ENUM('OPEN','DEFERRED','CONFIRMED','FALSE_POSITIVE') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qa_session_id) REFERENCES qa_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_screenshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  qa_session_id VARCHAR(36) NOT NULL,
  step_number INT,
  bug_id VARCHAR(36),
  type ENUM('BEFORE','AFTER','BUG_EVIDENCE','RECOVERY') NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qa_session_id) REFERENCES qa_sessions(id) ON DELETE CASCADE
);
```

- [ ] **Step 4: 실행 중인 DB에 스키마 적용**

```bash
docker exec -i $(docker ps --filter "ancestor=mysql:8.0" -q | head -1) \
  mysql -u nova -pnova_pass agent_memory < docker/memory/qa-schema.sql
```

Expected: 오류 없이 완료

- [ ] **Step 5: init.sql에 스키마 추가**

`docker/memory/init.sql` 파일 끝에 qa-schema.sql의 3개 CREATE TABLE 블록을 붙여넣는다 (USE agent_memory; 줄 제외).

최종 init.sql 끝부분:

```sql
-- (기존 INSERT IGNORE 5개 그대로 유지)
...
INSERT IGNORE INTO rules (rule_name, level, content) VALUES
...

-- QA Browser Agent 테이블
CREATE TABLE IF NOT EXISTS qa_sessions (
  id VARCHAR(36) PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  scenario TEXT NOT NULL,
  status ENUM('IN_PROGRESS','PASS','FAIL','STUCK','PARTIAL') DEFAULT 'IN_PROGRESS',
  total_steps INT DEFAULT 0,
  bugs_found INT DEFAULT 0,
  deferred_bugs INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS qa_bugs (
  id VARCHAR(36) PRIMARY KEY,
  qa_session_id VARCHAR(36) NOT NULL,
  bug_type ENUM('CONSOLE','UI','NETWORK','BEHAVIOR') NOT NULL,
  severity ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
  step_number INT NOT NULL,
  description TEXT NOT NULL,
  selector VARCHAR(512),
  screenshot_path VARCHAR(512),
  console_log TEXT,
  network_detail TEXT,
  status ENUM('OPEN','DEFERRED','CONFIRMED','FALSE_POSITIVE') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qa_session_id) REFERENCES qa_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_screenshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  qa_session_id VARCHAR(36) NOT NULL,
  step_number INT,
  bug_id VARCHAR(36),
  type ENUM('BEFORE','AFTER','BUG_EVIDENCE','RECOVERY') NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qa_session_id) REFERENCES qa_sessions(id) ON DELETE CASCADE
);
```

- [ ] **Step 6: 테스트 실행 — PASS 확인**

```bash
npx vitest run scripts/__tests__/qa-reporter.test.mjs
```

Expected: 3개 테스트 모두 PASS

- [ ] **Step 7: Commit**

```bash
git add docker/memory/qa-schema.sql docker/memory/init.sql scripts/__tests__/qa-reporter.test.mjs
git commit -m "feat: add QA DB schema (qa_sessions, qa_bugs, qa_screenshots)"
```

---

## Task 3: qa-reporter.mjs — QaReporter 클래스 TDD

**Files:**
- Create: `scripts/qa-reporter.mjs`
- Modify: `scripts/__tests__/qa-reporter.test.mjs` (QaReporter 테스트 추가)
- Modify: `package.json` (yaml devDependency 추가)

- [ ] **Step 1: yaml 패키지 설치**

```bash
npm install --save-dev yaml
```

`package.json` devDependencies에 `"yaml": "^2.4.0"` 추가 확인

- [ ] **Step 2: saveSession 실패 테스트 추가**

`scripts/__tests__/qa-reporter.test.mjs`에 기존 schema describe 블록 아래 추가:

```javascript
import { QaReporter } from '../qa-reporter.mjs';

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
    const bug = {
      id: 'bug-test-' + Date.now(),
      type: 'NETWORK',
      severity: 'CRITICAL',
      step: 1,
      description: 'POST /api/save → 500',
    };
    await reporter.saveBug(sessionId, bug);
    const [rows] = await conn2.execute('SELECT * FROM qa_bugs WHERE id = ?', [bug.id]);
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
    const [result] = await conn2.execute(
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
```

- [ ] **Step 3: 테스트 실행 — FAIL 확인**

```bash
npx vitest run scripts/__tests__/qa-reporter.test.mjs
```

Expected: QaReporter describe 블록 5개 테스트 FAIL (모듈 없음)

- [ ] **Step 4: qa-reporter.mjs 구현**

파일: `scripts/qa-reporter.mjs`

```javascript
import mysql from 'mysql2/promise';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { parse } from 'yaml';
import { randomUUID } from 'crypto';

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
    await this.#pool.execute(
      `INSERT INTO qa_sessions
        (id, url, scenario, status, total_steps, bugs_found, deferred_bugs, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [qa_session_id, url, scenario, status, steps.length, bugs_found.length, deferred_bugs.length]
    );
    for (const bug of bugs_found) await this.saveBug(qa_session_id, bug);
    for (const ss of screenshots) await this.saveScreenshot(qa_session_id, ss);
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
      try { unlinkSync(row.file_path); } catch { /* 파일 없어도 무시 */ }
      await this.#pool.execute(
        'UPDATE qa_screenshots SET deleted_at = NOW() WHERE id = ?',
        [row.id]
      );
    }
    return rows.length;
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[1].endsWith('qa-reporter.mjs')) {
  const args = process.argv.slice(2);
  const cleanMode = args[0] === '--clean';
  const sessionId = cleanMode ? args[1] : args[0];

  if (!sessionId) {
    console.error('Usage: node scripts/qa-reporter.mjs [--clean] <qa_session_id>');
    process.exit(1);
  }

  const reporter = new QaReporter();

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

  await reporter.close();
}
```

- [ ] **Step 5: 테스트 실행 — PASS 확인**

```bash
npx vitest run scripts/__tests__/qa-reporter.test.mjs
```

Expected: 스키마 3개 + QaReporter 5개 = 8개 테스트 모두 PASS

- [ ] **Step 6: 전체 테스트 회귀 확인**

```bash
npm test
```

Expected: 기존 테스트 포함 전체 PASS

- [ ] **Step 7: Commit**

```bash
git add scripts/qa-reporter.mjs scripts/__tests__/qa-reporter.test.mjs package.json package-lock.json
git commit -m "feat: add QaReporter class with save/clean/markdown (TDD)"
```

---

## Task 4: agent-qa-browser SKILL.md

**Files:**
- Create: `skills/agent-qa-browser/SKILL.md`

- [ ] **Step 1: 디렉터리 생성**

```bash
mkdir -p skills/agent-qa-browser
```

- [ ] **Step 2: SKILL.md 작성**

파일: `skills/agent-qa-browser/SKILL.md`

```markdown
---
name: agent-qa-browser
description: Use when running automated QA on a localhost Next.js/NestJS app — scenario-based browser control via Playwright MCP, bug detection (console/UI/network), screenshot lifecycle management, MySQL + markdown reporting.
created: 2026-05-13
updated: 2026-05-13
---

# QA Browser Agent

## Overview

3역할 에이전트가 Playwright MCP로 브라우저를 직접 제어하며 시나리오 기반 QA를 수행한다.

## 사전 요구사항

```bash
npm run memory:up   # MySQL 3377 시작
# .claude/settings.local.json에 Playwright MCP 등록 필수
```

## 실행 방법

**1. QA Architect 실행:**
```
역할: QA Architect
URL: http://localhost:3000
시나리오: "로그인 → 대시보드 → 저장"
→ docs/qa-state.md를 초기화하라
```

**2. QA Browser 실행:**
```
역할: QA Browser
docs/qa-state.md를 읽고 시나리오를 실행하라
```

**3. QA Reporter 실행:**
```
역할: QA Reporter
docs/qa-state.md를 읽고 node scripts/qa-reporter.mjs <session_id>를 실행하라
```

---

## Role Contract: QA Architect

**책임:** 시나리오 파싱 → 단계 분해 → docs/qa-state.md 초기화

**각 단계 출력 형식:**
```yaml
- number: 1
  label: "로그인 페이지 이동"
  action: navigate
  target: "http://localhost:3000/login"
  status: PENDING
  verification:
    expected_url_change: true
    expected_dom: "input[type='email']"
    expected_network: null
    expected_console_clean: true
```

**금지:** 브라우저 직접 조작, qa-state.md 임의 수정 (초기화만 허용)

---

## Role Contract: QA Browser

### 🔴 CRITICAL — 액션 실행 순서 (반드시 이 순서)

```
Phase 1: 클릭 전 요소 검증
  browser_evaluate → { text, ariaLabel, visible, inViewport }
  예상 다름 → browser_scroll 후 재확인
  재확인도 다름 → STUCK

Phase 2: BEFORE 스크린샷
  browser_screenshot → tmp/qa-screenshots/step{N}-before.png
  qa-state.md screenshots 배열에 기록

Phase 3: 액션 실행
  browser_click(selector) 또는 browser_type(selector, value)

Phase 4: 4중 검증 🟠 HIGH
  ① browser_screenshot → 전/후 시각적 비교 (에이전트 직접 판단)
  ② browser_evaluate(expected_dom) → 기대 요소 존재 여부
  ③ browser_evaluate(() => window.location.href) → URL 변화
  ④ browser_console_messages() + browser_network_requests()

Phase 5: VERDICT
  PASS: 4개 중 3개 이상 통과 → qa-state.md step status: PASS
  FAIL: 복구 프로토콜 실행
```

### 복구 프로토콜

| Level | 조건 | 액션 |
|-------|------|------|
| Level 1 | retry_count < 2 | clear → 재입력 / history.back() → 재시도; retry_count += 1 |
| Level 2 | retry_count == 2 | recovery 스크린샷 저장 → navigate(시작 URL); retry_count = 0 |
| Level 3 | Level 2도 실패 | status: STUCK → 즉시 중단 → "N단계 수동 확인 필요" 알림 |

### 버그 탐색 규칙

```
버그 발견 시 exploration_stack에 push, depth 계산:
  depth ≤ 2 → 콘솔/네트워크/DOM 추가 확인
  depth > 2 → deferred_bugs에 기록 후 즉시 stack pop

버그마다 BUG_EVIDENCE 스크린샷 저장 (삭제 대상 아님)
```

**금지:** 스스로 시나리오 변경, depth > 2 자율 탐색, 스크린샷 삭제

---

## Role Contract: QA Reporter

**절차:**
1. `docs/qa-state.md` 읽기
2. `node scripts/qa-reporter.mjs <qa_session_id>` 실행
3. 요약 출력 (단계 결과 / 버그 / deferred)
4. 사용자에게 질문:
   - "deferred_bugs N개 있습니다. 지금 조사할까요?"
   - "정상 단계 스크린샷(BEFORE/AFTER) N개 삭제할까요?"
   - 승인 시: `node scripts/qa-reporter.mjs --clean <qa_session_id>`

**금지:** 브라우저 조작, 버그 자의적 삭제, 스크린샷 자동 삭제

---

## Common Mistakes

| 실수 | 레벨 | 수정 |
|------|------|------|
| 클릭 전 요소 검증 생략 | 🔴 CRITICAL | browser_evaluate로 text/visible 확인 후 클릭 |
| BEFORE 스크린샷 없이 액션 실행 | 🟠 HIGH | 항상 before 먼저 찍는다 |
| 4중 검증 중 일부만 실행 | 🟡 MEDIUM | 4개 모두 실행, 3개 이상 PASS여야 통과 |
| depth > 2 자율 탐색 | 🟠 HIGH | deferred에 기록 후 즉시 복귀 |
| BUG_EVIDENCE 자동 삭제 | 🔴 CRITICAL | 사용자 승인 전 절대 삭제 금지 |
| Level 3 도달 후 재시도 | 🔴 CRITICAL | 즉시 STUCK → 중단 → 사용자 알림 |
| qa-state.md 없이 QA Browser 실행 | 🟠 HIGH | Architect 먼저 실행해 초기화 필수 |
```

- [ ] **Step 3: 파일 존재 + frontmatter 확인**

```bash
head -6 skills/agent-qa-browser/SKILL.md
```

Expected:
```
---
name: agent-qa-browser
description: Use when running automated QA...
created: 2026-05-13
updated: 2026-05-13
---
```

- [ ] **Step 4: Commit**

```bash
git add skills/agent-qa-browser/SKILL.md
git commit -m "feat: add agent-qa-browser skill (3-role contract, Playwright MCP)"
```

---

## Task 5: README 업데이트 + 최종 검증

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README에 QA 에이전트 섹션 추가**

`README.md`에서 기존 `## Skills` 섹션 또는 문서 끝에 다음 섹션을 추가한다:

```markdown
## QA Browser Agent

Playwright MCP로 브라우저를 직접 제어하며 localhost 앱을 자율 QA하는 3역할 에이전트.

### 사전 요구사항

1. MySQL 시작:
   ```bash
   npm run memory:up
   ```

2. `.claude/settings.local.json` 생성 (gitignored):
   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": ["@playwright/mcp@latest"]
       }
     }
   }
   ```

### 사용 방법

1. **QA Architect** — 시나리오를 단계 분해하고 `docs/qa-state.md` 초기화
2. **QA Browser** — 브라우저를 직접 제어하며 4중 검증 + 복구 프로토콜 실행
3. **QA Reporter** — `node scripts/qa-reporter.mjs <session_id>` 로 DB 저장 + 마크다운 리포트 생성

자세한 스킬 사용법: `skills/agent-qa-browser/SKILL.md`

### 리포트 정리

```bash
# 정상 단계 스크린샷 삭제 (BUG_EVIDENCE 보존)
node scripts/qa-reporter.mjs --clean <qa_session_id>
```
```

- [ ] **Step 2: 전체 테스트 최종 실행**

```bash
npm test
```

Expected: 전체 PASS (기존 + qa-reporter 8개)

- [ ] **Step 3: 파일 구조 최종 확인**

```bash
ls skills/agent-qa-browser/SKILL.md \
   docker/memory/qa-schema.sql \
   scripts/qa-reporter.mjs \
   scripts/__tests__/qa-reporter.test.mjs \
   tmp/qa-screenshots/.gitkeep \
   docs/qa-reports/.gitkeep \
   .gitignore
```

Expected: 7개 파일 모두 출력

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add QA Browser Agent section to README"
```

---

## 셀프 리뷰

**설계 문서 대조:**

| 설계 요구사항 | 구현 태스크 |
|-------------|-----------|
| .claude/settings.local.json | Task 1 |
| tmp/qa-screenshots/ (gitignore) | Task 1 |
| docker/memory/qa-schema.sql (3테이블) | Task 2 |
| init.sql 추가 | Task 2 |
| scripts/qa-reporter.mjs (save + --clean) | Task 3 |
| QaReporter 테스트 | Task 3 |
| skills/agent-qa-browser/SKILL.md (3역할) | Task 4 |
| README 업데이트 | Task 5 |

**누락 없음 확인:** docs/qa-state.md는 에이전트가 실행 시 생성하는 파일이므로 코드로 만들지 않는다. QA 실행 체크리스트는 SKILL.md에 포함됨.
