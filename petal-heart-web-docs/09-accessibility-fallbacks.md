# 09 — Accessibility & Fallbacks

## 1. Reduced motion

Khi hệ điều hành yêu cầu reduced motion:

- giảm heartbeat amplitude;
- giảm camera shake gần 0;
- explosion speed giảm;
- giảm foreground petals;
- tắt/giảm pointer parallax.

Không bắt buộc bỏ toàn bộ animation vì đây là bản chất sản phẩm, nhưng phải làm nhẹ đáng kể.

## 2. Keyboard

- Replay truy cập được bằng keyboard.
- Sound toggle có label rõ.
- Focus indicator không bị xóa.

## 3. Screen reader

Canvas cần accessible label mô tả ngắn trải nghiệm, ví dụ: “3D heart made of rose petals that beats and bursts into flying petals.”

Không spam live region theo từng frame.

## 4. WebGL fallback

Nếu không có WebGL/WebGL2:

- hiển thị ảnh fallback hoặc CSS background từ reference/art asset;
- vẫn có text/nút cơ bản;
- không để canvas đen trống.

## 5. Low power fallback

Nếu capability quá yếu hoặc renderer context lost nhiều lần, có thể chuyển về simplified static/2D mode.

## 6. Context loss

Lắng nghe `webglcontextlost` và `webglcontextrestored`. Ngăn default khi hợp lý, hiển thị trạng thái fallback nếu restore thất bại.

## 7. Contrast

Replay/sound UI phải đủ contrast trên nền tối nhưng không cạnh tranh với heart.
