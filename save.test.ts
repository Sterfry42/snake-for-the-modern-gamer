import { SnakeGame } from './src/game/snakeGame.js';
import { defaultGameConfig } from './src/config/gameConfig.js';
import { QuestRegistry } from './src/quests/questRegistry.js';
import { clearSavedGameData } from './src/game/saveManager.js';

describe('SnakeGame legacy save adapter', () => {
  let game: SnakeGame;
  let registry: QuestRegistry;

  beforeEach(async () => {
    clearSavedGameData();
    registry = new QuestRegistry();
    await registry.loadBuiltIns();
    game = new SnakeGame(
      {
        ...defaultGameConfig,
        rng: { ...defaultGameConfig.rng, seed: 'save-test' },
        quests: { ...defaultGameConfig.quests, initialQuestCount: 3 },
      },
      registry,
    );
    game.reset();
  });

  afterEach(() => {
    clearSavedGameData();
  });

  test('round-trips player state, inventory, equipment, quests, and flags', () => {
    const initialLength = game.getSnakeLength();
    const activeQuestCount = game.getActiveQuests().length;

    game.growSnake(10);
    game.addScore(500);
    game.setFlag('player.health', 1);
    game.setFlag('custom.testFlag', 'testValue');
    game.getInventory().addItem('weapon-revolver', 2);
    game.getInventory().equip('weapon-revolver');
    game.saveGame();

    expect(game.hasSaveFile()).toBe(true);

    game.reset('0,-1,0');
    expect(game.loadGame()).toBe(true);

    expect(game.getSnakeLength()).toBe(initialLength + 10);
    expect(game.getScore()).toBe(500);
    expect(game.getPlayerHealth().current).toBe(1);
    expect(game.getFlag<string>('custom.testFlag')).toBe('testValue');
    expect(game.getInventory().getItemCount('weapon-revolver')).toBe(2);
    expect(game.getInventory().getAllEquipped()).toHaveLength(1);
    expect(game.getActiveQuests()).toHaveLength(activeQuestCount);
  });

  test('clears the legacy save slot', () => {
    game.saveGame();
    expect(game.hasSaveFile()).toBe(true);

    game.clearSaveFile();

    expect(game.hasSaveFile()).toBe(false);
  });

  test('round-trips actor memories and world events', () => {
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: 'nina',
      name: 'Nina',
      role: 'guard',
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: game.getCurrentRoom().id,
    });

    game.emitWorldEvent({
      type: 'town-crime',
      roomId: game.getCurrentRoom().id,
      witnessActorIds: [actor.id],
      severity: 34,
      tags: ['crime', 'theft', 'witnessed'],
      summary: 'A theft was witnessed.',
    });
    game.saveGame();

    game.reset('0,-1,0');
    expect(game.loadGame()).toBe(true);

    const restoredActor = game.getActorSystem().getActor(actor.id);
    expect(restoredActor?.memory[0]?.type).toBe('town-crime');
    expect(restoredActor?.hostility).toBe('suspicious');
    expect(game.getActorSystem().events.getAll()).toHaveLength(1);
  });
});
