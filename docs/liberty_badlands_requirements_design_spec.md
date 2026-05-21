# Liberty Badlands — Requirements, Design, and Spec

## 0. High-Level Pitch

**Liberty Badlands** is the over-the-top Americana answer to **Jade Peak Province**.

It is not literally the United States. It is a mythic roadside biome where red desert geology, sun-bleached civic monuments, all-night diners, billboard prophecy, gridiron ritual, fireworks, eagles, cryptid folklore, cracked motel pools, and the holy glow of blue neon have fused into playable terrain.

Where **Jade Peak Province** says: mist, shrine, koi, ramen, bamboo, torii, tengu, onsen, mountain ritual.

**Liberty Badlands** answers: dust, monument, diner, fireworks, billboards, eagle shadows, jackalopes, motel pools, gridiron yards, interstate cuts, roadside mythology.

The biome must be funny, loud, unmistakably America-coded, and still beautiful enough to feel like a real region of the game world.

Core visual thesis:

> **Red earth, white scars, blue neon.**

Core tonal thesis:

> The snake has crossed into a red desert where the rocks are patriotic, the diners are holy, the billboards are prophets, the eagles are too frequent to be natural, and every empty motel pool contains either salvation or hepatitis.

---

# 1. Requirements

## 1.1 Primary Goals

Liberty Badlands must:

1. Add a new biome that functions as a deliberate call-and-response to Jade Peak Province.
2. Be strongly America-coded without using literal USA naming, flags, real political parties, real presidents, real states, or direct national branding.
3. Use a muted red, white, and blue color language that reads as environmental rather than flag-painted.
4. Add distinctive biome-only room archetypes, structures, animals, town names, particles, and UI flavor.
5. Feel like a biome first and a joke second.
6. Be over-the-top enough that no player misses the bit.
7. Avoid becoming generic desert, generic western, or plain parody.

## 1.2 Non-Goals

Liberty Badlands should not:

1. Be literally called America, USA, United States, Freedomland, or anything similarly direct.
2. Use actual national flags as terrain, icons, or UI.
3. Depend on real-world political references.
4. Become only cowboy-themed.
5. Become only desert-themed.
6. Become only patriotic-themed.
7. Replace Ember Waste as the hot/desert danger biome.
8. Undercut Jade Peak Province by being much more mechanically dense unless Jade Peak is later brought up to parity.

## 1.3 Relationship to Jade Peak Province

Liberty Badlands exists because Jade Peak Province already establishes a precedent: a biome can be a heightened cultural fantasy without being literally a real country.

The relationship should be visible in structure:

| Jade Peak Province | Liberty Badlands |
|---|---|
| Serene mountain province | Loud sunburnt frontier republic |
| Shrine | Roadside Monument |
| Ramen Stand | All-Nite Diner |
| Koi Pond | Motel Pool |
| Tengu Camp | Jackalope Lodge |
| Cherry Garden | Firework Field |
| Bamboo Thicket | Billboard Maze |
| Shrine Courtyard | Monument Plaza |
| Onsen Village | Motel Pool Ruins |
| Mountain Pass | Interstate Cut |
| Tatami Dojo | Gridiron Yard |
| Koi / Crane / Tanuki / Kappa | Eagle / Jackalope / Raccoon / Coyote / Bison / Possum |

The player should feel the design conversation immediately: Jade Peak is stylized Japanese fantasy; Liberty Badlands is stylized Americana fantasy.

## 1.4 Tone Requirements

The tone should be:

- Excessive
- Roadside
- Mythic
- Commercial
- Dusty
- Funny
- Slightly haunted
- Half-sincere
- Loud but lonely

The tone should not be:

- Mean-spirited
- Political
- Real-world satirical in a narrow news-cycle way
- Too clean
- Too modern
- Too western-only
- Too suburban-only

This is not “America dumb.”

This is:

> A holy red wasteland of diners, monuments, fireworks, civic ghosts, parking lots, eagles, and tall tales.

## 1.5 Color Requirements

The biome must use a muted red/white/blue identity.

### Red

Red is the dominant environmental base.

Sources of red:

- Red desert clay
- Rusted metal
- Canyon walls
- Old truck paint
- Sunburnt soil
- Firework wrappers
- Sunset dust

### White

White appears as terrain scars and civic residue.

Sources of white:

- Bleached stone
- Monument blocks
- Chalk yard lines
- Road stripes
- Diner tile
- Sun-faded paint
- Dry bones
- Salt flats
- Motel concrete

### Blue

Blue is special. It should be an accent, not a blanket.

Sources of blue:

- Neon diner signs
- Motel pools
- Faded enamel signage
- Distant mountains
- Twilight sky haze
- Firework sparks
- Chrome reflections
- Cool relief tiles
- Blue-white monument glints

Blue should feel like relief, commerce, electricity, and nighttime.

## 1.6 Gameplay Requirements

Liberty Badlands should support:

1. Normal snake traversal.
2. Occasional hot temperature pressure, lighter than a true extreme biome unless intentionally tuned otherwise.
3. Distinct visual room layouts.
4. Optional structures with interactable NPCs.
5. Biome-specific ambient juice.
6. Animal spawning that favors Americana folklore and roadside wildlife.
7. Fair entrances and traversable room generation, consistent with existing fairness standards.

## 1.7 Juice Requirements

Liberty Badlands should be one of the juiciest biomes in the game.

Required juice features:

1. Occasional eagle flyover.
2. Dust devil particles.
3. Neon sign flicker.
4. Firework pops near firework structures/archetypes.
5. Tumbleweed crossing.
6. Road heat shimmer.
7. Muffled crowd roar in Gridiron Yard.
8. Monument sparkle.
9. Red dust / blue neon room-entry sting.

