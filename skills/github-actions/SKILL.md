---
name: github-actions
description: Use when creating or editing GitHub Actions CI/CD workflows for Node.js projects using pnpm — especially when setting up PR checks, build pipelines, or deployment workflows.
---

# GitHub Actions CI/CD (pnpm)

## Overview

Node.js + pnpm 프로젝트의 GitHub Actions 워크플로우. PR 시 CI, `main` 푸시 시 배포를 분리된 파일로 관리한다.

## Quick Reference

| 항목 | 올바른 값 | 잘못된 예 |
|---|---|---|
| pnpm setup action | `pnpm/action-setup@v4` | `@v3` |
| Node 캐시 설정 | `cache: 'pnpm'` (setup-node 내부) | 별도 `actions/cache` |
| install 명령 | `pnpm install --frozen-lockfile` | `pnpm install` |
| 권한 블록 | `permissions: contents: read` 명시 | 생략 |
| 중복 실행 취소 | `concurrency` 그룹 설정 | 미설정 |

## 파일 구조

```
.github/
  workflows/
    ci.yml      # PR → lint + typecheck + test
    deploy.yml  # push to main → build + deploy
```

## Prerequisites

`package.json`에 `packageManager` 필드 필수 — pnpm 버전 고정:

```json
{
  "packageManager": "pnpm@9.15.4"
}
```

## CI 워크플로우 (ci.yml)

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

      - uses: pnpm/action-setup@v4  # packageManager 필드에서 버전 자동 감지

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'  # 별도 actions/cache 불필요

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

## 배포 워크플로우 (deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false  # 배포는 취소하지 않음

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # GitHub Environments secrets 사용
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      # 배포 스텝 (플랫폼에 맞게 교체)
      - name: Deploy
        run: pnpm deploy:prod
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

## NestJS 추가 패턴

DB 의존이 있는 통합 테스트는 서비스 컨테이너 사용:

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

| 실수 | 수정 |
|---|---|
| `pnpm/action-setup@v3` | `@v4` 사용 — packageManager 자동 감지 지원 |
| 별도 `actions/cache` 스텝 | `setup-node`의 `cache: 'pnpm'`으로 대체 |
| `pnpm install` (lock 무시) | `--frozen-lockfile` 필수 — CI에서 lock 우회 방지 |
| `permissions` 생략 | `contents: read` 명시 — 최소 권한 원칙 |
| `concurrency` 미설정 | PR에 동일 브랜치 중복 실행 누적됨 |
| `environment: production` 생략 | Environments secrets에 접근 불가 |
