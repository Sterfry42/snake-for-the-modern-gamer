import {
  CARDINAL_DIRECTIONS,
  manhattanDistance,
  stableStringHashPositive,
  vectorKey,
  type Vector2Like,
} from '../core/math.js';
import { actorPrimaryFaction, relationBetweenFactions } from '../factions/factionRelations.js';
import type { DayPhase } from '../world/atmosphereTypes.js';
import { isTownShopRole } from '../world/townRoles.js';
import type { RoomSnapshot } from '../world/types.js';
import type {
  Actor,
  ActorActivity,
  ActorActivityKind,
  ActorGoal,
  ActorPresence,
  ActorScheduleRoomTarget,
  ActorTargetThreat,
} from './actorTypes.js';
import type { ActorBrainDecision } from './actorBrains.js';

export interface ActorOccupant {
  id: string;
  position: Vector2Like;
  blocksMovement: boolean;
}

export interface ActorMoveRequest {
  actorId: string;
  current: Vector2Like;
  preferredDirections: readonly Vector2Like[];
  canStandAt(position: Vector2Like): boolean;
}

export interface ActorMoveResolution {
  actorId: string;
  from: Vector2Like;
  to: Vector2Like;
  moved: boolean;
}

export interface ActorScheduleContext {
  roomNumber: number;
  dayPhase?: DayPhase;
}

export class ActorOccupancyResolver {
  private readonly occupied = new Map<string, string>();
  private readonly reserved = new Map<string, string>();

  constructor(occupants: readonly ActorOccupant[] = []) {
    for (const occupant of occupants) {
      if (occupant.blocksMovement) {
        this.occupied.set(vectorKey(occupant.position), occupant.id);
      }
    }
  }

  isOccupied(position: Vector2Like, actorId?: string): boolean {
    const key = vectorKey(position);
    const occupant = this.occupied.get(key);
    const reservation = this.reserved.get(key);
    return Boolean((occupant && occupant !== actorId) || (reservation && reservation !== actorId));
  }

  resolveMove(request: ActorMoveRequest): ActorMoveResolution {
    const fromKey = vectorKey(request.current);
    this.occupied.delete(fromKey);

    for (const direction of request.preferredDirections) {
      const next = {
        x: request.current.x + direction.x,
        y: request.current.y + direction.y,
      };
      const key = vectorKey(next);
      if (this.isOccupied(next, request.actorId) || !request.canStandAt(next)) {
        continue;
      }
      this.reserved.set(key, request.actorId);
      this.occupied.set(key, request.actorId);
      return {
        actorId: request.actorId,
        from: { ...request.current },
        to: next,
        moved: next.x !== request.current.x || next.y !== request.current.y,
      };
    }

    this.occupied.set(fromKey, request.actorId);
    return {
      actorId: request.actorId,
      from: { ...request.current },
      to: { ...request.current },
      moved: false,
    };
  }
}

export function createActorPresence(args: {
  roomId: string;
  position: Vector2Like;
  anchor?: Vector2Like;
  wanderRadius?: number;
  stationary?: boolean;
  materialized?: boolean;
}): ActorPresence {
  return {
    roomId: args.roomId,
    position: { ...args.position },
    materialized: args.materialized ?? true,
    anchor: args.anchor ? { ...args.anchor } : undefined,
    wanderRadius: args.wanderRadius,
    stationary: args.stationary,
  };
}

