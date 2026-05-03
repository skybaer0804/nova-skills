# Nova Skills — 신규 스킬 5개 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nova-skills에 TanStack Query, Query Key Factory, Design System Tokens, Zustand 스킬을 신규 추가하고 Error Boundary 스킬을 교체한다.

**Architecture:** 각 스킬은 `skills/<skill-name>/SKILL.md` 단일 파일. YAML frontmatter(name, description) + 결정 우선 포맷(트리거 → 강제 패턴 테이블 → 코드 예시 → 흔한 실수). 모든 강제 패턴은 예외 허용 케이스를 함께 명시한다.

**Tech Stack:** Markdown, YAML frontmatter, TanStack Query v5, Zustand v4, Tailwind CSS v3, Next.js 15 App Router

---

## File Map

| 작업 | 경로 |
|------|------|
| CREATE | `skills/nextjs-tanstack-query/SKILL.md` |
| CREATE | `skills/nextjs-query-key-factory/SKILL.md` |
| CREATE | `skills/nextjs-design-system-tokens/SKILL.md` |
| REPLACE | `skills/nextjs-error-boundary/SKILL.md` |
| CREATE | `skills/nextjs-zustand/SKILL.md` |
| MODIFY | `skills/nextjs-state-design/SKILL.md` (Zustand 크로스레퍼런스 추가) |
| MODIFY | `README.md` (신규 스킬 4개 추가, v1.3.0) |

---

## Task 1: nextjs-tanstack-query 스킬

**Files:**
- Create: `skills/nextjs-tanstack-query/SKILL.md`

- [ ] **Step 1: 디렉터리 생성 및 파일 작성**

```bash
mkdir -p skills/nextjs-tanstack-query
```

`skills/nextjs-tanstack-query/SKILL.md` 전체 내용:

````markdown
---
name: nextjs-tanstack-query
description: Use when a Client Component needs to fetch, cache, or mutate server data — when useEffect+useState fetching appears, when mutation needs cache invalidation, or when loading/error states are handled manually.
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
````

- [ ] **Step 2: 파일 구조 검증**

```bash
grep -q "^name: nextjs-tanstack-query" skills/nextjs-tanstack-query/SKILL.md && echo "✓ name" || echo "✗ name"
grep -q "^description:" skills/nextjs-tanstack-query/SKILL.md && echo "✓ description" || echo "✗ description"
grep -q "## Enforcement Rules" skills/nextjs-tanstack-query/SKILL.md && echo "✓ enforcement rules" || echo "✗ enforcement rules"
grep -q "## Common Mistakes" skills/nextjs-tanstack-query/SKILL.md && echo "✓ common mistakes" || echo "✗ common mistakes"
```

Expected: 모두 `✓`

- [ ] **Step 3: 커밋**

```bash
git add skills/nextjs-tanstack-query/SKILL.md
git commit -m "feat: add nextjs-tanstack-query skill (v5 기준)"
```

---

## Task 2: nextjs-query-key-factory 스킬

**Files:**
- Create: `skills/nextjs-query-key-factory/SKILL.md`

- [ ] **Step 1: 디렉터리 생성 및 파일 작성**

```bash
mkdir -p skills/nextjs-query-key-factory
```

`skills/nextjs-query-key-factory/SKILL.md` 전체 내용:

````markdown
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
````

- [ ] **Step 2: 파일 구조 검증**

```bash
grep -q "^name: nextjs-query-key-factory" skills/nextjs-query-key-factory/SKILL.md && echo "✓ name" || echo "✗ name"
grep -q "^description:" skills/nextjs-query-key-factory/SKILL.md && echo "✓ description" || echo "✗ description"
grep -q "Key Factory" skills/nextjs-query-key-factory/SKILL.md && echo "✓ key factory section" || echo "✗ key factory section"
grep -q "providers.tsx" skills/nextjs-query-key-factory/SKILL.md && echo "✓ providers section" || echo "✗ providers section"
```

Expected: 모두 `✓`

- [ ] **Step 3: 커밋**

```bash
git add skills/nextjs-query-key-factory/SKILL.md
git commit -m "feat: add nextjs-query-key-factory skill (Key Factory + QueryClient 인스턴스화)"
```

---

## Task 3: nextjs-design-system-tokens 스킬

**Files:**
- Create: `skills/nextjs-design-system-tokens/SKILL.md`

- [ ] **Step 1: 디렉터리 생성 및 파일 작성**

```bash
mkdir -p skills/nextjs-design-system-tokens
```

`skills/nextjs-design-system-tokens/SKILL.md` 전체 내용:

