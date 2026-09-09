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

- [x] Agent đọc `agent.md` trước khi làm bất kỳ task nào.
- [x] Đọc các tài liệu nền tảng theo thứ tự: `README.md` → `02-functional-requirements.md` → `04-animation-state-machine.md` → `05-3d-heart-and-petal-system.md` → `06-technical-architecture.md` → `07-performance-mobile.md` → `12-acceptance-criteria.md` → `13-file-structure-contracts.md`.
- [x] Chỉ làm task mà prompt hiện tại yêu cầu; không tự ý nhảy qua hàng loạt task.
- [x] Mỗi task hoàn tất phải tick `[x]` trong file này, chạy kiểm tra tương ứng và commit riêng.
- [x] Cuối prompt hiện tại, sau khi tất cả task được yêu cầu đã commit, chạy `git push origin main`.
- [x] Không bắt đầu Phase B trước khi toàn bộ mục `CORE GATE` đạt.

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

- [x] Viết test trước cho cùng seed → cùng chuỗi random.
- [x] Test seed khác → chuỗi khác.
- [x] Test `clampDeltaTime()` không cho delta lớn hơn ngưỡng cấu hình.
- [x] Implement PRNG nhỏ, deterministic, không phụ thuộc library lớn.
- [x] Không tạo object/array mới trong hot loop nếu utility được gọi mỗi petal mỗi frame.
- [x] Chạy toàn bộ unit tests.

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

- [x] Viết test transition theo đúng thứ tự state.
- [x] Viết test `progress` luôn nằm trong `[0, 1]` với state hữu hạn.
- [x] Viết test `END` không tự thoát cho tới khi reset/replay.
- [x] Viết test reset quay về initial state và xóa elapsed time.
- [x] Hỗ trợ callback/event `onEnter` và `onExit` theo cách đơn giản, không dùng event framework.
- [x] Dùng durations từ `04-animation-state-machine.md` làm default config, nhưng cho phép override để test nhanh.
- [x] Không import renderer, scene hoặc Three.js vào StateMachine.
- [x] Không dùng `setTimeout`/`setInterval` để điều khiển timeline; chỉ tiến bằng `update(dt)`.
- [x] Chạy tests.

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

- [x] Test envelope tại các key phase chính: `0.00`, `0.10`, `0.18`, `0.28`, `0.38`, `1.00`.
- [x] Đảm bảo có 2 peak riêng biệt trong một chu kỳ, không phải sine/breathing.
- [x] Test interval giảm từ khoảng `0.90s` về khoảng `0.28s` theo easing tăng tốc.
- [x] Giới hạn scale peak tối đa khoảng `1.12` ở normal path.
- [x] Tách scale signal và intensity/glow signal để visual phase sau có thể glow mạnh hơn mà không phóng tim quá to.
- [x] `HeartSystem` chỉ quản lý heartbeat/attached global transform; không chứa explosion physics.
- [x] Reset phải đưa phase về đầu sạch sẽ.
- [x] Chạy tests.

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

- [x] Chọn một heart parametric/implicit representation có chiều sâu thật, không phải curve 2D extrude mỏng.
- [x] Viết test đúng số lượng anchor.
- [x] Viết test output finite: không `NaN`, không `Infinity`.
- [x] Viết test deterministic với cùng seed.
- [x] Viết test normal gần normalized.
- [x] Tránh random uniform thô gây cụm lớn/lỗ lớn; dùng stratified/rejection/density sampling đơn giản nhưng ổn định.
- [x] Density ưu tiên silhouette/outer shell đủ để heart nhìn đặc khi render.
- [x] Không phụ thuộc model `.glb` cho V1.
- [x] Có dev/debug hook hoặc helper để render anchors dạng points tạm thời và kiểm tra silhouette.
- [x] Benchmark thời gian tạo 1,500 / 3,000 / 6,000 anchors; chỉ chạy lúc init, không mỗi frame.

### Verification notes

- 2026-09-09, local Node.js init benchmark: 1,500 = 4.22 ms; 3,000 = 4.63 ms; 6,000 = 3.87 ms (single-run values, subject to JIT variance).
- `createHeartDebugPositions()` was rendered as rotating `THREE.Points` during A04 verification; front view confirmed the heart silhouette and the rotated view confirmed real depth/occlusion.

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

