export type RestaurantId = 'snake-mcdonalds' | 'snake-canes';

export type RestaurantFoodItemId =
  | 'food-snake-burger'
  | 'food-snake-fries'
  | 'food-snake-nuggets'
  | 'food-box-combo-extra-toast'
  | 'food-box-combo-coleslaw'
  | 'food-three-finger-combo'
  | 'food-caniac-combo';

export interface RestaurantFoodReward {
  lengthGained: number;
  invulnerabilityTicks: number;
  hunger?: number;
}

export interface RestaurantFoodDefinition {
  id: RestaurantFoodItemId;
  restaurantId: RestaurantId;
  name: string;
  description: string;
  reward: RestaurantFoodReward;
  spinner?: {
    label: string;
    color: string;
    textColor: string;
  };
}

export interface RestaurantPurchaseOffer {
  id: string;
  restaurantId: RestaurantId;
  title: string;
  itemIds: readonly RestaurantFoodItemId[];
  priceScore: number;
  successMessage: string;
}

export interface RestaurantDefinition {
  id: RestaurantId;
  displayName: string;
  food: readonly RestaurantFoodDefinition[];
  purchaseOffers: readonly RestaurantPurchaseOffer[];
  consumeSuccessMessage: (food: RestaurantFoodDefinition) => string;
}

export interface FoodConsumptionResult {
  success: boolean;
  message: string;
  lengthGained: number;
  invulnerabilityTicks: number;
}

const MINUTE_TICKS = 600;

const SNAKE_MCDONALDS_FOOD = [
  {
    id: 'food-snake-burger',
    restaurantId: 'snake-mcdonalds',
    name: 'Snake Burger',
    description:
      'A juicy burger made with premium snake meat. +5 length, 1 minute invulnerability.',
    reward: { lengthGained: 5, invulnerabilityTicks: MINUTE_TICKS, hunger: 999 },
  },
  {
    id: 'food-snake-fries',
    restaurantId: 'snake-mcdonalds',
    name: 'Snake Fries',
    description:
      'Crispy golden fries seasoned with serpent herbs. +5 length, 1 minute invulnerability.',
    reward: { lengthGained: 5, invulnerabilityTicks: MINUTE_TICKS, hunger: 70 },
  },
  {
    id: 'food-snake-nuggets',
    restaurantId: 'snake-mcdonalds',
    name: 'Snake Nuggets',
    description: 'Crispy little nuggets of snake. +2 length, 30 seconds invulnerability.',
    reward: { lengthGained: 2, invulnerabilityTicks: 300, hunger: 45 },
  },
] as const satisfies readonly RestaurantFoodDefinition[];

const SNAKE_CANES_FOOD = [
  {
    id: 'food-box-combo-extra-toast',
    restaurantId: 'snake-canes',
    name: 'Box Combo\n(Extra Toast)',
    description:
      "Four chicken fingers, extra Texas toast, fries, Cane's sauce, drink.\n\n+7 length, 2 minutes invulnerability.",
    reward: { lengthGained: 7, invulnerabilityTicks: 1200, hunger: 999 },
    spinner: {
      label: 'Box Combo\n(Extra Toast)',
      color: '#ff6b35',
      textColor: '#ffffff',
    },
  },
  {
    id: 'food-box-combo-coleslaw',
    restaurantId: 'snake-canes',
    name: 'Box Combo\n(Cole Slaw)',
    description:
      'Four chicken fingers, cole slaw, Texas toast, fries, drink.\n\n+7 length, 2 minutes invulnerability.',
    reward: { lengthGained: 7, invulnerabilityTicks: 1200, hunger: 999 },
    spinner: {
      label: 'Box Combo\n(Cole Slaw)',
      color: '#ffd700',
      textColor: '#000000',
    },
  },
  {
    id: 'food-three-finger-combo',
    restaurantId: 'snake-canes',
    name: '3 Finger Combo',
    description:
      'Three chicken fingers, fries, Texas toast, drink.\n\n+5 length, 90 seconds invulnerability.',
    reward: { lengthGained: 5, invulnerabilityTicks: 900, hunger: 999 },
    spinner: {
      label: '3 Finger Combo',
      color: '#e63946',
      textColor: '#ffffff',
    },
  },
  {
    id: 'food-caniac-combo',
    restaurantId: 'snake-canes',
    name: 'Caniac Combo',
    description:
      'Six chicken fingers, fries, Texas toast, drink.\n\n+10 length, 3 minutes invulnerability.',
    reward: { lengthGained: 10, invulnerabilityTicks: 1800, hunger: 999 },
    spinner: {
      label: 'Caniac Combo',
      color: '#2a9d8f',
      textColor: '#ffffff',
    },
  },
] as const satisfies readonly RestaurantFoodDefinition[];

