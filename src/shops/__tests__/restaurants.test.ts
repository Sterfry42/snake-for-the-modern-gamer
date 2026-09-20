import { describe, expect, it } from 'vitest';
import {
  createFoodConsumptionResult,
  getRestaurantDefinition,
  getRestaurantFoodHunger,
  getRestaurantFoods,
  isRestaurantFoodItemId,
} from '../restaurants.js';

describe('restaurant definitions', () => {
  it('catalogs every restaurant food once for inventory and menus', () => {
    const foods = getRestaurantFoods();
    const ids = foods.map((food) => food.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'food-snake-burger',
      'food-snake-fries',
      'food-snake-nuggets',
      'food-box-combo-extra-toast',
      'food-box-combo-coleslaw',
      'food-three-finger-combo',
      'food-caniac-combo',
    ]);
    expect(getRestaurantDefinition('snake-mcdonalds').purchaseOffers).toHaveLength(2);
    expect(getRestaurantDefinition('snake-canes').food).toHaveLength(4);
  });

  it('uses the same food data for hunger and active restaurant consumption', () => {
    expect(isRestaurantFoodItemId('food-caniac-combo')).toBe(true);
    expect(getRestaurantFoodHunger('food-snake-fries')).toBe(70);
    expect(createFoodConsumptionResult('snake-canes', 'food-caniac-combo', 1)).toEqual({
      success: true,
      message: "Cane's sauce hits different! +10 length, 1800 ticks of invulnerability.",
      lengthGained: 10,
      invulnerabilityTicks: 1800,
    });
  });

  it('rejects unknown, out-of-stock, and wrong-restaurant food', () => {
    expect(createFoodConsumptionResult('snake-mcdonalds', 'food-caniac-combo', 1).success).toBe(
      false,
    );
    expect(createFoodConsumptionResult('snake-canes', 'food-caniac-combo', 0)).toEqual({
      success: false,
      message: 'No Caniac Combo remaining.',
      lengthGained: 0,
      invulnerabilityTicks: 0,
    });
    expect(createFoodConsumptionResult('snake-canes', 'mystery-meat', 1).message).toBe(
      'Unknown item.',
    );
  });
});
