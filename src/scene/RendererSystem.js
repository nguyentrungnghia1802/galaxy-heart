import * as THREE from 'three';

export class RendererSystem {
  constructor({
    container,
    profile,
    devicePixelRatio = 1,
    renderer = null,
  }) {
    if (!container?.append) {
      throw new TypeError('RendererSystem requires a DOM mount container.');
    }

    this.renderer =
      renderer ??
      new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    this.canvas = this.renderer.domElement;
    this.renderer.setPixelRatio(
      Math.min(Math.max(1, devicePixelRatio || 1), profile.dprCap),
    );
    this.canvas.setAttribute(
      'aria-label',
      '3D heart made of petals that beats and bursts into flying petals.',
    );
    container.append(this.canvas);
  }

  resize(width, height, camera) {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
    this.renderer.setSize(safeWidth, safeHeight, false);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  dispose() {
    this.renderer.dispose();
    this.canvas.remove();
  }
}
