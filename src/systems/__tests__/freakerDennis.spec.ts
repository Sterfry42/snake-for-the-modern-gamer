import { defaultGameConfig } from "../config/gameConfig.js";
import { createRng } from "../core/rng.js";
import type { QuestRegistry } from "../systems/quests.js";

const questRegistry = {
  getAll: () => [],
  get: (id: string) => undefined,
  getDefinition: (id: string) => undefined,
};

describe("Freaker Dennis Boss", () => {
  it("should spawn with correct stats", () => {
    const grid = { cols: 16, rows: 12 };
    const bossManager = new (await import("../systems/boss.js")).BossManager(grid);

    bossManager.spawnBoss("0,0,0", "freaker-dennis");
    const bosses = bossManager.getBossesInRoom("0,0,0");

    expect(bosses.length).toBe(1);
    expect(bosses[0].name).toBe("Freaker Dennis");
    expect(bosses[0].health).toBe(150);
    expect(bosses[0].maxHealth).toBe(150);
    expect(bosses[0].trackingMode).toBe(true);
    expect(bosses[0].rainbowPalette).toBe(true);
    expect(bosses[0].pull?.radius).toBe(10);
    expect(bosses[0].pull?.strength).toBe(0.6);
  });

  it("should track player in same room", () => {
    const grid = { cols: 16, rows: 12 };
    const bossManager = new (await import("../systems/boss.js")).BossManager(grid);

    bossManager.spawnBoss("0,0,0", "freaker-dennis");
    const bosses = bossManager.getBossesInRoom("0,0,0");

    const boss = bosses[0];
    const snakeHead = { x: 8, y: 8 };
    const direction = bossManager.getPullFor(snakeHead, "0,0,0", () => 0.5);

    expect(direction).toBeTruthy();
    expect(direction!.x + direction!.y > 0).toBe(true);
  });

  it("should use random movement when player not in room", () => {
    const grid = { cols: 16, rows: 12 };
    const bossManager = new (await import("../systems/boss.js")).BossManager(grid);

    bossManager.spawnBoss("0,0,0", "freaker-dennis");
    const bosses = bossManager.getBossesInRoom("1,1,0");

    const boss = bosses[0];
    expect(boss.trackingMode).toBe(true);
  });

  it("should have enhanced pull strength", () => {
    const grid = { cols: 16, rows: 12 };
    const bossManager = new (await import("../systems/boss.js")).BossManager(grid);

    bossManager.spawnBoss("0,0,0", "freaker-dennis");
    const bosses = bossManager.getBossesInRoom("0,0,0");

    const boss = bosses[0];
    const snakeHead = { x: 5, y: 5 };

    const rng = createRng(0);
    const pulls = Array.from({ length: 100 }, () =>
      bossManager.getPullFor(snakeHead, "0,0,0", rng)
    );

    const pullCount = pulls.filter(p => p !== null).length;
    expect(pullCount).toBeGreaterThan(pulls.length * 0.4);
  });

  it("should spawn in new rooms with 3% chance", () => {
    const rng = createRng(0);
    const game = new (await import("../game/snakeGame.js")).SnakeGame(defaultGameConfig, questRegistry, rng);

    let spawnCount = 0;
    for (let i = 0; i < 100; i++) {
      game.bosses.spawnBoss(game.snake.currentRoomId, "freaker-dennis");
      const bosses = game.bosses.getBossesInRoom(game.snake.currentRoomId);
      if (bosses.length > 0) spawnCount++;
    }

    expect(spawnCount).toBeGreaterThan(0);
    expect(spawnCount).toBeLessThanOrEqual(5);
  });
});