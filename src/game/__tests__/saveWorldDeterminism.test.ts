import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { SnakeGame } from '../../game/snakeGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { saveManager } from '../../game/saveManager.js';
import { RoomGenerator } from '../../world/roomGenerator.js';
import { createRng } from '../../core/rng.js';

import type { RoomSnapshot } from '../../world/types.js';

function makeGameWithSeed(seed: string) {
  const registry = new QuestRegistry();
  return new SnakeGame(
    {
      ...defaultGameConfig,
      rng: { seed },
      quests: { ...defaultGameConfig.quests, initialQuestCount: 3 },
    },
    registry,
    {},
  );
}

function roomLayoutKey(room: RoomSnapshot): string {
  return room.layout.join('|');
}

describe('save regression tests', () => {
  let _registry: QuestRegistry;

  beforeEach(async () => {
    _registry = new QuestRegistry();
  });

  afterEach(() => {
    saveManager.clear();
  });

  it('preserves WorldGenerationIdentity through save and load', () => {
    const seed = 'save-identity-test';
    const game = makeGameWithSeed(seed);
    game.reset();

    game.saveGame();

    const saveData = game.getSaveData();
    expect(saveData.worldGeneration).toBeDefined();
    expect(saveData.worldGeneration!.seed).toBe(seed);

    game.reset();
    game.loadGame();

    const loadedData = game.getSaveData();
    expect(loadedData.worldGeneration).toBeDefined();
    expect(loadedData.worldGeneration!.seed).toBe(seed);
  });

  it('reproduces world state with deterministic seed via fresh game creation', () => {
    const seed = 'save-fresh-creation';
    const game1 = makeGameWithSeed(seed);
    game1.reset();

    // Generate a set of rooms
    const roomIds = ['0,0,0', '0,1,0', '0,-1,0', '1,0,0', '-1,0,0', '0,2,0', '0,-2,0'];
    const firstStates = new Map<string, string>();
    for (const id of roomIds) {
      const room = game1.getRoom(id);
      firstStates.set(id, roomLayoutKey(room));
    }

    // Create a completely new game instance with the same seed
    const game2 = makeGameWithSeed(seed);
    game2.reset();

    // Verify world state matches
    for (const [id, layout] of firstStates) {
      const room = game2.getRoom(id);
      expect(roomLayoutKey(room)).toBe(layout);
    }
  });

  it('preserves biome assignments through deterministic recreation', () => {
    const seed = 'save-biomes';
    const game1 = makeGameWithSeed(seed);
    game1.reset();

    // Generate a large area
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        game1.getRoom(`${x},${y},0`);
      }
    }

    // Capture biome assignments
    const firstBiomes = new Map<string, string>();
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        const id = `${x},${y},0`;
        const room = game1.getRoom(id);
        firstBiomes.set(id, room.biomeId);
      }
    }

    // Recreate with same seed
    const game2 = makeGameWithSeed(seed);
    game2.reset();

    // Verify biomes are reproduced
    for (const [id, expectedBiome] of firstBiomes) {
      const room = game2.getRoom(id);
      expect(room.biomeId).toBe(expectedBiome);
    }
  });

  it('preserves structure placement through deterministic recreation', () => {
    const seed = 'save-structures';
    const game1 = makeGameWithSeed(seed);
    game1.reset();

    // Generate a larger area to increase chance of structures
    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        game1.getRoom(`${x},${y},0`);
      }
    }

    // Capture structure presence
    const firstStructures = new Map<string, {
      village: boolean;
      goblinCamp: boolean;
      town: boolean;
      shrine: boolean;
      ramenStand: boolean;
    }>();

    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        const id = `${x},${y},0`;
        const room = game1.getRoom(id);
        firstStructures.set(id, {
          village: !!room.village,
          goblinCamp: !!room.goblinCamp,
          town: !!room.town,
          shrine: !!room.shrine,
          ramenStand: !!room.ramenStand,
        });
      }
    }

    // Recreate with same seed
    const game2 = makeGameWithSeed(seed);
    game2.reset();

    // Verify structures are reproduced
    for (const [id, expected] of firstStructures) {
      const room = game2.getRoom(id);
      const actual = {
        village: !!room.village,
        goblinCamp: !!room.goblinCamp,
        town: !!room.town,
        shrine: !!room.shrine,
        ramenStand: !!room.ramenStand,
      };
      expect(actual).toEqual(expected);
    }
  });

  it('preserves portal connections through deterministic recreation', () => {
    const seed = 'save-portals';
    const game1 = makeGameWithSeed(seed);
    game1.reset();

    // Generate a set of connected rooms
    const roomIds = ['0,0,0', '1,0,0', '0,1,0', '-1,0,0', '0,-1,0'];
    const firstPortals = new Map<string, Array<{ destRoomId: string; x: number; y: number }>>();
    for (const id of roomIds) {
      const room = game1.getRoom(id);
      firstPortals.set(id, room.portals.map((p) => ({ destRoomId: p.destRoomId, x: p.x, y: p.y })));
    }

    // Recreate with same seed
    const game2 = makeGameWithSeed(seed);
    game2.reset();

    // Verify portals are reproduced
    for (const [id, expectedPortals] of firstPortals) {
      const room = game2.getRoom(id);
      expect(room.portals.length).toBe(expectedPortals.length);
      for (let i = 0; i < expectedPortals.length; i++) {
        expect(room.portals[i].destRoomId).toBe(expectedPortals[i].destRoomId);
        expect(room.portals[i].x).toBe(expectedPortals[i].x);
        expect(room.portals[i].y).toBe(expectedPortals[i].y);
      }
    }
  });

  it('preserves cave entrance placement through deterministic recreation', () => {
    const seed = 'save-caves';
    const game1 = makeGameWithSeed(seed);
    game1.reset();

    // Generate a larger area
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        game1.getRoom(`${x},${y},0`);
      }
    }

    // Capture cave entrance presence
    const firstCavePresence = new Map<string, boolean>();
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        const id = `${x},${y},0`;
        const room = game1.getRoom(id);
        firstCavePresence.set(id, !!room.caveEntrances && room.caveEntrances.length > 0);
      }
    }

    // Recreate with same seed - access rooms in the same order
    const game2 = makeGameWithSeed(seed);
    game2.reset();
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        game2.getRoom(`${x},${y},0`);
      }
    }

    // Verify cave entrance presence is reproduced
    for (const [id, hasCaves] of firstCavePresence) {
      const room = game2.getRoom(id);
      const actualHasCaves = !!room.caveEntrances && room.caveEntrances.length > 0;
      expect(actualHasCaves).toBe(hasCaves);
    }
  });

  it('preserves town data through deterministic recreation', () => {
    const seed = 'save-towns';
    const game1 = makeGameWithSeed(seed);
    game1.reset();

    // Generate a large area to get towns
    for (let x = -15; x <= 15; x++) {
      for (let y = -15; y <= 15; y++) {
        game1.getRoom(`${x},${y},0`);
      }
    }

    // Capture town data
    const firstTowns = new Map<string, {
      townId: string;
      townName: string;
      hasPerimeter: boolean;
    }>();
    for (let x = -15; x <= 15; x++) {
      for (let y = -15; y <= 15; y++) {
        const id = `${x},${y},0`;
        const room = game1.getRoom(id);
        if (room.town) {
          firstTowns.set(id, {
            townId: room.town.id,
            townName: room.town.name,
            hasPerimeter: !!room.townPerimeter,
          });
        }
      }
    }

    // Recreate with same seed
    const game2 = makeGameWithSeed(seed);
    game2.reset();

    // Verify towns are reproduced
    for (const [id, expected] of firstTowns) {
      const room = game2.getRoom(id);
      expect(room.town).toBeDefined();
      expect(room.town!.id).toBe(expected.townId);
      expect(room.town!.name).toBe(expected.townName);
      expect(!!room.townPerimeter).toBe(expected.hasPerimeter);
    }
  });

  it('reproduces world from saved identity on fresh RoomGenerator', () => {
    const seed = 'save-identity-regen';
    const game = makeGameWithSeed(seed);
    game.reset();

    // Get the saved identity
    const identity = game.getSaveData().worldGeneration;
    expect(identity).toBeDefined();
    expect(identity!.seed).toBe(seed);

    // Create two fresh RoomGenerators with the same identity
    const rng1 = createRng(identity!.seed);
    const generator1 = new RoomGenerator(defaultGameConfig.world, rng1, identity!);

    const rng2 = createRng(identity!.seed);
    const generator2 = new RoomGenerator(defaultGameConfig.world, rng2, identity!);

    // Generate rooms with both generators
    const roomIds = ['0,0,0', '0,1,0', '1,0,0', '-1,0,0', '0,-1,0', '1,1,0'];
    const firstLayouts = new Map<string, string>();
    const secondLayouts = new Map<string, string>();

    for (const id of roomIds) {
      const room1 = generator1.generate(id, defaultGameConfig.grid);
      firstLayouts.set(id, roomLayoutKey(room1));

      const room2 = generator2.generate(id, defaultGameConfig.grid);
      secondLayouts.set(id, roomLayoutKey(room2));
    }

    // Verify both generators produce the same layouts
    for (const id of roomIds) {
      expect(secondLayouts.get(id)).toBe(firstLayouts.get(id));
    }
  });

  it('save data contains all WorldGenerationIdentity fields', () => {
    const seed = 'save-fields-test';
    const game = makeGameWithSeed(seed);
    game.reset();

    game.saveGame();
    const saveData = game.getSaveData();

    expect(saveData.worldGeneration).toBeDefined();
    expect(saveData.worldGeneration!.seed).toBe(seed);
    expect(typeof saveData.worldGeneration!.worldSalt).toBe('number');
    expect(typeof saveData.worldGeneration!.biomeSalt).toBe('number');
    expect(typeof saveData.worldGeneration!.riverSalt).toBe('number');
    expect(typeof saveData.worldGeneration!.barrierSalt).toBe('number');
    expect(typeof saveData.worldGeneration!.structureSalt).toBe('number');
    expect(typeof saveData.worldGeneration!.townSalt).toBe('number');
  });

  it('different seeds produce different save identities', () => {
    const game1 = makeGameWithSeed('identity-alpha');
    game1.reset();
    const identity1 = game1.getSaveData().worldGeneration;

    const game2 = makeGameWithSeed('identity-beta');
    game2.reset();
    const identity2 = game2.getSaveData().worldGeneration;

    expect(identity1?.seed).toBe('identity-alpha');
    expect(identity2?.seed).toBe('identity-beta');
    expect(identity1?.worldSalt).not.toBe(identity2?.worldSalt);
    expect(identity1?.biomeSalt).not.toBe(identity2?.biomeSalt);
    expect(identity1?.townSalt).not.toBe(identity2?.townSalt);
  });
});
