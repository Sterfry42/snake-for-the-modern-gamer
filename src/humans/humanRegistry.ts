/**
 * Human Registry
 */
import type { BiomeId } from '../world/biomes.js';
import type { HumanDefinition, HumanDropEntry, HumanType } from './types.js';

// === DROP TABLES ===

const MERCHANT_DROPS: HumanDropEntry[] = [
  { itemId: 'gold-coin', chance: 0.3, minCount: 1, maxCount: 5 },
  { itemId: 'trade-card', chance: 0.15 },
  { itemId: 'map-fragment', chance: 0.05 },
];

const GUARD_DROPS: HumanDropEntry[] = [
  { itemId: 'iron-shard', chance: 0.2 },
  { itemId: 'whistle', chance: 0.1 },
  { itemId: 'ward-talisman', chance: 0.05 },
];

const RESIDENT_DROPS: HumanDropEntry[] = [
  { itemId: 'home-brew', chance: 0.1 },
  { itemId: 'dried-herbs', chance: 0.15 },
  { itemId: 'handwritten-note', chance: 0.05 },
];

const THIEF_DROPS: HumanDropEntry[] = [
  { itemId: 'stolen-goods', chance: 0.25 },
  { itemId: 'lockpick-set', chance: 0.1 },
  { itemId: 'bribe-money', chance: 0.2 },
];

const MYSTIC_DROPS: HumanDropEntry[] = [
  { itemId: 'crystal-shard', chance: 0.15 },
  { itemId: 'ancient-scroll', chance: 0.05 },
  { itemId: 'blessing-charm', chance: 0.1 },
];

const WANDERER_DROPS: HumanDropEntry[] = [
  { itemId: 'travel-log', chance: 0.1 },
  { itemId: 'canned-goods', chance: 0.2 },
  { itemId: 'riddle-card', chance: 0.05 },
];

// === HUMAN DEFINITIONS ===

