import type { CaveTemplate, CaveTemplateId } from './caveTypes.js';

export const CAVE_TEMPLATE_TABLE: Array<{ id: CaveTemplateId; weight: number }> = [
  { id: 'goldenAppleRush', weight: 3 },
  { id: 'skittishAppleRush', weight: 3 },
  { id: 'caffeinatedAppleRush', weight: 2 },
  { id: 'simpleTreasure', weight: 3 },
  { id: 'pitchBlackTreasure', weight: 2 },
  { id: 'monsterDen', weight: 2 },
  { id: 'randomStructureRoom', weight: 2 },
  { id: 'targetingGallery', weight: 2 },
  { id: 'echoMaze', weight: 2 },
  { id: 'floodedTreasury', weight: 2 },
  { id: 'shrineOfBadProbability', weight: 1 },
  { id: 'fossilDigSite', weight: 2 },
  { id: 'caveDweller', weight: 1 },
  { id: 'lakeTreasure', weight: 1 },
];

export const CAVE_STRUCTURE_TABLE = [
  { structureId: 'snakeMcDonalds', weight: 1 },
  { structureId: 'goblinCamp', weight: 2 },
  { structureId: 'shrine', weight: 2 },
  { structureId: 'questHouse', weight: 1 },
  { structureId: 'villageShop', weight: 1 },
] as const;

export const CAVE_TEMPLATES: Record<CaveTemplateId, CaveTemplate> = {
  goldenAppleRush: {
    id: 'goldenAppleRush',
    label: 'Golden Apple Rush',
    category: 'appleRush',
    layoutId: 'appleRush',
    boundaryMode: 'solidWalls',
    exitMode: 'timerForced',
    timerSeconds: 30,
    collapseOnExit: true,
    collapseOnTimerEnd: true,
    forcedEjectionOnTimerEnd: true,
    applePool: { typeId: 'gold', count: 15 },
  },
  skittishAppleRush: {
    id: 'skittishAppleRush',
    label: 'Skittish Apple Rush',
    category: 'appleRush',
    layoutId: 'appleRush',
    boundaryMode: 'solidWalls',
    exitMode: 'timerForced',
    timerSeconds: 35,
    collapseOnExit: true,
    collapseOnTimerEnd: true,
    forcedEjectionOnTimerEnd: true,
    applePool: { typeId: 'skittish', count: 10, minCount: 10, maxCount: 20 },
  },
  caffeinatedAppleRush: {
    id: 'caffeinatedAppleRush',
    label: 'Caffeinated Apple Rush',
    category: 'appleRush',
    layoutId: 'appleRush',
    boundaryMode: 'solidWalls',
    exitMode: 'timerForced',
    timerSeconds: 15,
    collapseOnExit: true,
    collapseOnTimerEnd: true,
    forcedEjectionOnTimerEnd: true,
    applePool: { typeId: 'caffeinated', count: 20 },
  },
  simpleTreasure: {
    id: 'simpleTreasure',
    label: 'Simple Treasure Cave',
    category: 'treasure',
    layoutId: 'simpleTreasure',
    boundaryMode: 'solidWalls',
    exitMode: 'rewardClaimed',
    rewardTableId: 'caveBasicTreasure',
  },
  pitchBlackTreasure: {
    id: 'pitchBlackTreasure',
    label: 'Pitch-Black Treasure Cave',
    category: 'treasure',
    layoutId: 'pitchBlackTreasure',
    boundaryMode: 'solidWalls',
    exitMode: 'rewardClaimed',
    rewardTableId: 'caveBasicTreasure',
  },
  lakeTreasure: {
    id: 'lakeTreasure',
    label: 'Lake Treasure Cave',
    category: 'treasure',
    layoutId: 'lakeTreasure',
    boundaryMode: 'solidWalls',
    exitMode: 'manual',
    rewardTableId: 'caveLakeTreasure',
  },
  caveDweller: {
    id: 'caveDweller',
    label: 'Cave Dweller',
    category: 'npc',
    layoutId: 'caveDweller',
    boundaryMode: 'solidWalls',
    exitMode: 'rewardClaimed',
    rewardTableId: 'caveDwellerGift',
  },
  monsterDen: {
    id: 'monsterDen',
    label: 'Monster Den',
    category: 'combat',
    layoutId: 'monsterDen',
    boundaryMode: 'solidWalls',
    exitMode: 'combatClear',
    enemyTableId: 'caveMonsterDen',
    rewardTableId: 'caveMonsterTreasure',
  },
  randomStructureRoom: {
    id: 'randomStructureRoom',
    label: 'Random Structure Room',
    category: 'structure',
    layoutId: 'structureRoom',
    boundaryMode: 'solidWalls',
    exitMode: 'manual',
    structureTableId: 'caveStructureTable',
  },
  targetingGallery: {
    id: 'targetingGallery',
    label: 'Targeting Gallery',
    category: 'combat',
    layoutId: 'targetingGallery',
    boundaryMode: 'solidWalls',
    exitMode: 'rewardClaimed',
    rewardTableId: 'caveTargetingGallery',
  },
  echoMaze: {
    id: 'echoMaze',
    label: 'Echo Maze',
    category: 'treasure',
    layoutId: 'echoMaze',
    boundaryMode: 'solidWalls',
    exitMode: 'rewardClaimed',
    rewardTableId: 'caveEchoMaze',
  },
  floodedTreasury: {
    id: 'floodedTreasury',
    label: 'Flooded Treasury',
    category: 'treasure',
    layoutId: 'floodedTreasury',
    boundaryMode: 'solidWalls',
    exitMode: 'manual',
    rewardTableId: 'caveFloodedTreasury',
  },
  shrineOfBadProbability: {
    id: 'shrineOfBadProbability',
    label: 'Shrine of Bad Probability',
    category: 'structure',
    layoutId: 'shrineOfBadProbability',
    boundaryMode: 'solidWalls',
    exitMode: 'rewardClaimed',
    rewardTableId: 'caveBadProbability',
    structureTableId: 'shrine',
  },
  fossilDigSite: {
    id: 'fossilDigSite',
    label: 'Fossil Dig Site',
    category: 'treasure',
    layoutId: 'fossilDigSite',
    boundaryMode: 'solidWalls',
    exitMode: 'rewardClaimed',
    rewardTableId: 'caveFossilDigSite',
  },
};

export function getCaveTemplate(id: CaveTemplateId): CaveTemplate {
  return CAVE_TEMPLATES[id];
}

export function pickWeightedCaveTemplate(roll: number): CaveTemplateId {
  const total = CAVE_TEMPLATE_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const entry of CAVE_TEMPLATE_TABLE) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.id;
    }
  }
  return CAVE_TEMPLATE_TABLE[CAVE_TEMPLATE_TABLE.length - 1]!.id;
}
