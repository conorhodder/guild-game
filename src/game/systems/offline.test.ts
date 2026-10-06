import { describe, expect, it } from 'vitest';
import { dispatchQuest, foundGuild, startCamp, startGather } from '../actions';
import { OFFLINE_CAP_MS, syncToWall } from '../clock';
import { createHero } from './heroes';
import { createNewGame } from '../newGame';
import { advance } from '../sim';
import type { SimEvent } from '../sim';
import { summarizeAbsence } from './offline';

function createBusyState() {
  const state = foundGuild('The Wayfarers')(
    createNewGame({ seed: 421, wallMs: 0, guildName: '' }),
  );
  const additionalClasses = ['warrior', 'cleric', 'rogue', 'wizard', 'warrior'] as const;
  for (const classId of additionalClasses) {
    const hero = createHero(state, classId, 20);
    state.heroes[hero.id] = hero;
    state.heroOrder.push(hero.id);
  }
  for (const hero of Object.values(state.heroes)) {
    hero.level = 20;
    hero.gather = { mining: 10, herbalism: 10 };
  }

  const firstCamp = startCamp('reedlands', 'marsh-edge', state.heroOrder.slice(0, 3))(
    state,
    0,
  );
  if (!('state' in firstCamp) || firstCamp.reason) throw new Error('Expected the first camp.');
  const secondCamp = startCamp(
    'cinder-march',
    'cinder-fields',
    state.heroOrder.slice(3, 6),
  )(firstCamp.state, 0);
  if (!('state' in secondCamp) || secondCamp.reason) throw new Error('Expected the second camp.');
  const firstGatherer = state.heroOrder[6];
  const secondGatherer = state.heroOrder[7];
  if (!firstGatherer || !secondGatherer) throw new Error('Expected eight heroes.');
  const mining = startGather(firstGatherer, 'mining')(secondCamp.state, 0);
  if (!('state' in mining) || mining.reason) throw new Error('Expected a mining job.');
  const herbalism = startGather(secondGatherer, 'herbalism')(mining.state, 0);
  if (!('state' in herbalism) || herbalism.reason) throw new Error('Expected an herbalism job.');
  return herbalism.state;
}

