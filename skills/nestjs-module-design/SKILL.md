---
name: nestjs-module-design
description: Use when starting a new NestJS feature or project — when deciding which NestJS patterns and skills are needed before writing any code.
created: 2026-05-06
updated: 2026-05-06
---

# NestJS Module Design (Entry Point)

## Overview
Decide which patterns are needed before implementing a NestJS feature. Use this skill to set direction before writing any code, then move to the required implementation skill.

## Decision Tree

Are you building a new NestJS feature?

- **Do you need to design the module file structure?** → `nestjs-module-structure`
  (Controller/Service/Repository/Entity/DTO file layout and @Module wiring)
- **Do you need login / JWT authentication?** → `nestjs-auth-jwt`
  (Passport Local Strategy + RS256 JWT + JwtAuthGuard)
- **Do you need role/permission control?** → `nestjs-rbac`
  (Role → Permission granularity, PermissionsGuard — not RolesGuard)
- **Do you need DB entity/query design?** → `nestjs-typeorm`
  (TypeORM Entity, Repository pattern, Migration)
- **Do you need file upload/thumbnail?** → `nestjs-file-upload`
  (Multer setup + Sharp thumbnail pipeline)
- **Do you need request data validation?** → `nestjs-validation`
  (class-validator DTO, ValidationPipe global setup)

## Skill Combinations by Feature

| Feature | Required Skill Combination |
|---------|---------------------------|
| Add new domain module | module-structure → typeorm → validation |
| Build authentication system | auth-jwt → rbac |
| File management feature | module-structure → file-upload → typeorm |
| Full CRUD API | module-structure → typeorm → validation → rbac |
| Full feature (auth + RBAC + upload) | auth-jwt → rbac → module-structure → typeorm → file-upload → validation |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing Controller code directly without the decision tree | Use this skill to categorize required patterns first, then move to the relevant skill |
| Handling authentication and authorization with the same Guard (`RolesGuard`) | `nestjs-auth-jwt` (authentication) + `nestjs-rbac` (authorization) must be separate Guards |
| Access control by role name (`UserRole.ADMIN`) | Use granular permission strings like `user:delete` (`nestjs-rbac`) |
| Writing Service before Entity | Follow `nestjs-typeorm` → `nestjs-module-structure` order |
| Using `npm install` | Use `pnpm add` |