````markdown
---
name: nextjs-design-system-tokens
description: Use when building a design system from scratch, migrating Figma tokens to code, structuring primitive and semantic token layers, or setting up theme switching (dark mode, brand variants).
---

# Next.js Design System Tokens

## Overview
3계층 토큰 시스템으로 디자인 시스템을 설계한다: **Primitive → Semantic → Component**. 컴포넌트는 Semantic 토큰만 참조하므로 테마 변경 시 컴포넌트 코드를 건드리지 않아도 된다.

## 3계층 구조

```
Primitive   원시값. 컴포넌트에서 직접 사용 금지.
  └─ Semantic   목적 기반 별칭. 컴포넌트가 참조하는 토큰.
       └─ Component  컴포넌트 전용 오버라이드 (꼭 필요한 경우만).
```

| 계층 | 예시 | 변경 주체 |
|------|------|-----------|
| Primitive | `gray-500: #6B7280` | 디자이너 |
| Semantic | `text-secondary: gray-500` | 디자이너 + 개발자 |
| Component | `input-placeholder: text-secondary` | 개발자 |

## Enforcement Rules

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| 컴포넌트 코드에서 primitive 직접 참조 금지 | primitive 변경 시 모든 컴포넌트를 수동으로 교체해야 함 | 프로토타입/스파이크 코드는 허용 — `// temp` 주석 필수, PR 전 정리 |
| Semantic token은 CSS 변수로 정의 (`--color-*`) | Tailwind config만으로는 런타임 테마 전환 불가 | 테마 전환 없는 소규모 정적 앱은 `tailwind.config` 확장만으로 허용 |
| Token 이름은 목적 기반 (`--color-surface-danger`) | 색상 기반 이름(`--color-red`)은 다크모드에서 의미가 역전됨 | - |
| shadcn/ui 사용 시 `globals.css` CSS 변수 우선 확장 | shadcn 컴포넌트가 CSS 변수에 의존 — 별도 시스템 추가 시 충돌 | - |

## 1. Primitive 토큰

원시값만 정의. 헥스 코드가 나타나는 유일한 곳.

```css
/* styles/tokens/primitive.css */
:root {
  --primitive-gray-50:   #F9FAFB;
  --primitive-gray-100:  #F3F4F6;
  --primitive-gray-200:  #E5E7EB;
  --primitive-gray-300:  #D1D5DB;
  --primitive-gray-400:  #9CA3AF;
  --primitive-gray-500:  #6B7280;
  --primitive-gray-900:  #111827;

  --primitive-blue-500:  #3B82F6;
  --primitive-blue-600:  #2563EB;

  --primitive-red-500:   #EF4444;
  --primitive-green-500: #22C55E;

  --primitive-space-1: 0.25rem;
  --primitive-space-2: 0.5rem;
  --primitive-space-4: 1rem;
  --primitive-space-6: 1.5rem;
}
```

## 2. Semantic 토큰

Primitive를 목적에 매핑. 라이트/다크 모드 모두 여기서 정의.

```css
/* styles/tokens/semantic.css */
:root {
  --color-text-primary:    var(--primitive-gray-900);
  --color-text-secondary:  var(--primitive-gray-500);
  --color-text-disabled:   var(--primitive-gray-300);
  --color-text-on-primary: #ffffff;

  --color-surface-default: #ffffff;
  --color-surface-subtle:  var(--primitive-gray-50);
  --color-surface-danger:  var(--primitive-red-500);
  --color-surface-success: var(--primitive-green-500);

  --color-border-default:  var(--primitive-gray-200);
  --color-border-focus:    var(--primitive-blue-500);

  --space-component-sm: var(--primitive-space-2);
  --space-component-md: var(--primitive-space-4);
  --space-component-lg: var(--primitive-space-6);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary:    var(--primitive-gray-50);
    --color-text-secondary:  var(--primitive-gray-400);
    --color-surface-default: var(--primitive-gray-900);
    --color-surface-subtle:  var(--primitive-gray-800);
    --color-border-default:  var(--primitive-gray-700);
  }
}
```

## 3. Tailwind 연동

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'text-primary':    'var(--color-text-primary)',
        'text-secondary':  'var(--color-text-secondary)',
        'text-disabled':   'var(--color-text-disabled)',
        'surface-default': 'var(--color-surface-default)',
        'surface-subtle':  'var(--color-surface-subtle)',
        'surface-danger':  'var(--color-surface-danger)',
        'border-default':  'var(--color-border-default)',
        'border-focus':    'var(--color-border-focus)',
      },
      spacing: {
        'component-sm': 'var(--space-component-sm)',
        'component-md': 'var(--space-component-md)',
        'component-lg': 'var(--space-component-lg)',
      },
    },
  },
}
export default config
```

```tsx
// ✅ 컴포넌트에서 semantic 클래스 사용
<p className="text-text-secondary">보조 텍스트</p>
<div className="bg-surface-subtle border border-border-default p-component-md">...</div>

