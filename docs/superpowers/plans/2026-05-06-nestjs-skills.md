# NestJS Backend Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nova-skills에 NestJS 백엔드 스킬 7개를 추가하여 에이전트가 NestJS 프로젝트에서 반복적으로 틀리는 패턴을 교정한다.

**Architecture:** CLAUDE.md 도메인 확장 → 진입점 스킬(`nestjs-module-design`) 완성 → 구현 스킬 6개를 B안(순차) 또는 C안(병렬) 중 선택하여 작성. 각 스킬은 RED(베이스라인 기록) → GREEN(스킬 작성) → REFACTOR(루프홀 제거) 사이클을 완전히 통과해야 한다.

**Tech Stack:** nova-skills (Markdown SKILL.md), 서브에이전트 압력 시나리오, CMF Hub 아키텍처 예시 (`TextureController`, `UserService`, `RolesGuard` 등)

---

## File Structure

**Create:**
- `skills/nestjs-module-design/SKILL.md` — 진입점, 어떤 스킬이 필요한지 결정 트리
- `skills/nestjs-module-structure/SKILL.md` — Controller/Service/Repository/Entity/DTO 모듈 구조
- `skills/nestjs-auth-jwt/SKILL.md` — Passport Local + RS256 JWT + JwtAuthGuard
- `skills/nestjs-rbac/SKILL.md` — Role → Permission 세분화, PermissionsGuard
- `skills/nestjs-typeorm/SKILL.md` — Entity 설계, Repository 패턴, Migration
- `skills/nestjs-file-upload/SKILL.md` — Multer 설정 + Sharp 썸네일 파이프라인
- `skills/nestjs-validation/SKILL.md` — class-validator DTO, ValidationPipe 전역 설정

**Modify:**
- `CLAUDE.md` — 도메인 확장, nestjs-* 컨벤션 추가
- `README.md` — NestJS 섹션, 스킬 카드, 흐름도, v1.7.0
- `package.json` — version 1.7.0, keywords 추가

---

## Task 0: CLAUDE.md 도메인 확장

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: "What nova-skills Covers" 섹션 교체**

`CLAUDE.md`에서 아래 블록을 찾아:

```
## What nova-skills Covers

Next.js frontend skills AND AI agent protocol skills. Before adding a skill, ask:

> "Would this help someone building a Next.js frontend OR implementing AI agent protocols (MCP, A2A, AG-UI, A2UI, UCP, AP2)?"

If no → belongs in superpowers or a separate plugin.
If yes → belongs here.
```

다음으로 교체:

```
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
```

`CLAUDE.md`의 "What We Will Not Accept" 첫 번째 항목도 교체:

```
- Skills outside the Next.js frontend domain
```

→

```
- Skills outside the Next.js frontend, NestJS backend, or AI agent protocol domains
```

- [ ] **Step 2: 커밋**

```bash
git add CLAUDE.md
git commit -m "chore: expand nova-skills domain to include NestJS backend skills"
```

---

## Task 1: nestjs-module-design (진입점 스킬)

**Files:**
- Create: `skills/nestjs-module-design/SKILL.md`

### RED: 베이스라인

- [ ] **Step 1: 서브에이전트 없이 압력 시나리오 실행**

아래 프롬프트로 서브에이전트를 실행한다. `nestjs-module-design` 스킬을 **로드하지 않는다.**

```
You are a NestJS developer helping a junior.

A junior asks: "NestJS로 텍스처 파일 관리 기능을 만들어야 해. 
인증도 필요하고, 파일 업로드도 해야 하고, 어드민만 삭제할 수 있어야 해.
어디서부터 시작해야 해?"

Answer directly. Give them the first concrete thing to do.
```

- [ ] **Step 2: 실패 패턴 기록**

에이전트 응답에서 다음을 확인하고 기록:
- 결정 트리 없이 바로 코드 작성으로 돌진했는가?
- 인증(auth-jwt)과 권한(rbac)을 같은 Guard로 뭉쳤는가?
- 어떤 파일을 어떤 순서로 만들어야 하는지 레이어 설명 없이 코드만 제시했는가?

### GREEN: 스킬 작성

- [ ] **Step 3: skills/nestjs-module-design/SKILL.md 작성**

