// Vite must be running at http://127.0.0.1:5173 before this fixture.
// This checks the real scene and DOM overlay without adding media or fixtures to production.
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('C:/Users/NTNghia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const assert = require('node:assert/strict');
const fs = require('node:fs');

const url = 'http://127.0.0.1:5173/?skipIntro=true&jumpState=GEM_IDLE&quality=low&debugSpeed=3';

async function gemPoint(page) {
  return page.evaluate(() => {
    const app = window.__PETAL_HEART_APP__;
    const projected = app.gemSystem.group.position.clone().project(app.camera);
    return {
      x: ((projected.x + 1) * innerWidth) / 2,
      y: ((1 - projected.y) * innerHeight) / 2,
    };
  });
}

(async () => {
  fs.mkdirSync('.qa', { recursive: true });
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const report = [];

  try {
    {
      console.log('Starting desktop test...');
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      console.log('Navigating to', url);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.log('Waiting for GEM_IDLE state...');
      await page.waitForFunction(() => window.__PETAL_HEART_APP__?.stateMachine.state === 'GEM_IDLE', { timeout: 15000 });
      console.log('In GEM_IDLE state!');
      await page.waitForTimeout(700);
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.classList.contains('is-visible')), false);
      console.log('Waiting for is-visible...');
      await page.waitForFunction(() => document.querySelector('.gem-interaction-hint')?.classList.contains('is-visible'), { timeout: 15000 });
      console.log('is-visible confirmed!');
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getAttribute('aria-hidden')), 'false');

      // Check desktop icon dimensions (38px wide)
      const iconWidth = await page.locator('.gem-interaction-hint__icon').evaluate(node => Math.round(node.getBoundingClientRect().width));
      assert.equal(iconWidth, 38, `Desktop icon width should be 38px, got ${iconWidth}`);

      // Check micro-copy label
      const labelText = await page.locator('.gem-interaction-hint__label').evaluate(node => node.textContent.trim());
      assert.equal(labelText, 'Chạm vào viên ngọc');

      // Screenshot desktop state
      await page.screenshot({ path: '.qa/desktop-gem-hint.png' });

      // Click gem to test dismissal
      const point = await gemPoint(page);
      await page.mouse.click(point.x, point.y);
      await page.waitForFunction(() => window.__PETAL_HEART_APP__.stateMachine.state === 'GEM_ACTIVATION');
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getAttribute('aria-hidden')), 'true');
      assert.deepEqual(errors, []);
      report.push({ viewport: 'desktop', result: 'PASS', iconWidth, errors });
      await page.close();
    }

    {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() => window.__PETAL_HEART_APP__?.stateMachine.state === 'GEM_IDLE');
      await page.waitForTimeout(450);
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.classList.contains('is-visible')), false);

      // Wait for hint to become visible
      await page.waitForFunction(() => document.querySelector('.gem-interaction-hint')?.classList.contains('is-visible'));
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getAttribute('aria-hidden')), 'false');

      // Check mobile icon width (42px)
      const iconWidth = await page.locator('.gem-interaction-hint__icon').evaluate(node => Math.round(node.getBoundingClientRect().width));
      assert.equal(iconWidth, 42, `Mobile icon width should be 42px, got ${iconWidth}`);

      // Screenshot mobile state
      await page.screenshot({ path: '.qa/mobile-gem-hint.png' });

      // Tap gem
      const point = await gemPoint(page);
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForFunction(() => window.__PETAL_HEART_APP__.stateMachine.state === 'GEM_ACTIVATION');
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getAttribute('aria-hidden')), 'true');
      assert.deepEqual(errors, []);
      report.push({ viewport: 'mobile', result: 'PASS', iconWidth, errors });
      await page.close();
    }

    fs.writeFileSync('.qa/gem-hint-report.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
