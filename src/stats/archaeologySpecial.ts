import type { ArchaeologyTuning } from '../archaeology/molemanArchaeology.js';
import type { SpecialStats } from './specialTypes.js';
import { additivePercent } from './statModifiers.js';

export function getExcavationRewardChanceBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    intelligence: 0.0125,
    luck: 0.0125,
  });
}

export function getEquipmentRecoveryChanceBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    intelligence: 0.015,
    luck: 0.0075,
  });
}

export function getArtifactRecoveryChanceBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    intelligence: 0.0125,
    luck: 0.0125,
  });
}

export function getRareArtifactChanceBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    luck: 0.02,
    intelligence: 0.005,
  });
}

export function getExcavationAppleBonus(stats: SpecialStats): number {
  return additivePercent(stats, {
    intelligence: 0.015,
    luck: 0.005,
  });
}

export function buildArchaeologyTuning(stats: SpecialStats): ArchaeologyTuning {
  return {
    rewardLuck: getExcavationRewardChanceBonus(stats),
    equipmentRewardChance: getEquipmentRecoveryChanceBonus(stats),
    excavationAppleBonus: getExcavationAppleBonus(stats),
    goldAppleFrequency: getRareArtifactChanceBonus(stats),
    artifactCacheChanceBonus: getArtifactRecoveryChanceBonus(stats),
  };
}
