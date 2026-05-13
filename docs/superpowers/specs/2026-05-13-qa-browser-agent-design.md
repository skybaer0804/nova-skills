# QA Browser Agent 설계 문서

**날짜:** 2026-05-13
**상태:** 승인됨
**버전:** 1.0.0

---

## Goal

localhost에서 실행 중인 Next.js/NestJS 앱을 대상으로, 사용자가 시나리오를 제공하면 에이전트가 Playwright MCP로 브라우저를 직접 제어하며 자율적으로 QA를 수행한다. 콘솔 에러, UI 이상, 네트워크 오류를 탐지하고 결과를 MySQL DB + 마크다운 리포트로 저장한다.

---

## Architecture

**3역할 에이전트 + Playwright MCP:**

```
사용자: URL + 시나리오
    ↓
QA Architect (Opus)
  → 시나리오 파싱, 단계 분해, 검증 기준 정의, qa-state.md 초기화
    ↓
QA Browser (Sonnet + Playwright MCP) — 단계별 반복
  → 클릭 전 요소 검증 → 액션 → 4중 검증 → 복구
  → 버그 발견 시 탐색 스택 push (depth ≤ 2)
    ↓
QA Reporter (Opus)
  → qa-reporter.mjs 실행 → DB 저장 + 마크다운
  → 사용자에게 deferred 처리 + 스크린샷 정리 질문
```

**Tech Stack:** Node.js ESM, Playwright MCP (`@playwright/mcp`), MySQL 8.0 (기존 기억의 궁전), Vitest

---

## File Structure

```
.claude/settings.local.json              ← Playwright MCP 등록 (gitignore)

skills/agent-qa-browser/
  SKILL.md                               ← QA 에이전트 스킬 (3역할 프롬프트 포함)

docker/memory/
  qa-schema.sql                          ← QA 전용 테이블 3개 (기존 init.sql에 추가)

scripts/
  qa-reporter.mjs                        ← 결과 저장 + 리포트 생성 + --clean
  __tests__/
    qa-reporter.test.mjs

docs/
  qa-state.md                            ← 세션 중 탐색 스택 (에이전트가 읽고 씀)
  qa-reports/                            ← 완료된 마크다운 리포트

tmp/
  qa-screenshots/                        ← 임시 스크린샷 (.gitignore)
```

---

## MCP 설정

```json
// .claude/settings.local.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

팀 공유 불필요 (local). 설정 방법은 README에 안내.

**사용되는 Playwright MCP 툴:**

| 툴 | 용도 |
|----|------|
| `browser_navigate` | URL 이동 |
| `browser_click` | 요소 클릭 |
| `browser_type` | 텍스트 입력 |
| `browser_screenshot` | 스크린샷 캡처 (에이전트 컨텍스트에 즉시 반환) |
| `browser_evaluate` | JS 실행 (요소 검증, URL 확인, clear 등) |
| `browser_console_messages` | 콘솔 로그 수집 |
| `browser_network_requests` | 네트워크 요청/응답 수집 |
| `browser_scroll` | 스크롤 (요소 viewport 진입) |
| `browser_hover` | 마우스 오버 |

---

## 에이전트 역할 정의

### QA Architect (Opus)

**책임:** 시나리오 파싱, 단계 분해, 검증 기준 정의, qa-state.md 초기화, 버그 심각도 최종 판단

**금지:** 브라우저 직접 조작, qa-state.md 임의 수정 (초기화만 허용)

**출력:** 각 단계에 아래 검증 기준 포함:
```yaml
- number: 1
  label: "로그인 페이지 이동"
  action: navigate
  target: "http://localhost:3000/login"
  verification:
    expected_url_change: true
    expected_dom: "input[type='email']"
    expected_network: null
    expected_console_clean: true
```

---

### QA Browser (Sonnet + Playwright MCP)

**책임:** 액션 실행, 4중 검증, 복구 프로토콜, 버그 탐색, qa-state.md 업데이트

**금지:** 스스로 시나리오 변경, depth > 2 자율 탐색, 스크린샷 삭제

#### 액션 실행 순서 🔴 CRITICAL

모든 액션에서 반드시 이 순서를 지킨다:

```
Phase 1 — 클릭 전 요소 검증 (browser_evaluate)
  { text, ariaLabel, visible, inViewport } 확인
  → 예상과 다르면: browser_scroll 후 재확인
  → 재확인도 다르면: STUCK

Phase 2 — BEFORE 스크린샷
  browser_screenshot() → tmp/qa-screenshots/step{N}-before.png
  qa-state.md screenshots 배열에 기록

