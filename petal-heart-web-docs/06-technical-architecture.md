# 06 — Technical Architecture

## 1. Stack

- HTML5
- CSS3
- JavaScript ES modules
- Three.js
- Vite
- WebGL2 khi khả dụng
- EffectComposer + UnrealBloomPass hoặc bloom tương đương

Không cần React/Vue cho V1 vì UI rất nhỏ và state chính nằm trong realtime scene.

## 2. Layer architecture

```text
DOM/UI Layer
    ↓
App Controller
    ↓
Timeline / State Machine
    ↓
Scene Systems
 ┌──────────┬──────────┬──────────┬──────────┐
 Heart      Petals     Camera     Lighting
 System     System     System     System
 └──────────┴──────────┴──────────┴──────────┘
    ↓
Renderer / Post FX
    ↓
WebGL
```

## 3. App Controller

Trách nhiệm:

- bootstrap;
- preload;
- chọn quality profile;
- tạo systems;
- requestAnimationFrame loop;
- pause/resume;
- replay;
- destroy nếu cần.

Không chứa math chi tiết của petals.

## 4. Timeline/State Machine

Trách nhiệm:

- state hiện tại;
- elapsed time;
- transition;
- normalized progress trong state;
- phát event `onEnter/onExit`.

Renderer không tự suy luận state từ thời gian tuyệt đối.

## 5. HeartSystem

Trách nhiệm:

- tạo anchor distribution;
- heartbeat scale envelope;
- attached-mode transform;
- truyền anchor data cho PetalSystem.

## 6. PetalSystem

Trách nhiệm:

- instance mesh;
- typed arrays;
- per-instance transform;
- explosion initialization;
- flight simulation;
- GPU update.

## 7. CameraSystem

Trách nhiệm:

- base transform;
- pointer parallax;
- tension dolly;
- explosion shake;
- resize projection.

## 8. LightingSystem

Trách nhiệm:

- ambient/key/rim/inner light;
- glow response theo heartbeat/tension;
- exposure/bloom hooks.

## 9. QualityManager

Đầu vào:

- device memory nếu browser expose;
- hardware concurrency;
- viewport;
- DPR;
- WebGL capabilities;
- optional short benchmark.

Đầu ra:

- petal count;
- DPR cap;
- post-FX settings;
- shader feature toggles.

## 10. AssetLoader

Tách preload khỏi scene logic. Loader trả Promise và báo progress cho UI.

## 11. Render loop

Pseudo-flow:

```text
frame(now):
  dt = clock.tick(now)
  stateMachine.update(dt)
  cameraSystem.update(dt, state)
  heartSystem.update(dt, state)
  petalSystem.update(dt, state)
  lightingSystem.update(dt, state)
  renderer.render(scene, camera)
```

## 12. Delta-time safety

Clamp `dt` tối đa khoảng 1/20–1/15 giây cho physics hoặc pause clock khi tab hidden. Không tích hợp một delta vài giây.
