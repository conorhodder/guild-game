import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from '../game/newGame';
import { appendLog } from '../game/systems/log';
import { LogPanel } from './LogPanel';

afterEach(() => {
  cleanup();
});

describe('LogPanel', () => {
  it('filters chronological lines by category and channel accessibly', () => {
    const game = createNewGame({ seed: 1, wallMs: 0, guildName: 'Test Guild' });
    appendLog(game, 'guild', 'system', 'Guild founded', undefined, 0);
    appendLog(game, 'quest:a1', 'combat', 'The marsh rat attacks', undefined, 40_000);
    appendLog(
      game,
      'quest:a1',
      'loot',
      'You receive a Marshglass Pendant.',
      true,
      80_000,
    );
    const onChannelChange = vi.fn();

    render(
      <LogPanel
        channelNames={{ 'quest:a1': 'Rats in the Cellar' }}
        game={game}
        onChannelChange={onChannelChange}
        selectedChannel="all"
      />,
    );

    const entries = screen.getAllByRole('listitem');
    expect(entries.map((entry) => entry.textContent)).toEqual([
      '[D1 00:00:00] Guild founded',
      '[D1 00:00:40] The marsh rat attacks',
      '[D1 00:01:20] ★ You receive a Marshglass Pendant.',
    ]);
    expect(screen.getAllByRole('log')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: '✓ Combat' }).getAttribute('aria-pressed'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '✓ Combat' }));
    expect(screen.queryByText('[D1 00:00:40] The marsh rat attacks')).toBeNull();
    expect(
      screen.getAllByRole('listitem').some(
        (entry) => entry.textContent === '[D1 00:00:00] Guild founded',
      ),
    ).toBe(true);

    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'quest:a1' } });
    expect(onChannelChange).toHaveBeenCalledWith('quest:a1');
    expect(screen.getByRole('option', { name: 'Rats in the Cellar' })).toBeDefined();
  });

  it('shows Jump to latest after scrolling up and pins new lines at the bottom', () => {
    const game = createNewGame({ seed: 1, wallMs: 0, guildName: 'Test Guild' });
    appendLog(game, 'guild', 'system', 'Guild founded', undefined, 0);
    const view = render(
      <LogPanel
        game={game}
        onChannelChange={vi.fn()}
        selectedChannel="all"
      />,
    );
    const scroll = screen.getByRole('region', { name: 'Log entries' }) as HTMLDivElement;
    Object.defineProperties(scroll, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, writable: true, value: 200 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });

    fireEvent.scroll(scroll);
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).toBeNull();

    scroll.scrollTop = 20;
    fireEvent.scroll(scroll);
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeDefined();

    appendLog(game, 'guild', 'system', 'A new day begins', undefined, 1_000);
    view.rerender(
      <LogPanel
        game={game}
        onChannelChange={vi.fn()}
        selectedChannel="all"
      />,
    );
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).toBeNull();
    expect(scroll.scrollTop).toBe(scroll.scrollHeight);
  });
});
