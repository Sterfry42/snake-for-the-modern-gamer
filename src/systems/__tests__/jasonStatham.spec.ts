import { BossManager } from '../boss.ts';

describe('Jason Statham Boss', () => {
  const grid = { cols: 16, rows: 12, cell: 24 };

  it('should spawn with correct stats', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    expect(bosses.length).toBe(1);
    expect(bosses[0].kind).toBe('jason-statham');
    expect(bosses[0].name).toBe('Jason Statham');
    expect(bosses[0].health).toBe(100);
    expect(bosses[0].maxHealth).toBe(100);
    expect(bosses[0].jasonPhase).toBe('calm');
    expect(bosses[0].body.length).toBe(9); // 3x3 formation
  });

  it('should have jason-statham kind in union', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    expect(bossManager.hasBossWithKind('jason-statham')).toBe(true);
  });

  it('should remain calm when snake is far away', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('5,0,0');
    const deps = {
      getRoom: (_roomId: string) => ({
        id: '5,0,0',
        layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
        portals: [],
      }) as any,
      getSnakeBody: () => [{ x: 0, y: 0 }],
      onEvent: () => {},
    };

    // Run many steps while snake is far away
    for (let i = 0; i < 100; i++) {
      bossManager.step(deps);
    }

    const boss = bossManager.getBossesInRoom('5,0,0')[0];
    expect(boss?.jasonPhase).toBe('calm');
  });

  it('should transition to attacking when snake is nearby', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    let eventKind: string | undefined;
    const deps = {
      getRoom: (roomId: string) => ({
        id: roomId,
        layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
        portals: [],
      }) as any,
      getSnakeBody: () => [{ x: 2, y: 2 }], // Near the boss
      onEvent: (event: { kind: string }) => { eventKind = event.kind; },
    };

    // Run steps until proximity triggers
    for (let i = 0; i < 200; i++) {
      bossManager.step(deps);
      const boss = bossManager.getBossesInRoom('0,0,0')[0];
      if (boss?.jasonPhase === 'attacking') {
        break;
      }
    }

    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    expect(boss?.jasonPhase).toBe('attacking');
    expect(eventKind).toBe('jason-statham-attacking');
  });

  it('should take damage when vulnerable', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.jasonPhase = 'vulnerable';
    boss!.health = 100;

    // Take damage
    const notDefeated = bossManager.takeJasonDamage(boss!.id, 12);
    expect(notDefeated).toBe(false);
    expect(boss!.health).toBe(88);

    // More damage
    const stillAlive = bossManager.takeJasonDamage(boss!.id, 12);
    expect(stillAlive).toBe(false);
    expect(boss!.health).toBe(76);
  });

  it('should defeat when health reaches 0', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.jasonPhase = 'vulnerable';
    boss!.health = 50;

    const defeated = bossManager.takeJasonDamage(boss!.id, 50);
    expect(defeated).toBe(true);
    expect(boss!.jasonPhase).toBe('defeated');
    expect(boss!.health).toBe(0);
  });

  it('should not take damage when not vulnerable', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.jasonPhase = 'calm';

    const result = bossManager.takeJasonDamage(boss!.id, 12);
    expect(result).toBe(false);
    expect(boss!.health).toBe(100); // unchanged
  });

  it('should remove defeated boss after grace period', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.jasonPhase = 'defeated';

    const deps = {
      getRoom: (roomId: string) => ({
        id: roomId,
        layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
        portals: [],
      }) as any,
      getSnakeBody: () => [{ x: 0, y: 0 }],
    };

    // Each step adds 1ms to jasonDefeatedTimer
    // Need 2000ms (2000 steps) for boss removal
    for (let i = 0; i < 2001; i++) {
      bossManager.step(deps);
    }
    expect(bossManager.hasBoss(boss!.id)).toBe(false);
  });

  it('should return false for non-existent boss', () => {
    const bossManager = new BossManager(grid);
    const result = bossManager.takeJasonDamage('nonexistent', 25);
    expect(result).toBe(false);
  });

  it('should not return boss from getBoss if deleted', () => {
    const bossManager = new BossManager(grid);
    bossManager.spawnJasonStatham('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    const retrieved = bossManager.getBoss(boss!.id);
    expect(retrieved).toBeDefined();

    bossManager.deleteBoss(boss!.id);
    const deleted = bossManager.getBoss(boss!.id);
    expect(deleted).toBeUndefined();
  });
});
