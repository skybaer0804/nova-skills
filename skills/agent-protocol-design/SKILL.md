---
name: agent-protocol-design
description: Use when starting to build an AI agent or adding agent capabilities — when deciding which combination of MCP, A2A, AG-UI, A2UI, UCP, or AP2 protocols to use based on what the agent does, who it communicates with, and where its output goes.
created: 2026-05-05
updated: 2026-05-05
---

# AI Agent Protocol Design

## Overview
프로토콜 조합을 코드 작성 전에 결정한다. 잘못된 프로토콜 선택은 아키텍처 전체를 다시 짜야 하는 비용을 낳는다.

**코드 작성 전에 이 스킬을 실행하라.**

## Layer 1: 에이전트가 무엇을 하는가?

```
외부 도구 / DB / API / 파일시스템을 호출한다?
  YES → MCP 필요  →  agent-mcp

다른 에이전트에게 서브태스크를 위임한다?
  YES → A2A 필요  →  agent-a2a

전자상거래 주문 / 카탈로그 탐색을 처리한다?
  YES → UCP 필요  →  agent-ucp

결제를 실행한다?
  YES → AP2 필요 (반드시 UCP와 함께)  →  agent-ap2

복수 해당 → Layer 3으로
```

## Layer 2: 출력이 어디로 가는가?

```
프론트엔드에 실시간 텍스트 / 툴콜 스트림이 필요한가?
  YES → AG-UI 필요  →  agent-ag-ui

프론트엔드에 카드 / 폼 / 버튼 같은 동적 UI가 필요한가?
  YES → A2UI 필요 (AG-UI와 함께)  →  agent-a2ui

백엔드끼리만 통신한다?
  → AG-UI / A2UI 불필요
```

## Layer 3: 대표 조합 패턴

| 시나리오 | 프로토콜 조합 |
|----------|-------------|
| 단일 도구 에이전트 | **MCP** |
| 멀티 에이전트 시스템 | **MCP + A2A** |
| 실시간 UI 에이전트 | **MCP + AG-UI** |
| 동적 UI 생성 에이전트 | **MCP + A2UI + AG-UI** |
| 상거래 에이전트 | **MCP + A2A + UCP + AP2** |
| 풀스택 에이전트 | **MCP + A2A + UCP + AP2 + A2UI + AG-UI** |

## 프로토콜 한 줄 요약

| 프로토콜 | 역할 | 스킬 |
|----------|------|------|
| MCP | 에이전트 ↔ 도구/DB/API | `agent-mcp` |
| A2A | 에이전트 ↔ 에이전트 | `agent-a2a` |
| AG-UI | 에이전트 → 프론트엔드 실시간 스트리밍 | `agent-ag-ui` |
| A2UI | 에이전트 → 동적 UI 컴포넌트 생성 | `agent-a2ui` |
| UCP | 에이전트 ↔ 전자상거래 트랜잭션 | `agent-ucp` |
| AP2 | 에이전트 결제 승인 + 감사 추적 | `agent-ap2` |

## 결정 체크리스트

- [ ] Layer 1: 에이전트 행동 분류 완료?
- [ ] Layer 2: 출력 대상 결정 완료?
- [ ] Layer 3: 조합 패턴 선택 완료?
- [ ] 각 프로토콜의 구현 스킬 확인 완료?

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 모든 프로토콜을 다 쓰려 함 | Layer 1-2 판단 후 필요한 것만 선택 |
| AP2 단독 사용 | AP2는 항상 UCP와 함께 사용 |
| AG-UI 없이 A2UI만 사용 | A2UI 컴포넌트 전달에 AG-UI 스트림이 필요 |
| MCP 없이 에이전트 시작 | 거의 모든 에이전트는 MCP를 기반으로 시작 |
| "SSE로 스트리밍"이라고만 생각함 | 프론트 스트리밍은 AG-UI 표준 이벤트를 사용 |