```markdown
---
name: nestjs-module-design
description: Use when starting a new NestJS feature or project — when deciding which NestJS patterns and skills are needed before writing any code.
---

# NestJS Module Design (진입점)

## Overview
NestJS 기능 구현 전에 필요한 패턴을 먼저 결정한다. 코드 작성 전 이 스킬로 방향을 잡고, 필요한 구현 스킬로 이동한다.

## 결정 트리

새 NestJS 기능을 만드는가?

- **모듈 파일 구조 설계가 필요한가?** → `nestjs-module-structure`
  (Controller/Service/Repository/Entity/DTO 파일 배치 및 @Module 연결)
- **로그인 / JWT 인증이 필요한가?** → `nestjs-auth-jwt`
  (Passport Local Strategy + RS256 JWT + JwtAuthGuard)
- **역할/권한 제어가 필요한가?** → `nestjs-rbac`
  (Role → Permission 세분화, PermissionsGuard)
- **DB 엔티티/쿼리 설계가 필요한가?** → `nestjs-typeorm`
  (TypeORM Entity, Repository 패턴, Migration)
- **파일 업로드/썸네일이 필요한가?** → `nestjs-file-upload`
  (Multer 설정 + Sharp 썸네일 파이프라인)
- **요청 데이터 검증이 필요한가?** → `nestjs-validation`
  (class-validator DTO, ValidationPipe 전역 설정)

## CMF Hub 기능별 스킬 조합

| 기능 | 필요한 스킬 조합 |
|------|-----------------|
| 새 도메인 모듈 추가 | module-structure → typeorm → validation |
| 인증 시스템 구축 | auth-jwt → rbac |
| 파일 관리 기능 | module-structure → file-upload → typeorm |
| 전체 CRUD API | module-structure → typeorm → validation → rbac |
| 텍스처 업로드 (CMF Hub 전체) | auth-jwt → rbac → module-structure → typeorm → file-upload → validation |

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 결정 트리 없이 바로 Controller 코드 작성 | 이 스킬로 필요한 패턴을 먼저 분류 후 해당 스킬로 이동 |
| 인증과 권한을 같은 Guard로 처리 | `nestjs-auth-jwt`(인증) + `nestjs-rbac`(권한)은 별도 Guard |
| Entity 없이 Service 먼저 작성 | `nestjs-typeorm` → `nestjs-module-structure` 순서 |
| 파일 업로드와 메타데이터 저장을 같이 처리 | `nestjs-file-upload`(Multer+Sharp) 후 `nestjs-typeorm`(DB 저장) |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행**

Step 1과 동일한 프롬프트로 서브에이전트를 실행하되, 이번엔 `nestjs-module-design` 스킬을 로드한다. 에이전트가 결정 트리를 사용해 `auth-jwt → rbac → file-upload → validation` 조합을 제시하는지 확인.

### REFACTOR

- [ ] **Step 5: 루프홀 발견 시 스킬 수정 후 Step 4 반복**

새 합리화가 발견되면 Common Mistakes에 추가. 합리화가 없으면 REFACTOR 완료.

- [ ] **Step 6: 커밋**

```bash
git add skills/nestjs-module-design/SKILL.md
git commit -m "feat: add nestjs-module-design entry-point skill"
```

---

> **실행 방식 선택 (Task 1 완료 후)**
>
> - **B안 (순차):** Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 순서로 한 스킬씩 완전 완료
> - **C안 (병렬):** Task 2~7을 서브에이전트로 동시 실행 후 스타일 통일 검수
>
> B안 권장: RED 베이스라인의 실패 패턴이 다음 스킬 작성에 참고가 됨

---

## Task 2: nestjs-module-structure

**Files:**
- Create: `skills/nestjs-module-structure/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 시나리오 실행** (스킬 없이)

```
You are a NestJS developer.

Create a NestJS module for managing "materials" (재질).
A material has: id, name, description, color, createdAt, updatedAt.
It should support CRUD operations.

Show me the file structure and the code for each file.
```

Expected failures:
- 모든 로직을 `materials.service.ts` 하나에 몰아넣음
- Repository를 Service에서 직접 `getRepository()` 호출 (Repository 주입 패턴 미사용)
- `materials.module.ts`에서 TypeORM `forFeature` 등록 누락
- DTO 없이 `any` 타입 사용

- [ ] **Step 2: 실패 패턴 기록** (정확히 어떤 코드를 생성했는지 기록)

### GREEN

- [ ] **Step 3: skills/nestjs-module-structure/SKILL.md 작성**

