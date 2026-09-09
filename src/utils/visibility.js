import { clampDeltaTime } from './math.js';

export class VisibilityClock {
  constructor({
    target = globalThis.document,
    maxDt = 0.05,
    onPause = null,
    onResume = null,
  } = {}) {
    if (!target?.addEventListener || !target?.removeEventListener) {
      throw new TypeError('VisibilityClock requires an event target.');
    }

    this.target = target;
    this.maxDt = maxDt;
    this.onPause = onPause;
    this.onResume = onResume;
    this.paused = Boolean(target.hidden);
    this.running = false;
    this.lastNow = null;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.paused = Boolean(this.target.hidden);
    this.lastNow = null;
    this.target.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
  }

  stop() {
    if (!this.running) {
      return;
    }
    this.target.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.running = false;
    this.lastNow = null;
  }

  tick(now) {
    if (this.paused) {
      return 0;
    }
    if (this.lastNow === null) {
      this.lastNow = now;
      return 0;
    }

    const elapsed = (now - this.lastNow) / 1_000;
    this.lastNow = now;
    return clampDeltaTime(elapsed, this.maxDt);
  }

  reset() {
    this.lastNow = null;
  }

  handleVisibilityChange() {
    const isHidden = Boolean(this.target.hidden);
    if (isHidden === this.paused) {
      return;
    }

    this.paused = isHidden;
    this.lastNow = null;
    if (isHidden) {
      this.onPause?.();
    } else {
      this.onResume?.();
    }
  }
}
