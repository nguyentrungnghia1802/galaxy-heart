# agent.md — Petal Heart 3D Agent Rules

## 1. Mục đích

File này là bộ quy tắc làm việc cho coding agent trong project cá nhân **Petal Heart 3D**.

Đây là project một người, vì vậy **không cần quy trình enterprise, PR phức tạp, nhiều branch, ticket system hay ceremony nặng**. Mục tiêu là code rõ ràng, chạy được, dễ tiếp tục ở prompt sau và có lịch sử Git sạch đủ để rollback khi cần.

---

## 2. Project locations

Repository root dự kiến:

```text
D:\_CODE_BANK\Project_\03_Funny\galaxy-heart
```

Documentation:

```text
D:\_CODE_BANK\Project_\03_Funny\galaxy-heart\petal-heart-web-docs
```

Source code phải nằm ở repository root theo cấu trúc trong `13-file-structure-contracts.md`. Không đặt application source vào thư mục tài liệu.

---

## 3. Thứ tự tài liệu cần đọc

Trước task đầu tiên của một phiên làm việc, đọc tối thiểu:

1. `petal-heart-web-docs/agent.md`
2. `petal-heart-web-docs/task.md`
3. `petal-heart-web-docs/02-functional-requirements.md`
4. Tài liệu chuyên môn liên quan trực tiếp task hiện tại.

Với core task Axx, ưu tiên đọc thêm:

```text
04-animation-state-machine.md
05-3d-heart-and-petal-system.md
06-technical-architecture.md
07-performance-mobile.md
10-testing-quality.md
12-acceptance-criteria.md
13-file-structure-contracts.md
```

Với visual task Bxx, ưu tiên đọc thêm:

```text
03-visual-art-direction.md
07-performance-mobile.md
09-accessibility-fallbacks.md
12-acceptance-criteria.md
```

Không cần đọc lại toàn bộ mọi file ở mọi prompt nếu context đã rõ.

---

## 4. Phân công model

### GPT-5.6 Sol High

Dùng cho Phase A / task Axx:

- state machine;
- math;
- deterministic random;
- heartbeat envelope;
- 3D heart sampling;
- typed buffers;
- InstancedMesh architecture;
- explosion physics;
- replay/reset lifecycle;
- visibility timing;
- adaptive quality;
- core integration;
- bug logic phức tạp liên quan các phần trên.

Ưu tiên correctness, architecture, tests và performance hơn việc "trông đẹp".

### Gemini 3.8

Dùng cho Phase B / task Bxx:

- petal visual;
- material/texture;
- màu sắc;
- lighting;
- bloom/post effects;
- camera visual motion;
- loading/replay UI;
- responsive polish;
- fallback;
- visual QA;
- static deployment polish.

Gemini **không được tự ý redesign/refactor core logic** nếu core đã qua `CORE GATE`. Nếu phát hiện lỗi core thật sự, ghi lại hiện tượng + reproduction và để GPT-5.6 Sol High sửa.

---

## 5. Nguyên tắc scope

1. **Làm đúng task được giao.** Không tự ý làm 3–4 task tiếp theo chỉ vì đang tiện.
2. Không thêm feature ngoài V1 nếu không được yêu cầu.
3. Không thêm React/Vue/Svelte chỉ để làm UI nhỏ.
4. Không thêm physics engine nếu custom integrator hiện tại đủ.
5. Không thay Three.js bằng framework 3D khác giữa dự án.
6. Không fake trái tim bằng một PNG 2D.
7. Không tạo hàng nghìn `THREE.Mesh`; dùng instancing theo spec.
8. Không đại refactor file không liên quan task hiện tại.
9. Nếu cần thay interface đã được task trước dùng, phải cập nhật toàn bộ caller + tests trong cùng task và giải thích trong commit.
10. Ưu tiên giải pháp đơn giản nhất đạt acceptance criteria.

---

## 6. Cách bắt đầu một task

