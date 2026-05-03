# nova-skills Superpowers Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply superpowers plugin methodology to nova-skills: update plugin metadata, add CLAUDE.md contributor guidelines with TDD rules, add `nextjs-tdd` skill, improve 8 existing SKILL.md files with CSO, and sync `~/.claude/skills/`.

**Architecture:** 4 commits in order — (1) metadata, (2) CLAUDE.md, (3) new skill, (4) CSO improvements — then push and sync personal skills directory.

**Tech Stack:** Markdown, JSON, git — no build tools needed.

---

## File Map

**Create:**
- `.claude-plugin/plugin.json` — updated metadata (v1.2.0)
- `package.json` — version bump to 1.2.0
- `CLAUDE.md` — contributor guidelines with TDD rules
- `skills/nextjs-tdd/SKILL.md` — new Vitest + RTL skill

**Modify (CSO improvements):**
- `skills/nextjs-accessibility-review/SKILL.md`
- `skills/nextjs-component-design/SKILL.md`
- `skills/nextjs-state-design/SKILL.md`
- `skills/nextjs-design-token-consistency/SKILL.md`
- `skills/nextjs-performance-review/SKILL.md`
- `skills/nextjs-error-boundary/SKILL.md`
- `skills/nextjs-error-logging/SKILL.md`
- `skills/nextjs-user-logging/SKILL.md`

**Sync:**
- `~/.claude/skills/nextjs-*/SKILL.md` (5개 업데이트 + 3개 신규 복사 + nextjs-tdd 추가)

---

## Task 1: plugin.json + package.json 메타데이터 보강

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `package.json`

Working dir: `~/.claude/plugins/cache/nova-marketplace/nova-skills/1.1.0`

- [ ] **Step 1: plugin.json 업데이트**

`.claude-plugin/plugin.json`을 아래 내용으로 교체:

```json
{
  "name": "nova-skills",
  "description": "Personal Next.js frontend skills for Claude Code: component design, state management, accessibility, performance, error handling, logging, and TDD patterns.",
  "version": "1.2.0",
  "author": {
    "name": "skybaer0804"
  },
  "homepage": "https://github.com/skybaer0804/nova-skills",
  "repository": "https://github.com/skybaer0804/nova-skills",
  "license": "MIT",
  "keywords": [
    "skills",
    "nextjs",
    "react",
    "frontend",
    "tdd",
    "accessibility",
    "performance"
  ]
}
```

- [ ] **Step 2: package.json 버전 1.2.0으로 업데이트**

`package.json`을 아래 내용으로 교체:

```json
{
  "name": "nova-skills",
  "version": "1.2.0",
  "description": "Personal Claude Code skills for Next.js frontend development"
}
```

- [ ] **Step 3: JSON 유효성 검증**

```bash
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('plugin.json OK')"
python3 -c "import json; json.load(open('package.json')); print('package.json OK')"
```

Expected: 두 줄 모두 `OK` 출력

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json package.json
git commit -m "chore: bump version to 1.2.0 and add plugin metadata"
```

---

## Task 2: CLAUDE.md 추가

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md 작성**

`CLAUDE.md`를 아래 내용으로 생성:

```markdown
# nova-skills — Contributor Guidelines

## If You Are an AI Agent

Stop. Read this section before modifying any skill.

Skills are not prose — they are code that shapes agent behavior. Before touching any skill:

1. **Run a baseline scenario** — spawn a subagent WITHOUT the skill and document its behavior verbatim
2. **Identify what breaks** — record the exact rationalizations or gaps
3. **Write the minimal change** — address only the identified failure
4. **Verify compliance** — run the same scenario WITH the updated skill

If you did not watch an agent fail without the skill first, you do not know if your change fixes anything.

## Skill Writing: TDD Required

Every new skill and every edit to an existing skill MUST follow the RED-GREEN-REFACTOR cycle from `superpowers:writing-skills`:

**RED** — Run a pressure scenario without the skill. Document exact agent behavior verbatim.

**GREEN** — Write minimal skill content that addresses the failures. Re-run and verify.

**REFACTOR** — Identify new rationalizations. Close loopholes. Re-test until bulletproof.

**No exceptions:**
- Not for "adding a section"
- Not for "fixing a typo that affects meaning"
- Not for "updating an example"

Writing a skill without a failing test first = delete it and start over.

## What nova-skills Covers

Next.js frontend skills only. Before adding a skill, ask:

> "Would this only help someone building a Next.js frontend?"

If no → belongs in superpowers or a separate plugin.
If yes → belongs here.

## Skill Quality Standards (CSO)

### Frontmatter
```yaml
---
name: nextjs-skill-name     # letters, numbers, hyphens only
description: Use when ...   # starts with "Use when", triggers only
---
```

