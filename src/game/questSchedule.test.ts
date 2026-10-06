import { describe, expect, it } from 'vitest';
import { encounterTime } from './questSchedule';

describe('quest encounter scheduling', () => {
  it('spaces encounters evenly and rounds each one up to the simulation tick', () => {
    expect(encounterTime(1001, 120_000, 0, 2)).toBe(42_000);
    expect(encounterTime(1001, 120_000, 1, 2)).toBe(82_000);
  });
});