Phase 3 — 액션 실행
  browser_click(selector) 또는 browser_type(selector, value)

Phase 4 — 4중 검증 🟠 HIGH
  ① browser_screenshot() → 전/후 시각적 비교 (에이전트 직접 판단)
  ② browser_evaluate(expected_dom) → 기대 요소 존재 여부
  ③ browser_evaluate(() => window.location.href) → URL 변화
  ④ browser_console_messages() + browser_network_requests()

Phase 5 — VERDICT
  PASS: 4개 중 3개 이상 통과
  FAIL: 복구 프로토콜 실행
```

#### 복구 프로토콜 🟠 HIGH

```
Level 1 — 경미 (retry_count < 2)
  입력 오류: browser_evaluate로 값 clear → 재입력
  클릭 오류: browser_evaluate(() => history.back()) → 재시도
  retry_count += 1

Level 2 — 중간 (retry_count == 2)
  browser_screenshot() → recovery-step{N}.png 저장
  browser_navigate(해당 단계 시작 URL) → 재시작
  retry_count = 0, recovery_history에 기록

Level 3 — 심각 (Level 2도 실패)
  qa-state.md status: STUCK
  STOP → QA Reporter에 인계
  사용자 알림: "{N}단계에서 복구 불가. 수동 확인 필요"
```

#### 버그 발견 시 탐색 규칙

```
exploration_stack에 push, depth 계산:
  depth ≤ 2 → 관련 콘솔/네트워크/DOM 추가 확인
  depth > 2 → deferred_bugs에 추가 후 stack pop (원래 단계 복귀)

버그마다 BUG_EVIDENCE 스크린샷 저장 (삭제 대상 아님)
```

---

### QA Reporter (Opus)

**책임:** 결과 정리, DB 저장, 마크다운 리포트, deferred/스크린샷 처리 질문

**금지:** 브라우저 조작, 버그 자의적 삭제, 스크린샷 자동 삭제

**절차:**
```
1. docs/qa-state.md 읽기
2. node scripts/qa-reporter.mjs <qa_session_id>
   → DB 저장 + docs/qa-reports/YYYY-MM-DD-<id_short>.md 생성
3. 요약 출력: 단계 결과 / 버그 목록 / deferred 목록
4. 사용자에게 질문:
   Q1. "deferred_bugs N개 있습니다. 지금 조사할까요?"
   Q2. "정상 단계 스크린샷(BEFORE/AFTER) N개 삭제할까요?"
      → 승인 시: node scripts/qa-reporter.mjs --clean <qa_session_id>
```

---

## 상태 파일: docs/qa-state.md

```yaml
qa_session_id: xxxx-xxxx-xxxx-xxxx
url: http://localhost:3000
scenario: "로그인 → 대시보드 → 저장"
status: IN_PROGRESS  # IN_PROGRESS | PASS | FAIL | STUCK | PARTIAL

steps:
  - number: 1
    label: "로그인 페이지 이동"
    status: PASS  # PASS | FAIL | STUCK | PENDING
    verification:
      expected_url_change: true
      expected_dom: "input[type='email']"
      expected_network: null
      expected_console_clean: true

current_step: 3

last_action:
  type: CLICK  # CLICK | TYPE | NAVIGATE
  selector: "#save-btn"
  verified_text: "저장"      # 클릭 전 확인한 텍스트
  verdict: FAIL
  verification:
    screenshot_diff: NO_CHANGE
    dom_check: FAIL
    url_check: SAME
    console_errors: 1
    network: "POST /api/save → 500"

exploration_stack:
  - type: SCENARIO_STEP    step: 3
  - type: BUG_INVESTIGATION  bug_id: bug-001  depth: 1

retry_count: 1
recovery_history:
  - step: 3  action: "history.back() 후 재시도"  result: FAIL

bugs_found:
  - id: bug-001
    type: NETWORK        # CONSOLE | UI | NETWORK | BEHAVIOR
    severity: CRITICAL   # CRITICAL | HIGH | MEDIUM | LOW
    step: 3
    description: "POST /api/save → 500, TypeError in console"

deferred_bugs:
  - id: bug-002  reason: "depth limit (3)"  description: "..."

screenshots:
  - file: step1-before.png  type: BEFORE   step: 1  kept: false
  - file: step1-after.png   type: AFTER    step: 1  kept: false
  - file: bug-001.png       type: BUG_EVIDENCE  bug_id: bug-001  kept: true
```

---

## DB 스키마: docker/memory/qa-schema.sql

```sql
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

---

## scripts/qa-reporter.mjs 설계

