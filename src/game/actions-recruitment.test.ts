import { describe, expect, it } from 'vitest';
import { dismiss, foundGuild, getHireReason, hire } from './actions';
import { starterGear } from './data/items';
import { createNewGame } from './newGame';
import { hireCost, ROSTER_LIMIT } from './systems/recruitment';
import type { Slot } from './types';

function foundedGame() {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed: 41, wallMs: 0, guildName: '' }),
  );
}

describe('recruitment actions', () => {
  it('hires a candidate, charges the listed cost, and equips class starter gear', () => {
    const state = foundedGame();
    state.gold = 10_000;
    const candidateIndex = 0;
    const candidate = state.recruitment.candidates[candidateIndex];
    if (!candidate) throw new Error('Expected a recruitment candidate.');
    const cost = hireCost(candidate.level);

    const result = hire(candidateIndex)(state, 0);

    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    const hired = result.state.heroes[candidate.id];
    expect(hired).toBeDefined();
    expect(hired?.classId).toBe(candidate.classId);
    expect(result.state.heroOrder).toContain(candidate.id);
    expect(result.state.gold).toBe(state.gold - cost);
    for (const [slot, itemId] of Object.entries(starterGear[candidate.classId])) {
      if (!itemId) continue;
      const uid = hired?.equipment[slot as Slot];
      expect(uid).toBeDefined();
      expect(result.state.itemInstances[uid ?? '']?.itemId).toBe(itemId);
    }
    expect(result.state.recruitment.candidates).toHaveLength(3);
    expect(
      new Set(result.state.recruitment.candidates.map((hero) => hero.classId)).size,
    ).toBeGreaterThan(1);
  });

  it('returns a reason for insufficient gold and a full roster', () => {
    const state = foundedGame();
    state.gold = 0;
    expect(getHireReason(state, 0)).toMatch(/Need \d+ gold; you have 0/);
    const shortResult = hire(0)(state, 0);
    expect('reason' in shortResult && shortResult.reason).toMatch(/Need \d+ gold/);

    const fullRoster = foundedGame();
    fullRoster.gold = 10_000;
    const template = fullRoster.heroes[fullRoster.heroOrder[0] ?? ''];
    if (!template) throw new Error('Expected a starter hero.');
    while (fullRoster.heroOrder.length < ROSTER_LIMIT) {
      const id = `extra-${fullRoster.heroOrder.length}`;
      fullRoster.heroes[id] = { ...template, id, equipment: {} };
      fullRoster.heroOrder.push(id);
    }
    expect(getHireReason(fullRoster, 0)).toBe('The roster is full (8 heroes).');
    const fullResult = hire(0)(fullRoster, 0);
    expect('reason' in fullResult && fullResult.reason).toBe(
      'The roster is full (8 heroes).',
    );
  });

  it('dismisses only Idle heroes and returns equipped gear to the stash', () => {
    const state = foundedGame();
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!heroId || !hero) throw new Error('Expected a starter hero.');
    const equipped = Object.values(hero.equipment);

    const result = dismiss(heroId)(state, 0);

    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    expect(result.state.heroes[heroId]).toBeUndefined();
    expect(result.state.heroOrder).not.toContain(heroId);
    for (const uid of equipped) {
      expect(result.state.stash[uid]).toEqual(state.itemInstances[uid]);
    }
    expect(result.state.log.at(-1)?.text).toContain(`${hero.name} has been dismissed`);

    const busyState = foundedGame();
    const busyHeroId = busyState.heroOrder[0];
    if (!busyHeroId) throw new Error('Expected a starter hero.');
    const busyHero = busyState.heroes[busyHeroId];
    if (!busyHero) throw new Error('Expected a starter hero.');
    busyHero.injuredUntil = 60_000;
    const rejected = dismiss(busyHeroId)(busyState, 0);
    expect('reason' in rejected && rejected.reason).toBe(
      'Only Idle heroes can be dismissed.',
    );
  });
});
