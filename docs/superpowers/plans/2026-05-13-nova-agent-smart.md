# Nova-Agent 강화 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** agent-architect-tdd-loop에 MySQL 기반 영속 메모리(기억의 궁전), 자가학습, 사용자 피드백, 자동화 탐지, 불필요 제거 기능 추가

**Architecture:** MySQL Docker로 세션-횡단 기억 저장소를 구축하고 memory-client.mjs로 CRUD를 추상화한다. MetaLearner가 과거 Bad Cases를 분석해 MEDIUM/LOW 규칙을 자동 진화시키고, FeedbackCollector·AutomationDetector·Pruner가 그 위에서 동작한다.

**Tech Stack:** Node.js ESM (mjs), MySQL 8.0, mysql2/promise, vitest, Docker Compose, GitHub Actions

---

## 파일 구조 (생성/수정 대상)

```
docker/memory/
  docker-compose.yml          ← NEW: MySQL 서비스
  init.sql                    ← NEW: 스키마 정의

scripts/
  memory-client.mjs           ← NEW: DB CRUD + CLI
  meta-learner.mjs            ← NEW: 자가학습 (BAD cases → 규칙 진화)
  collect-feedback.mjs        ← NEW: 사용자 피드백 수집
  automation-detector.mjs     ← NEW: 반복 패턴 → 자동화 제안
  pruner.mjs                  ← NEW: 오래된 스킬 탐지
  __tests__/
    memory-schema.test.mjs    ← NEW
    memory-client.test.mjs    ← NEW
    meta-learner.test.mjs     ← NEW
    collect-feedback.test.mjs ← NEW
    automation-detector.test.mjs ← NEW
    pruner.test.mjs           ← NEW

skills/agent-architect-tdd-loop/
  SKILL.md                    ← MODIFY: DB 연동 체크리스트 + Retrospective 업데이트

.github/workflows/
  monthly-automation-review.yml  ← NEW
  monthly-pruning.yml            ← NEW

package.json                  ← MODIFY: mysql2, vitest 추가, version 2.3.0
```

---

## Phase 1 — 기억의 궁전 인프라

### Task 1: MySQL Docker Compose + Schema

**Files:**
- Create: `docker/memory/docker-compose.yml`
- Create: `docker/memory/init.sql`
- Modify: `package.json`

- [ ] **Step 1: 테스트 작성 (실패 확인용)**

```javascript
// scripts/__tests__/memory-schema.test.mjs
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
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd /Users/nowonjae/Desktop/nova-skills
npm install mysql2 vitest
npx vitest run scripts/__tests__/memory-schema.test.mjs
```
Expected: `FAIL` — connection refused (DB 미실행)

- [ ] **Step 3: Docker Compose 생성**

```yaml
# docker/memory/docker-compose.yml
services:
  memory-db:
    image: mysql:8.0
    container_name: nova-memory-db
    ports:
      - "3377:3306"
    environment:
      MYSQL_ROOT_PASSWORD: nova_root
      MYSQL_DATABASE: agent_memory
      MYSQL_USER: nova
      MYSQL_PASSWORD: nova_pass
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
      - nova-memory:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "nova", "--password=nova_pass"]
      interval: 5s
      timeout: 3s
      retries: 12
volumes:
  nova-memory:
```

- [ ] **Step 4: 스키마 생성 (init.sql)**

