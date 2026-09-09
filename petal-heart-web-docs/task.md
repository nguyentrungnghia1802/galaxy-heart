# Petal Heart 3D — Implementation Task Board

> **Mục tiêu:** triển khai static website Three.js có trái tim 3D được tạo từ hàng nghìn cánh hoa, heartbeat tăng tốc, tension rồi nổ tung thành petal particles bay tự nhiên.
>
> **Repository root dự kiến:** `D:\_CODE_BANK\Project_\03_Funny\galaxy-heart`
>
> **Documentation root:** `D:\_CODE_BANK\Project_\03_Funny\galaxy-heart\petal-heart-web-docs`
>
> **Nguyên tắc phân công:** các task logic khó, math/physics/state/performance architecture làm trước bằng **GPT-5.6 Sol High**. Khi `CORE GATE` đạt mới chuyển sang các task art/visual/UI/polish đơn giản hơn bằng **Gemini 3.8**.

---

## 0. Cách dùng file này

- [ ] Agent đọc `agent.md` trước khi làm bất kỳ task nào.
- [ ] Đọc các tài liệu nền tảng theo thứ tự: `README.md` → `02-functional-requirements.md` → `04-animation-state-machine.md` → `05-3d-heart-and-petal-system.md` → `06-technical-architecture.md` → `07-performance-mobile.md` → `12-acceptance-criteria.md` → `13-file-structure-contracts.md`.
- [ ] Chỉ làm task mà prompt hiện tại yêu cầu; không tự ý nhảy qua hàng loạt task.
- [ ] Mỗi task hoàn tất phải tick `[x]` trong file này, chạy kiểm tra tương ứng và commit riêng.
- [ ] Cuối prompt hiện tại, sau khi tất cả task được yêu cầu đã commit, chạy `git push origin main`.
- [ ] Không bắt đầu Phase B trước khi toàn bộ mục `CORE GATE` đạt.

### Status convention

- `[ ]` chưa làm.
- `[~]` đang làm hoặc còn blocker nhỏ.
- `[x]` hoàn tất và đã commit.
- `[!]` có blocker cần người dùng quyết định.

---

# PHASE A — CORE / LOGIC / PHYSICS

**Model đề xuất cho toàn bộ Phase A: GPT-5.6 Sol High**

Mục tiêu Phase A là tạo một core deterministic, testable và đủ nhanh. Không dành thời gian tinh chỉnh đẹp/xấu ở phase này; dùng material/geometry tối giản để chứng minh logic.

---

## A00 — Project bootstrap và test baseline

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Trung bình  
**Dependencies:** Không  
**Mục đích:** tạo bộ khung Vite + Three.js + Vitest đủ sạch để các task logic sau có nơi triển khai.

### Files dự kiến

```text
package.json
vite.config.js
index.html
src/main.js
src/styles.css
src/app/App.js
src/utils/math.js
src/utils/random.js
tests/
```

### Checklist

- [x] Kiểm tra repository hiện tại bằng `git status` và cây thư mục trước khi tạo file.
- [x] Nếu chưa có project frontend, scaffold Vite vanilla JavaScript tại repository root; không scaffold bên trong `petal-heart-web-docs`.
- [x] Cài dependency runtime tối thiểu: `three`.
- [x] Cài dependency dev tối thiểu: `vite`, `vitest`.
- [x] Tạo scripts: `dev`, `build`, `preview`, `test`.
- [x] Tạo `src/main.js` chỉ làm bootstrap `App`; không nhồi toàn bộ scene vào file này.
- [x] Tạo một canvas/scene test tối giản để xác nhận Three.js render thành công.
- [x] Tạo ít nhất 1 unit test smoke cho utility thuần để xác nhận Vitest chạy được.
- [x] Chạy `npm test`.
- [x] Chạy `npm run build`.
- [x] Không thêm React/Vue/physics engine/UI framework.

### Done when

- `npm test` pass.
- `npm run build` pass.
- Dev server render được scene Three.js tối giản, không console error.
- Cấu trúc project bám theo `13-file-structure-contracts.md`.

### Commit

```bash
git add .
git commit -m "chore: bootstrap petal heart web app"
```

---

