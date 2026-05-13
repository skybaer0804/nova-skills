---
name: agent-architect-tdd-loop
description: Use when implementing features that require architect-level design separation, TDD enforcement across multiple files, parallel sub-task execution, or loop-guarded iterative development where the same failure must not repeat more than 3 times.
---

# Agent Architect TDD Loop

## Overview

3-역할 에이전트 루프: **Architect (Opus 4.7) → Implementer(s) (Sonnet 4.6) → Tester** — 모든 구현은 TDD로 진행하고, 동일 이슈가 3회 연속 실패하면 Architect가 강제 재설계(REDESIGN)를 수행한다.

## 역할 정의

| 역할 | 모델 파라미터 | 책임 |
|------|--------------|------|
| Architect | `model: "opus"` → claude-opus-4-7 | 설계, 테스트 계획 수립, 결과 리뷰 |
| Implementer | `model: "sonnet"` → claude-sonnet-4-6 | 테스트 먼저 작성 (RED) → 최소 구현 (GREEN) |
| Tester | `model: "sonnet"` | 테스트 실행, 결과 보고 |

## 루프 흐름

```
[초기화] docs/loop-state.md 생성 (iteration: 1)
  ↓
Architect — 사전 조사 (iteration = 1 또는 생소한 도메인)
  ├─ 1. WebSearch — 개요 파악
  ├─ 2. WebFetch  — 공식 문서 / 레퍼런스 구현 탐색
  └─ 3. context7  — 최신 라이브러리 문서 확인
  ↓
Architect → 설계 + 테스트 계획 + 상태 파일 업데이트
  ↓
Implementer(s) [독립 태스크는 병렬 실행]
  ├─ RED: 실패하는 테스트 작성 (구현 없이)
  └─ GREEN: 테스트를 통과시키는 최소 구현
  ↓
Tester → 테스트 실행 → PASS | FAIL | BLOCKED
  ↓
Architect → 결과 리뷰
  ├─ PASS → next_action: DONE
  ├─ FAIL + iteration < 3 → next_action: IMPLEMENT (루프 반복)
  └─ FAIL + iteration = 3 → next_action: REDESIGN (강제 재설계)
        └─ issue_key에 _v2 추가, iteration 리셋 → 루프 재시작
```

## 테스트 타입

Architect가 각 태스크에 적용할 테스트 타입을 결정한다:

| 타입 | 기본 포함 | 적용 기준 |
|------|-----------|-----------|
| Unit | **항상 필수** | 모든 구현 태스크 |
| Integration | Architect 판단 | 모듈 경계 또는 API 레이어 변경 시 |
| Regression | Architect 판단 | 버그 수정 또는 리팩토링 시 |
| E2E | Architect 판단 | 사용자 플로우 또는 크리티컬 패스 영향 시 |

실행 순서: **Unit → Integration → E2E** (이전 단계 통과 후 다음 단계 실행)

## 상태 파일 형식

루프마다 `docs/loop-state.md`에 기록. `issue_key`는 문제를 설명하는 안정적인 식별자 (해결책 아님):

```markdown
# Loop State

issue_key: auth-token-refresh          # 케밥케이스, 문제 설명
iteration: 2                            # 동일 issue_key 반복 횟수
status: FAIL                            # FAIL | PASS | REDESIGN
research_done: true                     # 사전 조사 완료 여부 (iteration=1에서 필수)
research_sources: |
  - MDN: fetch API error handling
  - context7: @tanstack/query v5 onError 제거됨 확인
test_types: [unit, integration]         # 이번 루프에 적용된 테스트 타입
last_test_result: |
  3 passed, 1 failed
  FAIL: TokenExpiredError not caught in refreshToken()
architect_decision: |
  refreshToken()에 TokenExpiredError catch 추가
  should throw RefreshFailedError when token is expired
next_action: IMPLEMENT                  # IMPLEMENT | REDESIGN | DONE
```

## Architect 에이전트 실행

