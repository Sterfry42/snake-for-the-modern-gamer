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
});
