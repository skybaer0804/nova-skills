# AI Agent Protocol Skills — 설계 문서

**날짜:** 2026-05-05  
**상태:** 승인됨  
**위치:** nova-skills (도메인 확장 — Next.js 프론트엔드 + AI 에이전트 프로토콜)

---

## 배경

Google ADK를 중심으로 6가지 AI 에이전트 프로토콜(MCP, A2A, AG-UI, A2UI, UCP, AP2)이 표준화되고 있다. 에이전트를 개발하거나 에이전트화할 때 어떤 프로토콜을 선택하고 어떻게 구현할지 결정하는 일이 반복적으로 발생한다. 이를 스킬로 체계화하여 에이전트가 직접 사용할 수 있도록 한다.

---

## 범위 결정

- nova-skills 도메인을 **Next.js 프론트엔드 + AI 에이전트 프로토콜**로 확장
- 코드 예시: **TypeScript + Python** 병행
- 엣지 케이스는 각 스킬 내 공식 docs 링크로 fallback

---

## 스킬 구조 — 7개

### 진입점 (결정 스킬)

| 스킬명 | 역할 |
|--------|------|
| `agent-protocol-design` | 레이어드 결정 트리로 필요한 프로토콜 조합 선택 |

### 구현 스킬 (6개)

| 스킬명 | 프로토콜 | 핵심 역할 |
|--------|----------|-----------|
| `agent-mcp` | MCP | 에이전트↔도구/데이터/DB 연결 |
| `agent-a2a` | A2A | 에이전트↔에이전트 통신 및 위임 |
| `agent-ag-ui` | AG-UI | 에이전트→프론트엔드 실시간 SSE 스트리밍 |
| `agent-a2ui` | A2UI | 에이전트가 동적 UI 컴포넌트 선언적 생성 |
| `agent-ucp` | UCP | 전자상거래 트랜잭션 표준화 (체크아웃, 주문) |
| `agent-ap2` | AP2 | 결제 승인 + IntentMandate/PaymentReceipt 감사 추적 |

---

## `agent-protocol-design` 결정 트리 상세

### Layer 1: 에이전트가 무엇을 하는가?

```
외부 도구 / DB / API 호출?          → MCP 필요
다른 에이전트에게 서브태스크 위임?   → A2A 필요
전자상거래 주문/결제 처리?           → UCP 필요 (결제 시 AP2도)
복수 해당                            → 조합 → Layer 3
```

### Layer 2: 출력이 어디로 가는가?

```
프론트엔드에 실시간 텍스트/툴콜 스트리밍?  → AG-UI 필요
프론트엔드에 UI 컴포넌트(카드/폼/버튼)?    → A2UI 필요
백엔드/에이전트끼리만?                     → AG-UI / A2UI 불필요
```

### Layer 3: 대표 조합 패턴

| 시나리오 | 프로토콜 조합 |
|---------|-------------|
| 단일 도구 에이전트 | MCP |
| 멀티 에이전트 시스템 | MCP + A2A |
| 상거래 에이전트 | MCP + A2A + UCP + AP2 |
| UI 생성 에이전트 | MCP + A2UI + AG-UI |
| 풀스택 에이전트 | MCP + A2A + UCP + AP2 + A2UI + AG-UI |

---

## 각 구현 스킬 공통 구조

모든 구현 스킬은 아래 섹션을 포함한다:

1. **When to use** — 트리거 조건 (증상, 상황)
2. **Core concepts** — 핵심 개념 3~5개 (용어 정의 포함)
3. **Minimal working example** — TypeScript + Python 각 1개 (최소 동작 코드)
4. **Protocol flow** — 데이터/메시지 흐름 다이어그램 또는 표
5. **Common mistakes** — 자주 틀리는 패턴과 수정 방법
6. **Official docs fallback** — 엣지 케이스 대비 공식 링크

---

## 공식 참조 링크

| 프로토콜 | 공식 문서 | SDK/샘플 |
|---------|----------|---------|
| MCP | https://modelcontextprotocol.io | - |
| A2A | https://a2a-protocol.org/ | https://github.com/a2aproject/a2a-samples |
| AG-UI | https://docs.ag-ui.com/ | https://dojo.ag-ui.com/ |
| A2UI | https://a2ui.org/ | https://github.com/google/A2UI/tree/main/samples |
| UCP | https://ucp.dev/ | https://github.com/Universal-Commerce-Protocol/samples |
| AP2 | https://ap2-protocol.org/ | https://github.com/google-agentic-commerce/AP2 |
| Google ADK | https://adk.dev/ | https://github.com/google/adk-samples |

---

## nova-skills CLAUDE.md 수정 필요 사항

`## What nova-skills Covers` 섹션에 아래 내용 추가:

> AI 에이전트 프로토콜 스킬도 포함 (MCP, A2A, AG-UI, A2UI, UCP, AP2).  
> 스킬 추가 전 확인 기준: "Next.js 프론트엔드 개발자 또는 AI 에이전트 개발자에게 도움이 되는가?"

---

## 구현 우선순위

1. `agent-protocol-design` (진입점 — 가장 먼저)
2. `agent-mcp` (가장 범용적, 모든 에이전트의 기반)
3. `agent-a2a` (멀티 에이전트 시스템의 핵심)
4. `agent-ag-ui` (Next.js 프론트엔드 연동 — 기존 nova-skills 사용자와 가장 연관)
5. `agent-a2ui` (동적 UI 생성)
6. `agent-ucp` (전자상거래 특화)
7. `agent-ap2` (결제 특화)
