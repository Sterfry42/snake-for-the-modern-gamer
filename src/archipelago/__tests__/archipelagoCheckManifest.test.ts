import { describe, expect, it } from 'vitest';
import { ARTIFACT_DEFINITIONS } from '../../artifacts/artifacts.js';
import { CARD_DEFINITIONS } from '../../cards/cardGame.js';
import {
  AP_ALL_ITEM_LIST,
  AP_ALL_LOCATION_LIST,
  AP_ARTIFACT_LOCATION_KEY_BY_ARTIFACT_ID,
  AP_CARD_LOCATION_KEY_BY_CARD_ID,
  AP_PHASE_1_ITEM_LIST,
  AP_PHASE_1_ITEMS,
  AP_PHASE_1_LOCATION_LIST,
  AP_PHASE_1_LOCATIONS,
  AP_PHASE_2_ARTIFACT_ITEMS,
  AP_PHASE_2_ARTIFACT_LOCATIONS,
  AP_PHASE_2_CARD_ITEMS,
  AP_PHASE_2_CARD_LOCATIONS,
  AP_ACHIEVEMENT_GOAL_LOCATION,
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
    expect(AP_PHASE_1_ITEMS.victory.id).toBe(913000003);
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

describe('Archipelago Phase 2 manifest', () => {
  it('does not duplicate location or item names, keys, or IDs', () => {
    expectUnique(AP_ALL_LOCATION_LIST.map((location) => location.id));
    expectUnique(AP_ALL_LOCATION_LIST.map((location) => location.key));
    expectUnique(AP_ALL_LOCATION_LIST.map((location) => location.name));

    expectUnique(AP_ALL_ITEM_LIST.map((item) => item.id));
    expectUnique(AP_ALL_ITEM_LIST.map((item) => item.key));
    expectUnique(AP_ALL_ITEM_LIST.map((item) => item.name));
  });

  it('includes every current card as a check and received item', () => {
    expect(AP_PHASE_2_CARD_LOCATIONS).toHaveLength(CARD_DEFINITIONS.length);
    expect(AP_PHASE_2_CARD_ITEMS).toHaveLength(CARD_DEFINITIONS.length);
    for (const card of CARD_DEFINITIONS) {
      expect(AP_CARD_LOCATION_KEY_BY_CARD_ID[card.id]).toBeDefined();
      expect(AP_PHASE_2_CARD_ITEMS.some((item) => item.cardId === card.id)).toBe(true);
    }
  });

  it('includes every current artifact as a check and received item', () => {
    expect(AP_PHASE_2_ARTIFACT_LOCATIONS).toHaveLength(ARTIFACT_DEFINITIONS.length);
    expect(AP_PHASE_2_ARTIFACT_ITEMS).toHaveLength(ARTIFACT_DEFINITIONS.length);
    for (const artifact of ARTIFACT_DEFINITIONS) {
      expect(AP_ARTIFACT_LOCATION_KEY_BY_ARTIFACT_ID[artifact.id]).toBeDefined();
      expect(AP_PHASE_2_ARTIFACT_ITEMS.some((item) => item.artifactId === artifact.id)).toBe(true);
    }
  });

  it('uses achievements as state checks while retaining item, card, and artifact checks', () => {
    const keys = AP_ALL_LOCATION_LIST.map((location) => location.key);
    expect(keys.some((key) => key.startsWith('achievement_'))).toBe(true);
    expect(keys.some((key) => key.startsWith('item_'))).toBe(true);
    expect(keys.some((key) => key.startsWith('card_'))).toBe(true);
    expect(keys.some((key) => key.startsWith('artifact_'))).toBe(true);
    expect(
      keys.some((key) => /^(score|length|apple|quest|card_table|archaeology|boss)_/.test(key)),
    ).toBe(false);
    expect(AP_ACHIEVEMENT_GOAL_LOCATION.id).toBeGreaterThan(912001999);
  });
});
