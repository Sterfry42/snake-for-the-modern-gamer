import { AnimalRegistry } from '../animals/animalRegistry.js';
import type { AnimalInstance } from '../animals/types.js';
import type { ResolvedAtmosphereView } from '../world/atmosphereTypes.js';
import type {
  CreateWorldEventInput,
  WorldEvent,
  WorldEventSaveData,
} from '../events/worldEventTypes.js';
import { WorldEventLog } from '../events/worldEventLog.js';
import type {
  RelationshipCandidateProfile,
  RelationshipState,
} from '../relationships/relationshipTypes.js';
import type { EnemyInstance } from '../systems/enemies.js';
import { stableStringHash32 } from '../core/math.js';
import type { RoomSnapshot } from '../world/types.js';
import { townResidentsForRoom, type TownStructure } from '../world/town.js';
import type { TownResidentRole } from '../world/townRoles.js';
import { ActorRegistry } from './actorRegistry.js';
import type {
  Actor,
  ActorActivity,
  ActorGoal,
  ActorMemory,
  ActorMood,
  ActorOpinion,
  ActorPlayerHostility,
  ActorPresence,
  ActorSaveData,
  ActorSocialLink,
  ActorTargetThreat,
} from './actorTypes.js';
import {
  actorIdForAnimal,
  actorIdForEnemy,
  actorIdForRelationship,
  actorIdForTownResident,
  actorIdForWanderer,
} from './actorFactory.js';
import {
  selectActorEnvironmentReaction,
  type ActorEnvironmentContext,
} from './actorEnvironment.js';
import {
  advanceOffscreenActorTravel,
  findFactionConflictGoals,
  selectScheduleGoal,
} from './actorPresence.js';
import {
  compactActorActivity,
  compactActorGoal,
  compactActorPresence,
  compactActorThreat,
  compactPlayerHostility,
  type ActorTelemetryEvent,
  type ActorTelemetryEventType,
  type ActorTelemetrySink,
} from './actorTelemetry.js';

export interface ActorSystemSaveData {
  actors: ActorSaveData;
  events: WorldEventSaveData;
}

export interface ActorSystemSyncContext {
  room: RoomSnapshot;
  animals?: readonly AnimalInstance[];
  enemies?: readonly EnemyInstance[];
  relationships?: readonly RelationshipState[];
  relationshipCandidates?: readonly RelationshipCandidateProfile[];
  roomNumber?: number;
}

export interface ActorScheduleUpdateContext {
  roomNumber: number;
  atmosphere?: ResolvedAtmosphereView;
}

export class ActorSystem {
  readonly registry = new ActorRegistry();
  readonly events = new WorldEventLog();
  private telemetrySink: ActorTelemetrySink | undefined;

  setTelemetrySink(sink: ActorTelemetrySink | undefined): void {
    this.telemetrySink = sink;
  }

  reset(): void {
    this.registry.clear();
    this.events.clear();
  }

