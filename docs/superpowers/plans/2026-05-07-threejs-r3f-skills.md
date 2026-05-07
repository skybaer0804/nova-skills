# Three.js / R3F Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nova-skills에 React Three.js/R3F 3D 스킬 6개를 추가하여 에이전트가 React 3D 씬에서 반복적으로 틀리는 패턴을 교정한다.

**Architecture:** CLAUDE.md 도메인 확장 → 진입점 스킬(`r3f-scene-design`) → 구현 스킬 5개를 B(순차)/C(병렬) 중 선택하여 작성. 각 스킬은 RED(베이스라인) → GREEN(스킬 작성) → REFACTOR(루프홀 제거) 사이클을 완전히 통과해야 한다.

**Tech Stack:** `@react-three/fiber`, `@react-three/drei`, `three`, React + Vite, nova-skills (Markdown SKILL.md)

---

## File Structure

**Create:**
- `skills/r3f-scene-design/SKILL.md` — 진입점 결정 트리
- `skills/three-scene-setup/SKILL.md` — Canvas + Camera + Light + Mesh
- `skills/three-materials/SKILL.md` — MeshStandardMaterial, PBR, envMap
- `skills/r3f-interaction/SKILL.md` — onClick, OrbitControls, raycasting
- `skills/r3f-animation/SKILL.md` — useFrame, react-spring, GSAP
- `skills/r3f-performance/SKILL.md` — instancing, useGLTF, Suspense

**Modify:**
- `CLAUDE.md` — 도메인 확장, r3f-*/three-* 컨벤션 추가
- `README.md` — Three.js/R3F 섹션, v1.8.0
- `package.json` — version 1.8.0, keywords 추가

---

## Task 0: CLAUDE.md 도메인 확장

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 도메인 정의 수정**

`CLAUDE.md`에서 아래를 찾아:

```
Next.js frontend skills, NestJS backend skills, AND AI agent protocol skills. Before adding a skill, ask:

> "Would this help someone building a Next.js frontend, a NestJS backend, OR implementing AI agent protocols (MCP, A2A, AG-UI, A2UI, UCP, AP2)?"
```

다음으로 교체:

```
Next.js frontend skills, NestJS backend skills, React Three.js/R3F 3D skills, AND AI agent protocol skills. Before adding a skill, ask:

> "Would this help someone building a Next.js frontend, a NestJS backend, a React 3D scene with Three.js/R3F, OR implementing AI agent protocols (MCP, A2A, AG-UI, A2UI, UCP, AP2)?"
```

Naming conventions에 추가:

```
- `r3f-*` — React Three Fiber 전용 패턴 (useFrame, interaction, performance)
- `three-*` — Three.js 개념 스킬 (scene setup, materials)
```

"What We Will Not Accept" 첫 항목도 업데이트:

```
- Skills outside the Next.js frontend, NestJS backend, React Three.js/R3F, or AI agent protocol domains
```

- [ ] **Step 2: 커밋**

```bash
git add CLAUDE.md
git commit -m "chore: expand nova-skills domain to include React Three.js/R3F skills"
```

---

## Task 1: r3f-scene-design (진입점)

**Files:**
- Create: `skills/r3f-scene-design/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 서브에이전트 실행** (스킬 없이)

```
You are a React developer.

"React + Vite로 3D 씬을 만들어야 해. 배경에 회전하는 구체가 있고,
클릭하면 색이 바뀌어. GLTF 모델도 불러와야 하고, 부드러운 카메라 컨트롤도 필요해.
어디서부터 시작해야 해?"

Answer directly. Tell them exactly what to do first.
```

Expected failures:
- 결정 트리 없이 바로 코드 작성
- `new THREE.Scene()` 같은 vanilla Three.js로 시작
- R3F `<Canvas>` 개념 미적용

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: `skills/r3f-scene-design/SKILL.md` 작성**

```markdown
---
name: r3f-scene-design
description: Use when starting a React 3D scene with Three.js — when deciding which R3F and drei patterns are needed before writing any code.
---

# R3F Scene Design (진입점)

## Overview
React에서 Three.js를 사용할 때는 vanilla Three.js(`new THREE.Scene()`) 대신 React Three Fiber(`<Canvas>`)를 사용한다. 코드 작성 전 이 스킬로 필요한 패턴을 결정한다.

## 결정 트리

React 3D 씬을 만드는가?

- **씬 기초(Canvas/Camera/Light/Mesh)가 필요한가?** → `three-scene-setup`
- **Material/텍스처/PBR 설정이 필요한가?** → `three-materials`
- **클릭/hover/카메라 컨트롤이 필요한가?** → `r3f-interaction`
- **애니메이션(회전/이동/스프링)이 필요한가?** → `r3f-animation`
- **많은 오브젝트(100+) 또는 GLTF 모델 로딩이 필요한가?** → `r3f-performance`