- [x] Dùng `THREE.InstancedMesh`; tuyệt đối không tạo 1 `Mesh` cho mỗi petal.
- [x] Dữ liệu động dùng typed arrays hoặc layout tương đương ít GC.
- [x] Tạo/reuse temp `Vector3`, `Quaternion`, `Matrix4` thay vì allocate trong loop.
- [x] `attachToHeart(anchorData)` map instances trực tiếp vào anchors.
- [x] Cùng instance indices được giữ nguyên khi chuyển state; không tạo particle system mới lúc explosion.
- [x] Chỉ set `instanceMatrix.needsUpdate = true` một lần sau batch update mỗi frame.
- [x] Có instance color hoặc color seed đủ để phase visual sau áp palette.
- [x] Render benchmark tối thiểu 1,500 / 3,000 / 6,000 petals bằng material đơn giản.
- [x] Ghi chú FPS/draw calls trong commit message hoặc task notes nếu có bất thường.
- [x] Chưa cần petal đẹp; geometry placeholder low-poly là chấp nhận ở task này.

### Verification notes

- Browser/WebGL smoke at 1,500 / 3,000 / 6,000 instances: one `InstancedMesh`, one draw call, no console warning/error.
- Local Node.js attach benchmark: 1,500 = 8.71 ms; 3,000 = 12.53 ms; 6,000 = 5.71 ms (single-run values, JIT variance expected).

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

- [x] Test radial component nói chung hướng ra khỏi heart center.
- [x] Test tangent component làm vector không đồng nhất như sphere explosion.
- [x] Test speed nằm trong min/max hợp lý.
- [x] Test foreground bias chỉ áp dụng cho một tỷ lệ instance cấu hình được, khoảng 5–12% mặc định.
- [x] Test gravity kéo nhẹ theo trục Y âm sau thời gian.
- [x] Test drag làm tốc độ giảm theo thời gian.
- [x] Thêm wind/noise drift có seed; không dùng noise library nặng nếu không cần.
- [x] Rotation/angular velocity độc lập giữa petals.
- [x] Clamp `dt` ở integration boundary hoặc đảm bảo caller đã clamp rõ ràng.
- [x] Tránh object allocations trong loop physics.
- [x] Explosion peak visual phải xảy ra dưới 1 giây theo params mặc định.

### Verification notes

- Default impact duration is 0.45 s. A local 6,000-instance / 600-frame pure-physics benchmark averaged 0.647 ms per integration frame.

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

- [x] INTRO/HEART_IDLE/HEARTBEAT/RAPID_HEARTBEAT/TENSION: petals vẫn bound vào anchors + heart global scale.
- [x] `EXPLOSION` chỉ trigger impulse đúng một lần khi enter state.
- [x] Không reinitialize geometry/material/InstancedMesh lúc explosion.
- [x] `PETAL_FLIGHT` tích hợp physics mỗi frame.
- [x] Culling/scene bound đơn giản: instance đi quá xa có thể giữ ngoài view hoặc mark inactive; không spawn object mới.
- [x] `reset()` copy lại initial transform/state mà không recreate GPU resources.
- [x] Replay 10 lần không tăng số instance và không duplicate scene object.
- [x] `dispose()` chỉ dùng khi app thực sự teardown, không dùng cho Replay.
- [x] Nếu phù hợp, thêm integration test thuần cho state-enter explosion one-shot.

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

- [x] Profile chứa ít nhất `petalCount`, `dprCap`, `bloomScale/intensity`, `foregroundRatio`, `flutterEnabled`.
- [x] High khoảng 4,500–7,000 target petals; Medium 2,500–4,000; Low 1,200–2,500.
- [x] Heuristic đọc viewport/DPR/hardwareConcurrency/deviceMemory nếu browser expose; luôn có fallback khi API không tồn tại.
- [x] Profile immutable sau INTRO; không đổi petal count giữa cinematic.
- [x] Test các capability fixture thấp/trung/cao.
- [x] Khi `document.hidden`, pause timeline/RAF hoặc reset clock origin khi resume.
- [x] Test/simulate không tích hợp delta nhiều giây sau tab resume.
- [x] DPR luôn cap theo profile; không dùng raw `window.devicePixelRatio` vô hạn.

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

