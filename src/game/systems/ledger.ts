import type { SimEvent } from '../sim';
import type { GuildLedger } from '../types';

export function createGuildLedger(
  firstLoadWall: number,
  totalSimMsPlayed = 0,
  highestLevel = 0,
): GuildLedger {
  return {
    firstLoadWall,
    firstDispatchWall: null,
    firstDispatchAt: null,
    firstQuestCompleteAt: null,
    sessions: 0,
    lastActiveWall: firstLoadWall,
    playDays: [],
    kills: 0,
    namedKills: 0,
    namedDrops: 0,
    highestLevel,
    questsCompleted: 0,
    questsFailed: 0,
    goldEarned: 0,
    itemsByRarity: {
      common: 0,
      uncommon: 0,
      rare: 0,
      named: 0,
    },
    knockouts: 0,
    skillUps: 0,
    levelsGained: 0,
    totalSimMsPlayed,
    namedMonstersSlainById: {},
  };
}

export function foldLedgerEvents(
  ledger: GuildLedger,
  events: readonly SimEvent[],
  endSimMs: number,
): void {
  for (const event of events) {
    switch (event.type) {
      case 'kill':
        ledger.kills += 1;
        if (event.named) {
          ledger.namedKills += 1;
          ledger.namedMonstersSlainById[event.monsterId] =
            (ledger.namedMonstersSlainById[event.monsterId] ?? 0) + 1;
        }
        break;
      case 'knockout':
        ledger.knockouts += 1;
        break;
      case 'quest':
        if (event.outcome === 'complete') {
          ledger.questsCompleted += 1;
          ledger.firstQuestCompleteAt ??= event.simMs ?? endSimMs;
        } else {
          ledger.questsFailed += 1;
        }
        break;
      case 'gold':
        ledger.goldEarned += event.amount;
        break;
      case 'loot':
        ledger.itemsByRarity[event.rarity] += 1;
        if (event.rarity === 'named') ledger.namedDrops += 1;
        break;
      case 'skillUp':
        ledger.skillUps += 1;
        break;
      case 'levelUp':
        ledger.levelsGained += 1;
        ledger.highestLevel = Math.max(ledger.highestLevel, event.level);
        break;
      case 'log':
        break;
    }
  }
}
