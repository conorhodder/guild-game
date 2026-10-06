import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  dispatchQuest,
  equip,
  foundGuild,
  hire,
  recall,
  startCamp,
  type GameAction,
} from '../game/actions';
import type { GameState } from '../game/types';
import { createNewGame } from '../game/newGame';
import type { AwaySummary } from '../game/systems/offline';
import { AwaySummaryDialog } from './AwaySummaryDialog';
import { FoundGuildForm } from './FoundGuildForm';
import { GuildCharter } from './GuildCharter';
import { QuestBoard } from './QuestBoard';
import { RecruitBoard } from './RecruitBoard';
import { RosterPanel } from './RosterPanel';
import { Tabs } from './Tabs';
import { ZoneBoard } from './ZoneBoard';

afterEach(() => {
  cleanup();
});

function useJourneyGame(initialGame: GameState) {
  const [game, setGame] = useState(initialGame);
  const run = (action: GameAction): string | null => {
    const result = action(game, game.clock.lastWallMs);
    if ('state' in result) {
      if (result.reason) return result.reason;
      setGame(result.state);
    } else {
      setGame(result);
    }
    return null;
  };

  return { game, run };
}

async function tabTo(user: ReturnType<typeof userEvent.setup>, target: HTMLElement) {
  for (let index = 0; index < 120 && document.activeElement !== target; index += 1) {
    await user.tab();
  }
  expect(document.activeElement).toBe(target);
}

function FoundGuildJourney() {
  const { game, run } = useJourneyGame(
    createNewGame({ seed: 17, wallMs: 0, guildName: '' }),
  );
  const [selectedTab, setSelectedTab] = useState('roster');
  const [heroesViewed, setHeroesViewed] = useState(false);

  if (game.guildName === '') {
    return <FoundGuildForm onFound={(name) => run(foundGuild(name))} />;
  }

  const tabs = [
    {
      id: 'roster',
      label: 'Roster',
      panel: (
        <RosterPanel
          game={game}
          onEquip={() => null}
          onHeroSelect={() => setHeroesViewed(true)}
          onRecall={() => null}
          onRest={() => null}
          onUnequip={() => null}
        />
      ),
    },
    {
      id: 'quests',
      label: 'Quests',
      panel: (
        <QuestBoard
          game={game}
          onDispatch={(questId, heroIds) => run(dispatchQuest(questId, heroIds))}
          onViewLog={() => undefined}
        />
      ),
    },
  ];

  return (
    <main>
      <GuildCharter
        heroesViewed={heroesViewed}
        logOpened={false}
        onDismiss={() => undefined}
        questDispatched={game.ledger.firstDispatchAt !== null}
      />
      <Tabs onSelect={setSelectedTab} selectedId={selectedTab} tabs={tabs} />
    </main>
  );
}

function CampJourney({ initialGame }: { initialGame: GameState }) {
  const { game, run } = useJourneyGame(initialGame);
  const [selectedTab, setSelectedTab] = useState('roster');
  const tabs = [
    { id: 'roster', label: 'Roster', panel: <p>Roster</p> },
    { id: 'quests', label: 'Quests', panel: <p>Quests</p> },
    {
      id: 'zones',
      label: 'Zones',
      panel: (
        <ZoneBoard
          game={game}
          onRecall={(activityId) => run(recall(activityId))}
          onStartCamp={(zoneId, campId, heroIds) =>
            run(startCamp(zoneId, campId, heroIds))
          }
          onViewLog={() => undefined}
        />
      ),
    },
  ];

  return <Tabs onSelect={setSelectedTab} selectedId={selectedTab} tabs={tabs} />;
}

function HireJourney({ initialGame }: { initialGame: GameState }) {
  const { game, run } = useJourneyGame(initialGame);
  return (
    <RecruitBoard
      game={game}
      onDismiss={() => null}
      onHire={(candidateIndex) => run(hire(candidateIndex))}
    />
  );
}

function AwaySummaryJourney({ summary }: { summary: AwaySummary }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open away summary
      </button>
      {open && <AwaySummaryDialog onDismiss={() => setOpen(false)} summary={summary} />}
    </>
  );
}

function awaySummary(): AwaySummary {
  return {
    rawDelta: 60_000,
    credited: 60_000,
    capped: false,
    heroes: [],
    goldGained: 0,
    itemsByRarity: { common: 0, uncommon: 0, rare: 0, named: 0 },
    rareDrops: [],
    namedDrops: [],
    materials: [],
    kills: 0,
    namedKills: 0,
    questsCompleted: 0,
    questsFailed: 0,
    knockouts: 0,
    allQuiet: true,
  };
}

