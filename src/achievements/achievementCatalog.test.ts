import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_DEFINITIONS,
  DISCOVERABLE_BIOME_IDS,
  HAZARD_SURVIVAL_TARGET_MS,
  PRACTICAL_RESISTANCE_THRESHOLD,
  TOTAL_ARTIFACT_COUNT,
  TOTAL_CARD_COUNT,
  TOTAL_FISH_COUNT,
} from './achievementDefinitions.js';
import { AchievementManager } from './achievementManager.js';
import { MemoryAchievementStorage } from './achievementStorage.js';
import type { AchievementEvent, AchievementSnapshot } from './achievementTypes.js';

function snapshot(overrides: Partial<AchievementSnapshot> = {}): AchievementSnapshot {
  return {
    score: 0,
    length: 3,
    roomsVisited: 1,
    waterTilesSwum: 0,
    discoveredBiomeIds: [],
    discoverableBiomeIds: DISCOVERABLE_BIOME_IDS,
    wantedLevel: 0,
    questsCompleted: 0,
    treasuresCollected: 0,
    equippedSlots: [],
    cardIdsOwned: [],
    fishTypeIdsCaught: [],
    artifactsOwned: [],
    skillTreeCompletedBranchIds: [],
    skillTreeBranchCount: 7,
    hotSurvivalMs: 0,
    coldSurvivalMs: 0,
    heatResistance: 0,
    coldResistance: 0,
    cowbellTilesWalked: 0,
    wardDamageTypesHeld: 0,
    ...overrides,
  };
}

