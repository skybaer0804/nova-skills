---
name: agent-architect-tdd-loop
description: Use when implementing features that require architect-level design separation, TDD enforcement across multiple files, parallel sub-task execution, or loop-guarded iterative development where the same failure must not repeat more than 3 times.
---

# Agent Architect TDD Loop

## Overview

3-역할 에이전트 루프: **Architect (Opus 4.7) → Implementer(s) (Sonnet 4.6) → Tester** — 모든 구현은 TDD로 진행하고, 동일 이슈가 3회 연속 실패하면 Architect가 강제 재설계(REDESIGN)를 수행한다.

각 에이전트 프롬프트는 **자기완결(self-contained)** 로 작성한다 — 대화 히스토리가 아닌 파일에서 컨텍스트를 읽는다. 컨텍스트가 길어져도 역할과 아키텍처 결정이 보존된다.

## 역할 정의

| 역할 | 모델 파라미터 | 책임 |
|------|--------------|------|
| Architect | `model: "opus"` → claude-opus-4-7 | 설계, 테스트 계획, 결과 리뷰, arch-decisions 기록 |
| Implementer | `model: "sonnet"` → claude-sonnet-4-6 | 테스트 먼저 작성 (RED) → 최소 구현 (GREEN) |
| Tester | `model: "sonnet"` | 테스트 실행, 결과 보고 |

## 루프 흐름

```
[초기화] docs/loop-state.md + docs/arch-decisions.md 생성
  ↓
Architect — 사전 조사 (iteration = 1 또는 생소한 도메인)
  ├─ 1. WebSearch — 개요 파악
  ├─ 2. WebFetch  — 공식 문서 / 레퍼런스 탐색
  └─ 3. context7  — 최신 라이브러리 문서 확인
  ↓
Architect → 설계 + 테스트 계획 → arch-decisions.md + loop-state.md 업데이트
  ↓
Implementer(s) [독립 태스크는 병렬 실행]
  ├─ arch-decisions.md 읽기 (제약·기술 결정 확인)
  ├─ RED: 실패하는 테스트 작성 (구현 없이)
  └─ GREEN: 테스트를 통과시키는 최소 구현
  ↓
Tester → 테스트 실행 → PASS | FAIL | BLOCKED → loop-state.md 업데이트
  ↓
Architect → 결과 리뷰 (arch-decisions.md 참조)
  ├─ PASS → next_action: DONE
  ├─ FAIL + iteration < 3 → next_action: IMPLEMENT (루프 반복)
  └─ FAIL + iteration = 3 → next_action: REDESIGN (강제 재설계)
        └─ arch-decisions.md에 실패 이유 기록 후 새 접근 방식 결정
           issue_key에 _v2, iteration 리셋 → 루프 재시작
```

## 상태 파일 — 두 파일 시스템

### docs/loop-state.md (반복 추적)

루프마다 갱신. `issue_key`는 문제를 설명하는 안정적인 식별자:

```markdown
# Loop State

issue_key: auth-token-refresh
iteration: 2
status: FAIL                    # FAIL | PASS | REDESIGN
research_done: true
research_sources: |
  - context7: @tanstack/query v5 onError 제거됨 확인
test_types: [unit, integration]
last_test_result: |
  3 passed, 1 failed
  FAIL: TokenExpiredError not caught in refreshToken()
architect_decision: |
  refreshToken()에 TokenExpiredError catch 추가
next_action: IMPLEMENT          # IMPLEMENT | REDESIGN | DONE
```

### docs/arch-decisions.md (아키텍처 기억)

설계 교체 후에도 유지. Architect만 기록하고, Implementer·Tester는 읽기 전용:

```markdown
# Architecture Decisions

## 기술 선택 (변경 시 Architect 승인 필요)
- 인증: JWT + Refresh Token 전략
- DB: TypeORM + PostgreSQL
- 테스트: Vitest + Testing Library

## 불변 제약
- 외부 API 호출은 반드시 Service 계층에서만
- Controller는 DTO 변환과 라우팅만 담당

## 결정 로그
| iteration | 결정 | 이유 |
|-----------|------|------|
| 1 | refreshToken을 별도 Service로 분리 | Controller 비대화 방지 |
| 3→REDESIGN | 토큰 갱신 로직을 interceptor로 이동 | Service 간 순환 의존 발생으로 재설계 |
```

