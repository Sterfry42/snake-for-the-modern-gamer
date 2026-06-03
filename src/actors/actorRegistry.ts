import { AnimalRegistry } from '../animals/animalRegistry.js';
import type { Actor, ActorPromotionReason, ActorSaveData } from './actorTypes.js';
import type {
  EnsureAnimalActorArgs,
  EnsureEnemyActorArgs,
  EnsureRelationshipActorArgs,
  EnsureTownResidentActorArgs,
  EnsureWandererActorArgs,
} from './actorTypes.js';
import {
  createActorFromAnimal,
  createActorFromEnemy,
  createActorFromRelationship,
  createActorFromTownResident,
  createActorFromWanderer,
} from './actorFactory.js';

const ACTOR_SAVE_VERSION = 1;

export class ActorRegistry {
  private readonly actors = new Map<string, Actor>();
  private readonly promotedActorIds = new Set<string>();
  private readonly deadActorIds = new Set<string>();

  get(actorId: string): Actor | undefined {
    return this.actors.get(actorId);
  }

  has(actorId: string): boolean {
    return this.actors.has(actorId);
  }

  upsert(actor: Actor): Actor {
    const existing = this.actors.get(actor.id);
    const next = existing ? mergeActor(existing, actor) : actor;
    this.actors.set(actor.id, next);
    if (next.knownToPlayer) {
      next.knownToPlayer = true;
    }
    if (next.health?.state === 'dead' || next.hostility === 'dead') {
      this.deadActorIds.add(next.id);
    }
    return next;
  }

  update(actorId: string, updater: (actor: Actor) => Actor): Actor | undefined {
    const current = this.actors.get(actorId);
    if (!current) {
      return undefined;
    }
    const next = updater(current);
    this.actors.set(actorId, next);
    if (next.health?.state === 'dead' || next.hostility === 'dead') {
      this.deadActorIds.add(next.id);
    }
    return next;
  }

  remove(actorId: string): void {
    this.actors.delete(actorId);
  }

  clear(): void {
    this.actors.clear();
    this.promotedActorIds.clear();
    this.deadActorIds.clear();
  }

  getAll(): Actor[] {
    return [...this.actors.values()];
  }

  getByRoom(roomId: string): Actor[] {
    return this.getAll().filter((actor) => actor.currentRoomId === roomId);
  }

  getByTown(townId: string): Actor[] {
    return this.getAll().filter((actor) => actor.townId === townId);
  }

  getByFaction(factionId: string): Actor[] {
    return this.getAll().filter((actor) => actor.factionId === factionId);
  }

  getKnownActors(): Actor[] {
    return this.getAll().filter((actor) => actor.knownToPlayer);
  }

  ensureTownResidentActor(args: EnsureTownResidentActorArgs): Actor {
    return this.upsert(createActorFromTownResident(args));
  }

  ensureAnimalActor(args: EnsureAnimalActorArgs): Actor {
    const definition = AnimalRegistry.getDefinition(args.animalType);
    return this.upsert(createActorFromAnimal(args, definition));
  }

  ensureEnemyActor(args: EnsureEnemyActorArgs): Actor {
    return this.upsert(createActorFromEnemy(args));
  }

  ensureRelationshipActor(args: EnsureRelationshipActorArgs): Actor {
    if (args.actorId) {
      const existing = this.actors.get(args.actorId);
      if (existing) {
        const relationshipDead = args.stage === 'dead';
        const next: Actor = {
          ...existing,
          health: relationshipDead
            ? { current: 0, max: existing.health?.max ?? 1, state: 'dead' }
            : existing.health,
          thickness:
            args.stage === 'married' || args.stage === 'lover' || existing.thickness === 'thick'
              ? 'thick'
              : existing.thickness === 'thin'
                ? 'medium'
                : existing.thickness,
          portraitId: existing.portraitId ?? args.portraitId,
          homeRoomId: existing.homeRoomId ?? args.homeRoomId,
          factionId: existing.factionId ?? args.factionId,
          brainId: existing.brainId === 'none' || !existing.brainId ? 'romance' : existing.brainId,
          hostility: relationshipDead
            ? 'dead'
            : args.stage === 'hostile' || args.stage === 'murderous'
              ? 'hostile'
              : existing.hostility,
          flags: {
            ...existing.flags,
            relationshipId: args.relationshipId,
            relationshipStage: args.stage,
            romanceCandidate: true,
          },
        };
        this.actors.set(existing.id, next);
        if (relationshipDead) {
          this.deadActorIds.add(existing.id);
        }
        return next;
      }
    }
    return this.upsert(createActorFromRelationship(args));
  }