export function inferActorActivity(args: {
  actor: Actor;
  decision?: ActorBrainDecision;
  moved?: boolean;
  targetAdjacent?: boolean;
  roomNumber?: number;
}): ActorActivity {
  const dead = args.actor.hostility === 'dead' || args.actor.health?.state === 'dead';
  if (dead) {
    return activity('dead', 'system', args.roomNumber);
  }
  if (args.decision?.kind === 'fleeThreat' || args.actor.hostility === 'fleeing') {
    return activity('fleeing', 'brain', args.roomNumber);
  }
  if (args.actor.goal?.kind === 'attackActor' || args.actor.hostility === 'hostile') {
    return activity(
      args.actor.combat?.ranged ? 'combat-ranged' : 'combat-melee',
      'combat',
      args.roomNumber,
      args.actor.goal?.targetActorId,
    );
  }
  if (args.decision?.kind === 'shareRumor' || args.targetAdjacent) {
    return activity('talking', 'social', args.roomNumber, args.decision?.targetActorId);
  }
  if (
    args.moved ||
    (args.actor.goal?.roomId && args.actor.goal.roomId !== args.actor.currentRoomId)
  ) {
    return activity('walking', 'brain', args.roomNumber);
  }
  if (args.actor.goal?.kind === 'sleep') {
    return activity('sleeping', 'schedule', args.roomNumber);
  }
  if (args.actor.goal?.reason?.includes('shelter')) {
    return activity('sheltering', 'schedule', args.roomNumber);
  }
  if (args.actor.goal?.kind === 'defendArea') {
    return activity('guarding', 'schedule', args.roomNumber);
  }
  if (args.actor.goal?.kind === 'work' && isTownShopRole(args.actor.role)) {
    return activity('merchant', 'schedule', args.roomNumber);
  }
  if (args.actor.goal?.kind === 'work' && args.actor.role === 'fisher') {
    return activity('fishing', 'schedule', args.roomNumber);
  }
  if (
    (args.actor.role === 'guard' || args.actor.role === 'gateGuard') &&
    args.actor.schedule?.permanentDuty
  ) {
    return activity('guarding', 'schedule', args.roomNumber);
  }
  return activity('idle', 'brain', args.roomNumber);
}

export function selectScheduleGoal(
  actor: Actor,
  context: number | ActorScheduleContext,
): ActorGoal {
  const scheduleContext = typeof context === 'number' ? { roomNumber: context } : context;
  const dayPhase = scheduleContext.dayPhase ?? fallbackDayPhase(scheduleContext.roomNumber);
  const routine = actor.schedule?.routines?.[dayPhase];
  if (routine) {
    const place = resolveSchedulePlace(actor, routine.roomTarget);
    return {
      kind: routine.goalKind,
      priority: routine.priority,
      roomId: place.roomId,
      targetPosition: place.targetPosition,
      reason: `schedule:${routine.behavior}`,
    };
  }
  if (actor.schedule?.permanentDuty && actor.schedule.fixedPostRoomId) {
    return {
      kind: 'defendArea',
      priority: 24,
      roomId: actor.schedule.fixedPostRoomId,
      targetPosition: actor.schedule.fixedPostPosition,
      reason: 'permanent-duty-schedule',
    };
  }
  if (dayPhase === 'night') {
    const place = resolveSchedulePlace(actor, actor.schedule?.sleepRoomId ? 'sleep' : 'home');
    return {
      kind: place.roomId ? 'sleep' : 'sleep',
      priority: 20,
      roomId: place.roomId,
      targetPosition: place.targetPosition,
      reason: 'night-schedule',
    };
  }
  if (dayPhase === 'dawn' || dayPhase === 'dusk') {
    const place = resolveSchedulePlace(actor, 'home');
    return {
      kind: place.roomId ? 'goHome' : 'wander',
      priority: 12,
      roomId: place.roomId ?? actor.currentRoomId,
      targetPosition: place.targetPosition,
      reason: dayPhase === 'dawn' ? 'morning-schedule' : 'evening-schedule',
    };
  }
  if (isTownShopRole(actor.role) && (actor.schedule?.workRoomId || actor.workRoomId)) {
    const place = resolveSchedulePlace(actor, 'work');
    return {
      kind: 'work',
      priority: 18,
      roomId: place.roomId,
      targetPosition: place.targetPosition,
      reason: 'day-schedule',
    };
  }
  if (
    (actor.role === 'guard' || actor.role === 'gateGuard') &&
    actor.schedule?.patrolRoomIds?.[0]
  ) {
    const patrolRoomId = actor.schedule.patrolRoomIds[0];
    return {
      kind: 'defendArea',
      priority: 16,
      roomId: patrolRoomId,
      targetPosition:
        patrolRoomId === actor.schedule.fixedPostRoomId
          ? actor.schedule.fixedPostPosition
          : undefined,
      reason: 'patrol-schedule',
    };
  }
  const anchorRoomId = actor.schedule?.workRoomId ?? actor.workRoomId ?? actor.currentRoomId;
  const homeRoomId = actor.schedule?.sleepRoomId ?? actor.homeRoomId;
  const scheduleRoll =
    stableStringHashPositive(`${actor.id}:${Math.floor(scheduleContext.roomNumber / 2)}`) % 4;
  if (scheduleRoll === 0 && homeRoomId) {
    const place = resolveSchedulePlace(actor, actor.schedule?.sleepRoomId ? 'sleep' : 'home');
    return {
      kind: 'socialize',
      priority: 9,
      roomId: place.roomId ?? homeRoomId,
      targetPosition: place.targetPosition,
      reason: 'social-schedule',
    };
  }
  return {
    kind: scheduleRoll === 1 ? 'socialize' : 'wander',
    priority: 8,
    roomId: anchorRoomId,
    reason: 'daily-roam-schedule',
  };
}