## 기능별 스킬 조합

| 씬 유형 | 필요한 스킬 조합 |
|---------|-----------------|
| 기본 3D 뷰어 | three-scene-setup → r3f-interaction |
| 인터랙티브 제품 쇼케이스 | three-scene-setup → three-materials → r3f-interaction |
| 애니메이션 씬 | three-scene-setup → r3f-animation |
| GLTF 모델 뷰어 | three-scene-setup → r3f-performance → r3f-interaction |
| 풀 3D 앱 | three-scene-setup → three-materials → r3f-interaction → r3f-animation → r3f-performance |

## 패키지 설치

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `new THREE.Scene()` + `WebGLRenderer` 직접 생성 | `<Canvas>` from `@react-three/fiber` 사용 |
| 결정 트리 없이 바로 코드 작성 | 이 스킬로 필요한 패턴 분류 후 해당 스킬로 이동 |
| drei 없이 OrbitControls 직접 구현 | `@react-three/drei` 헬퍼 활용 (`three-scene-setup`) |
| GLTF 로딩에 Suspense 없이 useGLTF 사용 | `r3f-performance` 스킬 참조 |
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행 — 결정 트리 적용 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/r3f-scene-design/SKILL.md
git commit -m "feat: add r3f-scene-design entry-point skill"
```

---

> **실행 방식 선택 (Task 1 완료 후)**
>
> - **B (순차):** Task 2 → 3 → 4 → 5 → 6 → 7 순서로 한 스킬씩 완전 완료
> - **C (병렬):** Task 2~6을 서브에이전트로 동시 실행 후 스타일 통일 검수

---

## Task 2: three-scene-setup

**Files:**
- Create: `skills/three-scene-setup/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 서브에이전트 실행** (스킬 없이)

```
You are a React developer using Vite.

Set up a basic 3D scene in React with:
- A rotating white cube
- Ambient + directional lighting
- Camera that can orbit with mouse drag

Show the complete component code.
```

Expected failures:
- `new THREE.Scene()` + `WebGLRenderer` 직접 생성 (R3F `<Canvas>` 미사용)
- 조명 없이 검은 화면 (`MeshBasicMaterial`만 추가)
- `requestAnimationFrame` 수동 루프 작성
- drei `OrbitControls` 미사용, 직접 마우스 이벤트 구현

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: `skills/three-scene-setup/SKILL.md` 작성**

```markdown
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
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행 — `<Canvas>` + Light 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/three-scene-setup/SKILL.md
git commit -m "feat: add three-scene-setup skill (Canvas, Light, OrbitControls)"
```

---

## Task 3: three-materials

**Files:**
- Create: `skills/three-materials/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 서브에이전트 실행** (스킬 없이)

```
You are a React Three Fiber developer.

Create a shiny metallic sphere that reacts to lighting — looks like brushed metal.
Also load a wood texture onto a cube.

Show the complete R3F component code.
```

Expected failures:
- `MeshBasicMaterial` 사용 (조명 반응 없음)
- `roughness`/`metalness` 미설정
- `useTexture` 대신 `new THREE.TextureLoader()` 직접 사용
- `envMap` 없이 metalness 만 설정 (반사 없음)

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: `skills/three-materials/SKILL.md` 작성**

```markdown
---
name: three-materials
description: Use when configuring 3D materials in React Three Fiber — when setting up PBR metalness/roughness, loading textures with useTexture, or adding environment reflections with envMap.
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
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행 — MeshStandardMaterial + envMap 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/three-materials/SKILL.md
git commit -m "feat: add three-materials skill (PBR, useTexture, envMap)"
```

---

## Task 4: r3f-interaction

**Files:**
- Create: `skills/r3f-interaction/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 서브에이전트 실행** (스킬 없이)

```
You are a React Three Fiber developer.

Make a 3D box that:
- Turns red when hovered
- Turns blue when clicked
- Logs its position when clicked

Also add mouse drag camera controls.
Show the complete R3F component code.
```

Expected failures:
- `canvas.addEventListener('click', ...)` DOM 이벤트 직접 등록
- `document.querySelector` 로 mesh 선택 시도
- OrbitControls를 직접 구현 (drei 미사용)
- hover 상태를 window.addEventListener('mousemove')로 처리

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: `skills/r3f-interaction/SKILL.md` 작성**

