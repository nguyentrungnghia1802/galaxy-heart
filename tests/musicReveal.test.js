import { describe, expect, it } from 'vitest';
import { StateMachine } from '../src/app/StateMachine.js';

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
});