function resolveSchedulePlace(
  actor: Actor,
  roomTarget: ActorScheduleRoomTarget | undefined,
): { roomId?: string; targetPosition?: { x: number; y: number } } {
  switch (roomTarget) {
    case 'home':
      return {
        roomId: actor.schedule?.homeRoomId ?? actor.homeRoomId,
        targetPosition: actor.schedule?.homePosition,
      };
    case 'work':
      return {
        roomId: actor.schedule?.workRoomId ?? actor.workRoomId,
        targetPosition: actor.schedule?.workPosition,
      };
    case 'sleep':
      return {
        roomId: actor.schedule?.sleepRoomId ?? actor.homeRoomId,
        targetPosition: actor.schedule?.sleepPosition ?? actor.schedule?.homePosition,
      };
    case 'fixedPost':
      return {
        roomId: actor.schedule?.fixedPostRoomId,
        targetPosition: actor.schedule?.fixedPostPosition,
      };
    case 'firstPatrol':
      return { roomId: actor.schedule?.patrolRoomIds?.[0] };
    case 'current':
    case undefined:
      return { roomId: actor.currentRoomId };
  }
}

function fallbackDayPhase(roomNumber: number): DayPhase {
  const phase = Math.abs(roomNumber) % 24;
  if (phase >= 20 || phase < 6) return 'night';
  if (phase >= 6 && phase < 9) return 'dawn';
  if (phase >= 17 && phase < 20) return 'dusk';
  return 'day';
}

export function directionsTowardPosition(
  position: Vector2Like,
  target: Vector2Like,
): readonly Vector2Like[] {
  return [...CARDINAL_DIRECTIONS].sort((a, b) => {
    const aDistance = manhattanDistance({ x: position.x + a.x, y: position.y + a.y }, target);
    const bDistance = manhattanDistance({ x: position.x + b.x, y: position.y + b.y }, target);
    return aDistance - bDistance;
  });
}

export function advanceOffscreenActorTravel(args: {
  actor: Actor;
  loadedRoomId: string;
  roomNumber: number;
}): Actor | null {
  const goalRoomId = args.actor.goal?.roomId;
  if (
    !goalRoomId ||
    goalRoomId === args.actor.currentRoomId ||
    args.actor.currentRoomId === args.loadedRoomId ||
    args.actor.health?.state === 'dead' ||
    args.actor.hostility === 'dead'
  ) {
    return null;
  }
  return {
    ...args.actor,
    currentRoomId: goalRoomId,
    presence: args.actor.presence
      ? {
          ...args.actor.presence,
          roomId: goalRoomId,
          materialized: false,
        }
      : undefined,
    activity: activity('walking', 'schedule', args.roomNumber),
  };
}