## 테스트 타입

| 타입 | 기본 포함 | 적용 기준 |
|------|-----------|-----------|
| Unit | **항상 필수** | 모든 구현 태스크 |
| Integration | Architect 판단 | 모듈 경계 또는 API 레이어 변경 시 |
| Regression | Architect 판단 | 버그 수정 또는 리팩토링 시 |
| E2E | Architect 판단 | 사용자 플로우 또는 크리티컬 패스 영향 시 |

실행 순서: **Unit → Integration → E2E** (이전 단계 통과 후 다음 실행)

## Architect 에이전트 실행

**핵심 원칙: 프롬프트에 역할 계약을 인라인으로 포함한다. 대화 히스토리에 의존하지 않는다.**

```
Agent(
  subagent_type="general-purpose",
  model="opus",
  prompt="""
══════════════════════════════════════════
ROLE CONTRACT — ARCHITECT (읽고 시작할 것)
══════════════════════════════════════════
당신은 ARCHITECT다. 이 계약은 대화 길이와 무관하게 항상 유효하다.

허용:  설계 작성 | 테스트 계획 수립 | 결과 리뷰 | arch-decisions.md 기록
금지:  구현 코드 작성 | 테스트 코드 작성 | 파일 직접 수정 (상태 파일 제외)

⛔ STOP — 아래 상황이 되면 즉시 멈추고 역할을 확인한다:
  - 코드 블록에 구현 코드를 작성하려는 경우
  - Implementer 없이 직접 태스크를 완료하려는 경우
══════════════════════════════════════════

## 현재 상태 읽기 (필수)
1. docs/arch-decisions.md 읽기 — 기존 기술 선택·불변 제약 확인
2. docs/loop-state.md 읽기 — 현재 iteration, status, last_test_result 확인

## Task
[구현할 기능 또는 수정 내용]

## Step 0: 사전 조사 (iteration = 1 또는 research_done = false인 경우)
생소하거나 불확실한 라이브러리·도메인이 있으면:
1. WebSearch — 핵심 개념 파악
2. WebFetch  — 공식 문서 탐색
3. context7  — resolve-library-id → query-docs로 최신 API 확인
완료 후 loop-state.md에 research_done: true, research_sources 기록.

## Step 1: 설계 또는 재설계
- iteration = 3 AND status = FAIL → REDESIGN:
  arch-decisions.md 결정 로그에 실패 이유 추가 후 근본적으로 다른 설계 작성
  issue_key에 _v2, iteration 1로 리셋
- 그 외 → 설계 + 테스트 계획:
  - 필요한 테스트 타입 명시 (unit 필수)
  - 독립 태스크 목록 + 병렬 실행 가능 여부
  - 정확한 테스트 케이스 명세 (Implementer 전달용)

## Step 2: 파일 업데이트
- arch-decisions.md — 새 기술 선택·불변 제약·결정 로그 항목 추가
- loop-state.md — architect_decision, next_action 업데이트

Output: 조사 요약 + 설계 문서 + 테스트 계획 + 업데이트된 두 파일
"""
)
```

## Implementer 에이전트 실행

독립 태스크는 한 번의 메시지에서 병렬로 실행한다:

```
# ✅ 병렬: 서로 다른 모듈, 공유 파일 없음
Agent(model="sonnet", prompt="""[task_A — ROLE CONTRACT 포함]""")
Agent(model="sonnet", prompt="""[task_B — ROLE CONTRACT 포함]""")

# ❌ 순서 필요: B가 A 결과에 의존 → A 완료 후 B 실행
```

**Implementer 프롬프트 템플릿:**

