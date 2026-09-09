import { clamp, easeInCubic, lerp } from '../utils/math.js';
import {
  getHeartbeatIntensity,
  getHeartbeatInterval,
  sampleHeartbeatEnvelope,
} from './heartbeatEnvelope.js';

const NORMAL_HEARTBEAT_INTERVAL = 0.9;
const BASE_HEARTBEAT_AMPLITUDE = 0.075;
const RAPID_HEARTBEAT_AMPLITUDE = 0.12;

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
      const interval = isRapid
        ? getHeartbeatInterval(progress)
        : NORMAL_HEARTBEAT_INTERVAL;
      this.phase = (this.phase + Math.max(0, dt) / interval) % 1;

      const envelopeScale = sampleHeartbeatEnvelope(this.phase);
      const pulse = clamp(
        (envelopeScale - 1) / BASE_HEARTBEAT_AMPLITUDE,
        0,
        1,
      );
      const amplitude = isRapid
        ? lerp(
            BASE_HEARTBEAT_AMPLITUDE,
            RAPID_HEARTBEAT_AMPLITUDE,
            easeInCubic(progress),
          )
        : BASE_HEARTBEAT_AMPLITUDE;

      this.globalScale = Math.min(1.12, 1 + pulse * amplitude);
      this.intensity = getHeartbeatIntensity({ state, progress, pulse });
    } else if (state === 'TENSION') {
      this.phase = 0;
      // Flow: slow heartbeat -> faster -> rapid -> tension -> final strong beat -> explosion
      // Stage 1 (0.0 -> 0.4): Tension compression & coiling potential energy
      // Stage 2 (0.4 -> 1.0): Final massive diastolic surge peak right into explosion
      let tensionScale = 1;
      if (progress < 0.4) {
        const p = progress / 0.4;
        tensionScale = lerp(1.09, 1.04, easeInCubic(p));
      } else {
        const p = (progress - 0.4) / 0.6;
        const peakT = Math.sin(p * Math.PI * 0.5);
        tensionScale = lerp(1.04, 1.22, peakT);
      }
      // Micro-tremor tension vibration increasing as pressure builds
      const tremor = Math.sin(progress * 55) * 0.007 * progress;
      this.globalScale = tensionScale + tremor;
      this.intensity = getHeartbeatIntensity({ state, progress });
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
