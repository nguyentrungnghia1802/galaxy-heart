import { describe, expect, it } from 'vitest';

import { createSeededRandom } from '../src/utils/random.js';

function take(random, count) {
  const values = [];
  for (let index = 0; index < count; index += 1) {
    values.push(random());
  }
  return values;
}

describe('createSeededRandom', () => {
  it('repeats the same sequence for seed 1234', () => {
    const first = take(createSeededRandom(1234), 8);
    const second = take(createSeededRandom(1234), 8);

    expect(first).toEqual(second);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('changes the sequence when the seed changes', () => {
    expect(take(createSeededRandom(1234), 8)).not.toEqual(
      take(createSeededRandom(1235), 8),
    );
  });
});
