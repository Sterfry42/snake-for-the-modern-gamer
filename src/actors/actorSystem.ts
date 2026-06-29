import { AnimalRegistry } from '../animals/animalRegistry.js';
import type { AnimalInstance } from '../animals/types.js';
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
import type { RoomSnapshot } from '../world/types.js';
import { townResidentsForRoom, type TownStructure } from '../world/town.js';
import { ActorRegistry } from './actorRegistry.js';
import type {
  Actor,
  ActorMemory,
  ActorMood,
  ActorOpinion,
  ActorSaveData,
  ActorSocialLink,
} from './actorTypes.js';
import {
  actorIdForAnimal,
  actorIdForEnemy,
  actorIdForRelationship,
  actorIdForTownResident,
} from './actorFactory.js';

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

export class ActorSystem {
  readonly registry = new ActorRegistry();
  readonly events = new WorldEventLog();

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
            ...room.village.residents.map((resident) => ({ ...resident, role: 'resident' })),
            { ...room.village.shopkeeper, role: 'shopkeeper' },
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
          [{ ...room.questGiver, role: 'questGiver' }],
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
            { ...room.goblinCamp.shopkeeper, role: 'shopkeeper' },
            ...room.goblinCamp.guards.map((guard) => ({ ...guard, role: 'guard' })),
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
        workRoomId: resident.workRoomId,
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
      role: string;
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

  getStableTownResidentActorId(townId: string, residentId: string, role: string): string {
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
}

function socialRelationshipFor(actorId: string, targetId: string): ActorSocialLink['relationship'] {
  const roll = Math.abs(hashString(`${actorId}->${targetId}`)) % 5;
  if (roll === 0) return 'family';
  if (roll === 1) return 'rival';
  if (roll === 2) return 'creditor';
  return 'friend';
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
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

function addMemory(actor: Actor, memory: ActorMemory): ActorMemory[] {
  const cap = actor.thickness === 'thick' ? 40 : actor.thickness === 'medium' ? 20 : 6;
  const existing = actor.memory.filter((item) => item.id !== memory.id);
  return [...existing, memory].slice(-cap);
}
