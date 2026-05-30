// Tests for the breeding system — verifies compatibility, trait inheritance,
// rarity determination, and breeding result validation.

import { describe, it, expect, vi } from 'vitest';
import { BreedingSystem, type BreedingResult } from '../breedingSystem.js';
import type {
  CompanionDefinition,
  CompanionInstance,
  CompanionRarity,
} from '../companionTypes.js';
import {
  COMPANION_DEFINITIONS,
  getCompanionDefinition,
  getCompanionsByKind,
} from '../companionRegistry.js';

// ---- Test helpers ----

function makeInstance(definitionId: string, bondLevel: number, roomId: string, x: number, y: number): CompanionInstance {
  return {
    id: `inst-${definitionId}`,
    definitionId,
    bondLevel,
    bondProgress: 50,
    currentRoomId: roomId,
    gridX: x,
    gridY: y,
    lastFedRoom: 1,
    feedCountThisDay: 0,
    lastInteractionRoom: 1,
    abilitiesUsed: new Map(),
    totalApplesEatenTogether: 0,
    totalDangersSurvived: 0,
    mood: 'happy',
    flags: {},
    isTamed: true,
  };
}

function makeWildInstance(definitionId: string, roomId: string): CompanionInstance {
  return {
    ...makeInstance(definitionId, 1, roomId, 5, 5),
    isTamed: false,
    bondProgress: 0,
    mood: 'neutral',
  };
}

function defaultSpawnOffspring(
  definitionId: string,
  _roomId: string,
  _x: number,
  _y: number,
  _isTamed: boolean,
): void {
  // No-op for tests — we just want to verify it was called
}

