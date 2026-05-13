# nova-skills

**Claude Code용 Next.js 프론트엔드 + NestJS 백엔드 + React Three.js/R3F 3D + AI 에이전트 프로토콜 스킬 모음입니다.**

코드를 작성하기 *전에* 올바른 결정을 내리도록 설계된 리뷰 및 설계 워크플로우를 제공합니다.  
잘못된 렌더링 전략, 빈약한 컴포넌트 설계, 접근성 누락, 잘못된 인증 설계 등 배포 후에 발견하면 비용이 큰 문제들을 사전에 잡아냅니다.

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
  - [nextjs-feature-scaffold](#nextjs-feature-scaffold)
  - [pnpm](#pnpm)
  - [docker-compose](#docker-compose)
  - [github-actions](#github-actions)
- [Three.js / R3F](#threejs--r3f)
  - [r3f-scene-design](#r3f-scene-design)
  - [three-scene-setup](#three-scene-setup)
  - [three-materials](#three-materials)
  - [r3f-interaction](#r3f-interaction)
  - [r3f-animation](#r3f-animation)
  - [r3f-performance](#r3f-performance)
- [NestJS 백엔드](#nestjs-백엔드)
  - [nestjs-module-design](#nestjs-module-design)
  - [nestjs-module-structure](#nestjs-module-structure)
  - [nestjs-auth-jwt](#nestjs-auth-jwt)
  - [nestjs-rbac](#nestjs-rbac)
  - [nestjs-typeorm](#nestjs-typeorm)
  - [nestjs-file-upload](#nestjs-file-upload)
  - [nestjs-validation](#nestjs-validation)
- [AI 에이전트 프로토콜](#ai-에이전트-프로토콜)
  - [agent-protocol-design](#agent-protocol-design)
  - [agent-mcp](#agent-mcp)
  - [agent-a2a](#agent-a2a)
  - [agent-ag-ui](#agent-ag-ui)
  - [agent-a2ui](#agent-a2ui)
  - [agent-ucp](#agent-ucp)
  - [agent-ap2](#agent-ap2)
  - [agent-architect-tdd-loop](#agent-architect-tdd-loop)
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

### nextjs-feature-scaffold

> **언제 사용하나요?** 새 Next.js 페이지나 기능을 만들 때 — React Query, Zustand, 커스텀 훅, ErrorBoundary를 함께 쓰는 경우 어떤 순서로 결정하고 파일을 어떻게 구조화할지 코드 작성 전에 정리할 때

React Query + 도메인 훅 + Zustand + ErrorBoundary 네 가지 패턴을 올바른 순서로 조합합니다. 관심사 혼재, 잘못된 에러 경계 배치, 상태 도구 오선택을 방지합니다.

**주요 내용:**

| 단계 | 내용 |
|------|------|
| Step 1 | 상태 분류 — API 데이터 / 전역 UI 상태 / URL 상태 / 로컬 상태 결정 트리 |
| Step 2 | Server vs Client 컴포넌트 분리 — `page.tsx`는 항상 Server Component |
| Step 3 | 도메인 훅 설계 — React Query + Zustand selector를 하나의 훅으로 묶기 |
| Step 4 | ErrorBoundary 배치 — `resetKeys` 연결 + Client Component 제약 처리 |

**핵심 패턴 — 도메인 훅:**
```ts
// hooks/use-product-list.ts
export function useProductList() {
  const filters = useProductFilterStore((s) => s.filters)   // Zustand
  const { data, isPending } = useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => fetchProducts(filters),
    staleTime: 60_000,
    throwOnError: true,   // ErrorBoundary로 자동 전파
  })
  return { products: data ?? [], isPending }
}
```

컴포넌트는 `useProductList()` 하나만 import — `useQuery`와 `useStore`를 직접 혼용하지 않는다.

---

### pnpm

> **언제 사용하나요?** 패키지 설치, 스크립트 실행, 프로젝트 스캐폴딩 시 — npm/yarn 대신 pnpm을 사용할 때

콘텐츠 주소 기반 저장소와 하드 링크로 디스크 절약, 설치 속도 향상, 팬텀 의존성 차단.

| npm 명령어 | pnpm 명령어 |
|-----------|------------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm run dev` | `pnpm dev` |
| `npx create-next-app` | `pnpm create next-app` |
| `npx <cmd>` | `pnpm dlx <cmd>` |

---

### docker-compose

> **언제 사용하나요?** NestJS/Node.js 앱을 Docker Compose로 로컬에서 실행할 때 — PostgreSQL 등 DB 서비스 추가, 앱이 DB 준비 전에 시작되는 문제, 컨테이너와 호스트의 node_modules 충돌 시

| 항목 | 내용 |
|------|------|
| DB 준비 대기 | `depends_on: condition: service_healthy` + `healthcheck` 필수 |
| node_modules 충돌 | 볼륨에 `- /app/node_modules` 추가 (anonymous volume) |
| 이미지 태그 | `postgres:16-alpine` — `latest` 사용 금지 |
| Dockerfile | 멀티스테이지: `development` / `builder` / `production` |
| 보안 | 프로덕션 스테이지에서 non-root user 필수 |

### github-actions

> **언제 사용하나요?** GitHub Actions CI/CD 워크플로우를 만들 때 — pnpm + Node.js 프로젝트에서 PR 자동 빌드 검사, main 브랜치 배포, DB가 필요한 통합 테스트 실행 시

| 항목 | 내용 |
|------|------|
| pnpm setup | `pnpm/action-setup@v4` — `@v3` 아님 |
| Node 캐시 | `setup-node`의 `cache: 'pnpm'` — 별도 `actions/cache` 불필요 |
| install | `pnpm install --frozen-lockfile` 필수 |
| 권한 | `permissions: contents: read` 명시 |
| 중복 실행 | `concurrency` 그룹으로 PR 동일 브랜치 중복 취소 |
| 파일 분리 | `ci.yml` (PR) / `deploy.yml` (push to main + `environment: production`) |

---

## Three.js / R3F

### r3f-scene-design

> **언제 사용하나요?** React에서 Three.js 씬을 만들기 전에 — Canvas, 인터랙션, 애니메이션, 성능 중 어떤 패턴이 필요한지 결정할 때

| 질문 | 스킬 |
|------|------|
| Canvas/Camera/Light/Mesh 기초 | `three-scene-setup` |
| Material/텍스처/PBR | `three-materials` |
| 클릭/hover/카메라 컨트롤 | `r3f-interaction` |
| 애니메이션(회전/스프링/GSAP) | `r3f-animation` |
| 100개+ 오브젝트 / GLTF 로딩 | `r3f-performance` |

---

### three-scene-setup

> **언제 사용하나요?** React Three Fiber 씬을 처음 설정할 때 — Canvas, Camera, Light, 기본 Mesh, OrbitControls가 필요할 때

| 항목 | 내용 |
|------|------|
| 진입점 | `<Canvas>` — `new THREE.Scene()` 사용 금지 |
| 조명 | `<ambientLight>` + `<directionalLight>` 필수 |
| 카메라 컨트롤 | drei `<OrbitControls />` |
| delta 사용 | `useFrame((_, delta) => ...)` — 프레임 독립적 |

---

### three-materials

> **언제 사용하나요?** 3D 오브젝트에 PBR 재질을 적용할 때 — 금속/거친 표면, 텍스처 로딩, 환경 반사가 필요할 때

| 항목 | 내용 |
|------|------|
| PBR 재질 | `MeshStandardMaterial` + `metalness` + `roughness` |
| 반사 | `<Environment preset="studio">` + `envMapIntensity` |
| 텍스처 | `useTexture` (drei) — `THREE.TextureLoader` 직접 사용 금지 |

---

### r3f-interaction

> **언제 사용하나요?** 3D 오브젝트에 클릭/hover 이벤트를 추가할 때 — raycasting, OrbitControls, cursor 변경이 필요할 때

| 항목 | 내용 |
|------|------|
| 이벤트 | mesh에 `onClick`, `onPointerOver`, `onPointerOut` 직접 부착 |
| mesh 접근 | `useRef<Mesh>()` — `document.querySelector` 사용 금지 |
| 카메라 | drei `<OrbitControls />` |

---

### r3f-animation

> **언제 사용하나요?** 3D 오브젝트를 애니메이션할 때 — 연속 회전, 사인파 이동, 스프링 바운스, GSAP 타임라인이 필요할 때

| 항목 | 내용 |
|------|------|
| 연속 애니메이션 | `useFrame` — `setInterval`/`requestAnimationFrame` 금지 |
| 스프링 | `@react-spring/three` + `animated.mesh` |
| 타임라인 | GSAP + `useEffect` + `meshRef` |

---

### r3f-performance

> **언제 사용하나요?** 많은 3D 오브젝트를 렌더링하거나 GLTF 모델을 로딩할 때 — draw call이 높거나 로딩 깜빡임이 발생할 때

| 항목 | 내용 |
|------|------|
| 대량 오브젝트 | `<instancedMesh>` — 100개 이상 map 렌더링 금지 |
| GLTF 로딩 | `useGLTF` (drei) + `<Suspense>` 필수 |
| geometry/material | `useMemo`로 한 번만 생성 |

---

## NestJS 백엔드

### nestjs-module-design

> **언제 사용하나요?** 새 NestJS 기능을 만들기 전에 — 인증, 권한, DB, 파일 업로드, 검증 중 어떤 패턴이 필요한지 결정할 때

| 질문 | 스킬 |
|------|------|
| 모듈 파일 구조 (Controller/Service/Entity) | `nestjs-module-structure` |
| 로그인 / JWT 인증 | `nestjs-auth-jwt` |
| 역할/권한 제어 | `nestjs-rbac` |
| DB 엔티티 / 마이그레이션 | `nestjs-typeorm` |
| 파일 업로드 / 썸네일 | `nestjs-file-upload` |
| 요청 데이터 검증 | `nestjs-validation` |

---

### nestjs-module-structure

> **언제 사용하나요?** 새 NestJS 기능 모듈을 만들 때 — Controller/Service/Entity/DTO 파일을 어떻게 나누고 @Module로 연결할지 결정할 때

**핵심 패턴:** `@PrimaryGeneratedColumn('uuid')` + `@InjectRepository(Entity)` 주입 + `TypeOrmModule.forFeature([Entity])` 등록

---

### nestjs-auth-jwt

> **언제 사용하나요?** NestJS에서 로그인과 JWT 인증을 구현할 때 — Passport Local Strategy, RS256 토큰 서명, JwtAuthGuard로 라우트를 보호할 때

| 항목 | 내용 |
|------|------|
| 알고리즘 | RS256 (비대칭 키) — HS256 사용 금지 |
| 키 관리 | `fs.readFileSync('keys/private.key')` 파일 기반 |
| LocalStrategy | `passport-local` — 로그인 검증 담당 |
| JwtStrategy | `algorithms: ['RS256']` 명시 필수 |

---

### nestjs-rbac

> **언제 사용하나요?** NestJS에서 역할 기반 접근 제어를 구현할 때 — `user:read`, `texture:delete` 같은 permission 문자열로 라우트를 제한할 때

| 항목 | 내용 |
|------|------|
| Guard 순서 | `AuthGuard('jwt')` (인증) → `PermissionsGuard` (권한) |
| Permission | `user:delete` 같은 문자열 — `UserRole.ADMIN` 열거형 사용 금지 |
| Role 구조 | Role 엔티티 many-to-many + `permissions: string[]` |

---

### nestjs-typeorm

> **언제 사용하나요?** NestJS에서 TypeORM Entity를 설계하거나 MySQL 연결을 설정할 때 — `synchronize` 옵션, UUID PK, Migration을 결정할 때

| 항목 | 내용 |
|------|------|
| PK | `@PrimaryGeneratedColumn('uuid')` |
| synchronize | 개발에서만 `true`, 운영은 Migration |
| 관계 로딩 | `eager: true` 금지 — 쿼리별 `relations` 명시 |
| password | `@Column({ select: false })` 필수 |

---

### nestjs-file-upload

> **언제 사용하나요?** NestJS에서 파일 업로드를 구현할 때 — Multer diskStorage, Sharp 썸네일 생성, 한글 파일명 RFC 5987 인코딩이 필요할 때

| 항목 | 내용 |
|------|------|
| 저장 | `diskStorage()` — `memoryStorage()` 아님 |
| 검증 | `file.mimetype` 화이트리스트 (확장자 검증 금지) |
| 처리 순서 | 썸네일 생성 → 메타데이터 추출 → DB 저장 |
| 다운로드 | `filename*=UTF-8''${encodeURIComponent(...)}` RFC 5987 |

---

### nestjs-validation

> **언제 사용하나요?** NestJS 엔드포인트에 요청 데이터 검증을 추가할 때 — class-validator DTO 또는 ValidationPipe 전역 등록이 필요할 때

| 항목 | 내용 |
|------|------|
| 전역 등록 | `main.ts`에 `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` |
| await | `await NestFactory.create(AppModule)` — await 누락 시 파이프 미적용 |
| UpdateDto | `PartialType(CreateDto)` — 중복 작성 금지 |

---

## AI 에이전트 프로토콜

### agent-protocol-design

> **언제 사용하나요?** AI 에이전트를 새로 만들거나 기능을 추가할 때 — MCP/A2A/AG-UI/A2UI/UCP/AP2 중 어떤 프로토콜 조합이 필요한지 결정하기 전에

레이어드 결정 트리로 필요한 프로토콜 조합을 선택하는 진입점 스킬.

| 레이어 | 질문 |
|--------|------|
| Layer 1 | 에이전트가 무엇을 하는가? (도구 호출 / 에이전트 위임 / 상거래 / 결제) |
| Layer 2 | 출력이 어디로 가는가? (프론트 스트리밍 / UI 컴포넌트 / 백엔드만) |
| Layer 3 | 대표 조합 패턴 선택 |

---

### agent-mcp

> **언제 사용하나요?** 에이전트가 외부 DB, API, 파일시스템, 도구에 연결해야 할 때

| 항목 | 내용 |
|------|------|
| Transport | stdio (로컬) / HTTP+SSE (원격) |
| TypeScript SDK | `@modelcontextprotocol/sdk` |
| Python (ADK) | `McpToolset` + `StdioConnectionParams` |
| 공식 문서 | https://modelcontextprotocol.io |

---

### agent-a2a

> **언제 사용하나요?** 에이전트가 다른 에이전트에게 서브태스크를 위임하거나 멀티 에이전트 시스템을 구축할 때

| 항목 | 내용 |
|------|------|
| 핵심 개념 | AgentCard (`/.well-known/agent-card.json`), Task, Artifact |
| Python (ADK) | `to_a2a()` 서버 노출 + `A2AClient` 클라이언트 |
| TypeScript | `@a2a-protocol/client` |
| 공식 문서 | https://a2a-protocol.org/ |

---

### agent-ag-ui

> **언제 사용하나요?** 프론트엔드에서 에이전트 실행을 실시간 스트리밍해야 할 때 — 텍스트 델타, 툴 호출 이벤트, human-in-the-loop

| 항목 | 내용 |
|------|------|
| 표준 이벤트 | `RUN_STARTED`, `TEXT_MESSAGE_CONTENT`, `TOOL_CALL_*`, `RUN_FINISHED`, `RUN_ERROR` |
| Python (ADK) | `ag_ui_adk` + `ADKAgent` + `add_adk_fastapi_endpoint` |
| TypeScript | CopilotKit (`@copilotkit/react-core`, `@copilotkit/react-ui`) |
| 공식 문서 | https://docs.ag-ui.com/ |

---

### agent-a2ui

> **언제 사용하나요?** 에이전트가 텍스트 대신 카드/폼/버튼 같은 동적 UI 컴포넌트를 생성해야 할 때

| 항목 | 내용 |
|------|------|
| 프리미티브 | 18개 (Card, Column, Row, Text, Button, TextField 등) |
| 전달 방식 | AG-UI 스트림을 통해 전달 (단독 사용 불가) |
| 핵심 패턴 | 구조(컴포넌트 트리)와 데이터 분리 — `dataModelUpdate`만으로 UI 갱신 |
| 공식 문서 | https://a2ui.org/ |

---

### agent-ucp

> **언제 사용하나요?** 에이전트가 전자상거래 주문을 처리해야 할 때 — 공급업체별 API 없이 표준화된 체크아웃

| 항목 | 내용 |
|------|------|
| 핵심 개념 | Discovery Profile, CheckoutSession, Idempotency-Key |
| Python SDK | `ucp-sdk` |
| 주의 | 결제 필요 시 `agent-ap2`와 함께 사용 |
| 공식 문서 | https://ucp.dev/ |

---

### agent-ap2

> **언제 사용하나요?** 에이전트가 결제를 자율 실행할 때 — 한도/가맹점 제한 가드레일, 암호화 서명, 감사 추적 필요 시

| 항목 | 내용 |
|------|------|
| 3단계 | IntentMandate (가드레일) → PaymentMandate (결제 권한) → PaymentReceipt (감사 추적) |
| Python SDK | `ap2-sdk` |
| 주의 | UCP 없이 단독 사용 불가 |
| 공식 문서 | https://ap2-protocol.org/ |

---

### agent-architect-tdd-loop

> **언제 사용하나요?** Architect (Opus 4.7) → Implementer(s) (Sonnet 4.6) → Tester 루프로 기능을 구현할 때 — TDD 강제 적용, 병렬 서브태스크, 동일 이슈 3회 실패 시 강제 재설계

| 항목 | 내용 |
|------|------|
| Architect | Opus 4.7 — 설계, 테스트 계획, 결과 리뷰 |
| Implementer | Sonnet 4.6 — RED(실패 테스트) → GREEN(최소 구현), 독립 태스크 병렬 실행 |
| Tester | Sonnet 4.6 — Unit → Integration → E2E 순서 실행 |
| 루프 가드 | `iteration = 3` + `FAIL` → REDESIGN 강제 실행 |
| 테스트 기본 | Unit 필수, 나머지는 Architect 판단 |
| 상태 전달 | `docs/loop-state.md` 파일로 역할 간 컨텍스트 공유 |

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

React Query + Zustand + 에러 바운더리로 페이지를 만들어야 해.
→ nextjs-feature-scaffold 스킬 자동 적용

npm install 대신 pnpm 써줘.
→ pnpm 스킬 자동 적용

GitHub Actions CI 워크플로우 만들어줘.
→ github-actions 스킬 자동 적용

NestJS 프로젝트 시작하는데 어디서부터 시작해야 해.
→ nestjs-module-design 스킬 자동 적용

NestJS 모듈 파일 구조를 잡아야 해.
→ nestjs-module-structure 스킬 자동 적용

NestJS JWT 로그인을 구현해야 해.
→ nestjs-auth-jwt 스킬 자동 적용

어드민만 삭제할 수 있게 권한 제어를 해야 해.
→ nestjs-rbac 스킬 자동 적용

TypeORM 엔티티 설계와 마이그레이션이 필요해.
→ nestjs-typeorm 스킬 자동 적용

이미지 파일 업로드와 썸네일 생성이 필요해.
→ nestjs-file-upload 스킬 자동 적용

NestJS 요청 데이터 검증을 DTO로 처리하고 싶어.
→ nestjs-validation 스킬 자동 적용

AI 에이전트 만들려는데 어떤 프로토콜 써야 할지 모르겠어.
→ agent-protocol-design 스킬 자동 적용

에이전트에서 DB나 외부 API 연결이 필요해.
→ agent-mcp 스킬 자동 적용

에이전트끼리 통신하는 멀티 에이전트 시스템 만들어야 해.
→ agent-a2a 스킬 자동 적용

Next.js에서 에이전트 응답을 실시간으로 스트리밍해야 해.
→ agent-ag-ui 스킬 자동 적용

에이전트가 카드나 버튼 같은 UI를 동적으로 만들어야 해.
→ agent-a2ui 스킬 자동 적용

에이전트가 자율적으로 전자상거래 주문을 처리해야 해.
→ agent-ucp 스킬 자동 적용

에이전트 결제에 한도 설정과 감사 추적이 필요해.
→ agent-ap2 스킬 자동 적용

설계자-구현자-테스터 루프로 기능을 TDD로 구현해야 해.
→ agent-architect-tdd-loop 스킬 자동 적용
```

---

## 스킬 적용 흐름

일반적인 개발 시 권장 스킬 적용 순서:

```
0. Three.js/R3F 3D 씬 개발 시 (먼저 실행)
   └─ r3f-scene-design       (어떤 패턴 필요한지 결정 — 진입점)
       ├─ three-scene-setup   (Canvas + Light + Mesh 기초)
       ├─ three-materials     (PBR + 텍스처 + envMap)
       ├─ r3f-interaction     (클릭/hover + OrbitControls)
       ├─ r3f-animation       (useFrame + react-spring + GSAP)
       └─ r3f-performance     (InstancedMesh + useGLTF + Suspense)

0. NestJS 백엔드 개발 시 (먼저 실행)
   └─ nestjs-module-design      (어떤 패턴 필요한지 결정 — 진입점)
       ├─ nestjs-auth-jwt        (로그인 + RS256 JWT + Guard)
       ├─ nestjs-rbac            (permission 문자열 접근 제어)
       ├─ nestjs-module-structure (Controller/Service/Entity 구조)
       ├─ nestjs-typeorm         (Entity + Migration)
       ├─ nestjs-file-upload     (Multer + Sharp 썸네일)
       └─ nestjs-validation      (DTO + ValidationPipe 전역)

0. AI 에이전트 개발 시 (먼저 실행)
   └─ agent-protocol-design     (어떤 프로토콜 조합 필요한지 결정 — 진입점)
       ├─ agent-mcp             (외부 도구/DB 연결)
       ├─ agent-a2a             (에이전트 간 통신)
       ├─ agent-ag-ui           (프론트엔드 실시간 스트리밍)
       ├─ agent-a2ui            (동적 UI 컴포넌트 생성)
       ├─ agent-ucp             (전자상거래 트랜잭션)
       ├─ agent-ap2             (결제 승인 + 감사 추적)
       └─ agent-architect-tdd-loop (Opus 설계자 + Sonnet 구현자 + 테스터 TDD 루프)

1. 기능 설계
   └─ nextjs-feature-scaffold       (페이지/기능 전체 패턴 오케스트레이션 — 아래 스킬들의 진입점)
       ├─ nextjs-component-design   (컴포넌트 구조 및 Server/Client 분리)
       ├─ nextjs-state-design       (상태 유형 및 위치 결정)
       ├─ nextjs-tanstack-query     (서버 데이터 페칭 — Client Component)
       ├─ nextjs-query-key-factory  (Query Key 중앙화 + QueryClient 설정)
       ├─ nextjs-zustand            (전역 클라이언트 상태 — Slice/Selector/미들웨어)
       └─ nextjs-error-boundary     (에러 격리 및 resetKeys 연결)

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
   └─ github-actions                 (CI/CD 워크플로우 — pnpm/action-setup@v4, concurrency, permissions)
```

---

## 버전 히스토리

| 버전 | 변경 내용 |
|------|-----------|
| v2.2.0 | `agent-architect-tdd-loop` 대폭 강화 — 레벨 기반 자가수정(CRITICAL/HIGH 기록 전용·MEDIUM/LOW 자유 수정), META-CHECK 중간 체크, 회고 에이전트, meta-state.md 3-파일 시스템, 자기완결 ROLE CONTRACT, 프롬프트 인젝션 방어, 사전 조사(WebSearch→context7). GitHub Actions 주간 스킬 자동 강화 워크플로우 추가 |
| v2.1.0 | `agent-architect-tdd-loop` 스킬 추가 — Opus 4.7 설계자 + Sonnet 4.6 구현자 + 테스터 3-역할 TDD 루프, 병렬 처리, 3회 실패 시 강제 재설계 |
| v2.0.0 | `github-actions` 스킬 추가 — pnpm CI/CD 워크플로우, concurrency 그룹, permissions, service container 패턴 |
| v1.9.0 | `docker-compose` 스킬 추가 — NestJS + PostgreSQL 로컬 개발 설정, service_healthy, 멀티스테이지 Dockerfile |
| v1.8.0 | Three.js/R3F 3D 스킬 6개 추가 (`r3f-scene-design`, `three-scene-setup`, `three-materials`, `r3f-interaction`, `r3f-animation`, `r3f-performance`). 도메인 확장 (React 3D) |
| v1.7.0 | NestJS 백엔드 스킬 7개 추가 (`nestjs-module-design`, `nestjs-module-structure`, `nestjs-auth-jwt`, `nestjs-rbac`, `nestjs-typeorm`, `nestjs-file-upload`, `nestjs-validation`). 도메인 확장 (Next.js + NestJS + AI 에이전트 프로토콜) |
| v1.6.0 | `pnpm` 스킬 추가 — npm 대신 pnpm 사용, 명령어 대조표, 장단점 |
| v1.5.0 | AI 에이전트 프로토콜 스킬 7개 추가 (`agent-protocol-design`, `agent-mcp`, `agent-a2a`, `agent-ag-ui`, `agent-a2ui`, `agent-ucp`, `agent-ap2`). 도메인 확장 (Next.js + AI 에이전트 프로토콜) |
| v1.4.0 | `nextjs-feature-scaffold` 추가 — React Query + 도메인 훅 + Zustand + ErrorBoundary 오케스트레이션 스킬 |
| v1.3.0 | `nextjs-tanstack-query`, `nextjs-query-key-factory`, `nextjs-design-system-tokens`, `nextjs-zustand` 추가. `nextjs-error-boundary` 심화 개정 (render-phase 범위, global-error, Suspense 조합) |
| v1.2.0 | `nextjs-tdd`, `nextjs-error-boundary`, `nextjs-error-logging`, `nextjs-user-logging` 추가. 전체 스킬 CSO 개선 |
| v1.1.0 | `nextjs-performance-review`에 PPR(Partial Prerendering) 및 Turbopack 섹션 추가 |
| v1.0.0 | 최초 릴리즈 — 5개 스킬 포함 |

---

## 관련 링크

- GitHub: [skybaer0804/nova-skills](https://github.com/skybaer0804/nova-skills)
- Claude Code: [claude.ai/code](https://claude.ai/code)
