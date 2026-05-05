# AI Agent Protocol Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nova-skills에 7개 AI 에이전트 프로토콜 스킬(MCP, A2A, AG-UI, A2UI, UCP, AP2 + 결정 트리)을 추가한다.

**Architecture:** 결정 트리 스킬(`agent-protocol-design`)이 진입점이 되어 레이어드 질문으로 필요한 프로토콜 조합을 선택하고, 각 구현 스킬이 TypeScript+Python 최소 동작 예시를 제공한다. 모든 스킬은 nova-skills TDD 규칙(RED-GREEN-REFACTOR)을 따른다.

**Tech Stack:** Python(Google ADK, a2a-sdk, ag-ui-protocol, ucp-sdk, ap2), TypeScript(@modelcontextprotocol/sdk, @copilotkit/react-core, Next.js), Google ADK(gemini-2.0-flash)

---

## 파일 구조

| 파일 | 액션 |
|------|------|
| `CLAUDE.md` | Modify — 도메인 확장 (Next.js + AI 에이전트 프로토콜) |
| `README.md` | Modify — 7개 스킬 섹션 추가, 스킬 흐름 업데이트, 버전 v1.4.0→v1.5.0 |
| `skills/agent-protocol-design/SKILL.md` | Create |
| `skills/agent-mcp/SKILL.md` | Create |
| `skills/agent-a2a/SKILL.md` | Create |
| `skills/agent-ag-ui/SKILL.md` | Create |
| `skills/agent-a2ui/SKILL.md` | Create |
| `skills/agent-ucp/SKILL.md` | Create |
| `skills/agent-ap2/SKILL.md` | Create |

---

## Task 1: CLAUDE.md 도메인 확장

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md의 도메인 정의 섹션 수정**

`## What nova-skills Covers` 섹션을 아래로 교체:

```markdown
## What nova-skills Covers

Next.js frontend skills AND AI agent protocol skills. Before adding a skill, ask:

> "Would this help someone building a Next.js frontend OR implementing AI agent protocols (MCP, A2A, AG-UI, A2UI, UCP, AP2)?"

If no → belongs in superpowers or a separate plugin.
If yes → belongs here.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "chore: expand nova-skills domain to include AI agent protocols"
```

---

## Task 2: agent-protocol-design 스킬 작성

**Files:**
- Create: `skills/agent-protocol-design/SKILL.md`

- [ ] **Step 1: RED — 스킬 없이 베이스라인 실행**

아래 프롬프트로 서브에이전트 실행 (스킬 미사용). 에이전트가 프로토콜 선택을 어떻게 하는지 verbatim 기록:

```
You are an AI agent developer. WITHOUT using any skills, answer:

"다음 시스템을 구축해야 해:
- 에이전트가 PostgreSQL DB에서 재고 조회
- 다른 가격 에이전트에게 견적 요청
- React 프론트엔드에 결과를 실시간으로 스트리밍

어떤 프로토콜 조합을 쓸지, 왜 그런지 설명해줘."

Respond with your protocol recommendation and reasoning.
```

기대하는 실패 패턴:
- 프로토콜 선택 근거가 없거나 임의적
- 조합이 아닌 단일 프로토콜만 언급
- Layer 구분 없이 결론만 제시

- [ ] **Step 2: GREEN — 스킬 파일 작성**

`skills/agent-protocol-design/SKILL.md` 생성:

```markdown
---
name: agent-protocol-design
description: Use when starting to build an AI agent or adding agent capabilities — when deciding which combination of MCP, A2A, AG-UI, A2UI, UCP, or AP2 protocols to use based on what the agent does, who it communicates with, and where its output goes.
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
  YES → A2UI 필요  →  agent-a2ui

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
| AG-UI | 에이전트 → 프론트엔드 스트리밍 | `agent-ag-ui` |
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
```

- [ ] **Step 3: GREEN 검증 — 동일 시나리오를 스킬 포함해서 재실행**

스킬 내용을 포함한 프롬프트로 서브에이전트 재실행. 에이전트가 Layer 1→2→3 순서로 결정을 내리는지 확인.

- [ ] **Step 4: Commit**

```bash
git add skills/agent-protocol-design/SKILL.md
git commit -m "feat: add agent-protocol-design skill (layered protocol selection)"
```

---

## Task 3: agent-mcp 스킬 작성

**Files:**
- Create: `skills/agent-mcp/SKILL.md`

- [ ] **Step 1: RED — 베이스라인 실행**

```
You are a developer. WITHOUT any skills, show me:

"에이전트에서 PostgreSQL DB를 MCP로 연결하고 싶어.
TypeScript와 Python 각각 최소 동작 코드 보여줘."

Show complete, runnable code.
```

기대하는 실패 패턴:
- transport 타입(stdio vs HTTP SSE) 구분 없이 코드 작성
- staleTime/에러 처리 없음
- Server vs Client 역할 혼동

- [ ] **Step 2: GREEN — 스킬 파일 작성**

`skills/agent-mcp/SKILL.md` 생성:

