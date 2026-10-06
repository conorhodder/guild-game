import type { GameState, LogLine } from './types';
import type { CombatSkill, GatherSkill, Rarity } from './types';
import { campSystem } from './systems/camps';
import { fatigueSystem } from './systems/fatigue';
import { gatheringSystem } from './systems/gathering';
import { questSystem } from './systems/quests';
import { recruitmentSystem } from './systems/recruitment';
import { recoverySystem } from './systems/recovery';
import { foldLedgerEvents } from './systems/ledger';
import { TICK_MS } from './tick';

export { TICK_MS };

export type SimEvent =
  | { type: 'log'; line: LogLine }
  | { type: 'kill'; monsterId: string; named: boolean }
  | { type: 'knockout'; heroId: string }
  | {
      type: 'quest';
      questId: string;
      outcome: 'complete' | 'failed';
      simMs?: number;
    }
  | { type: 'gold'; amount: number }
  | { type: 'loot'; itemId: string; rarity: Rarity }
  | {
      type: 'skillUp';
      heroId: string;
      skill: CombatSkill | GatherSkill;
      value: number;
    }
  | { type: 'levelUp'; heroId: string; level: number };
export type SimSystem = (state: GameState, tickMs: number, events: SimEvent[]) => void;

// Keep this order stable as systems are added:
// quests, camps, gathering, rest/fatigue, recovery, recruitment.
export const defaultSystems: SimSystem[] = [
  questSystem,
  campSystem,
  gatheringSystem,
  fatigueSystem,
  recoverySystem,
  recruitmentSystem,
];

export function advance(
  state: GameState,
  toSimMs: number,
  systems: readonly SimSystem[] = defaultSystems,
): { state: GameState; events: SimEvent[] } {
  if (!Number.isFinite(toSimMs)) throw new RangeError('Simulation time must be finite.');

  const nextState = structuredClone(state);
  const events: SimEvent[] = [];
  const endSimMs = Math.max(state.clock.simMs, toSimMs);

  for (
    let tickMs = (Math.floor(state.clock.simMs / TICK_MS) + 1) * TICK_MS;
    tickMs <= endSimMs;
    tickMs += TICK_MS
  ) {
    for (const system of systems) system(nextState, tickMs, events);
  }

  foldLedgerEvents(nextState.ledger, events, endSimMs);
  nextState.ledger.totalSimMsPlayed += endSimMs - state.clock.simMs;
  nextState.clock.simMs = endSimMs;
  return { state: nextState, events };
}