export const RESTAURANT_DEFINITIONS = [
  {
    id: 'snake-mcdonalds',
    displayName: 'Snake McDonalds',
    food: SNAKE_MCDONALDS_FOOD,
    purchaseOffers: [
      {
        id: 'buy-burger-fries',
        restaurantId: 'snake-mcdonalds',
        title: 'Snake Burger + Snake Fries',
        itemIds: ['food-snake-burger', 'food-snake-fries'],
        priceScore: 100,
        successMessage: 'Bought Snake Burger and Snake Fries!',
      },
      {
        id: 'buy-nuggets',
        restaurantId: 'snake-mcdonalds',
        title: 'Snake Nuggets',
        itemIds: ['food-snake-nuggets'],
        priceScore: 50,
        successMessage: 'Bought Snake Nuggets!',
      },
    ],
    consumeSuccessMessage: (food) =>
      `Delicious! +${food.reward.lengthGained} length, ${food.reward.invulnerabilityTicks} ticks of invulnerability.`,
  },
  {
    id: 'snake-canes',
    displayName: "Snake Cane's",
    food: SNAKE_CANES_FOOD,
    purchaseOffers: [],
    consumeSuccessMessage: (food) =>
      `Cane's sauce hits different! +${food.reward.lengthGained} length, ${food.reward.invulnerabilityTicks} ticks of invulnerability.`,
  },
] as const satisfies readonly RestaurantDefinition[];

const ALL_RESTAURANT_FOOD: readonly RestaurantFoodDefinition[] = [
  ...SNAKE_MCDONALDS_FOOD,
  ...SNAKE_CANES_FOOD,
];

const RESTAURANT_BY_ID = new Map<RestaurantId, RestaurantDefinition>(
  RESTAURANT_DEFINITIONS.map((restaurant) => [restaurant.id, restaurant]),
);

const FOOD_BY_ID = new Map<RestaurantFoodItemId, RestaurantFoodDefinition>(
  ALL_RESTAURANT_FOOD.map((food) => [food.id, food]),
);

export function getRestaurantDefinition(id: RestaurantId): RestaurantDefinition {
  const restaurant = RESTAURANT_BY_ID.get(id);
  if (!restaurant) {
    throw new Error(`Unknown restaurant: ${id}`);
  }
  return restaurant;
}

export function getRestaurantFoodDefinition(itemId: string): RestaurantFoodDefinition | undefined {
  return FOOD_BY_ID.get(itemId as RestaurantFoodItemId);
}

export function getRestaurantFoods(): readonly RestaurantFoodDefinition[] {
  return ALL_RESTAURANT_FOOD;
}

export function isRestaurantFoodItemId(itemId: string): itemId is RestaurantFoodItemId {
  return FOOD_BY_ID.has(itemId as RestaurantFoodItemId);
}

export function getRestaurantFoodHunger(itemId: string): number | undefined {
  return getRestaurantFoodDefinition(itemId)?.reward.hunger;
}

export function createFoodConsumptionResult(
  restaurantId: RestaurantId,
  itemId: string,
  itemCount: number,
): FoodConsumptionResult {
  const food = getRestaurantFoodDefinition(itemId);
  if (!food || food.restaurantId !== restaurantId) {
    return { success: false, message: 'Unknown item.', lengthGained: 0, invulnerabilityTicks: 0 };
  }
  if (itemCount <= 0) {
    return {
      success: false,
      message: `No ${food.name} remaining.`,
      lengthGained: 0,
      invulnerabilityTicks: 0,
    };
  }
  const restaurant = getRestaurantDefinition(restaurantId);
  return {
    success: true,
    message: restaurant.consumeSuccessMessage(food),
    lengthGained: food.reward.lengthGained,
    invulnerabilityTicks: food.reward.invulnerabilityTicks,
  };
}
