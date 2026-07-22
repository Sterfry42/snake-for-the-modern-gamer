/**
 * Human Manager
 *
 * The wise old snake was planned to have human interactions but never did.
 * The wise old snake's manager would have tracked every human in the game.
 *
 * This module manages human instances across the game world — spawning,
 * tracking relationships, handling encounters, and maintaining the
 * social fabric of the game's human population.
 */
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import type { BiomeId } from '../world/biomes.js';
import type {
  HumanInstance,
  HumanStats,
  HumanRelationship,
  HumanType,
  HumanRole,
  HumanDisposition,
} from './types.js';
import {
  HUMAN_DEFINITIONS,
  getHumanDefinitionsForBiome,
  getHumanDefinitionsForType,
} from './humanRegistry.js';
import { buildHumanStats, pickHumanName, buildHumanProfile } from './humanProfiles.js';

// === HUMAN MANAGER ===

export class HumanManager {
  private humans: Map<string, HumanInstance> = new Map();
  private relationships: Map<string, HumanRelationship> = new Map();
  private knownHumans: Set<string> = new Set();
  private encounterHistory: Map<string, { seen: number; accepted: number; rejected: number }> =
    new Map();

  constructor(private rng: RandomGenerator = Math.random) {}

  // === SPAWNING ===

  spawnHuman(
    roomId: string,
    biomeId: BiomeId,
    position: Vector2Like,
    type?: HumanType,
  ): HumanInstance {
    const definitions = type
      ? getHumanDefinitionsForType(type)
      : getHumanDefinitionsForBiome(biomeId);

    if (definitions.length === 0) {
      // Fallback to resident
      const fallback = HUMAN_DEFINITIONS.find((d) => d.type === 'resident');
      if (!fallback) throw new Error('No human definitions available');
      return this.createHumanInstance(fallback, roomId, biomeId, position);
    }

    // Weighted random selection
    const totalWeight = definitions.reduce((sum, d) => sum + d.spawnWeight, 0);
    let roll = this.rng() * totalWeight;
    let selected = definitions[0];
    for (const def of definitions) {
      roll -= def.spawnWeight;
      if (roll <= 0) {
        selected = def;
        break;
      }
    }

    return this.createHumanInstance(selected, roomId, biomeId, position);
  }

  private createHumanInstance(
    definition: (typeof HUMAN_DEFINITIONS)[number],
    roomId: string,
    _biomeId: BiomeId,
    position: Vector2Like,
  ): HumanInstance {
    const name = pickHumanName(definition.type, this.rng);
    const id = `human-${Date.now()}-${this.rng().toString(36).slice(2, 8)}`;
    const stats = buildHumanStats(name, definition.type);
    const disposition = this.calculateDisposition(definition, stats);

    const instance: HumanInstance = {
      id,
      type: definition.type,
      roomId,
      position: { ...position },
      direction: { x: 0, y: 0 },
      disposition,
      isHostile: disposition === 'hostile',
      currentHearts: definition.maxHearts ?? Math.max(3, Math.ceil((stats.con + stats.dex) / 3)),
      tradeInventory: [],
      flags: {},
      relationshipScore: 0,
      lastSeenByPlayer: 0,
      flashTicks: 0,
    };

    // Register name-to-id mapping for relationship tracking
    const nameKey = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    this.knownHumans.add(nameKey);

    // Initialize relationship
    this.relationships.set(id, {
      humanId: id,
      humanName: name,
      humanType: definition.type,
      score: 0,
      status: 'stranger',
      lastInteraction: 0,
      interactions: 0,
      giftsGiven: 0,
      questsCompleted: 0,
      betrayals: 0,
    });

    this.humans.set(id, instance);
    return instance;
  }

  private calculateDisposition(
    definition: (typeof HUMAN_DEFINITIONS)[number],
    stats: HumanStats,
  ): HumanDisposition {
    // Base disposition from definition
    let disposition: HumanDisposition = definition.disposition;

    // Modify based on stats
    if (stats.cha >= 7) {
      // High charisma makes them more approachable
      if (disposition === 'suspicious') disposition = 'neutral';
      if (disposition === 'hostile') disposition = 'suspicious';
    } else if (stats.cha <= 3) {
      // Low charisma makes them more distant
      if (disposition === 'friendly') disposition = 'neutral';
      if (disposition === 'neutral') disposition = 'suspicious';
    }

    return disposition;
  }

  // === UPDATING ===

  updateHumanPosition(humanId: string, position: Vector2Like): void {
    const human = this.humans.get(humanId);
    if (human) {
      human.position = { ...position };
    }
  }

  updateHumanDisposition(humanId: string, disposition: HumanDisposition): void {
    const human = this.humans.get(humanId);
    if (human) {
      human.disposition = disposition;
      human.isHostile = disposition === 'hostile';
    }
  }

