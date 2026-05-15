---
name: nextjs-design-system-tokens
description: Use when building a design system from scratch, migrating Figma tokens to code, when components reference raw color/spacing values directly, or when dark mode or brand variants require duplicating values.
created: 2026-05-04
updated: 2026-05-09
---

# Next.js Design System Tokens

## Overview
Design the design system using a 3-layer token system: **Primitive → Semantic → Component**. Components reference only Semantic tokens, so theme changes require no modifications to component code.

## 3-Layer Structure

```
Primitive   Raw values. Never used directly in components.
  └─ Semantic   Purpose-based aliases. The tokens components reference.
       └─ Component  Component-specific overrides (only when necessary).
```

| Layer | Example | Owner |
|-------|---------|-------|
| Primitive | `gray-500: #6B7280` | Designer |
| Semantic | `text-secondary: gray-500` | Designer + Developer |
| Component | `input-placeholder: text-secondary` | Developer |

## Enforcement Rules

| Pattern | Rationale | Allowed Exceptions |
|---------|-----------|-------------------|
| No direct primitive references in component code | Changing a primitive requires manually updating every component | Prototype/spike code is allowed — `// temp` comment required, must be cleaned up before PR |
| Semantic tokens defined as CSS variables (`--color-*`) | Tailwind config alone cannot handle runtime theme switching | Small static apps with no theme switching may use only `tailwind.config` extensions |
| Token names are purpose-based (`--color-surface-danger`) | Color-based names (`--color-red`) become semantically inverted in dark mode | - |
| With shadcn/ui, extend `globals.css` CSS variables first | shadcn components depend on CSS variables — adding a separate system causes conflicts | - |

## 1. Primitive Tokens

Define raw values only. The only place hex codes appear.

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

## 2. Semantic Tokens

Map primitives to purposes. Both light and dark mode values are defined here.

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

## 3. Typography Semantic Layer

The primitive file holds raw size/weight/line-height values only; the semantic file combines them by purpose.

```css
/* styles/tokens/semantic.css — typography */
:root {
  /* Headings — same pattern continues for h3 (24px) → h5 (18px) */
  --typography-display-size:   var(--primitive-font-size-5xl);  /* 48px */
  --typography-display-weight: var(--primitive-font-weight-bold);
  --typography-h1-size:        var(--primitive-font-size-4xl);  /* 36px */
  --typography-h1-weight:      var(--primitive-font-weight-bold);
  --typography-h2-size:        var(--primitive-font-size-3xl);  /* 30px */
  --typography-h2-weight:      var(--primitive-font-weight-semibold);

  /* Body / subtext */
  --typography-body-size:      var(--primitive-font-size-md);   /* 16px */
  --typography-body-sm-size:   var(--primitive-font-size-sm);   /* 14px */
  --typography-caption-size:   var(--primitive-font-size-xs);   /* 12px */
  --typography-caption-weight: var(--primitive-font-weight-medium);
  --typography-label-size:     var(--primitive-font-size-sm);   /* 14px, interactive */
  --typography-label-weight:   var(--primitive-font-weight-medium);
}
```

```ts
// tailwind.config.ts — typography Tailwind mapping
fontSize: {
  'display': ['var(--typography-display-size)', { fontWeight: 'var(--typography-display-weight)' }],
  'h1':      ['var(--typography-h1-size)',      { fontWeight: 'var(--typography-h1-weight)' }],
  'body':    ['var(--typography-body-size)',    {}],
  'body-sm': ['var(--typography-body-sm-size)', {}],
  'caption': ['var(--typography-caption-size)', { fontWeight: 'var(--typography-caption-weight)' }],
  'label':   ['var(--typography-label-size)',   { fontWeight: 'var(--typography-label-weight)' }],
}
```

**label vs caption:** label (14px, medium) is interactive text next to form inputs; caption (12px) is passive text for timestamps, metadata, etc. — even at the same size, their purposes differ, so they are separate tokens.