  syncRoom(context: ActorSystemSyncContext): Actor[] {
    const actors: Actor[] = [];
    const { room, roomNumber } = context;

    if (room.town) {
      actors.push(...this.syncTown(room.town, room.id, roomNumber));
    }
    if (room.village) {
      actors.push(
        ...this.syncLooseHumanoids(
          `village:${room.id}`,
          room.id,
          [
            ...room.village.residents.map((resident) =>
              withLooseHumanoidRole(resident, 'resident'),
            ),
            withLooseHumanoidRole(room.village.shopkeeper, 'shopkeeper'),
          ],
          'hearthbound-remnant',
          roomNumber,
        ),
      );
    }
    if (room.questGiver) {
      actors.push(
        ...this.syncLooseHumanoids(
          `quest:${room.id}`,
          room.id,
          [withLooseHumanoidRole(room.questGiver, 'questGiver')],
          'hearthbound-remnant',
          roomNumber,
        ),
      );
    }
    if (room.garage) {
      actors.push(
        ...this.syncLooseHumanoids(
          `garage:${room.id}`,
          room.id,
          [withLooseHumanoidRole(room.garage.mechanic, 'shopkeeper')],
          'hearthbound-remnant',
          roomNumber,
        ),
      );
    }
    if (room.goblinCamp) {
      actors.push(
        ...this.syncLooseHumanoids(
          room.goblinCamp.id,
          room.id,
          [
            withLooseHumanoidRole(room.goblinCamp.shopkeeper, 'shopkeeper'),
            ...room.goblinCamp.guards.map((guard) => withLooseHumanoidRole(guard, 'guard')),
          ],
          'goblin-camps',
          roomNumber,
        ),
      );
    }

    for (const animal of context.animals ?? []) {
      const definition = AnimalRegistry.getDefinition(animal.type);
      actors.push(
        this.registry.ensureAnimalActor({
          actorId: animal.actorId,
          animalId: animal.id,
          animalType: animal.type,
          animalName: definition.name,
          roomId: animal.roomId,
          isTamed: animal.isTamed,
          currentHearts: animal.currentHearts,
          maxHearts: definition.maxHearts,
          createdAtRoomNumber: roomNumber,
        }),
      );
    }

    for (const enemy of context.enemies ?? []) {
      actors.push(
        this.registry.ensureEnemyActor({
          actorId: enemy.actorId,
          enemyId: enemy.id,
          roomId: enemy.roomId,
          name: enemy.name,
          encounterKind: enemy.encounterKind,
          currentHearts: enemy.currentHearts,
          maxHearts: enemy.maxHearts,
          createdAtRoomNumber: roomNumber,
        }),
      );
    }

    for (const relationship of context.relationships ?? []) {
      actors.push(
        this.registry.ensureRelationshipActor({
          actorId: relationship.actorId,
          relationshipId: relationship.id,
          displayName: relationship.displayName,
          species: relationship.species,
          personality: relationship.personality,
          factionId: relationship.factionId,
          homeRoomId: relationship.homeRoomId,
          portraitId: relationship.portraitId,
          stage: relationship.stage,
          createdAtRoomNumber: roomNumber,
        }),
      );
    }

    for (const profile of context.relationshipCandidates ?? []) {
      actors.push(
        this.registry.ensureRelationshipActor({
          actorId: profile.actorId,
          relationshipId: profile.id,
          displayName: profile.displayName,
          species: profile.species,
          personality: profile.personality,
          factionId: profile.factionId,
          homeRoomId: profile.homeRoomId,
          portraitId: profile.portraitId,
          createdAtRoomNumber: roomNumber,
        }),
      );
    }

    return actors;
  }

  syncTown(town: TownStructure, roomId: string, roomNumber?: number): Actor[] {
    const actors = townResidentsForRoom(town, roomId).map((resident) =>
      this.registry.ensureTownResidentActor({
        actorId: resident.actorId,
        residentId: resident.id,
        name: resident.name,
        role: resident.role,
        factionId: resident.factionId,
        townId: town.id,
        currentRoomId: roomId,
        homeRoomId: resident.homeRoomId,
        workRoomId: interiorWorkRoomIdForResident(town, resident.id) ?? resident.workRoomId,
        postPosition: { x: resident.x, y: resident.y },
        portraitId: resident.portraitId,
        createdAtRoomNumber: roomNumber,
      }),
    );
    this.ensureLocalSocialLinks(actors);
    return actors;
  }

  private syncLooseHumanoids(
    townId: string,
    roomId: string,
    residents: Array<{
      id: string;
      name: string;
      role: TownResidentRole;
      x: number;
      y: number;
      portraitId?: string;
    }>,
    factionId: string,
    roomNumber?: number,
  ): Actor[] {
    const actors = residents.map((resident) =>
      this.registry.ensureTownResidentActor({
        actorId: actorIdForTownResident(townId, resident.id, resident.role),
        residentId: resident.id,
        name: resident.name,
        role: resident.role,
        factionId,
        townId,
        currentRoomId: roomId,
        homeRoomId: roomId,
        workRoomId: roomId,
        postPosition: { x: resident.x, y: resident.y },
        portraitId: resident.portraitId,
        createdAtRoomNumber: roomNumber,
      }),
    );
    this.ensureLocalSocialLinks(actors);
    return actors;
  }

  getActorsInRoom(roomId: string): Actor[] {
    return this.registry.getByRoom(roomId);
  }

