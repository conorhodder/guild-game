import { describe, expect, it } from 'vitest';
import { foundGuild } from '../actions';
import { createNewGame } from '../newGame';
import { knockOut } from './recovery';

describe('knockout handling', () => {
  it('clears the activity and logs a highlighted knockout line', () => {
    const state = foundGuild('The Wayfarers')(
      createNewGame({ seed: 1, wallMs: 0, guildName: '' }),
    );
    const heroId = state.heroOrder[0];
    const hero = heroId ? state.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    hero.activityId = 'a99';
    const events: Parameters<typeof knockOut>[3] = [];

    knockOut(state, hero.id, 'quest:a99', events, 12_000);

    expect(hero.activityId).toBeNull();
    expect(state.log.at(-1)).toMatchObject({
      simMs: 12_000,
      channel: 'quest:a99',
      category: 'combat',
      text: `${hero.name} has been knocked out!`,
      highlight: true,
    });
    expect(events).toHaveLength(1);
  });
});
