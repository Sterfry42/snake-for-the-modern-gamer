/**
 * Fossil Registry
 *
 * The wise old snake's fossil collection:
 * - The wise old snake once assembled a T-Rex skeleton and wore it as a hat
 * - The wise old snake's fossil collection was stored in a museum of one
 * - The wise old snake classified every fossil as "wise"
 * - The wise old snake's favorite fossil was the one that didn't exist yet
 * - The wise old snake's fossil fuel was coffee
 * - The wise old snake once dug up a dinosaur and named it "Wisebeast"
 * - The wise old snake's amber fossil contained a tiny wise fly
 * - The wise old snake's fossil lab was a shoebox
 * - The wise old snake's paleontology degree was from the University of Snake
 * - The wise old snake's fossil record is 999999 years old
 */

import type { Vector2Like } from '../core/math.js';

/** Rarity tiers for fossils and artifacts. */
export type FossilRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Fragment types that can be found at dig sites. */
export type FragmentType =
  | 'bone-fragment'
  | 'tooth'
  | 'shell'
  | 'amber-insect'
  | 'egg-shell'
  | 'ancient-tool'
  | 'mythical-remains'
  | 'scale'
  | 'claw'
  | 'vertebra'
  | 'skull-piece'
  | 'rib'
  | 'tail-spine'
  | 'wing-bone';

/** Fossil set definitions with their required fragments. */
export interface FossilSetDefinition {
  id: string;
  name: string;
  creatureName: string;
  description: string;
  rarity: FossilRarity;
  icon: string;
  fragments: FragmentCombination[];
  setBonuses: FossilSetBonus[];
  lore: string;
}

/** A fragment combination defining how many of each fragment type is needed. */
export interface FragmentCombination {
  fragmentType: FragmentType;
  count: number;
}

/** Passive bonuses granted by completing a fossil set. */
export interface FossilSetBonus {
  type:
    | 'stat-boost'
    | 'speed-boost'
    | 'score-multiplier'
    | 'growth-boost'
    | 'luck-boost'
    | 'hunger-slow'
    | 'special-ability';
  value: number;
  description: string;
}

/** A discovered fossil fragment found at a dig site. */
export interface DiscoveredFossil {
  fossilSetId: string;
  fragmentType: FragmentType;
  condition: 'pristine' | 'good' | 'damaged';
  value: number;
  discoveredAt: number;
}

/** A completed fossil set in the museum. */
export interface CompletedFossil {
  fossilSetId: string;
  fragments: Array<{ fragmentType: FragmentType; condition: 'pristine' | 'good' | 'damaged' }>;
  completedAt: number;
}

/** Museum exhibit configuration. */
export interface MuseumExhibit {
  fossilSetId: string;
  position: Vector2Like;
  unlocked: boolean;
  researchLevel: number;
}

/** Research upgrade definitions. */
export interface ResearchUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredFossils: string[]; // fossil set IDs needed as prerequisites
  requiredResearchLevel: number;
  effects: ResearchEffect[];
}

/** Effects granted by research upgrades. */
export interface ResearchEffect {
  type:
    | 'excavation-speed'
    | 'minimap-reveal'
    | 'npc-archaeologist'
    | 'fragment-detection'
    | 'rarity-boost'
    | 'assembly-automation';
  value: number;
  description: string;
}

/** Legendary artifact definitions with unique abilities. */
export interface LegendaryArtifact {
  id: string;
  name: string;
  description: string;
  icon: string;
  ability: string;
  abilityDescription: string;
  requiredFossilSets: string[]; // fossil sets that must be completed first
  rarity: 'legendary';
}

/** Dig site parameters. */
export interface DigSiteParameters {
  depth: number; // how deep the dig goes
  rarity: FossilRarity; // overall rarity of finds
  size: number; // how many fragments to find
  glowIntensity: number; // visual glow intensity (0-1)
  detectionRadius: number; // radius at which dig site glows on minimap
}

