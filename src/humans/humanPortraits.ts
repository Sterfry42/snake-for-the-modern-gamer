/**
 * Human Portraits
 */

export type PortraitExpression = 'neutral' | 'happy' | 'worried' | 'angry' | 'suspicious';

export interface HumanPortraitDefinition {
  id: string;
  textureKey: string;
  role: string;
  expression: PortraitExpression;
  biomeFlavor?: string;
}

const HUMAN_PORTRAITS: readonly HumanPortraitDefinition[] = [
  // Villagers
  {
    id: 'villager-neutral',
    textureKey: 'portrait:villager-neutral',
    role: 'resident',
    expression: 'neutral',
  },
  {
    id: 'villager-old-neutral',
    textureKey: 'portrait:villager-old-neutral',
    role: 'elder',
    expression: 'neutral',
  },
  {
    id: 'villager-young-happy',
    textureKey: 'portrait:villager-young-happy',
    role: 'resident',
    expression: 'happy',
  },

  // Shopkeepers
  {
    id: 'shopkeeper-neutral',
    textureKey: 'portrait:shopkeeper-neutral',
    role: 'merchant',
    expression: 'neutral',
  },
  {
    id: 'desert-peddler-suspicious',
    textureKey: 'portrait:desert-peddler-suspicious',
    role: 'merchant',
    expression: 'suspicious',
    biomeFlavor: 'hot',
  },

  // Guards
  {
    id: 'guard-neutral',
    textureKey: 'portrait:guard-neutral',
    role: 'guard',
    expression: 'neutral',
  },

  // Cooks
  {
    id: 'cook-happy',
    textureKey: 'portrait:cook-happy',
    role: 'cook',
    expression: 'happy',
  },

  // Hunters
  {
    id: 'hunter-suspicious',
    textureKey: 'portrait:hunter-suspicious',
    role: 'hunter',
    expression: 'suspicious',
    biomeFlavor: 'forest',
  },

  // Fishers
  {
    id: 'ocean-fisher-neutral',
    textureKey: 'portrait:ocean-fisher-neutral',
    role: 'fisher',
    expression: 'neutral',
    biomeFlavor: 'ocean',
  },
  {
    id: 'ocean-fisher-happy',
    textureKey: 'portrait:ocean-fisher-happy',
    role: 'fisher',
    expression: 'happy',
    biomeFlavor: 'ocean',
  },

  // Scribes
  {
    id: 'scribe-neutral',
    textureKey: 'portrait:villager-neutral',
    role: 'scribe',
    expression: 'neutral',
  },

  // Thieves
  {
    id: 'bandit-neutral',
    textureKey: 'portrait:bandit-neutral',
    role: 'thief',
    expression: 'suspicious',
  },
  {
    id: 'bandit-hostile',
    textureKey: 'portrait:bandit-hostile',
    role: 'thief',
    expression: 'angry',
  },

  // Mystics
  {
    id: 'jade-monk-neutral',
    textureKey: 'portrait:jade-monk-neutral',
    role: 'mystic',
    expression: 'neutral',
    biomeFlavor: 'jade',
  },

  // Hermits
  {
    id: 'forest-hermit-worried',
    textureKey: 'portrait:forest-hermit-worried',
    role: 'hermit',
    expression: 'worried',
    biomeFlavor: 'forest',
  },

  // Goblins
  {
    id: 'goblin-clerk-suspicious',
    textureKey: 'portrait:goblin-clerk-suspicious',
    role: 'goblin',
    expression: 'suspicious',
  },
  {
    id: 'goblin-merchant-happy',
    textureKey: 'portrait:goblin-merchant-happy',
    role: 'goblin',
    expression: 'happy',
  },

  // Wanderers
  {
    id: 'wanderer-neutral',
    textureKey: 'portrait:sage-2',
    role: 'wanderer',
    expression: 'neutral',
  },
  {
    id: 'sage-1',
    textureKey: 'portrait:sage-1',
    role: 'mystic',
    expression: 'neutral',
  },
  {
    id: 'sage-2',
    textureKey: 'portrait:sage-2',
    role: 'mystic',
    expression: 'neutral',
  },
  {
    id: 'sage-3',
    textureKey: 'portrait:sage-3',
    role: 'mystic',
    expression: 'neutral',
  },

  // Ramen cook (Jade Peak)
  {
    id: 'ramen-cook-happy',
    textureKey: 'portrait:ramen-cook-happy',
    role: 'cook',
    expression: 'happy',
    biomeFlavor: 'jade',
  },

  // Angel (special)
  {
    id: 'angel-neutral',
    textureKey: 'portrait:angel-neutral',
    role: 'mystic',
    expression: 'neutral',
  },

  // Diner worker (Jade Peak)
  {
    id: 'diner-worker-neutral',
    textureKey: 'portrait:diner-worker-neutral',
    role: 'cook',
    expression: 'neutral',
  },

  // Tanuki (Jade Peak)
  {
    id: 'tanuki-neutral',
    textureKey: 'portrait:tanuki-neutral',
    role: 'mystic',
    expression: 'happy',
    biomeFlavor: 'jade',
  },

  // Cold trapper
  {
    id: 'cold-trapper-worried',
    textureKey: 'portrait:cold-trapper-worried',
    role: 'hermit',
    expression: 'worried',
    biomeFlavor: 'cold',
  },

  // Badlands ranger
  {
    id: 'badlands-ranger-neutral',
    textureKey: 'portrait:badlands-ranger-neutral',
    role: 'hunter',
    expression: 'neutral',
  },
];

const PORTRAIT_MAP = new Map(HUMAN_PORTRAITS.map((portrait) => [portrait.id, portrait]));
const FALLBACK_PORTRAIT = PORTRAIT_MAP.get('villager-neutral')!;

export function getHumanPortraitDefinition(id: string | undefined): HumanPortraitDefinition {
  return (id ? PORTRAIT_MAP.get(id) : undefined) ?? FALLBACK_PORTRAIT;
}

export function getHumanPortraits(): readonly HumanPortraitDefinition[] {
  return HUMAN_PORTRAITS;
}

export function getPortraitsByRole(role: string): readonly HumanPortraitDefinition[] {
  return HUMAN_PORTRAITS.filter((p) => p.role === role);
}

export function getPortraitsByBiome(biomeFlavor: string): readonly HumanPortraitDefinition[] {
  return HUMAN_PORTRAITS.filter((p) => p.biomeFlavor === biomeFlavor);
}
