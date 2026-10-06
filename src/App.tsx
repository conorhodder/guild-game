import { SettingsPanel } from './ui/SettingsPanel';
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
        tabs={[
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