```markdown
---
name: nestjs-module-structure
description: Use when creating a new NestJS feature module — when deciding how to split Controller, Service, Repository, Entity, and DTO files and wire them into a module.
---

# NestJS Module Structure

## Overview
NestJS 기능은 Controller / Service / Repository / Entity / DTO 5개 레이어로 분리된 자급자족 모듈로 만든다. 각 파일은 하나의 책임만 가진다.

## 파일 구조 (CMF Hub — materials 예시)

```
materials/
├── dto/
│   ├── create-material.dto.ts
│   └── update-material.dto.ts
├── entities/
│   └── material.entity.ts
├── materials.controller.ts
├── materials.service.ts
└── materials.module.ts
```

## Entity

```typescript
// materials/entities/material.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column()
  color: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

## Service (Repository 주입 패턴)

```typescript
// materials/materials.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Material } from './entities/material.entity'
import { CreateMaterialDto } from './dto/create-material.dto'

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialsRepo: Repository<Material>,
  ) {}

  findAll(): Promise<Material[]> {
    return this.materialsRepo.find()
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialsRepo.findOneBy({ id })
    if (!material) throw new NotFoundException(`Material ${id} not found`)
    return material
  }

  create(dto: CreateMaterialDto): Promise<Material> {
    return this.materialsRepo.save(this.materialsRepo.create(dto))
  }
}
```

## Module (TypeORM 등록 필수)

```typescript
// materials/materials.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Material } from './entities/material.entity'
import { MaterialsService } from './materials.service'
import { MaterialsController } from './materials.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Material])],  // 반드시 등록
  providers: [MaterialsService],
  controllers: [MaterialsController],
  exports: [MaterialsService],  // 다른 모듈에서 쓸 경우
})
export class MaterialsModule {}
```

## app.module.ts에 등록

```typescript
// app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({ ... }),
    MaterialsModule,  // 추가
  ],
})
export class AppModule {}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| Service에서 `getRepository()` 직접 호출 | `@InjectRepository(Entity)` 주입 패턴 사용 |
| `TypeOrmModule.forFeature([Entity])` 누락 | Module `imports`에 반드시 등록 |
| DTO 없이 `body: any` 사용 | `CreateDto` / `UpdateDto` 분리, class-validator 적용 |
| Entity를 app.module.ts에 직접 등록 | 각 feature module에서 `forFeature` 등록 |
| exports 없이 다른 모듈에서 Service 사용 | `exports: [MaterialsService]` 추가 |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행, 통과 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/nestjs-module-structure/SKILL.md
git commit -m "feat: add nestjs-module-structure skill"
```

---

## Task 3: nestjs-auth-jwt

**Files:**
- Create: `skills/nestjs-auth-jwt/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 시나리오 실행** (스킬 없이)

```
You are a NestJS developer.

Implement JWT authentication for CMF Hub:
- POST /auth/login: username + password → JWT token
- Protected routes should require the token
- Use RS256 algorithm

Show the auth module code.
```

Expected failures:
- HS256(대칭키) 사용, RS256(비대칭키) 미사용
- 토큰 생성을 Controller에서 처리
- JwtAuthGuard를 전역 등록해서 공개 라우트도 막아버림
- password를 응답에 포함

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: skills/nestjs-auth-jwt/SKILL.md 작성**

```markdown
---
name: nestjs-auth-jwt
description: Use when implementing login and JWT authentication in NestJS — when adding Passport Local strategy, RS256 token signing, or JwtAuthGuard to protect routes.
---

# NestJS Auth JWT

## Overview
NestJS 인증은 Passport Local(로그인) + RS256 JWT(토큰) + JwtAuthGuard(보호) 3단계로 구성한다. HS256(대칭키) 대신 RS256(비대칭키)을 사용한다 — 공개키만 배포해도 토큰 검증 가능.

## RS256 키 생성

```bash
mkdir -p apps/server/keys
openssl genrsa -out apps/server/keys/private.key 2048
openssl rsa -in apps/server/keys/private.key -pubout -out apps/server/keys/public.key
```

## 핵심 흐름

```
POST /auth/login
  → LocalStrategy (username/password 검증)
  → AuthService.login() (JWT 서명 — private.key 사용)
  → { access_token }

GET /textures (보호된 라우트)
  → JwtAuthGuard
  → JwtStrategy (토큰 검증 — public.key 사용)
  → Controller
```

