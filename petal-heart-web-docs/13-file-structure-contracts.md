# 13 — Proposed File Structure & Module Contracts

## 1. Project tree

```text
petal-heart/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── assets/
│       ├── textures/
│       │   └── petal.webp
│       └── fallback/
│           └── heart-fallback.webp
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── app/
│   │   ├── App.js
│   │   ├── StateMachine.js
│   │   └── QualityManager.js
│   ├── scene/
│   │   ├── createScene.js
│   │   ├── RendererSystem.js
│   │   ├── CameraSystem.js
│   │   └── LightingSystem.js
│   ├── heart/
│   │   ├── HeartSurface.js
│   │   ├── HeartSystem.js
│   │   └── heartbeatEnvelope.js
│   ├── petals/
│   │   ├── PetalSystem.js
│   │   ├── PetalGeometry.js
│   │   ├── PetalBuffers.js
│   │   └── explosionPhysics.js
│   ├── fx/
│   │   └── PostProcessing.js
│   ├── assets/
│   │   └── AssetLoader.js
│   └── utils/
│       ├── math.js
│       ├── random.js
│       └── visibility.js
├── tests/
│   ├── heartbeatEnvelope.test.js
│   ├── stateMachine.test.js
│   ├── explosionPhysics.test.js
│   └── qualityManager.test.js
└── docs/
```

## 2. Contract — StateMachine

Expected conceptual API:

```js
new StateMachine(config)
stateMachine.start()
stateMachine.update(dt)
stateMachine.reset()
stateMachine.state
stateMachine.progress
```

StateMachine không trực tiếp import Three.js.

## 3. Contract — HeartSurface

```js
createHeartAnchors({ count, seed })
```

Trả dữ liệu anchor deterministic gồm position, normal, base rotation/scale hoặc dữ liệu đủ để xây chúng.

## 4. Contract — HeartSystem

```js
heartSystem.update(dt, stateSnapshot)
heartSystem.reset()
heartSystem.getGlobalScale()
```

HeartSystem không xử lý flight physics.

## 5. Contract — PetalSystem

```js
petalSystem.attachToHeart(anchorData)
petalSystem.triggerExplosion(explosionParams)
petalSystem.update(dt, stateSnapshot)
petalSystem.reset()
petalSystem.dispose()
```

## 6. Contract — CameraSystem

```js
cameraSystem.onPointer(x, y)
cameraSystem.update(dt, stateSnapshot)
cameraSystem.resize(width, height)
cameraSystem.reset()
```

## 7. Contract — QualityManager

```js
qualityManager.detect(capabilities)
qualityManager.profile
```

Profile là object immutable sau INTRO để tránh visual pop giữa cinematic.

## 8. Contract — AssetLoader

```js
await assetLoader.loadAll(manifest, onProgress)
```

Không để scene system tự fetch texture tách rời.
