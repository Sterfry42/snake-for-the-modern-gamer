import { describe, expect, it } from 'vitest';
import { createBaseActor } from '../actorFactory.js';
import { getActorActivityProp } from '../actorActivityProps.js';
import { selectActorEnvironmentReaction, selectActorRadiantBark } from '../actorEnvironment.js';
import { findActorGridPath } from '../actorNavigation.js';
import { decideActorBrain } from '../actorBrains.js';
import {
  ActorOccupancyResolver,
  actorExitTargetForRoom,
  actorsAreAdjacent,
  advanceOffscreenActorTravel,
  createActorPresence,
  directionsTowardPosition,
  findFactionConflictGoals,
  inferActorActivity,
  selectScheduleGoal,
} from '../actorPresence.js';
import { ActorRegistry } from '../actorRegistry.js';
import type { Actor } from '../actorTypes.js';
import type { AtmosphereState } from '../../world/atmosphereTypes.js';
import type { RoomSnapshot } from '../../world/types.js';

describe('actor presence simulation', () => {
  it('prevents two materialized actors from reserving the same tile', () => {
    const resolver = new ActorOccupancyResolver([
      { id: 'actor:a', position: { x: 2, y: 2 }, blocksMovement: true },
      { id: 'actor:b', position: { x: 4, y: 2 }, blocksMovement: true },
    ]);

    const first = resolver.resolveMove({
      actorId: 'actor:a',
      current: { x: 2, y: 2 },
      preferredDirections: [{ x: 1, y: 0 }],
      canStandAt: () => true,
    });
    const second = resolver.resolveMove({
      actorId: 'actor:b',
      current: { x: 4, y: 2 },
      preferredDirections: [{ x: -1, y: 0 }],
      canStandAt: () => true,
    });

    expect(first.to).toEqual({ x: 3, y: 2 });
    expect(second.to).toEqual({ x: 4, y: 2 });
  });

  it('treats adjacent social actors as talking instead of stacking on the target', () => {
    const source = actor('actor:source', 'hearthbound-remnant');
    const target = actor('actor:target', 'hearthbound-remnant');
    source.presence = createActorPresence({ roomId: '0,0,0', position: { x: 3, y: 3 } });
    target.presence = createActorPresence({ roomId: '0,0,0', position: { x: 4, y: 3 } });

    const activity = inferActorActivity({
      actor: source,
      decision: {
        kind: 'approachSocialLink',
        preferredDirections: [{ x: 1, y: 0 }],
        moveCooldown: 1,
        targetActorId: target.id,
      },
      targetAdjacent: actorsAreAdjacent(source.presence, target.presence),
    });

    expect(activity.kind).toBe('talking');
    expect(activity.targetActorId).toBe(target.id);
  });

  it('creates faction attack goals when hostile factions share a room', () => {
    const goblin = actor('actor:goblin', 'goblin-camps');
    const bandit = actor('actor:bandit', 'bandits');
    goblin.currentRoomId = '0,0,0';
    bandit.currentRoomId = '0,0,0';

    const updates = findFactionConflictGoals([goblin, bandit]);

    expect(updates.map((update) => update.actorId)).toEqual(['actor:goblin', 'actor:bandit']);
    expect(updates[0]?.goal.kind).toBe('attackActor');
    expect(updates[0]?.activity.kind).toBe('combat-ranged');
    expect(updates[0]?.threat).toMatchObject({
      targetActorId: 'actor:bandit',
      reason: 'faction-conflict',
      source: 'faction',
    });
  });

  it('selects day and night schedule goals without moving actors directly', () => {
    const merchant = actor('actor:merchant', 'hearthbound-remnant');
    merchant.role = 'shopkeeper';
    merchant.homeRoomId = 'home-room';
    merchant.workRoomId = 'work-room';

    expect(selectScheduleGoal(merchant, 12)).toMatchObject({
      kind: 'work',
      roomId: 'work-room',
    });
    expect(selectScheduleGoal(merchant, 23)).toMatchObject({
      kind: 'sleep',
      roomId: 'home-room',
    });
    expect(selectScheduleGoal(merchant, { roomNumber: 1, dayPhase: 'night' })).toMatchObject({
      kind: 'sleep',
      roomId: 'home-room',
    });
  });

  it('resolves content-authored routines without assuming a town role', () => {
    const rabbit = actor('actor:rabbit', 'wildlife.prey');
    rabbit.role = 'animalPrey';
    rabbit.schedule = {
      policyId: 'rabbit',
      routines: {
        day: { behavior: 'forage', goalKind: 'wander', priority: 8, roomTarget: 'current' },
        night: { behavior: 'hide', goalKind: 'sleep', priority: 18, roomTarget: 'current' },
      },
    };

    expect(selectScheduleGoal(rabbit, { roomNumber: 1, dayPhase: 'day' })).toMatchObject({
      kind: 'wander',
      roomId: rabbit.currentRoomId,
      reason: 'schedule:forage',
    });
    expect(selectScheduleGoal(rabbit, { roomNumber: 1, dayPhase: 'night' })).toMatchObject({
      kind: 'sleep',
      reason: 'schedule:hide',
    });
  });

  it('reacts to exposed storm weather by sheltering civilians without forcing mass speech', () => {
    const resident = actor('actor:resident', 'hearthbound-remnant');
    resident.homeRoomId = 'home-room';

    const reaction = selectActorEnvironmentReaction(resident, {
      roomNumber: 12,
      atmosphere: atmosphere({ dayPhase: 'dusk', globalWeather: 'storm' }),
      sheltered: false,
      effects: ['storm-charged'],
    });

    expect(reaction?.goal).toMatchObject({
      kind: 'goHome',
      roomId: 'home-room',
      reason: 'storm-shelter',
    });
    expect(reaction?.activity?.kind).toBe('sheltering');
    expect(reaction?.speech).toBeUndefined();
  });

  it('reacts to night differently for guards than ordinary residents', () => {
    const guard = actor('actor:guard', 'hearthbound-remnant');
    guard.role = 'guard';
    const resident = actor('actor:resident', 'hearthbound-remnant');

    const context = {
      roomNumber: 22,
      atmosphere: atmosphere({ dayPhase: 'night', globalWeather: 'clear' }),
      sheltered: false,
      effects: ['night-active'] as const,
    };

    expect(selectActorEnvironmentReaction(guard, context)?.needsDelta?.duty).toBeGreaterThan(0);
    expect(selectActorEnvironmentReaction(resident, context)?.needsDelta?.rest).toBeGreaterThan(0);
  });

  it('selects radiant barks separately from direct environment reactions', () => {
    const resident = actor('actor:barker', 'hearthbound-remnant');
    resident.flags.radiantBarkChance = 1;

    const bark = selectActorRadiantBark(resident, {
      roomNumber: 12,
      atmosphere: atmosphere({ dayPhase: 'dawn', globalWeather: 'clear' }),
      nowMs: 500,
      random: () => 0,
    });

    expect(bark).toMatchObject({
      category: 'ambient',
      text: 'Dawn makes everybody look innocent.',
      createdAtMs: 500,
    });
    expect(bark?.expiresAtMs).toBeGreaterThan(2_000);
  });

  it('queries materialized room membership from actor presence rather than authored room', () => {
    const registry = new ActorRegistry();
    const resident = actor('actor:alice', 'hearthbound-remnant');
    resident.currentRoomId = 'market-square';
    resident.presence = createActorPresence({
      roomId: 'back-alley',
      position: { x: 4, y: 5 },
    });

    registry.upsert(resident);

    expect(registry.getByRoom('market-square')).toEqual([]);
    expect(registry.getByRoom('back-alley').map((entry) => entry.id)).toEqual(['actor:alice']);
  });

  it('lets stationary actors choose adjacent bonded social behavior instead of holding early', () => {
    const guard = actor('actor:guard', 'hearthbound-remnant');
    guard.role = 'gateGuard';
    guard.relationships = [{ actorId: 'actor:sibling', relationship: 'family', strength: 90 }];
    const decision = decideActorBrain({
      actor: guard,
      body: {
        relationshipId: 'guard',
        actorId: guard.id,
        position: { x: 5, y: 5 },
        anchor: { x: 5, y: 5 },
        stationary: true,
        wanderRadius: 0,
      },
      threats: [],
      socialTargets: [
        {
          actorId: 'actor:sibling',
          position: { x: 6, y: 5 },
          relationship: 'family',
          strength: 90,
        },
      ],
      random: () => 0,
    });

    expect(decision.kind).toBe('approachSocialLink');
    expect(decision.preferredDirections).toEqual([{ x: 0, y: 0 }]);
  });

  it('keeps permanent-duty guards assigned to their post at night', () => {
    const guard = actor('actor:gate', 'hearthbound-remnant');
    guard.role = 'gateGuard';
    guard.schedule = {
      permanentDuty: true,
      fixedPostRoomId: 'gate-room',
      fixedPostPosition: { x: 2, y: 8 },
    };

    expect(selectScheduleGoal(guard, { roomNumber: 23, dayPhase: 'night' })).toMatchObject({
      kind: 'defendArea',
      roomId: 'gate-room',
      targetPosition: { x: 2, y: 8 },
      reason: 'permanent-duty-schedule',
    });
  });

  it('finds a reusable grid path around blocking tiles', () => {
    const blocked = new Set(['1,0', '1,1']);
    const path = findActorGridPath({
      start: { x: 0, y: 0 },
      goals: [{ x: 2, y: 0 }],
      canStandAt: (position) =>
        position.x >= 0 &&
        position.y >= 0 &&
        position.x <= 3 &&
        position.y <= 3 &&
        !blocked.has(`${position.x},${position.y}`),
    });

    expect(path?.path[path.path.length - 1]).toEqual({ x: 2, y: 0 });
    expect(path?.path.some((position) => blocked.has(`${position.x},${position.y}`))).toBe(false);
    expect(path!.path.length).toBeGreaterThan(3);
  });

  it('selects real activity props from canonical actor activity', () => {
    const merchant = actor('actor:merchant', 'hearthbound-remnant');
    merchant.activity = { kind: 'merchant', source: 'schedule' };

    const prop = getActorActivityProp(merchant);

    expect(prop).toMatchObject({
      kind: 'merchant-bag',
      anchor: 'bottom-right',
      maxTileWidth: 0.5,
      maxTileHeight: 0.5,
    });
  });

  it('advances offscreen actors to their scheduled goal room without materializing them', () => {
    const traveler = actor('actor:traveler', 'hearthbound-remnant');
    traveler.currentRoomId = 'town-square';
    traveler.goal = {
      kind: 'work',
      priority: 18,
      roomId: 'layer:townInterior:town-1:generalStore',
      reason: 'day-schedule',
    };
    traveler.presence = createActorPresence({
      roomId: 'town-square',
      position: { x: 3, y: 3 },
    });

    const traveled = advanceOffscreenActorTravel({
      actor: traveler,
      loadedRoomId: 'another-room',
      roomNumber: 12,
    });

    expect(traveled).toMatchObject({
      currentRoomId: 'layer:townInterior:town-1:generalStore',
      activity: { kind: 'walking', source: 'schedule' },
    });
    expect(traveled?.presence).toMatchObject({
      roomId: 'layer:townInterior:town-1:generalStore',
      materialized: false,
    });
  });

  it('targets matching layer entrances before fallback edges for room travel', () => {
    const traveler = actor('actor:shopkeep', 'hearthbound-remnant');
    traveler.currentRoomId = 'town-market';
    traveler.presence = createActorPresence({ roomId: 'town-market', position: { x: 4, y: 4 } });
    traveler.goal = {
      kind: 'work',
      priority: 18,
      roomId: 'layer:townInterior:town-1:generalStore',
      reason: 'day-schedule',
    };
    const room: RoomSnapshot = {
      id: 'town-market',
      layout: ['..........', '..........', '..........'],
      portals: [],
      biomeId: 'verdigris-basin',
      biomeTitle: 'Verdigris Basin',
      backgroundColor: 0,
      wallColor: 0,
      wallOutlineColor: 0,
      layerEntrances: [
        {
          id: 'store-door',
          x: 7,
          y: 1,
          layerId: 'layer:townInterior:town-1:generalStore',
          parentRoomId: 'town-market',
          label: 'Store',
          kind: 'townInterior',
          templateId: 'generalStore',
          returnPosition: { x: 7, y: 2 },
        },
      ],
    };

    expect(actorExitTargetForRoom(room, traveler)).toEqual({ x: 7, y: 1 });
    expect(directionsTowardPosition({ x: 4, y: 4 }, { x: 7, y: 1 })[0]).toEqual({
      x: 1,
      y: 0,
    });
  });
});

function actor(id: string, factionId: string): Actor {
  return createBaseActor({
    id,
    kind: 'civilian',
    role: 'resident',
    species: factionId === 'goblin-camps' ? 'goblin' : 'human',
    thickness: 'medium',
    displayName: id,
    factionId,
    currentRoomId: '0,0,0',
    health: { current: 3, max: 3, state: 'healthy' },
    combat: {
      armed: true,
      ranged: true,
      melee: true,
      canBeEatenWhenHostile: true,
    },
    hostility: 'neutral',
  });
}

function atmosphere(
  overrides: Partial<Pick<AtmosphereState, 'dayPhase' | 'globalWeather'>>,
): AtmosphereState {
  return {
    worldDay: 0,
    season: 'spring',
    dayPhase: overrides.dayPhase ?? 'day',
    phaseProgress: 0,
    globalWeather: overrides.globalWeather ?? 'clear',
    weatherIntensity: 0.9,
    remainingWeatherPhaseTicks: 2,
    weatherSeed: 1,
    weatherTransitionProgress: 1,
    skyEvent: {
      current: 'none',
      remainingPhaseTicks: 0,
      intensity: 0,
      seed: 1,
    },
  };
}