  getActor(actorId: string): Actor | undefined {
    return this.registry.get(actorId);
  }

  requestGoal(
    actorId: string,
    goal: ActorGoal,
    options?: { interrupt?: boolean },
  ): Actor | undefined {
    const previous = this.registry.get(actorId);
    const next = this.registry.setGoal(actorId, goal, options?.interrupt ?? false);
    if (!next) {
      return undefined;
    }
    const reason = goal.reason ?? 'goal-request';
    if (options?.interrupt && previous?.goal) {
      this.emitActorTelemetry('actor.goal_interrupted', next, reason, {
        previousGoal: compactActorGoal(previous.goal),
        nextGoal: compactActorGoal(next.goal),
      });
    }
    this.emitActorTelemetry('actor.goal_changed', next, reason, {
      previousGoal: compactActorGoal(previous?.goal),
      nextGoal: compactActorGoal(next.goal),
      priority: goal.priority,
    });
    return next;
  }

  resumeGoal(actorId: string, reason = 'resume-interrupted-goal'): Actor | undefined {
    const previous = this.registry.get(actorId);
    const next = this.registry.resumeInterruptedGoal(actorId);
    if (!next) {
      return undefined;
    }
    this.emitActorTelemetry('actor.goal_resumed', next, reason, {
      previousGoal: compactActorGoal(previous?.goal),
      nextGoal: compactActorGoal(next.goal),
    });
    return next;
  }

  setPresence(actorId: string, presence: ActorPresence, reason: string): Actor | undefined {
    const previous = this.registry.get(actorId);
    const next = this.registry.setPresence(actorId, presence);
    if (!next) {
      return undefined;
    }
    this.emitActorTelemetry('actor.presence_changed', next, reason, {
      previousPresence: compactActorPresence(previous?.presence),
      nextPresence: compactActorPresence(next.presence),
      fromRoomId: previous?.presence?.roomId ?? previous?.currentRoomId,
      toRoomId: presence.roomId,
      fromPosition: previous?.presence?.position,
      toPosition: presence.position,
    });
    if (previous?.presence?.materialized !== presence.materialized) {
      this.emitActorTelemetry(
        presence.materialized ? 'actor.materialized' : 'actor.dematerialized',
        next,
        reason,
        {
          previousPresence: compactActorPresence(previous?.presence),
          nextPresence: compactActorPresence(next.presence),
        },
      );
    }
    return next;
  }

  setActivity(actorId: string, activity: ActorActivity, reason: string): Actor | undefined {
    const previous = this.registry.get(actorId);
    const next = this.registry.setActivity(actorId, activity);
    if (!next) {
      return undefined;
    }
    this.emitActorTelemetry('actor.activity_changed', next, reason, {
      previousActivity: compactActorActivity(previous?.activity),
      nextActivity: compactActorActivity(next.activity),
    });
    return next;
  }

  setTargetThreat(
    actorId: string,
    threat: ActorTargetThreat | undefined,
    reason: string,
  ): Actor | undefined {
    const previous = this.registry.get(actorId);
    const next = this.registry.update(actorId, (actor) => ({
      ...actor,
      targetedThreat: threat,
    }));
    if (!next) {
      return undefined;
    }
    this.emitActorTelemetry('actor.threat_changed', next, reason, {
      previousThreatState: compactActorThreat(previous?.targetedThreat),
      nextThreatState: compactActorThreat(next.targetedThreat),
      targetActorId: threat?.targetActorId,
    });
    return next;
  }

  setPlayerHostility(
    actorId: string,
    state: ActorPlayerHostility['state'],
    reason: string,
    roomNumber?: number,
  ): Actor | undefined {
    const previous = this.registry.get(actorId);
    const playerHostility: ActorPlayerHostility = {
      state,
      reason,
      startedAtRoomNumber: roomNumber,
    };
    const next = this.registry.update(actorId, (actor) => ({
      ...actor,
      hostility:
        actor.hostility === 'dead'
          ? 'dead'
          : state === 'hostile'
            ? 'hostile'
            : state === 'suspicious'
              ? 'suspicious'
              : state,
      playerHostility,
    }));
    if (!next) {
      return undefined;
    }
    this.emitActorTelemetry('actor.player_hostility_changed', next, reason, {
      previous: compactPlayerHostility(previous?.playerHostility),
      next: compactPlayerHostility(next.playerHostility),
    });
    return next;
  }

