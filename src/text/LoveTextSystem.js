import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontData from '../assets/fonts/optimer_regular.typeface.json';
import { clamp, easeOutCubic, lerp } from '../utils/math.js';

export class LoveTextSystem {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.camera = options.camera ?? null;
    this.basePosition = new THREE.Vector3(0, 0.08, 0.20);
    this.group.position.copy(this.basePosition);
    this.time = 0;
    this.revealProgress = 0;
    this.isRevealed = false;

    // Parse font synchronously from bundled JSON data
    const loader = new FontLoader();
    this.font = loader.parse(fontData);

    // 1. Text Geometry with crisp bevel contours
    const textGeo = new TextGeometry('I love you!', {
      font: this.font,
      size: 0.36,
      depth: 0.058,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.007,
      bevelOffset: 0,
      bevelSegments: 4,
    });
    textGeo.computeBoundingBox();
    textGeo.center();

    // 2. Dual-Tone Romantic Materials (face = soft velvety warm blush, sides = deep ruby-rose bevels)
    // Softened ~40% to preserve crisp character readability and prevent bloom washout
    this.faceMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff6f9,
      emissive: 0x240610,
      emissiveIntensity: 0.16,
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      side: THREE.FrontSide,
    });

    this.sideMat = new THREE.MeshPhysicalMaterial({
      color: 0xd91f52,
      emissive: 0x440816,
      emissiveIntensity: 0.32,
      roughness: 0.28,
      metalness: 0.12,
      clearcoat: 0.5,
      side: THREE.FrontSide,
    });

    this.textMesh = new THREE.Mesh(textGeo, [this.faceMat, this.sideMat]);
    this.group.add(this.textMesh);

    // 3. Ambient Text Soft Point Light (delicate front illumination)
    this.textLight = new THREE.PointLight(0xff4572, 0, 3.2, 2.0);
    this.textLight.position.set(0, 0, 0.3);
    this.group.add(this.textLight);

    // Initial hidden state
    this.group.visible = false;
    this.group.scale.set(0.001, 0.001, 0.001);
  }

  reveal() {
    this.isRevealed = true;
    this.group.visible = true;
  }

  update(dt = 0.016, stateSnapshot = {}) {
    this.time += dt;
    const state = stateSnapshot?.state ?? 'BOOT';
    const progress = clamp(stateSnapshot?.progress ?? 0, 0, 1);

    if (state === 'LOVE_REVEAL') {
      this.isRevealed = true;
      this.group.visible = true;
      this.revealProgress = progress;
    } else if (state === 'END') {
      this.isRevealed = true;
      this.group.visible = true;
      this.revealProgress = 1.0;
    } else if (!this.isRevealed) {
      this.group.visible = false;
      return;
    }

    // 1. Reveal Animation (scale up + smooth emergence into center focus)
    const t = easeOutCubic(this.revealProgress);
    // Emerge smoothly from slightly below center to resting center level (y: 0.08)
    const currentY = lerp(-0.06, this.basePosition.y, t);
    const scaleFactor =
      this.revealProgress < 1.0
        ? lerp(0.1, 1.02, Math.sin(t * Math.PI * 0.5))
        : 1.0;

    // 2. Continuous Living Floating Micro-Motion in End State
    const floatBob = Math.sin(this.time * 1.5) * 0.018;
    const swayY = Math.sin(this.time * 0.9) * 0.022;
    const tiltX = -0.04 + Math.cos(this.time * 1.2) * 0.014;

    this.group.position.y = currentY + floatBob;
    this.group.position.z = this.basePosition.z;
    this.textMesh.rotation.y = swayY;
    this.textMesh.rotation.x = tiltX;

    // 3. Scale, Responsive Mobile Fit & Shimmer
    const aspect =
      this.camera?.aspect ??
      (typeof window !== 'undefined' && window.innerHeight
        ? window.innerWidth / window.innerHeight
        : 1);
    const responsiveScale = aspect < 1.0 ? clamp(aspect * 1.35, 0.62, 1.0) : 1.0;
    const breath = 1.0 + Math.sin(this.time * 2.0) * 0.015;
    const s = scaleFactor * breath * responsiveScale;
    this.group.scale.set(s, s, s);

    // 4. Subtle romantic lighting ramp during reveal, settling into soft warm radiance
    const flashBoost =
      state === 'LOVE_REVEAL' ? Math.sin(progress * Math.PI) * 0.35 : 0;
    this.faceMat.emissiveIntensity = 0.16 + flashBoost * 0.22;
    this.sideMat.emissiveIntensity = 0.32 + flashBoost * 0.38;
    this.textLight.intensity = (1.12 + flashBoost * 0.8) * t;
  }

  reset() {
    this.time = 0;
    this.revealProgress = 0;
    this.isRevealed = false;
    this.group.visible = false;
    this.group.scale.set(0.001, 0.001, 0.001);
    this.group.position.copy(this.basePosition);
    this.textLight.intensity = 0;
  }

  dispose() {
    this.reset();
    this.textMesh.geometry.dispose();
    this.faceMat.dispose();
    this.sideMat.dispose();
    this.textLight.dispose();
    this.group.removeFromParent();
  }
}
