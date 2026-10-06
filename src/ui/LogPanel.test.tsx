import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createNewGame } from '../game/newGame';
import { appendLog } from '../game/systems/log';
import { LogPanel } from './LogPanel';

describe('LogPanel', () => {
  it('filters newest-first lines by category and channel accessibly', () => {
    const game = createNewGame({ seed: 1, wallMs: 0, guildName: 'Test Guild' });
    appendLog(game, 'guild', 'system', 'Guild founded');
    appendLog(game, 'quest:a1', 'combat', 'The marsh rat attacks');
    appendLog(game, 'quest:a1', 'loot', 'You receive a Marshglass Pendant.', true);
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
      '★ You receive a Marshglass Pendant.',
      'The marsh rat attacks',
      'Guild founded',
    ]);
    expect(screen.getAllByRole('log')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Combat' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Combat' }));
    expect(screen.queryByText('The marsh rat attacks')).toBeNull();
    expect(screen.getByText('Guild founded')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'quest:a1' } });
    expect(onChannelChange).toHaveBeenCalledWith('quest:a1');
    expect(screen.getByRole('option', { name: 'Rats in the Cellar' })).toBeDefined();
  });
});