```
══════════════════════════════════════════
ROLE CONTRACT — IMPLEMENTER (읽고 시작할 것)
══════════════════════════════════════════
당신은 IMPLEMENTER다. 이 계약은 대화 길이와 무관하게 항상 유효하다.

허용:  테스트 코드 작성 | 구현 코드 작성 (테스트 통과용 최소한)
금지:  설계 변경 | 테스트 없이 구현 | arch-decisions.md 수정

⛔ STOP — 아래 상황이 되면 즉시 멈추고 역할을 확인한다:
  - 테스트 없이 구현 코드를 먼저 작성하려는 경우
  - Architect 계획에 없는 새로운 구조를 설계하려는 경우
  - 테스트가 과도하게 많아 "모든 경우를 커버"하려는 경우
══════════════════════════════════════════

## 아키텍처 제약 읽기 (필수)
docs/arch-decisions.md를 읽고 불변 제약과 기술 선택을 확인한다.
이 제약을 벗어나는 구현을 하려는 순간 STOP하고 Architect에게 보고한다.

## Architect 계획
[Architect 출력 붙여넣기]

## TDD 실행 순서 (예외 없음)
1. 실패하는 테스트 먼저 작성 — 구현 코드 없이
2. 테스트 실행 → 실패 확인 (아직 구현 없으므로 당연히 실패)
3. 테스트를 통과시키는 최소 구현 작성
4. 과도한 구현 금지 — 테스트가 요구하는 것만

Report: 작성한 테스트 목록, pass/fail 상태
```

## Tester 에이전트 실행

```
Agent(
  subagent_type="general-purpose",
  model="sonnet",
  prompt="""
══════════════════════════════════════════
ROLE CONTRACT — TESTER (읽고 시작할 것)
══════════════════════════════════════════
당신은 TESTER다. 이 계약은 대화 길이와 무관하게 항상 유효하다.

허용:  테스트 실행 | 결과 보고 | loop-state.md 업데이트
금지:  구현 코드 수정 | 설계 제안 | arch-decisions.md 수정

⛔ STOP — 아래 상황이 되면 즉시 멈추고 역할을 확인한다:
  - 테스트 통과를 위해 구현 코드를 수정하려는 경우
  - 실패 원인을 "추측"해서 코드를 고치려는 경우
══════════════════════════════════════════

## Implementer 보고
[Implementer 결과 보고 붙여넣기]

## 실행할 테스트 타입
docs/loop-state.md의 test_types 확인

## 실행 순서
1. Unit 테스트 먼저 (항상)
2. Integration → E2E는 unit 통과 후, loop-state에 명시된 경우만
3. 결과: passed N, failed M, 실패 메시지 정확히 기록
4. 판정: PASS | FAIL | BLOCKED (의존성 누락 시)
5. docs/loop-state.md의 status, last_test_result 업데이트

Output: 테스트 결과 요약
"""
)
```

## 실행 체크리스트

- [ ] `docs/arch-decisions.md` 초기화 (기술 선택, 불변 제약 초안)
- [ ] `docs/loop-state.md` 초기화 (issue_key, iteration: 1, research_done: false)
- [ ] Architect 실행 → Step 0 사전 조사 (필요 시) → 설계 + 두 파일 업데이트
- [ ] Implementer 실행 (arch-decisions.md 읽은 후 TDD, 독립 태스크 병렬)
- [ ] Tester 실행 → 결과 보고 + loop-state.md 업데이트
- [ ] Architect 리뷰 → next_action 결정
- [ ] DONE이 될 때까지 Implementer → Tester → Architect 반복
- [ ] iteration = 3 + FAIL → arch-decisions.md에 실패 기록 후 REDESIGN

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 프롬프트에 ROLE CONTRACT 생략 | 컨텍스트가 길어지면 역할 이탈 — 매 스폰마다 인라인으로 포함 |
| arch-decisions.md 없이 루프 시작 | Implementer가 아키텍처 제약을 모르고 잘못된 구현 생성 |
| REDESIGN 시 arch-decisions.md 초기화 | 실패 이유를 결정 로그에 남겨야 같은 실수 반복 방지 |
| 생소한 도메인에서 바로 설계 | Step 0 먼저 — WebSearch → WebFetch → context7 후 설계 |
| Implementer가 구현 먼저 작성 | TDD: 테스트 → 실패 확인 → 최소 구현 순서 고정 |
| 병렬 태스크가 같은 파일 수정 | 병렬화 전 공유 파일/전역 상태 여부 확인 |
| E2E를 Unit 전에 실행 | Unit → Integration → E2E 순서 준수 |
| Architect가 직접 코드 작성 | Architect는 설계·계획·리뷰만 — 구현은 Implementer |
| iteration 카운터를 세션마다 리셋 | loop-state.md 파일이 영구 기록 |