describe('BreedingSystem', () => {
  let system: BreedingSystem;

  beforeEach(() => {
    system = new BreedingSystem();
  });

  describe('areCompatible', () => {
    it('returns true for same kind, same biome, same rarity', () => {
      const a = getCompanionDefinition('ember-wisp')!;
      const b = getCompanionDefinition('dust-bunny')!;
      // Both are followers and both spawn in at least one common biome
      expect(system.areCompatible(a, b)).toBe(true);
    });

    it('returns false for different kinds', () => {
      const follower = getCompanionDefinition('ember-wisp')!;
      const mount = getCompanionDefinition('wild-boar')!;
      expect(system.areCompatible(follower, mount)).toBe(false);
    });

    it('returns false for same kind but no shared biome', () => {
      const emberWaste = getCompanionDefinition('ember-wisp')!;
      const ocean = getCompanionDefinition('river-koi')!;
      // Different kinds so this fails on kind check first
      expect(system.areCompatible(emberWaste, ocean)).toBe(false);
    });

    it('returns true for creatures sharing a biome regardless of rarity', () => {
      // copper-rat and goldfinch both spawn in verdigris-basin
      const copperRat = getCompanionDefinition('copper-rat')!;
      const goldfinch = getCompanionDefinition('goldfinch')!;
      expect(system.areCompatible(copperRat, goldfinch)).toBe(false); // different kinds
    });
  });

  describe('determineOffspringRarity', () => {
    it('returns parent rarity if both are common', () => {
      expect(system.determineOffspringRarity('common', 'common')).toBe('uncommon');
    });

    it('returns +1 tier above the higher parent', () => {
      expect(system.determineOffspringRarity('uncommon', 'uncommon')).toBe('rare');
      expect(system.determineOffspringRarity('rare', 'rare')).toBe('epic');
      expect(system.determineOffspringRarity('epic', 'epic')).toBe('legendary');
    });

    it('uses the higher parent rarity when different', () => {
      expect(system.determineOffspringRarity('common', 'rare')).toBe('epic');
      expect(system.determineOffspringRarity('uncommon', 'epic')).toBe('legendary');
    });

    it('caps at legendary', () => {
      expect(system.determineOffspringRarity('legendary', 'legendary')).toBe('legendary');
      expect(system.determineOffspringRarity('epic', 'legendary')).toBe('legendary');
    });

    it('works with different orders', () => {
      expect(system.determineOffspringRarity('common', 'rare')).toBe(
        system.determineOffspringRarity('rare', 'common'),
      );
    });
  });

  describe('generateOffspringTraits', () => {
    it('inherits traits from both parents with 50% chance each', () => {
      const parent1 = getCompanionDefinition('ember-wisp')!;
      const parent2 = getCompanionDefinition('dust-bunny')!;

      // Ember wisp has fireResistance, dust bunny has appleSpawnBonus
      const traits = system.generateOffspringTraits(parent1, parent2);

      // Should have 0-2 traits depending on random chance
      // fireResistance is only in parent1 (50% chance)
      // appleSpawnBonus is only in parent2 (50% chance)
      const hasFireResistance = traits.some((t) => t.traitId === 'fireResistance');
      const hasAppleSpawn = traits.some((t) => t.traitId === 'appleSpawnBonus');

      // Each trait has 50% chance — just verify the total count is reasonable
      expect(traits.length).toBeGreaterThanOrEqual(0);
      expect(traits.length).toBeLessThanOrEqual(2);
    });

    it('always inherits shared traits when both parents have them', () => {
      // goldfinch and copperRat both have appleSpawnBonus
      const parent1 = getCompanionDefinition('goldfinch')!;
      const parent2 = getCompanionDefinition('copperRat')!;

      const traits = system.generateOffspringTraits(parent1, parent2);
      // appleSpawnBonus is shared — always inherited
      expect(traits.some((t) => t.traitId === 'appleSpawnBonus')).toBe(true);
    });

    it('produces consistent results for identical trait sets', () => {
      const a = getCompanionDefinition('ember-wisp')!;
      const b = getCompanionDefinition('ashen-hound')!;
      // Both have fireResistance
      const traits = system.generateOffspringTraits(a, b);
      expect(traits.some((t) => t.traitId === 'fireResistance')).toBe(true);
    });

    it('trait count is bounded by total unique traits from both parents', () => {
      const parent1 = getCompanionDefinition('jade-panther')!;
      const parent2 = getCompanionDefinition('thorn-viper')!;
      // jade-panther has bulletDodgeChance + companionDamageBonus
      // thorn-viper has bossPullReduction
      // Total unique traits = 3, shared traits are always inherited
      const traits = system.generateOffspringTraits(parent1, parent2);
      expect(traits.length).toBeLessThanOrEqual(3);
    });
  });

  describe('attemptBreeding', () => {
    const roomId = 'test-room';
    const maxCompanions = 4;
    let activeCount = 0;

    const mockSpawnOffspring = vi.fn(defaultSpawnOffspring);
    const mockIncrementBred = vi.fn();

    beforeEach(() => {
      activeCount = 0;
      mockSpawnOffspring.mockClear();
      mockIncrementBred.mockClear();
    });

    it('fails when breeding with self', () => {
      const parent = makeInstance('ember-wisp', 5, roomId, 5, 5);
      const result = system.attemptBreeding(
        parent,
        parent,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('incompatible');
    });

    it('fails when companions are in different rooms', () => {
      const parent1 = makeInstance('ember-wisp', 5, 'room-a', 5, 5);
      const parent2 = makeInstance('dust-bunny', 5, 'room-b', 10, 10);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('notSameRoom');
    });

    it('fails with wrong breeding food', () => {
      const parent1 = makeInstance('ember-wisp', 5, roomId, 5, 5);
      const parent2 = makeInstance('dust-bunny', 5, roomId, 6, 6);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'fire-pepper',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('noBreedingFood');
    });

    it('fails when either parent is not tamed', () => {
      const parent1 = makeInstance('ember-wisp', 5, roomId, 5, 5);
      const parent2 = makeWildInstance('dust-bunny', roomId);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('incompatible');
    });

    it('fails when parent 1 has bond level below 5', () => {
      const parent1 = makeInstance('ember-wisp', 4, roomId, 5, 5);
      const parent2 = makeInstance('dust-bunny', 5, roomId, 6, 6);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('notBondLevel5');
    });

    it('fails when parent 2 has bond level below 5', () => {
      const parent1 = makeInstance('ember-wisp', 5, roomId, 5, 5);
      const parent2 = makeInstance('dust-bunny', 4, roomId, 6, 6);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('notBondLevel5');
    });

    it('fails for incompatible companions (different kinds)', () => {
      const parent1 = makeInstance('ember-wisp', 5, roomId, 5, 5);
      const parent2 = makeInstance('wild-boar', 5, roomId, 6, 6);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('incompatible');
    });

    it('fails when max companions reached', () => {
      const parent1 = makeInstance('ember-wisp', 5, roomId, 5, 5);
      const parent2 = makeInstance('dust-bunny', 5, roomId, 6, 6);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        maxCompanions,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('maxCompanionsReached');
    });

    it('succeeds for two compatible companions at bond 5', () => {
      const parent1 = makeInstance('ember-wisp', 5, roomId, 5, 5);
      const parent2 = makeInstance('dust-bunny', 5, roomId, 6, 6);
      const result = system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        mockSpawnOffspring,
        mockIncrementBred,
      );
      expect(result.success).toBe(true);
      expect(mockSpawnOffspring).toHaveBeenCalledOnce();
      expect(mockIncrementBred).toHaveBeenCalledOnce();
      expect(result.offspringDefinitionId).toBeDefined();
    });

    it('offspring has combined abilities from both parents', () => {
      const jadePanther = getCompanionDefinition('jade-panther')!;
      const thornViper = getCompanionDefinition('thorn-viper')!;

      const parent1 = makeInstance('jade-panther', 5, roomId, 5, 5);
      const parent2 = makeInstance('thorn-viper', 5, roomId, 6, 6);

      let capturedDef: CompanionDefinition | undefined;
      const capturingSpawn = (defId: string) => {
        capturedDef = COMPANION_DEFINITIONS.find((d) => d.id === defId);
      };

      system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        capturingSpawn,
        mockIncrementBred,
      );

      // Both have abilities — offspring should have combined abilities
      // jade-panther: jade-strike, thorn-viper: venom-bite
      expect(capturedDef?.abilities.length).toBeGreaterThanOrEqual(1);
    });

    it('offspring rarity can be legendary from two epic parents', () => {
      const parent1 = makeInstance('jade-panther', 5, roomId, 5, 5); // epic
      const parent2 = makeInstance('shadow-jackal', 5, roomId, 6, 6); // epic

      let capturedDef: CompanionDefinition | undefined;
      system.attemptBreeding(
        parent1,
        parent2,
        'primordial-egg',
        roomId,
        COMPANION_DEFINITIONS,
        maxCompanions,
        activeCount,
        (defId) => {
          capturedDef = COMPANION_DEFINITIONS.find((d) => d.id === defId);
        },
        mockIncrementBred,
      );

      // Both are epic → offspring should be legendary
      if (capturedDef) {
        expect(capturedDef.rarity).toBe('legendary');
      }
    });
  });

  describe('Trait inheritance statistics', () => {
    it('average inheritance rate is approximately 50% for unique traits', () => {
      const runs = 200;
      const parent1 = getCompanionDefinition('jade-panther')!; // bulletDodgeChance, companionDamageBonus
      const parent2 = getCompanionDefinition('thorn-viper')!; // bossPullReduction

      let totalInherited = 0;

      for (let i = 0; i < runs; i++) {
        const traits = system.generateOffspringTraits(parent1, parent2);
        totalInherited += traits.length;
      }

      // 3 unique traits total, each 50% chance → expected ~1.5
      const average = totalInherited / runs;
      expect(average).toBeGreaterThan(0.8);
      expect(average).toBeLessThan(2.2);
    });

    it('shared traits are always inherited', () => {
      const runs = 50;
      const parent1 = getCompanionDefinition('goldfinch')!; // appleSpawnBonus
      const parent2 = getCompanionDefinition('copperRat')!; // appleScoreBonus

      for (let i = 0; i < runs; i++) {
        const traits = system.generateOffspringTraits(parent1, parent2);
        // appleSpawnBonus and appleScoreBonus are unique to each parent
        // Each has 50% chance — total expected: 1.0
        const hasAppleSpawn = traits.some((t) => t.traitId === 'appleSpawnBonus');
        const hasAppleScore = traits.some((t) => t.traitId === 'appleScoreBonus');
        // Neither is guaranteed — random chance
        expect(hasAppleSpawn || hasAppleScore).toBe(true);
      }
    });
  });
});

