---
name: nextjs-design-system-tokens
description: Use when building a design system from scratch, migrating Figma tokens to code, structuring primitive and semantic token layers, or setting up theme switching (dark mode, brand variants).
---

# Next.js Design System Tokens

## Overview
3계층 토큰 시스템으로 디자인 시스템을 설계한다: **Primitive → Semantic → Component**. 컴포넌트는 Semantic 토큰만 참조하므로 테마 변경 시 컴포넌트 코드를 건드리지 않아도 된다.

## 3계층 구조

```
Primitive   원시값. 컴포넌트에서 직접 사용 금지.
  └─ Semantic   목적 기반 별칭. 컴포넌트가 참조하는 토큰.
       └─ Component  컴포넌트 전용 오버라이드 (꼭 필요한 경우만).
```

| 계층 | 예시 | 변경 주체 |
|------|------|-----------|
| Primitive | `gray-500: #6B7280` | 디자이너 |
| Semantic | `text-secondary: gray-500` | 디자이너 + 개발자 |
| Component | `input-placeholder: text-secondary` | 개발자 |

## Enforcement Rules

| 패턴 | 근거 | 예외 허용 케이스 |
|------|------|----------------|
| 컴포넌트 코드에서 primitive 직접 참조 금지 | primitive 변경 시 모든 컴포넌트를 수동으로 교체해야 함 | 프로토타입/스파이크 코드는 허용 — `// temp` 주석 필수, PR 전 정리 |
| Semantic token은 CSS 변수로 정의 (`--color-*`) | Tailwind config만으로는 런타임 테마 전환 불가 | 테마 전환 없는 소규모 정적 앱은 `tailwind.config` 확장만으로 허용 |
| Token 이름은 목적 기반 (`--color-surface-danger`) | 색상 기반 이름(`--color-red`)은 다크모드에서 의미가 역전됨 | - |
| shadcn/ui 사용 시 `globals.css` CSS 변수 우선 확장 | shadcn 컴포넌트가 CSS 변수에 의존 — 별도 시스템 추가 시 충돌 | - |

## 1. Primitive 토큰

원시값만 정의. 헥스 코드가 나타나는 유일한 곳.

```css
/* styles/tokens/primitive.css */
:root {
  --primitive-gray-50:   #F9FAFB;
  --primitive-gray-100:  #F3F4F6;
  --primitive-gray-200:  #E5E7EB;
  --primitive-gray-300:  #D1D5DB;
  --primitive-gray-400:  #9CA3AF;
  --primitive-gray-500:  #6B7280;
  --primitive-gray-900:  #111827;

  --primitive-blue-500:  #3B82F6;
  --primitive-blue-600:  #2563EB;

  --primitive-red-500:   #EF4444;
  --primitive-green-500: #22C55E;

  --primitive-space-1: 0.25rem;
  --primitive-space-2: 0.5rem;
  --primitive-space-4: 1rem;
  --primitive-space-6: 1.5rem;
}
```

## 2. Semantic 토큰

Primitive를 목적에 매핑. 라이트/다크 모드 모두 여기서 정의.

```css
/* styles/tokens/semantic.css */
:root {
  --color-text-primary:    var(--primitive-gray-900);
  --color-text-secondary:  var(--primitive-gray-500);
  --color-text-disabled:   var(--primitive-gray-300);
  --color-text-on-primary: #ffffff;

  --color-surface-default: #ffffff;
  --color-surface-subtle:  var(--primitive-gray-50);
  --color-surface-danger:  var(--primitive-red-500);
  --color-surface-success: var(--primitive-green-500);

  --color-border-default:  var(--primitive-gray-200);
  --color-border-focus:    var(--primitive-blue-500);

  --space-component-sm: var(--primitive-space-2);
  --space-component-md: var(--primitive-space-4);
  --space-component-lg: var(--primitive-space-6);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary:    var(--primitive-gray-50);
    --color-text-secondary:  var(--primitive-gray-400);
    --color-surface-default: var(--primitive-gray-900);
    --color-surface-subtle:  var(--primitive-gray-800);
    --color-border-default:  var(--primitive-gray-700);
  }
}
```

## 3. 타이포그래피 시맨틱 레이어

Primitive 파일에는 원시 size/weight/line-height만 있고, semantic 파일에서 용도별로 조합한다.

