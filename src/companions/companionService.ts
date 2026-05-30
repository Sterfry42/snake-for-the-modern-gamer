// Companion service — runtime management of companion instances.
// Handles spawning, taming, feeding, ability usage, and state persistence.

import type {
  CompanionDefinition,
  CompanionInstance,
  CompanionRenderData,
  CompanionSaveData,
  CompendiumSaveData,
  TameResult,
  FeedResult,
  AbilityResult,
} from './companionTypes.js';
import {
  COMPANION_DEFINITIONS,
  getCompanionDefinition,
  getCompanionsByKind,
} from './companionRegistry.js';
import { CompendiumSystem } from './compendiumSystem.js';
import {
  evaluatePassiveTraits,
  applyBondIncrease,
  checkNeglectDecay,
  NEGLECT_DECAY_ROOMS,
  MAX_DAILY_FEEDS,
} from './bondSystem.js';

/** Trait evaluation result from the bond system. */
interface TraitEvaluation {
  traitId: string;
  totalValue: number;
  sources: Array<{ companionId: string; value: number }>;
}

/** Companion limit configuration by kind. */
interface CompanionLimits {
  maxTotal: number;
  maxFollowers: number;
  maxProtectors: number;
  maxScouts: number;
  maxForagers: number;
  maxFighters: number;
  maxMounts: number;
}

/** Default companion spawn limits. */
const DEFAULT_LIMITS: CompanionLimits = {
  maxTotal: 4,
  maxFollowers: 3,
  maxProtectors: 2,
  maxScouts: 2,
  maxForagers: 2,
  maxFighters: 2,
  maxMounts: 1,
};

// Rarity-based success chances for taming.
const TAME_SUCCESS_CHANCE: Record<string, number> = {
  common: 1.0,
  uncommon: 0.85,
  rare: 0.7,
  epic: 0.5,
  legendary: 0.3,
};

/** Maximum number of wild creatures allowed per biome at any time. */
const WILD_SPAWN_CAP_PER_BIOME = 2;

/** Number of rooms without interaction before a wild creature despawns. */
const WILD_DESPAWN_ROOMS = 10;

export class CompanionService {
  private readonly snakeGame: any;
  private readonly companions = new Map<string, CompanionInstance>();
  private readonly juiceManager: any;
  private readonly inventoryService: any;
  private readonly questService: any;
  private readonly compendium: CompendiumSystem;
  private readonly flags: Record<string, unknown>;
  private nextInstanceId = 1;

  constructor(
    snakeGame: any,
    juiceManager: any,
    inventoryService: any,
    questService: any,
    flags?: Record<string, unknown>,
  ) {
    this.snakeGame = snakeGame;
    this.juiceManager = juiceManager;
    this.inventoryService = inventoryService;
    this.questService = questService;
    this.flags = flags ?? snakeGame?.flags ?? {};
    this.compendium = new CompendiumSystem();
  }

  /**
   * Get equipment-based bond gain multiplier from equipped items.
   */
  private getBondGainMultiplier(): number {
    const equipped = this.inventoryService?.getAllEquipped?.() ?? [];
    let multiplier = 1.0;
    for (const [slot, itemId] of equipped) {
      const item = this.inventoryService.getItemDefinition?.(itemId);
      if (item?.modifiers?.bondGainMultiplier) {
        multiplier *= item.modifiers.bondGainMultiplier;
      }
    }
    return multiplier;
  }

  /**
   * Get equipment-based cooldown reduction multiplier from equipped items.
   */
  private getCooldownReduction(): number {
    const equipped = this.inventoryService?.getAllEquipped?.() ?? [];
    let reduction = 1.0;
    for (const [slot, itemId] of equipped) {
      const item = this.inventoryService.getItemDefinition?.(itemId);
      if (item?.modifiers?.abilityCooldownReduction) {
        reduction *= item.modifiers.abilityCooldownReduction;
      }
    }
    return reduction;
  }

  /**
   * Get the max companion count from equipment, or the default.
   */
  private getMaxCompanionCount(): number {
    const equipped = this.inventoryService?.getAllEquipped?.() ?? [];
    let maxCount = DEFAULT_LIMITS.maxTotal;
    for (const [slot, itemId] of equipped) {
      const item = this.inventoryService.getItemDefinition?.(itemId);
      if (item?.modifiers?.maxCompanions) {
        maxCount = Math.max(maxCount, item.modifiers.maxCompanions);
      }
    }
    return maxCount;
  }

