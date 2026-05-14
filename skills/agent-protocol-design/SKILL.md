---
name: agent-protocol-design
description: Use when starting to build an AI agent or adding agent capabilities — when deciding which combination of MCP, A2A, AG-UI, A2UI, UCP, or AP2 protocols to use based on what the agent does, who it communicates with, and where its output goes.
created: 2026-05-05
updated: 2026-05-05
---

# AI Agent Protocol Design

## Overview
Decide on the protocol combination before writing any code. Choosing the wrong protocol can result in having to redesign the entire architecture.

**Run this skill before writing any code.**

## Layer 1: What Does the Agent Do?

```
Calls external tools / DB / API / filesystem?
  YES → MCP needed  →  agent-mcp

Delegates subtasks to another agent?
  YES → A2A needed  →  agent-a2a

Handles e-commerce orders / catalog browsing?
  YES → UCP needed  →  agent-ucp

Executes payments?
  YES → AP2 needed (must be used with UCP)  →  agent-ap2

Multiple apply → proceed to Layer 3
```

## Layer 2: Where Does the Output Go?

```
Does the frontend need real-time text / tool call streams?
  YES → AG-UI needed  →  agent-ag-ui

Does the frontend need dynamic UI like cards / forms / buttons?
  YES → A2UI needed (together with AG-UI)  →  agent-a2ui

Only communicating between backends?
  → AG-UI / A2UI not needed
```

## Layer 3: Representative Combination Patterns

| Scenario | Protocol Combination |
|----------|---------------------|
| Single-tool agent | **MCP** |
| Multi-agent system | **MCP + A2A** |
| Real-time UI agent | **MCP + AG-UI** |
| Dynamic UI generation agent | **MCP + A2UI + AG-UI** |
| Commerce agent | **MCP + A2A + UCP + AP2** |
| Full-stack agent | **MCP + A2A + UCP + AP2 + A2UI + AG-UI** |

## Protocol One-Line Summary

| Protocol | Role | Skill |
|----------|------|-------|
| MCP | Agent ↔ Tools/DB/API | `agent-mcp` |
| A2A | Agent ↔ Agent | `agent-a2a` |
| AG-UI | Agent → frontend real-time streaming | `agent-ag-ui` |
| A2UI | Agent → dynamic UI component generation | `agent-a2ui` |
| UCP | Agent ↔ e-commerce transactions | `agent-ucp` |
| AP2 | Agent payment authorization + audit trail | `agent-ap2` |

## Decision Checklist

- [ ] Layer 1: Agent behavior classification complete?
- [ ] Layer 2: Output target decision complete?
- [ ] Layer 3: Combination pattern selected?
- [ ] Implementation skill for each protocol confirmed?

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Trying to use every protocol | Evaluate Layers 1-2 and select only what is needed |
| Using AP2 standalone | AP2 must always be used together with UCP |
| Using A2UI without AG-UI | AG-UI stream is required to deliver A2UI components |
| Starting an agent without MCP | Almost all agents start with MCP as the foundation |
| Thinking only "stream via SSE" | Frontend streaming uses AG-UI standard events |
