---
name: agent-qa-browser
description: Use when running QA against a localhost Next.js/NestJS app and the agent needs structured browser control, screenshot lifecycle, bug detection (console/UI/network), or DB-backed reporting — or when no Architect → Browser → Reporter handoff is in place.
created: 2026-05-14
updated: 2026-05-14
---

# QA Browser Agent

## Overview

A 3-role agent (Architect → Browser → Reporter) directly controls the browser via Playwright MCP and performs scenario-based QA. It detects bugs and stores them in a MySQL DB + markdown report.

## Prerequisites

```bash
npm run memory:up   # Start MySQL on port 3377
# Playwright MCP must be registered in .claude/settings.local.json (see README)
```

## How to Run

**1. Hand off to QA Architect:**
```
Role: QA Architect
URL: http://localhost:3000
Scenario: "Login → Dashboard → Save"
→ Initialize docs/qa-state.md
```

**2. Hand off to QA Browser:**
```
Role: QA Browser
Read docs/qa-state.md and execute the scenario
```

**3. Hand off to QA Reporter:**
```
Role: QA Reporter
Read docs/qa-state.md and run node scripts/qa-reporter.mjs <session_id>
```

---

## Role Contract: QA Architect

**Responsibility:** Parse scenario → decompose into steps → initialize docs/qa-state.md

**Output format for each step:**
```yaml
- number: 1
  label: "Navigate to login page"
  action: navigate
  target: "http://localhost:3000/login"
  status: PENDING
  verification:
    expected_url_change: true
    expected_dom: "input[type='email']"
    expected_network: null
    expected_console_clean: true
```

**Prohibited:** Direct browser manipulation, arbitrary edits to qa-state.md (only initialization is allowed)

---

## Role Contract: QA Browser

### 🔴 CRITICAL — Action execution order (must follow this order)

```
Phase 1: Element validation before click
  browser_evaluate → { text, ariaLabel, visible, inViewport }
  If result differs from expected → browser_scroll then re-check
  If re-check still differs → STUCK

Phase 2: BEFORE screenshot
  browser_screenshot → tmp/qa-screenshots/step{N}-before.png
  Record in qa-state.md screenshots array

Phase 3: Execute action
  browser_click(selector) or browser_type(selector, value)

Phase 4: 4-way verification 🟠 HIGH
  ① browser_screenshot → visual comparison before/after (agent judges directly)
  ② browser_evaluate(expected_dom) → check if expected element exists
  ③ browser_evaluate(() => window.location.href) → URL change
  ④ browser_console_messages() + browser_network_requests()

Phase 5: VERDICT
  PASS: 3 or more out of 4 pass → qa-state.md step status: PASS
  FAIL: Execute recovery protocol
```

### Recovery Protocol

| Level | Condition | Action |
|-------|-----------|--------|
| Level 1 | retry_count < 2 | clear → re-enter / history.back() → retry; retry_count += 1 |
| Level 2 | retry_count == 2 | Save recovery screenshot → navigate(start URL); retry_count = 0 |
| Level 3 | Level 2 also fails | status: STUCK → stop immediately → notify "Step N requires manual review" |

### Bug Exploration Rules

```
When a bug is found, push to exploration_stack and calculate depth:
  depth ≤ 2 → additional console/network/DOM checks
  depth > 2 → record in deferred_bugs then immediately pop stack

Save BUG_EVIDENCE screenshot for each bug (not a deletion target)
```

**Prohibited:** Modifying the scenario on your own, autonomous exploration with depth > 2, deleting screenshots

---

## Role Contract: QA Reporter

**Procedure:**
1. Read `docs/qa-state.md`
2. Run `node scripts/qa-reporter.mjs <qa_session_id>`
3. Output summary (step results / bugs / deferred)
4. Ask the user:
   - "There are N deferred_bugs. Would you like to investigate them now?"
   - "Would you like to delete N screenshots (BEFORE/AFTER) from passing steps?"
   - If approved: `node scripts/qa-reporter.mjs --clean <qa_session_id>`

**Prohibited:** Browser manipulation, arbitrary deletion of bugs, automatic deletion of screenshots

---

## Common Mistakes

| Mistake | Level | Fix |
|---------|-------|-----|
| Skipping element validation before click | 🔴 CRITICAL | Check text/visible with browser_evaluate before clicking |
| Executing action without BEFORE screenshot | 🟠 HIGH | Always take before screenshot first |
| Running only some of the 4-way verification | 🟡 MEDIUM | Run all 4; need 3 or more PASS to proceed |
| Autonomous exploration with depth > 2 | 🟠 HIGH | Record in deferred then return immediately |
| Auto-deleting BUG_EVIDENCE | 🔴 CRITICAL | Never delete without user approval |
| Retrying after reaching Level 3 | 🔴 CRITICAL | Immediately STUCK → stop → notify user |
| Running QA Browser without qa-state.md | 🟠 HIGH | Must run Architect first to initialize |
