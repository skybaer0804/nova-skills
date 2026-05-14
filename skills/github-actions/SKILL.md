---
name: github-actions
description: Use when creating or editing GitHub Actions CI/CD workflows for Node.js projects using pnpm — especially when setting up PR checks, build pipelines, or deployment workflows.
created: 2026-05-07
updated: 2026-05-07
---

# GitHub Actions CI/CD (pnpm)

## Overview

GitHub Actions workflows for Node.js + pnpm projects. CI on PRs and deployment on `main` push are managed as separate files.

## Quick Reference

| Item | Correct value | Wrong example |
|---|---|---|
| pnpm setup action | `pnpm/action-setup@v4` | `@v3` |
| Node cache config | `cache: 'pnpm'` (inside setup-node) | Separate `actions/cache` |
| Install command | `pnpm install --frozen-lockfile` | `pnpm install` |
| Permissions block | Explicitly set `permissions: contents: read` | Omit |
| Cancel duplicate runs | Configure `concurrency` group | Not configured |

## File Structure

```
.github/
  workflows/
    ci.yml      # PR → lint + typecheck + test
    deploy.yml  # push to main → build + deploy
```

## Prerequisites

`packageManager` field is required in `package.json` to pin the pnpm version:

```json
{
  "packageManager": "pnpm@9.15.4"
}
```

## CI Workflow (ci.yml)

```yaml
name: CI

on:
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4  # Auto-detects version from packageManager field

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'  # No separate actions/cache needed

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

## Deploy Workflow (deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false  # Do not cancel deployments

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Uses GitHub Environments secrets
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      # Deploy step (replace with your platform)
      - name: Deploy
        run: pnpm deploy:prod
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

## NestJS Additional Pattern

For integration tests with DB dependencies, use service containers:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: testdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready
      --health-interval 5s
      --health-timeout 5s
      --health-retries 5

steps:
  - run: pnpm test
    env:
      DATABASE_URL: postgresql://app:secret@localhost:5432/testdb
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| `pnpm/action-setup@v3` | Use `@v4` — supports auto-detection from packageManager |
| Separate `actions/cache` step | Replace with `cache: 'pnpm'` in setup-node |
| `pnpm install` (ignores lock) | `--frozen-lockfile` is required — prevents lock bypass in CI |
| Omitting `permissions` | Explicitly set `contents: read` — principle of least privilege |
| No `concurrency` configured | Duplicate runs accumulate for the same branch on PRs |
| Omitting `environment: production` | Cannot access Environments secrets |
