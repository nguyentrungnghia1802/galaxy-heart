import * as THREE from 'three';
import { CameraSystem } from '../scene/CameraSystem.js';
import { createHeartAnchors } from '../heart/HeartSurface.js';
import { HeartSystem } from '../heart/HeartSystem.js';
import { PetalSystem } from '../petals/PetalSystem.js';
import { GemSystem } from '../gem/GemSystem.js';
import { LoveTextSystem } from '../text/LoveTextSystem.js';
import { PostProcessing } from '../fx/PostProcessing.js';
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
    this.lightingSystem =
      options.lightingSystem ?? sceneBundle.lightingSystem ?? null;
    this.cameraSystem =
      options.cameraSystem ??
      new CameraSystem(this.camera, { windowTarget: this.windowTarget });

    this.rendererSystem =
      options.rendererSystem ??
      new RendererSystem({
        container,
        profile: this.qualityProfile,
        devicePixelRatio: capabilities.dpr,
      });

    this.postProcessing =
      options.postProcessing ??
      (this.qualityProfile.bloomScale > 0 &&
      this.rendererSystem?.renderer?.capabilities !== undefined
        ? new PostProcessing({
            renderer: this.rendererSystem.renderer,
            scene: this.scene,
            camera: this.camera,
            profile: this.qualityProfile,
            width: capabilities.viewportWidth,
            height: capabilities.viewportHeight,
          })
        : null);

    const anchors = createHeartAnchors({
      count: this.qualityProfile.petalCount,
      seed: options.heartSeed ?? 1234,
    });
    this.petalSystem = new PetalSystem({
      count: anchors.length,
      seed: options.explosionSeed ?? 0x50455441,
    });
    this.petalSystem.attachToHeart(anchors);
    this.petalSystem.material.emissive.setHex(0x4a0414);
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

    this.gemSystem =
      options.gemSystem ?? new GemSystem({ seed: options.gemSeed });
    this.scene.add(this.gemSystem.group);

    this.loveTextSystem =
      options.loveTextSystem ?? new LoveTextSystem();
    this.scene.add(this.loveTextSystem.group);

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2(-999, -999);
    this.continuousEndLoop = options.continuousEndLoop ?? true;

    this.handleStateEnter = this.handleStateEnter.bind(this);
    this.handleStateExit = this.handleStateExit.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
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

  handlePointerMove(event) {
    if (!event || typeof event.clientX !== 'number') return;
    const width = this.container.clientWidth || this.windowTarget?.innerWidth || 1;
    const height = this.container.clientHeight || this.windowTarget?.innerHeight || 1;
    const nx = (event.clientX / width) * 2 - 1;
    const ny = (event.clientY / height) * 2 - 1;
    this.cameraSystem?.onPointer(nx, ny);

    this.mouseNDC.x = nx;
    this.mouseNDC.y = -ny;
    this.updateGemHover();
  }

  handleTouchMove(event) {
    if (!event?.touches || event.touches.length === 0) return;
    const touch = event.touches[0];
    const width = this.container.clientWidth || this.windowTarget?.innerWidth || 1;
    const height = this.container.clientHeight || this.windowTarget?.innerHeight || 1;
    const nx = (touch.clientX / width) * 2 - 1;
    const ny = (touch.clientY / height) * 2 - 1;
    this.cameraSystem?.onPointer(nx, ny);

    this.mouseNDC.x = nx;
    this.mouseNDC.y = -ny;
    this.updateGemHover();
  }

  updateGemHover() {
    if (!this.gemSystem?.hitMesh || !this.camera) return;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObject(this.gemSystem.hitMesh, false);
    const isHovered = intersects.length > 0;
    this.gemSystem.setHovered(isHovered);

    if (this.container?.style) {
      this.container.style.cursor = isHovered ? 'pointer' : 'default';
    }
  }

  handleClick(event) {
    if (!this.gemSystem?.hitMesh || !this.camera) return;
    let clientX = event.clientX;
    let clientY = event.clientY;
    if (typeof clientX !== 'number' && event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    if (typeof clientX === 'number') {
      const width = this.container.clientWidth || this.windowTarget?.innerWidth || 1;
      const height = this.container.clientHeight || this.windowTarget?.innerHeight || 1;
      this.mouseNDC.x = (clientX / width) * 2 - 1;
      this.mouseNDC.y = -(clientY / height) * 2 + 1;
    }

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObject(this.gemSystem.hitMesh, false);
    if (intersects.length > 0) {
      this.onGemInteracted();
    }
  }

  onGemInteracted() {
    const currentState = this.stateMachine.state;
    if (
      currentState === 'GEM_IDLE' ||
      currentState === 'PETAL_FLIGHT'
    ) {
      this.gemSystem.triggerBurst();
      this.stateMachine.transitionTo('GEM_BURST');
    }
  }

  start() {
    if (this.running || this.disposed) {
      return;
    }

    if (!this.lifecycleStarted) {
      this.windowTarget.addEventListener?.('resize', this.handleResize);
      this.windowTarget.addEventListener?.('pointermove', this.handlePointerMove, {
        passive: true,
      });
      this.windowTarget.addEventListener?.('touchmove', this.handleTouchMove, {
        passive: true,
      });
      this.windowTarget.addEventListener?.('click', this.handleClick);
      this.windowTarget.addEventListener?.('touchstart', this.handleClick, {
        passive: true,
      });
      this.replayButton?.addEventListener?.('click', this.handleReplay);
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
    this.gemSystem?.update(dt, this.stateSnapshot);
    this.loveTextSystem?.update(dt, this.stateSnapshot);
    this.updatePlaceholderSystems(dt);
    if (this.postProcessing?.enabled) {
      this.postProcessing.update(dt, this.stateSnapshot);
      this.postProcessing.render();
    } else {
      this.rendererSystem.render(this.scene, this.camera);
    }
    this.updateDebugMetrics(now);

    if (this.stateMachine.state === 'END' && !this.continuousEndLoop) {
      this.running = false;
      return;
    }
    this.scheduleFrame();
  }

  updatePlaceholderSystems(dt = 0.016) {
    const { state, progress, heartbeatIntensity } = this.stateSnapshot;
    this.petalSystem.material.emissiveIntensity =
      0.16 + Math.min(2, heartbeatIntensity) * 0.32;

    if (this.lightingSystem) {
      this.lightingSystem.update(dt, this.stateSnapshot);
    } else if (this.keyLight) {
      this.keyLight.intensity = 3.2 + Math.min(2, heartbeatIntensity) * 0.9;
    }

    if (this.cameraSystem) {
      this.cameraSystem.update(dt, this.stateSnapshot);
    } else {
      if (state === 'TENSION') {
        this.camera.position.z = this.cameraBaseZ - progress * 0.14;
      } else if (state === 'EXPLOSION') {
        this.camera.position.z = this.cameraBaseZ - (1 - progress) * 0.14;
      } else {
        this.camera.position.z = this.cameraBaseZ;
      }
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
    if (state === 'GEM_BURST') {
      this.gemSystem?.triggerBurst();
    }
    if (state === 'LOVE_REVEAL') {
      this.loveTextSystem?.reveal();
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
    this.cameraSystem?.resize(width, height);
    this.postProcessing?.resize(width, height);
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
    this.gemSystem?.reset();
    this.loveTextSystem?.reset();
    this.lightingSystem?.reset();
    this.cameraSystem?.reset();
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
      this.windowTarget.removeEventListener?.('resize', this.handleResize);
      this.windowTarget.removeEventListener?.('pointermove', this.handlePointerMove);
      this.windowTarget.removeEventListener?.('touchmove', this.handleTouchMove);
      this.windowTarget.removeEventListener?.('click', this.handleClick);
      this.windowTarget.removeEventListener?.('touchstart', this.handleClick);
      this.replayButton?.removeEventListener?.('click', this.handleReplay);
    }
    this.gemSystem?.dispose();
    this.loveTextSystem?.dispose();
    this.petalSystem.dispose();
    this.postProcessing?.dispose();
    this.rendererSystem.dispose();
    this.disposed = true;
  }
}