  recordActorTelemetry(
    type: ActorTelemetryEventType,
    actorId: string,
    reason: string,
    data: Record<string, unknown> = {},
  ): void {
    const actor = this.registry.get(actorId);
    if (!actor) {
      return;
    }
    this.emitActorTelemetry(type, actor, reason, data);
  }

  applyScheduleGoals(context: number | ActorScheduleUpdateContext): void {
    const updateContext = typeof context === 'number' ? { roomNumber: context } : context;
    for (const actor of this.registry.getAll()) {
      if (actor.health?.state === 'dead' || actor.hostility === 'dead') {
        continue;
      }
      const goal = selectScheduleGoal(actor, {
        roomNumber: updateContext.roomNumber,
        dayPhase: updateContext.atmosphere?.state.dayPhase,
      });
      const previousScheduleGoal = actor.scheduleGoal;
      const currentPriority = actor.goal?.priority ?? 0;
      const accepted =
        !actor.goal ||
        goal.priority >= currentPriority ||
        actor.goal.reason?.includes('schedule') ||
        actor.goal.kind === actor.scheduleGoal?.kind;
      const scheduled = this.registry.update(actor.id, (current) => ({
        ...current,
        scheduleGoal: goal,
      }));
      if (scheduled) {
        this.emitActorTelemetry('actor.schedule_evaluated', scheduled, goal.reason ?? 'schedule', {
          dayPhase: updateContext.atmosphere?.state.dayPhase,
          schedulePolicy: actor.schedule
            ? {
                permanentDuty: actor.schedule.permanentDuty,
                fixedPostRoomId: actor.schedule.fixedPostRoomId,
              }
            : null,
          previousBaseGoal: compactActorGoal(previousScheduleGoal),
          scheduleGoal: compactActorGoal(goal),
          accepted,
        });
      }
      if (accepted) {
        this.requestGoal(actor.id, goal);
      }
    }
    if (updateContext.atmosphere) {
      this.applyEnvironmentReactions({
        roomNumber: updateContext.roomNumber,
        atmosphere: updateContext.atmosphere.state,
        sheltered: updateContext.atmosphere.sheltered,
        effects: updateContext.atmosphere.effects,
      });
    }
  }

  private applyEnvironmentReactions(context: ActorEnvironmentContext): void {
    for (const actor of this.registry.getAll()) {
      const reaction = selectActorEnvironmentReaction(actor, context);
      if (!reaction) {
        continue;
      }
      const applyDeltas = actor.flags.lastEnvironmentReactionKey !== reaction.environmentKey;
      const currentPriority = actor.goal?.priority ?? 0;
      const nextGoal =
        reaction.goal &&
        (reaction.goal.priority >= currentPriority ||
          actor.goal?.reason?.includes('schedule') ||
          actor.goal?.reason?.includes('shelter'))
          ? reaction.goal
          : actor.goal;
      this.registry.update(actor.id, (current) => ({
        ...current,
        goal: nextGoal,
        activity: reaction.activity ?? current.activity,
        speech: reaction.speech ?? current.speech,
        mood: {
          ...current.mood,
          fear: shift(current.mood.fear, applyDeltas ? (reaction.moodDelta?.fear ?? 0) : 0),
          stress: shift(current.mood.stress, applyDeltas ? (reaction.moodDelta?.stress ?? 0) : 0),
          curiosity: shift(
            current.mood.curiosity,
            applyDeltas ? (reaction.moodDelta?.curiosity ?? 0) : 0,
          ),
          hunger: shift(current.mood.hunger, applyDeltas ? (reaction.moodDelta?.hunger ?? 0) : 0),
        },
        needs: {
          ...current.needs,
          safety: shift(current.needs.safety, applyDeltas ? (reaction.needsDelta?.safety ?? 0) : 0),
          rest: shift(current.needs.rest, applyDeltas ? (reaction.needsDelta?.rest ?? 0) : 0),
          social: shift(current.needs.social, applyDeltas ? (reaction.needsDelta?.social ?? 0) : 0),
          duty: shift(current.needs.duty, applyDeltas ? (reaction.needsDelta?.duty ?? 0) : 0),
        },
        flags: {
          ...current.flags,
          lastEnvironmentReactionKey: reaction.environmentKey,
        },
      }));
    }
  }

