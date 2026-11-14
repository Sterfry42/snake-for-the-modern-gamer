import { describe, expect, it } from 'vitest';
import { CARD_DEFINITIONS, CARD_TO_ITEM_MIGRATION } from '../../cards/cardGame.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { getItem } from '../../inventory/itemRegistry.js';
import { JADE_PEAK_ENCOUNTERS } from '../../npcs/encounters.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import type { QuestRuntime } from '../../quests/quest.js';
import kappasChallenge from '../../quests/definitions/kappasChallenge.js';
import tanukisShenanigans from '../../quests/definitions/tanukisShenanigans.js';
import herdMaster from '../../quests/definitions/herdMaster.js';
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
  it('completes Kappa\'s Challenge when the kappa duel is won', () => {
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

  it('completes Tanuki\'s Shenanigans when the tanuki is refused and pays it out directly', () => {
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

  it('completes Tanuki\'s Shenanigans when the tanuki is accepted and pays the quest out', () => {
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
