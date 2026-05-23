import type { BiomeId } from '../world/biomes.js';

export type NpcVoiceCondition =
  | { kind: 'biome'; biomeId: BiomeId }
  | { kind: 'dangerAtLeast'; value: number }
  | { kind: 'healthBelowPercent'; value: number }
  | { kind: 'flag'; key: string; equals?: unknown }
  | { kind: 'recentEvent'; eventId: string }
  | { kind: 'hasItem'; itemId: string }
  | { kind: 'hasSkill'; skillId: string }
  | { kind: 'snakeLengthAtLeast'; value: number };

export interface NpcVoiceLine {
  id: string;
  text: string;
  priority: number;
  roles?: string[];
  biomeIds?: BiomeId[];
  tags?: string[];
  conditions?: NpcVoiceCondition[];
  portraitId?: string;
}

export interface NpcVoiceContext {
  role: string;
  biomeId: BiomeId;
  dangerLevel: number;
  playerHealth: number;
  playerMaxHealth: number;
  snakeLength: number;
  flags: Record<string, unknown>;
  recentEvents: string[];
  hasItem?(itemId: string): boolean;
  hasSkill?(skillId: string): boolean;
  random?(): number;
}

export const NPC_VOICE_LINES: readonly NpcVoiceLine[] = [
  {
    id: 'low-health-shop',
    text: 'Looking fragile. We sell solutions and deniability.',
    priority: 90,
    roles: ['shopkeeper', 'goblin-merchant'],
    conditions: [{ kind: 'healthBelowPercent', value: 0.5 }],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'forest-shop',
    text: 'Keep a blade on you. Or teeth. You have teeth, right?',
    priority: 50,
    roles: ['shopkeeper', 'hunter', 'villager'],
    biomeIds: ['elderwood-maze'],
    portraitId: 'hunter-suspicious',
  },
  {
    id: 'ocean-shop',
    text: 'Fins are cheaper than funerals. Usually.',
    priority: 50,
    roles: ['shopkeeper', 'ocean-fisher'],
    biomeIds: ['sunken-ocean'],
    portraitId: 'ocean-fisher-neutral',
  },
  {
    id: 'cold-warning',
    text: 'If you stop moving out there, the snow starts making plans.',
    priority: 50,
    roles: ['shopkeeper', 'cold-trapper', 'villager'],
    biomeIds: ['sable-depths'],
    portraitId: 'cold-trapper-worried',
  },
  {
    id: 'recent-death',
    text: 'You look... legally alive.',
    priority: 80,
    conditions: [{ kind: 'recentEvent', eventId: 'recent.deathReason' }],
    portraitId: 'villager-old-neutral',
  },
  {
    id: 'recent-hunt',
    text: 'Something has been eating the rabbits. I am looking at something.',
    priority: 70,
    conditions: [{ kind: 'recentEvent', eventId: 'recent.animalHunted' }],
    portraitId: 'hunter-suspicious',
  },
  {
    id: 'town-guard-curfew',
    text: 'Keep moving orderly. The town has a mood, and today it has paperwork.',
    priority: 45,
    roles: ['guard'],
    tags: ['town', 'law'],
    portraitId: 'guard-neutral',
  },
  {
    id: 'town-bartender-rumor',
    text: 'Every festival has two schedules: the posted one, and the one people whisper.',
    priority: 42,
    roles: ['bartender'],
    tags: ['town', 'rumor'],
    portraitId: 'sage-2',
  },
  {
    id: 'guild-contact-grate',
    text: 'Grates open for hands, not rumors. Luckily, rumors have hands here.',
    priority: 55,
    roles: ['thief', 'thiefContact'],
    tags: ['guild'],
    portraitId: 'bandit-neutral',
  },
  {
    id: 'romance-town',
    text: 'If this is about feelings, speak plainly enough that even gossip can quote you.',
    priority: 25,
    roles: ['romance', 'resident', 'villager'],
    tags: ['romance'],
    portraitId: 'villager-neutral',
  },
  {
    id: 'wounded-resident',
    text: 'You are bleeding in a way that makes conversation feel briefly medical.',
    priority: 75,
    roles: ['resident', 'romance', 'villager', 'guard'],
    conditions: [{ kind: 'healthBelowPercent', value: 0.4 }],
    portraitId: 'villager-old-neutral',
  },
  {
    id: 'guild-low-wanted',
    text: 'No posters today. That is either discipline or disappointing branding.',
    priority: 35,
    roles: ['thief', 'thiefContact'],
    tags: ['guild', 'town'],
    portraitId: 'bandit-neutral',
  },
  {
    id: 'market-food-shortage',
    text: 'The shelves are full of confidence and not enough bread.',
    priority: 32,
    roles: ['shopkeeper', 'resident', 'bartender'],
    tags: ['market', 'town'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'jade-traveler',
    text: 'The mountain keeps secrets politely. The bamboo is less polite.',
    priority: 30,
    roles: ['resident', 'romance', 'villager'],
    biomeIds: ['jade-peak-province'],
    portraitId: 'jade-monk-neutral',
  },
  {
    id: 'badlands-shop',
    text: 'Everything out here is either a bargain, a dare, or both in a hat.',
    priority: 30,
    roles: ['shopkeeper', 'resident'],
    biomeIds: ['liberty-badlands'],
    portraitId: 'badlands-ranger-neutral',
  },
  {
    id: 'ocean-resident',
    text: 'If the floor starts waving, wave back. It likes manners.',
    priority: 30,
    roles: ['resident', 'romance', 'villager'],
    biomeIds: ['sunken-ocean'],
    portraitId: 'ocean-fisher-neutral',
  },
  {
    id: 'long-snake-guard',
    text: 'That is either a heroic amount of snake or a zoning violation.',
    priority: 34,
    roles: ['guard', 'resident'],
    conditions: [{ kind: 'snakeLengthAtLeast', value: 18 }],
    portraitId: 'guard-neutral',
  },
  {
    id: 'card-gossip',
    text: 'Smoke cards win big until they do not. That is why goblins love them.',
    priority: 30,
    roles: ['villager', 'goblin-clerk', 'shopkeeper'],
    tags: ['cards'],
    portraitId: 'goblin-clerk-suspicious',
  },
  {
    id: 'body-resource-hint',
    text: 'Long snakes survive water if they are willing to become infrastructure.',
    priority: 30,
    conditions: [{ kind: 'snakeLengthAtLeast', value: 12 }],
    portraitId: 'forest-hermit-worried',
  },
  {
    id: 'generic-shop',
    text: 'Local danger, local prices. That is what makes it culture.',
    priority: 1,
    roles: ['shopkeeper', 'goblin-merchant'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'generic-villager',
    text: 'Roads are safer after someone else tests them.',
    priority: 1,
    portraitId: 'villager-neutral',
  },
];

export function selectNpcVoiceLine(context: NpcVoiceContext): NpcVoiceLine {
  const valid = NPC_VOICE_LINES.filter((line) => isLineValid(line, context));
  const fallback = NPC_VOICE_LINES[NPC_VOICE_LINES.length - 1];
  if (valid.length === 0) {
    return fallback;
  }
  const highestPriority = Math.max(...valid.map((line) => line.priority));
  const best = valid.filter((line) => line.priority === highestPriority);
  const random = context.random ?? Math.random;
  return best[Math.floor(random() * best.length)] ?? best[0] ?? fallback;
}

function isLineValid(line: NpcVoiceLine, context: NpcVoiceContext): boolean {
  if (line.roles && !line.roles.includes(context.role)) {
    return false;
  }
  if (line.biomeIds && !line.biomeIds.includes(context.biomeId)) {
    return false;
  }
  return (line.conditions ?? []).every((condition) => isConditionMet(condition, context));
}

function isConditionMet(condition: NpcVoiceCondition, context: NpcVoiceContext): boolean {
  switch (condition.kind) {
    case 'biome':
      return context.biomeId === condition.biomeId;
    case 'dangerAtLeast':
      return context.dangerLevel >= condition.value;
    case 'healthBelowPercent':
      return context.playerMaxHealth > 0 && context.playerHealth / context.playerMaxHealth <= condition.value;
    case 'flag':
      return condition.equals === undefined
        ? context.flags[condition.key] !== undefined
        : context.flags[condition.key] === condition.equals;
    case 'recentEvent':
      return context.recentEvents.includes(condition.eventId) || context.flags[condition.eventId] !== undefined;
    case 'hasItem':
      return Boolean(context.hasItem?.(condition.itemId));
    case 'hasSkill':
      return Boolean(context.hasSkill?.(condition.skillId) || context.flags[condition.skillId]);
    case 'snakeLengthAtLeast':
      return context.snakeLength >= condition.value;
  }
}
