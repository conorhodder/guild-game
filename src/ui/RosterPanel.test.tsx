import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foundGuild } from '../game/actions';
import { createItemInstance } from '../game/itemIds';
import { createNewGame } from '../game/newGame';
import { RosterPanel } from './RosterPanel';

afterEach(() => cleanup());

describe('RosterPanel', () => {
  it('shows the selected hero sheet fields and starter gear', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    const selected = game.heroes[game.heroOrder[0] ?? ''];

    render(<RosterPanel game={game} onEquip={vi.fn(() => null)} onUnequip={vi.fn(() => null)} />);

    expect(screen.getByRole('heading', { name: 'Roster' })).toBeDefined();
    expect(screen.getByRole('heading', { name: `${selected?.glyph} ${selected?.name}` })).toBeDefined();
    expect(screen.getByText('Class')).toBeDefined();
    expect(screen.getByText('Level')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Health')).toBeDefined();
    expect(screen.getByText('Fatigue')).toBeDefined();
    expect(screen.getByText('Max HP')).toBeDefined();
    expect(screen.getByText('Attack')).toBeDefined();
    expect(screen.getByText('Armor')).toBeDefined();
    expect(screen.getByText('Heal')).toBeDefined();
    expect(screen.getByText('0 / 100 XP')).toBeDefined();
    expect(screen.getByText('Offense: 7 / 10')).toBeDefined();
    expect(screen.getByText('Mining: 1 / 14')).toBeDefined();
    expect(screen.getByText('Main hand: Iron Shortsword')).toBeDefined();
    expect(screen.getByText('Off hand: Wooden Shield')).toBeDefined();
    expect(screen.getByText('Body: Chain Shirt')).toBeDefined();
    expect(screen.getByText('Trinket: —')).toBeDefined();
    expect(screen.getByText('Healthy')).toBeDefined();
    expect(screen.getByText('Idle')).toBeDefined();
  });

  it('shows a before-and-after stat preview before confirming an equip', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    const heroId = game.heroOrder[0];
    const hero = heroId ? game.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    const instance = createItemInstance(game, 'copper-band');
    game.itemInstances[instance.uid] = instance;
    game.stash[instance.uid] = instance;
    const onEquip = vi.fn(() => null);

    render(<RosterPanel game={game} onEquip={onEquip} onUnequip={vi.fn(() => null)} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose trinket' }), {
      target: { value: instance.uid },
    });

    expect(screen.getByText('Before → After')).toBeDefined();
    expect(screen.getByText('Max HP: 68 → 72 (+4)')).toBeDefined();
    expect(screen.getByText('Attack: 8 → 8 (+0)')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Equip' }));
    expect(onEquip).toHaveBeenCalledWith(hero.id, instance.uid);
  });

  it('disables invalid picker entries and explains the restriction', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    const instance = createItemInstance(game, 'rogue-rusty-dagger');
    game.itemInstances[instance.uid] = instance;
    game.stash[instance.uid] = instance;

    render(<RosterPanel game={game} onEquip={vi.fn(() => null)} onUnequip={vi.fn(() => null)} />);

    const option = screen.getByRole('option', {
      name: 'Rusted Dagger — Not available to warrior.',
    }) as HTMLOptionElement;
    expect(option.disabled).toBe(true);
  });
});
