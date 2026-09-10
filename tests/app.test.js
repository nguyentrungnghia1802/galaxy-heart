import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../src/app/App.js';
import { DEFAULT_STATE_DURATIONS } from '../src/app/StateMachine.js';
import { createScene } from '../src/scene/createScene.js';
import { RendererSystem } from '../src/scene/RendererSystem.js';
import { MUSIC_REVEAL_CONFIG } from '../src/config/musicReveal.js';

class FakeDocument extends EventTarget {
  constructor() {
    super();
    this.hidden = false;
  }

  setHidden(hidden) {
    this.hidden = hidden;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

class FakeWindow extends EventTarget {
  constructor() {
    super();
    this.innerWidth = 800;
    this.innerHeight = 600;
    this.devicePixelRatio = 2;
  }
}

class FakeButton extends EventTarget {
  constructor() {
    super();
    this.hidden = true;
  }
}

function createFrameScheduler() {
  let nextId = 1;
  const callbacks = new Map();
  return {
    request(callback) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
    },
    step(time) {
      const entry = callbacks.entries().next().value;
      if (!entry) throw new Error('No scheduled frame to execute.');
      callbacks.delete(entry[0]);
      entry[1](time);
    },
    get size() {
      return callbacks.size;
    },
  };
}

function createFastDurations() {
  return {
    ...DEFAULT_STATE_DURATIONS,
    PRELOAD: 0,
    INTRO: 0.01,
    HEART_IDLE: 0.01,
    HEARTBEAT: 0.02,
    RAPID_HEARTBEAT: 0.02,
    TENSION: 0.01,
    EXPLOSION: 0.01,
    PETAL_FLIGHT: 0.03,
    GEM_IDLE: 0.02,
    GEM_ACTIVATION: 0.02,
    MUSIC_REVEAL: 0.02,
  };
}

function createHarness({ durations = createFastDurations() } = {}) {
  const documentTarget = new FakeDocument();
  const windowTarget = new FakeWindow();
  const scheduler = createFrameScheduler();
  const replayButton = new FakeButton();
  const loadingElement = { hidden: false };
  const container = { clientWidth: 800, clientHeight: 600 };
  const rendererSystem = {
    canvas: { dataset: {} },
    render: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const entered = [];
  const app = new App(container, {
    capabilities: {
      viewportWidth: 800,
      viewportHeight: 600,
      dpr: 1,
    },
    qualityProfile: Object.freeze({
      name: 'test',
      petalCount: 8,
      dprCap: 1,
      bloomScale: 0,
      bloomIntensity: 0,
      foregroundRatio: 0.08,
      flutterEnabled: false,
    }),
    durations,
    // Core lifecycle harness is intentionally media-free; browser QA uses heart.mp3.
    musicConfig: { ...MUSIC_REVEAL_CONFIG, music: { src: '' } },
    continuousEndLoop: false,
    documentTarget,
    windowTarget,
    replayButton,
    loadingElement,
    rendererSystem,
    requestFrame: (callback) => scheduler.request(callback),
    cancelFrame: (id) => scheduler.cancel(id),
    onStateEnter: (state) => entered.push(state),
  });

  return {
    app,
    container,
    documentTarget,
    entered,
    loadingElement,
    rendererSystem,
    replayButton,
    scheduler,
    windowTarget,
  };
}

function runToEnd(harness, startTime = 0) {
  let now = startTime;
  let frames = 0;
  while (harness.scheduler.size > 0 && frames < 100) {
    harness.scheduler.step(now);
    now += 16;
    frames += 1;
  }
  if (frames === 100) throw new Error('Timeline did not reach FINAL.');
  return now;
}

describe('createScene', () => {
  it('creates a perspective scene bundle with placeholder lighting', () => {
    const bundle = createScene();

    expect(bundle.scene).toBeInstanceOf(THREE.Scene);
    expect(bundle.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(bundle.camera.position.z).toBe(5);
    expect(bundle.keyLight).toBeInstanceOf(THREE.DirectionalLight);
  });
});

describe('RendererSystem', () => {
  it('caps DPR and resizes renderer plus camera without stretching', () => {
    const canvas = { dataset: {}, setAttribute: vi.fn(), remove: vi.fn() };
    const renderer = {
      domElement: canvas,
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    };
    const container = { append: vi.fn() };
    const system = new RendererSystem({
      container,
      profile: { dprCap: 1.5 },
      devicePixelRatio: 3,
      renderer,
    });
    const camera = new THREE.PerspectiveCamera();

    system.resize(900, 600, camera);

    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace);
    expect(renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(renderer.toneMappingExposure).toBeGreaterThanOrEqual(0.8);
    expect(renderer.toneMappingExposure).toBeLessThanOrEqual(1);
    expect(renderer.setSize).toHaveBeenCalledWith(900, 600, false);
    expect(camera.aspect).toBe(1.5);
    system.render(new THREE.Scene(), camera);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    system.dispose();
    expect(canvas.remove).toHaveBeenCalledTimes(1);
  });
});

describe('App core integration', () => {
  it('runs the required state flow and dispatches one explosion', () => {
    const harness = createHarness();
    const mesh = harness.app.petalSystem.mesh;
    harness.app.start();

    runToEnd(harness);

    expect(harness.entered).toEqual([
      'PRELOAD',
      'INTRO',
      'HEART_IDLE',
      'HEARTBEAT',
      'RAPID_HEARTBEAT',
      'TENSION',
      'EXPLOSION',
      'PETAL_FLIGHT',
      'GEM_IDLE',
      'GEM_ACTIVATION',
      'MUSIC_REVEAL',
      'FINAL',
    ]);
    expect(harness.app.stateMachine.state).toBe('FINAL');
    expect(harness.app.petalSystem.explosionCount).toBe(1);
    expect(harness.app.petalSystem.mesh).toBe(mesh);
    expect(harness.app.gemSystem).toBeDefined();
    expect(harness.app.captionRenderer).toBeDefined();
    expect(harness.app.soundSystem).toBeDefined();
    expect(harness.replayButton.hidden).toBe(true);
    expect(harness.loadingElement.hidden).toBe(true);
    expect(harness.rendererSystem.render).toHaveBeenCalled();
    harness.app.dispose();
  });

  it('ignores duplicate clicks and replay after activation without duplicating scene objects', () => {
    const harness = createHarness();
    const mesh = harness.app.petalSystem.mesh;
    harness.app.start();
    harness.app.stateMachine.transitionTo('GEM_IDLE');
    harness.app.onGemInteracted();
    harness.app.onGemInteracted();
    runToEnd(harness);
    for (let n = 0; n < 10; n++) {
      harness.app.replay();
      harness.app.onGemInteracted();
      expect(harness.app.stateMachine.state).toBe('FINAL');
    }
    expect(harness.entered.filter(state => state === 'GEM_ACTIVATION')).toHaveLength(1);
    expect(harness.app.gemSystem.gemBurst.active).toBe(false);
    expect(harness.app.petalSystem.mesh).toBe(mesh);
    expect(harness.app.petalSystem.explosionCount).toBe(1);
    harness.app.dispose();
  });

  it('pauses RAF while hidden and drops the resume-sized delta', () => {
    const harness = createHarness({
      durations: {
        ...createFastDurations(),
        INTRO: 2,
      },
    });
    harness.app.start();
    harness.scheduler.step(1_000);
    harness.scheduler.step(1_016);
    const progressBeforeHide = harness.app.stateMachine.progress;

    harness.documentTarget.setHidden(true);
    expect(harness.scheduler.size).toBe(0);
    harness.documentTarget.setHidden(false);
    expect(harness.scheduler.size).toBe(1);
    harness.scheduler.step(31_000);

    expect(harness.app.stateMachine.state).toBe('INTRO');
    expect(harness.app.stateMachine.progress).toBe(progressBeforeHide);
    harness.app.dispose();
  });

  it('resizes through RendererSystem and disposes every lifecycle owner', () => {
    const harness = createHarness();
    harness.app.start();
    expect(harness.rendererSystem.resize).toHaveBeenLastCalledWith(
      800,
      600,
      harness.app.camera,
    );

    harness.container.clientWidth = 390;
    harness.container.clientHeight = 844;
    harness.windowTarget.dispatchEvent(new Event('resize'));
    expect(harness.rendererSystem.resize).toHaveBeenLastCalledWith(
      390,
      844,
      harness.app.camera,
    );

    harness.app.dispose();
    expect(harness.rendererSystem.dispose).toHaveBeenCalledTimes(1);
    expect(harness.scheduler.size).toBe(0);
  });

  it('transitions to GEM_ACTIVATION when gem is interacted with in GEM_IDLE without any sounds', () => {
    const harness = createHarness();
    harness.app.start();
    harness.app.stateMachine.transitionTo('GEM_IDLE');

    harness.app.onGemInteracted();

    expect(harness.app.stateMachine.state).toBe('GEM_ACTIVATION');
    harness.app.dispose();
  });
});

