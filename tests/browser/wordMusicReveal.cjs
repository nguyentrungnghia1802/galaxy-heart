// Real MP3 integration QA. Set QA_BASE_URL for local/root/Project Pages preview.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173/';
  const isDev = new URL(base).port === '5173';
  const label = process.env.QA_LABEL || 'dev';
  const browser = await chromium.launch({ headless: true });
  const report = [];
  fs.mkdirSync('.qa', { recursive: true });
  try {
    for (const mobile of [false, true]) {
      const name = mobile ? 'mobile' : 'desktop';
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
        isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(120000);
      await page.addInitScript(() => {
        const NativeAudio = window.Audio;
        window.qaAudio = null;
        window.qaContexts = [];
        window.qaPlayCalls = [];
        window.qaFirstWord = null;
        window.qaOverlap = false;
        window.Audio = function(...args) { return window.qaAudio = new NativeAudio(...args); };
        window.Audio.prototype = NativeAudio.prototype;
        window.AudioContext = new Proxy(window.AudioContext, {
          construct(Target, args) { const ctx = new Target(...args); qaContexts.push(ctx); return ctx; },
        });
        const nativePlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function() {
          qaPlayCalls.push({ time: this.currentTime, at: performance.now() });
          return nativePlay.call(this);
        };
        document.addEventListener('DOMContentLoaded', () => {
          new MutationObserver(() => {
            const visible = [...document.querySelectorAll('.music-caption__word')]
              .filter(n => n.style.visibility === 'visible' && Number(n.style.opacity) > 0.005);
            if (visible.length && !qaFirstWord) qaFirstWord = { time: qaAudio.currentTime, text: visible[0].textContent };
            if (new Set(visible.map(n => n.parentElement.dataset.line)).size > 1) qaOverlap = true;
          }).observe(document.querySelector('#app'), { attributes: true, subtree: true, attributeFilter: ['style'] });
        });
      });
      const errors = [];
      const failures = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).origin === new URL(base).origin) failures.push({ url: r.url(), status: r.status() }); });
      console.log(label, name, 'loading real audio');
      await page.goto(`${base}?captionDebug=1${isDev ? '&quality=low&debugSpeed=3' : ''}`);
      await page.waitForFunction(() => qaAudio?.readyState >= 3);
      assert.equal(await page.evaluate(() => qaAudio.paused), true);
      assert.equal(await page.locator('.caption-debug').count(), 1);
      assert.equal(await page.locator('.music-caption__word').count(), 48);
      const src = await page.evaluate(() => qaAudio.currentSrc);
      assert.equal(new URL(src).pathname, `${new URL(base).pathname}assets/audio/heart.mp3`);
      await page.locator('#open-heart-btn').click();
      await page.waitForFunction(() => document.querySelector('.gem-interaction-hint')?.classList.contains('is-visible'));
      await page.evaluate(() => {
        window.qaCanvas = document.querySelector('canvas');
        if (window.__PETAL_HEART_APP__) {
          window.qaScene = window.__PETAL_HEART_APP__.scene;
          window.qaMesh = window.__PETAL_HEART_APP__.petalSystem.mesh;
        }
      });
      const point = await page.evaluate(() => {
        const a = window.__PETAL_HEART_APP__;
        if (!a) return { x: innerWidth / 2, y: innerHeight / 2 };
        const p = a.gemSystem.group.position.clone().project(a.camera);
        return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
      });
      for (let i = 0; i < 2; i++) {
        if (mobile) await page.touchscreen.tap(point.x, point.y);
        else await page.mouse.click(point.x, point.y);
      }
      await page.waitForFunction(() => qaPlayCalls.length >= 2 && !qaAudio.paused && qaAudio.currentTime > 0.1);
      assert.equal(await page.evaluate(() => qaPlayCalls.length), 2); // silent prime + reveal
      assert.equal(await page.locator('.gem-interaction-hint').getAttribute('aria-hidden'), 'true');
      await page.waitForFunction(() => qaFirstWord !== null);
      const first = await page.evaluate(() => qaFirstWord);
      assert(first.time >= 2 && first.time < 3.2, JSON.stringify(first));
      assert.equal(first.text, 'My');
      const visibleWords = () => page.locator('.music-caption__word').evaluateAll(nodes => nodes.filter(n => Number(n.style.opacity) > 0.005 && n.style.visibility === 'visible').map(n => n.textContent));
      const seek = async time => {
        await page.evaluate(t => { qaAudio.pause(); qaAudio.currentTime = t; }, time);
        await page.waitForFunction(t => document.querySelector('.caption-debug').textContent.startsWith(`Music: ${t.toFixed(3).padStart(6, '0')}s`), time);
      };
      await seek(1.9);
      assert.deepEqual(await visibleWords(), []);
      await seek(2.075);
      assert.deepEqual(await visibleWords(), ['My']);
      assert(Math.abs(Number(await page.locator('.music-caption__word').first().evaluate(n => n.style.opacity)) - 0.5) < 0.01);
      await seek(2.7);
      assert.deepEqual(await visibleWords(), ['My', 'baby']);
      await page.screenshot({ path: `.qa/${label}-${name}-words.png` });
      await seek(3.1);
      assert(Number(await page.locator('.music-caption__word').first().evaluate(n => n.style.opacity)) < 0.6);
      await seek(3.4);
      assert.deepEqual(await visibleWords(), ['I']);
      await seek(5.35);
      assert((await page.locator('.caption-debug').textContent()).includes('Current: forever\nLine: 2'));
      await page.setViewportSize(mobile ? { width: 844, height: 390 } : { width: 1000, height: 720 });
      assert(await page.locator('.music-caption').evaluateAll(nodes => nodes.every(n => { const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
      await page.evaluate(() => qaAudio.play());
      if (mobile || !isDev) await page.evaluate(() => { qaAudio.currentTime = qaAudio.duration - 0.5; });
      await page.waitForFunction(() => qaAudio.ended);
      await page.waitForFunction(() => [...document.querySelectorAll('.music-caption__word')].every(n => n.style.visibility === 'hidden'));
      assert.equal(await page.evaluate(() => qaContexts.length), 1);
      assert.equal(await page.evaluate(() => qaCanvas === document.querySelector('canvas')), true);
      assert.equal(await page.evaluate(() => qaOverlap), false);
      if (isDev) assert(await page.evaluate(() => {
        const a = window.__PETAL_HEART_APP__;
        a.onGemInteracted(); a.replay();
        return a.stateMachine.state === 'FINAL' && a.scene === qaScene && a.petalSystem.mesh === qaMesh && !a.gemSystem.outerMesh.visible && a.musicSystem.volume === 0.7;
      }));
      const duration = await page.evaluate(() => qaAudio.duration);
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
      await page.goto(base);
      await page.waitForSelector('.music-captions', { state: 'attached' });
      assert.equal(await page.locator('.caption-debug').count(), 0);
      assert.equal(await page.evaluate(() => qaAudio.paused), true);
      report.push({ label, name, result: 'PASS', src, duration, first, errors, failures });
      console.log(JSON.stringify(report.at(-1)));
      await context.close();
    }
    fs.writeFileSync(`.qa/${label}-music-report.json`, JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
