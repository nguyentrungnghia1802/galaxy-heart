# 12 — Acceptance Criteria

## AC-01 — 3D credibility

Khi camera parallax nhẹ, silhouette/occlusion của petals phải thay đổi đúng theo chiều sâu. Không được giống flat sprite heart.

## AC-02 — Petal identity continuity

Petals nhìn thấy trên heart trước explosion phải là cùng hệ instances tiếp tục bay sau explosion.

## AC-03 — Heartbeat readability

Người xem phải nhận thấy ít nhất một nhịp “double pulse” trước khi acceleration mạnh.

## AC-04 — Acceleration

Khoảng thời gian giữa các heartbeat giảm rõ trong đoạn RAPID_HEARTBEAT.

## AC-05 — Explosion impact

Explosion phải đạt peak visual dưới 1 giây và có cả radial, tangent và camera-depth motion.

## AC-06 — Flight naturalness

Sau impulse, petals không di chuyển như các điểm trên đường thẳng cố định; phải có rotation, drag và drift/noise.

## AC-07 — Foreground depth

Có một số petals đi gần camera và tạo foreground scale/blur cảm nhận được, nhưng không che frame kéo dài.

## AC-08 — Performance

Ứng dụng chọn quality thích hợp để tránh giật kéo dài trên thiết bị tầm trung.

## AC-09 — Mobile layout

Heart vẫn nằm trong safe visual area ở portrait và landscape. Không có scrollbar ngoài ý muốn.

## AC-10 — Replay

Replay ít nhất 10 lần liên tục vẫn chạy đúng timeline, không duplicate petals, không tăng memory rõ rệt.

## AC-11 — Visibility safety

Chuyển tab trong HEARTBEAT rồi quay lại không làm animation nhảy qua EXPLOSION.

## AC-12 — Error-free

Không có uncaught exception, asset 404 hoặc WebGL warning nghiêm trọng trong normal path.

## AC-13 — Reduced motion

Bật reduced motion phải làm camera shake/parallax/explosion dịu hơn rõ rệt.

## AC-14 — Static deploy

Build output chạy được trên static host không cần backend.
