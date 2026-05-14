---
name: three-materials
description: Use when configuring 3D materials in React Three Fiber — when setting up PBR metalness/roughness, loading textures with useTexture, or adding environment reflections with envMap.
created: 2026-05-07
updated: 2026-05-07
---

# Three.js Materials (R3F)

## Overview
Use `MeshStandardMaterial` for PBR materials in R3F. For metallic surfaces, all three of `metalness`, `roughness`, and `envMap` must be set together for reflections to appear. Use `useTexture` (drei) for texture loading.

## PBR Material — metalness + roughness + envMap

```tsx
import { Environment, useTexture } from '@react-three/drei'

// Metal sphere
function MetalSphere() {
  return (
    <>
      {/* Without envMap, metalness will not reflect */}
      <Environment preset="studio" />

      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#888888"
          metalness={0.9}       // 1 = fully metallic
          roughness={0.1}       // 0 = perfectly smooth (mirror)
          envMapIntensity={1.5} // Environment reflection strength
        />
      </mesh>
    </>
  )
}
```

## Texture Loading — useTexture (drei)

```tsx
import { useTexture } from '@react-three/drei'
import { Suspense } from 'react'

function WoodCube() {
  // useTexture — must be used inside Suspense
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

// Always wrap with Suspense
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

## Material Quick Reference

| Material | Lighting Response | Use Case |
|----------|------------------|----------|
| `MeshBasicMaterial` | None | Wireframes, UI overlays |
| `MeshStandardMaterial` | PBR | General objects (recommended) |
| `MeshPhysicalMaterial` | PBR+ | Glass, transparent materials, clearcoat |
| `MeshToonMaterial` | Toon | Cel shading |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `MeshBasicMaterial` for metallic appearance | Use `MeshStandardMaterial` + metalness/roughness |
| Setting `metalness` but no reflections appear | `<Environment>` or `envMap` is required |
| Using `new THREE.TextureLoader().load()` | Use `useTexture` (drei) |
| Using `useTexture` outside of Suspense | Must be inside `<Suspense>` |
| Leaving roughness/metalness at default values | Set them intentionally — defaults vary by material |
