---
name: nestjs-validation
description: Use when adding request body validation to NestJS endpoints — when creating DTOs with class-validator or when requests with invalid or extra fields are passing through to the service layer.
created: 2026-05-07
updated: 2026-05-07
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
  const app = await NestFactory.create(AppModule)   // await 필수
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // DTO에 없는 필드 자동 제거
      forbidNonWhitelisted: true,  // DTO에 없는 필드 오면 400
      transform: true,             // 요청 데이터를 DTO 타입으로 자동 변환
    }),
  )
  await app.listen(3000)
}
bootstrap()
```

## CreateDto (CMF Hub — CreateTextureDto)

```typescript
// textures/dto/create-texture.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength } from 'class-validator'

export class CreateTextureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @IsString()
  @IsOptional()           // 선택 필드 — 없으면 required 취급
  description?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]
}
```

## UpdateDto — PartialType으로 중복 금지

```typescript
// textures/dto/update-texture.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreateTextureDto } from './create-texture.dto'

export class UpdateTextureDto extends PartialType(CreateTextureDto) {}
// CreateTextureDto의 모든 필드가 자동으로 @IsOptional() 처리됨
```

## Controller — 타입 선언만으로 검증 자동 적용

```typescript
// textures/textures.controller.ts
@Post()
create(@Body() dto: CreateTextureDto) {   // 타입 선언만으로 ValidationPipe 적용
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
| `whitelist: true` 없이 등록 | 선언하지 않은 필드가 DTO를 통과해 DB에 저장됨 |
| `await NestFactory.create()` 누락 | `const app = NestFactory.create()` → 프로미스가 파이프에 전달됨 |
| Service에서 `if (!dto.name) throw` 수동 검증 | DTO 데코레이터로 선언 후 ValidationPipe에 위임 |
| UpdateDto를 CreateDto와 별도로 중복 작성 | `PartialType(CreateDto)` 사용 |
| 선택 필드에 `@IsOptional()` 누락 | 없으면 required 취급되어 항상 400 |
