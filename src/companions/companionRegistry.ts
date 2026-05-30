// Companion registry — static, read-only definitions for 12 starter creatures.
// No class, no methods. Just exported constant arrays.

import type {
  CompanionDefinition,
  CompanionKind,
  CompanionRarity,
  CompanionTrait,
  CompanionAbility,
  SpawnTableEntry,
} from './companionTypes.js';

// ---- Helper to create trait arrays ----

function trait(
  traitId: CompanionTrait['traitId'],
  value: number,
  description: string,
): CompanionTrait {
  return { traitId, value, description };
}

function ability(
  abilityId: string,
  name: string,
  description: string,
  requiresBondLevel: number,
  cooldownRooms: number,
  effect: CompanionAbility['effect'],
  parameters: Record<string, number>,
  soundEffectId?: string,
): CompanionAbility {
  return {
    abilityId,
    name,
    description,
    requiresBondLevel,
    cooldownRooms,
    effect,
    parameters,
    soundEffectId,
  };
}

function spawnEntry(
  biomeId: string,
  roomCondition: SpawnTableEntry['roomCondition'] = 'any',
  minRoomsVisited = 0,
  baseWeight = 1,
): SpawnTableEntry {
  return { biomeId, roomCondition, minRoomsVisited, baseWeight };
}

// ---- Creature Definitions ----

export const emberWisp: CompanionDefinition = {
  id: 'ember-wisp',
  name: 'Ember Wisp',
  species: 'wisp',
  kind: 'follower',
  rarity: 'common',
  portraitId: 'companion-portrait-ember-wisp',
  spriteRecipeId: 'companion-ember-wisp',
  size: 0.5,
  followOffset: { x: 0, y: 1 },
  maxBonds: 5,
  traits: [trait('fireResistance', 0.05, '+5% fire resistance')],
  abilities: [
    ability('ember-glow', 'Ember Glow', 'Illuminates nearby darkness for 3 rooms.', 2, 8, 'reveal', { radius: 48 }),
  ],
  spawnTable: [spawnEntry('ember-waste', 'any', 1, 10)],
  tameCost: {
    foodItems: [{ itemId: 'fire-pepper', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A tiny flame spirit that dances around the snake. Warms those who keep it close.',
  lore: 'Born from the embers of the great volcanic vents, these wisps seek out warm companions.',
};

export const dustBunny: CompanionDefinition = {
  id: 'dust-bunny',
  name: 'Dust Bunny',
  species: 'bunny',
  kind: 'follower',
  rarity: 'common',
  portraitId: 'companion-portrait-dust-bunny',
  spriteRecipeId: 'companion-dust-bunny',
  size: 0.5,
  followOffset: { x: 0, y: 1.5 },
  maxBonds: 5,
  traits: [trait('appleSpawnBonus', 0.10, '+10% apple spawn rate')],
  abilities: [
    ability('dust-cloud', 'Dust Cloud', 'Creates a dust cloud that hides the snake for 2 rooms.', 3, 10, 'shield', { duration: 2 }),
  ],
  spawnTable: [spawnEntry('liberty-badlands', 'any', 1, 8)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A small bundle of dust and magic found in the badlands. Bounces when happy.',
};

export const stonebackTurtle: CompanionDefinition = {
  id: 'stoneback-turtle',
  name: 'Stoneback Turtle',
  species: 'turtle',
  kind: 'protector',
  rarity: 'rare',
  portraitId: 'companion-portrait-stoneback-turtle',
  spriteRecipeId: 'companion-stoneback-turtle',
  size: 1,
  followOffset: { x: -16, y: 0 },
  maxBonds: 5,
  traits: [trait('damageMitigation', 30, 'Absorbs 1 hit every 30 ticks')],
  abilities: [
    ability('shell-shield', 'Shell Shield', 'Retreats into shell, blocking damage for 5 rooms.', 2, 12, 'shield', { duration: 5 }),
  ],
  spawnTable: [spawnEntry('verdigris-basin', 'any', 10, 5)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 2 }, { itemId: 'fresh-fish', count: 1 }],
    minimumBondLevel: 3,
  },
  description: 'A stoic guardian with a shell made of living stone. Slow but unyielding.',
  lore: 'Ancient carvings depict stoneback turtles standing guard over the first snake kings.',
};

export const brambleBoar: CompanionDefinition = {
  id: 'bramble-boar',
  name: 'Bramble Boar',
  species: 'boar',
  kind: 'protector',
  rarity: 'rare',
  portraitId: 'companion-portrait-bramble-boar',
  spriteRecipeId: 'companion-bramble-boar',
  size: 1,
  followOffset: { x: 16, y: 0 },
  maxBonds: 5,
  traits: [trait('coldResistance', 0.05, '+5% cold resistance')],
  abilities: [
    ability('thorn-charge', 'Thorn Charge', 'Charges forward, damaging enemies in its path.', 3, 15, 'attack', { damage: 15 }),
  ],
  spawnTable: [spawnEntry('elderwood-maze', 'dangerous', 10, 4)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 2 }],
    minimumBondLevel: 3,
  },
  description: 'A thorn-covered boar from the elderwood. Fiercely protective of its pack.',
};

