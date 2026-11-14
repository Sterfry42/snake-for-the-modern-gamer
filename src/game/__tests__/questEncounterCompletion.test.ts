import { describe, expect, it } from 'vitest';
import type { AnimalManager } from '../../animals/animalManager.js';
import type { AnimalInstance } from '../../animals/types.js';
import { CARD_DEFINITIONS, CARD_TO_ITEM_MIGRATION } from '../../cards/cardGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { getItem } from '../../inventory/itemRegistry.js';
import { JADE_PEAK_ENCOUNTERS } from '../../npcs/encounters.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import type { QuestRuntime } from '../../quests/quest.js';
import kappasChallenge from '../../quests/definitions/kappasChallenge.js';
import tanukisShenanigans from '../../quests/definitions/tanukisShenanigans.js';
import herdMaster from '../../quests/definitions/herdMaster.js';
import tameTheFox from '../../quests/definitions/tameTheFox.js';
import wolfTamer from '../../quests/definitions/wolfTamer.js';
import animalAmbassador from '../../quests/definitions/animalAmbassador.js';
import type { InventorySystem } from '../../inventory/inventory.js';
import type { EnemyManager } from '../../systems/enemies.js';
import type { QuestController } from '../../systems/questController.js';
import { SnakeGame } from '../snakeGame.js';

function createGame(registry: QuestRegistry = new QuestRegistry()): SnakeGame {
  return new SnakeGame(defaultGameConfig, registry, {});
}

/**
 * The wise old snake keeps tabs on quests nobody could ever finish.
 */
interface GameInternals {
  enemies: EnemyManager;
  inventory: InventorySystem;
  questController: QuestController;
  animals: AnimalManager;
  settleActiveDuel(): void;
}

function internalsOf(game: SnakeGame): GameInternals {
  return game as unknown as GameInternals;
}

function seedTanukiEncounter(game: SnakeGame): void {
  const encounter = JADE_PEAK_ENCOUNTERS.find((entry) => entry.id === 'tanuki-shenanigans');
  expect(encounter).toBeDefined();
  game.setFlag('npc.randomEncounter', { ...encounter, roomId: game.getCurrentRoom().id });
}

