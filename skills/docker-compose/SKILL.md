---
name: docker-compose
description: Use when setting up Docker Compose for local development with Node.js/NestJS — when adding a database service, when the app starts before the database is ready, or when node_modules conflicts occur between host and container.
---

# Docker Compose (NestJS + PostgreSQL)

## Overview
`depends_on: [db]`는 컨테이너 시작만 기다린다 — DB가 실제로 연결을 받을 준비가 됐는지는 확인하지 않는다. `condition: service_healthy` + `healthcheck`를 함께 써야 앱이 DB 준비 전에 뜨는 문제를 막는다.

## docker-compose.yml — 로컬 개발 기본 구조

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine       # latest 사용 금지 — major version 고정
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-app}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      POSTGRES_DB: ${POSTGRES_DB:-appdb}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data   # named volume — down해도 데이터 유지
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-app} -d ${POSTGRES_DB:-appdb}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s   # 초기화 시간 확보

  app:
    build:
      context: .
      target: development   # 아래 Dockerfile 멀티스테이지의 development 스테이지 사용
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      DATABASE_HOST: db
      DATABASE_PORT: 5432
      # TypeORM/Prisma에서 연결 문자열이 필요한 경우 추가
      DATABASE_URL: postgresql://${POSTGRES_USER:-app}:${POSTGRES_PASSWORD:-secret}@db:5432/${POSTGRES_DB:-appdb}
    volumes:
      - .:/app
      - /app/node_modules   # host node_modules가 컨테이너 것을 덮어쓰지 않도록
    depends_on:
      db:
        condition: service_healthy   # healthcheck 통과 후 시작 — plain depends_on 사용 금지

volumes:
  postgres_data:
```

## Dockerfile — 멀티스테이지 (dev + prod) — docker-compose와 함께 필수

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# 개발 스테이지 — 핫리로드
FROM base AS development
RUN pnpm install
COPY . .
CMD ["pnpm", "start:dev"]

# 빌드 스테이지
FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 프로덕션 스테이지 — 최소 이미지 + non-root
FROM node:20-alpine AS production
RUN npm install -g pnpm
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
RUN chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main"]
```

## .dockerignore (필수)

```
node_modules
dist
.git
.env*
*.log
coverage
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `depends_on: [db]` (condition 없음) | `depends_on: db: condition: service_healthy` |
| postgres `healthcheck` 미정의 | `pg_isready` healthcheck 필수 — condition만 있으면 항상 unhealthy |
| `image: postgres:latest` | `postgres:16-alpine` — major version 고정 |
| 볼륨에 `/app/node_modules` 누락 | host의 node_modules(또는 없음)가 컨테이너 것 덮어씀 |
| `.dockerignore` 없이 build | `node_modules` 전체가 build context에 포함 → 빌드 느려짐 |
| 프로덕션 스테이지에서 root 실행 | `adduser` + `USER nestjs` — non-root 필수 |
| dev/prod 단일 스테이지 Dockerfile | 멀티스테이지: dev (hot reload) / builder / production (lean) |
| `target: development` 지정했는데 Dockerfile 없음 | docker-compose의 `target`은 위 Dockerfile과 함께 써야 함 |
| TypeORM/Prisma 연결 안 됨 | `DATABASE_URL` 환경변수 추가: `postgresql://user:pass@db:5432/db` |
