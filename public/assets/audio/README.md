# Audio Assets & Sound Design Structure

Hệ thống âm thanh của dự án mặc định sử dụng bộ tổng hợp âm thanh thủ tục (Procedural Sound Synthesizer) thông qua **Web Audio API** tích hợp sẵn trong [`SoundSystem.js`](file:///d:/_CODE_BANK/Project_/03_Funny/galaxy-heart/src/audio/SoundSystem.js).

Điều này giúp trải nghiệm tải tức thì 0ms, không phụ thuộc file mạng, không bị lỗi 404 và đồng bộ tuyệt đối từng frame với nhịp đập tim và vật lý nổ cánh hoa.

---

## Danh sách Cues âm thanh (Audio Cue Manifest)

Nếu bạn muốn thay thế các hiệu ứng âm thanh procedural bằng các file âm thanh thu sẵn (mp3/wav/ogg), bạn có thể đặt các file tương ứng vào thư mục này:

| File Name | Mô tả | Thời điểm phát | Gợi ý âm sắc |
| :--- | :--- | :--- | :--- |
| `intro-ambience.mp3` | Nhạc nền mộng mơ | Màn hình Intro | Celestial warm pad, âm lượng rất nhỏ (whisper) |
| `intro-chime.mp3` | Tiếng chuông bấm nút | Khi click "Mở cửa trái tim" | Celesta, music box tinh tế |
| `curtain-whoosh.mp3` | Tiếng lướt rèm kéo ngang | Lúc rèm tách đôi (2.0s) | Deep airy stereo whoosh, mượt mà |
| `heartbeat-lub.mp3` | Nhịp tim đầu (tâm thu) | Đồng bộ animation tim đập | Low bass thump (50Hz), mềm, ấm |
| `heartbeat-dub.mp3` | Nhịp tim thứ hai (tâm trương) | Tiếp nối nhịp đầu trong chu kỳ | Low-mid soft thump (60Hz) |
| `explosion-soft.mp3` | Bass hit mềm + petal burst | Khi tim nổ bung cánh | Sub drop ấm (75Hz -> 30Hz) + shimmer xào xạc hoa, không bom |
| `gem-sparkle.mp3` | Ánh sao lấp lánh quanh gem | Trong giai đoạn `GEM_IDLE` | Micro-bell, crystal glint rất nhỏ |
| `crystal-chime.mp3` | Tiếng chuông ngọc pha lê | Khi click vào viên ngọc | Clean quartz crystal resonance, trong trẻo |
| `love-reveal.mp3` | Hợp âm tình yêu | Khi hiện chữ "I love you!" | Lush romantic Major 9th chord swell |

---

## Lưu ý kỹ thuật
- Các trình duyệt hiện đại (Chrome, Safari, iOS, Android) chặn Autoplay audio nếu người dùng chưa tương tác với trang.
- Nút **“Mở cửa trái tim”** được dùng làm cử chỉ mở khoá AudioContext (`AudioContext.resume()`).
- Nút bật/tắt âm thanh (Mute/Unmute) trên góc màn hình cho phép người dùng kiểm soát âm lượng bất kỳ lúc nào và tự động ghi nhớ tùy chọn vào `localStorage`.
