// Companion registry — static, read-only definitions for 36 creatures across all rarity tiers.
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

// ---- Phase 1 Creatures (12) ----

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

// ---- Phase 5 Creatures (24 new) ----

export const caveCricket: CompanionDefinition = {
  id: 'cave-cricket',
  name: 'Cave Cricket',
  species: 'cricket',
  kind: 'follower',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-cave-cricket',
  spriteRecipeId: 'companion-cave-cricket',
  size: 0.5,
  followOffset: { x: 0, y: 2 },
  maxBonds: 5,
  traits: [trait('movementSpeed', 1, '+1 movement speed')],
  abilities: [
    ability('echo-location', 'Echo Location', 'Reveals all rooms in the current biome for 5 rooms.', 3, 20, 'reveal', { radius: 200 }),
  ],
  spawnTable: [spawnEntry('ember-waste', 'dangerous', 25, 2)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 3 }, { itemId: 'meat-skewer', count: 2 }],
    minimumBondLevel: 4,
  },
  description: 'A massive underground cricket that vibrates to sense the world around it.',
  lore: 'Cave crickets are said to remember every step the snake takes, echoing through dark places.',
};

export const sunSparrow: CompanionDefinition = {
  id: 'sun-sparrow',
  name: 'Sun Sparrow',
  species: 'sparrow',
  kind: 'follower',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-sun-sparrow',
  spriteRecipeId: 'companion-sun-sparrow',
  size: 0.5,
  followOffset: { x: 0, y: 2.5 },
  maxBonds: 5,
  traits: [trait('appleSpawnBonus', 0.05, '+5% apple spawn rate')],
  abilities: [
    ability('sun-song', 'Sun Song', 'Temporarily boosts apple spawn rate by 20% for 5 rooms.', 2, 15, 'buff', { duration: 5 }),
  ],
  spawnTable: [spawnEntry('verdigris-basin', 'any', 3, 10)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A golden sparrow that chirps at dawn. Spawns more apples near the snake.',
};

export const deepShell: CompanionDefinition = {
  id: 'deep-shell',
  name: 'Deep Shell',
  species: 'shell',
  kind: 'protector',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-deep-shell',
  spriteRecipeId: 'companion-deep-shell',
  size: 1,
  followOffset: { x: -12, y: 0 },
  maxBonds: 5,
  traits: [trait('damageMitigation', 50, 'Absorbs 1 hit every 50 ticks')],
  abilities: [
    ability('shell-dive', 'Shell Dive', 'Dives into the ground, making the snake invulnerable for 3 rooms.', 2, 18, 'shield', { duration: 3 }),
  ],
  spawnTable: [spawnEntry('sunken-ocean', 'water', 5, 8)],
  tameCost: {
    foodItems: [{ itemId: 'fresh-fish', count: 2 }],
    minimumBondLevel: 2,
  },
  description: 'An armored sea creature that provides reliable damage mitigation.',
};

export const thornbackDrake: CompanionDefinition = {
  id: 'thornback-drake',
  name: 'Thornback Drake',
  species: 'drake',
  kind: 'protector',
  rarity: 'rare',
  portraitId: 'companion-portrait-thornback-drake',
  spriteRecipeId: 'companion-thornback-drake',
  size: 1,
  followOffset: { x: 12, y: 0 },
  maxBonds: 5,
  traits: [trait('coldResistance', 0.10, '+10% cold resistance')],
  abilities: [
    ability('frost-breath', 'Frost Breath', 'Freezes nearby hazards for 2 rooms.', 3, 20, 'shield', { duration: 2 }),
  ],
  spawnTable: [spawnEntry('elderwood-maze', 'dangerous', 15, 4)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 2 }, { itemId: 'wild-herbs', count: 2 }],
    minimumBondLevel: 3,
  },
  description: 'A small drake with thorn-like scales. Breathes frost to protect its companion.',
  lore: 'Thornback drakes hibernate in the deepest parts of the elderwood, emerging only for mating season.',
};