export const rustMoth: CompanionDefinition = {
  id: 'rust-moth',
  name: 'Rust Moth',
  species: 'moth',
  kind: 'scout',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-rust-moth',
  spriteRecipeId: 'companion-rust-moth',
  size: 0.5,
  followOffset: { x: -10, y: -8 },
  maxBonds: 5,
  traits: [trait('wallSenseRadius', 64, '+64px wall sense radius')],
  abilities: [
    ability('dust-sense', 'Dust Sense', 'Reveals the layout of the current room for 1 room.', 2, 20, 'reveal', { roomOnly: 1 }),
  ],
  spawnTable: [
    spawnEntry('liberty-badlands', 'any', 5, 6),
    spawnEntry('sable-depths', 'dangerous', 8, 3),
  ],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 1 }],
    minimumBondLevel: 2,
  },
  description: 'A delicate moth that senses walls through dust patterns in the air.',
};

export const duskMole: CompanionDefinition = {
  id: 'dusk-mole',
  name: 'Dusk Mole',
  species: 'mole',
  kind: 'scout',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-dusk-mole',
  spriteRecipeId: 'companion-dusk-mole',
  size: 0.5,
  followOffset: { x: 10, y: -8 },
  maxBonds: 5,
  traits: [trait('hazardDetection', 1, '+1 hazard detection range')],
  abilities: [
    ability('tunnel-vision', 'Tunnel Vision', 'Marks the nearest hazard within 10 tiles.', 3, 15, 'reveal', { radius: 10 }),
  ],
  spawnTable: [spawnEntry('sable-depths', 'structure', 5, 6)],
  tameCost: {
    foodItems: [{ itemId: 'fresh-fish', count: 1 }],
    minimumBondLevel: 2,
  },
  description: 'A blind mole that navigates by sensing vibrations in the ground.',
};

export const copperRat: CompanionDefinition = {
  id: 'copper-rat',
  name: 'Copper Rat',
  species: 'rat',
  kind: 'forager',
  rarity: 'common',
  portraitId: 'companion-portrait-copper-rat',
  spriteRecipeId: 'companion-copper-rat',
  size: 0.5,
  followOffset: { x: -8, y: 8 },
  maxBonds: 5,
  traits: [trait('appleScoreBonus', 0.05, '+5% apple score')],
  abilities: [
    ability('scavenge', 'Scavenge', 'Finds a random food item in the current room.', 2, 25, 'buff', { duration: 1 }),
  ],
  spawnTable: [
    spawnEntry('liberty-badlands', 'structure', 1, 12),
    spawnEntry('verdigris-basin', 'structure', 1, 8),
  ],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A quick-witted rat with a copper-tinted coat. Always looking for snacks.',
};

export const goldfinch: CompanionDefinition = {
  id: 'goldfinch',
  name: 'Goldfinch',
  species: 'finch',
  kind: 'forager',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-goldfinch',
  spriteRecipeId: 'companion-goldfinch',
  size: 0.5,
  followOffset: { x: 8, y: -12 },
  maxBonds: 5,
  traits: [trait('appleSpawnBonus', 0.05, '+5% apple spawn rate')],
  abilities: [
    ability('song-of-finding', 'Song of Finding', 'Marks the nearest apple within 8 tiles.', 3, 18, 'reveal', { radius: 8 }),
  ],
  spawnTable: [spawnEntry('verdigris-basin', 'any', 5, 7)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 2 }],
    minimumBondLevel: 2,
  },
  description: 'A golden songbird whose melody can guide the way to hidden apples.',
};

