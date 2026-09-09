# 04 — Animation State Machine

## 1. State model

```text
BOOT
  ↓
PRELOAD
  ↓
INTRO
  ↓
HEART_IDLE
  ↓
HEARTBEAT
  ↓
RAPID_HEARTBEAT
  ↓
TENSION
  ↓
EXPLOSION
  ↓
PETAL_FLIGHT
  ↓
END
  └──────── Replay ────────→ INTRO
```

## 2. Timeline mặc định

Timeline khuyến nghị cho V1:

| State | Duration | Mục tiêu |
|---|---:|---|
| INTRO | 1.2 s | Fade/assemble scene vào trạng thái ổn định |
| HEART_IDLE | 0.8 s | Người xem nhận ra hình heart |
| HEARTBEAT | 2.4 s | 2–3 heartbeat rõ ràng |
| RAPID_HEARTBEAT | 2.2 s | Nhịp tăng dần, glow mạnh hơn |
| TENSION | 0.35 s | Co/phình giữ tension trước nổ |
| EXPLOSION | 0.45 s | Impulse chính |
| PETAL_FLIGHT | 5–7 s | Cánh hoa bay/rơi trong scene |
| END | vô hạn | Hiện Replay hoặc giữ scene tĩnh |

Tổng cinematic khoảng 12–15 giây.

## 3. Heartbeat envelope

Một chu kỳ heartbeat không dùng sine đều. Gợi ý normalized keyframes:

```text
0.00  scale 1.000
0.10  scale 1.075   ← lub
0.18  scale 1.015
0.28  scale 1.045   ← dub
0.38  scale 1.000
1.00  scale 1.000
```

Khi nhịp nhanh dần:

- cycle duration giảm;
- peak scale tăng nhẹ nhưng không quá ~1.12;
- glow response tăng mạnh hơn scale.

## 4. Acceleration curve

Không giảm interval tuyến tính quá máy móc. Dùng easing như cubic/quartic để cuối sequence tăng tốc rõ hơn.

Ví dụ conceptual:

```text
interval(t) = lerp(0.90 s, 0.28 s, easeInCubic(t))
```

## 5. Tension

Ngay trước explosion:

1. Heart scale tăng lên ~1.10–1.14.
2. Micro-jitter giảm 1 nhịp rất ngắn như “nín thở”.
3. Glow tăng.
4. Camera dolly-in vài phần trăm.
5. 40–80 ms trước impulse có thể dùng flash nhẹ.

## 6. Explosion impulse

Mỗi petal có velocity:

```text
v = radialDirection * radialStrength
  + randomTangent * tangentStrength
  + cameraBias * foregroundChance
  + noise
```

Không để mọi petal có cùng speed.

## 7. Flight integration

Mỗi frame:

```text
velocity += gravity * dt
velocity += windNoise(position, time) * dt
velocity *= exp(-drag * dt)
position += velocity * dt
rotation += angularVelocity * dt
```

Sử dụng delta time đã clamp để tránh tab-resume jump.

## 8. Replay reset

Replay phải reset:

- state machine;
- clock origin;
- petal positions;
- velocities;
- rotations;
- heart scale;
- lights/glow;
- post-processing intensity;
- camera transform;
- UI state.
