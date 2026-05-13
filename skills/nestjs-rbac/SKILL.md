---
name: nestjs-rbac
description: Use when implementing role-based access control in NestJS — when restricting routes by permissions such as user:read or texture:delete, or when needing separate guard from JwtAuthGuard.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS RBAC (Role-Based Access Control)

## Overview
인증(누구인가)과 권한(무엇을 할 수 있는가)은 분리한다. `JwtAuthGuard`(인증) 다음에 `PermissionsGuard`(권한)를 별도로 적용한다. 역할 이름 (`Role.ADMIN`) 대신 세분화된 permission 문자열 (`user:delete`)로 접근을 제어한다.

## Permission 체계 (CMF Hub)

```
Role "admin" → permissions: ["user:read", "user:create", "user:update", "user:delete", "texture:upload", "texture:delete"]
Role "user"  → permissions: ["texture:upload"]
```

## PermissionsGuard

```typescript
// auth/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SetMetadata } from '@nestjs/common'
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

## Role Entity (CMF Hub 구조)

```typescript
// roles/entities/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm'
import { User } from '../../users/entities/user.entity'

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  name: string  // 'admin', 'user'

  @Column('simple-json')
  permissions: string[]  // ['user:read', 'user:delete', ...]

  @ManyToMany(() => User, u => u.roles)
  users: User[]
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| Service에서 `user.role === 'admin'` 체크 | `PermissionsGuard`에서만 처리 |
| 역할 이름(`UserRole.ADMIN`)으로 판단 | `user:delete` 같은 세분화된 permission 문자열 사용 |
| User에 단일 `role` 컬럼 (`@Column enum`) | Role 엔티티 many-to-many — 복수 역할 + permissions 배열 |
| `JwtAuthGuard`와 `PermissionsGuard`를 하나로 합침 | 인증 Guard + 권한 Guard 반드시 분리 |
| `@UseGuards(PermissionsGuard)` 만 적용 | `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` 순서 지킴 |
| `roles` 없이 User 조회 | `findOne({ relations: ['roles'] })`로 권한 포함 로드 |
