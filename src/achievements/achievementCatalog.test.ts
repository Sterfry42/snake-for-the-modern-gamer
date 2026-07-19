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
import { getAchievementReward } from './achievementRewards.js';
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
    trainZonesTraveled: 0,
    maxSpecialStat: 5,
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

  it('shows the zoom challenge plainly and awards 50 score', () => {
    const definition = ACHIEVEMENT_DEFINITIONS.find(
      (achievement) => achievement.id === 'system.zoomFlurry',
    );
    expect(definition?.secret).not.toBe(true);
    expect(definition?.description).toContain('Fully zoom in and fully zoom out three times');
    const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, new MemoryAchievementStorage());
    const [unlock] = manager.recordEvent({ type: 'ui:achievementZoomFlurry' });
    expect(unlock.scoreReward).toBe(50);
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
      { type: 'ui:achievementZoomFlurry' },
      { type: 'house:expanded', level: 1 },
      { type: 'relationship:divorced', relationshipId: 'npc' },
      { type: 'combat:gunKill', targetId: 'enemy' },
      { type: 'combat:jadeKatanaWallSmite', roomId: '0,0,0' },
      { type: 'divine:angelEncountered', angelKind: 'normal' },
      { type: 'divine:angelEncountered', angelKind: 'goblin' },
      { type: 'divine:escapedHell', itemId: 'get-out-of-hell-free-card' },
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
      'system.zoomFlurry',
      'house.expansion',
      'relationships.divorced',
      'combat.gunKill',
      'combat.katanaSmite',
      'divine.meetAngel',
      'divine.meetGoblinAngel',
      'divine.snakeOutOfHell',
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

  it('unlocks arcade and SPECIAL achievements from their actual triggers', () => {
    const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, new MemoryAchievementStorage());
    manager.recordEvent({ type: 'arcade:played' });
    manager.recordEvent({ type: 'arcade:blueScreen' });
    manager.evaluateSnapshot(snapshot({ maxSpecialStat: 10 }));
    expect(manager.isCompleted('arcade.snakeception')).toBe(true);
    expect(manager.isCompleted('arcade.blueScreen')).toBe(true);
    expect(manager.isCompleted('stats.special10')).toBe(true);
  });

  it('unlocks the bullet train distance achievement from one long ride', () => {
    const manager = new AchievementManager(ACHIEVEMENT_DEFINITIONS, new MemoryAchievementStorage());
    manager.evaluateSnapshot(snapshot({ trainZonesTraveled: 5 }));
    expect(manager.isCompleted('exploration.trainSixZones')).toBe(false);
    manager.evaluateSnapshot(snapshot({ trainZonesTraveled: 6 }));
    expect(manager.isCompleted('exploration.trainSixZones')).toBe(true);
  });

  it('places the new achievements beside their actual progression parents with proper rewards', () => {
    const snakeception = ACHIEVEMENT_DEFINITIONS.find(
      (definition) => definition.id === 'arcade.snakeception',
    )!;
    const blueScreen = ACHIEVEMENT_DEFINITIONS.find(
      (definition) => definition.id === 'arcade.blueScreen',
    )!;
    const special10 = ACHIEVEMENT_DEFINITIONS.find(
      (definition) => definition.id === 'stats.special10',
    )!;
    const score500Index = ACHIEVEMENT_DEFINITIONS.findIndex(
      (definition) => definition.id === 'stats.score500',
    );
    const special10Index = ACHIEVEMENT_DEFINITIONS.findIndex(
      (definition) => definition.id === 'stats.special10',
    );
    const score1000Index = ACHIEVEMENT_DEFINITIONS.findIndex(
      (definition) => definition.id === 'stats.score1000',
    );

    expect(snakeception.prerequisites).toEqual(['core.firstApple']);
    expect(blueScreen.prerequisites).toEqual(['arcade.snakeception']);
    expect(special10.prerequisites).toEqual(['stats.score500']);
    expect(special10Index).toBeGreaterThan(score500Index);
    expect(special10Index).toBeLessThan(score1000Index);
    expect(snakeception.tree.x).toBeLessThan(500);
    expect(blueScreen.tree.x).toBeLessThan(500);
    expect(getAchievementReward(snakeception)).toBe(30);
    expect(getAchievementReward(blueScreen)).toBe(100);
    expect(getAchievementReward(special10)).toBe(75);
    expect(snakeception.icon.kind).toBe('arcadeCabinet');
    expect(blueScreen.icon.kind).toBe('blueScreen');
    expect(special10.icon.kind).toBe('specialStat');
  });

  it('forms a collision-free progression tree with only intentional standalone roots', () => {
    const byId = new Map(ACHIEVEMENT_DEFINITIONS.map((definition) => [definition.id, definition]));
    const occupied = new Map<string, string>();
    const standaloneIds = new Set(['core.firstApple', 'system.zoomFlurry']);

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const coordinate = `${definition.tree.x},${definition.tree.y}`;
      expect(
        occupied.get(coordinate),
        `${definition.id} overlaps ${occupied.get(coordinate)}`,
      ).toBe(undefined);
      occupied.set(coordinate, definition.id);

      for (const prerequisite of definition.prerequisites ?? []) {
        expect(byId.has(prerequisite), `${definition.id} has missing parent ${prerequisite}`).toBe(
          true,
        );
      }
      if (!standaloneIds.has(definition.id)) {
        expect(
          definition.prerequisites?.length,
          `${definition.id} is disconnected`,
        ).toBeGreaterThan(0);
      }
    }
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
      'relationships.motherLove',
      'equipment.fullLoadout',
      'fishing.completeJournal',
      'archaeology.allArtifacts',
      'divine.meetAngel',
      'divine.meetGoblinAngel',
      'divine.snakeOutOfHell',
      'caves.appleRushClear',
      'companions.first',
      'shops.generalBuyout',
      'cards.fullDeck',
      'arcade.snakeception',
      'arcade.blueScreen',
      'stats.special10',
    ]) {
      const definition = ACHIEVEMENT_DEFINITIONS.find((entry) => entry.id === id);
      expect(definition?.icon.kind, id).not.toBe('snake');
    }
  });
});
