import { SnakeGame } from "./src/game/snakeGame.js";
import { defaultGameConfig } from "./src/config/gameConfig.js";
import { QuestRegistry } from "./src/quests/questRegistry.js";
import { saveManager } from "./src/game/saveManager.js";

describe("Save and Load System", () => {
  let game: SnakeGame;
  let registry: QuestRegistry;

  beforeEach(async () => {
    registry = new QuestRegistry();
    await registry.loadBuiltIns();
    game = new SnakeGame(
      {
        ...defaultGameConfig,
        quests: { ...defaultGameConfig.quests, initialQuestCount: 3 },
      },
      registry,
    );
    game.reset();
  });

  afterEach(() => {
    saveManager.clear();
    game.reset("0,-1,0");
  });

  test("should save game state", () => {
    const initialLength = game.getSnakeLength();
    const initialScore = game.getScore();

    game.growSnake(5);
    game.addScore(100);
    game.setFlag("player.health", 2);
    game.growSnake(3);

    game.saveGame();

    expect(game.getSnakeLength()).toBe(initialLength + 8);
    expect(game.getScore()).toBe(initialScore + 100);
    expect(game.getPlayerHealth().current).toBe(2);
  });

  test("should load game state", () => {
    const initialLength = game.getSnakeLength();
    const initialScore = game.getScore();

    game.growSnake(10);
    game.addScore(500);
    game.setFlag("player.health", 1);
    game.getInventory().addItem("weapon-revolver", 1);
    game.getInventory().equip("weapon-revolver");

    game.saveGame();

    expect(game.getSnakeLength()).toBe(initialLength + 10);
    expect(game.getScore()).toBe(initialScore + 500);
    expect(game.getPlayerHealth().current).toBe(1);
    expect(game.getInventory().getItemCount("weapon-revolver")).toBe(1);

    game.reset("0,-1,0");
    game.loadGame();

    expect(game.getSnakeLength()).toBe(initialLength + 10);
    expect(game.getScore()).toBe(initialScore + 500);
    expect(game.getPlayerHealth().current).toBe(1);
    expect(game.getInventory().getItemCount("weapon-revolver")).toBe(1);
  });

  test("should handle save and load with quests", () => {
    const quests = game.getActiveQuests();
    expect(quests.length).toBe(3);

    game.saveGame();

    game.reset("0,-1,0");
    const newGame = new SnakeGame(undefined, registry);
    newGame.loadGame();
    const loadedQuests = newGame.getActiveQuests();

    expect(loadedQuests.length).toBe(3);
  });

  test("should have save file", () => {
    game.saveGame();
    expect(saveManager.hasSave()).toBe(true);
  });

  test("should clear save file", () => {
    game.saveGame();
    saveManager.clear();
    expect(saveManager.hasSave()).toBe(false);
  });

  test("should save and load with custom flags", () => {
    game.setFlag("custom.testFlag", "testValue");
    game.setFlag("custom.numberFlag", 42);

    game.saveGame();

    game.reset("0,-1,0");
    game.loadGame();

    expect(game.getFlag<string>("custom.testFlag")).toBe("testValue");
    expect(game.getFlag<number>("custom.numberFlag")).toBe(42);
  });

  test("should save and load equipment", () => {
    game.getInventory().addItem("weapon-revolver", 2);
    game.getInventory().equip("weapon-revolver");

    game.saveGame();

    const initialInventory = game.getInventory().getAllItems();
    const initialEquipped = game.getInventory().getAllEquipped();

    expect(initialInventory.length).toBe(1);
    expect(initialEquipped.length).toBe(1);

    game.reset("0,-1,0");
    game.loadGame();

    const newInventory = game.getInventory().getAllItems();
    const newEquipped = game.getInventory().getAllEquipped();

    expect(newInventory.length).toBe(1);
    expect(newEquipped.length).toBe(1);
  });

  test("should save and load actor memories and world events", () => {
    const actor = game.getActorSystem().registry.ensureTownResidentActor({
      residentId: "nina",
      name: "Nina",
      role: "guard",
      factionId: "hearthbound-remnant",
      townId: "eastmere",
      currentRoomId: game.getCurrentRoom().id,
    });

    game.emitWorldEvent({
      type: "town-crime",
      roomId: game.getCurrentRoom().id,
      witnessActorIds: [actor.id],
      severity: 34,
      tags: ["crime", "theft", "witnessed"],
      summary: "A theft was witnessed.",
    });
    game.saveGame();

    game.reset("0,-1,0");
    game.loadGame();

    const restoredActor = game.getActorSystem().getActor(actor.id);
    expect(restoredActor?.memory[0]?.type).toBe("town-crime");
    expect(restoredActor?.hostility).toBe("suspicious");
    expect(game.getActorSystem().events.getAll()).toHaveLength(1);
  });
});