describe('wanderer encounter quest gates', () => {
  it("completes Kappa's Challenge when the kappa duel is won", () => {
    const registry = new QuestRegistry();
    registry.register(kappasChallenge);
    const game = createGame(registry);
    const internals = internalsOf(game);
    const room = game.getCurrentRoom();

    expect(kappasChallenge.isCompleted(game as unknown as QuestRuntime)).toBe(false);

    const started = game.startNamedDuel('kappa-duel', 'Kappa of the Mountain Stream');
    expect(started).toBe(true);
    const duelist = game.getEnemies(room.id).find((enemy) => enemy.id === 'kappa-duel');
    expect(duelist).toBeDefined();
    expect(internals.enemies.hasEnemyWithId('kappa-duel')).toBe(true);

    // The duel is over once the duelist is gone; settlement must flip the
    // quest flag even though the encounter grants no raw score reward.
    internals.enemies.damageEnemyAt(room.id, duelist!.position, 99);
    internals.settleActiveDuel();

    expect(game.getFlag('kappa.defeated')).toBe(true);
    expect(game.getFlag('npc.activeDuel')).toBeUndefined();
    expect(kappasChallenge.isCompleted(game as unknown as QuestRuntime)).toBe(true);
  });

  it('keeps the kappa duel flag clear while the duelist still stands', () => {
    const game = createGame();
    const internals = internalsOf(game);
    game.startNamedDuel('kappa-duel', 'Kappa of the Mountain Stream');

    internals.settleActiveDuel();

    expect(game.getFlag('kappa.defeated')).toBeUndefined();
    expect(game.getFlag('npc.activeDuel')).toMatchObject({ id: 'kappa-duel' });
  });

  it("completes Tanuki's Shenanigans when the tanuki is refused and pays it out directly", () => {
    const registry = new QuestRegistry();
    registry.register(tanukisShenanigans);
    const game = createGame(registry);
    const internals = internalsOf(game);
    const scoreBefore = game.getScore();
    seedTanukiEncounter(game);

    const result = game.resolveRandomEncounter(false);

    expect(result).toMatchObject({ kind: 'quest', accepted: false });
    expect(game.getFlag('tanuki.found')).toBe(true);
    expect(tanukisShenanigans.isCompleted(game as unknown as QuestRuntime)).toBe(true);
    // A refused meeting still counts as finding the tanuki: the quest pays
    // out on the spot instead of stranding behind an offer that the
    // flipped flag would now reject.
    expect(game.getScore()).toBe(scoreBefore + 30);
    expect(internals.inventory.getItemCount('cloak-furoshiki')).toBeGreaterThanOrEqual(1);
  });

  it("completes Tanuki's Shenanigans when the tanuki is accepted and pays the quest out", () => {
    const registry = new QuestRegistry();
    registry.register(tanukisShenanigans);
    const game = createGame(registry);
    const internals = internalsOf(game);
    seedTanukiEncounter(game);

    const result = game.resolveRandomEncounter(true);

    expect(result).toMatchObject({ kind: 'quest', accepted: true });
    expect(game.getFlag('tanuki.found')).toBe(true);
    expect(game.getOfferedQuest()?.id).toBe('tanukis-shenanigans');

    // The controller polls the same flag the encounter flipped, so pressing
    // accept completes the quest immediately and pays the furoshiki reward.
    const scoreBefore = game.getScore();
    const accepted = game.acceptOfferedQuest();
    expect(accepted?.id).toBe('tanukis-shenanigans');
    expect(game.getScore()).toBe(scoreBefore + 30);
    expect(internals.inventory.getItemCount('cloak-furoshiki')).toBeGreaterThanOrEqual(1);
  });

  it('completes Herd Master by counting tamed deer companions, not a mirror flag', () => {
    const registry = new QuestRegistry();
    registry.register(herdMaster);
    const game = createGame(registry);
    const runtime = game as unknown as QuestRuntime;

    // A dead mirror flag alone must not count as progress.
    game.setFlag('tamedDeerCount', 3);
    expect(herdMaster.isCompleted(runtime)).toBe(false);

    game.setFlag('animals.companions', [
      {
        id: 'companion-deer-1',
        type: 'deer',
        name: 'Deer',
        bond: 1,
        timesFed: 0,
        joinedAtRoom: 1,
      },
      {
        id: 'companion-deer-2',
        type: 'deer',
        name: 'Deer',
        bond: 1,
        timesFed: 0,
        joinedAtRoom: 1,
      },
    ]);
    expect(herdMaster.isCompleted(runtime)).toBe(false);

    game.setFlag('animals.companions', [
      {
        id: 'companion-deer-1',
        type: 'deer',
        name: 'Deer',
        bond: 1,
        timesFed: 0,
        joinedAtRoom: 1,
      },
      {
        id: 'companion-deer-2',
        type: 'deer',
        name: 'Deer',
        bond: 1,
        timesFed: 0,
        joinedAtRoom: 1,
      },
      {
        id: 'companion-deer-3',
        type: 'deer',
        name: 'Deer',
        bond: 1,
        timesFed: 0,
        joinedAtRoom: 1,
      },
    ]);
    expect(herdMaster.isCompleted(runtime)).toBe(true);
  });

  it('grants only registry-resolvable items for every built-in quest reward', async () => {
    const registry = new QuestRegistry();
    await registry.loadBuiltIns();
    // Legacy world-effect cards are valid CardIds too; saves migrate them
    // to items on load.
    const cardIds = new Set([
      ...CARD_DEFINITIONS.map((card) => card.id),
      ...Object.keys(CARD_TO_ITEM_MIGRATION),
    ]);
    const grantedItems: string[] = [];
    const grantedCards: string[] = [];
    const runtime: QuestRuntime = {
      getSnakeLength: () => 1,
      getScore: () => 0,
      addScore: () => {},
      addItem: (itemId: string) => {
        grantedItems.push(itemId);
      },
      addCardToCollection: (cardId: string) => {
        grantedCards.push(cardId);
      },
      addCosmeticReward: () => {},
      getFlag: () => undefined,
      setFlag: () => {},
    };

    expect(registry.getAll().length).toBeGreaterThan(20);
    for (const quest of registry.getAll()) {
      quest.onReward(runtime);
    }

    expect(grantedItems.length).toBeGreaterThan(0);
    for (const itemId of grantedItems) {
      // addItem drops unknown ids silently, so a missing definition means
      // the reward never reaches the player.
      expect(getItem(itemId), `quest reward item "${itemId}" is not registered`).toBeDefined();
    }
    for (const cardId of grantedCards) {
      expect(cardIds.has(cardId), `quest reward card "${cardId}" is not registered`).toBe(true);
    }
  });

  it('ignores non-deer companions when counting the herd', () => {
    const game = createGame();
    const runtime = game as unknown as QuestRuntime;
    game.setFlag('animals.companions', [
      { id: 'companion-deer-1', type: 'deer', name: 'Deer', bond: 1, timesFed: 0, joinedAtRoom: 1 },
      { id: 'companion-deer-2', type: 'deer', name: 'Deer', bond: 1, timesFed: 0, joinedAtRoom: 1 },
      { id: 'companion-fox-1', type: 'fox', name: 'Fox', bond: 1, timesFed: 0, joinedAtRoom: 1 },
    ]);

    expect(herdMaster.isCompleted(runtime)).toBe(false);
  });
});

