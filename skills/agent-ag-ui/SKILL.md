---
name: agent-ag-ui
description: Use when a frontend application needs to receive real-time streaming output from an AI agent — when implementing live token streaming, tool call visibility, human-in-the-loop interrupts, or connecting a Next.js/React app to an agent backend without custom WebSocket wiring.
---

# Agent AG-UI (Agent-User Interaction Protocol)

## Overview
AG-UI는 에이전트 백엔드와 프론트엔드를 연결하는 표준 이벤트 스트림 프로토콜이다. HTTP/WebSocket 위에서 타입화된 이벤트를 정의하여 어떤 에이전트 프레임워크를 써도 동일한 프론트엔드 코드로 연결된다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 AG-UI가 필요한지 확인하라.**
**커스텀 SSE 이벤트 대신 반드시 AG-UI 표준 이벤트 타입을 사용하라.**

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

## Python — AG-UI 백엔드 (Google ADK + FastAPI)

```python
# pip install google-adk ag-ui-protocol
from google.adk.agents import Agent
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI

my_agent = Agent(
    model="gemini-2.0-flash",
    name="my_agent",
    instruction="Help the user.",
    tools=[...],  # MCP tools 등
)

# ADK 에이전트를 AG-UI 표준 SSE 스트림으로 래핑
ag_ui_agent = ADKAgent(
    adk_agent=my_agent,
    app_name="my_app",
    user_id="user",
)

app = FastAPI()
add_adk_fastapi_endpoint(app, ag_ui_agent, path="/agent")

# 실행: uvicorn main:app --port 8000
# AG-UI 스트림: POST http://localhost:8000/agent
# 이벤트 순서: RUN_STARTED → TOOL_CALL_START → TOOL_CALL_RESULT → TOOL_CALL_END → TEXT_MESSAGE_CONTENT → RUN_FINISHED
```

## TypeScript — AG-UI 프론트엔드 (Next.js + CopilotKit)

```typescript
// npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime

// app/layout.tsx — AG-UI 스트림을 받는 CopilotKit Provider
import { CopilotKit } from '@copilotkit/react-core'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body>
      <CopilotKit runtimeUrl="/api/copilotkit">
        {children}
      </CopilotKit>
    </body></html>
  )
}

// app/api/copilotkit/route.ts — Python AG-UI 서버로 프록시
import { CopilotRuntime } from '@copilotkit/runtime'
import { NextRequest } from 'next/server'

const runtime = new CopilotRuntime({
  remoteEndpoints: [{ url: 'http://localhost:8000/agent' }],
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

## TypeScript — AG-UI 이벤트 직접 소비 (CopilotKit 없이)

```typescript
// AG-UI 표준 이벤트 타입으로 직접 파싱
type AGUIEvent =
  | { type: 'RUN_STARTED' }
  | { type: 'TEXT_MESSAGE_CONTENT'; delta: string }
  | { type: 'TOOL_CALL_START'; toolCallName: string; toolCallId: string }
  | { type: 'TOOL_CALL_RESULT'; content: string }
  | { type: 'TOOL_CALL_END' }
  | { type: 'RUN_FINISHED' }
  | { type: 'RUN_ERROR'; message: string }

async function* streamAGUIEvents(message: string): AsyncGenerator<AGUIEvent> {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        yield JSON.parse(line.slice(6)) as AGUIEvent
      }
    }
  }
}

// 사용
for await (const event of streamAGUIEvents('재고 확인해줘')) {
  switch (event.type) {
    case 'TEXT_MESSAGE_CONTENT':
      process.stdout.write(event.delta)
      break
    case 'TOOL_CALL_START':
      console.log(`\n[툴 호출: ${event.toolCallName}]`)
      break
    case 'RUN_ERROR':
      console.error(event.message)
      break
  }
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 커스텀 이벤트 타입 (`text_delta` 등) | AG-UI 표준 이벤트 타입 사용 (`TEXT_MESSAGE_CONTENT`) |
| `RUN_ERROR` 이벤트 미처리 | 모든 이벤트 타입 핸들러 필수 |
| AG-UI 없이 raw SSE 직접 구현 | `ag_ui_adk` + `add_adk_fastapi_endpoint` 사용 |
| A2UI 없이 AG-UI만 사용 | UI 컴포넌트 생성은 A2UI, 스트리밍 전달은 AG-UI |
| Next.js에서 Edge Runtime 미설정 | 스트리밍 API route에 `export const runtime = 'edge'` 추가 |

## Official Docs
엣지 케이스: https://docs.ag-ui.com/
데모: https://dojo.ag-ui.com/
CopilotKit: https://www.copilotkit.ai/
