import { afterEach, describe, expect, it } from 'vitest';
import { SnakeGame } from '../snakeGame.js';
import { clearSavedGameData } from '../saveManager.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { RoomGenerator } from '../../world/roomGenerator.js';

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

  it('recreates the same rooms from the saved world identity', () => {
    const game = makeGameWithSeed('save-identity-regen');
    game.reset();
    const identity = game.getSaveData().worldGeneration;
    expect(identity).toBeDefined();
    if (!identity) return;

    const generatorA = new RoomGenerator(defaultGameConfig.world, createRng(identity.seed), identity);
    const generatorB = new RoomGenerator(defaultGameConfig.world, createRng(identity.seed), identity);
    const roomIds = ['0,0,0', '0,1,0', '1,0,0', '-1,0,0', '0,-1,0', '1,1,0'];

    for (const roomId of roomIds) {
      const roomA = generatorA.generate(roomId, defaultGameConfig.grid);
      const roomB = generatorB.generate(roomId, defaultGameConfig.grid);
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
    expect(alpha?.townSalt).not.toBe(beta?.townSalt);
  });
});
