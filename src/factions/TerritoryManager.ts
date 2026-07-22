/**
 * Territory Manager
 *
 * Manages territory ownership, boundaries, bonuses, and the global
 * territory map for the Faction Wars & Territory Control feature.
 */
import type { BiomeId } from '../world/biomes.js';
import type {
  FollowerRole,
  FollowerState,
  SerpentFactionState,
  SerpentMission,
  TerritoryBonusContext,
  TerritoryBonusResult,
  TerritoryControlStatus,
  TerritoryDefinition,
  TerritoryMapState,
  TerritoryOwnership,
  TerritoryType,
  WarEventType,
  WarEventState,
  WarEventPhase,
} from './territoryTypes.js';
import { TERRITORY_SAVE_VERSION } from './territoryTypes.js';

// ─── Default Territory Definitions ─────────────────────────────────────────────

export const DEFAULT_TERRITORIES: TerritoryDefinition[] = [
  {
    id: 'forest-of-whispers',
    name: 'Forest of Whispers',
    type: 'forest',
    biomeIds: ['elderwood-maze', 'gloam-garden', 'wintergreen-forest'],
    roomIds: [],
    strategicValue: 60,
    defensible: 6,
    features: ['ancient-grove', 'herb-garden'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'lavender', spawnMultiplier: 1.5, kind: 'bonus' },
        { appleType: 'yuzu', spawnMultiplier: 1.3, kind: 'bonus' },
        { appleType: 'normal', spawnMultiplier: 0.8, kind: 'penalty' },
      ],
      resourceModifiers: [
        { resourceType: 'herb', dropModifier: 1.8, rarityBoost: 1 },
        { resourceType: 'food', dropModifier: 1.4 },
      ],
      factionBonuses: { resourceBonus: 5, influenceBonus: 3 },
      specialEffects: [
        {
          id: 'herb-growth',
          name: 'Herb Growth',
          description: 'Herb-based resources spawn more frequently.',
          trigger: 'passive',
          parameters: { bonusRate: 0.8, resourceType: 'herb' },
        },
      ],
    },
  },
  {
    id: 'deep-caverns',
    name: 'Deep Caverns',
    type: 'cave',
    biomeIds: ['ember-caverns', 'fungal-grotto', 'root-buried-tunnels'],
    roomIds: [],
    strategicValue: 70,
    defensible: 8,
    features: ['mineral-veins', 'ancient-artifacts'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'mochi', spawnMultiplier: 1.4, kind: 'bonus' },
        { appleType: 'normal', spawnMultiplier: 0.7, kind: 'penalty' },
      ],
      resourceModifiers: [
        { resourceType: 'mineral', dropModifier: 2.0, rarityBoost: 1 },
        { resourceType: 'metal', dropModifier: 1.5 },
        { resourceType: 'artifact', dropModifier: 1.3, rarityBoost: 2 },
      ],
      factionBonuses: { defenseBonus: 5, resourceBonus: 3 },
      specialEffects: [
        {
          id: 'mineral-rich',
          name: 'Mineral Rich',
          description: 'Mineral and metal drops are significantly increased.',
          trigger: 'passive',
          parameters: { bonusRate: 1.0, resourceType: 'mineral' },
        },
      ],
    },
  },
  {
    id: 'golden-plains',
    name: 'Golden Plains',
    type: 'plains',
    biomeIds: ['ash-steppe', 'verdigris-basin', 'provence-valley'],
    roomIds: [],
    strategicValue: 50,
    defensible: 3,
    features: ['trade-route', 'grazing-lands'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'normal', spawnMultiplier: 1.3, kind: 'bonus' },
        { appleType: 'caffeinated', spawnMultiplier: 1.2, kind: 'bonus' },
      ],
      resourceModifiers: [
        { resourceType: 'food', dropModifier: 1.6 },
        { resourceType: 'fabric', dropModifier: 1.3 },
      ],
      factionBonuses: { influenceBonus: 5, tensionReduction: 3 },
      specialEffects: [
        {
          id: 'trade-boom',
          name: 'Trade Boom',
          description: 'Trade routes through this territory generate extra resources.',
          trigger: 'passive',
          parameters: { bonusRate: 0.5, resourceType: 'food' },
        },
      ],
    },
  },
  {
    id: 'iron-peaks',
    name: 'Iron Peaks',
    type: 'mountain',
    biomeIds: ['jade-peak-province', 'titan-ribcage', 'clockwork-quarry'],
    roomIds: [],
    strategicValue: 80,
    defensible: 9,
    features: ['watchtowers', 'rare-crystals'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'wasabi', spawnMultiplier: 2.0, kind: 'bonus' },
        { appleType: 'frost', spawnMultiplier: 1.5, kind: 'bonus' },
        { appleType: 'normal', spawnMultiplier: 0.5, kind: 'penalty' },
      ],
      resourceModifiers: [
        { resourceType: 'metal', dropModifier: 2.0, rarityBoost: 1 },
        { resourceType: 'mineral', dropModifier: 1.5 },
        { resourceType: 'artifact', dropModifier: 1.5, rarityBoost: 1 },
      ],
      factionBonuses: { defenseBonus: 8, resourceBonus: 5 },
      specialEffects: [
        {
          id: 'rare-spawns',
          name: 'Rare Apple Spawns',
          description: 'Rare and exotic apples spawn at double the normal rate.',
          trigger: 'passive',
          parameters: { bonusRate: 1.0, rarityThreshold: 'rare' },
        },
      ],
    },
  },
  {
    id: 'sunken-ruins',
    name: 'Sunken Ruins',
    type: 'ruins',
    biomeIds: ['moonlit-parish', 'sable-depths', 'ember-waste'],
    roomIds: [],
    strategicValue: 75,
    defensible: 7,
    features: ['ancient-treasures', 'mystical-wards'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'gold', spawnMultiplier: 2.5, kind: 'bonus' },
        { appleType: 'shielded', spawnMultiplier: 1.5, kind: 'bonus' },
      ],
      resourceModifiers: [
        { resourceType: 'artifact', dropModifier: 2.5, rarityBoost: 2 },
        { resourceType: 'mineral', dropModifier: 1.2 },
      ],
      factionBonuses: { influenceBonus: 8, defenseBonus: 3 },
      specialEffects: [
        {
          id: 'treasure-hunt',
          name: 'Treasure Hunt',
          description: 'Ancient artifacts have a chance to spawn in battles here.',
          trigger: 'battle',
          parameters: { artifactChance: 0.3, rarityBoost: 2 },
        },
      ],
    },
  },
  {
    id: 'misty-swamp',
    name: 'Misty Swamp',
    type: 'swamp',
    biomeIds: ['radioactive-orchard', 'gloam-garden'],
    roomIds: [],
    strategicValue: 45,
    defensible: 5,
    features: ['hidden-paths', 'toxic-fumes'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'coldBeer', spawnMultiplier: 1.5, kind: 'bonus' },
        { appleType: 'caffeinated', spawnMultiplier: 1.2, kind: 'bonus' },
      ],
      resourceModifiers: [
        { resourceType: 'herb', dropModifier: 1.4 },
        { resourceType: 'food', dropModifier: 1.2 },
      ],
      factionBonuses: { tensionReduction: 5, influenceBonus: 2 },
      specialEffects: [
        {
          id: 'hidden-paths',
          name: 'Hidden Paths',
          description: 'Factions can use hidden paths for surprise attacks.',
          trigger: 'battle',
          parameters: { sneakAttackChance: 0.25 },
        },
      ],
    },
  },
  {
    id: 'azure-coast',
    name: 'Azure Coast',
    type: 'coast',
    biomeIds: ['mosaic-coast', 'warm-coast', 'sunken-ocean'],
    roomIds: [],
    strategicValue: 55,
    defensible: 4,
    features: ['fishing-grounds', 'shell-markets'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'koi', spawnMultiplier: 2.0, kind: 'bonus' },
        { appleType: 'amacha', spawnMultiplier: 1.3, kind: 'bonus' },
      ],
      resourceModifiers: [
        { resourceType: 'food', dropModifier: 1.8 },
        { resourceType: 'fabric', dropModifier: 1.4 },
      ],
      factionBonuses: { resourceBonus: 4, influenceBonus: 3 },
      specialEffects: [
        {
          id: 'tide-turning',
          name: 'Tide Turning',
          description: 'Battles here have a chance of environmental effects.',
          trigger: 'battle',
          parameters: { environmentalChance: 0.2 },
        },
      ],
    },
  },
  {
    id: 'frost-tundra',
    name: 'Frost Tundra',
    type: 'tundra',
    biomeIds: ['frozen-sea', 'wintergreen-forest'],
    roomIds: [],
    strategicValue: 65,
    defensible: 7,
    features: ['ice-caves', 'aurora-shrines'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'frost', spawnMultiplier: 2.0, kind: 'bonus' },
        { appleType: 'wasabi', spawnMultiplier: 1.3, kind: 'bonus' },
      ],
      resourceModifiers: [
        { resourceType: 'mineral', dropModifier: 1.5 },
        { resourceType: 'metal', dropModifier: 1.3 },
      ],
      factionBonuses: { defenseBonus: 6, tensionReduction: 2 },
      specialEffects: [
        {
          id: 'aurora-blessing',
          name: 'Aurora Blessing',
          description: 'Faction members gain temporary buffs during battles.',
          trigger: 'battle',
          parameters: { buffChance: 0.3, buffDuration: 5 },
        },
      ],
    },
  },
  {
    id: 'scorching-desert',
    name: 'Scorching Desert',
    type: 'desert',
    biomeIds: ['glass-desert', 'amber-dunes', 'liberty-badlands'],
    roomIds: [],
    strategicValue: 60,
    defensible: 5,
    features: ['oasis', 'sand-vaults'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'yuzu', spawnMultiplier: 1.8, kind: 'bonus' },
        { appleType: 'mochi', spawnMultiplier: 1.3, kind: 'bonus' },
      ],
      resourceModifiers: [
        { resourceType: 'mineral', dropModifier: 1.6, rarityBoost: 1 },
        { resourceType: 'artifact', dropModifier: 1.3 },
      ],
      factionBonuses: { influenceBonus: 4, resourceBonus: 2 },
      specialEffects: [
        {
          id: 'sandstorm',
          name: 'Sandstorm',
          description: 'Random sandstorms can disrupt battles and resource gathering.',
          trigger: 'event',
          parameters: { disruptionChance: 0.15, duration: 3 },
        },
      ],
    },
  },
  {
    id: 'garden-of-eden',
    name: 'Garden of Eden',
    type: 'garden',
    biomeIds: ['verdigris-basin', 'home-hearth'],
    roomIds: [],
    strategicValue: 90,
    defensible: 6,
    features: ['first-tree', 'healing-spring'],
    bonuses: {
      appleSpawnModifiers: [
        { appleType: 'gold', spawnMultiplier: 1.5, kind: 'bonus' },
        { appleType: 'love', spawnMultiplier: 1.5, kind: 'bonus' },
        { appleType: 'shielded', spawnMultiplier: 1.3, kind: 'bonus' },
      ],
      resourceModifiers: [
        { resourceType: 'herb', dropModifier: 2.0, rarityBoost: 1 },
        { resourceType: 'food', dropModifier: 1.5 },
        { resourceType: 'artifact', dropModifier: 1.2 },
      ],
      factionBonuses: { resourceBonus: 8, tensionReduction: 5, influenceBonus: 5 },
      specialEffects: [
        {
          id: 'healing-spring',
          name: 'Healing Spring',
          description: 'Faction members recover faster from injuries.',
          trigger: 'passive',
          parameters: { recoveryBonus: 0.5 },
        },
      ],
    },
  },
];

