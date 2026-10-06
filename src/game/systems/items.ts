import { equip } from '../actions';
import type { GameState } from '../types';
import { heroStats, type HeroStats } from './heroes';

export interface EquipPreview {
  before: HeroStats;
  after: HeroStats;
  delta: HeroStats;
}

export function equipPreview(
  state: GameState,
  heroId: string,
  uid: string,
): EquipPreview | { reason: string } {
  const hero = state.heroes[heroId];
  if (!hero) return { reason: 'Hero not found.' };

  const outcome = equip(heroId, uid)(state, state.clock.lastWallMs);
  if (!('state' in outcome)) return { reason: 'Unable to preview that item.' };
  if (outcome.reason) return { reason: outcome.reason };

  const nextHero = outcome.state.heroes[heroId];
  if (!nextHero) return { reason: 'Hero not found.' };
  const before = heroStats(hero, state);
  const after = heroStats(nextHero, outcome.state);
  return {
    before,
    after,
    delta: {
      maxHp: after.maxHp - before.maxHp,
      attack: after.attack - before.attack,
      armor: after.armor - before.armor,
      heal: after.heal - before.heal,
    },
  };
}