  updateRelationshipScore(humanId: string, scoreDelta: number): void {
    const relationship = this.relationships.get(humanId);
    const human = this.humans.get(humanId);

    if (relationship && human) {
      relationship.score = Math.max(-100, Math.min(100, relationship.score + scoreDelta));
      relationship.lastInteraction = Date.now();
      relationship.interactions++;

      // Update status based on score
      relationship.status = this.calculateRelationshipStatus(relationship.score);

      // Update human's relationship score
      human.relationshipScore = relationship.score;

      // Update disposition based on relationship
      if (relationship.score >= 50) {
        this.updateHumanDisposition(humanId, 'friendly');
      } else if (relationship.score <= -50) {
        this.updateHumanDisposition(humanId, 'hostile');
      } else if (relationship.score <= -20) {
        this.updateHumanDisposition(humanId, 'suspicious');
      }
    }
  }

  private calculateRelationshipStatus(score: number): HumanRelationship['status'] {
    if (score >= 70) return 'close-friend';
    if (score >= 40) return 'friend';
    if (score >= 20) return 'acquaintance';
    if (score <= -70) return 'enemy';
    if (score <= -40) return 'rival';
    return 'stranger';
  }

  // === ENCOUNTERS ===

  recordEncounter(encounterId: string, accepted: boolean): void {
    const history = this.encounterHistory.get(encounterId) ?? { seen: 0, accepted: 0, rejected: 0 };
    history.seen++;
    if (accepted) {
      history.accepted++;
    } else {
      history.rejected++;
    }
    this.encounterHistory.set(encounterId, history);
  }

  getEncounterHistory(encounterId: string): { seen: number; accepted: number; rejected: number } {
    return this.encounterHistory.get(encounterId) ?? { seen: 0, accepted: 0, rejected: 0 };
  }

  // === RELATIONSHIPS ===

  getRelationship(humanId: string): HumanRelationship | undefined {
    return this.relationships.get(humanId);
  }

  getRelationships(): HumanRelationship[] {
    return Array.from(this.relationships.values());
  }

  getKnownHumans(): string[] {
    return Array.from(this.knownHumans);
  }

  giveGift(humanId: string, itemId: string): void {
    void itemId;
    const relationship = this.relationships.get(humanId);
    if (relationship) {
      relationship.giftsGiven++;
      this.updateRelationshipScore(humanId, 5 + Math.floor(this.rng() * 5));
    }
  }

  completeQuest(humanId: string): void {
    const relationship = this.relationships.get(humanId);
    if (relationship) {
      relationship.questsCompleted++;
      this.updateRelationshipScore(humanId, 15 + Math.floor(this.rng() * 10));
    }
  }

  betrayHuman(humanId: string): void {
    const relationship = this.relationships.get(humanId);
    if (relationship) {
      relationship.betrayals++;
      this.updateRelationshipScore(humanId, -30 - Math.floor(this.rng() * 20));
    }
  }

  // === QUERYING ===

  getHuman(humanId: string): HumanInstance | undefined {
    return this.humans.get(humanId);
  }

  getHumansInRoom(roomId: string): HumanInstance[] {
    return Array.from(this.humans.values()).filter((h) => h.roomId === roomId);
  }

  getHumansByType(type: HumanType): HumanInstance[] {
    return Array.from(this.humans.values()).filter((h) => h.type === type);
  }

  getHumansByDisposition(disposition: HumanDisposition): HumanInstance[] {
    return Array.from(this.humans.values()).filter((h) => h.disposition === disposition);
  }

  getFriendlyHumans(): HumanInstance[] {
    return this.getHumansByDisposition('friendly');
  }

  getHostileHumans(): HumanInstance[] {
    return this.getHumansByDisposition('hostile');
  }

  getHumanCount(): number {
    return this.humans.size;
  }

  // === STATISTICS ===

  getHumanStats(name: string, type: HumanType): HumanStats {
    return buildHumanStats(name, type);
  }

  getHumanProfile(name: string, type: HumanType, role: HumanRole, portraitId?: string) {
    return buildHumanProfile(name, type, role, portraitId);
  }

  // === CLEANUP ===

  removeHuman(humanId: string): void {
    this.humans.delete(humanId);
    this.relationships.delete(humanId);
  }

  clearAll(): void {
    this.humans.clear();
    this.relationships.clear();
    this.knownHumans.clear();
    this.encounterHistory.clear();
  }

  // === SERIALIZATION ===

  serialize(): {
    humans: Record<string, HumanInstance>;
    relationships: Record<string, HumanRelationship>;
    encounterHistory: Record<string, { seen: number; accepted: number; rejected: number }>;
  } {
    return {
      humans: Object.fromEntries(this.humans),
      relationships: Object.fromEntries(this.relationships),
      encounterHistory: Object.fromEntries(this.encounterHistory),
    };
  }

  deserialize(data: {
    humans: Record<string, HumanInstance>;
    relationships: Record<string, HumanRelationship>;
    encounterHistory: Record<string, { seen: number; accepted: number; rejected: number }>;
  }): void {
    this.humans = new Map(Object.entries(data.humans));
    this.relationships = new Map(Object.entries(data.relationships));
    this.encounterHistory = new Map(Object.entries(data.encounterHistory));
    this.knownHumans = new Set(Object.values(data.relationships).map((r) => r.humanId));
  }
}