// ─── Territory Manager Class ───────────────────────────────────────────────────

export class TerritoryManager {
  private territories = new Map<string, TerritoryDefinition>();
  private ownership = new Map<string, TerritoryOwnership>();
  private warEvents: WarEventState[] = [];
  private tickCounter = 0;
  private serpentFaction: SerpentFactionState;

  constructor(
    private readonly maxWarEvents = 50,
    private readonly tickInterval = 10, // Rooms between territory updates
  ) {
    // Register default territories
    for (const def of DEFAULT_TERRITORIES) {
      this.territories.set(def.id, def);
      this.ownership.set(def.id, this.createDefaultOwnership(def.id));
    }

    // Initialize player's faction
    this.serpentFaction = this.createDefaultSerpentFaction();
  }

  // ─── Territory Definitions ─────────────────────────────────────────────────

  getTerritory(id: string): TerritoryDefinition | undefined {
    return this.territories.get(id);
  }

  getAllTerritories(): TerritoryDefinition[] {
    return [...this.territories.values()];
  }

  getTerritoriesByType(type: TerritoryType): TerritoryDefinition[] {
    return [...this.territories.values()].filter((t) => t.type === type);
  }

  getTerritoriesByBiome(biomeId: BiomeId): TerritoryDefinition[] {
    return [...this.territories.values()].filter((t) => t.biomeIds.includes(biomeId));
  }

