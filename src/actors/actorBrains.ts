/**
 * Actor Brains
 */
import { CARDINAL_DIRECTIONS, manhattanDistance, shuffle, type Vector2Like } from '../core/math.js';
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
  strength?: number;
  hasRumorOpportunity?: boolean;
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
    actor?.hostility === 'surrendering';
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

  const shareableMemory = actor ? chooseShareableMemory(actor) : undefined;
  const gossipTarget = chooseNearbySocialTarget(context, {
    requireAdjacent: isAnchored,
    preferRumorOpportunity: true,
  });
  if (shareableMemory && gossipTarget && context.random() < 0.35) {
    return {
      kind: 'shareRumor',
      preferredDirections: [HOLD],
      moveCooldown: 4 + Math.floor(context.random() * 4),
      memoryToShare: shareableMemory,
      targetActorId: gossipTarget.actorId,
    };
  }

  const socialTarget = chooseNearbySocialTarget(context, { requireAdjacent: isAnchored });
  if (!context.roomDangerActive && socialTarget && context.random() < 0.25) {
    return {
      kind: 'approachSocialLink',
      preferredDirections: isAnchored
        ? [HOLD]
        : directionsToward(context.body.position, socialTarget.position),
      moveCooldown: 4 + Math.floor(context.random() * 4),
      targetActorId: socialTarget.actorId,
    };
  }

  if (isAnchored && !isHostile) {
    return {
      kind: 'hold',
      preferredDirections: [HOLD],
      moveCooldown: 6 + Math.floor(context.random() * 6),
    };
  }

  return {
    kind: 'wander',
    preferredDirections: shuffle(context.random, [HOLD, ...CARDINAL_DIRECTIONS]),
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

function chooseNearbySocialTarget(
  context: ActorBrainContext,
  options: { requireAdjacent?: boolean; preferRumorOpportunity?: boolean } = {},
): ActorBrainSocialTarget | undefined {
  const actor = context.actor;
  if (!actor || context.socialTargets.length === 0) {
    return undefined;
  }
  const scored = context.socialTargets
    .map((target) => ({
      target,
      link: actor.relationships.find((relationship) => relationship.actorId === target.actorId),
      distance: manhattanDistance(context.body.position, target.position),
    }))
    .filter((entry) => entry.distance <= (options.requireAdjacent ? 1 : 5))
    .map((entry) => {
      const strength = entry.link?.strength ?? entry.target.strength ?? 0;
      const relationshipBonus =
        entry.link?.relationship === 'family' || entry.link?.relationship === 'spouse'
          ? 25
          : entry.link?.relationship === 'friend' || entry.link?.relationship === 'lover'
            ? 16
            : entry.link?.relationship === 'factionAlly'
              ? 8
              : 0;
      const rumorBonus =
        options.preferRumorOpportunity && entry.target.hasRumorOpportunity ? 35 : 0;
      const casualBonus = entry.link ? 0 : 4;
      return {
        ...entry,
        score: strength + relationshipBonus + rumorBonus + casualBonus - entry.distance * 4,
      };
    })
    .filter((entry) => entry.score > 0 || (!options.preferRumorOpportunity && entry.distance <= 2))
    .sort((a, b) => b.score - a.score || a.distance - b.distance);
  return scored[0]?.target;
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