- [x] App bootstrap và preload flow tối giản hoạt động.
- [x] Renderer resize đúng viewport và camera aspect không méo.
- [x] Render loop có pause/resume safe.
- [x] StateMachine là nguồn timeline duy nhất.
- [x] TENSION và EXPLOSION event được dispatch đúng một lần.
- [x] Core chạy từ INTRO → END không uncaught exception.
- [x] Replay không reload page.
- [x] Benchmark desktop với profile medium/high.
- [x] Chạy `npm test`.
- [x] Chạy `npm run build`.
- [x] Kiểm tra console không có WebGL warning nghiêm trọng.

### Verification notes

- Browser end-to-end: medium = 3,200 instances / 1 draw call / ~143.9 FPS; high = 6,000 instances / 1 draw call / ~143.7 FPS in the Codex in-app browser (not VSync-limited).
- Browser replay ran 10 consecutive times with one canvas, stable instance count, and exactly one explosion per run.
- Portrait 390×844 and landscape 844×390 canvas ratios matched viewport ratios with no overflow; the browser backend could not surface `document.hidden`, so visibility safety is covered by the real App/VisibilityClock integration test with a simulated event target.

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

- [x] `npm test` PASS toàn bộ.
- [x] `npm run build` PASS.
- [x] Heart có chiều sâu 3D thật, không phải sprite/ảnh fake.
- [x] State flow chạy đúng: `INTRO → HEART_IDLE → HEARTBEAT → RAPID_HEARTBEAT → TENSION → EXPLOSION → PETAL_FLIGHT → END`.
- [x] Double-pulse heartbeat đọc được bằng mắt.
- [x] Rapid heartbeat tăng tốc rõ.
- [x] Explosion chỉ trigger một lần.
- [x] Same petal instances tiếp tục từ heart sang flight.
- [x] Flight có radial + tangent + drag + gravity + drift + rotation.
- [x] Có foreground-biased subset.
- [x] Tab hide/resume không skip explosion.
- [x] Replay 10 lần không duplicate instance/object.
- [x] Quality profile chọn trước INTRO.
- [x] Không có hàng nghìn `THREE.Mesh` riêng lẻ.
- [x] Không có blocker kiến trúc còn phải đập đi làm lại ở Phase B.

## CORE GATE verification notes

- 61 automated tests cover deterministic random/math, state flow, heartbeat, heart sampling, typed buffers, impulse/flight physics, quality selection, visibility safety, lifecycle and App integration.
- Browser QA covered medium/high profiles, 10 Replay runs, the real-timing heartbeat and explosion windows, 390×844 plus 844×390 resize, and production preview without console errors.
- The in-app browser does not surface background tabs as `document.hidden`; hide/resume is therefore verified by the App + VisibilityClock integration test that cancels RAF, advances the clock by 30 seconds, resumes with `dt = 0`, and remains in INTRO/HEARTBEAT rather than skipping to EXPLOSION.

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

- [x] Tạo curved low-poly petal geometry; không dùng full rose model cho mỗi instance.
- [x] Kiểm soát alpha/overdraw; texture nếu có phải crop chặt.
- [x] Palette 4–8 biến thể đỏ/hồng, tránh random rainbow.
- [x] Variation scale/orientation vẫn lấy từ core anchor data.
- [x] Có mặt sáng/tối đủ để nhận ra orientation trong 3D.
- [x] Nếu thêm flutter shader, giữ đơn giản và sử dụng per-instance seed hiện có.
- [x] Không phá `InstancedMesh` architecture.
- [x] Kiểm tra silhouette heart vẫn đọc rõ.

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

- [x] Camera perspective FOV khoảng 40–55°, heart nằm giữa safe frame.
- [x] Không bật orbit controls trong V1.
- [x] Background gần đen, có radial red ambience rất nhẹ.
- [x] Ambient light yếu.
- [x] Inner/key red light tạo cảm giác phát sáng từ heart.
- [x] Rim/back light giúp tách silhouette khỏi nền.
- [x] Exposure không cháy texture petals.
- [x] Composition desktop 16:9 đẹp trước, sau đó kiểm tra portrait mobile.

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