```markdown
---
name: agent-mcp
description: Use when an AI agent needs to connect to external tools, databases, APIs, or file systems — when implementing tool use with a standard interface, when replacing custom integration code, or when an existing MCP server ecosystem is available.
---

# Agent MCP (Model Context Protocol)

## Overview
MCP는 AI 에이전트와 외부 시스템을 연결하는 USB-C 같은 표준 인터페이스다. 매번 맞춤형 통합 코드를 작성하는 대신 단일 프로토콜로 수백 개의 도구와 연결한다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 MCP가 필요한지 확인하라.**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **Host** | MCP를 초기화하고 클라이언트를 관리하는 앱 (Claude, 에이전트) |
| **Client** | 서버와 1:1 연결을 유지하는 Host 내부 컴포넌트 |
| **Server** | 도구(Tools), 리소스(Resources), 프롬프트를 노출하는 서비스 |
| **Transport** | 통신 방식 — `stdio`(로컬 프로세스) 또는 `HTTP+SSE`(원격) |

```
Host (에이전트)
  └── Client ──[stdio or HTTP/SSE]──> Server (DB, API, 파일 등)
                                        ├── Tools      (함수 호출)
                                        ├── Resources  (데이터 읽기)
                                        └── Prompts    (프롬프트 템플릿)
```

## TypeScript — MCP Client (stdio)

```typescript
// npm install @modelcontextprotocol/sdk
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL!],
})

const client = new Client({ name: 'my-agent', version: '1.0.0' }, {
  capabilities: { tools: {} },
})

await client.connect(transport)

// 도구 목록 확인
const { tools } = await client.listTools()
console.log(tools.map(t => t.name))

// 도구 호출
const result = await client.callTool({
  name: 'query',
  arguments: { sql: 'SELECT * FROM inventory WHERE item = $1', params: ['salmon'] },
})

await client.close()
```

## Python — MCP with Google ADK

```python
# pip install google-adk
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset, StdioConnectionParams, ServerParameters

# stdio transport: 로컬 MCP 서버 실행
db_tools = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=ServerParameters(
            command="uvx",
            args=["mcp-server-postgres", "--connection-string", "postgresql://localhost/mydb"],
        )
    )
)

agent = Agent(
    model="gemini-2.0-flash",
    name="inventory_agent",
    instruction="Check inventory using the database tools.",
    tools=[db_tools],
)

# 실행
from google.adk.runners import Runner
runner = Runner(agent=agent, app_name="inventory", session_service=...)
```

## Transport 선택

| 상황 | Transport |
|------|-----------|
| 같은 머신의 로컬 프로세스 | `stdio` |
| 원격 서버 / 클라우드 | `HTTP + SSE` (`StreamableHTTPClientTransport`) |
| 브라우저 환경 | `HTTP + SSE` only (stdio 불가) |

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 브라우저에서 stdio transport 사용 | HTTP+SSE transport로 교체 |
| `client.connect()` 전에 tool 호출 | 반드시 connect 후 호출 |
| 서버 종료 없이 프로세스 종료 | `await client.close()` 필수 |
| 하나의 Client로 여러 서버 연결 | 서버당 Client 인스턴스 1개 |

## Official Docs
엣지 케이스: https://modelcontextprotocol.io
서버 목록: https://github.com/modelcontextprotocol/servers
```

- [ ] **Step 3: GREEN 검증 실행 및 REFACTOR**

스킬 포함 재실행. transport 구분, connect/close 패턴 준수 확인.

- [ ] **Step 4: Commit**

```bash
git add skills/agent-mcp/SKILL.md
git commit -m "feat: add agent-mcp skill (MCP client TypeScript + Python ADK)"
```

---

## Task 4: agent-a2a 스킬 작성

**Files:**
- Create: `skills/agent-a2a/SKILL.md`

- [ ] **Step 1: RED — 베이스라인 실행**

```
You are a developer. WITHOUT any skills, show me:

"에이전트 A가 에이전트 B(가격 조회)에게 요청을 보내야 해.
에이전트 B는 별도 서버에서 실행 중이야.
A2A 프로토콜로 연결하는 TypeScript/Python 코드 보여줘."
```

기대 실패 패턴:
- AgentCard 개념 없이 하드코딩된 HTTP 호출
- /.well-known/agent-card.json 엔드포인트 없음
- 에이전트 발견(discovery) 없이 직접 호출

- [ ] **Step 2: GREEN — 스킬 파일 작성**

`skills/agent-a2a/SKILL.md` 생성:

```markdown
---
name: agent-a2a
description: Use when an AI agent needs to delegate tasks to another agent, discover remote agents at runtime, or build a multi-agent system where agents from different frameworks or vendors need to interoperate.
---

# Agent A2A (Agent-to-Agent Protocol)

## Overview
A2A는 서로 다른 프레임워크/벤더로 만들어진 에이전트들이 내부 구현을 노출하지 않고 통신할 수 있는 Linux Foundation 표준이다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 A2A가 필요한지 확인하라.**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **AgentCard** | 에이전트의 능력/엔드포인트를 선언하는 JSON (`/.well-known/agent-card.json`) |
| **Task** | 에이전트 간 작업 단위 — 상태: submitted → working → completed/failed |
| **Message** | Task 안의 개별 메시지 (텍스트, 파일, 데이터) |
| **Artifact** | Task 완료 후 생성된 결과물 |

```
Client Agent                    Server Agent
     │                               │
     │  GET /.well-known/agent-card  │  ← 에이전트 발견
     │◄──────────────────────────────│
     │                               │
     │  POST /tasks (send message)   │  ← 작업 요청
     │──────────────────────────────►│
     │                               │
     │  GET /tasks/{id}              │  ← 상태 폴링 또는 SSE 구독
     │◄──────────────────────────────│
