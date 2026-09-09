import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { PostProcessing } from '../src/fx/PostProcessing.js';

describe('PostProcessing', () => {
  it('disables postprocessing when bloomScale is 0', () => {
    const renderer = {
      capabilities: { isWebGL2: true },
      render: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
    };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    const fx = new PostProcessing({
      renderer,
      scene,
      camera,
      profile: { bloomScale: 0, bloomIntensity: 0 },
    });

    expect(fx.enabled).toBe(false);
    fx.render();
    expect(renderer.render).toHaveBeenCalledWith(scene, camera);
    fx.dispose();
  });

  it('updates bloom strength based on heartbeat and explosion states', () => {
    const mockBloomPass = {
      strength: 0.5,
      resolution: new THREE.Vector2(100, 100),
    };
    const renderer = {
      getPixelRatio: () => 1,
      getSize: (target) => target.set(800, 600),
      render: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
    };
    const fx = new PostProcessing({
      renderer,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      profile: { bloomScale: 1, bloomIntensity: 1 },
    });

    // Manually inject mock pass to verify update logic without full WebGL context
    fx.bloomPass = mockBloomPass;
    fx.enabled = true;

    const initialStrength = fx.currentStrength;
    fx.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 2.0 });
    expect(fx.bloomPass.strength).toBeGreaterThan(initialStrength);

    fx.update(0.016, { state: 'EXPLOSION', progress: 0.02 });
    expect(fx.bloomPass.strength).toBeGreaterThan(initialStrength * 1.5);
  });
});