// ❌ 컴포넌트에서 primitive 직접 참조 금지
<p className="text-gray-500">보조 텍스트</p>
```

## 4. shadcn/ui 프로젝트

shadcn/ui는 자체 CSS 변수 시스템을 사용한다. 별도 시스템을 만들지 말고 확장한다.

```css
/* app/globals.css — shadcn 변수 확장, 별도 시스템 생성 금지 */
:root {
  /* shadcn 기본 변수 (shadcn init으로 이미 정의됨) */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --primary: 221.2 83.2% 53.3%;
  --destructive: 0 84.2% 60.2%;

  /* 추가 semantic 토큰 — shadcn의 HSL 형식 사용 */
  --surface-brand: 221.2 83.2% 53.3%;
  --color-success: 142.1 76.2% 36.3%;
}
```

```tsx
// shadcn 토큰 사용
<p className="text-muted-foreground">보조 텍스트</p>
<div className="bg-background border-border">...</div>
```

## 5. 새 토큰 추가 체크리스트

값이 2곳 이상 반복되고 기존 토큰이 없을 때:

- [ ] Primitive에 원시값이 있는가? 없으면 `primitive.css`에 추가
- [ ] 목적 기반 이름인가? (색상 기반 아님)
- [ ] `semantic.css`에 라이트 + 다크 값 정의
- [ ] `tailwind.config.ts`에 Tailwind 매핑 추가
- [ ] 하드코딩된 모든 기존 값 교체 (`nextjs-design-token-consistency` 스킬로 감사)

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 프로젝트에 `text-text-secondary`가 있는데 `text-gray-500` 사용 | 항상 semantic 토큰 사용 |
| `--color-red-danger` 같은 색상 기반 이름 | `--color-surface-danger`로 — 목적 기반 이름 |
| CSS 변수 시스템과 Tailwind 확장이 공존 | 하나의 시스템으로 통일 |
| shadcn 프로젝트에 별도 `tokens.css` 생성 | `globals.css`의 변수 확장 |
| 다크모드 색상을 컴포넌트마다 하드코딩 | Semantic 계층에서 `@media` 블록으로 정의 |
````

- [ ] **Step 2: 파일 구조 검증**

```bash
grep -q "^name: nextjs-design-system-tokens" skills/nextjs-design-system-tokens/SKILL.md && echo "✓ name" || echo "✗ name"
grep -q "Primitive" skills/nextjs-design-system-tokens/SKILL.md && echo "✓ primitive section" || echo "✗ primitive section"
grep -q "Semantic" skills/nextjs-design-system-tokens/SKILL.md && echo "✓ semantic section" || echo "✗ semantic section"
grep -q "shadcn" skills/nextjs-design-system-tokens/SKILL.md && echo "✓ shadcn section" || echo "✗ shadcn section"
```

Expected: 모두 `✓`

- [ ] **Step 3: 커밋**

```bash
git add skills/nextjs-design-system-tokens/SKILL.md
git commit -m "feat: add nextjs-design-system-tokens skill (3계층 토큰 설계)"
```

---

## Task 4: nextjs-error-boundary 스킬 교체

**Files:**
- Replace: `skills/nextjs-error-boundary/SKILL.md`

- [ ] **Step 1: 파일 전체 교체**

`skills/nextjs-error-boundary/SKILL.md` 전체 내용으로 교체:

````markdown
---
name: nextjs-error-boundary
description: Use when a runtime error crashes a route segment, when error.tsx or global-error.tsx is absent, when an uncaught exception takes down the whole page, or when a widget should fail without affecting sibling components.
---

# Next.js Error Boundary

## Overview

React Error Boundary는 **렌더 단계 오류만** 잡는다. 이벤트 핸들러, 비동기 코드(`setTimeout`, `fetch`)의 오류는 잡지 못한다.

**Error Boundary가 잡지 못하는 오류:**
- 이벤트 핸들러 오류 → 핸들러 내부에서 `try/catch` 사용
- 비동기 오류 (`setTimeout`, `fetch`) → `try/catch` + `nextjs-error-logging` 참조
- 서버 사이드 렌더링 오류 → Next.js가 처리 후 `error.tsx`에 전달

## 어떤 Boundary를 사용할지

```
오류가 어디서 발생하는가?
  라우트 전체 충돌         → 해당 라우트 디렉터리의 error.tsx
  루트 레이아웃 충돌       → app/global-error.tsx
  비동기 Server Component  → error.tsx + Suspense 경계
  특정 위젯만 격리         → 커스텀 <ErrorBoundary> 컴포넌트
  이벤트 핸들러 / 비동기   → try/catch (Error Boundary 아님)
