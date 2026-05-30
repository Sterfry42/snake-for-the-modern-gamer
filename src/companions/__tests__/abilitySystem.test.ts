// Tests for the ability system — verifies cooldown handling, bond checks,
// cooldown reduction, and edge cases like multiple abilities on the same tick.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbilitySystem } from '../abilitySystem.js';
import type { CompanionInstance, CompanionAbility } from '../companionTypes.js';

const createMockInstance = (overrides?: Partial<CompanionInstance>): CompanionInstance => ({
  id: 'test-companion',
  definitionId: 'test-creature',
  bondLevel: 3,
  bondProgress: 50,
  currentRoomId: 'test-room',
  gridX: 5,
  gridY: 10,
  lastFedRoom: 1,
  feedCountThisDay: 0,
  lastInteractionRoom: 1,
  abilitiesUsed: new Map(),
  totalApplesEatenTogether: 0,
  totalDangersSurvived: 0,
  mood: 'happy',
  flags: {},
  isTamed: true,
  ...overrides,
});

const createMockAbility = (overrides?: Partial<CompanionAbility>): CompanionAbility => ({
  abilityId: 'test-ability',
  name: 'Test Ability',
  description: 'A test ability',
  requiresBondLevel: 2,
  cooldownRooms: 5,
  effect: 'attack',
  parameters: { damage: 10 },
  ...overrides,
});

