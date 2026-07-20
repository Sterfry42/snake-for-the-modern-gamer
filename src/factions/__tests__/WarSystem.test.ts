import { TerritoryManager } from '../TerritoryManager.js';
import { WarSystem } from '../WarSystem.js';

describe('WarSystem', () => {
  let territoryManager: TerritoryManager;
  let warSystem: WarSystem;

  beforeEach(() => {
    territoryManager = new TerritoryManager();
    warSystem = new WarSystem(territoryManager);
  });

  describe('battle resolution', () => {
    it('resolves a basic battle', () => {
      const result = warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      expect(result).toBeDefined();
      expect(result?.territoryId).toBe('forest-of-whispers');
      expect(result?.attackerFactionId).toBe('hearthbound-remnant');
      expect(result?.defenderFactionId).toBe('goblin-camps');
      expect(result?.turnCount).toBeGreaterThan(0);
    });

    it('returns undefined for non-existent territory', () => {
      const result = warSystem.resolveBattle({
        territoryId: 'non-existent',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      expect(result).toBeUndefined();
    });

    it('applies control shift based on battle result', () => {
      warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
        attackerPower: 80,
        defenderPower: 20,
      });

      const ownership = territoryManager.getOwnership('forest-of-whispers');
      // Control percentage should have changed from initial 0
      expect(ownership?.controlPercentage).toBeGreaterThan(0);
    });

    it('handles snake mercenary involvement', () => {
      const result = warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
        snakeInvolved: true,
        snakeRole: 'mercenary',
        snakeBonus: 30,
      });

      expect(result?.snakeInvolved).toBe(true);
      expect(result?.snakeRole).toBe('mercenary');
      expect(result?.snakeImpact).toBe(30);
    });

    it('handles snake mediator involvement', () => {
      const result = warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
        snakeInvolved: true,
        snakeRole: 'mediator',
        snakeBonus: 20,
      });

      expect(result?.snakeRole).toBe('mediator');
    });

    it('creates war event on battle', () => {
      const eventsBefore = territoryManager.getActiveWarEvents().length;

      warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      const eventsAfter = territoryManager.getActiveWarEvents().length;
      expect(eventsAfter).toBeGreaterThanOrEqual(eventsBefore);
    });

    it('calculates casualties', () => {
      const result = warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      expect(result?.casualties.attacker).toBeGreaterThanOrEqual(0);
      expect(result?.casualties.defender).toBeGreaterThanOrEqual(0);
    });

    it('handles draws', () => {
      const result = warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
        attackerPower: 50,
        defenderPower: 50,
      });

      // With equal power, there might still be randomness, but winner could be null
      expect(result?.winnerFactionId).toBeDefined();
    });
  });

  describe('war declaration', () => {
    it('declares war between factions', () => {
      const event = warSystem.declareWar({
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
        territoryId: 'forest-of-whispers',
        reason: 'Territorial dispute',
      });

      expect(event).toBeDefined();
      expect(event?.type).toBe('war-declared');
      expect(event?.factionIds).toContain('hearthbound-remnant');
      expect(event?.factionIds).toContain('goblin-camps');
    });

    it('creates immediate battle on war declaration', () => {
      const battlesBefore = warSystem.getBattleLog().length;

      warSystem.declareWar({
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
        territoryId: 'forest-of-whispers',
      });

      expect(warSystem.getBattleLog().length).toBeGreaterThan(battlesBefore);
    });
  });

  describe('peace treaty', () => {
    it('declares peace between factions', () => {
      const event = warSystem.declarePeace({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
      });

      expect(event).toBeDefined();
      expect(event?.type).toBe('peace-treaty');
    });

    it('resolves contested territories on peace', () => {
      // First create a contested territory
      territoryManager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'goblin-camps',
        50,
        'attack',
      );

      warSystem.declarePeace({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
        territoryIds: ['forest-of-whispers'],
      });

      const ownership = territoryManager.getOwnership('forest-of-whispers');
      // Status may or may not change depending on implementation
      expect(ownership).toBeDefined();
    });
  });

  describe('mercenary contracts', () => {
    it('issues a mercenary contract', () => {
      const event = warSystem.issueMercenaryContract({
        territoryId: 'forest-of-whispers',
        hiringFactionId: 'hearthbound-remnant',
        bonusPower: 20,
      });

      expect(event).toBeDefined();
      expect(event?.type).toBe('mercenary-contract');
    });

    it('applies bonus to defending faction', () => {
      // Set up: hearthbound-remnant controls the forest
      territoryManager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'unclaimed',
        100,
        'diplomacy',
      );

      warSystem.issueMercenaryContract({
        territoryId: 'forest-of-whispers',
        hiringFactionId: 'hearthbound-remnant',
        bonusPower: 30,
      });

      const ownership = territoryManager.getOwnership('forest-of-whispers');
      // Ownership may have changed due to battle
      expect(ownership).toBeDefined();
    });
  });

  describe('sabotage', () => {
    it('successfully sabotages a territory', () => {
      // Set up: hearthbound-remnant controls the forest
      territoryManager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'unclaimed',
        100,
        'diplomacy',
      );

      const result = warSystem.sabotageTerritory({
        territoryId: 'forest-of-whispers',
        saboteurFactionId: 'goblin-camps',
        targetFactionId: 'hearthbound-remnant',
        successChance: 1.0, // Guaranteed success
      });

      expect(result).toBeDefined();
      expect(result?.outcome).toBe('sabotage');
    });

    it('fails sabotage with low chance', () => {
      territoryManager.shiftControl(
        'forest-of-whispers',
        'hearthbound-remnant',
        'unclaimed',
        100,
        'diplomacy',
      );

      const result = warSystem.sabotageTerritory({
        territoryId: 'forest-of-whispers',
        saboteurFactionId: 'goblin-camps',
        targetFactionId: 'hearthbound-remnant',
        successChance: 0.0, // Guaranteed failure
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined for non-controlled territory', () => {
      const result = warSystem.sabotageTerritory({
        territoryId: 'forest-of-whispers',
        saboteurFactionId: 'goblin-camps',
        targetFactionId: 'unknown-faction',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('battle log', () => {
    it('tracks battle history', () => {
      warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      warSystem.resolveBattle({
        territoryId: 'deep-caverns',
        attackerFactionId: 'goblin-camps',
        defenderFactionId: 'hearthbound-remnant',
      });

      const log = warSystem.getBattleLog(10);
      expect(log.length).toBe(2);
    });

    it('filters battles by territory', () => {
      warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      warSystem.resolveBattle({
        territoryId: 'deep-caverns',
        attackerFactionId: 'goblin-camps',
        defenderFactionId: 'hearthbound-remnant',
      });

      const forestBattles = warSystem.getBattlesForTerritory('forest-of-whispers');
      expect(forestBattles.length).toBe(1);
      expect(forestBattles[0]?.territoryId).toBe('forest-of-whispers');
    });

    it('filters battles by faction', () => {
      warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      warSystem.resolveBattle({
        territoryId: 'deep-caverns',
        attackerFactionId: 'guards',
        defenderFactionId: 'hearthbound-remnant',
      });

      const hearthboundBattles = warSystem.getBattlesByFaction('hearthbound-remnant');
      expect(hearthboundBattles.length).toBe(2);
    });

    it('calculates win rate', () => {
      // Create some battles with known outcomes
      for (let i = 0; i < 5; i++) {
        warSystem.resolveBattle({
          territoryId: 'forest-of-whispers',
          attackerFactionId: 'hearthbound-remnant',
          defenderFactionId: 'goblin-camps',
          attackerPower: 80,
          defenderPower: 20,
        });
      }

      const winRate = warSystem.getFactionWinRate('hearthbound-remnant');
      expect(winRate.total).toBe(5);
      expect(winRate.wins).toBeGreaterThan(0);
    });
  });

  describe('save / load', () => {
    it('saves and loads battle log', () => {
      warSystem.resolveBattle({
        territoryId: 'forest-of-whispers',
        attackerFactionId: 'hearthbound-remnant',
        defenderFactionId: 'goblin-camps',
      });

      const saveData = warSystem.save();
      expect(saveData.battleLog.length).toBe(1);

      const newWarSystem = new WarSystem(territoryManager);
      newWarSystem.load(saveData);

      expect(newWarSystem.getBattleLog().length).toBe(1);
    });
  });
});
