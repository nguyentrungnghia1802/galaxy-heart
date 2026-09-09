export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeInCubic(t) {
  return t * t * t;
}

export function easeOutCubic(t) {
  const inverse = 1 - t;
  return 1 - inverse * inverse * inverse;
}

export function clampDeltaTime(dt, maxDt) {
  return clamp(dt, 0, maxDt);
}