  /**
   * Get the follower limit, respecting equipment overrides.
   */
  private getFollowerLimit(): number {
    return this.flags['companions.settings.followerLimit'] as number ?? DEFAULT_LIMITS.maxFollowers;
  }

  // ---- Core Methods ----

  /**
   * Spawn a wild creature at a position.
   * Only one wild instance per definition is allowed at a time.
   */
  spawnCompanion(companionId: string, roomId: string, x: number, y: number): void {
    const def = getCompanionDefinition(companionId);
    if (!def) return;

    // Check for existing wild instance of this definition
    for (const [id, instance] of this.companions) {
      if (instance.definitionId === companionId && !instance.isTamed) {
        return; // Already a wild instance of this creature
      }
    }

    const currentRoomNumber = this.snakeGame.getCurrentRoomNumber?.() ?? 1;

    const instance: CompanionInstance = {
      id: `wild-${this.nextInstanceId++}`,
      definitionId: companionId,
      bondLevel: 1,
      bondProgress: 0,
      currentRoomId: roomId,
      gridX: x,
      gridY: y,
      lastFedRoom: currentRoomNumber,
      feedCountThisDay: 0,
      lastInteractionRoom: currentRoomNumber,
      abilitiesUsed: new Map(),
      totalApplesEatenTogether: 0,
      totalDangersSurvived: 0,
      mood: 'neutral',
      flags: {},
      isTamed: false,
    };

    this.companions.set(instance.id, instance);

    // Discover in compendium
    this.compendium.discoverCompanion(companionId, currentRoomNumber);
    this.compendium.recordEncounter(companionId);

    // Play appearance sound
    if (this.juiceManager?.creatureAppear) {
      this.juiceManager.creatureAppear(x * 24, y * 24, companionId);
    }
  }

  /**
   * Attempt to tame a wild creature.
   * Validates food, bond level, and special conditions before rolling.
   */
  attemptTame(companionId: string, playerId: string): TameResult {
    // Find wild instance
    const wildInstance = Array.from(this.companions.values()).find(
      (inst) => inst.definitionId === companionId && !inst.isTamed,
    );

    if (!wildInstance) {
      return {
        success: false,
        companionId,
        message: 'No wild creature to tame here.',
        failedReason: 'tamingFailed',
      };
    }

    const def = getCompanionDefinition(companionId);
    if (!def) {
      return {
        success: false,
        companionId,
        message: 'Unknown creature.',
        failedReason: 'tamingFailed',
      };
    }

    const tameCost = def.tameCost;

    // Validate food items
    for (const food of tameCost.foodItems) {
      const count = this.inventoryService.getItemCount?.(food.itemId) ?? 0;
      if (count < food.count) {
        return {
          success: false,
          companionId: wildInstance.id,
          message: `Need ${food.count} ${food.itemId}.`,
          failedReason: 'insufficientFood',
        };
      }
    }

    // Validate bond level
    if (wildInstance.bondLevel < tameCost.minimumBondLevel) {
      return {
        success: false,
        companionId: wildInstance.id,
        message: 'Bond level too low.',
        failedReason: 'bondTooLow',
      };
    }

    // Validate special conditions
    if (tameCost.conditions) {
      if (
        tameCost.conditions.requiredQuestCompleted &&
        !this.questService?.isQuestCompleted?.(tameCost.conditions.requiredQuestCompleted)
      ) {
        return {
          success: false,
          companionId: wildInstance.id,
          message: 'Required quest not completed.',
          failedReason: 'conditionsNotMet',
        };
      }
      if (tameCost.conditions.minRoomsVisited) {
        const roomsVisited = this.snakeGame.getRoomsVisitedCount?.() ?? 0;
        if (roomsVisited < tameCost.conditions.minRoomsVisited) {
          return {
            success: false,
            companionId: wildInstance.id,
            message: 'Not enough rooms visited.',
            failedReason: 'conditionsNotMet',
          };
        }
      }
    }

    // Calculate success chance
    const rarity = def.rarity;
    let successChance = TAME_SUCCESS_CHANCE[rarity] ?? 0.5;
    const bondBonus = Math.max(0, wildInstance.bondLevel - tameCost.minimumBondLevel) * 0.05;
    successChance = Math.min(1, successChance + bondBonus);

    // Roll RNG
    const roll = this.snakeGame.rng?.() ?? Math.random();
    const currentRoomNumber = this.snakeGame.getCurrentRoomNumber?.() ?? 1;

    if (roll < successChance) {
      // Success: consume food and tame
      for (const food of tameCost.foodItems) {
        this.inventoryService.removeItem?.(food.itemId, food.count);
      }

      wildInstance.isTamed = true;
      wildInstance.mood = 'happy';
      this.compendium.markTamed(companionId);

      if (this.juiceManager?.creatureTameSuccess) {
        this.juiceManager.creatureTameSuccess(
          wildInstance.gridX * 24,
          wildInstance.gridY * 24,
        );
      }

      return {
        success: true,
        companionId: wildInstance.id,
        message: 'Taming successful!',
      };
    } else {
      // Failure: set encounter cooldown and creature flees
      const nextEncounterRoom = currentRoomNumber + 5;
      this.snakeGame.setFlag?.(
        `companions.encounterCooldown.${companionId}`,
        nextEncounterRoom,
      );
      this.companions.delete(wildInstance.id);

      if (this.juiceManager?.creatureTameFail) {
        this.juiceManager.creatureTameFail(
          wildInstance.gridX * 24,
          wildInstance.gridY * 24,
        );
      }

      return {
        success: false,
        companionId: wildInstance.id,
        message: 'The creature escapes...',
        failedReason: 'tamingFailed',
        nextEncounterRoom,
      };
    }
  }

