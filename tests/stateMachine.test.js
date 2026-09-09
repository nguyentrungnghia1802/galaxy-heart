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
      state === 'END' ? Number.POSITIVE_INFINITY : duration,
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

  it('keeps END stable until reset', () => {
    const machine = new StateMachine({ durations: createFastDurations(0.01) });
    machine.start();
    machine.update(10);

    expect(machine.state).toBe('END');
    machine.update(10_000);
    expect(machine.state).toBe('END');
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

  it('simulates the default cinematic into END without browser timers', () => {
    const machine = new StateMachine();
    const finiteDuration = Object.values(DEFAULT_STATE_DURATIONS)
      .filter(Number.isFinite)
      .reduce((sum, duration) => sum + duration, 0);

    machine.start();
    machine.update(finiteDuration);

    expect(finiteDuration).toBe(13.4);
    expect(machine.state).toBe('END');
  });
});
