# 01 — Product Vision

## 1. Ý tưởng cốt lõi

Trải nghiệm là một “micro cinematic” tương tác nhẹ: giữa một không gian tối là một trái tim 3D được tạo bởi rất nhiều cánh hoa đỏ/hồng. Người xem có vài giây để cảm nhận trái tim như một vật thể sống. Nhịp đập tăng dần, ánh sáng bên trong mạnh dần, toàn bộ cấu trúc căng lên rồi vỡ tung thành một đám cánh hoa bay ra khắp không gian.

Điểm quan trọng: cảm xúc phải đến từ **chuyển động, chiều sâu, ánh sáng và nhịp điệu**, không phải từ quá nhiều chữ hoặc UI.

## 2. Trải nghiệm mong muốn

Người xem nên cảm nhận theo trình tự:

- “Đẹp và yên” khi vừa thấy trái tim.
- “Nó đang sống” khi tim bắt đầu đập.
- “Có điều gì đó sắp xảy ra” khi nhịp tăng nhanh.
- “Bùng nổ” khi tim vỡ thành cánh hoa.
- “Lắng lại” khi các cánh hoa tiếp tục bay và rơi khỏi khung hình.

## 3. Tính cách thị giác

- Romantic nhưng không sến.
- Cinematic, high-contrast, gần với quảng cáo perfume/jewelry hơn là game UI.
- Dark background, red/pink highlights.
- Không dùng neon cyberpunk.
- Không dùng cartoon shader.
- Không hiển thị nhiều chữ trên màn hình.

## 4. Thành công của V1

V1 thành công nếu người xem có thể nhận ra ngay ba điều:

1. Trái tim được ghép từ cánh hoa riêng lẻ.
2. Trái tim có thể tích và chiều sâu thật.
3. Explosion không phải fade/disappear mà là cùng các cánh hoa của trái tim tách ra và bay đi.

## 5. Đối tượng và thiết bị

- Desktop/laptop hiện đại: trải nghiệm đầy đủ.
- Android/iPhone đời trung bình trở lên: giảm quality tự động nhưng vẫn giữ hình dáng và explosion.
- Tablet: dùng profile gần desktop nếu GPU đủ mạnh.

## 6. Khoảnh khắc hero

Hero moment là 300–700 ms quanh explosion. Trong khoảng này:

- Heart scale đạt đỉnh.
- Inner glow tăng đột ngột.
- Camera shake nhẹ.
- Petals có radial velocity cao.
- Một số petals bay hướng về camera.
- Bloom/flash chỉ tăng ngắn, không làm trắng toàn màn hình.

## 7. Nguyên tắc không được phá vỡ

- Không biến animation thành “tim PNG + particle overlay”.
- Không để chuyển động cánh hoa quá đồng đều.
- Không dùng tốc độ quay giống nhau cho mọi petal.
- Không để post-processing che mất chi tiết texture.
- Không hy sinh mobile bằng cách render số lượng instance cố định cho mọi thiết bị.