```

## Python — A2A Server (Google ADK)

```python
# pip install google-adk a2a-sdk
from google.adk.agents import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
import uvicorn

pricing_agent = Agent(
    model="gemini-2.0-flash",
    name="pricing_agent",
    instruction="Return current wholesale prices for requested items.",
)

# ADK 에이전트를 A2A 서버로 노출
app = to_a2a(pricing_agent, port=8001)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
    # AgentCard 자동 생성: http://localhost:8001/.well-known/agent-card.json
```

## Python — A2A Client

```python
from a2a.client import A2AClient
from a2a.types import SendMessageRequest, MessageSendParams
import asyncio

async def ask_pricing_agent(item: str) -> str:
    async with A2AClient.get_client("http://pricing-agent:8001") as client:
        # AgentCard 자동 조회
        card = await client.get_agent_card()
        print(f"Connected to: {card.name}")

        request = SendMessageRequest(
            params=MessageSendParams(
                message={
                    "role": "user",
                    "parts": [{"kind": "text", "text": f"What is the price of {item}?"}],
                }
            )
        )
        response = await client.send_message(request)
        return response.result.parts[0].text

asyncio.run(ask_pricing_agent("salmon"))
```

## TypeScript — A2A Client (Next.js API Route)

```typescript
// app/api/price/route.ts
// npm install @a2a-protocol/client
import { A2AClient } from '@a2a-protocol/client'

export async function POST(req: Request) {
  const { item } = await req.json()

  const client = new A2AClient('http://pricing-agent:8001')
  const card = await client.getAgentCard()

  const task = await client.sendMessage({
    message: { role: 'user', parts: [{ type: 'text', text: `Price of ${item}?` }] },
  })

  return Response.json({ price: task.artifacts[0].parts[0].text })
}
```

## AgentCard 구조

에이전트 서버는 반드시 `/.well-known/agent-card.json`을 제공해야 한다:

```json
{
  "name": "Pricing Agent",
  "description": "Returns wholesale prices",
  "url": "http://pricing-agent:8001",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "get_price",
      "name": "Get Price",
      "description": "Returns current price for an item"
    }
  ]
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `/.well-known/agent-card.json` 미구현 | to_a2a() 사용 시 자동 생성됨 |
| 에이전트 URL 하드코딩 | AgentCard URL로 동적 발견 |
| 동기 클라이언트로 스트리밍 응답 처리 | async/SSE 클라이언트 사용 |
| 다른 에이전트 내부 구현 직접 호출 | A2A 프로토콜 통해서만 통신 |

## Official Docs
엣지 케이스: https://a2a-protocol.org/
샘플: https://github.com/a2aproject/a2a-samples
```

- [ ] **Step 3: GREEN 검증 및 REFACTOR**

스킬 포함 재실행. AgentCard 발견 패턴, to_a2a() 사용 확인.

- [ ] **Step 4: Commit**

```bash
git add skills/agent-a2a/SKILL.md
git commit -m "feat: add agent-a2a skill (AgentCard discovery, client/server patterns)"
```

---

## Task 5: agent-ag-ui 스킬 작성

**Files:**
- Create: `skills/agent-ag-ui/SKILL.md`

- [ ] **Step 1: RED — 베이스라인 실행**

```
You are a Next.js developer. WITHOUT any skills, show me:

"AI 에이전트가 처리하는 동안 프론트엔드에서 실시간으로
텍스트가 스트리밍되고, 툴 호출 결과도 보여야 해.
Next.js + Python 에이전트 조합으로 구현 방법 보여줘."
```

기대 실패 패턴:
- custom WebSocket 구현 (AG-UI 표준 미사용)
- 이벤트 타입 정의 없이 자유 형식 JSON
- 프론트엔드 프레임워크별 custom wiring

- [ ] **Step 2: GREEN — 스킬 파일 작성**

`skills/agent-ag-ui/SKILL.md` 생성:

```markdown
---
name: agent-ag-ui
description: Use when a frontend application needs to receive real-time streaming output from an AI agent — when implementing live token streaming, tool call visibility, human-in-the-loop interrupts, or connecting a Next.js/React app to an agent backend without custom WebSocket wiring.
---

# Agent AG-UI (Agent-User Interaction Protocol)

## Overview
AG-UI는 에이전트 백엔드와 프론트엔드를 연결하는 표준 이벤트 스트림 프로토콜이다. HTTP/WebSocket 위에서 타입화된 SSE 이벤트를 정의하여 어떤 에이전트 프레임워크를 써도 동일한 프론트엔드 코드로 연결된다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 AG-UI가 필요한지 확인하라.**

## 표준 이벤트 타입

| 이벤트 | 의미 |
|--------|------|
| `RUN_STARTED` | 에이전트 실행 시작 |
| `TEXT_MESSAGE_CONTENT` | 텍스트 델타 (스트리밍 토큰) |
| `TOOL_CALL_START` | 툴 호출 시작 |
| `TOOL_CALL_RESULT` | 툴 호출 결과 |
| `TOOL_CALL_END` | 툴 호출 완료 |
| `STATE_SNAPSHOT` | 전체 상태 동기화 |
| `STATE_DELTA` | 상태 부분 업데이트 |
| `RUN_FINISHED` | 에이전트 실행 완료 |
| `RUN_ERROR` | 에러 발생 |

