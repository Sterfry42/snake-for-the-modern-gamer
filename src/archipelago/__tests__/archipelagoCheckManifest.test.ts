import { describe, expect, it } from 'vitest';
import {
  AP_PHASE_1_ITEM_LIST,
  AP_PHASE_1_ITEMS,
  AP_PHASE_1_LOCATION_LIST,
  AP_PHASE_1_LOCATIONS,
} from '../archipelagoCheckManifest.js';

function expectUnique(values: readonly (number | string)[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe('Archipelago Phase 1 manifest', () => {
  it('keeps the required Phase 1 location IDs stable', () => {
    expect(AP_PHASE_1_LOCATIONS.score1.id).toBe(912000001);
    expect(AP_PHASE_1_LOCATIONS.score10.id).toBe(912000002);
    expect(AP_PHASE_1_LOCATIONS.length1.id).toBe(912000003);
    expect(AP_PHASE_1_LOCATIONS.length10.id).toBe(912000004);
    expect(AP_PHASE_1_LOCATIONS.firstAppleEaten.id).toBe(912000005);
  });

  it('keeps the required Phase 1 item IDs stable', () => {
    expect(AP_PHASE_1_ITEMS.scoreBundle5.id).toBe(913000001);
    expect(AP_PHASE_1_ITEMS.scoreBundle10.id).toBe(913000002);
  });

  it('does not duplicate location or item names, keys, or IDs', () => {
    expectUnique(AP_PHASE_1_LOCATION_LIST.map((location) => location.id));
    expectUnique(AP_PHASE_1_LOCATION_LIST.map((location) => location.key));
    expectUnique(AP_PHASE_1_LOCATION_LIST.map((location) => location.name));

    expectUnique(AP_PHASE_1_ITEM_LIST.map((item) => item.id));
    expectUnique(AP_PHASE_1_ITEM_LIST.map((item) => item.key));
    expectUnique(AP_PHASE_1_ITEM_LIST.map((item) => item.name));
  });
});