```css
/* styles/tokens/semantic.css — typography */
:root {
  /* 헤딩 (display → h5) */
  --typography-display-size:   var(--primitive-font-size-5xl);  /* 48px */
  --typography-display-weight: var(--primitive-font-weight-bold);
  --typography-h1-size:        var(--primitive-font-size-4xl);  /* 36px */
  --typography-h1-weight:      var(--primitive-font-weight-bold);
  --typography-h2-size:        var(--primitive-font-size-3xl);  /* 30px */
  --typography-h2-weight:      var(--primitive-font-weight-semibold);
  --typography-h3-size:        var(--primitive-font-size-2xl);  /* 24px */
  --typography-h4-size:        var(--primitive-font-size-xl);   /* 20px */
  --typography-h5-size:        var(--primitive-font-size-lg);   /* 18px */

  /* 본문 / 서브텍스트 */
  --typography-body-size:      var(--primitive-font-size-md);   /* 16px */
  --typography-body-sm-size:   var(--primitive-font-size-sm);   /* 14px */
  --typography-caption-size:   var(--primitive-font-size-xs);   /* 12px */
  --typography-caption-weight: var(--primitive-font-weight-medium);
  --typography-label-size:     var(--primitive-font-size-sm);   /* 14px, 인터랙티브 */
  --typography-label-weight:   var(--primitive-font-weight-medium);
}
```

```ts
// tailwind.config.ts — 타이포그래피 Tailwind 매핑
fontSize: {
  'display': ['var(--typography-display-size)', { fontWeight: 'var(--typography-display-weight)' }],
  'h1':      ['var(--typography-h1-size)',      { fontWeight: 'var(--typography-h1-weight)' }],
  'body':    ['var(--typography-body-size)',    {}],
  'body-sm': ['var(--typography-body-sm-size)', {}],
  'caption': ['var(--typography-caption-size)', { fontWeight: 'var(--typography-caption-weight)' }],
  'label':   ['var(--typography-label-size)',   { fontWeight: 'var(--typography-label-weight)' }],
}
```

**label vs caption:** label(14px, medium)은 폼 인풋 옆 인터랙티브 텍스트, caption(12px)은 타임스탬프·메타 등 passive 텍스트 — 같은 크기라도 목적이 다르므로 별도 토큰으로 분리.

## 4. 컬러 강도 변형 네이밍

같은 목적색을 강도 수준별로 구분할 때 `-subtle` / `-bold` 패턴을 사용한다.

| 토큰 패턴 | 용도 |
|-----------|------|
| `--color-{name}` | 주 CTA, fill 버튼, 선택 상태 |
| `--color-{name}-subtle` | ghost 배경, chip/tag 배경, hover 오버레이 |
| `--color-{name}-bold` | 고강조 (destructive 확인 버튼, 포화된 상태 표시) |
| `--color-{name}-disabled` | 비활성 — 색조를 유지해 "버튼"임을 인지 가능하게 |

```css
/* 예시 — danger 계열 */
--color-surface-danger:        var(--primitive-red-50);   /* inline 오류 카드 배경 */
--color-surface-danger-bold:   var(--primitive-red-500);  /* 삭제 확인 버튼 bg    */
--color-text-danger:           var(--primitive-red-700);  /* 오류 메시지 텍스트   */
```

## 5. 브랜드 컬러 추출 방법론

브랜드 컬러가 없고 로고만 있을 때:

1. 로고 PNG 추출 (배경 포함, 2x) — Color Thief 또는 `sharp` / `get-pixels + quantize`로 dominant 색상 후보 3개 추출
2. 각 후보의 WCAG 대비 확인 — 흰 배경 대비 ≥ 4.5:1 (소문자 기준) 필수
3. 미달 시: 동일 H+S를 유지하고 L만 낮춰 대비 통과 지점 찾기
4. 확정된 H+S로 50→900 스케일 파생 (L 10% 단위 스텝)
5. `primitive.css`에 16진수 코드로 선언 → semantic 토큰에서 목적에 매핑

```
#3182F6 = HSL(217°, 91%, 58%) → 흰 배경 대비 ~3.2:1 (AA 미달)
L을 45%로 낮추면 → ~5.2:1 (AA 통과) → 이 값을 interactive-primary로
```

