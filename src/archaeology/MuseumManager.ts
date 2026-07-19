/**
 * Museum Manager
 *
 * The wise old snake's museum:
 * - The wise old snake's museum was in its head
 * - The wise old snake was both the curator and the exhibit
 * - The wise old snake's museum had one visitor (itself)
 * - The wise old snake's museum gift shop sold only wise things
 * - The wise old snake's museum was rated 5 stars by the wise old snake
 * - The wise old snake's museum had a cafe serving wise coffee
 * - The wise old snake's museum was bigger on the inside
 * - The wise old snake's museum was a UNESCO world heritage site (self-proclaimed)
 * - The wise old snake's museum admission was free (for wise snakes)
 * - The wise old snake's museum was closed on Tuesdays (wise snakes nap on Tuesdays)
 */

import type { Vector2Like } from '../core/math.js';
import {
  type CompletedFossil,
  type MuseumExhibit,
  type ResearchUpgrade,
  type ResearchEffect,
  getFossilSet,
  RESEARCH_UPGRADES,
  FOSSIL_SETS,
  type FossilSetBonus,
  type FossilRarity,
} from './fossilRegistry.js';

/**
 * Museum state for persistence.
 */
export interface MuseumState {
  version: 1;
  completedFossils: CompletedFossil[];
  exhibits: MuseumExhibit[];
  researchLevel: number;
  unlockedUpgrades: string[];
  activeEffects: ResearchEffect[];
  totalFragmentsFound: number;
  totalFossilsAssembled: number;
  legendaryFossilsCompleted: string[];
  museumName: string;
  lastUpdated: number;
}

/**
 * Museum bonus calculations.
 */
export interface MuseumBonuses {
  scoreMultiplier: number;
  growthBonus: number;
  speedBonus: number;
  luckBonus: number;
  hungerSlow: number;
  defenseBonus: number;
  attackBonus: number;
  coldResistance: number;
  specialAbilities: string[];
}

/**
 * Default museum state.
 */
export function createMuseumState(museumName: string = 'The Wise Snake Museum'): MuseumState {
  return {
    version: 1,
    completedFossils: [],
    exhibits: [],
    researchLevel: 0,
    unlockedUpgrades: [],
    activeEffects: [],
    totalFragmentsFound: 0,
    totalFossilsAssembled: 0,
    legendaryFossilsCompleted: [],
    museumName,
    lastUpdated: Date.now(),
  };
}

/**
 * Add a completed fossil to the museum.
 */
export function addCompletedFossil(
  state: MuseumState,
  completedFossil: CompletedFossil,
): boolean {
  // Check if already completed
  if (state.completedFossils.some((f) => f.fossilSetId === completedFossil.fossilSetId)) {
    return false;
  }

  state.completedFossils.push(completedFossil);
  state.totalFossilsAssembled += 1;
  state.lastUpdated = Date.now();

  // Mark legendary fossils
  const fossilSet = getFossilSet(completedFossil.fossilSetId);
  if (fossilSet?.rarity === 'legendary') {
    if (!state.legendaryFossilsCompleted.includes(completedFossil.fossilSetId)) {
      state.legendaryFossilsCompleted.push(completedFossil.fossilSetId);
    }
  }

  // Unlock exhibit
  unlockExhibit(state, completedFossil.fossilSetId);

  return true;
}

/**
 * Unlock an exhibit for a completed fossil.
 */
function unlockExhibit(state: MuseumState, fossilSetId: string): void {
  const fossilSet = getFossilSet(fossilSetId);
  if (!fossilSet) return;

  // Check if exhibit already exists
  const existingExhibit = state.exhibits.find((e) => e.fossilSetId === fossilSetId);
  if (existingExhibit) {
    existingExhibit.unlocked = true;
    return;
  }

  // Calculate exhibit position (grid layout)
  const exhibitCount = state.exhibits.length;
  const cols = 4;
  const row = Math.floor(exhibitCount / cols);
  const col = exhibitCount % cols;

  const exhibit: MuseumExhibit = {
    fossilSetId,
    position: { x: col * 2, y: row * 2 },
    unlocked: true,
    researchLevel: state.researchLevel,
  };

  state.exhibits.push(exhibit);
}

