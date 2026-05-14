---
name: agent-ag-ui
description: Use when a frontend application needs to receive real-time streaming output from an AI agent — when implementing live token streaming, tool call visibility, human-in-the-loop interrupts, or connecting a Next.js/React app to an agent backend without custom WebSocket wiring.
created: 2026-05-05
updated: 2026-05-05
---

# Agent AG-UI (Agent-User Interaction Protocol)

## Overview
AG-UI is a standard event stream protocol that connects agent backends to frontends. It defines typed events over HTTP/WebSocket so that any agent framework can be connected using the same frontend code.

**Before using this skill, verify that AG-UI is needed via `agent-protocol-design`.**
**Always use AG-UI standard event types instead of custom SSE events.**

## Standard Event Types

| Event | Meaning |
|-------|---------|
| `RUN_STARTED` | Agent execution started |
| `TEXT_MESSAGE_CONTENT` | Text delta (streaming token) |
| `TOOL_CALL_START` | Tool call started |
| `TOOL_CALL_RESULT` | Tool call result |
| `TOOL_CALL_END` | Tool call completed |
| `STATE_SNAPSHOT` | Full state synchronization |
| `STATE_DELTA` | Partial state update |
| `RUN_FINISHED` | Agent execution completed |
| `RUN_ERROR` | Error occurred |

## Python — AG-UI Backend (Google ADK + FastAPI)

```python
# pip install google-adk ag-ui-protocol
from google.adk.agents import Agent
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI

my_agent = Agent(
    model="gemini-2.0-flash",
    name="my_agent",
    instruction="Help the user.",
    tools=[...],  # MCP tools, etc.
)

# Wrap ADK agent as a standard AG-UI SSE stream
ag_ui_agent = ADKAgent(
    adk_agent=my_agent,
    app_name="my_app",
    user_id="user",
)

app = FastAPI()
add_adk_fastapi_endpoint(app, ag_ui_agent, path="/agent")

# Run: uvicorn main:app --port 8000
# AG-UI stream: POST http://localhost:8000/agent
# Event order: RUN_STARTED → TOOL_CALL_START → TOOL_CALL_RESULT → TOOL_CALL_END → TEXT_MESSAGE_CONTENT → RUN_FINISHED
```

## TypeScript — AG-UI Frontend (Next.js + CopilotKit)

```typescript
// npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime

// app/layout.tsx — CopilotKit Provider receiving AG-UI stream
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

// app/api/copilotkit/route.ts — Proxy to Python AG-UI server
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

## TypeScript — Consuming AG-UI Events Directly (without CopilotKit)

```typescript
// Parse directly using AG-UI standard event types
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

// Usage
for await (const event of streamAGUIEvents('Check inventory')) {
  switch (event.type) {
    case 'TEXT_MESSAGE_CONTENT':
      process.stdout.write(event.delta)
      break
    case 'TOOL_CALL_START':
      console.log(`\n[Tool call: ${event.toolCallName}]`)
      break
    case 'RUN_ERROR':
      console.error(event.message)
      break
  }
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Custom event types (e.g. `text_delta`) | Use AG-UI standard event types (`TEXT_MESSAGE_CONTENT`) |
| Not handling `RUN_ERROR` event | Handlers for all event types are required |
| Implementing raw SSE directly without AG-UI | Use `ag_ui_adk` + `add_adk_fastapi_endpoint` |
| Using AG-UI without A2UI | Use A2UI for generating UI components, AG-UI for streaming delivery |
| Not setting Edge Runtime in Next.js | Add `export const runtime = 'edge'` to streaming API routes |

## Official Docs
Edge cases: https://docs.ag-ui.com/
Demo: https://dojo.ag-ui.com/
CopilotKit: https://www.copilotkit.ai/
