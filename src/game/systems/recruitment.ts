import { classes } from '../data/classes';
import { createHero } from './heroes';
import { rngInt, rngPick } from '../rng';
import type { ClassId, GameState, Hero } from '../types';
import type { SimSystem } from '../sim';

export const RECRUITMENT_REFRESH_MS = 30 * 60_000;
export const RECRUITMENT_CANDIDATE_COUNT = 3;
export const ROSTER_LIMIT = 8;

const classIds = Object.keys(classes) as ClassId[];

export function hireCost(level: number): number {
  return 40 + 30 * level;
}

function averageRosterLevel(state: GameState): number {
  const levels = state.heroOrder.flatMap((heroId) => {
    const hero = state.heroes[heroId];
    return hero ? [hero.level] : [];
  });
  return levels.length > 0
    ? levels.reduce((total, level) => total + level, 0) / levels.length
    : 1;
}

function candidateLevel(state: GameState): number {
  const level = Math.round(averageRosterLevel(state)) + rngInt(state, -1, 1);
  return Math.max(1, Math.min(20, level));
}

function createCandidate(
  state: GameState,
  classId: ClassId,
  level: number,
  suffix: number,
): Hero {
  const idBase = state.nextId;
  const candidate = createHero(state, classId, level);
  candidate.id = `r${idBase}-${suffix}`;
  state.nextId = idBase;
  return candidate;
}

export function createRecruitmentCandidates(state: GameState): Hero[] {
  const candidates: Hero[] = [];
  for (let index = 0; index < RECRUITMENT_CANDIDATE_COUNT; index += 1) {
    let classId = rngPick(state, classIds);
    if (
      index === RECRUITMENT_CANDIDATE_COUNT - 1 &&
      new Set(candidates.map((candidate) => candidate.classId)).size === 1
    ) {
      const otherClasses = classIds.filter(
        (candidateClass) => candidateClass !== candidates[0]?.classId,
      );
      classId = rngPick(state, otherClasses);
    }
    candidates.push(createCandidate(state, classId, candidateLevel(state), index));
  }
  return candidates;
}

export function replaceRecruitmentCandidate(
  state: GameState,
  candidateIndex: number,
): Hero[] {
  const candidates = state.recruitment.candidates.filter(
    (_candidate, index) => index !== candidateIndex,
  );
  const presentClasses = new Set(candidates.map((candidate) => candidate.classId));
  const possibleClasses = presentClasses.size < 2
    ? classIds.filter((classId) => !presentClasses.has(classId))
    : classIds;
  const classId = rngPick(state, possibleClasses);
  const replacement = createCandidate(
    state,
    classId,
    candidateLevel(state),
    candidateIndex,
  );
  candidates.splice(candidateIndex, 0, replacement);
  return candidates;
}

export const recruitmentSystem: SimSystem = (state, tickMs) => {
  if (tickMs < state.recruitment.refreshAt) return;
  state.recruitment.candidates = createRecruitmentCandidates(state);
  state.recruitment.refreshAt = tickMs + RECRUITMENT_REFRESH_MS;
};
