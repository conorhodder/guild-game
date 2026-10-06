import { describe, expect, it } from 'vitest';
import { foundGuild } from '../actions';
import { createItemInstance } from '../itemIds';
import { createNewGame } from '../newGame';
import { equipPreview } from './items';

describe('equipment stat preview', () => {
  it('calculates before, after, and signed stat deltas', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    const heroId = game.heroOrder[0];
    const hero = heroId ? game.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    const instance = createItemInstance(game, 'copper-band');
    game.itemInstances[instance.uid] = instance;
    game.stash[instance.uid] = instance;

    const preview = equipPreview(game, hero.id, instance.uid);

    expect('reason' in preview).toBe(false);
    if ('reason' in preview) return;
    expect(preview.before).toEqual({ maxHp: 68, attack: 8, armor: 5, heal: 0 });
    expect(preview.after).toEqual({ maxHp: 72, attack: 8, armor: 5, heal: 0 });
    expect(preview.delta).toEqual({ maxHp: 4, attack: 0, armor: 0, heal: 0 });
  });
});
