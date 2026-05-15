---
name: pnpm
description: Use when installing packages, running scripts, or scaffolding a project — prefer pnpm over npm or yarn for all package management commands.
created: 2026-05-06
updated: 2026-05-06
---

# pnpm

## Overview
pnpm is a package manager used instead of npm/yarn. Content-addressable storage with hard links provides disk savings, faster installs, and phantom dependency blocking out of the box.

## Why pnpm

| Item | npm/yarn | pnpm |
|------|----------|------|
| Disk usage | Copied per project | Shared global store (hard links) |
| Install speed | Slow | Fast (already cached packages linked instantly) |
| Phantom dependencies | Allowed | Blocked (cannot import packages not declared) |
| `node_modules` structure | flat (npm v3+) | Strict symbolic links |

## Command Reference

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm run <script>` | `pnpm <script>` or `pnpm run <script>` |
| `npm run dev` | `pnpm dev` |
| `npm run build` | `pnpm build` |
| `npx <cmd>` | `pnpm dlx <cmd>` |
| `npx create-next-app` | `pnpm create next-app` |
| `npm init` | `pnpm init` |

## Starting a Next.js Project

```bash
pnpm create next-app my-app
cd my-app
pnpm dev
```

## Installing Packages

```bash
# Runtime dependencies
pnpm add @tanstack/react-query

# Development dependencies
pnpm add -D typescript @types/react vitest

# Global install
pnpm add -g <pkg>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `npm install` | Use `pnpm install` |
| `npx create-next-app` | `pnpm create next-app` |
| `npx <cmd>` | `pnpm dlx <cmd>` |
| `npm run dev` | `pnpm dev` |
| Committing `package-lock.json` | Commit `pnpm-lock.yaml` |
