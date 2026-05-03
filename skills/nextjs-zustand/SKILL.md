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