### 인터페이스

```
# 결과 저장 + 리포트 생성
node scripts/qa-reporter.mjs <qa_session_id>

# 정상 단계 스크린샷 정리 (BUG_EVIDENCE 보존)
node scripts/qa-reporter.mjs --clean <qa_session_id>
```

### 동작

**저장 모드:**
1. `docs/qa-state.md` 파싱
2. `qa_sessions` INSERT
3. `bugs_found` 배열 → `qa_bugs` INSERT (각각 UUID 생성)
4. `screenshots` 배열 → `qa_screenshots` INSERT
5. `docs/qa-reports/YYYY-MM-DD-{id_short}.md` 생성

**리포트 마크다운 구조:**
```markdown
# QA Report — 2026-05-13

**URL:** http://localhost:3000
**시나리오:** 로그인 → 대시보드 → 저장
**결과:** PARTIAL — 4/5 PASS, 1 FAIL

## 버그 목록

### 🔴 CRITICAL — POST /api/save → 500
- **단계:** 3 (저장 버튼 클릭)
- **콘솔:** TypeError: Cannot read properties of undefined
- **네트워크:** POST /api/save → 500 Internal Server Error
- **증거:** ![screenshot](../../tmp/qa-screenshots/bug-001.png)

## Deferred (미조사)
- [LOW] 저장 버튼 hover 색상 미적용 — depth limit 도달

## 재현 방법
1. http://localhost:3000/login 접속
2. 이메일 + 비밀번호 입력 후 로그인
3. 대시보드에서 저장 버튼 클릭
```

**--clean 모드:**
1. `qa_screenshots`에서 해당 세션의 BEFORE/AFTER 파일 조회
2. `fs.unlinkSync`로 파일 삭제
3. `deleted_at = NOW()` 업데이트

---

## 스크린샷 라이프사이클

| 타입 | 저장 시점 | 삭제 시점 |
|------|----------|----------|
| BEFORE | 액션 실행 전 | --clean 승인 시 |
| AFTER | PASS 단계 완료 후 | --clean 승인 시 |
| BUG_EVIDENCE | 버그 발견 시 | 사용자 명시적 삭제 명령 시만 |
| RECOVERY | Level 2 복구 시 | --clean 승인 시 |

**규칙:**
- 에이전트는 스크린샷을 절대 자동 삭제하지 않는다
- --clean은 QA Reporter가 사용자 승인 받은 후에만 실행
- BUG_EVIDENCE는 --clean 대상에서 제외

---

## 실행 체크리스트

```
- [ ] npm run memory:up — MySQL 시작
- [ ] .claude/settings.local.json Playwright MCP 등록 확인
      (npx @playwright/mcp@latest 설치 여부 확인)
- [ ] URL + 시나리오 준비
- [ ] QA Architect 실행 → qa-state.md 초기화 확인
- [ ] QA Browser 실행 → 시나리오 단계별 실행
      STUCK 발생 시: 에이전트 중단 → 사용자 수동 확인 후 재개
- [ ] 모든 단계 완료 or STUCK → QA Reporter 실행
- [ ] 마크다운 리포트 검토
- [ ] deferred_bugs 처리 여부 결정
- [ ] 스크린샷 정리 승인 → --clean 실행
```

---

## Common Mistakes

| 실수 | 레벨 | 수정 |
|------|------|------|
| 클릭 전 요소 검증 생략 | 🔴 CRITICAL | browser_evaluate로 text/visible 반드시 확인 후 클릭 |
| BEFORE 스크린샷 없이 액션 실행 | 🟠 HIGH | 전/후 비교 불가 — 항상 before 먼저 찍는다 |
| 4중 검증 중 일부만 실행 | 🟡 MEDIUM | 4개 모두 실행, 3개 이상 PASS여야 통과 |
| depth > 2 자율 탐색 | 🟠 HIGH | deferred에 기록 후 즉시 복귀 |
| BUG_EVIDENCE 스크린샷 자동 삭제 | 🔴 CRITICAL | 사용자 승인 전 절대 삭제 금지 |
| Level 3 도달 후 재시도 | 🔴 CRITICAL | 즉시 STUCK → 중단 → 사용자 알림 |
| qa-state.md 없이 QA Browser 실행 | 🟠 HIGH | Architect 먼저 실행해 초기화 필수 |

---

## 범위 외 (이번 설계에서 제외)

- CI/GitHub Actions 헤드리스 실행 (별도 설계)
- 배포된 URL 대상 QA (localhost 전용)
- 자동 회귀 테스트 스케줄링
- 다중 브라우저 동시 실행