  addTerritory(definition: TerritoryDefinition): void {
    this.territories.set(definition.id, definition);
    this.ownership.set(definition.id, this.createDefaultOwnership(definition.id));
  }

  // ─── Ownership Queries ─────────────────────────────────────────────────────

  getOwnership(territoryId: string): TerritoryOwnership | undefined {
    return this.ownership.get(territoryId);
  }

  getControllingFaction(territoryId: string): string | null {
    const ownership = this.ownership.get(territoryId);
    if (!ownership) return null;
    return ownership.controllingFactionId;
  }

  getTerritoriesByFaction(factionId: string): TerritoryOwnership[] {
    return [...this.ownership.values()].filter(
      (o) => o.controllingFactionId === factionId && o.status !== 'unclaimed',
    );
  }

  getAllContestedTerritories(): TerritoryOwnership[] {
    return [...this.ownership.values()].filter((o) => o.status === 'contested');
  }

  getTerritoryBonusContext(
    territoryId: string,
    playerPresent = false,
    playerRelation = 0,
  ): TerritoryBonusContext | undefined {
    const ownership = this.ownership.get(territoryId);
    const definition = this.territories.get(territoryId);
    if (!ownership || !definition) return undefined;

    return {
      territoryId,
      controllingFactionId: ownership.controllingFactionId,
      bonuses: definition.bonuses,
      playerPresent,
      playerRelation,
    };
  }