```

## Enforcement Rules

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| 데이터 페칭하는 모든 라우트에 `error.tsx` 필수 | 서버 오류 시 흰 화면 방지 | 데이터 페칭 없는 정적 페이지는 생략 가능 |
| `app/global-error.tsx` 루트에 필수 | 루트 레이아웃 충돌의 마지막 방어선 | - |
| `error.tsx`는 반드시 `'use client'` | Next.js 요구사항 — 누락 시 빌드 오류 | - |
| `reset()` 버튼 항상 제공 | 전체 새로고침 없이 사용자 복구 가능 | 복구 불가능한 오류(인증 만료)는 `redirect()` 대체 허용 |
| 커스텀 `ErrorBoundary`: `getDerivedStateFromError` + `componentDidCatch` 쌍 | `componentDidCatch`에서 로깅 연동 가능 | 로깅 불필요 시 `getDerivedStateFromError`만 허용 |
| prod에서 `error.message` 노출 금지 | 스택 트레이스 노출은 보안 위험 | `process.env.NODE_ENV === 'development'` 가드 허용 |

## 1. 라우트 레벨: error.tsx

```tsx
// app/(route)/error.tsx
'use client'  // 필수

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div role="alert" aria-live="assertive" className="flex flex-col items-center gap-4 py-12">
      <h2 className="text-lg font-semibold">문제가 발생했습니다</h2>
      <p className="text-sm text-muted-foreground">
        {process.env.NODE_ENV === 'development'
          ? error.message
          : '잠시 후 다시 시도해 주세요'}
      </p>
      <button
        onClick={reset}
        className="rounded px-4 py-2 bg-primary text-primary-foreground text-sm"
      >
        다시 시도
      </button>
    </div>
  )
}
```

`error.digest` — Next.js가 서버/클라이언트 오류를 연결하기 위해 생성하는 해시. 로깅에 사용하고 UI에 노출하지 않는다.

## 2. 루트 레벨: global-error.tsx

```tsx
// app/global-error.tsx
'use client'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    // 루트 레이아웃이 교체되므로 반드시 <html>/<body> 포함
    <html lang="ko">
      <body className="flex items-center justify-center min-h-screen">
        <div role="alert" className="text-center space-y-4">
          <h1 className="text-xl font-bold">서비스를 일시적으로 이용할 수 없습니다</h1>
          <button
            onClick={reset}
            className="rounded px-4 py-2 bg-primary text-primary-foreground text-sm"
          >
            새로고침
          </button>
        </div>
      </body>
    </html>
  )
}
```

## 3. 커스텀 ErrorBoundary 컴포넌트

형제 컴포넌트에 영향을 주지 않고 특정 위젯만 격리할 때 사용.

```tsx
// components/ui/error-boundary.tsx
'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  fallback?: ReactNode
  children: ReactNode
  onError?: (error: Error, info: { componentStack: string }) => void
}

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.props.onError?.(error, info)  // 로깅 연동 포인트
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" className="p-4 text-sm text-destructive border border-destructive/20 rounded">
          이 섹션을 불러오지 못했습니다
        </div>
      )
    }
    return this.props.children
  }
}
```

```tsx
// 사용: 위젯 격리
<ErrorBoundary
  fallback={<WidgetSkeleton />}
  onError={(error) => logError(error)}
>
  <DashboardWidget />
</ErrorBoundary>
```

## 4. Suspense + ErrorBoundary 조합

비동기 Server Component의 스트리밍 중 오류를 처리할 때:

```tsx
// Suspense: 로딩 처리 / ErrorBoundary: 오류 처리
<ErrorBoundary fallback={<WidgetError />}>
  <Suspense fallback={<WidgetSkeleton />}>
    <AsyncWidget />  {/* async Server Component */}
  </Suspense>
</ErrorBoundary>
```

## 5. react-error-boundary 라이브러리 (선택)

클래스 컴포넌트 대신 선언형 API를 원할 경우:

```tsx
import { ErrorBoundary } from 'react-error-boundary'

<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div role="alert">
      <p className="text-sm text-destructive">
        {process.env.NODE_ENV === 'development' ? error.message : '오류가 발생했습니다'}
      </p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  )}
  onError={(error, info) => logError(error, info)}
