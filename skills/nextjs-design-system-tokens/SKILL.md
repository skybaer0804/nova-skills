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

## 3. Tailwind 연동

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'text-primary':    'var(--color-text-primary)',
        'text-secondary':  'var(--color-text-secondary)',
        'text-disabled':   'var(--color-text-disabled)',
        'surface-default': 'var(--color-surface-default)',
        'surface-subtle':  'var(--color-surface-subtle)',
        'surface-danger':  'var(--color-surface-danger)',
        'border-default':  'var(--color-border-default)',
        'border-focus':    'var(--color-border-focus)',
      },
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

## 4. shadcn/ui 프로젝트

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

## 5. 새 토큰 추가 체크리스트

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
