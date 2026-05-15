---
name: nestjs-module-structure
description: Use when creating a new NestJS feature module — when deciding how to split Controller, Service, Repository, Entity, and DTO files and wire them into a @Module.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS Module Structure

## Overview
NestJS features are built as self-contained modules separated into 4 layers: Controller / Service / Entity / DTO. Each file has a single responsibility, and the Module binds them together with the @Module decorator.

## File Structure (materials example)

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

## Entity — UUID PK required

```typescript
// materials/entities/material.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')   // do not use integer PK
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

## Service — Repository injection pattern

```typescript
// materials/materials.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Material } from './entities/material.entity'
import { CreateMaterialDto } from './dto/create-material.dto'
import { UpdateMaterialDto } from './dto/update-material.dto'

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialsRepo: Repository<Material>,
  ) {}

  findAll(): Promise<Material[]> {
    return this.materialsRepo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialsRepo.findOneBy({ id })
    if (!material) throw new NotFoundException(`Material ${id} not found`)
    return material
  }

  create(dto: CreateMaterialDto): Promise<Material> {
    return this.materialsRepo.save(this.materialsRepo.create(dto))
  }

  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id)
    Object.assign(material, dto)
    return this.materialsRepo.save(material)
  }

  async remove(id: string): Promise<void> {
    const material = await this.findOne(id)
    await this.materialsRepo.remove(material)
  }
}
```

## Module — TypeOrmModule.forFeature required

```typescript
// materials/materials.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Material } from './entities/material.entity'
import { MaterialsService } from './materials.service'
import { MaterialsController } from './materials.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Material])],  // must be registered
  providers: [MaterialsService],
  controllers: [MaterialsController],
  exports: [MaterialsService],  // when injecting into other modules
})
export class MaterialsModule {}
```

## app.module.ts registration

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({ ... }),
    MaterialsModule,  // add here
  ],
})
export class AppModule {}
```

## Common Mistakes

| Mistake | Fix |
|------|------|
| Using `@PrimaryGeneratedColumn()` integer PK | Use `@PrimaryGeneratedColumn('uuid')` |
| Calling `getRepository()` directly in Service | Use `@InjectRepository(Entity)` injection pattern |
| Missing `TypeOrmModule.forFeature([Entity])` | Must be registered in Module `imports` |
| Using `body: any` without DTO | Separate `CreateDto` / `UpdateDto` (→ `nestjs-validation`) |
| Using Service from another module without `exports` | Add `exports: [MaterialsService]` |
| Automatically adding Swagger decorators | Swagger is optional, not included in base module structure |