export const libertyBastion: CompanionDefinition = {
  id: 'liberty-bastion',
  name: 'Liberty Bastion',
  species: 'bastion',
  kind: 'protector',
  rarity: 'epic',
  portraitId: 'companion-portrait-liberty-bastion',
  spriteRecipeId: 'companion-liberty-bastion',
  size: 1.2,
  followOffset: { x: -16, y: 0 },
  maxBonds: 5,
  traits: [
    trait('damageMitigation', 20, 'Absorbs 1 hit every 20 ticks'),
    trait('bossPullReduction', 0.10, '-10% boss pull strength'),
  ],
  abilities: [
    ability('fortify', 'Fortify', 'Creates a shield that absorbs 30 damage for 5 rooms.', 3, 25, 'shield', { duration: 5 }),
  ],
  spawnTable: [spawnEntry('liberty-badlands', 'structure', 15, 3)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 3 }, { itemId: 'wild-herbs', count: 2 }],
    minimumBondLevel: 4,
  },
  description: 'A living fortress. Its shell can withstand the worst the world throws.',
  lore: 'The Liberty Bastion was once a monument, awakened by the spirit of the badlands.',
};

export const tideSeer: CompanionDefinition = {
  id: 'tide-seer',
  name: 'Tide Seer',
  species: 'seer',
  kind: 'scout',
  rarity: 'rare',
  portraitId: 'companion-portrait-tide-seer',
  spriteRecipeId: 'companion-tide-seer',
  size: 0.5,
  followOffset: { x: -14, y: -8 },
  maxBonds: 5,
  traits: [trait('mapReveal', 1, 'Reveals map on water tiles')],
  abilities: [
    ability('tide-vision', 'Tide Vision', 'Reveals all tiles in current room for 3 rooms.', 3, 22, 'reveal', { radius: 50 }),
  ],
  spawnTable: [spawnEntry('sunken-ocean', 'water', 10, 5)],
  tameCost: {
    foodItems: [{ itemId: 'fresh-fish', count: 2 }],
    minimumBondLevel: 3,
  },
  description: 'A mystical creature that sees through water like air.',
};

export const gardenWhisper: CompanionDefinition = {
  id: 'garden-whisper',
  name: 'Garden Whisper',
  species: 'whisper',
  kind: 'scout',
  rarity: 'common',
  portraitId: 'companion-portrait-garden-whisper',
  spriteRecipeId: 'companion-garden-whisper',
  size: 0.5,
  followOffset: { x: 14, y: -8 },
  maxBonds: 5,
  traits: [trait('wallSenseRadius', 48, '+48px wall sense radius')],
  abilities: [
    ability('whisper', 'Whisper', 'Senses the nearest exit for 2 rooms.', 2, 12, 'reveal', { radius: 32 }),
  ],
  spawnTable: [spawnEntry('verdigris-basin', 'structure', 3, 10)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A tiny spirit that whispers the way through confusing gardens.',
};

export const peakCrow: CompanionDefinition = {
  id: 'peak-crow',
  name: 'Peak Crow',
  species: 'crow',
  kind: 'scout',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-peak-crow',
  spriteRecipeId: 'companion-peak-crow',
  size: 0.5,
  followOffset: { x: -8, y: -14 },
  maxBonds: 5,
  traits: [trait('hazardDetection', 1, '+1 hazard detection range')],
  abilities: [
    ability('caw', 'Caw', 'Warns of nearby hazards within 8 tiles for 3 rooms.', 2, 14, 'reveal', { radius: 8 }),
  ],
  spawnTable: [spawnEntry('jade-peak-province', 'any', 8, 6)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 2 }],
    minimumBondLevel: 2,
  },
  description: 'A crow with keen eyes that spots danger from afar.',
};

export const pearlShell: CompanionDefinition = {
  id: 'pearl-shell',
  name: 'Pearl Shell',
  species: 'shell',
  kind: 'forager',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-pearl-shell',
  spriteRecipeId: 'companion-pearl-shell',
  size: 0.5,
  followOffset: { x: -10, y: 10 },
  maxBonds: 5,
  traits: [trait('appleScoreBonus', 0.10, '+10% apple score')],
  abilities: [
    ability('pearl-drop', 'Pearl Drop', 'Drops a pearl worth bonus score.', 2, 30, 'buff', { duration: 1 }),
  ],
  spawnTable: [spawnEntry('sunken-ocean', 'water', 5, 7)],
  tameCost: {
    foodItems: [{ itemId: 'fresh-fish', count: 1 }],
    minimumBondLevel: 2,
  },
  description: 'A beautiful shell that produces pearls. Increases apple score when nearby.',
};

