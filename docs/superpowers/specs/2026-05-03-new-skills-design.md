# Nova Skills — 신규 스킬 5개 설계 문서

**작성일:** 2026-05-03  
**상태:** 승인됨

---

## 개요

nova-skills에 5개 스킬을 추가/교체한다.

| 스킬 | 작업 | 파일 경로 |
|------|------|-----------|
| `nextjs-tanstack-query` | 신규 생성 | `skills/nextjs-tanstack-query/SKILL.md` |
| `nextjs-query-key-factory` | 신규 생성 | `skills/nextjs-query-key-factory/SKILL.md` |
| `nextjs-design-system-tokens` | 신규 생성 | `skills/nextjs-design-system-tokens/SKILL.md` |
| `nextjs-error-boundary` | 기존 파일 대체 | `skills/nextjs-error-boundary/SKILL.md` |
| `nextjs-zustand` | 신규 생성 | `skills/nextjs-zustand/SKILL.md` |

---

## 설계 원칙

### 스킬 포맷: "결정 우선" 스타일
모든 스킬은 다음 구조를 따른다:
1. **언제 사용하는가** (트리거 조건)
2. **결정 트리 또는 분류 기준** (무엇을 선택할 것인가)
3. **강제 패턴 + 예외 테이블** (패턴 | 근거 | 예외 허용 케이스)
4. **핵심 코드 예시**
5. **흔한 실수**

### Opt-out 메커니즘 (C안)
- 빠른 참조: 예외 허용 케이스를 테이블로 표시
- 복잡한 판단이 필요한 패턴: 근거(Why) + 예외 조건 서술
- 목표: 개발자가 "왜"를 알면 스스로 예외를 판단할 수 있도록

---

## 스킬 1: `nextjs-tanstack-query` (신규)

### 버전 기준
**TanStack Query v5** 기준으로 작성한다. v5 주요 변경사항:
- `isLoading` → `isPending` (초기 로딩 상태)
- `suspense: true` 옵션 제거 → `useSuspenseQuery` 훅으로 분리
- `cacheTime` → `gcTime`
- v4 프로젝트 사용자를 위해 v4/v5 차이 주석을 코드 예시에 병기한다.

### 트리거
- Client Component에서 서버 데이터를 페칭할 때
- `useEffect + useState` 페칭 패턴을 발견했을 때
- mutation 후 캐시 무효화가 필요할 때
- 로딩/에러 상태 처리가 반복될 때

### 강제 패턴 + 예외

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| `staleTime` 항상 명시 | 기본값 0은 매 포커스마다 리페칭 → 불필요한 네트워크 요청 | 실시간 데이터(주식, 채팅)는 `staleTime: 0` 허용 |
| `queryKey`는 배열, 항상 구체적 | 캐시 무효화 범위 제어 불가 | - |
| mutation 후 `invalidateQueries` 또는 `setQueryData` | 서버-클라이언트 데이터 동기화 | 단순 fire-and-forget mutation은 invalidate 생략 가능 |
| `isLoading` + `isError` 상태 처리 필수 | UX와 접근성 | storybook/테스트 환경에서 mock 데이터만 쓸 경우 생략 가능 |
| Optimistic update는 `onMutate` + `onError` rollback 쌍으로 | rollback 없는 optimistic update는 데이터 불일치 위험 | 실패해도 UX 영향 없는 좋아요/조회수 등은 rollback 생략 가능 |

### 포함할 섹션
- `useQuery` 기본 패턴
- `useMutation` + invalidation
- Optimistic update 패턴
- Suspense 연동 (`suspense: true`)
- SSR prefetch (`prefetchQuery` in Server Component)
- 흔한 실수 테이블

---

## 스킬 2: `nextjs-query-key-factory` (신규)