The juice must be mostly cosmetic. It should not punish players unless a specific hazard structure is later designed.

## 1.8 Readability Requirements

Even with extra particles and Americana detail, gameplay readability is mandatory.

Particles must:

- Avoid covering the snake head.
- Avoid hiding walls, water, hazards, or portals.
- Stay low-alpha when crossing gameplay-critical areas.
- Be reduced or disabled by any existing low-motion or reduced-effects setting if such a setting exists.

Neon and fireworks must:

- Avoid strobing.
- Use short, low-intensity flickers.
- Not cause rapid full-screen flashes.

## 1.9 Naming Requirements

The biome name is locked:

```ts
id: 'liberty-badlands'
title: 'Liberty Badlands'
```

The region may include local names that are more ridiculous, but the biome itself is **Liberty Badlands**.

---

# 2. Design

## 2.1 Biome Identity

Liberty Badlands is a red desert frontier made out of overheated civic mythology.

It is not untouched wilderness. It is wilderness that has been paved, advertised to, abandoned, worshipped, reopened, and sold pie.

The natural world and the built world should feel inseparable:

- Canyons look like monuments.
- Monuments look like roadside attractions.
- Roadside attractions look like shrines.
- Diners feel like temples.
- Billboards feel like prophets.
- Fireworks feel like local weather.
- Eagles feel like surveillance.
- Motel pools feel like ancient springs.

The region should make the player laugh, then make them feel weirdly fond of it.

## 2.2 Visual Motifs

### Red Earth

The base terrain should feel like red dirt, clay, and canyon rock. It should not look like Ember Waste’s infernal heat. Liberty Badlands is hot, but its heat is sun, dust, asphalt, and bad decisions.

### White Scars

White should appear as hard graphic marks:

- Road lines
- Gridiron lines
- Monument plazas
- Diner tile
- Chalk arrows
- Sun-bleached rocks
- Painted curbs

This gives the biome its “white stripe” language without literally turning terrain into a flag.

### Blue Neon

Blue is the biome’s magic color.

It should appear in:

- Diner signs
- Motel signs
- Pool water
- Vending machines
- Sign glows
- Occasional firework sparks
- UI accent

Blue should mean: civilization, relief, electricity, night, sales tax, and the promise of pie.

## 2.3 Humor Style

The humor should be environmental and declarative.

Good Liberty Badlands humor:

- “The billboard seems to be threatening you with lunch.”
- “This monument commemorates either a battle, a sale, or a zoning dispute.”
- “The diner is open. It has always been open. It will outlive the sun.”
- “An eagle flies overhead with suspiciously good timing.”

Bad Liberty Badlands humor:

- Topical political jokes
- Real politician references
- “Americans are dumb” jokes
- Overly internet-coded jokes
- Pure cowboy stereotype without the roadside/civic layer

## 2.4 Biome Archetypes

Liberty Badlands should have a custom archetype pool comparable to Jade Peak Province.

### 2.4.1 Firework Field

Call-and-response to: **Cherry Garden**

Instead of drifting petals, the room contains firework wrappers, launch tubes, little spark particles, and scattered bright debris.

Visuals:

- Red dirt base
- Small firework crate clusters
- Occasional harmless sparkle burst
- Sparse white scorch marks
- Maybe one or two blue sparks

Gameplay:

- Mostly open movement
- Low obstruction
- Firework crates may be future interactables
- Cosmetic fireworks should not damage the player by default

Tone:

> The ground is littered with celebration residue from an event nobody remembers.

### 2.4.2 Billboard Maze

Call-and-response to: **Bamboo Thicket**

Instead of bamboo creating a natural maze, enormous roadside billboards create artificial chokepoints.

Visuals:

- Billboard walls
- Support posts
- Neon or painted signs
- Red dirt between sign corridors

Possible sign text:

- EAT PIE
- NEXT EXIT: DESTINY
- GAS / BAIT / PROPHECY
- EAGLES ARE WATCHING
- TRY THE MEAT
- YOU MISSED THE TURN
- REAL FREEDOM, REAL FAST
- BLESSED ARE THE HUNGRY
- PIE. GAS. FORGIVENESS.
- TURN BACK FOR BISCUITS

Gameplay:

- Chokepoint room
- Strong navigation identity
- Billboards should use wall-equivalent collision

Tone:

> The land itself has been interrupted by advertising.

### 2.4.3 Monument Plaza

Call-and-response to: **Shrine Courtyard**

A white stone civic plaza sits in the red desert. At the top is a strange monument, plaque, bell, eagle statue, or founder rock.

Visuals:

- Pale stone plaza
- Red desert around it
- White approach path
- Blue-white glints
- Monument at top/center

Gameplay:

- Mostly safe plaza space
- Strong landmark silhouette
- Can pair with Roadside Monument structure

Tone:

> This place is clearly sacred. Nobody remembers why.

### 2.4.4 Motel Pool Ruins

Call-and-response to: **Onsen Village**

A cracked motel pool appears in the desert, surrounded by pale concrete, broken chairs, and flickering vacancy signage.

Visuals:

- Blue pool water or empty blue-tiled pit
- White concrete
- Red dust blown across the deck
- Flickering blue neon
- Broken motel wall or sign

Gameplay:

- Water or non-water variant
- If water exists, can support bass/fish spawns
- If empty, creates a safe weird arena

Tone:

> The pool is either an oasis, a trap, or a memory of chlorine.

### 2.4.5 Interstate Cut

Call-and-response to: **Mountain Pass**

A road/canyon corridor slices through the room.

Visuals:

- Asphalt strip
- White/yellow-ish pale road markings, but keep white dominant
- Red canyon walls
- Occasional road sign
- Dust shimmer

