import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class PostProcessing {
  constructor({
    renderer,
    scene,
    camera,
    profile = {},
    width = 800,
    height = 600,
  }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.profile = profile;

    this.bloomScale = profile.bloomScale ?? 1.0;
    this.bloomIntensity = profile.bloomIntensity ?? 1.0;
    this.enabled = this.bloomScale > 0 && this.bloomIntensity > 0;

    this.baseStrength = 0.62 * this.bloomIntensity;
    this.currentStrength = this.baseStrength;

    if (this.enabled && typeof renderer?.getPixelRatio === 'function') {
      this.composer = new EffectComposer(renderer);
      this.renderPass = new RenderPass(scene, camera);
      this.composer.addPass(this.renderPass);

      const resolution = new THREE.Vector2(
        Math.max(1, width * this.bloomScale),
        Math.max(1, height * this.bloomScale),
      );

      // threshold: 0.20 keeps dark burgundy backdrop crisp and deep black;
      // only velvety highlights, luminous petal edges, and inner core glow will bloom softly
      this.bloomPass = new UnrealBloomPass(
        resolution,
        this.baseStrength,
        0.58, // radius
        0.20, // threshold
      );
      this.composer.addPass(this.bloomPass);

      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);
    }
  }

  update(dt, stateSnapshot) {
    if (!this.enabled || !this.bloomPass) {
      return;
    }

    const { state, progress = 0, heartbeatIntensity = 0 } = stateSnapshot ?? {};
    const pulseFactor = Math.min(2.5, heartbeatIntensity);

    // Dynamic bloom strength modulated by heartbeat intensity
    let targetStrength = this.baseStrength + pulseFactor * 0.45;

    if (state === 'RAPID_HEARTBEAT') {
      // Accelerating glow crescendo
      targetStrength += progress * 0.4;
    } else if (state === 'TENSION') {
      // Glow contracts into dense bright tension
      targetStrength = this.baseStrength * 1.35;
    } else if (state === 'EXPLOSION') {
      // Peak impact bloom flash during first 0.35s, decaying under 1s
      const flash = Math.max(0, 1 - progress * 2.2);
      targetStrength = this.baseStrength * 2.2 + flash * 1.6;
    } else if (state === 'PETAL_FLIGHT') {
      // Dreamy romantic dispersal glow for flying petals
      const flightFactor = Math.max(0.7, 1 - progress * 0.35);
      targetStrength = this.baseStrength * flightFactor;
    }

    // Smooth interpolation to avoid abrupt visual pops
    this.currentStrength += (targetStrength - this.currentStrength) * 0.18;
    this.bloomPass.strength = this.currentStrength;
  }

  resize(width, height) {
    if (!this.enabled || !this.composer) {
      return;
    }
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.composer.setSize(safeWidth, safeHeight);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(
        Math.max(1, safeWidth * this.bloomScale),
        Math.max(1, safeHeight * this.bloomScale),
      );
    }
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
  }
}
