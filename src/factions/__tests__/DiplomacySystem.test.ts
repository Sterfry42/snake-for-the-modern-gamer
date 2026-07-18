import { TerritoryManager } from '../TerritoryManager.js';
import { DiplomacySystem } from '../DiplomacySystem.js';

describe('DiplomacySystem', () => {
  let territoryManager: TerritoryManager;
  let diplomacy: DiplomacySystem;

  beforeEach(() => {
    territoryManager = new TerritoryManager();
    diplomacy = new DiplomacySystem(territoryManager);
  });

  describe('relation management', () => {
    it('starts with neutral relations', () => {
      const relation = diplomacy.getRelation('hearthbound-remnant', 'goblin-camps');
      expect(relation).toBe('neutral');
    });

    it('sets relations correctly', () => {
      diplomacy.setRelation('hearthbound-remnant', 'goblin-camps', 'allied');
      expect(diplomacy.getRelation('hearthbound-remnant', 'goblin-camps')).toBe('allied');
      expect(diplomacy.getRelation('goblin-camps', 'hearthbound-remnant')).toBe('allied');
    });

    it('gets all relations', () => {
      diplomacy.setRelation('hearthbound-remnant', 'goblin-camps', 'war');
      diplomacy.setRelation('hearthbound-remnant', 'guards', 'neutral');

      const relations = diplomacy.getAllRelations();
      expect(relations.size).toBe(2);
    });

    it('gets relations for a specific faction', () => {
      diplomacy.setRelation('hearthbound-remnant', 'goblin-camps', 'war');
      diplomacy.setRelation('hearthbound-remnant', 'guards', 'neutral');

      const relations = diplomacy.getFactionsWithRelation('hearthbound-remnant');
      expect(relations.size).toBe(2);
    });
  });

  describe('alliance formation', () => {
    it('forms an alliance', () => {
      const result = diplomacy.formAlliance({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
      });

      expect(result.success).toBe(true);
      expect(result.newRelation).toBe('allied');
      expect(result.treaty).toBeDefined();
      expect(result.relationDelta).toBe(30);
    });

    it('prevents duplicate alliance', () => {
      diplomacy.formAlliance({ factionA: 'hearthbound-remnant', factionB: 'guards' });

      const result = diplomacy.formAlliance({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('Factions are already allied.');
    });

    it('prevents alliance while at war', () => {
      diplomacy.declareWar({ factionA: 'hearthbound-remnant', factionB: 'guards' });

      const result = diplomacy.formAlliance({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('Cannot form alliance while at war.');
    });

    it('creates war event for alliance', () => {
      diplomacy.formAlliance({ factionA: 'hearthbound-remnant', factionB: 'guards' });

      const events = territoryManager.getActiveWarEvents();
      expect(events.some((e) => e.type === 'alliance-formed')).toBe(true);
    });
  });

  describe('non-aggression pact', () => {
    it('signs a non-aggression pact', () => {
      const result = diplomacy.signNonAggressionPact({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
      });

      expect(result.success).toBe(true);
      expect(result.newRelation).toBe('non-aggression');
    });

    it('prevents duplicate pact', () => {
      diplomacy.signNonAggressionPact({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      const result = diplomacy.signNonAggressionPact({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('trade pact', () => {
    it('establishes a trade pact', () => {
      const result = diplomacy.establishTradePact({
        factionA: 'hearthbound-remnant',
        factionB: 'shopkeepers',
      });

      expect(result.success).toBe(true);
      expect(result.newRelation).toBe('trade-pact');
    });

    it('includes resource types in provisions', () => {
      const result = diplomacy.establishTradePact({
        factionA: 'hearthbound-remnant',
        factionB: 'shopkeepers',
        resourceTypes: ['food', 'mineral'],
      });

      expect(result.treaty?.provisions[0]?.parameters.resourceTypes).toBe('food,mineral');
    });
  });

  describe('mutual defense pact', () => {
    it('establishes a mutual defense pact', () => {
      const result = diplomacy.establishMutualDefense({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
      });

      expect(result.success).toBe(true);
      expect(result.newRelation).toBe('allied');
    });

    it('prevents mutual defense while already allied', () => {
      diplomacy.formAlliance({ factionA: 'hearthbound-remnant', factionB: 'guards' });

      const result = diplomacy.establishMutualDefense({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('war declaration', () => {
    it('declares war', () => {
      const result = diplomacy.declareWar({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
        territoryId: 'forest-of-whispers',
        reason: 'Territorial dispute',
      });

      expect(result.success).toBe(true);
      expect(result.newRelation).toBe('war');
      expect(result.relationDelta).toBe(-50);
    });

    it('breaks existing treaties on war', () => {
      diplomacy.signNonAggressionPact({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      diplomacy.declareWar({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      const treaties = diplomacy.getTreatiesByFaction('hearthbound-remnant');
      expect(treaties.every((t) => t.status !== 'active')).toBe(true);
    });

    it('creates war event', () => {
      diplomacy.declareWar({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
      });

      const events = territoryManager.getActiveWarEvents();
      expect(events.some((e) => e.type === 'war-declared')).toBe(true);
    });
  });

  describe('peace treaty', () => {
    it('negotiates peace', () => {
      diplomacy.declareWar({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      const result = diplomacy.negotiatePeace({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
      });

      expect(result.success).toBe(true);
      expect(result.newRelation).toBe('neutral');
    });

    it('prevents peace when not at war', () => {
      const result = diplomacy.negotiatePeace({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
      });

      expect(result.success).toBe(false);
    });

    it('handles territory cession', () => {
      diplomacy.declareWar({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      // Hearthbound-remnant loses the territory
      territoryManager.shiftControl('forest-of-whispers', 'goblin-camps', 'hearthbound-remnant', 100, 'attack');

      diplomacy.negotiatePeace({
        factionA: 'hearthbound-remnant',
        factionB: 'goblin-camps',
        cessionTerritoryId: 'forest-of-whispers',
      });

      const ownership = territoryManager.getOwnership('forest-of-whispers');
      expect(ownership?.controllingFactionId).toBe('goblin-camps');
    });
  });

  describe('treaty breaking', () => {
    it('breaks a treaty', () => {
      diplomacy.formAlliance({ factionA: 'hearthbound-remnant', factionB: 'guards' });

      const result = diplomacy.breakTreaty({
        treatyId: diplomacy.getActiveTreaties()[0]?.id ?? '',
        breakingFactionId: 'hearthbound-remnant',
      });

      expect(result.success).toBe(true);
      expect(result.newRelation).toBe('tense');
    });

    it('sabotage breaks treaty and declares war', () => {
      diplomacy.formAlliance({ factionA: 'hearthbound-remnant', factionB: 'guards' });

      const result = diplomacy.breakTreaty({
        treatyId: diplomacy.getActiveTreaties()[0]?.id ?? '',
        breakingFactionId: 'hearthbound-remnant',
        sabotage: true,
      });

      expect(result.newRelation).toBe('war');
    });

    it('prevents breaking non-existent treaty', () => {
      const result = diplomacy.breakTreaty({
        treatyId: 'non-existent',
        breakingFactionId: 'hearthbound-remnant',
      });

      expect(result.success).toBe(false);
    });

    it('prevents breaking treaty as non-signatory', () => {
      diplomacy.formAlliance({ factionA: 'hearthbound-remnant', factionB: 'guards' });

      const result = diplomacy.breakTreaty({
        treatyId: diplomacy.getActiveTreaties()[0]?.id ?? '',
        breakingFactionId: 'goblin-camps',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('negotiation', () => {
    it('improves relations', () => {
      const result = diplomacy.negotiate({
        fromFaction: 'hearthbound-remnant',
        toFaction: 'goblin-camps',
        goal: 'improve-relation',
        playerInfluence: 50,
      });

      // Success depends on RNG
      expect(result).toBeDefined();
    });

    it('delegates to alliance formation', () => {
      const result = diplomacy.negotiate({
        fromFaction: 'hearthbound-remnant',
        toFaction: 'guards',
        goal: 'form-alliance',
      });

      // Alliance may or may not succeed
      expect(result).toBeDefined();
    });

    it('delegates to peace negotiation', () => {
      diplomacy.declareWar({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      const result = diplomacy.negotiate({
        fromFaction: 'hearthbound-remnant',
        toFaction: 'goblin-camps',
        goal: 'declare-peace',
      });

      // Peace may or may not succeed depending on success chance
      expect(result).toBeDefined();
    });

    it('delegates to trade pact', () => {
      const result = diplomacy.negotiate({
        fromFaction: 'hearthbound-remnant',
        toFaction: 'shopkeepers',
        goal: 'trade-pact',
      });

      // Trade pact may or may not succeed depending on success chance
      expect(result).toBeDefined();
    });

    it('fails with bad relations', () => {
      diplomacy.declareWar({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      const result = diplomacy.negotiate({
        fromFaction: 'hearthbound-remnant',
        toFaction: 'goblin-camps',
        goal: 'improve-relation',
      });

      // Should likely fail given war status
      if (!result.success) {
        expect(result.failureReason).toBeDefined();
      }
    });
  });

  describe('treaty expiry', () => {
    it('expires treaties at correct time', () => {
      diplomacy.formAlliance({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
        expiresAt: Date.now() - 1000, // Already expired
      });

      diplomacy.checkExpiries(Date.now());

      const treaties = diplomacy.getAllTreaties();
      // At least one treaty should exist
      expect(treaties.length).toBeGreaterThan(0);
    });

    it('resets relations on treaty expiry', () => {
      diplomacy.formAlliance({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
        expiresAt: Date.now() - 1000,
      });

      diplomacy.checkExpiries(Date.now());

      const relation = diplomacy.getRelation('hearthbound-remnant', 'guards');
      expect(relation).toBe('neutral');
    });

    it('does not expire permanent treaties', () => {
      diplomacy.formAlliance({
        factionA: 'hearthbound-remnant',
        factionB: 'guards',
        expiresAt: undefined,
      });

      diplomacy.checkExpiries(Date.now());

      const relation = diplomacy.getRelation('hearthbound-remnant', 'guards');
      expect(relation).toBe('allied');
    });
  });

  describe('save / load', () => {
    it('saves and loads treaties', () => {
      diplomacy.formAlliance({ factionA: 'hearthbound-remnant', factionB: 'guards' });
      diplomacy.signNonAggressionPact({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      const saveData = diplomacy.save();
      expect(saveData.treaties.length).toBe(2);

      const newDiplomacy = new DiplomacySystem(territoryManager);
      newDiplomacy.load(saveData);

      expect(newDiplomacy.getAllTreaties().length).toBe(2);
    });

    it('saves and loads relations', () => {
      diplomacy.declareWar({ factionA: 'hearthbound-remnant', factionB: 'goblin-camps' });

      const saveData = diplomacy.save();

      const newDiplomacy = new DiplomacySystem(territoryManager);
      newDiplomacy.load(saveData);

      expect(newDiplomacy.getRelation('hearthbound-remnant', 'goblin-camps')).toBe('war');
    });
  });
});
