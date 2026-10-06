import { SettingsPanel } from './ui/SettingsPanel';
import { Tabs } from './ui/Tabs';
import { gameStore, useGame, useSaveNotice } from './store';

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
        <p className="gold">{game.gold} gold</p>
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
