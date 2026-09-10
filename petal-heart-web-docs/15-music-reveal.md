# Music Reveal — configuration and lifecycle

The active ending is `PETAL_FLIGHT → GEM_IDLE → GEM_ACTIVATION → MUSIC_REVEAL → FINAL`.
This supersedes the older gem burst / 3D “I love you!” / replay ending documented in the historical task entries. The old text module is no longer instantiated or imported by App.

## Supply the real track and captions

Edit **`src/config/musicReveal.js`**. Place the supplied audio under `public/assets/audio/`, then set:

```js
music: {
  src: `${import.meta.env.BASE_URL}assets/audio/your-track.mp3`,
  startTime: 32,  // absolute seconds into the source file
  endTime: 96,   // absolute seconds; null means the natural end of the file
  volume: 0.7,   // 0..1; independent of heartbeat
},
captions: [
  { start: 33.2, end: 36.8, text: 'Your supplied first line' },
  { start: 37.0, end: 40.0, text: 'Your supplied next line' },
],
captionFade: 0.6,
activation: { duration: 1.2, pulseFraction: 0.22, pulseScale: 0.035 },
```

The example above is documentation only. Production ships `src: ''` and an empty caption list. No media request, generated sound or caption clock runs in this case: activation fades the gem and the sequence enters a silent FINAL with gently moving petals.

Caption timestamps are **absolute `audio.currentTime` values**, not time since clicking or relative to `startTime`. Intervals are ordered and non-overlapping (`start <= time < end`); gaps intentionally have no text. Put caption intervals inside the chosen music segment, leaving room for each line to fade out before `endTime`. `captionFade` is shortened automatically for short lines. Invalid music intervals or overlapping caption intervals fail configuration validation.

## Ownership and synchronization

- `SoundSystem` owns the only AudioContext. Existing heartbeat scheduling, buffers and levels are preserved; the former heartbeat-only `masterGain` is now explicitly named `heartbeatGain`.
- `MusicSystem` owns one HTMLAudioElement and one `musicGain`. Its output connects directly to the same context destination, outside the heartbeat gain/compressor. Heartbeat mute does not mute music, and music volume/fades cannot change heartbeat gain.
- The media element starts preloading at App construction. It streams/decodes through the browser; there is no synchronous fetch/decode at gem click. User gesture primes the same element at zero gain, pauses and seeks it, then activation completion starts the chosen segment. No additional AudioContext or duplicated audio element is needed.
- App's existing RAF samples music `currentTime` and draws the HTML caption overlay. Smoothstep opacity is evaluated from media time; there are no caption timers or frame-delta caption clocks. DOM text is prepared up front and kept stable throughout playback. Seeking/dropped frames immediately select the correct line; pause freezes its opacity.
- `MUSIC_REVEAL` has infinite default duration and completes through media `ended`, configured `endTime`, stop, or load failure. `timeupdate` also checks segment completion. This is media-event/frame precision, not sample-accurate audio editing.
- An empty source ends silently. A failed media load records `musicSystem.error` and ends safely. Browser autoplay denial keeps the reveal pending and exposes a minimal **Continue music** button, which retries in a user gesture without replaying the scene.
- Hiding the tab pauses active or pending playback as well as RAF. Resume retains media position; blocked resume uses the same button. Async completions are guarded against stop, disposal and superseding pause/resume operations.
- Once activation begins, clicks and App replay cannot restart the sequence. FINAL continues the existing render loop. Dispersed petal instances settle into bounded, slow drift and rotation so a long track does not empty the background.
- Disposal removes media listeners, clears the source, disconnects music nodes, removes caption/button DOM and then lets SoundSystem close its context.

## Music controls

`app.musicSystem.begin()` is the one-shot sequence start used by App. `play()` resumes, `pause()` retains current time, and `stop()` is terminal for that instance (no accidental replay). `setVolume(value)` changes the stored music level; `fadeTo(value, seconds)` automates only musicGain. There are no production controls beyond the autoplay recovery button yet.

## Validation

Run `npm test` and `npm run build`. The unit fixtures use a fake media element/time; they contain no audio bytes. `tests/browser/musicReveal.cjs` runs against Vite using Playwright, with a test-only clock injected into the real App and real Three.js scene. It checks desktop/mobile tap flow, caption boundaries and fades, seek/frame jumps, pause/resume, resize, final/replay guards, no media requests, stable scene identity and disposal. Set `NODE_PATH` to an existing Playwright installation and run:

```powershell
npm run dev -- --host 127.0.0.1
# In another terminal:
node tests/browser/musicReveal.cjs
```

Screenshots and JSON output go to ignored `.qa/`. These fixtures are not imported by production. Real-track decode, real-file trim accuracy and physical iOS/Android autoplay still need validation when the actual track is supplied; no such results are claimed from a mocked media clock.

### QA evidence — 2026-09-10

- `npm test`: 21 files, 112 tests PASS.
- `npm run build`: PASS; Vite reports the existing class of warning for a bundle above 500 kB.
- Playwright Chromium headless: desktop 1280×720 and mobile emulation 390×844 (touch), plus resize to 1000×720 and mobile landscape 844×390: PASS. Zero page errors and zero media requests. One caption overlay; three fixture play calls correspond to silent priming, reveal and explicit pause/resume, not duplicate playback.
- Screenshots inspected: `.qa/desktop-caption.png`, `.qa/mobile-caption.png` and final scene captures. Captions fit the viewport and the gem/old text are absent at FINAL.
- The 60-frame samples include headless rendering/startup overhead: maximum frame intervals were approximately 317 ms desktop and 150 ms mobile. These are not a 60 FPS performance certification; physical-device profiling and real-media startup QA remain for the supplied track. No synchronous media decode or new scene allocation occurs at reveal.
- Code review found and regression tests now cover stale play completion and hidden-tab priming races.
