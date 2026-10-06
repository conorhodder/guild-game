import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { dismiss, foundGuild, hire } from '../game/actions';
import { createNewGame } from '../game/newGame';
import type { GameAction } from '../game/actions';
import type { GameState } from '../game/types';
import { RecruitBoard } from './RecruitBoard';

function applyAction(
  game: GameState,
  action: GameAction,
  update: (next: GameState) => void,
): string | null {
  const result = action(game, 0);
  if ('state' in result) {
    if (result.reason) return result.reason;
    update(result.state);
    return null;
  }
  update(result);
  return null;
}

function RecruitmentHarness({ initialGame }: { initialGame: GameState }) {
  const [game, setGame] = useState(initialGame);
  return (
    <RecruitBoard
      game={game}
      onHire={(index) => applyAction(game, hire(index), setGame)}
      onDismiss={(heroId) => applyAction(game, dismiss(heroId), setGame)}
    />
  );
}

describe('RecruitBoard', () => {
  afterEach(() => cleanup());

  it('hires a candidate and requires confirmation before dismissing a hero', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 287, wallMs: 0, guildName: '' }),
    );
    game.gold = 10_000;
    const dismissedHero = game.heroes[game.heroOrder[0] ?? ''];
    if (!dismissedHero) throw new Error('Expected a starter hero.');

    render(<RecruitmentHarness initialGame={game} />);
    expect(screen.getByText(/Refreshes in:/)).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: /^Hire / })[0] as HTMLElement);

    expect(screen.getByRole('heading', { name: 'Guild roster (4/8)' })).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: `Dismiss ${dismissedHero.name}` }),
    );
    expect(
      screen.getByText(
        `Dismiss ${dismissedHero.name}? Equipped gear returns to the stash.`,
      ),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm dismissal' }));
    expect(screen.getByRole('heading', { name: 'Guild roster (3/8)' })).toBeDefined();
  });
});
