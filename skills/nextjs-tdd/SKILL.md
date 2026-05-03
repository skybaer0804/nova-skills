---
name: nextjs-tdd
description: Use when writing or fixing tests for Next.js components, hooks, or server actions — before writing implementation code (TDD), or when tests are failing, missing, or flaky.
---

# Next.js TDD

## Overview
Write tests first, then implement. Vitest + React Testing Library for unit and integration tests. Testable components are composable, focused components — TDD improves design.

## Setup

Install dependencies:
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitest/coverage-v8
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom'
```

```json
// package.json — add to scripts
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

## TDD Cycle for Next.js

```
RED:     Write failing test that describes behavior
          ↓
GREEN:   Write minimal implementation to pass
          ↓
REFACTOR: Clean up without breaking tests
```

**Never write implementation before test.** If you find yourself writing component code first, stop — write the test first.

## Client Component Tests

```tsx
// components/counter.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './counter'

describe('Counter', () => {
  it('increments count on button click', async () => {
    const user = userEvent.setup()
    render(<Counter initialCount={0} />)

    await user.click(screen.getByRole('button', { name: /increment/i }))

    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
```

## Hook Tests

```tsx
// hooks/use-cart.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCart } from './use-cart'

it('adds item to cart', () => {
  const { result } = renderHook(() => useCart())

  act(() => {
    result.current.addItem({ id: '1', name: 'Product', price: 10 })
  })

  expect(result.current.items).toHaveLength(1)
  expect(result.current.items[0].name).toBe('Product')
})
```

## Server Component Tests

Server Components are async functions — await them before passing to `render`.

> **Limitation:** This pattern works for components that only call data-fetching functions. Components using Next.js server APIs (`headers()`, `cookies()`, `redirect()`, `notFound()`) require additional mocks or are better covered by E2E tests (Playwright).

```tsx
// app/products/page.test.tsx
import { render, screen } from '@testing-library/react'
import ProductsPage from './page'
import { getProducts } from '@/lib/products'

vi.mock('@/lib/products')

it('renders product list', async () => {
  vi.mocked(getProducts).mockResolvedValue([
    { id: '1', name: 'Test Product', price: 99 },
  ])

  render(await ProductsPage())

  expect(screen.getByText('Test Product')).toBeInTheDocument()
})
```

## Quick Reference

| What to test | Tool | Pattern |
|---|---|---|
| Render output | `render` + `screen.getBy*` | Assert text/role present |
| User interaction | `userEvent.setup()` + `await user.click()` | Assert state change |
| Async element | `await screen.findBy*` | Waits automatically |
| Custom hook | `renderHook` + `act` | Assert returned values |
| Server Component | `render(await Page())` | Mock data deps with `vi.mock` |
| Form submit | `userEvent.type` + `userEvent.click` | Assert result after submit |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `fireEvent` instead of `userEvent` | `userEvent` simulates real browser events including focus/blur |
| `getByText` for UI copy | Use `getByRole` — resilient to copy changes |
| Testing internal state | Test what the user sees and does, not `useState` values |
| Missing context provider | Wrap with providers using a `customRender` helper |
| Server Component missing `await` | `render(await Page())` — async component must be awaited first |
| `act` warning in async tests | Use `await userEvent` or `await screen.findBy*` instead of manual `act` |
