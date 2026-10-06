import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { foundGuild } from '../game/actions';
import { createNewGame } from '../game/newGame';
import { RosterPanel } from './RosterPanel';

describe('RosterPanel', () => {
  it('shows the selected hero sheet fields', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    const selected = game.heroes[game.heroOrder[0] ?? ''];

    render(<RosterPanel game={game} />);

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
    expect(screen.getByText('Main hand: —')).toBeDefined();
    expect(screen.getByText('Off hand: —')).toBeDefined();
    expect(screen.getByText('Body: —')).toBeDefined();
    expect(screen.getByText('Trinket: —')).toBeDefined();
    expect(screen.getByText('Healthy')).toBeDefined();
    expect(screen.getByText('Idle')).toBeDefined();
  });
});
