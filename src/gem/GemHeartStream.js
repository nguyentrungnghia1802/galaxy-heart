import * as THREE from 'three';
import { createSeededRandom } from '../utils/random.js';

export function createHeartShape() {
  const shape = new THREE.Shape();
  const yOffset = 0.08;
  // Start at top cleft notch
  shape.moveTo(0, 0.22 - yOffset);
  // Right lobe top arc
  shape.bezierCurveTo(0.16, 0.44 - yOffset, 0.44, 0.42 - yOffset, 0.44, 0.14 - yOffset);
  // Right side down to bottom tip
  shape.bezierCurveTo(0.44, -0.10 - yOffset, 0.20, -0.28 - yOffset, 0, -0.48 - yOffset);
  // Left side up from bottom tip
  shape.bezierCurveTo(-0.20, -0.28 - yOffset, -0.44, -0.10 - yOffset, -0.44, 0.14 - yOffset);
  // Left lobe top arc back to notch
  shape.bezierCurveTo(-0.44, 0.42 - yOffset, -0.16, 0.44 - yOffset, 0, 0.22 - yOffset);
  return shape;
}

const ROMANTIC_PALETTE = [
  0xd81b4c, // Deep ruby red
  0xe83667, // Vivid rose
  0xf06292, // Soft romantic pink
  0xf48fb1, // Blossom blush
  0xffb2c9, // Light petal rose
];

const TOTAL_HEARTS = 26;

export class GemHeartStream {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.group.name = 'GemHeartStream';
    this.active = false;
    this.elapsed = 0;

    const seed = options.seed ?? 0x48454152; // 'HEAR'
    const random = createSeededRandom(seed);

    this.geometry = new THREE.ShapeGeometry(createHeartShape(), 12);
    this.materials = [];
    this.hearts = [];

    // 4 successive waves of heart bursts
    const waveDelays = [0.00, 0.18, 0.38, 0.58];
    const waveCounts = [6, 7, 7, 6];

    let heartIndex = 0;
    let maxOverallTime = 0;

    for (let w = 0; w < waveDelays.length; w++) {
      const baseDelay = waveDelays[w];
      const count = waveCounts[w];

      for (let i = 0; i < count; i++) {
        const delay = baseDelay + random() * 0.06;
        const life = 0.82 + random() * 0.24; // 0.82s - 1.06s flight duration
        if (delay + life > maxOverallTime) {
          maxOverallTime = delay + life;
        }

        const colorHex = ROMANTIC_PALETTE[(heartIndex + w) % ROMANTIC_PALETTE.length];
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        this.materials.push(mat);

        const mesh = new THREE.Mesh(this.geometry, mat);
        mesh.visible = false;
        this.group.add(mesh);

        this.hearts.push({
          mesh,
          material: mat,
          delay,
          life,
          baseScale: 0.08 + random() * 0.06, // 0.08 to 0.14
          spawnX: (random() - 0.5) * 0.08,
          spawnY: (random() - 0.5) * 0.06,
          spawnZ: (random() - 0.5) * 0.08,
          velY: 1.35 + random() * 0.55, // upward speed
          spreadX: (random() - 0.5) * 0.48, // lateral drift
          spreadZ: (random() - 0.5) * 0.22,
          swayAmp: 0.03 + random() * 0.04,
          swayFreq: 4.0 + random() * 2.5,
          swayPhase: random() * Math.PI * 2,
          tiltMax: (random() - 0.5) * 0.32,
        });

        heartIndex++;
      }
    }

    this.maxDuration = maxOverallTime + 0.05; // ~1.65s total
    this.group.visible = false;
  }

  trigger() {
    this.active = true;
    this.elapsed = 0;
    this.group.visible = true;

    for (const h of this.hearts) {
      h.mesh.visible = false;
      h.material.opacity = 0;
      h.mesh.position.set(h.spawnX, h.spawnY, h.spawnZ);
      h.mesh.scale.set(0, 0, 0);
    }
  }

  update(dt = 0.016, camera = null) {
    if (!this.active) return;

    this.elapsed += dt;

    let anyAlive = false;

    for (let i = 0; i < this.hearts.length; i++) {
      const h = this.hearts[i];
      const localTime = this.elapsed - h.delay;

      if (localTime < 0) {
        h.mesh.visible = false;
        anyAlive = true;
        continue;
      }

      if (localTime >= h.life) {
        h.mesh.visible = false;
        h.material.opacity = 0;
        continue;
      }

      anyAlive = true;
      h.mesh.visible = true;

      const progress = localTime / h.life; // 0 to 1

      // 1. Position: Rises upward with slight deceleration, sways horizontally
      const riseY = Math.pow(progress, 0.82) * (h.velY * h.life);
      const sway = Math.sin(progress * h.swayFreq + h.swayPhase) * h.swayAmp;
      const posX = h.spawnX + h.spreadX * progress + sway;
      const posY = h.spawnY + riseY;
      const posZ = h.spawnZ + h.spreadZ * progress;
      h.mesh.position.set(posX, posY, posZ);

      // 2. Scale: Quick organic pop-in during first 16%, subtle taper at end
      let scaleFactor = 1.0;
      if (progress < 0.16) {
        scaleFactor = progress / 0.16;
      } else if (progress > 0.70) {
        scaleFactor = 1.0 - ((progress - 0.70) / 0.30) * 0.32;
      }
      const s = h.baseScale * scaleFactor;
      h.mesh.scale.set(s, s, s);

      // 3. Opacity: Soft fade in (0-15%), solid hold, graceful dissolve (65-100%)
      let alpha = 0.90;
      if (progress < 0.15) {
        alpha = (progress / 0.15) * 0.90;
      } else if (progress > 0.65) {
        alpha = (1 - (progress - 0.65) / 0.35) * 0.90;
      }
      h.material.opacity = Math.max(0, Math.min(1, alpha));

      // 4. Orientation: Billboard towards camera with charming flutter
      if (camera) {
        h.mesh.quaternion.copy(camera.quaternion);
      } else {
        h.mesh.rotation.set(0, 0, 0);
      }
      const flutterZ = Math.sin(progress * 5.5 + h.swayPhase) * h.tiltMax;
      h.mesh.rotateZ(flutterZ);
      h.mesh.rotateY(Math.cos(progress * 3.8 + h.swayPhase) * 0.18);
    }

    if (!anyAlive || this.elapsed >= this.maxDuration) {
      this.active = false;
      this.group.visible = false;
    }
  }

  reset() {
    this.active = false;
    this.elapsed = 0;
    this.group.visible = false;

    for (const h of this.hearts) {
      h.mesh.visible = false;
      h.material.opacity = 0;
      h.mesh.position.set(h.spawnX, h.spawnY, h.spawnZ);
      h.mesh.scale.set(0, 0, 0);
    }
  }

  dispose() {
    this.reset();
    this.geometry.dispose();
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials.length = 0;
    this.hearts.length = 0;
    this.group.clear();
    this.group.removeFromParent();
  }
}