## A01 — Deterministic random, math và delta-time utilities

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Trung bình  
**Dependencies:** A00  
**Mục đích:** mọi sampling/physics có thể reproduce bằng seed và không bị nhảy khi frame time bất thường.

### Files dự kiến

```text
src/utils/random.js
src/utils/math.js
tests/random.test.js
tests/math.test.js
```

### Interfaces phải ổn định

```js
createSeededRandom(seed)
clamp(value, min, max)
lerp(a, b, t)
easeInCubic(t)
easeOutCubic(t)
clampDeltaTime(dt, maxDt)
```

### Checklist

- [ ] Viết test trước cho cùng seed → cùng chuỗi random.
- [ ] Test seed khác → chuỗi khác.
- [ ] Test `clampDeltaTime()` không cho delta lớn hơn ngưỡng cấu hình.
- [ ] Implement PRNG nhỏ, deterministic, không phụ thuộc library lớn.
- [ ] Không tạo object/array mới trong hot loop nếu utility được gọi mỗi petal mỗi frame.
- [ ] Chạy toàn bộ unit tests.

### Done when

- Seed `1234` luôn tạo cùng sequence trong mọi lần test.
- Delta lớn do tab resume có thể clamp an toàn.
- Module không import Three.js nếu không cần.

### Commit

```bash
git add src/utils tests
git commit -m "feat(core): add deterministic math and random utilities"
```

---

## A02 — Timeline StateMachine hoàn chỉnh

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Cao  
**Dependencies:** A01  
**Mục đích:** tạo nguồn sự thật duy nhất cho toàn bộ cinematic timeline.

### Files dự kiến

```text
src/app/StateMachine.js
tests/stateMachine.test.js
```

### State bắt buộc

```text
BOOT
PRELOAD
INTRO
HEART_IDLE
HEARTBEAT
RAPID_HEARTBEAT
TENSION
EXPLOSION
PETAL_FLIGHT
END
```

### API bắt buộc

```js
new StateMachine(config)
stateMachine.start()
stateMachine.update(dt)
stateMachine.reset()
stateMachine.state
stateMachine.progress
```

### Checklist

- [ ] Viết test transition theo đúng thứ tự state.
- [ ] Viết test `progress` luôn nằm trong `[0, 1]` với state hữu hạn.
- [ ] Viết test `END` không tự thoát cho tới khi reset/replay.
- [ ] Viết test reset quay về initial state và xóa elapsed time.
- [ ] Hỗ trợ callback/event `onEnter` và `onExit` theo cách đơn giản, không dùng event framework.
- [ ] Dùng durations từ `04-animation-state-machine.md` làm default config, nhưng cho phép override để test nhanh.
- [ ] Không import renderer, scene hoặc Three.js vào StateMachine.
- [ ] Không dùng `setTimeout`/`setInterval` để điều khiển timeline; chỉ tiến bằng `update(dt)`.
- [ ] Chạy tests.

### Done when

- Có thể simulate toàn bộ 12–15 giây bằng unit test mà không cần browser/WebGL.
- Transition deterministic.
- Replay/reset không giữ state cũ.

### Commit

```bash
git add src/app/StateMachine.js tests/stateMachine.test.js
git commit -m "feat(core): implement cinematic state machine"
```

---

## A03 — Heartbeat envelope + acceleration logic

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Cao  
**Dependencies:** A01, A02  
**Mục đích:** tạo heartbeat “lub-dub” thật sự, rồi rút ngắn interval rõ ràng khi RAPID_HEARTBEAT.

### Files dự kiến

```text
src/heart/heartbeatEnvelope.js
src/heart/HeartSystem.js
tests/heartbeatEnvelope.test.js
```

### Interfaces gợi ý

```js
sampleHeartbeatEnvelope(localPhase)
getHeartbeatInterval(normalizedRapidProgress)
getHeartbeatIntensity(stateSnapshot)
```

### Checklist

- [ ] Test envelope tại các key phase chính: `0.00`, `0.10`, `0.18`, `0.28`, `0.38`, `1.00`.
- [ ] Đảm bảo có 2 peak riêng biệt trong một chu kỳ, không phải sine/breathing.
- [ ] Test interval giảm từ khoảng `0.90s` về khoảng `0.28s` theo easing tăng tốc.
- [ ] Giới hạn scale peak tối đa khoảng `1.12` ở normal path.
- [ ] Tách scale signal và intensity/glow signal để visual phase sau có thể glow mạnh hơn mà không phóng tim quá to.
- [ ] `HeartSystem` chỉ quản lý heartbeat/attached global transform; không chứa explosion physics.
- [ ] Reset phải đưa phase về đầu sạch sẽ.
- [ ] Chạy tests.

