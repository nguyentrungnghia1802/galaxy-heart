# Petal Heart 3D — Documentation Pack

Bộ tài liệu đặc tả cho một static website có trái tim 3D được cấu thành từ vô số cánh hoa, nhịp tim tăng dần và cuối cùng nổ tung thành hàng nghìn cánh hoa bay trong không gian.

## Mục tiêu

- Tạo cảm giác cinematic giống ảnh tham chiếu trong `assets/reference/heart-reference.png`.
- Trái tim là cấu trúc 3D thật, không phải ảnh 2D phóng to/thu nhỏ.
- Hiệu ứng nhịp tim tăng dần phải có nhịp điệu tự nhiên kiểu “lub-dub”.
- Explosion phải có chiều sâu, cánh hoa bay xuyên gần camera, có xoay, drag, gravity, noise và motion blur cảm nhận bằng DOF/velocity.
- Chạy mượt trên desktop và có adaptive quality cho mobile.
- Website deploy được dưới dạng static site lên GitHub Pages, Netlify hoặc Vercel.

## Quyết định thiết kế mặc định cho V1

1. Camera cố định theo phong cách cinematic; có pointer parallax rất nhẹ, không có OrbitControls.
2. Animation chạy một lần sau khi asset preload hoàn tất.
3. Cuối animation có nút Replay; không auto-loop vô hạn.
4. Audio là tùy chọn, tắt mặc định để tránh vấn đề autoplay.
5. Three.js + WebGL2 + InstancedMesh là nền tảng chính.
6. Vite dùng cho development/build; sản phẩm cuối là static files trong `dist/`.
7. Heart surface được tạo bằng parametric/sampled point cloud, sau đó gắn petal instances lên bề mặt.
8. Mobile tự giảm số lượng petals, pixel ratio, bloom và post-processing.

## Thứ tự đọc khuyến nghị

1. `01-product-vision.md`
2. `02-functional-requirements.md`
3. `03-visual-art-direction.md`
4. `04-animation-state-machine.md`
5. `05-3d-heart-and-petal-system.md`
6. `06-technical-architecture.md`
7. `07-performance-mobile.md`
8. `08-interaction-audio.md`
9. `09-accessibility-fallbacks.md`
10. `10-testing-quality.md`
11. `11-deployment-static-hosting.md`
12. `12-acceptance-criteria.md`
13. `13-file-structure-contracts.md`
14. `14-agent-build-guide.md`
15. `docs/superpowers/specs/2026-09-09-petal-heart-3d-design.md`

## Ngoài phạm vi V1

- Backend, database, login, analytics server-side.
- Multiplayer hoặc nội dung theo người dùng.
- VR/AR.
- Full physically-based cloth simulation cho từng cánh hoa.
- Ray-traced renderer.
- Orbit/zoom tự do quanh trái tim.

## Tiêu chí “done” tổng quát

Website chỉ được coi là hoàn thành khi trái tim thật sự có chiều sâu 3D, nhịp tim tăng tốc rõ ràng, explosion chuyển mượt sang hệ particle, performance đạt mục tiêu trên desktop/mobile, không có layout flash, không có console error và replay cho kết quả ổn định.
