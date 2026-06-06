export type ArtifactRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ArtifactDefinition {
  id: string;
  icon: string;
  name: string;
  description: string;
  rarity: ArtifactRarity;
  modifiers: {
    hungerDrainScalar?: number;
    scoreMultiplier?: number;
    rewardLuck?: number;
    equipmentRewardChance?: number;
    excavationAppleBonus?: number;
    goldAppleFrequency?: number;
    coordinatesAlwaysVisible?: boolean;
    ladderRoomChance?: number;
    shrineOfferingEffectiveness?: number;
    pointOfInterestRevealBonus?: number;
  };
}

export const ARTIFACT_DEFINITIONS: readonly ArtifactDefinition[] = [
  {
    id: 'moleman-lunchbox',
    icon: '[]',
    name: 'Moleman Lunchbox',
    description: 'Hunger drains 10% slower.',
    rarity: 'common',
    modifiers: { hungerDrainScalar: 0.9 },
  },
  {
    id: 'surveyor-compass',
    icon: 'N',
    name: 'Surveyor Compass',
    description: 'Coordinates remain visible while this run lasts.',
    rarity: 'common',
    modifiers: { coordinatesAlwaysVisible: true },
  },
  {
    id: 'lucky-trowel',
    icon: '/',
    name: 'Lucky Trowel',
    description: 'Golden Apples are slightly more common in excavation rewards.',
    rarity: 'uncommon',
    modifiers: { goldAppleFrequency: 0.12 },
  },
  {
    id: 'ancient-snake-scale',
    icon: 'S',
    name: 'Ancient Snake Scale',
    description: 'Small passive score multiplier.',
    rarity: 'rare',
    modifiers: { scoreMultiplier: 1.08 },
  },
  {
    id: 'burrowing-boots',
    icon: 'B',
    name: 'Burrowing Boots',
    description: 'Ladder rooms appear slightly more often.',
    rarity: 'uncommon',
    modifiers: { ladderRoomChance: 0.05 },
  },
  {
    id: 'cracked-shrine-fragment',
    icon: '+',
    name: 'Cracked Shrine Fragment',
    description: 'Religious offerings gain increased effectiveness.',
    rarity: 'rare',
    modifiers: { shrineOfferingEffectiveness: 0.12 },
  },
  {
    id: 'rusted-prospectors-charm',
    icon: '$',
    name: "Rusted Prospector's Charm",
    description: 'Equipment reward chance is slightly increased.',
    rarity: 'uncommon',
    modifiers: { equipmentRewardChance: 0.1 },
  },
  {
    id: 'cartographers-pencil',
    icon: 'P',
    name: "Cartographer's Pencil",
    description: 'Points of interest are revealed from farther away.',
    rarity: 'common',
    modifiers: { pointOfInterestRevealBonus: 1 },
  },
  {
    id: 'preserved-orchard-seed',
    icon: '*',
    name: 'Preserved Orchard Seed',
    description: 'Apple rewards from excavations are increased by 1.',
    rarity: 'rare',
    modifiers: { excavationAppleBonus: 1 },
  },
  {
    id: 'pocket-fossil',
    icon: 'o',
    name: 'Pocket Fossil',
    description: 'A tiny passive score multiplier.',
    rarity: 'common',
    modifiers: { scoreMultiplier: 1.05 },
  },
  {
    id: 'molemans-lucky-pebble',
    icon: '.',
    name: "Moleman's Lucky Pebble",
    description: 'Very slightly improves all reward rolls.',
    rarity: 'legendary',
    modifiers: { rewardLuck: 0.08 },
  },
];

const ARTIFACT_MAP = new Map(ARTIFACT_DEFINITIONS.map((artifact) => [artifact.id, artifact]));

export function getArtifactDefinition(id: string): ArtifactDefinition | undefined {
  return ARTIFACT_MAP.get(id);
}

export function getArtifactsByRarity(rarity: ArtifactRarity): readonly ArtifactDefinition[] {
  return ARTIFACT_DEFINITIONS.filter((artifact) => artifact.rarity === rarity);
}

export interface ArtifactView {
  id: string;
  icon: string;
  name: string;
  description: string;
  rarity: ArtifactRarity;
}

export function toArtifactView(artifact: ArtifactDefinition): ArtifactView {
  return {
    id: artifact.id,
    icon: artifact.icon,
    name: artifact.name,
    description: artifact.description,
    rarity: artifact.rarity,
  };
}
