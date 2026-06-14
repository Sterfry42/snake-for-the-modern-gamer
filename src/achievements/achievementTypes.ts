export type AchievementId = string;

export type AchievementCategory =
  | 'core'
  | 'stats'
  | 'exploration'
  | 'biomes'
  | 'equipment'
  | 'towns'
  | 'guild'
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
    | 'snake'
    | 'equipment'
    | 'fish'
    | 'town'
    | 'guild'
    | 'heart'
    | 'baby'
    | 'artifact'
    | 'card'
    | 'boss'
    | 'biome'
    | 'cave'
    | 'drink'
    | 'fastFood'
    | 'water'
    | 'skillTree';
  variant?: string;
  fallbackGlyph: string;
}

export interface AchievementProgressDefinition {
  target: number;
  label: string;
}

export type AchievementCriterion =
  | { kind: 'event'; eventType: AchievementEvent['type']; match?: Record<string, string | number> }
  | { kind: 'score'; target: number }
  | { kind: 'length'; target: number }
  | { kind: 'rooms'; target: number }
  | { kind: 'biomes'; target: number }
  | { kind: 'waterTiles'; target: number }
  | { kind: 'cards'; target: number }
  | { kind: 'artifacts'; target: number }
  | { kind: 'skillBranches'; target: number };

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  prerequisites?: readonly AchievementId[];
  tree: { x: number; y: number; section: string };
  icon: AchievementIconSpec;
  criterion: AchievementCriterion;
  progress?: AchievementProgressDefinition;
  archipelago?: {
    enabledByDefault: boolean;
    excludeFromPercentageGoal?: boolean;
  };
  secret?: boolean;
}

export type AchievementEvent =
  | { type: 'apple:eaten'; appleTypeId: string }
  | { type: 'equipment:equipped'; itemId: string; slot: string }
  | { type: 'item:consumed'; itemId: string }
  | { type: 'extraLife:gained'; sourceItemId?: string; amount: number }
  | { type: 'water:swamTile'; roomId: string; biomeId: string }
  | { type: 'town:entered'; townId: string; name: string }
  | { type: 'guild:initiationCompleted'; townId: string }
  | { type: 'relationship:dated'; relationshipId: string }
  | { type: 'relationship:married'; relationshipId: string }
  | { type: 'relationship:child'; relationshipId: string; childKind: string }
  | { type: 'fishing:caught'; fishTypeId: string; rarity: string; weight: number; biomeId: string }
  | { type: 'archaeology:artifactRecovered'; artifactId: string; rarity?: string }
  | { type: 'archaeology:depthReached'; depth: number }
  | { type: 'archaeology:chainReached'; chain: number }
  | { type: 'cards:tableWon'; tableId: string }
  | { type: 'boss:defeated'; bossKind: string; bossName: string }
  | { type: 'boss:jasonVulnerableDamaged'; bossId: string }
  | { type: 'cave:entered'; caveId: string; templateId?: string }
  | { type: 'rivalSnake:lengthReached'; enemyId: string; length: number }
  | { type: 'skillTree:branchCompleted'; branchId: string };

export interface AchievementSnapshot {
  score: number;
  length: number;
  roomsVisited: number;
  discoveredBiomeIds: readonly string[];
  inventoryItemIds: readonly string[];
  equippedSlots: readonly string[];
  cardsOwned: Readonly<Record<string, number>>;
  artifactsOwned: readonly string[];
  skillTreeCompletedBranchIds: readonly string[];
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
  run: {
    consumedItemIds: string[];
    waterTilesSwum: number;
  };
}

export type AchievementStatus = 'completed' | 'available' | 'locked';

export interface AchievementUnlockResult {
  id: AchievementId;
  name: string;
  description: string;
  icon: AchievementIconSpec;
  completedAtMs: number;
  archipelago?: { shouldSubmitLocation: boolean; locationKey: string };
}
