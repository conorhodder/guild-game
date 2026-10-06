import axe from 'axe-core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { foundGuild } from '../game/actions';
import { createNewGame } from '../game/newGame';
import type { AwaySummary } from '../game/systems/offline';
import { AwaySummaryDialog } from './AwaySummaryDialog';
import { GatherBoard } from './GatherBoard';
import { GuildCharter } from './GuildCharter';
import { LedgerPanel } from './LedgerPanel';
import { LogPanel } from './LogPanel';
import { QuestBoard } from './QuestBoard';
import { RecruitBoard } from './RecruitBoard';
import { RosterPanel } from './RosterPanel';
import { SettingsPanel } from './SettingsPanel';
import { StashPanel } from './StashPanel';
import { Tabs } from './Tabs';
import type { TabDefinition } from './Tabs';
import { ZoneBoard } from './ZoneBoard';

afterEach(() => {
  cleanup();
});

function createAccessibleTabs(game: ReturnType<typeof createNewGame>): TabDefinition[] {
  return [
    {
      id: 'roster',
      label: 'Roster',
      panel: (
        <RosterPanel
          game={game}
          onEquip={() => null}
          onRecall={() => null}
          onRest={() => null}
          onUnequip={() => null}
        />
      ),
    },
    {
      id: 'quests',
      label: 'Quests',
      panel: <QuestBoard game={game} onDispatch={() => null} onViewLog={() => undefined} />,
    },
    {
      id: 'zones',
      label: 'Zones',
      panel: (
        <ZoneBoard
          game={game}
          onRecall={() => null}
          onStartCamp={() => null}
          onViewLog={() => undefined}
        />
      ),
    },
    {
      id: 'gather',
      label: 'Gather',
      panel: <GatherBoard game={game} onRecall={() => null} onStartGather={() => null} />,
    },
    {
      id: 'recruit',
      label: 'Recruit',
      panel: <RecruitBoard game={game} onDismiss={() => null} onHire={() => null} />,
    },
    {
      id: 'stash',
      label: 'Stash',
      panel: <StashPanel game={game} onSell={() => null} onSellMaterial={() => null} />,
    },
    {
      id: 'log',
      label: 'Log',
      panel: (
        <LogPanel game={game} onChannelChange={() => undefined} selectedChannel="all" />
      ),
    },
    {
      id: 'ledger',
      label: 'Ledger',
      panel: <LedgerPanel ledger={game.ledger} />,
    },
    {
      id: 'settings',
      label: 'Settings',
      panel: <SettingsPanel game={game} onImport={() => undefined} />,
    },
  ];
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

async function expectNoSeriousOrCriticalViolations(container: HTMLElement) {
  const results = await axe.run(container);
  const violations = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.flatMap((node) => node.target),
    })),
  ).toEqual([]);
}

describe('accessibility', () => {
  it('has no serious or critical axe violations in every tab, the charter, or away dialog', async () => {
    const game = foundGuild('Accessibility Guild')(
      createNewGame({ seed: 29, wallMs: 0, guildName: '' }),
    );
    const tabs = createAccessibleTabs(game);
    const view = render(
      <main>
        <GuildCharter
          heroesViewed={false}
          logOpened={false}
          onDismiss={() => undefined}
          questDispatched={false}
        />
        <Tabs selectedId="roster" tabs={tabs} />
      </main>,
    );

    for (const tab of tabs) {
      view.rerender(
        <main>
          <GuildCharter
            heroesViewed={false}
            logOpened={false}
            onDismiss={() => undefined}
            questDispatched={false}
          />
          <Tabs selectedId={tab.id} tabs={tabs} />
        </main>,
      );
      await expectNoSeriousOrCriticalViolations(view.container);
    }

    view.unmount();
    const dialog = render(<AwaySummaryDialog onDismiss={() => undefined} summary={awaySummary()} />);
    await expectNoSeriousOrCriticalViolations(dialog.container);
  }, 30_000);
});
