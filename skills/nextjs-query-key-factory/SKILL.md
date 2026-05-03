---
name: nextjs-query-key-factory
description: Use when query keys are scattered as inline strings or arrays, when cache invalidation scope needs precise control, when setting up QueryClient for a new project, or when tests share cache state between cases.
---

# Next.js Query Key Factory

## Overview
Query Key Factory 패턴으로 캐시 키를 중앙화하고, QueryClient를 싱글톤으로 설정한다. 캐시 키 충돌 방지, 계층적 무효화, 일관된 캐시 동작을 보장한다.

## When to Use

- query key가 인라인 문자열/배열로 3곳 이상 흩어진 경우
- "유저 관련 쿼리 전체" 무효화가 필요한 경우
- 새 Next.js 프로젝트에서 TanStack Query 초기 설정 시
- 테스트 간 캐시 상태가 공유되는 경우

**예외:** 앱 전체 쿼리가 3개 미만이면 인라인 `['entity', id]` 배열 허용 — Factory는 과잉 설계.

## Enforcement Rules

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| 모든 key를 중앙 Factory 파일에 정의 | 흩어진 key는 오타·불일치로 캐시 버그 유발 | 앱 전체 쿼리 3개 미만 |
| 계층 구조: `all` → `lists` → `detail(id)` | 상위 key 무효화 시 하위 전체 무효화 | - |
| `QueryClient` 싱글톤을 `app/providers.tsx`에서 생성 | 컴포넌트 내부 생성 시 리렌더마다 새 인스턴스 → 캐시 소실 | 테스트 파일은 테스트마다 새 인스턴스 필수 (캐시 격리) |
| `defaultOptions`에 `staleTime`, `retry` 전역 설정 | 쿼리마다 반복 설정 방지 | 특정 쿼리에 다른 값 필요 시 쿼리 레벨에서 오버라이드 허용 |

## 1. Key Factory 패턴

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

**사용 예시:**
```ts
// 특정 유저 페칭
useQuery({ queryKey: userKeys.detail(userId), queryFn: () => getUser(userId) })

// 유저 관련 캐시 전체 무효화 (list + detail 모두)
queryClient.invalidateQueries({ queryKey: userKeys.all })

// 유저 목록만 무효화 (detail 제외)
queryClient.invalidateQueries({ queryKey: userKeys.lists() })

// 특정 유저만 무효화
queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) })
```

## 2. QueryClient 싱글톤 — app/providers.tsx

```tsx
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,          // 기본 1분 — 쿼리별 오버라이드 가능
        retry: 1,                       // 실패 시 1회 재시도
        refetchOnWindowFocus: false,    // 포커스 시 자동 리페칭 비활성화
      },
    },
  })
}

// 서버: 요청마다 새 인스턴스 / 클라이언트: 한 번 생성 후 재사용
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

## 3. 테스트 환경 — 인스턴스 격리

```tsx
// 테스트 파일: 캐시 격리를 위해 매 테스트마다 새 QueryClient 생성
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },     // 테스트에서 재시도 비활성화
      mutations: { retry: false },
    },
  })
}

export function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()  // 테스트마다 새 인스턴스
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 파일 곳곳에 인라인 `['users', id]` | `lib/query-keys.ts`에 중앙화 |
| `invalidateQueries({ queryKey: ['users'] })`가 `['users', 'list']`를 무효화 못 함 | Factory 사용: `userKeys.all`은 모든 하위 키 매칭 |
| 컴포넌트 내부에서 `new QueryClient()` | `providers.tsx`로 이동 |
| 모든 테스트가 QueryClient 하나를 공유 | `createTestQueryClient()`로 테스트마다 격리 |
| `defaultOptions`에 `staleTime` 미설정 | 전역 설정으로 기본값 통제 |
