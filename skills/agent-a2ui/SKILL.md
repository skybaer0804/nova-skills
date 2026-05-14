---
name: agent-a2ui
description: Use when an AI agent needs to generate structured UI components for a frontend — when the agent should produce interactive cards, forms, buttons, or dashboards instead of plain text, using 18 safe declarative component primitives sent as JSON over an AG-UI stream.
created: 2026-05-05
updated: 2026-05-05
---

# Agent A2UI (Agent-to-User Interface Protocol)

## Overview
A2UI is a protocol where agents define UI declaratively as JSON using 18 safe component primitives (Card, Text, Button, etc.). By separating structure (component tree) from data, the UI can update by replacing only the data without resending the component tree.

**Before using this skill, verify that A2UI is needed via `agent-protocol-design`.**
**A2UI messages are delivered to the frontend via an AG-UI stream (use together with `agent-ag-ui`).**

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Surface** | An independent area where UI is rendered (identified by `surfaceId`) |
| **Component** | One of the 18 primitives (Card, Column, Row, Text, Button, etc.) |
| **DataModel** | Data referenced by components (in the form `{"path": "price"}`) |
| **Flat List** | The component tree is composed via ID references with no nesting |

## 18 Component Primitives

`Card, Column, Row, Text, Button, TextField, CheckBox, RadioButton, Select, Image, Divider, Spacer, Badge, ProgressBar, Chip, Link, Icon, List`

## Python — A2UI Message Sequence

```python
# 3-step A2UI messages returned by the agent
a2ui_messages = [
    # Step 1: Create rendering surface
    {"beginRendering": {"surfaceId": "product-card", "root": "card"}},

    # Step 2: Send component tree (flat list — no nesting, ID references)
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
            {"id": "btn-label", "component": {"Text": {"text": {"literal": "Add to Cart"}}}},
        ]
    }},

    # Step 3: Send data (component tree is preserved, only data is replaced)
    {"dataModelUpdate": {
        "surfaceId": "product-card",
        "contents": [
            {"key": "name",    "valueString": "Fresh Atlantic Salmon"},
            {"key": "price",   "valueString": "$24.00/lb"},
            {"key": "item_id", "valueString": "salmon-001"},
        ]
    }},
]

# Update data only (no resending component tree — performance optimization)
data_update = {
    "dataModelUpdate": {
        "surfaceId": "product-card",
        "contents": [
            {"key": "name",  "valueString": "Pacific Tuna"},
            {"key": "price", "valueString": "$18.00/lb"},
        ]
    }
}
```

## TypeScript — A2UI Renderer (Next.js)

```typescript
// Receive A2UI messages and render as React components
// Delivered as custom events on the AG-UI stream

interface A2UISurface {
  components: Record<string, { component: Record<string, unknown> }>
  data: Record<string, string>
  rootId: string
}

function renderComponent(id: string, surface: A2UISurface): React.ReactNode {
  const comp = surface.components[id]
  if (!comp) return null

  const resolve = (val: { path?: string; literal?: string }) =>
    val.path ? surface.data[val.path] ?? '' : val.literal ?? ''

  const def = comp.component

  if ('Card' in def) {
    const c = def.Card as { child: string }
    return <div className="rounded-lg border p-4" key={id}>{renderComponent(c.child, surface)}</div>
  }
  if ('Column' in def) {
    const c = def.Column as { children: { explicitList: string[] } }
    return <div className="flex flex-col gap-2" key={id}>{c.children.explicitList.map(cid => renderComponent(cid, surface))}</div>
  }
  if ('Text' in def) {
    const c = def.Text as { text: { path?: string; literal?: string }; usageHint?: string }
    const text = resolve(c.text)
    if (c.usageHint === 'h3') return <h3 className="font-semibold" key={id}>{text}</h3>
    return <span key={id}>{text}</span>
  }
  if ('Button' in def) {
    const c = def.Button as { child: string; action: { name: string; context: { key: string; value: { path?: string } }[] } }
    const ctx = Object.fromEntries(c.action.context.map(e => [e.key, resolve(e.value)]))
    return (
      <button key={id} onClick={() => handleAction(c.action.name, ctx)}
        className="rounded bg-blue-600 px-4 py-2 text-white text-sm">
        {renderComponent(c.child, surface)}
      </button>
    )
  }
  return null
}

function handleAction(name: string, ctx: Record<string, string>) {
  console.log('A2UI action:', name, ctx)
  // Handle agent action
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing component tree as nested JSON | Write as a flat list using ID references |
| Resending component tree when data changes | Send only `dataModelUpdate` |
| Generating HTML directly | Use only the 18 primitives (prevents XSS) |
| Using A2UI without AG-UI | A2UI messages are delivered via AG-UI stream |
| Using `surfaceUpdate` without `beginRendering` | Surface must be created first |

## Official Docs
Edge cases: https://a2ui.org/
Samples: https://github.com/google/A2UI/tree/main/samples
Widget builder: https://a2ui-composer.ag-ui.com/
