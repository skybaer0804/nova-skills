# NestJS Backend Skills — Design Spec

**Date:** 2026-05-06  
**Status:** Approved

---

## Goal

nova-skills 도메인을 NestJS 백엔드로 확장한다. CMF Hub 아키텍처를 기반으로 7개 스킬을 추가하여, 에이전트가 NestJS 프로젝트에서 반복적으로 틀리는 패턴을 교정한다.

---

## 도메인 확장

### CLAUDE.md 변경

**기존:** "Next.js frontend skills AND AI agent protocol skills"

**변경:** "Next.js frontend skills, NestJS backend skills, AND AI agent protocol skills"

추가 판단 기준:
> "Would this help someone building a NestJS backend (module structure, auth, RBAC, database, file handling, validation)?"

컨벤션: `nestjs-*` prefix = NestJS 백엔드 전용.

---

## 스킬 목록 (7개)

### Step 0: CLAUDE.md 도메인 확장

### Step 1: nestjs-module-design (진입점)

- **역할:** "어떤 NestJS 스킬이 필요한가?" 결정 트리
- **트리거:** NestJS 프로젝트를 시작하거나 새 기능을 추가할 때 — 어디서부터 시작할지 모를 때
- **내용:** 레이어드 아키텍처 전체 지도 + 각 구현 스킬로의 진입 조건

### Step 2: 구현 스킬 6개

실행 방식: **B(순차) 또는 C(병렬)** — 계획 단계에서 선택

| 스킬 | 핵심 패턴 | CMF Hub 예시 |
|------|-----------|--------------|
| `nestjs-module-structure` | Controller/Service/Repository/Entity/DTO 자급자족 모듈 | `TexturesModule`, `MaterialsModule` |
| `nestjs-auth-jwt` | Passport Local + RS256 JWT + JwtAuthGuard | `AuthController`, `AuthService`, `JwtStrategy` |
| `nestjs-rbac` | Role → Permission 세분화, `PermissionsGuard` | `RolesGuard`, `Role` entity, `user:read` 등 |
| `nestjs-typeorm` | Entity 설계, Repository 패턴, Migration | `Texture` entity, `User` entity, UUID PK |
| `nestjs-file-upload` | Multer 설정 + Sharp 썸네일 파이프라인 | `TexturesController` 업로드, `uploads/textures/`, `uploads/thumbnails/` |
| `nestjs-validation` | class-validator + class-transformer DTO | `CreateTextureDto`, `UpdateUserDto` |

---

## 각 스킬 공통 구조

```
---
name: nestjs-<name>
description: Use when ... (triggering conditions only)
---

# NestJS <Name>

## Overview
한 줄 원칙

## 결정 트리 or 핵심 패턴 (CMF Hub 기반)
실전 코드

## Common Mistakes
| 실수 | 수정 |
```

코드 예시는 CMF Hub 실제 네이밍 사용 (`TextureController`, `UserService`, `RolesGuard` 등).

---

## 실행 방식 (B vs C)

계획 단계에서 선택:

- **B (순차):** `nestjs-module-design` → `nestjs-auth-jwt` → `nestjs-rbac` → `nestjs-typeorm` → `nestjs-file-upload` → `nestjs-validation` → `nestjs-module-structure` 순서로 한 스킬씩 RED-GREEN-REFACTOR 완전 완료
- **C (병렬):** `nestjs-module-design` 완성 후 나머지 6개 서브에이전트 병렬 작성, 완료 후 스타일 통일 검수

---

## README & 패키지 업데이트

- **version:** `1.6.0` → `1.7.0`
- **keywords 추가:** `nestjs`, `typeorm`, `passport`, `rbac`
- **README:** NestJS 백엔드 섹션 추가 (목차, 스킬 카드, 적용 흐름, 버전 히스토리)
- **CLAUDE.md:** 도메인 정의 + `nestjs-*` 컨벤션

---

## 성공 기준

- 7개 스킬 각각 RED 베이스라인 기록 존재
- 에이전트가 `nestjs-module-design` 스킬로 올바른 구현 스킬을 선택하는 시나리오 통과
- README v1.7.0 배포
