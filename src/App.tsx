import { useState } from 'react';
import {
  dispatchQuest,
  equip,
  foundGuild,
  sell,
  sellMaterial,
  unequip,
} from './game/actions';
import { questChannel } from './game/activityChannels';
import { questsById } from './game/data/quests';
import { SettingsPanel } from './ui/SettingsPanel';
import { FoundGuildForm } from './ui/FoundGuildForm';
import { LogPanel } from './ui/LogPanel';
import { QuestBoard } from './ui/QuestBoard';
import { RosterPanel } from './ui/RosterPanel';
import { StashPanel } from './ui/StashPanel';
import { Tabs } from './ui/Tabs';
import { gameStore, useGame, useSaveNotice } from './store';

function formatSimClock(simMs: number): string {
  const totalSeconds = Math.floor(simMs / 1000);
  const day = Math.floor(totalSeconds / 86_400) + 1;
  const secondsInDay = totalSeconds % 86_400;
  const hours = Math.floor(secondsInDay / 3600);
  const minutes = Math.floor((secondsInDay % 3600) / 60);
  const seconds = secondsInDay % 60;
  const twoDigits = (value: number) => String(value).padStart(2, '0');

  return `Day ${day}, ${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

export default function App() {
  const game = useGame();
  const saveNotice = useSaveNotice();
  const [logChannel, setLogChannel] = useState('all');
  const [activeTab, setActiveTab] = useState('roster');

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
      </main>
    );
  }

  const questChannels = new Set(
    game.log
      .map((line) => line.channel)
      .filter((channel) => channel.startsWith('quest:')),
  );
  for (const activity of Object.values(game.activities)) {
    if (activity.kind === 'quest') questChannels.add(questChannel(activity.id, activity.questId));
  }
  const questChannelNames = Object.fromEntries(
    Array.from(questChannels, (channel) => {
      const questId = channel.split(':')[2] ?? '';
      return [channel, questsById[questId]?.name ?? 'Quest'];
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
                channelNames={questChannelNames}
                onChannelChange={setLogChannel}
                selectedChannel={logChannel}
              />
            ),
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
    </main>
  );
}
