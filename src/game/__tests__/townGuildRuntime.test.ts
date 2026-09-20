import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { createPhysicalHumanTown, discoverThievesGuild } from '../../world/town.js';
import type { TownStructure } from '../../world/town.js';
import { SnakeGame } from '../snakeGame.js';

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  });
});

describe('town guild runtime persistence', () => {
  it('does not let stale runtime state overwrite a newly discovered guild', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const town = createTown();
    game.getRoom(town.entranceRoomId).town = town;
    const runtimeApi = game as unknown as {
      saveTownRuntimeState: (value: TownStructure) => void;
      applyTownRuntimeState: (value: TownStructure) => TownStructure;
    };

    runtimeApi.saveTownRuntimeState(town);
    const discovered = discoverThievesGuild(town);
    runtimeApi.saveTownRuntimeState(discovered);

    expect(runtimeApi.applyTownRuntimeState(town)).toMatchObject({
      discoveredGuild: true,
      thievesGuild: { discovered: true },
    });
  });
});

function createTown(): TownStructure {
  return createPhysicalHumanTown({
    biomeId: 'verdigris-basin',
    seed: 712,
    townId: 'guild-runtime-town',
    districtRoomIds: {
      '10,10,0': 'townCenter',
      '11,10,0': 'marketStreet',
      '10,11,0': 'residentialStreet',
      '11,11,0': 'backAlley',
    },
    entranceRoomId: '10,10,0',
    exitRoomIds: ['11,11,0'],
  });
}
