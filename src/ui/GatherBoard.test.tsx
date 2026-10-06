import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { foundGuild, recall, startGather } from '../game/actions';
import { createNewGame } from '../game/newGame';
import type { GameAction } from '../game/actions';
import type { GatherSkill, GameState } from '../game/types';
import { GatherBoard } from './GatherBoard';

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

function GatheringHarness({ initialGame }: { initialGame: GameState }) {
  const [game, setGame] = useState(initialGame);
  return (
    <GatherBoard
      game={game}
      onRecall={(activityId) => applyAction(game, recall(activityId), setGame)}
      onStartGather={(heroId, skill: GatherSkill) =>
        applyAction(game, startGather(heroId, skill), setGame)
      }
    />
  );
}

describe('GatherBoard', () => {
  afterEach(() => cleanup());

  it('starts and recalls a gatherer while showing skills and yields', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 335, wallMs: 0, guildName: '' }),
    );
    const heroId = game.heroOrder[0];
    const hero = heroId ? game.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    render(<GatheringHarness initialGame={game} />);

    expect(screen.getAllByText('Mining: 1 / 14')).toHaveLength(3);
    expect(screen.getAllByText('Herbalism: 1 / 14')).toHaveLength(3);
    fireEvent.click(
      screen.getByRole('button', { name: `Start Mining for ${hero.name}` }),
    );

    expect(
      screen.getByRole('heading', { name: new RegExp(`${hero.name}.*Mining`) }),
    ).toBeDefined();
    expect(screen.getByText('Yields: 0')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: `Recall ${hero.name}` }));
    expect(screen.getByText('No active gatherers.')).toBeDefined();
  });
});