>
  <ComponentThatMayFail />
</ErrorBoundary>
```

`useErrorBoundary()` 훅으로 비동기 코드에서 Error Boundary를 프로그래밍 방식으로 트리거할 수 있다.

## 6. 이벤트 핸들러 오류 (Boundary가 잡지 못함)

```tsx
// ❌ ErrorBoundary가 잡지 못함
<button onClick={() => {
  throw new Error('Error Boundary가 이 오류를 잡지 못한다')
}}>

// ✅ try/catch로 직접 처리
<button onClick={() => {
  try {
    riskyOperation()
  } catch (error) {
    setErrorState(error)  // 또는 logError(error)
  }
}}>
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `error.tsx`에 `'use client'` 누락 | 첫 줄에 추가 — 필수 |
| `global-error.tsx`에 `<html>/<body>` 누락 | 루트 레이아웃이 교체됨 — 전체 HTML 셸 필요 |
| prod에서 `error.message` 노출 | `process.env.NODE_ENV === 'development'` 가드 추가 |
| reset 버튼 없음 | 항상 사용자 복구 경로 제공 |
| 비동기 오류에 ErrorBoundary 사용 | `try/catch` 사용 — Boundary는 렌더 오류만 처리 |
| `error.digest`를 UI에 표시 | 서버 사이드 로그에만 사용 |
````

- [ ] **Step 2: 파일 구조 검증**

```bash
grep -q "^name: nextjs-error-boundary" skills/nextjs-error-boundary/SKILL.md && echo "✓ name" || echo "✗ name"
grep -q "렌더 단계 오류만" skills/nextjs-error-boundary/SKILL.md && echo "✓ concept section" || echo "✗ concept section"
grep -q "global-error.tsx" skills/nextjs-error-boundary/SKILL.md && echo "✓ global-error section" || echo "✗ global-error section"
grep -q "Suspense" skills/nextjs-error-boundary/SKILL.md && echo "✓ suspense section" || echo "✗ suspense section"
```

Expected: 모두 `✓`

- [ ] **Step 3: 커밋**

```bash
git add skills/nextjs-error-boundary/SKILL.md
git commit -m "feat: replace nextjs-error-boundary skill (개념 + 결정 트리 + 고급 패턴)"
```

---

## Task 5: nextjs-zustand 스킬

**Files:**
- Create: `skills/nextjs-zustand/SKILL.md`

- [ ] **Step 1: 디렉터리 생성 및 파일 작성**

```bash
mkdir -p skills/nextjs-zustand
```

`skills/nextjs-zustand/SKILL.md` 전체 내용:

````markdown
---
name: nextjs-zustand
description: Use when implementing Zustand state after choosing it in nextjs-state-design — when structuring stores with slice pattern, optimizing re-renders with selectors, adding persistence, or wiring up devtools.
---

# Next.js Zustand

## Overview
`nextjs-state-design`에서 Zustand를 선택한 후 구현 단계. Slice 패턴, Selector 최적화, 미들웨어(devtools, persist, immer) 사용법을 다룬다.

## Zustand가 맞는 경우

| 조건 | Zustand 적합 | 대안 |
|------|-------------|------|
| 서로 관련 없는 컴포넌트 간 공유 상태 | ✅ | - |
| 서버에서 온 데이터 | ❌ | TanStack Query |
| URL에 반영되어야 하는 상태 (필터, 탭) | ❌ | useSearchParams |
| 단일 컴포넌트의 로컬 상태 | ❌ | useState |

## Enforcement Rules

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| Slice 패턴으로 도메인별 분리 | 거대한 단일 store는 관심사 혼재, 테스트 어려움 | 상태 필드가 5개 미만이면 단일 store 허용 |
| Selector로 필요한 상태만 구독 | 전체 store 구독 시 무관한 변경에도 리렌더링 | 컴포넌트가 실제로 store 전체를 사용하는 경우 전체 구독 허용 |
| `immer` 미들웨어로 중첩 상태 처리 | 깊은 중첩의 spread 체인은 오류 발생 쉬움 | 평탄한 단순 상태는 immer 없이 직접 spread 허용 |
| `devtools` 미들웨어는 dev 환경에서만 | prod bundle에 devtools 포함 방지 | - |
| 서버 데이터를 Zustand에 저장 금지 | TanStack Query 캐시와 이중 관리 → 동기화 버그 | - |
| `persist` 사용 시 `version` + `migrate` 필수 | 스키마 변경 시 기존 localStorage 파싱 오류 방지 | 개발 단계에서 localStorage 초기화 허용 시 생략 가능 |

## 1. Slice 패턴

