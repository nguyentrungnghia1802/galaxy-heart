import { clampDeltaTime } from '../utils/math.js';

const TAU = Math.PI * 2;

export const DEFAULT_EXPLOSION_PARAMS = Object.freeze({
  speedMin: 2.4,
  speedMax: 6.4,
  tangentStrength: 1.15,
  noiseStrength: 0.28,
  upwardBias: 0.32,
  foregroundRatio: 0.08,
  foregroundStrength: 2.6,
  cameraDirectionX: 0,
  cameraDirectionY: 0,
  cameraDirectionZ: 1,
  angularSpeedMin: 0.8,
  angularSpeedMax: 4.8,
  impactDuration: 0.45,
});

export const DEFAULT_FLIGHT_PARAMS = Object.freeze({
  maxDt: 0.05,
  gravity: -0.32,
  drag: 0.2,
  windStrength: 0.2,
  maxDistance: 20,
});

function readComponent(vector, key, index) {
  return typeof vector[key] === 'number' ? vector[key] : vector[index];
}

export function createExplosionVelocity(
  anchorPosition,
  anchorNormal,
  random,
  params = DEFAULT_EXPLOSION_PARAMS,
  target = new Float32Array(3),
  outputOffset = 0,
  anchorOffset = 0,
  foregroundFlags = null,
  instanceIndex = 0,
) {
  const px = readComponent(anchorPosition, 'x', anchorOffset);
  const py = readComponent(anchorPosition, 'y', anchorOffset + 1);
  const pz = readComponent(anchorPosition, 'z', anchorOffset + 2);
  const normalX = readComponent(anchorNormal, 'x', anchorOffset);
  const normalY = readComponent(anchorNormal, 'y', anchorOffset + 1);
  const normalZ = readComponent(anchorNormal, 'z', anchorOffset + 2);

  const radialLength = Math.hypot(px, py, pz) || 1;
  let outwardX = (px / radialLength) * 0.75 + normalX * 0.25;
  let outwardY = (py / radialLength) * 0.75 + normalY * 0.25;
  let outwardZ = (pz / radialLength) * 0.75 + normalZ * 0.25;
  const outwardLength = Math.hypot(outwardX, outwardY, outwardZ) || 1;
  outwardX /= outwardLength;
  outwardY /= outwardLength;
  outwardZ /= outwardLength;

  let tangentX;
  let tangentY;
  let tangentZ;
  if (Math.abs(outwardY) < 0.9) {
    tangentX = -outwardZ;
    tangentY = 0;
    tangentZ = outwardX;
  } else {
    tangentX = 0;
    tangentY = outwardZ;
    tangentZ = -outwardY;
  }
  const tangentLength = Math.hypot(tangentX, tangentY, tangentZ) || 1;
  tangentX /= tangentLength;
  tangentY /= tangentLength;
  tangentZ /= tangentLength;

  const bitangentX = outwardY * tangentZ - outwardZ * tangentY;
  const bitangentY = outwardZ * tangentX - outwardX * tangentZ;
  const bitangentZ = outwardX * tangentY - outwardY * tangentX;
  const tangentAngle = random() * TAU;
  const tangentAmount =
    (0.35 + random() * 0.65) *
    (params.tangentStrength ?? DEFAULT_EXPLOSION_PARAMS.tangentStrength);
  const tangentCos = Math.cos(tangentAngle) * tangentAmount;
  const tangentSin = Math.sin(tangentAngle) * tangentAmount;
  const speedMin = params.speedMin ?? DEFAULT_EXPLOSION_PARAMS.speedMin;
  const speedMax = params.speedMax ?? DEFAULT_EXPLOSION_PARAMS.speedMax;
  const radialStrength =
    speedMin + random() * (Math.max(speedMin, speedMax * 0.82) - speedMin);
  const noiseStrength =
    params.noiseStrength ?? DEFAULT_EXPLOSION_PARAMS.noiseStrength;

  let velocityX =
    outwardX * radialStrength +
    tangentX * tangentCos +
    bitangentX * tangentSin +
    (random() * 2 - 1) * noiseStrength;
  let velocityY =
    outwardY * radialStrength +
    tangentY * tangentCos +
    bitangentY * tangentSin +
    (random() * 2 - 1) * noiseStrength +
    (params.upwardBias ?? DEFAULT_EXPLOSION_PARAMS.upwardBias);
  let velocityZ =
    outwardZ * radialStrength +
    tangentZ * tangentCos +
    bitangentZ * tangentSin +
    (random() * 2 - 1) * noiseStrength;

  const foregroundRatio =
    params.foregroundRatio ?? DEFAULT_EXPLOSION_PARAMS.foregroundRatio;
  const isForeground = random() < foregroundRatio;
  const foregroundAmount =
    (0.7 + random() * 0.6) *
    (params.foregroundStrength ?? DEFAULT_EXPLOSION_PARAMS.foregroundStrength);
  if (isForeground) {
    velocityX +=
      (params.cameraDirectionX ??
        DEFAULT_EXPLOSION_PARAMS.cameraDirectionX) * foregroundAmount;
    velocityY +=
      (params.cameraDirectionY ??
        DEFAULT_EXPLOSION_PARAMS.cameraDirectionY) * foregroundAmount;
    velocityZ +=
      (params.cameraDirectionZ ??
        DEFAULT_EXPLOSION_PARAMS.cameraDirectionZ) * foregroundAmount;
  }

  const flags = params.foregroundFlags ?? foregroundFlags;
  const flagIndex = params.instanceIndex ?? instanceIndex;
  if (flags) {
    flags[flagIndex] = isForeground ? 1 : 0;
  }

  const speed = Math.hypot(velocityX, velocityY, velocityZ) || 1;
  const clampedSpeed = Math.min(speedMax, Math.max(speedMin, speed));
  const speedScale = clampedSpeed / speed;
  velocityX *= speedScale;
  velocityY *= speedScale;
  velocityZ *= speedScale;

  target[outputOffset] = velocityX;
  target[outputOffset + 1] = velocityY;
  target[outputOffset + 2] = velocityZ;
  return target;
}

