---
name: nestjs-module-design
description: Use when starting a new NestJS feature or project — when deciding which NestJS patterns and skills are needed before writing any code.
created: 2026-05-06
updated: 2026-05-06
---

# NestJS Module Design (진입점)

## Overview
NestJS 기능 구현 전에 필요한 패턴을 먼저 결정한다. 코드 작성 전 이 스킬로 방향을 잡고, 필요한 구현 스킬로 이동한다.

## 결정 트리

새 NestJS 기능을 만드는가?

- **모듈 파일 구조 설계가 필요한가?** → `nestjs-module-structure`
  (Controller/Service/Repository/Entity/DTO 파일 배치 및 @Module 연결)
- **로그인 / JWT 인증이 필요한가?** → `nestjs-auth-jwt`
  (Passport Local Strategy + RS256 JWT + JwtAuthGuard)
- **역할/권한 제어가 필요한가?** → `nestjs-rbac`
  (Role → Permission 세분화, PermissionsGuard — RolesGuard가 아님)
- **DB 엔티티/쿼리 설계가 필요한가?** → `nestjs-typeorm`
  (TypeORM Entity, Repository 패턴, Migration)
- **파일 업로드/썸네일이 필요한가?** → `nestjs-file-upload`
  (Multer 설정 + Sharp 썸네일 파이프라인)
- **요청 데이터 검증이 필요한가?** → `nestjs-validation`
  (class-validator DTO, ValidationPipe 전역 설정)

## CMF Hub 기능별 스킬 조합

| 기능 | 필요한 스킬 조합 |
|------|-----------------|
| 새 도메인 모듈 추가 | module-structure → typeorm → validation |
| 인증 시스템 구축 | auth-jwt → rbac |
| 파일 관리 기능 | module-structure → file-upload → typeorm |
| 전체 CRUD API | module-structure → typeorm → validation → rbac |
| 텍스처 업로드 (CMF Hub 전체) | auth-jwt → rbac → module-structure → typeorm → file-upload → validation |

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 결정 트리 없이 바로 Controller 코드 작성 | 이 스킬로 필요한 패턴을 먼저 분류 후 해당 스킬로 이동 |
| 인증과 권한을 같은 Guard(`RolesGuard`)로 처리 | `nestjs-auth-jwt`(인증) + `nestjs-rbac`(권한)은 별도 Guard |
| 역할 이름(`UserRole.ADMIN`)으로 접근 제어 | `user:delete` 같은 세분화된 permission 문자열 사용 (`nestjs-rbac`) |
| Entity 없이 Service 먼저 작성 | `nestjs-typeorm` → `nestjs-module-structure` 순서 |
| `npm install` 사용 | `pnpm add` 사용 |
