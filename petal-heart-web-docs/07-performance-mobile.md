# 07 — Performance & Mobile Strategy

## 1. Mục tiêu FPS

- Desktop high: target 60 FPS.
- Desktop integrated GPU: >= 45 FPS trong phần lớn sequence.
- Mobile mid-range: target 30–60 FPS, ưu tiên ổn định hơn max quality.

Explosion có thể drop ngắn nhưng không được đóng băng/giật lớn.

## 2. Những nguồn cost chính

1. Instance transform update.
2. Fill rate do alpha petals.
3. Bloom/post-processing.
4. DPR cao trên mobile.
5. Overdraw khi explosion phủ toàn màn hình.

## 3. Quality profiles

### High

- 4,500–7,000 petals tùy benchmark.
- DPR cap ~1.75–2.0.
- Bloom full.
- Flutter shader đầy đủ.

### Medium

- 2,500–4,000 petals.
- DPR cap ~1.5.
- Bloom giảm resolution/intensity.
- Giảm foreground particles.

### Low/Mobile

- 1,200–2,500 petals.
- DPR cap ~1.0–1.25.
- Bloom low-res hoặc simplified glow.
- Flutter đơn giản.
- Camera shake thấp hơn.

Các giá trị này là starting targets, phải profiling trước khi khóa.

## 4. Instancing

Bắt buộc tránh hàng nghìn mesh riêng lẻ.

- reuse `Matrix4`, `Vector3`, `Quaternion` temp objects;
- hạn chế garbage allocation mỗi frame;
- dùng typed arrays;
- chỉ set `instanceMatrix.needsUpdate = true` một lần sau batch update.

## 5. Pixel ratio

Không dùng thẳng `window.devicePixelRatio` không giới hạn. DPR cao có thể tăng fill cost gấp nhiều lần trên điện thoại.

## 6. Resize

Debounce/throttle các recalculation nặng. Renderer resize ngay nhưng không rebuild geometry mỗi event.

## 7. Post FX

Bloom render target có thể thấp hơn full resolution. Nếu FPS dưới ngưỡng nhiều frame liên tiếp, dynamic degradation có thể giảm bloom resolution trước khi giảm petal count trong giữa sequence.

## 8. Alpha overdraw

Petal alpha texture gây overdraw. Giải pháp:

- crop texture chặt;
- geometry gần silhouette;
- alphaTest nếu art direction chấp nhận;
- không dùng giant quad chứa nhiều vùng transparent.

## 9. Benchmark strategy

Sau PRELOAD, có thể chạy benchmark rất ngắn hoặc dùng heuristic để chọn profile trước INTRO. Không thay petal count giữa explosion trừ khi bắt buộc.

## 10. Thermal

Không auto-loop vô hạn ở full quality. V1 chạy một cinematic rồi đứng END, giảm tải GPU và nhiệt trên mobile.

## 11. Visibility

Khi `document.hidden`:

- pause timeline;
- có thể ngừng RAF;
- resume bằng clock reset.