export function initializeExplosion(
  buffers,
  random,
  params = DEFAULT_EXPLOSION_PARAMS,
) {
  buffers.foreground.fill(0);
  buffers.active.fill(1);

  const angularSpeedMin =
    params.angularSpeedMin ?? DEFAULT_EXPLOSION_PARAMS.angularSpeedMin;
  const angularSpeedMax =
    params.angularSpeedMax ?? DEFAULT_EXPLOSION_PARAMS.angularSpeedMax;

  for (let index = 0; index < buffers.count; index += 1) {
    const vectorOffset = index * 3;
    createExplosionVelocity(
      buffers.position,
      buffers.anchorNormal,
      random,
      params,
      buffers.velocity,
      vectorOffset,
      vectorOffset,
      buffers.foreground,
      index,
    );

    let axisX = random() * 2 - 1;
    let axisY = random() * 2 - 1;
    let axisZ = random() * 2 - 1;
    const axisLength = Math.hypot(axisX, axisY, axisZ) || 1;
    const angularSpeed =
      angularSpeedMin + random() * (angularSpeedMax - angularSpeedMin);
    axisX = (axisX / axisLength) * angularSpeed;
    axisY = (axisY / axisLength) * angularSpeed;
    axisZ = (axisZ / axisLength) * angularSpeed;
    buffers.angularVelocity[vectorOffset] = axisX;
    buffers.angularVelocity[vectorOffset + 1] = axisY;
    buffers.angularVelocity[vectorOffset + 2] = axisZ;
  }
}

