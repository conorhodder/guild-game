import { describe, expect, it } from 'vitest';
import { monstersById } from '../data/monsters';
import { foundGuild } from '../actions';
import { createNewGame } from '../newGame';
import { COMBAT_ROUND_MS, MAX_COMBAT_ROUNDS, resolveFight } from './combat';

function createParty(seed = 42) {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed, wallMs: 0, guildName: '' }),
  );
}

function resolve(state: ReturnType<typeof createParty>, monsterId: string) {
  const events: Parameters<typeof resolveFight>[2] = [];
  const result = resolveFight(
    state,
    {
      heroIds: state.heroOrder,
      monsterId,
      channel: 'combat:test',
      startMs: 12_000,
    },
    events,
  );
  return { state, result, events };
}

describe('combat resolver', () => {
  it('is deterministic for a fixed seed', () => {
    const first = resolve(createParty(17), 'marsh-rat');
    const second = resolve(createParty(17), 'marsh-rat');

    expect(first).toEqual(second);
    expect(first.result.outcome).toBe('won');
    expect(first.state.seenMonsters).toEqual(['marsh-rat']);
    expect(
      first.state.log
        .filter((line) => line.channel === 'combat:test')
        .every((line) => line.simMs >= 12_000),
    ).toBe(true);
  });

  it('targets a standing Warrior before other party members', () => {
    const state = createParty();
    const warrior = state.heroOrder
      .map((id) => state.heroes[id])
      .find((hero) => hero?.classId === 'warrior');
    if (!warrior) throw new Error('Expected a Warrior in the starter party.');

    resolve(state, 'stone-ogre');

    const firstMonsterAttack = state.log.find((line) =>
      line.text.startsWith('A stone ogre tries to hit') ||
      line.text.startsWith('A stone ogre hits'),
    );
    expect(firstMonsterAttack?.text).toContain(warrior.name);
  });

  it('has the Cleric heal an ally below sixty percent HP', () => {
    const state = createParty();

    resolve(state, 'ember-drake');

    expect(state.log.some((line) => line.text.includes(' heals '))).toBe(true);
    expect(
      state.log
        .filter((line) => line.text.includes('points of damage'))
        .every((line) => /for \d+ points of damage\.$/.test(line.text)),
    ).toBe(true);
    expect(
      state.log
        .filter((line) => line.text.includes(' heals '))
        .every((line) => /for \d+ HP\.$/.test(line.text)),
    ).toBe(true);
  });

  it('awards no XP for a trivial target', () => {
    const state = createParty();
    for (const hero of Object.values(state.heroes)) hero.level = 6;

    const { result } = resolve(state, 'marsh-rat');

    expect(result.outcome).toBe('won');
    expect(Object.values(state.heroes).every((hero) => hero.xp === 0)).toBe(true);
  });

  it('flees after exactly thirty rounds without XP or loot', () => {
    const state = createParty();
    const monster = monstersById['morrow-the-hollow'];
    if (!monster) throw new Error('Expected the named level-seven monster.');
    const original = { hp: monster.hp, damage: monster.damage, armor: monster.armor };
    Object.assign(monster, { hp: 10_000, damage: 1, armor: 1_000 });
    const startingGold = state.gold;

    try {
      const { result } = resolve(state, monster.id);

      expect(result).toEqual({
        outcome: 'fled',
        endMs: 12_000 + MAX_COMBAT_ROUNDS * COMBAT_ROUND_MS,
        knockedOut: [],
      });
      expect(state.gold).toBe(startingGold);
      expect(Object.values(state.heroes).every((hero) => hero.xp === 0)).toBe(true);
      expect(state.log.some((line) => line.text.includes('flees after 30 rounds'))).toBe(true);
    } finally {
      Object.assign(monster, original);
    }
  });
});
