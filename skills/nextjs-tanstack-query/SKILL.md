---
name: nextjs-tanstack-query
description: Use when a Client Component needs to fetch, cache, or mutate server data — when useEffect+useState fetching appears, when mutation needs cache invalidation, or when loading/error states are handled manually.
created: 2026-05-04
updated: 2026-05-04
---

# Next.js TanStack Query

## Overview
Replace manual `useEffect + useState` data fetching with TanStack Query v5. Handles caching, background refetching, loading/error states, and mutations with cache synchronization.

> **v4 → v5 changes:** `isLoading` → `isPending`, `suspense: true` option removed → use `useSuspenseQuery`, `cacheTime` → `gcTime`

## When to Use TanStack Query

```
Is this server (API/DB) data?
  YES → Is it in a Client Component?
          YES → Use TanStack Query
          NO  → Fetch directly in a Server Component (TanStack Query not needed)
  NO  → Use Zustand / useState / URL state (see nextjs-state-design)
```

**Note:** Next.js Server Components fetch data directly without TanStack Query. TanStack Query is for Client Components only.

## Enforcement Rules

| Pattern | Rationale | Allowed Exceptions |
|---------|-----------|-------------------|
| Always specify `staleTime` | Default of 0 triggers refetch on every focus → unnecessary network requests | Real-time data (stocks, chat) may use `staleTime: 0` |
| `queryKey` must always be an array | String keys cannot be scoped for targeted invalidation | - |
| `invalidateQueries` or `setQueryData` after mutation | Without it, the UI keeps showing stale data | Fire-and-forget mutations (analytics, logging) may omit it |
| `isPending` + `isError` states must be handled | Unhandled states cause blank screens or silent failures | May be omitted when only mock data is used in Storybook/tests |
| Optimistic update: `onMutate` + `onError` rollback pair | Optimistic updates without rollback cause data inconsistencies | Rollback may be omitted when brief inconsistency is acceptable (e.g., likes, view counts) |

## 1. useQuery — Basic Data Fetching

```tsx
'use client'
import { useQuery } from '@tanstack/react-query'

function ProductDetail({ id }: { id: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['products', 'detail', id],  // always an array
    queryFn: () => fetchProduct(id),
    staleTime: 60 * 1000,                  // always specified
  })

  if (isPending) return <Skeleton />       // v4: isLoading
  if (isError) return <ErrorMessage />

  return <div>{data.name}</div>
}
```

## 2. useMutation + Cache Invalidation

```tsx
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function UpdateProductForm({ id }: { id: string }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: UpdateProductInput) => updateProduct(id, data),
    onSuccess: () => {
      // Option A: refetch latest data from server
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', id] })
      // Option B: update cache directly (no refetch)
      // queryClient.setQueryData(['products', 'detail', id], updatedData)
    },
  })

  return (
    <button
      onClick={() => mutation.mutate({ name: 'New Name' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Saving...' : 'Save'}
    </button>
  )
}
```

## 3. Optimistic Update

```tsx
const mutation = useMutation({
  mutationFn: (liked: boolean) => toggleLike(postId, liked),
  onMutate: async (liked) => {
    // 1. Cancel in-flight queries so they don't overwrite the optimistic update
    await queryClient.cancelQueries({ queryKey: ['posts', 'detail', postId] })
    // 2. Snapshot the previous value for rollback
    const previous = queryClient.getQueryData(['posts', 'detail', postId])
    // 3. Immediately update the cache
    queryClient.setQueryData(['posts', 'detail', postId], (old: Post) => ({
      ...old,
      liked,
      likeCount: liked ? old.likeCount + 1 : old.likeCount - 1,
    }))
    return { previous }
  },
  onError: (_err, _liked, context) => {
    // Roll back to the previous value on failure
    queryClient.setQueryData(['posts', 'detail', postId], context?.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'detail', postId] })
  },
})
```

**Exception:** When brief inconsistency is acceptable (e.g., likes, view counts), `onSuccess` invalidation alone may be used without `onMutate`/`onError`.

## 4. Suspense Integration (v5)

```tsx
// v5: use useSuspenseQuery hook instead of the suspense: true option
import { useSuspenseQuery } from '@tanstack/react-query'

function ProductList() {
  const { data } = useSuspenseQuery({   // throws a Promise while loading
    queryKey: ['products', 'list'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
  })
  return <ul>{data.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// Wrap with Suspense in the parent
<Suspense fallback={<ProductListSkeleton />}>
  <ProductList />
</Suspense>
```

## 5. SSR Prefetch (Server Component → Client Component)

```tsx
// app/products/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export default async function ProductsPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['products', 'list'],
    queryFn: fetchProducts,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />  {/* Client Component — starts with the cache already populated */}
    </HydrationBoundary>
  )
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Data fetching with `useEffect + useState` | Replace with `useQuery` |
| Using `isLoading` in v5 | Use `isPending` — `isLoading` is `isPending && !isPlaceholderData` |
| Creating `new QueryClient()` inside a component | Use the singleton in `app/providers.tsx` |
| Using `suspense: true` option in v5 | Replace with the `useSuspenseQuery` hook |
| `staleTime` not set | Always set it — the default of 0 causes excessive refetching |
| No invalidation after mutation | Call `invalidateQueries` in `onSuccess` |
