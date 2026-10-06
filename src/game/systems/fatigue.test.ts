import { describe, expect, it } from 'vitest';
import { dispatchQuest, foundGuild, recall, rest } from '../actions';
import { createNewGame } from '../newGame';
import { advance } from '../sim';
import { fatigueSystem } from './fatigue';

function foundedGame() {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
  );
}

describe('fatigue system', () => {
  it('applies per-minute rates and clamps fatigue', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    const events: Parameters<typeof fatigueSystem>[2] = [];

    const activityByKind = {
      quest: {
        kind: 'quest' as const,
        id: 'a1',
        questId: 'rats-in-the-cellar',
        heroIds: [hero.id],
        startedAt: 0,
        endsAt: 60_000,
        nextEncounterAt: 30_000,
        encountersLeft: 1,
      },
      camp: {
        kind: 'camp' as const,
        id: 'a2',
        zoneId: 'reedlands',
        campId: 'marsh-edge',
        heroIds: [hero.id],
        startedAt: 0,
        spawnReadyAt: 60_000,
        nextSpawnNamed: false,
        kills: 0,
        namedKills: 0,
        recallAt: null,
      },
      gather: {
        kind: 'gather' as const,
        id: 'a3',
        heroId: hero.id,
        skill: 'mining' as const,
        startedAt: 0,
        nextYieldAt: 60_000,
      },
      rest: { kind: 'rest' as const, id: 'a4', heroId: hero.id, startedAt: 0 },
    };

    for (const [kind, activity] of Object.entries(activityByKind)) {
      hero.fatigue = 50;
      hero.injuredUntil = null;
      hero.activityId = activity.id;
      state.activities[activity.id] = activity;
      fatigueSystem(state, 1_000, events);
      const expectedRate = kind === 'gather' ? 0.5 : kind === 'rest' ? -3 : 1;
      expect(hero.fatigue).toBeCloseTo(50 + expectedRate / 60, 8);
      delete state.activities[activity.id];
    }

    hero.activityId = null;
    hero.injuredUntil = 5_000;
    hero.fatigue = 50;
    fatigueSystem(state, 1_000, events);
    expect(hero.fatigue).toBeCloseTo(50 - 1 / 60, 8);

    hero.injuredUntil = null;
    hero.fatigue = 99.99;
    hero.activityId = 'a1';
    state.activities.a1 = activityByKind.quest;
    fatigueSystem(state, 1_000, events);
    expect(hero.fatigue).toBe(100);
    hero.fatigue = 0;
    hero.activityId = activityByKind.rest.id;
    state.activities[activityByKind.rest.id] = activityByKind.rest;
    fatigueSystem(state, 1_000, events);
    expect(hero.fatigue).toBe(0);
  });

  it('starts and recalls rest activities, then finishes at zero fatigue', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    hero.fatigue = 0.05;

    const result = rest(hero.id)(state, 0);
    if (!('state' in result) || result.reason) throw new Error('Expected rest to start.');
    const activityId = result.state.heroes[hero.id]?.activityId;
    if (!activityId) throw new Error('Expected a rest activity.');
    expect(result.state.activities[activityId]?.kind).toBe('rest');

    const recalled = recall(activityId)(result.state, 0);
    if (!('state' in recalled) || recalled.reason) throw new Error('Expected rest to be recalled.');
    expect(recalled.state.heroes[hero.id]?.activityId).toBeNull();
    expect(recalled.state.activities[activityId]).toBeUndefined();

    const restarted = rest(hero.id)(recalled.state, 0);
    if (!('state' in restarted) || restarted.reason) throw new Error('Expected rest to restart.');
    const finished = advance(restarted.state, 1_000).state;
    expect(finished.heroes[hero.id]?.fatigue).toBe(0);
    expect(finished.heroes[hero.id]?.activityId).toBeNull();
    expect(finished.activities).toEqual({});
    expect(
      finished.log.some((line) => line.text === `${hero.name} has finished resting and is ready for duty.`),
    ).toBe(true);
  });

  it('keeps fatigue simulation invariant under chunking', () => {
    const initial = foundedGame();
    for (const hero of Object.values(initial.heroes)) hero.fatigue = 50;
    let chunked = initial;
    for (let second = 1; second <= 3_600; second += 1) {
      chunked = advance(chunked, second * 1_000).state;
    }
    const single = advance(initial, 3_600_000).state;
    expect(chunked).toEqual(single);
  });

  it('rejects resting heroes from quest assignment', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    if (!heroId) throw new Error('Expected a starter hero.');
    const hero = state.heroes[heroId];
    if (!hero) throw new Error('Expected a starter hero.');
    hero.fatigue = 1;
    const resting = rest(heroId)(state, 0);
    if (!('state' in resting) || resting.reason) throw new Error('Expected rest to start.');
    const dispatch = dispatchQuest('rats-in-the-cellar', [heroId])(resting.state, 0);
    expect('reason' in dispatch ? dispatch.reason : undefined).toBe('Hero must be Idle.');
  });
});