```sql
-- docker/memory/init.sql

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  task_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  final_status ENUM('DONE','REDESIGN','FAIL','IN_PROGRESS') DEFAULT 'IN_PROGRESS'
);

CREATE TABLE IF NOT EXISTS iterations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  iteration_number INT NOT NULL,
  status ENUM('PASS','FAIL','BLOCKED') DEFAULT 'FAIL',
  test_types JSON,
  last_test_result TEXT,
  architect_decision TEXT,
  next_action ENUM('IMPLEMENT','REDESIGN','DONE') NULL,
  research_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS arch_decisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  iteration_number INT NOT NULL DEFAULT 1,
  decision_type ENUM('TECH_CHOICE','INVARIANT','DECISION_LOG','REDESIGN') NOT NULL,
  content TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meta_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  iteration_number INT NOT NULL,
  case_type ENUM('GOOD','BAD','VIOLATION','IMPROVEMENT') NOT NULL,
  role ENUM('ARCHITECT','IMPLEMENTER','TESTER','RETROSPECTIVE') NOT NULL,
  level ENUM('CRITICAL','HIGH','MEDIUM','LOW') NULL,
  content TEXT NOT NULL,
  reuse_point TEXT NULL,
  impact TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL UNIQUE,
  level ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
  content TEXT NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  modified_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  satisfaction TINYINT NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  arch_aligned BOOLEAN NOT NULL,
  comment TEXT,
  rule_changes_requested TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- MEDIUM/LOW 기본 규칙 시드
INSERT INTO rules (rule_name, level, content) VALUES
('integration_test_criteria',    'MEDIUM', '모듈 경계 또는 API 레이어 변경 시 Integration 테스트 실행'),
('parallel_execution_threshold', 'MEDIUM', '독립 태스크 2개 이상이면 병렬 실행'),
('research_tool_order',          'MEDIUM', 'WebSearch → WebFetch → context7 순서로 조사'),
('state_file_format',            'LOW',    'loop-state.md는 YAML 형식으로 작성'),
('output_summary_style',         'LOW',    '에이전트 출력 끝에 3줄 요약 포함');
```

- [ ] **Step 5: package.json 업데이트**

기존 package.json을 읽고 다음 필드를 추가/수정:
- `"version": "2.3.0"`
- `"scripts": { "test": "vitest run", "memory:up": "docker compose -f docker/memory/docker-compose.yml up -d", "memory:down": "docker compose -f docker/memory/docker-compose.yml down" }`
- `"dependencies": { "mysql2": "^3.11.0" }`
- `"devDependencies": { "vitest": "^2.1.0" }`

- [ ] **Step 6: DB 시작 후 테스트 통과 확인**

```bash
npm run memory:up
until docker exec nova-memory-db mysqladmin ping -u nova --password=nova_pass -h localhost --silent 2>/dev/null; do sleep 2; done
npx vitest run scripts/__tests__/memory-schema.test.mjs
```
Expected: `PASS` — 5 tests pass

- [ ] **Step 7: 커밋**

```bash
git add docker/memory/ scripts/__tests__/memory-schema.test.mjs package.json
git commit -m "feat: memory palace — MySQL Docker + schema (sessions, iterations, meta_cases, rules, feedback)"
```

---

### Task 2: memory-client.mjs

**Files:**
- Create: `scripts/memory-client.mjs`
- Create: `scripts/__tests__/memory-client.test.mjs`

- [ ] **Step 1: 테스트 작성**

```javascript
// scripts/__tests__/memory-client.test.mjs
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MemoryClient } from '../memory-client.mjs';

describe('MemoryClient', () => {
  let client;
  let sessionId;

  beforeAll(async () => { client = new MemoryClient(); await client.connect(); });
  afterAll(async () => { await client.disconnect(); });
  beforeEach(async () => {
    sessionId = await client.createSession('test task ' + Date.now());
  });

  it('createSession returns UUID', () => {
    expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('addIteration and getLatestIteration', async () => {
    await client.addIteration(sessionId, {
      iterationNumber: 1, status: 'FAIL', nextAction: 'IMPLEMENT',
    });
    const iter = await client.getLatestIteration(sessionId);
    expect(iter.iteration_number).toBe(1);
    expect(iter.status).toBe('FAIL');
  });

  it('addMetaCase and getMetaCases', async () => {
    await client.addMetaCase(sessionId, {
      iterationNumber: 1, caseType: 'BAD', role: 'IMPLEMENTER',
      level: 'CRITICAL', content: 'TDD 순서 위반',
    });
    const cases = await client.getMetaCases(sessionId);
    expect(cases).toHaveLength(1);
    expect(cases[0].content).toBe('TDD 순서 위반');
  });

  it('getActiveRules returns MEDIUM/LOW seeded rules only', async () => {
    const rules = await client.getActiveRules(['MEDIUM', 'LOW']);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every(r => ['MEDIUM', 'LOW'].includes(r.level))).toBe(true);
  });

  it('completeSession updates final_status', async () => {
    await client.completeSession(sessionId, 'DONE');
    const session = await client.getSession(sessionId);
    expect(session.final_status).toBe('DONE');
    expect(session.completed_at).not.toBeNull();
  });

  it('saveFeedback and getFeedback round-trip', async () => {
    await client.saveFeedback(sessionId, {
      satisfaction: 4, archAligned: true, comment: '잘 동작함',
    });
    const fb = await client.getFeedback(sessionId);
    expect(fb).toHaveLength(1);
    expect(fb[0].satisfaction).toBe(4);
  });

  it('getRepeatingPatterns detects patterns with cnt >= threshold', async () => {
    for (let i = 0; i < 3; i++) {
      const sid = await client.createSession('pattern-test-' + i);
      await client.addMetaCase(sid, {
        iterationNumber: 1, caseType: 'BAD', role: 'ARCHITECT',
        content: '반복되는 테스트 패턴 XYZ',
      });
    }
    const patterns = await client.getRepeatingPatterns(3);
    expect(patterns.some(p => p.cnt >= 3)).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run scripts/__tests__/memory-client.test.mjs
```
Expected: `FAIL` — `Cannot find module '../memory-client.mjs'`