describe('keyboard-only journeys', () => {
  it('found guild and dispatches the recommended first quest', async () => {
    const user = userEvent.setup();
    render(<FoundGuildJourney />);

    await user.tab();
    await user.keyboard('Northstar Guild');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Guild charter' })).toBeDefined();

    await tabTo(user, screen.getByRole('tab', { name: 'Roster' }));
    await user.keyboard('{ArrowRight}');
    const questsTab = screen.getByRole('tab', { name: 'Quests' });
    expect(questsTab.getAttribute('aria-selected')).toBe('true');

    const dispatchButton = screen.getByRole('button', {
      name: 'Dispatch Rats in the Cellar',
    });
    await tabTo(user, dispatchButton);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 4, name: 'Rats in the Cellar' })).toBeDefined();
  });

  it('starts a camp and recalls it using keyboard controls', async () => {
    const user = userEvent.setup();
    const initialGame = foundGuild('Camp Keyboard Guild')(
      createNewGame({ seed: 18, wallMs: 0, guildName: '' }),
    );
    render(<CampJourney initialGame={initialGame} />);

    await tabTo(user, screen.getByRole('tab', { name: 'Roster' }));
    await user.keyboard('{ArrowRight}{ArrowRight}');
    const zonesTab = screen.getByRole('tab', { name: 'Zones' });
    expect(zonesTab.getAttribute('aria-selected')).toBe('true');

    const firstHero = screen.getAllByRole('checkbox')[0];
    if (!firstHero) throw new Error('Expected a hero checkbox.');
    await tabTo(user, firstHero);
    await user.keyboard('[Space]');

    const startButton = screen.getByRole('button', { name: 'Start at Marsh Edge' });
    await tabTo(user, startButton);
    await user.keyboard('{Enter}');

    const recallButton = screen.getByRole('button', { name: 'Recall' });
    await tabTo(user, recallButton);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Recall pending' })).toBeDefined();
  });

  it('previews and equips an item from the hero sheet', async () => {
    const user = userEvent.setup();
    const game = foundGuild('Equipment Keyboard Guild')(
      createNewGame({ seed: 19, wallMs: 0, guildName: '' }),
    );
    const uid = 'keyboard-copper-band';
    game.itemInstances[uid] = { uid, itemId: 'copper-band' };
    game.stash[uid] = { uid, itemId: 'copper-band' };
    const [heroId] = game.heroOrder;
    if (!heroId) throw new Error('Expected a starter hero.');

    function EquipmentJourney() {
      const { game: currentGame, run } = useJourneyGame(game);
      return (
        <RosterPanel
          game={currentGame}
          onEquip={(selectedHeroId, itemUid) => run(equip(selectedHeroId, itemUid))}
          selectedHeroId={heroId}
          onRecall={() => null}
          onRest={() => null}
          onUnequip={() => null}
        />
      );
    }

    render(<EquipmentJourney />);
    const trinketSelect = screen.getByRole('combobox', { name: 'Choose trinket' });
    await tabTo(user, trinketSelect);
    await user.keyboard('{ArrowDown}');
    expect((trinketSelect as HTMLSelectElement).value).toBe(uid);
    await user.keyboard('{Enter}');
    expect(screen.getByText('Before → After')).toBeDefined();

    const equipButton = screen.getByRole('button', { name: 'Equip' });
    await tabTo(user, equipButton);
    await user.keyboard('{Enter}');
    expect(screen.getByText('Trinket: Copper Band')).toBeDefined();
  });

  it('hires a recruit from the recruitment board', async () => {
    const user = userEvent.setup();
    const initialGame = foundGuild('Recruit Keyboard Guild')(
      createNewGame({ seed: 20, wallMs: 0, guildName: '' }),
    );
    initialGame.gold = 10_000;
    render(<HireJourney initialGame={initialGame} />);

    const hireButton = screen.getAllByRole('button', { name: /^Hire/ })[0];
    if (!hireButton) throw new Error('Expected a hire button.');
    await tabTo(user, hireButton);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Guild roster (4/8)' })).toBeDefined();
  });

  it('dismisses the away summary with Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<AwaySummaryJourney summary={awaySummary()} />);

    const opener = screen.getByRole('button', { name: 'Open away summary' });
    await tabTo(user, opener);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'While you were away' })).toBeDefined();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
