import { useLayoutEffect, useRef, useState } from 'react';
import { gatherChannel, questChannel } from '../game/activityChannels';
import type { GameState, LogCategory } from '../game/types';
import { formatLogTimestamp } from './formatSimTime';

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
  if (activity.kind === 'quest') return questChannel(activity.id, activity.questId);
  if (activity.kind === 'camp') return `camp:${activity.id}`;
  if (activity.kind === 'gather') return gatherChannel(activity.heroId);
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
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const [jumpToLatestFor, setJumpToLatestFor] = useState<string | null>(null);
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
    .filter(
      (line) =>
        enabledCategories[line.category] &&
        (selectedChannel === 'all' || line.channel === selectedChannel),
    )
    .slice(-500);
  const filterKey = `${selectedChannel}|${categories
    .filter(({ id }) => enabledCategories[id])
    .map(({ id }) => id)
    .join(',')}`;
  const showJumpToLatest = jumpToLatestFor === filterKey;

  useLayoutEffect(() => {
    const container = logContainerRef.current;
    if (!container) return;
    if (pinnedToBottom.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [lines]);

  useLayoutEffect(() => {
    pinnedToBottom.current = true;
    const container = logContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [filterKey]);

  function handleLogScroll() {
    const container = logContainerRef.current;
    if (!container) return;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <= 8;
    pinnedToBottom.current = atBottom;
    setJumpToLatestFor(atBottom ? null : filterKey);
  }

  function jumpToLatest() {
    const container = logContainerRef.current;
    if (!container) return;
    pinnedToBottom.current = true;
    container.scrollTop = container.scrollHeight;
    setJumpToLatestFor(null);
  }

  function resetToLatest() {
    pinnedToBottom.current = true;
    setJumpToLatestFor(null);
  }

  return (
    <section aria-labelledby="log-heading" className="log-panel">
      <h2 id="log-heading">Log</h2>
      <div aria-label="Log categories" className="log-filters" role="group">
        {categories.map(({ id, label }) => (
          <button
            aria-pressed={enabledCategories[id]}
            key={id}
            onClick={() => {
              resetToLatest();
              setEnabledCategories((current) => ({ ...current, [id]: !current[id] }));
            }}
            type="button"
          >
            {enabledCategories[id] ? `✓ ${label}` : label}
          </button>
        ))}
      </div>
      <label htmlFor="log-channel">Channel</label>
      <select
        id="log-channel"
        onChange={(event) => {
          resetToLatest();
          onChannelChange(event.target.value);
        }}
        value={selectedChannel}
      >
        <option value="all">All</option>
        {channels.map((channel) => (
          <option key={channel} value={channel}>
            {channelNames[channel] ?? defaultChannelName(channel)}
          </option>
        ))}
      </select>
      {showJumpToLatest && (
        <button onClick={jumpToLatest} type="button">
          Jump to latest
        </button>
      )}
      <div
        aria-label="Log entries"
        className="log-scroll"
        onScroll={handleLogScroll}
        ref={logContainerRef}
        role="region"
        tabIndex={0}
      >
        {lines.length === 0 ? (
          <>
            <p>No log entries match these filters.</p>
            <p>Change the category filters or channel to see other entries.</p>
          </>
        ) : (
          <ol className="log-entries">
            {lines.map((line) => (
              <li
                className={line.highlight ? 'log-highlight' : undefined}
                key={line.id}
              >
                <span className="log-timestamp">{formatLogTimestamp(line.simMs)}</span>{' '}
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
      </div>
    </section>
  );
}