## Python — AG-UI Backend (Google ADK + FastAPI)

```python
# pip install google-adk ag-ui-protocol
from google.adk.agents import Agent
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI

kitchen_agent = Agent(
    model="gemini-2.0-flash",
    name="kitchen_manager",
    instruction="Help manage kitchen inventory and orders.",
    tools=[...],  # MCP tools
)

# ADK 에이전트를 AG-UI 스트리밍 엔드포인트로 래핑
ag_ui_agent = ADKAgent(
    adk_agent=kitchen_agent,
    app_name="kitchen",
    user_id="chef",
)

app = FastAPI()
add_adk_fastapi_endpoint(app, ag_ui_agent, path="/agent")

# 실행: uvicorn main:app --port 8000
# AG-UI 스트림: POST http://localhost:8000/agent
```

## TypeScript — AG-UI Frontend (Next.js + CopilotKit)

```typescript
// npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime

// app/layout.tsx
import { CopilotKit } from '@copilotkit/react-core'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  )
}

// app/api/copilotkit/route.ts  (AG-UI 백엔드로 프록시)
import { CopilotRuntime, RemoteChain } from '@copilotkit/runtime'
import { NextRequest } from 'next/server'

const runtime = new CopilotRuntime({
  remoteEndpoints: [
    { url: 'http://localhost:8000/agent' },  // Python AG-UI 서버
  ],
})

export async function POST(req: NextRequest) {
  const { handleRequest } = await runtime.response(req)
  return handleRequest()
}

// app/page.tsx
import { CopilotChat } from '@copilotkit/react-ui'
import '@copilotkit/react-ui/styles.css'

export default function Page() {
  return <CopilotChat className="h-screen" />
}
```

## TypeScript — 직접 SSE 소비 (CopilotKit 없이)

```typescript
// AG-UI 이벤트를 직접 파싱하는 경우
async function* streamAgentEvents(message: string) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6))
        yield event  // { type: 'TEXT_MESSAGE_CONTENT', delta: '...' }
      }
    }
  }
}

// 사용 예시
for await (const event of streamAgentEvents('재고 확인해줘')) {
  if (event.type === 'TEXT_MESSAGE_CONTENT') {
    process.stdout.write(event.delta)
  }
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| AG-UI 없이 custom WebSocket 구현 | AG-UI 표준 이벤트 사용으로 프레임워크 독립성 확보 |
| `RUN_ERROR` 이벤트 미처리 | 모든 이벤트 타입 핸들러 구현 필수 |
| 동기 fetch로 스트리밍 처리 | SSE reader 또는 AG-UI SDK 사용 |
| A2UI 없이 AG-UI만 사용 | UI 컴포넌트 생성은 A2UI, 스트리밍 전달은 AG-UI |

## Official Docs
엣지 케이스: https://docs.ag-ui.com/
데모: https://dojo.ag-ui.com/
CopilotKit: https://www.copilotkit.ai/
```

- [ ] **Step 3: GREEN 검증 및 REFACTOR**

스킬 포함 재실행. 이벤트 타입 처리, CopilotKit 패턴 확인.

- [ ] **Step 4: Commit**

```bash
git add skills/agent-ag-ui/SKILL.md
git commit -m "feat: add agent-ag-ui skill (SSE streaming, CopilotKit + direct SSE)"
```

---

## Task 6: agent-a2ui 스킬 작성

**Files:**
- Create: `skills/agent-a2ui/SKILL.md`

- [ ] **Step 1: RED — 베이스라인 실행**

```
You are a developer. WITHOUT any skills, show me:

"에이전트가 텍스트 응답 대신 카드, 버튼, 폼 같은
UI 컴포넌트를 동적으로 생성해서 프론트엔드에 보내야 해.
어떻게 구현해?"
```

기대 실패 패턴:
- HTML 문자열 직접 생성 (보안 취약)
- 자유 형식 JSON으로 UI 정의
- 구조(컴포넌트 트리)와 데이터를 분리하지 않음

- [ ] **Step 2: GREEN — 스킬 파일 작성**

`skills/agent-a2ui/SKILL.md` 생성:

