---
name: nextjs-tanstack-query
description: Use when a Client Component needs to fetch, cache, or mutate server data — when useEffect+useState fetching appears, when mutation needs cache invalidation, or when loading/error states are handled manually.
created: 2026-05-04
updated: 2026-05-04
---

# Next.js TanStack Query

## Overview
Replace manual `useEffect + useState` data fetching with TanStack Query v5. Handles caching, background refetching, loading/error states, and mutations with cache synchronization.

> **v4 → v5 변경사항:** `isLoading` → `isPending`, `suspense: true` 옵션 제거 → `useSuspenseQuery`, `cacheTime` → `gcTime`

## When to Use TanStack Query

```
서버(API/DB) 데이터인가?
  YES → Client Component인가?
          YES → TanStack Query 사용
          NO  → Server Component에서 직접 fetch (TanStack Query 불필요)
  NO  → Zustand / useState / URL state 사용 (nextjs-state-design 참조)
```

**주의:** Next.js Server Component는 TanStack Query 없이 직접 데이터를 fetch한다. TanStack Query는 Client Component 전용이다.

## Enforcement Rules

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| `staleTime` 항상 명시 | 기본값 0은 매 포커스마다 리페칭 → 불필요한 네트워크 요청 | 실시간 데이터(주식, 채팅)는 `staleTime: 0` 허용 |
| `queryKey`는 항상 배열 | 문자열 key는 범위 지정 무효화 불가 | - |
| mutation 후 `invalidateQueries` 또는 `setQueryData` | 없으면 UI가 stale 데이터를 계속 표시 | fire-and-forget mutation(분석, 로깅)은 생략 가능 |
| `isPending` + `isError` 상태 처리 필수 | 미처리 시 빈 화면 또는 조용한 실패 | Storybook/테스트에서 mock 데이터만 사용 시 생략 가능 |
| Optimistic update: `onMutate` + `onError` rollback 쌍 | rollback 없는 optimistic update는 데이터 불일치 유발 | 좋아요/조회수처럼 잠깐의 불일치가 허용되는 경우 rollback 생략 가능 |

## 1. useQuery — 기본 데이터 페칭

```tsx
'use client'
import { useQuery } from '@tanstack/react-query'

function ProductDetail({ id }: { id: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['products', 'detail', id],  // 항상 배열
    queryFn: () => fetchProduct(id),
    staleTime: 60 * 1000,                  // 항상 명시
  })

  if (isPending) return <Skeleton />       // v4: isLoading
  if (isError) return <ErrorMessage />

  return <div>{data.name}</div>
}
```

## 2. useMutation + 캐시 무효화

```tsx
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function UpdateProductForm({ id }: { id: string }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: UpdateProductInput) => updateProduct(id, data),
    onSuccess: () => {
      // Option A: 서버에서 최신 데이터 리페칭
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', id] })
      // Option B: 캐시를 직접 업데이트 (리페칭 없음)
      // queryClient.setQueryData(['products', 'detail', id], updatedData)
    },
  })

  return (
    <button
      onClick={() => mutation.mutate({ name: 'New Name' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? '저장 중...' : '저장'}
    </button>
  )
}
```

## 3. Optimistic Update

```tsx
const mutation = useMutation({
  mutationFn: (liked: boolean) => toggleLike(postId, liked),
  onMutate: async (liked) => {
    // 1. 진행 중인 쿼리를 취소해 optimistic update가 덮어써지지 않게 함
    await queryClient.cancelQueries({ queryKey: ['posts', 'detail', postId] })
    // 2. rollback을 위해 이전 값 스냅샷
    const previous = queryClient.getQueryData(['posts', 'detail', postId])
    // 3. 즉시 캐시 업데이트
    queryClient.setQueryData(['posts', 'detail', postId], (old: Post) => ({
      ...old,
      liked,
      likeCount: liked ? old.likeCount + 1 : old.likeCount - 1,
    }))
    return { previous }
  },
  onError: (_err, _liked, context) => {
    // 실패 시 이전 값으로 롤백
    queryClient.setQueryData(['posts', 'detail', postId], context?.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts', 'detail', postId] })
  },
})
```

**예외:** 좋아요/조회수처럼 잠깐의 불일치가 허용되는 경우 `onMutate`/`onError` 없이 `onSuccess` invalidation만 사용 가능.

## 4. Suspense 연동 (v5)

```tsx
// v5: suspense: true 옵션 대신 useSuspenseQuery 훅 사용
import { useSuspenseQuery } from '@tanstack/react-query'

function ProductList() {
  const { data } = useSuspenseQuery({   // 로딩 중 Promise를 throw
    queryKey: ['products', 'list'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
  })
  return <ul>{data.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// 상위에서 Suspense로 감싸기
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
      <ProductList />  {/* Client Component — 캐시가 미리 채워진 상태로 시작 */}
    </HydrationBoundary>
  )
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `useEffect + useState`로 데이터 페칭 | `useQuery`로 교체 |
| v5에서 `isLoading` 사용 | `isPending` 사용 — `isLoading`은 `isPending && !isPlaceholderData` |
| 컴포넌트 내부에서 `new QueryClient()` 생성 | `app/providers.tsx` 싱글톤 사용 |
| v5에서 `suspense: true` 옵션 | `useSuspenseQuery` 훅으로 교체 |
| `staleTime` 미설정 | 항상 설정 — 기본값 0은 과도한 리페칭 유발 |
| mutation 후 invalidation 없음 | `onSuccess`에서 `invalidateQueries` 호출 |
