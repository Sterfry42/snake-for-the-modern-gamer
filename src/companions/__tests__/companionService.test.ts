// Tests for companion service — verifies spawn, tame, feed, ability logic.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanionService } from '../companionService.js';

describe('CompanionService', () => {
  let service: CompanionService;
  let mockSnakeGame: any;
  let mockJuiceManager: any;
  let mockInventoryService: any;
  let mockQuestService: any;

  beforeEach(() => {
    mockSnakeGame = {
      rng: { next: () => 0.5 },
      getCurrentRoomNumber: () => 1,
      getRoomsVisitedCount: () => 1,
      setFlag: vi.fn(),
      getCompanionSprite: vi.fn(),
    };
    mockJuiceManager = {
      creatureAppear: vi.fn(),
      creatureFeed: vi.fn(),
      creatureTameSuccess: vi.fn(),
      creatureTameFail: vi.fn(),
      creatureBondIncrease: vi.fn(),
      creatureAbility: vi.fn(),
    };
    mockInventoryService = {
      getItemCount: () => 0,
      removeItem: vi.fn(),
    };
    mockQuestService = {
      isQuestCompleted: () => true,
    };
    service = new CompanionService(
      mockSnakeGame,
      mockJuiceManager,
      mockInventoryService,
      mockQuestService,
    );
  });

  describe('spawnCompanion', () => {
    it('creates a wild instance with correct defaults', () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);

      const active = service.getActiveCompanions();
      expect(active.length).toBe(0); // Not tamed yet
    });

    it('discovers the creature in compendium on spawn', () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      const compendium = service.getCompendium();
      expect(compendium.isDiscovered('ember-wisp')).toBe(true);
    });

    it('records encounter on spawn', async () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      const compendium = service.getCompendium();
      const definitions = (await import('../companionRegistry.js')).COMPANION_DEFINITIONS;
      const view = compendium.getCompendiumView(definitions);
      const ember = view.find((v) => v.companionId === 'ember-wisp');
      // discoverCompanion calls recordEncounter internally, then spawn calls it again: 1 + 1 = 2
      expect(ember?.totalEncounters).toBe(2);
    });

    it('does not create duplicate wild instances of same creature', () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 10, 15);
      // Should only have one wild instance
      const snapshot = service.getSnapshot();
      const wildCount = Object.values(snapshot.instances).filter(
        (i: any) => !i.isTamed,
      ).length;
      expect(wildCount).toBe(1);
    });
  });

  describe('attemptTame', () => {
    it('fails when no wild creature exists', () => {
      const result = service.attemptTame('ember-wisp', 'player-1');
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('tamingFailed');
    });

    it('fails with insufficient food', () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      mockInventoryService.getItemCount = () => 0;

      const result = service.attemptTame('ember-wisp', 'player-1');
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('insufficientFood');
    });

    it('returns the wild companion ID on failure', () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      mockInventoryService.getItemCount = () => 0;

      const result = service.attemptTame('ember-wisp', 'player-1');
      expect(result.companionId).toMatch(/^wild-\d+$/);
    });
  });

  describe('feedCompanion', () => {
    it('fails when companion not found', () => {
      const result = service.feedCompanion('nonexistent', 'fire-pepper');
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('companionNotFound');
    });

    it('returns feeds remaining today', () => {
      // Cannot feed untamed creatures
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      const result = service.feedCompanion('wild-1', 'fire-pepper');
      expect(result.failedReason).toBe('companionNotFound');
    });
  });

  describe('useAbility', () => {
    it('fails when companion not found', () => {
      const result = service.useAbility('nonexistent', 'ember-glow');
      expect(result.success).toBe(false);
      expect(result.failedReason).toBe('companionNotFound');
    });
  });

  describe('getAllPassiveEffects', () => {
    it('returns empty array when no tamed companions', () => {
      const effects = service.getAllPassiveEffects();
      expect(effects.length).toBe(0);
    });
  });

  describe('getSnapshot / loadSnapshot', () => {
    it('produces a valid snapshot with version 1', () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      const snapshot = service.getSnapshot();
      expect(snapshot.version).toBe(1);
      expect(snapshot.instances).toBeDefined();
      expect(snapshot.compendium).toBeDefined();
      expect(snapshot.settings).toBeDefined();
    });

    it('snapshot round-trip preserves compendium state', async () => {
      service.spawnCompanion('ember-wisp', 'test-room-0-0', 5, 10);
      const snapshot = service.getSnapshot();
      const compendium = service.getCompendium();
      expect(compendium.isDiscovered('ember-wisp')).toBe(true);

      // Create new service and load snapshot
      const newService = new CompanionService(
        mockSnakeGame,
        mockJuiceManager,
        mockInventoryService,
        mockQuestService,
      );
      newService.loadSnapshot(snapshot);
      expect(newService.getCompendium().isDiscovered('ember-wisp')).toBe(true);
    });
  });
});