describe('offline progress summaries', () => {
  it('matches a 12-hour sync with 43,200 one-second advances', () => {
    const initial = createNewGame({ seed: 92, wallMs: 1000, guildName: '' });
    const wallEnd = initial.clock.lastWallMs + OFFLINE_CAP_MS;
    const offline = syncToWall(initial, wallEnd);
    let chunked = initial;
    for (let second = 1; second <= OFFLINE_CAP_MS / 1000; second += 1) {
      chunked = advance(chunked, second * 1000).state;
    }
    chunked.clock.lastWallMs = wallEnd;

    expect(offline.credited).toBe(OFFLINE_CAP_MS);
    expect(offline.state).toEqual(chunked);
  }, 30_000);

  it('caps a 30-hour absence at 12 hours and marks it as capped', () => {
    const initial = createNewGame({ seed: 13, wallMs: 0, guildName: '' });
    const rawDelta = 30 * 60 * 60 * 1000;
    const result = syncToWall(initial, rawDelta);
    const summary = summarizeAbsence(
      initial,
      result.state,
      result.events,
      result.credited,
      rawDelta,
    );

    expect(result.credited).toBe(OFFLINE_CAP_MS);
    expect(summary.rawDelta).toBe(rawDelta);
    expect(summary.credited).toBe(OFFLINE_CAP_MS);
    expect(summary.capped).toBe(true);
  });

  it('summarizes seeded progress from structured events and hero snapshots', () => {
    const before = foundGuild('The Wayfarers')(
      createNewGame({ seed: 77, wallMs: 0, guildName: '' }),
    );
    const heroId = before.heroOrder[0];
    const tiredHeroId = before.heroOrder[1];
    const hero = heroId ? before.heroes[heroId] : undefined;
    const tiredHero = tiredHeroId ? before.heroes[tiredHeroId] : undefined;
    if (!heroId || !tiredHeroId || !hero || !tiredHero) {
      throw new Error('Expected a starter party.');
    }
    hero.xp = 25;
    const after = structuredClone(before);
    const progressed = after.heroes[hero.id];
    if (!progressed) throw new Error('Expected the same hero.');
    progressed.level = 2;
    progressed.xp = 50;
    progressed.activityId = null;
    const tired = after.heroes[tiredHero.id];
    if (!tired) throw new Error('Expected the same tired hero.');
    tired.fatigue = 80;
    const events: SimEvent[] = [
      { type: 'levelUp', heroId, level: 2 },
      { type: 'skillUp', heroId, skill: 'mining', value: 2 },
      { type: 'skillUp', heroId, skill: 'mining', value: 3 },
      { type: 'gold', amount: 7 },
      { type: 'loot', itemId: 'morrow-heartstone', rarity: 'named' },
      { type: 'loot', itemId: 'marshglass-pendant', rarity: 'rare' },
      { type: 'loot', itemId: 'copper-ore', rarity: 'common' },
      { type: 'kill', monsterId: 'grizzlefang', named: true },
      { type: 'quest', questId: 'rats-in-the-cellar', outcome: 'complete', simMs: 6000 },
      { type: 'quest', questId: 'rats-in-the-cellar', outcome: 'failed', simMs: 7000 },
      { type: 'knockout', heroId },
    ];

    const summary = summarizeAbsence(before, after, events, OFFLINE_CAP_MS, 30 * 60 * 60 * 1000);

    expect(summary).toMatchObject({
      rawDelta: 30 * 60 * 60 * 1000,
      credited: OFFLINE_CAP_MS,
      capped: true,
      goldGained: 7,
      itemsByRarity: { common: 0, uncommon: 0, rare: 1, named: 1 },
      rareDrops: ['Marshglass Pendant'],
      namedDrops: ['Morrow Heartstone'],
      materials: [{ itemId: 'copper-ore', name: 'Copper Ore', quantity: 1 }],
      kills: 1,
      namedKills: 1,
      questsCompleted: 1,
      questsFailed: 1,
      knockouts: 1,
    });
    expect(summary.heroes).toContainEqual({
      heroId,
      name: hero.name,
      levelsGained: 1,
      xpGained: 59,
      skillUps: [{ skill: 'mining', count: 2, value: 3 }],
      knockouts: 1,
      needsAttention: false,
    });
    expect(summary.heroes[0]).toMatchObject({
      heroId: tiredHeroId,
      needsAttention: true,
    });
  });

  it('summarizes a seeded quest run without reading retained logs', () => {
    const founded = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    const dispatched = dispatchQuest('rats-in-the-cellar', founded.heroOrder)(founded, 0);
    if (!('state' in dispatched) || dispatched.reason) {
      throw new Error('Expected the first quest to dispatch.');
    }
    const before = dispatched.state;
    const result = advance(before, 120_000);
    before.log = [];
    result.state.log = [];
    const summary = summarizeAbsence(
      before,
      result.state,
      result.events,
      120_000,
      120_000,
    );

    expect(summary.kills).toBe(2);
    expect(summary.questsCompleted).toBe(1);
    expect(summary.goldGained).toBeGreaterThan(0);
    expect(summary.heroes.some((hero) => hero.xpGained > 0)).toBe(true);
    expect(summary.allQuiet).toBe(false);
  });

  it('finishes a 12-hour catch-up with two camps and two gatherers under five seconds', () => {
    const state = createBusyState();
    expect(state.heroOrder).toHaveLength(8);
    expect(Object.values(state.activities).filter((activity) => activity.kind === 'camp')).toHaveLength(2);
    expect(Object.values(state.activities).filter((activity) => activity.kind === 'gather')).toHaveLength(2);
    const startedAt = performance.now();

    const result = syncToWall(state, OFFLINE_CAP_MS);
    summarizeAbsence(state, result.state, result.events, result.credited, OFFLINE_CAP_MS);

    const elapsedMs = performance.now() - startedAt;
    console.info(`12-hour offline catch-up: ${elapsedMs.toFixed(1)} ms`);
    expect(elapsedMs).toBeLessThan(5000);
  }, 10_000);
});
