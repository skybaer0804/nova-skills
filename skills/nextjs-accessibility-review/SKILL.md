---
name: nextjs-accessibility-review
description: Use when a Next.js component or page implementation is complete and needs accessibility validation before PR, or when adding interactive elements, forms, modals, or navigation.
---

# Next.js Accessibility Review

## Overview
Systematically verify WCAG 2.1 AA compliance in Next.js components. Catches issues at review time rather than after deployment.

## Checklist

### Semantic HTML
- [ ] Headings are hierarchical (h1 → h2 → h3, no skipping)
- [ ] Lists use `<ul>`/`<ol>`, not `<div>` chains
- [ ] Buttons trigger actions, `<a>` tags navigate
- [ ] `<main>`, `<nav>`, `<header>`, `<footer>` landmarks present on pages

### ARIA
- [ ] Interactive elements without visible text have `aria-label` or `aria-labelledby`
- [ ] Dynamic content updates use `aria-live` (status → `polite`, errors → `assertive`)
- [ ] Modal/dialog has `role="dialog"`, `aria-modal="true"`, focus trap on open
- [ ] No redundant ARIA (e.g., `<button role="button">`)

### Keyboard Navigation
- [ ] All interactive elements reachable by Tab
- [ ] Focus order matches visual/logical order
- [ ] Custom components handle Enter/Space for activation, Escape for dismissal
- [ ] Visible focus indicator present (don't `outline: none` without replacement)

### Images & Media
- [ ] Decorative images: `alt=""`
- [ ] Informative images: meaningful `alt` text
- [ ] Next.js `<Image>` always has `alt` prop

### Color & Contrast
- [ ] Text contrast ≥ 4.5:1 (normal), ≥ 3:1 (large text)
- [ ] Information not conveyed by color alone (error states have icon/text too)

### Forms
- [ ] Every input has an associated `<label>` (via `htmlFor` or `aria-label`)
- [ ] Error messages linked via `aria-describedby`
- [ ] Required fields marked with `aria-required="true"`

## Next.js Specific

| Pattern | A11y Note |
|---------|-----------|
| Server Components | Can't use `useEffect` for focus management — handle in Client Component wrapper |
| `next/link` | Renders `<a>` — ensure meaningful link text, not "click here" |
| `next/image` | `alt` is required prop but verify it's meaningful, not filename |
| Client-side routing | Announce page change with `aria-live` region or focus management |
| Loading states | Use `aria-busy="true"` on the loading container |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `onClick` on `<div>` | Use `<button>` or add `role="button"` + `tabIndex={0}` + keyboard handlers |
| Modal without focus trap | Install `focus-trap-react` or implement manually |
| Icon-only button | Add `aria-label="Close"` or visually hidden `<span>` |
| Placeholder as label | Add real `<label>` element |

## Quick Test
Run in browser console to surface obvious issues:
```js
// Check for images without alt
document.querySelectorAll('img:not([alt])').length
// Check for inputs without labels
document.querySelectorAll('input:not([aria-label]):not([id])').length
```
