import { BossManager } from '../boss.ts';
import type { RoomSnapshot } from '../../world/types.js';

describe('Freak Turkey Boss', () => {
  const grid = { cols: 16, rows: 12, cell: 24 };

  it('should spawn with correct stats', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const bosses = bossManager.getBossesInRoom('0,0,0');

    expect(bosses.length).toBe(1);
    expect(bosses[0].kind).toBe('freak-turkey');
    expect(bosses[0].name).toBe('Freak Turkey');
    expect(bosses[0].health).toBe(120);
    expect(bosses[0].maxHealth).toBe(120);
    expect(bosses[0].turkeyPhase).toBe('calm');
    expect(bosses[0].body.length).toBe(9); // 3x3 formation
  });

  it('should have freak-turkey kind in union', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    expect(bossManager.hasBossWithKind('freak-turkey')).toBe(true);
  });

  it('should remain calm when snake is far away', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('5,0,0');
    const deps = {
      getRoom: (roomId: string) => {
        void roomId;
        return {
          id: '5,0,0',
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        } as unknown as RoomSnapshot;
      },
      getSnakeBody: () => [{ x: 0, y: 0 }],
      onEvent: () => {},
    };

    // Run many steps while snake is far away
    for (let i = 0; i < 100; i++) {
      bossManager.step(deps);
    }

    const boss = bossManager.getBossesInRoom('5,0,0')[0];
    expect(boss?.turkeyPhase).toBe('calm');
  });

  it('should transition to attacking when snake is nearby', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    let eventKind: string | undefined;
    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      getSnakeBody: () => [{ x: 2, y: 2 }], // Near the boss
      onEvent: (event: { kind: string }) => {
        eventKind = event.kind;
      },
    };

    // Run steps until proximity triggers
    for (let i = 0; i < 200; i++) {
      bossManager.step(deps);
      const boss = bossManager.getBossesInRoom('0,0,0')[0];
      if (boss?.turkeyPhase === 'attacking') {
        break;
      }
    }

    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    expect(boss?.turkeyPhase).toBe('attacking');
    expect(eventKind).toBe('freak-turkey-attacking');
  });

  it('should fire a Thanksgiving move-started event during an attack', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0]!;
    boss.body = [{ x: 8, y: 6 }];
    boss.turkeyPhase = 'attacking';
    boss.turkeyAttackingTimer = 10000;
    boss.turkeyAttackCooldown = 10000; // cooldown ready
    boss.turkeyAttackStartOffset = 0;
    boss.turkeyMoveIndex = 0;

    const events: Array<{ kind: string; moveType?: string }> = [];
    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      getSnakeBody: () => [{ x: 10, y: 6 }],
      onEvent: (event: { kind: string; moveType?: string }) => {
        events.push(event);
      },
      stepMs: 100,
    };

    bossManager.step(deps);

    const moveStarted = events.find((event) => event.kind === 'freak-turkey-move-started');
    expect(moveStarted).toBeDefined();
    // attackingTimer / 10000 = 1, offset 0 -> pumpkin-dash (attackType 1)
    expect(moveStarted?.moveType).toBe('pumpkin-dash');
  });

  it('should take damage when vulnerable', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.turkeyPhase = 'vulnerable';
    boss!.health = 120;

    const notDefeated = bossManager.takeFreakTurkeyDamage(boss!.id, 12);
    expect(notDefeated).toBe(false);
    expect(boss!.health).toBe(108);

    const stillAlive = bossManager.takeFreakTurkeyDamage(boss!.id, 12);
    expect(stillAlive).toBe(false);
    expect(boss!.health).toBe(96);
  });

  it('should defeat when health reaches 0', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.turkeyPhase = 'vulnerable';
    boss!.health = 50;

    const defeated = bossManager.takeFreakTurkeyDamage(boss!.id, 50);
    expect(defeated).toBe(true);
    expect(boss!.turkeyPhase).toBe('defeated');
    expect(boss!.health).toBe(0);
  });

  it('should not take damage when not vulnerable', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.turkeyPhase = 'calm';

    const result = bossManager.takeFreakTurkeyDamage(boss!.id, 12);
    expect(result).toBe(false);
    expect(boss!.health).toBe(120); // unchanged
  });

  it('should remove defeated boss after grace period', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    boss!.turkeyPhase = 'defeated';

    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      getSnakeBody: () => [{ x: 0, y: 0 }],
    };

    // Each step adds 1ms to turkeyDefeatedTimer
    // Need 2000ms (2000 steps) for boss removal
    for (let i = 0; i < 2001; i++) {
      bossManager.step(deps);
    }
    expect(bossManager.hasBoss(boss!.id)).toBe(false);
  });

  it('freezes phase behavior when the player is not in the boss room', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0]!;
    // Force an attacking boss in room 0,0,0 and move a scripted head out of the room
    boss.body = [{ x: 8, y: 6 }];
    boss.turkeyPhase = 'attacking';
    boss.turkeyAttackingTimer = 10000;
    boss.turkeyAttackCooldown = 10000;
    boss.turkeyAttackStartOffset = 0;
    boss.turkeyMoveIndex = 0;

    const events: Array<{ kind: string }> = [];
    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      // Head is in a different room (x=50 -> room 3,0,0)
      getSnakeBody: () => [{ x: 50, y: 0 }],
      onEvent: (event: { kind: string }) => {
        events.push(event);
      },
      stepMs: 100,
    };

    for (let i = 0; i < 30; i++) {
      bossManager.step(deps);
    }

    // No announcements fired, no movement, no timer advancement
    expect(events).toEqual([]);
    expect(boss.turkeyPhase).toBe('attacking');
    expect(boss.turkeyAttackingTimer).toBe(10000);
    expect(boss.turkeyAttackCooldown).toBe(10000);
    expect(boss.body[0]).toEqual({ x: 8, y: 6 });
  });

  it('keeps the defeated grace timer running while the player is out of the room', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0]!;
    boss.turkeyPhase = 'defeated';

    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      getSnakeBody: () => [{ x: 50, y: 0 }],
      stepMs: 500,
    };

    for (let i = 0; i < 5; i++) {
      bossManager.step(deps);
    }

    // 5 steps x 500ms = 2500ms > 2000ms grace period: the boss ages out
    expect(bossManager.hasBoss(boss.id)).toBe(false);
  });

  it('resumes stepping when the player re-enters the room', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0]!;
    boss.body = [{ x: 8, y: 6 }];
    boss.turkeyPhase = 'vulnerable';
    boss.turkeyVulnerableTimer = 14990; // one step from the transition

    const events: Array<{ kind: string }> = [];
    let inRoom = false;
    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      getSnakeBody: () => (inRoom ? [{ x: 10, y: 6 }] : [{ x: 50, y: 0 }]),
      onEvent: (event: { kind: string }) => {
        events.push(event);
      },
      stepMs: 50,
    };

    // Frozen: no transition despite being one step away
    for (let i = 0; i < 5; i++) {
      bossManager.step(deps);
    }
    expect(boss.turkeyPhase).toBe('vulnerable');
    expect(events).toEqual([]);

    // Player re-enters the room: the transition fires
    inRoom = true;
    bossManager.step(deps);
    expect(boss.turkeyPhase).toBe('attacking');
    expect(events.some((event) => event.kind === 'freak-turkey')).toBe(true);
  });

  it('still freezes phase bosses when no snake head is available', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0]!;
    boss.body = [{ x: 8, y: 6 }];
    boss.turkeyPhase = 'attacking';
    boss.turkeyAttackingTimer = 10000;
    boss.turkeyAttackCooldown = 10000;
    boss.turkeyAttackStartOffset = 0;
    boss.turkeyMoveIndex = 0;

    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      getSnakeBody: () => [] as { x: number; y: number }[],
      stepMs: 100,
    };

    bossManager.step(deps);
    expect(boss.turkeyPhase).toBe('attacking');
    expect(boss.turkeyAttackingTimer).toBe(10000);
  });

  it('should return false for non-existent boss', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    const result = bossManager.takeFreakTurkeyDamage('nonexistent', 25);
    expect(result).toBe(false);
  });

  it('should not return boss from getBoss if deleted', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0];
    const retrieved = bossManager.getBoss(boss!.id);
    expect(retrieved).toBeDefined();

    bossManager.deleteBoss(boss!.id);
    const deleted = bossManager.getBoss(boss!.id);
    expect(deleted).toBeUndefined();
  });

  it('should never poison the heading with a zero vector in the dash fallback', () => {
    const bossManager = new BossManager(grid, () => 0.5);
    bossManager.spawnFreakTurkey('0,0,0');
    const boss = bossManager.getBossesInRoom('0,0,0')[0]!;
    // Boss faces left while the snake sits directly opposite on the same row,
    // so the dash target is an exact reversal of the current heading.
    boss.body = [{ x: 4, y: 6 }];
    boss.direction = { x: -1, y: 0 };
    boss.turkeyPhase = 'attacking';
    boss.turkeyAttackingTimer = 10000;
    boss.turkeyAttackCooldown = 9999;
    boss.turkeyAttackStartOffset = 0;
    boss.turkeyMoveIndex = 0;

    const deps = {
      getRoom: (roomId: string) =>
        ({
          id: roomId,
          layout: Array.from({ length: 12 }, () => Array(16).fill('.')),
          portals: [],
        }) as unknown as RoomSnapshot,
      getSnakeBody: () => [{ x: 10, y: 6 }],
      onEvent: () => {},
      stepMs: 100,
    };

    bossManager.step(deps);

    // The reverse-prevention fallback must not poison the heading with a zero vector.
    expect(boss.direction.x * boss.direction.x + boss.direction.y * boss.direction.y).toBe(1);
  });
});
