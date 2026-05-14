---
name: r3f-performance
description: Use when rendering many 3D objects or loading GLTF models in React Three Fiber — when draw calls are high, models cause loading flicker, or geometry is recreated on every render.
created: 2026-05-07
updated: 2026-05-07
---

# R3F Performance

## Overview
The core of R3F performance optimization: use `InstancedMesh` for 100+ objects, load GLTF with `useGLTF` + `Suspense`, and create geometry/material only once with `useMemo`.

## InstancedMesh — 1000 Objects (1 Draw Call)

```tsx
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

function ThousandSpheres() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const count = 1000

  // geometry/material via useMemo — never recreate on every render
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
    meshRef.current.instanceMatrix.needsUpdate = true  // Required
  }, [dummy])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.1, 8, 8]} />       {/* Low polygon count */}
      <meshStandardMaterial color="white" />
    </instancedMesh>
  )
}
```

## useGLTF + Suspense — Loading GLTF Models

```tsx
import { useGLTF } from '@react-three/drei'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'

function Robot() {
  const { scene } = useGLTF('/models/robot.glb')   // Automatically cached
  return <primitive object={scene} />
}

// Always wrap with Suspense
function Scene() {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Robot />
      </Suspense>
    </Canvas>
  )
}

// Preload model (optional) — cache before entering the scene
useGLTF.preload('/models/robot.glb')
```

## useMemo — Preventing geometry/material Recreation

```tsx
function OptimizedMesh() {
  // Never create new THREE.BoxGeometry() on every render
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: 'red' }), [])

  return <mesh geometry={geometry} material={material} />
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Rendering 100+ `<mesh>` elements with map | Use `<instancedMesh>` (1 draw call) |
| Using `THREE.GLTFLoader` directly | Use `useGLTF` (drei) — auto cache + Suspense integration |
| Using `useGLTF` outside of Suspense | `<Suspense fallback={null}>` is required |
| Creating `new THREE.SphereGeometry()` on every render | Use `useMemo` to create it only once |
| Missing `instanceMatrix.needsUpdate = true` | Must be set after updating instance positions |
| Applying high-polygon geometry to 1000 instances | Use low polygon counts for distant objects (`args={[0.1, 8, 8]}`) |