### Description Rules
- Starts with `Use when...`
- Written in third person
- Describes **triggering conditions only** — never summarize the skill's workflow
- Includes concrete symptoms: error messages, tool names, observable behaviors
- Under 500 characters

**Bad:**
```yaml
# Summarizes workflow — agent may follow this instead of reading the full skill
description: Use after completing styling — scan for hardcoded values and replace with design tokens
```

**Good:**
```yaml
# Triggering conditions only
description: Use after completing styling work when hardcoded colors, spacing, or magic numbers appear in components instead of Tailwind tokens or CSS variables.
```

### Content Rules
- One excellent code example per pattern — not multiple mediocre ones
- Quick reference tables for scannable lookups
- `Common Mistakes` section with specific fixes
- No version notes inside SKILL.md body (e.g., `> v1.1.0: Added X`)
- No project-specific content (keep skills language-agnostic unless explicitly locale-specific)

## What We Will Not Accept

- Skills outside the Next.js frontend domain
- Skill modifications without baseline test evidence
- Descriptions that summarize workflow instead of triggering conditions
- Version notes or changelogs inside SKILL.md body
```

- [ ] **Step 2: 필수 섹션 체크리스트 검증**

다음 항목이 모두 CLAUDE.md에 존재하는지 확인:
- [ ] AI 에이전트 지침 섹션
- [ ] TDD RED-GREEN-REFACTOR 사이클 설명
- [ ] "No exceptions" 규칙
- [ ] CSO description 규칙 (Bad/Good 예시 포함)
- [ ] "What We Will Not Accept" 섹션

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add contributor guidelines with TDD skill-writing rules"
```

---

## Task 3: nextjs-tdd 신규 스킬 추가

**Files:**
- Create: `skills/nextjs-tdd/SKILL.md`

- [ ] **Step 1: 디렉토리 생성 및 SKILL.md 작성**

```bash
mkdir -p skills/nextjs-tdd
```

`skills/nextjs-tdd/SKILL.md`를 아래 내용으로 생성:

```markdown
---
name: nextjs-tdd
description: Use when writing or fixing tests for Next.js components, hooks, or server actions — before writing implementation code (TDD), or when tests are failing, missing, or flaky.
---

# Next.js TDD

## Overview
Write tests first, then implement. Vitest + React Testing Library for unit and integration tests. Testable components are composable, focused components — TDD improves design.

## Setup

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom'
```

```json
// package.json — add to scripts
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

## TDD Cycle for Next.js

```
RED:     Write failing test that describes behavior
          ↓
GREEN:   Write minimal implementation to pass
          ↓
REFACTOR: Clean up without breaking tests
```

**Never write implementation before test.** If you find yourself writing component code first, stop — write the test first.

## Client Component Tests

```tsx
// components/counter.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './counter'

