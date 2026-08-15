import type { AtmosphereEffectTag, AtmosphereState } from '../world/atmosphereTypes.js';
import { isTownShopRole } from '../world/townRoles.js';
import type { Actor, ActorActivity, ActorGoal, ActorSpeechBubble } from './actorTypes.js';

export interface ActorEnvironmentContext {
  roomNumber: number;
  atmosphere: AtmosphereState;
  sheltered: boolean;
  effects: readonly AtmosphereEffectTag[];
}

export interface ActorEnvironmentReaction {
  goal?: ActorGoal;
  activity?: ActorActivity;
  speech?: ActorSpeechBubble;
  moodDelta?: {
    fear?: number;
    stress?: number;
    curiosity?: number;
    hunger?: number;
  };
  needsDelta?: {
    safety?: number;
    rest?: number;
    social?: number;
    duty?: number;
  };
  environmentKey: string;
}

export interface ActorRadiantBarkContext {
  roomNumber: number;
  atmosphere: AtmosphereState;
  nowMs?: number;
  random(): number;
}

const WEATHER_SHELTER_PRIORITY = 23;

export function selectActorEnvironmentReaction(
  actor: Actor,
  context: ActorEnvironmentContext,
): ActorEnvironmentReaction | undefined {
  if (actor.health?.state === 'dead' || actor.hostility === 'dead') {
    return undefined;
  }
  const weather = context.atmosphere.globalWeather;
  const dayPhase = context.atmosphere.dayPhase;
  const environmentKey = `${dayPhase}:${weather}:${context.sheltered ? 'sheltered' : 'exposed'}:${context.atmosphere.skyEvent?.current ?? 'none'}`;

  if (context.atmosphere.skyEvent?.current === 'bloodMoon' && !context.sheltered) {
    return {
      goal: actor.hostility === 'hostile' ? undefined : shelterGoal(actor, 'blood-moon-shelter'),
      activity: actor.hostility === 'hostile' ? undefined : shelterActivity(context.roomNumber),
      speech: undefined,
      moodDelta: { fear: 10, stress: 8 },
      needsDelta: { safety: 10 },
      environmentKey,
    };
  }

  if (!context.sheltered && weather === 'storm') {
    return {
      goal:
        actor.role === 'guard' || actor.role === 'gateGuard'
          ? defendCurrentRoomGoal(actor, 'storm-watch')
          : shelterGoal(actor, 'storm-shelter'),
      activity:
        actor.role === 'guard' || actor.role === 'gateGuard'
          ? guardingActivity(context.roomNumber)
          : shelterActivity(context.roomNumber),
      speech: undefined,
      moodDelta: { fear: 5, stress: 10 },
      needsDelta: { safety: 8, duty: actor.role === 'guard' ? 4 : 0 },
      environmentKey,
    };
  }

  if (!context.sheltered && weather === 'heatwave') {
    return {
      goal: shelterGoal(actor, 'heat-shelter'),
      activity: shelterActivity(context.roomNumber),
      speech: undefined,
      moodDelta: { stress: 7, hunger: 3 },
      needsDelta: { safety: 4, rest: 6 },
      environmentKey,
    };
  }

  if (!context.sheltered && weather === 'coldfront') {
    return {
      goal: shelterGoal(actor, 'cold-shelter'),
      activity: shelterActivity(context.roomNumber),
      speech: undefined,
      moodDelta: { stress: 6 },
      needsDelta: { safety: 5, rest: 5 },
      environmentKey,
    };
  }

  if (!context.sheltered && (weather === 'rain' || weather === 'fog')) {
    return {
      goal:
        actor.role === 'guard' || actor.role === 'gateGuard'
          ? undefined
          : softShelterGoal(actor, `${weather}-errand-route`),
      speech: undefined,
      moodDelta: { stress: weather === 'fog' ? 4 : 2, curiosity: weather === 'fog' ? 3 : 1 },
      needsDelta: { social: weather === 'rain' ? 2 : 0 },
      environmentKey,
    };
  }

  if (dayPhase === 'night') {
    return {
      speech: undefined,
      moodDelta:
        actor.role === 'guard' || actor.role === 'gateGuard' ? { stress: 3 } : { stress: 1 },
      needsDelta: actor.role === 'guard' || actor.role === 'gateGuard' ? { duty: 4 } : { rest: 4 },
      environmentKey,
    };
  }

  if (dayPhase === 'dawn') {
    return {
      speech: undefined,
      moodDelta: { curiosity: 2, stress: -1 },
      needsDelta: { rest: -2 },
      environmentKey,
    };
  }

  return {
    moodDelta: { stress: -1 },
    environmentKey,
  };
}

