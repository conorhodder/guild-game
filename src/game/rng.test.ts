import { describe, expect, it } from 'vitest';
import { createNewGame } from './newGame';
import { rngInt, rngNext, rngPick } from './rng';

describe('seeded random number generator', () => {
  it('produces the same sequence from the same seed', () => {
    const first = createNewGame({ seed: 123456, wallMs: 0, guildName: '' });
    const second = createNewGame({ seed: 123456, wallMs: 0, guildName: '' });
    const firstSequence = Array.from({ length: 20 }, () => rngNext(first));
    const secondSequence = Array.from({ length: 20 }, () => rngNext(second));

    expect(firstSequence).toEqual(secondSequence);
    expect(first.rng).toBe(second.rng);
    expect(firstSequence.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('supports inclusive integer ranges and seeded picks', () => {
    const first = createNewGame({ seed: 7, wallMs: 0, guildName: '' });
    const second = createNewGame({ seed: 7, wallMs: 0, guildName: '' });
    const choices = ['warrior', 'cleric', 'rogue'];

    expect(rngInt(first, 4, 8)).toBe(rngInt(second, 4, 8));
    expect(rngPick(first, choices)).toBe(rngPick(second, choices));
    expect(() => rngPick(first, [])).toThrow(/empty array/);
  });
});