describe('Counter', () => {
  it('increments count on button click', async () => {
    const user = userEvent.setup()
    render(<Counter initialCount={0} />)

    await user.click(screen.getByRole('button', { name: /increment/i }))

    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
```

## Hook Tests

```tsx
// hooks/use-cart.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCart } from './use-cart'

it('adds item to cart', () => {
  const { result } = renderHook(() => useCart())

  act(() => {
    result.current.addItem({ id: '1', name: 'Product', price: 10 })
  })

  expect(result.current.items).toHaveLength(1)
  expect(result.current.items[0].name).toBe('Product')
})
```

## Server Component Tests

Server Components are async functions — await them before passing to `render`.

```tsx
// app/products/page.test.tsx
import { render, screen } from '@testing-library/react'
import ProductsPage from './page'
import { getProducts } from '@/lib/products'

vi.mock('@/lib/products')

it('renders product list', async () => {
  vi.mocked(getProducts).mockResolvedValue([
    { id: '1', name: 'Test Product', price: 99 },
  ])

  render(await ProductsPage())

  expect(screen.getByText('Test Product')).toBeInTheDocument()
})
```

## Quick Reference

| What to test | Tool | Pattern |
|---|---|---|
| Render output | `render` + `screen.getBy*` | Assert text/role present |
| User interaction | `userEvent.setup()` + `await user.click()` | Assert state change |
| Async element | `await screen.findBy*` | Waits automatically |
| Custom hook | `renderHook` + `act` | Assert returned values |
| Server Component | `render(await Page())` | Mock data deps with `vi.mock` |
| Form submit | `userEvent.type` + `userEvent.click` | Assert result after submit |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `fireEvent` instead of `userEvent` | `userEvent` simulates real browser events including focus/blur |
| `getByText` for UI copy | Use `getByRole` — resilient to copy changes |
| Testing internal state | Test what the user sees and does, not `useState` values |
| Missing context provider | Wrap with providers using a `customRender` helper |
| Server Component missing `await` | `render(await Page())` — async component must be awaited first |
| `act` warning in async tests | Use `await userEvent` or `await screen.findBy*` instead of manual `act` |
```

- [ ] **Step 2: Frontmatter CSO 검증**

다음 확인:
- description이 "Use when..."으로 시작하는가
- description이 워크플로우를 요약하지 않고 트리거 조건만 기술하는가
- "failing", "missing", "flaky" 증상 키워드 포함 여부

- [ ] **Step 3: Commit**

```bash
git add skills/nextjs-tdd/
git commit -m "feat: add nextjs-tdd skill (Vitest + React Testing Library)"
```

---

## Task 4: 기존 8개 SKILL.md CSO 개선

**Files:**
- Modify: `skills/nextjs-accessibility-review/SKILL.md`
- Modify: `skills/nextjs-component-design/SKILL.md`
- Modify: `skills/nextjs-state-design/SKILL.md`
- Modify: `skills/nextjs-design-token-consistency/SKILL.md`
- Modify: `skills/nextjs-performance-review/SKILL.md`
- Modify: `skills/nextjs-error-boundary/SKILL.md`
- Modify: `skills/nextjs-error-logging/SKILL.md`
- Modify: `skills/nextjs-user-logging/SKILL.md`

### 4-1. nextjs-accessibility-review

- [ ] **Step 1: description 개선**

현재:
```yaml
description: Use when a Next.js component or page implementation is complete and needs accessibility validation before PR, or when adding interactive elements, forms, modals, or navigation.
```

변경:
```yaml
description: Use when a Next.js component or page needs accessibility validation — before PR, when adding interactive elements, forms, modals, or navigation, or when WCAG 2.1 AA compliance, screen reader support, or keyboard navigation is required.
```

변경 이유: "WCAG 2.1 AA", "screen reader", "keyboard navigation" 키워드 추가 → 검색 적중률 향상

- [ ] **Step 2: 검증**

description이 "Use when..."으로 시작하고 워크플로우 없이 트리거 조건만 포함하는지 확인.

### 4-2. nextjs-component-design

- [ ] **Step 1: description 개선**

현재:
```yaml
description: Use when designing a new Next.js component before writing implementation code, especially when deciding between Server/Client components, props API shape, or composition strategy.
```

변경:
```yaml
description: Use when designing a new Next.js component before writing implementation code — when deciding Server vs Client component split, props API shape, composition strategy, or data fetching placement.
```

변경 이유: "data fetching placement" 추가로 Step 4 내용을 검색어로 커버.

### 4-3. nextjs-state-design

- [ ] **Step 1: description 개선**

현재:
```yaml
description: Use when a Next.js feature requires state management decisions — choosing between server state, client state, URL state, or deciding where state should live in the component tree.
```

변경:
```yaml
description: Use when a Next.js feature requires state management decisions — when prop drilling, stale data, unnecessary re-renders, or context performance issues appear, or when choosing between server state, URL state, Zustand, or local useState.
```

변경 이유: "prop drilling", "stale data", "re-renders" 증상 키워드 추가.

### 4-4. nextjs-design-token-consistency

- [ ] **Step 1: description 개선**

현재:
```yaml
description: Use after completing styling work in a Next.js project to check for hardcoded colors, spacing, or typography values that should use design tokens or Tailwind config values instead.
```

변경:
```yaml
description: Use after completing styling work when hardcoded colors, inline styles, arbitrary Tailwind values (e.g. text-[#6B7280], p-[12px]), or magic numbers appear instead of design tokens or Tailwind config values.
```

변경 이유: "inline styles", "arbitrary Tailwind values", 구체적 예시 패턴(`text-[#...]`) 추가.

### 4-5. nextjs-performance-review

- [ ] **Step 1: 본문에서 버전 노트 제거**

아래 줄 삭제:
```markdown
> v1.1.0: Added Partial Prerendering (PPR) and Turbopack sections.
```

변경 이유: CLAUDE.md 규칙에 따라 SKILL.md 본문에 버전 노트 금지.

- [ ] **Step 2: description 검증**

현재 description이 이미 "slow load, janky scroll, or large bundle size" 증상을 포함하므로 유지.

### 4-6. nextjs-error-boundary

- [ ] **Step 1: description 개선**

현재:
```yaml
description: Use when adding error boundaries to a Next.js app, implementing graceful failure UI, or handling runtime errors in route segments and component trees without crashing the whole page.
```

변경:
```yaml
description: Use when adding error boundaries to a Next.js app — when a runtime error crashes a route, when implementing error.tsx or global-error.tsx, or when a component tree should fail gracefully without taking down the whole page.
```

변경 이유: "error.tsx", "global-error.tsx", "runtime error crashes" 구체적 증상 추가.

### 4-7. nextjs-error-logging

- [ ] **Step 1: description 개선**

현재:
```yaml
description: Use when setting up error monitoring in a Next.js app, wiring error.tsx or global-error.tsx to a logging service, or capturing unhandled client/server errors for observability.
```

변경:
```yaml
description: Use when setting up error monitoring in a Next.js app — wiring instrumentation.ts or error.tsx to Sentry, Datadog, or a custom endpoint, or when digest correlation between server and client errors is needed.
```

변경 이유: "instrumentation.ts", "Sentry", "Datadog", "digest" 키워드 추가.

### 4-8. nextjs-user-logging

- [ ] **Step 1: description 개선**

현재:
```yaml
description: Use when instrumenting user behavior in a Next.js app — tracking page views, click events, form submissions, or Core Web Vitals for analytics or product observability.
```

변경:
```yaml
description: Use when instrumenting user behavior in a Next.js app — tracking page views, click events, form submissions, Core Web Vitals, or route changes for analytics (PostHog, Amplitude, custom endpoint) or product observability.
```

변경 이유: "PostHog", "Amplitude", "route changes" 키워드 추가.

- [ ] **Step 2: 8개 스킬 전체 CSO 최종 체크**

각 스킬에 대해:
- [ ] description이 "Use when..."으로 시작하는가
- [ ] description에 워크플로우/프로세스 설명이 없는가
- [ ] 증상/도구명 키워드가 포함되어 있는가

- [ ] **Step 3: Commit**

```bash
git add skills/
git commit -m "improve: CSO improvements for all 8 existing skills"
```

---

## Task 5: GitHub push

- [ ] **Step 1: Push**

```bash
git push origin main
```

Expected: 커밋 4개가 remote에 반영됨.

- [ ] **Step 2: push 결과 확인**

```bash
git log --oneline -5
```

Expected: 아래 순서로 커밋 4개가 보임:
```
improve: CSO improvements for all 8 existing skills
feat: add nextjs-tdd skill (Vitest + React Testing Library)
docs: add contributor guidelines with TDD skill-writing rules
chore: bump version to 1.2.0 and add plugin metadata
```

---

## Task 6: 플러그인 업데이트 및 ~/.claude/skills/ 동기화

- [ ] **Step 1: 플러그인 업데이트**

Claude Code에서 플러그인 업데이트 실행:
```
/plugins update nova-skills
```

또는 Claude Code 재시작 후 플러그인이 자동 갱신되는지 확인.

- [ ] **Step 2: ~/.claude/skills/ 기존 5개 스킬 업데이트**

nova-skills 플러그인 캐시 → 개인 스킬 디렉토리로 복사:

```bash
NOVA=~/.claude/plugins/cache/nova-marketplace/nova-skills/1.1.0/skills
PERSONAL=~/.claude/skills

cp $NOVA/nextjs-accessibility-review/SKILL.md $PERSONAL/nextjs-accessibility-review/SKILL.md
cp $NOVA/nextjs-component-design/SKILL.md $PERSONAL/nextjs-component-design/SKILL.md
cp $NOVA/nextjs-state-design/SKILL.md $PERSONAL/nextjs-state-design/SKILL.md
cp $NOVA/nextjs-design-token-consistency/SKILL.md $PERSONAL/nextjs-design-token-consistency/SKILL.md
cp $NOVA/nextjs-performance-review/SKILL.md $PERSONAL/nextjs-performance-review/SKILL.md
```

- [ ] **Step 3: ~/.claude/skills/ 누락 3개 스킬 추가**

```bash
mkdir -p $PERSONAL/nextjs-error-boundary
mkdir -p $PERSONAL/nextjs-error-logging
mkdir -p $PERSONAL/nextjs-user-logging

cp $NOVA/nextjs-error-boundary/SKILL.md $PERSONAL/nextjs-error-boundary/SKILL.md
cp $NOVA/nextjs-error-logging/SKILL.md $PERSONAL/nextjs-error-logging/SKILL.md
cp $NOVA/nextjs-user-logging/SKILL.md $PERSONAL/nextjs-user-logging/SKILL.md
```

- [ ] **Step 4: nextjs-tdd 스킬 추가**

```bash
mkdir -p $PERSONAL/nextjs-tdd
cp $NOVA/nextjs-tdd/SKILL.md $PERSONAL/nextjs-tdd/SKILL.md
```

- [ ] **Step 5: 동기화 완료 검증**

```bash
ls ~/.claude/skills/
```

Expected: 9개 디렉토리 확인:
```
nextjs-accessibility-review
nextjs-component-design
nextjs-design-token-consistency
nextjs-error-boundary
nextjs-error-logging
nextjs-performance-review
nextjs-state-design
nextjs-tdd
nextjs-user-logging
```