  /**
   * Feed a companion to increase bond progress.
   * Enforces daily feed limit and preferred food types.
   */
  feedCompanion(companionId: string, itemId: string): FeedResult {
    const instance = this.companions.get(companionId);
    if (!instance || !instance.isTamed) {
      return {
        success: false,
        bondGain: 0,
        feedsRemainingToday: 0,
        message: 'Companion not found or not tamed.',
        failedReason: 'companionNotFound',
      };
    }

    // Check daily feed limit
    const def = getCompanionDefinition(instance.definitionId);
    const roomsVisited = this.snakeGame.getRoomsVisitedCount?.() ?? 1;
    if (instance.feedCountThisDay >= MAX_DAILY_FEEDS) {
      // Check if it's a new day (different lastFedRoom)
      const lastFedRoom = instance.lastFedRoom ?? 0;
      if (roomsVisited - lastFedRoom >= 10) {
        // Reset daily feeds
        instance.feedCountThisDay = 0;
      } else {
        return {
          success: false,
          bondGain: 0,
          feedsRemainingToday: 0,
          message: 'Daily feeding limit reached.',
          failedReason: 'dailyLimitReached',
        };
      }
    }

    // Check if item exists in inventory
    if (this.inventoryService.getItemCount?.(itemId) <= 0) {
      return {
        success: false,
        bondGain: 0,
        feedsRemainingToday: instance.feedCountThisDay,
        message: 'No food available.',
        failedReason: 'noFood',
      };
    }

    // Check preferred food
    const tameCost = def?.tameCost;
    const preferredItems = tameCost?.foodItems?.map((f) => f.itemId) ?? [];
    const isPreferred = preferredItems.includes(itemId);

    // Consume the food
    this.inventoryService.removeItem?.(itemId, 1);
    instance.lastInteractionRoom = roomsVisited;
    instance.feedCountThisDay += 1;
    instance.lastFedRoom = roomsVisited;

    // Calculate bond gain (preferential food gives more)
    const baseGain = 20;
    const bondGain = isPreferred ? baseGain * 1.5 : baseGain;

    // Apply bond increase with equipment modifiers
    const equipmentMultiplier = this.getBondGainMultiplier();
    const result = applyBondIncrease(
      instance,
      Math.round(bondGain),
      roomsVisited,
      this.flags,
      equipmentMultiplier,
    );

    // Mark bond reached in compendium
    if (result.levelUp) {
      this.compendium.markBondReached(instance.definitionId, result.newLevel);
    }

    if (this.juiceManager?.creatureFeed) {
      this.juiceManager.creatureFeed(
        instance.gridX * 24,
        instance.gridY * 24,
      );
    }

    const feedsRemaining = MAX_DAILY_FEEDS - instance.feedCountThisDay;
    const mood = isPreferred ? 'happy' : 'neutral';
    instance.mood = mood as CompanionInstance['mood'];

    return {
      success: true,
      bondGain,
      feedsRemainingToday: feedsRemaining,
      message: isPreferred
        ? 'Yum! The companion loves it!'
        : 'The companion eats the food.',
    };
  }

