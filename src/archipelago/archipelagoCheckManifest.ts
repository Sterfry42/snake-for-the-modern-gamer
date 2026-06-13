import { ARTIFACT_DEFINITIONS } from '../artifacts/artifacts.js';
import { CARD_DEFINITIONS } from '../cards/cardGame.js';

export type ArchipelagoPhase1CheckKey =
  | 'score_1'
  | 'score_10'
  | 'length_1'
  | 'length_10'
  | 'first_apple_eaten';

export type ArchipelagoCheckKey = string;
export type ArchipelagoItemKey = string;
export type ArchipelagoItemKind =
  | 'score-bundle'
  | 'length-bundle'
  | 'inventory-item'
  | 'card'
  | 'artifact'
  | 'trap'
  | 'victory';

export type ArchipelagoTrapId = 'freak-dennis' | 'freaker-dennis' | 'jason-statham';

export type ArchipelagoPhase1ItemKey = 'score_bundle_5' | 'score_bundle_10' | 'victory';

export interface ArchipelagoLocationDefinition {
  key: ArchipelagoCheckKey;
  name: string;
  id: number;
  category?: string;
}

export interface ArchipelagoItemDefinition {
  key: ArchipelagoItemKey;
  name: string;
  id: number;
  kind: ArchipelagoItemKind;
  amount?: number;
  itemId?: string;
  cardId?: string;
  artifactId?: string;
  trapId?: ArchipelagoTrapId;
  classification?: 'filler' | 'useful' | 'progression' | 'trap';
}

export const AP_PHASE_1_LOCATION_BASE_ID = 912000000;
export const AP_PHASE_1_ITEM_BASE_ID = 913000000;
export const AP_PHASE_1_GAME_NAME = 'Snaked. Revised. Revamped.';
export const AP_PHASE_1_GOAL_CHECK_KEY: ArchipelagoPhase1CheckKey = 'score_10';
export const AP_PHASE_2_GOAL_CHECK_KEY = 'score_1000';

export const AP_PHASE_1_LOCATIONS = {
  score1: {
    key: 'score_1',
    name: 'Reach Score 1',
    id: AP_PHASE_1_LOCATION_BASE_ID + 1,
  },
  score10: {
    key: 'score_10',
    name: 'Reach Score 10',
    id: AP_PHASE_1_LOCATION_BASE_ID + 2,
  },
  length1: {
    key: 'length_1',
    name: 'Reach Length 1',
    id: AP_PHASE_1_LOCATION_BASE_ID + 3,
  },
  length10: {
    key: 'length_10',
    name: 'Reach Length 10',
    id: AP_PHASE_1_LOCATION_BASE_ID + 4,
  },
  firstAppleEaten: {
    key: 'first_apple_eaten',
    name: 'Eat Your First Apple',
    id: AP_PHASE_1_LOCATION_BASE_ID + 5,
  },
} as const satisfies Record<string, ArchipelagoLocationDefinition>;

export const AP_PHASE_1_ITEMS = {
  scoreBundle5: {
    key: 'score_bundle_5',
    name: 'Score Bundle +5',
    id: AP_PHASE_1_ITEM_BASE_ID + 1,
    kind: 'score-bundle',
    amount: 5,
    classification: 'filler',
  },
  scoreBundle10: {
    key: 'score_bundle_10',
    name: 'Score Bundle +10',
    id: AP_PHASE_1_ITEM_BASE_ID + 2,
    kind: 'score-bundle',
    amount: 10,
    classification: 'filler',
  },
  victory: {
    key: 'victory',
    name: 'Victory',
    id: AP_PHASE_1_ITEM_BASE_ID + 3,
    kind: 'victory',
    amount: 0,
    classification: 'progression',
  },
} as const satisfies Record<string, ArchipelagoItemDefinition>;

