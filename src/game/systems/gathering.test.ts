import { describe, expect, it } from 'vitest';
import { foundGuild, startCamp, startGather } from '../actions';
import { createNewGame } from '../newGame';
import {
  advance,
  defaultSystems,
} from '../sim';
import { campSystem } from './camps';
import { fatigueSystem } from './fatigue';
import { gatheringSystem, gatheringIntervalMs, rollGatheringMaterial } from './gathering';
import { questSystem } from './quests';
import { recruitmentSystem } from './recruitment';
import { recoverySystem } from './recovery';

function foundedGame(seed = 42) {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed, wallMs: 0, guildName: '' }),
  );
}

function startMining(seed: number, skillValue: number) {
  const state = foundedGame(seed);
  const heroId = state.heroOrder[0];
  if (!heroId) throw new Error('Expected a starter hero.');
  const hero = state.heroes[heroId];
  if (!hero) throw new Error('Expected a starter hero.');
  hero.gather.mining = skillValue;
  const result = startGather(heroId, 'mining')(state, 0);
  if (!('state' in result) || result.reason) throw new Error('Expected mining to start.');
  return { state: result.state, heroId };
}

describe('gathering system', () => {
  it('uses the hero skill value to set the yield interval', () => {
    expect(gatheringIntervalMs('mining', 1)).toBe(59_500);
    expect(gatheringIntervalMs('mining', 5)).toBe(57_500);
    expect(gatheringIntervalMs('mining', 10)).toBe(55_000);
    expect(gatheringIntervalMs('herbalism', 1)).toBe(59_500);
    expect(gatheringIntervalMs('herbalism', 4)).toBe(58_000);
    expect(gatheringIntervalMs('herbalism', 10)).toBe(55_000);
  });

  it('yields one best-or-lower tier material with a loot log and persisted count', () => {
    const { state, heroId } = startMining(184, 10);
    const activity = Object.values(state.activities).find(
      (candidate) => candidate.kind === 'gather',
    );
    if (activity?.kind !== 'gather') throw new Error('Expected a gathering activity.');
    const expected = rollGatheringMaterial(structuredClone(state), 'mining', 10);
    if (!expected) throw new Error('Expected an available mining material.');

    const before = advance(state, activity.nextYieldAt - 1_000).state;
    expect(before.materials).toEqual({});
    expect(before.activities[activity.id]).toMatchObject({ yields: 0 });

    const yielded = advance(state, activity.nextYieldAt).state;

    expect(yielded.materials[expected.id]).toBe(1);
    expect(yielded.activities[activity.id]).toMatchObject({ yields: 1 });
    expect(yielded.log).toContainEqual(
      expect.objectContaining({
        channel: `gather:${heroId}`,
        category: 'loot',
        text: `You receive ${expected.name}.`,
      }),
    );
  });

  it('uses a seeded ten-percent chance to yield the tier below', () => {
    const state = createNewGame({ seed: 7_391, wallMs: 0, guildName: '' });
    const samples = 10_000;
    let lowerTier = 0;
    for (let sample = 0; sample < samples; sample += 1) {
      if (rollGatheringMaterial(state, 'mining', 30)?.id === 'copper-ore') lowerTier += 1;
    }

    expect(Math.abs(lowerTier / samples - 0.1)).toBeLessThanOrEqual(0.02);
  });

  it('stops and logs when gathering fatigue reaches 100', () => {
    const { state, heroId } = startMining(65, 1);
    const hero = state.heroes[heroId];
    const activity = Object.values(state.activities).find(
      (candidate) => candidate.kind === 'gather',
    );
    if (!hero || activity?.kind !== 'gather') {
      throw new Error('Expected an active gatherer.');
    }
    hero.fatigue = 99.999;

    const stopped = advance(state, 1_000).state;

    expect(stopped.heroes[heroId]?.fatigue).toBe(100);
    expect(stopped.heroes[heroId]?.activityId).toBeNull();
    expect(stopped.activities[activity.id]).toBeUndefined();
    expect(stopped.log.at(-1)?.text).toContain('too exhausted to continue gathering');
  });

  it('runs gathering deterministically for a fixed seed', () => {
    const first = startMining(513, 10);
    const second = startMining(513, 10);

    expect(advance(first.state, 5 * 60_000)).toEqual(
      advance(second.state, 5 * 60_000),
    );
  });

  it('keeps a camp and gatherer invariant under chunked simulation', () => {
    const initial = foundedGame(572);
    const [campHeroA, campHeroB, gatherHero] = initial.heroOrder;
    if (!campHeroA || !campHeroB || !gatherHero) {
      throw new Error('Expected a three-hero starter party.');
    }
    const campResult = startCamp('reedlands', 'marsh-edge', [campHeroA, campHeroB])(
      initial,
      0,
    );
    if (!('state' in campResult) || campResult.reason) {
      throw new Error('Expected a party to start camping.');
    }
    const gatherResult = startGather(gatherHero, 'mining')(campResult.state, 0);
    if (!('state' in gatherResult) || gatherResult.reason) {
      throw new Error('Expected gathering to start.');
    }

    let chunked = gatherResult.state;
    for (let second = 1; second <= 3_600; second += 1) {
      chunked = advance(chunked, second * 1_000).state;
    }
    const single = advance(gatherResult.state, 3_600_000).state;

    expect(chunked).toEqual(single);
  });

  it('runs systems in quests, camps, gathering, fatigue, recovery, recruitment order', () => {
    expect(defaultSystems).toEqual([
      questSystem,
      campSystem,
      gatheringSystem,
      fatigueSystem,
      recoverySystem,
      recruitmentSystem,
    ]);
  });
});
