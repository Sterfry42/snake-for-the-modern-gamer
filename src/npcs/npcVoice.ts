import type { BiomeId } from '../world/biomes.js';

export type NpcVoiceCondition =
  | { kind: 'healthBelowPercent'; value: number }
  | { kind: 'recentEvent'; eventId: string }
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

// Legacy fallback for the village shop popup. Actor-backed NPCs use actorVoice instead.
const SHOPKEEPER_FALLBACK_LINES: readonly NpcVoiceLine[] = [
  {
    id: 'low-health-shop',
    text: 'Looking fragile. We sell solutions and deniability.',
    priority: 90,
    roles: ['shopkeeper'],
    conditions: [{ kind: 'healthBelowPercent', value: 0.5 }],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'forest-shop',
    text: 'Keep a blade on you. Or teeth. You have teeth, right?',
    priority: 50,
    roles: ['shopkeeper'],
    biomeIds: ['elderwood-maze'],
    portraitId: 'hunter-suspicious',
  },
  {
    id: 'ocean-shop',
    text: 'Fins are cheaper than funerals. Usually.',
    priority: 50,
    roles: ['shopkeeper'],
    biomeIds: ['sunken-ocean'],
    portraitId: 'ocean-fisher-neutral',
  },
  {
    id: 'cold-warning',
    text: 'If you stop moving out there, the snow starts making plans.',
    priority: 50,
    roles: ['shopkeeper'],
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
    id: 'market-food-shortage',
    text: 'The shelves are full of confidence and not enough bread.',
    priority: 32,
    roles: ['shopkeeper'],
    tags: ['market', 'town'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'badlands-shop',
    text: 'Everything out here is either a bargain, a dare, or both in a hat.',
    priority: 30,
    roles: ['shopkeeper'],
    biomeIds: ['liberty-badlands'],
    portraitId: 'badlands-ranger-neutral',
  },
  {
    id: 'card-gossip',
    text: 'Smoke cards win big until they do not. That is why goblins love them.',
    priority: 30,
    roles: ['shopkeeper'],
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
    roles: ['shopkeeper'],
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
  const valid = SHOPKEEPER_FALLBACK_LINES.filter((line) => isLineValid(line, context));
  const fallback = SHOPKEEPER_FALLBACK_LINES[SHOPKEEPER_FALLBACK_LINES.length - 1];
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
    case 'healthBelowPercent':
      return (
        context.playerMaxHealth > 0 &&
        context.playerHealth / context.playerMaxHealth <= condition.value
      );
    case 'recentEvent':
      return (
        context.recentEvents.includes(condition.eventId) ||
        context.flags[condition.eventId] !== undefined
      );
    case 'snakeLengthAtLeast':
      return context.snakeLength >= condition.value;
  }
}
