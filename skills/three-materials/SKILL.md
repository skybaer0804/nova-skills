---
name: three-materials
description: Use when configuring 3D materials in React Three Fiber — when setting up PBR metalness/roughness, loading textures with useTexture, or adding environment reflections with envMap.
created: 2026-05-07
updated: 2026-05-07
---

# Three.js Materials (R3F)

## Overview
R3F에서 PBR 재질은 `MeshStandardMaterial`을 사용한다. 금속성은 `metalness` + `roughness` + `envMap` 세 가지를 함께 설정해야 반사가 보인다. 텍스처 로딩은 `useTexture` (drei)를 사용한다.

## PBR 재질 — metalness + roughness + envMap

```tsx
import { Environment, useTexture } from '@react-three/drei'

// 금속 구체
function MetalSphere() {
  return (
    <>
      {/* envMap 없으면 metalness가 반사되지 않음 */}
      <Environment preset="studio" />

      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#888888"
          metalness={0.9}       // 1 = 완전 금속
          roughness={0.1}       // 0 = 완전 매끄러운 (거울)
          envMapIntensity={1.5} // 환경 반사 강도
        />
      </mesh>
    </>
  )
}
```

## 텍스처 로딩 — useTexture (drei)

```tsx
import { useTexture } from '@react-three/drei'
import { Suspense } from 'react'

function WoodCube() {
  // useTexture — Suspense 내부에서 사용
  const [colorMap, roughnessMap, normalMap] = useTexture([
    '/textures/wood_color.jpg',
    '/textures/wood_roughness.jpg',
    '/textures/wood_normal.jpg',
  ])

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        map={colorMap}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        roughness={0.8}
        metalness={0.0}
      />
    </mesh>
  )
}

// 반드시 Suspense로 감싸기
function Scene() {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <WoodCube />
      </Suspense>
    </Canvas>
  )
}
```

## Material 빠른 참조

| Material | 조명 반응 | 용도 |
|----------|-----------|------|
| `MeshBasicMaterial` | 없음 | 와이어프레임, UI 오버레이 |
| `MeshStandardMaterial` | PBR | 일반 오브젝트 (권장) |
| `MeshPhysicalMaterial` | PBR+ | 유리, 투명 재질, clearcoat |
| `MeshToonMaterial` | Toon | 셀쉐이딩 |

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `MeshBasicMaterial`로 금속 표현 | `MeshStandardMaterial` + metalness/roughness |
| `metalness` 설정했는데 반사 없음 | `<Environment>` 또는 `envMap` 추가 필수 |
| `new THREE.TextureLoader().load()` | `useTexture` (drei) 사용 |
| `useTexture`를 Suspense 밖에서 사용 | 반드시 `<Suspense>` 내부 |
| roughness/metalness 기본값 그대로 | 의도적으로 설정 — 기본값은 재질별로 다름 |