export function selectActorRadiantBark(
  actor: Actor,
  context: ActorRadiantBarkContext,
): ActorSpeechBubble | undefined {
  const chance = radiantBarkChance(actor);
  if (chance <= 0 || context.random() > chance) {
    return undefined;
  }
  const text = radiantBarkText(actor, context.atmosphere);
  return {
    text,
    category: 'ambient',
    createdAtRoomNumber: context.roomNumber,
    expiresAtRoomNumber: context.roomNumber + 1,
    createdAtMs: context.nowMs,
    expiresAtMs:
      context.nowMs === undefined ? undefined : context.nowMs + speechDurationMs(text.length),
  };
}

function speechDurationMs(length: number): number {
  return Math.max(2_000, Math.min(4_000, 1_700 + length * 35));
}

export function radiantBarkChance(actor: Actor): number {
  const explicit = actor.flags.radiantBarkChance;
  if (typeof explicit === 'number') {
    return Math.max(0, Math.min(1, explicit));
  }
  if (actor.role === 'gateGuard' || actor.role === 'guard') return 0.18;
  if (isTownShopRole(actor.role)) return 0.12;
  if (actor.role === 'questGiver') return 0.08;
  if (actor.kind === 'wanderer') return 0.28;
  return 0.1;
}

function shelterGoal(actor: Actor, reason: string): ActorGoal {
  return {
    kind: actor.homeRoomId ? 'goHome' : 'travelToRoom',
    priority: WEATHER_SHELTER_PRIORITY,
    roomId: actor.homeRoomId ?? actor.workRoomId ?? actor.currentRoomId,
    reason,
  };
}

function softShelterGoal(actor: Actor, reason: string): ActorGoal | undefined {
  const destination = isTownShopRole(actor.role)
    ? (actor.workRoomId ?? actor.homeRoomId)
    : (actor.homeRoomId ?? actor.workRoomId);
  if (!destination || destination === actor.currentRoomId) {
    return undefined;
  }
  return {
    kind: 'travelToRoom',
    priority: 11,
    roomId: destination,
    reason,
  };
}

function defendCurrentRoomGoal(actor: Actor, reason: string): ActorGoal {
  return {
    kind: 'defendArea',
    priority: WEATHER_SHELTER_PRIORITY,
    roomId: actor.currentRoomId,
    reason,
  };
}

function shelterActivity(roomNumber: number): ActorActivity {
  return { kind: 'sheltering', source: 'schedule', startedAtRoomNumber: roomNumber };
}

function guardingActivity(roomNumber: number): ActorActivity {
  return { kind: 'guarding', source: 'schedule', startedAtRoomNumber: roomNumber };
}

function radiantBarkText(actor: Actor, atmosphere: AtmosphereState): string {
  if (atmosphere.globalWeather === 'storm') {
    return actor.role === 'guard' || actor.role === 'gateGuard'
      ? 'Storm watch. Keep moving.'
      : 'I am getting under a roof.';
  }
  if (atmosphere.globalWeather === 'fog') return 'Fog makes liars useful.';
  if (atmosphere.globalWeather === 'rain') return 'Rain changes where people talk.';
  if (atmosphere.globalWeather === 'heatwave') return 'Too hot to loiter.';
  if (atmosphere.globalWeather === 'coldfront') return 'Cold like this keeps receipts.';
  if (atmosphere.dayPhase === 'dawn') return 'Dawn makes everybody look innocent.';
  if (atmosphere.dayPhase === 'night') return nightSpeech(actor);
  return 'Town is quiet. That never lasts.';
}

function nightSpeech(actor: Actor): string {
  if (actor.role === 'guard' || actor.role === 'gateGuard') {
    return 'Night watch is where trouble gets honest.';
  }
  if (isTownShopRole(actor.role)) {
    return 'Shop is closed. Even coin sleeps sometimes.';
  }
  if (actor.personality.includes('criminal')) {
    return 'Night opens doors that day keeps judging.';
  }
  return 'I am heading in before the dark gets ideas.';
}
