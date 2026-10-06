import type { ClassId, CombatSkill } from '../types';

export interface ClassDefinition {
  id: ClassId;
  name: string;
  role: 'tank' | 'healer' | 'melee dps' | 'ranged dps';
  glyph: string;
  skills: CombatSkill[];
  baseHp: number;
  hpPerLevel: number;
  baseAttack: number;
  attackPerLevel: number;
}

export const classes: Record<ClassId, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    role: 'tank',
    glyph: '🛡️',
    skills: ['offense', 'defense'],
    baseHp: 60,
    hpPerLevel: 12,
    baseAttack: 6,
    attackPerLevel: 1.5,
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    role: 'healer',
    glyph: '✚',
    skills: ['offense', 'defense', 'healing'],
    baseHp: 45,
    hpPerLevel: 8,
    baseAttack: 4,
    attackPerLevel: 1,
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    role: 'melee dps',
    glyph: '🗡️',
    skills: ['offense', 'defense', 'backstab'],
    baseHp: 45,
    hpPerLevel: 8,
    baseAttack: 8,
    attackPerLevel: 2,
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    role: 'ranged dps',
    glyph: '🔮',
    skills: ['offense', 'defense', 'evocation'],
    baseHp: 35,
    hpPerLevel: 6,
    baseAttack: 9,
    attackPerLevel: 2.2,
  },
};