Gameplay:

- Strong directional corridor
- Good transition room
- Could connect thematically to portals or town roads

Tone:

> The canyon did not form naturally. It was convinced.

### 2.4.6 Gridiron Yard

Call-and-response to: **Tatami Dojo**

A ritualized chalk-line field where movement itself feels judged.

Visuals:

- Rectangular green/dusty field or pale dirt field
- White yard lines
- Bleachers or light posts
- Chalk boundary
- Maybe blue scoreboard glow

Gameplay:

- Rectangular safe interior
- Wall/bleacher boundaries
- Muffled crowd roar on apple collection or near miss

Tone:

> A ceremonial yard where serpents are measured in glory, inches, and preventable injuries.

## 2.5 Biome Structures

### 2.5.1 Roadside Monument

Equivalent to: **Shrine**

The Roadside Monument is the biome’s sacred/civic structure. It should feel like a shrine, tourist trap, local memorial, and zoning accident all at once.

Possible names:

- Eagle’s Rest Monument
- Founders’ Boulder
- The Great Bell That Never Rang
- Old Glory Stone
- The Big Plaque
- Liberty Teeth Memorial
- Monument to the Unknown Shopper
- Sunset Civic Rock
- The Eternal Grill

NPC titles/names:

- Plaque Keeper Walt
- Marlene of the Stone
- Pastor Dale
- Ranger Buck
- Tammy the Docent
- Earl, Keeper of Facts
- The Volunteer

Structure tiles:

- Monument stone
- Plaque/sign
- White plaza
- Blue glints
- NPC guide/docent

Possible interactions:

- Blessing
- Lore plaque
- Donation
- Weird civic fact

Blessing names:

- Road Blessing
- Big Sky Blessing
- Eagle-Eyed Blessing
- Founders’ Favor
- Manifest Digest
- The Long Weekend
- Monumental Appetite

Flavor examples:

- “The plaque commemorates a conflict between hunger, property, and weather.”
- “Nobody agrees what the monument means, but everyone agrees it has a parking lot.”
- “The docent smiles with the exhausted holiness of a person who has explained this rock for thirty years.”

### 2.5.2 All-Nite Diner

Equivalent to: **Ramen Stand**

The All-Nite Diner is the emotional heart of Liberty Badlands.

Possible names:

- Snakebite Diner
- The Last Pancake
- Midnight Griddle
- Chrome Spoon Café
- Big Earl’s All-Nite Eats
- Pie & Mercy
- The Bottomless Mug
- Blue Plate Mirage
- Dustfork Diner

NPC names:

- Earl
- Tammy
- Sue
- Hank
- Jolene
- Bobby-Joe
- Marlene
- Dale
- Rita
- Connie

Food/item concepts:

- Bottomless Coffee: speed boost, possible steering tension
- Pancake Stack: healing or comfort buff
- Chili Bowl: temporary resistance, comedic drawback possible
- Pie Slice: score or apple reward bonus
- Burger: length/health gain
- Hash Browns: short-term traction/control buff
- Blue Plate Special: randomized diner blessing

Structure juice:

- Neon flicker
- Steam from griddle
- Bell ding on entry
- Coffee pour sound
- Jukebox sparkle
- Blue sign glow

Flavor examples:

- “The diner is open. It has always been open.”
- “The waitress calls you honey in a way that counts as a binding contract.”
- “The coffee tastes like speed limit violations.”

### 2.5.3 Firework Stand

Equivalent to: special roadside structure / optional settlement

The Firework Stand is pure Liberty Badlands spectacle.

Possible names:

- Big Boom Barn
- Liberty Sparks
- Dale’s Discount Explosions
- Bottle Rocket Chapel
- The Responsible Pyromancer
- Uncle Whoever’s Almost Legal Fireworks
- Roman Candle Ranch
- Boom County Supply

NPC names:

- Firework Dale
- Roman Candle Randy
- Boom-Boom Marlene
- Legal Terry
- Sparkler Sue
- Bottle Rocket Bobby

Structure tiles:

- Firework crates
- Launch tubes
- Neon sale sign
- Vendor NPC
- Scorch marks

Possible interactions:

- Buy explosive item
- Buy cosmetic firework burst
- Trigger harmless celebration
- Later: open a path / destroy obstacle

Gameplay caution:

Default implementation should make fireworks cosmetic unless a full hazard system is deliberately added. Random lethal explosions would be funny exactly once and then irritating.

Flavor examples:

- “Everything here is discounted for reasons not recognized by law.”
- “The vendor insists these are educational fireworks.”
- “A sign reads: SAFETY THIRD.”

### 2.5.4 Motel Pool

Equivalent to: **Koi Pond**

The Motel Pool is an artificial oasis.

Possible names:

- Vacancy Pool
- Blue Lagoon Motor Court
- Cactus Court Pool
- The Last Clean Pool
- Chlorine Shrine
- Sunset Vacancy Motel

Visual variants:

1. Half-full blue pool
2. Empty cracked pool
3. Dirty pool with bass/fish
4. Neon-lit pool at night

Gameplay:

- Can place water tiles
- Can support fish/bass spawns
- Can create concrete border tiles
- Could contain lost item/coins later

Flavor examples:

- “The pool has not been cleaned since the age of heroes.”
- “The water is blue in a way nature did not request.”
- “A plastic chair watches the horizon.”

### 2.5.5 Jackalope Lodge

Equivalent to: **Tengu Camp**

This is the folklore camp. It should be tall-tale Americana, not simple cowboy camp.

Possible names:

