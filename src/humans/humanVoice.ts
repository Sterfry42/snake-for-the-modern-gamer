/**
 * Human Voice Lines
 *
 * The wise old snake was planned to have human voice interactions but never did.
 * The wise old snake's voice would have been recognized by every human.
 *
 * This module defines voice lines for human characters across different
 * contexts — greetings, warnings, gossip, trading, and special events.
 * Each line has conditions that determine when it plays.
 */
import type { BiomeId } from '../world/biomes.js';
import type { HumanType } from './types.js';

export type HumanVoiceCondition =
  | { kind: 'biome'; biomeId: BiomeId }
  | { kind: 'dangerAtLeast'; value: number }
  | { kind: 'healthBelowPercent'; value: number }
  | { kind: 'flag'; key: string; equals?: unknown }
  | { kind: 'recentEvent'; eventId: string }
  | { kind: 'hasItem'; itemId: string }
  | { kind: 'snakeLengthAtLeast'; value: number }
  | { kind: 'humanRelationship'; humanId: string; minScore?: number };

export interface HumanVoiceLine {
  id: string;
  text: string;
  priority: number;
  types?: HumanType[];
  biomeIds?: BiomeId[];
  tags?: string[];
  conditions?: HumanVoiceCondition[];
  portraitId?: string;
}

export interface HumanVoiceContext {
  type: HumanType;
  biomeId: BiomeId;
  dangerLevel: number;
  playerHealth: number;
  playerMaxHealth: number;
  snakeLength: number;
  flags: Record<string, unknown>;
  recentEvents: string[];
  hasItem?(itemId: string): boolean;
  getRelationship?(humanId: string): number;
  random?(): number;
}

// === HUMAN VOICE LINES ===