## AuthModule 코드 (CMF Hub)

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import * as fs from 'fs'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { LocalStrategy } from './strategies/local.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      privateKey: fs.readFileSync('keys/private.key'),
      publicKey: fs.readFileSync('keys/public.key'),
      signOptions: { algorithm: 'RS256', expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

## AuthService — 토큰 생성은 Service에서

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username)
    if (!user) throw new UnauthorizedException()
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new UnauthorizedException()
    const { password: _, ...result } = user  // password 응답에서 제외
    return result
  }

  login(user: { id: string; username: string; roles: string[] }) {
    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        username: user.username,
        roles: user.roles,
      }),
    }
  }
}
```

## JwtStrategy (토큰 검증)

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import * as fs from 'fs'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: fs.readFileSync('keys/public.key'),
      algorithms: ['RS256'],
    })
  }

  validate(payload: { sub: string; username: string; roles: string[] }) {
    return { id: payload.sub, username: payload.username, roles: payload.roles }
  }
}
```

## 라우트 보호 — 라우트별 적용 (전역 X)

```typescript
// textures/textures.controller.ts
import { UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Controller('textures')
@UseGuards(AuthGuard('jwt'))  // 컨트롤러 전체 보호
export class TexturesController { ... }
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| HS256(대칭키) 사용 | RS256 + RSA 키 쌍 사용 |
| 토큰 생성을 Controller에서 처리 | AuthService.login()에서만 처리 |
| JwtModule.register()에 secret만 전달 | privateKey + publicKey + algorithm: 'RS256' 필수 |
| JwtAuthGuard를 전역 등록 | 라우트/컨트롤러 단위로 `@UseGuards(AuthGuard('jwt'))` |
| password를 응답 객체에 포함 | `const { password: _, ...result } = user` 구조분해 |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행, RS256 + Service 토큰 생성 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/nestjs-auth-jwt/SKILL.md
git commit -m "feat: add nestjs-auth-jwt skill (RS256, Passport, JwtAuthGuard)"
```

---

## Task 4: nestjs-rbac

**Files:**
- Create: `skills/nestjs-rbac/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 시나리오 실행** (스킬 없이)

```
You are a NestJS developer.

CMF Hub has admins and regular users.
Only admins should be able to delete textures.
Only admins should be able to manage users.

How do you implement this access control in NestJS?
Show the guard and how to apply it to routes.
```

Expected failures:
- `roles: ['admin']` 조건을 Service 레이어에서 체크
- 역할(role name) 자체로 권한 판단 — 세분화된 permission 없음
- Guard를 JwtAuthGuard와 합쳐서 하나로 만듦

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: skills/nestjs-rbac/SKILL.md 작성**

```markdown
---
name: nestjs-rbac
description: Use when implementing role-based access control in NestJS — when restricting routes by user permissions such as user:read, user:delete, or texture:upload.
---

# NestJS RBAC (Role-Based Access Control)

## Overview
인증(누구인가)과 권한(무엇을 할 수 있는가)은 분리한다. JwtAuthGuard(인증) 다음에 PermissionsGuard(권한)를 별도로 적용한다. 역할 이름이 아닌 세분화된 permission 문자열로 접근을 제어한다.

## Permission 체계 (CMF Hub)

```
Role "admin"   → permissions: ["user:read", "user:create", "user:update", "user:delete", "texture:upload", "texture:delete"]
Role "user"    → permissions: ["texture:upload"]
```

## PermissionsGuard

```typescript
// auth/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UsersService } from '../../users/users.service'

export const PERMISSIONS_KEY = 'permissions'
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms)

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    )
    if (!required?.length) return true  // 데코레이터 없으면 통과

    const { user } = ctx.switchToHttp().getRequest()
    const dbUser = await this.usersService.findOneWithRoles(user.id)
    const userPerms = dbUser.roles.flatMap(r => r.permissions)

    return required.every(p => userPerms.includes(p))
  }
}
```

## 라우트에 적용 — JwtAuthGuard 다음에

```typescript
// users/users.controller.ts
import { UseGuards, Get, Delete, Param } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)  // 인증 → 권한 순서
export class UsersController {

  @Get()
  @RequirePermissions('user:read')
  findAll() { ... }

  @Delete(':id')
  @RequirePermissions('user:delete')
  remove(@Param('id') id: string) { ... }
}
```

## UsersService — roles 포함 조회

```typescript
// users/users.service.ts
findOneWithRoles(id: string) {
  return this.usersRepo.findOne({
    where: { id },
    relations: ['roles'],  // permission 포함된 roles 로드
  })
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| Service 레이어에서 `user.roles.includes('admin')` 체크 | PermissionsGuard에서만 처리 |
| 역할 이름으로 판단 (`role === 'admin'`) | `user:delete` 같은 세분화된 permission 문자열 사용 |
| JwtAuthGuard와 PermissionsGuard를 하나로 합침 | 인증 Guard + 권한 Guard 분리 필수 |
| `@UseGuards(PermissionsGuard)` 만 적용 | `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` 순서 지킴 |
| roles 없이 User 조회 (`findOneBy`) | `findOne({ relations: ['roles'] })` 으로 권한 포함 로드 |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행, 인증/권한 분리 + permission 문자열 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/nestjs-rbac/SKILL.md
git commit -m "feat: add nestjs-rbac skill (PermissionsGuard, permission strings)"
```