도메인별 slice를 만들고 하나의 store에 합성한다.

```ts
// store/slices/cart-slice.ts
import type { StateCreator } from 'zustand'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface CartSlice {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

export const createCartSlice: StateCreator<CartSlice> = (set) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { items: [...state.items, item] }
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clearCart: () => set({ items: [] }),
})
```

```ts
// store/slices/ui-slice.ts
import type { StateCreator } from 'zustand'

export interface UISlice {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
})
```

```ts
// store/index.ts — slice 합성
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createCartSlice, type CartSlice } from './slices/cart-slice'
import { createUISlice, type UISlice } from './slices/ui-slice'

type StoreState = CartSlice & UISlice

export const useStore = create<StoreState>()(
  devtools(
    (...args) => ({
      ...createCartSlice(...args),
      ...createUISlice(...args),
    }),
    { enabled: process.env.NODE_ENV === 'development' }  // dev만 활성화
  )
)

// 명명된 selector 내보내기 — 컴포넌트에서 useStore 직접 사용 대신
export const useCartItems = () => useStore((s) => s.items)
export const useCartCount = () => useStore((s) => s.items.length)
export const useSidebarOpen = () => useStore((s) => s.sidebarOpen)
export const useToggleSidebar = () => useStore((s) => s.toggleSidebar)
```

## 2. Selector 최적화

```tsx
// ❌ 전체 store 구독 — 무관한 상태 변경에도 리렌더링
const { items, sidebarOpen, toggleSidebar } = useStore()

// ✅ 필요한 상태만 구독
const items = useStore((s) => s.items)
const toggleSidebar = useStore((s) => s.toggleSidebar)

// ✅ 더 좋음 — store/index.ts의 명명된 selector 사용
const items = useCartItems()
```

여러 값을 한 번에 구독할 때 `useShallow`로 불필요한 리렌더링 방지:

```ts
import { useShallow } from 'zustand/react/shallow'

// useShallow 없이: 내용이 같아도 새 객체 참조로 리렌더링
// useShallow 사용: 실제 값이 바뀔 때만 리렌더링
const { items, addItem } = useStore(
  useShallow((s) => ({ items: s.items, addItem: s.addItem }))
)
```

## 3. immer 미들웨어

중첩된 상태 구조에서 불변성을 안전하게 처리한다.

```ts
// store/user-store.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'

interface UserStore {
  user: {
    profile: { name: string; avatar: string }
    settings: { theme: 'light' | 'dark'; notifications: boolean }
  }
  updateName: (name: string) => void
  toggleTheme: () => void
}

export const useUserStore = create<UserStore>()(
  devtools(
    immer((set) => ({
      user: {
        profile: { name: '', avatar: '' },
        settings: { theme: 'light', notifications: true },
      },
      // ✅ 직접 변경 — immer가 불변성 처리
      updateName: (name) =>
        set((state) => { state.user.profile.name = name }),
      toggleTheme: () =>
        set((state) => {
          state.user.settings.theme =
            state.user.settings.theme === 'light' ? 'dark' : 'light'
        }),
    })),
    { enabled: process.env.NODE_ENV === 'development' }
  )
)
```

**예외:** `{ count: 0, increment: () => set(s => ({ count: s.count + 1 })) }` 같은 평탄한 상태는 immer 없이 직접 spread가 더 명확하다.

## 4. persist 미들웨어

```ts
// store/preferences-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface PreferencesStore {
  theme: 'light' | 'dark'
  language: string
  setTheme: (theme: 'light' | 'dark') => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'ko',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => localStorage),
      version: 1,  // 스키마 변경 시 올리기
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // v0에서 v1: 'color' 필드가 'theme'으로 변경됨
          const old = persistedState as { color?: string }
          return {
            theme: (old.color ?? 'light') as 'light' | 'dark',
            language: 'ko',
          }
        }
        return persistedState as PreferencesStore
      },
    }
  )
)
```

**스키마 변경 체크리스트:**
- [ ] `version` 번호 올리기
- [ ] 이전 버전 migration case 추가
- [ ] 구 localStorage 데이터로 migration 테스트

## 5. Store 테스트

