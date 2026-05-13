---
name: r3f-interaction
description: Use when adding user interaction to a React Three Fiber scene — when handling click, hover events on 3D objects, or adding camera controls with OrbitControls.
created: 2026-05-07
updated: 2026-05-07
---

# R3F Interaction

## Overview
R3F에서 3D 오브젝트 이벤트는 mesh JSX에 직접 핸들러를 붙인다. DOM `addEventListener`를 사용하지 않는다. 카메라 컨트롤은 drei `OrbitControls`를 사용한다.

## Click + Hover 이벤트

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
        e.stopPropagation()           // 이벤트 버블링 차단
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
      <OrbitControls />    {/* drei — 마우스 드래그 카메라 */}
    </Canvas>
  )
}
```

## useRef로 mesh 직접 접근

```tsx
const meshRef = useRef<Mesh>(null)

// 클릭 시 position 읽기
onClick={() => {
  if (meshRef.current) {
    console.log(meshRef.current.position)
    meshRef.current.scale.set(1.2, 1.2, 1.2)  // 클릭 시 크기 변경
  }
}}
```

## OrbitControls 옵션

```tsx
<OrbitControls
  enableZoom={true}
  enablePan={false}           // 패닝 비활성화
  maxPolarAngle={Math.PI / 2} // 카메라가 바닥 아래로 못 내려감
  minDistance={2}
  maxDistance={10}
/>
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `canvas.addEventListener('click', ...)` | mesh JSX에 `onClick` 직접 부착 |
| `document.querySelector`로 mesh 선택 | `useRef<Mesh>()` 사용 |
| hover를 `window.mousemove`로 처리 | `onPointerOver` / `onPointerOut` 사용 |
| OrbitControls 직접 구현 | drei `<OrbitControls />` 사용 |
| `e.stopPropagation()` 누락 | 이벤트가 뒤 오브젝트까지 전파됨 |
| cursor 변경 안 함 | `onPointerOver`에서 `document.body.style.cursor = 'pointer'` |