export const thornViper: CompanionDefinition = {
  id: 'thorn-viper',
  name: 'Thorn Viper',
  species: 'viper',
  kind: 'fighter',
  rarity: 'rare',
  portraitId: 'companion-portrait-thorn-viper',
  spriteRecipeId: 'companion-thorn-viper',
  size: 1,
  followOffset: { x: 0, y: -16 },
  maxBonds: 5,
  traits: [trait('bossPullReduction', 0.15, '-15% boss pull strength')],
  abilities: [
    ability('venom-bite', 'Venom Bite', 'Strikes the nearest enemy, dealing 10 damage.', 2, 10, 'attack', { damage: 10 }),
  ],
  spawnTable: [spawnEntry('elderwood-maze', 'dangerous', 10, 5)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 2 }],
    minimumBondLevel: 3,
  },
  description: 'A venomous serpent with thorn-like scales. A deadly companion in combat.',
  lore: 'The thorn viper\'s fangs can pierce even the hardest boss armor.',
};

export const jadePanther: CompanionDefinition = {
  id: 'jade-panther',
  name: 'Jade Panther',
  species: 'panther',
  kind: 'fighter',
  rarity: 'epic',
  portraitId: 'companion-portrait-jade-panther',
  spriteRecipeId: 'companion-jade-panther',
  size: 1,
  followOffset: { x: -12, y: -16 },
  maxBonds: 5,
  traits: [
    trait('bulletDodgeChance', 0.10, '+10% bullet dodge chance'),
    trait('companionDamageBonus', 1, '+25% companion damage'),
  ],
  abilities: [
    ability('jade-strike', 'Jade Strike', 'A swift pounce dealing 20 damage to the closest enemy.', 2, 8, 'attack', { damage: 20 }),
  ],
  spawnTable: [spawnEntry('jade-peak-province', 'dangerous', 20, 3)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 3 }, { itemId: 'fresh-fish', count: 2 }],
    minimumBondLevel: 4,
  },
  description: 'A majestic feline with jade-green fur. Rarely seen, never forgotten.',
  lore: 'Legends say the jade panther chose its companion, not the other way around.',
};

export const wildBoar: CompanionDefinition = {
  id: 'wild-boar',
  name: 'Wild Boar',
  species: 'boar',
  kind: 'mount',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-wild-boar',
  spriteRecipeId: 'companion-wild-boar',
  size: 1.2,
  followOffset: { x: 0, y: 0 },
  maxBonds: 5,
  traits: [trait('movementSpeed', 4, '+4 movement speed while mounted')],
  abilities: [
    ability('trample', 'Trample', 'Charges forward, moving 3 tiles instantly.', 3, 12, 'dash', { distance: 3 }),
  ],
  spawnTable: [spawnEntry('verdigris-basin', 'any', 5, 6)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 2 }],
    minimumBondLevel: 2,
  },
  description: 'A sturdy boar perfect for riding. Fast but adds input delay.',
  lore: 'The people of Verdigris Basin have ridden wild boars since the first snake kings.',
};

export const riverKoi: CompanionDefinition = {
  id: 'river-koi',
  name: 'River Koi',
  species: 'koi',
  kind: 'mount',
  rarity: 'rare',
  portraitId: 'companion-portrait-river-koi',
  spriteRecipeId: 'companion-river-koi',
  size: 1,
  followOffset: { x: 0, y: 0 },
  maxBonds: 5,
  traits: [trait('waterSafe', 1, 'Safe traversal over water tiles while mounted')],
  abilities: [
    ability('current-boost', 'Current Boost', 'Rides the water current for a burst of speed.', 3, 15, 'dash', { distance: 4 }),
  ],
  spawnTable: [spawnEntry('sunken-ocean', 'water', 15, 5)],
  tameCost: {
    foodItems: [{ itemId: 'fresh-fish', count: 3 }],
    minimumBondLevel: 3,
  },
  description: 'A shimmering koi that glides over water. Immune to drowning when mounted.',
  lore: 'Fishermen say river koi grant safe passage to those who earn their trust.',
};

export const COMPANION_DEFINITIONS: ReadonlyArray<CompanionDefinition> = Object.freeze([
  emberWisp,
  dustBunny,
  stonebackTurtle,
  brambleBoar,
  rustMoth,
  duskMole,
  copperRat,
  goldfinch,
  thornViper,
  jadePanther,
  wildBoar,
  riverKoi,
]);

export function getCompanionDefinition(id: string): CompanionDefinition | undefined {
  return COMPANION_DEFINITIONS.find((d) => d.id === id);
}

export function getCompanionsByKind(kind: CompanionKind): ReadonlyArray<CompanionDefinition> {
  return COMPANION_DEFINITIONS.filter((d) => d.kind === kind);
}

export function getCompanionsByBiome(biomeId: string): ReadonlyArray<CompanionDefinition> {
  return COMPANION_DEFINITIONS.filter((d) =>
    d.spawnTable.some((s) => s.biomeId === biomeId),
  );
}
