import { describe, expect, it } from 'vitest';
import { foundGuild, startCamp } from './actions';
import { createNewGame } from './newGame';

function foundedGame() {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
  );
}

describe('camp actions', () => {
  it('uses quest party limits and rejects missing, duplicate, busy, injured, or exhausted heroes', () => {
    const state = foundedGame();
    const [first, second, third] = state.heroOrder;
    if (!first || !second || !third) throw new Error('Expected three starter heroes.');

    expect(startCamp('missing', 'marsh-edge', [first])(state, 0)).toMatchObject({
      reason: 'Camp not found.',
    });
    expect(startCamp('reedlands', 'missing', [first])(state, 0)).toMatchObject({
      reason: 'Camp not found.',
    });
    expect(startCamp('reedlands', 'marsh-edge', [])(state, 0)).toMatchObject({
      reason: 'Choose between 1 and 4 heroes.',
    });
    expect(startCamp('reedlands', 'marsh-edge', [first, second, third, first, first])(state, 0))
      .toMatchObject({ reason: 'Choose between 1 and 4 heroes.' });
    expect(startCamp('reedlands', 'marsh-edge', [first, first])(state, 0)).toMatchObject({
      reason: 'Choose each hero only once.',
    });

    state.heroes[first]!.injuredUntil = 60_000;
    expect(startCamp('reedlands', 'marsh-edge', [first])(state, 0)).toMatchObject({
      reason: 'Hero is Injured.',
    });
    state.heroes[first]!.injuredUntil = null;
    state.heroes[first]!.fatigue = 100;
    expect(startCamp('reedlands', 'marsh-edge', [first])(state, 0)).toMatchObject({
      reason: 'Fatigue must be below 100.',
    });
    state.heroes[first]!.fatigue = 0;
    state.activities.a99 = {
      kind: 'rest',
      id: 'a99',
      heroId: first,
      startedAt: 0,
    };
    state.heroes[first]!.activityId = 'a99';
    expect(startCamp('reedlands', 'marsh-edge', [first])(state, 0)).toMatchObject({
      reason: 'Hero must be Idle.',
    });
  });

  it('creates a camp activity and prevents a second party entering the same camp', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    if (!heroId) throw new Error('Expected a starter hero.');

    const result = startCamp('reedlands', 'marsh-edge', [heroId])(state, 0);
    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    expect(result.reason).toBeUndefined();
    const activity = Object.values(result.state.activities).find(
      (candidate) => candidate.kind === 'camp',
    );
    expect(activity).toMatchObject({
      kind: 'camp',
      zoneId: 'reedlands',
      campId: 'marsh-edge',
      heroIds: [heroId],
      kills: 0,
      namedKills: 0,
      recallAt: null,
      spawnReadyAt: 0,
    });
    expect(result.state.heroes[heroId]?.activityId).toBe(activity?.id);
    expect(
      startCamp('reedlands', 'marsh-edge', [state.heroOrder[1] ?? ''])(result.state, 0),
    ).toMatchObject({ reason: 'That camp already has a party.' });
  });
});