```ts
// store/slices/cart-slice.test.ts
import { create } from 'zustand'
import { createCartSlice, type CartSlice } from './cart-slice'

function createTestStore() {
  return create<CartSlice>()(createCartSlice)
}

describe('CartSlice', () => {
  it('빈 장바구니에 상품을 추가한다', () => {
    const store = createTestStore()
    store.getState().addItem({ id: '1', name: '상품', price: 10, quantity: 1 })
    expect(store.getState().items).toHaveLength(1)
    expect(store.getState().items[0].name).toBe('상품')
  })

  it('같은 상품을 두 번 추가하면 수량이 증가한다', () => {
    const store = createTestStore()
    const item = { id: '1', name: '상품', price: 10, quantity: 1 }
    store.getState().addItem(item)
    store.getState().addItem(item)
    expect(store.getState().items).toHaveLength(1)
    expect(store.getState().items[0].quantity).toBe(2)
  })

  it('id로 상품을 삭제한다', () => {
    const store = createTestStore()
    store.getState().addItem({ id: '1', name: '상품', price: 10, quantity: 1 })
    store.getState().removeItem('1')
    expect(store.getState().items).toHaveLength(0)
  })

  it('clearCart로 전체 초기화한다', () => {
    const store = createTestStore()
    store.getState().addItem({ id: '1', name: '상품', price: 10, quantity: 1 })
    store.getState().clearCart()
    expect(store.getState().items).toHaveLength(0)
  })
})
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| API 응답 데이터를 Zustand에 저장 | TanStack Query 사용 — Zustand는 클라이언트 전용 상태 |
| `useStore()` selector 없이 사용 | 항상 selector 전달: `useStore(s => s.items)` |
| 모든 상태를 하나의 거대한 store에 | 도메인별 slice로 분리 |
| prod에서 devtools 활성화 | `enabled: process.env.NODE_ENV === 'development'` 추가 |
| `persist` 배포 후 `version` 없이 스키마 변경 | 항상 version + migrate 함께 정의 |
| 평탄한 상태에 immer 적용 | 불필요한 복잡성 — 직접 spread 사용 |
````

- [ ] **Step 2: 파일 구조 검증**

```bash
grep -q "^name: nextjs-zustand" skills/nextjs-zustand/SKILL.md && echo "✓ name" || echo "✗ name"
grep -q "Slice 패턴" skills/nextjs-zustand/SKILL.md && echo "✓ slice section" || echo "✗ slice section"
grep -q "persist" skills/nextjs-zustand/SKILL.md && echo "✓ persist section" || echo "✗ persist section"
grep -q "devtools" skills/nextjs-zustand/SKILL.md && echo "✓ devtools" || echo "✗ devtools"
```

Expected: 모두 `✓`

- [ ] **Step 3: 커밋**

```bash
git add skills/nextjs-zustand/SKILL.md
git commit -m "feat: add nextjs-zustand skill (slice, selector, immer, persist, devtools)"
```

---

## Task 6: nextjs-state-design Zustand 크로스레퍼런스 추가

**Files:**
- Modify: `skills/nextjs-state-design/SKILL.md`

- [ ] **Step 1: Zustand 섹션에 크로스레퍼런스 추가**

`skills/nextjs-state-design/SKILL.md`의 Zustand 섹션을 찾아 아래 내용으로 교체:

기존:
```markdown
### Global Client State — Zustand
Use when: state is shared across unrelated components and doesn't come from server.
```

교체 후:
```markdown
### Global Client State — Zustand
Use when: state is shared across unrelated components and doesn't come from server.

