import { App } from './app/App.js';
import { QUALITY_PROFILES } from './app/QualityManager.js';
import { DEFAULT_STATE_DURATIONS } from './app/StateMachine.js';
import './styles.css';

const container = document.querySelector('#app');
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

app.start();

if (import.meta.env.DEV) {
  window.__PETAL_HEART_APP__ = app;
}