export function integratePetalFlight(
  buffers,
  dt,
  time,
  params = DEFAULT_FLIGHT_PARAMS,
) {
  const maxDt = params.maxDt ?? DEFAULT_FLIGHT_PARAMS.maxDt;
  const safeDt = clampDeltaTime(dt, maxDt);
  const gravity = params.gravity ?? DEFAULT_FLIGHT_PARAMS.gravity;
  const drag = params.drag ?? DEFAULT_FLIGHT_PARAMS.drag;
  const windStrength =
    params.windStrength ?? DEFAULT_FLIGHT_PARAMS.windStrength;
  const maxDistance = params.maxDistance ?? DEFAULT_FLIGHT_PARAMS.maxDistance;
  const maxDistanceSquared = maxDistance * maxDistance;
  const dragFactor = Math.exp(-drag * safeDt);

  for (let index = 0; index < buffers.count; index += 1) {
    if (buffers.active[index] === 0) {
      continue;
    }

    const vectorOffset = index * 3;
    const rotationOffset = index * 4;
    let px = buffers.position[vectorOffset];
    let py = buffers.position[vectorOffset + 1];
    let pz = buffers.position[vectorOffset + 2];
    const seed = buffers.noiseSeed[index];
    const windPhase = seed * TAU;
    const windX = Math.sin(time * 0.85 + windPhase + py * 0.65) * windStrength;
    const windY =
      Math.cos(time * 0.55 + seed * 11.3 + px * 0.35) *
      windStrength *
      0.22;
    const windZ =
      Math.cos(time * 0.72 + windPhase * 1.7 + px * 0.55) * windStrength;

    let velocityX =
      (buffers.velocity[vectorOffset] + windX * safeDt) * dragFactor;
    let velocityY =
      (buffers.velocity[vectorOffset + 1] +
        (gravity + windY) * safeDt) *
      dragFactor;
    let velocityZ =
      (buffers.velocity[vectorOffset + 2] + windZ * safeDt) * dragFactor;
    px += velocityX * safeDt;
    py += velocityY * safeDt;
    pz += velocityZ * safeDt;

    buffers.velocity[vectorOffset] = velocityX;
    buffers.velocity[vectorOffset + 1] = velocityY;
    buffers.velocity[vectorOffset + 2] = velocityZ;
    buffers.position[vectorOffset] = px;
    buffers.position[vectorOffset + 1] = py;
    buffers.position[vectorOffset + 2] = pz;

    const qx = buffers.rotation[rotationOffset];
    const qy = buffers.rotation[rotationOffset + 1];
    const qz = buffers.rotation[rotationOffset + 2];
    const qw = buffers.rotation[rotationOffset + 3];
    const angularX = buffers.angularVelocity[vectorOffset];
    const angularY = buffers.angularVelocity[vectorOffset + 1];
    const angularZ = buffers.angularVelocity[vectorOffset + 2];
    let nextX =
      qx + 0.5 * (angularX * qw + angularY * qz - angularZ * qy) * safeDt;
    let nextY =
      qy + 0.5 * (-angularX * qz + angularY * qw + angularZ * qx) * safeDt;
    let nextZ =
      qz + 0.5 * (angularX * qy - angularY * qx + angularZ * qw) * safeDt;
    let nextW =
      qw - 0.5 * (angularX * qx + angularY * qy + angularZ * qz) * safeDt;
    const quaternionLength = Math.hypot(nextX, nextY, nextZ, nextW);
    if (quaternionLength < 1e-9) {
      nextX = 0;
      nextY = 0;
      nextZ = 0;
      nextW = 1;
    } else {
      nextX /= quaternionLength;
      nextY /= quaternionLength;
      nextZ /= quaternionLength;
      nextW /= quaternionLength;
    }
    buffers.rotation[rotationOffset] = nextX;
    buffers.rotation[rotationOffset + 1] = nextY;
    buffers.rotation[rotationOffset + 2] = nextZ;
    buffers.rotation[rotationOffset + 3] = nextW;

    if (px * px + py * py + pz * pz > maxDistanceSquared) {
      buffers.active[index] = 0;
    }
  }

  return safeDt;
}