export const honeyDrake: CompanionDefinition = {
  id: 'honey-drake',
  name: 'Honey Drake',
  species: 'drake',
  kind: 'forager',
  rarity: 'rare',
  portraitId: 'companion-portrait-honey-drake',
  spriteRecipeId: 'companion-honey-drake',
  size: 0.5,
  followOffset: { x: 10, y: 10 },
  maxBonds: 5,
  traits: [
    trait('appleScoreBonus', 0.10, '+10% apple score'),
    trait('appleSpawnBonus', 0.05, '+5% apple spawn rate'),
  ],
  abilities: [
    ability('honey-drip', 'Honey Drip', 'Drips honey that attracts apples for 5 rooms.', 3, 18, 'buff', { duration: 5 }),
  ],
  spawnTable: [spawnEntry('elderwood-maze', 'any', 10, 5)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 2 }, { itemId: 'fire-pepper', count: 1 }],
    minimumBondLevel: 3,
  },
  description: 'A small drake that produces sweet honey. Attracts and scores more apples.',
  lore: 'Honey drakes guard the elderwood\'s oldest hive, protecting it from intruders.',
};

export const ashGleaner: CompanionDefinition = {
  id: 'ash-gleaner',
  name: 'Ash Gleaner',
  species: 'gleaner',
  kind: 'forager',
  rarity: 'common',
  portraitId: 'companion-portrait-ash-gleaner',
  spriteRecipeId: 'companion-ash-gleaner',
  size: 0.5,
  followOffset: { x: -6, y: 12 },
  maxBonds: 5,
  traits: [trait('appleSpawnBonus', 0.10, '+10% apple spawn rate')],
  abilities: [
    ability('ash-burst', 'Ash Burst', 'Creates a burst of ash revealing hidden apples for 2 rooms.', 2, 20, 'reveal', { radius: 24 }),
  ],
  spawnTable: [spawnEntry('ember-waste', 'any', 3, 8)],
  tameCost: {
    foodItems: [{ itemId: 'fire-pepper', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A creature born from volcanic ash. Sparks apple spawns when near the snake.',
};

export const frostNectar: CompanionDefinition = {
  id: 'frost-nectar',
  name: 'Frost Nectar',
  species: 'nectar',
  kind: 'forager',
  rarity: 'epic',
  portraitId: 'companion-portrait-frost-nectar',
  spriteRecipeId: 'companion-frost-nectar',
  size: 0.5,
  followOffset: { x: 6, y: -14 },
  maxBonds: 5,
  traits: [
    trait('coldResistance', 0.10, '+10% cold resistance'),
    trait('appleScoreBonus', 0.15, '+15% apple score'),
  ],
  abilities: [
    ability('frost-bloom', 'Frost Bloom', 'Freezes nearby enemies and spawns 3 apples.', 3, 25, 'buff', { duration: 3 }),
  ],
  spawnTable: [spawnEntry('frost-caverns', 'structure', 20, 3)],
  tameCost: {
    foodItems: [{ itemId: 'fire-pepper', count: 2 }, { itemId: 'wild-herbs', count: 3 }],
    minimumBondLevel: 4,
  },
  description: 'A crystalline flower-spirit. Brings frost and fortune to those who tend it.',
  lore: 'Frost nectar blooms only in the deepest ice caves, and only for those brave enough to seek it.',
};

export const badlandsBurrower: CompanionDefinition = {
  id: 'badlands-burrower',
  name: 'Badlands Burrower',
  species: 'burrower',
  kind: 'forager',
  rarity: 'common',
  portraitId: 'companion-portrait-badlands-burrower',
  spriteRecipeId: 'companion-badlands-burrower',
  size: 0.5,
  followOffset: { x: 8, y: 12 },
  maxBonds: 5,
  traits: [trait('movementSpeed', 1, '+1 movement speed')],
  abilities: [
    ability('burrow', 'Burrow', 'Digs underground, skipping the next room safely.', 3, 20, 'dash', { distance: 1 }),
  ],
  spawnTable: [spawnEntry('liberty-badlands', 'any', 2, 10)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A burrowing rodent from the badlands. Adds speed and a safe skip ability.',
};

export const shadowJackal: CompanionDefinition = {
  id: 'shadow-jackal',
  name: 'Shadow Jackal',
  species: 'jackal',
  kind: 'fighter',
  rarity: 'epic',
  portraitId: 'companion-portrait-shadow-jackal',
  spriteRecipeId: 'companion-shadow-jackal',
  size: 1,
  followOffset: { x: 0, y: -18 },
  maxBonds: 5,
  traits: [
    trait('bossPullReduction', 0.20, '-20% boss pull strength'),
    trait('bulletDodgeChance', 0.05, '+5% bullet dodge chance'),
  ],
  abilities: [
    ability('shadow-strike', 'Shadow Strike', 'Vanishes and reappears behind the nearest enemy.', 2, 10, 'attack', { damage: 15 }),
  ],
  spawnTable: [spawnEntry('sable-depths', 'dangerous', 15, 3)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 3 }, { itemId: 'wild-herbs', count: 2 }],
    minimumBondLevel: 4,
  },
  description: 'A shadowy predator from the depths. Reduces boss pull and dodges attacks.',
  lore: 'Shadow jackals are said to be the spirits of fallen warriors, bound to protect the living.',
};

export const freakBiter: CompanionDefinition = {
  id: 'freak-biter',
  name: 'Freak Biter',
  species: 'biter',
  kind: 'fighter',
  rarity: 'rare',
  portraitId: 'companion-portrait-freak-biter',
  spriteRecipeId: 'companion-freak-biter',
  size: 1,
  followOffset: { x: -8, y: -16 },
  maxBonds: 5,
  traits: [trait('damageMitigation', 25, 'Absorbs 1 hit every 25 ticks')],
  abilities: [
    ability('nibble', 'Nibble', 'Nibbles at enemies, dealing 8 damage.', 2, 8, 'attack', { damage: 8 }),
  ],
  spawnTable: [spawnEntry('elderwood-maze', 'dangerous', 8, 6)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 2 }],
    minimumBondLevel: 3,
  },
  description: 'A small but fierce biter. Chomps enemies relentlessly.',
};