- [x] Dùng `EffectComposer` + bloom phù hợp.
- [x] Bloom intensity nhận heartbeat intensity từ core; không tự tạo timer riêng.
- [x] Trong RAPID_HEARTBEAT glow tăng dần rõ hơn scale.
- [x] TENSION: dolly/glow/flash nhẹ 40–80 ms nếu phù hợp.
- [x] Explosion đạt peak dưới 1 giây.
- [x] Không flash trắng toàn màn hình quá mạnh.
- [x] Bloom render target có thể giảm resolution theo quality profile.
- [x] Low profile vẫn đẹp khi bloom simplified/giảm chất lượng.

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

- [x] Pointer/touch normalized input.
- [x] Parallax nhỏ, có smoothing/spring/easing.
- [x] Không follow cursor 1:1.
- [x] TENSION có dolly-in vài phần trăm.
- [x] Explosion có shake ngắn, amplitude thấp.
- [x] `prefers-reduced-motion` giảm mạnh parallax/shake/dolly.
- [x] Mobile touch không block scroll/event ngoài ý muốn; page bản thân không cần scroll.
- [x] Reset/replay trả camera về transform chuẩn.

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

- [x] Loader tối giản trong PRELOAD.
- [x] Khi assets load xong mới bắt đầu INTRO.
- [x] END hiện nút `Replay` tối giản.
- [x] Replay gọi core reset, không reload `window.location`.
- [x] Canvas `width/height` theo viewport và không có scrollbar ngoài ý muốn.
- [x] Xử lý `resize`/orientation và camera aspect đúng.
- [x] Nếu WebGL init fail, hiện fallback image/gradient đẹp + thông báo ngắn.
- [x] UI không che heart trên mobile.
- [x] Không thêm UI framework.

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

- [x] Test viewport desktop 1920×1080 / 1440×900 hoặc tương đương.
- [x] Test mobile portrait ~390×844.
- [x] Test mobile landscape.
- [x] Heart nằm trong safe visual area ở cả portrait/landscape.
- [x] Kiểm tra DPR cap hoạt động theo profile.
- [x] Nếu overdraw cao: tối ưu petal material/alpha/bloom trước, không thay kiến trúc.
- [x] Foreground petals đủ tạo depth nhưng không che frame lâu.
- [x] Low profile ưu tiên stable FPS hơn petal count.
- [x] Không auto-loop cinematic vô hạn sau END.
- [x] Kiểm tra heat/GPU usage bằng cách để END đứng yên một lúc.

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

- [x] Chạy `npm test` và đảm bảo PASS.
- [x] Chạy `npm run build` và đảm bảo PASS.
- [x] Chạy production preview và kiểm tra asset paths.
- [x] Không có uncaught console error.
- [x] Không có asset 404.
- [x] Không có WebGL warning nghiêm trọng trong normal path.
- [x] Replay 10 lần.
- [x] Tab hide/resume test.
- [x] Resize/orientation test.
- [x] Reduced-motion test.

### Checklist visual theo `12-acceptance-criteria.md`

- [x] AC-01 3D credibility.
- [x] AC-02 petal identity continuity.
- [x] AC-03 double-pulse readability.
- [x] AC-04 acceleration rõ.
- [x] AC-05 explosion impact < 1 giây.
- [x] AC-06 flight naturalness.
- [x] AC-07 foreground depth.
- [x] AC-08 adaptive performance.
- [x] AC-09 mobile safe layout.
- [x] AC-10 replay stability.
- [x] AC-11 visibility safety.
- [x] AC-12 error-free normal path.
- [x] AC-13 reduced motion.
- [x] AC-14 static build.

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

- [x] **PETAL HEART 3D V1 COMPLETE**

---

# PHASE B+ — VISUAL REFINEMENT (IMAGE B ALIGNMENT)

**Mục tiêu:** Cải tiến visual từ trạng thái ban đầu tiến gần ảnh reference mong muốn (Image B / `heart-reference.png`): tim cấu thành từ vô số cánh hoa hồng đỏ đẹp dày dặn, ánh sáng cinematic, có nhiều cánh bay bên ngoài, màu sắc phong phú và cảm giác sống động, bảo toàn 100% core logic và performance của Phase A.

### Checklist hoàn thành