- Horned Hare Lodge
- Jackalope Rest
- Tall Tale Camp
- Antler Rabbit Society
- Bigfoot Picnic Ground
- The Witnesses’ Circle
- Coyote Congress
- The Lodge of Unverified Events

NPC names:

- Tall-Tale Terry
- Marlene the Witness
- Buck the Lesser
- Dale Who Saw It
- The Lodge Elder
- Connie of the Antler
- Ranger Maybe

Visuals:

- Campfires
- Tents/trailers
- Lodge banner
- Antler decorations
- Weird eyes in darkness
- Jackalope dash particle

Gameplay:

- Equivalent footprint to Tengu Camp
- Chieftain/elder NPC
- Optional guards/witnesses
- Could later offer animal/taming quests

Flavor examples:

- “The Lodge Elder swears the jackalope was eight feet tall, not counting the hat.”
- “Everyone here has seen something. Nobody here has evidence.”
- “A rabbit with antlers crosses the camp too quickly to become a fact.”

## 2.6 Animal Design

Liberty Badlands animal roster should include existing animals where possible and new animals where necessary.

### Desired animals

- Eagle
- Jackalope
- Raccoon
- Coyote
- Bison
- Bass
- Possum
- Armadillo

### Animal roles

#### Eagle

Behavior: perch/flyover
Encounter: harmless or dangerous depending on future systems
Use: ambient icon, feather drops, sky presence

#### Jackalope

Behavior: fast wander
Encounter: tamable or skittish
Use: tall-tale creature, speed identity

#### Raccoon

Behavior: wander/steal
Encounter: annoying but charming
Use: steals apples/items if systems support it later

#### Coyote

Behavior: pack/wander
Encounter: dangerous or tamable
Use: desert predator

#### Bison

Behavior: slow charge/tank
Encounter: dangerous
Use: large regional threat

#### Bass

Behavior: water/school
Encounter: harmless/huntable
Use: motel pool / pond water animal

#### Possum

Behavior: wander/play dead
Encounter: harmless
Use: comedy animal, drops maybe nothing or weird loot

#### Armadillo

Behavior: slow/tanky
Encounter: harmless
Use: shell/hide drops, desert flavor

## 2.7 Ambient Juice Design

### 2.7.1 Eagle Flyover

Required.

An eagle silhouette occasionally flies across the screen. This should be cosmetic and rare enough to remain funny.

Variants:

- Normal eagle silhouette
- Eagle with feather drop particle
- Eagle with tiny hotdog, ultra rare
- Double eagle flyover, ultra rare
- Eagle flyover triggered near Roadside Monument

Behavior:

- Spawn offscreen left or right
- Travel in shallow arc
- Optional shadow crosses map
- Short screech
- Fade out cleanly

Frequency:

- Base chance on room entry: low
- Slightly higher in Monument Plaza, Interstate Cut, Roadside Monument, Eagle Rock-like rooms

### 2.7.2 Dust Devils

Small spirals of dust cross the room.

Behavior:

- Cosmetic
- Slow drift
- Low opacity
- Red/tan particles
- Occasional tiny white glint

### 2.7.3 Neon Flicker

Blue neon signs flicker in diner, motel, billboard, and firework rooms.

Rules:

- No strobe
- No harsh full-screen flashes
- Flicker localized to sign tiles
- Blue-white accent

### 2.7.4 Firework Pops

Small particle bursts near firework stands/fields.

Rules:

- Cosmetic by default
- Red/white/blue particle burst
- Tiny sound pop
- Very light screen shake only in special cases

### 2.7.5 Tumbleweed Crossing

A tumbleweed occasionally rolls across the screen.

Behavior:

- Cosmetic or harmless entity
- Moves horizontally or diagonally
- Bounces off wall once if desired
- Vanishes offscreen

### 2.7.6 Heat Shimmer

Subtle heat shimmer over open rooms.

Rules:

- Very subtle
- Avoid gameplay distortion
- Can be disabled under reduced effects

### 2.7.7 Gridiron Crowd Roar

In Gridiron Yard rooms, a muffled crowd noise can trigger on:

- Apple eaten
- Near miss
- Boss hit
- Player entering the field

It should sound distant and absurd, like the land itself has spectators.

### 2.7.8 Monument Sparkle

Roadside Monuments emit tiny white-blue glints.

The game should treat a dumb plaque as sacred because that is the joke.

### 2.7.9 Room Entry Sting

When entering Liberty Badlands:

- Tiny red dust sweep
- Blue neon glint
- Optional eagle screech

This should be quick and non-invasive.

## 2.8 Town Names

Town names should mirror Jade Peak’s fantasy-cultural naming style while being roadside Americana.

Recommended list:

```ts
'liberty-badlands': [
  'Dustfork',
  'Eaglegate',
  'Starwell',
  'Bellrock',
  'Griddleford',
  'Cactus Toll',
  'Flagstone',
  'Pie Junction',
  'Freedom Pump',
  'Old Glory Gulch',
  'Chrome Fork',
  'Biscuit Rock',
  'Vacancy Wells',
  'Monument Bend',
  'Liberty Spur',
]
```

Best short-list:

- Pie Junction
- Bellrock
- Eaglegate
- Cactus Toll
- Griddleford
- Monument Bend
- Vacancy Wells

## 2.9 Biome Flavor Text

Possible one-liners for UI, debug display, town notices, NPCs, or future loading text:

- “Red earth, white scars, blue neon.”
- “The diner lights are still on.”
- “The billboards know where you are.”
- “An eagle screams at nothing in particular.”
- “The monument plaque has faded into prophecy.”
- “The road continues, despite all available evidence.”
- “Every exit promises food, fuel, and forgiveness.”
- “The desert is open twenty-four hours.”
- “A tumbleweed crosses with legal confidence.”
- “The pool is blue in a way nature did not request.”