export const desertStrider: CompanionDefinition = {
  id: 'desert-strider',
  name: 'Desert Strider',
  species: 'strider',
  kind: 'mount',
  rarity: 'epic',
  portraitId: 'companion-portrait-desert-strider',
  spriteRecipeId: 'companion-desert-strider',
  size: 1.2,
  followOffset: { x: 0, y: 0 },
  maxBonds: 5,
  traits: [
    trait('movementSpeed', 5, '+5 movement speed while mounted'),
    trait('fireResistance', 0.15, '+15% fire resistance'),
  ],
  abilities: [
    ability('sand-storm', 'Sand Storm', 'Charges through sand, gaining speed for 5 rooms.', 3, 15, 'dash', { distance: 5 }),
  ],
  spawnTable: [spawnEntry('sunscorched-wastes', 'any', 20, 2)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 4 }, { itemId: 'fire-pepper', count: 2 }],
    minimumBondLevel: 4,
  },
  description: 'A towering creature of the desert. Fast and immune to heat.',
  lore: 'Desert striders can cross the hottest wastes without a drop of water.',
};

export const stormHawk: CompanionDefinition = {
  id: 'storm-hawk',
  name: 'Storm Hawk',
  species: 'hawk',
  kind: 'mount',
  rarity: 'legendary',
  portraitId: 'companion-portrait-storm-hawk',
  spriteRecipeId: 'companion-storm-hawk',
  size: 1.3,
  followOffset: { x: 0, y: 0 },
  maxBonds: 5,
  traits: [
    trait('movementSpeed', 6, '+6 movement speed while mounted'),
    trait('bulletDodgeChance', 0.10, '+10% bullet dodge chance'),
  ],
  abilities: [
    ability('lightning-bolt', 'Lightning Bolt', 'Calls down lightning on nearby enemies.', 3, 20, 'attack', { damage: 25 }),
  ],
  spawnTable: [spawnEntry('jade-peak-province', 'dangerous', 30, 1)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 5 }, { itemId: 'fresh-fish', count: 3 }, { itemId: 'fire-pepper', count: 3 }],
    minimumBondLevel: 5,
  },
  description: 'A legendary bird of the storm peaks. Swift, powerful, and nearly untamable.',
  lore: 'Storm hawks only appear during thunderstorms atop the highest peaks. To tame one is to command the skies themselves.',
};

