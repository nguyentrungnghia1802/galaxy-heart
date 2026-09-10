import { describe, expect, it } from 'vitest';
import { WordCaptionTimeline } from '../src/captions/WordCaptionTimeline.js';

const options = { fadeIn: 0.15, holdDuration: 1.15, fadeOut: 0.45, lineFadeOut: 0.2, enterScale: 0.92, exitY: -6, exitBlur: 1.2 };
const words = [
  { time: 2, text: 'My', line: 1 },
  { time: 2.45, text: 'baby', line: 1, hold: 1.8 },
  { time: 4, text: 'I', line: 2 },
];

describe('word captions', () => {
  it('waits for each timestamp then independently fades, holds and exits', () => {
    const timeline = new WordCaptionTimeline(words, options);
    expect(timeline.sample(0, 1.99).opacity).toBe(0);
    expect(timeline.sample(0, 2).opacity).toBe(0);
    expect(timeline.sample(0, 2.075)).toMatchObject({ opacity: expect.closeTo(0.5), scale: expect.closeTo(0.96) });
    expect(timeline.sample(0, 2.3).opacity).toBe(1);
    expect(timeline.sample(1, 2.3).opacity).toBe(0);
    expect(timeline.sample(0, 3.525)).toMatchObject({ opacity: expect.closeTo(0.5), y: expect.closeTo(-3) });
    expect(timeline.sample(0, 3.75).opacity).toBe(0);
  });

  it('supports long holds but clears the outgoing line before the next one', () => {
    const timeline = new WordCaptionTimeline(words, options);
    expect(timeline.sample(1, 3.7).opacity).toBe(1);
    expect(timeline.sample(1, 3.9).opacity).toBeCloseTo(0.5);
    expect(timeline.sample(1, 4).opacity).toBe(0);
    expect(timeline.sample(2, 4.2).opacity).toBe(1);
  });

  it('recovers directly after backward seek, skipped frames, pause and timestamp edits', () => {
    const timeline = new WordCaptionTimeline(words, options);
    expect(timeline.sample(0, 30).opacity).toBe(0);
    expect(timeline.sample(0, 2.3).opacity).toBe(1);
    expect(timeline.sample(0, 2.3)).toEqual(timeline.sample(0, 2.3));
    expect(timeline.current(1.99)).toBe(null);
    expect(timeline.current(2.6)?.text).toBe('baby');
    expect(timeline.current(30)).toBe(null);
    const edited = new WordCaptionTimeline([{ ...words[0], time: 3.71 }], options);
    expect(edited.sample(0, 3.6).opacity).toBe(0);
    expect(edited.sample(0, 3.9).opacity).toBe(1);
  });

  it('rejects non-finite timestamps, invalid holds and interleaved lines', () => {
    expect(() => new WordCaptionTimeline([{ time: NaN, text: 'x', line: 1 }], options)).toThrow();
    expect(() => new WordCaptionTimeline([{ time: 1, text: 'x', line: 1, hold: -1 }], options)).toThrow();
    expect(() => new WordCaptionTimeline([...words, { time: 5, text: 'x', line: 1 }], options)).toThrow();
  });
});