export const HUMAN_VOICE_LINES: readonly HumanVoiceLine[] = [
  // Shopkeeper lines
  {
    id: 'shop-greeting',
    text: 'Welcome! Take a look around. Everything has a price, even curiosity.',
    priority: 50,
    types: ['merchant'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'shop-sale',
    text: 'Special offer today. Tomorrow the prices go back up. Or go higher. Who knows.',
    priority: 30,
    types: ['merchant'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'shop-low-health',
    text: 'Looking fragile. We sell solutions and deniability.',
    priority: 80,
    types: ['merchant'],
    conditions: [{ kind: 'healthBelowPercent', value: 0.5 }],
    portraitId: 'shopkeeper-neutral',
  },

  // Guard lines
  {
    id: 'guard-patrol',
    text: 'Keep moving orderly. The town has a mood, and today it has paperwork.',
    priority: 45,
    types: ['guard'],
    tags: ['town', 'law'],
    portraitId: 'guard-neutral',
  },
  {
    id: 'guard-suspicious',
    text: 'Halt. State your business in these tunnels.',
    priority: 60,
    types: ['guard'],
    portraitId: 'guard-neutral',
  },
  {
    id: 'guard-long-snake',
    text: 'That is either a heroic amount of snake or a zoning violation.',
    priority: 34,
    types: ['guard'],
    conditions: [{ kind: 'snakeLengthAtLeast', value: 18 }],
    portraitId: 'guard-neutral',
  },

  // Cook lines
  {
    id: 'cook-greeting',
    text: 'Hungry? Good. That means you are alive. Alive people eat.',
    priority: 50,
    types: ['cook'],
    portraitId: 'cook-happy',
  },
  {
    id: 'cook-special',
    text: "Today's special is something I found, something I made, and a prayer.",
    priority: 35,
    types: ['cook'],
    portraitId: 'cook-happy',
  },

  // Merchant lines
  {
    id: 'merchant-trade',
    text: 'Trade is the oldest language. Let us speak it fluently.',
    priority: 40,
    types: ['merchant'],
    portraitId: 'shopkeeper-neutral',
  },
  {
    id: 'merchant-rare-item',
    text: 'I have something special. It cost me. It will cost you. Fair trade.',
    priority: 30,
    types: ['merchant'],
    portraitId: 'shopkeeper-neutral',
  },

  // Resident lines
  {
    id: 'resident-greeting',
    text: 'Roads are safer after someone else tests them.',
    priority: 20,
    types: ['resident'],
    portraitId: 'villager-neutral',
  },
  {
    id: 'resident-rumor',
    text: 'Heard anything new? I have heard everything. Most of it is exaggerated.',
    priority: 30,
    types: ['resident'],
    portraitId: 'villager-neutral',
  },
  {
    id: 'resident-wounded',
    text: 'You are bleeding in a way that makes conversation feel briefly medical.',
    priority: 75,
    types: ['resident'],
    conditions: [{ kind: 'healthBelowPercent', value: 0.4 }],
    portraitId: 'villager-old-neutral',
  },

  // Scribe lines
  {
    id: 'scribe-record',
    text: 'If it is not written down, it never happened. That is the first rule.',
    priority: 40,
    types: ['scribe'],
    portraitId: 'villager-neutral',
  },
  {
    id: 'scribe-knowledge',
    text: 'I have scrolls that could save your life. Or yours could save the scrolls. Either way, trade.',
    priority: 35,
    types: ['scribe'],
    portraitId: 'villager-neutral',
  },

  // Thief lines
  {
    id: 'thief-greeting',
    text: 'Grates open for hands, not rumors. Luckily, rumors have hands here.',
    priority: 55,
    types: ['thief'],
    tags: ['guild'],
    portraitId: 'bandit-neutral',
  },
  {
    id: 'thief-low-wanted',
    text: 'No posters today. That is either discipline or disappointing branding.',
    priority: 35,
    types: ['thief'],
    tags: ['guild', 'town'],
    portraitId: 'bandit-neutral',
  },
  {
    id: 'thief-danger',
    text: 'Something big is moving through the lower depths. I prefer my dangers small and manageable.',
    priority: 60,
    types: ['thief'],
    conditions: [{ kind: 'dangerAtLeast', value: 5 }],
    portraitId: 'bandit-neutral',
  },

  // Mystic lines
  {
    id: 'mystic-greeting',
    text: 'The walls speak. Most snakes just hear echoes. You might be different.',
    priority: 45,
    types: ['mystic'],
    portraitId: 'jade-monk-neutral',
  },
  {
    id: 'mystic-riddle',
    text: 'Every chamber in this place teaches the same lesson in a different dialect: remain moving, remain doubtful.',
    priority: 40,
    types: ['mystic'],
    portraitId: 'sage-2',
  },

  // Wanderer lines
  {
    id: 'wanderer-story',
    text: 'I have been through every biome. Some are worse than they look. Some are better.',
    priority: 35,
    types: ['wanderer'],
    portraitId: 'sage-2',
  },
  {
    id: 'wanderer-warning',
    text: 'If gunfire starts, do not defend your pride. Pride is plentiful down here. Blood is not.',
    priority: 50,
    types: ['wanderer'],
    conditions: [{ kind: 'dangerAtLeast', value: 4 }],
    portraitId: 'sage-3',
  },

  // Hunter lines
  {
    id: 'hunter-tracking',
    text: 'Something has been eating the rabbits. I am looking at something.',
    priority: 70,
    types: ['hunter'],
    conditions: [{ kind: 'recentEvent', eventId: 'recent.animalHunted' }],
    portraitId: 'hunter-suspicious',
  },
  {
    id: 'hunter-forest',
    text: 'Keep a blade on you. Or teeth. You have teeth, right?',
    priority: 50,
    types: ['hunter'],
    biomeIds: ['elderwood-maze'],
    portraitId: 'hunter-suspicious',
  },

  // Fisher lines
  {
    id: 'fisher-ocean',
    text: 'Fins are cheaper than funerals. Usually.',
    priority: 50,
    types: ['fisher'],
    biomeIds: ['sunken-ocean'],
    portraitId: 'ocean-fisher-neutral',
  },
  {
    id: 'fisher-deep-warning',
    text: 'The deep water does not forgive speed. It eats fast things first.',
    priority: 60,
    types: ['fisher'],
    biomeIds: ['sunken-ocean'],
    portraitId: 'ocean-fisher-neutral',
  },
  {
    id: 'fisher-long-snake',
    text: 'You are long enough now. The deep water respects length — but it still prefers patience.',
    priority: 30,
    types: ['fisher'],
    biomeIds: ['sunken-ocean'],
    conditions: [{ kind: 'snakeLengthAtLeast', value: 10 }],
    portraitId: 'ocean-fisher-neutral',
  },

  // Hermit lines
  {
    id: 'hermit-solitude',
    text: 'You come often. I do not mind. Most people come once and never return.',
    priority: 35,
    types: ['hermit'],
    portraitId: 'forest-hermit-worried',
  },
  {
    id: 'hermit-body-hint',
    text: 'Long snakes survive water if they are willing to become infrastructure.',
    priority: 30,
    types: ['hermit'],
    conditions: [{ kind: 'snakeLengthAtLeast', value: 12 }],
    portraitId: 'forest-hermit-worried',
  },

  // Goblin lines
  {
    id: 'goblin-deal',
    text: 'Local danger, local prices. That is what makes it culture.',
    priority: 40,
    types: ['goblin'],
    portraitId: 'goblin-merchant-happy',
  },
  {
    id: 'goblin-card',
    text: 'Smoke cards win big until they do not. That is why goblins love them.',
    priority: 30,
    types: ['goblin'],
    tags: ['cards'],
    portraitId: 'goblin-clerk-suspicious',
  },
  {
    id: 'goblin-low-health',
    text: 'Looking fragile. We sell solutions and deniability.',
    priority: 80,
    types: ['goblin'],
    conditions: [{ kind: 'healthBelowPercent', value: 0.5 }],
    portraitId: 'goblin-merchant-happy',
  },

  // Biome-specific lines
  {
    id: 'cold-warning',
    text: 'If you stop moving out there, the snow starts making plans.',
    priority: 50,
    types: ['resident', 'hermit'],
    biomeIds: ['sable-depths'],
    portraitId: 'cold-trapper-worried',
  },
  {
    id: 'jade-traveler',
    text: 'The mountain keeps secrets politely. The bamboo is less polite.',
    priority: 30,
    types: ['resident', 'mystic'],
    biomeIds: ['jade-peak-province'],
    portraitId: 'jade-monk-neutral',
  },
  {
    id: 'badlands-shop',
    text: 'Everything out here is either a bargain, a dare, or both in a hat.',
    priority: 30,
    types: ['merchant', 'resident'],
    biomeIds: ['liberty-badlands'],
    portraitId: 'badlands-ranger-neutral',
  },
  {
    id: 'ocean-resident',
    text: 'If the floor starts waving, wave back. It likes manners.',
    priority: 30,
    types: ['resident', 'fisher'],
    biomeIds: ['sunken-ocean'],
    portraitId: 'ocean-fisher-neutral',
  },

  // Generic fallback
  {
    id: 'generic-resident',
    text: 'The tunnels remember everyone. Even the ones who forget themselves.',
    priority: 1,
    portraitId: 'villager-neutral',
  },
];

// === VOICE SELECTION ===

export function selectHumanVoiceLine(context: HumanVoiceContext): HumanVoiceLine {
  const valid = HUMAN_VOICE_LINES.filter((line) => isLineValid(line, context));
  const fallback = HUMAN_VOICE_LINES[HUMAN_VOICE_LINES.length - 1];
  if (valid.length === 0) {
    return fallback;
  }
  const highestPriority = Math.max(...valid.map((line) => line.priority));
  const best = valid.filter((line) => line.priority === highestPriority);
  const random = context.random ?? Math.random;
  return best[Math.floor(random() * best.length)] ?? best[0] ?? fallback;
}

function isLineValid(line: HumanVoiceLine, context: HumanVoiceContext): boolean {
  if (line.types && !line.types.includes(context.type)) {
    return false;
  }
  if (line.biomeIds && !line.biomeIds.includes(context.biomeId)) {
    return false;
  }
  return (line.conditions ?? []).every((condition) => isConditionMet(condition, context));
}

function isConditionMet(condition: HumanVoiceCondition, context: HumanVoiceContext): boolean {
  switch (condition.kind) {
    case 'biome':
      return context.biomeId === condition.biomeId;
    case 'dangerAtLeast':
      return context.dangerLevel >= condition.value;
    case 'healthBelowPercent':
      return (
        context.playerMaxHealth > 0 &&
        context.playerHealth / context.playerMaxHealth <= condition.value
      );
    case 'flag':
      return condition.equals === undefined
        ? context.flags[condition.key] !== undefined
        : context.flags[condition.key] === condition.equals;
    case 'recentEvent':
      return (
        context.recentEvents.includes(condition.eventId) ||
        context.flags[condition.eventId] !== undefined
      );
    case 'hasItem':
      return Boolean(context.hasItem?.(condition.itemId));
    case 'snakeLengthAtLeast':
      return context.snakeLength >= condition.value;
    case 'humanRelationship':
      return (
        context.getRelationship !== undefined &&
        (context.getRelationship(condition.humanId) ?? -100) >= (condition.minScore ?? -100)
      );
  }
}
