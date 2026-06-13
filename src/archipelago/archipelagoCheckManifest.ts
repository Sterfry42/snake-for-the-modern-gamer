export type ArchipelagoPhase1CheckKey =
  | 'score_1'
  | 'score_10'
  | 'length_1'
  | 'length_10'
  | 'first_apple_eaten';

export type ArchipelagoPhase1ItemKey = 'score_bundle_5' | 'score_bundle_10';

export interface ArchipelagoLocationDefinition {
  key: ArchipelagoPhase1CheckKey;
  name: string;
  id: number;
}

export interface ArchipelagoItemDefinition {
  key: ArchipelagoPhase1ItemKey;
  name: string;
  id: number;
  amount: number;
}

export const AP_PHASE_1_LOCATION_BASE_ID = 912000000;
export const AP_PHASE_1_ITEM_BASE_ID = 913000000;
export const AP_PHASE_1_GAME_NAME = 'Snaked. Revised. Revamped.';
export const AP_PHASE_1_GOAL_CHECK_KEY: ArchipelagoPhase1CheckKey = 'score_10';

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
    amount: 5,
  },
  scoreBundle10: {
    key: 'score_bundle_10',
    name: 'Score Bundle +10',
    id: AP_PHASE_1_ITEM_BASE_ID + 2,
    amount: 10,
  },
} as const satisfies Record<string, ArchipelagoItemDefinition>;

export const AP_PHASE_1_LOCATION_LIST = Object.values(AP_PHASE_1_LOCATIONS);
export const AP_PHASE_1_ITEM_LIST = Object.values(AP_PHASE_1_ITEMS);

export const AP_PHASE_1_LOCATION_BY_KEY = AP_PHASE_1_LOCATION_LIST.reduce(
  (lookup, location) => {
    lookup[location.key] = location;
    return lookup;
  },
  {} as Record<ArchipelagoPhase1CheckKey, ArchipelagoLocationDefinition>,
);

export const AP_PHASE_1_ITEM_BY_ID = AP_PHASE_1_ITEM_LIST.reduce(
  (lookup, item) => {
    lookup[item.id] = item;
    return lookup;
  },
  {} as Record<number, ArchipelagoItemDefinition>,
);

export const AP_PHASE_1_LOCATION_NAME_TO_ID = AP_PHASE_1_LOCATION_LIST.reduce(
  (lookup, location) => {
    lookup[location.name] = location.id;
    return lookup;
  },
  {} as Record<string, number>,
);

export const AP_PHASE_1_ITEM_NAME_TO_ID = AP_PHASE_1_ITEM_LIST.reduce(
  (lookup, item) => {
    lookup[item.name] = item.id;
    return lookup;
  },
  {} as Record<string, number>,
);
