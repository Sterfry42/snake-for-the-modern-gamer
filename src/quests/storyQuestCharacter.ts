import type { Actor } from '../actors/actorTypes.js';

/**
 * A quest remembers the person who performed the verb, not just its payout.
 * Keep this bounded: many conversations may happen to the same persistent NPC.
 */
export interface StoryActorResponse {
  trust?: number;
  respect?: number;
  resentment?: number;
}

export function rememberStoryChoice(
  actor: Actor,
  args: {
    questId: string;
    actionKey: string;
    summary: string;
    roomId: string;
    roomNumber: number;
    response?: StoryActorResponse;
  },
): Actor {
  const response = args.response;
  const previous = actor.opinions.player;
  const clamp = (value: number) => Math.max(-100, Math.min(100, value));
  const memoryId = `story:${args.questId}:${args.actionKey}:${actor.id}`;
  return {
    ...actor,
    mood: response?.trust
      ? { ...actor.mood, trust: clamp(actor.mood.trust + response.trust) }
      : actor.mood,
    opinions: response
      ? {
          ...actor.opinions,
          player: {
            targetId: 'player',
            trust: clamp((previous?.trust ?? 0) + (response.trust ?? 0)),
            respect: clamp((previous?.respect ?? 0) + (response.respect ?? 0)),
            resentment: clamp((previous?.resentment ?? 0) + (response.resentment ?? 0)),
            fear: previous?.fear ?? 0,
            affection: previous?.affection ?? 0,
            attraction: previous?.attraction ?? 0,
            debt: previous?.debt ?? 0,
          },
        }
      : actor.opinions,
    memory: [
      ...actor.memory.filter((memory) => memory.id !== memoryId).slice(-31),
      {
        id: memoryId,
        type: 'quest-story',
        summary: args.summary,
        source: 'personal',
        intensity: args.actionKey === 'decline' ? 8 : 35,
        roomId: args.roomId,
        targetActorIds: [actor.id],
        tags: ['quest', 'story', args.questId, args.actionKey],
        createdAtRoomNumber: args.roomNumber,
      },
    ],
  };
}
