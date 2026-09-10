const { chromium } = require('C:/Users/NTNghia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:5174/';

(async () => {
  fs.mkdirSync('.qa', { recursive: true });
  console.log('=== Automated Flow QA (Desktop & Mobile) ===');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  try {
    // 1. Desktop Flow: Test Automated Gem Reveal & Transition (1s Idle -> Activation -> Music)
    console.log('\n[1/3] Desktop: Automated Gem Reveal -> Activation -> Music...');
    const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const desktopErrors = [];
    desktopPage.on('pageerror', err => desktopErrors.push(err.message));

    await desktopPage.goto(`${BASE_URL}?skipIntro=true&jumpState=GEM_IDLE&quality=low`, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded at GEM_IDLE');

    // 1. Initial GEM_IDLE state
    const state0 = await desktopPage.evaluate(() => window.__PETAL_HEART_APP__.stateMachine.state);
    assert.equal(state0, 'GEM_IDLE', 'Should begin in GEM_IDLE');

    // Verify hand/tap hint and ripple are completely gone
    const hintCount = await desktopPage.locator('.gem-interaction-hint').count();
    assert.equal(hintCount, 0, 'No hand/tap hint element in DOM');

    const cursorStyle = await desktopPage.locator('#app').evaluate(el => el.style.cursor);
    assert.notEqual(cursorStyle, 'pointer', 'Gem must not set cursor to pointer');

    const gemVisibleInIdle = await desktopPage.evaluate(
      () => window.__PETAL_HEART_APP__.gemSystem.outerMesh.visible
    );
    assert.equal(gemVisibleInIdle, true, 'Gem is visible and floating in GEM_IDLE');

    await desktopPage.screenshot({ path: '.qa/01-gem-idle-desktop.png' });

    // 2. Wait for automatic GEM_ACTIVATION without clicking!
    console.log('Waiting for automatic GEM_ACTIVATION (no clicks)...');
    await desktopPage.waitForFunction(
      () => window.__PETAL_HEART_APP__.stateMachine.state === 'GEM_ACTIVATION',
      { timeout: 15000 }
    );
    console.log('Entered GEM_ACTIVATION automatically!');

    const heartStreamActive = await desktopPage.evaluate(
      () => window.__PETAL_HEART_APP__.gemSystem.heartStream.active
    );
    assert.equal(heartStreamActive, true, 'Heart stream burst must be active in GEM_ACTIVATION');
    await desktopPage.screenshot({ path: '.qa/02-gem-activation-desktop.png' });

    // 3. Wait for automatic MUSIC_REVEAL
    console.log('Waiting for automatic MUSIC_REVEAL...');
    await desktopPage.waitForFunction(
      () => window.__PETAL_HEART_APP__.stateMachine.state === 'MUSIC_REVEAL',
      { timeout: 15000 }
    );
    console.log('Entered MUSIC_REVEAL automatically!');

    // Wait for audio playback to start
    await desktopPage.waitForFunction(
      () => window.__PETAL_HEART_APP__.musicSystem.status === 'playing',
      { timeout: 10000 }
    );
    console.log('Music is playing automatically!');

    // Gem is completely hidden
    const gemHiddenInMusic = await desktopPage.evaluate(
      () => !window.__PETAL_HEART_APP__.gemSystem.outerMesh.visible
    );
    assert.equal(gemHiddenInMusic, true, 'Gem must be completely disappeared');

    // Caption phrase appears
    await desktopPage.waitForFunction(
      () => document.querySelector('.music-caption--phrase')?.style.visibility === 'visible',
      { timeout: 5000 }
    );
    console.log('Caption phrase rendered!');
    await desktopPage.screenshot({ path: '.qa/03-captions-desktop.png' });

    // 4. Test Ending Fade
    console.log('Fast-forwarding to 22.0s to verify ending sequence...');
    await desktopPage.evaluate(() => {
      window.__PETAL_HEART_APP__.musicSystem.audio.currentTime = 22.0;
    });
    await desktopPage.waitForTimeout(400);

    const overlayOpacityMid = await desktopPage.evaluate(() =>
      parseFloat(window.__PETAL_HEART_APP__.endingOverlay?.style.opacity || '0')
    );
    console.log('Overlay opacity at 22.0s:', overlayOpacityMid);
    assert(overlayOpacityMid > 0.1 && overlayOpacityMid < 0.8, 'Overlay should smoothly darken');
    await desktopPage.screenshot({ path: '.qa/04-ending-fade-desktop.png' });

    // Fast-forward to FINAL
    console.log('Fast-forwarding to 24.3s to verify FINAL state...');
    await desktopPage.evaluate(() => {
      window.__PETAL_HEART_APP__.musicSystem.audio.currentTime = 24.3;
    });
    await desktopPage.waitForFunction(
      () => window.__PETAL_HEART_APP__.stateMachine.state === 'FINAL',
      { timeout: 5000 }
    );

    const overlayOpacityFinal = await desktopPage.evaluate(
      () => window.__PETAL_HEART_APP__.endingOverlay?.style.opacity
    );
    assert.equal(overlayOpacityFinal, '1', 'Overlay must reach 100% black in FINAL');
    console.log('Reached FINAL state with fullscreen black!');

    assert.deepEqual(desktopErrors, []);
    await desktopPage.close();

    // 2. Mobile Viewport Flow (390x844)
    console.log('\n[2/3] Mobile: Automated Gem Flow on Phone Screen (390x844)...');
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobileErrors = [];
    mobilePage.on('pageerror', err => mobileErrors.push(err.message));

    await mobilePage.goto(`${BASE_URL}?skipIntro=true&jumpState=GEM_IDLE&quality=low`, { waitUntil: 'domcontentloaded' });
    console.log('Mobile: Page loaded at GEM_IDLE');

    await mobilePage.waitForFunction(
      () => window.__PETAL_HEART_APP__.stateMachine.state === 'GEM_ACTIVATION',
      { timeout: 15000 }
    );
    console.log('Mobile: Entered GEM_ACTIVATION automatically without tap!');

    await mobilePage.waitForFunction(
      () => window.__PETAL_HEART_APP__.stateMachine.state === 'MUSIC_REVEAL',
      { timeout: 15000 }
    );
    console.log('Mobile: Entered MUSIC_REVEAL automatically!');

    await mobilePage.waitForFunction(
      () => window.__PETAL_HEART_APP__.musicSystem.status === 'playing',
      { timeout: 10000 }
    );
    console.log('Mobile: Music is playing automatically!');
    await mobilePage.screenshot({ path: '.qa/05-mobile-music.png' });

    assert.deepEqual(mobileErrors, []);
    await mobilePage.close();

    // 3. Full Intro Button Gesture Flow: Unlocking AudioContext and priming audio
    console.log('\n[3/3] Full Flow: Testing "Mở cửa trái tim" click unlocks audio priming...');
    const introPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await introPage.goto(`${BASE_URL}?debugSpeed=3&quality=low`, { waitUntil: 'domcontentloaded' });
    await introPage.waitForSelector('#open-heart-btn', { state: 'visible' });

    console.log('Clicking "Mở cửa trái tim" to unlock audio...');
    await introPage.click('#open-heart-btn');

    // Wait a moment and check that musicSystem is armed
    await introPage.waitForTimeout(500);
    const audioArmed = await introPage.evaluate(() => {
      const ms = window.__PETAL_HEART_APP__?.musicSystem;
      return Boolean(ms?.priming || ms?.connect());
    });
    console.log('Audio pre-authorized/armed on intro click:', audioArmed);
    assert.equal(audioArmed, true, 'Audio must be primed during intro click gesture');

    await introPage.close();

    console.log('\n=== ALL QA TESTS PASSED! FULLY AUTOMATED FLOW VERIFIED! ===\n');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('QA Test Failed:', err);
  process.exit(1);
});
