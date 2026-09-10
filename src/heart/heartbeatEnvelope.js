import { clamp, easeInCubic, lerp } from '../utils/math.js';

export const HEARTBEAT_INTERVAL_SECONDS = 0.9;
export const STEADY_HEARTBEAT_CYCLES = 6;
export const HEARTBEAT_LUB_PHASE = 0.06;
export const HEARTBEAT_DUB_PHASE = 0.24;
export const HEARTBEAT_DUB_DURATION_SECONDS = 0.23;
export const FINAL_HEARTBEAT_END_PHASE =
  HEARTBEAT_DUB_PHASE +
  HEARTBEAT_DUB_DURATION_SECONDS / HEARTBEAT_INTERVAL_SECONDS;
export const FINAL_HEARTBEAT_DURATION_SECONDS =
  HEARTBEAT_DUB_PHASE * HEARTBEAT_INTERVAL_SECONDS +
  HEARTBEAT_DUB_DURATION_SECONDS;

const HEARTBEAT_KEYFRAMES = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([0.1, 1.075]),
  Object.freeze([0.18, 1.015]),
  Object.freeze([0.28, 1.045]),
  Object.freeze([0.38, 1]),
  Object.freeze([1, 1]),
]);

export function sampleHeartbeatEnvelope(localPhase) {
  const phase = clamp(localPhase, 0, 1);

  for (let index = 1; index < HEARTBEAT_KEYFRAMES.length; index += 1) {
    const previous = HEARTBEAT_KEYFRAMES[index - 1];
    const current = HEARTBEAT_KEYFRAMES[index];
    if (phase <= current[0]) {
      const span = current[0] - previous[0];
      const segmentProgress = span === 0 ? 1 : (phase - previous[0]) / span;
      return lerp(previous[1], current[1], segmentProgress);
    }
  }

  return 1;
}

export function getHeartbeatInterval() {
  return HEARTBEAT_INTERVAL_SECONDS;
}

export function getHeartbeatIntensity(stateSnapshot) {
  const state = stateSnapshot?.state;
  const progress = clamp(stateSnapshot?.progress ?? 0, 0, 1);
  const pulse = clamp(stateSnapshot?.pulse ?? 0, 0, 1);

  if (state === 'HEARTBEAT') {
    return pulse;
  }
  if (state === 'RAPID_HEARTBEAT') {
    return pulse;
  }
  if (state === 'TENSION') {
    return pulse * 1.15 + easeInCubic(progress) * 0.35;
  }
  if (state === 'EXPLOSION') {
    return lerp(3.2, 1.0, progress);
  }
  return 0;
}
