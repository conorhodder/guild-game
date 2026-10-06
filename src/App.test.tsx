import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createNewGame } from './game/newGame';
import { gameStore } from './store';
import { SettingsPanel } from './ui/SettingsPanel';

describe('App', () => {
  afterEach(() => cleanup());
  afterAll(() => gameStore.destroy());

  it('shows the founding form and creates the starter roster', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: "The Guildmaster's Ledger" })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Found your guild' })).toBeDefined();
    fireEvent.change(screen.getByRole('textbox', { name: 'Guild name' }), {
      target: { value: '  The Wayfarers  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Found your guild' }));

    expect(screen.getByRole('tablist', { name: 'Game sections' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Roster', selected: true })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Quests' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Zones' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Recruit' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Stash' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Log' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeDefined();
    expect(screen.getByText('The Wayfarers')).toBeDefined();
    expect(screen.getByRole('button', { name: /Warrior.*Level 1/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Cleric.*Level 1/ })).toBeDefined();

    const game = gameStore.getState();
    const heroId = game?.heroOrder[0];
    const hero = heroId ? game?.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected the starter party.');
    fireEvent.click(screen.getByRole('tab', { name: 'Quests' }));
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(hero.name) }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Dispatch Rats in the Cellar' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'View log' }));

    const activeQuest = Object.values(gameStore.getState()?.activities ?? {}).find(
      (activity) => activity.kind === 'quest',
    );
    if (activeQuest?.kind !== 'quest') throw new Error('Expected an active quest.');
    expect(screen.getByRole('tab', { name: 'Log', selected: true })).toBeDefined();
    expect(screen.getByLabelText('Channel')).toHaveProperty(
      'value',
      `quest:${activeQuest.id}:${activeQuest.questId}`,
    );
    expect(screen.getByText('Your party has set out on Rats in the Cellar.')).toBeDefined();
  });

  it('reports an invalid import without changing the current game', () => {
    const game = createNewGame({ seed: 42, wallMs: 1000, guildName: 'Test guild' });
    const onImport = vi.fn();
    render(<SettingsPanel game={game} onImport={onImport} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Paste save data' }), {
      target: { value: 'invalid save' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByRole('alert').textContent).toContain('invalid or unsupported');
    expect(onImport).not.toHaveBeenCalled();
  });
});
