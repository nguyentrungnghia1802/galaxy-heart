import { describe, expect, it } from 'vitest';

import { clamp } from '../src/utils/math.js';

describe('clamp', () => {
  it('keeps a value inside the inclusive bounds', () => {
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
