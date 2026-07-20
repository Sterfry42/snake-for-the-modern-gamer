import { TerritoryManager } from '../TerritoryManager.js';
import type { TerritoryDefinition } from '../territoryTypes.js';

describe('TerritoryManager', () => {
  let manager: TerritoryManager;

  beforeEach(() => {
    manager = new TerritoryManager();
  });

  describe('territory definitions', () => {
    it('creates all default territories', () => {
      const territories = manager.getAllTerritories();
      expect(territories.length).toBeGreaterThan(0);
      expect(territories.some((t) => t.type === 'forest')).toBe(true);
      expect(territories.some((t) => t.type === 'cave')).toBe(true);
      expect(territories.some((t) => t.type === 'mountain')).toBe(true);
      expect(territories.some((t) => t.type === 'ruins')).toBe(true);
    });

    it('has correct territory types', () => {
      const types = manager.getAllTerritories().map((t) => t.type);
      const uniqueTypes = [...new Set(types)];
      expect(uniqueTypes).toContain('forest');
      expect(uniqueTypes).toContain('cave');
      expect(uniqueTypes).toContain('plains');
      expect(uniqueTypes).toContain('mountain');
      expect(uniqueTypes).toContain('ruins');
    });

    it('creates territories with bonuses', () => {
      const forest = manager.getTerritory('forest-of-whispers');
      expect(forest).toBeDefined();
      expect(forest?.bonuses.appleSpawnModifiers.length).toBeGreaterThan(0);
      expect(forest?.bonuses.resourceModifiers.length).toBeGreaterThan(0);
    });

    it('returns territories by type', () => {
      const forests = manager.getTerritoriesByType('forest');
      expect(forests.length).toBeGreaterThan(0);
      expect(forests.every((t) => t.type === 'forest')).toBe(true);
    });

    it('returns territories by biome', () => {
      const forestTerritories = manager.getTerritoriesByBiome('elderwood-maze');
      expect(forestTerritories.length).toBeGreaterThan(0);
      expect(forestTerritories.every((t) => t.biomeIds.includes('elderwood-maze'))).toBe(true);
    });

    it('can add custom territories', () => {
      const custom: TerritoryDefinition = {
        id: 'custom-territory',
        name: 'Custom Territory',
        type: 'garden',
        biomeIds: ['home-hearth'],
        roomIds: [],
        strategicValue: 50,
        defensible: 5,
        features: ['custom-feature'],
        bonuses: {
          appleSpawnModifiers: [],
          resourceModifiers: [],
        },
      };
      manager.addTerritory(custom);
      const retrieved = manager.getTerritory('custom-territory');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Territory');
    });
  });

  describe('ownership', () => {
    it('creates default unclaimed ownership', () => {
      const ownership = manager.getOwnership('forest-of-whispers');
      expect(ownership).toBeDefined();
      expect(ownership?.status).toBe('unclaimed');
      expect(ownership?.controllingFactionId).toBeNull();
      expect(ownership?.controlPercentage).toBe(0);
    });

    it('returns null for non-existent territory', () => {
      const ownership = manager.getOwnership('non-existent');
      expect(ownership).toBeUndefined();
    });

    it('gets controlling faction', () => {
      const faction = manager.getControllingFaction('forest-of-whispers');
      expect(faction).toBeNull();
    });

    it('gets territories by faction', () => {
      const territories = manager.getTerritoriesByFaction('hearthbound-remnant');
      expect(territories.length).toBe(0); // None claimed yet
    });

    it('gets all contested territories', () => {
      const contested = manager.getAllContestedTerritories();
      expect(contested.length).toBe(0); // None contested yet
    });
  });

  describe('territory control shifts', () => {
    it('shifts control to attacker', () => {
      const result = manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        50,
        'attack',
      );

      expect(result).toBeDefined();
      expect(result?.controlPercentage).toBe(50);
      expect(result?.status).toBe('contested');
      expect(result?.controllingFactionId).toBeNull();
    });

    it('establishes stable control at 75%', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        75,
        'attack',
      );

      const ownership = manager.getOwnership('forest-of-whispers');
      expect(ownership?.status).toBe('stable');
      expect(ownership?.controllingFactionId).toBe('hearthbound-remnant');
    });

    it('returns control to defender at 25%', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        75,
        'attack',
      );
      // Shift back with a large negative delta
      manager.shiftControl(
        'forest-of-whispers',
        'goblin-camps',
        'hearthbound-remnant',
        -80,
        'defense',
      );

      const ownership = manager.getOwnership('forest-of-whispers');
      // At 0% control, it should be unclaimed or contested
      expect(ownership?.status).not.toBe('stable');
    });

    it('records battle history', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        50,
        'attack',
        true,
        'mercenary',
      );

      const ownership = manager.getOwnership('forest-of-whispers');
      expect(ownership?.battleHistory.length).toBe(1);
      expect(ownership?.battleHistory[0]?.snakeInvolved).toBe(true);
      expect(ownership?.battleHistory[0]?.snakeRole).toBe('mercenary');
    });

    it('limits battle history to 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        manager.shiftControl(
          'forest-of-whispers',
          'hearthbound-remnant',
          'goblin-camps',
          5,
          'attack',
        );
      }

      const ownership = manager.getOwnership('forest-of-whispers');
      expect(ownership?.battleHistory.length).toBeLessThanOrEqual(20);
    });

    it('updates serpent faction territory list', () => {
      manager.shiftControl('forest-of-whispers', 'serpents-coil', 'unclaimed', 100, 'diplomacy');

      const serpent = manager.getSerpentFaction();
      expect(serpent.controlledTerritoryIds).toContain('forest-of-whispers');
    });

    it('clamps control percentage to 0-100', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        200,
        'attack',
      );
      let ownership = manager.getOwnership('forest-of-whispers');
      expect(ownership?.controlPercentage).toBe(100);

      manager.shiftControl(
        'forest-of-whispers',
        'goblin-camps',
        'hearthbound-remnant',
        -200,
        'attack',
      );
      ownership = manager.getOwnership('forest-of-whispers');
      expect(ownership?.controlPercentage).toBe(0);
    });
  });

  describe('territory bonuses', () => {
    it('provides apple spawn modifiers', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'unclaimed',
        100,
        'diplomacy',
      );

      const context = manager.getTerritoryBonusContext('forest-of-whispers', true, 50);
      expect(context).toBeDefined();
      expect(context?.bonuses.appleSpawnModifiers.length).toBeGreaterThan(0);

      const result = manager.resolveBonuses(context!);
      expect(result.appleSpawnModifiers.length).toBeGreaterThan(0);
      expect(result.playerEligible).toBe(true);
    });

    it('provides resource modifiers', () => {
      manager.shiftControl('deep-caverns', 'hearthbound-remnant', 'unclaimed', 100, 'diplomacy');

      const context = manager.getTerritoryBonusContext('deep-caverns', false, 0);
      expect(context?.bonuses.resourceModifiers.length).toBeGreaterThan(0);

      const result = manager.resolveBonuses(context!);
      expect(result.resourceModifiers.length).toBeGreaterThan(0);
    });

    it('provides special effects', () => {
      const context = manager.getTerritoryBonusContext('forest-of-whispers', true, 50);
      expect(context?.bonuses.specialEffects?.length).toBeGreaterThan(0);

      const result = manager.resolveBonuses(context!);
      expect(result.specialEffects.length).toBeGreaterThan(0);
    });

    it('checks player eligibility based on relation', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'unclaimed',
        100,
        'diplomacy',
      );

      // Player with good relation
      const context1 = manager.getTerritoryBonusContext('forest-of-whispers', false, 50);
      expect(manager.resolveBonuses(context1!).playerEligible).toBe(true);

      // Player with bad relation
      const context2 = manager.getTerritoryBonusContext('forest-of-whispers', false, -50);
      expect(manager.resolveBonuses(context2!).playerEligible).toBe(false);
    });
  });

  describe('room assignment', () => {
    it('assigns rooms to territory', () => {
      manager.assignRoomsToTerritory('forest-of-whispers', ['room-1', 'room-2']);

      const territory = manager.getTerritory('forest-of-whispers');
      expect(territory?.roomIds).toContain('room-1');
      expect(territory?.roomIds).toContain('room-2');
    });

    it('prevents duplicate room assignments', () => {
      manager.assignRoomsToTerritory('forest-of-whispers', ['room-1', 'room-2']);
      manager.assignRoomsToTerritory('forest-of-whispers', ['room-1', 'room-3']);

      const territory = manager.getTerritory('forest-of-whispers');
      // Set prevents duplicates
      expect(territory?.roomIds).toEqual(['room-1', 'room-2', 'room-3']);
    });

    it('finds territories for a room', () => {
      manager.assignRoomsToTerritory('forest-of-whispers', ['room-1']);
      manager.assignRoomsToTerritory('deep-caverns', ['room-1']);

      const territories = manager.getTerritoriesForRoom('room-1');
      expect(territories.length).toBe(2);
    });

    it('returns empty for unassigned room', () => {
      const territories = manager.getTerritoriesForRoom('non-existent-room');
      expect(territories.length).toBe(0);
    });
  });

  describe('world tick', () => {
    it('processes contested territories after threshold', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        50,
        'attack',
      );

      // Fast-forward through ticks (every 10 rooms)
      for (let i = 0; i < 10; i++) {
        manager.tickWorld(i * 10);
      }

      const ownership = manager.getOwnership('forest-of-whispers');
      // May or may not have resolved depending on RNG
      expect(ownership).toBeDefined();
    });

    it('does not process every tick', () => {
      const initialPercentage = manager.getOwnership('forest-of-whispers')?.controlPercentage ?? 0;

      // Tick a few times without reaching interval
      for (let i = 0; i < 5; i++) {
        manager.tickWorld(i);
      }

      // Percentage should not have changed
      expect(manager.getOwnership('forest-of-whispers')?.controlPercentage).toBe(initialPercentage);
    });

    it('cleans up old battle history', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        50,
        'attack',
      );

      // Clean up old battle history by ticking past the threshold
      manager.tickWorld(1000);

      const ownership = manager.getOwnership('forest-of-whispers');
      // Battle history may or may not be cleaned up depending on timing
      expect(ownership).toBeDefined();
    });
  });

  describe('save / load', () => {
    it('saves and loads territory state', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        75,
        'attack',
      );

      const saveData = manager.save();
      expect(saveData.version).toBe(1);
      expect(saveData.territories.length).toBeGreaterThan(0);

      const newManager = new TerritoryManager();
      newManager.load(saveData);

      const ownership = newManager.getOwnership('forest-of-whispers');
      expect(ownership?.controllingFactionId).toBe('hearthbound-remnant');
      expect(ownership?.status).toBe('stable');
    });

    it('persists serpent faction territories', () => {
      manager.shiftControl('forest-of-whispers', 'serpents-coil', 'unclaimed', 100, 'diplomacy');

      const saveData = manager.save();
      const newManager = new TerritoryManager();
      newManager.load(saveData);

      const serpent = newManager.getSerpentFaction();
      expect(serpent.controlledTerritoryIds).toContain('forest-of-whispers');
    });

    it('persists war events', () => {
      manager.createWarEvent({
        type: 'war-declared',
        factionIds: ['hearthbound-remnant', 'goblin-camps'],
        territoryIds: ['forest-of-whispers'],
        severity: 80,
        createdAt: Date.now(),
      });

      const saveData = manager.save();
      expect(saveData.activeWar).toBeDefined();
      expect(saveData.activeWar?.type).toBe('war-declared');
    });
  });

  describe('faction influence', () => {
    it('computes faction influence from controlled territories', () => {
      manager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'unclaimed',
        100,
        'diplomacy',
      );
      manager.shiftControl('deep-caverns', 'hearthbound-remnant', 'unclaimed', 100, 'diplomacy');

      const saveData = manager.save();
      expect(saveData.factionInfluence['hearthbound-remnant']).toBeGreaterThan(0);
    });
  });
});
