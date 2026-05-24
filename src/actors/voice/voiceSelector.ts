import { ASK_AROUND_VOICE } from './voicePacks/askAroundVoice.js';
import { ASK_PERSONAL_VOICE } from './voicePacks/askPersonalVoice.js';
import {
  DEEP_ASK_AROUND_VOICE,
  DEEP_ASK_PERSONAL_VOICE,
  DEEP_TALK_VOICE,
} from './voicePacks/deepVoice.js';
import {
  EXPANDED_ASK_AROUND_VOICE,
  EXPANDED_ASK_PERSONAL_VOICE,
  EXPANDED_TALK_VOICE,
} from './voicePacks/expandedVoice.js';
import { TALK_VOICE } from './voicePacks/talkVoice.js';
import type {
  ActorConversationContext,
  ActorConversationResult,
  ActorVoiceEntry,
  ActorVoiceSource,
  PlayerHealthBand,
  SnakeLengthBand,
} from './voiceTypes.js';
import type { WorldEventType } from '../../events/worldEventTypes.js';

const ALL_VOICE_ENTRIES: readonly ActorVoiceEntry[] = [
  ...TALK_VOICE,
  ...EXPANDED_TALK_VOICE,
  ...DEEP_TALK_VOICE,
  ...ASK_AROUND_VOICE,
  ...EXPANDED_ASK_AROUND_VOICE,
  ...DEEP_ASK_AROUND_VOICE,
  ...ASK_PERSONAL_VOICE,
  ...EXPANDED_ASK_PERSONAL_VOICE,
  ...DEEP_ASK_PERSONAL_VOICE,
];

export function selectActorConversation(
  context: ActorConversationContext,
): ActorConversationResult {
  const valid = ALL_VOICE_ENTRIES.filter((entry) => isEntryValid(entry, context));
  const fallback =
    ALL_VOICE_ENTRIES.find((entry) => entry.bucket === context.bucket && entry.source === 'fallback') ??
    ALL_VOICE_ENTRIES[ALL_VOICE_ENTRIES.length - 1];
  const pool = valid.length > 0 ? valid : fallback ? [fallback] : [];
  const scored = pool.map((entry) => ({ entry, score: entry.priority + priorityBonus(entry, context) }));
  const highest = Math.max(...scored.map((item) => item.score));
  const closeEnough = context.bucket === 'ask-around' ? 8 : 0;
  const best = scored
    .filter((item) => item.score >= highest - closeEnough)
    .map((item) => item.entry);
  const recentIds = recentConversationIds(context);
  const fresh = best.filter((entry) => !recentIds.includes(entry.id));
  const rotationPool = fresh.length > 0 ? fresh : best.filter((entry) => entry.id !== recentIds[0]);
  const candidates = rotationPool.length > 0 ? rotationPool : best;
  const random = context.random ?? Math.random;
  const selected = candidates[Math.floor(random() * candidates.length)] ?? candidates[0] ?? best[0] ?? fallback!;
  return materialize(selected, context);
}

function recentConversationIds(context: ActorConversationContext): string[] {
  const recentKey = `actor.conversation.recent.${context.actor.id}.${context.bucket}`;
  const recent = context.flags[recentKey];
  const last = context.flags[`actor.conversation.last.${context.actor.id}.${context.bucket}`];
  const ids = Array.isArray(recent) ? recent.filter((item): item is string => typeof item === 'string') : [];
  if (typeof last === 'string' && !ids.includes(last)) {
    ids.unshift(last);
  }
  return ids;
}

