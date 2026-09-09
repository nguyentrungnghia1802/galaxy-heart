import { App } from './app/App.js';
import { AssetLoader } from './assets/AssetLoader.js';
import { QUALITY_PROFILES } from './app/QualityManager.js';
import { DEFAULT_STATE_DURATIONS } from './app/StateMachine.js';
import './styles.css';

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

const container = document.querySelector('#app');
const fallbackEl = document.querySelector('#fallback');
const loadingEl = document.querySelector('#loading');

if (!isWebGLAvailable()) {
  if (loadingEl) loadingEl.hidden = true;
  if (fallbackEl) fallbackEl.hidden = false;
} else {
  const params = new URLSearchParams(window.location.search);
  const debugSpeed = import.meta.env.DEV ? Number(params.get('debugSpeed')) : 1;
  const debugQuality = import.meta.env.DEV ? params.get('quality') : null;
  const durations =
    debugSpeed > 1
      ? Object.fromEntries(
          Object.entries(DEFAULT_STATE_DURATIONS).map(([state, duration]) => [
            state,
            Number.isFinite(duration) ? duration / debugSpeed : duration,
          ]),
        )
      : undefined;
  const qualityProfile = QUALITY_PROFILES[debugQuality] ?? undefined;
  const app = new App(container, { durations, qualityProfile });

  const assetLoader = new AssetLoader();
  assetLoader
    .loadAll([{ id: 'petal', type: 'texture', url: '/assets/textures/petal.webp' }])
    .then((assets) => {
      if (assets.petal) {
        app.petalSystem.setTexture(assets.petal);
      }
    })
    .catch((err) => {
      console.warn('Asset preload warning:', err);
    })
    .finally(() => {
      app.start();
    });

  if (import.meta.env.DEV) {
    window.__PETAL_HEART_APP__ = app;
  }
}

