import type { SpecialStats } from './specialTypes.js';
import { additivePercent } from './statModifiers.js';

export interface SocialSpecialModifiers {
  affectionGainBonus: number;
  trustGainBonus: number;
  resentmentReduction: number;
  jealousyReduction: number;
  suspicionReduction: number;
  fineReduction: number;
  apologyEffectiveness: number;
  intimidationControl: number;
}

export function getAffectionGainBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    charisma: 0.025,
    intelligence: 0.005,
  });
}

export function getTrustGainBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    charisma: 0.015,
    intelligence: 0.01,
  });
}

export function getResentmentReduction(stats: SpecialStats): number {
  return additivePercent(stats, {
    charisma: 0.025,
  });
}

export function getJealousyReduction(stats: SpecialStats): number {
  return additivePercent(stats, {
    charisma: 0.02,
  });
}

export function getSuspicionReduction(stats: SpecialStats): number {
  return additivePercent(stats, {
    charisma: 0.02,
    agility: 0.01,
  });
}

export function getFineReduction(stats: SpecialStats): number {
  return additivePercent(stats, {
    charisma: 0.025,
  });
}

export function getApologyEffectiveness(stats: SpecialStats): number {
  return additivePercent(stats, {
    charisma: 0.03,
    intelligence: 0.005,
  });
}

export function getIntimidationControl(stats: SpecialStats): number {
  return additivePercent(stats, {
    strength: 0.015,
    charisma: 0.015,
  });
}

export function getSocialSpecialModifiers(stats: SpecialStats): SocialSpecialModifiers {
  return {
    affectionGainBonus: getAffectionGainBonus(stats),
    trustGainBonus: getTrustGainBonus(stats),
    resentmentReduction: getResentmentReduction(stats),
    jealousyReduction: getJealousyReduction(stats),
    suspicionReduction: getSuspicionReduction(stats),
    fineReduction: getFineReduction(stats),
    apologyEffectiveness: getApologyEffectiveness(stats),
    intimidationControl: getIntimidationControl(stats),
  };
}