```
Agent(
  subagent_type="general-purpose",
  model="opus",
  prompt="""
You are the Architect. Read docs/loop-state.md first.

## Task
[구현할 기능 또는 수정 내용]

## Instructions

### Step 0: 사전 조사 (iteration = 1 이거나 research_done = false인 경우 필수)
생소하거나 확실하지 않은 라이브러리·프로토콜·도메인이 포함되어 있으면:
1. WebSearch — 핵심 개념 및 최신 동향 파악
2. WebFetch  — 공식 문서 또는 레퍼런스 구현 탐색
3. context7  — resolve-library-id → query-docs 순서로 최신 API 문서 확인
   (버전 변경, deprecated API, 새 패턴 등 반드시 확인)
조사 완료 후 loop-state.md에 research_done: true, research_sources 기록.
이미 잘 아는 분야는 Step 0 생략 가능.

### Step 1: 설계 또는 재설계
- iteration = 3 AND status = FAIL → REDESIGN:
  이전 접근 방식 완전 폐기, 근본적으로 다른 설계 작성
  issue_key에 _v2 추가, iteration을 1로 리셋
- 그 외 → 설계 + 테스트 계획:
  - 필요한 테스트 타입 명시 (unit 필수, 나머지는 필요 시 추가)
  - 독립 태스크 목록 (병렬 실행 가능 여부 표시)
  - Implementer에게 전달할 정확한 테스트 케이스 명세

### Step 2: 상태 파일 업데이트
docs/loop-state.md 업데이트 (research_done, architect_decision, next_action)

Output: 조사 요약 + 설계 문서 + 테스트 계획 + 업데이트된 상태 파일
"""
)
```

## Implementer 에이전트 실행

독립 태스크는 한 번의 메시지에서 여러 Agent를 동시에 실행한다:

```python
# ✅ 병렬: 서로 다른 모듈, 공유 파일 없음
Agent(model="sonnet", prompt="""[task_A 내용]""")
Agent(model="sonnet", prompt="""[task_B 내용]""")
Agent(model="sonnet", prompt="""[task_C 내용]""")

# ❌ 순서 필요: B가 A 결과에 의존
# → A 완료 후 B 실행
```

Implementer 프롬프트 템플릿:

```
You are the Implementer. Strict TDD order — no exceptions.

## Architect's Plan
[Architect 출력 붙여넣기]

## TDD Steps
1. 실패하는 테스트 먼저 작성 — 구현 코드 없이
2. 테스트가 실패함을 논리적으로 확인 (아직 구현 없으므로 당연히 실패)
3. 테스트를 통과시키는 최소 구현 작성
4. 과도한 구현 금지 — 테스트가 요구하는 것만

Report: 작성한 테스트 목록, 각 테스트의 pass/fail 상태
```

## Tester 에이전트 실행

```
Agent(
  subagent_type="general-purpose",
  model="sonnet",
  prompt="""
You are the Tester.

## Implementer Report
[Implementer 결과 보고 붙여넣기]

## Test Types to Run
[docs/loop-state.md의 test_types 확인]

## Instructions
1. Unit 테스트 먼저 실행 (항상)
2. Integration → E2E 는 unit 통과 후, loop-state에 명시된 경우만
3. 결과: passed N, failed M, 실패 메시지 정확히 기록
4. 판정: PASS | FAIL | BLOCKED (의존성 누락 시)
5. docs/loop-state.md의 status, last_test_result 업데이트

Output: 테스트 결과 요약
"""
)
```

## 실행 체크리스트

- [ ] `docs/loop-state.md` 초기화 (issue_key 결정, iteration: 1, research_done: false)
- [ ] Architect 실행 → **Step 0 사전 조사** (생소 도메인 시 WebSearch → WebFetch → context7)
- [ ] Architect 실행 → 설계 + 테스트 계획
- [ ] Implementer 실행 (독립 태스크 병렬 실행 확인)
- [ ] Tester 실행 → 결과 보고
- [ ] Architect 리뷰 → next_action 결정
- [ ] DONE이 될 때까지 Implementer → Tester → Architect 반복
- [ ] iteration = 3 + FAIL 시 REDESIGN 실행

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 생소한 도메인에서 바로 설계 시작 | Step 0 먼저 — WebSearch → WebFetch → context7 순서로 조사 후 설계 |
| context7 없이 라이브러리 버전 가정 | resolve-library-id → query-docs로 최신 API 확인 (deprecated 패턴 방지) |
| Implementer가 구현 먼저 작성 | 엄격한 TDD: 테스트 → 실패 확인 → 최소 구현 순서 고정 |
| 병렬 태스크가 같은 파일 수정 | 병렬화 전 공유 파일/전역 상태 여부 확인 필수 |
| loop-state.md 없이 루프 시작 | 루프 시작 전 반드시 상태 파일 초기화 |
| E2E를 Unit 전에 실행 | Unit → Integration → E2E 순서 준수 |
| Architect가 직접 코드 작성 | Architect는 설계·계획·리뷰만 — 구현은 Implementer |
| iteration 카운터를 세션마다 리셋 | loop-state.md 파일이 카운터를 영구 기록 |
| 3회 실패 후 같은 접근 방식 재시도 | iteration = 3 + FAIL → 반드시 REDESIGN 실행 |
