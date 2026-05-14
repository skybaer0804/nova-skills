---
name: docker-compose
description: Use when setting up Docker Compose for local development with Node.js/NestJS — when adding a database service, when the app starts before the database is ready, or when node_modules conflicts occur between host and container.
created: 2026-05-07
updated: 2026-05-07
---

# Docker Compose (NestJS + PostgreSQL)

## Overview
`depends_on: [db]` only waits for the container to start — it does not verify whether the DB is actually ready to accept connections. Using `condition: service_healthy` together with `healthcheck` prevents the app from starting before the DB is ready.

## docker-compose.yml — Basic structure for local development

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine       # Do not use latest — pin to a major version
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-app}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
      POSTGRES_DB: ${POSTGRES_DB:-appdb}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data   # named volume — data persists after down
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-app} -d ${POSTGRES_DB:-appdb}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s   # Allow time for initialization

  app:
    build:
      context: .
      target: development   # Uses the development stage from the multi-stage Dockerfile below
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      DATABASE_HOST: db
      DATABASE_PORT: 5432
      # Add if a connection string is needed for TypeORM/Prisma
      DATABASE_URL: postgresql://${POSTGRES_USER:-app}:${POSTGRES_PASSWORD:-secret}@db:5432/${POSTGRES_DB:-appdb}
    volumes:
      - .:/app
      - /app/node_modules   # Prevents host node_modules from overwriting container's
    depends_on:
      db:
        condition: service_healthy   # Starts after healthcheck passes — do not use plain depends_on

volumes:
  postgres_data:
```

## Dockerfile — Multi-stage (dev + prod) — required with docker-compose

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# Development stage — hot reload
FROM base AS development
RUN pnpm install
COPY . .
CMD ["pnpm", "start:dev"]

# Build stage
FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production stage — minimal image + non-root
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

## .dockerignore (required)

```
node_modules
dist
.git
.env*
*.log
coverage
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `depends_on: [db]` (no condition) | `depends_on: db: condition: service_healthy` |
| No `healthcheck` defined for postgres | `pg_isready` healthcheck is required — condition alone always results in unhealthy |
| `image: postgres:latest` | `postgres:16-alpine` — pin to a major version |
| Missing `/app/node_modules` in volumes | Host node_modules (or absence of them) will overwrite the container's |
| Building without `.dockerignore` | Entire `node_modules` included in build context → slow builds |
| Running as root in production stage | `adduser` + `USER nestjs` — non-root is required |
| Single-stage Dockerfile for dev/prod | Use multi-stage: dev (hot reload) / builder / production (lean) |
| `target: development` set but no Dockerfile | `target` in docker-compose must be used with the Dockerfile above |
| TypeORM/Prisma connection failing | Add `DATABASE_URL` env var: `postgresql://user:pass@db:5432/db` |
