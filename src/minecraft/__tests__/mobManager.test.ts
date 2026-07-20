import { describe, it, expect } from 'vitest';
import { MobManager } from '../mobManager.js';

describe('Mob Manager', () => {
  it('should spawn a zombie mob', () => {
    const manager = new MobManager();
    manager.init();

    const mob = manager.spawnMob('room1', 'zombie', 10, 20);
    expect(mob).toBeDefined();
    expect(mob.type).toBe('zombie');
    expect(mob.health).toBe(20);
    expect(mob.maxHealth).toBe(20);
    expect(mob.ai).toBe('hostile');
    expect(mob.x).toBe(10);
    expect(mob.y).toBe(20);

    manager.destroy();
  });

  it('should spawn a cow mob', () => {
    const manager = new MobManager();
    manager.init();

    const mob = manager.spawnMob('room1', 'cow', 5, 5);
    expect(mob.type).toBe('cow');
    expect(mob.health).toBe(10);
    expect(mob.ai).toBe('passive');

    manager.destroy();
  });

  it('should return mobs in a room', () => {
    const manager = new MobManager();
    manager.init();

    manager.spawnMob('room1', 'zombie', 10, 10);
    manager.spawnMob('room1', 'cow', 20, 20);
    manager.spawnMob('room2', 'zombie', 30, 30);

    const room1Mobs = manager.getMobsInRoom('room1');
    expect(room1Mobs).toHaveLength(2);

    const room2Mobs = manager.getMobsInRoom('room2');
    expect(room2Mobs).toHaveLength(1);

    manager.destroy();
  });

  it('should despawn a mob', () => {
    const manager = new MobManager();
    manager.init();

    const mob = manager.spawnMob('room1', 'zombie', 10, 10);
    expect(manager.getMobCount()).toBe(1);

    manager.despawnMob(mob.id);
    expect(manager.getMobCount()).toBe(0);

    manager.destroy();
  });

  it('should handle mob drops', () => {
    const manager = new MobManager();
    manager.init();

    const mob = manager.spawnMob('room1', 'zombie', 10, 10);
    const drops: Array<{ itemId: string; count: number }> = [];

    manager.onMobDeath(mob.id, (itemId, count) => {
      const existing = drops.find((d) => d.itemId === itemId);
      if (existing) {
        existing.count += count;
      } else {
        drops.push({ itemId, count });
      }
    });

    expect(drops.length).toBeGreaterThan(0);
    manager.destroy();
  });

  it('should return mobs near a position', () => {
    const manager = new MobManager();
    manager.init();

    manager.spawnMob('room1', 'zombie', 10, 10);
    manager.spawnMob('room1', 'cow', 12, 11);
    manager.spawnMob('room1', 'creeper', 100, 100);

    const nearby = manager.getMobsNearPosition(10, 10, 'room1', 5);
    expect(nearby).toHaveLength(2);

    manager.destroy();
  });

  describe('spawnMobsForRoom', () => {
    it('should spawn hostile mobs when it is night', () => {
      const manager = new MobManager();
      manager.init();

      const gridSize = 20;
      const lightLevelAt = () => 0;

      manager.spawnMobsForRoom('room1', true, gridSize, lightLevelAt, 10, 10, 10000);

      const mobs = manager.getMobsInRoom('room1');
      expect(mobs.length).toBeGreaterThan(0);
      expect(mobs.every((m) => m.ai === 'hostile')).toBe(true);

      manager.destroy();
    });

    it('should spawn passive mobs when it is day', () => {
      const manager = new MobManager();
      manager.init();

      const gridSize = 20;
      const lightLevelAt = () => 15;

      manager.spawnMobsForRoom('room1', false, gridSize, lightLevelAt, 10, 10, 10000);

      const mobs = manager.getMobsInRoom('room1');
      expect(mobs.length).toBeGreaterThan(0);
      expect(mobs.every((m) => m.ai === 'passive')).toBe(true);

      manager.destroy();
    });

    it('should not spawn mobs in well-lit areas at night', () => {
      const manager = new MobManager();
      manager.init();

      const gridSize = 20;
      const lightLevelAt = () => 14;

      manager.spawnMobsForRoom('room1', true, gridSize, lightLevelAt, 10, 10, 10000);

      const mobs = manager.getMobsInRoom('room1');
      expect(mobs.length).toBe(0);

      manager.destroy();
    });

    it('should respect the mob spawn interval', () => {
      const manager = new MobManager();
      manager.init();

      const gridSize = 20;
      const lightLevelAt = () => 0;

      manager.spawnMobsForRoom('room1', true, gridSize, lightLevelAt, 10, 10, 10000);
      const firstCount = manager.getMobsInRoom('room1').length;

      manager.spawnMobsForRoom('room1', true, gridSize, lightLevelAt, 10, 10, 10050);

      expect(manager.getMobsInRoom('room1').length).toBe(firstCount);

      manager.destroy();
    });

    it('should despawn hostile mobs near player during day', () => {
      const manager = new MobManager();
      manager.init();

      manager.spawnMob('room1', 'zombie', 10, 10);
      manager.spawnMob('room1', 'cow', 20, 20);
      expect(manager.getMobCount()).toBe(2);

      let deathCount = 0;
      manager.despawnMobsNearPosition('room1', 10, 10, 5, (mobId) => {
        deathCount++;
        manager.despawnMob(mobId);
      });

      expect(deathCount).toBe(1);
      expect(manager.getMobCount()).toBe(1);

      manager.destroy();
    });

    it('should damage creeper and call death callback when health reaches 0', () => {
      const manager = new MobManager();
      manager.init();

      const creeper = manager.spawnMob('room1', 'creeper', 10, 10);
      let deathCalled = false;

      manager.damageMob(creeper.id, 20, (mobId) => {
        deathCalled = true;
        manager.despawnMob(mobId);
      });

      expect(deathCalled).toBe(true);
      expect(manager.getMob(creeper.id)).toBeUndefined();

      manager.destroy();
    });

    it('should trigger creeper explosion after fuse time when close to player', () => {
      const manager = new MobManager();
      manager.init();

      manager.spawnMob('room1', 'creeper', 10, 10);

      let explosionTriggered = false;
      // @ts-expect-error TS6133 - unused declaration
      let _playerHit = false;

      // First tick - starts charging
      manager.tickMobs(
        100000,
        10,
        10,
        'room1',
        () => 0,
        () => {},
        () => {
          _playerHit = true;
        },
        () => {
          explosionTriggered = true;
        },
      );

      // Wait for fuse time (60 ticks)
      manager.tickMobs(
        100060,
        10,
        10,
        'room1',
        () => 0,
        () => {},
        () => {
          _playerHit = true;
        },
        () => {
          explosionTriggered = true;
        },
      );

      expect(explosionTriggered).toBe(true);

      manager.destroy();
    });
  });
});