- [ ] **Step 3: memory-client.mjs 구현**

```javascript
// scripts/memory-client.mjs
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

// CLI 진입점
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
    default:
      console.error(`Unknown command: ${command}\nUsage: init|complete|similar`);
      process.exit(1);
  }

  await client.disconnect();
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run scripts/__tests__/memory-client.test.mjs
```
Expected: `PASS` — 7 tests pass

- [ ] **Step 5: 커밋**

```bash
git add scripts/memory-client.mjs scripts/__tests__/memory-client.test.mjs
git commit -m "feat: add MemoryClient — sessions/iterations/meta_cases/rules/feedback CRUD + CLI"
```

---

## Phase 2 — 자가학습 & 사용자 피드백

### Task 3: meta-learner.mjs (자가학습)

**Files:**
- Create: `scripts/meta-learner.mjs`
- Create: `scripts/__tests__/meta-learner.test.mjs`

- [ ] **Step 1: 테스트 작성**

```javascript
// scripts/__tests__/meta-learner.test.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MetaLearner } from '../meta-learner.mjs';
import { MemoryClient } from '../memory-client.mjs';

describe('MetaLearner', () => {
  let client;
  let learner;

  beforeAll(async () => {
    client = new MemoryClient();
    await client.connect();
    learner = new MetaLearner(client);

    // 3번 반복 BAD 패턴 삽입
    for (let i = 0; i < 3; i++) {
      const sid = await client.createSession('learner-test-' + i);
      await client.addMetaCase(sid, {
        iterationNumber: 1, caseType: 'BAD', role: 'IMPLEMENTER',
        level: 'MEDIUM', content: 'E2E를 unit 테스트 전 실행함', impact: '실패 원인 가려짐',
      });
    }
  });
  afterAll(async () => { await client.disconnect(); });

  it('analyzePatterns returns patterns with cnt >= 3', async () => {
    const patterns = await learner.analyzePatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].cnt).toBeGreaterThanOrEqual(3);
  });

  it('generateImprovements returns only MEDIUM/LOW proposals', async () => {
    const proposals = await learner.generateImprovements();
    expect(Array.isArray(proposals)).toBe(true);
    for (const p of proposals) {
      expect(['MEDIUM', 'LOW']).toContain(p.level);
    }
  });

  it('applyImprovements updates a rule in DB', async () => {
    const rules = await client.getActiveRules(['MEDIUM']);
    if (rules.length === 0) return; // 시드 규칙 없으면 skip

    const proposals = [{ rule_name: rules[0].rule_name, level: 'MEDIUM', new_content: '업데이트된 규칙 내용', reason: '테스트 이유' }];
    const applied = await learner.applyImprovements(proposals);
    expect(applied).toContain(rules[0].rule_name);

    const updated = await client.getActiveRules(['MEDIUM']);
    const target = updated.find(r => r.rule_name === rules[0].rule_name);
    expect(target.version).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run scripts/__tests__/meta-learner.test.mjs
```
Expected: `FAIL` — `Cannot find module '../meta-learner.mjs'`

- [ ] **Step 3: meta-learner.mjs 구현**

