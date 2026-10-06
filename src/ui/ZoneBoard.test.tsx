import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foundGuild, recall, startCamp } from '../game/actions';
import { createNewGame } from '../game/newGame';
import { ZoneBoard } from './ZoneBoard';

afterEach(() => cleanup());

function foundedGame() {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
  );
}

describe('ZoneBoard', () => {
  it('starts a selected party, shows active camp counters, and reveals seen named drops', () => {
    let game = foundedGame();
    const heroId = game.heroOrder[0];
    const hero = heroId ? game.heroes[heroId] : undefined;
    if (!heroId || !hero) throw new Error('Expected a starter hero.');
    const onStartCamp = vi.fn((zoneId: string, campId: string, heroIds: string[]) => {
      const result = startCamp(zoneId, campId, heroIds)(game, 0);
      if ('state' in result) {
        if (result.reason) return result.reason;
        game = result.state;
      } else {
        game = result;
      }
      return null;
    });
    const onRecall = vi.fn((activityId: string) => {
      const result = recall(activityId)(game, 0);
      if ('state' in result) {
        if (result.reason) return result.reason;
        game = result.state;
      } else {
        game = result;
      }
      return null;
    });
    const onViewLog = vi.fn();
    const view = render(
      <ZoneBoard game={game} onStartCamp={onStartCamp} onRecall={onRecall} onViewLog={onViewLog} />,
    );

    expect(screen.getAllByText('Monsters: ???, ???, ???').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(hero.name) }));
    fireEvent.click(screen.getByRole('button', { name: 'Start at Marsh Edge' }));
    view.rerender(
      <ZoneBoard game={game} onStartCamp={onStartCamp} onRecall={onRecall} onViewLog={onViewLog} />,
    );

    expect(onStartCamp).toHaveBeenCalledWith('reedlands', 'marsh-edge', [hero.id]);
    expect(screen.getByText('Kills: 0 · Named kills: 0')).toBeDefined();
    expect(screen.getByText('Time camping: 0s')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Recall' })).toBeDefined();

    game.seenMonsters.push('grizzlefang');
    view.rerender(
      <ZoneBoard game={game} onStartCamp={onStartCamp} onRecall={onRecall} onViewLog={onViewLog} />,
    );
    expect(
      screen.getByText("Named drops: Grizzlefang's Tooth (4%), Wolfheart Charm (8%)"),
    ).toBeDefined();
  });
});