Trước khi sửa code:

```bash
git status
```

Sau đó:

- xác định task ID trong `task.md`;
- đọc dependencies và `Done when`;
- xem file liên quan đang tồn tại;
- không overwrite thay đổi chưa commit của người dùng;
- nếu có unrelated local changes, giữ nguyên và tránh đưa chúng vào commit của task.

Không cần tạo branch mới. Làm trực tiếp trên `main` vì đây là project cá nhân, trừ khi người dùng yêu cầu khác.

---

## 7. Quy tắc implementation

### Code organization

- Mỗi module có một trách nhiệm rõ.
- `main.js` chỉ bootstrap.
- `App.js` orchestration, không chứa math hàng nghìn petal.
- Pure logic tách khỏi Three.js khi có thể.
- Không copy-paste cùng một formula vào nhiều file.
- Không tạo abstraction lớn chỉ vì “có thể cần sau này”.

### Performance

Trong hot loop:

- reuse temp vectors/quaternions/matrices;
- tránh `new` theo từng petal mỗi frame;
- tránh `map/filter/reduce` tạo allocation lớn trong physics loop nếu loop thường hiệu quả hơn;
- batch instance updates;
- set `instanceMatrix.needsUpdate` sau batch;
- cap DPR;
- profiling sớm với petal counts thật.

### Random/physics

- Logic cần reproducible phải hỗ trợ seed.
- Không dùng `Math.random()` rải rác bên trong core physics nếu seeded source đã được truyền vào.
- Delta time phải clamp/pause-safe.

### State/timing

- `StateMachine` là nguồn sự thật của cinematic timing.
- Không tạo `setTimeout` riêng để nổ heart.
- Không tạo timer riêng cho audio/visual nếu có thể lấy từ state progress.

---

## 8. Testing — đủ dùng cho project cá nhân

Không cần test mọi dòng Three.js. Test những phần dễ sai và có logic thuần:

- state transitions;
- heartbeat envelope;
- deterministic random;
- heart anchor validity;
- explosion velocity;
- quality selection;
- delta-time behavior;
- reset/replay invariants khi có thể.

Sau task logic, chạy test liên quan trước rồi chạy toàn bộ suite nếu thời gian hợp lý.

Tối thiểu trước mỗi commit quan trọng:

```bash
npm test
```

Trước khi coi một integration/visual/final task hoàn thành:

```bash
npm test
npm run build
```

Nếu test/build fail, không đánh dấu task hoàn tất và không tạo commit “success” giả.

---

## 9. Manual browser check

Với task có ảnh hưởng scene, trước khi tick done cần kiểm tra tối thiểu:

- page load;
- console error;
- state/animation liên quan task;
- resize nếu task ảnh hưởng layout/camera;
- replay nếu task ảnh hưởng lifecycle.

Với visual task, kiểm tra bằng mắt theo `03-visual-art-direction.md` và `12-acceptance-criteria.md`.

---

## 10. task.md là nguồn theo dõi tiến độ

Khi hoàn thành task:

1. đổi header checkbox/status tương ứng sang `[x]` ở các checklist đã làm;
2. không tick item chưa kiểm tra;
3. nếu có item không áp dụng, ghi ngắn lý do thay vì im lặng bỏ qua;
4. nếu bị blocker, dùng `[!]` và mô tả blocker.

Không xóa task cũ khỏi file để giữ lịch sử.

---

## 11. Git workflow — đơn giản nhưng rõ ràng

### Quy tắc chính

- Làm trực tiếp trên `main`.
- **Mỗi task hoàn chỉnh = ít nhất một commit rõ ràng.**
- Không gom nhiều task không liên quan vào cùng một commit.
- Không cần commit cho từng chỉnh sửa nhỏ bên trong một task.
- Không amend/rewrite commit cũ trừ khi người dùng yêu cầu.
- Không `git push --force`.
- Không `git reset --hard` để xử lý lỗi nếu chưa được người dùng cho phép.

