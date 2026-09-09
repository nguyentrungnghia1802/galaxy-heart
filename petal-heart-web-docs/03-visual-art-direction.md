# 03 — Visual & Art Direction

## 1. Reference

Ảnh tham chiếu chính: `assets/reference/heart-reference.png`.

Không sao chép ảnh thành background để giả 3D. Ảnh chỉ quy định mood, composition, lighting và mật độ cánh hoa.

## 2. Composition

- Heart chiếm khoảng 40–55% chiều cao viewport trên desktop.
- Tâm heart đặt hơi cao hơn center frame một chút để chừa vùng glow/ground reflection.
- Sau explosion, cánh hoa được phép phủ toàn viewport.
- Foreground petals lớn và blur nhẹ tạo cảm giác lens depth.

## 3. Background

Nền gần đen với radial red haze rất nhẹ:

- center: đỏ rất tối;
- edges: gần đen;
- tránh pure black phẳng hoàn toàn.

Có thể dùng procedural gradient bằng CSS hoặc fullscreen plane shader.

## 4. Palette

Palette nên nằm trong các nhóm:

- deep crimson;
- bright red;
- rose red;
- magenta/pink accent rất ít;
- warm white highlight cực ít.

Không cho từng petal random toàn RGB.

## 5. Petal material

Mỗi petal nên có:

- roughness trung bình;
- translucency/alpha edge nhẹ;
- normal variation nếu asset cho phép;
- specular highlight vừa phải;
- backface xử lý hợp lý để nhìn hai mặt.

Nếu dùng texture alpha, phải tránh viền trắng do premultiplied alpha sai.

## 6. Heart density

Mật độ petal tại heart phải đủ dày để silhouette kín ở góc camera chính. Tuy nhiên vẫn cần đọc được từng cánh hoa ở vùng highlight.

Gợi ý:

- desktop high: 4,000–7,000 instances;
- desktop medium: 2,500–4,000;
- mobile: 1,200–2,500.

Con số cuối cùng quyết định bằng profiling, không cố định tuyệt đối.

## 7. Lighting

Tối thiểu:

- ambient/hemisphere rất yếu;
- key red-pink từ front-side;
- rim/back light giúp tách silhouette;
- inner point light/glow ở tâm heart.

Ánh sáng phải khiến upper lobes và cạnh heart nổi lên nhưng center vẫn có depth.

## 8. Bloom

Bloom chỉ áp dụng lên vùng sáng vượt threshold. Không bloom toàn scene.

Mục tiêu: glow mềm quanh edge và explosion flash, không biến petals thành đám đỏ cháy sáng.

## 9. Ground reflection

V1 có thể dùng một plane tối với phản xạ giả/soft glow thay vì mirror reflection thật. Mục đích chỉ để neo heart vào không gian.

## 10. Camera feel

- Perspective tự nhiên, FOV khoảng 42–50°.
- Không fisheye.
- Dolly rất nhẹ vào gần heart trước explosion.
- Camera shake ngắn, amplitude nhỏ, high-frequency nhưng có easing.

## 11. Typography/UI

UI phải tối giản. Nếu có text:

- loader;
- Replay;
- nút sound.

Không đặt tiêu đề lớn che heart trừ khi phiên bản sau yêu cầu nội dung cá nhân hóa.
