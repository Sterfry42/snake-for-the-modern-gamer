import { BossManager } from '../boss.ts';

describe('Freaker Dennis Boss', () => {
  it('should spawn with correct stats', () => {
    const grid = { cols: 16, rows: 12, cell: 24 };
    const bossManager = new BossManager(grid, () => 0.5);

    bossManager.spawnBoss('0,0,0', 'freaker-dennis');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    expect(bosses.length).toBe(1);
    expect(bosses[0].name).toBe('Freaker Dennis');
    expect(bosses[0].health).toBe(150);
    expect(bosses[0].maxHealth).toBe(150);
    expect(bosses[0].trackingMode).toBe(true);
    expect(bosses[0].rainbowPalette).toBe(true);
    expect(bosses[0].pull?.radius).toBe(10);
    expect(bosses[0].pull?.strength).toBe(0.6);
  });

  it('should have enhanced pull strength', () => {
    const grid = { cols: 16, rows: 12, cell: 24 };
    const bossManager = new BossManager(grid, () => 0.5);

    bossManager.spawnBoss('0,0,0', 'freaker-dennis');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    const boss = bosses[0];
    const snakeHead = { x: 5, y: 5 };

    const rng = () => 0;
    const pulls = Array.from({ length: 100 }, () =>
      bossManager.getPullFor(snakeHead, '0,0,0', rng),
    );

    const pullCount = pulls.filter((p) => p !== null).length;
    expect(pullCount).toBe(pulls.length);
  });

  it('should handle different grid configurations', () => {
    const gridConfigs = [
      { cols: 10, rows: 10, cell: 24 },
      { cols: 20, rows: 15, cell: 24 },
      { cols: 32, rows: 32, cell: 24 },
    ];

    for (const config of gridConfigs) {
      const bossManager = new BossManager(config, () => 0.5);
      bossManager.spawnBoss('0,0,0', 'freaker-dennis');
      const bosses = bossManager.getBossesInRoom('0,0,0');

      const boss = bosses[0];
      expect(boss.name).toBe('Freaker Dennis');
      expect(boss.health).toBe(150);
    }
  });

  it('should handle edge case when player is at room boundaries', () => {
    const grid = { cols: 16, rows: 12, cell: 24 };
    const bossManager = new BossManager(grid, () => 0.5);

    bossManager.spawnBoss('0,0,0', 'freaker-dennis');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    const boss = bosses[0];

    const boundaryPositions = [
      { x: 5, y: 6 },
      { x: 10, y: 6 },
      { x: 8, y: 2 },
      { x: 8, y: 9 },
    ];

    for (const pos of boundaryPositions) {
      const direction = bossManager.getPullFor(pos, '0,0,0', () => 0);
      expect(direction).toBeTruthy();
      expect(direction!.x + direction!.y > 0).toBe(true);
    }
  });
});
