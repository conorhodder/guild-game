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
    expect(screen.getByRole('tab', { name: 'Stash' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeDefined();
    expect(screen.getByText('The Wayfarers')).toBeDefined();
    expect(screen.getByRole('button', { name: /Warrior.*Level 1/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Cleric.*Level 1/ })).toBeDefined();
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
