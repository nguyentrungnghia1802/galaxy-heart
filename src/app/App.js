import { createHeartAnchors } from '../heart/HeartSurface.js';
import { HeartSystem } from '../heart/HeartSystem.js';
import { PetalSystem } from '../petals/PetalSystem.js';
import { createScene } from '../scene/createScene.js';
import { RendererSystem } from '../scene/RendererSystem.js';
import { VisibilityClock } from '../utils/visibility.js';
import { QualityManager, readBrowserCapabilities } from './QualityManager.js';
import { StateMachine } from './StateMachine.js';

export class App {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('App requires a mount container.');
    }

    this.container = container;
    this.documentTarget = options.documentTarget ?? globalThis.document;
    this.windowTarget = options.windowTarget ?? globalThis.window;
    this.replayButton =
      options.replayButton ?? this.documentTarget?.querySelector?.('#replay');
    this.loadingElement =
      options.loadingElement ?? this.documentTarget?.querySelector?.('#loading');
    this.requestFrame =
      options.requestFrame ??
      this.windowTarget.requestAnimationFrame.bind(this.windowTarget);
    this.cancelFrame =
      options.cancelFrame ??
      this.windowTarget.cancelAnimationFrame.bind(this.windowTarget);
    this.onStateEnter = options.onStateEnter ?? null;
    this.onStateExit = options.onStateExit ?? null;

    this.qualityManager = options.qualityManager ?? new QualityManager();
    const capabilities =
      options.capabilities ??
      readBrowserCapabilities(this.windowTarget, globalThis.navigator);
    this.qualityProfile =
      options.qualityProfile ?? this.qualityManager.detect(capabilities);

    const sceneBundle = options.sceneBundle ?? createScene();
    this.scene = sceneBundle.scene;
    this.camera = sceneBundle.camera;
    this.keyLight = sceneBundle.keyLight;
    this.cameraBaseZ = this.camera.position.z;

    this.rendererSystem =
      options.rendererSystem ??
      new RendererSystem({
        container,
        profile: this.qualityProfile,
        devicePixelRatio: capabilities.dpr,
      });

    const anchors = createHeartAnchors({
      count: this.qualityProfile.petalCount,
      seed: options.heartSeed ?? 1234,
    });
    this.petalSystem = new PetalSystem({
      count: anchors.length,
      seed: options.explosionSeed ?? 0x50455441,
    });
    this.petalSystem.attachToHeart(anchors);
    this.petalSystem.material.emissive.setHex(0x32000d);
    this.scene.add(this.petalSystem.mesh);

    this.heartSystem = new HeartSystem();
    this.stateSnapshot = {
      state: 'BOOT',
      progress: 0,
      heartScale: 1,
      heartbeatIntensity: 0,
      explosionParams: Object.freeze({
        foregroundRatio: this.qualityProfile.foregroundRatio,
      }),
      flightParams: undefined,
    };

    this.handleStateEnter = this.handleStateEnter.bind(this);
    this.handleStateExit = this.handleStateExit.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleReplay = this.handleReplay.bind(this);
    this.renderFrame = this.renderFrame.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleResume = this.handleResume.bind(this);

    this.stateMachine = new StateMachine({
      durations: options.durations,
      onEnter: this.handleStateEnter,
      onExit: this.handleStateExit,
    });
    this.visibilityClock = new VisibilityClock({
      target: this.documentTarget,
      maxDt: options.maxDt ?? 0.05,
      onPause: this.handlePause,
      onResume: this.handleResume,
    });

    this.frameId = null;
    this.running = false;
    this.lifecycleStarted = false;
    this.disposed = false;
    this.lastDebugState = null;
    this.debugStartedAt = null;
    this.debugFrameCount = 0;
  }

  start() {
    if (this.running || this.disposed) {
      return;
    }

    if (!this.lifecycleStarted) {
      this.windowTarget.addEventListener('resize', this.handleResize);
      this.replayButton?.addEventListener('click', this.handleReplay);
      this.visibilityClock.start();
      this.lifecycleStarted = true;
    }

    this.handleResize();
    this.running = true;
    this.stateMachine.start();
    if (!this.visibilityClock.paused) {
      this.scheduleFrame();
    }
  }

  scheduleFrame() {
    if (this.frameId === null && this.running && !this.visibilityClock.paused) {
      this.frameId = this.requestFrame(this.renderFrame);
    }
  }

  renderFrame(now) {
    this.frameId = null;
    if (!this.running || this.visibilityClock.paused) {
      return;
    }

    const dt = this.visibilityClock.tick(now);
    this.stateMachine.update(dt);

    this.stateSnapshot.state = this.stateMachine.state;
    this.stateSnapshot.progress = this.stateMachine.progress;
    this.heartSystem.update(dt, this.stateSnapshot);
    this.stateSnapshot.heartScale = this.heartSystem.getGlobalScale();
    this.stateSnapshot.heartbeatIntensity = this.heartSystem.getIntensity();
    this.petalSystem.update(dt, this.stateSnapshot);
    this.updatePlaceholderSystems();
    this.rendererSystem.render(this.scene, this.camera);
    this.updateDebugMetrics(now);

    if (this.stateMachine.state === 'END') {
      this.running = false;
      return;
    }
    this.scheduleFrame();
  }

  updatePlaceholderSystems() {
    const { state, progress, heartbeatIntensity } = this.stateSnapshot;
    this.petalSystem.material.emissiveIntensity =
      0.08 + Math.min(2, heartbeatIntensity) * 0.24;
    this.keyLight.intensity = 3.2 + Math.min(2, heartbeatIntensity) * 0.9;

    if (state === 'TENSION') {
      this.camera.position.z = this.cameraBaseZ - progress * 0.14;
    } else if (state === 'EXPLOSION') {
      this.camera.position.z = this.cameraBaseZ - (1 - progress) * 0.14;
    } else {
      this.camera.position.z = this.cameraBaseZ;
    }
  }

  updateDebugMetrics(now) {
    if (!import.meta.env.DEV) {
      return;
    }
    if (this.debugStartedAt === null) {
      this.debugStartedAt = now;
    }
    this.debugFrameCount += 1;
    if (this.lastDebugState === this.stateMachine.state) return;

    const dataset = this.rendererSystem.canvas?.dataset;
    if (!dataset) {
      return;
    }

    dataset.state = this.stateMachine.state;
    dataset.progress = this.stateMachine.progress.toFixed(3);
    dataset.instanceCount = String(this.petalSystem.mesh.count);
    dataset.explosionCount = String(this.petalSystem.explosionCount);
    const drawCalls = this.rendererSystem.renderer?.info?.render?.calls;
    if (typeof drawCalls === 'number') {
      dataset.drawCalls = String(drawCalls);
    }
    if (this.stateMachine.state === 'END' && now > this.debugStartedAt) {
      const elapsedSeconds = (now - this.debugStartedAt) / 1_000;
      dataset.averageFps = (
        this.debugFrameCount / elapsedSeconds
      ).toFixed(1);
      dataset.frameCount = String(this.debugFrameCount);
    }
    this.lastDebugState = this.stateMachine.state;
  }

  handleStateEnter(state, previousState) {
    if (state === 'PRELOAD' && this.loadingElement) {
      this.loadingElement.hidden = false;
    }
    if (state === 'INTRO' && this.loadingElement) {
      this.loadingElement.hidden = true;
    }
    if (state === 'EXPLOSION') {
      this.petalSystem.triggerExplosion(this.stateSnapshot.explosionParams);
    }
    if (state === 'END' && this.replayButton) {
      this.replayButton.hidden = false;
    }
    this.onStateEnter?.(state, previousState);
  }

  handleStateExit(state, nextState) {
    this.onStateExit?.(state, nextState);
  }

  handlePause() {
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
  }

  handleResume() {
    this.scheduleFrame();
  }

  handleResize() {
    const width = this.container.clientWidth || this.windowTarget.innerWidth || 1;
    const height =
      this.container.clientHeight || this.windowTarget.innerHeight || 1;
    this.rendererSystem.resize(width, height, this.camera);
  }

  handleReplay() {
    this.replay();
  }

  replay() {
    if (this.disposed) {
      return;
    }

    if (this.replayButton) {
      this.replayButton.hidden = true;
    }
    this.heartSystem.reset();
    this.petalSystem.reset();
    this.stateMachine.reset();
    this.visibilityClock.reset();
    this.camera.position.z = this.cameraBaseZ;
    this.lastDebugState = null;
    this.debugStartedAt = null;
    this.debugFrameCount = 0;
    this.running = true;
    this.stateMachine.start();
    this.scheduleFrame();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.running = false;
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
    if (this.lifecycleStarted) {
      this.visibilityClock.stop();
      this.windowTarget.removeEventListener('resize', this.handleResize);
      this.replayButton?.removeEventListener('click', this.handleReplay);
    }
    this.petalSystem.dispose();
    this.rendererSystem.dispose();
    this.disposed = true;
  }
}
