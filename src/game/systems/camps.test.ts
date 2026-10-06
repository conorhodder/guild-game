import { describe, expect, it } from 'vitest';
import { foundGuild, recall, startCamp } from '../actions';
import { campsById } from '../data/zones';
import { monstersById } from '../data/monsters';
import { createNewGame } from '../newGame';
import { advance } from '../sim';
import { rollNamedSpawn } from './camps';

function campingParty(seed = 42, partySize = 3) {
  const founded = foundGuild('The Wayfarers')(
    createNewGame({ seed, wallMs: 0, guildName: '' }),
  );
  const result = startCamp(
    'reedlands',
    'marsh-edge',
    founded.heroOrder.slice(0, partySize),
  )(founded, 0);
  if (!('state' in result) || result.reason) throw new Error('Expected the party to camp.');
  const activity = Object.values(result.state.activities).find(
    (candidate) => candidate.kind === 'camp',
  );
  if (!activity || activity.kind !== 'camp') throw new Error('Expected a camp activity.');
  activity.nextSpawnNamed = false;
  return { state: result.state, activity };
}

describe('camp system', () => {
  it('runs deterministic fights and counts kills', () => {
    const first = campingParty(18);
    const second = campingParty(18);
    const firstResult = advance(first.state, 1_000);
    const secondResult = advance(second.state, 1_000);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.state.seenMonsters.length).toBeGreaterThan(0);
    expect(firstResult.state.activities[first.activity.id]).toMatchObject({
      kind: 'camp',
      kills: 1,
      namedKills: 0,
      spawnReadyAt: expect.any(Number),
    });
  });

  it('recalls a camp on the next simulation tick', () => {
    const { state, activity } = campingParty();
    const recalled = recall(activity.id)(state, 0);
    expect('state' in recalled).toBe(true);
    if (!('state' in recalled)) return;
    expect(recalled.state.activities[activity.id]).toMatchObject({ recallAt: 1_000 });
    expect(recalled.state.heroes[activity.heroIds[0] ?? '']?.activityId).toBe(activity.id);

    const beforeTick = advance(recalled.state, 999).state;
    expect(beforeTick.activities[activity.id]).toBeDefined();
    const nextTick = advance(recalled.state, 1_000).state;
    expect(nextTick.activities[activity.id]).toBeUndefined();
    expect(activity.heroIds.every((id) => nextTick.heroes[id]?.activityId === null)).toBe(true);
  });

  it('retreats when fewer than half of the starting party remain or a member is exhausted', () => {
    const outnumbered = campingParty(1, 3);
    outnumbered.activity.spawnReadyAt = 10_000;
    const [first, second] = outnumbered.activity.heroIds;
    if (!first || !second) throw new Error('Expected a three-hero party.');
    outnumbered.state.heroes[first]!.activityId = null;
    outnumbered.state.heroes[second]!.activityId = null;
    const retreated = advance(outnumbered.state, 1_000).state;

    expect(retreated.activities[outnumbered.activity.id]).toBeUndefined();
    expect(retreated.log.at(-1)).toMatchObject({
      text: 'Your party has retreated from Marsh Edge.',
      highlight: true,
    });

    const exhausted = campingParty(2, 2);
    exhausted.activity.spawnReadyAt = 10_000;
    exhausted.state.heroes[exhausted.activity.heroIds[0] ?? '']!.fatigue = 100;
    const fatigueRetreat = advance(exhausted.state, 1_000).state;
    expect(fatigueRetreat.activities[exhausted.activity.id]).toBeUndefined();
    expect(fatigueRetreat.log.at(-1)?.text).toBe('Your party has retreated from Marsh Edge.');
  });

  it('ends the camp after a full-party wipe', () => {
    const camp = campsById['marsh-edge'];
    const monster = monstersById['marsh-rat'];
    if (!camp || !monster) throw new Error('Expected camp and monster data.');
    const originalMonsters = [...camp.monsters];
    const originalStats = { hp: monster.hp, damage: monster.damage, armor: monster.armor };
    camp.monsters.splice(0, camp.monsters.length, 'marsh-rat');
    Object.assign(monster, { hp: 1_000_000, damage: 10_000, armor: 1_000_000 });

    try {
      const { state, activity } = campingParty(3, 1);
      const defeated = advance(state, 1_000).state;
      expect(defeated.activities[activity.id]).toBeUndefined();
      expect(defeated.heroes[activity.heroIds[0] ?? '']?.activityId).toBeNull();
      expect(defeated.log.some((line) => line.text === 'Your party has been defeated at Marsh Edge.')).toBe(
        true,
      );
    } finally {
      camp.monsters.splice(0, camp.monsters.length, ...originalMonsters);
      Object.assign(monster, originalStats);
    }
  });

  it('keeps named spawn decisions within ten percent of the configured rate', () => {
    const camp = campsById['marsh-edge'];
    if (!camp) throw new Error('Expected camp data.');
    const chance = camp.namedChance;
    const samples = Math.max(10_000, Math.ceil(2_000 / chance));
    const state = createNewGame({ seed: 734_901, wallMs: 0, guildName: '' });
    let named = 0;
    for (let sample = 0; sample < samples; sample += 1) {
      if (rollNamedSpawn(state, camp)) named += 1;
    }

    const observedRate = named / samples;
    expect(Math.abs(observedRate - chance) / chance).toBeLessThanOrEqual(0.1);
  });
});
