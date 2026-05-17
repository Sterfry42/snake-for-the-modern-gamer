## Japan Biome Concept: "Jade Peak Province" (翡翠の山脈)

A biome spanning a mountainous region with cherry blossom groves, ancient shrines, bamboo forests, and a distant snow-capped peak. Danger level: 4/10 (moderate, with skilled enemies).

### Biome Design

**Coordinates:** A new region in the world grid, e.g., `y >= -5 && y <= -8 && x >= -4 && x <= 2`

- **Visual palette:** Soft pinks and whites (cherry blossoms), deep greens (bamboo), warm reds (torii gates), muted grays (stone lanterns)
- **Hue:** ~345 (pink-red range), saturation: 0.22, lightness: 0.22
- **Temperature:** "Serene" (no hazard) in upper areas, "Biting" (cold hazard) near the peak
- **Enemy fire bias:** 0, **Enemy move bias:** 1 (agile, precise)
- **Animal spawns:** koi (5x), crane (3x), tanuki (3x), fox (kitsune, 2x), kappa (2x)

---

### Room Archetypes

1. **Cherry Blossom Garden** (common) -- Open rooms with pink petal ground tiles, stone lanterns, and small ponds
2. **Bamboo Thicket** (common) -- Dense vertical walls (`#`) representing bamboo stalks, narrow corridors between them
3. **Shrine Courtyard** (uncommon) -- A sacred space with torii gate entrance (`T` tiles forming arch), shrine building, offering altar, clean stone floor (`E` tiles)
4. **Onsen Village** (uncommon) -- Hot spring village with warm tile tiles, wooden bathhouse, relaxing safe zone
5. **Mountain Pass** (rare) -- High-altitude choke-point rooms with snow/ice, wind hazards, dramatic drops
6. **Tatami Dojo** (rare) -- Structured combat training room with symmetrical layout, wall-sense mechanics

---

### New Structures

1. **Shrine** (new structure type, like village/quest house)
   - Torii gate entrance, main hall, offering box (suzumi), shimenawa rope (decorative rope tiles)
   - Houses a **Shrine Maiden NPC** who offers blessings (temporary buffs) in exchange for apples or score
   - Can be a **religion choice** location -- the "Kami" option becomes more flavorful here

2. **Ramen Stand** (variant of market stall)
   - Small wooden stand with steaming bowl decoration
   - Sells **ramen** item that fills hunger completely and gives a small speed boost
   - Run by a **Yokai-disguised-as-human chef NPC** with quirky dialogue

3. **Koi Pond** (decoration + mechanic)
   - Filled with `~` water tiles, koi fish swim through (animal spawns)
   - Eating a special **koi apple** from the pond grants a temporary "flow" state (faster turning, no self-collision for N seconds)

4. **Bamboo Grove** (navigation mechanic)
   - Dense vertical corridors that slow movement temporarily but contain **bamboo shoots** (special collectible)
   - Bamboo shoots can be eaten for a brief invulnerability or crafted into **take-damage items** (trap bamboo)

---

### Japan-Themed Apples

1. **Mochi Apple** -- Soft, squishy. Makes the snake temporarily wider (easier to eat, harder to avoid death). Duration: 5 seconds.
2. **Wasabi Apple** -- Spicy! Burns enemies in a radius but causes the snake to take small damage over 3 ticks. High risk, high reward (kills enemies → killstreak points).
3. **Yuzu Apple** -- Citrus burst. Reveals all walls in a 5-tile radius and gives a speed boost for 4 seconds. Great for navigation in bamboo thickets.
4. **Umbrella Apple (Amacha)** -- Special event apple. Summons a random **tanuki NPC** who offers a quest or trades for score.

---

### Japan-Themed Items

1. **Ofuda** (warding talisman) -- Consumable that negates one death (like phoenix charge but single-use, stackable)
2. **Katana** -- Equippable that grants a one-time wall-smite ability (cut through one wall segment)
3. **Geta** (wooden sandals) -- Footwear cosmetic that also grants +1 movement speed on bamboo tiles
4. **Furoshiki** (wrapping cloth) -- Carrying item that temporarily stores one collected apple for later consumption
5. **Senbei** (rice cracker) -- Cheap consumable from ramen stand that fills some hunger

---

### Japan-Themed Quests

