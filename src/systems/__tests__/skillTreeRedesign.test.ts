import { describe, expect, it } from 'vitest';
import { SKILL_BRANCH_IDS, SKILL_DEFINITIONS } from '../skillCatalog.js';
import { migrateSkillRanks } from '../skillMigration.js';
import { SkillTreeSystem } from '../skillTree.js';
import type { SkillTreeRuntime } from '../skillTypes.js';
import { validateSkillDefinitions } from '../skillValidation.js';
import {
  BACKGROUNDS,
  CLASSES,
  FAITHS,
  getCharacterCreationCardDescription,
} from '../../features/characterCreationDefinitions.js';

function createRuntime(
  score = 10_000,
): SkillTreeRuntime & { score: number; flags: Map<string, unknown> } {
  return {
    score,
    flags: new Map(),
    getScore() {
      return this.score;
    },
    addScore(amount) {
      this.score += amount;
    },
    setActionStepIntervalMs() {},
    setTickDelay() {},
    growSnake() {},
    notifyScoreMultiplierChanged() {},
    notifyExtraLifeGained() {},
    notifyExtraLifeConsumed() {},
    notifyExtraLifeReset() {},
    notifyManaChanged() {},
    notifyManaUnlocked() {},
    notifyArcanePulseUnlocked() {},
    notifyArcaneVeilUnlocked() {},
    onArcanePulseCast() {},
    onArcaneVeilTriggered() {},
    setFlag(key, value) {
      this.flags.set(key, value);
    },
  };
}

describe('skill tree redesign catalog', () => {
  it('can reset life charges to an exact amount', () => {
    const tree = new SkillTreeSystem(createRuntime(), 100);
    tree.addExtraLives(4);
    tree.setExtraLives(1);
    expect(tree.getStats().extraLives).toBe(1);
  });

  it('uses the complete lightweight character-creation option sets', () => {
    expect(BACKGROUNDS).toHaveLength(8);
    expect(CLASSES).toHaveLength(8);
    expect(FAITHS).toHaveLength(7);
    const byId = new Map(SKILL_DEFINITIONS.map((perk) => [perk.id, perk]));
    for (const option of [...CLASSES, ...FAITHS]) {
      if (!option.mods.startingPerkId) continue;
      expect(byId.get(option.mods.startingPerkId)?.grantableAtStart).toBe(true);
    }
  });

  it('defines Christianity as one starting charge backed by one life of capacity', () => {
    const christianity = FAITHS.find((faith) => faith.id === 'christianity');

    expect(christianity?.mods.startingLifeCharges).toBe(1);
    expect(christianity?.mods.derivedModifiers).toContainEqual({
      stat: 'extraLifeCapacity',
      operation: 'add',
      value: 1,
    });
  });

  it('keeps background SPECIAL packages zero-sum and cards mechanically concise', () => {
    for (const background of BACKGROUNDS) {
      const modifiers = Object.values(background.mods.specialModifiers ?? {});
      expect(modifiers).not.toHaveLength(0);
      expect(modifiers.reduce((sum, value) => sum + Number(value), 0)).toBe(0);
      expect(getCharacterCreationCardDescription(background)).not.toMatch(/SPECIAL:|DERIVED:/);
    }
    for (const faith of FAITHS) {
      if (faith.id !== 'islam') expect(faith.mods.derivedModifiers).not.toHaveLength(0);
      expect(getCharacterCreationCardDescription(faith)).not.toMatch(/SPECIAL:|DERIVED:/);
    }
  });

  it('defines exactly six launch branches and a valid acyclic graph', () => {
    expect(SKILL_BRANCH_IDS).toEqual([
      'momentum',
      'survival',
      'arcane',
      'growth',
      'predator',
      'fellowship',
    ]);
    expect(
      new Set(
        SKILL_DEFINITIONS.filter((perk) => perk.kind !== 'combo').map((perk) => perk.branchId),
      ),
    ).toEqual(new Set(SKILL_BRANCH_IDS));
    expect(validateSkillDefinitions(SKILL_DEFINITIONS)).toEqual([]);
    // Aspirational combo flags were removed; only combos with production consumers remain.
    expect(SKILL_DEFINITIONS.filter((perk) => perk.kind === 'combo')).toHaveLength(2);
  });

  it('keeps SPECIAL attributes out of skill descriptions', () => {
    const specialAbbreviationPattern = /\b(?:STR|PER|END|CHA|INT|AGI|LCK)\b/;
    const specialNamePattern =
      /\b(?:Strength|Perception|Endurance|Charisma|Intelligence|Agility|Luck)\b/i;
    for (const perk of SKILL_DEFINITIONS) {
      expect(perk.description).not.toMatch(specialAbbreviationPattern);
      expect(perk.description).not.toMatch(specialNamePattern);
    }
  });

  it('allows both specialization routes when their shared core is owned', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);
    for (const id of ['swiftScales', 'corneringInstinct', 'slipstream', 'windShear', 'overclock']) {
      expect(tree.purchase(id)).not.toBeNull();
    }
    expect(tree.hasPerk('windShear')).toBe(true);
    expect(tree.hasPerk('overclock')).toBe(true);
  });

  it('does not tax Bulwark with Fieldcraft or Arcane routes with Arcane Pulse', () => {
    const survivalTree = new SkillTreeSystem(createRuntime(), 100);
    survivalTree.restoreRanks({ thickScales: 1, secondWind: 1 });
    expect(survivalTree.getPurchaseState('hardenedScales').status).toBe('available');

    const arcaneTree = new SkillTreeSystem(createRuntime(), 100);
    arcaneTree.restoreRanks({ manaBloom: 1, spellbook: 1 });
    expect(arcaneTree.getPurchaseState('preparedCaster').status).toBe('available');
    expect(arcaneTree.getPurchaseState('overcast').status).toBe('available');
  });

  it('applies a class grant once and lets it satisfy prerequisites', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);
    expect(tree.grantPerk('manaBloom', { type: 'class', classId: 'mage' })).toBe(true);
    expect(tree.grantPerk('manaBloom', { type: 'class', classId: 'mage' })).toBe(true);
    expect(tree.getStats().manaMax).toBe(60);
    expect(tree.getPurchaseState('spellbook').status).toBe('available');
    expect(tree.getOwnership('manaBloom')?.sources).toEqual([{ type: 'class', classId: 'mage' }]);
  });

  it('restores ownership sources without applying their perk effects twice', () => {
    const first = new SkillTreeSystem(createRuntime(), 100);
    first.grantPerk('manaBloom', { type: 'class', classId: 'mage' });
    const ranks = first.exportRanks();
    const ownership = first.exportOwnership();

    const restored = new SkillTreeSystem(createRuntime(), 100);
    restored.restoreRanks(ranks);
    restored.restoreOwnership(ownership);

    expect(restored.getStats().manaMax).toBe(60);
    expect(restored.getOwnership('manaBloom')?.sources).toEqual([
      { type: 'class', classId: 'mage' },
    ]);
  });

  it('routes major perk numbers into inspectable derived-stat sources', () => {
    const tree = new SkillTreeSystem(createRuntime(), 100);
    tree.restoreRanks({ thickScales: 1, manaBloom: 1, bloodBank: 1, preferredCustomer: 1 });
    expect(tree.getDerivedStat('maxHealth')).toBe(4);
    expect(tree.getDerivedStatBreakdown('maxHealth').additions).toContainEqual({
      sourceId: 'skill.thickScales',
      value: 1,
    });
    expect(tree.getDerivedStat('manaMax')).toBe(60);
    expect(tree.getDerivedStat('storedVitalityCapacity')).toBe(4);
    expect(tree.getDerivedStatBreakdown('storedVitalityCapacity').additions).toContainEqual({
      sourceId: 'skill.bloodBank',
      value: 4,
    });
    expect(tree.getDerivedStat('shopPriceScalar')).toBeCloseTo(0.9);
  });

  it('locks combo perks until both branches are invested', () => {
    const runtime = createRuntime();
    const tree = new SkillTreeSystem(runtime, 100);
    tree.grantPerk('manaBloom', { type: 'class', classId: 'mage' });
    expect(tree.getPurchaseState('arcaneVeil').missing).toContain('wardedBody');
    tree.restoreRanks({
      manaBloom: 1,
      thickScales: 1,
      secondWind: 1,
      fieldcraft: 1,
      hardenedScales: 1,
      wardedBody: 1,
    });
    expect(tree.getPurchaseState('arcaneVeil').status).toBe('available');
  });
});

