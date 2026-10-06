export type LogCategory = 'combat' | 'loot' | 'skill' | 'system';

export interface LogLine {
  id: number;
  simMs: number;
  channel: string;
  category: LogCategory;
  text: string;
  highlight?: boolean;
}

export interface GameState {
  guildName: string;
  gold: number;
  clock: {
    simMs: number;
    lastWallMs: number;
  };
  rng: number;
  nextId: number;
  log: LogLine[];
  nextLogId: number;
}
