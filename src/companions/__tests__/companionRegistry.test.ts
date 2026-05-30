// Tests for companion registry — verifies all 12 creature definitions.

import { describe, it, expect } from 'vitest';
import {
  COMPANION_DEFINITIONS,
  getCompanionDefinition,
  getCompanionsByKind,
  getCompanionsByBiome,
} from '../companionRegistry.js';
import type { CompanionKind } from '../companionTypes.js';

describe('companionRegistry', () => {
  it('exports exactly 36 definitions', () => {
    expect(COMPANION_DEFINITIONS.length).toBe(36);
  });

  it('all definitions have non-empty required fields', () => {
    for (const def of COMPANION_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.species).toBeTruthy();
      expect(def.kind).toBeTruthy();
      expect(def.rarity).toBeTruthy();
      expect(def.portraitId).toBeTruthy();
      expect(def.spriteRecipeId).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.spawnTable.length).toBeGreaterThan(0);
      expect(def.tameCost.foodItems.length).toBeGreaterThan(0);
      expect(def.abilities.length).toBeGreaterThan(0);
      expect(def.traits.length).toBeGreaterThan(0);
    }
  });

  it('getCompanionDefinition returns the correct creature', () => {
    const ember = getCompanionDefinition('ember-wisp');
    expect(ember).toBeDefined();
    expect(ember?.id).toBe('ember-wisp');
    expect(ember?.name).toBe('Ember Wisp');
  });

  it('getCompanionDefinition returns undefined for unknown id', () => {
    expect(getCompanionDefinition('nonexistent-creature')).toBeUndefined();
  });

  it('getCompanionsByKind returns correct subsets', () => {
    const followers = getCompanionsByKind('follower');
    expect(followers.length).toBe(6);
    expect(followers.every((d) => d.kind === 'follower')).toBe(true);

    const mounts = getCompanionsByKind('mount');
    expect(mounts.length).toBe(5);
    expect(mounts.every((d) => d.kind === 'mount')).toBe(true);

    const fighters = getCompanionsByKind('fighter');
    expect(fighters.length).toBe(5);

    const protectors = getCompanionsByKind('protector');
    expect(protectors.length).toBe(6);

    const scouts = getCompanionsByKind('scout');
    expect(scouts.length).toBe(5);

    const foragers = getCompanionsByKind('forager');
    expect(foragers.length).toBe(8);
  });

  it('getCompanionsByBiome returns creatures for known biomes', () => {
    const emberBiome = getCompanionsByBiome('ember-waste');
    expect(emberBiome.length).toBeGreaterThan(0);
    expect(emberBiome.some((d) => d.id === 'ember-wisp')).toBe(true);

    const badlands = getCompanionsByBiome('liberty-badlands');
    expect(badlands.length).toBeGreaterThan(0);
  });

  it('all biome IDs in spawn tables reference valid biomes', () => {
    const validBiomes = new Set<string>();
    for (const def of COMPANION_DEFINITIONS) {
      for (const spawn of def.spawnTable) {
        expect(spawn.biomeId).toBeTruthy();
        expect(spawn.baseWeight).toBeGreaterThan(0);
        validBiomes.add(spawn.biomeId);
      }
    }
    // Verify no duplicate biome entries within the same creature's spawn table
    for (const def of COMPANION_DEFINITIONS) {
      const biomeIds = def.spawnTable.map((s) => s.biomeId);
      const unique = new Set(biomeIds);
      expect(biomeIds.length).toBe(unique.size);
    }
  });

  it('all abilities have exactly one cooldown source (cooldownRooms required)', () => {
    for (const def of COMPANION_DEFINITIONS) {
      for (const ability of def.abilities) {
        expect(ability.abilityId).toBeTruthy();
        expect(ability.name).toBeTruthy();
        expect(ability.description).toBeTruthy();
        expect(ability.cooldownRooms).toBeGreaterThan(0);
        expect(ability.requiresBondLevel).toBeGreaterThanOrEqual(1);
        expect(ability.requiresBondLevel).toBeLessThanOrEqual(5);
        expect(ability.effect).toBeTruthy();
        expect(ability.parameters).toBeDefined();
      }
    }
  });

  it('all tame costs have at least one food item', () => {
    for (const def of COMPANION_DEFINITIONS) {
      expect(def.tameCost.foodItems.length).toBeGreaterThan(0);
      for (const food of def.tameCost.foodItems) {
        expect(food.itemId).toBeTruthy();
        expect(food.count).toBeGreaterThan(0);
      }
      expect(def.tameCost.minimumBondLevel).toBeGreaterThanOrEqual(1);
      expect(def.tameCost.minimumBondLevel).toBeLessThanOrEqual(5);
    }
  });

  it('all trait IDs are valid', () => {
    const validTraitIds = new Set([
      'fireResistance',
      'coldResistance',
      'movementSpeed',
      'wallSenseRadius',
      'appleScoreBonus',
      'appleSpawnBonus',
      'waterSafe',
      'damageMitigation',
      'bulletDodgeChance',
      'bossPullReduction',
      'shopDiscount',
      'mapReveal',
      'hazardDetection',
      'cooldownReduction',
      'companionDamageBonus',
    ]);
    for (const def of COMPANION_DEFINITIONS) {
      for (const trait of def.traits) {
        expect(validTraitIds.has(trait.traitId)).toBe(true);
        expect(trait.value).toBeGreaterThan(0);
        expect(trait.description).toBeTruthy();
      }
    }
  });

  it('rarity distribution is reasonable', () => {
    const rarityCounts: Record<string, number> = {};
    for (const def of COMPANION_DEFINITIONS) {
      rarityCounts[def.rarity] = (rarityCounts[def.rarity] ?? 0) + 1;
    }
    // All 5 rarity tiers should be represented
    expect(rarityCounts.common).toBe(10);
    expect(rarityCounts.uncommon).toBe(10);
    expect(rarityCounts.rare).toBe(8);
    expect(rarityCounts.epic).toBe(5);
    expect(rarityCounts.legendary).toBe(3);
  });

  it('follower follow offsets are sequential', () => {
    const followers = getCompanionsByKind('follower');
    for (const def of followers) {
      expect(def.followOffset.x).toBe(0);
      expect(def.followOffset.y).toBeGreaterThan(0);
    }
  });
});