### 트리거
- query key가 문자열/임의 배열로 흩어져 있을 때
- 특정 엔티티의 캐시 전체를 무효화해야 할 때
- QueryClient 초기 설정이 없거나 테스트마다 인스턴스가 공유될 때
- `invalidateQueries`의 범위를 정밀하게 제어해야 할 때

### 강제 패턴 + 예외

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| Key Factory 함수로 중앙화 (`userKeys`, `productKeys` 등) | 문자열 key 분산 시 오타·불일치로 캐시 버그 발생 | 쿼리가 앱 전체에 3개 미만이면 인라인 배열 허용 |
| 계층 구조: `['entity']` → `['entity', 'list']` → `['entity', 'detail', id]` | 상위 key 무효화로 하위 전체 무효화 가능 | - |
| `QueryClient`는 `app/providers.tsx`에서 단일 인스턴스로 생성 | 컴포넌트 내부 생성 시 리렌더마다 새 인스턴스 → 캐시 소실 | 테스트 환경은 각 테스트마다 새 인스턴스 필수 (캐시 격리) |
| `defaultOptions`에 `staleTime`, `retry` 전역 설정 | 쿼리마다 반복 설정 방지 | 특정 쿼리가 전역값과 다를 경우 쿼리 레벨에서 오버라이드 허용 |

### 핵심 코드 패턴
```ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}
```

### 포함할 섹션
- Key Factory 패턴 전체 예시
- 계층적 무효화 사용법
- `app/providers.tsx` QueryClient 인스턴스화 코드
- `defaultOptions` 전역 설정
- 테스트 환경 인스턴스 격리 방법

---

## 스킬 3: `nextjs-design-system-tokens` (신규)

### 트리거
- 디자인 시스템을 처음 설계할 때
- Figma 토큰을 코드로 옮겨야 할 때
- primitive 색상과 semantic 색상이 혼재할 때
- 다크모드/브랜드 테마 전환이 필요할 때

### 3계층 토큰 구조 (강제)

```
Primitive (원시값)  →  Semantic (의미)  →  Component (컴포넌트 전용)
gray-500: #6B7280  →  text-secondary: gray-500  →  button-text: text-secondary
```

### 강제 패턴 + 예외

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| 컴포넌트 코드에서 primitive 직접 참조 금지 | primitive 변경 시 전체 수동 교체 필요 | 프로토타입 단계는 허용, `// temp` 주석 필수 |
| semantic token은 CSS 변수로 정의 (`--color-text-secondary`) | Tailwind만으론 다크모드·테마 런타임 전환 불가 | Tailwind만 쓰는 소규모 프로젝트에서 테마 전환 없으면 `tailwind.config` 확장만으로 허용 |
| shadcn/ui 사용 시 `globals.css` CSS 변수 우선 | shadcn 컴포넌트가 CSS 변수에 의존 | - |
| semantic token 이름은 용도 기반 (`--color-surface-danger`) | 색상 기반 이름은 다크모드에서 의미가 역전됨 | - |

### 포함할 섹션
- 3계층 설계 단계별 예시 (primitive → semantic → component)
- Tailwind + CSS 변수 연동 방법
- 다크모드 토큰 구조
- shadcn/ui 토큰 오버라이드 패턴
- Figma Token 연동 힌트
- 흔한 실수 테이블

---

## 스킬 4: `nextjs-error-boundary` (기존 대체)

### 변경 이유
기존 스킬은 설정 중심(코드 예시 나열). 교체 버전은 **개념 이해 + 상황별 선택 기준**을 추가한다.

### 트리거
- 런타임 오류가 페이지 전체를 날릴 때
- `error.tsx`/`global-error.tsx` 부재 시
- Suspense와 Error Boundary 조합이 필요할 때
- 위젯 단위 오류 격리가 필요할 때

### 핵심 개념 (추가)
React Error Boundary는 **렌더 단계 오류만** 잡는다. 이벤트 핸들러, 비동기 코드(`setTimeout`, `fetch`)는 잡지 못한다. 이 경우는 `try/catch` + `nextjs-error-logging` 스킬로 처리.