export function actorExitTargetForRoom(room: RoomSnapshot, actor: Actor): Vector2Like | undefined {
  const goalRoomId = actor.goal?.roomId;
  if (!goalRoomId || goalRoomId === room.id) {
    return undefined;
  }
  if (room.layer?.exit) {
    return { ...room.layer.exit };
  }
  const entranceToGoal = room.layerEntrances?.find((entry) => entry.layerId === goalRoomId);
  if (entranceToGoal) {
    return { x: entranceToGoal.x, y: entranceToGoal.y };
  }
  const portalToGoal = room.portals.find((portal) => portal.destRoomId === goalRoomId);
  if (portalToGoal) {
    return { x: portalToGoal.x, y: portalToGoal.y };
  }
  return nearestRoomEdge(actor.presence?.position, room.layout[0]?.length ?? 0, room.layout.length);
}

export function shouldDematerializeForActorGoal(
  actor: Actor,
  room: RoomSnapshot,
  position: Vector2Like,
): boolean {
  const target = actorExitTargetForRoom(room, actor);
  return Boolean(target && manhattanDistance(position, target) <= 1 && actor.goal?.roomId);
}

export function findFactionConflictGoals(actors: readonly Actor[]): Array<{
  actorId: string;
  goal: ActorGoal;
  activity: ActorActivity;
  threat: ActorTargetThreat;
}> {
  const updates: Array<{
    actorId: string;
    goal: ActorGoal;
    activity: ActorActivity;
    threat: ActorTargetThreat;
  }> = [];
  const liveActors = actors.filter(
    (actor) =>
      actor.currentRoomId &&
      actor.hostility !== 'dead' &&
      actor.health?.state !== 'dead' &&
      actor.factionId,
  );

  for (const actor of liveActors) {
    const actorFaction = actorPrimaryFaction(actor);
    const target = liveActors.find((candidate) => {
      if (candidate.id === actor.id) return false;
      if (candidate.currentRoomId !== actor.currentRoomId) return false;
      const relation = relationBetweenFactions(actorFaction, actorPrimaryFaction(candidate));
      return relation === 'hostile' || relation === 'war';
    });
    if (!target) {
      continue;
    }
    updates.push({
      actorId: actor.id,
      goal: {
        kind: 'attackActor',
        priority: 90,
        roomId: actor.currentRoomId,
        targetActorId: target.id,
        reason: 'faction-conflict',
      },
      activity: activity(
        actor.combat?.ranged ? 'combat-ranged' : 'combat-melee',
        'combat',
        undefined,
        target.id,
      ),
      threat: {
        targetActorId: target.id,
        source: 'faction',
        reason: 'faction-conflict',
      },
    });
  }

  return updates;
}

export function actorsAreAdjacent(
  a: ActorPresence | undefined,
  b: ActorPresence | undefined,
): boolean {
  return Boolean(
    a && b && a.roomId === b.roomId && manhattanDistance(a.position, b.position) === 1,
  );
}

function activity(
  kind: ActorActivityKind,
  source: ActorActivity['source'],
  roomNumber?: number,
  targetActorId?: string,
): ActorActivity {
  return {
    kind,
    source,
    targetActorId,
    startedAtRoomNumber: roomNumber,
  };
}

function nearestRoomEdge(
  position: Vector2Like | undefined,
  width: number,
  height: number,
): Vector2Like | undefined {
  if (!position || width <= 0 || height <= 0) {
    return undefined;
  }
  const candidates = [
    { x: 1, y: position.y },
    { x: width - 2, y: position.y },
    { x: position.x, y: 1 },
    { x: position.x, y: height - 2 },
  ].filter((candidate) => candidate.x >= 0 && candidate.y >= 0);
  return candidates.sort(
    (a, b) => manhattanDistance(position, a) - manhattanDistance(position, b),
  )[0];
}