```markdown
---
name: r3f-interaction
description: Use when adding user interaction to a React Three Fiber scene — when handling click, hover events on 3D objects, or adding camera controls with OrbitControls.
---

# R3F Interaction

## Overview
R3F에서 3D 오브젝트 이벤트는 mesh JSX에 직접 핸들러를 붙인다. DOM `addEventListener`를 사용하지 않는다. 카메라 컨트롤은 drei `OrbitControls`를 사용한다.

## Click + Hover 이벤트

```tsx
import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행 — mesh 이벤트 + OrbitControls 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/r3f-interaction/SKILL.md
git commit -m "feat: add r3f-interaction skill (onClick, hover, OrbitControls)"
```

---

## Task 5: r3f-animation

**Files:**
- Create: `skills/r3f-animation/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 서브에이전트 실행** (스킬 없이)

```
You are a React Three Fiber developer.

Animate a sphere so that:
- It continuously floats up and down (sine wave motion)
- When clicked, it springs back to center with a bouncy ease

Show the complete R3F component code.
```

Expected failures:
- `setInterval` 또는 `setTimeout`으로 position 업데이트
- `useState`로 position 관리 → 매 프레임 리렌더링
- `requestAnimationFrame` 수동 루프 구현
- useFrame 밖에서 mesh mutation

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: `skills/r3f-animation/SKILL.md` 작성**

```markdown
---
name: r3f-animation
description: Use when animating 3D objects in React Three Fiber — when using useFrame for per-frame updates, react-spring for physics-based animation, or GSAP for timeline animations.
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
import { useFrame } from '@react-three/fiber'
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
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행 — useFrame + react-spring 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/r3f-animation/SKILL.md
git commit -m "feat: add r3f-animation skill (useFrame, react-spring, GSAP)"
```

---

## Task 6: r3f-performance

**Files:**
- Create: `skills/r3f-performance/SKILL.md`

### RED

- [ ] **Step 1: 베이스라인 서브에이전트 실행** (스킬 없이)

```
You are a React Three Fiber developer.

Render 1000 small spheres scattered randomly in the scene.
Also load a GLTF model from /models/robot.glb.

Show the complete R3F component code — make it performant.
```

Expected failures:
- 1000개 `<mesh>`를 map으로 렌더링 (InstancedMesh 미사용 → 1000 draw calls)
- `useGLTF` 없이 `THREE.GLTFLoader` 직접 사용
- `<Suspense>` 없이 useGLTF 사용
- 매 렌더에 `new THREE.SphereGeometry()` 생성

- [ ] **Step 2: 실패 패턴 기록**

### GREEN

- [ ] **Step 3: `skills/r3f-performance/SKILL.md` 작성**

