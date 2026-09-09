import * as THREE from 'three';

export class AssetLoader {
  constructor(options = {}) {
    this.textureLoader = options.textureLoader ?? new THREE.TextureLoader();
    this.cache = new Map();
  }

  async loadTexture(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.cache.set(url, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          reject(error);
        },
      );
    });
  }

  async loadAll(manifest = [], onProgress = null) {
    const total = manifest.length;
    if (total === 0) {
      onProgress?.(1);
      return this.cache;
    }

    let loaded = 0;
    const results = {};

    await Promise.all(
      manifest.map(async (item) => {
        try {
          if (item.type === 'texture') {
            const texture = await this.loadTexture(item.url);
            results[item.id ?? item.url] = texture;
          }
        } catch (err) {
          console.warn(`[AssetLoader] Failed to load asset: ${item.url}`, err);
        } finally {
          loaded += 1;
          onProgress?.(loaded / total);
        }
      }),
    );

    return results;
  }

  get(id) {
    return this.cache.get(id);
  }

  dispose() {
    for (const texture of this.cache.values()) {
      texture?.dispose?.();
    }
    this.cache.clear();
  }
}