  advanceOffscreenTravel(loadedRoomId: string, roomNumber: number): void {
    for (const actor of this.registry.getAll()) {
      const traveled = advanceOffscreenActorTravel({ actor, loadedRoomId, roomNumber });
      if (traveled) {
        this.registry.update(actor.id, () => traveled);
      }
    }
  }

  resolveFactionConflicts(roomId: string): void {
    const updates = findFactionConflictGoals(this.getActorsInRoom(roomId));
    for (const update of updates) {
      const actor = this.registry.get(update.actorId);
      if (!actor) {
        continue;
      }
      const alreadyTargeting = actor.targetedThreat?.targetActorId === update.threat.targetActorId;
      this.setTargetThreat(
        update.actorId,
        { ...update.threat, startedAtRoomNumber: actor.targetedThreat?.startedAtRoomNumber },
        'faction-conflict',
      );
      this.requestGoal(update.actorId, update.goal, {
        interrupt:
          actor.goal?.kind !== 'attackActor' ||
          actor.goal.targetActorId !== update.goal.targetActorId,
      });
      this.setActivity(update.actorId, update.activity, 'faction-conflict');
      const next = this.registry.update(update.actorId, (current) => ({
        ...current,
        mood: {
          ...current.mood,
          anger: Math.min(100, current.mood.anger + 18),
          stress: Math.min(100, current.mood.stress + 8),
        },
      }));
      if (next && !alreadyTargeting) {
        this.emitActorTelemetry('actor.combat_started', next, 'faction-conflict', {
          sourceActorId: update.actorId,
          targetActorId: update.threat.targetActorId,
        });
      }
    }
  }

  emitWorldEvent(input: CreateWorldEventInput): WorldEvent {
    const witnessActorIds =
      input.witnessActorIds ??
      (input.roomId
        ? this.getActorsInRoom(input.roomId)
            .map((actor) => actor.id)
            .filter(
              (actorId) =>
                actorId !== input.sourceActorId && !(input.targetActorIds ?? []).includes(actorId),
            )
        : []);
    const event = this.events.add({ ...input, witnessActorIds });
    this.applyEventMemory(event);
    return event;
  }

  getStableTownResidentActorId(townId: string, residentId: string, role: TownResidentRole): string {
    return actorIdForTownResident(townId, residentId, role);
  }

  getStableAnimalActorId(roomId: string, animalId: string): string {
    return actorIdForAnimal(roomId, animalId);
  }

  getStableEnemyActorId(roomId: string, enemyId: string): string {
    return actorIdForEnemy(roomId, enemyId);
  }

  getStableRelationshipActorId(relationshipId: string): string {
    return actorIdForRelationship(relationshipId);
  }

  getStableWandererActorId(encounterId: string): string {
    return actorIdForWanderer(encounterId);
  }

  toSaveData(): ActorSystemSaveData {
    return {
      actors: this.registry.toSaveData(),
      events: this.events.toSaveData(),
    };
  }

  loadSaveData(data: ActorSystemSaveData | ActorSaveData | undefined | null): void {
    this.reset();
    if (!data) {
      return;
    }
    if ('actors' in data && 'events' in data) {
      this.registry.loadSaveData(data.actors);
      this.events.loadSaveData(data.events);
      return;
    }
    this.registry.loadSaveData(data);
  }