---

## Task 5: nestjs-typeorm

**Files:**
- Create: `skills/nestjs-typeorm/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 시나리오 실행** (스킬 없이)

```
You are a NestJS developer.

Set up TypeORM with MySQL for CMF Hub.
The app has User and Texture entities with a one-to-many relationship.
Show the TypeORM config and entity code.
```

Expected failures:
- `synchronize: true`를 production 설정에 포함
- Migration 언급 없이 synchronize로 스키마 관리
- UUID PK 대신 auto-increment integer PK 사용
- 관계 로딩에 `eager: true` 남발

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: skills/nestjs-typeorm/SKILL.md 작성**

```markdown
---
name: nestjs-typeorm
description: Use when defining TypeORM entities, configuring database connection, or managing schema migrations in NestJS — when setting up MySQL with TypeORM or adding new entities.
---

# NestJS TypeORM

## Overview
TypeORM 설정에서 `synchronize: true`는 개발 환경에서만 사용한다. 운영 환경은 Migration으로 스키마를 관리한다. PK는 UUID, 관계 로딩은 명시적 `relations` 옵션으로 제어한다.

## TypeORM 설정 (CMF Hub)

```typescript
// app.module.ts
TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',  // 운영에서는 false
  migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
  migrationsRun: process.env.NODE_ENV !== 'development',
})
```

## Entity 설계 (CMF Hub — User & Texture)

```typescript
// users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Role } from './role.entity'
import { Texture } from '../../textures/entities/texture.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')          // UUID PK
  id: string

  @Column({ unique: true })
  username: string

  @Column({ select: false })               // 기본 조회에서 password 제외
  password: string

  @Column({ nullable: true })
  name: string | null

  @ManyToMany(() => Role, { eager: false })
  @JoinTable({ name: 'user_roles' })
  roles: Role[]

  @OneToMany(() => Texture, t => t.uploader)
  textures: Texture[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

```typescript
// textures/entities/texture.entity.ts
@Entity('textures')
export class Texture {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ type: 'simple-array', nullable: true })
  tags: string[]

  @ManyToOne(() => User, u => u.textures)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User

  @Column({ name: 'uploader_id' })
  uploaderId: string

  @CreateDateColumn()
  createdAt: Date
}
```

## Migration 생성 및 실행

```bash
# Migration 생성
pnpm typeorm migration:generate apps/server/src/database/migrations/InitSchema -- -d apps/server/src/data-source.ts

# Migration 실행
pnpm typeorm migration:run -- -d apps/server/src/data-source.ts
```

## 관계 로딩 — eager: true 금지

```typescript
// ❌ 잘못된 방법 — 모든 조회에 roles 포함되어 N+1 위험
@ManyToMany(() => Role, { eager: true })

// ✅ 올바른 방법 — 필요한 조회에서만 명시
this.usersRepo.findOne({
  where: { id },
  relations: ['roles'],
})
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `synchronize: true` 운영 환경 사용 | `process.env.NODE_ENV === 'development'`에서만 true |
| Migration 없이 스키마 변경 | `migration:generate` → `migration:run` |
| `eager: true` 관계 남발 | 필요한 쿼리에서만 `relations: ['roleName']` 명시 |
| `@Column({ select: false })` 미사용 | password 컬럼은 반드시 select: false |
| integer PK 사용 | `@PrimaryGeneratedColumn('uuid')` 사용 |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행, synchronize 조건 + UUID PK 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/nestjs-typeorm/SKILL.md
git commit -m "feat: add nestjs-typeorm skill (UUID, migration, no eager)"
```

---

## Task 6: nestjs-file-upload

**Files:**
- Create: `skills/nestjs-file-upload/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 시나리오 실행** (스킬 없이)

```
You are a NestJS developer.

Implement texture file upload for CMF Hub:
- Accept image files (jpg, png, webp)
- Save to uploads/textures/
- Generate a thumbnail at 300x300 saved to uploads/thumbnails/
- Extract width, height, file size metadata
- Save metadata to database

Show the controller and service code.
```

