import { describe, expect, it } from 'vitest';
import { OFFLINE_CAP_MS, syncToWall } from './clock';
import { createNewGame } from './newGame';
import { rngNext } from './rng';
import { advance, type SimSystem } from './sim';

const consumingSystem: SimSystem = (state) => {
  state.gold += rngNext(state);
  state.nextId += 1;
};

describe('simulation clock', () => {
  it('is invariant to one-second versus single large advances', () => {
    const start = createNewGame({ seed: 2468, wallMs: 0, guildName: 'Clockwork' });
    let chunked = start;

    for (let second = 1; second <= 3600; second += 1) {
      chunked = advance(chunked, second * 1000, [consumingSystem]).state;
    }
    const singleAdvance = advance(start, 3600 * 1000, [consumingSystem]).state;

    expect(chunked).toEqual(singleAdvance);
    expect(chunked.nextId).toBe(3601);
  });

  it('carries sub-tick remainders forward', () => {
    const start = createNewGame({ seed: 17, wallMs: 0, guildName: '' });
    const first = advance(start, 400, [consumingSystem]).state;
    const second = advance(first, 999, [consumingSystem]).state;
    const chunked = advance(second, 1000, [consumingSystem]).state;
    const single = advance(start, 1000, [consumingSystem]).state;

    expect(first.nextId).toBe(1);
    expect(second.nextId).toBe(1);
    expect(chunked).toEqual(single);
    expect(chunked.nextId).toBe(2);
  });

  it('grants no progress for a backward wall clock', () => {
    const start = createNewGame({ seed: 3, wallMs: 10_000, guildName: '' });
    const result = syncToWall(start, 5_000);

    expect(result.credited).toBe(0);
    expect(result.state.clock.simMs).toBe(0);
    expect(result.state.clock.lastWallMs).toBe(5_000);
    expect(result.state.rng).toBe(start.rng);
  });

  it('caps a 48-hour wall-clock jump at 12 hours', () => {
    const start = createNewGame({ seed: 3, wallMs: 0, guildName: '' });
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const result = syncToWall(start, fortyEightHours);

    expect(result.credited).toBe(OFFLINE_CAP_MS);
    expect(result.state.clock.simMs).toBe(OFFLINE_CAP_MS);
    expect(result.state.clock.lastWallMs).toBe(fortyEightHours);
  });

  it('retains sub-tick wall-time remainder across synchronizations', () => {
    const start = createNewGame({ seed: 17, wallMs: 0, guildName: '' });
    const first = syncToWall(start, 500, [consumingSystem]);
    const second = syncToWall(first.state, 1000, [consumingSystem]);
    const single = syncToWall(start, 1000, [consumingSystem]);

    expect(first.state.clock.simMs).toBe(500);
    expect(second.state).toEqual(single.state);
    expect(second.state.nextId).toBe(2);
  });
});