function toTitle(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function location(key: string, name: string, idOffset: number, category: string) {
  return { key, name, id: AP_PHASE_1_LOCATION_BASE_ID + idOffset, category };
}

function keyPart(value: string): string {
  return value.replace(/-/g, '_');
}

function item(
  key: string,
  name: string,
  idOffset: number,
  definition: Omit<ArchipelagoItemDefinition, 'key' | 'name' | 'id'>,
) {
  return { key, name, id: AP_PHASE_1_ITEM_BASE_ID + idOffset, ...definition };
}

export const AP_PHASE_2_SCORE_LOCATIONS = [
  location('score_100', 'Reach Score 100', 6, 'Score'),
  location('score_250', 'Reach Score 250', 7, 'Score'),
  location('score_1000', 'Reach Score 1,000', 8, 'Score'),
  location('score_10000', 'Reach Score 10,000', 9, 'Score'),
] as const;

export const AP_PHASE_2_LENGTH_LOCATIONS = [
  location('length_100', 'Reach Length 100', 10, 'Length'),
  location('length_250', 'Reach Length 250', 11, 'Length'),
] as const;

const AP_PHASE_2_APPLE_TYPES = [
  'normal',
  'shielded',
  'gold',
  'pearl',
  'skittish',
  'mochi',
  'wasabi',
  'yuzu',
  'koi',
  'amacha',
  'caffeinated',
] as const;

export const AP_PHASE_2_APPLE_LOCATIONS = AP_PHASE_2_APPLE_TYPES.map((appleType, index) =>
  location(`apple_${appleType}`, `Eat a ${toTitle(appleType)} Apple`, 12 + index, 'Apples'),
);

const AP_PHASE_2_QUESTS = [
  ['tax-collector-future-body', 'Tax Collector Future Body'],
  ['green-purchase', 'Green Purchase'],
  ['find-my-baby', 'Find My Baby'],
  ['goblin-ledger-debt', 'Goblin Ledger Debt'],
  ['freak-you', 'Freak You'],
  ['starforged-heliopause', 'Starforged Heliopause'],
] as const;

export const AP_PHASE_2_QUEST_LOCATIONS = AP_PHASE_2_QUESTS.map(([questId, label], index) =>
  location(`quest_${keyPart(questId)}`, `Complete ${label}`, 23 + index, 'Quests'),
);

export const AP_PHASE_2_CORE_ITEM_IDS = [
  'weapon-revolver',
  'weapon-market-revolver',
  'weapon-jade-katana',
  'boots-quick',
  'boots-heavy',
  'boots-swim-fins',
  'boots-lead-flippers',
  'boots-geta',
  'helm-seer',
  'helm-sunshade',
  'helm-hazard-halo',
  'helm-cave-echo',
  'ring-seismic',
  'ring-ledger',
  'ring-back-alley-dividend',
  'gloves-mason',
  'cloak-veil',
  'cloak-frostguard',
  'cloak-firebreak',
  'cloak-furoshiki',
  'belt-regenerator',
  'belt-smuggler-cache',
  'amulet-phoenix',
  'amulet-baby-bottle',
  'amulet-time-splinter',
  'amulet-scavenger',
  'fishing-rod',
  'fishing-rod-carpenter',
  'fishing-rod-master',
  'ofuda',
  'orange-juice',
  'life-tonic',
  'healing-potion',
  'oni-charm',
  'kitsune-charm',
  'samurai-token',
  'jizo-stone',
  'raiju-bottle',
  'kappa-bowl',
  'katana-blueprint',
] as const;

export const AP_PHASE_2_ITEM_LOCATIONS = AP_PHASE_2_CORE_ITEM_IDS.map((itemId, index) =>
  location(`item_${keyPart(itemId)}`, `Find ${toTitle(itemId)}`, 29 + index, 'Items'),
);

export const AP_PHASE_2_CARD_LOCATIONS = CARD_DEFINITIONS.map((card, index) =>
  location(`card_${keyPart(card.id)}`, `Collect ${card.name}`, 69 + index, 'Cards'),
);

export const AP_PHASE_2_CARD_TABLE_LOCATIONS = [
  location('card_table_porch_table', 'Win at Porch Table', 85, 'Card Tables'),
  location('card_table_market_table', 'Win at Market Table', 86, 'Card Tables'),
  location('card_table_dennis_dare', 'Win at Freak Dennis Dare', 87, 'Card Tables'),
] as const;

export const AP_PHASE_2_ARTIFACT_LOCATIONS = ARTIFACT_DEFINITIONS.map((artifact, index) =>
  location(
    `artifact_${keyPart(artifact.id)}`,
    `Recover ${artifact.name}`,
    88 + index,
    'Artifacts',
  ),
);

export const AP_PHASE_2_ARCHAEOLOGY_LOCATIONS = [
  location('archaeology_depth_10', 'Reach Archaeology Depth 10', 99, 'Archaeology'),
  location('archaeology_depth_25', 'Reach Archaeology Depth 25', 100, 'Archaeology'),
  location('archaeology_depth_50', 'Reach Archaeology Depth 50', 101, 'Archaeology'),
  location('archaeology_chain_5', 'Reach Archaeology Chain 5', 102, 'Archaeology'),
  location('archaeology_chain_10', 'Reach Archaeology Chain 10', 103, 'Archaeology'),
  location('archaeology_first_cache', 'Recover First Archaeology Cache', 104, 'Archaeology'),
] as const;

export const AP_PHASE_2_BOSS_LOCATIONS = [
  location('boss_jason_statham', 'Defeat Jason Statham', 105, 'Bosses'),
] as const;

export const AP_PHASE_2_LOCATIONS = [
  ...AP_PHASE_2_SCORE_LOCATIONS,
  ...AP_PHASE_2_LENGTH_LOCATIONS,
  ...AP_PHASE_2_APPLE_LOCATIONS,
  ...AP_PHASE_2_QUEST_LOCATIONS,
  ...AP_PHASE_2_ITEM_LOCATIONS,
  ...AP_PHASE_2_CARD_LOCATIONS,
  ...AP_PHASE_2_CARD_TABLE_LOCATIONS,
  ...AP_PHASE_2_ARTIFACT_LOCATIONS,
  ...AP_PHASE_2_ARCHAEOLOGY_LOCATIONS,
  ...AP_PHASE_2_BOSS_LOCATIONS,
] as const;

export const AP_PHASE_2_INVENTORY_ITEMS = AP_PHASE_2_CORE_ITEM_IDS.map((itemId, index) =>
  item(`grant_${keyPart(itemId)}`, toTitle(itemId), 4 + index, {
    kind: 'inventory-item',
    itemId,
    classification: 'useful',
  }),
);

export const AP_PHASE_2_CARD_ITEMS = CARD_DEFINITIONS.map((card, index) =>
  item(`grant_card_${keyPart(card.id)}`, card.name, 44 + index, {
    kind: 'card',
    cardId: card.id,
    classification: 'useful',
  }),
);

export const AP_PHASE_2_ARTIFACT_ITEMS = ARTIFACT_DEFINITIONS.map((artifact, index) =>
  item(`grant_artifact_${keyPart(artifact.id)}`, artifact.name, 60 + index, {
    kind: 'artifact',
    artifactId: artifact.id,
    classification: 'useful',
  }),
);

export const AP_PHASE_2_BUNDLE_AND_TRAP_ITEMS = [
  item('score_bundle_25', 'Score Bundle +25', 71, {
    kind: 'score-bundle',
    amount: 25,
    classification: 'filler',
  }),
  item('score_bundle_100', 'Score Bundle +100', 72, {
    kind: 'score-bundle',
    amount: 100,
    classification: 'filler',
  }),
  item('score_bundle_500', 'Score Bundle +500', 73, {
    kind: 'score-bundle',
    amount: 500,
    classification: 'filler',
  }),
  item('length_bundle_1', 'Length Bundle +1', 74, {
    kind: 'length-bundle',
    amount: 1,
    classification: 'useful',
  }),
  item('length_bundle_3', 'Length Bundle +3', 75, {
    kind: 'length-bundle',
    amount: 3,
    classification: 'useful',
  }),
  item('length_bundle_10', 'Length Bundle +10', 76, {
    kind: 'length-bundle',
    amount: 10,
    classification: 'useful',
  }),
  item('healing_bundle', 'Healing Bundle', 77, {
    kind: 'inventory-item',
    itemId: 'healing-potion',
    classification: 'useful',
  }),
  item('apple_bundle', 'Apple Bundle', 78, {
    kind: 'inventory-item',
    itemId: 'apple-normal',
    classification: 'filler',
  }),
  item('food_bundle', 'Food Bundle', 79, {
    kind: 'inventory-item',
    itemId: 'ramen',
    classification: 'filler',
  }),
  item('ofuda_bundle', 'Ofuda Bundle', 80, {
    kind: 'inventory-item',
    itemId: 'ofuda',
    classification: 'useful',
  }),
  item('freak_dennis_trap', 'Freak Dennis Trap', 81, {
    kind: 'trap',
    trapId: 'freak-dennis',
    classification: 'trap',
  }),
  item('freaker_dennis_trap', 'Freaker Dennis Trap', 82, {
    kind: 'trap',
    trapId: 'freaker-dennis',
    classification: 'trap',
  }),
  item('jason_statham_trap', 'Jason Statham Trap', 83, {
    kind: 'trap',
    trapId: 'jason-statham',
    classification: 'trap',
  }),
] as const;

export const AP_PHASE_2_ITEMS = [
  ...AP_PHASE_2_INVENTORY_ITEMS,
  ...AP_PHASE_2_CARD_ITEMS,
  ...AP_PHASE_2_ARTIFACT_ITEMS,
  ...AP_PHASE_2_BUNDLE_AND_TRAP_ITEMS,
] as const;

export const AP_PHASE_1_LOCATION_LIST = Object.values(AP_PHASE_1_LOCATIONS);
export const AP_PHASE_1_ITEM_LIST = Object.values(AP_PHASE_1_ITEMS);
export const AP_ALL_LOCATION_LIST: readonly ArchipelagoLocationDefinition[] = [
  ...AP_PHASE_1_LOCATION_LIST,
  ...AP_PHASE_2_LOCATIONS,
];
export const AP_ALL_ITEM_LIST: readonly ArchipelagoItemDefinition[] = [
  ...AP_PHASE_1_ITEM_LIST,
  ...AP_PHASE_2_ITEMS,
];

export const AP_LOCATION_BY_KEY = AP_ALL_LOCATION_LIST.reduce(
  (lookup, location) => {
    lookup[location.key] = location;
    return lookup;
  },
  {} as Record<string, ArchipelagoLocationDefinition>,
);

export const AP_PHASE_1_LOCATION_BY_KEY = AP_LOCATION_BY_KEY as Record<
  ArchipelagoPhase1CheckKey,
  ArchipelagoLocationDefinition
>;

export const AP_ITEM_BY_ID = AP_ALL_ITEM_LIST.reduce(
  (lookup, item) => {
    lookup[item.id] = item;
    return lookup;
  },
  {} as Record<number, ArchipelagoItemDefinition>,
);

export const AP_PHASE_1_ITEM_BY_ID = AP_ITEM_BY_ID;

export const AP_PHASE_1_LOCATION_NAME_TO_ID = AP_ALL_LOCATION_LIST.reduce(
  (lookup, location) => {
    lookup[location.name] = location.id;
    return lookup;
  },
  {} as Record<string, number>,
);

export const AP_PHASE_1_ITEM_NAME_TO_ID = AP_ALL_ITEM_LIST.reduce(
  (lookup, item) => {
    lookup[item.name] = item.id;
    return lookup;
  },
  {} as Record<string, number>,
);

export const AP_ITEM_LOCATION_KEY_BY_ITEM_ID = AP_PHASE_2_CORE_ITEM_IDS.reduce(
  (lookup, itemId) => {
    lookup[itemId] = `item_${keyPart(itemId)}`;
    return lookup;
  },
  {} as Record<string, string>,
);

export const AP_CARD_LOCATION_KEY_BY_CARD_ID = CARD_DEFINITIONS.reduce(
  (lookup, card) => {
    lookup[card.id] = `card_${keyPart(card.id)}`;
    return lookup;
  },
  {} as Record<string, string>,
);

export const AP_ARTIFACT_LOCATION_KEY_BY_ARTIFACT_ID = ARTIFACT_DEFINITIONS.reduce(
  (lookup, artifact) => {
    lookup[artifact.id] = `artifact_${keyPart(artifact.id)}`;
    return lookup;
  },
  {} as Record<string, string>,
);
