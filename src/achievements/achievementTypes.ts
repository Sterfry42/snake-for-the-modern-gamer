export type AchievementId = string;

export type AchievementCategory =
  | 'core'
  | 'stats'
  | 'exploration'
  | 'hazards'
  | 'equipment'
  | 'combat'
  | 'towns'
  | 'guild'
  | 'house'
  | 'quests'
  | 'treasure'
  | 'relationships'
  | 'fishing'
  | 'archaeology'
  | 'cards'
  | 'bosses'
  | 'caves'
  | 'rivals'
  | 'skillTree';

export type AchievementDifficulty =
  | 'tutorial'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'legendary'
  | 'secret';

export interface AchievementIconSpec {
  kind:
    | 'apple'
    | 'enemy'
    | 'snake'
    | 'equipment'
    | 'loadout'
    | 'gun'
    | 'bigIron'
    | 'cowbell'
    | 'wards'
    | 'zoom'
    | 'katana'
    | 'fish'
    | 'fishJournal'
    | 'town'
    | 'wanted'
    | 'guild'
    | 'house'
    | 'quest'
    | 'treasure'
    | 'heart'
    | 'baby'
    | 'divorce'
    | 'artifact'
    | 'artifactCollection'
    | 'card'
    | 'companion'
    | 'caveRush'
    | 'shopBuyout'
    | 'boss'
    | 'angel'
    | 'biome'
    | 'hazardHot'
    | 'hazardCold'
    | 'cave'
    | 'drink'
    | 'fastFood'
    | 'water'
    | 'skillTree'
    | 'arcadeCabinet'
    | 'blueScreen'
    | 'specialStat';
  variant?: string;
  fallbackGlyph: string;
}

export interface AchievementProgressDefinition {
  target: number;
  label: string;
}

export type AchievementCriterion =
  | { kind: 'event'; eventType: AchievementEvent['type']; match?: Record<string, string | number> }
  | { kind: 'snapshot'; field: AchievementNumericSnapshotField; target: number };

export type AchievementNumericSnapshotField =
  | 'score'
  | 'length'
  | 'roomsVisited'
  | 'waterTilesSwum'
  | 'discoveredBiomeCount'
  | 'wantedLevel'
  | 'questsCompleted'
  | 'treasuresCollected'
  | 'equippedSlotCount'
  | 'cardsOwned'
  | 'fishTypesCaught'
  | 'artifactsOwned'
  | 'skillBranchesCompleted'
  | 'hotSurvivalMs'
  | 'coldSurvivalMs'
  | 'heatResistance'
  | 'coldResistance'
  | 'cowbellTilesWalked'
  | 'wardDamageTypesHeld'
  | 'trainZonesTraveled'
  | 'maxSpecialStat';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  scoreReward?: number;
  prerequisites?: readonly AchievementId[];
  tree: { x: number; y: number; section: string };
  icon: AchievementIconSpec;
  criterion: AchievementCriterion;
  progress?: AchievementProgressDefinition;
  archipelago?: { enabledByDefault: boolean; excludeFromPercentageGoal?: boolean };
  secret?: boolean;
}

export type AchievementEvent =
  | { type: 'apple:eaten'; appleTypeId: string }
  | { type: 'enemy:defeated'; enemyId: string; method: 'eaten' | 'gun' | 'other' }
  | { type: 'town:gateOpened'; townId: string }
  | { type: 'town:entered'; townId: string; name: string }
  | { type: 'town:enteredBigIron'; townId: string }
  | { type: 'guild:initiationCompleted'; townId: string }
  | { type: 'guild:enteredHideout'; townId: string }
  | { type: 'ui:achievementZoomFlurry' }
  | { type: 'house:expanded'; level: number }
  | { type: 'equipment:equipped'; itemId: string; slot: string }
  | { type: 'combat:gunKill'; targetId: string }
  | { type: 'combat:jadeKatanaWallSmite'; roomId: string }
  | { type: 'item:consumed'; itemId: string }
  | { type: 'extraLife:gained'; sourceItemId?: string; amount: number }
  | { type: 'water:swamTile'; roomId: string; biomeId: string }
  | { type: 'relationship:dated'; relationshipId: string }
  | { type: 'relationship:married'; relationshipId: string }
  | { type: 'relationship:child'; relationshipId: string; childKind: string }
  | { type: 'relationship:divorced'; relationshipId: string }
  | { type: 'fishing:caught'; fishTypeId: string; rarity: string; weight: number; biomeId: string }
  | { type: 'archaeology:artifactRecovered'; artifactId: string; rarity?: string }
  | { type: 'archaeology:depthReached'; depth: number }
  | { type: 'archaeology:chainReached'; chain: number }
  | { type: 'cards:tableWon'; tableId: string }
  | { type: 'cave:appleRushCleared'; caveId: string; templateId: string }
  | { type: 'companion:acquired'; companionKind: string }
  | { type: 'shop:generalBoughtOut'; shopId: string }
  | { type: 'boss:defeated'; bossKind: string; bossName: string }
  | { type: 'boss:jasonVulnerableDamaged'; bossId: string }
  | { type: 'divine:angelEncountered'; angelKind: 'normal' | 'goblin' }
  | { type: 'arcade:played' }
  | { type: 'arcade:blueScreen' }
  | { type: 'rivalSnake:lengthReached'; enemyId: string; length: number };

export interface AchievementSnapshot {
  score: number;
  length: number;
  roomsVisited: number;
  waterTilesSwum: number;
  discoveredBiomeIds: readonly string[];
  discoverableBiomeIds: readonly string[];
  wantedLevel: number;
  questsCompleted: number;
  treasuresCollected: number;
  equippedSlots: readonly string[];
  cardIdsOwned: readonly string[];
  fishTypeIdsCaught: readonly string[];
  artifactsOwned: readonly string[];
  skillTreeCompletedBranchIds: readonly string[];
  skillTreeBranchCount: number;
  hotSurvivalMs: number;
  coldSurvivalMs: number;
  heatResistance: number;
  coldResistance: number;
  cowbellTilesWalked: number;
  wardDamageTypesHeld: number;
  trainZonesTraveled: number;
  maxSpecialStat: number;
}

export interface AchievementProgressState {
  current: number;
  target: number;
  updatedAtMs: number;
}
export interface AchievementState {
  version: 1;
  completed: Record<AchievementId, { completedAtMs: number; source: 'local' | 'import' | 'debug' }>;
  progress: Record<AchievementId, AchievementProgressState>;
  discoveredBiomes: string[];
  apSubmitted: Record<AchievementId, boolean>;
  run: { consumedItemIds: string[]; waterTilesSwum: number };
}
export type AchievementStatus = 'completed' | 'available' | 'locked';
export interface AchievementUnlockResult {
  id: AchievementId;
  name: string;
  description: string;
  icon: AchievementIconSpec;
  scoreReward: number;
  completedAtMs: number;
  archipelago?: { shouldSubmitLocation: boolean; locationKey: string };
}
