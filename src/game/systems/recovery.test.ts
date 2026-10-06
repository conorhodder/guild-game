import { describe, expect, it } from 'vitest';
import { foundGuild } from '../actions';
import { createNewGame } from '../newGame';
import { recoverySystem, knockOut } from './recovery';

describe('knockout handling', () => {
  it('clears the activity, deducts progress XP, and logs a highlighted knockout line', () => {
    const state = foundGuild('The Wayfarers')(
      createNewGame({ seed: 1, wallMs: 0, guildName: '' }),
    );
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    hero.activityId = 'a99';
    hero.xp = 99.9;
    const events: Parameters<typeof knockOut>[3] = [];

    knockOut(state, hero.id, 'quest:a99', events, 12_000);

    expect(hero.activityId).toBeNull();
    expect(hero.xp).toBe(75.9);
    expect(hero.injuredUntil).toBe(12_000 + (5 + hero.level) * 60_000);
    expect(state.log.at(-1)).toMatchObject({
      simMs: 12_000,
      channel: 'quest:a99',
      category: 'combat',
      text: `${hero.name} has been knocked out! 24 XP lost.`,
      highlight: true,
    });
    expect(events).toHaveLength(1);
  });

  it('clears injuries at the recovery tick and logs readiness', () => {
    const state = foundGuild('The Wayfarers')(
      createNewGame({ seed: 1, wallMs: 0, guildName: '' }),
    );
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    hero.injuredUntil = 5_000;
    const events: Parameters<typeof recoverySystem>[2] = [];

    recoverySystem(state, 4_999, events);
    expect(hero.injuredUntil).toBe(5_000);
    recoverySystem(state, 5_000, events);

    expect(hero.injuredUntil).toBeNull();
    expect(state.log.at(-1)).toMatchObject({
      simMs: 5_000,
      category: 'system',
      text: `${hero.name} has recovered and is ready for duty.`,
    });
    expect(events).toHaveLength(1);
  });
});
