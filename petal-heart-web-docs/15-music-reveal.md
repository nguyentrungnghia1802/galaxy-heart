# Music Reveal: configuration and QA

The flow is explosion → floating gem → click/tap → gem activation → music and word captions → FINAL. The old 3D love text and gem sound are not used. Existing petals keep drifting, with the same scene and meshes.

## Adjust timestamps

Edit only `src/config/musicCaptions.js`. `WORD_TIMELINE` contains all 48 words across eight lyric lines, with absolute `audio.currentTime` values in seconds. The supplied alignment is approximate; listen and adjust each `time` as needed. Keep entries chronological and each line together.

```js
{ time: 3.71, text: 'love', line: 2 },
{ time: 5.35, text: 'forever', line: 2, hold: 1.8 },
```

`hold` optionally overrides `WORD_ANIMATION.holdDuration`. Global defaults in the same file are fade-in 0.15 s, hold 1.15 s and fade-out 0.45 s (1.75 s total). Words independently fade/scale in, hold, then fade/float/blur out. The previous line fades over its last 0.22 s before the next line starts. Invisible spans retain layout space so neighbours do not jump; they are hidden visually and from accessibility, and disposed with the renderer. No whole-line reveal, glow or caption timers are used.

The first word starts at 2.00 s; music plays without captions before that. App samples the audio clock in its existing render loop. Pauses, seeks and missed frames therefore do not accumulate caption drift.

Open `?captionDebug=1` (or append `&captionDebug=1`) for a small clock, current word and line. This works in production too; the normal URL has no debug panel.

## Music and audio routing

`src/config/musicReveal.js` selects the track with `${import.meta.env.BASE_URL}assets/audio/heart.mp3`, plays from zero to natural end (~26.26 s), and keeps music volume at 0.7. The relative default base and `/galaxy-heart/` Pages base are both supported. Do not substitute a Windows path or a root-relative asset URL.

`SoundSystem` owns one AudioContext. Heartbeat gain is 1.6 with its own compressor; the explosion retains gain 1 and its original compressor settings. `MusicSystem.musicGain` connects separately to the same destination, independent of both buses. There is no master boost.

One audio element preloads at App construction. A gem gesture primes it through zero gain; activation completion starts audible playback. Repeated taps cannot start another sequence. Autoplay denial exposes the existing Continue music button. Hidden tabs pause rendering and music, then resume from the same media position. Natural audio end enters FINAL; replay cannot restart the activated sequence.

The gem hint and surrounding ripple wait three idle seconds. An early click prevents them; activation dismisses the HTML hint without a fade-out delay.

## Run QA

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
# In another terminal, with Playwright installed or NODE_PATH pointing to its installation:
node tests/browser/musicReveal.cjs
node tests/browser/audioLevels.cjs
node tests/browser/gemInteractionHint.cjs
```

For production root preview, run `npm run preview -- --host 127.0.0.1 --port 4173` after a default build, then:

```powershell
$env:QA_BASE_URL='http://127.0.0.1:4173/'
$env:QA_LABEL='production-root'
node tests/browser/wordMusicReveal.cjs
```

For Pages, build and preview with the same base:

```powershell
$env:GITHUB_PAGES='true'
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
# Another terminal:
$env:QA_BASE_URL='http://127.0.0.1:4174/galaxy-heart/'
$env:QA_LABEL='production-pages'
node tests/browser/wordMusicReveal.cjs
```

Browser fixtures use the real MP3 and Chromium desktop/mobile touch emulation. They check loading, early caption silence, per-word fades, clean line changes, debug mode, repeated taps, one AudioContext, stable scene/canvas, final state, resizing and page/network errors. Screenshots and reports go to ignored `.qa/`. Offline audio rendering compares heartbeat RMS/peak and checks that explosion levels are unchanged. These checks do not certify physical-device performance, speaker response or perceptual distortion on every device.

## Verified on 2026-09-10

- `npm test`: 23 files, 119 tests passed. Default production build and `GITHUB_PAGES=true` build passed; Vite reports the existing >500 kB bundle warning.
- Real-MP3 Chromium QA passed at local dev, production root and production `/galaxy-heart/`, each at desktop 1280×720 and mobile touch 390×844 plus resize/landscape checks. First visible word arrived between 2.018 and 2.091 media seconds. No page exceptions or failed same-origin responses; startup console smoke checks also had zero errors at all three bases.
- Caption lifecycle, backward seek, line boundaries, debug enabled/disabled, single activation despite repeated taps, one AudioContext, stable canvas and FINAL checks passed. Desktop dev also played through the remaining track naturally; other end checks seek near the real media end.
- Gem QA passed for delayed hints and early clicks on desktop/mobile. Icon widths are 26/28 px and dismissal transition duration is zero. Screenshots for captions and gem were inspected.
- Offline heartbeat RMS increased from 0.1603 to 0.1952 (~22%), peak was 0.8422, with zero clipped samples in the rapid/final-beat fixture. Explosion output was identical before/after; music volume remains 0.7. This is a rendered signal measurement, not a physical speaker listening test.
- The original MP3 and both build copies have identical SHA-256 hashes. The live music file is ~26.26 seconds; timestamps remain deliberately approximate for manual tuning.
