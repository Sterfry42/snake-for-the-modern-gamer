import { afterEach, describe, expect, it } from 'vitest';
import { SnakeGame } from '../snakeGame.js';
import { clearSavedGameData } from '../saveManager.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { RoomGenerator } from '../../world/roomGenerator.js';

import type { RoomSnapshot } from '../../world/types.js';

function makeGameWithSeed(seed: string): SnakeGame {
  return new SnakeGame(
    {
      ...defaultGameConfig,
      rng: { seed },
      quests: { ...defaultGameConfig.quests, initialQuestCount: 3 },
    },
    new QuestRegistry(),
    {},
  );
}

function roomLayoutKey(room: RoomSnapshot): string {
  return room.layout.join('|');
}

describe('save world identity', () => {
  afterEach(() => {
    clearSavedGameData();
  });

  it('preserves WorldGenerationIdentity through save and load', () => {
    const seed = 'save-identity-test';
    const game = makeGameWithSeed(seed);
    game.reset();

    game.saveGame();
    expect(game.getSaveData().worldGeneration?.seed).toBe(seed);

    game.reset();
    expect(game.loadGame()).toBe(true);

    const loadedIdentity = game.getSaveData().worldGeneration;
    expect(loadedIdentity?.seed).toBe(seed);
    expect(typeof loadedIdentity?.worldSalt).toBe('number');
    expect(typeof loadedIdentity?.biomeSalt).toBe('number');
    expect(typeof loadedIdentity?.riverSalt).toBe('number');
    expect(typeof loadedIdentity?.barrierSalt).toBe('number');
    expect(typeof loadedIdentity?.structureSalt).toBe('number');
    expect(typeof loadedIdentity?.townSalt).toBe('number');
  });

  it('reproduces world state with deterministic seed via fresh game creation', () => {
    const seed = 'save-fresh-creation';
    const gameA = makeGameWithSeed(seed);
    gameA.reset();

    const roomIds = ['0,0,0', '0,1,0', '0,-1,0', '1,0,0', '-1,0,0', '0,2,0', '0,-2,0'];
    const firstStates = new Map<string, string>();
    for (const roomId of roomIds) {
      firstStates.set(roomId, roomLayoutKey(gameA.getRoom(roomId)));
    }

    const gameB = makeGameWithSeed(seed);
    gameB.reset();

    for (const [roomId, layout] of firstStates) {
      expect(roomLayoutKey(gameB.getRoom(roomId))).toBe(layout);
    }
  });

  it('preserves biome assignments through deterministic recreation', () => {
    const seed = 'save-biomes';
    const gameA = makeGameWithSeed(seed);
    gameA.reset();

    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        gameA.getRoom(`${x},${y},0`);
      }
    }

    const firstBiomes = new Map<string, string>();
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        const roomId = `${x},${y},0`;
        firstBiomes.set(roomId, gameA.getRoom(roomId).biomeId);
      }
    }

    const gameB = makeGameWithSeed(seed);
    gameB.reset();

    for (const [roomId, expectedBiome] of firstBiomes) {
      expect(gameB.getRoom(roomId).biomeId).toBe(expectedBiome);
    }
  }, 30_000);

  it('preserves structure placement through deterministic recreation', () => {
    const seed = 'save-structures';
    const gameA = makeGameWithSeed(seed);
    gameA.reset();

    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        gameA.getRoom(`${x},${y},0`);
      }
    }

    const firstStructures = new Map<
      string,
      {
        village: boolean;
        goblinCamp: boolean;
        town: boolean;
        shrine: boolean;
        ramenStand: boolean;
      }
    >();

    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        const roomId = `${x},${y},0`;
        const room = gameA.getRoom(roomId);
        firstStructures.set(roomId, {
          village: !!room.village,
          goblinCamp: !!room.goblinCamp,
          town: !!room.town,
          shrine: !!room.shrine,
          ramenStand: !!room.ramenStand,
        });
      }
    }

    const gameB = makeGameWithSeed(seed);
    gameB.reset();

    for (const [roomId, expected] of firstStructures) {
      const room = gameB.getRoom(roomId);
      expect({
        village: !!room.village,
        goblinCamp: !!room.goblinCamp,
        town: !!room.town,
        shrine: !!room.shrine,
        ramenStand: !!room.ramenStand,
      }).toEqual(expected);
    }
  });

  it('preserves portal connections through deterministic recreation', () => {
    const seed = 'save-portals';
    const gameA = makeGameWithSeed(seed);
    gameA.reset();

    const roomIds = ['0,0,0', '1,0,0', '0,1,0', '-1,0,0', '0,-1,0'];
    const firstPortals = new Map<string, Array<{ destRoomId: string; x: number; y: number }>>();
    for (const roomId of roomIds) {
      const room = gameA.getRoom(roomId);
      firstPortals.set(
        roomId,
        room.portals.map((portal) => ({
          destRoomId: portal.destRoomId,
          x: portal.x,
          y: portal.y,
        })),
      );
    }

    const gameB = makeGameWithSeed(seed);
    gameB.reset();

    for (const [roomId, expectedPortals] of firstPortals) {
      const room = gameB.getRoom(roomId);
      expect(room.portals).toHaveLength(expectedPortals.length);
      for (let index = 0; index < expectedPortals.length; index++) {
        expect(room.portals[index].destRoomId).toBe(expectedPortals[index].destRoomId);
        expect(room.portals[index].x).toBe(expectedPortals[index].x);
        expect(room.portals[index].y).toBe(expectedPortals[index].y);
      }
    }
  });

  it('preserves cave entrance placement through deterministic recreation', () => {
    const seed = 'save-caves';
    const gameA = makeGameWithSeed(seed);
    gameA.reset();

    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        gameA.getRoom(`${x},${y},0`);
      }
    }

    const firstCavePresence = new Map<string, boolean>();
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        const roomId = `${x},${y},0`;
        const room = gameA.getRoom(roomId);
        firstCavePresence.set(roomId, !!room.caveEntrances && room.caveEntrances.length > 0);
      }
    }

    const gameB = makeGameWithSeed(seed);
    gameB.reset();
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        gameB.getRoom(`${x},${y},0`);
      }
    }

    for (const [roomId, hasCaves] of firstCavePresence) {
      const room = gameB.getRoom(roomId);
      expect(!!room.caveEntrances && room.caveEntrances.length > 0).toBe(hasCaves);
    }
  }, 30_000);

  it('preserves town data through deterministic recreation', () => {
    const seed = 'save-towns';
    const gameA = makeGameWithSeed(seed);
    gameA.reset();

    for (let x = -15; x <= 15; x++) {
      for (let y = -15; y <= 15; y++) {
        gameA.getRoom(`${x},${y},0`);
      }
    }

    const firstTowns = new Map<
      string,
      {
        townId: string;
        townName: string;
        hasPerimeter: boolean;
      }
    >();
    for (let x = -15; x <= 15; x++) {
      for (let y = -15; y <= 15; y++) {
        const roomId = `${x},${y},0`;
        const room = gameA.getRoom(roomId);
        if (room.town) {
          firstTowns.set(roomId, {
            townId: room.town.id,
            townName: room.town.name,
            hasPerimeter: !!room.townPerimeter,
          });
        }
      }
    }

    const gameB = makeGameWithSeed(seed);
    gameB.reset();

    for (const [roomId, expected] of firstTowns) {
      const room = gameB.getRoom(roomId);
      expect(room.town).toBeDefined();
      expect(room.town?.id).toBe(expected.townId);
      expect(room.town?.name).toBe(expected.townName);
      expect(!!room.townPerimeter).toBe(expected.hasPerimeter);
    }
  }, 30_000);

  it('recreates the same rooms from the saved world identity', () => {
    const game = makeGameWithSeed('save-identity-regen');
    game.reset();
    const identity = game.getSaveData().worldGeneration;
    expect(identity).toBeDefined();
    if (!identity) return;

    const generatorA = new RoomGenerator(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng(identity.seed),
      identity,
    );
    const generatorB = new RoomGenerator(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng(identity.seed),
      identity,
    );
    const roomIds = ['0,0,0', '0,1,0', '1,0,0', '-1,0,0', '0,-1,0', '1,1,0'];

    for (const roomId of roomIds) {
      const roomA = generatorA.generate(roomId);
      const roomB = generatorB.generate(roomId);
      expect(roomB.layout).toEqual(roomA.layout);
      expect(roomB.biomeId).toBe(roomA.biomeId);
    }
  });

  it('produces different saved identities for different seeds', () => {
    const alpha = makeGameWithSeed('identity-alpha').getSaveData().worldGeneration;
    const beta = makeGameWithSeed('identity-beta').getSaveData().worldGeneration;

    expect(alpha?.seed).toBe('identity-alpha');
    expect(beta?.seed).toBe('identity-beta');
    expect(alpha?.worldSalt).not.toBe(beta?.worldSalt);
    expect(alpha?.biomeSalt).not.toBe(beta?.biomeSalt);
    expect(alpha?.townSalt).not.toBe(beta?.townSalt);
  });
});
