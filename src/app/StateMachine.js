import { clamp } from '../utils/math.js';

export const CINEMATIC_STATES = Object.freeze([
  'BOOT',
  'PRELOAD',
  'INTRO',
  'HEART_IDLE',
  'HEARTBEAT',
  'RAPID_HEARTBEAT',
  'TENSION',
  'EXPLOSION',
  'PETAL_FLIGHT',
  'GEM_IDLE',
  'GEM_BURST',
  'LOVE_REVEAL',
  'END',
]);

export const DEFAULT_STATE_DURATIONS = Object.freeze({
  BOOT: 0,
  PRELOAD: 0,
  INTRO: 1.2,
  HEART_IDLE: 0.8,
  HEARTBEAT: 2.4,
  RAPID_HEARTBEAT: 2.2,
  TENSION: 0.65,
  EXPLOSION: 0.45,
  PETAL_FLIGHT: 2.8,
  GEM_IDLE: Number.POSITIVE_INFINITY,
  GEM_BURST: 1.2,
  LOVE_REVEAL: 2.2,
  END: Number.POSITIVE_INFINITY,
});

export class StateMachine {
  constructor(config = {}) {
    this.durations = Object.freeze({
      ...DEFAULT_STATE_DURATIONS,
      ...config.durations,
      END: Number.POSITIVE_INFINITY,
    });
    this.onEnter = config.onEnter ?? null;
    this.onExit = config.onExit ?? null;
    this.stateIndex = 0;
    this.elapsed = 0;
    this.totalElapsed = 0;
    this.started = false;
  }

  get state() {
    return CINEMATIC_STATES[this.stateIndex];
  }

  get progress() {
    const duration = this.durations[this.state];
    if (!Number.isFinite(duration)) {
      return this.state === 'END' ? 1 : 0;
    }
    if (duration <= 0) {
      return this.started ? 1 : 0;
    }
    return clamp(this.elapsed / duration, 0, 1);
  }

  start() {
    if (this.started || this.state !== 'BOOT') {
      return;
    }

    this.started = true;
    this.advanceState();
  }

  update(dt) {
    if (!this.started || this.state === 'END') {
      return;
    }

    let remaining = Math.max(0, Number.isFinite(dt) ? dt : 0);
    this.totalElapsed += remaining;

    while (this.state !== 'END') {
      const duration = Math.max(0, this.durations[this.state]);
      const timeToBoundary = Math.max(0, duration - this.elapsed);

      if (remaining < timeToBoundary - 1e-9) {
        this.elapsed += remaining;
        break;
      }

      remaining = Math.max(0, remaining - timeToBoundary);
      this.elapsed = duration;
      this.advanceState();

      if (remaining <= 1e-9 && this.durations[this.state] > 0) {
        break;
      }
    }
  }

  reset() {
    if (this.started || this.state !== 'BOOT') {
      this.onExit?.(this.state, 'BOOT');
    }
    this.stateIndex = 0;
    this.elapsed = 0;
    this.totalElapsed = 0;
    this.started = false;
  }

  advanceState() {
    if (this.stateIndex >= CINEMATIC_STATES.length - 1) {
      return;
    }

    const previousState = this.state;
    const nextState = CINEMATIC_STATES[this.stateIndex + 1];
    this.onExit?.(previousState, nextState);
    this.stateIndex += 1;
    this.elapsed = 0;
    this.onEnter?.(nextState, previousState);
  }

  transitionTo(targetState) {
    const targetIndex = CINEMATIC_STATES.indexOf(targetState);
    if (targetIndex === -1 || targetIndex === this.stateIndex) {
      return;
    }
    const previousState = this.state;
    this.onExit?.(previousState, targetState);
    this.stateIndex = targetIndex;
    this.elapsed = 0;
    this.onEnter?.(targetState, previousState);
  }

  triggerGemClick() {
    if (this.state === 'GEM_IDLE' || this.state === 'PETAL_FLIGHT') {
      this.transitionTo('GEM_BURST');
    }
  }
}
