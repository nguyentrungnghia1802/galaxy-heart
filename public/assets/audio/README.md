# Audio Assets & Sound Design Structure

Hệ thống âm thanh của dự án tập trung tối giản, thuần khiết và cinematic, với các âm thanh duy nhất được giữ lại:
1. **Biological Heartbeat** (nhịp đập sinh học Lub - Dub tự nhiên, trầm ấm).
2. **Final Heartbeat & Soft Explosion Transition** (cú đập quyết định và hơi thở bung cánh hoa êm ái).

Mặc định sử dụng bộ tổng hợp âm thanh thủ tục (Procedural Sound Synthesizer) thông qua **Web Audio API** tích hợp sẵn trong [`SoundSystem.js`](file:///d:/_CODE_BANK/Project_/03_Funny/galaxy-heart/src/audio/SoundSystem.js).

---

## Danh sách Cues âm thanh (Minimalist Manifest)

| Cue / File | Mô tả | Thời điểm phát | Đặc tả âm học |
| :--- | :--- | :--- | :--- |
| `heartbeat-lub` | Nhịp tim chính ($S_1$) | Nhịp co bóp tâm thu | Trầm ấm (58Hz $\rightarrow$ 44Hz), họa âm mô tim 2x/3x, ~5x perceived volume |
| `heartbeat-dub` | Nhịp tim phụ ($S_2$) | Nhịp van tâm trương | Gọn gàng (75Hz $\rightarrow$ 60Hz), âm sắc thanh hơn Lub |
| `heartbeat-final` | Nhịp tim quyết định | Giai đoạn `TENSION` | Dày, vang, kết nối trực tiếp vào cú bung cánh hoa |
| `explosion-soft` | Hơi thở bung cánh hoa | Khi tim bung toả | Âm thở sub rất nhẹ (low breath / air), phi bom đạn |

---

## Nguyên tắc thiết kế âm thanh bắt buộc
1. **Âm lượng tối ưu (~5x louder, không clipping)**:
   - Tối ưu gain staging và dải họa âm sinh học giúp người nghe cảm nhận rõ ràng gấp ~5 lần trên loa điện thoại, laptop lẫn tai nghe.
   - Master Peak Limiter (-2.5dB threshold, 12:1 ratio) chống méo tiếng, vỡ tiếng hoặc volume spike.
2. **Chỉ giữ lại các âm thanh quy định**:
   - Heartbeat (Lub, Dub).
   - Final beat & soft transition khi nổ.
   - Tuyệt đối không thêm âm thanh gem, không crystal/shimmer sound, không ambience khác, không sparkle, không UI click, không text reveal, không whoosh hay BGM.
3. **Tự động kích hoạt khi Mở cửa trái tim**:
   - Khi người dùng click/tap vào nút "Mở cửa trái tim", AudioContext được unlock và audio tự động bật, sync chính xác với animation.
   - Không có nút bật/tắt âm lượng trên UI.