export const HUMAN_DEFINITIONS: readonly HumanDefinition[] = [
  // Residents - the backbone of settlements
  {
    type: 'resident',
    name: 'Settler',
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish', 'liberty-badlands'],
    spawnWeight: 3.0,
    maxPerRoom: 2,
    disposition: 'neutral',
    role: 'gossip',
    dialogueTopics: ['rumors', 'weather', 'local-events', 'snake-watching'],
    drops: RESIDENT_DROPS,
    portraitId: 'villager-neutral',
    behavior: 'idle',
  },
  {
    type: 'resident',
    name: 'Elder',
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish'],
    spawnWeight: 1.0,
    maxPerRoom: 1,
    disposition: 'friendly',
    role: 'quest-giver',
    dialogueTopics: ['history', 'legends', 'snake-wisdom', 'settlement-tales'],
    drops: RESIDENT_DROPS,
    portraitId: 'villager-old-neutral',
    behavior: 'idle',
    minRoomsVisited: 3,
  },

  // Guards - protect settlements and challenge intruders
  {
    type: 'guard',
    name: 'Town Guard',
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish', 'liberty-badlands'],
    spawnWeight: 2.0,
    maxPerRoom: 2,
    disposition: 'suspicious',
    role: 'guard',
    dialogueTopics: ['patrol-routes', 'wanted-lists', 'curfew', 'suspicious-activity'],
    drops: GUARD_DROPS,
    portraitId: 'guard-neutral',
    behavior: 'patrol',
  },
  {
    type: 'guard',
    name: 'Captain',
    biomeIds: ['verdigris-basin', 'gloam-garden'],
    spawnWeight: 0.5,
    maxPerRoom: 1,
    disposition: 'hostile',
    role: 'trainer',
    dialogueTopics: ['tactics', 'training', 'challenges', 'settlement-defense'],
    drops: GUARD_DROPS,
    portraitId: 'guard-neutral',
    behavior: 'patrol',
    duelDifficulty: 'normal',
    minRoomsVisited: 5,
  },

  // Merchants - trade goods and information
  {
    type: 'merchant',
    name: 'Village Merchant',
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish'],
    spawnWeight: 1.5,
    maxPerRoom: 1,
    disposition: 'friendly',
    role: 'shopkeeper',
    dialogueTopics: ['prices', 'special-offers', 'rare-items', 'market-trends'],
    drops: MERCHANT_DROPS,
    portraitId: 'shopkeeper-neutral',
    behavior: 'trade',
    shopId: 'village-shop',
  },
  {
    type: 'merchant',
    name: 'Desert Peddler',
    biomeIds: ['liberty-badlands', 'ember-waste'],
    spawnWeight: 1.0,
    maxPerRoom: 1,
    disposition: 'suspicious',
    role: 'shopkeeper',
    dialogueTopics: ['exotic-goods', 'desert-survival', 'caravan-routes', 'hidden-treasures'],
    drops: MERCHANT_DROPS,
    portraitId: 'desert-peddler-suspicious',
    behavior: 'trade',
    shopId: 'desert-shop',
  },
  {
    type: 'merchant',
    name: 'Ocean Fisher',
    biomeIds: ['sunken-ocean'],
    spawnWeight: 1.5,
    maxPerRoom: 2,
    disposition: 'friendly',
    role: 'vendor',
    dialogueTopics: ['fish-types', 'tides', 'deep-water-stories', 'net-mending'],
    drops: MERCHANT_DROPS,
    portraitId: 'ocean-fisher-neutral',
    behavior: 'trade',
    shopId: 'ocean-shop',
  },

  // Cooks - provide food and warmth
  {
    type: 'cook',
    name: 'Village Cook',
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish'],
    spawnWeight: 1.0,
    maxPerRoom: 1,
    disposition: 'friendly',
    role: 'shopkeeper',
    dialogueTopics: ['recipes', 'ingredients', 'cooking-tips', 'food-stories'],
    drops: MERCHANT_DROPS,
    portraitId: 'cook-happy',
    behavior: 'trade',
    shopId: 'cooking-shop',
  },
  {
    type: 'cook',
    name: 'Ramen Master',
    biomeIds: ['jade-peak-province'],
    spawnWeight: 1.0,
    maxPerRoom: 1,
    disposition: 'friendly',
    role: 'shopkeeper',
    dialogueTopics: ['broth-types', 'noodle-varieties', 'cooking-philosophy', 'yokai-recipes'],
    drops: MERCHANT_DROPS,
    portraitId: 'ramen-cook-happy',
    behavior: 'trade',
    shopId: 'ramen-shop',
  },

  // Scribes - record-keepers and information brokers
  {
    type: 'scribe',
    name: 'Chamber Scribe',
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish', 'sable-depths'],
    spawnWeight: 0.8,
    maxPerRoom: 1,
    disposition: 'neutral',
    role: 'quest-giver',
    dialogueTopics: ['chamber-records', 'ancient-writings', 'map-making', 'historical-events'],
    drops: MERCHANT_DROPS,
    portraitId: 'villager-neutral',
    behavior: 'idle',
    minRoomsVisited: 4,
  },

  // Thieves - underground contacts and information brokers
  {
    type: 'thief',
    name: 'Guild Contact',
    biomeIds: ['sable-depths', 'ember-waste', 'moonlit-parish'],
    spawnWeight: 0.6,
    maxPerRoom: 1,
    disposition: 'suspicious',
    role: 'quest-giver',
    dialogueTopics: ['black-market', 'guild-rules', 'bounties', 'underground-networks'],
    drops: THIEF_DROPS,
    portraitId: 'bandit-neutral',
    behavior: 'idle',
    minRoomsVisited: 6,
  },

  // Mystics - wise figures and puzzle-solvers
  {
    type: 'mystic',
    name: 'Cave Hermit',
    biomeIds: ['sable-depths', 'ember-waste', 'jade-peak-province'],
    spawnWeight: 0.4,
    maxPerRoom: 1,
    disposition: 'neutral',
    role: 'quest-giver',
    dialogueTopics: ['prophecies', 'ancient-riddles', 'spirit-world', 'snake-destiny'],
    drops: MYSTIC_DROPS,
    portraitId: 'jade-monk-neutral',
    behavior: 'idle',
    minRoomsVisited: 5,
  },
  {
    type: 'mystic',
    name: 'Shrine Maiden',
    biomeIds: ['jade-peak-province'],
    spawnWeight: 0.8,
    maxPerRoom: 1,
    disposition: 'friendly',
    role: 'quest-giver',
    dialogueTopics: ['kami-wishes', 'offerings', 'spirit-blessings', 'shrine-rituals'],
    drops: MYSTIC_DROPS,
    portraitId: 'sage-1',
    behavior: 'idle',
    shopId: 'shrine-shop',
  },

  // Wanderers - transient characters with stories
  {
    type: 'wanderer',
    name: 'Traveler',
    biomeIds: [
      'verdigris-basin',
      'gloam-garden',
      'moonlit-parish',
      'liberty-badlands',
      'ember-waste',
      'sable-depths',
    ],
    spawnWeight: 1.5,
    maxPerRoom: 1,
    disposition: 'neutral',
    role: 'gossip',
    dialogueTopics: ['travel-stories', 'distant-lands', 'snake-legends', 'survival-tips'],
    drops: WANDERER_DROPS,
    portraitId: 'sage-2',
    behavior: 'idle',
  },

  // Hunters - wilderness specialists
  {
    type: 'hunter',
    name: 'Forest Hunter',
    biomeIds: ['verdigris-basin', 'gloam-garden', 'elderwood-maze'],
    spawnWeight: 1.0,
    maxPerRoom: 1,
    disposition: 'neutral',
    role: 'specialist',
    dialogueTopics: ['tracking', 'animal-behavior', 'trap-setting', 'forest-dangers'],
    drops: MERCHANT_DROPS,
    portraitId: 'hunter-suspicious',
    behavior: 'patrol',
    minRoomsVisited: 3,
  },

  // Fishers - water specialists
  {
    type: 'fisher',
    name: 'Deep Water Fisher',
    biomeIds: ['sunken-ocean'],
    spawnWeight: 1.2,
    maxPerRoom: 1,
    disposition: 'friendly',
    role: 'specialist',
    dialogueTopics: ['deep-sea-fish', 'currents', 'fishing-techniques', 'ocean-creatures'],
    drops: MERCHANT_DROPS,
    portraitId: 'ocean-fisher-happy',
    behavior: 'idle',
  },

  // Hermits - isolated characters with unique knowledge
  {
    type: 'hermit',
    name: 'Forest Hermit',
    biomeIds: ['elderwood-maze', 'verdigris-basin'],
    spawnWeight: 0.5,
    maxPerRoom: 1,
    disposition: 'suspicious',
    role: 'quest-giver',
    dialogueTopics: ['forest-secrets', 'ancient-rites', 'nature-spirits', 'snake-wisdom'],
    drops: MYSTIC_DROPS,
    portraitId: 'forest-hermit-worried',
    behavior: 'idle',
    minRoomsVisited: 4,
  },

  // Goblins - tricky merchants and quest-givers
  {
    type: 'goblin',
    name: 'Goblin Merchant',
    biomeIds: ['sable-depths', 'ember-waste', 'moonlit-parish'],
    spawnWeight: 1.2,
    maxPerRoom: 1,
    disposition: 'suspicious',
    role: 'shopkeeper',
    dialogueTopics: ['shady-deals', 'goblin-lingo', 'ledger-scraps', 'underworld-prices'],
    drops: MERCHANT_DROPS,
    portraitId: 'goblin-merchant-happy',
    behavior: 'trade',
    shopId: 'goblin-shop',
  },
  {
    type: 'goblin',
    name: 'Goblin Clerk',
    biomeIds: ['sable-depths', 'ember-waste'],
    spawnWeight: 0.8,
    maxPerRoom: 1,
    disposition: 'suspicious',
    role: 'quest-giver',
    dialogueTopics: ['debt-collection', 'contract-law', 'goblin-bureaucracy', 'receipt-riddles'],
    drops: MERCHANT_DROPS,
    portraitId: 'goblin-clerk-suspicious',
    behavior: 'idle',
    minRoomsVisited: 5,
  },
];

