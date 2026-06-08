export type PortraitExpression = 'neutral' | 'happy' | 'worried' | 'angry' | 'suspicious';

export interface PortraitDefinition {
  id: string;
  textureKey: string;
  role: string;
  expression: PortraitExpression;
  biomeFlavor?: string;
}

const PORTRAITS: readonly PortraitDefinition[] = [
  {
    id: 'villager-neutral',
    textureKey: 'portrait:villager-neutral',
    role: 'villager',
    expression: 'neutral',
  },
  {
    id: 'villager-old-neutral',
    textureKey: 'portrait:villager-old-neutral',
    role: 'villager-old',
    expression: 'neutral',
  },
  {
    id: 'villager-young-happy',
    textureKey: 'portrait:villager-young-happy',
    role: 'villager-young',
    expression: 'happy',
  },
  {
    id: 'shopkeeper-neutral',
    textureKey: 'portrait:shopkeeper-neutral',
    role: 'shopkeeper',
    expression: 'neutral',
  },
  {
    id: 'guard-neutral',
    textureKey: 'portrait:guard-neutral',
    role: 'guard',
    expression: 'neutral',
  },
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
  {
    id: 'hunter-suspicious',
    textureKey: 'portrait:hunter-suspicious',
    role: 'hunter',
    expression: 'suspicious',
    biomeFlavor: 'forest',
  },
  { id: 'cook-happy', textureKey: 'portrait:cook-happy', role: 'cook', expression: 'happy' },
  {
    id: 'goblin-clerk-suspicious',
    textureKey: 'portrait:goblin-clerk-suspicious',
    role: 'goblin-clerk',
    expression: 'suspicious',
  },
  {
    id: 'goblin-merchant-happy',
    textureKey: 'portrait:goblin-merchant-happy',
    role: 'goblin-merchant',
    expression: 'happy',
  },
  {
    id: 'angel-neutral',
    textureKey: 'portrait:angel-neutral',
    role: 'angel',
    expression: 'neutral',
  },
  {
    id: 'forest-hermit-worried',
    textureKey: 'portrait:forest-hermit-worried',
    role: 'forest-hermit',
    expression: 'worried',
    biomeFlavor: 'forest',
  },
  {
    id: 'ocean-fisher-neutral',
    textureKey: 'portrait:ocean-fisher-neutral',
    role: 'ocean-fisher',
    expression: 'neutral',
    biomeFlavor: 'ocean',
  },
  {
    id: 'sterling-fisher-happy',
    textureKey: 'portrait:sterling-fisher-happy',
    role: 'ocean-fisher',
    expression: 'happy',
    biomeFlavor: 'ocean',
  },
  {
    id: 'desert-peddler-suspicious',
    textureKey: 'portrait:desert-peddler-suspicious',
    role: 'desert-peddler',
    expression: 'suspicious',
    biomeFlavor: 'hot',
  },
  {
    id: 'cold-trapper-worried',
    textureKey: 'portrait:cold-trapper-worried',
    role: 'cold-trapper',
    expression: 'worried',
    biomeFlavor: 'cold',
  },
  {
    id: 'badlands-ranger-neutral',
    textureKey: 'portrait:badlands-ranger-neutral',
    role: 'badlands-ranger',
    expression: 'neutral',
  },
  {
    id: 'jade-monk-neutral',
    textureKey: 'portrait:jade-monk-neutral',
    role: 'jade-monk',
    expression: 'neutral',
  },
  {
    id: 'ramen-cook-happy',
    textureKey: 'portrait:ramen-cook-happy',
    role: 'ramen-cook',
    expression: 'happy',
  },
  {
    id: 'diner-worker-neutral',
    textureKey: 'portrait:diner-worker-neutral',
    role: 'diner-worker',
    expression: 'neutral',
  },
  {
    id: 'tanuki-neutral',
    textureKey: 'portrait:tanuki-neutral',
    role: 'tanuki',
    expression: 'happy',
    biomeFlavor: 'jade',
  },
];

const PORTRAIT_MAP = new Map(PORTRAITS.map((portrait) => [portrait.id, portrait]));
const FALLBACK_PORTRAIT = PORTRAIT_MAP.get('villager-neutral')!;

export function getPortraitDefinition(id: string | undefined): PortraitDefinition {
  return (id ? PORTRAIT_MAP.get(id) : undefined) ?? FALLBACK_PORTRAIT;
}

export function getPortraits(): readonly PortraitDefinition[] {
  return PORTRAITS;
}