Expected failures:
- 파일 타입 검증을 DB 저장 이후에 처리
- Sharp 썸네일 생성을 동기로 처리
- 파일명에 한글/특수문자가 있을 때 Content-Disposition 인코딩 누락
- DB 저장 실패 시 업로드된 파일 롤백 없음

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: skills/nestjs-file-upload/SKILL.md 작성**

```markdown
---
name: nestjs-file-upload
description: Use when implementing file upload in NestJS — when configuring Multer for image storage, generating thumbnails with Sharp, or serving files with proper filename encoding.
---

# NestJS File Upload

## Overview
파일 업로드는 Multer(저장) → Sharp(썸네일) → DB 저장 순서로 처리한다. 파일 타입 검증은 Multer fileFilter에서 먼저 하고, DB 저장 실패 시 파일을 롤백한다.

## Multer 설정 (CMF Hub)

```typescript
// textures/textures.controller.ts
import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { AuthGuard } from '@nestjs/passport'

@Controller('textures')
@UseGuards(AuthGuard('jwt'))
export class TexturesController {
  constructor(private readonly texturesService: TexturesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/textures',
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
          cb(null, `${unique}${extname(file.originalname)}`)
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('jpg, png, webp만 허용'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 50 * 1024 * 1024 },  // 50MB
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateTextureDto) {
    return this.texturesService.create(file, dto)
  }
}
```

## Sharp 썸네일 생성 (TexturesService)

```typescript
// textures/textures.service.ts
import { Injectable } from '@nestjs/common'
import * as sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

@Injectable()
export class TexturesService {
  async create(file: Express.Multer.File, dto: CreateTextureDto) {
    // Step 1: 썸네일 생성 (DB 저장 전)
    const thumbnailFilename = `thumb-${path.basename(file.filename)}`
    const thumbnailPath = path.join('uploads/thumbnails', thumbnailFilename)

    const metadata = await sharp(file.path)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbnailPath)

    // Step 2: 원본 메타데이터 추출
    const original = await sharp(file.path).metadata()

    // Step 3: DB 저장 (실패 시 파일 롤백)
    try {
      return await this.texturesRepo.save(this.texturesRepo.create({
        ...dto,
        originalFilename: file.originalname,
        path: file.path,
        thumbnailPath,
        mimetype: file.mimetype,
        size: file.size,
        width: original.width,
        height: original.height,
      }))
    } catch (err) {
      // DB 실패 시 업로드된 파일 정리
      fs.unlink(file.path, () => {})
      fs.unlink(thumbnailPath, () => {})
      throw err
    }
  }
}
```

## 파일 다운로드 — RFC 5987 인코딩 (한글 파일명)

```typescript
@Get(':id/download')
async download(@Param('id') id: string, @Res() res: Response) {
  const texture = await this.texturesService.findOne(id)
  const encoded = encodeURIComponent(texture.originalFilename)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encoded}`,  // RFC 5987
  )
  res.sendFile(path.resolve(texture.path))
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| fileFilter 없이 모든 파일 허용 | mimetype 화이트리스트로 검증 |
| DB 저장 후 썸네일 생성 | 썸네일 생성 → 메타데이터 추출 → DB 저장 순서 |
| DB 실패 시 파일 방치 | catch에서 `fs.unlink`로 파일 정리 |
| Content-Disposition에 한글 파일명 직접 삽입 | `filename*=UTF-8''${encodeURIComponent(...)}` RFC 5987 형식 |
| `sharp().resize()` 후 `.toBuffer()` 저장 | `.toFile(outputPath)` 사용 |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행, fileFilter + 롤백 + 순서 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/nestjs-file-upload/SKILL.md
git commit -m "feat: add nestjs-file-upload skill (Multer, Sharp, RFC 5987)"
```

---

## Task 7: nestjs-validation

**Files:**
- Create: `skills/nestjs-validation/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 시나리오 실행** (스킬 없이)

```
You are a NestJS developer.

Add request validation to CMF Hub's texture creation endpoint.
The request body should have: name (required, string), description (optional), tags (optional array of strings).
Show how to validate this in NestJS.
```

Expected failures:
- `main.ts`에 `ValidationPipe` 전역 등록 누락
- Service 레이어에서 수동으로 조건문 검증
- `whitelist: true` 옵션 누락 (선언하지 않은 필드가 DTO를 통과)
- `@IsOptional()` 없이 선택 필드를 required로 선언

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: skills/nestjs-validation/SKILL.md 작성**

```markdown
---
name: nestjs-validation
description: Use when adding request body validation to NestJS endpoints — when creating DTOs with class-validator or when requests with invalid fields are passing through to the service layer.
---

