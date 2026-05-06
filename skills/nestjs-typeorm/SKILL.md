---
name: nestjs-typeorm
description: Use when defining TypeORM entities, configuring MySQL connection, or managing schema migrations in NestJS — when setting up TypeORM or adding new entities with relationships.
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

## User Entity (CMF Hub — many-to-many Role)

```typescript
// users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Role } from '../../roles/entities/role.entity'
import { Texture } from '../../textures/entities/texture.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')          // UUID PK — integer 사용 금지
  id: string

  @Column({ unique: true })
  username: string

  @Column({ select: false })               // 기본 조회에서 password 제외
  password: string

  @Column({ nullable: true })
  name: string | null

  @ManyToMany(() => Role, { eager: false })
  @JoinTable({ name: 'user_roles' })
  roles: Role[]                            // 단일 role 컬럼 대신 many-to-many

  @OneToMany(() => Texture, t => t.uploader)
  textures: Texture[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

## Role Entity (permissions 배열 포함)

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
  permissions: string[]  // ['user:read', 'user:delete', 'texture:upload']

  @ManyToMany(() => User, u => u.roles)
  users: User[]
}
```

## Texture Entity (uploader 관계 포함)

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

  @Column()
  path: string

  @Column()
  thumbnailPath: string

  @Column()
  mimetype: string

  @Column()
  size: number

  @Column()
  width: number

  @Column()
  height: number

  @ManyToOne(() => User, u => u.textures)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User

  @Column({ name: 'uploader_id' })
  uploaderId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

## Migration 생성 및 실행

```bash
# Migration 생성
pnpm typeorm migration:generate src/database/migrations/InitSchema -- -d src/data-source.ts

# Migration 실행
pnpm typeorm migration:run -- -d src/data-source.ts
```

## 관계 로딩 — eager: true 금지

```typescript
// ❌ 잘못된 방법 — 모든 조회에 roles 포함, N+1 위험
@ManyToMany(() => Role, { eager: true })

// ✅ 올바른 방법 — 필요한 쿼리에서만 명시
this.usersRepo.findOne({
  where: { id },
  relations: ['roles'],
})
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `synchronize: true` 운영 환경 사용 | `NODE_ENV === 'development'`에서만 true |
| Migration 없이 스키마 변경 | `migration:generate` → `migration:run` |
| `eager: true` 관계 남발 | 필요한 쿼리에서만 `relations: ['roleName']` 명시 |
| User에 단일 `role` enum 컬럼 | Role 엔티티 many-to-many — permissions 배열 포함 |
| `@Column({ select: false })` 미사용 | password 컬럼은 반드시 `select: false` |
| integer PK 사용 | `@PrimaryGeneratedColumn('uuid')` |
