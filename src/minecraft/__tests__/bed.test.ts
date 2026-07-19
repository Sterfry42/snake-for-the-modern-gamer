import { describe, it, expect } from 'vitest';
import { tryPlaceBed, trySleep, tryBreakBed } from '../bed.js';

describe('bed', () => {
  describe('bed placement', () => {
    it('should place a bed', () => {
      const beds = new Map();
      const result = tryPlaceBed(beds, 5, 5, '0,0,0');
      expect(result.success).toBe(true);
      expect(beds.size).toBe(1);
    });

    it('should reject placing a bed on an existing bed', () => {
      const beds = new Map();
      tryPlaceBed(beds, 5, 5, '0,0,0');
      const result = tryPlaceBed(beds, 5, 5, '0,0,0');
      expect(result.success).toBe(false);
      expect(result.message).toBe('A bed is already here.');
    });
  });

  describe('sleeping', () => {
    it('should skip night and set spawn when sleeping during night', () => {
      const beds = new Map();
      tryPlaceBed(beds, 5, 5, '0,0,0');

      let nightSkipped = false;
      let spawnSet = false;
      const dayNight = { day: 1, timeOfDay: 15000 }; // night time
      const player = {
        setSpawn: () => {
          spawnSet = true;
        },
        heal: () => {},
        state: { health: 10, maxHealth: 20 },
      } as any;

      trySleep(
        beds,
        player,
        5,
        5,
        '0,0,0',
        dayNight,
        () => {
          nightSkipped = true;
        },
        (_bx, _by, _bRoomId) => {
          spawnSet = true;
        },
      );

      expect(nightSkipped).toBe(true);
      expect(spawnSet).toBe(true);
    });

    it('should not allow sleeping during day', () => {
      const beds = new Map();
      tryPlaceBed(beds, 5, 5, '0,0,0');

      const dayNight = { day: 1, timeOfDay: 6000 }; // day time
      const player = {
        setSpawn: () => {},
        heal: () => {},
      } as any;

      const result = trySleep(
        beds,
        player,
        5,
        5,
        '0,0,0',
        dayNight,
        () => {},
        () => {},
      );

      expect(result.message).toBe('No need to sleep now.');
    });

    it('should reject sleeping in an occupied bed', () => {
      const beds = new Map();
      tryPlaceBed(beds, 5, 5, '0,0,0');

      const dayNight = { day: 1, timeOfDay: 15000 };
      const player = {
        setSpawn: () => {},
        heal: () => {},
      } as any;

      // Simulate an already occupied bed (e.g., another player is sleeping)
      const bed = beds.get('5,5,0,0,0');
      bed.occupied = true;

      // Second player tries to sleep
      const result = trySleep(
        beds,
        player,
        5,
        5,
        '0,0,0',
        dayNight,
        () => {},
        () => {},
      );

      expect(result.message).toBe("Someone's already sleeping.");
    });
  });

  describe('breaking beds', () => {
    it('should remove a bed', () => {
      const beds = new Map();
      tryPlaceBed(beds, 5, 5, '0,0,0');
      const result = tryBreakBed(beds, 5, 5, '0,0,0');
      expect(result.success).toBe(true);
      expect(beds.size).toBe(0);
    });
  });
});
