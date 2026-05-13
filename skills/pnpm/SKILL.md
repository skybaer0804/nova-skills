---
name: pnpm
description: Use when installing packages, running scripts, or scaffolding a project — prefer pnpm over npm or yarn for all package management commands.
created: 2026-05-06
updated: 2026-05-06
---

# pnpm

## Overview
pnpm은 npm/yarn 대신 사용하는 패키지 매니저다. 콘텐츠 주소 기반 저장소와 하드 링크로 디스크 절약, 설치 속도 향상, 팬텀 의존성 차단이 기본 제공된다.

## 왜 pnpm인가

| 항목 | npm/yarn | pnpm |
|------|----------|------|
| 디스크 사용 | 프로젝트마다 복사 | 글로벌 저장소 공유 (하드 링크) |
| 설치 속도 | 느림 | 빠름 (이미 캐시된 패키지 즉시 링크) |
| 팬텀 의존성 | 허용됨 | 차단 (선언하지 않은 패키지 import 불가) |
| `node_modules` 구조 | flat (npm v3+) | 엄격한 심볼릭 링크 |

## 명령어 대조표

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm run <script>` | `pnpm <script>` 또는 `pnpm run <script>` |
| `npm run dev` | `pnpm dev` |
| `npm run build` | `pnpm build` |
| `npx <cmd>` | `pnpm dlx <cmd>` |
| `npx create-next-app` | `pnpm create next-app` |
| `npm init` | `pnpm init` |

## Next.js 프로젝트 시작

```bash
pnpm create next-app my-app
cd my-app
pnpm dev
```

## 패키지 설치

```bash
# 런타임 의존성
pnpm add react-query @tanstack/react-query

# 개발 의존성
pnpm add -D typescript @types/react vitest

# 글로벌 설치
pnpm add -g <pkg>
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `npm install` 사용 | `pnpm install` 사용 |
| `npx create-next-app` | `pnpm create next-app` |
| `npx <cmd>` | `pnpm dlx <cmd>` |
| `npm run dev` | `pnpm dev` |
| `package-lock.json` 커밋 | `pnpm-lock.yaml` 커밋 |
