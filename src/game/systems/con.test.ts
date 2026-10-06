import { describe, expect, it } from 'vitest';
import { conTier } from './con';

describe('con tiers', () => {
  it.each([
    [-6, 'trivial'],
    [-5, 'trivial'],
    [-4, 'easy'],
    [-3, 'easy'],
    [-2, 'easy'],
    [-1, 'even'],
    [0, 'even'],
    [1, 'even'],
    [2, 'tough'],
    [3, 'tough'],
    [4, 'deadly'],
    [5, 'deadly'],
  ] as const)('classifies a level difference of %i as %s', (diff, expected) => {
    expect(conTier(5 + diff, [5])).toBe(expected);
  });

  it('rounds the party average before classifying the con', () => {
    expect(conTier(4, [1, 2])).toBe('tough');
  });
});
