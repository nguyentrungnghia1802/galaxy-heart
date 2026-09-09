# 08 — Interaction & Audio

## 1. Interaction philosophy

Trải nghiệm chủ yếu là cinematic. Interaction chỉ hỗ trợ immersion, không biến thành game.

## 2. Pointer parallax

Chuột/touch có thể làm camera/heart offset rất nhẹ theo normalized pointer coordinates.

Giới hạn thấp để không làm vỡ composition. Dùng easing/spring nhẹ, không follow tức thời.

## 3. Replay

Sau END:

- hiện nút `Replay` tối giản;
- click reset scene state;
- có thể fade UI trước khi INTRO chạy lại.

## 4. Sound toggle

Nếu có audio:

- mặc định mute hoặc yêu cầu gesture;
- icon nhỏ;
- lưu lựa chọn trong session/localStorage nếu muốn;
- không phát âm thanh bất ngờ trước tương tác đầu tiên nếu browser không cho phép.

## 5. Audio layers tùy chọn

- heartbeat low-frequency;
- subtle ambient rumble;
- explosion whoosh;
- petal/wind tail.

Không cần music track trong V1.

## 6. Sync

Heartbeat audio nếu có phải lấy timing từ cùng state machine với visual. Không chạy setInterval riêng.

## 7. Haptics

Không yêu cầu. Nếu phiên bản mobile sau muốn dùng vibration API thì phải opt-in và feature-detect.
