import { clamp, easeInCubic } from '../utils/math.js';
import {
  FINAL_HEARTBEAT_END_PHASE,
  getHeartbeatIntensity,
  getHeartbeatInterval,
  HEARTBEAT_DUB_PHASE,
  sampleHeartbeatEnvelope,
} from './heartbeatEnvelope.js';

const BASE_HEARTBEAT_AMPLITUDE = 0.075;
const FINAL_HEARTBEAT_AMPLITUDE = 0.0875;
const FINAL_DUB_TENSION_SCALE = 0.045;

export class HeartSystem {
  constructor() {
    this.reset();
  }

  update(dt, stateSnapshot) {
    const state = stateSnapshot?.state ?? 'BOOT';
    const progress = clamp(stateSnapshot?.progress ?? 0, 0, 1);
    const isHeartbeat = state === 'HEARTBEAT';
    const isRapid = state === 'RAPID_HEARTBEAT';

    if (isHeartbeat && this.previousState !== 'HEARTBEAT') {
      this.phase = 0;
    }

    if (isHeartbeat || isRapid) {
      const interval = getHeartbeatInterval(progress);
      this.phase = (this.phase + Math.max(0, dt) / interval) % 1;

      const envelopeScale = sampleHeartbeatEnvelope(this.phase);
      const pulse = clamp(
        (envelopeScale - 1) / BASE_HEARTBEAT_AMPLITUDE,
        0,
        1,
      );
      this.globalScale = Math.min(
        1.12,
        1 + pulse * BASE_HEARTBEAT_AMPLITUDE,
      );
      this.intensity = getHeartbeatIntensity({ state, progress, pulse });
    } else if (state === 'TENSION') {
      this.phase = progress * FINAL_HEARTBEAT_END_PHASE;
      const envelopeScale = sampleHeartbeatEnvelope(this.phase);
      const pulse = clamp(
        (envelopeScale - 1) / BASE_HEARTBEAT_AMPLITUDE,
        0,
        1,
      );
      const dubTailProgress = clamp(
        (this.phase - HEARTBEAT_DUB_PHASE) /
          (FINAL_HEARTBEAT_END_PHASE - HEARTBEAT_DUB_PHASE),
        0,
        1,
      );
      this.globalScale = Math.min(
        1.12,
        1 +
          pulse * FINAL_HEARTBEAT_AMPLITUDE +
          easeInCubic(dubTailProgress) * FINAL_DUB_TENSION_SCALE,
      );
      this.intensity = getHeartbeatIntensity({ state, progress, pulse });
    } else {
      this.phase = 0;
      this.globalScale = 1;
      this.intensity = getHeartbeatIntensity({ state, progress });
    }

    this.previousState = state;
  }

  getGlobalScale() {
    return this.globalScale;
  }

  getIntensity() {
    return this.intensity;
  }

  reset() {
    this.phase = 0;
    this.globalScale = 1;
    this.intensity = 0;
    this.previousState = null;
  }
}
