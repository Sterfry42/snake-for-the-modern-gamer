/**
 * Actor Brains
 */
import type { Vector2Like } from '../core/math.js';
import type { Actor, ActorMemory, ActorRole } from './actorTypes.js';
import { isStationaryTownRole, isTownGuardRole } from '../world/townRoles.js';

export type ActorBrainIntentKind =
  | 'hold'
  | 'wander'
  | 'fleeThreat'
  | 'approachSocialLink'
  | 'shareRumor';

export interface ActorBrainBodySnapshot {
  relationshipId: string;
  actorId?: string;
  position: Vector2Like;
  anchor: Vector2Like;
  stationary: boolean;
  wanderRadius: number;
}

export interface ActorBrainSocialTarget {
  actorId: string;
  position: Vector2Like;
  relationship: string;
  knownToPlayer?: boolean;
}

export interface ActorBrainContext {
  actor?: Actor;
  body: ActorBrainBodySnapshot;
  threats: readonly Vector2Like[];
  socialTargets: readonly ActorBrainSocialTarget[];
  roomDangerActive?: boolean;
  random(): number;
}

export interface ActorBrainDecision {
  kind: ActorBrainIntentKind;
  preferredDirections: Vector2Like[];
  moveCooldown: number;
  memoryToShare?: ActorMemory;
  targetActorId?: string;
}

const HOLD: Vector2Like = { x: 0, y: 0 };
const CARDINAL_DIRECTIONS: Vector2Like[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function decideActorBrain(context: ActorBrainContext): ActorBrainDecision {
  const actor = context.actor;
  const fear = actor?.mood.fear ?? 0;
  const stress = actor?.mood.stress ?? 0;
  const isAnchored =
    context.body.stationary ||
    (actor ? isStationaryTownRole(actor.role) || actor.role === 'goblinMerchant' : false);
  const isHostile =
    actor?.hostility === 'hostile' ||
    actor?.hostility === 'fleeing' ||
    actor?.hostility === 'surrendering' ||
    actor?.hostility === 'downed';
  const shouldFlee =
    context.threats.length > 0 &&
    !isHostile &&
    !isCombatDutyRole(actor?.role) &&
    (context.roomDangerActive || fear >= 30 || stress >= 30 || actor?.flags.raidShelter === true);

  if (shouldFlee) {
    return {
      kind: 'fleeThreat',
      preferredDirections: directionsAwayFromNearest(context.body.position, context.threats),
      moveCooldown: 1 + Math.floor(context.random() * 2),
    };
  }

  if (isAnchored && !isHostile) {
    return {
      kind: 'hold',
      preferredDirections: [HOLD],
      moveCooldown: 6 + Math.floor(context.random() * 6),
    };
  }

  const shareableMemory = actor ? chooseShareableMemory(actor) : undefined;
  const gossipTarget = chooseNearbySocialTarget(context);
  if (shareableMemory && gossipTarget && context.random() < 0.35) {
    return {
      kind: 'shareRumor',
      preferredDirections: [HOLD],
      moveCooldown: 4 + Math.floor(context.random() * 4),
      memoryToShare: shareableMemory,
      targetActorId: gossipTarget.actorId,
    };
  }

  const socialTarget = chooseNearbySocialTarget(context);
  if (!context.roomDangerActive && socialTarget && context.random() < 0.25) {
    return {
      kind: 'approachSocialLink',
      preferredDirections: directionsToward(context.body.position, socialTarget.position),
      moveCooldown: 4 + Math.floor(context.random() * 4),
      targetActorId: socialTarget.actorId,
    };
  }

  return {
    kind: 'wander',
    preferredDirections: shuffleDirections([HOLD, ...CARDINAL_DIRECTIONS], context.random),
    moveCooldown: isHostile
      ? 2 + Math.floor(context.random() * 2)
      : 5 + Math.floor(context.random() * 7),
  };
}

export function chooseShareableMemory(actor: Actor): ActorMemory | undefined {
  return [...actor.memory]
    .reverse()
    .find(
      (memory) =>
        memory.intensity >= 18 &&
        !memory.tags.includes('conversation') &&
        !memory.tags.includes('actor-asked-around') &&
        (memory.source === 'rumor' ||
          memory.source === 'heard' ||
          memory.tags.includes('rumor') ||
          memory.tags.includes('raid') ||
          memory.tags.includes('crime') ||
          memory.tags.includes('humanoid')),
    );
}

function chooseNearbySocialTarget(context: ActorBrainContext): ActorBrainSocialTarget | undefined {
  const actor = context.actor;
  if (!actor || context.socialTargets.length === 0) {
    return undefined;
  }
  const linked = context.socialTargets
    .map((target) => ({
      target,
      link: actor.relationships.find((relationship) => relationship.actorId === target.actorId),
      distance: manhattanDistance(context.body.position, target.position),
    }))
    .filter((entry) => entry.link && entry.distance <= 4)
    .sort((a, b) => b.link!.strength - a.link!.strength || a.distance - b.distance);
  return linked[0]?.target;
}

function isCombatDutyRole(role: ActorRole | undefined): boolean {
  return Boolean(role && isTownGuardRole(role)) || role === 'bandit' || role === 'duelist';
}

function directionsAwayFromNearest(
  position: Vector2Like,
  threats: readonly Vector2Like[],
): Vector2Like[] {
  const nearest = threats
    .map((threat) => ({ threat, distance: manhattanDistance(position, threat) }))
    .sort((a, b) => a.distance - b.distance)[0]?.threat;
  if (!nearest) {
    return [HOLD];
  }
  return [...CARDINAL_DIRECTIONS]
    .sort((a, b) => {
      const aDistance = manhattanDistance({ x: position.x + a.x, y: position.y + a.y }, nearest);
      const bDistance = manhattanDistance({ x: position.x + b.x, y: position.y + b.y }, nearest);
      return bDistance - aDistance;
    })
    .concat(HOLD);
}

function directionsToward(position: Vector2Like, target: Vector2Like): Vector2Like[] {
  return [...CARDINAL_DIRECTIONS]
    .sort((a, b) => {
      const aDistance = manhattanDistance({ x: position.x + a.x, y: position.y + a.y }, target);
      const bDistance = manhattanDistance({ x: position.x + b.x, y: position.y + b.y }, target);
      return aDistance - bDistance;
    })
    .concat(HOLD);
}

function shuffleDirections(
  directions: readonly Vector2Like[],
  random: () => number,
): Vector2Like[] {
  return directions
    .map((direction) => ({ direction, roll: random() }))
    .sort((a, b) => a.roll - b.roll)
    .map((entry) => entry.direction);
}

function manhattanDistance(a: Vector2Like, b: Vector2Like): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