function isEntryValid(entry: ActorVoiceEntry, context: ActorConversationContext): boolean {
  const { actor } = context;
  if (entry.bucket !== context.bucket) return false;
  if (entry.roles && !entry.roles.includes(actor.role)) return false;
  if (entry.kinds && !entry.kinds.includes(actor.kind)) return false;
  if (entry.species && !entry.species.includes(actor.species)) return false;
  if (entry.biomeIds && !entry.biomeIds.includes(context.biomeId)) return false;
  if (entry.minDangerLevel !== undefined && context.dangerLevel < entry.minDangerLevel) return false;
  if (entry.maxDangerLevel !== undefined && context.dangerLevel > entry.maxDangerLevel) return false;
  if (entry.factions && (!actor.factionId || !entry.factions.includes(String(actor.factionId)))) return false;
  if (entry.personalityTags && !entry.personalityTags.some((tag) => actor.personality.includes(tag))) return false;
  if (entry.hostility && !entry.hostility.includes(actor.hostility)) return false;
  if (entry.attitudes && !entry.attitudes.includes(resolveAttitude(context))) return false;
  if (entry.relationshipStages && (!context.relationship || !entry.relationshipStages.includes(context.relationship.stage))) return false;
  if (entry.snakeLengthBands && !entry.snakeLengthBands.includes(snakeLengthBand(context.snakeLength))) return false;
  if (entry.healthBands && !entry.healthBands.includes(healthBand(context))) return false;
  if (entry.memoryTags && !actor.memory.some((memory) => entry.memoryTags?.every((tag) => memory.tags.includes(tag)))) return false;
  if (
    entry.worldEventTypes &&
    !actor.memory.some((memory) => entry.worldEventTypes?.includes(memory.type as WorldEventType))
  ) {
    return false;
  }
  if (entry.factionStates && !context.factionEvents.some((event) => entry.factionStates?.includes(event.relation))) return false;
  if (entry.townMoodTags?.includes('wanted') && (context.town?.wantedLevel ?? 0) <= 0) return false;
  if (entry.minFocus !== undefined && (actor.focus ?? 0) < entry.minFocus) return false;
  if (entry.maxFocus !== undefined && (actor.focus ?? 0) > entry.maxFocus) return false;
  if (entry.requiresSoul && !hasSoulRequirement(entry.requiresSoul, context)) return false;
  if (entry.requiresLore && !hasLoreRequirement(entry.requiresLore, context)) return false;
  if (entry.socialLinkKinds && (!context.socialLink || !entry.socialLinkKinds.includes(context.socialLink.relationship))) return false;
  if (entry.source === 'rumor' && context.rumors.length === 0 && !entry.memoryTags) return false;
  return true;
}

function priorityBonus(entry: ActorVoiceEntry, context: ActorConversationContext): number {
  let bonus = 0;
  if (entry.source === 'rumor' && context.rumors.length > 0) bonus += Math.min(18, context.rumors[0]?.severity ?? 0);
  if (entry.source === 'faction' && context.factionEvents.length > 0) bonus += Math.min(16, context.factionEvents[0]?.severity ?? 0);
  if (entry.source === 'social' && context.socialLink && !context.socialLink.knownToPlayer) bonus += 12;
  if (entry.source === 'soul' && context.actor.focus >= 8) bonus += 8;
  if (entry.tags.includes('health') && healthBand(context) === 'critical') bonus += 10;
  if (entry.tags.includes('danger') && context.dangerLevel >= 6) bonus += 8;
  if (entry.tags.includes('wanted') && (context.town?.wantedLevel ?? 0) >= 3) bonus += 10;
  if (entry.tags.includes('goblin') && context.actor.personality.includes('goblin')) bonus += 4;
  return bonus;
}

function materialize(
  entry: ActorVoiceEntry,
  context: ActorConversationContext,
): ActorConversationResult {
  const source = entry.source ?? inferSource(entry);
  const line = fillSlots(entry.text, context);
  const beat = entry.beat ? fillSlots(entry.beat, context) : undefined;
  return {
    id: entry.id,
    bucket: entry.bucket,
    topic: entry.topic,
    source,
    beat,
    line,
    knownFact: knownFactFor(entry, context),
    revealsSoul: entry.revealsSoul,
    socialLinkActorId: context.socialLink?.actorId,
    tags: entry.tags,
  };
}

function fillSlots(text: string, context: ActorConversationContext): string {
  const rumor = context.rumors[0];
  const faction = context.factionEvents[0];
  return text
    .split('{{name}}')
    .join(context.actor.displayName)
    .split('{{target}}')
    .join(context.socialTargetName ?? 'someone')
    .split('{{town}}')
    .join(context.town?.name ?? 'this place')
    .split('{{rumor}}')
    .join(rumor?.summary ?? 'the rumor')
    .split('{{factionEvent}}')
    .join(faction?.summary ?? 'the trouble');
}

