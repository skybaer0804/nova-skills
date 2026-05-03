# nova-skills

**Claude Code용 Next.js 프론트엔드 개발 스킬 모음입니다.**

코드를 작성하기 *전에* 올바른 결정을 내리도록 설계된 리뷰 및 설계 워크플로우를 제공합니다.  
잘못된 렌더링 전략, 빈약한 컴포넌트 설계, 접근성 누락 등 배포 후에 발견하면 비용이 큰 문제들을 사전에 잡아냅니다.

---

## 목차

- [설치](#설치)
- [스킬 목록](#스킬-목록)
  - [nextjs-component-design](#nextjs-component-design)
  - [nextjs-state-design](#nextjs-state-design)
  - [nextjs-performance-review](#nextjs-performance-review)
  - [nextjs-accessibility-review](#nextjs-accessibility-review)
  - [nextjs-design-token-consistency](#nextjs-design-token-consistency)
  - [nextjs-error-boundary](#nextjs-error-boundary)
  - [nextjs-error-logging](#nextjs-error-logging)
  - [nextjs-user-logging](#nextjs-user-logging)
  - [nextjs-tdd](#nextjs-tdd)
  - [nextjs-tanstack-query](#nextjs-tanstack-query)
  - [nextjs-query-key-factory](#nextjs-query-key-factory)
  - [nextjs-design-system-tokens](#nextjs-design-system-tokens)
  - [nextjs-zustand](#nextjs-zustand)
- [스킬 사용 방법](#스킬-사용-방법)
- [스킬 적용 흐름](#스킬-적용-흐름)
- [버전 히스토리](#버전-히스토리)

---

## 설치

```bash
claude plugins install nova-skills@nova-marketplace
```

설치 후 Claude Code 세션에서 각 스킬이 자동으로 감지됩니다.

---

## 스킬 목록

### nextjs-component-design

> **언제 사용하나요?** 새 Next.js 컴포넌트를 구현하기 *전에* — Server/Client 컴포넌트 선택, Props API 설계, 컴포지션 전략을 결정할 때

잘못된 컴포넌트 설계로 인한 비용이 큰 리팩토링을 예방합니다. 구현 코드 작성 전에 컴포넌트 API와 아키텍처를 설계하도록 유도합니다.

**주요 내용:**

| 단계 | 내용 |
|------|------|
| Step 1 | Server vs Client 컴포넌트 결정 트리 |
| Step 2 | Props API 설계 원칙 (Pick<>, variant 패턴 등) |
| Step 3 | 컴포지션 패턴 선택 (children, Compound Components, Render Props) |
| Step 4 | 데이터 페칭 위치 결정 (page.tsx vs layout.tsx vs 컴포넌트 자체) |
| Step 5 | 파일 배치 체크리스트 (components/ui, components/features 분리) |

**대표 규칙:** `'use client'` 경계는 트리의 최대한 하위(leaf)로 밀어내고, 데이터 페칭과 정적 렌더링은 Server Component에서 처리한다.

---

### nextjs-state-design

> **언제 사용하나요?** 상태 관리 결정이 필요한 기능을 구현할 때 — 서버 상태, 클라이언트 상태, URL 상태 중 무엇을 쓸지, 컴포넌트 트리의 어느 위치에 상태를 둘지 결정할 때

잘못된 상태 배치는 prop drilling, 오래된 데이터(stale data), 불필요한 리렌더링을 유발합니다.

**상태 분류 결정 트리:**

```
서버(API/DB)에서 오는 데이터인가?
  YES → Server State (React Query / SWR)
  NO  → 여러 라우트에서 공유되는가?
          YES → Global Client State (Zustand / Context)
          NO  → URL에 반영되어야 하는가? (필터, 페이지네이션, 탭)
                  YES → URL State (useSearchParams)
                  NO  → Local State (useState / useReducer)
```

**상태 유형별 가이드:**

| 상태 유형 | 도구 | 적합한 경우 |
|-----------|------|-------------|
| 서버 상태 | React Query / SWR | API 데이터 캐싱, 리페칭, 낙관적 업데이트 |
| URL 상태 | useSearchParams | 새로고침 후에도 유지, URL 공유, SEO 영향 |
| 전역 클라이언트 상태 | Zustand | 장바구니, 인증 정보, UI 설정 |
| 로컬 상태 | useState / useReducer | 단일 컴포넌트 또는 직계 자녀에만 필요한 경우 |

---

### nextjs-performance-review

> **언제 사용하나요?** 리스트, 이미지, 데이터 페칭, 무거운 UI가 포함된 페이지나 기능을 구현할 때, 또는 느린 로딩/버벅이는 스크롤/큰 번들 사이즈 등 성능 문제가 의심될 때

**v1.1.0에서 PPR(Partial Prerendering) 및 Turbopack 섹션이 추가되었습니다.**

**점검 항목:**

| # | 항목 | 핵심 내용 |
|---|------|-----------|
| 1 | 렌더링 전략 감사 | SSG / ISR / SSR / CSR 중 적합한 전략 선택 |
| 2 | 번들 사이즈 | `ANALYZE=true next build`, 무거운 라이브러리 lazy load |
| 3 | 이미지 최적화 | `next/image`, `priority` prop, `sizes` prop |
| 4 | 폰트 최적화 | `next/font` 사용, layout shift 방지 |
| 5 | React 리렌더링 최적화 | `useMemo`, `useCallback`, `React.memo` 적재적소 사용 |
| 6 | 데이터 페칭 | `Promise.all` 병렬 페칭, `React.cache()`, Suspense 경계 |
| 7 | Core Web Vitals | LCP < 2.5s, CLS < 0.1, INP < 200ms |
| 8 | PPR (Next.js 15+) | 정적 셸 + 동적 구멍 혼합 렌더링 |

**PPR 예시 (Next.js 15+):**

```tsx
// next.config.ts
experimental: { ppr: true }

// page.tsx
export default function Page() {
  return (
    <main>
      <StaticHeader />                    {/* 빌드 타임에 렌더링 */}
      <Suspense fallback={<Skeleton />}>
        <DynamicUserCart />               {/* 동적으로 스트리밍 */}
      </Suspense>
    </main>
  )
}
```

---

### nextjs-accessibility-review

> **언제 사용하나요?** Next.js 컴포넌트 또는 페이지 구현이 완료되어 PR 전 접근성 검증이 필요할 때, 또는 인터랙티브 요소, 폼, 모달, 내비게이션을 추가할 때

배포 후가 아닌 리뷰 시점에 WCAG 2.1 AA 준수 여부를 체계적으로 검증합니다.

**체크리스트 영역:**

| 영역 | 주요 점검 사항 |
|------|----------------|
| 시맨틱 HTML | 헤딩 계층 구조, 적절한 랜드마크 (`<main>`, `<nav>` 등) |
| ARIA | `aria-label`, `aria-live`, 모달의 `role="dialog"` 및 포커스 트랩 |
| 키보드 네비게이션 | Tab 순서, 포커스 인디케이터, Enter/Space/Escape 핸들링 |
| 이미지 & 미디어 | 장식용 이미지 `alt=""`, 정보 전달 이미지 의미 있는 `alt` |
| 색상 & 대비 | 텍스트 대비 ≥ 4.5:1, 색상만으로 정보 전달하지 않기 |
| 폼 | `<label>` 연결, `aria-describedby`로 오류 메시지 연결 |

**Next.js 특화 주의사항:**

| 패턴 | 접근성 고려사항 |
|------|----------------|
| Server Components | `useEffect`로 포커스 관리 불가 — Client Component 래퍼에서 처리 |
| `next/link` | `<a>` 렌더링 — "click here" 같은 무의미한 링크 텍스트 금지 |
| Client-side routing | `aria-live` 영역 또는 포커스 관리로 페이지 전환 알림 |
| 로딩 상태 | 로딩 컨테이너에 `aria-busy="true"` 추가 |

---

### nextjs-design-token-consistency

> **언제 사용하나요?** 스타일링 작업 완료 후 — 하드코딩된 색상, 인라인 스타일, 임의 Tailwind 값 (예: `text-[#6B7280]`, `p-[12px]`)이 디자인 토큰이나 Tailwind 설정값으로 대체되어야 할 때

하드코딩된 스타일 값을 디자인 시스템 토큰으로 교체합니다. 시각적 불일관성을 방지하고 테마 변경을 유지보수 가능하게 만듭니다.

**스캔 방법:**

```bash
# 인라인 스타일 검색
grep -r "style={{" src/components --include="*.tsx" | grep -v "// ok"

# 임의 Tailwind 값 검색
grep -rE "\[#[0-9a-fA-F]{3,6}\]|\[([\d.]+)(px|rem|em)\]" src --include="*.tsx"
```

**결정 테이블:**

| 상황 | 조치 |
|------|------|
| Tailwind 팔레트에 색상이 있음 | Tailwind 클래스 사용 |
| 시맨틱 색상 (배경, 텍스트, 테두리) | `tailwind.config`에 시맨틱 토큰으로 추가 |
| Tailwind 간격 스케일과 일치 (4px 그리드) | Tailwind 클래스 사용 |
| 동일한 값이 2회 이상 반복되며 토큰 없음 | config에 이름 있는 토큰 추가 후 교체 |
| 반복되지 않는 일회성 값 | 임의 값 허용, `// one-off` 주석 추가 |

**shadcn/ui 프로젝트 주의:** `text-gray-500` 대신 `text-muted-foreground`처럼 CSS 변수 기반 시맨틱 토큰을 우선 사용하세요.

---

### nextjs-error-boundary

> **언제 사용하나요?** 런타임 오류로 라우트 세그먼트가 충돌할 때, `error.tsx` 또는 `global-error.tsx`가 없을 때, 특정 위젯이 실패해도 형제 컴포넌트에 영향을 주지 않아야 할 때

**적용 상황별 해결책:**

| 상황 | 해결책 |
|------|--------|
| 라우트 세그먼트 충돌 | `app/(route)/error.tsx` |
| 루트 레이아웃 충돌 | `app/global-error.tsx` |
| 비동기 Server Component 오류 | `error.tsx` + Suspense |
| 페이지 전체에 영향 없이 위젯만 격리 | 커스텀 `ErrorBoundary` 컴포넌트 |

**핵심 체크리스트:**
- `error.tsx`에 `'use client'` 선언 필수
- `global-error.tsx`는 반드시 `<html>/<body>` 포함
- 오류 UI에 `role="alert"` 적용 (스크린 리더 접근성)
- 사용자가 복구할 수 있는 재시도(reset) 버튼 제공
- `error.digest`는 서버-클라이언트 오류 상관관계 추적에 활용 (화면에 노출 금지)

---

### nextjs-error-logging

> **언제 사용하나요?** Next.js 앱의 오류가 로깅 서비스에 도달하지 않을 때, Sentry나 Datadog이 서버 오류를 수신하지 못할 때, 서버와 클라이언트 오류 로그 간 digest 상관관계가 없을 때

서버와 클라이언트 양쪽에서 오류를 포착하여 로깅 서비스에 전달합니다.

**로깅 지점:**

| 오류 출처 | 로깅 위치 |
|-----------|-----------|
| Server Component 오류 | `instrumentation.ts` → `onRequestError` |
| 클라이언트 경계 오류 | `error.tsx` → `useEffect` |
| 루트 레이아웃 오류 | `global-error.tsx` → `useEffect` |
| 미처리 클라이언트 거부(rejection) | `app/layout.tsx` 전역 리스너 |

**핵심 체크리스트:**
- `instrumentation.ts`는 `/app` 내부가 아닌 프로젝트 루트에 위치
- Next.js 15.3 미만은 `next.config.ts`에 `instrumentationHook: true` 설정 필요
- `error.tsx`의 로거는 렌더 본문이 아닌 `useEffect` 안에서 호출
- 서버/클라이언트 로그 모두 `digest` 포함 → 상관관계 추적 가능
- 로깅 실패는 조용히 삼켜야 함 (오류 UI를 다시 충돌시켜선 안 됨)
- PII(개인정보) 전송 전 제거 (비밀번호, 토큰 등)

---

### nextjs-user-logging

> **언제 사용하나요?** Next.js 앱에서 페이지 뷰, 클릭 이벤트, 폼 제출, Core Web Vitals, 라우트 변경을 추적할 때 (PostHog, Amplitude, 커스텀 엔드포인트)

클라이언트 오버헤드를 최소화하면서 사용자 행동을 추적합니다.

**이벤트별 포착 위치:**

| 이벤트 | 포착 위치 |
|--------|-----------|
| 페이지 뷰 | `layout.tsx` 서버 로그 또는 `useReportWebVitals` |
| Core Web Vitals | 루트 레이아웃의 `useReportWebVitals` |
| 클릭/인터랙션 | `useUserEvent` 클라이언트 훅 |
| 폼 제출 | `useUserEvent` in `onSubmit` |
| 라우트 변경 | 루트 Client Component의 `usePathname` effect |

**핵심 체크리스트:**
- PII 미수집 (명시적 동의 없이 이메일, 이름, IP 수집 금지)
- 내비게이션 중 이벤트는 `sendBeacon` 사용 (fetch는 페이지 언로드 시 취소됨)
- 모든 추적 호출은 fire-and-forget (UI 블로킹 금지)
- `RouteTracker`는 첫 마운트를 건너뜀 (첫 페이지 뷰 이중 집계 방지)
- 이벤트명은 `snake_case`로 통일 (네이밍 컨벤션 정의)
- 로컬 개발 시 분석 기능은 feature flag 또는 env var로 비활성화

---

### nextjs-tdd

> **언제 사용하나요?** Next.js 컴포넌트, 훅, 서버 액션 테스트를 작성하거나 수정할 때 — 구현 코드 작성 *전에* (TDD), 또는 테스트가 실패하거나 누락되었거나 불안정할 때

**기술 스택:** Vitest + React Testing Library

**TDD 사이클:**

```
RED:     실패하는 테스트를 먼저 작성 (행동 명세)
          ↓
GREEN:   테스트를 통과시키는 최소한의 구현 작성
          ↓
REFACTOR: 테스트를 깨지 않으면서 코드 정리
```

**테스트 유형별 패턴:**

| 테스트 대상 | 도구 | 패턴 |
|-------------|------|------|
| 렌더 출력 | `render` + `screen.getBy*` | 텍스트/역할 존재 여부 검증 |
| 사용자 인터랙션 | `userEvent.setup()` + `await user.click()` | 상태 변화 검증 |
| 비동기 요소 | `await screen.findBy*` | 자동 대기 |
| 커스텀 훅 | `renderHook` + `act` | 반환값 검증 |
| Server Component | `render(await Page())` | `vi.mock`으로 데이터 의존성 모킹 |
| 폼 제출 | `userEvent.type` + `userEvent.click` | 제출 후 결과 검증 |

**핵심 원칙:**
- `fireEvent` 대신 `userEvent` 사용 (실제 브라우저 이벤트 시뮬레이션)
- `getByText` 대신 `getByRole` 사용 (텍스트 변경에 강건함)
- 내부 상태(`useState` 값)가 아닌 사용자가 보고 행동하는 것을 테스트
- Server Component는 `render(await Page())` — 반드시 `await` 필요

---

### nextjs-tanstack-query

> **언제 사용하나요?** Client Component에서 서버 데이터 페칭이 필요할 때 — `useEffect+useState` 페칭 패턴이 보일 때, mutation 후 캐시 무효화가 필요할 때, 로딩/에러 상태를 수동 관리하고 있을 때

TanStack Query v5 기준 패턴을 강제합니다. v4와의 API 차이(`isPending`, `useSuspenseQuery`, `gcTime`)를 명시하고 올바른 사용을 유도합니다.

**주요 내용:**

| 패턴 | 내용 |
|------|------|
| `useQuery` | `staleTime` 필수 명시, `isPending`/`isError` 상태 처리 |
| `useMutation` | `onSuccess`에서 `invalidateQueries` 또는 `setQueryData` |
| Optimistic Update | `onMutate` + `onError` rollback 쌍 |
| Suspense 연동 | `useSuspenseQuery` (v5에서 `suspense: true` 옵션 삭제됨) |
| SSR Prefetch | `HydrationBoundary`로 Server Component → Client Component 초기 데이터 전달 |

**결정 트리:** 서버 데이터이고 Client Component이면 TanStack Query. Server Component는 직접 fetch.

---

### nextjs-query-key-factory

> **언제 사용하나요?** query key가 파일 곳곳에 인라인 문자열/배열로 흩어진 경우, 캐시 무효화 범위를 정밀하게 제어해야 할 때, 새 프로젝트에서 QueryClient를 초기 설정할 때, 테스트 간 캐시 상태가 공유될 때

**주요 내용:**

| 패턴 | 내용 |
|------|------|
| Key Factory | `userKeys.all` → `userKeys.lists()` → `userKeys.detail(id)` 계층 구조 |
| QueryClient 싱글톤 | `app/providers.tsx`에서 생성, 서버(요청마다 새 인스턴스) / 클라이언트(한 번만) 분리 |
| 전역 defaultOptions | `staleTime`, `retry`, `refetchOnWindowFocus` 전역 설정 |
| 테스트 격리 | 테스트마다 `createTestQueryClient()` — 캐시 오염 방지 |

**예외:** 앱 전체 쿼리가 3개 미만이면 인라인 `['entity', id]` 배열 허용.

---

### nextjs-design-system-tokens

> **언제 사용하나요?** 디자인 시스템을 처음 구축할 때, Figma 토큰을 코드로 옮길 때, Primitive/Semantic 토큰 계층을 설계할 때, 다크모드/브랜드 변형 테마 전환을 구현할 때

3계층 토큰 시스템으로 컴포넌트 코드 수정 없이 테마를 바꿀 수 있는 구조를 설계합니다.

**3계층 구조:**

```
Primitive   원시값 (헥스 코드가 존재하는 유일한 곳)
  └─ Semantic   목적 기반 CSS 변수 (컴포넌트가 참조)
       └─ Component  컴포넌트 전용 오버라이드 (필요한 경우만)
```

**주요 내용:**

| 계층 | 예시 | 역할 |
|------|------|------|
| Primitive | `--primitive-gray-500: #6B7280` | 원시값, 직접 참조 금지 |
| Semantic | `--color-text-secondary: var(--primitive-gray-500)` | 목적 기반 별칭 |
| Tailwind 연동 | `colors: { 'text-secondary': 'var(--color-text-secondary)' }` | 유틸리티 클래스 생성 |

**shadcn/ui 사용 시:** 별도 시스템 생성 금지, `globals.css`의 CSS 변수 확장.

---

### nextjs-zustand

> **언제 사용하나요?** `nextjs-state-design`에서 Zustand를 선택한 후 구현 단계 — slice 패턴으로 store를 구조화할 때, selector로 리렌더링을 최적화할 때, persist/devtools/immer 미들웨어를 연결할 때

**주요 내용:**

| 패턴 | 내용 |
|------|------|
| Slice 패턴 | 도메인별 `StateCreator`, `store/index.ts`에서 합성 |
| Selector 최적화 | `useStore(s => s.items)` — 전체 store 구독 금지 |
| `useShallow` | 여러 값 동시 구독 시 불필요한 리렌더링 방지 |
| immer 미들웨어 | 중첩 상태 직접 변경 (불변성 자동 처리) |
| persist 미들웨어 | `version` + `migrate` 필수 — 스키마 변경 시 localStorage 파싱 오류 방지 |
| devtools | `enabled: process.env.NODE_ENV === 'development'` — prod 번들 포함 금지 |

**Zustand가 맞는 경우:** 서버 데이터가 아닌, URL 반영이 불필요한, 여러 컴포넌트 간 공유 상태.

---

## 스킬 사용 방법

Claude Code에서 스킬은 자동으로 감지되어 적용됩니다.  
명시적으로 호출하려면 다음과 같이 대화에서 언급하세요:

```
새 ProductCard 컴포넌트를 만들려고 해. 설계부터 잡아줘.
→ nextjs-component-design 스킬 자동 적용

장바구니 상태를 어떻게 관리할지 결정해야 해.
→ nextjs-state-design 스킬 자동 적용

이 페이지 성능 점검해줘.
→ nextjs-performance-review 스킬 자동 적용

이 컴포넌트 접근성 검토해줘.
→ nextjs-accessibility-review 스킬 자동 적용

스타일링 끝났어, 디자인 토큰 일관성 확인해줘.
→ nextjs-design-token-consistency 스킬 자동 적용

오류가 전체 페이지를 날려버리는데 격리하고 싶어.
→ nextjs-error-boundary 스킬 자동 적용

에러가 Sentry에 안 들어오고 있어.
→ nextjs-error-logging 스킬 자동 적용

사용자 행동 분석을 심어야 해.
→ nextjs-user-logging 스킬 자동 적용

이 컴포넌트 테스트 코드 먼저 짜줘.
→ nextjs-tdd 스킬 자동 적용

useEffect로 API 데이터 fetch하고 있어.
→ nextjs-tanstack-query 스킬 자동 적용

query key가 파일마다 다르게 쓰이고 있어.
→ nextjs-query-key-factory 스킬 자동 적용

디자인 시스템 토큰 구조를 잡아야 해.
→ nextjs-design-system-tokens 스킬 자동 적용

Zustand store를 구조화하고 싶어.
→ nextjs-zustand 스킬 자동 적용
```

---

## 스킬 적용 흐름

일반적인 Next.js 기능 개발 시 권장 스킬 적용 순서:

```
1. 기능 설계
   └─ nextjs-component-design      (컴포넌트 구조 및 Server/Client 분리)
   └─ nextjs-state-design           (상태 유형 및 위치 결정)
       ├─ nextjs-tanstack-query     (서버 데이터 페칭 — Client Component)
       ├─ nextjs-query-key-factory  (Query Key 중앙화 + QueryClient 설정)
       └─ nextjs-zustand            (전역 클라이언트 상태 — Slice/Selector/미들웨어)

2. 테스트 작성 (TDD)
   └─ nextjs-tdd                    (구현 전 실패하는 테스트 먼저 작성)

3. 구현 완료 후
   └─ nextjs-performance-review     (렌더링 전략, 번들, 이미지, 리렌더링)
   └─ nextjs-accessibility-review   (WCAG 2.1 AA 준수 여부)
   └─ nextjs-design-token-consistency (하드코딩 값 정리)
   └─ nextjs-design-system-tokens   (디자인 시스템 토큰 계층 설계/감사)
   └─ nextjs-error-boundary         (오류 격리 및 복구 UI)
   └─ nextjs-error-logging          (서버/클라이언트 오류 로깅 연결)
   └─ nextjs-user-logging           (사용자 행동 추적 계측)

4. PR 제출
```

---

## 버전 히스토리

| 버전 | 변경 내용 |
|------|-----------|
| v1.3.0 | `nextjs-tanstack-query`, `nextjs-query-key-factory`, `nextjs-design-system-tokens`, `nextjs-zustand` 추가. `nextjs-error-boundary` 심화 개정 (render-phase 범위, global-error, Suspense 조합) |
| v1.2.0 | `nextjs-tdd`, `nextjs-error-boundary`, `nextjs-error-logging`, `nextjs-user-logging` 추가. 전체 스킬 CSO 개선 |
| v1.1.0 | `nextjs-performance-review`에 PPR(Partial Prerendering) 및 Turbopack 섹션 추가 |
| v1.0.0 | 최초 릴리즈 — 5개 스킬 포함 |

---

## 관련 링크

- GitHub: [skybaer0804/nova-skills](https://github.com/skybaer0804/nova-skills)
- Claude Code: [claude.ai/code](https://claude.ai/code)