describe('legacy skill migration', () => {
  it('maps qualitative perks and refunds removed filler deterministically', () => {
    const migrated = migrateSkillRanks(
      { shed: 1, hyperReflex: 1, tailForge: 3, deathMarker: 1, unknownModPerk: 2 },
      SKILL_DEFINITIONS,
    );
    expect(migrated.ranks).toMatchObject({ controlledShedding: 1, corneringInstinct: 1 });
    expect(migrated.refundedScore).toBe(98);
    expect(migrated.removedPurchases).toBe(6);
    expect(migrated.mappedPerks).toBe(2);
  });

  it('is idempotent after ranks are written in the new format', () => {
    const first = migrateSkillRanks({ shed: 1, tailForge: 1 }, SKILL_DEFINITIONS);
    const second = migrateSkillRanks(first.ranks, SKILL_DEFINITIONS);
    expect(second.ranks).toEqual(first.ranks);
    expect(second.refundedScore).toBe(0);
    expect(second.mappedPerks).toBe(0);
  });

  it('refunds collapsed legacy ranks and removed combo purchases', () => {
    const migrated = migrateSkillRanks(
      {
        swiftScales: 3,
        secondWind: 2,
        spellrush: 1,
        devour: 1,
        guardianBond: 1,
      },
      SKILL_DEFINITIONS,
    );
    expect(migrated.ranks).toMatchObject({ swiftScales: 1, secondWind: 1 });
    expect(migrated.refundedScore).toBe(28 + 52 + 60 + 98 + 96 + 112);
    expect(migrated.removedPurchases).toBe(6);
  });
});