- [x] **1. Màu sắc & Chất liệu:**
  - Bảng màu 12 biến thể tự nhiên từ Deep Velvet Wine (`#4c0312`), Rich Wine (`#6e051c`), Ruby (`#8c0826`, `#ad0a32`), Radiant Crimson Rose (`#cc0e3d`), Vivid Scarlet Rose (`#e41448`), Bright Rose (`#f42459`), Radiant Coral (`#ff3d75`), Vibrant Hot Pink Highlights (`#ff487e`, `#ff5285`), đến Soft Blush Pink (`#ff8da8`) và Luminous Petal Edge (`#ffc8d8`).
  - Phân bổ màu có chủ đích theo lớp: Lõi sâu mang sắc burgundy/wine sâu thẳm, vỏ bề mặt mang sắc scarlet rực rỡ và ~24% cánh hoa đón sáng mang sắc hồng phát sáng (luminous pink highlights) đúng như ảnh reference.
  - Cánh hoa cupped 3D hữu cơ 12-vertex với độ nghiêng pitch & roll tự nhiên (0.18–0.34 rad) tạo cấu trúc cánh xếp lớp, đón sáng chân thực thay vì dán phẳng.
  - Material nhung mượt mà (`roughness: 0.48`, `sheen: 0.92`, `sheenColor: 0xff7a9c`, `clearcoat: 0.08`, `emissive: 0x4a0414`).
- [x] **2. Trái tim dày, kín, không rỗng bên trong:**
  - Phân bố xoắn ốc tỷ lệ vàng (Golden-Ratio Spiral distribution) loại bỏ hoàn toàn hiện tượng phân tầng lưới (grid banding) và các khe hở rỗng.
  - Lấp đầy hoàn toàn khe thùy trên và thung lũng tâm tim (central valley fill) bằng các lớp cánh hoa thể tích, loại bỏ toàn bộ khoảng trống nhìn xuyên qua nền đen.
  - Mật độ cánh hoa phủ kín dày dặn với tỉ lệ diện tích bao phủ hoàn hảo (`PETAL_UNIT_SCALE = 0.235`).
- [x] **3. Hệ thống 3 tầng cánh hoa bay lơ lửng:**
  - Tầng A (Heart Halo ~50%): cánh hoa bay sát viền tim, tạo quầng hào quang tự nhiên.
  - Tầng B (Midground ~35%): cánh hoa phân tán trong không gian 3D với chuyển động nhào lộn hữu cơ.
  - Tầng C (Foreground Bokeh ~15%): cánh hoa lớn ở cự ly gần camera (`posZ: 2.0–3.6`, `scale: 1.65–2.9x`), được bố cục bám sát các góc và viền khung hình (corners & margins) để tạo chiều sâu ống kính điện ảnh mà không che khuất tâm tim.
  - Bảo toàn 100% tính liên tục vật lý khi kích hoạt `EXPLOSION`: toàn bộ cánh hoa bay hòa quyện cùng cánh hoa nổ tung từ tim.
- [x] **4. Chuyển động vi mô (living micro-motion):**
  - Cánh hoa bám tim có vi rung góc nghiêng (leaf flutter) đa tần số kết hợp nhịp thở theo envelope của heartbeat.
  - Tọa độ gốc anchor giữ nguyên tuyệt đối, không rung lắc làm méo hình tim.
- [x] **5. Ánh sáng cinematic & hậu kỳ:**
  - Đèn chiếu chính (Key light: 3.8, `0xff4068`) đặt góc chính diện tạo độ sáng rõ rệt cho cánh hoa mặt trước.
  - Cặp đèn ven hai thùy (Dual-lobe rim lights: 3.2 & 2.8) tách silhouette sắc nét trên nền đen.
  - Đèn đỉnh (Crown lobe light: 2.5, `0xff5580`) nhấn highlight rực rỡ lên đỉnh hai thùy tim.
  - Đèn lõi tim (Inner core light: 4.8, `0xff1240`) tỏa sáng nồng nàn từ bên trong các kẽ cánh hoa.
  - Đèn mũi tim (Ground point light: 3.2, `0xff1646`) rọi thẳng xuống vũng phản chiếu sàn.
  - Sàn phản chiếu hữu cơ (Seamless crimson glow pool): loại bỏ hoàn toàn mặt phẳng vuông cắt ngang, thay bằng đĩa hào quang đỏ thắm phát sáng tụ ngay dưới mũi tim và tan biến êm dịu vào nền đen tuyệt đối.
  - UnrealBloomPass cân chỉnh (`threshold: 0.25`, `radius: 0.52`, `baseStrength: 0.52`) tạo hào quang nhung đỏ mê hoặc mà không làm mờ chi tiết cánh hoa.



