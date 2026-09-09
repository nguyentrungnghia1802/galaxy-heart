# 14 — Build Guide for Developer / Coding Agent

## 1. Đọc trước khi code

Bắt buộc đọc theo thứ tự:

1. `README.md`
2. `01-product-vision.md`
3. `02-functional-requirements.md`
4. `04-animation-state-machine.md`
5. `05-3d-heart-and-petal-system.md`
6. `06-technical-architecture.md`
7. `07-performance-mobile.md`
8. `12-acceptance-criteria.md`
9. `13-file-structure-contracts.md`

## 2. Nguyên tắc triển khai

- Không viết toàn bộ app vào một `main.js` khổng lồ.
- Không tạo hàng nghìn Three.js Mesh riêng.
- Không thêm framework UI chỉ để có một nút Replay.
- Không dùng physics engine nặng nếu custom integrator vài dòng đã đủ.
- Không dùng ảnh reference làm fake 3D heart.
- Không thêm feature ngoài spec trước khi V1 đạt acceptance criteria.

## 3. Thứ tự xây dựng kỹ thuật đề xuất

1. Scaffold Vite + Three.js.
2. Render scene/camera/light cơ bản.
3. Tạo một petal geometry/material đơn.
4. Chứng minh `InstancedMesh` render được số lượng mục tiêu.
5. Tạo heart anchor distribution.
6. Gắn instances lên heart và kiểm tra silhouette.
7. Tạo state machine.
8. Tạo heartbeat envelope.
9. Thêm glow/post-processing.
10. Chuyển attached state → explosion physics.
11. Thêm drag/gravity/wind/rotation.
12. Thêm foreground camera-biased petals.
13. Thêm camera tension/shake/parallax.
14. Thêm quality profiles.
15. Thêm preload/loading/replay.
16. Thêm reduced-motion + fallback.
17. Profiling và tuning.
18. Cross-browser QA.
19. Production build/deploy.

## 4. Test-first cho logic thuần

Các module pure logic như state machine, heartbeat envelope, random/physics generator và quality selection nên có test trước khi nối vào renderer.

Không cần unit test mọi lệnh Three.js, nhưng phải test behavior có thể tách khỏi GPU.

## 5. Performance budget phải được kiểm tra sớm

Không chờ đến cuối mới thử 5,000 petals. Ngay ở bước InstancedMesh cần benchmark số lượng mục tiêu trên desktop/mobile.

Nếu 5,000 alpha petals quá nặng, giảm geometry/material/post-processing trước khi nghĩ đến thay kiến trúc toàn bộ.

## 6. Art tuning

Tuning cuối cần chỉnh cùng nhau:

- heart shape;
- petal density;
- color palette;
- lights;
- bloom;
- heartbeat timing;
- explosion strength;
- foreground ratio;
- camera motion.

Đừng đánh giá từng thông số riêng lẻ.

## 7. Definition of Done

Chỉ coi V1 xong khi toàn bộ `12-acceptance-criteria.md` đạt và `10-testing-quality.md` không còn blocker.
