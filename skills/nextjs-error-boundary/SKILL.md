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