# NestJS Validation

## Overview
요청 데이터 검증은 DTO + class-validator 데코레이터로 선언하고, `ValidationPipe`를 `main.ts`에 전역 등록해서 모든 엔드포인트에 자동 적용한다. Service 레이어에서 조건문으로 검증하지 않는다.

## main.ts — ValidationPipe 전역 등록 (필수)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // DTO에 없는 필드 자동 제거
      forbidNonWhitelisted: true,  // DTO에 없는 필드 오면 400 에러
      transform: true,       // 요청 데이터를 DTO 타입으로 자동 변환
    }),
  )
  await app.listen(3000)
}
bootstrap()
```

## DTO (CMF Hub — CreateTextureDto)

```typescript
// textures/dto/create-texture.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength } from 'class-validator'

export class CreateTextureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @IsString()
  @IsOptional()           // 선택 필드
  description?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]
}
```

## UpdateDto — PartialType으로 모든 필드 선택으로

```typescript
// textures/dto/update-texture.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreateTextureDto } from './create-texture.dto'

export class UpdateTextureDto extends PartialType(CreateTextureDto) {}
// CreateTextureDto의 모든 필드가 자동으로 @IsOptional() 처리됨
```

## Controller에서 DTO 사용

```typescript
// textures/textures.controller.ts
@Post()
create(@Body() dto: CreateTextureDto) {  // 타입 선언만으로 검증 자동 적용
  return this.texturesService.create(dto)
}