  ensureWandererActor(args: EnsureWandererActorArgs): Actor {
    return this.upsert(createActorFromWanderer(args));
  }

  promote(actorId: string, reason: ActorPromotionReason): Actor | undefined {
    const actor = this.actors.get(actorId);
    if (!actor) {
      return undefined;
    }
    const next: Actor = {
      ...actor,
      thickness: 'thick',
      knownToPlayer: true,
      flags: {
        ...actor.flags,
        promoted: true,
        promotionReason: reason,
      },
    };
    this.actors.set(actorId, next);
    this.promotedActorIds.add(actorId);
    return next;
  }

  toSaveData(): ActorSaveData {
    const actors = Object.fromEntries(this.actors);
    return {
      version: ACTOR_SAVE_VERSION,
      actors,
      knownActorIds: this.getKnownActors().map((actor) => actor.id),
      promotedActorIds: [...this.promotedActorIds],
      deadActorIds: [...this.deadActorIds],
    };
  }

  loadSaveData(data: ActorSaveData | undefined | null): void {
    this.clear();
    if (!data || typeof data !== 'object') {
      return;
    }
    for (const [id, actor] of Object.entries(data.actors ?? {})) {
      if (!actor || actor.id !== id) {
        continue;
      }
      this.actors.set(id, actor);
    }
    for (const id of data.promotedActorIds ?? []) {
      this.promotedActorIds.add(id);
    }
    for (const id of data.deadActorIds ?? []) {
      this.deadActorIds.add(id);
    }
    for (const id of data.knownActorIds ?? []) {
      const actor = this.actors.get(id);
      if (actor) {
        actor.knownToPlayer = true;
      }
    }
  }
}

function mergeActor(existing: Actor, incoming: Actor): Actor {
  const existingDead = existing.health?.state === 'dead' || existing.hostility === 'dead';
  const incomingHostile =
    incoming.hostility === 'hostile' &&
    existing.hostility !== 'dead' &&
    existing.hostility !== 'downed';
  const preserveIdentity =
    existing.flags.source === 'townResident' || existing.flags.relationshipId;
  return {
    ...incoming,
    kind: preserveIdentity ? existing.kind : incoming.kind,
    role: preserveIdentity ? existing.role : incoming.role,
    species: preserveIdentity ? existing.species : incoming.species,
    personality: preserveIdentity ? existing.personality : incoming.personality,
    knownToPlayer: existing.knownToPlayer || incoming.knownToPlayer,
    focus: Math.max(existing.focus ?? 0, incoming.focus ?? 0),
    mood: existing.mood,
    needs: existing.needs,
    opinions: { ...incoming.opinions, ...existing.opinions },
    relationships:
      existing.relationships.length > 0 ? existing.relationships : incoming.relationships,
    memory: existing.memory.length > 0 ? existing.memory : incoming.memory,
    health: existingDead ? existing.health : (incoming.health ?? existing.health),
    hostility: existingDead
      ? 'dead'
      : incomingHostile
        ? incoming.hostility
        : (existing.hostility ?? incoming.hostility),
    soul: existing.soul ?? incoming.soul,
    lore: existing.lore ?? incoming.lore,
    flags: { ...incoming.flags, ...existing.flags },
  };
}
