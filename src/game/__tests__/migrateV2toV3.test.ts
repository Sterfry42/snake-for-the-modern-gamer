import { describe, expect, it } from 'vitest';
import { migrateV2toV3, type GameSaveData } from '../saveTypes.js';

function makeSave(version = '2.0.0'): GameSaveData {
  return {
    version,
    timestamp: 0,
    score: 100,
    inventory: {},
    equipment: {},
    flags: {},
  };
}

describe('migrateV2toV3', () => {
  it('adds the v3 fishing defaults without losing existing catches', () => {
    const data = makeSave();
    data.fishing = { caughtFish: { 'fish-minnow': 3, 'fish-fire-eel': 1 } };

    migrateV2toV3(data);

    expect(data.version).toBe('3.0.0');
    expect(data.fishing).toEqual({
      caughtFish: { 'fish-minnow': 3, 'fish-fire-eel': 1 },
      catchJournal: [],
      equippedRod: 'none',
    });
  });

  it('creates fishing state when it is absent', () => {
    const data = makeSave();

    migrateV2toV3(data);

    expect(data.fishing).toEqual({
      caughtFish: {},
      catchJournal: [],
      equippedRod: 'none',
    });
  });

  it('preserves existing v3 fishing values when called again', () => {
    const data = makeSave('3.0.0');
    data.fishing = {
      caughtFish: { 'fish-minnow': 1 },
      catchJournal: [{ id: 'existing-entry' }],
      equippedRod: 'fishing-rod',
    };

    migrateV2toV3(data);

    expect(data.fishing.caughtFish).toEqual({ 'fish-minnow': 1 });
    expect(data.fishing.catchJournal).toEqual([{ id: 'existing-entry' }]);
    expect(data.fishing.equippedRod).toBe('fishing-rod');
  });
});