```javascript
// scripts/meta-learner.mjs
import Anthropic from '@anthropic-ai/sdk';

export class MetaLearner {
  #client;
  #ai;

  constructor(memoryClient) {
    this.#client = memoryClient;
    this.#ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async analyzePatterns() {
    return this.#client.getRepeatingPatterns(3);
  }

  async generateImprovements() {
    const [badCases, rules] = await Promise.all([
      this.#client.getAllBadCases(90),
      this.#client.getActiveRules(['MEDIUM', 'LOW']),
    ]);

    if (badCases.length === 0) return [];

    const response = await this.#ai.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are analyzing bad cases from an AI agent loop system to improve MEDIUM/LOW rules only.

## Recent Bad Cases (last 90 days)
${badCases.map(c => `- [${c.role}] ${c.content} | impact: ${c.impact ?? 'N/A'} | task: ${c.task_description}`).join('\n')}

## Current MEDIUM/LOW Rules
${rules.map(r => `- [${r.level}] ${r.rule_name}: ${r.content}`).join('\n')}

Identify patterns and propose concrete improvements. DO NOT suggest CRITICAL or HIGH rule changes.

Return JSON array only (no explanation):
[{"rule_name": "existing_rule_name", "level": "MEDIUM|LOW", "new_content": "...", "reason": "..."}]
Return [] if no improvements are needed.`,
      }],
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const proposals = JSON.parse(match[0]);
    return proposals.filter(p => ['MEDIUM', 'LOW'].includes(p.level)); // 이중 방어
  }

  async applyImprovements(proposals) {
    const applied = [];
    for (const p of proposals) {
      await this.#client.updateRule(p.rule_name, {
        content: p.new_content,
        modifiedReason: p.reason,
      });
      applied.push(p.rule_name);
    }
    return applied;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { MemoryClient } = await import('./memory-client.mjs');
  const client = new MemoryClient();
  await client.connect();
  const learner = new MetaLearner(client);

  const proposals = await learner.generateImprovements();
  if (proposals.length === 0) {
    console.log('개선 제안 없음');
  } else {
    const applied = await learner.applyImprovements(proposals);
    console.log(`적용된 규칙: ${applied.join(', ')}`);
    proposals.forEach(p => console.log(`  [${p.level}] ${p.rule_name}: ${p.new_content}`));
  }

  await client.disconnect();
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run scripts/__tests__/meta-learner.test.mjs
```
Expected: `PASS` — 3 tests pass

- [ ] **Step 5: 커밋**

```bash
git add scripts/meta-learner.mjs scripts/__tests__/meta-learner.test.mjs
git commit -m "feat: add MetaLearner — cross-session BAD case analysis + MEDIUM/LOW rule evolution"
```

---

### Task 4: collect-feedback.mjs (사용자 피드백)

**Files:**
- Create: `scripts/collect-feedback.mjs`
- Create: `scripts/__tests__/collect-feedback.test.mjs`

- [ ] **Step 1: 테스트 작성**

```javascript
// scripts/__tests__/collect-feedback.test.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FeedbackCollector } from '../collect-feedback.mjs';
import { MemoryClient } from '../memory-client.mjs';