```markdown
---
name: r3f-performance
description: Use when rendering many 3D objects or loading GLTF models in React Three Fiber — when draw calls are high, models cause loading flicker, or geometry is recreated on every render.
---

# R3F Performance

## Overview
R3F 성능 최적화의 핵심: 100개 이상 오브젝트는 `InstancedMesh`, GLTF 로딩은 `useGLTF` + `Suspense`, geometry/material은 `useMemo`로 한 번만 생성한다.

## InstancedMesh — 1000개 오브젝트 (1 draw call)

```tsx
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
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
    meshRef.current.instanceMatrix.needsUpdate = true
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
```

- [ ] **Step 4: 스킬 포함 후 동일 시나리오 재실행 — InstancedMesh + useGLTF + Suspense 확인**

- [ ] **Step 5: 루프홀 발견 시 수정 후 재실행**

- [ ] **Step 6: 커밋**

```bash
git add skills/r3f-performance/SKILL.md
git commit -m "feat: add r3f-performance skill (InstancedMesh, useGLTF, Suspense)"
```

---

## Task 7: README & package.json 업데이트

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: package.json 업데이트**

```json
{
  "version": "1.8.0",
  "description": "Next.js frontend + NestJS backend + React Three.js/R3F + AI agent protocol skills for Claude Code.",
  "keywords": [
    "skills", "nextjs", "react", "frontend",
    "nestjs", "typeorm", "passport", "rbac",
    "threejs", "r3f", "react-three-fiber", "3d",
    "tdd", "accessibility", "performance",
    "ai-agent", "mcp", "a2a", "ag-ui", "a2ui", "ucp", "ap2"
  ]
}
```

- [ ] **Step 2: README 목차에 Three.js/R3F 섹션 추가**

```markdown
- [Three.js / R3F](#threejs--r3f)
  - [r3f-scene-design](#r3f-scene-design)
  - [three-scene-setup](#three-scene-setup)
  - [three-materials](#three-materials)
  - [r3f-interaction](#r3f-interaction)
  - [r3f-animation](#r3f-animation)
  - [r3f-performance](#r3f-performance)
```

- [ ] **Step 3: README 본문에 Three.js/R3F 섹션 추가** (NestJS 섹션 앞)

```markdown
## Three.js / R3F

### r3f-scene-design

> **언제 사용하나요?** React에서 Three.js 씬을 만들기 전에 — Canvas, 인터랙션, 애니메이션, 성능 중 어떤 패턴이 필요한지 결정할 때

| 질문 | 스킬 |
|------|------|
| Canvas/Camera/Light/Mesh 기초 | `three-scene-setup` |
| Material/텍스처/PBR | `three-materials` |
| 클릭/hover/카메라 컨트롤 | `r3f-interaction` |
| 애니메이션(회전/스프링/GSAP) | `r3f-animation` |
| 100개+ 오브젝트 / GLTF 로딩 | `r3f-performance` |

---

### three-scene-setup

> **언제 사용하나요?** React Three Fiber 씬을 처음 설정할 때 — Canvas, Camera, Light, 기본 Mesh, OrbitControls가 필요할 때

| 항목 | 내용 |
|------|------|
| 진입점 | `<Canvas>` — `new THREE.Scene()` 사용 금지 |
| 조명 | `<ambientLight>` + `<directionalLight>` 필수 |
| 카메라 컨트롤 | drei `<OrbitControls />` |
| delta 사용 | `useFrame((_, delta) => ...)` — 프레임 독립적 |

---

### three-materials

> **언제 사용하나요?** 3D 오브젝트에 PBR 재질을 적용할 때 — 금속/거친 표면, 텍스처 로딩, 환경 반사가 필요할 때

| 항목 | 내용 |
|------|------|
| PBR 재질 | `MeshStandardMaterial` + `metalness` + `roughness` |
| 반사 | `<Environment preset="studio">` + `envMapIntensity` |
| 텍스처 | `useTexture` (drei) — `THREE.TextureLoader` 직접 사용 금지 |

---

### r3f-interaction

> **언제 사용하나요?** 3D 오브젝트에 클릭/hover 이벤트를 추가할 때 — raycasting, OrbitControls, cursor 변경이 필요할 때

| 항목 | 내용 |
|------|------|
| 이벤트 | mesh에 `onClick`, `onPointerOver`, `onPointerOut` 직접 부착 |
| mesh 접근 | `useRef<Mesh>()` — `document.querySelector` 사용 금지 |
| 카메라 | drei `<OrbitControls />` |

---

### r3f-animation

> **언제 사용하나요?** 3D 오브젝트를 애니메이션할 때 — 연속 회전, 사인파 이동, 스프링 바운스, GSAP 타임라인이 필요할 때

| 항목 | 내용 |
|------|------|
| 연속 애니메이션 | `useFrame` — `setInterval`/`requestAnimationFrame` 금지 |
| 스프링 | `@react-spring/three` + `animated.mesh` |
| 타임라인 | GSAP + `useEffect` + `meshRef` |

---

### r3f-performance

> **언제 사용하나요?** 많은 3D 오브젝트를 렌더링하거나 GLTF 모델을 로딩할 때 — draw call이 높거나 로딩 깜빡임이 발생할 때

| 항목 | 내용 |
|------|------|
| 대량 오브젝트 | `<instancedMesh>` — 100개 이상 map 렌더링 금지 |
| GLTF 로딩 | `useGLTF` (drei) + `<Suspense>` 필수 |
| geometry/material | `useMemo`로 한 번만 생성 |
```

- [ ] **Step 4: 스킬 적용 흐름에 3D 씬 개발 흐름 추가**

```markdown
0. Three.js/R3F 3D 씬 개발 시 (먼저 실행)
   └─ r3f-scene-design       (어떤 패턴 필요한지 결정 — 진입점)
       ├─ three-scene-setup   (Canvas + Light + Mesh 기초)
       ├─ three-materials     (PBR + 텍스처 + envMap)
       ├─ r3f-interaction     (클릭/hover + OrbitControls)
       ├─ r3f-animation       (useFrame + react-spring + GSAP)
       └─ r3f-performance     (InstancedMesh + useGLTF + Suspense)
```

- [ ] **Step 5: 버전 히스토리 추가**

```markdown
| v1.8.0 | Three.js/R3F 3D 스킬 6개 추가 (`r3f-scene-design`, `three-scene-setup`, `three-materials`, `r3f-interaction`, `r3f-animation`, `r3f-performance`). 도메인 확장 (React 3D) |
```

- [ ] **Step 6: 커밋**

```bash
git add README.md package.json
git commit -m "docs: README v1.8.0 — Three.js/R3F 3D 스킬 6개 섹션 추가"
```