```markdown
---
name: agent-a2ui
description: Use when an AI agent needs to generate structured UI components for a frontend — when the agent should produce interactive cards, forms, or dashboards instead of plain text, using 18 safe declarative component primitives sent as JSON.
---

# Agent A2UI (Agent-to-User Interface Protocol)

## Overview
A2UI는 에이전트가 18개의 안전한 컴포넌트 프리미티브(Card, Text, Button, TextField 등)로 UI를 선언적 JSON으로 정의하는 프로토콜이다. 구조(컴포넌트 트리)와 데이터를 분리하여 데이터만 바꿔도 컴포넌트 재전송 없이 UI가 업데이트된다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 A2UI가 필요한지 확인하라.**
**A2UI 메시지는 AG-UI 스트림을 통해 프론트엔드에 전달된다.**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **Surface** | UI가 렌더링될 독립적인 영역 (`surfaceId`로 식별) |
| **Component** | 18개 프리미티브 중 하나 (Card, Column, Text, Button 등) |
| **DataModel** | 컴포넌트가 참조하는 데이터 (`{"path": "price"}` 형태) |
| **Flat List** | 컴포넌트 트리는 중첩 없이 ID 참조로 구성 |

## 18가지 컴포넌트 프리미티브

`Card, Column, Row, Text, Button, TextField, CheckBox, RadioButton, Select, Image, Divider, Spacer, Badge, ProgressBar, Chip, Link, Icon, List`

## Python — A2UI 메시지 생성 (ADK)

```python
# 에이전트가 반환하는 A2UI 메시지 시퀀스
a2ui_messages = [
    # 1. 렌더링 표면 생성
    {"beginRendering": {"surfaceId": "product-card", "root": "card"}},

    # 2. 컴포넌트 트리 전송 (플랫 리스트 — 중첩 아님)
    {"surfaceUpdate": {
        "surfaceId": "product-card",
        "components": [
            {"id": "card",  "component": {"Card": {"child": "col"}}},
            {"id": "col",   "component": {"Column": {"children": {"explicitList": ["title", "price", "btn"]}}}},
            {"id": "title", "component": {"Text": {"usageHint": "h3", "text": {"path": "name"}}}},
            {"id": "price", "component": {"Text": {"text": {"path": "price"}}}},
            {"id": "btn",   "component": {"Button": {
                "child": "btn-label",
                "action": {"name": "add_to_cart", "context": [{"key": "id", "value": {"path": "item_id"}}]}
            }}},
            {"id": "btn-label", "component": {"Text": {"text": {"literal": "장바구니 담기"}}}},
        ]
    }},

    # 3. 데이터 전송 (컴포넌트 재전송 없이 데이터만 교체 가능)
    {"dataModelUpdate": {
        "surfaceId": "product-card",
        "contents": [
            {"key": "name",    "valueString": "Fresh Atlantic Salmon"},
            {"key": "price",   "valueString": "$24.00/lb"},
            {"key": "item_id", "valueString": "salmon-001"},
        ]
    }},
]

# 데이터만 업데이트 (컴포넌트 트리 유지)
data_update_only = {
    "dataModelUpdate": {
        "surfaceId": "product-card",
        "contents": [
            {"key": "name",  "valueString": "Pacific Tuna"},
            {"key": "price", "valueString": "$18.00/lb"},
        ]
    }
}
```

## TypeScript — A2UI 렌더러 (Next.js)

```typescript
// A2UI 메시지를 수신해서 React 컴포넌트로 렌더링
// AG-UI 스트림의 커스텀 이벤트로 전달됨

interface A2UIComponent {
  id: string
  component: Record<string, unknown>
}

interface A2UISurface {
  components: Record<string, A2UIComponent>
  data: Record<string, string>
  rootId: string
}

