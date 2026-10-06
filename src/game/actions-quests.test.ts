import { describe, expect, it } from 'vitest';
import { dispatchQuest, foundGuild } from './actions';
import { createNewGame } from './newGame';

function foundedGame() {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
  );
}

describe('quest dispatch', () => {
  it('dispatches a valid party and aligns encounter times to the simulation tick', () => {
    const state = foundedGame();
    state.clock.simMs = 2000;
    const heroIds = state.heroOrder.slice(0, 2);

    const result = dispatchQuest('rats-in-the-cellar', heroIds)(state, 0);

    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    expect(result.reason).toBeUndefined();
    const activity = Object.values(result.state.activities)[0];
    expect(activity).toMatchObject({
      kind: 'quest',
      questId: 'rats-in-the-cellar',
      heroIds,
      startedAt: 2000,
      endsAt: 122_000,
      nextEncounterAt: 42_000,
      encountersLeft: 2,
    });
    if (activity?.kind !== 'quest') throw new Error('Expected an active quest.');
    expect(result.state.activities[activity.id]).toBeDefined();
    for (const heroId of heroIds) expect(result.state.heroes[heroId]?.activityId).toBe(activity.id);
    expect(state.heroes[heroIds[0] ?? '']?.activityId).toBeNull();
    expect(result.state.log.at(-1)?.channel).toBe(`quest:${activity.id}:rats-in-the-cellar`);
  });

  it('rejects unknown quests, invalid party sizes, duplicates, busy, injured, and exhausted heroes', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    const otherIds = state.heroOrder.slice(1);
    if (!heroId) throw new Error('Expected a starter hero.');

    const reasonFor = (questId: string, ids: string[]) => {
      const result = dispatchQuest(questId, ids)(state, 0);
      return 'reason' in result ? result.reason : undefined;
    };
    expect(reasonFor('unknown', [heroId])).toBe('Quest not found.');
    expect(reasonFor('rats-in-the-cellar', [])).toBe('Choose between 1 and 4 heroes.');
    expect(reasonFor('rats-in-the-cellar', [heroId, heroId])).toBe(
      'Choose each hero only once.',
    );

    state.heroes[heroId]!.injuredUntil = 60_000;
    expect(reasonFor('rats-in-the-cellar', [heroId])).toBe('Hero is Injured.');
    state.heroes[heroId]!.injuredUntil = null;
    state.heroes[heroId]!.fatigue = 100;
    expect(reasonFor('rats-in-the-cellar', [heroId])).toBe('Fatigue must be below 100.');
    state.heroes[heroId]!.fatigue = 0;
    state.heroes[heroId]!.activityId = 'a90';
    state.activities.a90 = {
      kind: 'rest',
      id: 'a90',
      heroId,
      startedAt: 0,
    };
    expect(reasonFor('rats-in-the-cellar', [heroId])).toBe('Hero must be Idle.');
    expect(reasonFor('rats-in-the-cellar', otherIds)).toBeUndefined();
  });
});