  resolveBonuses(context: TerritoryBonusContext): TerritoryBonusResult {
    const { controllingFactionId, bonuses, playerPresent, playerRelation } = context;

    // Player is eligible for bonuses if they are allied/friendly or present in the territory
    const playerEligible = playerPresent || (playerRelation > 0 && controllingFactionId !== null);

    return {
      appleSpawnModifiers: bonuses.appleSpawnModifiers,
      resourceModifiers: bonuses.resourceModifiers,
      specialEffects: bonuses.specialEffects ?? [],
      playerEligible,
    };
  }

  // ─── Territory Control Changes ─────────────────────────────────────────────

  /**
   * Shift control of a territory toward the attacker.
   * Returns the new ownership state.
   */
  shiftControl(
    territoryId: string,
    attackerFactionId: string,
    defenderFactionId: string,
    delta: number,
    outcome: TerritoryOwnership['battleHistory'][0]['outcome'] = 'attack',
    snakeInvolved = false,
    snakeRole?: TerritoryOwnership['battleHistory'][0]['snakeRole'],
  ): TerritoryOwnership | undefined {
    const ownership = this.ownership.get(territoryId);
    if (!ownership) return undefined;

    const now = Date.now();
    const battleId = `battle:${territoryId}:${now}:${Math.random().toString(36).slice(2, 8)}`;

    // Apply delta
    ownership.controlPercentage = Math.max(0, Math.min(100, ownership.controlPercentage + delta));

    // Determine new controller
    let newController: string | null = ownership.controllingFactionId;
    let newContested: string | null = null;
    let newStatus: TerritoryControlStatus = ownership.status;

    if (ownership.controlPercentage >= 75) {
      newController = attackerFactionId;
      newContested = null;
      newStatus = 'stable';
    } else if (ownership.controlPercentage <= 25) {
      newController = defenderFactionId;
      newContested = attackerFactionId;
      newStatus = 'contested';
    } else if (ownership.controlPercentage > 40 && ownership.controlPercentage < 60) {
      newController = null;
      newContested = attackerFactionId;
      newStatus = 'contested';
    }

    // Update ownership
    ownership.controllingFactionId = newController;
    ownership.contestedByFactionId = newContested;
    ownership.status = newStatus;
    ownership.lastControlChange = now;

    // Record battle
    ownership.battleHistory.push({
      battleId,
      attackerFactionId,
      defenderFactionId,
      winnerFactionId: newController,
      controlDelta: delta,
      createdAt: now,
      duration: Math.abs(delta),
      outcome,
      snakeInvolved,
      snakeRole,
    });

    // Keep battle history manageable
    if (ownership.battleHistory.length > 20) {
      ownership.battleHistory = ownership.battleHistory.slice(-20);
    }

    // Update serpent faction territory list
    if (newController === 'serpents-coil') {
      if (!this.serpentFaction.controlledTerritoryIds.includes(territoryId)) {
        this.serpentFaction.controlledTerritoryIds.push(territoryId);
      }
    } else {
      this.serpentFaction.controlledTerritoryIds =
        this.serpentFaction.controlledTerritoryIds.filter((id) => id !== territoryId);
    }

    return ownership;
  }

