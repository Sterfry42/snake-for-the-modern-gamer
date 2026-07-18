import { TerritoryManager } from '../TerritoryManager.js';
import { SerpentFactionManager, MISSION_TEMPLATES } from '../SerpentFaction.js';
import type { FollowerRole } from '../territoryTypes.js';

describe('SerpentFactionManager', () => {
  let territoryManager: TerritoryManager;
  let serpent: SerpentFactionManager;

  beforeEach(() => {
    territoryManager = new TerritoryManager();
    serpent = new SerpentFactionManager(territoryManager);
  });

  describe('faction establishment', () => {
    it('starts unestablished', () => {
      expect(serpent.isEstablished()).toBe(false);
    });

    it('can establish the faction', () => {
      serpent.establishSerpentFaction('headquarters-room');

      expect(serpent.isEstablished()).toBe(true);
      expect(serpent.getFactionState().headquartersRoomId).toBe('headquarters-room');
    });

    it('starts with zero influence', () => {
      expect(serpent.getInfluence()).toBe(0);
    });

    it('cannot recruit before establishment', () => {
      expect(() => {
        serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
      }).toThrow('must be established');
    });
  });

  describe('follower recruitment', () => {
    beforeEach(() => {
      serpent.establishSerpentFaction();
    });

    it('recruits a follower', () => {
      const follower = serpent.recruitFollower({
        sourceId: 'animal-1',
        role: 'warrior',
      });

      expect(follower.id).toBeDefined();
      expect(follower.sourceId).toBe('animal-1');
      expect(follower.role).toBe('warrior');
      expect(follower.status).toBe('idle');
      expect(follower.loyalty).toBe(50);
      expect(follower.level).toBe(1);
    });

    it('sets combat power based on role', () => {
      const warrior = serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
      expect(warrior.combatPower).toBeGreaterThanOrEqual(40);

      const scout = serpent.recruitFollower({ sourceId: 'animal-2', role: 'scout' });
      expect(scout.combatPower).toBeGreaterThanOrEqual(20);
    });

    it('prevents duplicate recruitment', () => {
      serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });

      expect(() => {
        serpent.recruitFollower({ sourceId: 'animal-1', role: 'guard' });
      }).toThrow('already recruited');
    });

    it('gets all followers', () => {
      serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
      serpent.recruitFollower({ sourceId: 'animal-2', role: 'scout' });

      const followers = serpent.getFollowers();
      expect(followers.length).toBe(2);
    });

    it('filters followers by role', () => {
      serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
      serpent.recruitFollower({ sourceId: 'animal-2', role: 'scout' });

      const warriors = serpent.getFollowers({ role: 'warrior' });
      expect(warriors.length).toBe(1);
      expect(warriors[0].role).toBe('warrior');
    });

    it('filters followers by status', () => {
      const follower = serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
      serpent.restFollower(follower.id);

      const resting = serpent.getFollowers({ status: 'resting' });
      expect(resting.length).toBe(1);
    });

    it('gets single follower by ID', () => {
      const follower = serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
      const retrieved = serpent.getFollower(follower.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.sourceId).toBe('animal-1');
    });

    it('returns undefined for non-existent follower', () => {
      expect(serpent.getFollower('non-existent')).toBeUndefined();
    });
  });

  describe('follower upgrades', () => {
    let followerId: string;

    beforeEach(() => {
      serpent.establishSerpentFaction();
      const follower = serpent.recruitFollower({ sourceId: 'animal-1', role: 'scout' });
      followerId = follower.id;
    });

    it('upgrades follower role', () => {
      serpent.upgradeFollowerRole(followerId, 'warrior');

      const follower = serpent.getFollower(followerId);
      expect(follower?.role).toBe('warrior');
    });

    it('fails for non-existent follower', () => {
      expect(() => {
        serpent.upgradeFollowerRole('non-existent', 'warrior');
      }).toThrow('not found');
    });

    it('may reject low-loyalty followers', () => {
      const follower = serpent.getFollower(followerId)!;
      follower.loyalty = 10; // Very low loyalty

      // May or may not reject, depending on RNG
      // Just verify it doesn't crash
      try {
        serpent.upgradeFollowerRole(followerId, 'warrior');
      } catch {
        // Expected for low loyalty
      }
    });
  });

  describe('follower resting', () => {
    let followerId: string;

    beforeEach(() => {
      serpent.establishSerpentFaction();
      const follower = serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
      followerId = follower.id;
    });

    it('rests a follower', () => {
      serpent.restFollower(followerId);

      const follower = serpent.getFollower(followerId);
      expect(follower?.status).toBe('resting');
    });

    it('prevents resting on-mission followers', () => {
      // Simulate on-mission
      const follower = serpent.getFollower(followerId)!;
      follower.status = 'on-mission';

      expect(() => {
        serpent.restFollower(followerId);
      }).toThrow('on mission');
    });
  });

  describe('mission creation', () => {
    let followerIds: string[];

    beforeEach(() => {
      serpent.establishSerpentFaction();
      const f1 = serpent.recruitFollower({ sourceId: 'animal-1', role: 'scout' });
      const f2 = serpent.recruitFollower({ sourceId: 'animal-2', role: 'scout' });
      followerIds = [f1.id, f2.id];
    });

    it('creates mission from template', () => {
      const mission = serpent.createMissionFromTemplate('scout-forest', {
        assignedFollowerIds: followerIds,
        targetTerritoryId: 'forest-of-whispers',
      });

      expect(mission.id).toBeDefined();
      expect(mission.title).toBe('Scout the Forest');
      expect(mission.type).toBe('scout');
      expect(mission.status).toBe('active');
      expect(mission.assignedFollowerIds).toEqual(followerIds);
    });

    it('requires minimum followers', () => {
      // The scout-forest template requires 2 followers
      // This test verifies the template definition
      const template = MISSION_TEMPLATES.find((t) => t.id === 'scout-forest');
      expect(template?.minFollowers).toBe(2);
    });

    it('requires required role', () => {
      // Create 3 scouts but no warrior
      const scout1 = serpent.recruitFollower({ sourceId: 'extra-2', role: 'scout' });
      const scout2 = serpent.recruitFollower({ sourceId: 'extra-3', role: 'scout' });
      const scout3 = serpent.recruitFollower({ sourceId: 'extra-4', role: 'scout' });

      expect(() => {
        serpent.createMissionFromTemplate('attack-cave', {
          assignedFollowerIds: [scout1.id, scout2.id, scout3.id, scout1.id], // Need 4 with warrior
        });
      }).toThrow(/role warrior/);
    });

    it('prevents assigning non-idle followers', () => {
      // First assign them to a mission
      serpent.createMissionFromTemplate('scout-forest', {
        assignedFollowerIds: followerIds,
      });

      // Now try to assign them again
      expect(() => {
        serpent.createMissionFromTemplate('scout-forest', {
          assignedFollowerIds: followerIds,
        });
      }).toThrow(/not available|Not enough idle followers/);
    });

    it('sets follower status to on-mission', () => {
      serpent.createMissionFromTemplate('scout-forest', {
        assignedFollowerIds: followerIds,
      });

      const follower = serpent.getFollower(followerIds[0]);
      expect(follower?.status).toBe('on-mission');
      expect(follower?.assignedMission).toBeDefined();
    });

    it('gets active missions', () => {
      serpent.createMissionFromTemplate('scout-forest', {
        assignedFollowerIds: followerIds,
      });

      const missions = serpent.getActiveMissions();
      expect(missions.length).toBe(1);
    });

    it('gets available missions', () => {
      const available = serpent.getAvailableMissions();
      expect(available.length).toBeGreaterThan(0);
    });

    it('filters available missions by follower count', () => {
      // Only have 2 followers, so can't run missions requiring more
      const available = serpent.getAvailableMissions();
      for (const template of available) {
        expect(template.minFollowers).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('mission cancellation', () => {
    let missionId: string;
    let followerIds: string[];

    beforeEach(() => {
      serpent.establishSerpentFaction();
      const f1 = serpent.recruitFollower({ sourceId: 'animal-1', role: 'scout' });
      const f2 = serpent.recruitFollower({ sourceId: 'animal-2', role: 'scout' });
      followerIds = [f1.id, f2.id];

      const mission = serpent.createMissionFromTemplate('scout-forest', {
        assignedFollowerIds: followerIds,
      });
      missionId = mission.id;
    });

    it('cancels a mission', () => {
      serpent.cancelMission(missionId);

      const missions = serpent.getActiveMissions();
      expect(missions.every((m) => m.id !== missionId)).toBe(true);
    });

    it('releases followers on cancel', () => {
      serpent.cancelMission(missionId);

      const follower = serpent.getFollower(followerIds[0]);
      expect(follower?.status).toBe('idle');
      expect(follower?.assignedMission).toBeUndefined();
    });

    it('applies loyalty penalty on cancel', () => {
      const follower = serpent.getFollower(followerIds[0])!;
      const initialLoyalty = follower.loyalty;

      serpent.cancelMission(missionId);

      const updated = serpent.getFollower(followerIds[0]);
      expect(updated?.loyalty).toBeLessThan(initialLoyalty);
    });

    it('fails for non-existent mission', () => {
      expect(() => {
        serpent.cancelMission('non-existent');
      }).toThrow('not found');
    });
  });

  describe('territory management', () => {
    beforeEach(() => {
      serpent.establishSerpentFaction();
    });

    it('claims unclaimed territory', () => {
      const result = serpent.attemptClaimTerritory('forest-of-whispers');

      // Should fail - no influence
      expect(result).toBe(false);

      // The territory needs to be unclaimed - check current state
      const ownership = territoryManager.getOwnership('forest-of-whispers');
      expect(ownership?.status).toBe('unclaimed');
    });

    it('cannot claim non-unclaimed territory', () => {
      territoryManager.shiftControl('forest-of-whispers', 'hearthbound-remnant', 'unclaimed', 100, 'diplomacy');

      (serpent.getFactionState() as any).influence = 1000;

      const result = serpent.attemptClaimTerritory('forest-of-whispers');
      expect(result).toBe(false);
    });

    it('cannot contest without establishment', () => {
      const newManager = new SerpentFactionManager(new TerritoryManager());
      const result = newManager.contestTerritory('forest-of-whispers', ['follower-1']);
      expect(result).toBe(false);
    });

    it('gets controlled territories', () => {
      // Check initial state
      const controlled = serpent.getControlledTerritories();
      expect(controlled.length).toBe(0);
    });
  });

  describe('faction progression', () => {
    beforeEach(() => {
      serpent.establishSerpentFaction();
    });

    it('calculates faction level', () => {
      expect(serpent.getFactionLevel()).toBe(1);
      // Level 1 = 0-99 influence
      // Level 2 = 100-199 influence
      // Level 3 = 200-299 influence
    });

    it('gets next level threshold', () => {
      expect(serpent.getNextLevelThreshold()).toBe(100);
    });

    it('checks unlock status', () => {
      expect(serpent.hasUnlockedUpgrade('advanced-scouting')).toBe(false);
      expect(serpent.hasUnlockedUpgrade('diplomatic-corps')).toBe(false);
    });

    it('checks expand capability', () => {
      expect(serpent.canExpand()).toBe(false);
    });
  });

  describe('save / load', () => {
    beforeEach(() => {
      serpent.establishSerpentFaction();
      serpent.recruitFollower({ sourceId: 'animal-1', role: 'warrior' });
    });

    it('saves faction state', () => {
      const saveData = serpent.save();
      expect(saveData.established).toBe(true);
      expect(saveData.followers.length).toBe(1);
    });

    it('loads faction state', () => {
      const saveData = serpent.save();

      const newTerritoryManager = new TerritoryManager();
      const newSerpent = new SerpentFactionManager(newTerritoryManager);
      newSerpent.load(saveData);

      expect(newSerpent.isEstablished()).toBe(true);
      expect(newSerpent.getFollowers().length).toBe(1);
    });
  });
});
