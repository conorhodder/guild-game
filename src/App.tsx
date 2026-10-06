import { useState } from 'react';
import {
  dismiss,
  dispatchQuest,
  equip,
  foundGuild,
  hire,
  recall,
  rest,
  sell,
  sellMaterial,
  startCamp,
  startGather,
  unequip,
} from './game/actions';
import { campChannel, gatherChannel, questChannel } from './game/activityChannels';
import { campsById } from './game/data/zones';
import { questsById } from './game/data/quests';
import { SettingsPanel } from './ui/SettingsPanel';
import { FoundGuildForm } from './ui/FoundGuildForm';
import { AwaySummaryDialog } from './ui/AwaySummaryDialog';
import { GatherBoard } from './ui/GatherBoard';
import { LogPanel } from './ui/LogPanel';
import { LedgerPanel } from './ui/LedgerPanel';
import { QuestBoard } from './ui/QuestBoard';
import { RecruitBoard } from './ui/RecruitBoard';
import { RosterPanel } from './ui/RosterPanel';
import { StashPanel } from './ui/StashPanel';
import { Tabs } from './ui/Tabs';
import { ZoneBoard } from './ui/ZoneBoard';
import { formatSimClock } from './ui/formatSimTime';
import {
  dismissAwaySummary,
  gameStore,
  useAwaySummary,
  useGame,
  useSaveNotice,
} from './store';

export default function App() {
  const game = useGame();
  const saveNotice = useSaveNotice();
  const awaySummary = useAwaySummary();
  const [logChannel, setLogChannel] = useState('all');
  const [activeTab, setActiveTab] = useState('roster');
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  if (!game) {
    return (
      <main className="app">
        <header className="app-header">
          <h1>The Guildmaster's Ledger</h1>
        </header>
        <section className="save-warning" role="alert">
          <p>{saveNotice}</p>
          <button onClick={() => gameStore.startNewGame()} type="button">
            Start a new game
          </button>
        </section>
      </main>
    );
  }

  if (game.guildName === '') {
    return (
      <main className="app">
        <header className="app-header">
          <h1>The Guildmaster's Ledger</h1>
          <div className="header-stats">
            <p className="gold">{game.gold} gold</p>
            <p className="sim-clock">{formatSimClock(game.clock.simMs)}</p>
          </div>
        </header>
        <FoundGuildForm onFound={(name) => gameStore.dispatch(foundGuild(name))} />
        {awaySummary && (
          <AwaySummaryDialog
            onDismiss={dismissAwaySummary}
            onGoToHero={(heroId) => {
              setSelectedHeroId(heroId);
              setActiveTab('roster');
            }}
            summary={awaySummary}
          />
        )}
      </main>
    );
  }

  const activityChannels = new Set(
    game.log
      .map((line) => line.channel)
      .filter(
        (channel) =>
          channel.startsWith('quest:') ||
          channel.startsWith('camp:') ||
          channel.startsWith('gather:'),
      ),
  );
  for (const activity of Object.values(game.activities)) {
    if (activity.kind === 'quest') {
      activityChannels.add(questChannel(activity.id, activity.questId));
    }
    if (activity.kind === 'camp') {
      activityChannels.add(campChannel(activity.id, activity.campId));
    }
    if (activity.kind === 'gather') {
      activityChannels.add(gatherChannel(activity.heroId));
    }
  }
  const channelNames = Object.fromEntries(
    Array.from(activityChannels, (channel) => {
      const [kind, secondId, thirdId] = channel.split(':');
      const name = kind === 'quest'
        ? questsById[thirdId ?? '']?.name ?? 'Quest'
        : kind === 'camp'
          ? campsById[thirdId ?? '']?.name ?? 'Camp'
          : `${game.heroes[secondId ?? '']?.name ?? 'Hero'} — Gathering`;
      return [channel, name];
    }),
  );

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>The Guildmaster's Ledger</h1>
          <p className="guild-name">{game.guildName || 'Your guild'}</p>
        </div>
        <div className="header-stats">
          <p className="gold">{game.gold} gold</p>
          <p className="sim-clock">{formatSimClock(game.clock.simMs)}</p>
        </div>
      </header>
      <Tabs
        onSelect={setActiveTab}
        selectedId={activeTab}
        tabs={[
          {
            id: 'roster',
            label: 'Roster',
            panel: (
              <RosterPanel
                game={game}
                onEquip={(heroId, uid) => gameStore.dispatch(equip(heroId, uid))}
                onUnequip={(heroId, slot) => gameStore.dispatch(unequip(heroId, slot))}
                onRest={(heroId) => gameStore.dispatch(rest(heroId))}
                onRecall={(activityId) => gameStore.dispatch(recall(activityId))}
                onHeroSelect={setSelectedHeroId}
                selectedHeroId={selectedHeroId}
              />
            ),
          },
          {
            id: 'quests',
            label: 'Quests',
            panel: (
              <QuestBoard
                game={game}
                onDispatch={(questId, heroIds) =>
                  gameStore.dispatch(dispatchQuest(questId, heroIds))
                }
                onViewLog={(channel) => {
                  setLogChannel(channel);
                  setActiveTab('log');
                }}
              />
            ),
          },
          {
            id: 'zones',
            label: 'Zones',
            panel: (
              <ZoneBoard
                game={game}
                onStartCamp={(zoneId, campId, heroIds) =>
                  gameStore.dispatch(startCamp(zoneId, campId, heroIds))
                }
                onRecall={(activityId) => gameStore.dispatch(recall(activityId))}
                onViewLog={(channel) => {
                  setLogChannel(channel);
                  setActiveTab('log');
                }}
              />
            ),
          },
          {
            id: 'gather',
            label: 'Gather',
            panel: (
              <GatherBoard
                game={game}
                onRecall={(activityId) => gameStore.dispatch(recall(activityId))}
                onStartGather={(heroId, skill) =>
                  gameStore.dispatch(startGather(heroId, skill))
                }
              />
            ),
          },
          {
            id: 'recruit',
            label: 'Recruit',
            panel: (
              <RecruitBoard
                game={game}
                onHire={(candidateIndex) => gameStore.dispatch(hire(candidateIndex))}
                onDismiss={(heroId) => gameStore.dispatch(dismiss(heroId))}
              />
            ),
          },
          {
            id: 'stash',
            label: 'Stash',
            panel: (
              <StashPanel
                game={game}
                onSell={(uid) => gameStore.dispatch(sell(uid))}
                onSellMaterial={(itemId, quantity) =>
                  gameStore.dispatch(sellMaterial(itemId, quantity))
                }
              />
            ),
          },
          {
            id: 'log',
            label: 'Log',
            panel: (
              <LogPanel
                game={game}
                channelNames={channelNames}
                onChannelChange={setLogChannel}
                selectedChannel={logChannel}
              />
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
            panel: (
              <SettingsPanel
                game={game}
                onImport={(imported) => gameStore.dispatch(() => imported)}
              />
            ),
          },
        ]}
      />
      {awaySummary && (
        <AwaySummaryDialog
          onDismiss={dismissAwaySummary}
          onGoToHero={(heroId) => {
            setSelectedHeroId(heroId);
            setActiveTab('roster');
          }}
          summary={awaySummary}
        />
      )}
    </main>
  );
}
