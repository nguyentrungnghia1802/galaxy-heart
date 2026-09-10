const {
  chromium,
} = require('C:/Users/NTNghia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:5174/';

function assertWithin(actual, minimum, maximum, label) {
  assert(
    actual >= minimum && actual <= maximum,
    `${label}: expected ${minimum}-${maximum}ms, received ${actual.toFixed(1)}ms`,
  );
}

(async () => {
  fs.mkdirSync('.qa', { recursive: true });
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(
      `${BASE_URL}?skipIntro=true&jumpState=HEART_IDLE&quality=low`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForFunction(
      () => window.__PETAL_HEART_APP__?.stateMachine?.state === 'HEART_IDLE',
      { timeout: 15_000 },
    );

    await page.evaluate(() => {
      const app = window.__PETAL_HEART_APP__;
      const qa = {
        startedAt: 0,
        beats: [],
        explosion: null,
        rapidFrames: 0,
        frameSyncErrors: [],
        frameSyncChecks: 0,
      };
      window.__HEARTBEAT_SEQUENCE_QA__ = qa;

      const originalHeartUpdate = app.heartSystem.update.bind(app.heartSystem);
      app.heartSystem.update = (dt, snapshot) => {
        const result = originalHeartUpdate(dt, snapshot);
        if (snapshot?.state === 'RAPID_HEARTBEAT') qa.rapidFrames += 1;
        return result;
      };

      const originalSound = app.soundSystem.playHeartbeat.bind(app.soundSystem);
      app.soundSystem.playHeartbeat = (
        intensity,
        isRapid,
        isDub,
        isFinal,
        startOffsetSeconds,
      ) => {
        qa.beats.push({
          type: isDub ? 'dub' : 'lub',
          isFinal: Boolean(isFinal),
          isRapid: Boolean(isRapid),
          state: app.stateSnapshot.state,
          phase: app.heartSystem.phase,
          intensity,
          heartScale: app.stateSnapshot.heartScale,
          petalScale: app.petalSystem.currentGlobalScale,
          startOffsetSeconds,
          logicalMs: app.stateMachine.totalElapsed * 1_000,
          atMs: performance.now() - qa.startedAt,
        });
        return originalSound(
          intensity,
          isRapid,
          isDub,
          isFinal,
          startOffsetSeconds,
        );
      };

      const originalExplosion =
        app.petalSystem.triggerExplosion.bind(app.petalSystem);
      app.petalSystem.triggerExplosion = (params) => {
        qa.explosion = {
          atMs: performance.now() - qa.startedAt,
          heartPhase: app.heartSystem.phase,
          heartScale: app.heartSystem.getGlobalScale(),
          petalScale: app.petalSystem.currentGlobalScale,
          logicalMs: app.stateMachine.totalElapsed * 1_000,
        };
        return originalExplosion(params);
      };

      const verifyFrameSync = () => {
        if (
          app.stateSnapshot.state === 'HEARTBEAT' ||
          app.stateSnapshot.state === 'TENSION'
        ) {
          qa.frameSyncChecks += 1;
          const expectedGlow =
            0.16 + Math.min(2, app.stateSnapshot.heartbeatIntensity) * 0.32;
          const pulseFactor =
            Math.min(2.5, app.stateSnapshot.heartbeatIntensity) * 1.25;
          let expectedInnerLight =
            app.lightingSystem.baseInnerIntensity + pulseFactor * 2.6;
          if (app.stateSnapshot.state === 'TENSION') {
            const progress = app.stateSnapshot.progress;
            if (progress < 0.4) {
              expectedInnerLight *= 1 - (progress / 0.4) * 0.15;
            } else {
              expectedInnerLight += ((progress - 0.4) / 0.6) * 4.5;
            }
          }
          if (
            Math.abs(
              app.petalSystem.material.emissiveIntensity - expectedGlow,
            ) > 1e-6 ||
            Math.abs(
              app.petalSystem.currentGlobalScale - app.stateSnapshot.heartScale,
            ) > 1e-6 ||
            Math.abs(
              app.lightingSystem.innerLight.intensity - expectedInnerLight,
            ) > 1e-6
          ) {
            qa.frameSyncErrors.push({
              state: app.stateSnapshot.state,
              phase: app.heartSystem.phase,
            });
          }
        }
      };

      if (app.postProcessing?.enabled) {
        const originalRender = app.postProcessing.render.bind(app.postProcessing);
        app.postProcessing.render = (...args) => {
          verifyFrameSync();
          return originalRender(...args);
        };
      } else {
        const originalRender = app.rendererSystem.render.bind(app.rendererSystem);
        app.rendererSystem.render = (...args) => {
          verifyFrameSync();
          return originalRender(...args);
        };
      }
    });

    await page.mouse.click(20, 20);
    await page.waitForFunction(
      () => window.__PETAL_HEART_APP__?.soundSystem?.unlocked === true,
      { timeout: 5_000 },
    );
    await page.evaluate(() => {
      const app = window.__PETAL_HEART_APP__;
      window.__HEARTBEAT_SEQUENCE_QA__.startedAt = performance.now();
      app.stateMachine.transitionTo('HEARTBEAT');
    });
    await page.waitForFunction(
      () => window.__HEARTBEAT_SEQUENCE_QA__?.explosion !== null,
      { timeout: 12_000 },
    );

    const qa = await page.evaluate(() => window.__HEARTBEAT_SEQUENCE_QA__);
    fs.writeFileSync(
      '.qa/heartbeat-sequence.json',
      `${JSON.stringify(qa, null, 2)}\n`,
    );

    assert.deepEqual(pageErrors, []);
    assert.equal(qa.rapidFrames, 0, 'RAPID_HEARTBEAT must render zero frames');
    assert(qa.frameSyncChecks > 0, 'browser QA must inspect rendered heartbeat frames');
    assert.deepEqual(qa.frameSyncErrors, [], 'heart, petal, and glow must stay frame-synced');
    assert.equal(qa.beats.length, 14, 'exactly seven lub-dub pairs must play');

    const lubEvents = [];
    for (let index = 0; index < 7; index += 1) {
      const lub = qa.beats[index * 2];
      const dub = qa.beats[index * 2 + 1];
      assert.equal(lub.type, 'lub', `beat ${index + 1} must start with lub`);
      assert.equal(dub.type, 'dub', `beat ${index + 1} must end with dub`);
      assert.equal(lub.isRapid, false);
      assert.equal(dub.isRapid, false);
      assert.equal(lub.isFinal, index === 6);
      assert.equal(dub.isFinal, index === 6);
      assert.equal(lub.state, index === 6 ? 'TENSION' : 'HEARTBEAT');
      assert.equal(dub.state, index === 6 ? 'TENSION' : 'HEARTBEAT');
      assertWithin(
        dub.logicalMs - lub.logicalMs,
        130,
        210,
        `beat ${index + 1} lub-to-dub timing`,
      );
      assert(
        Math.abs(lub.heartScale - lub.petalScale) <= 1e-6,
        `beat ${index + 1} lub petal scale must match heart scale`,
      );
      assert(
        Math.abs(dub.heartScale - dub.petalScale) <= 1e-6,
        `beat ${index + 1} dub petal scale must match heart scale`,
      );
      lubEvents.push(lub);
    }

    for (let index = 1; index < lubEvents.length; index += 1) {
      assertWithin(
        lubEvents[index].logicalMs - lubEvents[index - 1].logicalMs,
        840,
        960,
        `lub interval ${index} -> ${index + 1}`,
      );
    }

    const wallLubIntervals = lubEvents.slice(1).map(
      (event, index) => event.atMs - lubEvents[index].atMs,
    );
    const sortedWallIntervals = [...wallLubIntervals].sort((a, b) => a - b);
    const medianWallInterval = sortedWallIntervals[3];
    for (const [index, interval] of wallLubIntervals.entries()) {
      assert(
        Math.abs(interval - medianWallInterval) / medianWallInterval <= 0.15,
        `wall-clock lub interval ${index + 1} -> ${index + 2} changed tempo`,
      );
    }

    const finalDub = qa.beats.at(-1);
    const finalDubRemainingMs =
      (0.23 - finalDub.startOffsetSeconds) * 1_000;
    const finalDubToExplosionMs =
      qa.explosion.logicalMs - finalDub.logicalMs;
    assert(
      Math.abs(finalDubToExplosionMs - finalDubRemainingMs) <= 20,
      'final dub audio tail must end at the explosion boundary',
    );
    assert(qa.explosion.heartScale > 1, 'final dub must carry scale tension into explosion');
    assert(
      Math.abs(qa.explosion.heartScale - qa.explosion.petalScale) <= 0.01,
      'explosion must inherit the final heartbeat scale',
    );

    console.log(JSON.stringify({
      pairs: qa.beats.length / 2,
      logicalLubIntervalsMs: lubEvents.slice(1).map((event, index) =>
        Number((event.logicalMs - lubEvents[index].logicalMs).toFixed(1))),
      wallLubIntervalsMs: lubEvents.slice(1).map((event, index) =>
        Number((event.atMs - lubEvents[index].atMs).toFixed(1))),
      logicalLubToDubMs: Array.from({ length: 7 }, (_, index) =>
        Number((qa.beats[index * 2 + 1].logicalMs - qa.beats[index * 2].logicalMs).toFixed(1))),
      logicalFinalDubToExplosionMs: Number(
        (qa.explosion.logicalMs - qa.beats.at(-1).logicalMs).toFixed(1),
      ),
      finalDubRemainingAudioMs: Number(finalDubRemainingMs.toFixed(1)),
      rapidFrames: qa.rapidFrames,
      frameSyncChecks: qa.frameSyncChecks,
      frameSyncErrors: qa.frameSyncErrors.length,
    }, null, 2));

    await page.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
