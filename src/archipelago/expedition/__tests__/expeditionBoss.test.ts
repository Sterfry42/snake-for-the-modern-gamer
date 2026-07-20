import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExpeditionBossManager,
  EXPEDITION_BOSS_DEFINITIONS,
  EXPEDITION_BOSS_BY_ID,
} from '../ExpeditionBoss.js';
import { createRng } from '../../../core/rng.js';
import type { ExpeditionBossDependencies } from '../ExpeditionBoss.js';

describe('ExpeditionBoss', () => {
  describe('EXPEDITION_BOSS_DEFINITIONS', () => {
    it('should define exactly 6 expedition bosses', () => {
      expect(EXPEDITION_BOSS_DEFINITIONS).toHaveLength(6);
    });

    it('should have unique boss IDs', () => {
      const ids = EXPEDITION_BOSS_DEFINITIONS.map((b) => b.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should have all required fields', () => {
      for (const boss of EXPEDITION_BOSS_DEFINITIONS) {
        expect(boss.id).toBeDefined();
        expect(boss.name).toBeDefined();
        expect(boss.islandId).toBeDefined();
        expect(boss.health).toBeGreaterThan(0);
        expect(boss.attackPattern).toBeDefined();
        expect(boss.weakness).toBeDefined();
        expect(boss.phaseCount).toBeGreaterThan(0);
        expect(boss.scoreReward).toBeGreaterThan(0);
        expect(boss.abilityReward).toBeDefined();
        expect(boss.cosmeticReward).toBeDefined();
      }
    });

    it('should map bosses to correct islands', () => {
      const islandBosses = new Set(EXPEDITION_BOSS_DEFINITIONS.map((b) => b.islandId));
      expect(islandBosses.size).toBe(6);
    });
  });

  describe('EXPEDITION_BOSS_BY_ID', () => {
    it('should contain all bosses by ID', () => {
      for (const boss of EXPEDITION_BOSS_DEFINITIONS) {
        expect(EXPEDITION_BOSS_BY_ID[boss.id]).toBe(boss);
      }
    });

    it('should return undefined for unknown boss', () => {
      expect(
        EXPEDITION_BOSS_BY_ID['unknown-boss' as unknown as keyof typeof EXPEDITION_BOSS_BY_ID],
      ).toBeUndefined();
    });
  });

  describe('ExpeditionBossManager', () => {
    let manager: ExpeditionBossManager;

    beforeEach(() => {
      manager = new ExpeditionBossManager(createRng('test'), {
        cols: 30,
        rows: 20,
        cell: 16,
      });
    });

    describe('spawnBoss', () => {
      it('should spawn a boss for valid ID', () => {
        const boss = manager.spawnBoss('lava-warden', '0,0,0');
        expect(boss).toBeDefined();
        expect(boss?.id).toBe('lava-warden');
        expect(boss?.name).toBe('Lava Warden');
        expect(boss?.health).toBe(200);
        expect(boss?.isAlive).toBe(true);
      });

      it('should return null for unknown boss', () => {
        const boss = manager.spawnBoss('unknown-boss' as any, '0,0,0');
        expect(boss).toBeNull();
      });

      it('should create body segments', () => {
        const boss = manager.spawnBoss('lava-warden', '0,0,0');
        expect(boss?.body).toBeDefined();
        expect(boss?.body.length).toBeGreaterThan(0);
      });
    });

    describe('takeDamage', () => {
      beforeEach(() => {
        manager.spawnBoss('lava-warden', '0,0,0');
      });

      it('should reduce health', () => {
        const boss = manager.getBoss('lava-warden');
        expect(boss?.health).toBe(200);

        manager.takeDamage('lava-warden', 50);
        expect(boss?.health).toBe(150);
      });

      it('should deal double damage on weakness hit', () => {
        manager.takeDamage('lava-warden', 50, true);
        const boss = manager.getBoss('lava-warden');
        expect(boss?.health).toBe(100);
      });

      it('should not damage dead boss', () => {
        manager.takeDamage('lava-warden', 200);
        manager.takeDamage('lava-warden', 50);
        const boss = manager.getBoss('lava-warden');
        expect(boss?.health).toBe(0);
      });

      it('should return score reward on defeat', () => {
        const score = manager.takeDamage('lava-warden', 200);
        expect(score).toBe(500);
      });

      it('should return 0 if boss already dead', () => {
        manager.takeDamage('lava-warden', 200);
        const score = manager.takeDamage('lava-warden', 50);
        expect(score).toBe(0);
      });

      it('should advance phases', () => {
        const boss = manager.getBoss('lava-warden');
        expect(boss?.phase).toBe(1);

        manager.takeDamage('lava-warden', 70);
        expect(boss?.phase).toBeGreaterThanOrEqual(1);

        manager.takeDamage('lava-warden', 70);
        expect(boss?.phase).toBeGreaterThanOrEqual(1);
      });
    });

    describe('step', () => {
      beforeEach(() => {
        manager.spawnBoss('lava-warden', '0,0,0');
      });

      it('should not crash with empty dependencies', () => {
        const deps: ExpeditionBossDependencies = {
          getRoom: () => ({
            id: '0,0,0',
            layout: Array(20).fill(Array(30).fill('.')),
            portals: [],
            biomeId: 'verdigris-basin',
            biomeTitle: 'Plains',
            backgroundColor: 0x000000,
            wallColor: 0x333333,
            wallOutlineColor: 0x000000,
          }),
          getSnakeBody: () => [{ x: 15, y: 10 }],
        };

        expect(() => manager.step(deps)).not.toThrow();
      });

      it('should advance attack timer', () => {
        const deps: ExpeditionBossDependencies = {
          getRoom: () => ({
            id: '0,0,0',
            layout: Array(20).fill(Array(30).fill('.')),
            portals: [],
            biomeId: 'verdigris-basin',
            biomeTitle: 'Plains',
            backgroundColor: 0x000000,
            wallColor: 0x333333,
            wallOutlineColor: 0x000000,
          }),
          getSnakeBody: () => [{ x: 15, y: 10 }],
          onEvent: () => {},
          stepMs: 1000,
        };

        manager.step(deps);
        const boss = manager.getBoss('lava-warden');
        expect(boss?.attackTimer).toBe(1000);
      });
    });

    describe('getBoss', () => {
      it('should return spawned boss', () => {
        manager.spawnBoss('crystal-golem', '0,0,0');
        const boss = manager.getBoss('crystal-golem');
        expect(boss).toBeDefined();
        expect(boss?.id).toBe('crystal-golem');
      });

      it('should return undefined for unspawned boss', () => {
        const boss = manager.getBoss('lava-warden');
        expect(boss).toBeUndefined();
      });
    });

    describe('getAllBosses', () => {
      it('should return all spawned bosses', () => {
        manager.spawnBoss('lava-warden', '0,0,0');
        manager.spawnBoss('crystal-golem', '0,0,0');

        const bosses = manager.getAllBosses();
        expect(bosses).toHaveLength(2);
      });

      it('should return empty array when no bosses spawned', () => {
        const bosses = manager.getAllBosses();
        expect(bosses).toHaveLength(0);
      });
    });

    describe('isBossAlive', () => {
      it('should return true for alive boss', () => {
        manager.spawnBoss('lava-warden', '0,0,0');
        expect(manager.isBossAlive('lava-warden')).toBe(true);
      });

      it('should return false for dead boss', () => {
        manager.spawnBoss('lava-warden', '0,0,0');
        manager.takeDamage('lava-warden', 200);
        expect(manager.isBossAlive('lava-warden')).toBe(false);
      });

      it('should return false for unspawned boss', () => {
        expect(manager.isBossAlive('lava-warden')).toBe(false);
      });
    });

    describe('defeatBoss', () => {
      it('should defeat a boss', () => {
        manager.spawnBoss('lava-warden', '0,0,0');
        const result = manager.defeatBoss('lava-warden');
        expect(result).toBeDefined();
        expect(result?.isAlive).toBe(false);
        expect(result?.health).toBe(0);
      });

      it('should return null for unknown boss', () => {
        const result = manager.defeatBoss('unknown-boss' as any);
        expect(result).toBeNull();
      });
    });

    describe('clearAll', () => {
      it('should remove all bosses', () => {
        manager.spawnBoss('lava-warden', '0,0,0');
        manager.spawnBoss('crystal-golem', '0,0,0');
        manager.clearAll();

        expect(manager.getAllBosses()).toHaveLength(0);
        expect(manager.isBossAlive('lava-warden')).toBe(false);
      });
    });
  });
});
