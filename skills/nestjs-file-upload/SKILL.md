---
name: nestjs-file-upload
description: Use when implementing file upload in NestJS — when configuring Multer for image storage, generating thumbnails with Sharp, or serving files with correct filename encoding for non-ASCII filenames.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS File Upload

## Overview
파일 업로드는 Multer(저장) → Sharp(썸네일 + 메타데이터) → DB 저장 순서로 처리한다. fileFilter에서 mimetype을 먼저 검증하고, DB 저장 실패 시 업로드 파일을 롤백한다.

## Multer 설정 + fileFilter (CMF Hub)

```typescript
// textures/textures.controller.ts
import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { AuthGuard } from '@nestjs/passport'
import { TexturesService } from './textures.service'
import { CreateTextureDto } from './dto/create-texture.dto'

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
        if (!allowed.includes(file.mimetype)) {          // 확장자가 아닌 mimetype 검증
          return cb(new BadRequestException('jpg, png, webp만 허용'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 50 * 1024 * 1024 },           // 50MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTextureDto,
  ) {
    return this.texturesService.create(file, dto)
  }
}
```

## Sharp 썸네일 생성 + 롤백 (TexturesService)

```typescript
// textures/textures.service.ts
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'
import { Texture } from './entities/texture.entity'
import { CreateTextureDto } from './dto/create-texture.dto'

@Injectable()
export class TexturesService {
  constructor(
    @InjectRepository(Texture)
    private readonly texturesRepo: Repository<Texture>,
  ) {}

  async create(file: Express.Multer.File, dto: CreateTextureDto, uploaderId: string) {
    // Step 1: 썸네일 생성 (DB 저장 전)
    const thumbnailFilename = `thumb-${path.basename(file.filename)}`
    const thumbnailPath = path.join('uploads/thumbnails', thumbnailFilename)

    await sharp(file.path)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbnailPath)                             // .toFile() — .toBuffer() 아님

    // Step 2: 원본 메타데이터 추출
    const { width, height } = await sharp(file.path).metadata()

    // Step 3: DB 저장 — 실패 시 파일 롤백
    try {
      return await this.texturesRepo.save(
        this.texturesRepo.create({
          ...dto,
          originalFilename: file.originalname,
          path: file.path,
          thumbnailPath,
          mimetype: file.mimetype,
          size: file.size,
          width,
          height,
          uploaderId,
        }),
      )
    } catch (err) {
      fs.unlink(file.path, () => {})      // DB 실패 시 파일 정리
      fs.unlink(thumbnailPath, () => {})
      throw err
    }
  }
}
```

## 파일 다운로드 — RFC 5987 한글 파일명

```typescript
// textures/textures.controller.ts
import { Get, Param, Res } from '@nestjs/common'
import { Response } from 'express'
import * as path from 'path'

@Get(':id/download')
async download(@Param('id') id: string, @Res() res: Response) {
  const texture = await this.texturesService.findOne(id)
  const encoded = encodeURIComponent(texture.originalFilename)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encoded}`,          // RFC 5987 — 한글 파일명
  )
  res.sendFile(path.resolve(texture.path))
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 확장자(`extname`)로 파일 타입 검증 | `file.mimetype` 화이트리스트로 검증 |
| DB 저장 후 썸네일 생성 | 썸네일 생성 → 메타데이터 추출 → DB 저장 순서 |
| DB 실패 시 파일 방치 | catch에서 `fs.unlink`로 파일 정리 |
| `sharp().toBuffer()` 로 파일 저장 | `.toFile(outputPath)` 사용 |
| Content-Disposition에 한글 직접 삽입 | `filename*=UTF-8''${encodeURIComponent(...)}` RFC 5987 |
| `memoryStorage()` 사용 후 수동 저장 | `diskStorage()`로 Multer가 직접 저장 처리 |
