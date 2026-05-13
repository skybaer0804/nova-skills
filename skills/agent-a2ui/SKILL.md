---
name: agent-a2ui
description: Use when an AI agent needs to generate structured UI components for a frontend — when the agent should produce interactive cards, forms, buttons, or dashboards instead of plain text, using 18 safe declarative component primitives sent as JSON over an AG-UI stream.
created: 2026-05-05
updated: 2026-05-05
---

# Agent A2UI (Agent-to-User Interface Protocol)

## Overview
A2UI는 에이전트가 18개의 안전한 컴포넌트 프리미티브(Card, Text, Button 등)로 UI를 선언적 JSON으로 정의하는 프로토콜이다. 구조(컴포넌트 트리)와 데이터를 분리하여 데이터만 교체해도 컴포넌트 재전송 없이 UI가 업데이트된다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 A2UI가 필요한지 확인하라.**
**A2UI 메시지는 AG-UI 스트림을 통해 프론트엔드에 전달된다 (`agent-ag-ui` 함께 사용).**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **Surface** | UI가 렌더링될 독립 영역 (`surfaceId`로 식별) |
| **Component** | 18개 프리미티브 중 하나 (Card, Column, Row, Text, Button 등) |
| **DataModel** | 컴포넌트가 참조하는 데이터 (`{"path": "price"}` 형태) |
| **Flat List** | 컴포넌트 트리는 중첩 없이 ID 참조로 구성 |

## 18가지 컴포넌트 프리미티브

`Card, Column, Row, Text, Button, TextField, CheckBox, RadioButton, Select, Image, Divider, Spacer, Badge, ProgressBar, Chip, Link, Icon, List`

## Python — A2UI 메시지 시퀀스

```python
# 에이전트가 반환하는 A2UI 메시지 3단계
a2ui_messages = [
    # Step 1: 렌더링 표면 생성
    {"beginRendering": {"surfaceId": "product-card", "root": "card"}},

    # Step 2: 컴포넌트 트리 전송 (플랫 리스트 — 중첩 없이 ID 참조)
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

    # Step 3: 데이터 전송 (컴포넌트 트리 유지, 데이터만 교체 가능)
    {"dataModelUpdate": {
        "surfaceId": "product-card",
        "contents": [
            {"key": "name",    "valueString": "Fresh Atlantic Salmon"},
            {"key": "price",   "valueString": "$24.00/lb"},
            {"key": "item_id", "valueString": "salmon-001"},
        ]
    }},
]

# 데이터만 업데이트 (컴포넌트 트리 재전송 없음 — 성능 최적화)
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

## TypeScript — A2UI 렌더러 (Next.js)

```typescript
// A2UI 메시지를 수신해서 React 컴포넌트로 렌더링
// AG-UI 스트림의 커스텀 이벤트로 전달됨

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
  // 에이전트 액션 처리
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 컴포넌트 트리를 중첩 JSON으로 작성 | ID 참조 플랫 리스트로 작성 |
| 데이터 변경 시 컴포넌트 트리 재전송 | `dataModelUpdate`만 전송 |
| HTML 직접 생성 | 18개 프리미티브만 사용 (XSS 방지) |
| AG-UI 없이 A2UI 단독 사용 | A2UI 메시지는 AG-UI 스트림으로 전달됨 |
| `beginRendering` 없이 `surfaceUpdate` | 반드시 surface 먼저 생성 |

## Official Docs
엣지 케이스: https://a2ui.org/
샘플: https://github.com/google/A2UI/tree/main/samples
위젯 빌더: https://a2ui-composer.ag-ui.com/