export const FRAGMENT_TYPE_LABELS: Record<FragmentType, string> = {
  'bone-fragment': 'archaeologyFossilBoneFragment',
  tooth: 'archaeologyFossilTooth',
  shell: 'archaeologyFossilShell',
  'amber-insect': 'archaeologyFossilAmberInsect',
  'egg-shell': 'archaeologyFossilEggShell',
  'ancient-tool': 'archaeologyFossilAncientTool',
  'mythical-remains': 'archaeologyFossilMythicalRemains',
  scale: 'archaeologyFossilScale',
  claw: 'archaeologyFossilClaw',
  vertebra: 'archaeologyFossilVertebra',
  'skull-piece': 'archaeologyFossilSkullPiece',
  rib: 'archaeologyFossilRib',
  'tail-spine': 'archaeologyFossilTailSpine',
  'wing-bone': 'archaeologyFossilWingBone',
};

/** Fragment rarity weights for dig site generation. */
export const FRAGMENT_RARITY_WEIGHTS: Record<FragmentType, number> = {
  'bone-fragment': 30,
  tooth: 20,
  shell: 15,
  'amber-insect': 10,
  'egg-shell': 8,
  'ancient-tool': 7,
  scale: 5,
  claw: 4,
  vertebra: 3,
  'skull-piece': 3,
  rib: 2,
  'tail-spine': 2,
  'wing-bone': 1,
  'mythical-remains': 0.5,
};

/**
 * Complete fossil set database with fragment combinations and assembly recipes.
 * Each set represents a creature whose remains can be excavated and assembled.
 */