### Done when

- Unit test chứng minh double pulse.
- Rapid phase có interval giảm phi tuyến.
- API đủ để LightingSystem/CameraSystem đọc intensity sau này.

### Commit

```bash
git add src/heart tests/heartbeatEnvelope.test.js
git commit -m "feat(core): add double-pulse heartbeat engine"
```

---

## A04 — Parametric 3D heart surface sampling

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Rất cao  
**Dependencies:** A01  
**Mục đích:** tạo hàng nghìn anchor 3D có phân bố đẹp, deterministic và normal hợp lý để petal bám thành silhouette trái tim thật.

### Files dự kiến

```text
src/heart/HeartSurface.js
tests/heartSurface.test.js
```

### API bắt buộc

```js
createHeartAnchors({ count, seed })
```

### Mỗi anchor tối thiểu cần

```text
position: x, y, z
normal: nx, ny, nz
baseRotation hoặc orientation seed
baseScale
colorVariant hoặc color seed
noiseSeed
```

### Checklist

- [ ] Chọn một heart parametric/implicit representation có chiều sâu thật, không phải curve 2D extrude mỏng.
- [ ] Viết test đúng số lượng anchor.
- [ ] Viết test output finite: không `NaN`, không `Infinity`.
- [ ] Viết test deterministic với cùng seed.
- [ ] Viết test normal gần normalized.
- [ ] Tránh random uniform thô gây cụm lớn/lỗ lớn; dùng stratified/rejection/density sampling đơn giản nhưng ổn định.
- [ ] Density ưu tiên silhouette/outer shell đủ để heart nhìn đặc khi render.
- [ ] Không phụ thuộc model `.glb` cho V1.
- [ ] Có dev/debug hook hoặc helper để render anchors dạng points tạm thời và kiểm tra silhouette.
- [ ] Benchmark thời gian tạo 1,500 / 3,000 / 6,000 anchors; chỉ chạy lúc init, không mỗi frame.

### Done when

- Ở camera perspective cơ bản nhìn ra heart 3D rõ ràng.
- Khi xoay camera debug nhẹ, có occlusion/depth thật.
- 6,000 anchors tạo được mà không freeze UI đáng kể.

### Commit

```bash
git add src/heart/HeartSurface.js tests/heartSurface.test.js
git commit -m "feat(core): generate deterministic 3d heart anchors"
```

---

## A05 — PetalBuffers + InstancedMesh lifecycle architecture

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Rất cao  
**Dependencies:** A00, A04  
**Mục đích:** chứng minh có thể quản lý hàng nghìn petals bằng một hệ instances liên tục từ attached → exploded, không tạo hàng nghìn Mesh.

### Files dự kiến

```text
src/petals/PetalBuffers.js
src/petals/PetalSystem.js
src/petals/PetalGeometry.js
```