@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateTextureDto) {
  return this.texturesService.update(id, dto)
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `main.ts`에 `useGlobalPipes` 누락 | ValidationPipe 전역 등록 필수 |
| `whitelist: true` 없이 등록 | 선언하지 않은 필드가 DTO를 통과함 |
| Service에서 `if (!dto.name) throw` 수동 검증 | DTO 데코레이터로 선언 후 ValidationPipe에 위임 |
| UpdateDto를 CreateDto와 별도로 중복 작성 | `PartialType(CreateDto)` 사용 |
| 선택 필드에 `@IsOptional()` 누락 | 없으면 required 취급되어 항상 실패 |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행, ValidationPipe 전역 등록 + whitelist 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/nestjs-validation/SKILL.md
git commit -m "feat: add nestjs-validation skill (ValidationPipe, whitelist, PartialType)"
```

---

## Task 8: README & package.json 업데이트

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: package.json 버전 및 키워드 업데이트**

```json
{
  "version": "1.7.0",
  "keywords": [
    "skills", "nextjs", "react", "frontend",
    "nestjs", "typeorm", "passport", "rbac",
    "tdd", "accessibility", "performance",
    "ai-agent", "mcp", "a2a", "ag-ui", "a2ui", "ucp", "ap2"
  ]
}
```

- [ ] **Step 2: README.md에 NestJS 섹션 추가**

목차에 추가:
```markdown
- [NestJS 백엔드](#nestjs-백엔드)
  - [nestjs-module-design](#nestjs-module-design)
  - [nestjs-module-structure](#nestjs-module-structure)
  - [nestjs-auth-jwt](#nestjs-auth-jwt)
  - [nestjs-rbac](#nestjs-rbac)
  - [nestjs-typeorm](#nestjs-typeorm)
  - [nestjs-file-upload](#nestjs-file-upload)
  - [nestjs-validation](#nestjs-validation)
```

본문에 NestJS 백엔드 섹션 추가 (`## AI 에이전트 프로토콜` 앞):
```markdown
## NestJS 백엔드

### nestjs-module-design

> **언제 사용하나요?** 새 NestJS 기능을 만들기 전에 — 어떤 NestJS 패턴과 스킬이 필요한지 결정할 때

| 레이어 | 질문 |
|--------|------|
| 모듈 구조 | Controller/Service/Repository/Entity 파일 배치가 필요한가? |
| 인증 | 로그인 / JWT가 필요한가? |
| 권한 | 역할/권한 제어가 필요한가? |
| DB | 엔티티 설계 / 마이그레이션이 필요한가? |
| 파일 | 업로드 / 썸네일이 필요한가? |
| 검증 | 요청 데이터 검증이 필요한가? |

---

### nestjs-module-structure

> **언제 사용하나요?** 새 NestJS 기능 모듈을 만들 때 — Controller/Service/Repository/Entity/DTO 파일을 어떻게 나누고 @Module로 연결할지 결정할 때

| 파일 | 역할 |
|------|------|
| `entity.ts` | TypeORM 엔티티 (DB 스키마) |
| `service.ts` | 비즈니스 로직, Repository 주입 |
| `controller.ts` | HTTP 엔드포인트 |
| `module.ts` | `TypeOrmModule.forFeature([Entity])` + providers/controllers 연결 |
| `dto/*.ts` | 요청 데이터 타입 + class-validator 데코레이터 |

---

### nestjs-auth-jwt

> **언제 사용하나요?** NestJS에서 로그인과 JWT 인증을 구현할 때 — Passport Local Strategy, RS256 토큰 서명, JwtAuthGuard로 라우트를 보호할 때

| 항목 | 내용 |
|------|------|
| 알고리즘 | RS256 (비대칭 키) — HS256 사용 금지 |
| 전략 | LocalStrategy (로그인) + JwtStrategy (토큰 검증) |
| Guard | `@UseGuards(AuthGuard('jwt'))` 라우트/컨트롤러 단위 적용 |

---

### nestjs-rbac

> **언제 사용하나요?** NestJS에서 역할 기반 접근 제어를 구현할 때 — `user:read`, `user:delete` 같은 세분화된 permission으로 라우트를 제한할 때

| 항목 | 내용 |
|------|------|
| 구조 | Role → permissions (string[]) |
| Guard 순서 | `AuthGuard('jwt')` (인증) → `PermissionsGuard` (권한) |
| 데코레이터 | `@RequirePermissions('user:delete')` |

---

### nestjs-typeorm

> **언제 사용하나요?** NestJS에서 TypeORM Entity를 설계하거나 MySQL 연결을 설정할 때 — synchronize 옵션, UUID PK, Migration을 결정할 때

| 항목 | 내용 |
|------|------|
| PK | `@PrimaryGeneratedColumn('uuid')` |
| synchronize | 개발에서만 true, 운영은 Migration |
| 관계 로딩 | eager: true 금지 — 쿼리별 `relations` 명시 |

---

### nestjs-file-upload

> **언제 사용하나요?** NestJS에서 파일 업로드를 구현할 때 — Multer로 이미지를 저장하고 Sharp로 썸네일을 생성하거나, 한글 파일명을 올바르게 인코딩해야 할 때

| 항목 | 내용 |
|------|------|
| 업로드 | Multer diskStorage + fileFilter (mimetype 화이트리스트) |
| 썸네일 | Sharp `.resize(300, 300).toFile()` |
| 처리 순서 | 썸네일 생성 → 메타데이터 추출 → DB 저장 |
| 다운로드 | `filename*=UTF-8''${encodeURIComponent(...)}` RFC 5987 |

---

### nestjs-validation

> **언제 사용하나요?** NestJS 엔드포인트에 요청 데이터 검증을 추가할 때 — class-validator DTO를 만들거나 ValidationPipe가 전역 등록되지 않아 검증이 동작하지 않을 때

| 항목 | 내용 |
|------|------|
| 전역 등록 | `main.ts`에 `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` |
| UpdateDto | `PartialType(CreateDto)` — 중복 작성 금지 |
| 선택 필드 | `@IsOptional()` 필수 |
```

- [ ] **Step 3: 스킬 적용 흐름에 NestJS 백엔드 흐름 추가**

```markdown
5. NestJS 백엔드 개발 시 (먼저 실행)
   └─ nestjs-module-design       (어떤 패턴 필요한지 결정 — 진입점)
       ├─ nestjs-auth-jwt        (로그인 + JWT + Guard)
       ├─ nestjs-rbac            (역할/권한 제어)
       ├─ nestjs-module-structure (모듈 파일 구조)
       ├─ nestjs-typeorm         (Entity + Migration)
       ├─ nestjs-file-upload     (Multer + Sharp)
       └─ nestjs-validation      (DTO + ValidationPipe)
```

- [ ] **Step 4: 버전 히스토리 추가**

```markdown
| v1.7.0 | NestJS 백엔드 스킬 7개 추가 (`nestjs-module-design`, `nestjs-module-structure`, `nestjs-auth-jwt`, `nestjs-rbac`, `nestjs-typeorm`, `nestjs-file-upload`, `nestjs-validation`). 도메인 확장 (Next.js + NestJS + AI 에이전트 프로토콜) |
```

- [ ] **Step 5: 커밋**

```bash
git add README.md package.json
git commit -m "docs: README v1.7.0 — NestJS 백엔드 스킬 7개 섹션 추가"
```
