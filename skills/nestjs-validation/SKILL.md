---
name: nestjs-validation
description: Use when adding request body validation to NestJS endpoints — when creating DTOs with class-validator or when requests with invalid or extra fields are passing through to the service layer.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS Validation

## Overview
Request data validation is declared with DTO + class-validator decorators, and `ValidationPipe` is registered globally in `main.ts` so it applies automatically to all endpoints. Do not validate with conditional statements in the Service layer.

## main.ts — Global ValidationPipe registration (required)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)   // await required
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // automatically strip fields not in DTO
      forbidNonWhitelisted: true,  // return 400 when fields not in DTO are received
      transform: true,             // automatically convert request data to DTO types
    }),
  )
  await app.listen(3000)
}
bootstrap()
```

## CreateDto (example: CreateTextureDto)

```typescript
// textures/dto/create-texture.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength } from 'class-validator'

export class CreateTextureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @IsString()
  @IsOptional()           // optional field — treated as required if omitted
  description?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]
}
```

## UpdateDto — avoid duplication with PartialType

```typescript
// textures/dto/update-texture.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreateTextureDto } from './create-texture.dto'

export class UpdateTextureDto extends PartialType(CreateTextureDto) {}
// All fields from CreateTextureDto are automatically treated as @IsOptional()
```

## Controller — validation applied automatically via type declaration

```typescript
// textures/textures.controller.ts
@Post()
create(@Body() dto: CreateTextureDto) {   // ValidationPipe applied just by declaring the type
  return this.texturesService.create(dto)
}

@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateTextureDto) {
  return this.texturesService.update(id, dto)
}
```

## Common Mistakes

| Mistake | Fix |
|------|------|
| Missing `useGlobalPipes` in `main.ts` | Global ValidationPipe registration is required |
| Registering without `whitelist: true` | Undeclared fields pass through DTO and get saved to DB |
| Missing `await NestFactory.create()` | `const app = NestFactory.create()` → a promise gets passed to the pipe |
| Manual validation with `if (!dto.name) throw` in Service | Declare with DTO decorators and delegate to ValidationPipe |
| Writing UpdateDto separately duplicating CreateDto | Use `PartialType(CreateDto)` |
| Missing `@IsOptional()` on optional fields | Without it, the field is treated as required and always returns 400 |
