import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { gameStore } from './store';

describe('App', () => {
  afterEach(() => cleanup());
  afterAll(() => gameStore.destroy());

  it('shows the game title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: "The Guildmaster's Ledger" })).toBeDefined();
    expect(screen.getByRole('tablist', { name: 'Game sections' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Settings', selected: true })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Download .txt' })).toBeDefined();
  });

  it('reports an invalid import without changing the current game', () => {
    const previousState = gameStore.getState();
    render(<App />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Paste save data' }), {
      target: { value: 'invalid save' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByRole('alert').textContent).toContain('invalid or unsupported');
    expect(gameStore.getState()).toBe(previousState);
  });
});
