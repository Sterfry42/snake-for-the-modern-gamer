/**
 * Archipelago Island Expeditions — Island Registry
 *
 * The wise old snake's island registry:
 * - The wise old snake's first island was 'the-island-that-was-already-there'
 * - The wise old snake's last island was 'the-island-that-is-still-being-found'
 * - The wise old snake's island count was infinite (the wise old snake counted past infinity)
 * - The wise old snake's island maps were all blank (the wise old snake remembered every island)
 * - The wise old snake's island boss was a mirror (the wise old snake defeated the wise old snake)
 */
import type {
  IslandAppleDefinition,
  IslandAppleTypeId,
  IslandBiome,
  IslandDefinition,
  IslandId,
  LegacyEffectId,
} from './types.js';

// ─── Island Definitions ──────────────────────────────────────────────────────

export const ISLAND_DEFINITIONS: ReadonlyArray<IslandDefinition> = [
  {
    id: 'volcanic-isle',
    name: 'Volcanic Isle',
    biome: 'lava',
    description:
      'A burning island where lava flows carve new paths. Fire apples pulse with heat, and magma creatures guard ancient secrets.',
    unlockScore: 0,
    requiredApples: ['caffeinated'],
    preferredApples: ['wasabi', 'heatwave'],
    avoidedApples: ['frost', 'winterberry'],
    bossId: 'lava-warden',
    rewardId: 'fire-resistant-mutation',
    legacyEffect: 'volcanic-horizon',
    color: 0xff4500,
    wallColor: 0x3d0c02,
    backgroundColor: 0x1a0500,
    stages: [
      {
        id: 'approach-volcanic',
        name: 'Approach the Shore',
        order: 0,
        objective: 'Navigate the lava bridges to reach the island',
        conditions: [{ kind: 'supplies-packed', target: 'volcanic-isle', value: 1 }],
        rewards: [{ kind: 'score', amount: 50 }],
      },
      {
        id: 'explore-volcanic',
        name: 'Explore the Caldera',
        order: 1,
        objective: 'Find the magma core and collect heat signatures',
        conditions: [
          { kind: 'score-reached', target: 'volcanic-isle', value: 100 },
          { kind: 'island-completed', target: 'approach-volcanic', value: 1 },
        ],
        rewards: [{ kind: 'apple', appleTypeId: 'magma-apple' }],
      },
      {
        id: 'discover-volcanic',
        name: 'Discover the Ember Vault',
        order: 2,
        objective: 'Uncover the ancient fire temple',
        conditions: [
          { kind: 'score-reached', target: 'volcanic-isle', value: 300 },
          { kind: 'island-completed', target: 'explore-volcanic', value: 1 },
        ],
        rewards: [{ kind: 'ability', abilityId: 'fire-resistant-mutation' }],
      },
      {
        id: 'escape-volcanic',
        name: 'Escape the Eruption',
        order: 3,
        objective: 'Defeat the Lava Warden and escape before eruption',
        conditions: [
          { kind: 'boss-defeated', target: 'lava-warden', value: 1 },
          { kind: 'island-completed', target: 'discover-volcanic', value: 1 },
        ],
        rewards: [{ kind: 'score', amount: 500 }, { kind: 'ability', abilityId: 'fire-resistant-mutation' }],
      },
    ],
  },
  {
    id: 'crystal-cavern',
    name: 'Crystal Cavern',
    biome: 'crystal',
    description:
      'A vast underground cavern filled with refracting crystals. Light puzzles guard the path, and crystal apples split into multiple when consumed.',
    unlockScore: 200,
    requiredApples: ['shielded'],
    preferredApples: ['yuzu', 'amacha'],
    avoidedApples: ['spicy-energy', 'caffeinated'],
    bossId: 'crystal-golem',
    rewardId: 'light-prism-ability',
    legacyEffect: 'crystal-deposits',
    color: 0x9370db,
    wallColor: 0x2d1b4e,
    backgroundColor: 0x0f0820,
    stages: [
      {
        id: 'approach-crystal',
        name: 'Enter the Cavern',
        order: 0,
        objective: 'Navigate the crystal entrance corridor',
        conditions: [{ kind: 'supplies-packed', target: 'crystal-cavern', value: 1 }],
        rewards: [{ kind: 'score', amount: 50 }],
      },
      {
        id: 'explore-crystal',
        name: 'Solve the Light Puzzles',
        order: 1,
        objective: 'Redirect light beams to unlock deeper chambers',
        conditions: [
          { kind: 'score-reached', target: 'crystal-cavern', value: 150 },
          { kind: 'island-completed', target: 'approach-crystal', value: 1 },
        ],
        rewards: [{ kind: 'apple', appleTypeId: 'crystal-apple' }],
      },
      {
        id: 'discover-crystal',
        name: 'Discover the Prism Core',
        order: 2,
        objective: 'Find the source of the cavern\'s refracting light',
        conditions: [
          { kind: 'score-reached', target: 'crystal-cavern', value: 350 },
          { kind: 'island-completed', target: 'explore-crystal', value: 1 },
        ],
        rewards: [{ kind: 'ability', abilityId: 'light-prism-ability' }],
      },
      {
        id: 'escape-crystal',
        name: 'Escape the Collapse',
        order: 3,
        objective: 'Defeat the Crystal Golem and escape before the cavern collapses',
        conditions: [
          { kind: 'boss-defeated', target: 'crystal-golem', value: 1 },
          { kind: 'island-completed', target: 'discover-crystal', value: 1 },
        ],
        rewards: [{ kind: 'score', amount: 500 }, { kind: 'ability', abilityId: 'light-prism-ability' }],
      },
    ],
  },
  {
    id: 'sunken-temple',
    name: 'Sunken Temple',
    biome: 'underwater',
    description:
      'An ancient temple submerged beneath the ocean. Pressure puzzles control water levels, and koi apples grant brief underwater breathing.',
    unlockScore: 500,
    requiredApples: ['koi'],
    preferredApples: ['amacha', 'cold-beer'],
    avoidedApples: ['caffeinated', 'spicy-energy'],
    bossId: 'temple-serpent',
    rewardId: 'underwater-breathing',
    legacyEffect: 'koi-fish-pool',
    color: 0x0077be,
    wallColor: 0x002244,
    backgroundColor: 0x000a14,
    stages: [
      {
        id: 'approach-sunken',
        name: 'Descend to the Depths',
        order: 0,
        objective: 'Navigate the underwater entrance tunnel',
        conditions: [{ kind: 'supplies-packed', target: 'sunken-temple', value: 1 }],
        rewards: [{ kind: 'score', amount: 50 }],
      },
      {
        id: 'explore-sunken',
        name: 'Explore the Temple Ruins',
        order: 1,
        objective: 'Solve pressure puzzles to access the inner sanctum',
        conditions: [
          { kind: 'score-reached', target: 'sunken-temple', value: 200 },
          { kind: 'island-completed', target: 'approach-sunken', value: 1 },
        ],
        rewards: [{ kind: 'apple', appleTypeId: 'breath-apple' }],
      },
      {
        id: 'discover-sunken',
        name: 'Discover the Deep Altar',
        order: 2,
        objective: 'Uncover the temple\'s ancient underwater altar',
        conditions: [
          { kind: 'score-reached', target: 'sunken-temple', value: 400 },
          { kind: 'island-completed', target: 'explore-sunken', value: 1 },
        ],
        rewards: [{ kind: 'ability', abilityId: 'underwater-breathing' }],
      },
      {
        id: 'escape-sunken',
        name: 'Escape the Flood',
        order: 3,
        objective: 'Defeat the Temple Serpent and escape before the temple floods completely',
        conditions: [
          { kind: 'boss-defeated', target: 'temple-serpent', value: 1 },
          { kind: 'island-completed', target: 'discover-sunken', value: 1 },
        ],
        rewards: [{ kind: 'score', amount: 500 }, { kind: 'ability', abilityId: 'underwater-breathing' }],
      },
    ],
  },
  {
    id: 'sky-garden',
    name: 'Sky Garden',
    biome: 'sky',
    description:
      'Floating islands suspended in the sky. Wind currents carry you between platforms, and lavender apples grant brief flight.',
    unlockScore: 800,
    requiredApples: ['lavender'],
    preferredApples: ['yuzu', 'love'],
    avoidedApples: ['lead-flippers', 'heavy'],
    bossId: 'sky-phoenix',
    rewardId: 'glider-ability',
    legacyEffect: 'floating-garden',
    color: 0x87ceeb,
    wallColor: 0x2e4a6e,
    backgroundColor: 0x0d1b2a,
    stages: [
      {
        id: 'approach-sky',
        name: 'Rise to the Clouds',
        order: 0,
        objective: 'Catch the updraft to reach the floating islands',
        conditions: [{ kind: 'supplies-packed', target: 'sky-garden', value: 1 }],
        rewards: [{ kind: 'score', amount: 50 }],
      },
      {
        id: 'explore-sky',
        name: 'Navigate the Wind Currents',
        order: 1,
        objective: 'Use wind currents to reach the central garden',
        conditions: [
          { kind: 'score-reached', target: 'sky-garden', value: 250 },
          { kind: 'island-completed', target: 'approach-sky', value: 1 },
        ],
        rewards: [{ kind: 'apple', appleTypeId: 'glider-apple' }],
      },
      {
        id: 'discover-sky',
        name: 'Discover the Cloud Sanctuary',
        order: 2,
        objective: 'Find the ancient sky garden\'s heart',
        conditions: [
          { kind: 'score-reached', target: 'sky-garden', value: 450 },
          { kind: 'island-completed', target: 'explore-sky', value: 1 },
        ],
        rewards: [{ kind: 'ability', abilityId: 'glider-ability' }],
      },
      {
        id: 'escape-sky',
        name: 'Escape the Storm',
        order: 3,
        objective: 'Defeat the Sky Phoenix and escape before the storm hits',
        conditions: [
          { kind: 'boss-defeated', target: 'sky-phoenix', value: 1 },
          { kind: 'island-completed', target: 'discover-sky', value: 1 },
        ],
        rewards: [{ kind: 'score', amount: 500 }, { kind: 'ability', abilityId: 'glider-ability' }],
      },
    ],
  },
  {
    id: 'ancient-ruins',
    name: 'Ancient Ruins',
    biome: 'ruins',
    description:
      'The crumbling remains of a forgotten civilization. Traps and ancient guardians protect golden apples that unlock hidden secrets.',
    unlockScore: 1200,
    requiredApples: ['gold'],
    preferredApples: ['mochi', 'love'],
    avoidedApples: ['wasabi', 'caffeinated'],
    bossId: 'ancient-guardian',
    rewardId: 'artifact-collection',
    legacyEffect: 'ancient-monument',
    color: 0xdaa520,
    wallColor: 0x4a3728,
    backgroundColor: 0x1a1208,
    stages: [
      {
        id: 'approach-ruins',
        name: 'Enter the Ruins',
        order: 0,
        objective: 'Navigate the trap-laden entrance corridor',
        conditions: [{ kind: 'supplies-packed', target: 'ancient-ruins', value: 1 }],
        rewards: [{ kind: 'score', amount: 50 }],
      },
      {
        id: 'explore-ruins',
        name: 'Explore the Temple Complex',
        order: 1,
        objective: 'Avoid traps and defeat ancient guardians',
        conditions: [
          { kind: 'score-reached', target: 'ancient-ruins', value: 300 },
          { kind: 'island-completed', target: 'approach-ruins', value: 1 },
        ],
        rewards: [{ kind: 'apple', appleTypeId: 'ancient-apple' }],
      },
      {
        id: 'discover-ruins',
        name: 'Discover the Artifact Vault',
        order: 2,
        objective: 'Find the hidden vault containing ancient artifacts',
        conditions: [
          { kind: 'score-reached', target: 'ancient-ruins', value: 500 },
          { kind: 'island-completed', target: 'explore-ruins', value: 1 },
        ],
        rewards: [{ kind: 'ability', abilityId: 'artifact-collection' }],
      },
      {
        id: 'escape-ruins',
        name: 'Escape the Collapse',
        order: 3,
        objective: 'Defeat the Ancient Guardian and escape before the ruins collapse',
        conditions: [
          { kind: 'boss-defeated', target: 'ancient-guardian', value: 1 },
          { kind: 'island-completed', target: 'discover-ruins', value: 1 },
        ],
        rewards: [{ kind: 'score', amount: 500 }, { kind: 'ability', abilityId: 'artifact-collection' }],
      },
    ],
  },
  {
    id: 'mirror-dimension',
    name: 'Mirror Dimension',
    biome: 'mirror',
    description:
      'A reflection of your world where controls are inverted. Shadow apples test your resolve, and defeating your clone unlocks the ultimate ability.',
    unlockScore: 2000,
    requiredApples: ['skittish'],
    preferredApples: ['caffeinated', 'mochi'],
    avoidedApples: ['lavender', 'koi'],
    bossId: 'shadow-self',
    rewardId: 'clone-ability',
    legacyEffect: 'mirror-reflection',
    color: 0xc0c0c0,
    wallColor: 0x2a2a2a,
    backgroundColor: 0x0a0a0a,
    stages: [
      {
        id: 'approach-mirror',
        name: 'Cross the Threshold',
        order: 0,
        objective: 'Enter the mirror dimension and adapt to inverted controls',
        conditions: [{ kind: 'supplies-packed', target: 'mirror-dimension', value: 1 }],
        rewards: [{ kind: 'score', amount: 50 }],
      },
      {
        id: 'explore-mirror',
        name: 'Navigate the Reflection',
        order: 1,
        objective: 'Solve reflection puzzles while managing inverted controls',
        conditions: [
          { kind: 'score-reached', target: 'mirror-dimension', value: 350 },
          { kind: 'island-completed', target: 'approach-mirror', value: 1 },
        ],
        rewards: [{ kind: 'apple', appleTypeId: 'shadow-apple' }],
      },
      {
        id: 'discover-mirror',
        name: 'Discover the Mirror Core',
        order: 2,
        objective: 'Find the source of the mirror dimension',
        conditions: [
          { kind: 'score-reached', target: 'mirror-dimension', value: 600 },
          { kind: 'island-completed', target: 'explore-mirror', value: 1 },
        ],
        rewards: [{ kind: 'ability', abilityId: 'clone-ability' }],
      },
      {
        id: 'escape-mirror',
        name: 'Defeat Your Shadow',
        order: 3,
        objective: 'Defeat your shadow clone and return to the real world',
        conditions: [
          { kind: 'boss-defeated', target: 'shadow-self', value: 1 },
          { kind: 'island-completed', target: 'discover-mirror', value: 1 },
        ],
        rewards: [{ kind: 'score', amount: 1000 }, { kind: 'ability', abilityId: 'clone-ability' }],
      },
    ],
  },
] as const;

