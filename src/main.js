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
const introScreenEl = document.querySelector('#intro-screen');
const openHeartBtn = document.querySelector('#open-heart-btn');

if (!isWebGLAvailable()) {
  if (loadingEl) loadingEl.hidden = true;
  if (introScreenEl) introScreenEl.hidden = true;
  if (fallbackEl) fallbackEl.hidden = false;
} else {
  const params = new URLSearchParams(window.location.search);
  const debugSpeed = import.meta.env.DEV ? Number(params.get('debugSpeed')) : 1;
  const debugQuality = import.meta.env.DEV ? params.get('quality') : null;
  const skipIntro = params.get('skipIntro') === 'true';
  const jumpState = import.meta.env.DEV ? params.get('jumpState') : null;

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
  const petalTextureUrl = `${import.meta.env.BASE_URL}assets/textures/petal.webp`;
  const assetsPromise = assetLoader
    .loadAll([{ id: 'petal', type: 'texture', url: petalTextureUrl }])
    .then((assets) => {
      if (assets.petal) {
        app.petalSystem.setTexture(assets.petal);
      }
    })
    .catch((err) => {
      console.warn('Asset preload warning:', err);
    });

  let appStarted = false;
  const launchMainScene = () => {
    if (appStarted) return;
    appStarted = true;
    assetsPromise.finally(() => {
      app.start();
      if (jumpState && typeof app.stateMachine?.transitionTo === 'function') {
        app.stateMachine.transitionTo(jumpState);
      }
    });
  };

  const soundToggleBtn = document.querySelector('#sound-toggle');
  const soundIconOn = soundToggleBtn?.querySelector('.sound-icon-on');
  const soundIconOff = soundToggleBtn?.querySelector('.sound-icon-off');

  const updateSoundToggleUI = (isMuted) => {
    if (!soundToggleBtn) return;
    soundToggleBtn.classList.toggle('is-muted', isMuted);
    soundToggleBtn.setAttribute(
      'aria-label',
      isMuted ? 'Bật âm thanh' : 'Tắt âm thanh',
    );
    soundToggleBtn.title = isMuted ? 'Bật âm thanh' : 'Tắt âm thanh';
    if (soundIconOn) soundIconOn.hidden = isMuted;
    if (soundIconOff) soundIconOff.hidden = !isMuted;
  };

  if (app.soundSystem) {
    updateSoundToggleUI(app.soundSystem.isMuted());
    soundToggleBtn?.addEventListener('click', () => {
      const isMuted = app.soundSystem.toggleMute();
      updateSoundToggleUI(isMuted);
    });
  }

  if (skipIntro || !introScreenEl || !openHeartBtn) {
    if (introScreenEl) {
      introScreenEl.style.display = 'none';
      introScreenEl.hidden = true;
    }
    launchMainScene();
  } else {
    let openingStarted = false;
    openHeartBtn.addEventListener('click', () => {
      if (openingStarted) return;
      openingStarted = true;

      // Unlock AudioContext cleanly on user interaction
      app.soundSystem?.unlock();

      // 1. Intro screen freezes completely for ~1 second
      introScreenEl.classList.add('is-frozen');

      // 2. After ~1s freeze, split screen horizontally to both sides (~2 seconds)
      setTimeout(() => {
        introScreenEl.classList.remove('is-frozen');
        introScreenEl.classList.add('is-splitting');
        // Main scene starts running automatically
        launchMainScene();

        // 3. After ~2s curtain split transition (3s total), hide and cleanup intro screen
        setTimeout(() => {
          introScreenEl.style.display = 'none';
          introScreenEl.hidden = true;
        }, 2000);
      }, 1000);
    });
  }

  if (import.meta.env.DEV) {
    window.__PETAL_HEART_APP__ = app;
  }
}