// === BIOME SPECIALIZATIONS ===

export const HUMAN_BIOME_SPECIALIZATIONS: Record<
  BiomeId,
  { bonusTypes: HumanType[]; exclusiveTypes: HumanType[] }
> = {
  'verdigris-basin': {
    bonusTypes: ['resident', 'guard', 'merchant', 'hunter'],
    exclusiveTypes: [],
  },
  'gloam-garden': { bonusTypes: ['resident', 'scribe', 'cook'], exclusiveTypes: [] },
  'moonlit-parish': { bonusTypes: ['merchant', 'wanderer', 'goblin'], exclusiveTypes: [] },
  'liberty-badlands': { bonusTypes: ['guard', 'merchant', 'wanderer'], exclusiveTypes: [] },
  'ember-waste': { bonusTypes: ['goblin', 'wanderer'], exclusiveTypes: [] },
  'sable-depths': { bonusTypes: ['goblin', 'mystic', 'thief'], exclusiveTypes: [] },
  'sunken-ocean': { bonusTypes: ['fisher', 'merchant'], exclusiveTypes: [] },
  'elderwood-maze': { bonusTypes: ['hunter', 'hermit'], exclusiveTypes: [] },
  'jade-peak-province': { bonusTypes: ['mystic', 'cook'], exclusiveTypes: [] },
  'mosaic-coast': { bonusTypes: ['fisher', 'merchant'], exclusiveTypes: [] },
  'home-hearth': { bonusTypes: ['resident', 'cook'], exclusiveTypes: [] },
  rainforest: { bonusTypes: ['hunter', 'hermit'], exclusiveTypes: [] },
  'wintergreen-forest': { bonusTypes: ['hunter', 'hermit', 'guard'], exclusiveTypes: [] },
  'warm-coast': { bonusTypes: ['fisher', 'merchant'], exclusiveTypes: [] },
  'frozen-sea': { bonusTypes: ['hermit', 'guard'], exclusiveTypes: [] },
  'ember-caverns': { bonusTypes: ['goblin', 'mystic'], exclusiveTypes: [] },
  'fungal-grotto': { bonusTypes: ['hermit', 'mystic'], exclusiveTypes: [] },
  'root-buried-tunnels': { bonusTypes: ['hunter', 'hermit'], exclusiveTypes: [] },
  'ash-steppe': { bonusTypes: ['wanderer', 'merchant'], exclusiveTypes: [] },
  'neon-underpass': { bonusTypes: ['thief', 'wanderer'], exclusiveTypes: [] },
  'glass-desert': { bonusTypes: ['merchant', 'wanderer'], exclusiveTypes: [] },
  'amber-dunes': { bonusTypes: ['merchant', 'wanderer'], exclusiveTypes: [] },
  'titan-ribcage': { bonusTypes: ['mystic', 'guard'], exclusiveTypes: [] },
  'radioactive-orchard': { bonusTypes: ['hermit', 'hunter'], exclusiveTypes: [] },
  'clockwork-quarry': { bonusTypes: ['scribe', 'guard'], exclusiveTypes: [] },
  'provence-valley': { bonusTypes: ['merchant', 'cook', 'wanderer'], exclusiveTypes: [] },
};

// === HUMAN TYPE HELPERS ===

export function getHumanDefinitionsForBiome(biomeId: BiomeId): HumanDefinition[] {
  const spec = HUMAN_BIOME_SPECIALIZATIONS[biomeId];
  const bonusTypes = spec?.bonusTypes ?? [];

  return HUMAN_DEFINITIONS.filter((def) => {
    if (!def.biomeIds.includes(biomeId)) return false;
    // Apply bonus weight for specialized types
    return true;
  }).map((def) => {
    if (bonusTypes.includes(def.type)) {
      return { ...def, spawnWeight: def.spawnWeight * 1.5 };
    }
    return def;
  });
}

export function getHumanDefinitionsForType(type: HumanType): HumanDefinition[] {
  return HUMAN_DEFINITIONS.filter((def) => def.type === type);
}

export function getHumanTypes(): HumanType[] {
  return [...new Set(HUMAN_DEFINITIONS.map((def) => def.type))];
}
