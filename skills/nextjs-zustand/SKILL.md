---
name: nextjs-zustand
description: Use when implementing Zustand state after choosing it in nextjs-state-design — when structuring stores with slice pattern, optimizing re-renders with selectors, adding persistence, or wiring up devtools.
created: 2026-05-04
updated: 2026-05-04
---

# Next.js Zustand

## Overview
The implementation phase after selecting Zustand in `nextjs-state-design`. Covers the slice pattern, selector optimization, and middleware usage (devtools, persist, immer).

## When Zustand is the Right Choice

| Condition | Zustand fits | Alternative |
|-----------|-------------|-------------|
| Shared state between unrelated components | ✅ | - |
| Data from the server | ❌ | TanStack Query |
| State that should be reflected in the URL (filters, tabs) | ❌ | useSearchParams |
| Local state within a single component | ❌ | useState |

## Enforcement Rules

| Pattern | Rationale | Allowed Exception |
|---------|-----------|-------------------|
| Separate domains using the slice pattern | A single monolithic store mixes concerns and is hard to test | A single store is allowed when there are fewer than 5 state fields |
| Subscribe only to needed state via selectors | Subscribing to the entire store causes re-renders on unrelated changes | Full subscription allowed when the component genuinely uses the entire store |
| Use `immer` middleware for nested state | Deep-nested spread chains are error-prone | Direct spread is fine for flat, simple state without immer |
| `devtools` middleware only in dev environment | Prevents devtools from being included in the prod bundle | - |
| Do not store server data in Zustand | Dual management with TanStack Query cache leads to sync bugs | - |
| `persist` requires `version` + `migrate` | Prevents localStorage parse errors when the schema changes | Can be omitted during development when clearing localStorage is acceptable |

## 1. Slice Pattern

Create per-domain slices and compose them into a single store.

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
// store/index.ts — slice composition
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
    { enabled: process.env.NODE_ENV === 'development' }  // dev only
  )
)

// Export named selectors — use these instead of useStore directly in components
export const useCartItems = () => useStore((s) => s.items)
export const useCartCount = () => useStore((s) => s.items.length)
export const useSidebarOpen = () => useStore((s) => s.sidebarOpen)
export const useToggleSidebar = () => useStore((s) => s.toggleSidebar)
```

## 2. Selector Optimization

```tsx
// ❌ Subscribing to the entire store — re-renders on unrelated state changes
const { items, sidebarOpen, toggleSidebar } = useStore()

// ✅ Subscribe only to what you need
const items = useStore((s) => s.items)
const toggleSidebar = useStore((s) => s.toggleSidebar)

// ✅ Even better — use the named selectors from store/index.ts
const items = useCartItems()
```

Use `useShallow` when subscribing to multiple values at once to prevent unnecessary re-renders:

```ts
import { useShallow } from 'zustand/react/shallow'

// Without useShallow: re-renders on every call due to new object reference, even with same values
// With useShallow: re-renders only when actual values change
const { items, addItem } = useStore(
  useShallow((s) => ({ items: s.items, addItem: s.addItem }))
)
```

## 3. immer Middleware

Safely handles immutability in nested state structures.

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
      // ✅ Direct mutation — immer handles immutability
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

**Exception:** For flat state like `{ count: 0, increment: () => set(s => ({ count: s.count + 1 })) }`, direct spread without immer is clearer.

## 4. persist Middleware

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
      language: 'en',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => localStorage),
      version: 1,  // Increment when schema changes
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // v0 to v1: 'color' field renamed to 'theme'
          const old = persistedState as { color?: string }
          return {
            theme: (old.color ?? 'light') as 'light' | 'dark',
            language: 'en',
          }
        }
        return persistedState as PreferencesStore
      },
    }
  )
)
```

**Schema change checklist:**
- [ ] Bump the `version` number
- [ ] Add a migration case for the previous version
- [ ] Test migration with old localStorage data

## 5. Store Testing

```ts
// store/slices/cart-slice.test.ts
import { create } from 'zustand'
import { createCartSlice, type CartSlice } from './cart-slice'

function createTestStore() {
  return create<CartSlice>()(createCartSlice)
}

describe('CartSlice', () => {
  it('adds an item to an empty cart', () => {
    const store = createTestStore()
    store.getState().addItem({ id: '1', name: 'Item', price: 10, quantity: 1 })
    expect(store.getState().items).toHaveLength(1)
    expect(store.getState().items[0].name).toBe('Item')
  })

  it('increases quantity when the same item is added twice', () => {
    const store = createTestStore()
    const item = { id: '1', name: 'Item', price: 10, quantity: 1 }
    store.getState().addItem(item)
    store.getState().addItem(item)
    expect(store.getState().items).toHaveLength(1)
    expect(store.getState().items[0].quantity).toBe(2)
  })

  it('removes an item by id', () => {
    const store = createTestStore()
    store.getState().addItem({ id: '1', name: 'Item', price: 10, quantity: 1 })
    store.getState().removeItem('1')
    expect(store.getState().items).toHaveLength(0)
  })

  it('clears the entire cart with clearCart', () => {
    const store = createTestStore()
    store.getState().addItem({ id: '1', name: 'Item', price: 10, quantity: 1 })
    store.getState().clearCart()
    expect(store.getState().items).toHaveLength(0)
  })
})
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Storing API response data in Zustand | Use TanStack Query — Zustand is for client-only state |
| Using `useStore()` without a selector | Always pass a selector: `useStore(s => s.items)` |
| Putting all state in one giant store | Separate into per-domain slices |
| Enabling devtools in production | Add `enabled: process.env.NODE_ENV === 'development'` |
| Changing schema after `persist` deploy without `version` | Always define version + migrate together |
| Applying immer to flat state | Unnecessary complexity — use direct spread instead |