  private applyEventMemory(event: WorldEvent): void {
    const actorIds = new Set<string>([
      ...(event.sourceActorId ? [event.sourceActorId] : []),
      ...event.targetActorIds,
      ...event.witnessActorIds,
    ]);
    for (const actorId of actorIds) {
      this.registry.update(actorId, (actor) => {
        const memorySource =
          actor.id === event.sourceActorId || event.targetActorIds.includes(actor.id)
            ? 'personal'
            : 'witnessed';
        return applyEventConsequences(
          {
            ...actor,
            memory: addMemory(actor, {
              id: `memory:${event.id}:${actor.id}`,
              eventId: event.id,
              type: event.type,
              summary: event.summary,
              source: memorySource,
              intensity: event.severity,
              roomId: event.roomId,
              targetActorIds: event.targetActorIds,
              tags: event.tags,
              createdAtRoomNumber: event.createdAtRoomNumber,
            }),
          },
          event,
          memorySource,
        );
      });
    }
  }

  private ensureLocalSocialLinks(actors: readonly Actor[]): void {
    const socialActors = actors.filter(
      (actor) => actor.species === 'human' || actor.species === 'goblin',
    );
    if (socialActors.length < 2) {
      return;
    }
    socialActors.forEach((actor, index) => {
      const target = socialActors[(index + 1) % socialActors.length];
      if (
        !target ||
        target.id === actor.id ||
        actor.relationships.some((link) => link.actorId === target.id)
      ) {
        return;
      }
      const relationship = socialRelationshipFor(actor.id, target.id);
      this.registry.update(actor.id, (current) => ({
        ...current,
        relationships: [
          ...current.relationships,
          {
            actorId: target.id,
            relationship,
            strength: relationship === 'family' ? 72 : relationship === 'rival' ? 58 : 46,
            knownToPlayer: false,
          },
        ].slice(-6),
      }));
    });
  }

  private emitActorTelemetry(
    type: ActorTelemetryEventType,
    actor: Actor,
    reason: string,
    data: Record<string, unknown>,
  ): void {
    if (!this.telemetrySink) {
      return;
    }
    const event: ActorTelemetryEvent = {
      type,
      actorId: actor.id,
      actorName: actor.displayName,
      roomId: actor.presence?.roomId ?? actor.currentRoomId,
      reason,
      data: {
        actorId: actor.id,
        actorName: actor.displayName,
        reason,
        ...data,
      },
    };
    this.telemetrySink(event);
  }
}

function socialRelationshipFor(actorId: string, targetId: string): ActorSocialLink['relationship'] {
  const roll = Math.abs(stableStringHash32(`${actorId}->${targetId}`)) % 5;
  if (roll === 0) return 'family';
  if (roll === 1) return 'rival';
  if (roll === 2) return 'creditor';
  return 'friend';
}

function interiorWorkRoomIdForResident(
  town: TownStructure,
  residentId: string,
): string | undefined {
  const building = (town.buildings ?? []).find(
    (entry) => entry.enterable && entry.templateId && entry.ownerResidentId === residentId,
  );
  return building?.templateId ? `layer:townInterior:${town.id}:${building.templateId}` : undefined;
}

