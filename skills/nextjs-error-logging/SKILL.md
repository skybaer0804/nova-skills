---
name: nextjs-error-logging
description: Use when setting up error monitoring in a Next.js app, wiring error.tsx or global-error.tsx to a logging service, or capturing unhandled client/server errors for observability.
---

# Next.js Error Logging

## Overview
Capture and report errors from both server and client. Next.js provides `instrumentation.ts` for server-side hooks and `error.tsx` for client-side boundaries. Wire both to a logging service (Sentry, Datadog, custom endpoint).

## Logging Points

| Source | Where to Log |
|--------|-------------|
| Server Component errors | `instrumentation.ts` → `onRequestError` |
| Client boundary errors | `error.tsx` → `useEffect` on mount |
| Root layout errors | `global-error.tsx` → `useEffect` |
| Unhandled client rejections | `app/layout.tsx` global listener |

## Server-Side: instrumentation.ts

```ts
// instrumentation.ts (app root, NOT inside /app)
export async function onRequestError(
  err: { digest: string } & Error,
  request: { path: string; method: string },
  context: { routePath: string }
) {
  // Replace with your logging service SDK
  await fetch(process.env.ERROR_LOG_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      digest: err.digest,
      message: err.message,
      stack: err.stack,
      path: request.path,
      route: context.routePath,
      timestamp: new Date().toISOString(),
    }),
  })
}
```

Enable in `next.config.ts`:
```ts
experimental: { instrumentationHook: true }
```

## Client-Side: error.tsx

```tsx
'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log once on mount; error object is stable
    logError(error)
  }, [error])

  return <ErrorUI reset={reset} />
}

function logError(error: Error & { digest?: string }) {
  const payload = {
    message: error.message,
    digest: error.digest,      // correlates with server log
    stack: error.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }

  // Fire-and-forget; don't await in render cycle
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {}) // swallow logging failures silently
}
```

## API Route for Client Errors

```ts
// app/api/log-error/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Forward to your logging service (Sentry, Axiom, etc.)
  console.error('[client-error]', body)

  return NextResponse.json({ ok: true })
}
```

## Checklist

- [ ] `instrumentation.ts` at project root (not inside `/app`)
- [ ] `instrumentationHook: true` in `next.config.ts` (Next.js <15.3)
- [ ] `error.tsx` calls logger in `useEffect`, not directly in render
- [ ] `digest` included in both server and client logs for correlation
- [ ] Logging failures are swallowed (never crash the error UI)
- [ ] PII scrubbed before sending (no passwords, tokens in stack traces)
- [ ] `ERROR_LOG_ENDPOINT` in `.env.local`, not hardcoded

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Logging inside render body | Move to `useEffect` — render can run multiple times |
| Awaiting log fetch in error.tsx | Fire-and-forget; blocking delays user seeing the error UI |
| Logging raw `error.stack` in production | Sanitize or use `digest` only for prod, full stack for dev |
| Not enabling `instrumentationHook` | Server errors silently dropped in Next.js <15.3 |