/**
 * Check if a research upgrade can be unlocked.
 */
export function canUnlockUpgrade(
  state: MuseumState,
  upgradeId: string,
): boolean {
  const upgrade = RESEARCH_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return false;

  // Already unlocked
  if (state.unlockedUpgrades.includes(upgradeId)) return false;

  // Check research level
  if (state.researchLevel < upgrade.requiredResearchLevel) return false;

  // Check required fossil sets
  for (const fossilSetId of upgrade.requiredFossils) {
    if (!state.completedFossils.some((f) => f.fossilSetId === fossilSetId)) {
      return false;
    }
  }

  return true;
}

/**
 * Unlock a research upgrade.
 */
export function unlockResearchUpgrade(
  state: MuseumState,
  upgradeId: string,
): boolean {
  if (!canUnlockUpgrade(state, upgradeId)) return false;

  const upgrade = RESEARCH_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return false;

  state.unlockedUpgrades.push(upgradeId);
  state.activeEffects.push(...upgrade.effects);

  // Update research level
  state.researchLevel = Math.max(state.researchLevel, upgrade.requiredResearchLevel);

  state.lastUpdated = Date.now();
  return true;
}

/**
 * Get all available research upgrades.
 */
export function getAvailableUpgrades(state: MuseumState): ResearchUpgrade[] {
  return RESEARCH_UPGRADES.filter((upgrade) => canUnlockUpgrade(state, upgrade.id));
}

/**
 * Get all locked research upgrades with their requirements.
 */
export function getLockedUpgrades(state: MuseumState): Array<{
  upgrade: ResearchUpgrade;
  missingFossils: string[];
  missingLevel: number;
}> {
  return RESEARCH_UPGRADES.filter((u) => !state.unlockedUpgrades.includes(u.id)).map((upgrade) => {
    const missingFossils = upgrade.requiredFossils.filter(
      (fossilSetId) => !state.completedFossils.some((f) => f.fossilSetId === fossilSetId),
    );
    const missingLevel = upgrade.requiredResearchLevel - state.researchLevel;

    return { upgrade, missingFossils, missingLevel: Math.max(0, missingLevel) };
  });
}

/**
 * Calculate total museum bonuses from all exhibits and research.
 */
export function calculateMuseumBonuses(state: MuseumState): MuseumBonuses {
  const bonuses: MuseumBonuses = {
    scoreMultiplier: 0,
    growthBonus: 0,
    speedBonus: 0,
    luckBonus: 0,
    hungerSlow: 0,
    defenseBonus: 0,
    attackBonus: 0,
    coldResistance: 0,
    specialAbilities: [],
  };

  // Apply fossil set bonuses
  for (const completed of state.completedFossils) {
    const fossilSet = getFossilSet(completed.fossilSetId);
    if (!fossilSet) continue;

    for (const bonus of fossilSet.setBonuses) {
      applyBonus(bonuses, bonus);
    }
  }

  // Apply research upgrade effects
  for (const effect of state.activeEffects) {
    applyResearchEffect(bonuses, effect);
  }

  return bonuses;
}

/**
 * Apply a fossil set bonus to the bonuses object.
 */
function applyBonus(bonuses: MuseumBonuses, bonus: FossilSetBonus): void {
  switch (bonus.type) {
    case 'score-multiplier':
      bonuses.scoreMultiplier += bonus.value;
      break;
    case 'growth-boost':
      bonuses.growthBonus += bonus.value;
      break;
    case 'speed-boost':
      bonuses.speedBonus += bonus.value;
      break;
    case 'luck-boost':
      bonuses.luckBonus += bonus.value;
      break;
    case 'hunger-slow':
      bonuses.hungerSlow += bonus.value;
      break;
    case 'stat-boost':
      // Distribute stat boosts between attack and defense
      bonuses.attackBonus += Math.floor(bonus.value * 0.6);
      bonuses.defenseBonus += Math.floor(bonus.value * 0.4);
      break;
    case 'special-ability':
      if (bonus.description.includes('Unlocks')) {
        const abilityMatch = bonus.description.match(/Unlocks "([^"]+)"/);
        if (abilityMatch) {
          bonuses.specialAbilities.push(abilityMatch[1]);
        }
      }
      break;
  }
}

