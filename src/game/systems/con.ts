import type { Con } from '../types';

export function conTier(targetLevel: number, partyLevels: number[]): Con {
  const partyAvgLevel =
    partyLevels.length === 0
      ? targetLevel
      : Math.round(partyLevels.reduce((total, level) => total + level, 0) / partyLevels.length);
  const diff = targetLevel - partyAvgLevel;

  if (diff <= -5) return 'trivial';
  if (diff <= -2) return 'easy';
  if (diff <= 1) return 'even';
  if (diff <= 3) return 'tough';
  return 'deadly';
}
