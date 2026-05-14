---
name: nextjs-query-key-factory
description: Use when query keys are scattered as inline strings or arrays, when cache invalidation scope needs precise control, when setting up QueryClient for a new project, or when tests share cache state between cases.
created: 2026-05-04
updated: 2026-05-04
---

# Next.js Query Key Factory

## Overview
Centralize cache keys with the Query Key Factory pattern and configure QueryClient as a singleton. Prevents cache key collisions, enables hierarchical invalidation, and ensures consistent cache behavior.

## When to Use

- Query keys are scattered as inline strings/arrays in 3 or more places
- Need to invalidate "all queries related to a user" at once
- Setting up TanStack Query for the first time in a new Next.js project
- Cache state is shared between tests

**Exception:** If the entire app has fewer than 3 queries, inline `['entity', id]` arrays are allowed — Factory is over-engineering.

## Enforcement Rules

| Pattern | Rationale | Allowed Exceptions |
|---------|-----------|-------------------|
| Define all keys in a central Factory file | Scattered keys cause cache bugs from typos and mismatches | Fewer than 3 queries across the entire app |
| Hierarchy: `all` → `lists` → `detail(id)` | Invalidating a parent key invalidates all children | - |
| Create `QueryClient` singleton in `app/providers.tsx` | Creating inside a component generates a new instance on every re-render → cache lost | Test files must create a new instance per test (cache isolation) |
| Set `staleTime` and `retry` globally in `defaultOptions` | Prevents repetitive configuration per query | Override at query level when a specific query needs different values |

## 1. Key Factory Pattern

```ts
// lib/query-keys.ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), { filters }] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
}
```

**Usage examples:**
```ts
// Fetch a specific user
useQuery({ queryKey: userKeys.detail(userId), queryFn: () => getUser(userId) })

// Invalidate all user-related cache (both list + detail)
queryClient.invalidateQueries({ queryKey: userKeys.all })

// Invalidate user list only (excludes detail)
queryClient.invalidateQueries({ queryKey: userKeys.lists() })

// Invalidate a specific user only
queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) })
```

## 2. QueryClient Singleton — app/providers.tsx

```tsx
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,          // default 1 min — overridable per query
        retry: 1,                       // retry once on failure
        refetchOnWindowFocus: false,    // disable auto refetch on focus
      },
    },
  })
}

// Server: new instance per request / Client: create once and reuse
let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## 3. Test Environment — Instance Isolation

```tsx
// Test file: create a new QueryClient per test for cache isolation
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },     // disable retries in tests
      mutations: { retry: false },
    },
  })
}

export function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()  // new instance per test
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Inline `['users', id]` scattered across files | Centralize in `lib/query-keys.ts` |
| `invalidateQueries({ queryKey: ['users'] })` fails to invalidate `['users', 'list']` | Use Factory: `userKeys.all` matches all child keys |
| `new QueryClient()` inside a component | Move to `providers.tsx` |
| All tests sharing a single QueryClient | Isolate per test with `createTestQueryClient()` |
| `staleTime` not set in `defaultOptions` | Control defaults with global configuration |