> **Zustand 선택 후 구현 방법:** `nextjs-zustand` 스킬 참조 (slice 패턴, selector 최적화, persist, devtools).
```

- [ ] **Step 2: 변경 검증**

```bash
grep -q "nextjs-zustand" skills/nextjs-state-design/SKILL.md && echo "✓ cross-reference added" || echo "✗ cross-reference missing"
```

Expected: `✓ cross-reference added`

- [ ] **Step 3: 커밋**

```bash
git add skills/nextjs-state-design/SKILL.md
git commit -m "docs: nextjs-state-design에 nextjs-zustand 크로스레퍼런스 추가"
```

---

## Task 7: README 업데이트 + 버전 v1.3.0

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 목차에 신규 스킬 4개 추가**

기존 목차의 `- [nextjs-design-token-consistency](#nextjs-design-token-consistency)` 아래에 추가:

```markdown
  - [nextjs-tanstack-query](#nextjs-tanstack-query)
  - [nextjs-query-key-factory](#nextjs-query-key-factory)
  - [nextjs-design-system-tokens](#nextjs-design-system-tokens)
  - [nextjs-zustand](#nextjs-zustand)
```

- [ ] **Step 2: 스킬 목록에 4개 섹션 추가**

`### nextjs-design-token-consistency` 섹션 이후, `### nextjs-error-boundary` 섹션 이전에 아래 4개 섹션 삽입:

```markdown
### nextjs-tanstack-query

> **언제 사용하나요?** Client Component에서 서버 데이터를 페칭할 때 — `useEffect+useState` 패턴을 발견했을 때, mutation 후 캐시 무효화가 필요할 때

TanStack Query v5 기준. 수동 데이터 페칭을 캐싱·리페칭·상태관리가 포함된 선언형 패턴으로 교체한다.

**주요 내용:**

| 항목 | 내용 |
|------|------|
| `useQuery` | 캐시, `staleTime`, `isPending`/`isError` 처리 |
| `useMutation` | 서버 업데이트 + `invalidateQueries`/`setQueryData` |
| Optimistic Update | `onMutate` + `onError` rollback 쌍 |
| Suspense 연동 | `useSuspenseQuery` (v5) |
| SSR Prefetch | Server Component에서 `prefetchQuery` + `HydrationBoundary` |

---

### nextjs-query-key-factory

> **언제 사용하나요?** query key가 파일 곳곳에 흩어져 있을 때, 캐시 무효화 범위를 정밀하게 제어해야 할 때, 새 프로젝트에서 QueryClient를 설정할 때

Query Key를 계층 구조 Factory 함수로 중앙화하고, `QueryClient`를 싱글톤으로 설정한다.

**핵심 패턴:**

```ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}
// userKeys.all 무효화 → 모든 유저 쿼리 무효화
// userKeys.detail(id) 무효화 → 특정 유저만 무효화
```

---

### nextjs-design-system-tokens

> **언제 사용하나요?** 디자인 시스템을 처음 설계할 때, Figma 토큰을 코드로 옮길 때, 다크모드/브랜드 테마 전환이 필요할 때

Primitive → Semantic → Component 3계층 토큰 구조로 테마 전환 가능한 디자인 시스템을 설계한다.

**3계층 구조:**

```
Primitive (원시값: #6B7280)
  └─ Semantic (목적: --color-text-secondary)
       └─ Component (컴포넌트 전용: 꼭 필요한 경우만)
```

**대표 규칙:** 컴포넌트 코드에서 primitive(`text-gray-500`) 직접 참조 금지 — semantic 토큰(`text-text-secondary`)만 사용.

---

### nextjs-zustand

> **언제 사용하나요?** `nextjs-state-design`에서 Zustand 선택 후 구현 단계 — store 구조 설계, 리렌더링 최적화, persist/devtools 연동 시

**주요 내용:**

| 항목 | 내용 |
|------|------|
| Slice 패턴 | 도메인별 `createXxxSlice` 분리 후 합성 |
| Selector | `useStore(s => s.items)`로 필요한 상태만 구독 |
| immer | 중첩 상태 불변 처리 (`state.user.name = value`) |
| persist | `version` + `migrate`로 localStorage 스키마 관리 |
| devtools | `enabled: process.env.NODE_ENV === 'development'`로 dev만 활성화 |
```

- [ ] **Step 3: 스킬 적용 흐름 업데이트**

기존 흐름의 `1. 기능 설계` 아래에 항목 추가:

```markdown
   └─ nextjs-tanstack-query     (서버 데이터 페칭 패턴)
   └─ nextjs-query-key-factory  (QueryClient + Key Factory 설정)
   └─ nextjs-zustand            (Zustand 구현, nextjs-state-design 이후)
```

기존 흐름의 `2. 구현 완료 후` 아래에 항목 추가:

```markdown
   └─ nextjs-design-system-tokens (토큰 시스템 설계 시)
```

- [ ] **Step 4: 버전 히스토리 v1.3.0 추가**

버전 테이블 맨 위에 행 추가:

```markdown
| v1.3.0 | `nextjs-tanstack-query`, `nextjs-query-key-factory`, `nextjs-design-system-tokens`, `nextjs-zustand` 추가. `nextjs-error-boundary` 심화 교체 |
```

- [ ] **Step 5: README 검증**

```bash
grep -q "nextjs-tanstack-query" README.md && echo "✓ tanstack-query" || echo "✗ tanstack-query"
grep -q "nextjs-query-key-factory" README.md && echo "✓ query-key-factory" || echo "✗ query-key-factory"
grep -q "nextjs-design-system-tokens" README.md && echo "✓ design-system-tokens" || echo "✗ design-system-tokens"
grep -q "nextjs-zustand" README.md && echo "✓ zustand" || echo "✗ zustand"
grep -q "v1.3.0" README.md && echo "✓ version" || echo "✗ version"
```

Expected: 모두 `✓`

- [ ] **Step 6: 커밋 + 푸시**

```bash
git add README.md
git commit -m "docs: README v1.3.0 — 신규 스킬 4개 추가"
git push origin main
```
