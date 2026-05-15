---
name: agent-mcp
description: Use when an AI agent needs to connect to external tools, databases, APIs, or file systems — when implementing tool use with a standard interface, when replacing custom integration code, or when connecting to an existing MCP server ecosystem.
created: 2026-05-05
updated: 2026-05-05
---

# Agent MCP (Model Context Protocol)

## Overview
MCP is a standard interface like USB-C that connects AI agents to external systems. Instead of writing custom integration code each time, it connects to hundreds of tools with a single protocol.

**Before using this skill, verify that MCP is needed via `agent-protocol-design`.**

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Host** | The app that initializes MCP and manages clients (agent, Claude) |
| **Client** | A component within the Host that maintains a 1:1 connection to a server |
| **Server** | A service that exposes Tools / Resources / Prompts |
| **Transport** | Communication method — `stdio` (local process) or `HTTP+SSE` (remote) |

```
Host (agent)
  └── Client ──[stdio or HTTP/SSE]──> Server
                                        ├── Tools      (function calls)
                                        ├── Resources  (data reads)
                                        └── Prompts    (prompt templates)
```

## Quick Start: Connect to an Existing MCP Server (TypeScript)

```typescript
// npm install @modelcontextprotocol/sdk
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// Connect to an existing postgres MCP server (auto-starts server via npx)
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL!],
})

const client = new Client(
  { name: 'my-agent', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

await client.connect(transport)

// Check available tools
const { tools } = await client.listTools()
console.log(tools.map(t => t.name))  // ['query', 'list_tables', ...]

// Call a tool
const result = await client.callTool({
  name: 'query',
  arguments: { sql: 'SELECT * FROM inventory WHERE item = $1', params: ['salmon'] },
})

await client.close()  // must close
```

## Python — Connect MCP via Google ADK

```python
# pip install google-adk
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset, StdioConnectionParams, StdioServerParameters

# Connect to an existing MCP server (ADK acts as client)
db_tools = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
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

## Transport Selection

| Situation | Transport | Class |
|-----------|-----------|-------|
| Local process on the same machine | stdio | `StdioClientTransport` |
| Remote server / cloud | HTTP+SSE | `StreamableHTTPClientTransport` |
| Browser environment | HTTP+SSE only | stdio not available |

## Popular MCP Servers

| Server | Package | Purpose |
|--------|---------|---------|
| PostgreSQL | `@modelcontextprotocol/server-postgres` | DB queries |
| Filesystem | `@modelcontextprotocol/server-filesystem` | File read/write |
| GitHub | `@modelcontextprotocol/server-github` | Repository access |
| Notion | `mcp-notion-server` | Notion pages |
| Google ADK Toolbox | `google-adk` ToolboxToolset | Google Cloud DB |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using stdio transport in the browser | Switch to HTTP+SSE |
| Calling tools before `client.connect()` | Must call tools only after connecting |
| Missing `client.close()` | Must call in a finally block |
| Starting by implementing the server from scratch | Check for existing servers first (modelcontextprotocol.io) |
| Using `console.log` for debug (TS) | stdio transport uses stdout for the protocol — use `console.error` instead |

## Official Docs
Edge cases: https://modelcontextprotocol.io
Server list: https://github.com/modelcontextprotocol/servers
