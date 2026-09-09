# Petal Heart 3D — Design Specification

**Date:** 2026-09-09

## 1. Goal

Xây dựng một static web cinematic trong đó một trái tim 3D được cấu thành từ hàng nghìn cánh hoa, đập nhanh dần và cuối cùng nổ tung thành các cánh hoa bay trong không gian. Trải nghiệm phải giữ được cảm giác chiều sâu, ánh sáng đỏ cinematic và foreground petals giống tinh thần ảnh reference.

## 2. Product decisions

- Static-only deployment; không backend.
- Three.js + WebGL/WebGL2.
- Vite cho development/build.
- Camera cinematic cố định; pointer/touch chỉ tạo parallax nhỏ.
- Animation chạy một lần rồi dừng ở END; Replay chạy lại không reload trang.
- Không auto-loop ở full GPU load.
- Audio optional, mute/off mặc định.
- Mobile dùng adaptive quality.

## 3. User experience

### Sequence

```text
PRELOAD
→ INTRO
→ HEART_IDLE
→ HEARTBEAT
→ RAPID_HEARTBEAT
→ TENSION
→ EXPLOSION
→ PETAL_FLIGHT
→ END
```

Tổng thời lượng animation mục tiêu 12–15 giây.

### Emotional arc

1. nhận diện heart;
2. cảm nhận nhịp sống;
3. tension tăng;
4. burst;
5. lingering petals.

## 4. Scene design

- Near-black background với radial red haze.
- Heart ở center hơi cao hơn midpoint.
- Inner red glow + rim light.
- Soft floor glow/reflection giả ở dưới.
- FOV khoảng 42–50°.
- Bloom thresholded; không bloom toàn scene.

## 5. Heart representation

Heart được tạo từ petal `InstancedMesh`. Anchor points được sampled từ parametric 3D heart surface với density đủ kín silhouette. Mỗi anchor có normal và variation để petal không đồng đều.

Cùng instance set được sử dụng trong attached và exploded states.

## 6. Petal representation

Petal geometry là curved low-poly plane/mesh có texture hoặc material đỏ/hồng. Mỗi instance có base transform, color variation và noise seed. Sau explosion, mỗi instance có independent velocity và angular velocity.

## 7. Heartbeat semantics

Heartbeat dùng double-pulse envelope. Cycle duration giảm từ khoảng 0.9 giây xuống khoảng 0.28 giây bằng easing tăng tốc. Scale chỉ tăng vừa phải; glow và tension cues chịu trách nhiệm chính cho cao trào.

## 8. Explosion semantics

Explosion velocity kết hợp:

- radial component;
- tangent randomness;
- upward bias nhẹ;
- noise;
- camera-biased component cho một tỷ lệ nhỏ foreground petals.

Sau impulse, mỗi petal chịu drag, gravity nhẹ, wind/noise và independent rotation.

## 9. Architecture

```text
App
├── StateMachine
├── QualityManager
├── AssetLoader
├── RendererSystem
├── CameraSystem
├── LightingSystem
├── HeartSystem
├── PetalSystem
└── PostProcessing
```

Business/timeline logic tách khỏi Three.js renderer khi có thể để test dễ.

## 10. Performance

Bắt buộc dùng instancing và tránh object allocation trong hot loops. Quality profile quyết định petal count, DPR cap và post-processing trước khi cinematic bắt đầu.

Target:

- desktop: 60 FPS lý tưởng;
- integrated desktop: >=45 FPS phần lớn sequence;
- mobile mid-range: ổn định 30–60 FPS.

## 11. Mobile

- portrait/landscape responsive;
- DPR capped;
- giảm petal count/bloom;
- reduced-motion supported;
- pause khi tab hidden;
- không auto-loop để tránh thermal load.

## 12. Error handling

Nếu preload lỗi asset quan trọng, hiển thị fallback/error visual thay vì crash. Nếu WebGL unavailable hoặc context restore thất bại, dùng static fallback.

## 13. Testing

Unit test state/timeline/physics generators/quality logic. Browser test loader, replay, resize, visibility. Visual QA kiểm tra silhouette, heartbeat, burst và depth. Performance profiling bắt buộc trên ít nhất desktop và Android mid-range.

## 14. Acceptance

Source of truth cho acceptance là `12-acceptance-criteria.md`. V1 chỉ hoàn thành khi mọi AC đạt.

## 15. Explicit non-goals

- backend;
- user accounts;
- editable CMS;
- free orbit camera;
- VR/AR;
- heavy rigid-body/cloth physics engine;
- fake 2D heart image animation.

## 16. Open implementation stage

Tài liệu này khóa thiết kế ở mức spec. Implementation plan task-by-task sẽ được viết sau khi spec được người dùng duyệt, để tránh chốt sai chi tiết kỹ thuật trước khi xác nhận yêu cầu cuối.