function renderA2UIComponent(
  id: string,
  surface: A2UISurface
): React.ReactNode {
  const comp = surface.components[id]
  if (!comp) return null

  const resolve = (val: { path?: string; literal?: string }) =>
    val.path ? surface.data[val.path] : val.literal ?? ''

  if ('Card' in comp.component) {
    return (
      <div className="rounded-lg border p-4" key={id}>
        {renderA2UIComponent((comp.component.Card as any).child, surface)}
      </div>
    )
  }
  if ('Text' in comp.component) {
    const text = comp.component.Text as any
    return <span key={id}>{resolve(text.text)}</span>
  }
  if ('Button' in comp.component) {
    const btn = comp.component.Button as any
    return (
      <button
        key={id}
        onClick={() => handleAction(btn.action)}
        className="mt-2 rounded bg-blue-600 px-4 py-2 text-white"
      >
        {renderA2UIComponent(btn.child, surface)}
      </button>
    )
  }
  return null
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 컴포넌트 트리를 중첩 JSON으로 작성 | ID 참조 플랫 리스트로 작성 |
| 데이터 변경 시 컴포넌트 트리 재전송 | `dataModelUpdate`만 전송 |
| HTML 직접 생성 | 18개 프리미티브만 사용 (XSS 방지) |
| AG-UI 없이 A2UI 단독 사용 | A2UI 메시지는 AG-UI 스트림으로 전달됨 |

## Official Docs
엣지 케이스: https://a2ui.org/
샘플: https://github.com/google/A2UI/tree/main/samples
위젯 빌더: https://a2ui-composer.ag-ui.com/
```

- [ ] **Step 3: GREEN 검증 및 REFACTOR**

- [ ] **Step 4: Commit**

```bash
git add skills/agent-a2ui/SKILL.md
git commit -m "feat: add agent-a2ui skill (declarative UI components, flat list pattern)"
```

---

## Task 7: agent-ucp 스킬 작성

**Files:**
- Create: `skills/agent-ucp/SKILL.md`

- [ ] **Step 1: RED — 베이스라인 실행**

```
You are a developer. WITHOUT any skills, show me:

"에이전트가 공급업체 API에서 상품을 주문해야 해.
각 공급업체마다 다른 API 형식을 쓰는 게 문제야.
UCP로 표준화된 주문 코드 보여줘."
```

- [ ] **Step 2: GREEN — 스킬 파일 작성**

`skills/agent-ucp/SKILL.md` 생성:

```markdown
---
name: agent-ucp
description: Use when an AI agent needs to perform e-commerce transactions across vendors — when building agents that browse catalogs, create checkout sessions, or place orders using a standardized protocol regardless of the vendor's specific API.
---

# Agent UCP (Universal Commerce Protocol)

## Overview
UCP는 전자상거래 수명주기(탐색 → 체크아웃 → 주문)를 모듈식 표준으로 정의한다. REST, MCP, A2A 등 어떤 전송 방식을 써도 동일한 스키마로 거래가 가능하다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 UCP가 필요한지 확인하라.**
**결제가 필요하면 `agent-ap2`를 함께 사용하라.**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **Discovery Profile** | `/.well-known/ucp` — 공급업체가 지원하는 기능 선언 |
| **CheckoutSession** | 주문의 단위 — 라인 아이템, 통화, 배송 정보 포함 |
| **LineItem** | 주문 내 개별 상품 (ID, 수량) |
| **Idempotency-Key** | 중복 주문 방지용 UUID 헤더 |

## Python — UCP 체크아웃

```python
# pip install ucp-sdk httpx
import httpx
import uuid
from ucp_sdk.models.discovery.profile_schema import UcpDiscoveryProfile
from ucp_sdk.models.schemas.shopping.checkout_create_req import CheckoutCreateRequest
from ucp_sdk.models.schemas.shopping.types.line_item_create_req import LineItemCreateRequest
from ucp_sdk.models.schemas.shopping.types.item_create_req import ItemCreateRequest

async def place_order(vendor_url: str, item_id: str, quantity: int):
    async with httpx.AsyncClient() as c:
        # 1. 공급업체 UCP 프로필 확인
        profile_resp = await c.get(f"{vendor_url}/.well-known/ucp")
        profile = UcpDiscoveryProfile.model_validate(profile_resp.json())
        print(f"Vendor supports: {profile.capabilities}")

        # 2. 체크아웃 세션 생성
        checkout_req = CheckoutCreateRequest(
            currency="USD",
            line_items=[
                LineItemCreateRequest(
                    quantity=quantity,
                    item=ItemCreateRequest(id=item_id),
                )
            ],
        )

        headers = {
            "UCP-Agent": 'profile="https://my-agent.example/agent"',
            "Idempotency-Key": str(uuid.uuid4()),  # 중복 주문 방지
        }

        checkout = await c.post(
            f"{vendor_url}/checkout-sessions",
            json=checkout_req.model_dump(exclude_none=True),
            headers=headers,
        )
        session = checkout.json()

        # 3. 체크아웃 완료
        result = await c.post(
            f"{vendor_url}/checkout-sessions/{session['id']}/complete",
            headers=headers,
        )
        return result.json()
```

## TypeScript — UCP 체크아웃 (Next.js API Route)

```typescript
// app/api/order/route.ts
export async function POST(req: Request) {
  const { vendorUrl, itemId, quantity } = await req.json()

  // 1. 공급업체 프로필 확인
  const profile = await fetch(`${vendorUrl}/.well-known/ucp`).then(r => r.json())

  // 2. 체크아웃 생성
  const checkout = await fetch(`${vendorUrl}/checkout-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'UCP-Agent': 'profile="https://my-agent.example/agent"',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      currency: 'USD',
      line_items: [{ quantity, item: { id: itemId } }],
    }),
  }).then(r => r.json())

  // 3. 주문 완료
  const order = await fetch(`${vendorUrl}/checkout-sessions/${checkout.id}/complete`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  }).then(r => r.json())

  return Response.json(order)
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `Idempotency-Key` 헤더 누락 | 모든 주문 요청에 UUID 포함 필수 |
| `/.well-known/ucp` 확인 없이 주문 | 먼저 공급업체 기능 확인 |
| AP2 없이 결제 처리 | 결제가 필요하면 반드시 `agent-ap2` 함께 사용 |

## Official Docs
엣지 케이스: https://ucp.dev/
샘플: https://github.com/Universal-Commerce-Protocol/samples
```

- [ ] **Step 3: GREEN 검증 및 REFACTOR**

- [ ] **Step 4: Commit**

```bash
git add skills/agent-ucp/SKILL.md
git commit -m "feat: add agent-ucp skill (checkout session, idempotency pattern)"
```

---

## Task 8: agent-ap2 스킬 작성

**Files:**
- Create: `skills/agent-ap2/SKILL.md`

- [ ] **Step 1: RED — 베이스라인 실행**

```
You are a developer. WITHOUT any skills, show me:

"에이전트가 자율적으로 결제를 실행해야 하는데,
사람이 사전에 한도와 허용 가맹점을 설정해두고
에이전트는 그 범위 안에서만 결제할 수 있어야 해.
감사 추적도 필요해. 어떻게 구현해?"
```

- [ ] **Step 2: GREEN — 스킬 파일 작성**

`skills/agent-ap2/SKILL.md` 생성:

```markdown
---
name: agent-ap2
description: Use when an AI agent needs to authorize and execute payments autonomously — when implementing spending limits, merchant restrictions, cryptographic approval proof, or audit trails for agentic purchases.
---

# Agent AP2 (Agent Payments Protocol)

## Overview
AP2는 에이전트가 결제를 실행할 때 사람이 사전에 설정한 가드레일 안에서만 동작하도록 암호화된 위임장과 감사 추적을 제공한다. UCP가 "무엇을 주문할지"를 처리하면, AP2는 "그 결제가 승인된 것임을 증명한다."

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 AP2가 필요한지 확인하라.**
**AP2는 반드시 UCP와 함께 사용한다.**

## 3단계 감사 추적

