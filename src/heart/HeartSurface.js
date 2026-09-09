import { createSeededRandom } from '../utils/random.js';

const TAU = Math.PI * 2;
const OUTLINE_SCALE = 0.1;
const OUTLINE_Y_OFFSET = 0.25;
const SURFACE_CENTER_Y = 0.05;
const HEART_DEPTH = 0.78;
const ARC_TABLE_SIZE = 2_048;
const COLOR_VARIANT_COUNT = 6;

function sampleOutline(angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const sin2 = Math.sin(angle * 2);
  const sin3 = Math.sin(angle * 3);
  const sin4 = Math.sin(angle * 4);

  return {
    x: 16 * sin * sin * sin * OUTLINE_SCALE,
    y:
      (13 * cos -
        5 * Math.cos(angle * 2) -
        2 * Math.cos(angle * 3) -
        Math.cos(angle * 4)) *
        OUTLINE_SCALE +
      OUTLINE_Y_OFFSET,
    dx: 48 * sin * sin * cos * OUTLINE_SCALE,
    dy: (-13 * sin + 10 * sin2 + 6 * sin3 + 4 * sin4) * OUTLINE_SCALE,
  };
}

function createArcLengthTable() {
  const angles = new Float64Array(ARC_TABLE_SIZE + 1);
  const lengths = new Float64Array(ARC_TABLE_SIZE + 1);
  let previous = sampleOutline(0);
  let totalLength = 0;

  for (let index = 1; index <= ARC_TABLE_SIZE; index += 1) {
    const angle = (index / ARC_TABLE_SIZE) * TAU;
    const current = sampleOutline(angle);
    totalLength += Math.hypot(current.x - previous.x, current.y - previous.y);
    angles[index] = angle;
    lengths[index] = totalLength;
    previous = current;
  }

  return { angles, lengths, totalLength };
}

const ARC_LENGTH_TABLE = createArcLengthTable();

function angleAtArcFraction(fraction) {
  const target = fraction * ARC_LENGTH_TABLE.totalLength;
  let low = 0;
  let high = ARC_TABLE_SIZE;

  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (ARC_LENGTH_TABLE.lengths[middle] < target) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const startLength = ARC_LENGTH_TABLE.lengths[low];
  const endLength = ARC_LENGTH_TABLE.lengths[high];
  const segmentProgress =
    endLength === startLength
      ? 0
      : (target - startLength) / (endLength - startLength);

  return (
    ARC_LENGTH_TABLE.angles[low] +
    (ARC_LENGTH_TABLE.angles[high] - ARC_LENGTH_TABLE.angles[low]) *
      segmentProgress
  );
}

function createSurfaceSample(angle, latitudeSin) {
  const outline = sampleOutline(angle);
  const latitudeCos = Math.sqrt(Math.max(0, 1 - latitudeSin * latitudeSin));
  const centeredY = outline.y - SURFACE_CENTER_Y;

  const position = {
    x: outline.x * latitudeCos,
    y: SURFACE_CENTER_Y + centeredY * latitudeCos,
    z: HEART_DEPTH * latitudeSin,
  };

  const duX = outline.dx * latitudeCos;
  const duY = outline.dy * latitudeCos;
  const dvX = -outline.x * latitudeSin;
  const dvY = -centeredY * latitudeSin;
  const dvZ = HEART_DEPTH * latitudeCos;

  let nx = -dvZ * duY;
  let ny = dvZ * duX;
  let nz = dvX * duY - dvY * duX;
  const normalLength = Math.hypot(nx, ny, nz);

  if (normalLength < 1e-9) {
    nx = 0;
    ny = 0;
    nz = latitudeSin < 0 ? -1 : 1;
  } else {
    nx /= normalLength;
    ny /= normalLength;
    nz /= normalLength;
  }

  return { position, normal: { x: nx, y: ny, z: nz } };
}

export function createHeartAnchors({ count, seed }) {
  const anchorCount = Math.max(0, Math.floor(count));
  if (anchorCount === 0) {
    return [];
  }

  const random = createSeededRandom(seed);
  const longitudeStrata = Math.ceil(Math.sqrt(anchorCount * 2));
  const latitudeStrata = Math.ceil(anchorCount / longitudeStrata);
  const anchors = new Array(anchorCount);

  for (let index = 0; index < anchorCount; index += 1) {
    const longitudeCell = index % longitudeStrata;
    const latitudeCell = Math.floor(index / longitudeStrata);
    const longitudeFraction =
      (longitudeCell + random()) / longitudeStrata;
    const latitudeFraction = (latitudeCell + random()) / latitudeStrata;
    const angle = angleAtArcFraction(longitudeFraction);
    const latitudeSin = latitudeFraction * 2 - 1;
    const sample = createSurfaceSample(angle, latitudeSin);

    anchors[index] = {
      position: sample.position,
      normal: sample.normal,
      baseRotation: random() * TAU,
      baseScale: 0.75 + random() * 0.5,
      colorVariant: Math.floor(random() * COLOR_VARIANT_COUNT),
      noiseSeed: random(),
    };
  }

  return anchors;
}

export function createHeartDebugPositions(anchors) {
  const positions = new Float32Array(anchors.length * 3);

  for (let index = 0; index < anchors.length; index += 1) {
    const offset = index * 3;
    const position = anchors[index].position;
    positions[offset] = position.x;
    positions[offset + 1] = position.y;
    positions[offset + 2] = position.z;
  }

  return positions;
}