---

# 3. Spec

## 3.1 Biome ID and Definition

Add new biome ID:

```ts
export type BiomeId =
  | 'verdigris-basin'
  | 'ember-waste'
  | 'moonlit-parish'
  | 'sable-depths'
  | 'gloam-garden'
  | 'elderwood-maze'
  | 'sunken-ocean'
  | 'home-hearth'
  | 'jade-peak-province'
  | 'liberty-badlands';
```

Add biome definition:

```ts
'liberty-badlands': {
  id: 'liberty-badlands',
  title: 'Liberty Badlands',
  temperature: 'Sunburnt',
  dangerLevel: 5,
  temperatureHazard: 'hot',
  temperatureRate: 0.45,
  hue: 8,
  saturation: 0.3,
  lightness: 0.23,
  tintVariance: 0.028,
  accentColor: 0x5f8fbf,
  enemyFireBias: 1,
  enemyMoveBias: 1,
  animalSpawnChance: 0.2,
  animalSpawnBias: {
    rabbit: 1,
    deer: 1,
    fox: 0,
    bird: 1,
    wolf: 0,
    bear: 1,
    fish: 1,
    snake: 2,
    eagle: 5,
    jackalope: 5,
    raccoon: 3,
    coyote: 3,
    bison: 2,
    bass: 2,
    possum: 3,
    armadillo: 2,
  },
}
```

## 3.2 Coordinate Placement

Liberty Badlands needs a defined coordinate range in `getBiomeForRoom`.

Recommended placement should avoid overlapping Jade Peak Province and existing extreme biomes.

Possible option:

```ts
if (x >= -10 && x <= -5 && y >= -8 && y <= -3) {
  return BIOMES['liberty-badlands'];
}
```

This places it west/southwest-ish, far enough from origin to feel like a real discovered region but not impossible to encounter.

Alternative if Ember Waste already owns too much western space:

```ts
if (x <= -6 && y <= -4 && y >= -10) {
  return BIOMES['liberty-badlands'];
}
```

Important: place Liberty Badlands before broader fallback checks like `x <= -3` if Ember Waste currently catches western rooms.

## 3.3 Room Generation Context

Add a convenience boolean in generation context:

```ts
const isLibertyBadlands = palette.biomeId === 'liberty-badlands';
```

Add to context type:

```ts
isLibertyBadlands: boolean;
```

Use this the same way `isJadePeak` is used.

## 3.4 Room Archetype IDs

Extend `RoomArchetypeId`:

```ts
export type RoomArchetypeId =
  | 'classic'
  | 'open-clearing'
  | 'four-corners'
  | 'choke-point'
  | 'ocean'
  | 'dense-forest'
  | 'cherry-garden'
  | 'bamboo-thicket'
  | 'shrine-courtyard'
  | 'onsen-village'
  | 'mountain-pass'
  | 'tatami-dojo'
  | 'firework-field'
  | 'billboard-maze'
  | 'monument-plaza'
  | 'motel-pool-ruins'
  | 'interstate-cut'
  | 'gridiron-yard';
```

## 3.5 Archetype Pool

Add a Liberty Badlands pool:

```ts
const LIBERTY_BADLANDS_POOL: WeightedArchetype[] = [
  { id: 'billboard-maze', weight: 22 },
  { id: 'firework-field', weight: 18 },
  { id: 'monument-plaza', weight: 14 },
  { id: 'motel-pool-ruins', weight: 12 },
  { id: 'interstate-cut', weight: 16 },
  { id: 'gridiron-yard', weight: 8 },
  { id: 'classic', weight: 10 },
];
```

Add to archetype choice:

```ts
if (context.isLibertyBadlands) {
  const id = this.weightedChoice(LIBERTY_BADLANDS_POOL);
  return {
    id,
    suppressRandomObstacles:
      id === 'billboard-maze' ||
      id === 'gridiron-yard' ||
      id === 'motel-pool-ruins',
  };
}
```

## 3.6 Archetype Implementations

### 3.6.1 `applyFireworkField`

Expected tiles:

- `F`: firework crate / launch tube
- `P` or equivalent: confetti/wrapper/sparkle if existing renderer supports it
- `.`: walkable dirt
- scorch marks can be visual-only if renderer supports tinting

Pseudo:

```ts
private applyFireworkField(context: RoomGenerationContext): void {
  const safe = this.createEntranceRunupCells(context, 4);
  const count = Math.floor(context.grid.cols * context.grid.rows * 0.035);

  for (...) {
    pick random interior tile;
    if walkable and not safe, set 'F' or sparkle/debris tile;
  }

  place 1-3 small white scorch/star clusters;
}
```

### 3.6.2 `applyBillboardMaze`

Expected tiles:

- `B`: billboard wall/support
- `N`: neon/sign face
- `.`: walkable red dirt

Pseudo:

```ts
private applyBillboardMaze(context: RoomGenerationContext): void {
  const safe = this.createEntranceRunupCells(context, 5);
  const wallCount = 3 + this.randomInt(3);

  for each billboard wall:
    create horizontal or vertical run;
    use B for supports/body;
    optionally place N on sign face;
    preserve safe runups;
}
```

Design rule: should create chokepoints but not fully seal the room.

### 3.6.3 `applyMonumentPlaza`

Expected tiles:

- `E`: pale plaza / safe floor
- `M`: monument/plaque/statue
- `W`: white path/stripe if tile exists
- `L`: glint/light if suitable

Pseudo:

```ts
private applyMonumentPlaza(context: RoomGenerationContext): void {
  create central/top plaza rectangle;
  fill with E;
  place M monument near upper center;
  draw white approach path from lower center;
  add 1-2 glint tiles;
}
```