### Data per instance tối thiểu

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
```

### Checklist

- [ ] Dùng `THREE.InstancedMesh`; tuyệt đối không tạo 1 `Mesh` cho mỗi petal.
- [ ] Dữ liệu động dùng typed arrays hoặc layout tương đương ít GC.
- [ ] Tạo/reuse temp `Vector3`, `Quaternion`, `Matrix4` thay vì allocate trong loop.
- [ ] `attachToHeart(anchorData)` map instances trực tiếp vào anchors.
- [ ] Cùng instance indices được giữ nguyên khi chuyển state; không tạo particle system mới lúc explosion.
- [ ] Chỉ set `instanceMatrix.needsUpdate = true` một lần sau batch update mỗi frame.
- [ ] Có instance color hoặc color seed đủ để phase visual sau áp palette.
- [ ] Render benchmark tối thiểu 1,500 / 3,000 / 6,000 petals bằng material đơn giản.
- [ ] Ghi chú FPS/draw calls trong commit message hoặc task notes nếu có bất thường.
- [ ] Chưa cần petal đẹp; geometry placeholder low-poly là chấp nhận ở task này.

### Done when

- 3,000–6,000 instances render bằng `InstancedMesh` và không có hàng nghìn draw calls.
- Attached heart dùng đúng anchor data từ A04.
- Không có allocation tăng mạnh liên tục trong render loop.

### Commit

```bash
git add src/petals
git commit -m "feat(core): add instanced petal data architecture"
```

---

## A06 — Explosion velocity generator + flight physics integrator

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Rất cao  
**Dependencies:** A01, A04, A05  
**Mục đích:** tạo explosion có radial + tangent + depth và flight có drag/gravity/wind/rotation, deterministic khi dùng seed.

### Files dự kiến

```text
src/petals/explosionPhysics.js
tests/explosionPhysics.test.js
```

### API gợi ý

```js
createExplosionVelocity(anchorPosition, anchorNormal, random, params)
integratePetalFlight(bufferView, dt, time, params)
```

### Checklist

- [ ] Test radial component nói chung hướng ra khỏi heart center.
- [ ] Test tangent component làm vector không đồng nhất như sphere explosion.
- [ ] Test speed nằm trong min/max hợp lý.
- [ ] Test foreground bias chỉ áp dụng cho một tỷ lệ instance cấu hình được, khoảng 5–12% mặc định.
- [ ] Test gravity kéo nhẹ theo trục Y âm sau thời gian.
- [ ] Test drag làm tốc độ giảm theo thời gian.
- [ ] Thêm wind/noise drift có seed; không dùng noise library nặng nếu không cần.
- [ ] Rotation/angular velocity độc lập giữa petals.
- [ ] Clamp `dt` ở integration boundary hoặc đảm bảo caller đã clamp rõ ràng.
- [ ] Tránh object allocations trong loop physics.
- [ ] Explosion peak visual phải xảy ra dưới 1 giây theo params mặc định.

### Done when

- Với fixed seed, cùng anchor sinh cùng initial velocity.
- Petals không bay theo các đường thẳng đồng đều.
- Một subset đi về camera nhưng không phải toàn bộ.

### Commit

```bash
git add src/petals/explosionPhysics.js tests/explosionPhysics.test.js
git commit -m "feat(core): implement petal explosion and flight physics"
```

---

## A07 — PetalSystem state integration + continuity + replay reset

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Rất cao  
**Dependencies:** A02, A03, A05, A06  
**Mục đích:** nối state machine với petal lifecycle mà vẫn bảo toàn identity continuity trước/sau explosion.

### PetalSystem contract bắt buộc

```js
petalSystem.attachToHeart(anchorData)
petalSystem.triggerExplosion(explosionParams)
petalSystem.update(dt, stateSnapshot)
petalSystem.reset()
petalSystem.dispose()
```

### Checklist

- [ ] INTRO/HEART_IDLE/HEARTBEAT/RAPID_HEARTBEAT/TENSION: petals vẫn bound vào anchors + heart global scale.
- [ ] `EXPLOSION` chỉ trigger impulse đúng một lần khi enter state.
- [ ] Không reinitialize geometry/material/InstancedMesh lúc explosion.
- [ ] `PETAL_FLIGHT` tích hợp physics mỗi frame.
- [ ] Culling/scene bound đơn giản: instance đi quá xa có thể giữ ngoài view hoặc mark inactive; không spawn object mới.
- [ ] `reset()` copy lại initial transform/state mà không recreate GPU resources.
- [ ] Replay 10 lần không tăng số instance và không duplicate scene object.
- [ ] `dispose()` chỉ dùng khi app thực sự teardown, không dùng cho Replay.
- [ ] Nếu phù hợp, thêm integration test thuần cho state-enter explosion one-shot.

### Done when

- Petal thấy trên heart chính là petal tiếp tục bay sau explosion.
- Replay 10 lần không duplicate petals.
- Explosion không trigger hai lần do frame/state update.

### Commit

```bash
git add src/petals tests
git commit -m "feat(core): integrate petal lifecycle and replay reset"
```

---

## A08 — QualityManager + visibility/pause/resume safety

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Cao  
**Dependencies:** A01, A02  
**Mục đích:** chọn cấu hình phù hợp thiết bị trước INTRO và đảm bảo tab hidden không làm timeline nhảy qua explosion.

### Files dự kiến

```text
src/app/QualityManager.js
src/utils/visibility.js
tests/qualityManager.test.js
tests/visibility.test.js
```

### Profiles tối thiểu

```text
high
medium
low
```

### Checklist

- [ ] Profile chứa ít nhất `petalCount`, `dprCap`, `bloomScale/intensity`, `foregroundRatio`, `flutterEnabled`.
- [ ] High khoảng 4,500–7,000 target petals; Medium 2,500–4,000; Low 1,200–2,500.
- [ ] Heuristic đọc viewport/DPR/hardwareConcurrency/deviceMemory nếu browser expose; luôn có fallback khi API không tồn tại.
- [ ] Profile immutable sau INTRO; không đổi petal count giữa cinematic.
- [ ] Test các capability fixture thấp/trung/cao.
- [ ] Khi `document.hidden`, pause timeline/RAF hoặc reset clock origin khi resume.
- [ ] Test/simulate không tích hợp delta nhiều giây sau tab resume.
- [ ] DPR luôn cap theo profile; không dùng raw `window.devicePixelRatio` vô hạn.

### Done when

- Low-end fixture chọn low profile.
- High-end fixture chọn high/medium theo rule rõ ràng.
- Chuyển tab trong HEARTBEAT rồi quay lại không nhảy thẳng tới EXPLOSION.

### Commit

```bash
git add src/app/QualityManager.js src/utils tests
git commit -m "feat(core): add adaptive quality and visibility safety"
```

---

## A09 — Core integration: App controller + stable render loop

**Owner:** GPT-5.6 Sol High  
**Độ khó:** Rất cao  
**Dependencies:** A00–A08  
**Mục đích:** ghép core thành một cinematic chạy end-to-end với visual placeholder, trước khi giao phần mỹ thuật cho Gemini.

### Files dự kiến

```text
src/app/App.js
src/scene/createScene.js
src/scene/RendererSystem.js
src/main.js
```

### Render loop bắt buộc

```text
clock tick
→ clamp dt
→ stateMachine.update(dt)
→ heartSystem.update(dt, state)
→ petalSystem.update(dt, state)
→ camera/lighting placeholder update
→ renderer render
```

### Checklist

- [ ] App bootstrap và preload flow tối giản hoạt động.
- [ ] Renderer resize đúng viewport và camera aspect không méo.
- [ ] Render loop có pause/resume safe.
- [ ] StateMachine là nguồn timeline duy nhất.
- [ ] TENSION và EXPLOSION event được dispatch đúng một lần.
- [ ] Core chạy từ INTRO → END không uncaught exception.
- [ ] Replay không reload page.
- [ ] Benchmark desktop với profile medium/high.
- [ ] Chạy `npm test`.
- [ ] Chạy `npm run build`.
- [ ] Kiểm tra console không có WebGL warning nghiêm trọng.

### Done when

- Toàn bộ cinematic chạy bằng geometry/material placeholder.
- Logic heartbeat tăng tốc → tension → explosion → flight → END hoạt động chính xác.
- Replay 10 lần hoạt động.
- Có thể bắt đầu art phase mà không cần thay kiến trúc core.

### Commit

```bash
git add src tests
git commit -m "feat(core): integrate end-to-end petal heart timeline"
```

---

# CORE GATE — BẮT BUỘC TRƯỚC KHI CHUYỂN GEMINI

**Owner kiểm tra:** GPT-5.6 Sol High

- [ ] `npm test` PASS toàn bộ.
- [ ] `npm run build` PASS.
- [ ] Heart có chiều sâu 3D thật, không phải sprite/ảnh fake.
- [ ] State flow chạy đúng: `INTRO → HEART_IDLE → HEARTBEAT → RAPID_HEARTBEAT → TENSION → EXPLOSION → PETAL_FLIGHT → END`.
- [ ] Double-pulse heartbeat đọc được bằng mắt.
- [ ] Rapid heartbeat tăng tốc rõ.
- [ ] Explosion chỉ trigger một lần.
- [ ] Same petal instances tiếp tục từ heart sang flight.
- [ ] Flight có radial + tangent + drag + gravity + drift + rotation.
- [ ] Có foreground-biased subset.
- [ ] Tab hide/resume không skip explosion.
- [ ] Replay 10 lần không duplicate instance/object.
- [ ] Quality profile chọn trước INTRO.
- [ ] Không có hàng nghìn `THREE.Mesh` riêng lẻ.
- [ ] Không có blocker kiến trúc còn phải đập đi làm lại ở Phase B.

**Chỉ khi tất cả mục trên `[x]` mới chuyển Phase B.**

---

# PHASE B — VISUAL / ART / UI / POLISH

**Model đề xuất: Gemini 3.8**

> Gemini phase được phép tinh chỉnh visual mạnh, nhưng **không tự refactor core logic** (`StateMachine`, heart sampling, physics, typed buffers, quality selection) nếu không có bug integration rõ ràng. Nếu phát hiện core bug, ghi blocker và chuyển lại GPT-5.6 Sol High xử lý.

---

## B01 — Petal geometry, material và color palette

**Owner:** Gemini 3.8  
**Độ khó:** Trung bình  
**Dependencies:** CORE GATE  
**Mục đích:** biến placeholder petals thành cánh hoa có silhouette mềm, màu đỏ/hồng và variation tự nhiên.

### Files dự kiến

```text
src/petals/PetalGeometry.js
src/petals/PetalSystem.js     # chỉ phần material/visual interface nếu cần
public/assets/textures/petal.webp  # nếu dùng texture
```

### Checklist

- [ ] Tạo curved low-poly petal geometry; không dùng full rose model cho mỗi instance.
- [ ] Kiểm soát alpha/overdraw; texture nếu có phải crop chặt.
- [ ] Palette 4–8 biến thể đỏ/hồng, tránh random rainbow.
- [ ] Variation scale/orientation vẫn lấy từ core anchor data.
- [ ] Có mặt sáng/tối đủ để nhận ra orientation trong 3D.
- [ ] Nếu thêm flutter shader, giữ đơn giản và sử dụng per-instance seed hiện có.
- [ ] Không phá `InstancedMesh` architecture.
- [ ] Kiểm tra silhouette heart vẫn đọc rõ.

### Done when

- Nhìn gần thấy petal chứ không giống hình tam giác/quad thô.
- Heart vẫn đặc, organic và có depth.
- FPS không tụt mạnh chỉ vì material mới.

### Commit

```bash
git add src/petals public/assets
git commit -m "feat(visual): polish petal geometry and materials"
```

---

## B02 — Scene composition, camera base và cinematic lighting

**Owner:** Gemini 3.8  
**Độ khó:** Trung bình  
**Dependencies:** B01  
**Mục đích:** đạt composition gần ảnh reference: nền tối, heart centered, inner red glow, rim/key light có chiều sâu.

### Files dự kiến

```text
src/scene/CameraSystem.js
src/scene/LightingSystem.js
src/scene/createScene.js
src/styles.css
```

### Checklist

- [ ] Camera perspective FOV khoảng 40–55°, heart nằm giữa safe frame.
- [ ] Không bật orbit controls trong V1.
- [ ] Background gần đen, có radial red ambience rất nhẹ.
- [ ] Ambient light yếu.
- [ ] Inner/key red light tạo cảm giác phát sáng từ heart.
- [ ] Rim/back light giúp tách silhouette khỏi nền.
- [ ] Exposure không cháy texture petals.
- [ ] Composition desktop 16:9 đẹp trước, sau đó kiểm tra portrait mobile.

### Done when

- Heart là focal point rõ ràng.
- Có cảm giác 3D/occlusion qua lighting.
- Không cần ảnh background fake để tạo chiều sâu.

### Commit

```bash
git add src/scene src/styles.css
git commit -m "feat(visual): add cinematic camera and lighting"
```

---

## B03 — Bloom, glow build-up, tension flash và explosion impact

**Owner:** Gemini 3.8  
**Độ khó:** Trung bình  
**Dependencies:** B02  
**Mục đích:** tạo cao trào thị giác đúng timeline mà không thay đổi state logic.

### Files dự kiến

```text
src/fx/PostProcessing.js
src/scene/LightingSystem.js
```

### Checklist

- [ ] Dùng `EffectComposer` + bloom phù hợp.
- [ ] Bloom intensity nhận heartbeat intensity từ core; không tự tạo timer riêng.
- [ ] Trong RAPID_HEARTBEAT glow tăng dần rõ hơn scale.
- [ ] TENSION: dolly/glow/flash nhẹ 40–80 ms nếu phù hợp.
- [ ] Explosion đạt peak dưới 1 giây.
- [ ] Không flash trắng toàn màn hình quá mạnh.
- [ ] Bloom render target có thể giảm resolution theo quality profile.
- [ ] Low profile vẫn đẹp khi bloom simplified/giảm chất lượng.

### Done when

- Build-up có cao trào rõ.
- Heart texture vẫn đọc được, không biến thành blob đỏ cháy sáng.
- Medium/mobile không bị post-FX làm lag kéo dài.

### Commit

```bash
git add src/fx src/scene/LightingSystem.js
git commit -m "feat(visual): add heartbeat glow and explosion post effects"
```

---

## B04 — Camera parallax, tension dolly và explosion shake

**Owner:** Gemini 3.8  
**Độ khó:** Trung bình  
**Dependencies:** B02, B03  
**Mục đích:** tăng cảm giác depth nhưng giữ cinematic, không biến thành free-camera demo.

### Files dự kiến

```text
src/scene/CameraSystem.js
```

### Checklist

- [ ] Pointer/touch normalized input.
- [ ] Parallax nhỏ, có smoothing/spring/easing.
- [ ] Không follow cursor 1:1.
- [ ] TENSION có dolly-in vài phần trăm.
- [ ] Explosion có shake ngắn, amplitude thấp.
- [ ] `prefers-reduced-motion` giảm mạnh parallax/shake/dolly.
- [ ] Mobile touch không block scroll/event ngoài ý muốn; page bản thân không cần scroll.
- [ ] Reset/replay trả camera về transform chuẩn.

### Done when

- Rê chuột nhẹ thấy occlusion/depth thay đổi.
- Không chóng mặt, không lệch heart khỏi composition.
- Reduced motion khác biệt rõ ràng.

### Commit

```bash
git add src/scene/CameraSystem.js
git commit -m "feat(visual): add subtle cinematic camera motion"
```

---

## B05 — Loading UI, Replay UI, resize và WebGL fallback

**Owner:** Gemini 3.8  
**Độ khó:** Dễ–Trung bình  
**Dependencies:** B01–B04  
**Mục đích:** hoàn thiện trải nghiệm static page ngoài canvas.

### Files dự kiến

```text
index.html
src/styles.css
src/assets/AssetLoader.js
src/app/App.js
public/assets/fallback/heart-fallback.webp
```

### Checklist

- [ ] Loader tối giản trong PRELOAD.
- [ ] Khi assets load xong mới bắt đầu INTRO.
- [ ] END hiện nút `Replay` tối giản.
- [ ] Replay gọi core reset, không reload `window.location`.
- [ ] Canvas `width/height` theo viewport và không có scrollbar ngoài ý muốn.
- [ ] Xử lý `resize`/orientation và camera aspect đúng.
- [ ] Nếu WebGL init fail, hiện fallback image/gradient đẹp + thông báo ngắn.
- [ ] UI không che heart trên mobile.
- [ ] Không thêm UI framework.

### Done when

- Reload trang có loader → cinematic → Replay.
- Resize desktop/mobile không stretch scene.
- Fallback không để màn hình đen.

### Commit

```bash
git add index.html src public/assets/fallback
git commit -m "feat(ui): add preload replay and webgl fallback"
```

---

## B06 — Responsive visual tuning + mobile performance polish

**Owner:** Gemini 3.8  
**Độ khó:** Trung bình  
**Dependencies:** B05  
**Mục đích:** đảm bảo heart đẹp và đủ mượt ở desktop/mobile mà không thay đổi core architecture.

### Checklist

- [ ] Test viewport desktop 1920×1080 / 1440×900 hoặc tương đương.
- [ ] Test mobile portrait ~390×844.
- [ ] Test mobile landscape.
- [ ] Heart nằm trong safe visual area ở cả portrait/landscape.
- [ ] Kiểm tra DPR cap hoạt động theo profile.
- [ ] Nếu overdraw cao: tối ưu petal material/alpha/bloom trước, không thay kiến trúc.
- [ ] Foreground petals đủ tạo depth nhưng không che frame lâu.
- [ ] Low profile ưu tiên stable FPS hơn petal count.
- [ ] Không auto-loop cinematic vô hạn sau END.
- [ ] Kiểm tra heat/GPU usage bằng cách để END đứng yên một lúc.

### Done when

- Không scrollbar.
- Không stretch aspect.
- Mobile tầm trung hướng tới 30–60 FPS ổn định; không freeze dài ở explosion.
- Visual vẫn nhận ra giống mục tiêu reference.

### Commit

```bash
git add src public
git commit -m "perf: tune responsive rendering and mobile quality"
```

---

## B07 — Final visual QA + acceptance criteria + production build

**Owner:** Gemini 3.8  
**Độ khó:** Dễ–Trung bình  
**Dependencies:** B01–B06  
**Mục đích:** đóng V1, không thêm feature mới.

### Checklist kỹ thuật

- [ ] Chạy `npm test` và đảm bảo PASS.
- [ ] Chạy `npm run build` và đảm bảo PASS.
- [ ] Chạy production preview và kiểm tra asset paths.
- [ ] Không có uncaught console error.
- [ ] Không có asset 404.
- [ ] Không có WebGL warning nghiêm trọng trong normal path.
- [ ] Replay 10 lần.
- [ ] Tab hide/resume test.
- [ ] Resize/orientation test.
- [ ] Reduced-motion test.

### Checklist visual theo `12-acceptance-criteria.md`

- [ ] AC-01 3D credibility.
- [ ] AC-02 petal identity continuity.
- [ ] AC-03 double-pulse readability.
- [ ] AC-04 acceleration rõ.
- [ ] AC-05 explosion impact < 1 giây.
- [ ] AC-06 flight naturalness.
- [ ] AC-07 foreground depth.
- [ ] AC-08 adaptive performance.
- [ ] AC-09 mobile safe layout.
- [ ] AC-10 replay stability.
- [ ] AC-11 visibility safety.
- [ ] AC-12 error-free normal path.
- [ ] AC-13 reduced motion.
- [ ] AC-14 static build.

### Done when

- Tất cả AC quan trọng `[x]`.
- Không còn blocker mức release.
- Build output có thể deploy static mà không backend.

### Commit

```bash
git add .
git commit -m "chore: finalize petal heart v1"
```

---

# OPTIONAL — Chỉ làm khi người dùng yêu cầu

## O01 — Audio heartbeat / whoosh

**Owner:** Gemini 3.8  
**Default:** SKIP  
**Lý do:** không cần cho V1 và browser autoplay gây thêm complexity.

- [ ] Chỉ phát sau user gesture hoặc theo browser policy.
- [ ] Visual/audio dùng cùng StateMachine timing.
- [ ] Có mute toggle.
- [ ] Không dùng music track mặc định.
- [ ] Không làm audio thành dependency bắt buộc của cinematic.

---

# Gợi ý prompt giao việc

## Prompt cho GPT-5.6 Sol High

```text
Đọc petal-heart-web-docs/agent.md và petal-heart-web-docs/task.md trước.
Thực hiện đúng task AXX trong task.md. Đây là core task: ưu tiên tính đúng,
deterministic, performance và testability hơn mỹ thuật. Không làm task tiếp theo.
Sau khi hoàn thành: chạy test/build tương ứng, tick task, commit riêng task đó.
Nếu đây là task cuối của prompt hiện tại, push origin main theo agent.md.
```

## Prompt cho Gemini 3.8

```text
Đọc petal-heart-web-docs/agent.md, task.md và 03-visual-art-direction.md trước.
CORE GATE đã hoàn tất. Thực hiện đúng task BXX. Giữ nguyên các contract/core logic
đã ổn định; tập trung visual/UI/performance polish theo task. Không tự refactor
StateMachine, heart sampling hoặc explosion physics nếu không có bug rõ ràng.
Sau khi hoàn thành: kiểm tra, tick task, commit riêng task đó. Nếu đây là task cuối
của prompt hiện tại, push origin main theo agent.md.
```

---

# V1 COMPLETE

Chỉ đánh dấu mục này khi B07 hoàn tất:

- [ ] **PETAL HEART 3D V1 COMPLETE**
