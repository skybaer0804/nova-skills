---
name: r3f-interaction
description: Use when adding user interaction to a React Three Fiber scene — when handling click, hover events on 3D objects, or adding camera controls with OrbitControls.
created: 2026-05-07
updated: 2026-05-07
---

# R3F Interaction

## Overview
In R3F, attach event handlers directly to mesh JSX elements for 3D object events. Do not use DOM `addEventListener`. Use drei `OrbitControls` for camera controls.

## Click + Hover Events

```tsx
import { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'

function InteractiveBox() {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const meshRef = useRef<Mesh>(null)

  return (
    <mesh
      ref={meshRef}
      onClick={(e) => {
        e.stopPropagation()           // Stop event bubbling
        setClicked(c => !c)
        console.log('position:', meshRef.current?.position)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={clicked ? 'blue' : hovered ? 'red' : 'white'}
      />
    </mesh>
  )
}

function Scene() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
      <InteractiveBox />
      <OrbitControls />    {/* drei — mouse drag camera */}
    </Canvas>
  )
}
```

## Accessing the Mesh Directly with useRef

```tsx
const meshRef = useRef<Mesh>(null)

// Read position on click
onClick={() => {
  if (meshRef.current) {
    console.log(meshRef.current.position)
    meshRef.current.scale.set(1.2, 1.2, 1.2)  // Change size on click
  }
}}
```

## OrbitControls Options

```tsx
<OrbitControls
  enableZoom={true}
  enablePan={false}           // Disable panning
  maxPolarAngle={Math.PI / 2} // Prevent camera from going below the floor
  minDistance={2}
  maxDistance={10}
/>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `canvas.addEventListener('click', ...)` | Attach `onClick` directly to mesh JSX |
| Selecting a mesh with `document.querySelector` | Use `useRef<Mesh>()` |
| Handling hover with `window.mousemove` | Use `onPointerOver` / `onPointerOut` |
| Implementing OrbitControls manually | Use drei `<OrbitControls />` |
| Missing `e.stopPropagation()` | Event propagates through to objects behind |
| Not changing cursor | Set `document.body.style.cursor = 'pointer'` inside `onPointerOver` |
