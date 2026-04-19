---
name: nextjs-user-logging
description: Use when instrumenting user behavior in a Next.js app — tracking page views, click events, form submissions, or Core Web Vitals for analytics or product observability.
---

# Next.js User Logging

## Overview
Track user behavior with minimal client-side overhead. Prefer Server Component instrumentation for page views; use a thin client hook for interaction events. Keep all user data anonymous by default.

## What to Track and Where

| Event | Capture Point |
|-------|--------------|
| Page view | `layout.tsx` server log or `useReportWebVitals` |
| Core Web Vitals | `useReportWebVitals` in root layout |
| Click / interaction | `useUserEvent` client hook |
| Form submit | `useUserEvent` in form `onSubmit` |
| Route change | `usePathname` effect in root Client Component |

## Core Web Vitals (built-in)

```tsx
// app/_components/web-vitals.tsx
'use client'
import { useReportWebVitals } from 'next/dist/client/components/use-report-web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    fetch('/api/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'web-vital', ...metric }),
    }).catch(() => {})
  })
  return null
}
```

Add to `app/layout.tsx`:
```tsx
<WebVitals />
```

## useUserEvent Hook

```ts
// hooks/use-user-event.ts
'use client'

export function useUserEvent() {
  function track(event: string, properties?: Record<string, unknown>) {
    const payload = {
      event,
      properties,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    }

    // Beacon API — doesn't block navigation
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    navigator.sendBeacon('/api/log-event', blob)
  }

  return { track }
}
```

Usage:
```tsx
const { track } = useUserEvent()
<button onClick={() => track('play_button_clicked', { episodeSlug: ep.slug })}>
  재생
</button>
```

## Route Change Tracking

```tsx
// app/_components/route-tracker.tsx
'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useUserEvent } from '@/hooks/use-user-event'

export function RouteTracker() {
  const pathname = usePathname()
  const { track } = useUserEvent()
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    track('page_view', { path: pathname })
  }, [pathname])

  return null
}
```

## API Route

```ts
// app/api/log-event/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Forward to analytics service (PostHog, Amplitude, custom DB, etc.)
  console.log('[user-event]', body)

  return NextResponse.json({ ok: true })
}
```

## Checklist

- [ ] No PII collected (no email, name, IP unless explicitly required + consented)
- [ ] `sendBeacon` used for events during navigation (won't be cancelled)
- [ ] Tracking calls are fire-and-forget (never block UI)
- [ ] `RouteTracker` skips the initial mount (avoids double-counting first page view)
- [ ] Event names are `snake_case` and consistent (define a naming convention)
- [ ] Analytics behind feature flag or env var for local development

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `fetch` in `beforeunload` | Use `sendBeacon` — fetch is cancelled on page unload |
| Tracking on every render | Use `useEffect` with deps, not inline render calls |
| Hardcoding endpoint URL | Use `NEXT_PUBLIC_ANALYTICS_ENDPOINT` env var |
| Collecting user IDs without consent | Default to session IDs only; add consent gate for user IDs |
