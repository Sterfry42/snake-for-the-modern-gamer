import { AnimalRegistry } from '../animals/animalRegistry.js';
import type {
  Actor,
  ActorActivity,
  ActorGoal,
  ActorPresence,
  ActorPromotionReason,
  ActorSchedule,
  ActorSaveData,
} from './actorTypes.js';
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
  private mutationCount = 0;

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
    this.mutationCount += 1;
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
    if (next === current) {
      return current;
    }
    this.actors.set(actorId, next);
    this.mutationCount += 1;
    if (next.health?.state === 'dead' || next.hostility === 'dead') {
      this.deadActorIds.add(next.id);
    }
    return next;
  }

  remove(actorId: string): void {
    if (this.actors.delete(actorId)) {
      this.mutationCount += 1;
    }
  }

  clear(): void {
    this.actors.clear();
    this.promotedActorIds.clear();
    this.deadActorIds.clear();
    this.mutationCount = 0;
  }

  getAll(): Actor[] {
    return [...this.actors.values()];
  }

  getMutationCount(): number {
    return this.mutationCount;
  }

  getByRoom(roomId: string): Actor[] {
    return this.getAll().filter(
      (actor) =>
        (actor.presence?.roomId ?? actor.currentRoomId) === roomId &&
        actor.health?.state !== 'dead' &&
        actor.hostility !== 'dead',
    );
  }

  getByTown(townId: string): Actor[] {
    return this.getAll().filter((actor) => actor.townId === townId);
  }

  getByFaction(factionId: string): Actor[] {
    return this.getAll().filter((actor) => actor.factionId === factionId);
  }

  setPresence(actorId: string, presence: ActorPresence): Actor | undefined {
    return this.update(actorId, (actor) =>
      actorPresenceEquals(actor.presence, presence)
        ? actor
        : {
            ...actor,
            currentRoomId: presence.roomId,
            presence,
          },
    );
  }

  setGoal(actorId: string, goal: ActorGoal, interrupt = false): Actor | undefined {
    return this.update(actorId, (actor) =>
      actorGoalEquals(actor.goal, goal)
        ? actor
        : {
            ...actor,
            goal,
            goalStack:
              interrupt && actor.goal ? [...(actor.goalStack ?? []), actor.goal] : actor.goalStack,
          },
    );
  }

  resumeInterruptedGoal(actorId: string): Actor | undefined {
    return this.update(actorId, (actor) => {
      const stack = actor.goalStack ?? [];
      if (stack.length === 0) {
        return actor;
      }
      const goal = stack[stack.length - 1] ?? actor.goal;
      return {
        ...actor,
        goal,
        goalStack: stack.slice(0, -1),
      };
    });
  }

  setActivity(actorId: string, activity: ActorActivity): Actor | undefined {
    return this.update(actorId, (actor) =>
      actorActivityEquals(actor.activity, activity) ? actor : { ...actor, activity },
    );
  }

  getKnownActors(): Actor[] {
    return this.getAll().filter((actor) => actor.knownToPlayer);
  }

  ensureTownResidentActor(args: EnsureTownResidentActorArgs): Actor {
    const incoming = createActorFromTownResident(args);
    const existing = this.actors.get(incoming.id);
    if (!existing) {
      return this.upsert(incoming);
    }
    if (existing.schedule && incoming.schedule) {
      const mergedSchedule = {
        ...existing.schedule,
        homeRoomId: incoming.schedule.homeRoomId ?? existing.schedule.homeRoomId,
        workRoomId: incoming.schedule.workRoomId ?? existing.schedule.workRoomId,
        sleepRoomId: incoming.schedule.sleepRoomId ?? existing.schedule.sleepRoomId,
        homePosition: mergeSchedulePosition(
          existing.schedule.homePosition,
          incoming.schedule.homePosition,
        ),
        workPosition: mergeSchedulePosition(
          existing.schedule.workPosition,
          incoming.schedule.workPosition,
        ),
        sleepPosition: mergeSchedulePosition(
          existing.schedule.sleepPosition,
          incoming.schedule.sleepPosition,
        ),
        fixedPostRoomId: incoming.schedule.fixedPostRoomId ?? existing.schedule.fixedPostRoomId,
        fixedPostPosition:
          incoming.schedule.fixedPostPosition ?? existing.schedule.fixedPostPosition,
      };
      if (
        existing.homeRoomId !== (existing.homeRoomId ?? incoming.homeRoomId) ||
        existing.workRoomId !== (incoming.workRoomId ?? existing.workRoomId) ||
        !actorScheduleEquals(existing.schedule, mergedSchedule)
      ) {
        return (
          this.update(existing.id, (actor) => ({
            ...actor,
            homeRoomId: actor.homeRoomId ?? incoming.homeRoomId,
            workRoomId: incoming.workRoomId ?? actor.workRoomId,
            schedule: mergedSchedule,
          })) ?? existing
        );
      }
    }
    if (!existing.schedule && incoming.schedule) {
      return (
        this.update(existing.id, (actor) => ({
          ...actor,
          homeRoomId: actor.homeRoomId ?? incoming.homeRoomId,
          workRoomId: actor.workRoomId ?? incoming.workRoomId,
          schedule: incoming.schedule,
        })) ?? existing
      );
    }
    return existing;
  }

  ensureAnimalActor(args: EnsureAnimalActorArgs): Actor {
    const definition = AnimalRegistry.getDefinition(args.animalType);
    const incoming = createActorFromAnimal(args, definition);
    const existing = this.actors.get(incoming.id);
    if (
      existing &&
      existing.health?.current === incoming.health?.current &&
      existing.health?.max === incoming.health?.max &&
      existing.health?.state === incoming.health?.state &&
      existing.kind === incoming.kind &&
      existing.schedule
    ) {
      return existing;
    }
    return this.upsert(incoming);
  }

  ensureEnemyActor(args: EnsureEnemyActorArgs): Actor {
    const incoming = createActorFromEnemy(args);
    const existing = this.actors.get(incoming.id);
    if (
      existing &&
      (existing.health?.state === 'dead' ||
        (existing.health?.current === incoming.health?.current &&
          existing.health?.max === incoming.health?.max &&
          existing.health?.state === incoming.health?.state &&
          existing.flags.enemyId === incoming.flags.enemyId &&
          existing.schedule))
    ) {
      return existing;
    }
    return this.upsert(incoming);
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
          playerHostility:
            args.stage === 'hostile' || args.stage === 'murderous'
              ? {
                  state: 'hostile',
                  reason: 'relationship-stage-hostile',
                  startedAtRoomNumber: args.createdAtRoomNumber,
                }
              : existing.playerHostility,
          flags: {
            ...existing.flags,
            relationshipId: args.relationshipId,
            relationshipStage: args.stage,
            romanceCandidate: true,
          },
        };
        if (
          existing.flags.relationshipStage === next.flags.relationshipStage &&
          existing.health?.state === next.health?.state &&
          existing.thickness === next.thickness &&
          existing.hostility === next.hostility &&
          existing.portraitId === next.portraitId &&
          existing.homeRoomId === next.homeRoomId &&
          existing.factionId === next.factionId &&
          existing.brainId === next.brainId
        ) {
          return existing;
        }
        this.actors.set(existing.id, next);
        this.mutationCount += 1;
        if (relationshipDead) {
          this.deadActorIds.add(existing.id);
        }
        return next;
      }
    }
    return this.upsert(createActorFromRelationship(args));
  }

  ensureWandererActor(args: EnsureWandererActorArgs): Actor {
    const incoming = createActorFromWanderer(args);
    return this.actors.get(incoming.id) ?? this.upsert(incoming);
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

function actorGoalEquals(left: ActorGoal | undefined, right: ActorGoal | undefined): boolean {
  return (
    left === right ||
    (left?.kind === right?.kind &&
      left?.priority === right?.priority &&
      left?.roomId === right?.roomId &&
      left?.targetActorId === right?.targetActorId &&
      left?.targetPosition?.x === right?.targetPosition?.x &&
      left?.targetPosition?.y === right?.targetPosition?.y &&
      left?.reason === right?.reason)
  );
}

function actorPresenceEquals(
  left: ActorPresence | undefined,
  right: ActorPresence | undefined,
): boolean {
  return (
    left === right ||
    (left?.roomId === right?.roomId &&
      left?.position.x === right?.position.x &&
      left?.position.y === right?.position.y &&
      left?.materialized === right?.materialized &&
      left?.anchor?.x === right?.anchor?.x &&
      left?.anchor?.y === right?.anchor?.y &&
      left?.wanderRadius === right?.wanderRadius &&
      left?.stationary === right?.stationary)
  );
}

function actorActivityEquals(
  left: ActorActivity | undefined,
  right: ActorActivity | undefined,
): boolean {
  return (
    left === right ||
    (left?.kind === right?.kind &&
      left?.source === right?.source &&
      left?.targetActorId === right?.targetActorId &&
      left?.label === right?.label &&
      left?.startedAtRoomNumber === right?.startedAtRoomNumber &&
      left?.endsAtRoomNumber === right?.endsAtRoomNumber)
  );
}

function actorScheduleEquals(left: ActorSchedule, right: ActorSchedule): boolean {
  return (
    left.policyId === right.policyId &&
    left.homeRoomId === right.homeRoomId &&
    left.workRoomId === right.workRoomId &&
    left.sleepRoomId === right.sleepRoomId &&
    left.homePosition?.x === right.homePosition?.x &&
    left.homePosition?.y === right.homePosition?.y &&
    left.workPosition?.x === right.workPosition?.x &&
    left.workPosition?.y === right.workPosition?.y &&
    left.sleepPosition?.x === right.sleepPosition?.x &&
    left.sleepPosition?.y === right.sleepPosition?.y &&
    left.fixedPostRoomId === right.fixedPostRoomId &&
    left.fixedPostPosition?.x === right.fixedPostPosition?.x &&
    left.fixedPostPosition?.y === right.fixedPostPosition?.y
  );
}

function mergeSchedulePosition(
  existing: { x: number; y: number } | undefined,
  incoming: { x: number; y: number } | undefined,
): { x: number; y: number } | undefined {
  if (!incoming) {
    return existing;
  }
  if (existing && incoming.x === 0 && incoming.y === 0) {
    return existing;
  }
  return incoming;
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
    playerHostility: incoming.playerHostility ?? existing.playerHostility,
    targetedThreat: existing.targetedThreat ?? incoming.targetedThreat,
    currentRoomId: existing.currentRoomId ?? incoming.currentRoomId,
    presence: existing.presence,
    scheduleGoal: existing.scheduleGoal ?? incoming.scheduleGoal,
    goal: existing.goal ?? incoming.goal,
    goalStack: existing.goalStack ?? incoming.goalStack,
    activity: existing.activity ?? incoming.activity,
    speech: existing.speech ?? incoming.speech,
    soul: existing.soul ?? incoming.soul,
    lore: existing.lore ?? incoming.lore,
    flags: { ...incoming.flags, ...existing.flags },
  };
}
