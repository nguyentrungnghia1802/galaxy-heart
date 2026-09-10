import * as THREE from 'three';
import { CameraSystem } from '../scene/CameraSystem.js';
import { createHeartAnchors } from '../heart/HeartSurface.js';
import { HeartSystem } from '../heart/HeartSystem.js';
import { PetalSystem } from '../petals/PetalSystem.js';
import { GemSystem } from '../gem/GemSystem.js';
import { MusicSystem } from '../music/MusicSystem.js';
import { CaptionRenderer } from '../captions/CaptionRenderer.js';
import { MUSIC_REVEAL_CONFIG } from '../config/musicReveal.js';
import { GemInteractionHint } from '../gem/GemInteractionHint.js';
import { SoundSystem } from '../audio/SoundSystem.js';
import { PostProcessing } from '../fx/PostProcessing.js';
import { createScene } from '../scene/createScene.js';
import { RendererSystem } from '../scene/RendererSystem.js';
import { VisibilityClock } from '../utils/visibility.js';
import { QualityManager, readBrowserCapabilities } from './QualityManager.js';
import { StateMachine } from './StateMachine.js';
import { clamp } from '../utils/math.js';

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
      options.gemSystem ?? new GemSystem({
        seed: options.gemSeed,
        activation: (options.musicConfig ?? MUSIC_REVEAL_CONFIG).activation,
        hintDelay: (options.musicConfig ?? MUSIC_REVEAL_CONFIG).gemHint?.delay,
      });
    this.scene.add(this.gemSystem.group);

    this.soundSystem = options.soundSystem ?? new SoundSystem();
    this.musicConfig = options.musicConfig ?? MUSIC_REVEAL_CONFIG;
    this.musicSystem = options.musicSystem ?? new MusicSystem(this.musicConfig.music, {
      getContext: () => this.soundSystem.ensureContext(),
    });
    this.captionRenderer = options.captionRenderer ?? new CaptionRenderer(
      container, { ...this.musicConfig, debug: options.captionDebug ?? false }, this.documentTarget,
    );
    this.gemHint = options.gemHint ?? new GemInteractionHint(
      container,
      this.musicConfig.gemHint ?? {},
      this.documentTarget,
    );
    this.sequenceActivated = false;
    this.resumeMusic = false;
    this.musicResumeButton = this.documentTarget?.createElement?.('button');
    this.handleMusicResume = () => {
      this.soundSystem.unlock();
      this.musicSystem.play();
    };
    if (this.musicResumeButton) {
      this.musicResumeButton.className = 'music-resume';
      this.musicResumeButton.textContent = 'Continue music';
      this.musicResumeButton.hidden = true;
      this.musicResumeButton.addEventListener('click', this.handleMusicResume);
      container.append(this.musicResumeButton);
    }

    this.endingConfig = this.musicConfig.ending ?? {
      fadeDuration: 3.65,
      captionEnd: 23.95,
      musicEnd: 24.25,
    };
    this.endingOverlay = this.documentTarget?.createElement?.('div');
    if (this.endingOverlay) {
      this.endingOverlay.className = 'cinematic-ending-overlay';
      this.endingOverlay.setAttribute('aria-hidden', 'true');
      this.endingOverlay.style.opacity = '0';
      this.endingOverlay.style.display = 'none';
      this.endingOverlay.style.pointerEvents = 'none';
      container.append?.(this.endingOverlay);
    }

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
      durations: { GEM_ACTIVATION: this.musicConfig.activation.duration, ...options.durations },
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
    const isHovered = this.stateMachine.state === 'GEM_IDLE' && intersects.length > 0;
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
    if (this.stateMachine.state !== 'GEM_IDLE' || this.sequenceActivated) return;
    this.sequenceActivated = true;
    this.gemHint?.hide();
    this.soundSystem.unlock();
    this.musicSystem.arm();
    this.gemSystem?.triggerHeartStream(this.camera);
    this.stateMachine.triggerGemClick();
    if (this.container.style) this.container.style.cursor = 'default';
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
    this.gemSystem?.update(dt, this.stateSnapshot, this.camera);
    this.gemHint?.update(this.stateSnapshot, this.gemSystem, this.camera);
    this.musicSystem.update();
    if (this.stateMachine.state === 'MUSIC_REVEAL' && this.musicSystem.finished) {
      this.stateMachine.completeMusic();
    }
    this.captionRenderer.update(this.musicSystem.currentTime,
      this.stateMachine.state === 'MUSIC_REVEAL' &&
      ['playing', 'paused'].includes(this.musicSystem.status));
    if (this.musicResumeButton) this.musicResumeButton.hidden =
      this.stateMachine.state !== 'MUSIC_REVEAL' || this.musicSystem.status !== 'blocked';
    this.updateEndingSequence();
    this.soundSystem?.update(dt, this.stateSnapshot, this.heartSystem);
    this.updatePlaceholderSystems(dt);
    if (this.postProcessing?.enabled) {
      this.postProcessing.update(dt, this.stateSnapshot);
      this.postProcessing.render();
    } else {
      this.rendererSystem.render(this.scene, this.camera);
    }
    this.updateDebugMetrics(now);

    if (this.stateMachine.state === 'FINAL' && !this.continuousEndLoop) {
      this.running = false;
      return;
    }
    this.scheduleFrame();
  }

  updateEndingSequence() {
    const state = this.stateMachine.state;

    if (state === 'FINAL') {
      if (this.endingOverlay) {
        this.endingOverlay.style.display = 'block';
        this.endingOverlay.style.opacity = '1';
        this.endingOverlay.style.pointerEvents = 'auto';
      }
      if (this.replayButton) {
        this.replayButton.hidden = true;
      }
      return;
    }

    if (state !== 'MUSIC_REVEAL') {
      if (this.endingOverlay && this.endingOverlay.style.opacity !== '0') {
        this.endingOverlay.style.opacity = '0';
        this.endingOverlay.style.display = 'none';
        this.endingOverlay.style.pointerEvents = 'none';
      }
      return;
    }

    const currentTime = this.musicSystem.currentTime;
    const baseVolume = this.musicConfig.music?.volume ?? 0.7;
    const musicEnd = this.endingConfig.musicEnd ?? 24.25;
    const captionEnd = this.endingConfig.captionEnd ?? 23.95;
    const fadeDuration = this.endingConfig.fadeDuration ?? 3.65;
    const fadeStart = Math.max(0, musicEnd - fadeDuration);

    if (currentTime < fadeStart) {
      if (this.endingOverlay && this.endingOverlay.style.opacity !== '0') {
        this.endingOverlay.style.opacity = '0';
        this.endingOverlay.style.display = 'none';
        this.endingOverlay.style.pointerEvents = 'none';
      }
      return;
    }

    // 1. Visual Fade: begins at fadeStart (~20.60s) and reaches pure black (1.0) at captionEnd (~23.95s)
    const visualSpan = Math.max(0.1, captionEnd - fadeStart);
    const visualProgress = clamp((currentTime - fadeStart) / visualSpan, 0, 1);
    // Smooth power curve keeps the last caption easily readable while gently darkening scene
    const visualOpacity = Math.pow(visualProgress, 1.8);

    if (this.endingOverlay) {
      this.endingOverlay.style.display = 'block';
      this.endingOverlay.style.opacity = visualOpacity >= 0.999 ? '1' : visualOpacity.toFixed(4);
      if (visualOpacity >= 0.99) {
        this.endingOverlay.style.pointerEvents = 'auto';
      }
    }

    // 2. Audio Volume Fade: begins at fadeStart (~20.60s) and reaches 0.0 at musicEnd (~24.25s)
    const audioSpan = Math.max(0.1, musicEnd - fadeStart);
    const musicProgress = clamp((currentTime - fadeStart) / audioSpan, 0, 1);
    // Smooth cosine fade: zero derivative at start (no abrupt dip) and reaches zero smoothly
    const volumeFactor = Math.cos(musicProgress * Math.PI * 0.5);
    const targetVolume = baseVolume * Math.max(0, volumeFactor);

    if (this.musicSystem.status === 'playing') {
      this.musicSystem.fadeTo(targetVolume, 0.06);
    }

    // When reaching musicEnd, trigger clean stop and transition to FINAL
    if (currentTime >= musicEnd) {
      this.musicSystem.stop();
      this.stateMachine.completeMusic();
    }
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
    if (this.stateMachine.state === 'FINAL' && now > this.debugStartedAt) {
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
    } else if (this.loadingElement) {
      this.loadingElement.hidden = true;
    }
    if (
      (state === 'EXPLOSION' ||
        state === 'PETAL_FLIGHT' ||
        state === 'GEM_IDLE' ||
        state === 'GEM_ACTIVATION' ||
        state === 'MUSIC_REVEAL' ||
        state === 'FINAL') &&
      this.petalSystem.explosionCount === 0
    ) {
      this.petalSystem.triggerExplosion(this.stateSnapshot.explosionParams);
    }
    if (state === 'GEM_ACTIVATION') {
      this.sequenceActivated = true;
      this.gemHint?.hide();
      this.gemSystem?.setHovered(false);
    }
    if (state === 'MUSIC_REVEAL') this.musicSystem.begin();
    if (state === 'FINAL') {
      if (this.endingOverlay) {
        this.endingOverlay.style.display = 'block';
        this.endingOverlay.style.opacity = '1';
        this.endingOverlay.style.pointerEvents = 'auto';
      }
      if (this.replayButton) {
        this.replayButton.hidden = true;
      }
    }
    this.onStateEnter?.(state, previousState);
  }

  handleStateExit(state, nextState) {
    this.onStateExit?.(state, nextState);
  }

  handlePause() {
    this.resumeMusic = this.musicSystem.begun &&
      ['playing', 'starting', 'priming'].includes(this.musicSystem.status);
    if (this.resumeMusic) this.musicSystem.pause();
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
  }

  handleResume() {
    if (this.resumeMusic) this.musicSystem.play();
    this.resumeMusic = false;
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
    if (this.disposed || this.sequenceActivated) {
      return;
    }

    if (this.replayButton) {
      this.replayButton.hidden = true;
    }
    if (this.endingOverlay) {
      this.endingOverlay.style.opacity = '0';
      this.endingOverlay.style.display = 'none';
      this.endingOverlay.style.pointerEvents = 'none';
    }
    this.heartSystem.reset();
    this.petalSystem.reset();
    this.gemSystem?.reset();
    this.gemHint?.hide();
    this.captionRenderer.update(0, false);
    this.soundSystem?.reset();
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
    this.gemHint?.dispose();
    this.musicResumeButton?.removeEventListener('click', this.handleMusicResume);
    this.musicResumeButton?.remove();
    this.endingOverlay?.remove?.();
    this.captionRenderer.dispose();
    this.musicSystem.dispose();
    this.soundSystem?.dispose();
    this.petalSystem.dispose();
    this.postProcessing?.dispose();
    this.rendererSystem.dispose();
    this.disposed = true;
  }
}