### 선택 기준 결정 트리
```
오류가 어디서 발생하는가?
  라우트 전체    → error.tsx
  루트 레이아웃  → global-error.tsx
  특정 위젯만    → 커스텀 <ErrorBoundary> 컴포넌트
  Suspense 내부  → ErrorBoundary로 Suspense 감싸기
```

### 강제 패턴 + 예외

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| 데이터 페칭하는 모든 라우트에 `error.tsx` 필수 | 서버 오류 시 흰 화면 방지 | 정적 페이지(데이터 페칭 없음)는 생략 가능 |
| `global-error.tsx` 루트에 필수 | 루트 layout 오류 시 마지막 방어선 | - |
| `error.tsx`는 반드시 `'use client'` | Next.js 요구사항 — 누락 시 빌드 오류 | - |
| `reset()` 버튼 항상 제공 | 전체 새로고침 없이 복구 가능해야 함 | 복구 불가능한 오류(인증 만료 등)는 redirect로 대체 허용 |
| 커스텀 `ErrorBoundary`는 `getDerivedStateFromError` + `componentDidCatch` 쌍으로 | `componentDidCatch`에서 로깅 연동 가능 | 로깅 불필요한 경우 `getDerivedStateFromError`만 허용 |
| prod에서 `error.message` 노출 금지 | 스택 트레이스 노출은 보안 위험 | dev 환경은 허용 |

### 포함할 섹션
- React Error Boundary 동작 원리 (렌더 오류만 처리)
- 상황별 선택 결정 트리
- `error.tsx` / `global-error.tsx` 코드
- 커스텀 `ErrorBoundary` 컴포넌트
- Suspense + ErrorBoundary 조합
- `react-error-boundary` 라이브러리 활용 옵션
- 이벤트 핸들러 오류 별도 처리 안내

---

## 스킬 5: `nextjs-zustand` (신규)

### 트리거
- `nextjs-state-design`에서 Zustand 선택 후 구현 단계 진입 시
- store가 거대해져 분리가 필요할 때
- 불필요한 리렌더링이 Zustand에서 발생할 때
- persist/devtools 연동이 필요할 때

### 강제 패턴 + 예외

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| slice 패턴으로 도메인별 분리 | 하나의 거대한 store는 관심사 혼재, 테스트 어려움 | store 상태가 5개 미만이면 단일 store 허용 |
| selector로 필요한 상태만 구독 (`useCartStore(s => s.items)`) | store 전체 구독 시 무관한 상태 변경에도 리렌더링 | 컴포넌트가 store 전체를 실제로 사용하는 경우 전체 구독 허용 |
| `immer` 미들웨어로 불변성 처리 | 중첩 객체 spread 지옥 방지 | 평탄한 단순 상태는 immer 없이 허용 |
| `devtools` 미들웨어는 dev 환경에서만 활성화 | prod bundle에 devtools 포함 방지 | - |
| 서버 데이터를 Zustand에 저장 금지 | React Query 캐시와 이중 관리 → 동기화 버그 | - |
| `persist` 사용 시 `version` + `migrate` 함께 정의 | 스키마 변경 시 기존 localStorage 데이터 파싱 오류 방지 | localStorage 초기화를 허용하는 개발 단계는 생략 가능 |

### 포함할 섹션
- slice 패턴 코드 (도메인별 분리)
- selector 최적화
- immer 미들웨어 통합
- persist + migrate 패턴
- devtools 조건부 활성화
- Zustand store 테스트 패턴
- 흔한 실수 테이블

---

## README 업데이트 범위

신규 스킬 4개를 README에 추가하고, 버전을 v1.3.0으로 올린다.
`nextjs-state-design` 스킬 설명에 "Zustand 선택 후 → nextjs-zustand 스킬 참조" 안내 추가.
