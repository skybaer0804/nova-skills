---
name: agent-a2a
description: Use when an AI agent needs to delegate tasks to another agent, discover remote agents at runtime, or build a multi-agent system where agents from different frameworks or vendors need to interoperate without exposing internal implementation.
created: 2026-05-05
updated: 2026-05-05
---

# Agent A2A (Agent-to-Agent Protocol)

## Overview
A2A는 서로 다른 프레임워크/벤더로 만들어진 에이전트들이 내부 구현을 노출하지 않고 통신할 수 있는 Linux Foundation 표준이다. MCP가 에이전트↔도구라면, A2A는 에이전트↔에이전트다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 A2A가 필요한지 확인하라.**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **AgentCard** | `/.well-known/agent-card.json` — 에이전트 능력/엔드포인트 선언 |
| **Task** | 에이전트 간 작업 단위 (submitted → working → completed/failed) |
| **Message** | Task 안의 개별 메시지 (텍스트, 파일, 데이터) |
| **Artifact** | Task 완료 후 생성된 결과물 |

```
Client Agent                      Server Agent
     │  GET /.well-known/agent-card.json  │  ← 에이전트 발견
     │◄──────────────────────────────────│
     │  POST /  (tasks/send)              │  ← 작업 요청
     │──────────────────────────────────►│
     │  결과 반환 (동기) or SSE (스트리밍)  │
     │◄──────────────────────────────────│
```

## Python — A2A 서버 (Google ADK)

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
# AgentCard 자동 생성: http://localhost:8001/.well-known/agent-card.json
app = to_a2a(pricing_agent, port=8001)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

## Python — A2A 클라이언트

```python
from a2a.client import A2AClient
from a2a.types import SendMessageRequest, MessageSendParams
import asyncio

async def ask_pricing_agent(item: str) -> str:
    async with A2AClient.get_client("http://pricing-agent:8001") as client:
        # AgentCard 자동 조회 (에이전트 발견)
        card = await client.get_agent_card()
        print(f"Connected to: {card.name}")

        request = SendMessageRequest(
            params=MessageSendParams(
                message={
                    "role": "user",
                    "parts": [{"kind": "text", "text": f"Price of {item}?"}],
                }
            )
        )
        response = await client.send_message(request)
        return response.result.parts[0].text

asyncio.run(ask_pricing_agent("salmon"))
```

## TypeScript — A2A 클라이언트 (Next.js API Route)

```typescript
// app/api/price/route.ts
// npm install @a2a-protocol/client
import { A2AClient } from '@a2a-protocol/client'

export async function POST(req: Request) {
  const { item } = await req.json()

  const client = new A2AClient('http://pricing-agent:8001')

  // AgentCard 발견 후 메시지 전송
  const task = await client.sendMessage({
    message: {
      role: 'user',
      parts: [{ type: 'text', text: `Price of ${item}?` }],
    },
  })

  return Response.json({ price: task.artifacts?.[0]?.parts[0]?.text })
}
```

## AgentCard 구조

`to_a2a()`가 자동 생성하는 `/.well-known/agent-card.json` 형식:

```json
{
  "name": "Pricing Agent",
  "description": "Returns wholesale prices",
  "url": "http://pricing-agent:8001",
  "version": "1.0.0",
  "capabilities": { "streaming": true },
  "skills": [
    { "id": "get_price", "name": "Get Price", "description": "Returns current price" }
  ]
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `/.well-known/agent.json` URL 사용 | 정확한 경로는 `/.well-known/agent-card.json` |
| raw JSON-RPC 직접 구현 | `a2a-sdk` / `@a2a-protocol/client` 사용 |
| AgentCard 발견 없이 URL 하드코딩 | `client.get_agent_card()`로 발견 |
| 다른 에이전트 내부 직접 호출 | A2A 프로토콜 통해서만 통신 |

## Official Docs
엣지 케이스: https://a2a-protocol.org/
샘플: https://github.com/a2aproject/a2a-samples
