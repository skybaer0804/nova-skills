---
name: r3f-scene-design
description: Use when starting a React 3D scene with Three.js — when deciding which R3F and drei patterns are needed before writing any code.
created: 2026-05-07
updated: 2026-05-07
---

# R3F Scene Design (Entry Point)

## Overview
When using Three.js in React, use React Three Fiber (`<Canvas>`) instead of vanilla Three.js (`new THREE.Scene()`). Use this skill to decide which patterns are needed before writing any code.

## Decision Tree

Are you building a React 3D scene?

- **Need scene basics (Canvas/Camera/Light/Mesh)?** → `three-scene-setup`
- **Need Material/texture/PBR configuration?** → `three-materials`
- **Need click/hover/camera controls?** → `r3f-interaction`
- **Need animation (rotation/translation/spring)?** → `r3f-animation`
- **Need many objects (100+) or GLTF model loading?** → `r3f-performance`

## Skill Combinations by Scene Type

| Scene Type | Required Skill Combination |
|------------|---------------------------|
| Basic 3D viewer | three-scene-setup → r3f-interaction |
| Interactive product showcase | three-scene-setup → three-materials → r3f-interaction |
| Animated scene | three-scene-setup → r3f-animation |
| GLTF model viewer | three-scene-setup → r3f-performance → r3f-interaction |
| GLTF + animated scene | three-scene-setup → r3f-performance → r3f-animation → r3f-interaction |
| Full 3D app | three-scene-setup → three-materials → r3f-interaction → r3f-animation → r3f-performance |

## Package Installation

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Creating `new THREE.Scene()` + `WebGLRenderer` directly | Use `<Canvas>` from `@react-three/fiber` |
| Writing code without going through the decision tree | Use this skill to classify the required patterns, then move to the relevant skill |
| Implementing OrbitControls without drei | Use `@react-three/drei` helpers (`three-scene-setup`) |
| Using `useGLTF` without Suspense for GLTF loading | Refer to the `r3f-performance` skill |
| Fixed rotation increment in `useFrame` (`+= 0.01`) | Use `delta` — `+= delta` (frame-rate independent) |
