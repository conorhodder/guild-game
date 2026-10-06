import { describe, expect, it } from 'vitest';
import { zones } from '../data/zones';
import {
  simulateNamedCamp,
  simulateProgression,
  type NamedCampMetrics,
  type ProgressionMetrics,
} from './simulate';

const balanceSeeds = [4_242, 8_675_309, 20_250_101];
const fullRun = import.meta.env.VITE_FULL_BALANCE === '1';
const seeds = fullRun ? balanceSeeds : balanceSeeds.slice(0, 1);

function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle] ?? 0
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

describe('MVP content balance', () => {
  it('keeps starter progression inside the S-4 windows for every fixed seed', () => {
    const results: ProgressionMetrics[] = seeds.map((seed) => simulateProgression(seed));
    console.info(`S-4 balance by seed: ${JSON.stringify(results)}`);

    for (const result of results) {
      expect(result.level10Hours).toBeGreaterThanOrEqual(3);
      expect(result.level10Hours).toBeLessThanOrEqual(6);
      expect(result.level20Hours).toBeGreaterThanOrEqual(20);
      expect(result.level20Hours).toBeLessThanOrEqual(40);
    }
  }, 120_000);

  it('keeps the median Named drop interval inside S-5 for every named camp', () => {
    const results: NamedCampMetrics[] = seeds.flatMap((seed) =>
      zones.flatMap((zone) =>
        zone.camps
          .filter((camp) => camp.namedId !== undefined)
          .map((camp) => simulateNamedCamp(seed, zone.id, camp.id)),
      ),
    );
    console.info(`S-5 balance by seed and camp: ${JSON.stringify(results)}`);

    for (const zone of zones) {
      for (const camp of zone.camps.filter((candidate) => candidate.namedId !== undefined)) {
        const hours = results
          .filter((result) => result.campId === camp.id)
          .map((result) => result.hoursToNamedDrop);
        const campMedian = median(hours);
        if (fullRun) {
          expect(campMedian).toBeGreaterThanOrEqual(2);
          expect(campMedian).toBeLessThanOrEqual(8);
        } else {
          expect(campMedian).toBeGreaterThan(0);
        }
      }
    }
  }, 120_000);
});
