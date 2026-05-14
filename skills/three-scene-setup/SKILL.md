---
name: three-scene-setup
description: Use when setting up a React 3D scene from scratch — when adding a Canvas, camera, lights, or basic mesh objects using React Three Fiber and drei.
created: 2026-05-07
updated: 2026-05-07
---

# Three.js Scene Setup (R3F)

## Overview
A Three.js scene in React starts with `<Canvas>` (R3F). Do not create `new THREE.Scene()` directly. Without lights, `MeshStandardMaterial` renders black — always add a Light.

## Basic Scene Structure

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
      meshRef.current.rotation.x += delta       // Use delta — frame-rate independent
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" />    {/* Do not use MeshBasicMaterial */}
    </mesh>
  )
}

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
      {/* Black screen without lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <RotatingCube />

      <OrbitControls />    {/* drei — mouse drag camera */}
    </Canvas>
  )
}
```

## Canvas Sizing (Based on Parent Container)

```tsx
// App.tsx
function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Scene />   {/* Canvas fills 100% of parent size */}
    </div>
  )
}
```

## drei Helpers — Commonly Used

```tsx
import { OrbitControls, Box, Sphere, Plane, Environment, Grid } from '@react-three/drei'

// Primitive shorthand components
<Box args={[1, 1, 1]} position={[0, 0, 0]} />
<Sphere args={[0.5, 32, 32]} />
<Plane args={[10, 10]} rotation={[-Math.PI / 2, 0, 0]} />

// Ambient environment lighting (sets envMap automatically)
<Environment preset="sunset" />

// Grid floor
<Grid infiniteGrid />
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Creating `new THREE.Scene()` directly | Use `<Canvas>` from `@react-three/fiber` |
| Using `MeshStandardMaterial` without lights | Always add `<ambientLight>` + `<directionalLight>` |
| Using `MeshBasicMaterial` | No lighting response — use `MeshStandardMaterial` |
| Manual `requestAnimationFrame` loop | Use `useFrame((_, delta) => { ... })` |
| Fixed rotation increment without `delta` | Use `rotation.x += delta` — frame-rate independent |
| Canvas size is 0 | Specify `width`/`height` on the parent element |
