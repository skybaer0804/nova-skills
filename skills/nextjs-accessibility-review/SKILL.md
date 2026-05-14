---
name: nextjs-accessibility-review
description: Use when a Next.js component or page needs accessibility validation — before PR, when adding interactive elements, forms, modals, or navigation, or when WCAG 2.1 AA compliance, screen reader support, or keyboard navigation is required.
created: 2026-04-19
updated: 2026-05-09
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
- [ ] Toast/snackbar uses `role="status"` (= `aria-live="polite"` + `aria-atomic="true"` in one)
- [ ] Live region has `aria-atomic="true"` when the whole message should be read as one unit
- [ ] Modal/dialog has `role="dialog"`, `aria-modal="true"`, focus trap on open
- [ ] No redundant ARIA (e.g., `<button role="button">`)

### Tab Composite Widget
A tab UI is a composite widget, not a simple button — the full ARIA APG pattern is required.

- [ ] Tab container: `role="tablist"` + `aria-label` (context name)
- [ ] Each tab button: `role="tab"` + `aria-selected={isActive}` + `aria-controls="panel-id"`
- [ ] Each panel: `role="tabpanel"` + `aria-labelledby="tab-id"` + `tabIndex={0}`
- [ ] Roving tabindex: active tab `tabIndex={0}`, all others `tabIndex={-1}`
- [ ] ←→ arrow keys to move between tabs, Tab key to enter the panel

```tsx
// ✅ Tab composite widget full pattern
<div role="tablist" aria-label="Product Info">
  {tabs.map((tab, i) => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={active === i}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
      tabIndex={active === i ? 0 : -1}
      onClick={() => setActive(i)}
      onKeyDown={handleArrowKey}
    >
      {tab.label}
    </button>
  ))}
</div>
{tabs.map((tab, i) => (
  <div
    key={tab.id}
    role="tabpanel"
    id={`panel-${tab.id}`}
    aria-labelledby={`tab-${tab.id}`}
    tabIndex={0}
    hidden={active !== i}
  >
    {tab.content}
  </div>
))}
```

### SVG Icons
- [ ] Decorative SVG inside a button: `aria-hidden="true"` + `focusable="false"` — the button's `aria-label` provides the accessible name
- [ ] When SVG has title/desc, verify it does not cause duplicate reading alongside the button's `aria-label`

```tsx
// ✅ Icon-only button
<button aria-label="Share">
  <svg aria-hidden="true" focusable="false" ...>
    <path ... />
  </svg>
</button>
```

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
| Tab button missing `aria-selected` | Active tab must have `aria-selected={true}`, all others `aria-selected={false}` |
| Tabs navigable only by Tab key | Implement roving tabindex + ←→ arrow keys — Tab key is for entering the panel |
| SVG icon missing `aria-hidden` | Add `aria-hidden="true"` + `focusable="false"` to SVG inside buttons |
| Only part of `aria-live` region text is read | Add `aria-atomic="true"` — reads the entire message as a single unit |

## Quick Test
Run in browser console to surface obvious issues:
```js
// Check for images without alt
document.querySelectorAll('img:not([alt])').length
// Check for inputs without labels
document.querySelectorAll('input:not([aria-label]):not([id])').length
```