// ---- Followers (2 more) ----

export const ashenHound: CompanionDefinition = {
  id: 'ashen-hound',
  name: 'Ashen Hound',
  species: 'hound',
  kind: 'follower',
  rarity: 'common',
  portraitId: 'companion-portrait-ashen-hound',
  spriteRecipeId: 'companion-ashen-hound',
  size: 0.5,
  followOffset: { x: 0, y: 3 },
  maxBonds: 5,
  traits: [trait('fireResistance', 0.05, '+5% fire resistance')],
  abilities: [
    ability('heat-wave', 'Heat Wave', 'Emits a wave of warmth, granting fire resistance for 4 rooms.', 2, 12, 'buff', { duration: 4 }),
  ],
  spawnTable: [spawnEntry('ember-waste', 'any', 5, 8)],
  tameCost: {
    foodItems: [{ itemId: 'fire-pepper', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A hound made of cooled magma. Keeps its companion warm in the coldest places.',
};

export const gloomMoth: CompanionDefinition = {
  id: 'gloom-moth',
  name: 'Gloom Moth',
  species: 'moth',
  kind: 'follower',
  rarity: 'uncommon',
  portraitId: 'companion-portrait-gloom-moth',
  spriteRecipeId: 'companion-gloom-moth',
  size: 0.5,
  followOffset: { x: 0, y: 3.5 },
  maxBonds: 5,
  traits: [trait('appleSpawnBonus', 0.10, '+10% apple spawn rate')],
  abilities: [
    ability('gloom-cloud', 'Gloom Cloud', 'Shrouds the area in darkness, hiding from enemies for 3 rooms.', 3, 16, 'shield', { duration: 3 }),
  ],
  spawnTable: [spawnEntry('gloam-garden', 'any', 8, 5)],
  tameCost: {
    foodItems: [{ itemId: 'wild-herbs', count: 2 }],
    minimumBondLevel: 2,
  },
  description: 'A luminous moth from the gloam garden. Attracts apples and hides the snake.',
  lore: 'The gloom moth is drawn to curiosity — find it by venturing into the deepest gardens.',
};

// ---- Protectors (3 more) ----

export const sandShark: CompanionDefinition = {
  id: 'sand-shark',
  name: 'Sand Shark',
  species: 'shark',
  kind: 'protector',
  rarity: 'rare',
  portraitId: 'companion-portrait-sand-shark',
  spriteRecipeId: 'companion-sand-shark',
  size: 1,
  followOffset: { x: 20, y: 0 },
  maxBonds: 5,
  traits: [trait('bossPullReduction', 0.10, '-10% boss pull strength')],
  abilities: [
    ability('sand-surge', 'Sand Surge', 'Buries the companion in sand, becoming invulnerable for 4 rooms.', 3, 20, 'shield', { duration: 4 }),
  ],
  spawnTable: [spawnEntry('sunscorched-wastes', 'dangerous', 10, 4)],
  tameCost: {
    foodItems: [{ itemId: 'fresh-fish', count: 2 }, { itemId: 'meat-skewer', count: 1 }],
    minimumBondLevel: 3,
  },
  description: 'A desert shark that moves through sand like water. Reduces boss pull.',
};

// ---- Foragers (5 more) ----

export const riverMinnow: CompanionDefinition = {
  id: 'river-minnow',
  name: 'River Minnow',
  species: 'minnow',
  kind: 'forager',
  rarity: 'common',
  portraitId: 'companion-portrait-river-minnow',
  spriteRecipeId: 'companion-river-minnow',
  size: 0.5,
  followOffset: { x: -14, y: 14 },
  maxBonds: 5,
  traits: [trait('appleScoreBonus', 0.05, '+5% apple score')],
  abilities: [
    ability('school', 'School', 'Forms a school with nearby companions, boosting score by 5% for 3 rooms.', 2, 15, 'buff', { duration: 3 }),
  ],
  spawnTable: [spawnEntry('verdigris-basin', 'any', 2, 10)],
  tameCost: {
    foodItems: [{ itemId: 'fresh-fish', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A tiny fish that swims in schools. Increases apple score when tamed.',
};

export const emberMite: CompanionDefinition = {
  id: 'ember-mite',
  name: 'Ember Mite',
  species: 'mite',
  kind: 'forager',
  rarity: 'common',
  portraitId: 'companion-portrait-ember-mite',
  spriteRecipeId: 'companion-ember-mite',
  size: 0.5,
  followOffset: { x: -12, y: 12 },
  maxBonds: 5,
  traits: [trait('appleScoreBonus', 0.05, '+5% apple score')],
  abilities: [
    ability('ember-mote', 'Ember Mote', 'Drops a small ember worth bonus score.', 2, 15, 'buff', { duration: 1 }),
  ],
  spawnTable: [spawnEntry('ember-waste', 'any', 2, 10)],
  tameCost: {
    foodItems: [{ itemId: 'fire-pepper', count: 1 }],
    minimumBondLevel: 1,
  },
  description: 'A tiny ember creature. Adds small bonus score to apples eaten.',
};

// ---- Fighters (2 more) ----

export const ironClaw: CompanionDefinition = {
  id: 'iron-claw',
  name: 'Iron Claw',
  species: 'claw',
  kind: 'fighter',
  rarity: 'legendary',
  portraitId: 'companion-portrait-iron-claw',
  spriteRecipeId: 'companion-iron-claw',
  size: 1,
  followOffset: { x: 10, y: -18 },
  maxBonds: 5,
  traits: [trait('companionDamageBonus', 1, '+25% companion damage')],
  abilities: [
    ability('claw-slash', 'Claw Slash', 'Slashes at enemies within 3 tiles, dealing 12 damage.', 2, 10, 'attack', { damage: 12 }),
  ],
  spawnTable: [spawnEntry('jade-peak-province', 'dangerous', 12, 5)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 2 }, { itemId: 'fresh-fish', count: 1 }],
    minimumBondLevel: 3,
  },
  description: 'A warrior with iron-sharp claws. Boosts companion damage output.',
};

// ---- Mounts (2 more) ----

export const frostBison: CompanionDefinition = {
  id: 'frost-bison',
  name: 'Frost Bison',
  species: 'bison',
  kind: 'mount',
  rarity: 'legendary',
  portraitId: 'companion-portrait-frost-bison',
  spriteRecipeId: 'companion-frost-bison',
  size: 1.3,
  followOffset: { x: 0, y: 0 },
  maxBonds: 5,
  traits: [
    trait('movementSpeed', 4, '+4 movement speed while mounted'),
    trait('coldResistance', 0.10, '+10% cold resistance'),
  ],
  abilities: [
    ability('frost-stomp', 'Frost Stomp', 'Stomps the ground, freezing nearby tiles for 3 rooms.', 3, 18, 'shield', { duration: 3 }),
  ],
  spawnTable: [spawnEntry('frost-caverns', 'any', 10, 4)],
  tameCost: {
    foodItems: [{ itemId: 'meat-skewer', count: 3 }, { itemId: 'wild-herbs', count: 2 }],
    minimumBondLevel: 3,
  },
  description: 'A massive bison from the frost caves. Fast and cold-resistant.',
};

// ---- All definitions combined ----

export const COMPANION_DEFINITIONS: ReadonlyArray<CompanionDefinition> = Object.freeze([
  // Phase 1 (12)
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
  // Phase 5 Followers (2 more)
  caveCricket,
  sunSparrow,
  stoneFinch,
  ashenHound,
  gloomMoth,
  // Phase 5 Protectors (3 more)
  deepShell,
  thornbackDrake,
  libertyBastion,
  sandShark,
  // Phase 5 Scouts (3 more)
  tideSeer,
  gardenWhisper,
  peakCrow,
  // Phase 5 Foragers (5 more)
  riverMinnow,
  pearlShell,
  honeyDrake,
  ashGleaner,
  frostNectar,
  badlandsBurrower,
  emberMite,
  // Phase 5 Fighters (2 more)
  shadowJackal,
  freakBiter,
  ironClaw,
  // Phase 5 Mounts (2 more)
  desertStrider,
  stormHawk,
  frostBison,
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
