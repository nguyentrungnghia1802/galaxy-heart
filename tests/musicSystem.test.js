import { describe, expect, it } from 'vitest';
import { CaptionTimeline } from '../src/captions/CaptionTimeline.js';
import { MusicSystem } from '../src/music/MusicSystem.js';

const lines = [{ start: 11, end: 14, text: 'First' }, { start: 14, end: 17, text: 'Second' }];
describe('CaptionTimeline', () => {
  it('samples media time, fades and clears gaps, including seeks and dropped frames', () => {
    const timeline = new CaptionTimeline(lines, 0.5);
    expect(timeline.opacity(0, 10)).toBe(0);
    expect(timeline.opacity(0, 11)).toBe(0);
    expect(timeline.opacity(0, 11.25)).toBeCloseTo(0.5);
    expect(timeline.opacity(0, 12)).toBe(1);
    expect(timeline.opacity(0, 13.75)).toBeCloseTo(0.5);
    expect(timeline.opacity(0, 14)).toBe(0);
    expect(timeline.opacity(1, 16)).toBe(1);
    expect(timeline.opacity(1, 30)).toBe(0);
    expect(timeline.opacity(0, 12)).toBe(1);
  });
  it('rejects ambiguous or invalid intervals', () => {
    expect(() => new CaptionTimeline([{ start: 2, end: 1, text: 'bad' }])).toThrow();
    expect(() => new CaptionTimeline([...lines, { start: 16, end: 19, text: 'overlap' }])).toThrow();
  });
});

class Media extends EventTarget {
  currentTime = 0; duration = 90; readyState = 1; paused = true; ended = false;
  plays = 0; loads = 0;
  load() { this.loads++; }
  play() { this.plays++; this.paused = false; return this.failure ? Promise.reject(this.failure) : Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute() {}
}
function harness(config = {}) {
  const audio = new Media();
  const param = { value: 0, setValueAtTime(v) { this.value = v; }, cancelScheduledValues() {}, linearRampToValueAtTime(v) { this.value = v; } };
  const ctx = { currentTime: 0, destination: {}, createGain: () => ({ gain: param, connect() {}, disconnect() {} }), createMediaElementSource: () => ({ connect() {}, disconnect() {} }) };
  const music = new MusicSystem({ src: 'test-only.mp3', startTime: 10, endTime: 20, volume: 0.4, ...config }, { createAudio: () => audio, getContext: () => ctx });
  return { audio, music, param };
}
describe('MusicSystem', () => {
  it('does not construct or fetch audio without a source', () => {
    const music = new MusicSystem({ src: '' }, { createAudio: () => { throw Error('unexpected audio'); } });
    music.begin();
    expect(music.finished).toBe(true);
  });
  it('primes silently once, starts at segment origin, pauses and finishes once', async () => {
    const { music, audio, param } = harness();
    await music.arm();
    expect(audio.paused).toBe(true);
    expect(param.value).toBe(0);
    await music.begin();
    expect(audio.currentTime).toBe(10);
    expect(param.value).toBe(0.4);
    music.begin();
    expect(audio.plays).toBe(2);
    audio.currentTime = 15;
    music.pause();
    await music.play();
    expect(audio.currentTime).toBe(15);
    audio.currentTime = 20.1;
    music.update();
    expect(music.finished).toBe(true);
    expect(audio.paused).toBe(true);
    await music.play();
    expect(audio.plays).toBe(3);
    music.dispose();
  });
  it('handles pending play followed by stop without restarting', async () => {
    const { music, audio } = harness();
    let resolve;
    audio.play = () => new Promise(r => { resolve = r; });
    const pending = music.begin();
    music.stop();
    resolve();
    await pending;
    expect(audio.paused).toBe(true);
    expect(music.finished).toBe(true);
  });
  it('does not let stale play resolution pause a newer resume', async () => {
    const { music, audio } = harness();
    const pending = [];
    audio.play = () => { audio.paused = false; return new Promise(resolve => pending.push(resolve)); };
    const first = music.begin();
    music.pause();
    const resumed = music.play();
    pending[1]();
    await resumed;
    pending[0]();
    await first;
    expect(audio.paused).toBe(false);
    expect(music.status).toBe('playing');
  });
  it('does not begin in background when priming resolves after pause', async () => {
    const { music, audio } = harness();
    let resolve;
    audio.play = () => { audio.paused = false; return new Promise(r => { resolve = r; }); };
    const arm = music.arm();
    const begin = music.begin();
    music.pause();
    resolve();
    await arm;
    await begin;
    expect(music.status).toBe('paused');
    expect(audio.paused).toBe(true);
  });
  it('reports blocked playback without running the caption clock or finishing', async () => {
    const { music, audio } = harness();
    audio.failure = new DOMException('gesture', 'NotAllowedError');
    await music.begin();
    expect(music.status).toBe('blocked');
    expect(music.finished).toBe(false);
    audio.failure = null;
    await music.play();
    expect(music.status).toBe('playing');
  });
  it('handles metadata/trim errors, natural end and terminal media failures', async () => {
    const { music, audio } = harness({ endTime: null });
    await music.begin();
    audio.ended = true;
    audio.dispatchEvent(new Event('ended'));
    expect(music.finished).toBe(true);
    const other = harness({ startTime: 100, endTime: null });
    await other.music.begin();
    expect(other.music.status).toBe('error');
  });
});
