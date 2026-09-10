// Vite must be running at http://127.0.0.1:5173 before this fixture.
// This checks the real scene and DOM overlay without adding media or fixtures to production.
const { chromium } = require('playwright');
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
  const browser = await chromium.launch({ headless: true });
  const report = [];

  try {
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() => window.__PETAL_HEART_APP__?.stateMachine.state === 'GEM_IDLE');
      await page.waitForTimeout(700);
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.classList.contains('is-visible')), false);
      await page.waitForFunction(() => document.querySelector('.gem-interaction-hint')?.classList.contains('is-visible'));
      await page.screenshot({ path: '.qa/desktop-gem-hint.png' });
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getAttribute('aria-hidden')), 'false');
      const point = await gemPoint(page);
      await page.mouse.click(point.x, point.y);
      await page.waitForFunction(() => window.__PETAL_HEART_APP__.stateMachine.state === 'GEM_ACTIVATION');
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getAttribute('aria-hidden')), 'true');
      assert.deepEqual(errors, []);
      report.push({ viewport: 'desktop', result: 'PASS', errors });
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
      const point = await gemPoint(page);
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForFunction(() => window.__PETAL_HEART_APP__.stateMachine.state === 'GEM_ACTIVATION');
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getAttribute('aria-hidden')), 'true');
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getBoundingClientRect().width), 34);
      await page.setViewportSize({ width: 844, height: 390 });
      assert.equal(await page.locator('.gem-interaction-hint').evaluate(node => node.getBoundingClientRect().width), 38);
      assert.deepEqual(errors, []);
      report.push({ viewport: 'mobile', result: 'PASS', errors });
      await page.close();
    }

    fs.writeFileSync('.qa/gem-hint-report.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
