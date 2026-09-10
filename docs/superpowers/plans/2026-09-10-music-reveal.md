# Music Reveal implementation plan — 2026-09-10

Goal: Replace the old gem/text ending with GEM_ACTIVATION → MUSIC_REVEAL → FINAL in the existing render loop.

Architecture: MusicSystem owns one preloaded HTMLAudioElement routed through musicGain into the existing SoundSystem AudioContext. Heartbeat keeps its existing gain/compressor path. CaptionTimeline samples absolute audio.currentTime; CaptionRenderer owns an HTML overlay and prebuilt line nodes. No timer-based caption clock or production fixture.

User specification: The current Music Reveal request supersedes historical LoveText/Replay ending requirements. Keep main checkout, no new media, no heartbeat changes, no scene rebuild, test/build/browser QA then commit and push main.

- [x] State tests first: ignore clicks outside GEM_IDLE, activation once, media-controlled completion, stable FINAL.
- [x] Add config and media controller tests: empty source, segment boundaries, pause/resume, rejected playback, duplicate calls, gain isolation and disposal.
- [x] Implement caption sampling and overlay; test half-open intervals, fades, gaps, backward seeks and dropped frames.
- [x] Integrate into App; retain existing petals and subdued post-processing, remove old 3D text from active scene, disable replay after interaction.
- [x] Browser QA desktop/mobile with test-only mocked media time, full npm test and npm run build.
- [x] Document configuration, limitations and QA evidence; commit and verify origin/main.