export const FOSSIL_SETS: readonly FossilSetDefinition[] = [
  // Common sets
  {
    id: 'trilobite',
    name: 'Trilobite Specimen',
    creatureName: 'Ancient Trilobite',
    description: 'A perfectly preserved marine arthropod from the Cambrian period.',
    rarity: 'common',
    icon: '⌢',
    fragments: [
      { fragmentType: 'bone-fragment', count: 3 },
      { fragmentType: 'shell', count: 2 },
    ],
    setBonuses: [
      {
        type: 'stat-boost',
        value: 1,
        description: '+1 defense against water hazards',
      },
    ],
    lore: 'The trilobite ruled the ancient seas for 270 million years. The wise old snake respects longevity.',
  },
  {
    id: 'ammonite',
    name: 'Ammonite Collection',
    creatureName: 'Ancient Ammonite',
    description: 'A spiral-shelled cephalopod, coiled like wisdom itself.',
    rarity: 'common',
    icon: '◎',
    fragments: [
      { fragmentType: 'shell', count: 4 },
      { fragmentType: 'bone-fragment', count: 2 },
    ],
    setBonuses: [
      {
        type: 'score-multiplier',
        value: 0.05,
        description: '+5% score from apples',
      },
    ],
    lore: 'Ammonites spiraled toward the light. The wise old snake spirals toward wisdom.',
  },
  {
    id: 'pterodactyl',
    name: 'Pterodactyl Wing Set',
    creatureName: 'Ancient Pterodactyl',
    description: 'Wing bones of a sky-bound reptile, light as air.',
    rarity: 'common',
    icon: '⟁',
    fragments: [
      { fragmentType: 'wing-bone', count: 3 },
      { fragmentType: 'bone-fragment', count: 2 },
      { fragmentType: 'claw', count: 1 },
    ],
    setBonuses: [
      {
        type: 'speed-boost',
        value: 0.08,
        description: '+8% movement speed',
      },
    ],
    lore: 'The wise old snake once tried to fly. It did not go well. The pterodactyl, however, excelled.',
  },
  // Uncommon sets
  {
    id: 'ichthyosaur',
    name: 'Ichthyosaur Skeleton',
    creatureName: 'Ancient Ichthyosaur',
    description: 'A complete marine reptile skeleton, streamlined for speed.',
    rarity: 'uncommon',
    icon: '≋',
    fragments: [
      { fragmentType: 'vertebra', count: 4 },
      { fragmentType: 'skull-piece', count: 2 },
      { fragmentType: 'rib', count: 3 },
    ],
    setBonuses: [
      {
        type: 'speed-boost',
        value: 0.12,
        description: '+12% swimming speed',
      },
      {
        type: 'stat-boost',
        value: 2,
        description: '+2 cold resistance',
      },
    ],
    lore: 'Ichthyosaurs swam faster than most fish. The wise old snake wishes it could swim that fast.',
  },
  {
    id: 'amber-preservation',
    name: 'Amber Time Capsule',
    creatureName: 'Cretaceous Ecosystem',
    description: 'Amber preserving an entire miniature ecosystem.',
    rarity: 'uncommon',
    icon: '◈',
    fragments: [
      { fragmentType: 'amber-insect', count: 3 },
      { fragmentType: 'shell', count: 1 },
      { fragmentType: 'bone-fragment', count: 1 },
    ],
    setBonuses: [
      {
        type: 'luck-boost',
        value: 0.15,
        description: '+15% rare find chance',
      },
    ],
    lore: 'Time frozen in resin. The wise old snake considers this the ultimate preservation method.',
  },
  {
    id: 'raptor',
    name: 'Raptor Hunting Pack',
    creatureName: 'Velociraptor Pack',
    description: 'Teeth and claws suggesting a coordinated hunting pack.',
    rarity: 'uncommon',
    icon: '⚔',
    fragments: [
      { fragmentType: 'tooth', count: 4 },
      { fragmentType: 'claw', count: 3 },
      { fragmentType: 'vertebra', count: 2 },
    ],
    setBonuses: [
      {
        type: 'stat-boost',
        value: 2,
        description: '+2 attack damage',
      },
      {
        type: 'speed-boost',
        value: 0.06,
        description: '+6% evasion',
      },
    ],
    lore: 'Raptors hunted in packs. The wise old snake hunts in... well, one body, but with great purpose.',
  },
  // Rare sets
  {
    id: 'stegosaurus',
    name: 'Stegosaurus Plates',
    creatureName: 'Ancient Stegosaurus',
    description: 'Iconic back plates and tail spikes, unmistakably stegosaurian.',
    rarity: 'rare',
    icon: '⬡',
    fragments: [
      { fragmentType: 'rib', count: 4 },
      { fragmentType: 'tail-spine', count: 3 },
      { fragmentType: 'bone-fragment', count: 3 },
    ],
    setBonuses: [
      {
        type: 'stat-boost',
        value: 3,
        description: '+3 defense',
      },
      {
        type: 'hunger-slow',
        value: 0.1,
        description: 'Hunger drains 10% slower',
      },
    ],
    lore: 'The wise old snake admires the stegosaur\'s plates. "Fashionable," it hisses approvingly.',
  },
  {
    id: 'ancient-tool-set',
    name: 'Paleolithic Tool Kit',
    creatureName: 'Ancient Civilization',
    description: 'Stone tools suggesting early intelligent life.',
    rarity: 'rare',
    icon: '⚒',
    fragments: [
      { fragmentType: 'ancient-tool', count: 4 },
      { fragmentType: 'bone-fragment', count: 2 },
      { fragmentType: 'shell', count: 2 },
    ],
    setBonuses: [
      {
        type: 'score-multiplier',
        value: 0.1,
        description: '+10% all score',
      },
      {
        type: 'stat-boost',
        value: 1,
        description: '+1 to all SPECIAL stats',
      },
    ],
    lore: 'Tools of a forgotten people. The wise old snake respects craftsmanship above all else.',
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus Vertebrae',
    creatureName: 'Ancient Brachiosaurus',
    description: 'Colossal vertebrae from the tallest land creature ever.',
    rarity: 'rare',
    icon: '⫼',
    fragments: [
      { fragmentType: 'vertebra', count: 5 },
      { fragmentType: 'rib', count: 3 },
      { fragmentType: 'skull-piece', count: 2 },
    ],
    setBonuses: [
      {
        type: 'growth-boost',
        value: 0.15,
        description: '+15% growth from apples',
      },
    ],
    lore: 'The wise old snake dreams of being this tall. Currently, it is tall for a snake.',
  },
  // Legendary sets
  {
    id: 'tyrannosaurus',
    name: 'T-Rex Complete Skeleton',
    creatureName: 'Tyrannosaurus Rex',
    description: 'The king of dinosaurs, fully assembled and ready to roar.',
    rarity: 'legendary',
    icon: '🦖',
    fragments: [
      { fragmentType: 'skull-piece', count: 3 },
      { fragmentType: 'vertebra', count: 5 },
      { fragmentType: 'tooth', count: 4 },
      { fragmentType: 'rib', count: 4 },
      { fragmentType: 'claw', count: 3 },
    ],
    setBonuses: [
      {
        type: 'stat-boost',
        value: 5,
        description: '+5 attack damage',
      },
      {
        type: 'score-multiplier',
        value: 0.2,
        description: '+20% all score',
      },
      {
        type: 'special-ability',
        value: 0,
        description: 'Unlocks "Roar" ability: stun enemies for 2 seconds',
      },
    ],
    lore: 'The wise old snake wore this skeleton as a hat for a week. It was very wise of the hat.',
  },
  {
    id: 'phoenix-remains',
    name: 'Phoenix Ash Collection',
    creatureName: 'Mythical Phoenix',
    description: 'Glowing remains that still radiate warmth. Clearly mythical.',
    rarity: 'legendary',
    icon: '🔥',
    fragments: [
      { fragmentType: 'mythical-remains', count: 3 },
      { fragmentType: 'scale', count: 4 },
      { fragmentType: 'wing-bone', count: 3 },
      { fragmentType: 'egg-shell', count: 1 },
    ],
    setBonuses: [
      {
        type: 'special-ability',
        value: 0,
        description: 'Unlocks "Rebirth" ability: revive once per run with 50% health',
      },
      {
        type: 'hunger-slow',
        value: 0.2,
        description: 'Hunger drains 20% slower',
      },
    ],
    lore: 'The wise old snake has considered being reborn. The paperwork is daunting.',
  },
  {
    id: 'world-serpent',
    name: 'World Serpent Scale',
    creatureName: 'Cosmic World Serpent',
    description: 'A single scale from the serpent that encircles the world.',
    rarity: 'legendary',
    icon: '🐉',
    fragments: [
      { fragmentType: 'mythical-remains', count: 2 },
      { fragmentType: 'scale', count: 5 },
      { fragmentType: 'amber-insect', count: 2 },
      { fragmentType: 'ancient-tool', count: 2 },
    ],
    setBonuses: [
      {
        type: 'special-ability',
        value: 0,
        description: 'Unlocks "World Coil" ability: phase through all obstacles for 5 seconds',
      },
      {
        type: 'score-multiplier',
        value: 0.3,
        description: '+30% all score',
      },
      {
        type: 'luck-boost',
        value: 0.25,
        description: '+25% rare find chance',
      },
    ],
    lore: 'The wise old snake found this scale and immediately felt wise. It was already wise. Now it is twice as wise.',
  },
];

