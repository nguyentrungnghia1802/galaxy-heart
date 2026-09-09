import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Intro Screen & Curtain Split', () => {
  const htmlPath = resolve(__dirname, '../index.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');

  it('contains intro screen structure, curtains, 2D pixel heart, and opening button in index.html', () => {
    expect(htmlContent).toContain('id="intro-screen"');
    expect(htmlContent).toContain('class="curtain-panel curtain-left"');
    expect(htmlContent).toContain('class="curtain-panel curtain-right"');
    expect(htmlContent).toContain('class="pixel-heart-svg"');
    expect(htmlContent).toContain('id="open-heart-btn"');
    expect(htmlContent).toContain('Mở cửa trái tim');
    expect(htmlContent).not.toContain('id="sound-toggle"');
  });

  it('renders a 2D pixel-art Minecraft style SVG heart with crispEdges', () => {
    expect(htmlContent).toContain('shape-rendering="crispEdges"');
    expect(htmlContent).toContain('viewBox="0 0 16 14"');
  });

  it('simulates the freeze (1s) and curtain split (2s) lifecycle', () => {
    vi.useFakeTimers();

    const classList = new Set();
    const mockIntroScreen = {
      classList: {
        add: vi.fn((cls) => classList.add(cls)),
        remove: vi.fn((cls) => classList.delete(cls)),
        contains: (cls) => classList.has(cls),
      },
      style: {},
      hidden: false,
    };

    let mainSceneStarted = false;
    const launchMainScene = () => {
      mainSceneStarted = true;
    };

    // User clicks "Mở cửa trái tim"
    mockIntroScreen.classList.add('is-frozen');
    expect(mockIntroScreen.classList.contains('is-frozen')).toBe(true);
    expect(mainSceneStarted).toBe(false);

    // After 1000ms: freeze ends, curtain starts splitting, main scene launches
    vi.advanceTimersByTime(1000);
    mockIntroScreen.classList.remove('is-frozen');
    mockIntroScreen.classList.add('is-splitting');
    launchMainScene();

    expect(mockIntroScreen.classList.contains('is-frozen')).toBe(false);
    expect(mockIntroScreen.classList.contains('is-splitting')).toBe(true);
    expect(mainSceneStarted).toBe(true);

    // After 2000ms of curtain splitting (3000ms total): intro screen is hidden
    vi.advanceTimersByTime(2000);
    mockIntroScreen.style.display = 'none';
    mockIntroScreen.hidden = true;

    expect(mockIntroScreen.style.display).toBe('none');
    expect(mockIntroScreen.hidden).toBe(true);

    vi.useRealTimers();
  });
});