  /**
   * Increase bond progress for a companion.
   * Called by feeding, interactions, and shared experiences.
   */
  increaseBond(companionId: string, amount: number): void {
    const instance = this.companions.get(companionId);
    if (!instance || !instance.isTamed) return;

    const roomsVisited = this.snakeGame.getRoomsVisitedCount?.() ?? 1;
    const equipmentMultiplier = this.getBondGainMultiplier();
    const result = applyBondIncrease(
      instance,
      amount,
      roomsVisited,
      this.flags,
      equipmentMultiplier,
    );

    // Mark bond reached in compendium
    if (result.levelUp) {
      this.compendium.markBondReached(instance.definitionId, result.newLevel);

      if (this.juiceManager?.creatureBondIncrease) {
        this.juiceManager.creatureBondIncrease(
          instance.gridX * 24,
          instance.gridY * 24,
        );
      }
    }
  }

  /**
   * Use an active ability on a companion.
   * Checks cooldown and bond level requirements.
   */
  useAbility(companionId: string, abilityId: string): AbilityResult {
    const instance = this.companions.get(companionId);
    if (!instance || !instance.isTamed) {
      return {
        success: false,
        abilityId,
        message: 'Companion not found or not tamed.',
        failedReason: 'companionNotFound',
      };
    }

    const def = getCompanionDefinition(instance.definitionId);
    if (!def) {
      return {
        success: false,
        abilityId,
        message: 'Unknown creature.',
        failedReason: 'invalidAbility',
      };
    }

    const ability = def.abilities.find((a) => a.abilityId === abilityId);
    if (!ability) {
      return {
        success: false,
        abilityId,
        message: 'Ability not found.',
        failedReason: 'invalidAbility',
      };
    }

    // Check bond level requirement
    if (instance.bondLevel < ability.requiresBondLevel) {
      return {
        success: false,
        abilityId,
        message: `Requires bond level ${ability.requiresBondLevel}.`,
        failedReason: 'bondTooLow',
      };
    }

    // Check cooldown
    const currentRoom = this.snakeGame.getCurrentRoomNumber?.() ?? 1;
    const lastUsed = instance.abilitiesUsed.get(abilityId) ?? 0;
    const cooldownRooms = this.resolveCooldown(ability, instance);
    const roomsSinceUse = currentRoom - lastUsed;

    if (lastUsed > 0 && roomsSinceUse < cooldownRooms) {
      const cooldownReduction = this.getCooldownReduction();
      const adjustedCooldown = Math.ceil(cooldownRooms * cooldownReduction);
      return {
        success: false,
        abilityId,
        cooldownRemaining: adjustedCooldown - roomsSinceUse,
        message: 'Ability is on cooldown.',
        failedReason: 'onCooldown',
      };
    }

    // Use the ability
    instance.abilitiesUsed.set(abilityId, currentRoom);
    instance.mood = 'excited' as CompanionInstance['mood'];

    if (this.juiceManager?.creatureAbility) {
      this.juiceManager.creatureAbility(
        instance.gridX * 24,
        instance.gridY * 24,
        abilityId,
      );
    }

    return {
      success: true,
      abilityId,
      message: `${ability.name} activated!`,
    };
  }

  /**
   * Get all passive trait effects from active companions.
   * Evaluates traits with stacking caps from the bond system.
   */
  getAllPassiveEffects(): Array<{
    traitId: string;
    value: number;
    sourceId: string;
  }> {
    const evaluations = this.getTraitEvaluations();
    const effects: Array<{
      traitId: string;
      value: number;
      sourceId: string;
    }> = [];

    for (const evalEntry of evaluations) {
      // Add each source individually for per-companion tracking
      for (const source of evalEntry.sources) {
        effects.push({
          traitId: evalEntry.traitId,
          value: source.value,
          sourceId: source.companionId,
        });
      }
    }

    return effects;
  }

  /**
   * Get trait evaluations with stacking caps applied.
   */
  getTraitEvaluations(): TraitEvaluation[] {
    const instances = this.getActiveCompanions();
    const defMap = new Map<string, CompanionDefinition>();
    for (const instance of instances) {
      const def = getCompanionDefinition(instance.definitionId);
      if (def) {
        defMap.set(instance.definitionId, def);
      }
    }
    return evaluatePassiveTraits(instances, defMap);
  }

