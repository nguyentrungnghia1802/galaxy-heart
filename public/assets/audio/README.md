# Audio Assets & Sound Design Structure

Hệ thống âm thanh của dự án tập trung tối giản, thuần khiết và cinematic, với trọng tâm duy nhất là **nhịp đập trái tim tự nhiên (biological heartbeat)** và **khoảnh khắc nổ cánh hoa êm dịu**, loại bỏ hoàn toàn các tạp âm điện tử hoặc hiệu ứng thừa.

Mặc định sử dụng bộ tổng hợp âm thanh thủ tục (Procedural Sound Synthesizer) thông qua **Web Audio API** tích hợp sẵn trong [`SoundSystem.js`](file:///d:/_CODE_BANK/Project_/03_Funny/galaxy-heart/src/audio/SoundSystem.js).

---

## Danh sách Cues âm thanh (Minimalist Manifest)

Nếu bạn muốn sử dụng các file âm thanh thu âm thực tế (mp3/wav) thay cho bộ tổng hợp, bạn có thể đặt các file tương ứng vào thư mục này:

| File Name | Mô tả | Thời điểm phát | Gợi ý âm sắc |
| :--- | :--- | :--- | :--- |
| `heartbeat-lub.wav` | Tiếng nhịp tim chính ($S_1$) | Nhịp co bóp tâm thu của tim | Trầm ấm, tự nhiên (45Hz - 48Hz), mềm mại, không click/pop |
| `heartbeat-dub.wav` | Tiếng nhịp tim phụ ($S_2$) | Nhịp đóng van tâm trương | Ngắn hơn một chút, âm lượng ~60% của Lub |
| `heartbeat-final.wav` | Cú đập tim quyết định | Giai đoạn `TENSION` trước khi nổ | Dày, vang, cảm xúc, kết nối trực tiếp vào cú bung cánh hoa |
| `explosion-soft.wav` | Hơi thở nổ cánh hoa | Khi tim bung toả | Âm thanh thở nhẹ của cánh hoa (low breath / soft whoosh), tuyệt đối không dùng tiếng bom |

---

## Nguyên tắc thiết kế âm thanh
1. **Trọng tâm duy nhất là Heartbeat**:
   - Nhịp tim đập tự nhiên, trầm, mềm, biological.
   - Nhịp tăng dần theo đúng dòng thời gian animation: chậm $\rightarrow$ nhanh dần $\rightarrow$ dồn dập $\rightarrow$ nhịp đập cuối cùng $\rightarrow$ bung cánh hoa.
2. **Không tạp âm điện tử**:
   - Loại bỏ hoàn toàn tiếng bíp, chimes, tiếng rù rè, synth pads, tiếng click nút bấm và hiệu ứng giả.
   - Không chồng chéo nhiều lớp âm thanh gây ồn.
3. **Mute/Unmute**:
   - Nút loa nhỏ ở góc trên bên phải màn hình cho phép người dùng bật/tắt bất kỳ lúc nào và tự động nhớ lựa chọn vào `localStorage`.