```
관리자                에이전트                  공급업체
   │                     │                        │
   │  IntentMandate       │                        │
   │  (가드레일 설정)      │                        │
   │────────────────────► │                        │
   │                     │  PaymentMandate         │
   │                     │  (구체적 결제 생성)       │
   │◄────────────────────│                        │
   │  서명 (승인)          │                        │
   │────────────────────► │                        │
   │                     │  결제 실행 + Mandate 전달 │
   │                     │────────────────────────►│
   │                     │  PaymentReceipt         │
   │                     │◄────────────────────────│
```

## Core Concepts

| 개념 | 설명 |
|------|------|
| **IntentMandate** | 관리자가 설정하는 가드레일 (허용 가맹점, 한도, 만료일) |
| **PaymentMandate** | 에이전트가 생성하는 구체적 결제 권한 (금액 바인딩, 암호화 서명) |
| **PaymentReceipt** | 최종 거래 기록 + 감사 추적 |

## Python — AP2 전체 흐름

```python
# pip install ap2-sdk
from ap2.types.mandate import IntentMandate, PaymentMandate, PaymentMandateContents
from ap2.types.payment_receipt import PaymentReceipt, Success
from ap2.types.common import PaymentItem, PaymentCurrencyAmount
import datetime

# Step 1: 관리자가 IntentMandate 설정 (에이전트 실행 전)
intent = IntentMandate(
    natural_language_description="10 lbs salmon, 3 bottles olive oil from approved vendors",
    merchants=["Example Wholesale", "Fresh Seafood Co"],  # 허용 가맹점
    total_amount_limit=PaymentCurrencyAmount(currency="USD", value=500.00),
    requires_refundability=True,
    user_cart_confirmation_required=False,
    intent_expiry=datetime.datetime(2026, 12, 31).isoformat(),
)

# Step 2: 에이전트가 PaymentMandate 생성 (UCP 체크아웃 후)
mandate = PaymentMandate(
    payment_mandate_contents=PaymentMandateContents(
        payment_mandate_id="mandate-abc123",
        intent_mandate_id=intent.intent_mandate_id,
        payment_details_total=PaymentItem(
            label="10 lbs Atlantic Salmon + 3 bottles Olive Oil",
            amount=PaymentCurrencyAmount(currency="USD", value=294.00),
        ),
        merchant_agent="Example Wholesale",
        line_items=[
            PaymentItem(label="Salmon 10 lbs", amount=PaymentCurrencyAmount(currency="USD", value=240.00)),
            PaymentItem(label="Olive Oil x3",  amount=PaymentCurrencyAmount(currency="USD", value=54.00)),
        ],
    )
)

# Step 3: 관리자 서명 (실제 환경: JWT / 생체 인증 / 하드웨어 키)
mandate.user_authorization = sign_mandate(mandate)  # 구현체에 따라 다름

# Step 4: 결제 실행 (UCP complete 호출 시 mandate 첨부)
# mandate를 UCP checkout-sessions/{id}/complete 요청 헤더에 포함

# Step 5: PaymentReceipt 저장 (감사 추적)
receipt = PaymentReceipt(
    payment_mandate_id="mandate-abc123",
    payment_id="PAY-001",
    amount=PaymentCurrencyAmount(currency="USD", value=294.00),
    payment_status=Success(merchant_confirmation_id="ORD-A1B2C3"),
)
save_receipt(receipt)  # DB에 영구 저장
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| IntentMandate 없이 PaymentMandate 생성 | IntentMandate가 가드레일 — 반드시 먼저 생성 |
| PaymentReceipt 미저장 | 감사 추적의 핵심 — 반드시 영구 저장 |
| UCP 없이 AP2 단독 사용 | AP2는 UCP 체크아웃 완료 후 결제 승인에 사용 |
| 서명 없이 mandate 전송 | `user_authorization` 필드 필수 |

## Official Docs
엣지 케이스: https://ap2-protocol.org/
샘플: https://github.com/google-agentic-commerce/AP2
```

- [ ] **Step 3: GREEN 검증 및 REFACTOR**

- [ ] **Step 4: Commit**

```bash
git add skills/agent-ap2/SKILL.md
git commit -m "feat: add agent-ap2 skill (IntentMandate/PaymentMandate/Receipt audit trail)"
```

---

## Task 9: README.md 업데이트

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 목차에 AI 에이전트 프로토콜 섹션 추가**

목차에 아래 추가:

```markdown
- [AI 에이전트 프로토콜](#ai-에이전트-프로토콜)
  - [agent-protocol-design](#agent-protocol-design)
  - [agent-mcp](#agent-mcp)
  - [agent-a2a](#agent-a2a)
  - [agent-ag-ui](#agent-ag-ui)
  - [agent-a2ui](#agent-a2ui)
  - [agent-ucp](#agent-ucp)
  - [agent-ap2](#agent-ap2)
```

- [ ] **Step 2: 스킬 목록 섹션에 AI 에이전트 프로토콜 추가**

`### nextjs-zustand` 섹션 뒤, `## 스킬 사용 방법` 앞에 다음 섹션 삽입:

```markdown
---

## AI 에이전트 프로토콜

### agent-protocol-design

> **언제 사용하나요?** AI 에이전트를 새로 만들거나 기능을 추가할 때 — MCP/A2A/AG-UI/A2UI/UCP/AP2 중 어떤 프로토콜 조합이 필요한지 결정할 때

레이어드 결정 트리로 필요한 프로토콜 조합을 선택한다. 코드 작성 전 진입점.

| 레이어 | 질문 |
|--------|------|
| Layer 1 | 에이전트가 무엇을 하는가? (도구 호출 / 에이전트 위임 / 상거래 / 결제) |
| Layer 2 | 출력이 어디로 가는가? (프론트엔드 스트리밍 / UI 컴포넌트 / 백엔드만) |
| Layer 3 | 대표 조합 패턴 (단일 도구 / 멀티 에이전트 / 풀스택 에이전트) |

---

### agent-mcp

> **언제 사용하나요?** 에이전트가 DB, API, 파일시스템 등 외부 도구에 연결해야 할 때

| 항목 | 내용 |
|------|------|
| Transport | stdio (로컬) / HTTP+SSE (원격) |
| TypeScript SDK | `@modelcontextprotocol/sdk` |
| Python | Google ADK `McpToolset` |
| 참고 | https://modelcontextprotocol.io |

---

### agent-a2a

> **언제 사용하나요?** 에이전트가 다른 에이전트에게 서브태스크를 위임해야 할 때, 멀티 에이전트 시스템을 구축할 때

| 항목 | 내용 |
|------|------|
| 핵심 개념 | AgentCard, Task, Message, Artifact |
| Python | ADK `to_a2a()` + `A2AClient` |
| TypeScript | `@a2a-protocol/client` |
| 참고 | https://a2a-protocol.org/ |

---

### agent-ag-ui

> **언제 사용하나요?** 프론트엔드에서 에이전트 실행을 실시간으로 스트리밍해야 할 때 — 텍스트 델타, 툴 호출 이벤트, human-in-the-loop 중단

| 항목 | 내용 |
|------|------|
| 이벤트 타입 | RUN_STARTED, TEXT_MESSAGE_CONTENT, TOOL_CALL_*, RUN_FINISHED |
| Python | FastAPI + `ag_ui_adk` |
| TypeScript | CopilotKit (`@copilotkit/react-core`) |
| 참고 | https://docs.ag-ui.com/ |

---

### agent-a2ui

> **언제 사용하나요?** 에이전트가 텍스트 대신 카드/폼/버튼 같은 동적 UI를 생성해야 할 때

| 항목 | 내용 |
|------|------|
| 프리미티브 | 18개 (Card, Text, Button, TextField 등) |
| 전달 방식 | AG-UI 스트림을 통해 전달 |
| 핵심 패턴 | 구조(컴포넌트 트리)와 데이터 분리 |
| 참고 | https://a2ui.org/ |

---

### agent-ucp

> **언제 사용하나요?** 에이전트가 전자상거래 주문을 처리해야 할 때 — 공급업체별 다른 API 없이 표준화된 체크아웃

| 항목 | 내용 |
|------|------|
| 핵심 개념 | Discovery Profile, CheckoutSession, Idempotency-Key |
| Python SDK | `ucp-sdk` |
| 주의 | 결제가 필요하면 반드시 `agent-ap2`와 함께 |
| 참고 | https://ucp.dev/ |

---

### agent-ap2

> **언제 사용하나요?** 에이전트가 결제를 자율 실행할 때 — 한도/가맹점 제한 가드레일, 암호화 서명, 감사 추적 필요 시

| 항목 | 내용 |
|------|------|
| 3단계 | IntentMandate → PaymentMandate → PaymentReceipt |
| Python SDK | `ap2-sdk` |
| 주의 | UCP 없이 단독 사용 불가 |
| 참고 | https://ap2-protocol.org/ |
```

- [ ] **Step 3: 스킬 사용 방법 섹션에 트리거 예시 추가**

기존 트리거 예시 블록에 추가:

```
AI 에이전트를 새로 만들거나, 어떤 프로토콜 써야 할지 모르겠어.
→ agent-protocol-design 스킬 자동 적용

에이전트에서 DB나 외부 API 연결이 필요해.
→ agent-mcp 스킬 자동 적용

에이전트끼리 통신하는 멀티 에이전트 시스템 만들어야 해.
→ agent-a2a 스킬 자동 적용

Next.js에서 에이전트 응답을 실시간으로 보여줘야 해.
→ agent-ag-ui 스킬 자동 적용
```

- [ ] **Step 4: 스킬 적용 흐름 업데이트**

기존 `1. 기능 설계` 섹션 위에 AI 에이전트 흐름 추가:

```markdown
**AI 에이전트 개발 시:**
0. 프로토콜 선택
   └─ agent-protocol-design     (어떤 프로토콜 조합이 필요한지 결정)
       ├─ agent-mcp             (외부 도구/DB 연결)
       ├─ agent-a2a             (에이전트 간 통신)
       ├─ agent-ag-ui           (프론트엔드 실시간 스트리밍)
       ├─ agent-a2ui            (동적 UI 컴포넌트 생성)
       ├─ agent-ucp             (전자상거래 트랜잭션)
       └─ agent-ap2             (결제 승인 + 감사 추적)
```

- [ ] **Step 5: 버전 히스토리 업데이트**

```markdown
| v1.5.0 | AI 에이전트 프로토콜 스킬 7개 추가 (agent-protocol-design, agent-mcp, agent-a2a, agent-ag-ui, agent-a2ui, agent-ucp, agent-ap2). 도메인 확장 (Next.js + AI 에이전트 프로토콜) |
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: README v1.5.0 — AI 에이전트 프로토콜 스킬 7개 섹션 추가"
```