### Commit message

Ưu tiên dạng:

```text
feat(core): implement cinematic state machine
feat(core): add petal explosion physics
feat(visual): polish petal material and palette
feat(ui): add replay and loading states
perf: tune mobile petal rendering
fix(core): prevent explosion retrigger on replay
chore: finalize petal heart v1
```

Commit message phải nói được task vừa thay đổi gì, không dùng kiểu:

```text
update
fix stuff
changes
wip final
```

### Sau mỗi task

Ví dụ:

```bash
git status
git add <chỉ các file thuộc task>
git commit -m "feat(core): implement cinematic state machine"
```

Sau commit, kiểm tra:

```bash
git status
```

Nếu còn unrelated changes của người dùng, không tự commit chúng.

---

## 12. Push rule — rất quan trọng

**Sau mỗi prompt của người dùng có yêu cầu sửa/viết code:**

1. hoàn thành các task được giao trong prompt đó;
2. test/build theo yêu cầu;
3. commit riêng sau mỗi task;
4. sau commit cuối cùng của prompt, push một lần:

```bash
git push origin main
```

Không cần push sau từng task nếu nhiều task nằm trong cùng một prompt; commit từng task và push cuối prompt là đủ.

Nếu prompt chỉ hỏi/đánh giá/giải thích và không tạo thay đổi repository thì không cần commit/push.

Nếu push thất bại do authentication/network/non-fast-forward:

- không force push;
- không xóa history;
- báo chính xác lỗi và trạng thái hiện tại cho người dùng;
- chỉ thực hiện rebase/merge khi đã xác định rõ remote thay đổi và không làm mất local work.

---

## 13. Không làm mất dữ liệu người dùng

Không tự ý chạy các lệnh destructive như:

```bash
git reset --hard
git clean -fd
git checkout -- .
rm -rf <folder có dữ liệu>
```

Nếu thật sự cần, phải giải thích và xin phép người dùng trước.

Không overwrite file người dùng đang thay đổi nếu chưa kiểm tra `git diff`/`git status`.

---

## 14. Khi gặp bug

Không vá mò nhiều nơi cùng lúc.

Flow đơn giản:

1. reproduce;
2. xác định symptom;
3. tìm component chịu trách nhiệm;
4. nếu là pure logic, thêm test fail trước nếu hợp lý;
5. fix nhỏ nhất đúng nguyên nhân;
6. test;
7. manual check nếu liên quan render;
8. commit rõ ràng.

Nếu bug thuộc core trong Phase B, Gemini nên dừng refactor và báo để GPT-5.6 Sol High xử lý.

---

## 15. Khi task hoàn tất, phản hồi người dùng ngắn gọn

Agent nên báo:

```text
Hoàn thành A06.
- Implemented: explosion velocity + flight integrator
- Tests: npm test PASS
- Build: npm run build PASS (nếu task yêu cầu)
- Commit: <hash> feat(core): implement petal explosion and flight physics
- Push: origin/main OK
- Next recommended task: A07
```

Không cần viết báo cáo dài trừ khi có bug, trade-off hoặc thay đổi architecture cần người dùng biết.

---

## 16. Definition of Done cho một task

Task chỉ được xem là hoàn thành khi:

- yêu cầu trong task đã được implement;
- acceptance/Done when của task đạt;
- test liên quan pass;
- manual check cần thiết đã làm;
- `task.md` được tick đúng;
- thay đổi đã commit với message rõ;
- nếu là task cuối của prompt, đã `git push origin main` thành công hoặc đã báo blocker push.

---

## 17. Nguyên tắc cuối cùng

**Correct core first, visual polish second.**

Nếu phải chọn giữa:

- animation đẹp nhưng lifecycle sai;
- core đúng nhưng visual còn thô;

hãy giữ core đúng trước. Phase B có thể làm đẹp sau mà không phá architecture.
