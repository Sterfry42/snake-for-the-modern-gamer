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
  const canReactWithSpeech = actor.flags.lastEnvironmentReactionKey !== environmentKey;

  if (context.atmosphere.skyEvent?.current === 'bloodMoon' && !context.sheltered) {
    return {
      goal: actor.hostility === 'hostile' ? undefined : shelterGoal(actor, 'blood-moon-shelter'),
      activity: actor.hostility === 'hostile' ? undefined : shelterActivity(context.roomNumber),
      speech: canReactWithSpeech
        ? speech('That moon has teeth tonight.', context.roomNumber)
        : undefined,
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
      speech: canReactWithSpeech
        ? speech(
            actor.role === 'guard' || actor.role === 'gateGuard'
              ? 'Storm watch. Keep moving.'
              : 'I am getting under a roof.',
            context.roomNumber,
          )
        : undefined,
      moodDelta: { fear: 5, stress: 10 },
      needsDelta: { safety: 8, duty: actor.role === 'guard' ? 4 : 0 },
      environmentKey,
    };
  }

  if (!context.sheltered && weather === 'heatwave') {
    return {
      goal: shelterGoal(actor, 'heat-shelter'),
      activity: shelterActivity(context.roomNumber),
      speech: canReactWithSpeech ? speech('Too hot to loiter.', context.roomNumber) : undefined,
      moodDelta: { stress: 7, hunger: 3 },
      needsDelta: { safety: 4, rest: 6 },
      environmentKey,
    };
  }

  if (!context.sheltered && weather === 'coldfront') {
    return {
      goal: shelterGoal(actor, 'cold-shelter'),
      activity: shelterActivity(context.roomNumber),
      speech: canReactWithSpeech
        ? speech('Cold like this keeps receipts.', context.roomNumber)
        : undefined,
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
      speech: canReactWithSpeech
        ? speech(
            weather === 'fog' ? 'Fog makes liars useful.' : 'Rain changes where people talk.',
            context.roomNumber,
          )
        : undefined,
      moodDelta: { stress: weather === 'fog' ? 4 : 2, curiosity: weather === 'fog' ? 3 : 1 },
      needsDelta: { social: weather === 'rain' ? 2 : 0 },
      environmentKey,
    };
  }

  if (dayPhase === 'night') {
    return {
      speech: canReactWithSpeech ? speech(nightSpeech(actor), context.roomNumber) : undefined,
      moodDelta:
        actor.role === 'guard' || actor.role === 'gateGuard' ? { stress: 3 } : { stress: 1 },
      needsDelta: actor.role === 'guard' || actor.role === 'gateGuard' ? { duty: 4 } : { rest: 4 },
      environmentKey,
    };
  }

  if (dayPhase === 'dawn') {
    return {
      speech: canReactWithSpeech
        ? speech('Dawn makes everybody look innocent.', context.roomNumber)
        : undefined,
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

function speech(text: string, roomNumber: number): ActorSpeechBubble {
  return {
    text,
    createdAtRoomNumber: roomNumber,
    expiresAtRoomNumber: roomNumber + 1,
  };
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
