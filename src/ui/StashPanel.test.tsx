import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createItemInstance } from '../game/itemIds';
import { createNewGame } from '../game/newGame';
import { StashPanel } from './StashPanel';

describe('StashPanel', () => {
  it('lists item details and lets the player sell gear and materials', () => {
    const game = createNewGame({ seed: 7, wallMs: 0, guildName: 'The Wayfarers' });
    const instance = createItemInstance(game, 'copper-band');
    game.itemInstances[instance.uid] = instance;
    game.stash[instance.uid] = instance;
    game.materials['copper-ore'] = 3;
    const onSell = vi.fn(() => null);
    const onSellMaterial = vi.fn(() => null);

    render(
      <StashPanel game={game} onSell={onSell} onSellMaterial={onSellMaterial} />,
    );

    const commonRarity = screen.getAllByText('common')[0];
    expect(commonRarity?.classList.contains('rarity-common')).toBe(true);
    expect(screen.getByText('Slot: Trinket')).toBeDefined();
    expect(screen.getAllByText('Classes: All classes').length).toBeGreaterThan(0);
    expect(screen.getByText('Stats: HP +4')).toBeDefined();
    expect(screen.getByText('Value: 8 gold')).toBeDefined();
    expect(screen.getByText('Quantity: 3')).toBeDefined();
    expect(screen.getByText('Skill required: Mining 1')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Sell Copper Band for 8 gold' }));
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Quantity to sell Copper Ore' }),
      {
      target: { value: '2' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sell Copper Ore' }));

    expect(onSell).toHaveBeenCalledWith(instance.uid);
    expect(onSellMaterial).toHaveBeenCalledWith('copper-ore', 2);
  });
});