function applyEventConsequences(
  actor: Actor,
  event: WorldEvent,
  source: ActorMemory['source'],
): Actor {
  const isTarget = event.targetActorIds.includes(actor.id);
  const isWitness = source === 'witnessed';
  const playerOpinion = actor.opinions.player;

  if (event.type === 'humanoid-eaten') {
    if (isTarget) {
      return {
        ...actor,
        health: actor.health ? { ...actor.health, current: 0, state: 'dead' } : actor.health,
        hostility: 'dead',
        mood: shiftMood(actor.mood, { fear: 20, stress: 20 }),
        flags: { ...actor.flags, eaten: true },
      };
    }
    if (isWitness) {
      return {
        ...actor,
        hostility: actor.hostility === 'friendly' ? 'suspicious' : actor.hostility,
        mood: shiftMood(actor.mood, {
          fear: 28,
          stress: 22,
          anger: actor.kind === 'guard' ? 18 : 8,
        }),
        opinions: updateOpinion(actor.opinions, 'player', {
          ...playerOpinion,
          trust: shift(playerOpinion?.trust ?? 0, -18),
          fear: shift(playerOpinion?.fear ?? 0, 28),
          respect: shift(
            playerOpinion?.respect ?? 0,
            actor.personality.includes('violent') ? 8 : -6,
          ),
          resentment: shift(playerOpinion?.resentment ?? 0, actor.kind === 'guard' ? 22 : 10),
        }),
      };
    }
  }

  if (event.type === 'town-crime' && isWitness) {
    const hostile = event.severity >= 45 || actor.kind === 'guard';
    return {
      ...actor,
      hostility: hostile ? 'suspicious' : actor.hostility,
      mood: shiftMood(actor.mood, {
        anger: actor.kind === 'guard' ? 22 : 10,
        stress: 18,
        fear: event.tags.includes('witnessed') ? 8 : 0,
      }),
      opinions: updateOpinion(actor.opinions, 'player', {
        ...playerOpinion,
        trust: shift(playerOpinion?.trust ?? 0, -12),
        fear: shift(playerOpinion?.fear ?? 0, 6),
        resentment: shift(playerOpinion?.resentment ?? 0, 14),
      }),
    };
  }

  if (event.type === 'pickpocket' && isTarget) {
    const caught = event.tags.includes('caught') || event.tags.includes('noticed');
    return {
      ...actor,
      hostility: caught && actor.hostility === 'friendly' ? 'suspicious' : actor.hostility,
      mood: shiftMood(actor.mood, { anger: caught ? 16 : 4, stress: caught ? 10 : 4 }),
      opinions: updateOpinion(actor.opinions, 'player', {
        ...playerOpinion,
        trust: shift(playerOpinion?.trust ?? 0, caught ? -16 : -5),
        resentment: shift(playerOpinion?.resentment ?? 0, caught ? 14 : 4),
      }),
    };
  }

  if (event.type === 'relationship-choice' && isTarget && event.tags.includes('gift')) {
    return {
      ...actor,
      mood: shiftMood(actor.mood, { affection: 8, trust: 4, stress: -4 }),
      opinions: updateOpinion(actor.opinions, 'player', {
        ...playerOpinion,
        trust: shift(playerOpinion?.trust ?? 0, 4),
        affection: shift(playerOpinion?.affection ?? 0, 8),
      }),
    };
  }

  if (event.type === 'animal-hunted' && isWitness && actor.personality.includes('softhearted')) {
    return {
      ...actor,
      mood: shiftMood(actor.mood, { grief: 10, stress: 6 }),
    };
  }

  return actor;
}

function shiftMood(mood: ActorMood, delta: Partial<ActorMood>): ActorMood {
  return {
    fear: shift(mood.fear, delta.fear ?? 0),
    anger: shift(mood.anger, delta.anger ?? 0),
    trust: shift(mood.trust, delta.trust ?? 0),
    affection: shift(mood.affection, delta.affection ?? 0),
    greed: shift(mood.greed, delta.greed ?? 0),
    hunger: shift(mood.hunger, delta.hunger ?? 0),
    curiosity: shift(mood.curiosity, delta.curiosity ?? 0),
    grief: shift(mood.grief, delta.grief ?? 0),
    stress: shift(mood.stress, delta.stress ?? 0),
  };
}

function updateOpinion(
  opinions: Record<string, ActorOpinion>,
  targetId: string,
  next: Partial<ActorOpinion>,
): Record<string, ActorOpinion> {
  const current = opinions[targetId];
  return {
    ...opinions,
    [targetId]: {
      targetId,
      trust: current?.trust ?? 0,
      fear: current?.fear ?? 0,
      respect: current?.respect ?? 0,
      affection: current?.affection ?? 0,
      resentment: current?.resentment ?? 0,
      attraction: current?.attraction ?? 0,
      debt: current?.debt ?? 0,
      ...next,
    },
  };
}

function shift(value: number, delta: number): number {
  return Math.max(-100, Math.min(100, Math.round(value + delta)));
}

function withLooseHumanoidRole<T extends { id: string; name: string; x: number; y: number }>(
  profile: T,
  role: TownResidentRole,
): T & { role: TownResidentRole } {
  return { ...profile, role };
}

function addMemory(actor: Actor, memory: ActorMemory): ActorMemory[] {
  const cap = actor.thickness === 'thick' ? 40 : actor.thickness === 'medium' ? 20 : 6;
  const existing = actor.memory.filter((item) => item.id !== memory.id);
  return [...existing, memory].slice(-cap);
}
