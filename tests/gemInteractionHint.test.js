import { describe, expect, it } from 'vitest';

import {
  GemInteractionHint,
  shouldShowGemHint,
} from '../src/gem/GemInteractionHint.js';

describe('Gem interaction hint', () => {
  it('stays hidden for the first three seconds and appears afterwards', () => {
    expect(shouldShowGemHint('GEM_IDLE', 2.999, 3)).toBe(false);
    expect(shouldShowGemHint('GEM_IDLE', 3, 3)).toBe(true);
    expect(shouldShowGemHint('GEM_IDLE', 7, 3)).toBe(true);
  });

  it('only appears during gem idle and validates the configured delay', () => {
    expect(shouldShowGemHint('GEM_ACTIVATION', 9, 3)).toBe(false);
    expect(shouldShowGemHint('MUSIC_REVEAL', 9, 3)).toBe(false);
    expect(() => new GemInteractionHint(null, { delay: 0 })).toThrow();
  });
});