  /**
   * Check if a companion can be spawned given current limits.
   */
  canSpawnCompanion(companionId: string): boolean {
    const def = getCompanionDefinition(companionId);
    if (!def) return false;

    const active = this.getActiveCompanions();
    const limits = this.getCompanionLimits(def.kind);
    const maxTotal = this.getMaxCompanionCount();

    // Check total limit
    if (active.length >= maxTotal) {
      return false;
    }

    // Check kind-specific limit (mounts: only 1 allowed)
    const sameKind = active.filter((i) => {
      const iDef = getCompanionDefinition(i.definitionId);
      return iDef?.kind === def.kind;
    });

    if (sameKind.length >= limits[def.kind]) {
      return false;
    }

    return true;
  }

  /**
   * Get the maximum number of followers allowed.
   */
  getMaxFollowers(): number {
    return this.getCompanionLimits('follower').follower;
  }

  /**
   * Get the currently active mount companion, if any.
   */
  getMount(): CompanionInstance | null {
    const active = this.getActiveCompanions();
    for (const instance of active) {
      const def = getCompanionDefinition(instance.definitionId);
      if (def?.kind === 'mount') {
        return instance;
      }
    }
    return null;
  }

  /**
   * Get render data for all active companion sprites.
   * Called each frame to update positions.
   */
  getCompanionRenderData(): CompanionRenderData[] {
    const data: CompanionRenderData[] = [];

    for (const instance of this.companions.values()) {
      if (!instance.isTamed) continue;
      const def = getCompanionDefinition(instance.definitionId);
      if (!def) continue;

      // Get the sprite from the renderer
      const sprite = this.snakeGame.getCompanionSprite?.(instance.id);
      if (!sprite) continue;

      const index = this.getFollowerIndex(instance);

      data.push({
        companionId: instance.id,
        sprite,
        gridX: instance.gridX,
        gridY: instance.gridY,
        targetX: instance.gridX,
        targetY: instance.gridY,
        followIndex: index,
        mood: instance.mood,
        isMount: def.kind === 'mount',
      });
    }

    return data;
  }

  /**
   * Per-tick update for companion interpolation, cooldown checks, and neglect decay.
   */
  step(stepMs: number): void {
    const currentRoom = this.snakeGame.getCurrentRoomNumber?.() ?? 1;

    for (const [id, instance] of this.companions) {
      if (!instance.isTamed) continue;

      // Update grid position from sprite
      const sprite = this.snakeGame.getCompanionSprite?.(id);
      if (sprite) {
        instance.gridX = Math.round(sprite.x / 24);
        instance.gridY = Math.round(sprite.y / 24);
      }

      // Check neglect decay periodically
      this.checkNeglectForInstance(id);
    }
  }

  /**
   * Check neglect decay for a single companion instance.
   * Only checks every 10 rooms to avoid excessive computation.
   */
  private checkNeglectForInstance(instanceId: string): void {
    const instance = this.companions.get(instanceId);
    if (!instance || !instance.isTamed) return;

    const currentRoom = this.snakeGame.getCurrentRoomNumber?.() ?? 1;
    const roomsSinceInteraction = currentRoom - (instance.lastInteractionRoom ?? currentRoom);

    // Only check when approaching neglect threshold
    if (roomsSinceInteraction < NEGLECT_DECAY_ROOMS - 5) {
      return;
    }

    const result = checkNeglectDecay(instance, currentRoom, this.flags);

    if (result.shouldLeave) {
      this.companions.delete(instanceId);

      // Notify the player
      if (this.juiceManager?.creatureTameFail) {
        this.juiceManager.creatureTameFail(instance.gridX * 24, instance.gridY * 24);
      }
    }
  }

  /**
   * Called when the player enters a new room.
   * Resolves room-based cooldowns and despawns stale wild creatures.
   */
  onRoomChange(newRoomId: string): void {
    const currentRoom = this.snakeGame.getCurrentRoomNumber?.() ?? 1;

    for (const [id, instance] of this.companions) {
      if (instance.isTamed) continue;

      // Check for wild creature despawn
      const roomsSinceInteraction = currentRoom - instance.lastInteractionRoom;
      if (roomsSinceInteraction > WILD_DESPAWN_ROOMS) {
        this.companions.delete(id);
        continue;
      }
    }
  }

  // ---- Save/Load ----

