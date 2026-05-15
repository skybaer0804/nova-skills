---
name: nestjs-file-upload
description: Use when implementing file upload in NestJS — when configuring Multer for image storage, generating thumbnails with Sharp, or serving files with correct filename encoding for non-ASCII filenames.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS File Upload

## Overview
File upload is processed in order: Multer (storage) → Sharp (thumbnail + metadata) → DB save. Validate mimetype first in fileFilter, and roll back uploaded files if DB save fails.

## Multer Configuration + fileFilter

```typescript
// textures/textures.controller.ts
import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body, Req, BadRequestException } from '@nestjs/common'
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
        if (!allowed.includes(file.mimetype)) {          // validate by mimetype, not extension
          return cb(new BadRequestException('Only jpg, png, webp are allowed'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 50 * 1024 * 1024 },           // 50MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTextureDto,
    @Req() req: { user: { id: string } },   // req.user populated by AuthGuard('jwt')
  ) {
    return this.texturesService.create(file, dto, req.user.id)   // uploaderId from JWT — required (NOT NULL)
  }
}
```

> **`file.mimetype` is client-supplied and spoofable.** The whitelist blocks honest mistakes and casual abuse, but for untrusted/public uploads also verify the file's magic bytes server-side (e.g. the `file-type` package) before processing.

## Sharp Thumbnail Generation + Rollback (TexturesService)

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
    // Step 1: generate thumbnail (before DB save)
    const thumbnailFilename = `thumb-${path.basename(file.filename)}`
    const thumbnailPath = path.join('uploads/thumbnails', thumbnailFilename)

    await sharp(file.path)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .toFile(thumbnailPath)                             // .toFile() — not .toBuffer()

    // Step 2: extract original metadata
    const { width, height } = await sharp(file.path).metadata()

    // Step 3: DB save — roll back files on failure
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
      fs.unlink(file.path, () => {})      // clean up files on DB failure
      fs.unlink(thumbnailPath, () => {})
      throw err
    }
  }
}
```

## File Download — RFC 5987 non-ASCII filenames

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
    `attachment; filename*=UTF-8''${encoded}`,          // RFC 5987 — non-ASCII filenames
  )
  res.sendFile(path.resolve(texture.path))
}
```

## Common Mistakes

| Mistake | Fix |
|------|------|
| Validating file type by extension (`extname`) | Validate using `file.mimetype` whitelist |
| Generating thumbnail after DB save | Order: generate thumbnail → extract metadata → DB save |
| Leaving files when DB save fails | Clean up files with `fs.unlink` in catch block |
| Using `sharp().toBuffer()` to save file | Use `.toFile(outputPath)` |
| Inserting non-ASCII characters directly in Content-Disposition | Use `filename*=UTF-8''${encodeURIComponent(...)}` RFC 5987 |
| Using `memoryStorage()` then saving manually | Use `diskStorage()` so Multer handles storage directly |
| Calling `service.create(file, dto)` without the uploader id | `create(file, dto, uploaderId)` needs it (`uploader_id` is NOT NULL); pass `req.user.id` from the JWT guard |
| Trusting `file.mimetype` as proof of content type | Client-supplied/spoofable; verify magic bytes (e.g. `file-type`) for untrusted input |
