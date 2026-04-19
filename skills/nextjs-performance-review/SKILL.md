---
name: nextjs-performance-review
description: Use when implementing a page or feature in Next.js that involves lists, images, data fetching, or heavy UI — or when a performance issue is suspected such as slow load, janky scroll, or large bundle size.
---

# Next.js Performance Review

## Overview
Identify and fix performance issues in Next.js apps across rendering strategy, bundle size, image/font loading, and React re-renders.

## 1. Rendering Strategy Audit

| Page Type | Best Strategy | Next.js Implementation |
|-----------|--------------|----------------------|
| Static marketing | SSG | No fetch, or `fetch(..., { cache: 'force-cache' })` |
| Dynamic but cacheable | ISR | `revalidate: N` in fetch options |
| User-specific, real-time | SSR | `fetch(..., { cache: 'no-store' })` |
| Client-interactive only | CSR | `'use client'` + SWR/React Query |

**Red flag:** Using `cache: 'no-store'` on pages that don't need real-time data.

## 2. Bundle Size

```bash
# Analyze bundle
ANALYZE=true next build
```

**Check for:**
- [ ] Large libraries imported entirely (`import _ from 'lodash'` → `import debounce from 'lodash/debounce'`)
- [ ] Heavy Client Components that could be Server Components
- [ ] Duplicate dependencies (`date-fns` and `moment` both present)

**Lazy load heavy components:**
```tsx
const HeavyChart = dynamic(() => import('@/components/Chart'), {
  loading: () => <Skeleton />,
  ssr: false, // only if it uses browser APIs
})
```

## 3. Image Optimization

```tsx
// Always use next/image
import Image from 'next/image'

// Required: width + height OR fill
<Image
  src={src}
  alt={alt}
  width={800}
  height={600}
  priority={isAboveFold} // LCP image: add priority
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Checklist:**
- [ ] Above-the-fold images have `priority` prop
- [ ] `sizes` prop matches actual CSS layout
- [ ] No raw `<img>` tags (use `next/image`)

## 4. Font Optimization

```tsx
// Use next/font — zero layout shift, self-hosted automatically
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```

- [ ] No `@import url('fonts.googleapis.com')` in CSS
- [ ] `display: 'swap'` set

## 5. React Re-render Optimization

**Find unnecessary re-renders:**
```tsx
// Add temporarily to debug
import { useRenderCount } from '@/hooks/useRenderCount' // or React DevTools Profiler
```

**When to memoize:**

| Situation | Solution |
|-----------|----------|
| Expensive calculation on every render | `useMemo` |
| Callback passed to memoized child | `useCallback` |
| Component renders with same props | `React.memo` |

**Don't memoize everything** — it has cost. Only memoize when Profiler shows actual issue.

## 6. Data Fetching

- [ ] Parallel fetches with `Promise.all` instead of sequential awaits
- [ ] Shared fetch results via React cache() for Server Components
- [ ] Proper loading.tsx / Suspense boundaries for streaming

```tsx
// Bad: sequential (waterfall)
const user = await getUser(id)
const posts = await getPosts(id)

// Good: parallel
const [user, posts] = await Promise.all([getUser(id), getPosts(id)])
```

## 7. Core Web Vitals Targets

| Metric | Target | Common Cause of Failure |
|--------|--------|------------------------|
| LCP | < 2.5s | Large image without `priority`, slow server |
| CLS | < 0.1 | Images without dimensions, font swap |
| INP | < 200ms | Heavy event handlers, blocking JS |