  getSnapshot(): CompanionSaveData {
    const instances: Record<string, CompanionInstance> = {};
    for (const [id, instance] of this.companions) {
      // Serialize Map to plain object for JSON
      const abilitiesUsed: Record<string, number> = {};
      instance.abilitiesUsed.forEach((v, k) => {
        abilitiesUsed[k] = v;
      });

      instances[id] = {
        ...instance,
        abilitiesUsed: abilitiesUsed as unknown as Map<string, number>,
      };
    }

    return {
      version: 1,
      instances,
      compendium: this.compendium.getSnapshot(),
      settings: {
        mountAutoEnabled: false,
        followerLimit: 3,
      },
    };
  }

  loadSnapshot(data: CompanionSaveData): void {
    // Clear existing
    this.companions.clear();

    // Load instances
    for (const [id, instanceData] of Object.entries(data.instances ?? {})) {
      const abilitiesUsed: Map<string, number> = new Map();
      if (instanceData.abilitiesUsed && typeof instanceData.abilitiesUsed === 'object') {
        const raw = instanceData.abilitiesUsed as unknown as Record<string, number>;
        for (const [k, v] of Object.entries(raw)) {
          abilitiesUsed.set(k, v);
        }
      }

      this.companions.set(id, {
        ...instanceData,
        abilitiesUsed,
        mood: instanceData.mood ?? 'neutral',
        flags: instanceData.flags ?? {},
      });

      // Track max instance ID
      const wildMatch = id.match(/^wild-(\d+)$/);
      if (wildMatch) {
        const num = parseInt(wildMatch[1], 10);
        if (num >= this.nextInstanceId) {
          this.nextInstanceId = num + 1;
        }
      }
    }

    // Load compendium
    this.compendium.loadSnapshot(data.compendium ?? { discovered: [], maxBondReached: {}, totalEncounters: {}, totalBred: 0 });

    // Mark tamed companions in compendium based on loaded instances
    for (const instance of this.companions.values()) {
      if (instance.isTamed) {
        this.compendium.markTamed(instance.definitionId);
      }
    }
  }

  // ---- Helpers ----

  private getDefinition(id: string): CompanionDefinition | undefined {
    return getCompanionDefinition(id);
  }

  /**
   * Get companion limits for a given kind, respecting equipment overrides.
   */
  private getCompanionLimits(kind: CompanionDefinition['kind']): Record<string, number> {
    const equipped = this.inventoryService?.getAllEquipped?.() ?? [];
    let maxTotal = DEFAULT_LIMITS.maxTotal;

    for (const [slot, itemId] of equipped) {
      const item = this.inventoryService.getItemDefinition?.(itemId);
      if (item?.modifiers?.maxCompanions) {
        maxTotal = Math.max(maxTotal, item.modifiers.maxCompanions);
      }
    }

    return {
      follower: kind === 'follower' ? maxTotal : DEFAULT_LIMITS.maxFollowers,
      protector: kind === 'protector' ? DEFAULT_LIMITS.maxProtectors : 0,
      scout: kind === 'scout' ? DEFAULT_LIMITS.maxScouts : 0,
      forager: kind === 'forager' ? DEFAULT_LIMITS.maxForagers : 0,
      fighter: kind === 'fighter' ? DEFAULT_LIMITS.maxFighters : 0,
      mount: kind === 'mount' ? DEFAULT_LIMITS.maxMounts : 0,
    };
  }

  private resolveCooldown(ability: { cooldownRooms: number; cooldownTicks?: number }, instance: CompanionInstance): number {
    return ability.cooldownRooms;
  }

  /**
   * Determine the follower index for positioning a tamed follower behind the snake.
   */
  private getFollowerIndex(instance: CompanionInstance): number {
    if (!instance.isTamed) return -1;
    const def = getCompanionDefinition(instance.definitionId);
    if (!def || def.kind !== 'follower') return -1;

    let index = 0;
    for (const other of this.companions.values()) {
      if (other.id === instance.id) break;
      if (!other.isTamed) continue;
      const otherDef = getCompanionDefinition(other.definitionId);
      if (otherDef?.kind === 'follower') index++;
    }
    return index;
  }

  /**
   * Get a companion instance by its ID.
   */
  getInstance(id: string): CompanionInstance | undefined {
    return this.companions.get(id);
  }

  /**
   * Get all active (tamed) companion instances.
   */
  getActiveCompanions(): CompanionInstance[] {
    return Array.from(this.companions.values()).filter((i) => i.isTamed);
  }

  /**
   * Get the compendium system for UI queries.
   */
  getCompendium() {
    return this.compendium;
  }
}
