# 10 — Testing & Quality Strategy

## 1. Test pyramid

### Unit tests

Ưu tiên test math/logic thuần:

- heartbeat envelope;
- easing/timeline;
- state transitions;
- seeded random distribution;
- explosion velocity generation;
- quality profile selection;
- delta-time clamp.

### Integration tests

- preload → intro;
- replay reset;
- visibility pause/resume;
- resize behavior;
- reduced-motion profile.

### Browser/E2E

- canvas xuất hiện;
- animation chuyển state;
- replay hoạt động;
- không console error;
- mobile viewport không overflow.

## 2. Visual QA

Phải kiểm tra bằng mắt vì unit test không xác nhận cinematic quality.

Checklist:

- silhouette heart rõ;
- không có lỗ lớn trên surface;
- heartbeat không giống breathing sine;
- explosion có petals hướng về camera;
- không flash trắng quá mức;
- cánh hoa không bay thành sphere đồng đều;
- background không banding rõ;
- replay không để lại particle cũ.

## 3. Performance profiling

Test ít nhất:

- Chrome desktop discrete GPU;
- Chrome desktop integrated GPU nếu có;
- Android Chrome tầm trung;
- Safari iPhone nếu có thiết bị.

Metrics:

- FPS/frametime;
- JS heap trend;
- draw calls;
- GPU render cost;
- load time/asset weight.

## 4. Deterministic testing

Random nên hỗ trợ seed trong test/dev mode để reproduce một explosion cụ thể.

Production có thể seed theo thời gian hoặc random crypto/simple seed.

## 5. Memory leaks

Replay lặp 10–20 lần không được làm memory tăng liên tục. Không tạo renderer/material/geometry mới mỗi replay.

## 6. Context cleanup

Nếu app dispose:

- dispose geometry;
- dispose materials/textures;
- dispose render targets/composer;
- remove event listeners.

## 7. Quality gate

Không release nếu:

- console có uncaught error;
- mobile thấp hơn target FPS kéo dài;
- replay sai state;
- tab resume nhảy qua explosion;
- resize méo aspect ratio;
- asset 404.