describe('revised achievement catalog', () => {
  it('uses enemy defeat for Big Bite and gives the first apple no score', () => {
    const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, new MemoryAchievementStorage());
    const [apple] = manager.recordEvent({ type: 'apple:eaten', appleTypeId: 'gold' });
    expect(apple.id).toBe('core.firstApple');
    expect(apple.scoreReward).toBe(0);
    expect(manager.isCompleted('core.bigBite')).toBe(false);
    manager.recordEvent({ type: 'enemy:defeated', enemyId: 'rat', method: 'eaten' });
    expect(manager.isCompleted('core.bigBite')).toBe(true);
  });

  it('uses the revised length milestones and real branch count', () => {
    const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, new MemoryAchievementStorage());
    manager.evaluateSnapshot(
      snapshot({ length: 250, skillTreeCompletedBranchIds: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    );
    expect(manager.isCompleted('stats.length250')).toBe(true);
    expect(manager.isCompleted('stats.length1000')).toBe(false);
    expect(manager.isCompleted('skillTree.allBranches')).toBe(false);
    manager.evaluateSnapshot(
      snapshot({ length: 1000, skillTreeCompletedBranchIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }),
    );
    expect(manager.isCompleted('stats.length1000')).toBe(true);
    expect(manager.isCompleted('skillTree.allBranches')).toBe(true);
  });

  it('handles revised explicit one-shot events', () => {
    const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, new MemoryAchievementStorage());
    const events: AchievementEvent[] = [
      { type: 'town:gateOpened', townId: 'town' },
      { type: 'guild:enteredHideout', townId: 'town' },
      { type: 'guild:initiationCompleted', townId: 'town' },
      { type: 'town:enteredBigIron', townId: 'town' },
      { type: 'house:expanded', level: 1 },
      { type: 'relationship:divorced', relationshipId: 'npc' },
      { type: 'combat:gunKill', targetId: 'enemy' },
      { type: 'combat:jadeKatanaWallSmite', roomId: '0,0,0' },
      { type: 'divine:angelEncountered', angelKind: 'normal' },
      { type: 'divine:angelEncountered', angelKind: 'goblin' },
      {
        type: 'fishing:caught',
        fishTypeId: 'rare',
        rarity: 'rare',
        weight: 1,
        biomeId: 'verdigris-basin',
      },
      { type: 'archaeology:chainReached', chain: 3 },
      { type: 'archaeology:chainReached', chain: 5 },
      { type: 'archaeology:depthReached', depth: 50 },
      { type: 'cave:appleRushCleared', caveId: 'cave:1', templateId: 'goldenAppleRush' },
      { type: 'companion:acquired', companionKind: 'goblin-mercenary' },
      { type: 'shop:generalBoughtOut', shopId: 'village:1' },
      { type: 'cards:tableWon', tableId: 'porch-table' },
    ];
    for (const event of events) manager.recordEvent(event);
    for (const id of [
      'towns.openGate',
      'guild.enterHideout',
      'guild.initiation',
      'towns.bigIron',
      'house.expansion',
      'relationships.divorced',
      'combat.gunKill',
      'combat.katanaSmite',
      'divine.meetAngel',
      'divine.meetGoblinAngel',
      'fishing.rare',
      'archaeology.chain3',
      'archaeology.chain5',
      'archaeology.depth50',
      'caves.appleRushClear',
      'companions.first',
      'shops.generalBuyout',
      'cards.win.porch-table',
    ])
      expect(manager.isCompleted(id), id).toBe(true);
  });

  it('handles revised snapshot counts and resistance thresholds', () => {
    const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, new MemoryAchievementStorage());
    manager.recordEvent({ type: 'equipment:equipped', itemId: 'weapon-revolver', slot: 'weapon' });
    manager.evaluateSnapshot(
      snapshot({
        wantedLevel: 5,
        questsCompleted: 5,
        treasuresCollected: 5,
        equippedSlots: ['weapon', 'boots', 'helm', 'ring', 'gloves', 'cloak', 'belt', 'amulet'],
        cardIdsOwned: Array.from({ length: TOTAL_CARD_COUNT }, (_, i) => `card-${i}`),
        fishTypeIdsCaught: Array.from({ length: TOTAL_FISH_COUNT }, (_, i) => `fish-${i}`),
        artifactsOwned: Array.from({ length: TOTAL_ARTIFACT_COUNT }, (_, i) => `artifact-${i}`),
        hotSurvivalMs: HAZARD_SURVIVAL_TARGET_MS,
        coldSurvivalMs: HAZARD_SURVIVAL_TARGET_MS,
        heatResistance: PRACTICAL_RESISTANCE_THRESHOLD,
        coldResistance: PRACTICAL_RESISTANCE_THRESHOLD,
        cowbellTilesWalked: 200,
        wardDamageTypesHeld: 3,
      }),
    );
    for (const id of [
      'towns.wanted5',
      'quests.first',
      'quests.five',
      'treasure.first',
      'treasure.five',
      'equipment.fullLoadout',
      'cards.fullDeck',
      'fishing.completeJournal',
      'archaeology.allArtifacts',
      'hazards.hotSurvival',
      'hazards.coldSurvival',
      'hazards.heatResistance',
      'hazards.coldResistance',
      'equipment.cowbell200',
      'equipment.wardTrinity',
    ])
      expect(manager.isCompleted(id), id).toBe(true);
  });

  it('requires a full minute for temperature survival achievements', () => {
    expect(HAZARD_SURVIVAL_TARGET_MS).toBe(60_000);
  });

  it('assigns distinctive portrait kinds to revised categories', () => {
    for (const id of [
      'core.bigBite',
      'combat.gunKill',
      'combat.katanaSmite',
      'hazards.hotSurvival',
      'hazards.coldSurvival',
      'house.expansion',
      'quests.first',
      'treasure.first',
      'towns.wanted5',
      'relationships.divorced',
      'equipment.fullLoadout',
      'fishing.completeJournal',
      'archaeology.allArtifacts',
      'divine.meetAngel',
      'divine.meetGoblinAngel',
      'caves.appleRushClear',
      'companions.first',
      'shops.generalBuyout',
      'cards.fullDeck',
    ]) {
      const definition = ACHIEVEMENT_DEFINITIONS.find((entry) => entry.id === id);
      expect(definition?.icon.kind, id).not.toBe('snake');
    }
  });
});
