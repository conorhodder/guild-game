import { describe, expect, it } from 'vitest';
import { foundGuild } from '../actions';
import { createNewGame } from '../newGame';
import type { GameState } from '../types';
import {
  createHero,
  gatherCap,
  grantXp,
  heroStats,
  heroStatus,
  skillCap,
  xpToNext,
} from './heroes';

function newGame(): GameState {
  return createNewGame({ seed: 12345, wallMs: 0, guildName: '' });
}

describe('heroes', () => {
  it('founds a trimmed guild with a tank, healer, and damage hero', () => {
    const state = foundGuild('  The Wayfarers  ')(newGame());
    const heroes = state.heroOrder.map((id) => state.heroes[id]).filter((hero) => hero !== undefined);
    const classes = heroes.map((hero) => hero.classId);

    expect(state.guildName).toBe('The Wayfarers');
    expect(heroes).toHaveLength(3);
    expect(classes).toContain('warrior');
    expect(classes).toContain('cleric');
    expect(classes.some((classId) => classId === 'rogue' || classId === 'wizard')).toBe(true);
    expect(heroes.every((hero) => hero.level === 1)).toBe(true);
    expect(state.log[0]?.text).toContain('Welcome to The Wayfarers');
  });

  it('rejects blank or overlong guild names', () => {
    expect(() => foundGuild('   ')).toThrow(/1 and 32 characters/);
    expect(() => foundGuild('x'.repeat(33))).toThrow(/1 and 32 characters/);
  });

  it('creates deterministic heroes with class skills, glyphs, and caps', () => {
    const state = newGame();
    const hero = createHero(state, 'warrior', 1);

    expect(hero.id).toBe('h1');
    expect(hero.glyph).toBe('🛡️');
    expect(hero.skills).toEqual({ offense: 7, defense: 7 });
    expect(hero.gather).toEqual({ mining: 1, herbalism: 1 });
    expect(skillCap(hero.level)).toBe(10);
    expect(gatherCap(hero.level)).toBe(14);
    expect(heroStats(hero, state)).toEqual({ maxHp: 60, attack: 6, armor: 0, heal: 0 });
  });

  it('derives hero status from injury and activity', () => {
    const state = foundGuild('Guild')(newGame());
    const hero = state.heroes[state.heroOrder[0] ?? ''];
    if (!hero) throw new Error('Expected a starter hero.');

    expect(heroStatus(hero, state)).toBe('Idle');
    hero.injuredUntil = 10_000;
    expect(heroStatus(hero, state)).toBe('Injured');
    hero.injuredUntil = null;
    state.activities['a1'] = {
      kind: 'quest',
      id: 'a1',
      questId: 'q1',
      heroIds: [hero.id],
      startedAt: 0,
      endsAt: 10_000,
      nextEncounterAt: 5000,
      encountersLeft: 1,
    };
    hero.activityId = 'a1';
    expect(heroStatus(hero, state)).toBe('On quest');
  });

  it('applies the XP curve, multiple level-ups, and discards XP at level 20', () => {
    const state = foundGuild('Guild')(newGame());
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    const events: Parameters<typeof grantXp>[3] = [];

    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(459);
    grantXp(state, hero.id, xpToNext(1) + xpToNext(2) + 40, events);

    expect(hero.level).toBe(3);
    expect(hero.xp).toBe(40);
    expect(events.filter((event) => event.type === 'levelUp')).toHaveLength(2);
    expect(events.filter((event) => event.type === 'log')).toHaveLength(2);
    expect(events.filter((event) => event.type === 'log').every(
      (event) => event.type === 'log' && event.line.highlight,
    )).toBe(true);
    expect(state.log[1]?.text).toBe(`${hero.name} has gained a level! Welcome to level 2!`);

    hero.level = 19;
    hero.xp = 0;
    events.length = 0;
    grantXp(state, hero.id, 1_000_000, events);
    expect(hero.level).toBe(20);
    expect(hero.xp).toBe(0);
    expect(events.filter((event) => event.type === 'levelUp')).toHaveLength(1);
    grantXp(state, hero.id, 500, events);
    expect(hero.xp).toBe(0);
  });
});