## 6. Tailwind 연동

**Tailwind 기본 팔레트 차단:** `theme.colors`를 `extend` 안에 넣으면 `text-gray-500`, `text-blue-500` 같은 primitive 직접 참조가 여전히 동작한다. semantic 토큰만 노출하려면 `extend` 밖에 선언해 기본 팔레트를 교체한다.

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    colors: {                    // ← extend 안이 아닌 theme.colors 직접 선언 → 기본 팔레트 차단
      transparent: 'transparent',
      current: 'currentColor',
      'text-primary':    'var(--color-text-primary)',
      'text-secondary':  'var(--color-text-secondary)',
      'text-disabled':   'var(--color-text-disabled)',
      'surface-default': 'var(--color-surface-default)',
      'surface-subtle':  'var(--color-surface-subtle)',
      'surface-danger':  'var(--color-surface-danger)',
      'border-default':  'var(--color-border-default)',
      'border-focus':    'var(--color-border-focus)',
    },
    extend: {
      spacing: {
        'component-sm': 'var(--space-component-sm)',
        'component-md': 'var(--space-component-md)',
        'component-lg': 'var(--space-component-lg)',
      },
    },
  },
}
export default config
```

```tsx
// ✅ 컴포넌트에서 semantic 클래스 사용
<p className="text-text-secondary">보조 텍스트</p>
<div className="bg-surface-subtle border border-border-default p-component-md">...</div>

// ❌ 컴포넌트에서 primitive 직접 참조 금지
<p className="text-gray-500">보조 텍스트</p>
```

## 7. shadcn/ui 프로젝트

shadcn/ui는 자체 CSS 변수 시스템을 사용한다. 별도 시스템을 만들지 말고 확장한다.

```css
/* app/globals.css — shadcn 변수 확장, 별도 시스템 생성 금지 */
:root {
  /* shadcn 기본 변수 (shadcn init으로 이미 정의됨) */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --primary: 221.2 83.2% 53.3%;
  --destructive: 0 84.2% 60.2%;

  /* 추가 semantic 토큰 — shadcn의 HSL 형식 사용 */
  --surface-brand: 221.2 83.2% 53.3%;
  --color-success: 142.1 76.2% 36.3%;
}
```

```tsx
// shadcn 토큰 사용
<p className="text-muted-foreground">보조 텍스트</p>
<div className="bg-background border-border">...</div>
```

## 8. 새 토큰 추가 체크리스트

값이 2곳 이상 반복되고 기존 토큰이 없을 때:

- [ ] Primitive에 원시값이 있는가? 없으면 `primitive.css`에 추가
- [ ] 목적 기반 이름인가? (색상 기반 아님)
- [ ] `semantic.css`에 라이트 + 다크 값 정의
- [ ] `tailwind.config.ts`에 Tailwind 매핑 추가
- [ ] 하드코딩된 모든 기존 값 교체 (`nextjs-design-token-consistency` 스킬로 감사)

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 프로젝트에 `text-text-secondary`가 있는데 `text-gray-500` 사용 | 항상 semantic 토큰 사용 |
| `--color-red-danger` 같은 색상 기반 이름 | `--color-surface-danger`로 — 목적 기반 이름 |
| CSS 변수 시스템과 Tailwind 확장이 공존 | 하나의 시스템으로 통일 |
| shadcn 프로젝트에 별도 `tokens.css` 생성 | `globals.css`의 변수 확장 |
| 다크모드 색상을 컴포넌트마다 하드코딩 | Semantic 계층에서 `@media` 블록으로 정의 |
| `theme.extend.colors`에 semantic 토큰 추가 | `theme.colors`에 직접 선언 — 기본 팔레트 차단 |
| 삭제 버튼과 오류 카드 배경에 같은 `--color-surface-danger` 사용 | `-bold` 변형 도입 — 카드 배경은 subtle, 버튼은 bold |
| 타이포그래피를 `text-sm`, `text-base`만으로 표현 | semantic 레이어에 `caption`, `label`, `body-sm` 명명 — 목적 전달 |
| 브랜드 컬러를 로고에서 그대로 추출해 사용 | WCAG 대비 확인 후 L값 조정 — 원본이 AA 미달인 경우 많음 |