  /**
   * Automatically shift control based on faction resources and tension.
   * Called periodically during world tick.
   */
  tickWorld(currentRoomNumber: number): void {
    this.tickCounter++;

    // Only process every N rooms
    if (this.tickCounter % this.tickInterval !== 0) return;

    const now = Date.now();

    // Process each territory
    for (const [territoryId, ownership] of this.ownership) {
      if (ownership.status === 'unclaimed') continue;

      // Natural decay: territories slowly drift toward stable control
      if (ownership.status === 'contested') {
        // If contested for too long, resolve randomly based on faction power
        const timeContested = now - ownership.lastControlChange;
        if (timeContested > 60 * this.tickInterval * 1000) {
          this.resolveContestedTerritory(territoryId);
        }
      }

      // Clean up old battle records
      ownership.battleHistory = ownership.battleHistory.filter(
        (b) => now - b.createdAt < 120 * this.tickInterval * 1000,
      );
    }

    // Clean up resolved war events
    this.warEvents = this.warEvents
      .filter((e) => e.phase !== 'resolved' || (e.expiresAt ?? 0) > now)
      .slice(-this.maxWarEvents);

    // Update serpent faction
    this.updateSerpentFaction(currentRoomNumber);
  }

  private resolveContestedTerritory(territoryId: string): void {
    const ownership = this.ownership.get(territoryId);
    if (!ownership || !ownership.contestedByFactionId || !ownership.controllingFactionId) return;

    // Random resolution based on strategic value and some randomness
    const territory = this.territories.get(territoryId);
    if (!territory) return;

    const attacker = ownership.contestedByFactionId;
    const defender = ownership.controllingFactionId;
    const delta = Math.random() > 0.5 ? territory.defensible * 3 : -territory.defensible * 3;

    this.shiftControl(territoryId, attacker, defender, delta, 'attack', false);
  }

  private updateSerpentFaction(currentRoomNumber: number): void {
    if (!this.serpentFaction.established) return;

    // Passive influence gain from controlled territories
    let influenceGain = 0;
    for (const terrId of this.serpentFaction.controlledTerritoryIds) {
      const def = this.territories.get(terrId);
      if (def) {
        influenceGain += Math.round(def.strategicValue / 10);
      }
    }

    this.serpentFaction.influence = Math.min(1000, this.serpentFaction.influence + influenceGain);

    // Check if faction can expand
    this.serpentFaction.canExpand = this.serpentFaction.influence >= 100;

    // Process active missions
    for (const mission of this.serpentFaction.activeMissions) {
      if (mission.status !== 'active') continue;

      // Check deadline
      if (mission.deadline && currentRoomNumber > mission.deadline) {
        mission.status = 'failed';
        continue;
      }

      // Check objectives
      const allComplete = mission.objectives.every((obj) => obj.progress >= obj.required);
      if (allComplete) {
        mission.status = 'completed';
        this.awardMissionRewards(mission);
      }
    }

    // Clean up completed/failed missions
    this.serpentFaction.activeMissions = this.serpentFaction.activeMissions.filter(
      (m) => m.status === 'active',
    );
  }

  private awardMissionRewards(mission: SerpentMission): void {
    const { rewards } = mission;
    this.serpentFaction.influence += rewards.influence;

    for (const follower of this.serpentFaction.followers) {
      if (rewards.xp) {
        follower.xp += rewards.xp;
        // Level up check
        if (follower.xp >= follower.level * 100) {
          follower.level += 1;
          follower.xp = 0;
          follower.combatPower = Math.min(100, follower.combatPower + 5);
          follower.loyalty = Math.min(100, follower.loyalty + 2);
        }
      }
      if (rewards.loyaltyBonus) {
        follower.loyalty = Math.min(100, follower.loyalty + rewards.loyaltyBonus);
      }
      follower.status = 'idle';
      follower.assignedMission = undefined;
    }
  }

  // ─── War Events ────────────────────────────────────────────────────────────