describe('FeedbackCollector', () => {
  let client;
  let sessionId;

  beforeAll(async () => {
    client = new MemoryClient();
    await client.connect();
    sessionId = await client.createSession('feedback-test');
  });
  afterAll(async () => { await client.disconnect(); });

  it('validateInput throws on satisfaction out of range', () => {
    const fc = new FeedbackCollector(client);
    expect(() => fc.validateInput({ satisfaction: 6, archAligned: true })).toThrow('satisfaction must be 1-5');
    expect(() => fc.validateInput({ satisfaction: 0, archAligned: true })).toThrow('satisfaction must be 1-5');
  });

  it('validateInput throws on non-boolean archAligned', () => {
    const fc = new FeedbackCollector(client);
    expect(() => fc.validateInput({ satisfaction: 3, archAligned: 'yes' })).toThrow('archAligned must be boolean');
  });

  it('validateInput accepts valid input', () => {
    const fc = new FeedbackCollector(client);
    expect(() => fc.validateInput({ satisfaction: 5, archAligned: false })).not.toThrow();
  });

  it('save stores and getFeedback retrieves', async () => {
    const fc = new FeedbackCollector(client);
    await fc.save(sessionId, { satisfaction: 4, archAligned: true, comment: '잘 동작함' });
    const fb = await client.getFeedback(sessionId);
    expect(fb).toHaveLength(1);
    expect(fb[0].satisfaction).toBe(4);
    expect(fb[0].arch_aligned).toBe(1); // MySQL TINYINT
    expect(fb[0].comment).toBe('잘 동작함');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run scripts/__tests__/collect-feedback.test.mjs
```
Expected: `FAIL` — `Cannot find module '../collect-feedback.mjs'`

- [ ] **Step 3: collect-feedback.mjs 구현**

```javascript
// scripts/collect-feedback.mjs
export class FeedbackCollector {
  #client;

  constructor(memoryClient) {
    this.#client = memoryClient;
  }

  validateInput({ satisfaction, archAligned }) {
    if (typeof satisfaction !== 'number' || satisfaction < 1 || satisfaction > 5) {
      throw new Error('satisfaction must be 1-5');
    }
    if (typeof archAligned !== 'boolean') {
      throw new Error('archAligned must be boolean');
    }
  }

  async save(sessionId, { satisfaction, archAligned, comment, ruleChangesRequested }) {
    this.validateInput({ satisfaction, archAligned });
    await this.#client.saveFeedback(sessionId, {
      satisfaction, archAligned, comment: comment ?? null, ruleChangesRequested: ruleChangesRequested ?? null,
    });
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createInterface } = await import('readline');
  const { MemoryClient } = await import('./memory-client.mjs');

  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node collect-feedback.mjs <session-id>');
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  const satStr    = await ask('만족도 (1-5): ');
  const archStr   = await ask('아키텍처가 의도에 맞았나요? (y/n): ');
  const comment   = await ask('코멘트 (없으면 Enter): ');
  const ruleReq   = await ask('수정 요청할 규칙 (없으면 Enter): ');
  rl.close();

  const client = new MemoryClient();
  await client.connect();
  const fc = new FeedbackCollector(client);
  await fc.save(sessionId, {
    satisfaction: parseInt(satStr, 10),
    archAligned: archStr.trim().toLowerCase() === 'y',
    comment: comment.trim() || null,
    ruleChangesRequested: ruleReq.trim() || null,
  });
  await client.disconnect();
  console.log('피드백 저장 완료');
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run scripts/__tests__/collect-feedback.test.mjs
```
Expected: `PASS` — 4 tests pass

- [ ] **Step 5: 커밋**

```bash
git add scripts/collect-feedback.mjs scripts/__tests__/collect-feedback.test.mjs
git commit -m "feat: add FeedbackCollector — post-task structured feedback with validation"
```

---

### Task 5: SKILL.md — DB 연동 체크리스트 + Retrospective 업데이트

**Files:**
- Modify: `skills/agent-architect-tdd-loop/SKILL.md`

- [ ] **Step 1: 실행 체크리스트 교체**

기존 내용:
```
- [ ] `docs/arch-decisions.md` 초기화
- [ ] `docs/loop-state.md` 초기화 (iteration: 1)
- [ ] `docs/meta-state.md` 초기화 (빈 테이블)
- [ ] Architect 실행 → Step 0 조사 → 설계 → META-CHECK
```

교체 내용:
```
- [ ] `npm run memory:up` — 기억의 궁전 MySQL 시작
- [ ] `node scripts/memory-client.mjs init "<태스크 설명>"` → SESSION_ID 기록
- [ ] `docs/arch-decisions.md` 초기화 (첫 줄에 `SESSION_ID: <값>` 포함)
- [ ] `docs/loop-state.md` 초기화 (SESSION_ID 포함, iteration: 1)
- [ ] `docs/meta-state.md` 초기화 (빈 테이블)
- [ ] Architect 실행 → Step 0 조사 → 설계 → META-CHECK
```

- [ ] **Step 2: Architect "현재 상태 읽기" 섹션에 항목 추가**

기존:
```
## 현재 상태 읽기 (필수)
1. docs/arch-decisions.md — 기술 선택·불변 제약 확인
2. docs/loop-state.md — iteration, status, last_test_result 확인
3. docs/meta-state.md — 자가수정 제안(MEDIUM/LOW) 확인 후 이번 루프에 반영
```

교체:
```
## 현재 상태 읽기 (필수)
1. docs/arch-decisions.md — 기술 선택·불변 제약 확인
2. docs/loop-state.md — SESSION_ID, iteration, status, last_test_result 확인
3. docs/meta-state.md — 자가수정 제안(MEDIUM/LOW) 확인 후 이번 루프에 반영
4. DB 진화된 규칙 조회 (선택 🟢 LOW):
   node scripts/memory-client.mjs similar "<태스크 키워드>"
   → 과거 유사 태스크 Bad Cases 및 진화된 규칙 참조
```

- [ ] **Step 3: Retrospective 프롬프트 끝에 "DB 저장" 섹션 추가**

기존 Retrospective 프롬프트의 `## 회고 보고서 출력` 앞에 삽입:

```
## DB 저장 및 세션 종료 (필수) 🟠 HIGH
1. loop-state.md에서 SESSION_ID 읽기
2. meta-state.md의 각 항목을 DB에 저장:
   각 Good/Bad/Violation/Improvement 행마다:
   node scripts/memory-client.mjs addcase <SESSION_ID> <JSON>
   예: node scripts/memory-client.mjs addcase $SID '{"iterationNumber":2,"caseType":"BAD","role":"IMPLEMENTER","level":"MEDIUM","content":"E2E 먼저 실행","impact":"원인 가려짐"}'
3. 세션 완료:
   node scripts/memory-client.mjs complete <SESSION_ID> <DONE|REDESIGN|FAIL>
4. 자가학습 실행:
   node scripts/meta-learner.mjs
5. 사용자에게 피드백 요청 (DONE 시만):
   node scripts/collect-feedback.mjs <SESSION_ID>
```

- [ ] **Step 4: memory-client.mjs에 addcase CLI 명령 추가**

`scripts/memory-client.mjs`의 switch 블록에 추가:
```javascript
    case 'addcase': {
      const [sid, jsonStr] = args;
      const data = JSON.parse(jsonStr);
      await client.addMetaCase(sid, data);
      console.log('Meta case saved');
      break;
    }
```

- [ ] **Step 5: 커밋**

```bash
git add skills/agent-architect-tdd-loop/SKILL.md scripts/memory-client.mjs
git commit -m "feat: update SKILL.md + memory-client CLI — DB-integrated agent workflow"
```

---

## Phase 3 — 자동화 탐지 & 불필요 제거

### Task 6: automation-detector.mjs

**Files:**
- Create: `scripts/automation-detector.mjs`
- Create: `scripts/__tests__/automation-detector.test.mjs`
- Create: `.github/workflows/monthly-automation-review.yml`

- [ ] **Step 1: 테스트 작성**

```javascript
// scripts/__tests__/automation-detector.test.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AutomationDetector } from '../automation-detector.mjs';
import { MemoryClient } from '../memory-client.mjs';

describe('AutomationDetector', () => {
  let client;
  let detector;

  beforeAll(async () => {
    client = new MemoryClient();
    await client.connect();
    detector = new AutomationDetector(client);

    // 4번 반복 BAD 패턴 삽입
    for (let i = 0; i < 4; i++) {
      const sid = await client.createSession('autodetect-test-' + i);
      await client.addMetaCase(sid, {
        iterationNumber: 1, caseType: 'BAD', role: 'ARCHITECT',
        content: 'research_done 확인 없이 설계 진행', impact: '잘못된 API 사용',
      });
    }
  });
  afterAll(async () => { await client.disconnect(); });

  it('detect returns patterns with cnt >= 3', async () => {
    const patterns = await detector.detect();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every(p => p.cnt >= 3)).toBe(true);
  });

  it('generateSuggestions returns array for non-empty patterns', async () => {
    const patterns = await detector.detect();
    const suggestions = await detector.generateSuggestions(patterns);
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('generateSuggestions returns [] for empty patterns', async () => {
    const suggestions = await detector.generateSuggestions([]);
    expect(suggestions).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run scripts/__tests__/automation-detector.test.mjs
```
Expected: `FAIL` — `Cannot find module '../automation-detector.mjs'`

- [ ] **Step 3: automation-detector.mjs 구현**

```javascript
// scripts/automation-detector.mjs
import Anthropic from '@anthropic-ai/sdk';

export class AutomationDetector {
  #client;
  #ai;

  constructor(memoryClient) {
    this.#client = memoryClient;
    this.#ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async detect() {
    return this.#client.getRepeatingPatterns(3);
  }

  async generateSuggestions(patterns) {
    if (patterns.length === 0) return [];

    const response = await this.#ai.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze repeated failure patterns from an AI agent loop and suggest ONE concrete automation per pattern.

## Repeated Bad Patterns (each ≥ 3 occurrences)
${patterns.map(p => `- [${p.role}] "${p.pattern}" (count: ${p.cnt})`).join('\n')}

Suggest a script, pre-check, or GitHub Action that would prevent each pattern.

Return JSON array only:
[{"pattern":"...","suggestion":"...","automation_type":"script|pre-check|github-action","priority":"HIGH|MEDIUM|LOW"}]`,
      }],
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { MemoryClient } = await import('./memory-client.mjs');
  const client = new MemoryClient();
  await client.connect();
  const detector = new AutomationDetector(client);

  const patterns = await detector.detect();
  if (patterns.length === 0) {
    console.log('반복 패턴 없음 — 자동화 제안 없음');
  } else {
    const suggestions = await detector.generateSuggestions(patterns);
    console.log('## 자동화 제안\n');
    suggestions.forEach(s => console.log(`[${s.priority}] ${s.automation_type}: ${s.suggestion}`));
  }

  await client.disconnect();
}
```

- [ ] **Step 4: 월간 워크플로우 생성**

```yaml
# .github/workflows/monthly-automation-review.yml
name: Monthly Automation Review

