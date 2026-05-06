---
name: nestjs-module-structure
description: Use when creating a new NestJS feature module — when deciding how to split Controller, Service, Repository, Entity, and DTO files and wire them into a @Module.
---

# NestJS Module Structure

## Overview
NestJS 기능은 Controller / Service / Entity / DTO 4개 레이어로 분리된 자급자족 모듈로 만든다. 각 파일은 하나의 책임만 가지며, Module이 이들을 @Module 데코레이터로 묶는다.

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

## Entity — UUID PK 필수

```typescript
// materials/entities/material.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')   // integer PK 사용 금지
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

## Service — Repository 주입 패턴

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

## Module — TypeOrmModule.forFeature 필수

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
  exports: [MaterialsService],  // 다른 모듈에서 주입할 경우
})
export class MaterialsModule {}
```

## app.module.ts 등록

```typescript
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
| `@PrimaryGeneratedColumn()` integer PK 사용 | `@PrimaryGeneratedColumn('uuid')` 사용 |
| Service에서 `getRepository()` 직접 호출 | `@InjectRepository(Entity)` 주입 패턴 사용 |
| `TypeOrmModule.forFeature([Entity])` 누락 | Module `imports`에 반드시 등록 |
| DTO 없이 `body: any` 사용 | `CreateDto` / `UpdateDto` 분리 (→ `nestjs-validation`) |
| `exports` 없이 다른 모듈에서 Service 사용 | `exports: [MaterialsService]` 추가 |
| Swagger 데코레이터 자동 추가 | Swagger는 선택사항, 기본 모듈 구조에 포함 안 함 |
