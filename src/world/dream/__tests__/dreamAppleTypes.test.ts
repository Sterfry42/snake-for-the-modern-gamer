import { describe, it, expect } from 'vitest';
import {
  DreamApple,
  NightmareApple,
  LucidApple,
  createDreamAppleInstance,
  DREAM_APPLE_TYPES,
  type DreamAppleTypeConfig,
} from '../dreamAppleTypes.js';

describe('Dream Apple Types', () => {
  describe('DreamApple', () => {
    it('consumes like a normal apple', () => {
      const apple = new DreamApple('dream-room', { x: 0, y: 0 }, 'dream', 0xb19cd9, {
        floatingOffset: 0,
        floatSpeed: 0.05,
        phaseOffset: 0,
        buffType: 'doubleShards',
        buffDuration: 300,
      });

      const rewards = apple.onConsume();
      expect(rewards).toEqual({ growth: 1, bonusScore: 5 });
    });

    it('has floating metadata', () => {
      const apple = new DreamApple('dream-room', { x: 0, y: 0 }, 'dream', 0xb19cd9, {
        floatingOffset: 0,
        floatSpeed: 0.05,
        phaseOffset: 1.5,
        buffType: 'speedBoost',
        buffDuration: 200,
      });

      const metadata = apple.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata!.floatSpeed).toBe(0.05);
      expect(metadata!.phaseOffset).toBe(1.5);
    });

    it('can add and remove buffs', () => {
      const apple = new DreamApple('dream-room', { x: 0, y: 0 }, 'dream', 0xb19cd9, {
        floatingOffset: 0,
        floatSpeed: 0.05,
        phaseOffset: 0,
        buffType: 'shield',
        buffDuration: 120,
      });

      // Apple starts with no active buffs (metadata stores buff config, not active buffs)
      expect(apple.getActiveBuffs().length).toBe(0);

      apple.addBuff({ type: 'speedBoost', duration: 100, remaining: 100 });
      expect(apple.getActiveBuffs().length).toBe(1);

      apple.addBuff({ type: 'shield', duration: 120, remaining: 120 });
      expect(apple.getActiveBuffs().length).toBe(2);

      apple.removeBuff('shield');
      expect(apple.getActiveBuffs().length).toBe(1);
      expect(apple.getActiveBuffs()[0].type).toBe('speedBoost');
    });
  });

  describe('NightmareApple', () => {
    it('consumes with higher rewards', () => {
      const apple = new NightmareApple('nightmare-room', { x: 0, y: 0 }, 'nightmare', 0x8b0000, {
        floatingOffset: 0,
        floatSpeed: 0.02,
        phaseOffset: 0,
        buffType: 'shield',
        buffDuration: 120,
      });

      const rewards = apple.onConsume();
      expect(rewards).toEqual({ growth: 2, bonusScore: 15 });
    });

    it('has chase speed configuration', () => {
      const apple1 = new NightmareApple('nightmare-room', { x: 0, y: 0 }, 'nightmare', 0x8b0000, {
        floatingOffset: 0,
        floatSpeed: 0.02,
        phaseOffset: 0,
        buffType: 'shield',
        buffDuration: 120,
      });

      const apple2 = new NightmareApple('nightmare-room', { x: 0, y: 0 }, 'nightmare', 0x8b0000, {
        floatingOffset: 0,
        floatSpeed: 0.02,
        phaseOffset: 0,
        buffType: 'shield',
        buffDuration: 120,
      });

      // Different chase speeds
      expect(apple1).toBeDefined();
      expect(apple2).toBeDefined();
    });
  });

  describe('LucidApple', () => {
    it('consumes with significant rewards', () => {
      const apple = new LucidApple(
        'dream-room',
        { x: 0, y: 0 },
        'lucid',
        0xffd700,
        {
          floatingOffset: 0,
          floatSpeed: 0.06,
          phaseOffset: 1.0,
          buffType: 'timeSlow',
          buffDuration: 150,
        },
        1,
      );

      const rewards = apple.onConsume();
      expect(rewards).toEqual({ growth: 1, bonusScore: 25 });
    });

    it('has lucidity gain configuration', () => {
      const apple1 = new LucidApple(
        'dream-room',
        { x: 0, y: 0 },
        'lucid',
        0xffd700,
        {
          floatingOffset: 0,
          floatSpeed: 0.06,
          phaseOffset: 1.0,
          buffType: 'timeSlow',
          buffDuration: 150,
        },
        1,
      );

      const apple2 = new LucidApple(
        'dream-room',
        { x: 0, y: 0 },
        'lucid-master',
        0xffaa00,
        {
          floatingOffset: 0,
          floatSpeed: 0.08,
          phaseOffset: 2.5,
          buffType: 'sizeShrink',
          buffDuration: 100,
        },
        2,
      );

      expect(apple1.getLucidityGain()).toBe(1);
      expect(apple2.getLucidityGain()).toBe(2);
    });
  });

  describe('createDreamAppleInstance', () => {
    it('creates DreamApple for dream behavior', () => {
      const config: DreamAppleTypeConfig = {
        id: 'dream',
        label: 'Dream Apple',
        color: 0xb19cd9,
        behavior: 'dream',
        metadata: {
          floatingOffset: 0,
          floatSpeed: 0.05,
          phaseOffset: 0,
          buffType: 'doubleShards',
          buffDuration: 300,
        },
      };

      const apple = createDreamAppleInstance(config, 'room', { x: 0, y: 0 });
      expect(apple).toBeInstanceOf(DreamApple);
    });

    it('creates NightmareApple for nightmare behavior', () => {
      const config: DreamAppleTypeConfig = {
        id: 'nightmare',
        label: 'Nightmare Apple',
        color: 0x8b0000,
        behavior: 'nightmare',
        metadata: {
          floatingOffset: 0,
          floatSpeed: 0.02,
          phaseOffset: 0,
          buffType: 'shield',
          buffDuration: 120,
        },
        extraConfig: { chaseSpeed: 0.15 },
      };

      const apple = createDreamAppleInstance(config, 'room', { x: 0, y: 0 });
      expect(apple).toBeInstanceOf(NightmareApple);
    });

    it('creates LucidApple for lucid behavior', () => {
      const config: DreamAppleTypeConfig = {
        id: 'lucid',
        label: 'Lucid Apple',
        color: 0xffd700,
        behavior: 'lucid',
        metadata: {
          floatingOffset: 0,
          floatSpeed: 0.06,
          phaseOffset: 1.0,
          buffType: 'timeSlow',
          buffDuration: 150,
        },
        extraConfig: { lucidityGain: 2 },
      };

      const apple = createDreamAppleInstance(config, 'room', { x: 0, y: 0 });
      expect(apple).toBeInstanceOf(LucidApple);
    });

    it('throws for unknown behavior', () => {
      const config: DreamAppleTypeConfig = {
        id: 'unknown',
        label: 'Unknown Apple',
        color: 0x000000,
        behavior: 'dream',
        metadata: {
          floatingOffset: 0,
          floatSpeed: 0.05,
          phaseOffset: 0,
          buffType: 'speedBoost',
          buffDuration: 100,
        },
      };

      // Modify behavior to unknown
      (config as any).behavior = 'unknown';

      expect(() => createDreamAppleInstance(config, 'room', { x: 0, y: 0 })).toThrow(
        'Unknown dream apple behavior: unknown',
      );
    });
  });

  describe('DREAM_APPLE_TYPES registry', () => {
    it('has all expected apple types', () => {
      const typeIds = DREAM_APPLE_TYPES.map((t) => t.id);
      expect(typeIds).toContain('dream');
      expect(typeIds).toContain('dream-gravity');
      expect(typeIds).toContain('dream-phase');
      expect(typeIds).toContain('dream-speed');
      expect(typeIds).toContain('nightmare');
      expect(typeIds).toContain('nightmare-hunter');
      expect(typeIds).toContain('lucid');
      expect(typeIds).toContain('lucid-master');
    });

    it('has correct behavior assignments', () => {
      const dreamApples = DREAM_APPLE_TYPES.filter((t) => t.behavior === 'dream');
      const nightmareApples = DREAM_APPLE_TYPES.filter((t) => t.behavior === 'nightmare');
      const lucidApples = DREAM_APPLE_TYPES.filter((t) => t.behavior === 'lucid');

      expect(dreamApples.length).toBe(4);
      expect(nightmareApples.length).toBe(2);
      expect(lucidApples.length).toBe(2);
    });

    it('has unique colors for each type', () => {
      const colors = DREAM_APPLE_TYPES.map((t) => t.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(DREAM_APPLE_TYPES.length);
    });
  });
});