on:
  schedule:
    - cron: '0 0 1 * *'  # 매월 1일 09:00 KST
  workflow_dispatch:

jobs:
  automation-review:
    runs-on: ubuntu-latest
    services:
      memory-db:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: agent_memory
          MYSQL_USER: nova
          MYSQL_PASSWORD: nova_pass
          MYSQL_ROOT_PASSWORD: nova_root
        ports: ["3377:3306"]
        options: >-
          --health-cmd="mysqladmin ping -u nova --password=nova_pass -h localhost"
          --health-interval=5s
          --health-retries=12
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - name: Init schema
        run: mysql -h 127.0.0.1 -P 3377 -u nova --password=nova_pass agent_memory < docker/memory/init.sql
      - name: Run automation detector
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          MEMORY_DB_HOST: 127.0.0.1
          MEMORY_DB_PASSWORD: nova_pass
        run: node scripts/automation-detector.mjs
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run scripts/__tests__/automation-detector.test.mjs
```
Expected: `PASS` — 3 tests pass

- [ ] **Step 6: 커밋**

```bash
git add scripts/automation-detector.mjs scripts/__tests__/automation-detector.test.mjs .github/workflows/monthly-automation-review.yml
git commit -m "feat: add AutomationDetector + monthly workflow — repeated pattern → automation suggestion"
```

---

### Task 7: pruner.mjs (불필요 제거)

**Files:**
- Create: `scripts/pruner.mjs`
- Create: `scripts/__tests__/pruner.test.mjs`
- Create: `.github/workflows/monthly-pruning.yml`

- [ ] **Step 1: 테스트 작성**

```javascript
// scripts/__tests__/pruner.test.mjs
import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pruner } from '../pruner.mjs';

const SKILLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills');

describe('Pruner', () => {
  it('scanSkills returns array with name and updated fields', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const skills = await pruner.scanSkills();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills[0]).toHaveProperty('name');
    expect(skills[0]).toHaveProperty('updated');
    expect(skills[0]).toHaveProperty('created');
  });

  it('findStale returns only skills older than threshold', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const stale = await pruner.findStale(0); // 0일 → 전부 해당
    const skills = await pruner.scanSkills();
    expect(stale).toHaveLength(skills.length);
    expect(stale[0]).toHaveProperty('daysSince');
    expect(stale[0].daysSince).toBeGreaterThanOrEqual(0);
  });

  it('findStale returns empty for far-future threshold', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const stale = await pruner.findStale(99999);
    expect(stale).toHaveLength(0);
  });

  it('generateReport includes stale skill names', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const stale = await pruner.findStale(0);
    const report = pruner.generateReport(stale);
    expect(report).toContain('Pruning Report');
    if (stale.length > 0) {
      expect(report).toContain(stale[0].name);
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run scripts/__tests__/pruner.test.mjs
```
Expected: `FAIL` — `Cannot find module '../pruner.mjs'`

- [ ] **Step 3: pruner.mjs 구현**

```javascript
// scripts/pruner.mjs
import fs from 'fs';
import path from 'path';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) result[key.trim()] = rest.join(':').trim();
  }
  return result;
}

export class Pruner {
  #skillsDir;

  constructor(skillsDir) {
    this.#skillsDir = skillsDir;
  }