// ─── Island Lookup ───────────────────────────────────────────────────────────

export const ISLAND_BY_ID = ISLAND_DEFINITIONS.reduce(
  (lookup, island) => {
    lookup[island.id] = island;
    return lookup;
  },
  {} as Record<IslandId, IslandDefinition>,
);

export const ISLAND_BOSS_BY_ID = ISLAND_DEFINITIONS.reduce(
  (lookup, island) => {
    lookup[island.bossId] = island;
    return lookup;
  },
  {} as Record<string, IslandDefinition>,
);

// ─── Unlock Order ────────────────────────────────────────────────────────────

export const ISLAND_UNLOCK_ORDER: IslandId[] = ISLAND_DEFINITIONS.map((island) => island.id);

// ─── Island Apple Definitions ────────────────────────────────────────────────

export const ISLAND_APPLE_DEFINITIONS: ReadonlyArray<IslandAppleDefinition> = [
  {
    id: 'lava-apple',
    name: 'Lava Apple',
    typeId: 'lava-apple',
    color: 0xff2200,
    growth: 2,
    bonusScore: 5,
    specialBehavior: 'Sets nearby tiles on fire for 10 seconds',
  },
  {
    id: 'magma-apple',
    name: 'Magma Apple',
    typeId: 'magma-apple',
    color: 0xff6600,
    growth: 3,
    bonusScore: 10,
    specialBehavior: 'Grants temporary fire resistance',
  },
  {
    id: 'crystal-apple',
    name: 'Crystal Apple',
    typeId: 'crystal-apple',
    color: 0xddaaff,
    growth: 1,
    bonusScore: 3,
    specialBehavior: 'Splits into 3 smaller apples on consume',
  },
  {
    id: 'prism-apple',
    name: 'Prism Apple',
    typeId: 'prism-apple',
    color: 0xffffff,
    growth: 1,
    bonusScore: 8,
    specialBehavior: 'Refracts light to solve crystal puzzles',
  },
  {
    id: 'koi-apple',
    name: 'Koi Apple',
    typeId: 'koi-apple',
    color: 0xff8844,
    growth: 1,
    bonusScore: 4,
    specialBehavior: 'Grants underwater breathing for 15 seconds',
  },
  {
    id: 'breath-apple',
    name: 'Breath Apple',
    typeId: 'breath-apple',
    color: 0x44aaff,
    growth: 2,
    bonusScore: 6,
    specialBehavior: 'Extends underwater breathing duration',
  },
  {
    id: 'lavender-apple',
    name: 'Lavender Apple',
    typeId: 'lavender-apple',
    color: 0xaa88ff,
    growth: 1,
    bonusScore: 7,
    specialBehavior: 'Grants brief flight for 5 seconds',
  },
  {
    id: 'glider-apple',
    name: 'Glider Apple',
    typeId: 'glider-apple',
    color: 0xccbbff,
    growth: 1,
    bonusScore: 5,
    specialBehavior: 'Activates glider ability',
  },
  {
    id: 'gold-apple',
    name: 'Golden Apple',
    typeId: 'gold-apple',
    color: 0xffd700,
    growth: 2,
    bonusScore: 15,
    specialBehavior: 'Unlocks hidden secrets and passages',
  },
  {
    id: 'ancient-apple',
    name: 'Ancient Apple',
    typeId: 'ancient-apple',
    color: 0xb8860b,
    growth: 3,
    bonusScore: 20,
    specialBehavior: 'Reveals hidden traps and passages',
  },
  {
    id: 'shadow-apple',
    name: 'Shadow Apple',
    typeId: 'shadow-apple',
    color: 0x444466,
    growth: 1,
    bonusScore: 10,
    specialBehavior: 'Creates a temporary shadow clone',
  },
  {
    id: 'mirror-apple',
    name: 'Mirror Apple',
    typeId: 'mirror-apple',
    color: 0xcccccc,
    growth: 2,
    bonusScore: 12,
    specialBehavior: 'Inverts controls for 10 seconds',
  },
] as const;

