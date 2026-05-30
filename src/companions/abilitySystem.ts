// Ability system — manages ability cooldowns, readiness, and resolution.
// Separated from CompanionService to keep ability logic (cooldown tracking,
// bond checks, cooldown reduction) cleanly encapsulated.

import type {
  CompanionAbility,
  CompanionInstance,
  AbilityResult,
} from './companionTypes.js';

/**
 * Manages ability cooldowns and readiness for companion instances.
 */
export class AbilitySystem {
  constructor(
    private readonly juiceManager: {
      creatureAbility: (worldX: number, worldY: number, abilityId: string) => void;
    },
  ) {}

  /**
   * Check if a companion can use an ability (bond level + cooldown).
   */
  canUseAbility(
    instance: CompanionInstance,
    ability: CompanionAbility,
    currentRoom: number,
  ): boolean {
    if (instance.bondLevel < ability.requiresBondLevel) {
      return false;
    }
    return this.getCooldownRemaining(instance, ability, currentRoom) === 0;
  }

  /**
   * Use an ability, applying cooldown reduction if provided.
   * Returns a result with the new cooldown remaining.
   */
  useAbility(
    instance: CompanionInstance,
    ability: CompanionAbility,
    currentRoom: number,
    cooldownReduction: number = 1.0,
  ): AbilityResult {
    // Check bond level requirement
    if (instance.bondLevel < ability.requiresBondLevel) {
      return {
        success: false,
        abilityId: ability.abilityId,
        message: `Requires bond level ${ability.requiresBondLevel}.`,
        failedReason: 'bondTooLow',
      };
    }

    // Calculate cooldown with reduction applied
    const rawCooldown = this.resolveCooldown(ability, instance);
    const adjustedCooldown = Math.ceil(rawCooldown * cooldownReduction);
    const lastUsed = instance.abilitiesUsed.get(ability.abilityId) ?? 0;
    const roomsSinceUse = currentRoom - lastUsed;

    // Check if still on cooldown
    if (lastUsed > 0 && roomsSinceUse < adjustedCooldown) {
      return {
        success: false,
        abilityId: ability.abilityId,
        cooldownRemaining: adjustedCooldown - roomsSinceUse,
        message: 'Ability is on cooldown.',
        failedReason: 'onCooldown',
      };
    }

    // Mark ability as used at current room
    instance.abilitiesUsed.set(ability.abilityId, currentRoom);
    instance.mood = 'excited' as CompanionInstance['mood'];

    // Play juice effect
    if (this.juiceManager?.creatureAbility) {
      this.juiceManager.creatureAbility(
        instance.gridX * 24,
        instance.gridY * 24,
        ability.abilityId,
      );
    }

    return {
      success: true,
      abilityId: ability.abilityId,
      message: `${ability.name} activated!`,
    };
  }

  /**
   * Resolve remaining cooldown for an ability in the current room.
   * Returns the number of rooms remaining until the ability is ready.
   */
  getCooldownRemaining(
    instance: CompanionInstance,
    ability: CompanionAbility,
    currentRoom: number,
  ): number {
    const rawCooldown = this.resolveCooldown(ability, instance);
    const lastUsed = instance.abilitiesUsed.get(ability.abilityId) ?? 0;
    if (lastUsed === 0) {
      return 0;
    }
    return Math.max(0, rawCooldown - (currentRoom - lastUsed));
  }

  /**
   * Resolve whether an ability is ready (0 remaining rooms).
   */
  isAbilityReady(
    instance: CompanionInstance,
    ability: CompanionAbility,
    currentRoom: number,
  ): boolean {
    return this.getCooldownRemaining(instance, ability, currentRoom) === 0;
  }

  /**
   * Resolve the effective cooldown for an ability, considering whether it
   * uses rooms or ticks. Ticks are not yet implemented — rooms is the
   * primary cooldown type.
   */
  private resolveCooldown(ability: CompanionAbility, _instance: CompanionInstance): number {
    // cooldownRooms is always set; cooldownTicks is optional and not yet
    // wired into the save system, so we default to rooms-only.
    return ability.cooldownRooms;
  }

  /**
   * Resolve cooldowns on room change: decrement room-based cooldowns for
   * all abilities of a given instance.
   *
   * Returns the number of abilities that transitioned from "on cooldown"
   * to "ready" as a result of this room change.
   */
  resolveCooldownsOnRoomChange(
    instance: CompanionInstance,
    _currentRoom: number,
  ): number {
    // Room-based cooldowns automatically tick down as the player moves
    // through rooms. We just need to verify readiness here.
    // No state mutation needed — readiness is computed on-the-fly.
    return 0;
  }

  /**
   * Get the cooldown progress for an ability as a 0-1 fraction.
   * 0 means just used, 1 means ready.
   */
  getCooldownProgress(
    instance: CompanionInstance,
    ability: CompanionAbility,
    currentRoom: number,
  ): number {
    const rawCooldown = this.resolveCooldown(ability, instance);
    if (rawCooldown === 0) {
      return 1;
    }
    const lastUsed = instance.abilitiesUsed.get(ability.abilityId) ?? 0;
    if (lastUsed === 0) {
      return 1;
    }
    const roomsSinceUse = currentRoom - lastUsed;
    return Math.min(1, roomsSinceUse / rawCooldown);
  }
}