  async scanSkills() {
    return fs.readdirSync(this.#skillsDir)
      .filter(d => fs.existsSync(path.join(this.#skillsDir, d, 'SKILL.md')))
      .map(d => {
        const content = fs.readFileSync(path.join(this.#skillsDir, d, 'SKILL.md'), 'utf-8');
        const fm = parseFrontmatter(content);
        return {
          name: d,
          updated: fm.updated ?? '1970-01-01',
          created: fm.created ?? '1970-01-01',
        };
      });
  }

  async findStale(thresholdDays = 180) {
    const skills = await this.scanSkills();
    const now = new Date();
    return skills
      .map(s => ({
        ...s,
        daysSince: Math.floor((now - new Date(s.updated)) / 86_400_000),
      }))
      .filter(s => s.daysSince > thresholdDays)
      .sort((a, b) => b.daysSince - a.daysSince);
  }

  generateReport(stale) {
    const today = new Date().toISOString().slice(0, 10);
    if (stale.length === 0) {
      return `## Pruning Report — ${today}\n\nNo stale skills found (threshold met).`;
    }
    const lines = stale.map(s =>
      `- \`${s.name}\` — last updated ${s.updated} (${s.daysSince} days ago)`
    );
    return `## Pruning Report — ${today}\n\n${lines.join('\n')}\n\n**Action:** Review and update or remove these skills.`;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const skillsDir = process.argv[2] ?? './skills';
  const days = parseInt(process.argv[3] ?? '180', 10);
  const pruner = new Pruner(skillsDir);
  const stale = await pruner.findStale(days);
  const report = pruner.generateReport(stale);
  console.log(report);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
  }
}
```

- [ ] **Step 4: 월간 pruning 워크플로우 생성**

```yaml
# .github/workflows/monthly-pruning.yml
name: Monthly Skill Pruning Check

on:
  schedule:
    - cron: '0 2 1 * *'  # 매월 1일 11:00 KST
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  pruning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Run pruner
        run: node scripts/pruner.mjs ./skills 180
      - name: Create issue if stale skills found
        uses: actions/github-script@v7
        with:
          script: |
            const { execSync } = require('child_process');
            const output = execSync('node scripts/pruner.mjs ./skills 180').toString();
            if (!output.includes('No stale skills')) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Monthly Pruning: Stale skills — ${new Date().toISOString().slice(0,10)}`,
                body: output,
                labels: ['maintenance'],
              });
            }
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run scripts/__tests__/pruner.test.mjs
```
Expected: `PASS` — 4 tests pass

- [ ] **Step 6: 커밋**

```bash
git add scripts/pruner.mjs scripts/__tests__/pruner.test.mjs .github/workflows/monthly-pruning.yml
git commit -m "feat: add Pruner + monthly pruning workflow — stale skill detection and issue creation"
```

---

### Task 8: 전체 테스트 통과 확인 + 버전 업

**Files:**
- Modify: `package.json` (version: 2.3.0 최종 확인)
- Modify: `README.md` (v2.3.0 항목 추가)

- [ ] **Step 1: 전체 테스트 실행**

```bash
npx vitest run
```
Expected: `PASS` — 모든 테스트 통과 (memory-schema 5, memory-client 7, meta-learner 3, collect-feedback 4, automation-detector 3, pruner 4 = 26 tests)

- [ ] **Step 2: README v2.3.0 항목 추가**

README.md의 버전 히스토리 테이블 최상단에 추가:
```
| v2.3.0 | Nova-Agent 지능 강화 — MySQL 기억의 궁전(5개 테이블), MemoryClient, MetaLearner 자가학습, FeedbackCollector, AutomationDetector, Pruner. 월간 자동화 탐지·불필요 제거 워크플로우 추가 |
```

- [ ] **Step 3: 최종 커밋**

```bash
git add package.json README.md
git commit -m "chore: v2.3.0 — Nova-Agent 강화 완료 (기억의 궁전, 자가학습, 피드백, 자동화 탐지, Pruner)"
```

---

## 실행 전제 조건

1. Docker Desktop 실행 중
2. `ANTHROPIC_API_KEY` 환경 변수 설정
3. 로컬 포트 3377 사용 가능 (MySQL)
4. GitHub repo에 `ANTHROPIC_API_KEY` Secret 등록 (Actions용)
