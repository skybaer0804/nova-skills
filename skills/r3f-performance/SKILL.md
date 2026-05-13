---
name: r3f-performance
description: Use when rendering many 3D objects or loading GLTF models in React Three Fiber — when draw calls are high, models cause loading flicker, or geometry is recreated on every render.
created: 2026-05-07
updated: 2026-05-07
---

# R3F Performance

## Overview
R3F 성능 최적화의 핵심: 100개 이상 오브젝트는 `InstancedMesh`, GLTF 로딩은 `useGLTF` + `Suspense`, geometry/material은 `useMemo`로 한 번만 생성한다.

## InstancedMesh — 1000개 오브젝트 (1 draw call)

```tsx
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

function ThousandSpheres() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const count = 1000

  // geometry/material은 useMemo — 매 렌더마다 재생성 금지
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      )
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true  // 반드시 필요
  }, [dummy])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.1, 8, 8]} />       {/* 낮은 폴리곤 */}
      <meshStandardMaterial color="white" />
    </instancedMesh>
  )
}
```

## useGLTF + Suspense — GLTF 모델 로딩

```tsx
import { useGLTF } from '@react-three/drei'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'

function Robot() {
  const { scene } = useGLTF('/models/robot.glb')   // 자동 캐시
  return <primitive object={scene} />
}

// 반드시 Suspense로 감싸기
function Scene() {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Robot />
      </Suspense>
    </Canvas>
  )
}

// 모델 사전 로드 (선택) — 씬 진입 전 미리 캐시
useGLTF.preload('/models/robot.glb')
```

## useMemo — geometry/material 재생성 방지

```tsx
function OptimizedMesh() {
  // 매 렌더마다 new THREE.BoxGeometry() 생성 금지
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: 'red' }), [])

  return <mesh geometry={geometry} material={material} />
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| 100개 이상 `<mesh>` map 렌더링 | `<instancedMesh>` 사용 (1 draw call) |
| `THREE.GLTFLoader` 직접 사용 | `useGLTF` (drei) — 자동 캐시 + Suspense 통합 |
| `useGLTF`를 Suspense 밖에서 사용 | `<Suspense fallback={null}>` 필수 |
| 매 렌더에 `new THREE.SphereGeometry()` | `useMemo`로 한 번만 생성 |
| `instanceMatrix.needsUpdate = true` 누락 | 인스턴스 위치 업데이트 후 반드시 설정 |
| 고폴리곤 geometry를 1000개에 적용 | 원거리 오브젝트는 낮은 폴리곤 (`args={[0.1, 8, 8]}`) |
