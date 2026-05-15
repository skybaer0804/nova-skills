---
name: nestjs-auth-jwt
description: Use when implementing login and JWT authentication in NestJS — when adding Passport Local strategy, RS256 token signing, or JwtAuthGuard to protect routes.
created: 2026-05-07
updated: 2026-05-07
---

# NestJS Auth JWT

## Overview
NestJS authentication is composed of three stages: Passport Local (login) + RS256 JWT (token) + JwtAuthGuard (protection). Uses RS256 (asymmetric key) — sign with private key, verify with public key.

## RS256 Key Generation (keys/ directory)

```bash
mkdir -p keys
openssl genrsa -out keys/private.key 2048
openssl rsa -in keys/private.key -pubout -out keys/public.key
```

## Core Flow

```
POST /auth/login
  → LocalStrategy (username/password validation)
  → AuthService.login() (JWT signing — private.key)
  → { access_token }

GET /textures (protected route)
  → JwtAuthGuard
  → JwtStrategy (token verification — public.key)
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
      privateKey: fs.readFileSync('keys/private.key'),    // file-based
      publicKey: fs.readFileSync('keys/public.key'),
      signOptions: { algorithm: 'RS256', expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

## LocalStrategy (login validation)

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

## AuthService — token generation belongs in Service

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
    const { password: _, ...result } = user   // exclude password from response
    return result
  }

  login(user: { id: string; username: string }) {
    return {
      access_token: this.jwtService.sign({ sub: user.id, username: user.username }),
    }
  }
}
```

## JwtStrategy (token verification)

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
      algorithms: ['RS256'],   // enforce RS256 — blocks HS256 downgrade attacks
    })
  }

  validate(payload: { sub: string; username: string }) {
    return { id: payload.sub, username: payload.username }
  }
}
```

## Route Protection — applied at controller level

```typescript
// textures/textures.controller.ts
import { UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Controller('textures')
@UseGuards(AuthGuard('jwt'))   // protect entire controller
export class TexturesController { ... }
```

## Common Mistakes

| Mistake | Fix |
|------|------|
| Using HS256 (symmetric key) + `secret` | Use RS256 + `privateKey`/`publicKey` file-based |
| Validating directly in Service without LocalStrategy | Separate with `passport-local` + `LocalStrategy` |
| Generating token in Controller | Generate only in `AuthService.login()` |
| Missing `algorithms: ['RS256']` | Explicitly specify JWT algorithm — blocks none/HS256 downgrade |
| Including password in response object | Destructure with `const { password: _, ...result } = user` |
| Managing keys as environment variable strings | Prefer file-based `fs.readFileSync('keys/private.key')` |
