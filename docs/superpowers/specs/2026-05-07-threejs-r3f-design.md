# Three.js / R3F Skills — Design Spec

**Date:** 2026-05-07  
**Status:** Approved

---

## Goal

nova-skills 도메인을 React + Three.js / React Three Fiber(R3F) 3D 스킬로 확장한다. 씬 기초부터 애니메이션, 인터랙션, 성능 최적화까지 에이전트가 실제로 틀리는 패턴을 6개 스킬로 교정한다.

---

## 도메인 확장

### CLAUDE.md 변경

**기존:** "Next.js frontend skills, NestJS backend skills, AND AI agent protocol skills"

**변경:** "Next.js frontend skills, NestJS backend skills, React Three.js/R3F 3D skills, AND AI agent protocol skills"

추가 판단 기준:
> "Would this help someone building a React 3D scene with Three.js or R3F?"

**Naming conventions 추가:**
- `r3f-*` — React Three Fiber 전용 패턴 (useFrame, interaction, performance)
- `three-*` — Three.js 개념 스킬 (scene setup, materials)

---

## 스킬 목록 (6개)

| 스킬 | prefix | 핵심 내용 |
|------|--------|-----------|
| `r3f-scene-design` | r3f | 진입점 — 어떤 스킬 조합이 필요한지 결정 트리 |
| `three-scene-setup` | three | Canvas + PerspectiveCamera + 기본 Mesh + drei 헬퍼 |
| `three-materials` | three | MeshStandardMaterial, PBR 텍스처, envMap, roughness/metalness |
| `r3f-interaction` | r3f | onClick, onPointerOver, raycasting, OrbitControls, useRef |
| `r3f-animation` | r3f | useFrame, @react-spring/three, GSAP 연동 |
| `r3f-performance` | r3f | instancing, useGLTF + Suspense, drei Preload, draw call 최적화 |

---

## 실행 방식

진입점(`r3f-scene-design`) 먼저 완성 후 나머지 5개 B(순차) 또는 C(병렬) 선택.

---

## 각 스킬 공통 구조

```
---
name: r3f-* / three-*
description: Use when ... (triggering conditions only)
---

## Overview (한 줄 원칙)
## 핵심 패턴 + 실전 코드 (React + Vite 기반)
## Common Mistakes
```

스택: `@react-three/fiber`, `@react-three/drei`, `three`, React + Vite

---

## README & 패키지

- **version:** `1.7.0` → `1.8.0`
- **keywords 추가:** `threejs`, `r3f`, `react-three-fiber`, `3d`
- **README:** Three.js/R3F 섹션 추가 (목차, 스킬 카드, 적용 흐름)
- **CLAUDE.md:** 도메인 정의 + `r3f-*` / `three-*` 컨벤션

---

## 성공 기준

- 6개 스킬 각각 RED 베이스라인 기록 존재
- `r3f-scene-design`으로 올바른 스킬 조합을 선택하는 시나리오 통과
- README v1.8.0 배포
