---
name: nextjs-feature-scaffold
description: Use when building a new Next.js page or feature that combines server data fetching, shared client state, and error isolation — when deciding how to split Server/Client components, where to place ErrorBoundary, which state tool to use, and how to structure custom hooks before writing any code.
created: 2026-05-05
updated: 2026-05-05
---

# Next.js Feature Scaffold

## Overview
Orchestrates the four-pattern stack (React Query + domain hooks + Zustand + ErrorBoundary) in the correct sequence before writing code. Prevents concern-mixing, misplaced error boundaries, and wrong state tool choices.

**Run this skill BEFORE writing any file.**

## Step 1: Classify Every Piece of State

```
Is this data from an API/DB?
  YES → React Query (nextjs-tanstack-query)
  NO  → Is it shared across routes or unrelated components?
          YES → Zustand (nextjs-zustand)
          NO  → Is it URL-serializable? (filters, page, tabs)
                  YES → useSearchParams
                  NO  → useState
```

**Iron rule:** Never store API data in Zustand. Never put UI-only state in React Query.

## Step 2: Decide Server vs Client Split

```
Does this component call useQuery / useMutation?  →  'use client'
Does it use useState, event handlers, browser APIs?  →  'use client'
Otherwise  →  Server Component (no directive needed)
```

- `page.tsx` stays Server Component — metadata, Suspense shell only
- Push `'use client'` as far down the tree as possible

## Step 3: Design Domain Hooks

**Each feature area gets one domain hook.** The hook combines the React Query call and the Zustand selector. Components never import both `useQuery` and `useStore` directly.

```ts
// hooks/use-product-list.ts
export function useProductList() {
  const filters = useProductFilterStore((s) => s.filters)  // Zustand selector

  const { data, isPending } = useQuery({
    queryKey: productKeys.list(filters),   // key factory — see nextjs-query-key-factory
    queryFn: () => fetchProducts(filters),
    staleTime: 60_000,
    throwOnError: true,                    // propagates to nearest ErrorBoundary automatically
  })

  return { products: data ?? [], isPending }
}
```

**`throwOnError: true` vs manual throw:**

| | `throwOnError: true` | `if (isError) throw error` |
|---|---|---|
| Automatic propagation | ✅ | ❌ manual |
| Retries before throwing | ✅ | ✅ |
| Works with Suspense | ✅ | ❌ |

Use `throwOnError: true` unless you need custom throw logic.

## Step 4: Place ErrorBoundaries

```
Does this section have independent data from the rest of the page?
  YES → Wrap with <ErrorBoundary>
Does the whole route crash on error?
  YES → error.tsx handles it — no explicit ErrorBoundary needed
```

**Always wire `resetKeys` to the state that triggers a new fetch:**

`ErrorBoundary` with `resetKeys` must live in a **Client Component** — `page.tsx` is a Server Component and cannot read Zustand store. Create a wrapper:

```tsx
// _components/ProductListSection.tsx  ← 'use client'
export function ProductListSection() {
  const filters = useProductFilterStore((s) => s.filters)

  return (
    <ErrorBoundary
      FallbackComponent={ProductListError}
      resetKeys={[filters]}   // filters 변경 시 에러 경계 리셋 → 새 쿼리 실행
    >
      <ProductList />
    </ErrorBoundary>
  )
}
```

```tsx
// page.tsx  ← Server Component
export default function Page() {
  return <main><ProductListSection /></main>  // ErrorBoundary는 여기서 직접 쓰지 않음
}
```

`resetKeys={[]}` (empty array) is always wrong — the boundary never resets.

## Feature File Structure

```
app/[feature]/
  page.tsx                    # Server Component — metadata + Suspense shell
  error.tsx                   # Route-level error boundary (auto)
  loading.tsx                 # Route-level Suspense fallback (auto)
  _components/
    [Feature]Page.tsx         # 'use client' — ErrorBoundary placement + layout
    [Feature]List.tsx         # 'use client' — uses domain hook only
    [Feature]Filters.tsx      # 'use client' — Zustand store actions only
    [Feature]Card.tsx         # Server or Client — pure display

hooks/
  use-[feature].ts            # Domain hook: React Query + Zustand combined

store/
  [feature]-store.ts          # Zustand slice

lib/
  [feature]-keys.ts           # Query key factory
```

## Pre-Implementation Checklist

- [ ] Every state classified (API / global UI / URL / local)?
- [ ] Server vs Client split decided per component?
- [ ] One domain hook per feature area — no component imports both `useQuery` and `useStore`?
- [ ] `throwOnError: true` in `useQuery` options?
- [ ] `resetKeys` wired to state that triggers refetch?
- [ ] Query keys from key factory (`nextjs-query-key-factory`)?

## Sub-Skills

| Concern | Skill |
|---------|-------|
| State type decision | `nextjs-state-design` |
| React Query implementation | `nextjs-tanstack-query` |
| Zustand slice/selector | `nextjs-zustand` |
| ErrorBoundary placement | `nextjs-error-boundary` |
| Component API design | `nextjs-component-design` |
| Query key factory | `nextjs-query-key-factory` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Component imports both `useQuery` and `useStore` | Extract a domain hook |
| `resetKeys={[]}` | Wire to the state that triggers refetch |
| API data stored in Zustand | Use React Query cache; Zustand is for UI-only state |
| `'use client'` on `page.tsx` | page.tsx stays Server Component — push directive to leaf components |
| One giant hook for the whole page | One hook per feature area (list, filters, detail are separate) |
| `if (isError) throw error` | Use `throwOnError: true` in query options |
