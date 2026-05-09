---
name: nextjs-accessibility-review
description: Use when a Next.js component or page needs accessibility validation — before PR, when adding interactive elements, forms, modals, or navigation, or when WCAG 2.1 AA compliance, screen reader support, or keyboard navigation is required.
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
탭 UI는 단순 버튼이 아닌 복합 위젯 — ARIA APG 패턴 전체가 필요하다.

- [ ] 탭 컨테이너: `role="tablist"` + `aria-label` (컨텍스트 이름)
- [ ] 각 탭 버튼: `role="tab"` + `aria-selected={isActive}` + `aria-controls="panel-id"`
- [ ] 각 패널: `role="tabpanel"` + `aria-labelledby="tab-id"` + `tabIndex={0}`
- [ ] Roving tabindex: 활성 탭 `tabIndex={0}`, 나머지 `tabIndex={-1}`
- [ ] ←→ 화살표 키로 탭 간 이동, Tab 키로 패널 진입

```tsx
// ✅ Tab composite widget 전체 패턴
<div role="tablist" aria-label="상품 정보">
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

### SVG 아이콘
- [ ] 버튼 내 장식용 SVG: `aria-hidden="true"` + `focusable="false"` — 버튼의 `aria-label`이 이름 제공
- [ ] SVG title/desc가 있는 경우 버튼 `aria-label`과 중복 읽힘 방지 확인

```tsx
// ✅ 아이콘 전용 버튼
<button aria-label="공유">
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
| Tab 버튼에 `aria-selected` 없음 | 활성 탭에 `aria-selected={true}`, 나머지 `aria-selected={false}` 필수 |
| 탭을 Tab 키로만 이동 가능 | Roving tabindex + ←→ 화살표 키 구현 — Tab 키는 패널 진입용 |
| SVG 아이콘에 `aria-hidden` 누락 | 버튼 안 SVG에 `aria-hidden="true"` + `focusable="false"` 추가 |
| `aria-live` 영역 일부 텍스트만 읽힘 | `aria-atomic="true"` 추가 — 전체 메시지를 하나의 단위로 읽도록 |

## Quick Test
Run in browser console to surface obvious issues:
```js
// Check for images without alt
document.querySelectorAll('img:not([alt])').length
// Check for inputs without labels
document.querySelectorAll('input:not([aria-label]):not([id])').length
```