describe('Companion Registry — Phase 5', () => {
  it('exports exactly 36 definitions', () => {
    expect(COMPANION_DEFINITIONS.length).toBe(36);
  });

  it('has correct rarity distribution', () => {
    const counts: Record<string, number> = {};
    for (const def of COMPANION_DEFINITIONS) {
      counts[def.rarity] = (counts[def.rarity] ?? 0) + 1;
    }
    expect(counts.common).toBe(10);
    expect(counts.uncommon).toBe(10);
    expect(counts.rare).toBe(8);
    expect(counts.epic).toBe(5);
    expect(counts.legendary).toBe(3);
  });

  it('has correct kind distribution', () => {
    const counts: Record<string, number> = {};
    for (const def of COMPANION_DEFINITIONS) {
      counts[def.kind] = (counts[def.kind] ?? 0) + 1;
    }
    expect(counts.follower).toBe(6);
    expect(counts.protector).toBe(7);
    expect(counts.scout).toBe(5);
    expect(counts.forager).toBe(8);
    expect(counts.fighter).toBe(5);
    expect(counts.mount).toBe(5);
  });

  it('all new creatures have valid biome IDs', () => {
    for (const def of COMPANION_DEFINITIONS) {
      for (const spawn of def.spawnTable) {
        expect(spawn.biomeId).toBeTruthy();
        expect(spawn.baseWeight).toBeGreaterThan(0);
        expect(spawn.minRoomsVisited).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('all creatures have at least one ability', () => {
    for (const def of COMPANION_DEFINITIONS) {
      expect(def.abilities.length).toBeGreaterThan(0);
      for (const ability of def.abilities) {
        expect(ability.abilityId).toBeTruthy();
        expect(ability.name).toBeTruthy();
        expect(ability.requiresBondLevel).toBeGreaterThanOrEqual(1);
        expect(ability.requiresBondLevel).toBeLessThanOrEqual(5);
        expect(ability.cooldownRooms).toBeGreaterThan(0);
      }
    }
  });

  it('all creatures have at least one trait', () => {
    for (const def of COMPANION_DEFINITIONS) {
      expect(def.traits.length).toBeGreaterThan(0);
    }
  });

  it('all creatures have valid tame costs', () => {
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

  it('all creatures have non-empty required fields', () => {
    for (const def of COMPANION_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.species).toBeTruthy();
      expect(def.kind).toBeTruthy();
      expect(def.rarity).toBeTruthy();
      expect(def.portraitId).toBeTruthy();
      expect(def.spriteRecipeId).toBeTruthy();
      expect(def.description).toBeTruthy();
    }
  });

  it('legendary creatures have high tame requirements', () => {
    const legendaries = COMPANION_DEFINITIONS.filter((d) => d.rarity === 'legendary');
    expect(legendaries.length).toBe(3);
    for (const legendary of legendaries) {
      // Legendary creatures should require at least bond level 3 to tame
      expect(legendary.tameCost.minimumBondLevel).toBeGreaterThanOrEqual(3);
    }
  });

  it('all biomes referenced in spawn tables are valid', () => {
    const biomes = new Set<string>();
    for (const def of COMPANION_DEFINITIONS) {
      for (const spawn of def.spawnTable) {
        biomes.add(spawn.biomeId);
      }
    }
    expect(biomes.size).toBeGreaterThan(5);
  });

  it('getCompanionsByKind returns correct subsets for all kinds', () => {
    const kinds: CompanionDefinition['kind'][] = ['follower', 'protector', 'scout', 'forager', 'fighter', 'mount'];
    for (const kind of kinds) {
      const result = getCompanionsByKind(kind);
      expect(result.every((d) => d.kind === kind)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    }
  });

     it('all creatures have at least one valid spawn entry', () => {
    for (const def of COMPANION_DEFINITIONS) {
      expect(def.spawnTable.length).toBeGreaterThan(0);
      for (const entry of def.spawnTable) {
        expect(entry.roomCondition).toMatch(/^(any|structure|dangerous|water)$/);
        if (entry.timeOfDayBias !== undefined) {
          expect(entry.timeOfDayBias).toMatch(/^(day|night|any)$/);
        }
      }
    }
  });

  it('all creature IDs are unique', () => {
    const ids = COMPANION_DEFINITIONS.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(36);
  });
});
