import type { GameState, LogCategory, LogLine } from '../types';

export const CHANNEL_LOG_LIMIT = 500;
export const TOTAL_LOG_LIMIT = 5000;

export function appendLog(
  state: GameState,
  channel: string,
  category: LogCategory,
  text: string,
  highlight?: boolean,
): LogLine {
  const line: LogLine = {
    id: state.nextLogId,
    simMs: state.clock.simMs,
    channel,
    category,
    text,
    ...(highlight === undefined ? {} : { highlight }),
  };
  state.nextLogId += 1;
  state.log.push(line);

  const channelOverflow =
    state.log.filter((entry) => entry.channel === channel).length - CHANNEL_LOG_LIMIT;
  if (channelOverflow > 0) {
    let removed = 0;
    state.log = state.log.filter((entry) => {
      if (entry.channel === channel && removed < channelOverflow) {
        removed += 1;
        return false;
      }
      return true;
    });
  }

  if (state.log.length > TOTAL_LOG_LIMIT) {
    state.log.splice(0, state.log.length - TOTAL_LOG_LIMIT);
  }

  return line;
}
