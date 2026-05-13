---
name: r3f-animation
description: Use when animating 3D objects in React Three Fiber — when using useFrame for per-frame updates, react-spring for physics-based animation, or GSAP for timeline animations.
created: 2026-05-07
updated: 2026-05-07
---

# R3F Animation

## Overview
R3F 애니메이션은 `useFrame`으로 처리한다. `setInterval`, `setTimeout`, `requestAnimationFrame`을 직접 사용하지 않는다. `useState`로 position을 관리하면 매 프레임 리렌더링이 발생한다 — `useRef`로 mesh를 직접 변경한다.

## useFrame — 기본 애니메이션

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

function FloatingSphere() {
  const meshRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    // clock.elapsedTime — 씬 시작 후 경과 시간 (초)
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

## @react-spring/three — 스프링/바운스 애니메이션

```tsx
import { useSpring, animated } from '@react-spring/three'
import { useState } from 'react'

function SpringSphere() {
  const [clicked, setClicked] = useState(false)

  const { position } = useSpring({
    position: clicked ? [0, 0, 0] : [0, 1.5, 0] as [number, number, number],
    config: { mass: 1, tension: 280, friction: 20 },  // 바운스 설정
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

## GSAP 연동

```tsx
import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import type { Mesh } from 'three'

function GsapBox() {
  const meshRef = useRef<Mesh>(null)

  useEffect(() => {
    if (!meshRef.current) return
    gsap.to(meshRef.current.rotation, {
      y: Math.PI * 2,
      duration: 2,
      repeat: -1,
      ease: 'none',
    })
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

| 실수 | 수정 |
|------|------|
| `setInterval`/`setTimeout`으로 애니메이션 | `useFrame` 사용 |
| `useState`로 position 관리 | `useRef<Mesh>` + useFrame에서 직접 mutation |
| `requestAnimationFrame` 수동 구현 | `useFrame` 사용 — R3F가 자동 관리 |
| `useFrame` 콜백 내에서 React state 업데이트 | ref로 직접 변경 — setState는 리렌더 유발 |
| 고정값 `rotation.x += 0.01` | `delta` 사용 — `rotation.x += delta` (프레임 독립적) |
| spring에 `animated.mesh` 없이 position 바인딩 | `@react-spring/three`의 `animated.mesh` 사용 |
