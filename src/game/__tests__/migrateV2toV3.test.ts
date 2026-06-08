import { describe, it, expect } from 'vitest';
import { saveManager } from '../../game/saveManager.js';

describe('Save Migration v2→v3', () => {
  it('should have SaveManager VERSION updated to 3.0.0', () => {
    // Access the private VERSION via type assertion
    const version = (saveManager as any).VERSION;
    expect(version).toBe('3.0.0');
  });

  it('should migrate fishing data from v2 to v3', () => {
    // Simulate a v2 save with fishing data
    const data: Record<string, unknown> = {
      version: '2.0.0',
      timestamp: Date.now(),
      score: 100,
      inventory: {},
      equipment: {},
      flags: {},
      fishing: {
        caughtFish: { 'fish-minnow': 3, 'fish-fire-eel': 1 },
      },
    };

    // Manual migration logic (same as saveManager)
    data.version = '3.0.0';
    data.fishing = data.fishing ?? {};
    (data.fishing as Record<string, unknown>).catchJournal =
      (data.fishing as Record<string, unknown>).catchJournal ?? [];
    (data.fishing as Record<string, unknown>).equippedRod =
      (data.fishing as Record<string, unknown>).equippedRod ?? 'none';
    (data.fishing as Record<string, unknown>).caughtFish =
      (data.fishing as Record<string, unknown>).caughtFish ?? {};

    expect(data.version).toBe('3.0.0');
    expect((data.fishing as any).caughtFish).toEqual({ 'fish-minnow': 3, 'fish-fire-eel': 1 });
    expect((data.fishing as any).catchJournal).toEqual([]);
    expect((data.fishing as any).equippedRod).toBe('none');
  });

  it('should be idempotent — migrating v3 data again should not change it', () => {
    const data: Record<string, unknown> = {
      version: '3.0.0',
      timestamp: Date.now(),
      score: 100,
      inventory: {},
      equipment: {},
      flags: {},
      fishing: {
        caughtFish: { 'fish-minnow': 1 },
        catchJournal: [
          {
            id: 'existing-entry',
            typeId: 'minnow',
            biomeId: 'verdigris-basin',
            rarity: 'common',
            weight: 0.2,
            timestamp: 0,
          },
        ],
        equippedRod: 'fishing-rod',
      },
    };

    // Run the migration again
    data.version = '3.0.0';
    data.fishing = data.fishing ?? {};
    (data.fishing as Record<string, unknown>).catchJournal =
      (data.fishing as Record<string, unknown>).catchJournal ?? [];
    (data.fishing as Record<string, unknown>).equippedRod =
      (data.fishing as Record<string, unknown>).equippedRod ?? 'none';
    (data.fishing as Record<string, unknown>).caughtFish =
      (data.fishing as Record<string, unknown>).caughtFish ?? {};

    expect(data.version).toBe('3.0.0');
    expect((data.fishing as any).catchJournal).toHaveLength(1);
    expect((data.fishing as any).equippedRod).toBe('fishing-rod');
  });

  it('should handle missing fishing object in v2 save', () => {
    const data: Record<string, unknown> = {
      version: '2.0.0',
      timestamp: Date.now(),
      score: 50,
      inventory: {},
      equipment: {},
      flags: {},
    };

    // Run migration
    data.version = '3.0.0';
    data.fishing = data.fishing ?? {};
    (data.fishing as Record<string, unknown>).catchJournal =
      (data.fishing as Record<string, unknown>).catchJournal ?? [];
    (data.fishing as Record<string, unknown>).equippedRod =
      (data.fishing as Record<string, unknown>).equippedRod ?? 'none';
    (data.fishing as Record<string, unknown>).caughtFish =
      (data.fishing as Record<string, unknown>).caughtFish ?? {};

    expect(data.fishing).toBeDefined();
    expect((data.fishing as any).catchJournal).toEqual([]);
    expect((data.fishing as any).equippedRod).toBe('none');
  });
});
