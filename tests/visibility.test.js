import { describe, expect, it, vi } from 'vitest';

import { VisibilityClock } from '../src/utils/visibility.js';

class FakeDocument extends EventTarget {
  constructor() {
    super();
    this.hidden = false;
  }

  setHidden(hidden) {
    this.hidden = hidden;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

describe('VisibilityClock', () => {
  it('drops hidden elapsed time and resumes with a zero-delta frame', () => {
    const target = new FakeDocument();
    const onPause = vi.fn();
    const onResume = vi.fn();
    const clock = new VisibilityClock({
      target,
      maxDt: 0.05,
      onPause,
      onResume,
    });
    clock.start();

    expect(clock.tick(1_000)).toBe(0);
    expect(clock.tick(1_016)).toBeCloseTo(0.016, 6);
    target.setHidden(true);
    expect(clock.tick(31_000)).toBe(0);
    target.setHidden(false);
    expect(clock.tick(31_016)).toBe(0);
    expect(clock.tick(31_032)).toBeCloseTo(0.016, 6);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('caps ordinary long frames and removes its listener on stop', () => {
    const target = new FakeDocument();
    const onPause = vi.fn();
    const clock = new VisibilityClock({ target, maxDt: 0.05, onPause });
    clock.start();
    clock.tick(0);

    expect(clock.tick(1_000)).toBe(0.05);
    clock.stop();
    target.setHidden(true);
    expect(onPause).not.toHaveBeenCalled();
  });
});
