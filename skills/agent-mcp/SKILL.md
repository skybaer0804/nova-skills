---
name: agent-mcp
description: Use when an AI agent needs to connect to external tools, databases, APIs, or file systems — when implementing tool use with a standard interface, when replacing custom integration code, or when connecting to an existing MCP server ecosystem.
created: 2026-05-05
updated: 2026-05-05
---

# Agent MCP (Model Context Protocol)

## Overview
MCP는 AI 에이전트와 외부 시스템을 연결하는 USB-C 같은 표준 인터페이스다. 매번 맞춤형 통합 코드를 작성하는 대신 단일 프로토콜로 수백 개의 도구와 연결한다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 MCP가 필요한지 확인하라.**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **Host** | MCP를 초기화하고 클라이언트를 관리하는 앱 (에이전트, Claude) |
| **Client** | 서버와 1:1 연결을 유지하는 Host 내부 컴포넌트 |
| **Server** | Tools / Resources / Prompts를 노출하는 서비스 |
| **Transport** | 통신 방식 — `stdio`(로컬 프로세스) 또는 `HTTP+SSE`(원격) |

```
Host (에이전트)
  └── Client ──[stdio or HTTP/SSE]──> Server
                                        ├── Tools      (함수 호출)
                                        ├── Resources  (데이터 읽기)
                                        └── Prompts    (프롬프트 템플릿)
```

## 빠른 시작: 기존 MCP 서버 연결 (TypeScript)

```typescript
// npm install @modelcontextprotocol/sdk
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// 기존 postgres MCP 서버에 연결 (npx로 서버 자동 실행)
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL!],
})

const client = new Client(
  { name: 'my-agent', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

await client.connect(transport)

// 사용 가능한 툴 확인
const { tools } = await client.listTools()
console.log(tools.map(t => t.name))  // ['query', 'list_tables', ...]

// 툴 호출
const result = await client.callTool({
  name: 'query',
  arguments: { sql: 'SELECT * FROM inventory WHERE item = $1', params: ['salmon'] },
})

await client.close()  // 반드시 종료
```

## Python — Google ADK로 MCP 연결

```python
# pip install google-adk
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset, StdioConnectionParams, ServerParameters

# 기존 MCP 서버에 연결 (ADK가 클라이언트 역할)
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
```

## Transport 선택

| 상황 | Transport | 클래스 |
|------|-----------|--------|
| 같은 머신의 로컬 프로세스 | stdio | `StdioClientTransport` |
| 원격 서버 / 클라우드 | HTTP+SSE | `StreamableHTTPClientTransport` |
| 브라우저 환경 | HTTP+SSE only | stdio 불가 |

## 인기 MCP 서버 목록

| 서버 | 패키지 | 용도 |
|------|--------|------|
| PostgreSQL | `@modelcontextprotocol/server-postgres` | DB 쿼리 |
| Filesystem | `@modelcontextprotocol/server-filesystem` | 파일 읽기/쓰기 |
| GitHub | `@modelcontextprotocol/server-github` | 리포지토리 접근 |
| Notion | `mcp-notion-server` | Notion 페이지 |
| Google ADK Toolbox | `google-adk` ToolboxToolset | Google Cloud DB |

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 브라우저에서 stdio transport 사용 | HTTP+SSE로 교체 |
| `client.connect()` 전에 툴 호출 | 반드시 connect 후 호출 |
| `client.close()` 누락 | finally 블록에서 반드시 호출 |
| 서버 직접 구현부터 시작 | 기존 서버 먼저 확인 (modelcontextprotocol.io) |
| 디버그에 `console.log` 사용 (TS) | stdio transport는 stdout이 프로토콜용 — `console.error` 사용 |

## Official Docs
엣지 케이스: https://modelcontextprotocol.io
서버 목록: https://github.com/modelcontextprotocol/servers
