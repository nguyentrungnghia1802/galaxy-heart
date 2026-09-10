import { describe, expect, it } from 'vitest';
import { StateMachine } from '../src/app/StateMachine.js';
import { MUSIC_REVEAL_CONFIG } from '../src/config/musicReveal.js';
import { MusicSystem } from '../src/music/MusicSystem.js';
import { SoundSystem } from '../src/audio/SoundSystem.js';

describe('music reveal flow', () => {
  it('accepts one idle click, waits for media completion, and stays final', () => {
    const machine = new StateMachine();
    machine.start();
    machine.transitionTo('PETAL_FLIGHT');
    machine.triggerGemClick();
    expect(machine.state).toBe('PETAL_FLIGHT');
    machine.transitionTo('GEM_IDLE');
    machine.triggerGemClick();
    expect(machine.state).toBe('GEM_ACTIVATION');
    machine.update(0.2);
    machine.triggerGemClick();
    expect(machine.elapsed).toBe(0.2);
    machine.update(100);
    expect(machine.state).toBe('MUSIC_REVEAL');
    machine.completeMusic();
    expect(machine.state).toBe('FINAL');
    machine.triggerGemClick();
    machine.update(100);
    expect(machine.state).toBe('FINAL');
  });

  it('configures heart.mp3 music volume at 0.49 (70% of baseline 0.7)', () => {
    expect(MUSIC_REVEAL_CONFIG.music.volume).toBe(0.49);
    expect(MUSIC_REVEAL_CONFIG.music.volume).toBeCloseTo(0.7 * 0.7, 5);

    // MusicSystem uses 0.49 by default
    const music = new MusicSystem({}, { createAudio: () => ({ addEventListener() {}, load() {} }) });
    expect(music.volume).toBe(0.49);

    // SoundSystem bus volumes remain independent and unchanged
    const sound = new SoundSystem();
    expect(sound.heartbeatVolume).toBe(1.25);

    // Captions sync and ending thresholds remain intact
    expect(MUSIC_REVEAL_CONFIG.captions[0].time).toBe(0.0);
    expect(MUSIC_REVEAL_CONFIG.ending.captionEnd).toBe(23.95);
    expect(MUSIC_REVEAL_CONFIG.ending.musicEnd).toBe(24.25);
    expect(MUSIC_REVEAL_CONFIG.ending.fadeDuration).toBe(3.65);
  });
});