### 3.6.4 `applyMotelPoolRuins`

Expected tiles:

- `O` or `~`: pool water
- `E`: concrete deck
- `#`: motel wall
- `N`: vacancy sign

Pseudo:

```ts
private applyMotelPoolRuins(context: RoomGenerationContext): void {
  create concrete rectangle;
  create pool oval/rectangle at center;
  randomly choose half-full or empty variant;
  add small motel wall/sign on one side;
}
```

If water is used, ensure it does not block all routes.

### 3.6.5 `applyInterstateCut`

Expected tiles:

- `A`: asphalt, if supported
- `W`: white stripe, if supported
- `#`: canyon wall / rock
- `.`: red dirt

Pseudo:

```ts
private applyInterstateCut(context: RoomGenerationContext): void {
  choose horizontal or vertical road;
  create asphalt corridor through room;
  add white stripes along center/edges;
  add red rock clusters away from entrance runups;
}
```

If custom tiles are not yet rendered, use existing walkable `E` or `.` with renderer tint support later.

### 3.6.6 `applyGridironYard`

Expected tiles:

- `E`: field interior
- `W`: yard lines
- `#`: bleachers/walls
- `L`: stadium lights

Pseudo:

```ts
private applyGridironYard(context: RoomGenerationContext): void {
  create rectangular field;
  fill interior with E;
  add W yard lines every few columns/rows;
  add boundary/bleachers outside;
  place 2-4 L stadium lights;
}
```

Trigger juice:

- On apple collection in this archetype, play muffled crowd cheer.

## 3.7 Structure Types

Extend room snapshot/context as needed:

```ts
roadsideMonument?: RoadsideMonumentData;
allNiteDiner?: AllNiteDinerData;
fireworkStand?: FireworkStandData;
jackalopeLodge?: JackalopeLodgeData;
```

Motel pool may reuse existing `koiPond` shape under a new name or become its own structure if desired.

## 3.8 Structure Chances

Add chances similar to Jade Peak special structures:

```ts
const ROADSIDE_MONUMENT_CHANCE = 0.10;
const ALL_NITE_DINER_CHANCE = 0.08;
const FIREWORK_STAND_CHANCE = 0.08;
const JACKALOPE_LODGE_CHANCE = 0.10;
const MOTEL_POOL_CHANCE = 0.10;
```

In guaranteed Liberty Badlands settlement logic:

```ts
if (isLibertyBadlands) {
  if (roll < 0.25) return 'all-nite-diner';
  if (roll < 0.45) return 'roadside-monument';
  if (roll < 0.65) return 'jackalope-lodge';
  if (roll < 0.80) return 'firework-stand';
  return 'quest-house';
}
```

In non-guaranteed logic, use cumulative special chances like Jade Peak.

## 3.9 SettlementKind Extension

```ts
type SettlementKind =
  | 'village'
  | 'goblin-camp'
  | 'quest-house'
  | 'snake-mcDonalds'
  | 'shrine'
  | 'ramen-stand'
  | 'tengu-camp'
  | 'roadside-monument'
  | 'all-nite-diner'
  | 'firework-stand'
  | 'jackalope-lodge';
```

## 3.10 Roadside Monument Placement Spec

Create file:

```txt
src/world/roadsideMonument.ts
```

Data shape:

```ts
interface RoadsideMonumentData {
  docent: QuestGiverLikeOrNpc;
  hasBlessings: boolean;
  monumentName: string;
}
```

Placement requirements:

- Requires medium footprint.
- Clears pale safe plaza.
- Places central monument tile.
- Places plaque/sign tile.
- Places docent NPC.
- Avoids forbidden entrance cells.

Suggested constants:

```ts
const MONUMENT_NAMES = [
  'Eagle’s Rest Monument',
  'Founders’ Boulder',
  'The Great Bell That Never Rang',
  'Old Glory Stone',
  'The Big Plaque',
  'Liberty Teeth Memorial',
  'Monument to the Unknown Shopper',
] as const;

const DOCENT_NAMES = [
  'Walt',
  'Marlene',
  'Pastor Dale',
  'Ranger Buck',
  'Tammy',
  'Earl',
] as const;
```

## 3.11 All-Nite Diner Placement Spec

Create file:

```txt
src/world/allNiteDiner.ts
```

Data shape:

```ts
interface AllNiteDinerData {
  cook: NpcProfileWithPosition;
  sellsFood: true;
  dinerName: string;
}
```

Placement requirements:

- Small/medium diner footprint.
- Counter tiles.
- Neon sign tiles.
- One cook/waitress NPC.
- Optional blue neon pool of light outside.

Suggested constants:

```ts
const DINER_NAMES = [
  'Snakebite Diner',
  'The Last Pancake',
  'Midnight Griddle',
  'Chrome Spoon Café',
  'Big Earl’s All-Nite Eats',
  'Pie & Mercy',
  'The Bottomless Mug',
] as const;

const DINER_NPC_NAMES = [
  'Earl',
  'Tammy',
  'Sue',
  'Hank',
  'Jolene',
  'Bobby-Joe',
  'Marlene',
  'Dale',
] as const;
```

## 3.12 Firework Stand Placement Spec

Create file:

```txt
src/world/fireworkStand.ts
```

Data shape:

```ts
interface FireworkStandData {
  vendor: NpcProfileWithPosition;
  sellsFireworks: true;
  standName: string;
}
```

Placement requirements:

- Small stand footprint.
- Firework crate tiles.
- Neon/sign tile.
- Vendor NPC.
- Scorch marks nearby.

Suggested constants:

```ts
const FIREWORK_STAND_NAMES = [
  'Big Boom Barn',
  'Liberty Sparks',
  'Dale’s Discount Explosions',
  'Bottle Rocket Chapel',
  'The Responsible Pyromancer',
  'Roman Candle Ranch',
] as const;

const FIREWORK_VENDOR_NAMES = [
  'Firework Dale',
  'Roman Candle Randy',
  'Boom-Boom Marlene',
  'Legal Terry',
  'Sparkler Sue',
  'Bottle Rocket Bobby',
] as const;
```

## 3.13 Jackalope Lodge Placement Spec

Create file:

```txt
src/world/jackalopeLodge.ts
```

Data shape:

```ts
interface JackalopeLodgeData {
  elder: NpcProfileWithPosition;
  witnesses: NpcProfileWithPosition[];
  lodgeName: string;
}
```

Placement requirements:

- Camp/lodge footprint.
- Campfire tiles.
- Tents/trailers.
- Banner/antler decoration.
- Elder NPC.
- Optional witness NPCs.

Suggested constants:

```ts
const JACKALOPE_LODGE_NAMES = [
  'Horned Hare Lodge',
  'Jackalope Rest',
  'Tall Tale Camp',
  'Antler Rabbit Society',
  'Bigfoot Picnic Ground',
  'The Witnesses’ Circle',
  'The Lodge of Unverified Events',
] as const;

const JACKALOPE_NPC_NAMES = [
  'Tall-Tale Terry',
  'Marlene the Witness',
  'Buck the Lesser',
  'Dale Who Saw It',
  'The Lodge Elder',
  'Connie of the Antler',
  'Ranger Maybe',
] as const;
```

## 3.14 Animal Registry Spec

Add definitions if the animal system supports them:

```txt
src/animals/definitions/eagle.ts
src/animals/definitions/jackalope.ts
src/animals/definitions/raccoon.ts
src/animals/definitions/coyote.ts
src/animals/definitions/bison.ts
src/animals/definitions/bass.ts
src/animals/definitions/possum.ts
src/animals/definitions/armadillo.ts
```

Then import and register them in `animalRegistry.ts`.

Minimum viable Liberty Badlands animal set:

1. Eagle
2. Jackalope
3. Coyote
4. Possum

Full preferred set:

1. Eagle
2. Jackalope
3. Raccoon
4. Coyote
5. Bison
6. Bass
7. Possum
8. Armadillo

### Example: Jackalope

```ts
const definition: AnimalDefinition = {
  type: 'jackalope',
  name: 'Jackalope',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 30,
  maxPerRoom: 2,
  moveInterval: 1,
  behavior: 'wander',
  snakeEncounter: 'tamable',
  drops: [
    { itemId: 'hide', chance: 0.2 },
  ],
  spritePrefix: 'jackalope',
  maxHearts: 1,
};
```

### Example: Eagle

```ts
const definition: AnimalDefinition = {
  type: 'eagle',
  name: 'Eagle',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 20,
  maxPerRoom: 1,
  moveInterval: 4,
  behavior: 'perch',
  snakeEncounter: 'harmless',
  drops: [
    { itemId: 'feather', chance: 0.6 },
  ],
  spritePrefix: 'eagle',
  maxHearts: 1,
};
```

## 3.15 Juice System Spec

Create or extend a biome juice system.

Possible file:

```txt
src/ui/biomeJuice.ts
```

Or integrate into existing renderer/scene if that is the established pattern.

### API concept

```ts
interface BiomeJuiceParams {
  scene: Phaser.Scene;
  biomeId: BiomeId;
  roomId: string;
  archetypeId?: RoomArchetypeId;
  structureTags: string[];
}

function playBiomeEntryJuice(params: BiomeJuiceParams): void;
function updateBiomeAmbientJuice(params: BiomeJuiceParams): void;
```

### Eagle Flyover

```ts
function maybeSpawnEagleFlyover(scene: Phaser.Scene, rng: RandomGenerator): void {
  if (rng() > 0.08) return;
  spawnEagleFlyover(scene, rng);
}
```

Higher chance modifiers:

```ts
const EAGLE_FLYOVER_BASE_CHANCE = 0.08;
const EAGLE_FLYOVER_MONUMENT_CHANCE = 0.16;
const EAGLE_FLYOVER_GRIDIRON_CHANCE = 0.12;
```

### Firework Pops

```ts
const FIREWORK_POP_CHANCE = 0.18;
```

Only active in:

- Firework Field
- Firework Stand
- Roadside Monument, rarely

### Tumbleweed

```ts
const TUMBLEWEED_CHANCE = 0.10;
```

Active in:

- Interstate Cut
- Billboard Maze
- Classic Liberty Badlands rooms

### Neon Flicker

Active when room contains:

- All-Nite Diner
- Firework Stand
- Motel Pool Ruins
- Billboard Maze

### Crowd Roar

Event-triggered only:

```ts
if (room.biomeId === 'liberty-badlands' && room.archetypeId === 'gridiron-yard') {
  maybePlayCrowdRoar();
}
```

Trigger on:

- Apple eaten
- Boss damaged
- Close call if such event exists

## 3.16 Renderer Spec

Renderer should support these new tile meanings or map them to existing visuals:

```ts
const LIBERTY_TILE_MEANINGS = {
  A: 'asphalt',
  B: 'billboard',
  F: 'firework-crate',
  M: 'monument-stone',
  N: 'neon-sign',
  W: 'white-stripe',
};
```

If custom tile support is limited, initial mapping can be:

- `A` -> walkable floor with dark asphalt tint
- `B` -> wall/collision
- `F` -> decorative obstacle or interactable crate
- `M` -> wall/decorative monument
- `N` -> decorative sign/light
- `W` -> walkable floor with pale tint

