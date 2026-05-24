import type { BiomeId } from '../world/biomes.js';
import type { NpcVoiceLine } from '../npcs/npcVoice.js';
import type { Actor, ActorHostilityState, ActorPersonalityTag, ActorRole } from './actorTypes.js';

export interface ActorVoiceContext {
  actor: Actor;
  biomeId: BiomeId;
  dangerLevel: number;
  playerHealth: number;
  playerMaxHealth: number;
  snakeLength: number;
  flags: Record<string, unknown>;
  recentEvents: string[];
  random?(): number;
}

interface ActorVoiceLine extends NpcVoiceLine {
  actorRoles?: ActorRole[];
  personalityTags?: ActorPersonalityTag[];
  hostility?: ActorHostilityState[];
  memoryTags?: string[];
  minimumFocus?: number;
  requiresSoul?: 'wound' | 'secret' | 'insecurity';
  requiresKingLore?: boolean;
}

const ACTOR_VOICE_LINES: readonly ActorVoiceLine[] = [
  {
    id: 'actor-hostile-warning',
    text: 'Back up. I am done making this a conversation.',
    priority: 120,
    hostility: ['hostile', 'surrendering'],
    tags: ['combat', 'hostile'],
  },
  {
    id: 'actor-remembers-hunt-shopkeeper',
    text: 'I heard about the hunting. Bad day for rabbits, useful day for soup.',
    priority: 96,
    actorRoles: ['shopkeeper', 'bartender'],
    memoryTags: ['hunting'],
    tags: ['memory', 'shop'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'actor-remembers-hunt-guard',
    text: 'People are saying you solved a wildlife matter with your face. Efficient, if unsettling.',
    priority: 94,
    actorRoles: ['guard', 'gateGuard'],
    memoryTags: ['hunting'],
    tags: ['memory', 'law'],
    portraitId: 'guard-neutral',
  },
  {
    id: 'actor-remembers-hunt-resident',
    text: 'The woods are quieter after you pass through. That is not entirely praise.',
    priority: 88,
    memoryTags: ['hunting'],
    tags: ['memory', 'town'],
    portraitId: 'villager-neutral',
  },
  {
    id: 'actor-low-health-kind',
    text: 'You look like you are being held together by rumor. Please buy medicine.',
    priority: 92,
    actorRoles: ['shopkeeper', 'bartender', 'resident', 'romanceCandidate'],
    personalityTags: ['kind', 'softhearted', 'romantic'],
    tags: ['health', 'concern'],
    portraitId: 'villager-old-neutral',
  },
  {
    id: 'actor-low-health-greedy',
    text: 'Your emergency has excellent margins.',
    priority: 91,
    actorRoles: ['shopkeeper', 'goblinMerchant'],
    personalityTags: ['greedy', 'goblin'],
    tags: ['health', 'shop'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'actor-goblin-ledger',
    text: 'The Ledger Below does not judge. It itemizes.',
    priority: 66,
    actorRoles: ['goblinMerchant', 'goblinClerk', 'goblinPriest'],
    personalityTags: ['goblin'],
    tags: ['goblin', 'lore'],
    portraitId: 'goblin-clerk-suspicious',
  },
  {
    id: 'actor-soul-wound',
    text: 'Do not ask where I learned to stand near exits. Ask why I still stay.',
    priority: 104,
    minimumFocus: 10,
    requiresSoul: 'wound',
    tags: ['soul', 'wound'],
    portraitId: 'villager-old-neutral',
  },
  {
    id: 'actor-secret-royal',
    text: 'The King is not a person here. He is weather with a signature.',
    priority: 82,
    requiresKingLore: true,
    tags: ['king', 'lore'],
    portraitId: 'guard-neutral',
  },
  {
    id: 'actor-rumor-memory',
    text: 'Rumors get fat when people feed them. This one has been eating well.',
    priority: 78,
    memoryTags: ['rumor'],
    tags: ['rumor', 'memory'],
    portraitId: 'villager-neutral',
  },
  {
    id: 'actor-heard-nearby',
    text: 'I did not see it. I heard enough to know everyone will claim they saw it by supper.',
    priority: 86,
    memoryTags: ['heard'],
    tags: ['heard', 'memory'],
    portraitId: 'villager-neutral',
  },
  {
    id: 'actor-witness-crime-guard',
    text: 'There is a difference between confusion and evidence. I am paid to pretend there is not.',
    priority: 98,
    actorRoles: ['guard', 'gateGuard'],
    memoryTags: ['crime'],
    tags: ['crime', 'law', 'memory'],
    portraitId: 'guard-neutral',
  },
  {
    id: 'actor-remembers-humanoid-eaten',
    text: 'People are not food. The fact that I had to say that has changed the room.',
    priority: 110,
    memoryTags: ['humanoid', 'eaten'],
    tags: ['memory', 'fear'],
    portraitId: 'villager-old-neutral',
  },
  {
    id: 'actor-guard-king',
    text: 'Roads, gates, taxes, guns. Civilization is just fear with receipts.',
    priority: 48,
    actorRoles: ['guard', 'gateGuard'],
    tags: ['guard', 'king'],
    portraitId: 'guard-neutral',
  },
  {
    id: 'actor-shopkeeper-default',
    text: 'Local danger, local prices. That is what makes it culture.',
    priority: 10,
    actorRoles: ['shopkeeper', 'bartender'],
    tags: ['shop'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'actor-resident-default',
    text: 'Roads are safer after someone else tests them.',
    priority: 1,
    tags: ['generic'],
    portraitId: 'villager-neutral',
  },
];

export function selectActorVoiceLine(context: ActorVoiceContext): NpcVoiceLine {
  const valid = ACTOR_VOICE_LINES.filter((line) => isActorLineValid(line, context));
  const fallback = ACTOR_VOICE_LINES[ACTOR_VOICE_LINES.length - 1];
  if (valid.length === 0) {
    return fallback;
  }
  const highestPriority = Math.max(...valid.map((line) => line.priority + moodPriorityBonus(line, context)));
  const best = valid.filter((line) => line.priority + moodPriorityBonus(line, context) === highestPriority);
  const lastId = context.flags[`actor.voice.last.${context.actor.id}`];
  const freshBest =
    best.length > 1 && typeof lastId === 'string'
      ? best.filter((line) => line.id !== lastId)
      : best;
  const random = context.random ?? Math.random;
  return freshBest[Math.floor(random() * freshBest.length)] ?? freshBest[0] ?? best[0] ?? fallback;
}

function isActorLineValid(line: ActorVoiceLine, context: ActorVoiceContext): boolean {
  const { actor } = context;
  if (line.roles && !line.roles.includes(actor.role)) {
    return false;
  }
  if (line.actorRoles && !line.actorRoles.includes(actor.role)) {
    return false;
  }
  if (line.biomeIds && !line.biomeIds.includes(context.biomeId)) {
    return false;
  }
  if (line.hostility && (!actor.hostility || !line.hostility.includes(actor.hostility))) {
    return false;
  }
  if (line.personalityTags && !line.personalityTags.some((tag) => actor.personality.includes(tag))) {
    return false;
  }
  if (line.memoryTags && !actor.memory.some((memory) => line.memoryTags?.some((tag) => memory.tags.includes(tag)))) {
    return false;
  }
  if (line.minimumFocus && (actor.focus ?? 0) < line.minimumFocus) {
    return false;
  }
  if (line.requiresSoul && !actor.soul?.[line.requiresSoul]) {
    return false;
  }
  if (line.requiresKingLore && !actor.lore?.knowsAboutKing) {
    return false;
  }
  if (line.tags?.includes('health') && !isLowHealth(context)) {
    return false;
  }
  return true;
}

function moodPriorityBonus(line: ActorVoiceLine, context: ActorVoiceContext): number {
  if (line.tags?.includes('concern') && context.actor.mood.affection >= 40) {
    return 8;
  }
  if (line.tags?.includes('shop') && context.actor.mood.greed >= 50) {
    return 6;
  }
  if (line.tags?.includes('hostile') && context.actor.mood.anger >= 50) {
    return 8;
  }
  return 0;
}

function isLowHealth(context: ActorVoiceContext): boolean {
  return context.playerMaxHealth > 0 && context.playerHealth / context.playerMaxHealth <= 0.5;
}
