export type StarforgedElement = 'solar' | 'void' | 'arc' | 'stasis' | 'strand' | 'prismatic';

export type StarforgedSlot =
  | 'kinetic'
  | 'energy'
  | 'heavy'
  | 'helmet'
  | 'gauntlets'
  | 'chest'
  | 'boots'
  | 'classItem'
  | 'artifact';

export type StarforgedRarity = 'common' | 'rare' | 'legendary' | 'exotic' | 'mythic';

export type StarforgedActivityKind =
  | 'patrol'
  | 'strike'
  | 'nightfall'
  | 'raid'
  | 'dungeon'
  | 'gambit'
  | 'crucible'
  | 'seasonal'
  | 'campaign'
  | 'exoticMission';

export type StarforgedObjectiveKind =
  | 'eatApples'
  | 'visitRooms'
  | 'score'
  | 'surviveTicks'
  | 'chainStreak'
  | 'defeatEnemies'
  | 'collectPowerups';

export interface StarforgedStatBlock {
  mobility: number;
  resilience: number;
  recovery: number;
  discipline: number;
  intellect: number;
  strength: number;
}

export interface StarforgedPerk {
  id: string;
  name: string;
  column: 1 | 2 | 3 | 4 | 5;
  element?: StarforgedElement;
  tags: string[];
  effects: {
    scoreBonus?: number;
    growthBonus?: number;
    shieldTicks?: number;
    speedScalar?: number;
    wallSense?: number;
    lootLuck?: number;
    superEnergy?: number;
    abilityEnergy?: number;
  };
}

export interface StarforgedGearDefinition {
  id: string;
  name: string;
  slot: StarforgedSlot;
  rarity: StarforgedRarity;
  element: StarforgedElement;
  power: number;
  intrinsic: string;
  originTrait: string;
  stats: StarforgedStatBlock;
  perkPool: readonly string[];
  setId?: string;
  lore: string;
}

export interface StarforgedActivityDefinition {
  id: string;
  name: string;
  kind: StarforgedActivityKind;
  recommendedPower: number;
  encounterCount: number;
  objective: {
    kind: StarforgedObjectiveKind;
    target: number;
  };
  rewardTable: readonly string[];
  factionId: string;
  modifiers: readonly string[];
  description: string;
}

export interface StarforgedFactionDefinition {
  id: string;
  name: string;
  vendor: string;
  philosophy: string;
  reputationTrack: readonly number[];
  rewardTable: readonly string[];
}

export interface StarforgedSubclassDefinition {
  id: string;
  name: string;
  element: StarforgedElement;
  aspects: readonly string[];
  fragments: readonly string[];
  superName: string;
  grenadeName: string;
  meleeName: string;
  passive: {
    scoreBonus?: number;
    growthBonus?: number;
    shieldTicks?: number;
    abilityRecharge?: number;
  };
}

export interface StarforgedModifierDefinition {
  id: string;
  name: string;
  description: string;
  intensity: number;
  effects: {
    scoreMultiplier?: number;
    damagePressure?: number;
    lootLuck?: number;
    abilityRecharge?: number;
    powerDelta?: number;
  };
}

export interface StarforgedContentIndex {
  perks: readonly StarforgedPerk[];
  gear: readonly StarforgedGearDefinition[];
  activities: readonly StarforgedActivityDefinition[];
  factions: readonly StarforgedFactionDefinition[];
  subclasses: readonly StarforgedSubclassDefinition[];
  modifiers: readonly StarforgedModifierDefinition[];
}

export interface StarforgedGearRoll {
  instanceId: string;
  definitionId: string;
  power: number;
  masterwork: keyof StarforgedStatBlock;
  perks: string[];
  acquiredFrom: string;
  acquiredAtTick: number;
}

export interface StarforgedLoadout {
  subclassId: string;
  equipped: Partial<Record<StarforgedSlot, string>>;
}

export interface StarforgedActivityProgress {
  activityId: string;
  objectiveProgress: number;
  encountersCleared: number;
  completions: number;
  streak: number;
}

export interface StarforgedFactionProgress {
  factionId: string;
  reputation: number;
  rank: number;
  engrams: number;
}

export interface StarforgedRuntimeState {
  version: 1;
  active: boolean;
  relicAvailable: boolean;
  relicLoreSeen: boolean;
  questStage: 'dormant' | 'recruiter' | 'artifact-hunt' | 'artifact-ready' | 'active';
  relicRoomId?: string;
  relicPosition?: { x: number; y: number };
  recruiterName?: string;
  artifactRoomId?: string;
  artifactPosition?: { x: number; y: number };
  artifactName?: string;
  tick: number;
  season: number;
  playerPower: number;
  artifactPower: number;
  glimmer: number;
  legendaryShards: number;
  superEnergy: number;
  abilityEnergy: number;
  lootLuck: number;
  activeActivityId: string;
  weeklyModifierIds: string[];
  inventory: StarforgedGearRoll[];
  loadout: StarforgedLoadout;
  activityProgress: Record<string, StarforgedActivityProgress>;
  factionProgress: Record<string, StarforgedFactionProgress>;
  triumphs: Record<string, boolean>;
  recentRewards: string[];
  recentDrops: StarforgedGearRoll[];
}

export interface StarforgedAppliedEffects {
  scoreBonus: number;
  growthBonus: number;
  shieldTicks: number;
  wallSense: number;
  lootLuck: number;
  speedScalar: number;
  appleScorePenalty: number;
  abilityRecharge: number;
}

export interface StarforgedAppleContext {
  appleTypeId?: string;
  score: number;
  length: number;
  roomId: string;
  roomsVisited: number;
  streak: number;
}

export interface StarforgedTickContext {
  score: number;
  length: number;
  roomId: string;
  roomsVisited: number;
  enemiesDefeated?: number;
  powerupsCollected?: number;
}

export interface StarforgedActivityResult {
  completed: boolean;
  activity?: StarforgedActivityDefinition;
  rewards: StarforgedGearRoll[];
  scoreBonus: number;
  growthBonus: number;
  shieldTicks: number;
  message?: string;
}