  createWarEvent(input: {
    type: WarEventType;
    factionIds: string[];
    territoryIds: string[];
    severity?: number;
    phase?: WarEventPhase;
    createdAt: number;
    expiresAt?: number;
    summary?: string;
    tags?: string[];
    flags?: Record<string, unknown>;
  }): WarEventState {
    const factionIds = [...new Set(input.factionIds)];
    const severity = Math.max(1, Math.min(100, Math.round(input.severity ?? 20)));
    const event: WarEventState = {
      id: `war:${input.type}:${input.territoryIds[0] ?? 'world'}:${input.createdAt}:${Math.random().toString(36).slice(2, 8)}`,
      type: input.type,
      factionIds,
      territoryIds: [...new Set(input.territoryIds)],
      severity,
      phase: input.phase ?? this.phaseForEventType(input.type),
      createdAt: input.createdAt,
      expiresAt: input.expiresAt ?? input.createdAt + this.expiryForEventType(input.type),
      summary:
        input.summary ?? this.defaultWarEventSummary(input.type, factionIds, input.territoryIds),
      tags: [...new Set([...(input.tags ?? []), 'faction-war', input.type])],
      flags: input.flags ?? {},
    };

    this.warEvents = [...this.warEvents.filter((e) => e.id !== event.id), event].slice(
      -this.maxWarEvents,
    );

    // If war declared, update territory statuses
    if (input.type === 'war-declared') {
      for (const terrId of input.territoryIds) {
        const ownership = this.ownership.get(terrId);
        if (ownership) {
          ownership.status = 'contested';
        }
      }
    }

    return event;
  }

  getWarEvents(limit = 10): WarEventState[] {
    return [...this.warEvents].slice(-Math.max(0, limit)).reverse();
  }

  getWarEventsForTerritory(territoryId: string, limit = 5): WarEventState[] {
    return this.warEvents
      .filter((e) => e.territoryIds.includes(territoryId) && e.phase !== 'resolved')
      .slice(-Math.max(0, limit))
      .reverse();
  }

  getActiveWarEvents(): WarEventState[] {
    return this.warEvents.filter((e) => e.phase !== 'resolved');
  }

  private phaseForEventType(type: WarEventType): WarEventPhase {
    if (
      type === 'territory-attack' ||
      type === 'territory-defense' ||
      type === 'mercenary-contract'
    ) {
      return 'active';
    }
    if (type === 'alliance-formed') return 'brewing';
    return 'aftermath';
  }

  private expiryForEventType(type: WarEventType): number {
    switch (type) {
      case 'war-declared':
      case 'alliance-formed':
        return 60;
      case 'territory-attack':
      case 'territory-defense':
        return 20;
      case 'ceasefire':
      case 'peace-treaty':
        return 40;
      case 'betrayal':
      case 'alliance-broken':
        return 30;
      default:
        return 25;
    }
  }

  private defaultWarEventSummary(
    type: WarEventType,
    factionIds: string[],
    territoryIds: string[],
  ): string {
    const factions = factionIds.join(' and ');
    const territories = territoryIds.map((id) => this.territories.get(id)?.name ?? id).join(', ');

    switch (type) {
      case 'territory-attack':
        return `${factions} clash over ${territories}.`;
      case 'territory-defense':
        return `${factions} defend ${territories} from invaders.`;
      case 'alliance-formed':
        return `${factions} have formed an alliance.`;
      case 'alliance-broken':
        return `${factions} have broken their alliance.`;
      case 'war-declared':
        return `${factions} have declared war over ${territories}.`;
      case 'peace-treaty':
        return `${factions} have signed a peace treaty over ${territories}.`;
      case 'ceasefire':
        return `${factions} have agreed to a ceasefire in ${territories}.`;
      case 'betrayal':
        return `${factions} have been betrayed in ${territories}.`;
      case 'mercenary-contract':
        return `A mercenary contract has been issued for ${territories}.`;
      case 'sabotage':
        return `${factions} have sabotaged ${territories}.`;
      case 'diplomatic-summit':
        return `${factions} meet at a diplomatic summit regarding ${territories}.`;
      case 'resource-crisis':
        return `A resource crisis has erupted in ${territories}.`;
      case 'power-vacuum':
        return `A power vacuum has opened in ${territories}.`;
      default:
        return `${factions} are active in ${territories}.`;
    }
  }

  // ─── Serpent Faction ───────────────────────────────────────────────────────

