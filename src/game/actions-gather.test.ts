import { describe, expect, it } from 'vitest';
import { foundGuild, recall, sellMaterial, startGather } from './actions';
import { createNewGame } from './newGame';

function foundedGame() {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed: 109, wallMs: 0, guildName: '' }),
  );
}

describe('gather actions', () => {
  it('starts an Idle hero gathering and blocks busy or exhausted heroes', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!heroId || !hero) throw new Error('Expected a starter hero.');

    const result = startGather(heroId, 'mining')(state, 0);
    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    const activity = Object.values(result.state.activities).find(
      (candidate) => candidate.kind === 'gather',
    );
    expect(activity).toMatchObject({
      kind: 'gather',
      heroId,
      skill: 'mining',
      startedAt: 0,
      nextYieldAt: 60_000,
      yields: 0,
    });
    expect(result.state.heroes[heroId]?.activityId).toBe(activity?.id);
    expect(startGather(heroId, 'herbalism')(result.state, 0)).toMatchObject({
      reason: 'Hero must be Idle.',
    });

    const exhausted = foundedGame();
    const exhaustedHeroId = exhausted.heroOrder[0];
    if (!exhaustedHeroId) throw new Error('Expected a starter hero.');
    exhausted.heroes[exhaustedHeroId]!.fatigue = 100;
    expect(startGather(exhaustedHeroId, 'mining')(exhausted, 0)).toMatchObject({
      reason: 'Fatigue must be below 100.',
    });
  });

  it('recalls a gathering job and returns its hero to Idle', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    if (!heroId) throw new Error('Expected a starter hero.');
    const started = startGather(heroId, 'herbalism')(state, 0);
    if (!('state' in started) || started.reason) throw new Error('Expected gathering to start.');
    const activity = Object.values(started.state.activities).find(
      (candidate) => candidate.kind === 'gather',
    );
    if (!activity) throw new Error('Expected a gathering activity.');

    const recalled = recall(activity.id)(started.state, 0);

    expect('state' in recalled).toBe(true);
    if (!('state' in recalled)) return;
    expect(recalled.state.activities[activity.id]).toBeUndefined();
    expect(recalled.state.heroes[heroId]?.activityId).toBeNull();
    expect(recalled.state.log.at(-1)?.text).toContain('has stopped gathering');
  });

  it('sells gathered materials through the existing material sale action', () => {
    const state = foundedGame();
    state.materials['mithril-ore'] = 2;
    const initialGold = state.gold;

    const result = sellMaterial('mithril-ore', 1)(state, 0);

    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    expect(result.state.gold).toBe(initialGold + 30);
    expect(result.state.materials['mithril-ore']).toBe(1);
  });
});
