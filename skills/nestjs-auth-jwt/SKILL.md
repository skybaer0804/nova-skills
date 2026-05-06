---
name: nestjs-auth-jwt
description: Use when implementing login and JWT authentication in NestJS — when adding Passport Local strategy, RS256 token signing, or JwtAuthGuard to protect routes.
---

# NestJS Auth JWT

## Overview
NestJS 인증은 Passport Local(로그인) + RS256 JWT(토큰) + JwtAuthGuard(보호) 3단계로 구성한다. RS256(비대칭 키)을 사용한다 — private key로 서명, public key로 검증.

## RS256 키 생성 (CMF Hub — keys/ 디렉토리)

```bash
mkdir -p apps/server/keys
openssl genrsa -out apps/server/keys/private.key 2048
openssl rsa -in apps/server/keys/private.key -pubout -out apps/server/keys/public.key
```

## 핵심 흐름

```
POST /auth/login
  → LocalStrategy (username/password 검증)
  → AuthService.login() (JWT 서명 — private.key)
  → { access_token }

GET /textures (보호된 라우트)
  → JwtAuthGuard
  → JwtStrategy (토큰 검증 — public.key)
  → Controller
```

## AuthModule

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import * as fs from 'fs'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { LocalStrategy } from './strategies/local.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      privateKey: fs.readFileSync('keys/private.key'),    // 파일 기반
      publicKey: fs.readFileSync('keys/public.key'),
      signOptions: { algorithm: 'RS256', expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

## LocalStrategy (로그인 검증)

```typescript
// auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { AuthService } from '../auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'username' })
  }

  async validate(username: string, password: string) {
    const user = await this.authService.validateUser(username, password)
    if (!user) throw new UnauthorizedException()
    return user
  }
}
```

## AuthService — 토큰 생성은 Service에서

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username)
    if (!user) throw new UnauthorizedException()
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new UnauthorizedException()
    const { password: _, ...result } = user   // password 응답에서 제외
    return result
  }

  login(user: { id: string; username: string }) {
    return {
      access_token: this.jwtService.sign({ sub: user.id, username: user.username }),
    }
  }
}
```

## JwtStrategy (토큰 검증)

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import * as fs from 'fs'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: fs.readFileSync('keys/public.key'),
      algorithms: ['RS256'],   // RS256 강제 — HS256 다운그레이드 공격 차단
    })
  }

  validate(payload: { sub: string; username: string }) {
    return { id: payload.sub, username: payload.username }
  }
}
```

## 라우트 보호 — 컨트롤러 단위 적용

```typescript
// textures/textures.controller.ts
import { UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Controller('textures')
@UseGuards(AuthGuard('jwt'))   // 컨트롤러 전체 보호
export class TexturesController { ... }
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| HS256(대칭키) + `secret` 사용 | RS256 + `privateKey`/`publicKey` 파일 기반 사용 |
| LocalStrategy 없이 직접 Service에서 검증 | `passport-local` + `LocalStrategy` 분리 |
| 토큰 생성을 Controller에서 처리 | `AuthService.login()`에서만 생성 |
| `algorithms: ['RS256']` 누락 | JWT 알고리즘 명시 필수 — none/HS256 다운그레이드 차단 |
| password를 응답 객체에 포함 | `const { password: _, ...result } = user` 구조분해 |
| 키를 환경변수 문자열로 관리 | `fs.readFileSync('keys/private.key')` 파일 기반 권장 |