  getSerpentFaction(): SerpentFactionState {
    return this.serpentFaction;
  }

  establishSerpentFaction(headquartersRoomId?: string): void {
    if (this.serpentFaction.established) return;

    this.serpentFaction.established = true;
    this.serpentFaction.headquartersRoomId = headquartersRoomId;
    this.serpentFaction.influence = 10; // Starting influence
  }

  addFollower(input: {
    sourceId: string;
    role: FollowerRole;
    specialAbility?: string;
  }): FollowerState {
    if (!this.serpentFaction.established) {
      throw new Error('Serpent faction must be established before recruiting followers.');
    }

    const follower: FollowerState = {
      id: `follower:${input.sourceId}:${Date.now()}`,
      sourceId: input.sourceId,
      role: input.role,
      status: 'idle',
      loyalty: 50,
      combatPower: input.role === 'warrior' || input.role === 'guard' ? 40 : 20,
      specialAbility: input.specialAbility,
      debuffs: [],
      level: 1,
      xp: 0,
    };

    this.serpentFaction.followers.push(follower);
    return follower;
  }

  assignMission(mission: SerpentMission): void {
    if (!this.serpentFaction.established) {
      throw new Error('Serpent faction must be established before assigning missions.');
    }

    // Set follower statuses
    for (const followerId of mission.assignedFollowerIds) {
      const follower = this.serpentFaction.followers.find((f) => f.id === followerId);
      if (follower) {
        follower.status = 'on-mission';
        follower.assignedMission = mission.id;
      }
    }

    this.serpentFaction.activeMissions.push(mission);
  }

  // ─── Territory Assignment ──────────────────────────────────────────────────

  /**
   * Assign rooms to a territory. Called during world generation.
   */
  assignRoomsToTerritory(territoryId: string, roomIds: string[]): void {
    const territory = this.territories.get(territoryId);
    if (!territory) return;

    territory.roomIds = [...new Set([...territory.roomIds, ...roomIds])];
  }

  getTerritoriesForRoom(roomId: string): TerritoryDefinition[] {
    return [...this.territories.values()].filter((t) => t.roomIds.includes(roomId));
  }

  // ─── Save / Load ───────────────────────────────────────────────────────────

  save(): TerritoryMapState {
    return {
      version: TERRITORY_SAVE_VERSION,
      territories: [...this.ownership.values()],
      activeWar: this.warEvents.find((e) => e.phase !== 'resolved'),
      factionInfluence: this.computeFactionInfluence(),
    };
  }

  load(data: TerritoryMapState): void {
    // Restore territories
    for (const def of DEFAULT_TERRITORIES) {
      this.territories.set(def.id, def);
    }

    // Restore ownership
    this.ownership.clear();
    for (const ownership of data.territories) {
      this.ownership.set(ownership.territoryId, ownership);
    }

    // Restore serpent faction territory list
    this.serpentFaction.controlledTerritoryIds = data.territories
      .filter((o) => o.controllingFactionId === 'serpents-coil')
      .map((o) => o.territoryId);

    // Restore active war event
    if (data.activeWar) {
      this.warEvents = [data.activeWar];
    } else {
      this.warEvents = [];
    }
  }

  private computeFactionInfluence(): Record<string, number> {
    const influence: Record<string, number> = {};

    for (const ownership of this.ownership.values()) {
      if (ownership.controllingFactionId) {
        const territory = this.territories.get(ownership.territoryId);
        const base = territory ? territory.strategicValue : 50;
        const contribution = Math.round(base * (ownership.controlPercentage / 100));
        influence[ownership.controllingFactionId] =
          (influence[ownership.controllingFactionId] ?? 0) + contribution;
      }
    }

    return influence;
  }

  private createDefaultOwnership(territoryId: string): TerritoryOwnership {
    return {
      territoryId,
      controllingFactionId: null,
      contestedByFactionId: null,
      controlPercentage: 0,
      status: 'unclaimed',
      lastControlChange: Date.now(),
      battleHistory: [],
      flags: {},
    };
  }

  private createDefaultSerpentFaction(): SerpentFactionState {
    return {
      id: 'serpents-coil',
      name: "The Serpent's Coil",
      established: false,
      followers: [],
      controlledTerritoryIds: [],
      influence: 0,
      relations: {},
      activeMissions: [],
      missionQueue: [],
      canExpand: false,
    };
  }
}