function knownFactFor(entry: ActorVoiceEntry, context: ActorConversationContext): string | undefined {
  if (entry.source === 'social' && context.socialLink && context.socialTargetName) {
    return `${context.actor.displayName} has a ${context.socialLink.relationship} tie to ${context.socialTargetName}.`;
  }
  if (entry.revealsSoul === 'insecurity' && context.actor.soul?.insecurity) {
    return `${context.actor.displayName} hides an insecurity: ${context.actor.soul.insecurity}`;
  }
  if (entry.revealsSoul === 'wound' && context.actor.soul?.wound) {
    return `${context.actor.displayName} carries a wound: ${context.actor.soul.wound}`;
  }
  if (entry.revealsSoul === 'contradiction' && context.actor.soul?.contradiction) {
    return `${context.actor.displayName} lives with a contradiction: ${context.actor.soul.contradiction}`;
  }
  if (entry.revealsSoul === 'secret' && context.actor.soul?.secret) {
    return `${context.actor.displayName} revealed a secret: ${context.actor.soul.secret}`;
  }
  if (entry.topic === 'personal.king' && context.actor.lore?.knowsAboutKing) {
    return `${context.actor.displayName} has a personal opinion about the King.`;
  }
  return undefined;
}

function hasSoulRequirement(requirement: ActorVoiceEntry['requiresSoul'], context: ActorConversationContext): boolean {
  const soul = context.actor.soul;
  if (!soul || !requirement) return false;
  if (requirement === 'any') return Boolean(soul.wound || soul.insecurity || soul.longing || soul.contradiction || soul.secret);
  if (requirement === 'socialLink') return context.actor.relationships.length > 0;
  if (requirement === 'opinionHint' || requirement === 'personalityHint' || requirement === 'loreBomb') return true;
  return Boolean(soul[requirement]);
}

function hasLoreRequirement(requirement: ActorVoiceEntry['requiresLore'], context: ActorConversationContext): boolean {
  if (!requirement) return false;
  if (requirement === 'any') return Boolean(context.actor.lore);
  if (requirement === 'king') return Boolean(context.actor.lore?.knowsAboutKing);
  if (requirement === 'goblinReligion') return context.actor.personality.includes('goblin');
  if (requirement === 'faction') return context.factionEvents.length > 0;
  return false;
}

function resolveAttitude(context: ActorConversationContext): NonNullable<ActorVoiceEntry['attitudes']>[number] {
  const actor = context.actor;
  if (actor.hostility === 'hostile') return 'hostile';
  if (actor.mood.anger >= 60 || (actor.opinions.player?.resentment ?? 0) >= 45) return 'angry';
  if (context.relationship && context.relationship.resentment >= 35) return 'resentful';
  if (actor.mood.fear >= 60 || (actor.opinions.player?.fear ?? 0) >= 50) return 'afraid';
  if (actor.mood.affection >= 50 || (actor.opinions.player?.affection ?? 0) >= 35) return 'fond';
  if (actor.hostility === 'friendly' || actor.mood.trust >= 40) return 'friendly';
  return 'wary';
}

function inferSource(entry: ActorVoiceEntry): ActorVoiceSource {
  if (entry.memoryTags) return 'memory';
  if (entry.factionStates || entry.townMoodTags) return 'faction';
  if (entry.socialLinkKinds) return 'social';
  if (entry.requiresSoul || entry.revealsSoul) return 'soul';
  if (entry.requiresLore) return 'lore';
  return 'fallback';
}

function snakeLengthBand(length: number): SnakeLengthBand {
  if (length > 200) return 'legendary';
  if (length > 100) return 'absurd';
  if (length > 50) return 'veryLong';
  if (length > 25) return 'long';
  if (length < 10) return 'tiny';
  return 'normal';
}

function healthBand(context: ActorConversationContext): PlayerHealthBand {
  if (context.playerMaxHealth <= 0) return 'steady';
  const ratio = context.playerHealth / context.playerMaxHealth;
  if (ratio <= 0.25) return 'critical';
  if (ratio <= 0.5) return 'low';
  return 'steady';
}