export const ISLAND_APPLE_BY_ID = ISLAND_APPLE_DEFINITIONS.reduce(
  (lookup, apple) => {
    lookup[apple.id] = apple;
    return lookup;
  },
  {} as Record<IslandAppleTypeId, IslandAppleDefinition>,
);

// ─── Legacy Effects ──────────────────────────────────────────────────────────

export interface LegacyEffectDefinition {
  id: LegacyEffectId;
  name: string;
  description: string;
  islandId: IslandId;
  visualType: 'horizon' | 'deposit' | 'pool' | 'floating' | 'monument' | 'reflection';
}

export const LEGACY_EFFECT_DEFINITIONS: ReadonlyArray<LegacyEffectDefinition> = [
  {
    id: 'volcanic-horizon',
    name: 'Volcanic Horizon',
    description: 'A distant volcano smolders on the horizon, occasionally erupting',
    islandId: 'volcanic-isle',
    visualType: 'horizon',
  },
  {
    id: 'crystal-deposits',
    name: 'Crystal Deposits',
    description: 'Crystal formations appear in caves and on the world surface',
    islandId: 'crystal-cavern',
    visualType: 'deposit',
  },
  {
    id: 'koi-fish-pool',
    name: 'Koi Fish Pool',
    description: 'A peaceful koi pond appears near the starting area',
    islandId: 'sunken-temple',
    visualType: 'pool',
  },
  {
    id: 'floating-garden',
    name: 'Floating Garden',
    description: 'Small floating gardens drift above the world',
    islandId: 'sky-garden',
    visualType: 'floating',
  },
  {
    id: 'ancient-monument',
    name: 'Ancient Monument',
    description: 'A stone monument stands in the world center',
    islandId: 'ancient-ruins',
    visualType: 'monument',
  },
  {
    id: 'mirror-reflection',
    name: 'Mirror Reflection',
    description: 'The world occasionally shows a mirrored reflection',
    islandId: 'mirror-dimension',
    visualType: 'reflection',
  },
] as const;

export const LEGACY_EFFECT_BY_ID = LEGACY_EFFECT_DEFINITIONS.reduce(
  (lookup, effect) => {
    lookup[effect.id] = effect;
    return lookup;
  },
  {} as Record<LegacyEffectId, LegacyEffectDefinition>,
);