/** All completed fossil set IDs for quick lookup. */
export const COMPLETED_FOSSIL_SET_IDS = new Set(FOSSIL_SETS.map((s) => s.id));

/**
 * Get fragment types needed for a fossil set.
 */
export function getFossilSetFragments(
  fossilSetId: string,
): FragmentCombination[] | undefined {
  return FOSSIL_SETS.find((set) => set.id === fossilSetId)?.fragments;
}

/**
 * Get a fossil set by ID.
 */
export function getFossilSet(fossilSetId: string): FossilSetDefinition | undefined {
  return FOSSIL_SETS.find((set) => set.id === fossilSetId);
}

/**
 * Get all fossil sets filtered by rarity.
 */
export function getFossilSetsByRarity(rarity: FossilRarity): FossilSetDefinition[] {
  return FOSSIL_SETS.filter((set) => set.rarity === rarity);
}

/**
 * Get legendary artifacts.
 */
export const LEGENDARY_ARTIFACTS: readonly LegendaryArtifact[] = [
  {
    id: 'dragon-tooth',
    name: 'Dragon Tooth',
    description: 'A tooth from an ancient dragon, still sharp after millennia.',
    icon: '🐲',
    ability: 'Fire Breath',
    abilityDescription: 'Burn enemies in a line for 3 seconds',
    requiredFossilSets: ['tyrannosaurus'],
    rarity: 'legendary',
  },
  {
    id: 'phoenix-egg',
    name: 'Phoenix Egg',
    description: 'An egg that glows with inner fire. Warm to the touch.',
    icon: '🥚',
    ability: 'Immolation',
    abilityDescription: 'Transform into a phoenix for 10 seconds, invulnerable',
    requiredFossilSets: ['phoenix-remains'],
    rarity: 'legendary',
  },
  {
    id: 'world-serpent-scale',
    name: 'World Serpent Scale',
    description: 'A scale from the cosmic serpent. It shimmers with infinite depth.',
    icon: '✨',
    ability: 'Cosmic Coil',
    abilityDescription: 'Teleport to any dig site on the current map',
    requiredFossilSets: ['world-serpent'],
    rarity: 'legendary',
  },
  {
    id: 'amber-crown',
    name: 'Amber Crown',
    description: 'A crown preserved in perfect amber. It fits a wise head.',
    icon: '👑',
    ability: 'Royal Wisdom',
    abilityDescription: 'All NPCs offer discounts and free items for 60 seconds',
    requiredFossilSets: ['amber-preservation', 'ancient-tool-set'],
    rarity: 'legendary',
  },
];

