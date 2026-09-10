import { describe, expect, it } from 'vitest';

import {
  CINEMATIC_STATES,
  DEFAULT_STATE_DURATIONS,
  StateMachine,
} from '../src/app/StateMachine.js';

function createFastDurations(duration = 1) {
  return Object.fromEntries(
    CINEMATIC_STATES.map((state) => [
      state,
      state === 'FINAL' ? Number.POSITIVE_INFINITY : duration,
    ]),
  );
}

describe('StateMachine', () => {
  it('transitions through every cinematic state in order', () => {
    const entered = [];
    const exited = [];
    const machine = new StateMachine({
      durations: createFastDurations(),
      onEnter: (state) => entered.push(state),
      onExit: (state) => exited.push(state),
    });

    expect(machine.state).toBe('BOOT');
    machine.start();
    expect(machine.state).toBe('PRELOAD');

    for (let index = 1; index < CINEMATIC_STATES.length - 1; index += 1) {
      machine.update(1);
      expect(machine.state).toBe(CINEMATIC_STATES[index + 1]);
    }

    expect(entered).toEqual(CINEMATIC_STATES.slice(1));
    expect(exited).toEqual(CINEMATIC_STATES.slice(0, -1));
  });

  it('keeps finite-state progress inside zero and one', () => {
    const durations = createFastDurations(2);
    durations.PRELOAD = 0;
    const machine = new StateMachine({ durations });

    machine.start();
    machine.update(0);
    expect(machine.state).toBe('INTRO');
    expect(machine.progress).toBe(0);

    machine.update(0.5);
    expect(machine.progress).toBe(0.25);
    machine.update(100);
    expect(machine.progress).toBe(1);
  });

  it('carries frame overflow across state boundaries deterministically', () => {
    const machine = new StateMachine({ durations: createFastDurations(1) });

    machine.start();
    machine.update(2.25);

    expect(machine.state).toBe('HEART_IDLE');
    expect(machine.progress).toBe(0.25);
  });

  it('runs six steady 0.90 second cycles and one final lub-dub before explosion', () => {
    const machine = new StateMachine();
    machine.start();
    machine.transitionTo('HEARTBEAT');

    for (let cycle = 1; cycle < 6; cycle += 1) {
      machine.update(0.9);
      expect(machine.state).toBe('HEARTBEAT');
    }

    machine.update(0.9);
    expect(machine.state).toBe('TENSION');

    machine.update(0.445);
    expect(machine.state).toBe('TENSION');
    machine.update(0.001);
    expect(machine.state).toBe('EXPLOSION');
  });

  it('keeps FINAL stable until reset', () => {
    const machine = new StateMachine({ durations: createFastDurations(0.01) });
    machine.start();
    machine.update(10);

    expect(machine.state).toBe('FINAL');
    machine.update(10_000);
    expect(machine.state).toBe('FINAL');
    expect(machine.progress).toBe(1);
  });

  it('reset returns to BOOT and clears all elapsed time', () => {
    const machine = new StateMachine({ durations: createFastDurations(1) });
    machine.start();
    machine.update(3.5);

    machine.reset();

    expect(machine.state).toBe('BOOT');
    expect(machine.progress).toBe(0);
    expect(machine.elapsed).toBe(0);
    expect(machine.totalElapsed).toBe(0);
    machine.update(2);
    expect(machine.state).toBe('BOOT');
  });

  it('simulates the default cinematic through GEM_IDLE and user click into FINAL', () => {
    const machine = new StateMachine();
    machine.start();
    const preIdleDuration =
      DEFAULT_STATE_DURATIONS.INTRO +
      DEFAULT_STATE_DURATIONS.HEART_IDLE +
      DEFAULT_STATE_DURATIONS.HEARTBEAT +
      DEFAULT_STATE_DURATIONS.RAPID_HEARTBEAT +
      DEFAULT_STATE_DURATIONS.TENSION +
      DEFAULT_STATE_DURATIONS.EXPLOSION +
      DEFAULT_STATE_DURATIONS.PETAL_FLIGHT;

    machine.update(preIdleDuration);
    expect(machine.state).toBe('GEM_IDLE');

    // Trigger user click on gem
    machine.triggerGemClick();
    expect(machine.state).toBe('GEM_ACTIVATION');

    machine.update(DEFAULT_STATE_DURATIONS.GEM_ACTIVATION + 100);
    expect(machine.state).toBe('MUSIC_REVEAL');
    machine.completeMusic();
    expect(machine.state).toBe('FINAL');
  });

  it('allows manual transitionTo between valid states', () => {
    const machine = new StateMachine();
    machine.start();
    machine.transitionTo('GEM_IDLE');
    expect(machine.state).toBe('GEM_IDLE');
    machine.triggerGemClick();
    expect(machine.state).toBe('GEM_ACTIVATION');
  });
});