1. **"The Shrine Maiden's Request"** -- Deliver 10 apples to the shrine maiden. Reward: ofuda + shrine blessing (temporary wall-sense boost)
2. **"Tanuki's Shenanigans"** -- Find a mischievous tanuki NPC hiding in the bamboo grove. Reward: furoshiki + bonus score
3. **"Kappa's Challenge"** -- A kappa blocks the mountain pass. Defeat him in a duel (or bring him a cucumber). Reward: unique card + katana blueprint
4. **"Seven Dragon Temples"** -- Exploration quest. Find 7 hidden shrine rooms scattered across the biome. Reward: permanent speed upgrade + cosmetic hat ("Dragon Helm")
5. **"Ramen Recipe Hunt"** -- Collect 3 rare ingredients from different biome areas to complete the master chef's ramen. Reward: permanent hunger resistance + "Master Broth" cosmetic

---

### Japan-Themed NPCs & Encounters

1. **Shrine Maiden (Miko)** -- Friendly merchant. Sells blessings and ofuda. Dialogue is serene but hints at ancient powers.
2. **Yokai Chef** -- Hides behind ramen stand. Dialogue is humorous -- constantly slips up about being a yokai ("I mean, I'm very human, I promise. *burps smoke*")
3. **Kappa** -- Water yokai. Appears near koi ponds. Can duel or trade. Hostility scales with player's water resistance stat.
4. **Tanuki** -- Trickster. Appears randomly with shenanigan quests. Rewards are sometimes better, sometimes worse than expected.
5. **Ronin Wanderer** (duel encounter) -- A wandering samurai who challenges the player. If defeated, drops katana blueprint. If you lose, lose score.
6. **Tengu** (rare encounter) -- Bird-like mountain spirit. Grants a temporary flight buff for 10 seconds if you bring it a cherry blossom branch.

---

### Japan-Themed Cards

1. **Oni Card** -- Summons a temporary enemy that attacks other enemies (friendly chaos)
2. **Kitsune Card** -- Creates 3 illusory snakes that distract nearby enemies for 5 seconds
3. **Samurai Card** -- Instantly kills one enemy on the board
4. **Jizo Card** -- Places a stone statue that blocks enemy movement in a radius for 8 seconds
5. **Raiju Card** -- Lightning strike that damages all enemies in a line

---

### Japan-Themed Religion/Choice

Add **"Kami"** as a new religion option in the religion choice system:

- **Mods:**
  - `shrineBlessing: true` -- Periodically grants a random small buff (speed, wall-sense, hunger resistance)
  - `yokaiInsight: true` -- Can see yokai disguises in dialogue
  - `spiritualLength` -- Gains +1 length every 30 seconds passively
- **Tradeoff:** Lower base wall-sense and no starting invulnerability bonus

---

### Japanese-Flavored Goblin Camp Variant

**"The Tengu Camp"** -- A replacement for goblin camps in this biome:
- Tengu "chieftain" as the merchant NPC (taller, bird-like, more intimidating)
- Red-and-black color palette instead of typical goblin greens
- Dialogue is more formal, less crude
- Sells unique Japan-themed items and cards
- Quest giver instead of guard goblins

---

### Tile Characters for New Elements

| Tile | Meaning |
|---|---|
| `P` | Cherry blossom petal (decorative, walkable) |
| `L` | Stone lantern (already used, but re-themed) |
| `T` | Torii gate arch (already used, but re-themed) |
| `S` | Shimenawa rope (sacred boundary, decorative) |
| `K` | Koi fish (animal spawn tile) |
| `B` | Bamboo wall (thicker, harder to break through) |
| `O` | Onsen water (warm tile, reduces cold hazard) |

---

### Integration Points in Code

- **`biomes.ts`** -- Add `'jade-peak-province'` biome definition
- **`biomes.ts:getBiomeForRoom()`** -- Add coordinate condition for the new region
- **`roomArchetypes.ts`** -- Add `'cherry-garden'`, `'shrine-courtyard'`, `'bamboo-thicket'`, `'tatami-dojo'`
- **`structures/`** -- Add `shrine.ts`, `ramanStand.ts` (or extend market stall)
- **`apples/behaviors/`** -- Add `mochiApple.ts`, `wasabiApple.ts`, `yuzuApple.ts`
- **`npcs/encounters.ts`** -- Add tengu, kappa, ronin, tanuki encounters
- **`quests/definitions/`** -- Add 5 new quest definitions
- **`cards/`** -- Add 5 new card definitions
- **`items.ts`** or `itemRegistry.ts` -- Add ofuda, katana, geta, furoshiki, senbei
- **`religionChoice.ts`** -- Add "Kami" religion option
