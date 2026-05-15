---
name: nestjs-typeorm
description: Use when defining TypeORM entities, configuring MySQL connection, or managing schema migrations in NestJS — when setting up TypeORM or adding new entities with relationships.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS TypeORM

## Overview
In TypeORM configuration, `synchronize: true` is only used in development environments. Production environments manage schema with Migrations. PKs use UUID, and relation loading is controlled with explicit `relations` options.

## TypeORM Configuration

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
  synchronize: process.env.NODE_ENV === 'development',  // false in production
  migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
  migrationsRun: process.env.NODE_ENV !== 'development',
})
```

## User Entity (many-to-many Role)

```typescript
// users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Role } from '../../roles/entities/role.entity'
import { Texture } from '../../textures/entities/texture.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')          // UUID PK — do not use integer
  id: string

  @Column({ unique: true })
  username: string

  @Column({ select: false })               // exclude password from default queries
  password: string                         // auth lookup must .addSelect('user.password') — see nestjs-auth-jwt

  @Column({ nullable: true })
  name: string | null

  @ManyToMany(() => Role, { eager: false })
  @JoinTable({ name: 'user_roles' })
  roles: Role[]                            // many-to-many instead of single role column

  @OneToMany(() => Texture, t => t.uploader)
  textures: Texture[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

## Role Entity (with permissions array)

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

## Texture Entity (with uploader relation)

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

## Generating and Running Migrations

```bash
# Generate migration
pnpm typeorm migration:generate src/database/migrations/InitSchema -- -d src/data-source.ts

# Run migration
pnpm typeorm migration:run -- -d src/data-source.ts
```

## Relation Loading — do not use eager: true

```typescript
// ❌ Wrong approach — roles included in every query, N+1 risk
@ManyToMany(() => Role, { eager: true })

// ✅ Correct approach — specify explicitly only in queries that need it
this.usersRepo.findOne({
  where: { id },
  relations: ['roles'],
})
```

## Common Mistakes

| Mistake | Fix |
|------|------|
| Using `synchronize: true` in production | Only true when `NODE_ENV === 'development'` |
| Changing schema without Migration | Use `migration:generate` → `migration:run` |
| Overusing `eager: true` for relations | Specify `relations: ['roleName']` only in queries that need it |
| Single `role` enum column on User | Role entity many-to-many — includes permissions array |
| Not using `@Column({ select: false })` | password column must always have `select: false` |
| Using integer PK | Use `@PrimaryGeneratedColumn('uuid')` |