/**
 * Research upgrade tree.
 */
export const RESEARCH_UPGRADES: readonly ResearchUpgrade[] = [
  {
    id: 'excavation-speed-1',
    name: 'Brush & Trowel',
    description: 'Basic excavation tools improve digging speed.',
    icon: '🖌',
    requiredFossils: ['trilobite'],
    requiredResearchLevel: 1,
    effects: [
      {
        type: 'excavation-speed',
        value: 0.15,
        description: '+15% excavation speed',
      },
    ],
  },
  {
    id: 'minimap-reveal-1',
    name: 'Geological Survey',
    description: 'Improved mapping reveals dig site locations on the minimap.',
    icon: '🗺',
    requiredFossils: ['ammonite', 'trilobite'],
    requiredResearchLevel: 2,
    effects: [
      {
        type: 'minimap-reveal',
        value: 3,
        description: 'Reveal dig sites within 3 tiles on minimap',
      },
    ],
  },
  {
    id: 'npc-archaeologist',
    name: 'Field Research Fellowship',
    description: 'Attract an NPC archaeologist to assist with digs.',
    icon: '👩‍🔬',
    requiredFossils: ['ichthyosaur', 'ammonite'],
    requiredResearchLevel: 3,
    effects: [
      {
        type: 'npc-archaeologist',
        value: 1,
        description: 'NPC archaeologist provides +1 fragment per dig',
      },
    ],
  },
  {
    id: 'fragment-detection-1',
    name: 'Resonance Scanner',
    description: 'Detect fragment types at greater distances.',
    icon: '📡',
    requiredFossils: ['pterodactyl'],
    requiredResearchLevel: 3,
    effects: [
      {
        type: 'fragment-detection',
        value: 2,
        description: 'Show fragment type when within 2 tiles of dig site',
      },
    ],
  },
  {
    id: 'rarity-boost-1',
    name: 'Deep Earth Analysis',
    description: 'Analyze deep earth composition to find rarer fragments.',
    icon: '🔬',
    requiredFossils: ['raptor', 'stegosaurus'],
    requiredResearchLevel: 4,
    effects: [
      {
        type: 'rarity-boost',
        value: 0.1,
        description: '+10% chance for uncommon+ fragments',
      },
    ],
  },
  {
    id: 'excavation-speed-2',
    name: 'Power Tools',
    description: 'Industrial-grade excavation equipment.',
    icon: '⚙',
    requiredFossils: ['brachiosaurus'],
    requiredResearchLevel: 5,
    effects: [
      {
        type: 'excavation-speed',
        value: 0.25,
        description: '+25% excavation speed',
      },
    ],
  },
  {
    id: 'assembly-automation',
    name: 'Fossil Assembly Table',
    description: 'Automated assembly reduces fragment damage risk.',
    icon: '🔧',
    requiredFossils: ['ancient-tool-set', 'ichthyosaur'],
    requiredResearchLevel: 5,
    effects: [
      {
        type: 'assembly-automation',
        value: 1,
        description: 'Assembly mini-game has relaxed timing window',
      },
    ],
  },
];

