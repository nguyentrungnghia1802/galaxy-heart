# 02 — Functional Requirements

## FR-01 — Scene bootstrap

Ứng dụng phải khởi tạo WebGL renderer, scene, camera, lights và post-processing sau khi DOM sẵn sàng.

## FR-02 — Asset preloading

Mọi texture/model cần thiết cho first run phải preload trước khi animation chính bắt đầu. Trong lúc tải hiển thị loader tối giản.

## FR-03 — 3D heart construction

Trái tim phải được tạo bởi petal instances phân bố trên một bề mặt heart 3D. Các instance phải có variation về:

- position;
- orientation;
- scale;
- màu trong palette đỏ/hồng;
- phase/noise nhỏ.

## FR-04 — Heartbeat

Hệ animation phải hỗ trợ heartbeat dạng hai xung “lub-dub” thay vì sine wave đều. Nhịp phải tăng tốc theo timeline.

## FR-05 — Visual build-up

Khi nhịp tăng:

- scale amplitude tăng nhẹ;
- emissive/glow tăng;
- petal micro-jitter tăng nhẹ;
- camera shake chỉ xuất hiện sát explosion.

## FR-06 — Explosion transition

Tại thời điểm explosion, mỗi petal instance phải chuyển từ trạng thái “bound to heart surface” sang trạng thái particle động có position/velocity/angular velocity riêng.

Không được tạo một hệ particle hoàn toàn mới khiến hình ảnh “teleport”.

## FR-07 — Petal flight

Sau explosion, petal phải:

- bay ra ngoài theo radial vector có noise;
- chịu drag;
- chịu gravity rất nhẹ;
- có wind/noise;
- quay độc lập;
- tiếp tục render khi đi gần camera;
- được cull/reset khi ra quá xa vùng scene.

## FR-08 — Camera behavior

Camera không cho phép orbit tự do trong V1. Pointer/touch chỉ tạo parallax tối đa vài độ hoặc vài phần trăm frame.

## FR-09 — Replay

Sau khi animation kết thúc, giao diện phải cho phép Replay mà không reload toàn page. Replay phải reset đầy đủ state, timers, particles và camera.

## FR-10 — Adaptive quality

Ứng dụng phải có ít nhất ba quality profiles:

- high;
- medium;
- low/mobile.

Profile điều chỉnh petal count, DPR cap, bloom quality và các effect phụ.

## FR-11 — Resize/orientation

Canvas phải resize đúng theo viewport và orientation changes, không méo trái tim và không stretch pixel.

## FR-12 — Pause/resume timing

Khi tab ẩn, timeline phải được pause hoặc đồng bộ an toàn để không nhảy thẳng qua explosion khi người dùng quay lại.

## FR-13 — Error fallback

Nếu WebGL khởi tạo thất bại, hiển thị fallback tĩnh đẹp thay vì màn hình đen.

## FR-14 — Reduced motion

Nếu `prefers-reduced-motion: reduce`, giảm mạnh camera shake, explosion speed và parallax; vẫn giữ bản chất visual.

## FR-15 — No backend

Không có API/backend bắt buộc. Toàn bộ trải nghiệm phải chạy từ static hosting.
