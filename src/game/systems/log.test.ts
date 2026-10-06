import { describe, expect, it } from 'vitest';
import { createNewGame } from '../newGame';
import { appendLog, CHANNEL_LOG_LIMIT, TOTAL_LOG_LIMIT } from './log';

describe('log retention', () => {
  it('keeps the newest 500 lines in each channel', () => {
    const state = createNewGame({ seed: 1, wallMs: 0, guildName: 'Test' });
    for (let index = 0; index <= CHANNEL_LOG_LIMIT; index += 1) {
      appendLog(state, 'guild', 'system', `Line ${index}`);
    }

    expect(state.log).toHaveLength(CHANNEL_LOG_LIMIT);
    expect(state.log[0]?.text).toBe('Line 1');
    expect(state.log.at(-1)?.text).toBe(`Line ${CHANNEL_LOG_LIMIT}`);
  });

  it('caps the overall log at 5,000 lines', () => {
    const state = createNewGame({ seed: 1, wallMs: 0, guildName: 'Test' });
    for (let channel = 0; channel < 11; channel += 1) {
      for (let line = 0; line <= CHANNEL_LOG_LIMIT; line += 1) {
        appendLog(state, `activity-${channel}`, 'combat', `${channel}:${line}`);
      }
    }

    expect(state.log).toHaveLength(TOTAL_LOG_LIMIT);
    expect(state.log[0]?.text).toBe('1:1');
    expect(state.log.at(-1)?.text).toBe('10:500');
  });
});
