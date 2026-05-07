---
name: r3f-scene-design
description: Use when starting a React 3D scene with Three.js — when deciding which R3F and drei patterns are needed before writing any code.
---

# R3F Scene Design (진입점)

## Overview
React에서 Three.js를 사용할 때는 vanilla Three.js(`new THREE.Scene()`) 대신 React Three Fiber(`<Canvas>`)를 사용한다. 코드 작성 전 이 스킬로 필요한 패턴을 결정한다.

## 결정 트리

React 3D 씬을 만드는가?

- **씬 기초(Canvas/Camera/Light/Mesh)가 필요한가?** → `three-scene-setup`
- **Material/텍스처/PBR 설정이 필요한가?** → `three-materials`
- **클릭/hover/카메라 컨트롤이 필요한가?** → `r3f-interaction`
- **애니메이션(회전/이동/스프링)이 필요한가?** → `r3f-animation`
- **많은 오브젝트(100+) 또는 GLTF 모델 로딩이 필요한가?** → `r3f-performance`

## 기능별 스킬 조합

| 씬 유형 | 필요한 스킬 조합 |
|---------|-----------------|
| 기본 3D 뷰어 | three-scene-setup → r3f-interaction |
| 인터랙티브 제품 쇼케이스 | three-scene-setup → three-materials → r3f-interaction |
| 애니메이션 씬 | three-scene-setup → r3f-animation |
| GLTF 모델 뷰어 | three-scene-setup → r3f-performance → r3f-interaction |
| 풀 3D 앱 | three-scene-setup → three-materials → r3f-interaction → r3f-animation → r3f-performance |

## 패키지 설치

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `new THREE.Scene()` + `WebGLRenderer` 직접 생성 | `<Canvas>` from `@react-three/fiber` 사용 |
| 결정 트리 없이 바로 코드 작성 | 이 스킬로 필요한 패턴 분류 후 해당 스킬로 이동 |
| drei 없이 OrbitControls 직접 구현 | `@react-three/drei` 헬퍼 활용 (`three-scene-setup`) |
| GLTF 로딩에 Suspense 없이 useGLTF 사용 | `r3f-performance` 스킬 참조 |
| `useFrame`에서 고정값으로 회전 (`+= 0.01`) | `delta` 사용 — `+= delta` (프레임 독립적) |