## 3.17 Town Names Spec

Add to town names:

```ts
'liberty-badlands': [
  'Dustfork',
  'Eaglegate',
  'Starwell',
  'Bellrock',
  'Griddleford',
  'Cactus Toll',
  'Flagstone',
  'Pie Junction',
  'Freedom Pump',
  'Old Glory Gulch',
  'Chrome Fork',
  'Biscuit Rock',
  'Vacancy Wells',
  'Monument Bend',
  'Liberty Spur',
],
```

## 3.18 Testing Requirements

Add or update tests to verify:

1. `liberty-badlands` is reachable from intended coordinates.
2. Liberty Badlands rooms generate deterministically from the same seed.
3. All Liberty Badlands archetypes preserve safe border entry runups.
4. Special structures do not overlap forbidden entrance cells.
5. Firework/diner/monument/lodge structures do not fully block traversal.
6. New animal definitions are registered before appearing in biome bias.
7. Biome palette returns valid colors.
8. No missing switch cases for new archetype IDs.

Suggested fairness fixture center:

```ts
{ x: -7, y: -6, z: 0 }
```

Add to fairness test fixture centers if coordinate placement matches.

## 3.19 Minimum Viable Implementation

The smallest acceptable Liberty Badlands implementation:

1. Add biome ID and definition.
2. Add coordinate mapping.
3. Add town names.
4. Add `isLibertyBadlands` context flag.
5. Add custom archetype pool.
6. Implement at least three archetypes:
   - Billboard Maze
   - Monument Plaza
   - Interstate Cut
7. Add one structure:
   - All-Nite Diner or Roadside Monument
8. Add eagle flyover cosmetic juice.
9. Add tests for reachability and safe generation.

## 3.20 Full Preferred Implementation

The ideal implementation:

1. Full biome definition.
2. Full coordinate mapping.
3. Full town names.
4. Full custom archetype pool.
5. Six archetypes:
   - Firework Field
   - Billboard Maze
   - Monument Plaza
   - Motel Pool Ruins
   - Interstate Cut
   - Gridiron Yard
6. Four structures:
   - Roadside Monument
   - All-Nite Diner
   - Firework Stand
   - Jackalope Lodge
7. Motel Pool as either structure or archetype feature.
8. At least four new animals:
   - Eagle
   - Jackalope
   - Coyote
   - Possum
9. Full juice package:
   - Eagle flyover
   - Dust devils
   - Neon flicker
   - Firework pops
   - Tumbleweeds
   - Heat shimmer
   - Gridiron crowd roar
   - Monument sparkle
   - Entry sting
10. Fairness and determinism tests.

## 3.21 Acceptance Criteria

Liberty Badlands is complete when:

1. A player can enter the biome and immediately distinguish it from Ember Waste, Jade Peak Province, and Verdigris Basin.
2. The color palette reads as red desert, white scars, blue neon.
3. At least one room makes the player laugh without a dialogue box.
4. At least one room feels strangely beautiful.
5. Eagle flyover exists.
6. Diner or monument exists.
7. Billboards or gridiron yard exists.
8. The biome remains navigable and fair.
9. The implementation does not reference real-world USA directly.
10. The design feels like a worthy answer to Jade Peak Province.

---

# Appendix A — Recommended Flavor Constants

## Billboard Lines

```ts
const LIBERTY_BILLBOARD_LINES = [
  'EAT PIE',
  'NEXT EXIT: DESTINY',
  'GAS / BAIT / PROPHECY',
  'EAGLES ARE WATCHING',
  'TRY THE MEAT',
  'YOU MISSED THE TURN',
  'REAL FREEDOM, REAL FAST',
  'BLESSED ARE THE HUNGRY',
  'PIE. GAS. FORGIVENESS.',
  'TURN BACK FOR BISCUITS',
  'THE DINER IS OPEN',
  'ONE MORE EXIT',
  'MONUMENT AHEAD MAYBE',
  'VACANCY IN YOUR SOUL',
] as const;
```

## Ambient One-Liners

```ts
const LIBERTY_AMBIENT_LINES = [
  'Red earth, white scars, blue neon.',
  'The diner lights are still on.',
  'The billboards know where you are.',
  'An eagle screams at nothing in particular.',
  'The monument plaque has faded into prophecy.',
  'The road continues, despite all available evidence.',
  'Every exit promises food, fuel, and forgiveness.',
  'The desert is open twenty-four hours.',
  'A tumbleweed crosses with legal confidence.',
  'The pool is blue in a way nature did not request.',
] as const;
```

## Monument Plaque Lines

```ts
const LIBERTY_MONUMENT_LINES = [
  'This plaque commemorates a conflict between hunger, property, and weather.',
  'Nobody agrees what the monument means, but everyone agrees it has a parking lot.',
  'The stone is warm, official, and slightly for sale.',
  'The inscription has faded into something legally distinct from prophecy.',
  'A civic bird seems to have judged you from above.',
] as const;
```

## Diner Lines

```ts
const LIBERTY_DINER_LINES = [
  'The diner is open. It has always been open.',
  'The coffee tastes like speed limit violations.',
  'The waitress calls you honey in a way that counts as a binding contract.',
  'The pie rotates slowly behind glass, gathering power.',
  'The jukebox knows one song and several crimes.',
] as const;
```

---

# Appendix B — One-Sentence North Star

If implementation gets messy, return to this:

> **Liberty Badlands is the America biome: a red desert of civic ghosts, diner neon, eagle flyovers, billboard prophecy, gridiron ritual, fireworks, jackalopes, and sunburnt freedom — ridiculous, playable, and weirdly gorgeous.**

