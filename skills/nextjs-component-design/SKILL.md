---
name: nextjs-component-design
description: Use when designing a new Next.js component before writing implementation code, especially when deciding between Server/Client components, props API shape, or composition strategy.
---

# Next.js Component Design

## Overview
Design component API and architecture before writing code. Prevents costly refactors from wrong Server/Client split or poor props design.

## Step 1: Server vs Client Decision

```
Needs useState/useEffect/event handlers?
  YES → Client Component ('use client')
  NO  → Does it fetch data?
          YES → Server Component (async function)
          NO  → Server Component (static)
```

**Push 'use client' as far down the tree as possible.** Keep data fetching and static rendering in Server Components; isolate interactivity in leaf Client Components.

| Use Case | Component Type |
|----------|---------------|
| Data fetching, DB access | Server Component |
| User interaction, state | Client Component |
| SEO-critical content | Server Component |
| Browser APIs (localStorage, window) | Client Component |
| Heavy animation | Client Component |

## Step 2: Props API Design

Answer these before writing the interface:

1. **What is the single responsibility?** Name it in one sentence.
2. **What data does it receive?** List required vs optional.
3. **What events does it emit?** Name them `on[Event]`.
4. **Does it accept children?** If yes, use `children: React.ReactNode`.
5. **Does it need to be styled externally?** Add `className?: string`.

```tsx
// Design the interface first, implement second
interface ProductCardProps {
  product: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>
  onAddToCart: (productId: string) => void
  className?: string
}
```

**Avoid:**
- Passing full entity objects when only 2-3 fields are needed (use `Pick<>`)
- Boolean prop explosion (`isLarge`, `isRounded`, `isOutlined`) → use `variant: 'primary' | 'outline'`
- Leaking internal implementation details as props

## Step 3: Composition Pattern

| Pattern | When to Use |
|---------|-------------|
| Simple props | Data flows one way, no slot customization needed |
| `children` | Wrapper/layout components |
| Compound components | Complex UI with shared state (Tabs, Accordion) |
| Render props | Inversion of control for highly flexible behavior |

## Step 4: Data Fetching Placement

```
Where should fetch live?

Page-level (one entity) → fetch in page.tsx Server Component
Shared across routes   → fetch in layout.tsx
Component-specific     → fetch in the Server Component itself
Client-side updates    → SWR or React Query in Client Component
```

## Step 5: File Placement Checklist

```
app/(route)/          → page.tsx, layout.tsx, loading.tsx
components/ui/        → Generic, reusable (Button, Input, Modal)
components/features/  → Domain-specific (ProductCard, CartDrawer)
components/layouts/   → Layout shells
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `'use client'` on parent with data fetch | Split: Server parent fetches, Client child handles interaction |
| Props drilling 3+ levels | Lift state or use React Context / Zustand |
| Giant component file | If >200 lines, identify sub-components and extract |
| `any` in props type | Define the exact shape with `interface` |
