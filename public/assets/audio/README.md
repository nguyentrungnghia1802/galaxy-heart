# Audio Assets & Sound Design Structure

Hệ thống âm thanh của dự án tập trung tối giản, thuần khiết và cinematic, với các âm thanh duy nhất được giữ lại:
1. **Biological Heartbeat** (nhịp đập sinh học Lub - Dub tự nhiên, trầm ấm, có lực và rõ ràng ngay từ source asset).
2. **Final Heartbeat & Soft Explosion Transition** (lub-dub thứ 7 mạnh hơn nhẹ, nối thẳng vào hơi thở bung cánh hoa êm ái).
3. **Music Reveal** (`heart.mp3`, bài hát lộ diện sau khi tương tác viên ngọc).

Hệ thống tải trực tiếp các sample WAV chất lượng cao đã master/normalize từ thư mục asset, kèm bộ tổng hợp âm thanh thủ tục (Procedural Sound Synthesizer) dự phòng trong [`SoundSystem.js`](file:///d:/_CODE_BANK/Project_/03_Funny/galaxy-heart/src/audio/SoundSystem.js).

---

## Danh sách Cues âm thanh (Minimalist Manifest)

| File / Asset | Mô tả | Thời điểm phát | Đặc tả âm học |
| :--- | :--- | :--- | :--- |
| `heartbeat-lub.wav` | Nhịp tim chính ($S_1$) | Nhịp co bóp tâm thu | Âm sắc lồng ngực tự nhiên (102Hz $\rightarrow$ 56Hz), họa âm mô tim 2x/3x, đỉnh -0.6 dBFS, RMS ~0.23 |
| `heartbeat-dub.wav` | Nhịp tim phụ ($S_2$) | Nhịp van tâm trương | Gọn gàng, đanh giòn tự nhiên (128Hz $\rightarrow$ 72Hz), đỉnh -0.6 dBFS, RMS ~0.24 |
| `heartbeat-final.wav` | Nhịp tim quyết định | Giai đoạn `TENSION` | Dày, vang, trầm ấm có lực (94Hz $\rightarrow$ 48Hz), tạo cao trào nối vào vụ nổ |
| `explosion-soft` | Hơi thở bung cánh hoa | Khi tim bung toả | Âm thở sub rất nhẹ (low breath / air), phi bom đạn |
| `heart.mp3` | Nhạc nền & Captions | Giai đoạn `MUSIC_REVEAL` | Phát từ 0.00s, tách biệt hoàn toàn trên bus `musicGain` |

---

## Nguyên tắc thiết kế âm thanh bắt buộc
1. **Loudness tự nhiên từ nguồn (Normal Loudness, không clipping)**:
   - Các asset WAV được normalize và master ở mức chuẩn công nghiệp (-0.6 dBFS peak, RMS ~0.23 - 0.24), bảo đảm nghe rõ ràng ở mức volume máy thông thường trên cả loa điện thoại lẫn máy tính mà không cần boost gain cực đoan.
   - Dedicated Limiter/Compressor (-8 dB threshold, 12:1 ratio) trên bus `heartbeatGain` bảo vệ transient, chống clipping và giữ headroom tối đa.
2. **Quản lý voice và chống overlap**:
   - Cả 7 nhịp dùng interval 0.9 giây; voice trước được fade out êm ái (35ms ramp) để ngăn chồng lấn tần số thấp gây ù đục hoặc giật volume.
3. **Không ảnh hưởng các bus âm thanh khác**:
   - Chỉ chỉnh gain riêng cho `heartbeatGain`. Bus nhạc nền (`musicGain`) và bus hiệu ứng (`effectsGain`) hoàn toàn độc lập.
4. **Tự động kích hoạt khi Mở cửa trái tim**:
   - Khi người dùng click vào nút "Mở cửa trái tim", AudioContext được unlock và audio tự động bật, sync chính xác theo animation:
     `6 slow lub-dub` $\rightarrow$ `final slow lub-dub` $\rightarrow$ `explosion`.
