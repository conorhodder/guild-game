import { useState } from 'react';
import type { GameState, LogCategory } from '../game/types';

const categories: { id: LogCategory; label: string }[] = [
  { id: 'combat', label: 'Combat' },
  { id: 'loot', label: 'Loot' },
  { id: 'skill', label: 'Skill-ups' },
  { id: 'system', label: 'System' },
];

interface LogPanelProps {
  game: GameState;
  selectedChannel: string;
  channelNames?: Record<string, string>;
  onChannelChange: (channel: string) => void;
}

function activityChannel(game: GameState, activityId: string): string | null {
  const activity = game.activities[activityId];
  if (!activity) return null;
  if (activity.kind === 'quest') return `quest:${activity.id}`;
  if (activity.kind === 'camp') return `camp:${activity.id}`;
  if (activity.kind === 'gather') return `gather:${activity.id}`;
  return `rest:${activity.id}`;
}

function defaultChannelName(channel: string): string {
  if (channel === 'guild') return 'Guild';
  const [kind, id] = channel.split(':');
  if (kind === 'quest') return `Quest ${id ?? ''}`.trim();
  if (kind === 'camp') return `Camp ${id ?? ''}`.trim();
  if (kind === 'gather') return `Gathering ${id ?? ''}`.trim();
  if (kind === 'rest') return `Rest ${id ?? ''}`.trim();
  return channel;
}

export function LogPanel({
  game,
  selectedChannel,
  channelNames = {},
  onChannelChange,
}: LogPanelProps) {
  const [enabledCategories, setEnabledCategories] = useState<Record<LogCategory, boolean>>({
    combat: true,
    loot: true,
    skill: true,
    system: true,
  });
  const channels = Array.from(
    new Set([
      'guild',
      ...game.log.map((line) => line.channel),
      ...Object.keys(game.activities)
        .map((id) => activityChannel(game, id))
        .filter((channel): channel is string => channel !== null),
    ]),
  );
  const lines = game.log
    .slice()
    .reverse()
    .filter(
      (line) =>
        enabledCategories[line.category] &&
        (selectedChannel === 'all' || line.channel === selectedChannel),
    );

  return (
    <section aria-labelledby="log-heading" className="log-panel">
      <h2 id="log-heading">Log</h2>
      <div aria-label="Log categories" className="log-filters">
        {categories.map(({ id, label }) => (
          <button
            aria-pressed={enabledCategories[id]}
            key={id}
            onClick={() =>
              setEnabledCategories((current) => ({ ...current, [id]: !current[id] }))
            }
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <label htmlFor="log-channel">Channel</label>
      <select
        id="log-channel"
        onChange={(event) => onChannelChange(event.target.value)}
        value={selectedChannel}
      >
        <option value="all">All</option>
        {channels.map((channel) => (
          <option key={channel} value={channel}>
            {channelNames[channel] ?? defaultChannelName(channel)}
          </option>
        ))}
      </select>
      {lines.length === 0 ? (
        <p>No log entries match these filters.</p>
      ) : (
        <ol className="log-entries">
          {lines.map((line) => (
            <li
              className={line.highlight ? 'log-highlight' : undefined}
              key={line.id}
            >
              {line.highlight ? (
                <strong>
                  <span aria-live="polite" role="log">★ {line.text}</span>
                </strong>
              ) : (
                line.text
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