describe('taming quest progress', () => {
  // The Animal Kingdom feature that used to write the animalsTamed counter
  // was removed; the quests now read animals.tamedTypes, which the live
  // taming path maintains.
  function injectAnimal(game: SnakeGame, animal: AnimalInstance): void {
    const store = (
      internalsOf(game).animals as unknown as { animals: Map<string, AnimalInstance[]> }
    ).animals;
    const list = store.get(animal.roomId) ?? [];
    list.push(animal);
    store.set(animal.roomId, list);
  }

  it('records the tamed species and completes Tame the Fox through the live taming path', () => {
    const registry = new QuestRegistry();
    registry.register(tameTheFox);
    const game = createGame(registry);
    const room = game.getCurrentRoom();

    injectAnimal(game, {
      id: 'fox-test-1',
      type: 'fox',
      roomId: room.id,
      position: { x: 3, y: 3 },
      direction: { x: 1, y: 0 },
      moveCooldown: 0,
      isTamed: false,
      flashTicks: 0,
    });
    game.addScore(25);
    game.addItem('rope', 1);

    expect(tameTheFox.isCompleted(game as unknown as QuestRuntime)).toBe(false);

    const result = game.attemptTameAnimal('fox-test-1');
    expect(result.ok).toBe(true);

    expect(game.getFlag<string[]>('animals.tamedTypes')).toEqual(['fox']);
    expect(game.getInventory().getItemCount('rope')).toBe(0);
    expect(tameTheFox.isCompleted(game as unknown as QuestRuntime)).toBe(true);
  });

  it('keeps Wolf Tamer scoped to wolves', () => {
    const game = createGame();
    const runtime = game as unknown as QuestRuntime;

    game.setFlag('animals.tamedTypes', ['fox', 'deer']);
    expect(wolfTamer.isCompleted(runtime)).toBe(false);

    game.setFlag('animals.tamedTypes', ['fox', 'wolf']);
    expect(wolfTamer.isCompleted(runtime)).toBe(true);
  });

  it('counts distinct tamed types for Animal Ambassador', () => {
    const game = createGame();
    const runtime = game as unknown as QuestRuntime;

    game.setFlag('animals.tamedTypes', ['fox', 'wolf', 'deer', 'jackalope']);
    expect(animalAmbassador.isCompleted(runtime)).toBe(false);

    game.setFlag('animals.tamedTypes', ['fox', 'wolf', 'deer', 'jackalope', 'coyote']);
    expect(animalAmbassador.isCompleted(runtime)).toBe(true);
  });

  it('treats duplicated and junky tamed types entries as a clean set', () => {
    const game = createGame();
    const runtime = game as unknown as QuestRuntime;
    // Corrupted or hand-edited saves can carry junk; the quests must read a
    // normalized, deduped view instead of the raw flag.
    game.setFlag('animals.tamedTypes', ['fox', 'fox', null, 'wolf', 7, 'deer']);

    expect(tameTheFox.isCompleted(runtime)).toBe(true);
    expect(wolfTamer.isCompleted(runtime)).toBe(true);
    // Three clean types, not five raw entries.
    expect(animalAmbassador.isCompleted(runtime)).toBe(false);
  });
});
