---
name: nestjs-rbac
description: Use when implementing role-based access control in NestJS — when restricting routes by permissions such as user:read or texture:delete, or when needing separate guard from JwtAuthGuard.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS RBAC (Role-Based Access Control)

## Overview
Authentication (who you are) and authorization (what you can do) are kept separate. Apply `PermissionsGuard` (authorization) after `JwtAuthGuard` (authentication) as a distinct guard. Control access using fine-grained permission strings (`user:delete`) instead of role names (`Role.ADMIN`).

## Permission System

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
    if (!required?.length) return true  // pass if no decorator present

    const { user } = ctx.switchToHttp().getRequest()
    const dbUser = await this.usersService.findOneWithRoles(user.id)
    if (!dbUser) return false   // user deleted/disabled after token issued → deny (403), not 500
    const userPerms = dbUser.roles.flatMap(r => r.permissions)

    return required.every(p => userPerms.includes(p))
  }
}
```

## Applying to Routes — after JwtAuthGuard

```typescript
// users/users.controller.ts
import { UseGuards, Get, Delete, Param } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard'

@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)  // authentication → authorization order
export class UsersController {

  @Get()
  @RequirePermissions('user:read')
  findAll() { ... }

  @Delete(':id')
  @RequirePermissions('user:delete')
  remove(@Param('id') id: string) { ... }
}
```

## UsersService — query with roles included

```typescript
// users/users.service.ts
findOneWithRoles(id: string) {
  return this.usersRepo.findOne({
    where: { id },
    relations: ['roles'],  // load roles with permissions included
  })
}
```

## Role Entity

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

| Mistake | Fix |
|------|------|
| Checking `user.role === 'admin'` in Service | Handle only in `PermissionsGuard` |
| Making decisions based on role name (`UserRole.ADMIN`) | Use fine-grained permission strings like `user:delete` |
| Single `role` column on User (`@Column enum`) | Role entity many-to-many — multiple roles + permissions array |
| Combining `JwtAuthGuard` and `PermissionsGuard` into one | Authentication guard + authorization guard must be separate |
| Applying only `@UseGuards(PermissionsGuard)` | Follow `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` order |
| Querying User without `roles` | Load permissions with `findOne({ relations: ['roles'] })` |
| No null check on the DB user in the guard | Deleted/disabled user with a still-valid token → `null.roles` throws 500 instead of 403; add `if (!dbUser) return false` |
| Assuming `@UseGuards(PermissionsGuard)` protects every route | `if (!required?.length) return true` is fail-open by design — a route with no `@RequirePermissions` is open to any authenticated user; decorate every protected route |
