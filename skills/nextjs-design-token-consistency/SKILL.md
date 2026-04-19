---
name: nextjs-design-token-consistency
description: Use after completing styling work in a Next.js project to check for hardcoded colors, spacing, or typography values that should use design tokens or Tailwind config values instead.
---

# Next.js Design Token Consistency

## Overview
Find and replace hardcoded style values with design system tokens. Prevents visual inconsistency and makes theme changes impossible to maintain.

## What to Scan For

### Hardcoded Colors
```tsx
// ❌ Bad
<div style={{ color: '#6B7280' }}>
<div className="text-[#6B7280]">

// ✅ Good — use Tailwind semantic color
<div className="text-gray-500">
// or custom token from tailwind.config
<div className="text-muted-foreground">
```

### Hardcoded Spacing
```tsx
// ❌ Bad
<div style={{ padding: '12px 16px' }}>
<div className="p-[12px]">

// ✅ Good
<div className="px-4 py-3">
```

### Hardcoded Typography
```tsx
// ❌ Bad
<p style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500 }}>

// ✅ Good
<p className="text-sm font-medium leading-5">
// or design system variant
<p className="body-sm">
```

### Magic Numbers in Tailwind
Arbitrary values like `w-[437px]`, `mt-[13px]` are red flags unless they come from a design spec with no equivalent token.

## Review Process

**1. Search for inline styles:**
```bash
grep -r "style={{" src/components --include="*.tsx" | grep -v "// ok"
```

**2. Search for arbitrary Tailwind values:**
```bash
grep -rE "\[#[0-9a-fA-F]{3,6}\]|\[([\d.]+)(px|rem|em)\]" src --include="*.tsx"
```

**3. Check tailwind.config for available tokens:**
```ts
// tailwind.config.ts — what tokens does the project define?
theme: {
  extend: {
    colors: { ... },
    spacing: { ... },
    fontFamily: { ... },
  }
}
```

## Decision Table

| Situation | Action |
|-----------|--------|
| Color exists in Tailwind palette | Use Tailwind class |
| Color is semantic (background, text, border) | Add to `tailwind.config` as semantic token |
| Spacing matches Tailwind scale (4px grid) | Use Tailwind class |
| Value from design spec with no equivalent | Add named token to config, document it |
| One-off value that won't repeat | Acceptable as arbitrary, add `// one-off` comment |

## Adding a Design Token

When a value repeats 2+ times and has no matching token:

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'brand-primary': '#0F172A',
      'surface-elevated': '#F8FAFC',
    },
    spacing: {
      'card-padding': '1.5rem',
    }
  }
}
```

Then replace all occurrences before committing.

## shadcn/ui Projects

If using shadcn/ui, tokens are in `globals.css` as CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted-foreground: 215.4 16.3% 46.9%;
}
```

Always prefer `text-foreground`, `bg-muted`, `border-border` etc. over raw colors.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `text-gray-500` when project has `text-muted-foreground` | Use the semantic token |
| Hardcoding dark mode colors | Use `dark:` variant or CSS variables |
| Different shades for same semantic meaning | Pick one, add to config, use everywhere |
