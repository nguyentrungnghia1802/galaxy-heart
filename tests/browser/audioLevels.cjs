// Actual Web Audio offline rendering, with no extra runtime context in the app.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5173/');
    const result = await page.evaluate(async () => {
      const { SoundSystem } = await import('/src/audio/SoundSystem.js');
      async function render(volume, effectsOnly = false, legacy = false) {
        const offline = new OfflineAudioContext(1, 44100 * 3, 44100);
        let time = 0;
        const context = new Proxy(offline, {
          get(target, key) {
            if (key === 'currentTime') return time;
            const value = Reflect.get(target, key, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        const sound = new SoundSystem({ AudioContext: class { constructor() { return context; } }, volume, autoInit: true });
        if (legacy) {
          sound.compressor.threshold.setValueAtTime(-2.5, 0);
          sound.compressor.attack.setValueAtTime(0.003, 0);
        }
        if (effectsOnly) {
          // Remove noise variance between baseline/boost renders for an exact routing comparison.
          sound.softBurstBuffer.getChannelData(0).fill(0.3);
          time = 0.1;
          sound.playSoftExplosion();
        } else {
          for (const onset of [0.1, 0.38, 0.66, 0.94]) {
            time = onset;
            sound.playHeartbeat(2, true, false);
            time = onset + 0.065;
            sound.playHeartbeat(2, true, true);
          }
          time = 1.4;
          sound.playFinalBeat();
        }
        const rendered = await offline.startRendering();
        const data = rendered.getChannelData(0);
        let peak = 0;
        let squares = 0;
        let clipped = 0;
        for (const sample of data) {
          peak = Math.max(peak, Math.abs(sample));
          squares += sample * sample;
          if (Math.abs(sample) >= 1) clipped++;
        }
        return { peak, rms: Math.sqrt(squares / data.length), clipped };
      }
      const baseline = await render(1, false, true);
      const boosted = await render(1.6);
      const effectsBefore = await render(1, true);
      const effectsAfter = await render(1.6, true);
      const ctx = new OfflineAudioContext(1, 1, 44100);
      const response = await fetch('/assets/audio/heart.mp3');
      const music = await ctx.decodeAudioData(await response.arrayBuffer());
      return { baseline, boosted, effectsBefore, effectsAfter, musicDuration: music.duration, musicChannels: music.numberOfChannels };
    });
    console.log(JSON.stringify(result));
    assert(result.boosted.rms > result.baseline.rms * 1.1);
    assert(result.boosted.peak < 1);
    assert.equal(result.boosted.clipped, 0);
    assert.deepEqual(result.effectsBefore, result.effectsAfter);
    assert(result.musicDuration > 24 && result.musicDuration < 30);
    fs.mkdirSync('.qa', { recursive: true });
    fs.writeFileSync('.qa/audio-levels.json', JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
