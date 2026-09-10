import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App.js';
import { MusicSystem } from '../src/music/MusicSystem.js';
import { MUSIC_REVEAL_CONFIG } from '../src/config/musicReveal.js';

function createMockElement(tagName = 'div') {
  const children = [];
  const classes = new Set();
  return {
    tagName,
    className: '',
    style: {},
    dataset: {},
    children,
    classList: {
      add: vi.fn((cls) => classes.add(cls)),
      remove: vi.fn((cls) => classes.delete(cls)),
      contains: vi.fn((cls) => classes.has(cls)),
    },
    append(...nodes) {
      children.push(...nodes);
    },
    remove() {
      this.removed = true;
    },
    setAttribute(name, val) {
      this[name] = String(val);
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(() => null),
  };
}

function createMockDocument() {
  return {
    createElement(tag) {
      return createMockElement(tag);
    },
    querySelector: vi.fn(() => null),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

class FakeAudio extends EventTarget {
  currentTime = 0;
  duration = 24.25;
  paused = false;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
}

function createTestApp(options = {}) {
  const container = createMockElement('div');
  const doc = createMockDocument();
  const replayButton = createMockElement('button');
  replayButton.hidden = true;
  const fakeAudio = new FakeAudio();
  const musicSystem = new MusicSystem(
    { src: 'test.mp3', volume: 0.49, endTime: 24.25 },
    { createAudio: () => fakeAudio }
  );
  const windowTarget = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const rendererSystem = {
    canvas: { dataset: {} },
    render: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const app = new App(container, {
    documentTarget: doc,
    windowTarget,
    rendererSystem,
    replayButton,
    musicSystem,
    requestFrame: vi.fn(() => 1),
    cancelFrame: vi.fn(),
    musicConfig: {
      ...MUSIC_REVEAL_CONFIG,
      music: { src: 'test.mp3', volume: 0.49, endTime: 24.25 },
      ending: {
        fadeDuration: 3.65,
        captionEnd: 23.95,
        musicEnd: 24.25,
      },
    },
    ...options,
  });
  return { app, container, doc, replayButton, fakeAudio, musicSystem };
}

describe('Ending Sequence & Cinematic Blackout', () => {
  it('mounts the cinematic-ending-overlay in container with initial hidden state', () => {
    const { app } = createTestApp();

    expect(app.endingOverlay).toBeDefined();
    expect(app.endingOverlay.className).toBe('cinematic-ending-overlay');
    expect(app.endingOverlay.style.opacity).toBe('0');
    expect(app.endingOverlay.style.display).toBe('none');

    app.dispose();
    expect(app.endingOverlay.removed).toBe(true);
  });

  it('keeps overlay hidden before fade start, smoothly darkens towards captionEnd, and reaches pure black', () => {
    const { app, fakeAudio } = createTestApp();

    // Enter MUSIC_REVEAL state
    app.stateMachine.start();
    app.stateMachine.transitionTo('MUSIC_REVEAL');

    // Before fade start: t = 18.0s (fadeStart is 24.25 - 3.65 = 20.60s)
    fakeAudio.currentTime = 18.0;
    app.updateEndingSequence();
    expect(app.endingOverlay.style.opacity).toBe('0');
    expect(app.endingOverlay.style.display).toBe('none');

    // Midway through fade: t = 22.30s (when final phrase "you and I" begins)
    fakeAudio.currentTime = 22.30;
    app.updateEndingSequence();
    expect(app.endingOverlay.style.display).toBe('block');
    const midwayOpacity = Number.parseFloat(app.endingOverlay.style.opacity);
    expect(midwayOpacity).toBeGreaterThan(0.15);
    expect(midwayOpacity).toBeLessThan(0.60); // Still gentle enough to easily read the caption!

    // Near caption end: t = 23.60s
    fakeAudio.currentTime = 23.60;
    app.updateEndingSequence();
    const lateOpacity = Number.parseFloat(app.endingOverlay.style.opacity);
    expect(lateOpacity).toBeGreaterThan(0.70);
    expect(lateOpacity).toBeLessThan(1.0);

    // At caption end: t = 23.95s -> 100% full black!
    fakeAudio.currentTime = 23.95;
    app.updateEndingSequence();
    expect(app.endingOverlay.style.opacity).toBe('1');

    // At music end: t = 24.25s -> stops music and enters FINAL
    const spyStop = vi.spyOn(app.musicSystem, 'stop');
    fakeAudio.currentTime = 24.25;
    app.updateEndingSequence();
    expect(spyStop).toHaveBeenCalled();
    expect(app.stateMachine.state).toBe('FINAL');
    expect(app.endingOverlay.style.opacity).toBe('1');
    expect(app.endingOverlay.style.display).toBe('block');
    expect(app.endingOverlay.style.pointerEvents).toBe('auto');

    app.dispose();
  });

  it('smoothly reduces music volume towards zero as scene darkens', () => {
    const { app, fakeAudio } = createTestApp();

    app.stateMachine.start();
    app.stateMachine.transitionTo('MUSIC_REVEAL');
    app.musicSystem.status = 'playing';
    const spyFadeTo = vi.spyOn(app.musicSystem, 'fadeTo');

    // At t = 22.0s
    fakeAudio.currentTime = 22.0;
    app.updateEndingSequence();
    expect(spyFadeTo).toHaveBeenCalled();
    const midVol = spyFadeTo.mock.calls.at(-1)[0];
    expect(midVol).toBeLessThan(0.49);
    expect(midVol).toBeGreaterThan(0.2);

    // At t = 24.0s (near end)
    fakeAudio.currentTime = 24.0;
    app.updateEndingSequence();
    const lateVol = spyFadeTo.mock.calls.at(-1)[0];
    expect(lateVol).toBeLessThan(0.15);
    expect(lateVol).toBeGreaterThanOrEqual(0.0);

    app.dispose();
  });

  it('locks in fullscreen black with no buttons or restart on FINAL state', () => {
    const { app, replayButton } = createTestApp();

    app.stateMachine.start();
    app.stateMachine.transitionTo('FINAL');
    app.updateEndingSequence();

    expect(app.endingOverlay.style.opacity).toBe('1');
    expect(app.endingOverlay.style.display).toBe('block');
    expect(app.endingOverlay.style.pointerEvents).toBe('auto');
    expect(replayButton.hidden).toBe(true);

    app.dispose();
  });
});
