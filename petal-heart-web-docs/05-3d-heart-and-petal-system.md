# 05 — 3D Heart & Petal System

## 1. Mục tiêu kỹ thuật

Cùng một tập petal instances phải phục vụ cả hai trạng thái:

1. attached to heart;
2. exploded particle.

Điều này giúp explosion có continuity thị giác.

## 2. Heart surface

Có hai cách hợp lệ:

### A. Parametric heart surface — khuyến nghị cho V1

Sinh các sample points từ một heart volume/surface có kiểm soát. Ưu điểm:

- không cần model heart ngoài;
- deterministic;
- dễ phân bố density;
- dễ tính approximate normal.

### B. Sample mesh surface

Dùng một heart mesh kín rồi sample triangle surface. Ưu điểm là hình dáng art-directable hơn, nhưng cần asset pipeline.

V1 chọn A để giảm asset dependency.

## 3. Point distribution

Không dùng random uniform đơn giản vì dễ tạo vùng trống/cụm. Nên dùng một trong:

- stratified sampling;
- blue-noise approximation;
- rejection sampling có density function.

Density có thể cao hơn tại silhouette/outer shell và thấp hơn một chút phía trong.

## 4. Orientation

Mỗi petal có local normal của surface. Orientation cơ sở phải hướng petal theo normal/tangent, sau đó thêm random rotation nhỏ.

Không để tất cả petals “đứng thẳng” cùng hướng.

## 5. Scale variation

Scale nên theo distribution hẹp:

```text
baseScale * random(0.75, 1.25)
```

Có thể thêm một tỷ lệ nhỏ petals lớn hơn để tạo texture tự nhiên.

## 6. InstancedMesh

Dùng `THREE.InstancedMesh` cho petal geometry + material.

Mỗi frame chỉ update instance matrix cần thiết. Tránh:

- tạo hàng nghìn `Mesh` riêng;
- allocation vector/quaternion mới trong loop;
- gọi `setMatrixAt` khi không cần.

## 7. Per-instance data

Mỗi petal cần ít nhất:

```text
anchorPosition
anchorNormal
baseRotation
baseScale
colorVariant
position
velocity
rotation
angularVelocity
noiseSeed
state
```

Nên lưu ở typed arrays hoặc struct-of-arrays khi petal count lớn.

## 8. Petal geometry

Geometry nên low-poly nhưng silhouette tốt. Một petal có thể là curved plane với 6–20 vertices, alpha texture hoặc vertex deformation nhẹ.

Không cần model hoa hồng đầy đủ cho mỗi instance.

## 9. Petal deformation

V1 có thể dùng vertex shader đơn giản để tạo flutter dựa trên:

- time;
- per-instance seed;
- velocity magnitude.

Flutter tăng sau explosion.

## 10. Color variation

Nếu Three.js/material path cho phép, dùng instance colors hoặc shader attribute. Palette giới hạn khoảng 4–8 biến thể thay vì random liên tục.

## 11. Explosion direction

Radial direction lấy từ heart center tới anchor position, sau đó normalize. Để tránh hình “quả cầu nổ”, thêm:

- tangent component;
- upward bias nhẹ;
- camera-facing bias cho một tỷ lệ nhỏ;
- random cone deviation.

## 12. Foreground petals

Khoảng 5–12% petals có thể nhận camera bias để đi gần camera hơn. Chúng tạo cảm giác như ảnh tham chiếu.

Không để quá nhiều vì sẽ che toàn bộ scene.

## 13. Bounds/culling

Khi petal vượt quá scene bounds hoặc quá xa camera:

- không cần spawn object mới;
- có thể giữ instance ngoài khung đến END;
- nếu cần long-running mode mới tái sử dụng pool.
