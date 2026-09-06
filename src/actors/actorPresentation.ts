import { getActorActivityProp, getActorSleepMarker } from './actorActivityProps.js';
import { getActorIndicators } from './actorIndicators.js';
import { actorCanSpeakNow } from './actorSpeech.js';
import type { Actor, ActorSpeechBubble } from './actorTypes.js';

interface ActorPresentation {
  activityProp: ReturnType<typeof getActorActivityProp>;
  sleepMarker: ReturnType<typeof getActorSleepMarker>;
  indicators: ReturnType<typeof getActorIndicators>;
  speech: ActorSpeechBubble | undefined;
  canSpeak: boolean;
}

export function getActorPresentation(actor: Actor): ActorPresentation {
  const canSpeak = actorCanSpeakNow(actor);
  return {
    activityProp: getActorActivityProp(actor),
    sleepMarker: getActorSleepMarker(actor),
    indicators: getActorIndicators(actor),
    speech: canSpeak ? actor.speech : undefined,
    canSpeak,
  };
}
