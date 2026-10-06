import type { GameState, LogCategory, LogLine } from '../types';

export const CHANNEL_LOG_LIMIT = 500;
export const TOTAL_LOG_LIMIT = 5000;

const channelCounts = new WeakMap<GameState, Map<string, number>>();

function getChannelCounts(state: GameState): Map<string, number> {
  const cached = channelCounts.get(state);
  if (cached) return cached;

  const counts = new Map<string, number>();
  for (const line of state.log) {
    counts.set(line.channel, (counts.get(line.channel) ?? 0) + 1);
  }
  channelCounts.set(state, counts);
  return counts;
}

export function appendLog(
  state: GameState,
  channel: string,
  category: LogCategory,
  text: string,
  highlight?: boolean,
  simMs: number = state.clock.simMs,
): LogLine {
  const line: LogLine = {
    id: state.nextLogId,
    simMs,
    channel,
    category,
    text,
    ...(highlight === undefined ? {} : { highlight }),
  };
  const counts = getChannelCounts(state);
  state.nextLogId += 1;
  state.log.push(line);

  const count = (counts.get(channel) ?? 0) + 1;
  counts.set(channel, count);
  const channelOverflow = count - CHANNEL_LOG_LIMIT;
  if (channelOverflow > 0) {
    let removed = 0;
    state.log = state.log.filter((entry) => {
      if (entry.channel === channel && removed < channelOverflow) {
        removed += 1;
        return false;
      }
      return true;
    });
    counts.set(channel, count - removed);
  }

  if (state.log.length > TOTAL_LOG_LIMIT) {
    const removed = state.log.splice(0, state.log.length - TOTAL_LOG_LIMIT);
    for (const entry of removed) {
      const remaining = (counts.get(entry.channel) ?? 1) - 1;
      if (remaining === 0) counts.delete(entry.channel);
      else counts.set(entry.channel, remaining);
    }
  }

  return line;
}
