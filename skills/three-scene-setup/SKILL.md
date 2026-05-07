---
name: three-scene-setup
description: Use when setting up a React 3D scene from scratch — when adding a Canvas, camera, lights, or basic mesh objects using React Three Fiber and drei.
---

# Three.js Scene Setup (R3F)

## Overview
React에서 Three.js 씬은 `<Canvas>`(R3F)로 시작한다. `new THREE.Scene()`을 직접 생성하지 않는다. 조명이 없으면 `MeshStandardMaterial`은 검게 보인다 — 반드시 Light를 추가한다.

## 기본 씬 구조

```tsx
// src/components/Scene.tsx
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import type { Mesh } from 'three'

function RotatingCube() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta       // delta 사용 — 프레임 독립적
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" />    {/* MeshBasicMaterial 사용 금지 */}
    </mesh>
  )
}

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
      {/* 조명 없으면 검은 화면 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <RotatingCube />

      <OrbitControls />    {/* drei — 마우스 드래그 카메라 */}
    </Canvas>
  )
}
```

## Canvas 크기 설정 (부모 컨테이너 기준)

```tsx
// App.tsx
function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Scene />   {/* Canvas는 부모 크기를 100% 채움 */}
    </div>
  )
}
```

## drei 헬퍼 — 자주 쓰는 것

```tsx
import { OrbitControls, Box, Sphere, Plane, Environment, Grid } from '@react-three/drei'

// 프리미티브 단축 컴포넌트
<Box args={[1, 1, 1]} position={[0, 0, 0]} />
<Sphere args={[0.5, 32, 32]} />
<Plane args={[10, 10]} rotation={[-Math.PI / 2, 0, 0]} />

// 환경광 (envMap 자동 설정)
<Environment preset="sunset" />

// 그리드 바닥
<Grid infiniteGrid />
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `new THREE.Scene()` 직접 생성 | `<Canvas>` from `@react-three/fiber` 사용 |
| 조명 없이 `MeshStandardMaterial` | 반드시 `<ambientLight>` + `<directionalLight>` 추가 |
| `MeshBasicMaterial` 사용 | 조명 반응 없음 — `MeshStandardMaterial` 사용 |
| `requestAnimationFrame` 수동 루프 | `useFrame((_, delta) => { ... })` 사용 |
| `delta` 없이 고정값으로 회전 | `rotation.x += delta` — 프레임레이트 독립적 |
| Canvas 크기가 0 | 부모 요소에 `width`/`height` 명시 |
