import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchQuest, foundGuild } from '../game/actions';
import { createNewGame } from '../game/newGame';
import { QuestBoard } from './QuestBoard';

afterEach(() => cleanup());

describe('QuestBoard', () => {
  it('dispatches the selected party and exposes the active quest status and log action', () => {
    let game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    const heroId = game.heroOrder[0];
    const hero = heroId ? game.heroes[heroId] : undefined;
    if (!heroId || !hero) throw new Error('Expected a starter hero.');
    const unavailableId = game.heroOrder[1];
    if (unavailableId) game.heroes[unavailableId]!.injuredUntil = 60_000;
    const onViewLog = vi.fn();
    const onDispatch = vi.fn((questId: string, heroIds: string[]) => {
      const result = dispatchQuest(questId, heroIds)(game, 0);
      if ('state' in result) {
        if (result.reason) return result.reason;
        game = result.state;
      } else {
        game = result;
      }
      return null;
    });
    const view = render(<QuestBoard game={game} onDispatch={onDispatch} onViewLog={onViewLog} />);

    const injuredHero = unavailableId ? game.heroes[unavailableId] : undefined;
    if (!injuredHero) throw new Error('Expected an injured hero.');
    const injuredCheckbox = screen.getByRole('checkbox', {
      name: new RegExp(injuredHero.name),
    }) as HTMLInputElement;
    expect(injuredCheckbox.disabled).toBe(true);
    expect(screen.getByText('Unavailable: Hero is Injured.')).toBeDefined();

    const dispatchButton = screen.getByRole('button', {
      name: 'Dispatch Rats in the Cellar',
    }) as HTMLButtonElement;
    expect(dispatchButton.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(hero.name) }));
    expect(dispatchButton.disabled).toBe(false);
    fireEvent.click(dispatchButton);
    view.rerender(<QuestBoard game={game} onDispatch={onDispatch} onViewLog={onViewLog} />);

    expect(onDispatch).toHaveBeenCalledWith('rats-in-the-cellar', [hero.id]);
    expect(screen.getByText(`${hero.glyph} ${hero.name} — On quest`)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'View log' }));
    expect(onViewLog).toHaveBeenCalledWith(expect.stringContaining('quest:'));
  });

  it('falls back to the whole roster average when no heroes are idle', () => {
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
    );
    for (const hero of Object.values(game.heroes)) {
      hero.level = 6;
      hero.injuredUntil = 60_000;
    }

    render(<QuestBoard game={game} onDispatch={vi.fn(() => null)} onViewLog={vi.fn()} />);

    const firstQuestCard = screen
      .getByRole('heading', { name: 'Rats in the Cellar' })
      .closest('article');
    expect(firstQuestCard?.textContent).toContain('Recommended level: 1 Trivial');
  });
});
