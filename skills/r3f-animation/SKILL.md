---
name: r3f-animation
description: Use when animating 3D objects in React Three Fiber — when using useFrame for per-frame updates, react-spring for physics-based animation, or GSAP for timeline animations.
created: 2026-05-07
updated: 2026-05-07
---

# R3F Animation

## Overview
Handle R3F animations with `useFrame`. Do not use `setInterval`, `setTimeout`, or `requestAnimationFrame` directly. Managing position with `useState` causes a re-render on every frame — mutate the mesh directly with `useRef` instead.

## useFrame — Basic Animation

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

function FloatingSphere() {
  const meshRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    // clock.elapsedTime — elapsed time since the scene started (seconds)
    meshRef.current.position.y = Math.sin(clock.elapsedTime) * 0.5
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="skyblue" />
    </mesh>
  )
}
```

## @react-spring/three — Spring / Bounce Animation

```tsx
import { useSpring, animated } from '@react-spring/three'
import { useState } from 'react'

function SpringSphere() {
  const [clicked, setClicked] = useState(false)

  const { position } = useSpring({
    position: (clicked ? [0, 0, 0] : [0, 1.5, 0]) as [number, number, number],
    config: { mass: 1, tension: 280, friction: 20 },  // bounce config
  })

  return (
    <animated.mesh
      position={position}
      onClick={() => setClicked(c => !c)}
    >
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="coral" />
    </animated.mesh>
  )
}
```

## GSAP Integration

```tsx
import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import type { Mesh } from 'three'

function GsapBox() {
  const meshRef = useRef<Mesh>(null)

  useEffect(() => {
    if (!meshRef.current) return
    const tween = gsap.to(meshRef.current.rotation, {
      y: Math.PI * 2,
      duration: 2,
      repeat: -1,
      ease: 'none',
    })
    return () => { tween.kill() }   // stop the infinite tween on unmount / StrictMode re-run
  }, [])

  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial color="gold" />
    </mesh>
  )
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Animating with `setInterval` / `setTimeout` | Use `useFrame` |
| Managing position with `useState` | Use `useRef<Mesh>` + direct mutation inside `useFrame` |
| Manually implementing `requestAnimationFrame` | Use `useFrame` — R3F manages it automatically |
| Updating React state inside a `useFrame` callback | Mutate via ref directly — `setState` triggers a re-render |
| Fixed increment `rotation.x += 0.01` | Use `delta` — `rotation.x += delta` (frame-rate independent) |
| Binding position to spring without `animated.mesh` | Use `animated.mesh` from `@react-spring/three` |
| GSAP tween in `useEffect` without cleanup | Capture the tween and `tween.kill()` in the cleanup — `repeat: -1` leaks and double-runs in StrictMode |