## 4. Color Intensity Variant Naming

Use the `-subtle` / `-bold` pattern to differentiate the same purpose color at different intensity levels.

| Token Pattern | Usage |
|---------------|-------|
| `--color-{name}` | Primary CTA, filled buttons, selected state |
| `--color-{name}-subtle` | Ghost backgrounds, chip/tag backgrounds, hover overlays |
| `--color-{name}-bold` | High emphasis (destructive confirm buttons, saturated status indicators) |
| `--color-{name}-disabled` | Inactive — retains the hue so it's still recognizable as a button |

```css
/* Example — danger family */
--color-surface-danger:        var(--primitive-red-50);   /* inline error card background */
--color-surface-danger-bold:   var(--primitive-red-500);  /* delete confirm button bg     */
--color-text-danger:           var(--primitive-red-700);  /* error message text           */
```

## 5. Brand Color from a Logo

No brand color, only a logo: extract a dominant color (Color Thief / `sharp`), then **check WCAG contrast**. If it fails AA (< 4.5:1 on white for body text), keep H+S and lower L until it passes. Derive a 50→900 scale from the confirmed H+S and declare it in `primitive.css`.

```
#3182F6 = HSL(217°, 91%, 58%) → ~3.2:1 on white (AA fail)
Lower L to 45% → ~5.2:1 (AA pass) → use as interactive-primary
```

## 6. Tailwind Integration

**Blocking the Tailwind default palette:** Placing `theme.colors` inside `extend` still allows direct primitive references like `text-gray-500` and `text-blue-500`. To expose only semantic tokens, declare them outside `extend` to replace the default palette.

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    colors: {                    // ← declared directly in theme.colors, not inside extend → blocks default palette
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
// ✅ Use semantic classes in components
<p className="text-text-secondary">Secondary text</p>
<div className="bg-surface-subtle border border-border-default p-component-md">...</div>

// ❌ No direct primitive references in components
<p className="text-gray-500">Secondary text</p>
```

## 7. shadcn/ui Projects

shadcn/ui ships its own CSS-variable system. **Extend `globals.css`, don't create a parallel system** (see also `nextjs-design-token-consistency`). Add new semantic tokens in shadcn's HSL-triplet format alongside the defaults `shadcn init` already wrote (`--background`, `--foreground`, `--primary`, …):

```css
/* app/globals.css */
--surface-brand: 221.2 83.2% 53.3%;
--color-success: 142.1 76.2% 36.3%;
```

Use the generated classes (`text-muted-foreground`, `bg-background`, `border-border`) — never raw colors.

## 8. New Token Addition Checklist

When a value appears in 2 or more places and no existing token covers it:

- [ ] Does a primitive raw value exist? If not, add it to `primitive.css`
- [ ] Is the name purpose-based? (not color-based)
- [ ] Define light + dark values in `semantic.css`
- [ ] Add Tailwind mapping in `tailwind.config.ts`
- [ ] Replace all existing hardcoded values (audit with the `nextjs-design-token-consistency` skill)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `text-gray-500` when `text-text-secondary` exists in the project | Always use semantic tokens |
| Color-based names like `--color-red-danger` | Use `--color-surface-danger` — purpose-based name |
| CSS variable system and Tailwind extensions coexisting | Unify into a single system |
| Creating a separate `tokens.css` in a shadcn project | Extend the variables in `globals.css` |
| Hardcoding dark mode colors in each component | Define them with an `@media` block in the Semantic layer |
| Adding semantic tokens to `theme.extend.colors` | Declare in `theme.colors` directly — blocks the default palette |
| Using the same `--color-surface-danger` for delete buttons and error card backgrounds | Introduce the `-bold` variant — subtle for card backgrounds, bold for buttons |
| Expressing typography with only `text-sm` and `text-base` | Name `caption`, `label`, `body-sm` in the semantic layer — communicates purpose |
| Using brand color extracted directly from the logo | Check WCAG contrast and adjust L value — the original often fails AA |
