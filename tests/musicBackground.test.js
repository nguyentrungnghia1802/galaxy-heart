import { describe, it, expect } from 'vitest';
import { PetalSystem } from '../src/petals/PetalSystem.js';
import { createHeartAnchors } from '../src/heart/HeartSurface.js';

describe('music background continuity', () => {
  it('keeps dispersed petals alive and moving throughout a long final sequence', () => {
    const petals = new PetalSystem({ count: 32 });
    petals.attachToHeart(createHeartAnchors({ count: 32, seed: 1234 }));
    for (let n = 0; n < 64; n++) petals.update(0.05, { state: 'PETAL_FLIGHT' });
    const mesh = petals.mesh;
    petals.update(0.016, { state: 'GEM_IDLE' });
    const before = petals.buffers.position.slice();
    for (let n = 0; n < 6000; n++) petals.update(0.05, { state: 'MUSIC_REVEAL' });
    expect(petals.buffers.active.some(value => value === 1)).toBe(true);
    expect(petals.buffers.position).not.toEqual(before);
    expect(petals.mesh).toBe(mesh);
    petals.dispose();
  });
});
