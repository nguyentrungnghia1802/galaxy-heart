import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { AssetLoader } from '../src/assets/AssetLoader.js';

describe('AssetLoader', () => {
  it('loads and caches textures via textureLoader', async () => {
    const fakeTexture = new THREE.Texture();
    const mockTextureLoader = {
      load: vi.fn((url, onLoad) => {
        onLoad(fakeTexture);
      }),
    };

    const loader = new AssetLoader({ textureLoader: mockTextureLoader });
    const progressCalls = [];
    const results = await loader.loadAll(
      [{ id: 'testPetal', type: 'texture', url: '/textures/petal.webp' }],
      (p) => progressCalls.push(p),
    );

    expect(mockTextureLoader.load).toHaveBeenCalled();
    expect(results.testPetal).toBe(fakeTexture);
    expect(loader.get('/textures/petal.webp')).toBe(fakeTexture);
    expect(progressCalls).toContain(1);

    loader.dispose();
  });

  it('handles empty manifest without errors', async () => {
    const loader = new AssetLoader();
    const progressCalls = [];
    const results = await loader.loadAll([], (p) => progressCalls.push(p));

    expect(progressCalls).toEqual([1]);
    expect(results).toBeDefined();
    loader.dispose();
  });
});
