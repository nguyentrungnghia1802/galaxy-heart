import { clamp, easeInCubic, lerp } from '../utils/math.js';

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

export function getHeartbeatInterval(normalizedRapidProgress) {
  const progress = clamp(normalizedRapidProgress, 0, 1);
  return lerp(0.9, 0.28, easeInCubic(progress));
}

export function getHeartbeatIntensity(stateSnapshot) {
  const state = stateSnapshot?.state;
  const progress = clamp(stateSnapshot?.progress ?? 0, 0, 1);
  const pulse = clamp(stateSnapshot?.pulse ?? 0, 0, 1);

  if (state === 'HEARTBEAT') {
    return pulse;
  }
  if (state === 'RAPID_HEARTBEAT') {
    return pulse * lerp(1, 1.75, progress) + progress * 0.25;
  }
  if (state === 'TENSION') {
    return lerp(1.25, 1.7, progress);
  }
  if (state === 'EXPLOSION') {
    return 2;
  }
  return 0;
}

