---
name: nextjs-error-boundary
description: Use when adding error boundaries to a Next.js app, implementing graceful failure UI, or handling runtime errors in route segments and component trees without crashing the whole page.
---

# Next.js Error Boundary

## Overview
Next.js provides file-based error boundaries (`error.tsx`, `global-error.tsx`). Use these for route-level recovery. Use a custom `ErrorBoundary` client component for finer-grained, component-level isolation.

## When to Use

| Situation | Solution |
|-----------|----------|
| Route segment crashes | `app/(route)/error.tsx` |
| Root layout crashes | `app/global-error.tsx` |
| Async Server Component error | `error.tsx` + Suspense |
| Isolated widget should not crash the page | Custom `ErrorBoundary` component |

## File-Based Boundaries (Next.js built-in)

```tsx
// app/(route)/error.tsx — catches errors in this segment + children
'use client'

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
      <p className="text-sm text-muted-foreground">{error.message}</p>
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

```tsx
// app/global-error.tsx — catches root layout errors; must include <html>/<body>
'use client'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body className="flex items-center justify-center min-h-screen">
        <div role="alert" className="text-center space-y-4">
          <h1 className="text-xl font-bold">서비스를 일시적으로 이용할 수 없습니다</h1>
          <button onClick={reset}>새로고침</button>
        </div>
      </body>
    </html>
  )
}
```

## Custom ErrorBoundary Component

Use when a single component should fail gracefully without affecting siblings.

```tsx
// components/ui/error-boundary.tsx
'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  fallback?: ReactNode
  children: ReactNode
}

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
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

Usage:
```tsx
<ErrorBoundary fallback={<WidgetSkeleton />}>
  <DynamicWidget />
</ErrorBoundary>
```

## Checklist

- [ ] `error.tsx` exists for every route segment that fetches data
- [ ] `global-error.tsx` exists at app root
- [ ] Error UI uses `role="alert"` for screen readers
- [ ] Reset button present (user can recover without full reload)
- [ ] Error message is user-friendly (not raw stack trace)
- [ ] `digest` property available for server-side correlation (log it, don't show it)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `error.tsx` missing `'use client'` | Required — error components must be Client Components |
| Showing raw `error.message` in prod | Guard: `process.env.NODE_ENV === 'development' ? error.message : '알 수 없는 오류'` |
| `global-error.tsx` without `<html>` | Root layout is replaced; must include full HTML shell |
| No reset mechanism | Always provide a way for users to recover |
