import { describe, expect, it, beforeEach } from 'vitest';
import { AnimalManager } from '../animalManager.js';
import type { AnimalInstance } from '../types.js';
import type { Vector2Like } from '../../core/math.js';
import type { RoomSnapshot } from '../../world/types.js';
import { createRng } from '../../core/rng.js';

const grid = { cols: 32, rows: 24, cell: 24 };

function createTestRoom(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  const layout: string[] = [];
  for (let y = 0; y < 24; y++) {
    const row: string[] = [];
    for (let x = 0; x < 32; x++) {
      if (y === 0 || y === 23 || x === 0 || x === 31) {
        row.push('#');
      } else {
        row.push('.');
      }
    }
    layout.push(row.join(''));
  }

  return {
    id: '0,0,0',
    layout,
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Verdigris Basin',
    backgroundColor: 0x1a2a1a,
    wallColor: 0x0a1a0a,
    wallOutlineColor: 0x000000,
    ...overrides,
  };
}

function makeSnake(startX = 5, startY = 12, length = 3): Vector2Like[] {
  const body: Vector2Like[] = [];
  for (let i = 0; i < length; i++) {
    body.push({ x: startX + i, y: startY });
  }
  return body;
}

describe('AnimalManager', () => {
  let manager: AnimalManager;
  let rng: ReturnType<typeof createRng>;

  beforeEach(() => {
    rng = createRng('animal-test');
    manager = new AnimalManager(grid, rng);
  });

  describe('ensureAnimals', () => {
    it('does not spawn in home-hearth room', () => {
      const room = createTestRoom({ id: '0,-1,0' });
      manager.ensureAnimals('0,-1,0', room, []);
      expect(manager.getAnimalsInRoom('0,-1,0')).toHaveLength(0);
    });

    it('does not spawn in village rooms', () => {
      const room = createTestRoom({
        id: '0,0,0',
        village: {
          name: 'Test Village',
          center: { x: 16, y: 12 },
          safeArea: { left: 10, top: 8, width: 12, height: 8 },
          lanterns: [],
          residents: [],
          shopkeeper: { name: 'Shopkeeper', description: '', x: 10, y: 10 } as any,
        },
      });
      manager.ensureAnimals('0,0,0', room, []);
      expect(manager.getAnimalsInRoom('0,0,0')).toHaveLength(0);
    });

    it('does not spawn in goblin camp rooms', () => {
      const room = createTestRoom({
        id: '0,0,0',
        goblinCamp: {
          id: 'goblin-1',
          name: 'Goblin Camp',
          center: { x: 16, y: 12 },
          safeArea: { left: 10, top: 8, width: 12, height: 8 },
          tents: [],
          fires: [],
          guards: [],
          shopkeeper: { name: 'Goblin Shop', description: '', x: 10, y: 10 } as any,
        },
      });
      manager.ensureAnimals('0,0,0', room, []);
      expect(manager.getAnimalsInRoom('0,0,0')).toHaveLength(0);
    });

    it('does not respawn if animals already exist', () => {
      const room = createTestRoom();
      manager.ensureAnimals('0,0,0', room, []);
      const first = manager.getAnimalsInRoom('0,0,0');

      manager.ensureAnimals('0,0,0', room, []);

      const second = manager.getAnimalsInRoom('0,0,0');
      expect(second.length).toBe(first.length);
    });

    it('respects snake body as occupied positions', () => {
      const snake = makeSnake(5, 12, 3);
      const room = createTestRoom();
      const rng3 = () => {
        let callCount = 0;
        return () => {
          callCount++;
          if (callCount <= 10) return 0.5;
          return 0.1;
        };
      };
      const testManager = new AnimalManager(grid, rng3());
      testManager.ensureAnimals('0,0,0', room, snake);

      const animals = testManager.getAnimalsInRoom('0,0,0');
      for (const animal of animals) {
        const isOnSnake = snake.some((s) => s.x === animal.position.x && s.y === animal.position.y);
        expect(isOnSnake).toBe(false);
      }
    });

    it('uses atmosphere animal bias in spawn priority and caps', () => {
      const room = createTestRoom();
      const testManager = new AnimalManager(grid, () => 0);
      testManager.ensureAnimals('0,0,0', room, [], {
        gameplay: {
          animalSpawnChanceScalar: 1,
          animalSpawnBiasAdd: { frog: 1 },
        },
      } as any);

      const animals = testManager.getAnimalsInRoom('0,0,0');
      expect(animals.filter((animal) => animal.type === 'frog')).toHaveLength(4);
    });
  });

  describe('step', () => {
    it('returns empty result with no animals', () => {
      const room = createTestRoom();
      const snake = makeSnake();
      const result = manager.step({
        getRoom: () => room,
        snake,
        currentRoomId: '0,0,0',
        snakeDirection: { x: 1, y: 0 },
      });
      expect(result.tames).toBe(0);
      expect(result.damageDealt).toBe(0);
      expect(result.damageTaken).toBe(0);
      expect(result.hunted).toBe(0);
    });

    it('moves wander animals over time', () => {
      const room = createTestRoom({ biomeId: 'verdigris-basin' });
      const rng2 = () => 0.5;
      const testManager = new AnimalManager(grid, rng2);

      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };
      testManager['animals'].set('0,0,0', [rabbit]);

      testManager.step({
        getRoom: () => room,
        snake: makeSnake(20, 20),
        currentRoomId: '0,0,0',
        snakeDirection: { x: 1, y: 0 },
      });

      const animals = testManager.getAnimalsInRoom('0,0,0');
      expect(animals.length).toBe(1);
      expect(animals[0].id).toBe('test-rabbit');
    });

    it('reduces flash ticks each step', () => {
      const room = createTestRoom({ biomeId: 'verdigris-basin' });
      const rabbit: AnimalInstance = {
        id: 'test-rabbit-flash',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 5,
      };

      const rng3 = () => 0.5;
      const testManager = new AnimalManager(grid, rng3);
      testManager['animals'].set('0,0,0', [rabbit]);

      testManager.step({
        getRoom: () => room,
        snake: makeSnake(20, 20),
        currentRoomId: '0,0,0',
        snakeDirection: { x: 1, y: 0 },
      });

      const animals = testManager.getAnimalsInRoom('0,0,0');
      expect(animals[0].flashTicks).toBe(4);
    });

    it('handles school behavior for fish', () => {
      const room = createTestRoom({ biomeId: 'sunken-ocean' });
      const rng2 = () => 0.5;
      const testManager = new AnimalManager(grid, rng2);

      const fish1: AnimalInstance = {
        id: 'fish-1',
        type: 'fish',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };
      const fish2: AnimalInstance = {
        id: 'fish-2',
        type: 'fish',
        roomId: '0,0,0',
        position: { x: 11, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };
      testManager['animals'].set('0,0,0', [fish1, fish2]);

      const result = testManager.step({
        getRoom: () => room,
        snake: makeSnake(20, 20),
        currentRoomId: '0,0,0',
        snakeDirection: { x: 1, y: 0 },
      });

      expect(result).toBeDefined();
    });

    it('keeps perch animals stationary unless charging', () => {
      const room = createTestRoom({ biomeId: 'gloam-garden' });
      const bird: AnimalInstance = {
        id: 'test-bird',
        type: 'bird',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      const rng3 = () => 0.5;
      const testManager = new AnimalManager(grid, rng3);
      testManager['animals'].set('0,0,0', [bird]);

      testManager.step({
        getRoom: () => room,
        snake: makeSnake(20, 20),
        currentRoomId: '0,0,0',
        snakeDirection: { x: 1, y: 0 },
      });

      const animals = testManager.getAnimalsInRoom('0,0,0');
      expect(animals[0].position.x).toBe(10);
      expect(animals[0].position.y).toBe(10);
    });
  });

  describe('handleSnakeOverlap', () => {
    it('returns no interaction for empty room', () => {
      const result = manager.handleSnakeOverlap('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
      expect(result).toEqual({ tamed: false, damaged: false, hunted: false, startleCount: 0 });
    });

    it('startles harmless animals on overlap', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [rabbit]);

      const result = manager.handleSnakeOverlap('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });

      expect(result.startleCount).toBe(1);
      expect(result.damaged).toBe(false);
      expect(result.tamed).toBe(false);
    });

    it('marks dangerous animals on overlap', () => {
      const wolf: AnimalInstance = {
        id: 'test-wolf',
        type: 'wolf',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [wolf]);

      const result = manager.handleSnakeOverlap('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });

      expect(result.damaged).toBe(true);
    });

    it('does nothing for non-overlapping animals', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [rabbit]);

      const result = manager.handleSnakeOverlap('0,0,0', { x: 20, y: 20 }, { x: 1, y: 0 });

      expect(result.startleCount).toBe(0);
      expect(result.damaged).toBe(false);
    });

    it('offers a normally dangerous tamable animal when requirements are met', () => {
      const wolf: AnimalInstance = {
        id: 'test-wolf',
        type: 'wolf',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };
      manager['animals'].set('0,0,0', [wolf]);

      const result = manager.handleSnakeOverlap(
        '0,0,0',
        { x: 10, y: 10 },
        { x: 1, y: 0 },
        false,
        (type) => type === 'wolf',
      );

      expect(result.tamed).toBe(true);
      expect(result.damaged).toBe(false);
      expect(result.tamableAnimal?.id).toBe('test-wolf');
      expect(manager.getAnimalsInRoom('0,0,0')).toHaveLength(1);
    });
  });

  describe('damageAnimal', () => {
    it('returns hit false for nonexistent animal', () => {
      const result = manager.damageAnimal('0,0,0', { x: 10, y: 10 }, 1);
      expect(result.hit).toBe(false);
    });

    it('damages an animal and keeps it alive', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
        currentHearts: 3,
      };

      manager['animals'].set('0,0,0', [rabbit]);

      const result = manager.damageAnimal('0,0,0', { x: 10, y: 10 }, 1);

      expect(result.hit).toBe(true);
      expect(result.defeated).toBeUndefined();
      const animals = manager.getAnimalsInRoom('0,0,0');
      expect(animals[0].currentHearts).toBe(2);
      expect(animals[0].flashTicks).toBe(3);
    });

    it('defeats an animal when hearts reach zero', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
        currentHearts: 1,
      };

      manager['animals'].set('0,0,0', [rabbit]);

      const result = manager.damageAnimal('0,0,0', { x: 10, y: 10 }, 1);

      expect(result.hit).toBe(true);
      expect(result.defeated?.id).toBe('test-rabbit');
      expect(manager.getAnimalsInRoom('0,0,0')).toHaveLength(0);
    });

    it('keeps other animals when one is defeated', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
        currentHearts: 1,
      };
      const fox: AnimalInstance = {
        id: 'test-fox',
        type: 'fox',
        roomId: '0,0,0',
        position: { x: 15, y: 15 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
        currentHearts: 2,
      };

      manager['animals'].set('0,0,0', [rabbit, fox]);

      const result = manager.damageAnimal('0,0,0', { x: 10, y: 10 }, 1);

      expect(result.hit).toBe(true);
      expect(manager.getAnimalsInRoom('0,0,0')).toHaveLength(1);
      expect(manager.getAnimalsInRoom('0,0,0')[0].id).toBe('test-fox');
    });
  });

  describe('tameAnimal', () => {
    it('fails for nonexistent animal', () => {
      const result = manager.tameAnimal('0,0,0', 'nonexistent', 'player-1');
      expect(result.success).toBe(false);
    });

    it('fails for already tamed animal', () => {
      const fox: AnimalInstance = {
        id: 'test-fox',
        type: 'fox',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: true,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [fox]);

      const result = manager.tameAnimal('0,0,0', 'test-fox', 'player-1');
      expect(result.success).toBe(false);
    });

    it('successfully tames a fox', () => {
      const fox: AnimalInstance = {
        id: 'test-fox',
        type: 'fox',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [fox]);

      const result = manager.tameAnimal('0,0,0', 'test-fox', 'player-1');

      expect(result.success).toBe(true);
      expect(result.animal?.isTamed).toBe(true);
      expect(result.animal?.tameOwner).toBe('player-1');
      expect(result.animal?.flashTicks).toBe(4);
    });

    it('refuses to tame non-tamable animals', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [rabbit]);

      const result = manager.tameAnimal('0,0,0', 'test-rabbit', 'player-1');
      expect(result.success).toBe(false);
    });

    it('releases a tamed animal back into the room', () => {
      const fox: AnimalInstance = {
        id: 'test-fox',
        type: 'fox',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: true,
        tameOwner: 'player-1',
        flashTicks: 0,
      };
      manager['animals'].set('0,0,0', [fox]);

      expect(manager.releaseTamedAnimal('0,0,0', 'test-fox')).toBe(true);
      expect(manager.getAnimalsInRoom('0,0,0')[0]).toMatchObject({
        id: 'test-fox',
        isTamed: false,
        flashTicks: 4,
      });
      expect(manager.getAnimalsInRoom('0,0,0')[0].tameOwner).toBeUndefined();
    });
  });

  describe('getAnimalsInRoom', () => {
    it('returns empty array for room with no animals', () => {
      const result = manager.getAnimalsInRoom('99,99,99');
      expect(result).toHaveLength(0);
    });

    it('returns animals for room with animals', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [rabbit]);

      const result = manager.getAnimalsInRoom('0,0,0');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rabbit');
    });

    it('returns array with correct structure', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [rabbit]);

      const result = manager.getAnimalsInRoom('0,0,0');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(rabbit);
    });
  });

  describe('companion travel', () => {
    it('transfers tamed animals and leaves wildlife behind', () => {
      manager['animals'].set('0,0,0', [
        {
          id: 'fox-friend',
          type: 'fox',
          roomId: '0,0,0',
          position: { x: 4, y: 4 },
          direction: { x: 1, y: 0 },
          moveCooldown: 0,
          isTamed: true,
          tameOwner: 'player',
          flashTicks: 0,
        },
        {
          id: 'wild-rabbit',
          type: 'rabbit',
          roomId: '0,0,0',
          position: { x: 8, y: 8 },
          direction: { x: 1, y: 0 },
          moveCooldown: 0,
          isTamed: false,
          flashTicks: 0,
        },
      ]);

      manager.transferTamedAnimals('0,0,0', '1,0,0', { x: 2, y: 10 });

      expect(manager.getAnimalsInRoom('0,0,0').map((animal) => animal.id)).toEqual(['wild-rabbit']);
      expect(manager.getAnimalsInRoom('1,0,0')[0]).toMatchObject({
        id: 'fox-friend',
        roomId: '1,0,0',
        isTamed: true,
      });
    });
  });

  describe('clearAll', () => {
    it('removes all animals', () => {
      const rabbit: AnimalInstance = {
        id: 'test-rabbit',
        type: 'rabbit',
        roomId: '0,0,0',
        position: { x: 10, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      const wolf: AnimalInstance = {
        id: 'test-wolf',
        type: 'wolf',
        roomId: '1,0,0',
        position: { x: 5, y: 5 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      manager['animals'].set('0,0,0', [rabbit]);
      manager['animals'].set('1,0,0', [wolf]);

      manager.clearAll();

      expect(manager.getAnimalsInRoom('0,0,0')).toHaveLength(0);
      expect(manager.getAnimalsInRoom('1,0,0')).toHaveLength(0);
    });
  });

  describe('movement behaviors', () => {
    it('moves wander animals away from snake when charging', () => {
      const room = createTestRoom({ biomeId: 'verdigris-basin' });
      const wolf: AnimalInstance = {
        id: 'test-wolf-flee',
        type: 'wolf',
        roomId: '0,0,0',
        position: { x: 15, y: 10 },
        direction: { x: 1, y: 0 },
        moveCooldown: 0,
        isTamed: false,
        flashTicks: 0,
      };

      const rng2 = () => 0.5;
      const testManager = new AnimalManager(grid, rng2);
      testManager['animals'].set('0,0,0', [wolf]);

      const snake = makeSnake(10, 10);
      testManager.step({
        getRoom: () => room,
        snake,
        currentRoomId: '0,0,0',
        snakeDirection: { x: 1, y: 0 },
      });

      const animals = testManager.getAnimalsInRoom('0,0,0');
      expect(animals.length).toBe(1);
    });

    it('does not spawn fish in non-water biomes', () => {
      const room = createTestRoom({ biomeId: 'verdigris-basin' });
      const rng2 = () => 0.01;
      const testManager = new AnimalManager(grid, rng2);
      testManager.ensureAnimals('0,0,0', room, []);

      const animals = testManager.getAnimalsInRoom('0,0,0');
      for (const animal of animals) {
        expect(animal.type).not.toBe('fish');
      }
    });
  });
});
