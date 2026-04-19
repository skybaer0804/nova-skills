---
name: nextjs-state-design
description: Use when a Next.js feature requires state management decisions — choosing between server state, client state, URL state, or deciding where state should live in the component tree.
---

# Next.js State Design

## Overview
Choose the right state type and location before implementing. Wrong state placement causes prop drilling, stale data, or unnecessary re-renders.

## Step 1: Classify the State

```
Is this data from the server (API/DB)?
  YES → Server State (React Query / SWR)
  NO  → Is it shared across multiple routes?
          YES → Global Client State (Zustand / Context)
          NO  → Is it reflected in the URL? (filters, pagination, tabs)
                  YES → URL State (useSearchParams)
                  NO  → Local State (useState / useReducer)
```

## Step 2: State Type Guide

### Server State — React Query / SWR
Use when: data comes from an API and needs caching, refetching, or optimistic updates.

```tsx
// React Query
const { data, isLoading } = useQuery({
  queryKey: ['product', id],
  queryFn: () => fetchProduct(id),
  staleTime: 60 * 1000, // don't refetch for 1 min
})

// Mutation with optimistic update
const mutation = useMutation({
  mutationFn: updateProduct,
  onMutate: async (newData) => { /* optimistic */ },
  onError: (err, _, context) => { /* rollback */ },
})
```

**Note:** Next.js Server Components fetch data directly — no React Query needed there. Use React Query only in Client Components that need live updates.

### URL State — useSearchParams
Use when: state should survive refresh, be shareable via URL, or affect SEO.

```tsx
'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const searchParams = useSearchParams()
const router = useRouter()
const pathname = usePathname()

const setFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams)
  params.set(key, value)
  router.push(`${pathname}?${params.toString()}`)
}
```

Good for: filters, sort order, pagination, active tab, search query.

### Global Client State — Zustand
Use when: state is shared across unrelated components and doesn't come from server.

```tsx
// store.ts
import { create } from 'zustand'

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
}))
```

Good for: cart, auth user info, UI preferences, notifications.

### Local State — useState / useReducer
Use when: state is confined to one component or its direct children.

Use `useReducer` over multiple `useState` when:
- 3+ related state values change together
- Next state depends on previous state in complex ways

## Step 3: State Location Rules

| Rule | Why |
|------|-----|
| Lift state to lowest common ancestor | Avoids unnecessary global state |
| Don't put server data in global store | Creates sync issues — use React Query cache instead |
| Don't put URL-worthy state in useState | Users lose state on refresh |
| Colocate state with the component that owns it | Easier to delete when feature is removed |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Fetching in useEffect + useState | Use React Query / SWR |
| Zustand for every piece of state | Default to `useState`, escalate only when needed |
| Storing derived data in state | Compute it inline or with `useMemo` |
| Context for high-frequency updates | Context re-renders all consumers — use Zustand |