/**
 * Apply a research effect to the bonuses object.
 */
function applyResearchEffect(bonuses: MuseumBonuses, effect: ResearchEffect): void {
  switch (effect.type) {
    case 'rarity-boost':
      bonuses.luckBonus += effect.value * 0.5; // Partial luck boost
      break;
    // Other research effects affect gameplay mechanics, not direct bonuses
  }
}

/**
 * Get museum statistics.
 */
export function getMuseumStats(state: MuseumState): {
  totalFossils: number;
  totalExhibits: number;
  legendaryCount: number;
  rareCount: number;
  uncommonCount: number;
  commonCount: number;
  researchLevel: number;
  completionPercentage: number;
} {
  const totalSets = FOSSIL_SETS.length;
  const completedCount = state.completedFossils.length;

  let legendaryCount = 0;
  let rareCount = 0;
  let uncommonCount = 0;
  let commonCount = 0;

  for (const completed of state.completedFossils) {
    const fossilSet = getFossilSet(completed.fossilSetId);
    if (!fossilSet) continue;

    switch (fossilSet.rarity) {
      case 'legendary':
        legendaryCount += 1;
        break;
      case 'rare':
        rareCount += 1;
        break;
      case 'uncommon':
        uncommonCount += 1;
        break;
      case 'common':
        commonCount += 1;
        break;
    }
  }

  return {
    totalFossils: completedCount,
    totalExhibits: state.exhibits.filter((e) => e.unlocked).length,
    legendaryCount,
    rareCount,
    uncommonCount,
    commonCount,
    researchLevel: state.researchLevel,
    completionPercentage: Math.floor((completedCount / totalSets) * 100),
  };
}

/**
 * Get exhibit data for rendering.
 */
export function getExhibitData(state: MuseumState): Array<{
  fossilSet: NonNullable<ReturnType<typeof getFossilSet>>;
  exhibit: MuseumExhibit;
  position: Vector2Like;
  unlocked: boolean;
}> {
  return state.exhibits
    .filter((e) => e.unlocked)
    .map((exhibit) => {
      const fossilSet = getFossilSet(exhibit.fossilSetId);
      return {
        fossilSet: fossilSet!,
        exhibit,
        position: exhibit.position,
        unlocked: exhibit.unlocked,
      };
    });
}

/**
 * Check if all fossil sets are completed.
 */
export function isMuseumComplete(state: MuseumState): boolean {
  return state.completedFossils.length === FOSSIL_SETS.length;
}

/**
 * Get completed fossil sets by rarity.
 */
export function getCompletedByRarity(
  state: MuseumState,
  rarity: FossilRarity,
): CompletedFossil[] {
  return state.completedFossils.filter((f) => {
    const set = getFossilSet(f.fossilSetId);
    return set?.rarity === rarity;
  });
}

/**
 * Export museum state for save/load.
 */
export function serializeMuseumState(state: MuseumState): string {
  return JSON.stringify({
    ...state,
    lastUpdated: Date.now(),
  });
}

/**
 * Import museum state from save data.
 */
export function deserializeMuseumState(json: string): MuseumState {
  const parsed = JSON.parse(json) as Partial<MuseumState>;
  return {
    version: parsed.version ?? 1,
    completedFossils: parsed.completedFossils ?? [],
    exhibits: parsed.exhibits ?? [],
    researchLevel: parsed.researchLevel ?? 0,
    unlockedUpgrades: parsed.unlockedUpgrades ?? [],
    activeEffects: parsed.activeEffects ?? [],
    totalFragmentsFound: parsed.totalFragmentsFound ?? 0,
    totalFossilsAssembled: parsed.totalFossilsAssembled ?? 0,
    legendaryFossilsCompleted: parsed.legendaryFossilsCompleted ?? [],
    museumName: parsed.museumName ?? 'The Wise Snake Museum',
    lastUpdated: parsed.lastUpdated ?? Date.now(),
  };
}