/**
 * Dig site depth tiers and their parameters.
 */
export const DIG_SITE_TIERS: Array<{
  depthRange: [number, number];
  rarity: FossilRarity;
  sizeRange: [number, number];
  glowIntensity: [number, number];
}> = [
  { depthRange: [1, 5], rarity: 'common', sizeRange: [2, 4], glowIntensity: [0.3, 0.5] },
  { depthRange: [6, 15], rarity: 'uncommon', sizeRange: [3, 6], glowIntensity: [0.5, 0.7] },
  { depthRange: [16, 30], rarity: 'rare', sizeRange: [4, 8], glowIntensity: [0.7, 0.9] },
  { depthRange: [31, 999], rarity: 'legendary', sizeRange: [5, 10], glowIntensity: [0.9, 1.0] },
];

/**
 * Get dig site parameters based on depth.
 */
export function getDigSiteParams(depth: number): DigSiteParameters {
  const tier = DIG_SITE_TIERS.find(
    (t) => depth >= t.depthRange[0] && depth <= t.depthRange[1],
  ) ?? DIG_SITE_TIERS[DIG_SITE_TIERS.length - 1]!;

  return {
    depth,
    rarity: tier.rarity,
    size: Math.floor(Math.random() * (tier.sizeRange[1] - tier.sizeRange[0] + 1)) + tier.sizeRange[0],
    glowIntensity: tier.glowIntensity[0] + Math.random() * (tier.glowIntensity[1] - tier.glowIntensity[0]),
    detectionRadius: tier.rarity === 'legendary' ? 5 : tier.rarity === 'rare' ? 4 : tier.rarity === 'uncommon' ? 3 : 2,
  };
}

/**
 * Roll a random fragment type based on rarity weights.
 */
export function rollFragmentType(rng: () => number, rarity: FossilRarity): FragmentType {
  const weights: Record<FragmentType, number> = { ...FRAGMENT_RARITY_WEIGHTS };

  // Boost rare/legendary fragment types for higher rarity digs
  if (rarity === 'rare' || rarity === 'legendary') {
    weights['vertebra'] *= 2;
    weights['skull-piece'] *= 2;
    weights['rib'] *= 2;
    weights['tail-spine'] *= 2;
    weights['wing-bone'] *= 2;
    if (rarity === 'legendary') {
      weights['mythical-remains'] *= 3;
      weights['scale'] *= 2;
    }
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = rng() * totalWeight;

  for (const [fragmentType, weight] of Object.entries(weights) as [FragmentType, number][]) {
    roll -= weight;
    if (roll <= 0) return fragmentType;
  }

  return 'bone-fragment';
}

/**
 * Determine fragment condition based on excavation quality (0-1, higher is better).
 */
export function determineFragmentCondition(quality: number): 'pristine' | 'good' | 'damaged' {
  if (quality >= 0.8) return 'pristine';
  if (quality >= 0.5) return 'good';
  return 'damaged';
}

/**
 * Calculate fragment value based on condition and fossil set rarity.
 */
export function calculateFragmentValue(
  condition: 'pristine' | 'good' | 'damaged',
  fossilRarity: FossilRarity,
): number {
  const conditionMultiplier = condition === 'pristine' ? 1.5 : condition === 'good' ? 1.0 : 0.5;
  const rarityMultiplier =
    fossilRarity === 'legendary' ? 4 : fossilRarity === 'rare' ? 2 : fossilRarity === 'uncommon' ? 1.5 : 1;
  return Math.floor(10 * conditionMultiplier * rarityMultiplier);
}