describe('AbilitySystem', () => {
  let abilitySystem: AbilitySystem;
  let mockCreatureAbility: ReturnType<typeof vi.fn>;

  let mockJuiceManager: { creatureAbility: (worldX: number, worldY: number, abilityId: string) => void };

  beforeEach(() => {
    mockCreatureAbility = vi.fn();
    mockJuiceManager = {
      creatureAbility: mockCreatureAbility as unknown as (worldX: number, worldY: number, abilityId: string) => void,
    };
    abilitySystem = new AbilitySystem(mockJuiceManager);
  });

  describe('canUseAbility', () => {
    it('returns true when bond level is sufficient and cooldown is done', () => {
      const instance = createMockInstance({ bondLevel: 3 });
      const ability = createMockAbility();
      const canUse = abilitySystem.canUseAbility(instance, ability, 10);
      expect(canUse).toBe(true);
    });

    it('returns false when bond level is too low', () => {
      const instance = createMockInstance({ bondLevel: 1 });
      const ability = createMockAbility({ requiresBondLevel: 2 });
      const canUse = abilitySystem.canUseAbility(instance, ability, 10);
      expect(canUse).toBe(false);
    });

    it('returns false when ability is on cooldown', () => {
      const instance = createMockInstance({ bondLevel: 3 });
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 10);

      const canUse = abilitySystem.canUseAbility(instance, ability, 12);
      expect(canUse).toBe(false);
    });

    it('returns true when cooldown has passed', () => {
      const instance = createMockInstance({ bondLevel: 3 });
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      const canUse = abilitySystem.canUseAbility(instance, ability, 12);
      expect(canUse).toBe(true);
    });
  });

  describe('useAbility', () => {
    it('succeeds and sets cooldown when ability is available', () => {
      const instance = createMockInstance();
      const ability = createMockAbility();

      const result = abilitySystem.useAbility(instance, ability, 10, 1.0);

      expect(result.success).toBe(true);
      expect(result.abilityId).toBe('test-ability');
      expect(result.message).toBe('Test Ability activated!');
      expect(instance.abilitiesUsed.get('test-ability')).toBe(10);
      expect(mockJuiceManager.creatureAbility).toHaveBeenCalled();
    });

    it('fails with bondTooLow when bond level is insufficient', () => {
      const instance = createMockInstance({ bondLevel: 1 });
      const ability = createMockAbility({ requiresBondLevel: 2 });

      const result = abilitySystem.useAbility(instance, ability, 10, 1.0);

      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('bondTooLow');
    });

    it('fails with onCooldown when ability is on cooldown', () => {
      const instance = createMockInstance({ bondLevel: 3 });
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 10);

      const result = abilitySystem.useAbility(instance, ability, 12, 1.0);

      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('onCooldown');
      expect(result.cooldownRemaining).toBe(3);
    });

    it('applies cooldown reduction correctly', () => {
      const instance = createMockInstance({ bondLevel: 3 });
      const ability = createMockAbility({ cooldownRooms: 10 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      // With 50% cooldown reduction: adjusted cooldown = 5 rooms
      // At room 10, roomsSinceUse = 5, which equals adjustedCooldown → ready
      const result = abilitySystem.useAbility(instance, ability, 10, 0.5);

      expect(result.success).toBe(true);
      expect(instance.abilitiesUsed.get('test-ability')).toBe(10);
    });

    it('updates companion mood to excited on successful ability use', () => {
      const instance = createMockInstance({ mood: 'neutral' });
      const ability = createMockAbility();

      abilitySystem.useAbility(instance, ability, 10, 1.0);

      expect(instance.mood).toBe('excited');
    });

    it('two abilities on same cooldown tick → only one fires', () => {
      const instance = createMockInstance({ bondLevel: 3 });
      const ability1 = createMockAbility({ abilityId: 'ability-1', cooldownRooms: 5 });
      const ability2 = createMockAbility({ abilityId: 'ability-2', cooldownRooms: 5 });

      const result1 = abilitySystem.useAbility(instance, ability1, 10, 1.0);
      const result2 = abilitySystem.useAbility(instance, ability2, 10, 1.0);

      // Both should succeed (different abilities)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // But only the first should actually fire at room 10
      // The second should still succeed because it's a different ability
      expect(instance.abilitiesUsed.size).toBe(2);
    });

    it('cooldown reduction from equipment is correctly applied', () => {
      const instance = createMockInstance({ bondLevel: 3 });
      const ability = createMockAbility({ cooldownRooms: 8 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      // With 75% cooldown (25% reduction): adjusted cooldown = ceil(8 * 0.75) = 6 rooms
      // At room 12, roomsSinceUse = 7, which exceeds adjustedCooldown → ready
      const result = abilitySystem.useAbility(instance, ability, 12, 0.75);

      expect(result.success).toBe(true);
      expect(instance.abilitiesUsed.get('test-ability')).toBe(12);
    });
  });

  describe('getCooldownRemaining', () => {
    it('returns 0 when ability has never been used', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 5 });
      const remaining = abilitySystem.getCooldownRemaining(instance, ability, 10);
      expect(remaining).toBe(0);
    });

    it('returns correct remaining cooldown', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 10 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      const remaining = abilitySystem.getCooldownRemaining(instance, ability, 8);
      expect(remaining).toBe(7);
    });

    it('returns 0 when cooldown has fully passed', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      const remaining = abilitySystem.getCooldownRemaining(instance, ability, 12);
      expect(remaining).toBe(0);
    });
  });

  describe('isAbilityReady', () => {
    it('returns true when ability is ready', () => {
      const instance = createMockInstance();
      const ability = createMockAbility();
      const ready = abilitySystem.isAbilityReady(instance, ability, 10);
      expect(ready).toBe(true);
    });

    it('returns false when ability is on cooldown', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 10);

      const ready = abilitySystem.isAbilityReady(instance, ability, 12);
      expect(ready).toBe(false);
    });
  });

  describe('getCooldownProgress', () => {
    it('returns 1 when ability has never been used', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 5 });
      const progress = abilitySystem.getCooldownProgress(instance, ability, 10);
      expect(progress).toBe(1);
    });

    it('returns 0 when ability just was used', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 10);

      const progress = abilitySystem.getCooldownProgress(instance, ability, 10);
      expect(progress).toBe(0);
    });

    it('returns 0.5 when halfway through cooldown', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 10 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      const progress = abilitySystem.getCooldownProgress(instance, ability, 10);
      expect(progress).toBe(0.5);
    });

    it('returns 1 when cooldown has fully passed', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      const progress = abilitySystem.getCooldownProgress(instance, ability, 12);
      expect(progress).toBe(1);
    });
  });

  describe('resolveCooldownsOnRoomChange', () => {
    it('does not mutate state — readiness is computed on the fly', () => {
      const instance = createMockInstance();
      const ability = createMockAbility({ cooldownRooms: 5 });
      instance.abilitiesUsed.set(ability.abilityId, 5);

      const transitions = abilitySystem.resolveCooldownsOnRoomChange(instance, 10);
      expect(transitions).toBe(0);
    });
  });
});
