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

**REFACTOR** — Identify new rationalizations. Close loopholes. Re-test. REFACTOR is complete when one full pressure scenario run produces zero new rationalizations.

**No exceptions:**
- Not for "adding a section"
- Not for "fixing a typo that affects meaning"
- Not for "updating an example"

Writing a skill without a failing test first = delete it and start over.

## What nova-skills Covers

Next.js frontend skills, NestJS backend skills, AND AI agent protocol skills. Before adding a skill, ask:

> "Would this help someone building a Next.js frontend, a NestJS backend, OR implementing AI agent protocols (MCP, A2A, AG-UI, A2UI, UCP, AP2)?"

If no → belongs in superpowers or a separate plugin.
If yes → belongs here.

**Naming conventions:**
- `nextjs-*` — Next.js 프론트엔드 전용
- `nestjs-*` — NestJS 백엔드 전용
- `agent-*` — AI 에이전트 프로토콜 전용
- `pnpm` — 패키지 매니저 (범용)

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

- Skills outside the Next.js frontend, NestJS backend, or AI agent protocol domains
- Skills that only apply to a specific project or codebase (put those in the project's CLAUDE.md or a local skills directory)
- Skill modifications without baseline test evidence
- Descriptions that summarize workflow instead of triggering conditions
- Version notes or changelogs inside SKILL.md body
