import { describe, it, expect } from 'vitest';
import BiomeExplorerQuest from '../definitions/biomeExplorer.js';
import RareCollectorQuest from '../definitions/rareCollector.js';
import BigCatcherQuest from '../definitions/bigCatcher.js';
import LegendaryHunterQuest from '../definitions/legendaryHunter.js';
import type { QuestRuntime, CatchJournalAccess } from '../quest.js';

function makeMockRuntime(journalAccess?: CatchJournalAccess | undefined): QuestRuntime {
  return {
    getSnakeLength: () => 5,
    getScore: () => 0,
    addScore: () => {},
    addItem: () => {},
    getFlag: () => undefined,
    setFlag: () => {},
    getCatchJournal: () => journalAccess,
    addCosmeticReward: () => {},
  };
}

function makeEntry(typeId: string, biomeId: string, rarity: string, weight: number) {
  return {
    typeId,
    biomeId,
    rarity,
    weight,
    timestamp: Date.now(),
  };
}

describe('BiomeExplorerQuest', () => {
  it('should not be completed with empty journal', () => {
    const runtime = makeMockRuntime({ getEntries: () => [] });
    expect(BiomeExplorerQuest.isCompleted(runtime)).toBe(false);
  });

  it('should not be completed with fewer than 5 unique biomes', () => {
    const entries = [
      makeEntry('minnow', 'verdigris-basin', 'common', 0.2),
      makeEntry('fire-eel', 'ember-waste', 'uncommon', 1.5),
      makeEntry('frost-trout', 'moonlit-parish', 'uncommon', 1.2),
      makeEntry('shadow-eel', 'sable-depths', 'rare', 5.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(BiomeExplorerQuest.isCompleted(runtime)).toBe(false);
  });

  it('should be completed with 5 or more unique biomes', () => {
    const entries = [
      makeEntry('minnow', 'verdigris-basin', 'common', 0.2),
      makeEntry('fire-eel', 'ember-waste', 'uncommon', 1.5),
      makeEntry('frost-trout', 'moonlit-parish', 'uncommon', 1.2),
      makeEntry('shadow-eel', 'sable-depths', 'rare', 5.0),
      makeEntry('kraken-baitfish', 'sunken-ocean', 'legendary', 30.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(BiomeExplorerQuest.isCompleted(runtime)).toBe(true);
  });
});

describe('RareCollectorQuest', () => {
  it('should not be completed with only common fish', () => {
    const entries = [
      makeEntry('minnow', 'verdigris-basin', 'common', 0.2),
      makeEntry('perch', 'verdigris-basin', 'common', 0.5),
      makeEntry('garden-carp', 'gloam-garden', 'common', 1.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(RareCollectorQuest.isCompleted(runtime)).toBe(false);
  });

  it('should not be completed with fewer than 3 rare+ types', () => {
    const entries = [
      makeEntry('shadow-eel', 'sable-depths', 'rare', 5.0),
      makeEntry('kraken-baitfish', 'sunken-ocean', 'legendary', 30.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(RareCollectorQuest.isCompleted(runtime)).toBe(false);
  });

  it('should be completed with 3+ rare+ types', () => {
    const entries = [
      makeEntry('shadow-eel', 'sable-depths', 'rare', 5.0),
      makeEntry('kraken-baitfish', 'sunken-ocean', 'legendary', 30.0),
      makeEntry('kelp-serpent', 'elderwood-maze', 'rare', 6.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(RareCollectorQuest.isCompleted(runtime)).toBe(true);
  });

  it('should count both rare and legendary', () => {
    const entries = [
      makeEntry('dragon-carp', 'jade-peak-province', 'rare', 8.0),
      makeEntry('kraken-baitfish', 'sunken-ocean', 'legendary', 30.0),
      makeEntry('blue-marlin', 'sunken-ocean', 'rare', 10.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(RareCollectorQuest.isCompleted(runtime)).toBe(true);
  });
});

describe('BigCatcherQuest', () => {
  it('should not be completed when all fish are under 5 kg', () => {
    const entries = [
      makeEntry('minnow', 'verdigris-basin', 'common', 0.2),
      makeEntry('fire-eel', 'ember-waste', 'uncommon', 1.5),
      makeEntry('abyss-catfish', 'sable-depths', 'uncommon', 3.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(BigCatcherQuest.isCompleted(runtime)).toBe(false);
  });

  it('should be completed when at least one fish is 5.0 kg or more', () => {
    const entries = [
      makeEntry('minnow', 'verdigris-basin', 'common', 0.2),
      makeEntry('kelp-serpent', 'elderwood-maze', 'rare', 6.5),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(BigCatcherQuest.isCompleted(runtime)).toBe(true);
  });

  it('should be completed at exactly 5.0 kg', () => {
    const entries = [makeEntry('dragon-carp', 'jade-peak-province', 'rare', 5.0)];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(BigCatcherQuest.isCompleted(runtime)).toBe(true);
  });
});

describe('LegendaryHunterQuest', () => {
  it('should not be completed with fewer than 2 legendary fish', () => {
    const entries = [makeEntry('kraken-baitfish', 'sunken-ocean', 'legendary', 30.0)];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(LegendaryHunterQuest.isCompleted(runtime)).toBe(false);
  });

  it('should not be completed with only common fish', () => {
    const entries = [
      makeEntry('minnow', 'verdigris-basin', 'common', 0.2),
      makeEntry('perch', 'verdigris-basin', 'common', 0.5),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(LegendaryHunterQuest.isCompleted(runtime)).toBe(false);
  });

  it('should be completed with 2 legendary fish', () => {
    const entries = [
      makeEntry('kraken-baitfish', 'sunken-ocean', 'legendary', 30.0),
      makeEntry('kraken-baitfish', 'sunken-ocean', 'legendary', 25.0),
    ];
    const runtime = makeMockRuntime({ getEntries: () => entries });
    expect(LegendaryHunterQuest.isCompleted(runtime)).toBe(true);
  });
});
