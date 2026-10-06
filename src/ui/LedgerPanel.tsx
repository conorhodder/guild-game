import type { GuildLedger } from '../game/types';
import { monstersById } from '../game/data/monsters';

interface LedgerPanelProps {
  ledger: GuildLedger;
}

function formatWallTime(wallMs: number | null): string {
  return wallMs === null ? 'Not yet' : new Date(wallMs).toLocaleString();
}

function formatSimDuration(simMs: number | null): string {
  if (simMs === null) return 'Not yet';
  const seconds = Math.floor(simMs / 1000);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [
    days > 0 ? `${days}d` : '',
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}m` : '',
    `${remainingSeconds}s`,
  ].filter(Boolean);
  return parts.join(' ');
}

function downloadLedger(ledger: GuildLedger): void {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'guild-ledger.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function LedgerPanel({ ledger }: LedgerPanelProps) {
  const rows: [string, string | number][] = [
    ['First load', formatWallTime(ledger.firstLoadWall)],
    ['First dispatch (wall time)', formatWallTime(ledger.firstDispatchWall)],
    ['First dispatch (sim time)', formatSimDuration(ledger.firstDispatchAt)],
    ['First quest complete (sim time)', formatSimDuration(ledger.firstQuestCompleteAt)],
    ['Sessions', ledger.sessions],
    ['Last active', formatWallTime(ledger.lastActiveWall)],
    ['Play days', ledger.playDays.join(', ') || 'None'],
    ['Kills', ledger.kills],
    ['Named kills', ledger.namedKills],
    ['Named drops', ledger.namedDrops],
    ['Quests completed', ledger.questsCompleted],
    ['Quests failed', ledger.questsFailed],
    ['Gold earned', ledger.goldEarned],
    ['Common items', ledger.itemsByRarity.common],
    ['Uncommon items', ledger.itemsByRarity.uncommon],
    ['Rare items', ledger.itemsByRarity.rare],
    ['Named items', ledger.itemsByRarity.named],
    ['Knockouts', ledger.knockouts],
    ['Skill-ups', ledger.skillUps],
    ['Levels gained', ledger.levelsGained],
    ['Highest hero level', ledger.highestLevel],
    ['Total simulated time', formatSimDuration(ledger.totalSimMsPlayed)],
  ];
  const namedSlain = Object.entries(ledger.namedMonstersSlainById).sort(
    ([firstId], [secondId]) =>
      (monstersById[firstId]?.name ?? firstId).localeCompare(
        monstersById[secondId]?.name ?? secondId,
      ),
  );

  return (
    <section className="ledger-panel">
      <h2>Guild Ledger</h2>
      <p>The Ledger never leaves this device.</p>
      <dl className="ledger-definitions">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3>Named slain</h3>
      {namedSlain.length === 0 ? (
        <p>None yet.</p>
      ) : (
        <ul>
          {namedSlain.map(([monsterId, count]) => (
            <li key={monsterId}>
              {monstersById[monsterId]?.name ?? monsterId} ({monsterId}) — {count}
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => downloadLedger(ledger)} type="button">
        Export ledger (JSON)
      </button>
    </section>
  );
}
