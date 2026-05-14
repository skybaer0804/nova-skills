---
name: agent-qa-browser
description: Use when running QA against a localhost Next.js/NestJS app and the agent needs structured browser control, screenshot lifecycle, bug detection (console/UI/network), or DB-backed reporting — or when no Architect → Browser → Reporter handoff is in place.
created: 2026-05-14
updated: 2026-05-14
---

# QA Browser Agent

## Overview

3역할 에이전트 (Architect → Browser → Reporter)가 Playwright MCP로 브라우저를 직접 제어하며 시나리오 기반 QA를 수행한다. 버그를 탐지하고 MySQL DB + 마크다운 리포트로 저장한다.

## 사전 요구사항

```bash
npm run memory:up   # MySQL 3377 시작
# .claude/settings.local.json 에 Playwright MCP 등록 필수 (README 참고)
```

## 실행 방법

**1. QA Architect에게 전달:**
```
역할: QA Architect
URL: http://localhost:3000
시나리오: "로그인 → 대시보드 → 저장"
→ docs/qa-state.md를 초기화하라
```

**2. QA Browser에게 전달:**
```
역할: QA Browser
docs/qa-state.md를 읽고 시나리오를 실행하라
```

**3. QA Reporter에게 전달:**
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
