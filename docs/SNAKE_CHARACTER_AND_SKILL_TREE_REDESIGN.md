# Snake for the Modern Gamer
# Character Creation, Skill Tree, Buildcraft, and Skill Tree UI Redesign
## Product Requirements and Technical Design

**Repository:** `Sterfry42/snake-for-the-modern-gamer`  
**Target branch reviewed:** `main`  
**Document status:** Implementation design  
**Primary systems affected:** Character creation, SPECIAL and derived statistics, skill progression, skill effects, save migration, pause-menu UI, achievement-tree viewport infrastructure, existing gameplay feature integrations, tests, localization

---

# 1. Executive Summary

This document defines a comprehensive redesign of character creation and the skill tree in **Snake for the Modern Gamer**.

The current game already contains a remarkably broad collection of mechanics:

- Classic Snake movement, growth, food, score, self-collision, walls, rooms, and death.
- Momentum stacks, surges, phasing, trails, and speed-oriented play.
- Hearts, extra-life charges, collision protection, invulnerability, and regeneration.
- Mana, spells, spell slots, Arcane Pulse, Arcane Veil, and magical equipment.
- Hunting, Hunt Momentum, Rend, Frenzy, animal food, fish, and cooking.
- Tail shedding, decoys, length expenditure, length gain, and food-based growth.
- Companions, followers, romance, marriage, children, factions, towns, shops, merchants, reputation, and relationship state.
- Archaeology, artifacts, fishing, cards, caves, biomes, bosses, quests, crime, guilds, equipment, consumables, and other world systems.
- A fully implemented achievement tree with panning, zooming, masking, controller navigation, node selection, details, and root recentering.

The redesign must **connect and reorganize these systems**, not replace them with a second layer of invented generic RPG mechanics.

The new model is:

- **Background** provides a small, permanent statistical identity, usually with a tradeoff.
- **Class** provides one concrete starting advantage, normally an existing item, existing mechanic unlock, or existing skill-tree perk.
- **Faith** provides one distinctive blessing rooted respectfully and literally in the selected faith.
- **SPECIAL** contributes to the player’s base identity.
- **Derived Stats** serve as the shared quantitative output layer for SPECIAL, backgrounds, faiths, equipment, status effects, and perks.
- **The Skill Tree** contains almost all build complexity and is reorganized around actual playstyles:
  - Momentum
  - Survival
  - Arcane
  - Growth
  - Predator
  - Fellowship
- **Late forks** create clear specializations.
- **Late combo perks** connect two branches through existing mechanics.
- **Quantitative perks remain allowed**, but only when the number is large, exciting, and build-defining.
- **The Skill Tree UI** becomes a pannable and zoomable map using shared infrastructure extracted from the achievement tree.

The new tree should answer:

> What kind of snake am I becoming?

It should no longer feel like a catalog of unrelated implementation flags, score bonuses, timer reductions, or instant-growth purchases.

---

# 2. Repository Findings and Current-State Assessment

## 2.1 Technology and structure

The repository is a TypeScript game using Phaser 3 and Vite. The project already includes Vitest, type checking, build validation, and a growing set of modular gameplay systems.

The current skill tree is principally defined in:

- `src/systems/skillTree.ts`
- `src/systems/skillTypes.ts`
- `src/systems/skillEffects.ts`

The current achievement viewport is principally implemented in:

- `src/ui/achievementTreeOverlay.ts`
- supporting modules under `src/achievements/`

The current save format already includes:

- `religionId`
- `religionMods`
- `classId`
- `classMods`
- `backgroundId`
- `backgroundMods`
- `special`
- level progression
- inventory
- equipment
- flags

This is important: the redesign does not need to invent persistence concepts for starting identity. It needs to regularize and migrate the existing ones.

## 2.2 Current skill definition model

`src/systems/skillTree.ts` currently defines branches using structures equivalent to:

```ts
interface RankConfig {
  readonly description: string;
  readonly cost: number;
  readonly effects: readonly SkillEffect[];
}

interface BranchNodeConfig {
  readonly id: string;
  readonly title: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly ranks: readonly RankConfig[];
  readonly requires?: readonly string[];
}

interface BranchConfig {
  readonly id: string;
  readonly label: string;
  readonly nodes: readonly BranchNodeConfig[];
}
```

The public perk definition in `src/systems/skillTypes.ts` already supports:

- stable perk IDs
- titles and short labels
- branch IDs
- rank descriptions
- rank costs
- explicit positions
- prerequisite lists
- effects by rank

This is a strong base. The redesign should preserve the stable data-driven definition model while making it more expressive.

## 2.3 Current effect model

The current `SkillEffect` union includes:

- `tickDelayScalar`
- `extraLifeCharge`
- `scoreMultiplier`
- `scoreMultiplierBonus`
- `setFlag`
- `instantGrow`
- `manaEnable`
- `manaUpgrade`
- `unlockArcanePulse`
- `unlockArcaneVeil`
- `registerSpell`
- `statModifier`
- `unlockMechanic`
- `placeholder`

The effect system is sufficient for the current tree but not ideal for the redesigned one.

The largest problem is not that `setFlag` exists. Feature flags are useful for qualitative mechanics. The problem is that `setFlag` currently carries too much opaque configuration and makes it difficult to:

- validate effect compatibility;
- inspect what modifies a derived stat;
- migrate perks safely;
- describe interactions in UI;
- test stacking;
- distinguish permanent unlock state from run-time resource state;
- expose a perk’s mechanical tags to combo perks;
- understand whether two perk effects overwrite or merge.

The redesign should keep a generic escape hatch but introduce typed effects and typed modifier sources for common progression behavior.

## 2.4 Current branch assessment

The present tree includes more than the five branches discussed earlier. The current file contains branches including:

- Momentum
- Fortitude
- Arcana
- Harvest
- Predation
- Traversal
- Geometry

Some of these contain excellent mechanics. The branch names and perk distributions, however, reflect incremental feature development rather than coherent build archetypes.

### Momentum

Strong existing mechanics:

- Momentum gauge.
- Momentum stacks gained on straightaways.
- Surges.
- Surge invulnerability.
- Surge phasing.
- Turn retention.
- Trails.
- Surge cooldown and consumption.
- Score tied to momentum.
- Forgiveness for sharp pivots.

Weaknesses:

- Too many later perks simply adjust stack maximums, thresholds, timers, duration, cooldown, score per stack, or fractional trail score.
- Several nodes feel like ranks of one hidden configuration object rather than distinct perks.
- The branch has a good core gameplay loop but insufficiently readable specialization.

Disposition:

- **Keep Momentum as a core branch.**
- Preserve the gauge, surges, phasing, turn commitment, and trails.
- Remove or combine small timer/stack/score tuning nodes.
- Create a late fork between sustained control and explosive surge expenditure.

### Fortitude

Strong existing mechanics:

- +1 max heart.
- Extra-life charges.
- Regeneration.
- Self-collision protection.
- Stored apple vitality.
- Post-food invulnerability.
- Phoenix rebirth.

Weaknesses:

- “Fortitude” is narrower and less player-readable than “Survival.”
- Blood Bank currently converts a stored food resource primarily into score, which is mechanically disconnected from the survival fantasy.
- Warded Stride and Starlit Beacon are upgrades to timer values rather than new decisions.
- Second Wind currently has multiple ranks that simply grant more life charges.
- Phoenix overlaps with ordinary extra lives without a sufficiently distinct post-revival state.

Disposition:

- **Rename and rebuild as Survival.**
- Keep hearts, life charges, collision protection, regeneration, stored vitality, and Phoenix.
- Move food/body-resource interactions that are primarily about length into Growth.
- Convert Blood Bank into meaningful stored recovery.
- Turn Phoenix into a transformative resurrection capstone or specialization endpoint.

### Arcana

Strong existing mechanics:

- Unlocking mana.
- Mana maximum and regeneration.
- Arcane Pulse.
- Arcane Veil.
- Spell registration and spell slots elsewhere in the codebase.
- Existing magical equipment, shrines, and artifacts.

Weaknesses:

- Three sequential nodes are mostly increasing max mana and regeneration.
- Spellforge is another max-mana/regen node despite its title implying slot manipulation.
- Astral Nova gives an apple score multiplier unrelated to the Arcane fantasy.
- Arcane Veil is already a cross-branch prerequisite perk requiring `secondWind`, showing that combo prerequisites are technically compatible with the current system.
- Arcane Pulse is hardcoded as a special skill-tree spell while the broader game now has a spell ecosystem.

Disposition:

- **Keep Arcane as a core branch.**
- Keep mana enablement, spell handling, Arcane Pulse where useful, overcasting, slot manipulation, spell sequencing, and Arcane Veil.
- Remove redundant mana-upgrade ladder nodes.
- Do not make the tree a catalog of spells. Spells should primarily be found, bought, learned, equipped, or otherwise acquired through existing world systems.
- Use the tree to alter how casting works.

### Harvest

Strong existing mechanics:

- Shed.
- Spending length.
- Decoy chunks.
- Instant growth.
- Food-related growth.
- Long-body fantasy.

Weaknesses:

- Most of the branch is currently repeated instant-growth purchases and small apple score multipliers.
- “Harvest” implies farming or apple collection rather than the uniquely Snake-specific body economy that the best perk, Shed, creates.
- Purchasing length is not a lasting build identity.
- Several poetic perk names do not correspond to meaningful new mechanics.

Disposition:

- **Replace Harvest with Growth.**
- Keep Shed and body-resource manipulation.
- Remove most instant-grow nodes.
- Build the branch around:
  - length as a spendable resource;
  - stored nutrition;
  - remaining enormous;
  - shedding;
  - decoys;
  - sacrificial body mechanics;
  - transformation and regrowth.

### Predation

Strong existing mechanics:

- Hunt Momentum.
- Chained feasts.
- Rend charges.
- Frenzy.
- Room-entry continuity.
- Finishers.
- Food from animals.
- Hunting system elsewhere in the game.

Weaknesses:

- Many nodes tune stack windows, decay, stack maximum, fractional score, Frenzy duration, and trigger threshold.
- Score is often the main reward for predation rather than meat, recovery, resources, target control, or combat utility.
- Hunting is prominent in the branch despite being only one part of the broader game.

Disposition:

- **Keep the underlying systems but rename/reframe the branch as Predator.**
- Hunting becomes an ingredient, not the entire branch.
- Preserve mark/pursuit, Hunt Momentum, Rend, Frenzy, and finishers.
- Create a readable late fork:
  - Pursuit
  - Ambush
- Predator should interact with animals, hostile actors, bosses, meat, fish where appropriate, and marked targets.

### Traversal

Strong existing mechanics:

- Death marker.
- Clearing a corridor on room entry.
- Phase ticks on room entry.
- Pulling apples toward a lane.
- Ghost shield charges.
- Projecting lanes into future rooms.
- Room-entry effects.

Weaknesses:

- Traversal is largely a map convenience and room-transition effects branch, not a sufficiently strong build identity.
- Several perks grant passive score on room entry.
- Several perks are incremental corridor width, duration, or fractional echo score.
- The most exciting parts—phasing, ghost protection, route creation—overlap strongly with Momentum and Survival.
- Death Marker is utility progression and may belong outside the main combat/build tree.

Disposition:

- **Remove Traversal as a dedicated core branch.**
- Rehome:
  - room-entry phasing into Momentum;
  - ghost shield into Survival or Momentum;
  - corridor creation and environment manipulation into Growth or specific world unlocks;
  - Death Marker into baseline map progression, an achievement reward, a class benefit, or a low-cost general utility unlock outside branch investment.
- Do not preserve the branch solely to avoid deleting existing code.

### Geometry

Strong existing mechanics:

- Camp Cook.
- Wall sensing.
- Temporary masonry.
- Eating walls.
- Seismic apple effects.
- Fault-line corridor carving.
- Wall creation/control.

Weaknesses:

- Camp Cook is unrelated to geometry and currently sits in the branch due to historical accretion.
- Geometry contains several genuinely fun world-manipulation mechanics but they do not form a clean general RPG build without more support.
- “Bite through walls,” masonry, seismic pulses, and corridor carving could become a future dedicated Terraformer/Worldshaper branch, but the current redesign should avoid adding a seventh branch without enough integration work.
- The branch would compete with Momentum and Growth for traversal and body-space mechanics.

Disposition:

- **Remove Geometry as a launch branch in this redesign.**
- Rehome:
  - Camp Cook into Survival, Predator, a class perk, or a baseline recipe unlock.
  - Acidic Fangs into Growth or Predator as a late specialization/utility perk.
  - Seismic Pulse into Growth if apple/body expansion is the cause.
  - Masonry, Fault Line, and Collapse Control into a future Worldshaper branch or world-system unlock.
  - Wall Whisper can become a baseline accessibility/map perk, equipment effect, or class option.
- Preserve implementation hooks where they are fun; do not force every existing mechanic to remain in the first redesigned tree.

---

# 3. Product Goals

## 3.1 Primary goals

1. Make the skill tree the game’s principal buildcraft layer.
2. Make every branch represent a recognizable player fantasy.
3. Make early perks easy to understand.
4. Introduce forks only after the branch’s core loop is established.
5. Reward cross-branch experimentation with a limited number of explicit combo perks.
6. Favor qualitative rule changes over small numerical modifiers.
7. Preserve occasional large quantitative perks.
8. Keep character creation lightweight.
9. Reuse concrete existing items and systems.
10. Reuse achievement-tree camera behavior for the skill-tree UI.
11. Preserve save compatibility through explicit migration.
12. Keep definitions data-driven and testable.
13. Make perk descriptions explain decisions rather than implementation internals.

## 3.2 Secondary goals

- Give classes occasional access to a starting perk.
- Give faiths occasional access to a starting perk where the thematic match is strong.
- Ensure starting perks do not break prerequisite logic.
- Make skill-tree progress legible in achievements and Archipelago checks.
- Improve controller and touch usability.
- Prepare the architecture for later expansion without requiring immediate implementation of every possible branch.

## 3.3 Non-goals

This redesign will not:

- Turn character creation into a multi-page tabletop character builder.
- Give every background unique quests, contacts, dialogue trees, and reputation.
- Give every class a large kit of items and passive effects.
- Add a complex religious-favor simulation.
- Remove all numbers from perks.
- Preserve every existing perk name.
- Preserve every current branch.
- Add invented generic “farming tools,” “hunting kits,” “archaeology tools,” or “studied lore” when no concrete repository item or system exists.
- Make every pair of branches have a combo perk.
- Require permanent mutually exclusive fork choices.
- Add random procedural skill trees.
- Copy/paste the achievement overlay wholesale.

---

# 4. Core Design Principles

## 4.1 Existing-mechanics-first

Every proposed starting option and skill should be evaluated in this order:

1. Can it use an existing mechanic?
2. Can it grant or modify an existing item?
3. Can it expose an existing system earlier?
4. Can it connect two existing systems?
5. Only then: does a new mechanic need to be created?

A proposal such as “Hunter starts with hunting gear” is unacceptable unless the exact item IDs are present in `itemRegistry`.

A proposal such as “Archaeologist begins with Archaeology unlocked” is acceptable if Archaeology is already represented by an existing mechanic flag or progression entry.

A proposal such as “Mage begins with Arcane Initiate” is acceptable because class-to-perk grants are part of this design.

## 4.2 Build decisions over upgrade chores

A perk should normally do one of the following:

- unlock a verb;
- change a rule;
- create a conditional loop;
- create or expose a resource;
- connect systems;
- permit a major sacrifice;
- create a major threshold;
- strongly alter risk/reward.

Examples:

- Surges can be manually spent to phase through a collision.
- Overcasting consumes length before health.
- Killing marked prey restores mana.
- A companion can repeat the first spell after its cooldown.
- Excess food becomes stored vitality.
- One self-collision is deflected and sheds part of the tail.
- +1 life charge.
- +1 spell slot.
- Double mana capacity.
- +1 companion capacity.

Non-examples:

- +0.6 mana regeneration.
- +0.1 score per Momentum stack.
- +5% apple score.
- +2 decay grace.
- +3 invulnerability ticks as a standalone late perk.
- +1 corridor width as a standalone late perk.

## 4.3 Quantitative perks must be emotionally legible

A number may remain when the player immediately feels it.

Acceptable:

- +1 Heart.
- +1 Life Charge.
- +1 Spell Slot.
- +1 Companion Capacity.
- Double mana regeneration under a condition.
- Maximum mana doubled.
- Regenerate one segment every few seconds while critically short.
- Surges last twice as long.
- Stored nutrition capacity doubled.
- Marked elites count as three prey for Hunt Momentum.

Unacceptable:

- Fractional score drip.
- Small score multipliers.
- Tiny cooldown improvements buried among multiple nodes.
- Multiple consecutive max-mana upgrades.
- Instant growth purchases that do not affect later play.

## 4.4 Forks must be readable

A fork is valid only if it can be stated as a plain contrast.

Examples:

- Momentum: **Sustain the Surge** vs **Spend the Surge**
- Survival: **Prevent Damage** vs **Recover from Damage**
- Arcane: **Prepared Casting** vs **Overcasting**
- Growth: **Stay Huge** vs **Spend Length**
- Predator: **Pursuit** vs **Ambush**
- Fellowship: **Inner Circle** vs **Wide Network**

The player should not need to inspect five future nodes to understand the choice.

## 4.5 Forks are specialization costs, not permanent lockouts

By default, taking one side does not permanently prohibit the other.

Instead:

- each route has its own prerequisite;
- purchasing both requires additional points;
- reaching a capstone may require one completed route;
- a small number of mutually exclusive keystones may be supported later, but they are not the default.

This allows unusual hybrid builds without making every player identical.

## 4.6 Combo perks use shared language

A combo perk requires one named key perk from each relevant branch and creates one clear interaction.

Example:

```text
Overcast (Arcane) + Controlled Shedding (Growth)
→ Blood Magic: Overcasting consumes length before hearts.
```

It should not introduce a new unrelated meter.

---

# 5. Character Creation Redesign

# 5.1 Character creation responsibilities

Character creation contains:

1. Background
2. Class
3. Faith
4. SPECIAL allocation or confirmation
5. Derived-stat preview
6. Final summary

Character creation should usually take less than one minute for a returning player.

The screen should show concrete effects and avoid lore-heavy paragraphs.

## 5.2 Background

### Purpose

Background answers:

> What statistical history shaped this snake?

### Rule

A background normally grants:

- one SPECIAL increase;
- one SPECIAL decrease;
- occasionally a more extreme two-up/one-down profile;
- rarely a tiny derived-stat effect if a SPECIAL tradeoff cannot express the identity.

### Recommended initial background set

The exact values require balance tests, but the initial design should resemble:

#### Noble

- +2 Charisma
- -1 Endurance

Rationale: socially prepared, physically sheltered.

#### Urchin

- +2 Agility
- -1 Charisma

Rationale: quick and resourceful, poorly received.

#### Scholar

- +2 Intelligence
- -1 Strength

Rationale: learned, physically weak.

#### Soldier

- +2 Strength
- -1 Luck

Rationale: disciplined force, less dependent on chance.

#### Hermit

- +2 Perception
- -1 Charisma

Rationale: observant, isolated.

#### Criminal

- +2 Luck
- -1 Charisma

Rationale: survives through nerve and opportunity, suffers social suspicion.

#### Laborer

- +2 Endurance
- -1 Intelligence

Rationale: durable and practical, less formally educated.

#### Garden Snake

- +1 Perception
- +1 Agility
- -1 Strength

Rationale: the occasional literal snake joke. This should be the exception, not the naming convention.

### Background requirements

- Background definitions must be data-driven.
- Each background must expose exact SPECIAL deltas.
- Validation must prevent illegal final SPECIAL values.
- The UI must preview resulting SPECIAL and derived stats.
- Background effects must be saved by stable ID.
- Background deltas must be recomputable rather than stored as an opaque mutable object.
- Old `backgroundMods` save data must be migrated or interpreted safely.
- Background must not grant a full skill-tree perk in the launch redesign.
- Background must not grant multiple items, quests, or companions.

## 5.3 Class

### Purpose

Class answers:

> What does this snake already know how to do?

### Rule

A class grants exactly one primary starting advantage:

- one existing item;
- one existing mechanic unlock;
- or one existing skill-tree perk at rank one.

A class may include a cosmetic title or description, but no secondary package unless balance testing proves the option is unusable.

### Candidate class set

The exact class list must be grounded against current item and mechanic IDs during implementation.

#### Runner

Primary grant:

- Rank 1 of the Momentum entry perk.

Use existing perk-grant infrastructure. Do not invent running shoes unless an exact item exists and is preferable.

#### Mage

Primary grant:

- Rank 1 of the Arcane entry perk.

This unlocks mana/casting infrastructure but should not automatically grant a full spell library.

#### Hunter

Primary grant:

- Rank 1 of the Predator entry perk or existing Hunting mechanic unlock.

Selection depends on whether the hunting system already has a clean top-level unlock separate from the redesigned tree.

#### Survivor

Primary grant:

- Rank 1 of the Survival entry perk.

Do not also grant hearts and an item.

#### Archaeologist

Primary grant:

- Existing Archaeology mechanic unlocked.

This is a strong class option because Archaeology already exists as a substantial game system.

#### Angler

Primary grant:

- A concrete existing basic fishing rod from `itemRegistry`, or the fishing mechanic if rods are already naturally available and the mechanic itself is gated.

The implementation must use the exact registered item ID.

#### Cook

Primary grant:

- Existing `Camp Cook` functionality, relocated from Geometry.

This should either be represented as:
- a starting perk;
- an existing recipe unlock;
- or a mechanic flag.

#### Merchant

Primary grant:

- A real existing shop/economy advantage, preferably a Fellowship entry or merchant-specific mechanic.

Do not implement a generic undefined “merchant kit.”

### Class-to-perk grant behavior

Classes that grant a perk must:

- mark the perk as owned at rank one;
- not deduct score or skill currency;
- satisfy prerequisites for downstream nodes;
- display a source badge such as `Granted by Class: Runner`;
- remain owned if the player later changes loadout screens;
- serialize through a general `grantedPerks` or source-aware ownership model;
- avoid granting the same perk twice if class and faith overlap;
- preserve the perk if the class is loaded from an old save;
- recompute perk effects consistently after load.

A granted perk is not a temporary discount. It is owned.

## 5.4 Faith

### Purpose

Faith answers:

> What singular blessing changes how this snake approaches the world?

### Rule

Faith normally grants one meaningful blessing.

Faith may occasionally grant an existing skill-tree perk where the theological concept and game mechanic align cleanly.

The implementation tone must be:

- literal;
- warm;
- mechanically playful;
- respectful;
- not based on insult or intelligence penalties;
- not framed as one faith being mechanically “correct.”

### Faith design standard

The humor should come from translating a major religious idea into game logic.

#### Christianity

Recommended blessing:

- +1 Life Charge.

This is a direct resurrection joke and already maps to an existing mechanic.

Do not also grant Survival perks.

#### Islam

Recommended blessing concept:

- Fasting / restraint.

Mechanically:

- When eligible food is available and the player voluntarily goes a meaningful duration without eating, a **Fast** state builds.
- The next eligible meal becomes **Iftar** and receives a substantial benefit.
- The effect must not reward simply being unable to find food.
- The player must have passed at least one edible target, declined a prompted meal, or otherwise met a reliable “food was available” condition.
- Taking damage should not necessarily cancel the fast.
- Eating any qualifying food consumes the Fast state.
- The benefit should be meaningful and not just score.

Recommended first implementation:

> After voluntarily passing at least three edible food opportunities without eating, the next meal restores one heart if missing; otherwise it grants a strong temporary derived-stat blessing.

Alternative implementation:

> Voluntarily abstaining while food is available charges Restraint. The next meal doubles its healing/growth effect and clears negative hunger-related effects.

The implementation should use simple state and clear UI. Avoid simulating real-world prayer schedules or calendar dates.

#### Hinduism

Recommended blessing concept:

- Reincarnation.

Possible effect:

> After consuming a life charge, retain one temporary blessing or choose one of three run buffs.

This should be mechanically distinct from Christianity’s straightforward extra life.

#### Buddhism

Recommended blessing concept:

- Meditation / stillness / nonattachment.

Possible effect:

> Remaining still in a safe location for a short period clears one negative status and accelerates regeneration.

The effect must work with Snake gameplay and not require prolonged boring inactivity during active danger.

#### Judaism

Recommended blessing concept:

- Sabbath / rest / rhythm.

Possible effect:

> The first full rest or safe-town recovery after a substantial journey grants an enhanced recovery and temporary protection.

Avoid knowledge or money stereotypes.

#### Sikhism

Recommended blessing concept:

- Service and protection.

Possible effect:

> Helping, escorting, healing, or rescuing another actor builds a protection charge that can be spent to shield a companion or the player.

This can interact with Fellowship but should remain one blessing.

#### Shinto

Recommended blessing concept:

- Kami / shrines.

Possible effect:

> The first shrine blessing in each biome offers an additional choice or lasts substantially longer.

Use the existing shrine/blessing systems.

### Faith requirements

- Faith definitions must have stable IDs.
- Faith effects must be explicit, typed, and testable.
- Faith should not use small percentage bonuses.
- Faith must not hardcode offensive stereotypes.
- Faith descriptions should contain both a thematic sentence and exact mechanical text.
- Faith perks and class perks may grant existing tree nodes, but most faiths should use distinct blessings.
- Faith effects must feed derived stats when quantitative.
- Temporary faith state must be saved only when appropriate.
- The selected faith must remain optional if the game currently supports a no-faith option.

## 5.5 SPECIAL

SPECIAL remains a base identity system.

The redesign does not require every quantitative effect to be represented as SPECIAL.

Instead:

```text
SPECIAL
Background
Faith
Class
Equipment
Statuses
Perks
World effects
    ↓
Derived-stat resolver
    ↓
Final runtime values
```

SPECIAL is one input among several.

### Requirements

- SPECIAL values must be represented by a typed state.
- Background deltas must apply through the same resolver used by the preview and runtime.
- Perks may modify SPECIAL only when the perk fantasy is genuinely about the core attribute.
- Most perk numbers should modify derived stats or mechanics directly.
- The final character-creation panel must show both SPECIAL and derived stats.
- Tooltips must explain which sources contribute to a derived stat.

## 5.6 Derived stats

The repository should establish one authoritative derived-stat aggregation layer.

Candidate derived stats include, based on existing mechanics:

- Maximum hearts
- Life-charge capacity
- Maximum mana
- Mana regeneration
- Movement/action interval
- Momentum gain
- Momentum retention
- Surge duration
- Damage mitigation
- Regeneration interval
- Food healing
- Growth from food
- Shop pricing or inventory quality
- Companion capacity
- Companion recovery
- Relationship gain where necessary
- Hunting detection or mark duration
- Stored nutrition capacity

Not every current feature must become a derived stat. Qualitative booleans such as `canEatWalls` remain mechanics.

### Source model

Every quantitative modifier should identify a source:

```ts
interface StatModifier {
  id: string;
  sourceType:
    | 'special'
    | 'background'
    | 'class'
    | 'faith'
    | 'perk'
    | 'equipment'
    | 'status'
    | 'world';
  sourceId: string;
  stat: DerivedStatId;
  operation: 'add' | 'multiply' | 'overrideMin' | 'overrideMax' | 'set';
  value: number;
  priority?: number;
}
```

### Requirements

- Deterministic ordering.
- No accidental double application after load.
- Ability to inspect breakdown in UI and tests.
- Clear clamping.
- Stable behavior when a source disappears.
- No perk should directly mutate a base value irreversibly when it can be recomputed.
- Instant rewards such as one-time growth remain transactions and are not modifiers; however, most current instant-growth perks will be removed.

---

# 6. New Skill Tree Overview

## 6.1 Launch branches

The redesigned launch tree has six branches:

1. Momentum
2. Survival
3. Arcane
4. Growth
5. Predator
6. Fellowship

Traversal and Geometry do not remain as launch branches.

## 6.2 General branch shape

Each branch should contain approximately:

- 1 entry perk
- 2 universal core perks
- 1 readable fork
- 2–3 perks on each fork
- 1 branch capstone or two route capstones
- 1–3 combo nodes positioned at branch edges

Target size:

- 8–11 native perks per branch
- 6–10 total combo perks across the whole tree
- approximately 55–70 visible nodes at launch

This is large enough for buildcraft but still readable on a pannable map.

## 6.3 Rank policy

Default:

- Most perks have one rank.
- A small number of foundational quantitative perks may have two ranks.
- No perk should have three ranks merely to distribute incremental numeric upgrades.
- Rank two must substantially alter or complete the perk, not add 5%.

Examples of valid rank two:

- Extra life rank one grants +1 life; rank two changes revival to return at full health.
- Mana well rank one unlocks mana; rank two doubles capacity.
- Companion capacity rank one adds one companion; rank two allows a second only at a very high investment.

Examples of invalid rank two:

- +0.6 mana regen.
- +2 Momentum decay delay.
- +5% apple score.

## 6.4 Currency and cost curve

The current tree purchases perks using score. The redesign may retain score as the skill currency if it is already deeply integrated, but the product should explicitly decide whether score is:

- both run score and progression currency;
- spent permanently;
- spent within a run;
- refunded on respec;
- persisted across saves.

The current implementation calls `getScore()` and `addScore()` from the runtime and stores perk ranks, indicating score is directly consumed by purchases.

Requirements:

- Define whether skill purchases are permanent save progression or run progression.
- If permanent, consuming run score can create awkward save/load behavior and should be reconsidered.
- If run-based, class-granted perks and branch achievements must clearly reset or persist as intended.
- The redesign should not change currency semantics invisibly.
- Cost curves must be rebalanced after node count and effect magnitude are known.
- Combo perks should cost more than ordinary route perks.
- The UI must show:
  - current cost;
  - owned/granted status;
  - source of grant;
  - prerequisites;
  - refundable status if respec exists.

---

# 7. Branch Design: Momentum

## 7.1 Fantasy

> Build speed through committed movement, then either preserve that state or spend it for spectacular effects.

## 7.2 Existing mechanics retained

- Momentum stacks.
- Straightaway gain.
- Turn retention.
- Surge threshold.
- Surge duration.
- Surge cooldown.
- Surge stack consumption.
- Surge invulnerability.
- Surge phasing.
- Trails.
- Quick-pivot forgiveness.

## 7.3 Existing mechanics removed or consolidated

Remove as standalone late perks:

- fractional score per stack;
- +4 surge score;
- +0.25 trail score;
- minor threshold reductions;
- repeated duration/cooldown tuning;
- isolated decay-delay tuning.

These can be:
- folded into the entry configuration;
- represented by derived stats;
- attached to major route perks;
- or removed.

## 7.4 Proposed tree

### M0 — Swift Scales

Entry perk.

Effect:

- Unlock Momentum.
- Moving several steps without reversing or colliding builds Momentum.
- At full Momentum, enter Surge.

This replaces the current three-rank Swift Scales with one clear mechanic unlock.

### M1 — Cornering Instinct

Universal core.

Effect:

- One sharp turn no longer immediately breaks Momentum.
- The forgiveness refreshes after moving straight for a short distance.

Preserves the readable part of Hyper Reflex.

### M2 — Slipstream

Universal core.

Effect:

- Passing close to a wall, hazard, enemy, or self-segment without colliding adds Momentum.
- Must use existing collision-distance logic and avoid per-frame expensive scanning.

This creates skill expression rather than passive timer improvement.

## 7.5 Fork

### Route A: Flow

Identity:

> Sustain Momentum through difficult navigation.

#### M3A — Wind Shear

- Turns retain substantially more Momentum.
- Turning during Surge creates a short trail that may affect pursuit, hazards, or score only if score remains a relevant branch output.
- The trail should be a real world object or tagged effect, not a fractional score ticker.

#### M4A — Phase Stride

- A Surge permits one pass through a wall, hazard, or self-segment.
- Consuming the pass ends phasing but not necessarily the Surge.
- Define excluded hazards and boss boundaries.

#### M5A — Unbroken Line

- Taking nonlethal damage consumes Momentum instead of ending the Surge.
- The amount consumed is substantial.
- This should not replace lives or hearts indefinitely.

#### M6A — Endless Road

Route capstone.

- While the player keeps moving and continues successful near-misses, Surge can extend beyond its normal limit.
- Extension has diminishing returns or increasing risk.
- A collision ends the state.

### Route B: Impact

Identity:

> Build Momentum, then deliberately cash it out.

#### M3B — Overclock

- Add a manual Surge activation when above a threshold.
- Manual activation consumes all current Momentum and scales duration/effect with stacks spent.

#### M4B — Hard Turn

- Making a sharp turn during manual Surge ends the Surge and produces a shockwave, trail, wall break, or enemy-control effect.
- Use existing environment or enemy hooks.
- Exact output can vary by current equipment or other perks only where simple.

#### M5B — Terminal Velocity

- The first collision during a high-stack manual Surge becomes an impact event:
  - break a wall;
  - damage or stun enemies;
  - shed length rather than die;
  - or consume a collision charge.
- It must not trivialize map boundaries or scripted boss walls.

#### M6B — Kinetic Release

Route capstone.

- Manually ending a full Surge unleashes a powerful effect proportional to distance traveled during that Surge.
- This must have a visual telegraph and cooldown.

## 7.6 Momentum combo hooks

- Arcane: casting during Surge.
- Predator: moving toward marked prey.
- Growth: shedding during Surge.
- Survival: consuming Momentum to avoid damage.
- Fellowship: companions using Momentum trails or courier-style benefits.

---

# 8. Branch Design: Survival

## 8.1 Fantasy

> Endure mistakes, scarcity, hazards, and lethal situations through preparation, adaptation, and recovery.

## 8.2 Existing mechanics retained

- Hearts.
- Life charges.
- Regeneration.
- Self-collision protection.
- Invulnerability.
- Phoenix revival.
- Cooking where survival-oriented.
- Hazard resistance hooks from biomes/equipment.
- Stored apple vitality, redesigned.

## 8.3 Proposed tree

### S0 — Thick Scales

Entry perk.

Effect:

- +1 maximum heart.

This is intentionally quantitative and significant.

### S1 — Second Wind

Universal core.

Effect:

- At critical health, temporarily trigger strong regeneration or a recovery window.
- This is not another life charge.
- Cooldown must be visible.

### S2 — Fieldcraft

Universal core.

Effect:

- Unlock basic cooking of eligible raw animal food and fish at existing cooking sources.
- Relocate current Camp Cook functionality here.
- Use existing recipes and interaction points.

## 8.4 Fork

### Route A: Bulwark

Identity:

> Prevent or redirect damage.

#### S3A — Hardened Scales

- Negate one self-collision.
- When triggered, either:
  - shed a fixed amount of length;
  - lose stored vitality;
  - or enter a short vulnerable state.
- Charge refresh condition must be clear, such as resting in a safe location.

#### S4A — Adaptive Scales

- Surviving a status or biome hazard grants temporary resistance to that hazard type.
- Must use existing hazard IDs/tags rather than hardcoded branches.

#### S5A — Warded Body

- Food or a full heal grants one ward charge.
- The ward blocks one eligible hit, not a timer measured in obscure ticks.

#### S6A — Immovable

Route capstone.

- When at full health and above a minimum length, the first lethal collision consumes a large amount of length and leaves the player alive at one heart.
- This naturally combines with Growth.

### Route B: Renewal

Identity:

> Recover after harm and transform near-death states into momentum.

#### S3B — Blood Bank

- Excess healing from food becomes Stored Vitality.
- Stored Vitality is automatically spent when injured or manually spent through a clear control.
- Capacity should be shown on HUD.
- Remove score payout.

#### S4B — Regenerator

- Regenerate length or health under a meaningful condition:
  - below half health;
  - after avoiding food;
  - while moving;
  - or while outside combat.
- The effect should be strong enough to notice.

#### S5B — One More Chance

- +1 life charge.

This remains a major quantitative perk.

#### S6B — Phoenix Frame

Route capstone.

- On life-charge revival:
  - return with a brief powerful Phoenix state;
  - clear negative statuses;
  - emit an area effect;
  - gain temporary phasing or invulnerability;
  - prevent immediate chain death.
- The state must be visually distinct.

## 8.5 Survival combo hooks

- Growth: length as armor.
- Arcane: mana as a death-negation resource.
- Predator: meat/kill recovery.
- Momentum: consume Momentum instead of a ward.
- Fellowship: bonded actor rescue.

---

# 9. Branch Design: Arcane

## 9.1 Fantasy

> Discover spells in the world and build a casting style around preparation, sequencing, sacrifice, and magical defense.

## 9.2 Existing mechanics retained

- Mana.
- Mana regeneration.
- Spell registry.
- Spell slots.
- Arcane Pulse if it remains useful.
- Arcane Veil.
- Shrines, artifacts, items, and shop access to magic.
- Primary ability binding only where compatible with the current input model.

## 9.3 Key rule

The skill tree does not grant a long list of spells.

Spells primarily come from:

- world discovery;
- shrines;
- artifacts;
- quests;
- shops;
- NPCs;
- equipment;
- classes where appropriate;
- existing spell-registration systems.

The tree modifies casting rules.

## 9.4 Proposed tree

### A0 — Mana Bloom

Entry perk.

Effect:

- Unlock mana.
- Unlock spell-slot UI if not already available.
- Establish base capacity and regeneration through derived stats.

### A1 — Spellbook

Universal core.

Effect:

- Enable equipping discovered spells into slots.
- If this is already baseline, replace with +1 spell slot.

### A2 — Arcane Pulse

Universal core or optional side node.

Effect:

- Retain existing Arcane Pulse only if it fills a clear universal role.
- It should not monopolize the primary ability binding if the spell system already uses that binding.
- Consider converting it into:
  - a default zero-slot spell;
  - a mana discharge;
  - or a spell interaction node.

## 9.5 Fork

### Route A: Prepared

Identity:

> Use a controlled spell loadout efficiently and combine distinct spells.

#### A3A — Prepared Caster

- Swap one equipped spell outside the normal safe location or cost.
- Requires UI support.

#### A4A — Spellweaver

- Casting spells with different tags in succession builds Weave.
- At the threshold, the next spell gains a bonus based on tags.
- Use existing or newly standardized spell tags.

#### A5A — Empty Mind

- Empty spell slots improve the spells that remain equipped.
- This creates a small-loadout build.

#### A6A — Master of the Pattern

Route capstone.

- Completing a full sequence of distinct spell tags refunds or echoes the opening spell.
- Must prevent infinite loops.

### Route B: Channeler

Identity:

> Cast beyond safe limits by sacrificing other resources.

#### A3B — Overcast

- Allow casting without enough mana.
- The missing mana is paid in health or another explicit resource.
- The player must receive a warning.

#### A4B — Spark Reservoir

- A large quantitative perk:
  - double maximum mana;
  - or gain a reserve mana bar that does not regenerate naturally.
- Choose one clean model.

#### A5B — Wild Magic

- Overcasting produces a secondary randomized effect drawn from a constrained, safe table.
- It must not destroy quest-critical actors or create unwinnable states.

#### A6B — Astral Nova

Route capstone.

- Spending a large percentage of maximum mana in a short period primes an Astral Nova.
- The Nova should be a major area or world effect, not an apple score multiplier.

## 9.6 Arcane defense side node

### Arcane Veil

- Requires Mana Bloom and a Survival perk such as One More Chance or Warded Body.
- Automatically spends a large amount of mana to negate lethal damage.
- This remains an explicit combo perk rather than a pure Arcane endpoint.

## 9.7 Arcane combo hooks

- Growth: pay length for overcast.
- Predator: marked kills restore mana.
- Momentum: cast without breaking Surge.
- Fellowship: familiar or partner spell assistance.
- Survival: mana shield.

---

# 10. Branch Design: Growth

## 10.1 Fantasy

> Treat the snake’s body, length, food, and shed skin as an economy.

This is the branch most unique to the game.

## 10.2 Existing mechanics retained

- Shed.
- Tail-cost abilities.
- Decoy chunks.
- Length.
- Apple and food growth.
- Animal food.
- Regeneration of segments.
- Temporary body objects.
- Large-snake thresholds.

## 10.3 Existing mechanics removed

Remove most perks whose only effect is instant growth on purchase.

A one-time +2 or +3 segments is not a build.

Remove small apple score multipliers from this branch.

## 10.4 Proposed tree

### G0 — Controlled Shedding

Entry perk.

Effect:

- Unlock Shed.
- Spend a clear amount of length to leave a decoy or body object.
- Preserve the current decoy implementation where practical.
- Add HUD/input discoverability.

### G1 — Reserve Nutrition

Universal core.

Effect:

- Excess food growth fills a Stored Nutrition resource.
- Stored Nutrition is distinct from Survival’s Stored Vitality:
  - Nutrition fuels growth/body abilities.
  - Vitality heals or protects.
- If two meters create excessive UI, merge them through typed modes or choose one branch to own the shared meter.

### G2 — Digestive Choice

Universal core.

Effect:

- On consuming eligible food, choose or cycle between:
  - immediate growth;
  - stored nutrition;
  - recovery where existing food supports it.
- Keep controls simple and default-safe.

## 10.5 Fork

### Route A: Colossus

Identity:

> Remain enormous and gain advantages from body size.

#### G3A — Overgrown

- Crossing major length thresholds grants visible benefits.
- Benefits should be qualitative where possible:
  - body blocks projectiles;
  - intimidation;
  - wider pickup radius;
  - stronger wall interaction;
  - companion shelter;
  - larger seismic effects.

#### G4A — Rooted Colossus

- At extreme length and low speed, gain collision resistance or environment control.
- Reuse the existing Rooted Colossus name if desired, but replace instant +5 length.

#### G5A — World Serpent

- Room transitions preserve body influence, project tail effects, or create a safe corridor.
- Rehome the best Traversal lane concept here if technically feasible.

#### G6A — Too Big to Fail

Route capstone.

- Lethal damage sheds a large body portion instead of killing the player, subject to cooldown and minimum length.
- This is distinct from Survival’s own prevention because it is powered specifically by size.

### Route B: Metamorphosis

Identity:

> Spend length repeatedly to create effects and then regrow.

#### G3B — Living Decoy

- Shed chunks attract enemies, rivals, or hazards.
- Use existing actor targeting hooks.

#### G4B — Molted Arsenal

- Different contexts change what shed material becomes:
  - obstacle;
  - decoy;
  - ward;
  - explosive magical object with Arcane combo;
  - companion food only if thematically safe.

#### G5B — Rapid Regrowth

- After intentionally spending length, food and regeneration restore length dramatically faster for a short window.
- Does not trigger from ordinary damage unless explicitly tagged.

#### G6B — Ouroboros

Route capstone.

- Length intentionally spent accumulates as potential.
- At a threshold, the next growth event is massively amplified or triggers a transformation.
- Must prevent infinite spend/regrow loops.

## 10.6 Growth combo hooks

- Survival: length before hearts.
- Arcane: length-powered casting.
- Momentum: shed a trail during Surge.
- Predator: devour remains to feed regrowth.
- Fellowship: shared meals and companion interaction.

---

# 11. Branch Design: Predator

## 11.1 Fantasy

> Identify prey, control the hunt, and turn pursuit or ambush into a chain of kills, food, and power.

## 11.2 Existing mechanics retained

- Hunting.
- Hunt Momentum.
- Rend.
- Frenzy.
- Marking/tracking where available.
- Meat and animal food.
- Enemy and animal kills.
- Finishers.
- Room-entry continuity only where the hunt actually continues.

## 11.3 Proposed tree

### P0 — Predator Instinct

Entry perk.

Effect:

- Unlock prey marking and/or the existing Hunting system.
- Wounded or eligible prey become easier to track.
- Define what counts as prey through tags.

### P1 — Hunt Momentum

Universal core.

Effect:

- Killing or consuming marked prey within a readable window builds Hunt Momentum.
- Remove fractional score as the principal output.
- HUD displays stacks and expiration.

### P2 — Rend

Universal core.

Effect:

- Chained prey actions create Rend charges.
- Rend is spent on a meaningful next attack, bite, collision, or finisher.

## 11.4 Fork

### Route A: Pursuit

Identity:

> Chase targets continuously and carry the hunt forward.

#### P3A — Blood Scent

- Wounded marked prey leave a trail and remain marked through limited room transitions.

#### P4A — Relentless

- Moving toward marked prey slows Hunt Momentum decay.
- Reversing away or resting ends the benefit.

#### P5A — Feeding Frenzy

- Eating eligible meat during Hunt Momentum extends Frenzy and restores a useful resource.
- Avoid pure score payout.

#### P6A — Apex Pounce

Route capstone.

- Spend full Hunt Momentum during Frenzy to perform the existing finisher concept.
- Reward may include:
  - major damage;
  - guaranteed Rend;
  - food drop;
  - growth;
  - resource refill.
- Keep a cooldown.

### Route B: Ambush

Identity:

> Prepare, isolate, and strike before prey can respond.

#### P3B — Still Hunter

- Remaining unnoticed or moving slowly prepares Ambush.
- The UI must show readiness.

#### P4B — Isolate

- Marked targets separated from allies become vulnerable to stronger Rend or control.
- Requires actor-neighbor queries.

#### P5B — First Blood

- The first successful strike on unaware prey triggers a major effect.
- Bosses receive a reduced but meaningful version.

#### P6B — Perfect Predator

Route capstone.

- A successful Ambush can immediately enter Frenzy or transfer the mark to another nearby target.
- Prevent infinite chains on trivial spawned entities.

## 11.5 Predator combo hooks

- Momentum: chase acceleration.
- Arcane: spell-applied marks and mana from prey.
- Growth: consume remains for stored nutrition.
- Survival: meat recovery at critical health.
- Fellowship: companion participation in hunts.

---

# 12. Branch Design: Fellowship

## 12.1 Fantasy

> Become powerful through companions, romance, merchants, towns, factions, reputation, family, and a world of people who know you.

Fellowship must be substantial. It is not a “companion damage” branch.

## 12.2 Existing systems used

- Companions/followers.
- Relationship state.
- Dates.
- Lovers.
- Marriage.
- Children.
- Shops and item inventories.
- Merchants.
- Towns.
- Factions.
- Guilds.
- Reputation.
- Quests.
- Actor memories and relationship events.
- Existing achievement and save hooks.

## 12.3 Shared concept: Connection

A character becomes a **Connection** when an existing relationship reaches a meaningful threshold or state.

Connection categories:

- Companion
- Romantic partner/spouse
- Family
- Merchant
- Town/faction representative
- Quest or guild contact

The system must not flatten all relationship state into one number. It provides a common tag for perks.

## 12.4 Proposed tree

### F0 — People Person

Entry perk.

Effect:

- Unlock Connection status and show it in relationship/shop/town UI.
- Existing high relationships may immediately qualify after load.

### F1 — Favors Owed

Universal core.

Effect:

- Connections can provide one service appropriate to their role.
- Examples:
  - companion rescue;
  - merchant special order;
  - faction safe passage;
  - spouse recovery;
  - town healing or lodging.
- Use typed service providers.

### F2 — Introductions

Universal core.

Effect:

- A Connection can improve initial standing with related actors, shops, or factions.
- This should reduce repetitive early relationship grinding without replacing interactions.

## 12.5 Fork

### Route A: Inner Circle

Identity:

> A few deeply bonded characters provide powerful direct benefits.

#### F3A — Pack Tactics

- Companion actions against the same target prime coordinated effects.
- Avoid a flat small damage bonus.

#### F4A — Better Half

- A spouse or designated romantic partner shares one compatible capability.
- Examples:
  - partial mana support;
  - recovery;
  - mark participation;
  - cooking;
  - shop/network role.
- Must use partner tags/abilities and not assume every spouse is a combat companion.

#### F5A — Nobody Left Behind

- A nearby deeply bonded companion can prevent the player’s death once, becoming incapacitated or consuming a relationship-specific resource.
- Must not kill permanent story actors unexpectedly.

#### F6A — Chosen Family

Route capstone.

- Inner Circle members inherit one tagged support effect from the player’s build.
- The inherited effect is explicit and restricted to compatible tags.

### Route B: Wide Network

Identity:

> Many useful relationships turn the world into infrastructure.

#### F3B — Preferred Customer

- Connected merchants reserve a special inventory slot.
- This is not merely a discount.

#### F4B — Special Order

- Request an item category from an eligible connected merchant.
- The item arrives after an existing time/room/event condition.
- Respect item rarity and progression gates.

#### F5B — Good Word

- Reputation with one allied town/faction partially carries to related groups.
- Connections can reveal rumors, quests, locations, or demand.

#### F6B — Everybody Knows Somebody

Route capstone.

- Networked shops, towns, and factions interact:
  - shared special stock;
  - remote services;
  - travel aid;
  - safe lodging;
  - faction mediation;
  - merchant referrals.
- Keep effects deterministic and debuggable.

## 12.6 Fellowship combo hooks

- Arcane: familiar assistance or magical special orders.
- Predator: Pack Hunt.
- Survival: rescue and shared recovery.
- Momentum: courier/network effects or companions using trails.
- Growth: shared meals and food gifting.

---

# 13. Combo Perk Design

## 13.1 General requirements

- Combo perks appear late.
- Each requires at least one named perk from two branches.
- Requirements are displayed with branch colors and icons.
- A combo perk lives visually between the two branches.
- It does not belong exclusively to one branch for completion counting.
- It may count toward both branches only if achievement logic explicitly defines that; default is neither.
- It uses existing resources.
- It has one clear interaction.

## 13.2 Launch combo set

### C1 — Arcane Veil
**Arcane + Survival**

Requirements:
- Mana Bloom
- Warded Body or One More Chance

Effect:
- Automatically spend a large amount of mana to negate lethal damage.
- Leaves the player at one heart or consumes the hit entirely.
- Has a cooldown or once-per-rest limit.

### C2 — Blood Magic
**Arcane + Growth**

Requirements:
- Overcast
- Controlled Shedding

Effect:
- Missing mana from Overcast consumes length before hearts.
- Cannot reduce below a safe minimum length.
- HUD previews the cost.

### C3 — Spellrush
**Arcane + Momentum**

Requirements:
- Spellweaver or Prepared Caster
- Swift Scales

Effect:
- Casting during Surge does not break it.
- Casting distinct spell tags extends Surge slightly, with a cap.

### C4 — Witch Hunt
**Arcane + Predator**

Requirements:
- Spellweaver or Overcast
- Predator Instinct

Effect:
- Damaging spells mark eligible prey.
- Killing marked prey restores mana.

### C5 — Ablative Mass
**Growth + Survival**

Requirements:
- Overgrown or Reserve Nutrition
- Hardened Scales

Effect:
- Eligible damage removes length before hearts.
- Does not apply to all scripted deaths.

### C6 — Slipstream Molt
**Growth + Momentum**

Requirements:
- Controlled Shedding
- Wind Shear or Overclock

Effect:
- Shedding during Surge creates an active trail or obstacle.
- Trail behavior depends on Growth route, not a new meter.

### C7 — Devour
**Growth + Predator**

Requirements:
- Reserve Nutrition
- Hunt Momentum

Effect:
- Consuming prey remains during a hunt feeds Stored Nutrition and extends the chain.

### C8 — Relentless Pursuit
**Predator + Momentum**

Requirements:
- Blood Scent
- Swift Scales

Effect:
- Moving toward marked prey builds Momentum faster.
- Entering Surge refreshes the active mark once.

### C9 — Pack Hunt
**Predator + Fellowship**

Requirements:
- Hunt Momentum
- Pack Tactics

Effect:
- Eligible companion attacks contribute to marking and Hunt Momentum.
- Prevent abuse from rapid low-damage summons.

### C10 — Shared Feast
**Growth + Fellowship**

Requirements:
- Digestive Choice
- Favors Owed or Better Half

Effect:
- Certain food effects are partially shared with nearby bonded actors.
- Gifted food improves relationship state using existing systems.

### C11 — Guardian Bond
**Survival + Fellowship**

Requirements:
- Warded Body or One More Chance
- Nobody Left Behind

Effect:
- Wards can be transferred between the player and a bonded companion.
- Define auto/manual behavior.

### C12 — Road Company
**Momentum + Fellowship**

Requirements:
- Slipstream
- Pack Tactics or Good Word

Effect:
- Companions follow Momentum trails more effectively, or fast travel/courier tasks improve network services.
- Select the version that best matches current companion movement code.

## 13.3 Combo restraint

Do not implement all twelve automatically.

The launch target should be 6–10 combos selected by:

- current system readiness;
- implementation cost;
- clarity;
- testability;
- usefulness to multiple builds.

Arcane Veil should likely remain because a cross-branch implementation already exists conceptually.

---

# 14. Current Perk Disposition Matrix

The implementation should create a complete machine-readable migration table. The following is the design disposition.

## 14.1 Momentum current perks

| Current perk | Disposition | New destination |
|---|---|---|
| Swift Scales | Keep and simplify | Momentum entry |
| Wind Shear | Keep concept | Flow route |
| Hyper Reflex | Merge | Cornering Instinct |
| Phase Stride | Keep | Flow route |
| Overclock | Keep, redesign | Impact route |
| Rash Momentum | Remove | Fractional/flat score tuning |
| Quantum Trail | Keep concept, remove score drip | Wind Shear or Slipstream Molt |
| Chrono Surge | Merge/remove | Fold into route capstone or derived stats |

## 14.2 Fortitude current perks

| Current perk | Disposition | New destination |
|---|---|---|
| Thick Scales | Keep | Survival entry |
| Second Wind | Split concepts | Strong recovery perk; extra life becomes One More Chance |
| Regenerator | Keep, conditional redesign | Renewal route |
| Hardened Scales | Keep, add cost/refresh | Bulwark route |
| Blood Bank | Keep name or concept, remove score payout | Renewal route |
| Shield Matron | Redesign as ward charge | Bulwark route |
| Warded Stride | Remove/merge | Warded Body |
| Starlit Beacon | Remove/merge | Regenerator upgrade or capstone |
| Phoenix Frame | Keep and strengthen | Renewal capstone |

## 14.3 Arcana current perks

| Current perk | Disposition | New destination |
|---|---|---|
| Mana Bloom | Keep | Arcane entry |
| Mana Weave | Remove as standalone | Derived stats or Spellweaver |
| Spark Reservoir | Keep name, major redesign | Channeler route |
| Flux Condenser | Remove/merge | Prepared casting or derived stats |
| Arcane Pulse | Keep only if input/role remains useful | Arcane universal/side node |
| Spellforge | Rename/redesign | Slot manipulation |
| Astral Nova | Keep name, replace apple score | Channeler capstone |
| Starlight Veil | Keep concept and rename Arcane Veil | Arcane + Survival combo |

## 14.4 Harvest current perks

| Current perk | Disposition | New destination |
|---|---|---|
| Shed | Keep | Growth entry |
| Tail Forge | Remove instant-growth ranks | Possible future body crafting |
| Verdant Growth | Remove/merge | Rapid Regrowth |
| Gourmand | Redesign | Digestive Choice |
| Nectar Surge | Remove | Small apple score |
| Honeycomb | Remove/repurpose | Possible armor/body perk |
| Orchard Mastery | Remove | Small apple score |
| Seasonal Bloom | Remove | Instant growth |
| Rooted Colossus | Keep name, redesign | Colossus route |
| Other instant-growth nodes | Remove | No replacement unless mechanic exists |

## 14.5 Predation current perks

Current exact names beyond the retrieved segment should be enumerated from `src/systems/skillTree.ts` during implementation.

Known dispositions:

| Current perk | Disposition | New destination |
|---|---|---|
| Score Flow | Rename/redesign | Hunt Momentum |
| Rend-related perk(s) | Keep | Universal Predator |
| Frenzy-related perk(s) | Keep | Pursuit or shared |
| Devourer | Redesign | Devour combo or Predator endpoint |
| Blood Moon | Merge/remove numeric tuning | Pursuit capstone support |
| Pack Instinct | Move/merge | Fellowship combo or Pursuit continuity |
| Apex Pounce | Keep | Pursuit capstone |

## 14.6 Traversal current perks

| Current perk | Disposition | New destination |
|---|---|---|
| Death Marker | Remove from main tree | Baseline map/general utility/class/achievement reward |
| Rift Walker | Rehome concept | Growth Colossus or Momentum |
| Portal Sense | Remove/merge | World navigation system |
| Phase Slip | Rehome | Momentum |
| Echo Step | Rehome concept, remove score drip | Momentum trail |
| Mirror Image | Remove passive room-entry growth | Growth only if body projection is implemented |
| Ghost Skin | Rehome | Survival or Momentum |
| Planar Lattice | Future Worldshaper/Growth | Not launch requirement |
| Event Horizon | Future Worldshaper/Arcane | Not launch requirement |

## 14.7 Geometry current perks

| Current perk | Disposition | New destination |
|---|---|---|
| Camp Cook | Keep | Survival / class |
| Wall Whisper | Utility or equipment | Outside main branch |
| Masonry | Future Worldshaper | Preserve feature flag |
| Acidic Fangs | Growth/Predator late utility | Candidate |
| Seismic Pulse | Growth candidate | Candidate |
| Fault Line | Future Worldshaper | Preserve feature |
| Collapse Control | Future Worldshaper | Preserve feature |
| Other wall manipulation | Future branch or world unlock | Not launch core |

---

# 15. Skill Data Model Redesign

## 15.1 New definition shape

Recommended:

```ts
type SkillBranchId =
  | 'momentum'
  | 'survival'
  | 'arcane'
  | 'growth'
  | 'predator'
  | 'fellowship';

type SkillNodeKind =
  | 'entry'
  | 'core'
  | 'route'
  | 'capstone'
  | 'combo'
  | 'utility';

interface SkillRequirement {
  type: 'perk';
  perkId: string;
  minRank?: number;
}

interface SkillDefinition {
  id: string;
  branch?: SkillBranchId;
  secondaryBranch?: SkillBranchId;
  kind: SkillNodeKind;
  titleKey: string;
  descriptionKey: string;
  shortLabelKey: string;
  iconKey: string;
  tags: readonly string[];
  position: { x: number; y: number };
  requirements: readonly SkillRequirement[];
  ranks: readonly SkillRankDefinition[];
  grantableAtStart?: boolean;
  migrationAliases?: readonly string[];
}
```

## 15.2 Rank definition

```ts
interface SkillRankDefinition {
  cost: number;
  descriptionKey: string;
  effects: readonly SkillEffect[];
}
```

## 15.3 Ownership source

```ts
type SkillOwnershipSource =
  | { type: 'purchase' }
  | { type: 'class'; classId: string }
  | { type: 'faith'; faithId: string }
  | { type: 'migration'; oldPerkId: string }
  | { type: 'debug' };

interface OwnedSkillState {
  rank: number;
  sources: readonly SkillOwnershipSource[];
}
```

A perk may have multiple sources but effects apply only once per rank.

## 15.4 Typed effects

Add typed effects for common behavior:

```ts
type SkillEffect =
  | DerivedStatModifierEffect
  | GrantMechanicEffect
  | GrantLifeChargeEffect
  | GrantSpellSlotEffect
  | RegisterInteractionEffect
  | ConfigureResourceEffect
  | SetFeatureFlagEffect
  | OneTimeTransactionEffect;
```

Use `setFlag` only for feature-specific qualitative state not yet worth a dedicated effect.

## 15.5 Effect tags

Qualitative mechanics should register capabilities through tags:

- `momentum`
- `surge`
- `phase`
- `ward`
- `revival`
- `mana`
- `spell-slot`
- `overcast`
- `shed`
- `stored-nutrition`
- `marked-prey`
- `hunt-momentum`
- `rend`
- `frenzy`
- `connection`
- `companion`
- `merchant-network`

Combo validation can confirm prerequisites actually expose the expected tags.

## 15.6 Runtime state separation

Do not store transient resource state inside static perk configuration flags.

Current patterns such as:

```ts
{
  key: 'fortitude.bloodBank',
  value: { stored: 0, capacity: 4, reward: ... }
}
```

mix:

- configuration;
- runtime resource amount;
- reward definition.

Instead:

```ts
interface BloodBankConfig {
  capacity: number;
  autoSpend: boolean;
}

interface SurvivalRuntimeState {
  storedVitality: number;
}
```

Likewise:

- Momentum configuration and current stacks must be separate.
- Predator configuration and Hunt Momentum current stacks must be separate.
- Phoenix maximum charges and remaining charges must be separate.
- Class/faith grants and current run resources must be separate.

---

# 16. Skill Tree Layout Design

## 16.1 Visual topology

Use six branch regions around a central root or starting ring.

Recommended high-level arrangement:

```text
                ARCANE
          /                 \
   FELLOWSHIP              MOMENTUM

   SURVIVAL                 PREDATOR
          \                 /
                GROWTH
```

Alternative: two horizontal rows of three branches.

The exact arrangement should prioritize:

- readable combo edges;
- minimal connector crossings;
- natural branch color separation;
- central entry points;
- future expansion space.

## 16.2 Branch layout rules

- Entry node nearest the center.
- Universal core nodes move outward in a straight or gently curved line.
- Fork occurs after two core nodes.
- Route A and Route B visibly diverge.
- Route names appear as labels in world space.
- Capstones sit at route extremes.
- Combo nodes sit between neighboring branches.
- Prerequisite lines must not cross unrelated nodes where avoidable.
- Node coordinates are explicit and data-driven.
- Layout should be validated in tests for duplicates and unreasonably short overlaps.

## 16.3 Branch colors

Use existing UI palette conventions but establish a stable color per branch.

Example only:

- Momentum: cyan/blue
- Survival: green
- Arcane: violet
- Growth: gold/leaf
- Predator: red/orange
- Fellowship: rose/teal

Final colors must satisfy contrast and color-blind readability.

Do not rely on color alone. Use:

- iconography;
- route labels;
- line patterns;
- node shapes;
- text.

## 16.4 Node states

- Locked: prerequisites missing.
- Available: prerequisites met and affordable.
- Unaffordable: prerequisites met, cost not met.
- Owned: purchased.
- Granted: owned through class/faith.
- Maxed: all ranks acquired.
- Previewed: currently selected.
- Combo locked: one or both branch prerequisites missing.

The current `SkillPerkStatus` union should be extended or presentation state should derive source badges separately.

---

# 17. Skill Tree UI Redesign

## 17.1 Requirement

Replace the current skill-tree navigation UI with a pannable and zoomable world-space tree that reuses the achievement tree’s interaction architecture.

## 17.2 Existing achievement behavior to reuse

`src/ui/achievementTreeOverlay.ts` already includes:

- a root container;
- a masked tree container;
- a dedicated graphics layer for connections;
- viewport rectangle masking;
- pointer-down drag;
- pointer-move panning;
- pointer-up cancellation;
- wheel zoom;
- cursor-centered zoom;
- explicit zoom-in/out buttons;
- root recenter button;
- controller pan;
- controller zoom;
- directional controller selection;
- center-nearest selection;
- separate details panel;
- selected-node emphasis;
- status-based node styling;
- visibility lifecycle;
- refresh lifecycle.

This behavior should be extracted into shared infrastructure.

## 17.3 Do not directly subclass achievement UI

Achievements and skills differ:

Achievements:
- completion status;
- progress values;
- rewards;
- unavailable nodes may still complete;
- portrait-driven display.

Skills:
- cost;
- rank;
- prerequisites;
- purchase/grant source;
- branch;
- combo requirements;
- confirmation;
- respec;
- affordability;
- effect preview.

Therefore, extract viewport/camera behavior, not achievement-specific content.

## 17.4 Recommended shared component

Create:

- `src/ui/tree/TreeViewportController.ts`
- or `src/ui/core/PannableZoomViewport.ts`

Responsibilities:

- pan state;
- zoom state;
- min/max zoom;
- mask construction;
- screen-to-world conversion;
- cursor-centered zoom;
- drag threshold;
- clamped or soft-bounded panning;
- center-on-point;
- center-on-node;
- controller pan;
- pointer containment;
- teardown of input listeners.

Possible interface:

```ts
interface PannableZoomViewportOptions {
  scene: Phaser.Scene;
  viewport: UiRect;
  parent: Phaser.GameObjects.Container;
  worldOffset: { x: number; y: number };
  minZoom: number;
  maxZoom: number;
  initialZoom: number;
  dragThreshold?: number;
}

interface PannableZoomViewport {
  readonly world: Phaser.GameObjects.Container;
  setVisible(visible: boolean): void;
  handleWheel(pointer: Phaser.Input.Pointer, deltaY: number): boolean;
  handleControllerPan(dx: number, dy: number): boolean;
  handleControllerZoom(delta: number): boolean;
  centerOn(worldX: number, worldY: number, animate?: boolean): void;
  screenToWorld(x: number, y: number): { x: number; y: number };
  destroy(): void;
}
```

## 17.5 Refactor achievement tree

After extraction:

- `AchievementTreeOverlay` uses the shared viewport.
- Behavior and tests remain unchanged.
- Achievement-specific node and detail rendering remain in the overlay.
- Existing `ROOT` behavior calls `viewport.centerOn(rootNodePosition)`.
- Existing wheel behavior remains cursor-centered.
- Existing controller behavior remains supported.

This confirms the shared component is not designed only for the new tree.

## 17.6 New skill tree overlay

Create:

- `src/ui/skillTreeOverlay.ts`
- supporting layout and navigation modules under `src/skills/` or `src/systems/skills/`

Responsibilities:

- build nodes from definitions;
- draw prerequisite and combo connections;
- render branch and route labels;
- show ownership/status;
- present details;
- purchase or rank up;
- show granted source;
- display cost and current currency;
- display effect breakdown;
- support controller/touch/mouse;
- center on branch or owned node;
- preserve camera state while paused.

## 17.7 Details panel

Selected skill details must show:

- Title
- Branch
- Kind: Entry/Core/Route/Capstone/Combo
- Current rank
- Maximum rank
- Exact mechanical description
- Cost
- Prerequisites
- Missing prerequisites
- Owned source:
  - Purchased
  - Class
  - Faith
- Tags/interactions where useful
- Purchase button
- Respec/refund button if supported

Do not expose raw flag keys or tick counts unless ticks are translated into player-understandable time.

## 17.8 Purchase flow

Mouse/touch:

1. Select node.
2. Inspect details.
3. Press Purchase.
4. For high-cost, capstone, combo, or irreversible purchases, show confirmation.
5. Update node and all dependent nodes.
6. Preserve camera.

Controller:

1. Directional selection.
2. Confirm opens/focuses detail action.
3. Confirm purchase.
4. Cancel returns focus to tree.
5. Shoulder/trigger controls may zoom.
6. Right stick pans.

## 17.9 Panning and zoom requirements

- Mouse drag pans.
- Touch drag pans.
- Wheel zoom is centered on cursor.
- Pinch zoom is desirable if Phaser input support is reliable; otherwise not required for first pass.
- Zoom buttons remain available.
- Root or “Center” button recenters.
- Branch tabs may center on branch entry nodes.
- Minimum zoom shows the full six-branch map.
- Maximum zoom permits reading node labels/icons.
- Selection should not accidentally trigger after a drag beyond threshold.
- Pan state should be bounded so the tree cannot be lost permanently.
- Controller selection may auto-pan the selected node into view.

## 17.10 Performance

- Connections are redrawn only when layout/status/zoom requires it.
- Node containers are created once and refreshed.
- Text should not be regenerated every frame.
- World-space route labels should be cached.
- Masks must be destroyed on overlay teardown.
- Scene-level input listeners must be unregistered.
- Avoid a per-node update loop.
- Large future trees should remain practical.

## 17.11 Accessibility

- Branch identity cannot rely solely on color.
- Text scaling should respect existing UI scaling settings.
- Zoom buttons must be keyboard/controller accessible.
- Node detail text must wrap.
- A list mode is not required for launch but architecture should not prevent one.
- Locked node descriptions should remain visible unless secrecy is intentional.
- Exact costs and prerequisites must be readable.
- Animation should respect reduced-motion settings if such a setting exists.

---

# 18. Starting Options UI

## 18.1 Flow

Recommended character-creation steps:

1. Background
2. Class
3. Faith
4. SPECIAL
5. Summary

The player may move backward without losing choices.

## 18.2 Option cards

Each option card shows:

- Name
- One-sentence flavor
- Exact effect
- Existing icon or generated fallback
- Any granted perk/item with linkable tooltip
- Preview changes

## 18.3 Summary

The final screen shows:

- Background and tradeoff
- Class and starting grant
- Faith and blessing
- SPECIAL
- Derived-stat changes
- Starting owned perks highlighted on a mini branch overview
- Confirm

## 18.4 Validation

- Prevent invalid combinations only when technically necessary.
- Duplicate grants do not create extra ranks unless explicitly stated.
- If two sources grant the same rank-one perk:
  - mark both sources;
  - apply the rank once;
  - optionally convert the duplicate into a defined compensation only if designed.
- Do not silently waste a selection. Preferred initial rule:
  - character creation warns about duplicate perk grants and asks the player to change one selection.
- Background tradeoffs must not reduce SPECIAL below minimum.
- Preview and actual runtime values must share code.

---

# 19. Save Data and Migration

## 19.1 New save fields

Recommended:

```ts
interface CharacterIdentitySaveData {
  backgroundId: string | null;
  classId: string | null;
  faithId: string | null;
  baseSpecial: SpecialStatsState;
}

interface SkillTreeSaveDataV2 {
  version: 2;
  owned: Record<string, OwnedSkillState>;
  runtime?: {
    // Only persistent resources that genuinely survive save/load.
  };
}
```

## 19.2 Existing fields

Existing:

- `religionId`
- `religionMods`
- `classId`
- `classMods`
- `backgroundId`
- `backgroundMods`

Migration:

- `religionId` maps to `faithId`.
- Known IDs map through aliases.
- Unknown IDs remain preserved in a compatibility field and default safely.
- Opaque mods are not blindly trusted.
- Known old mods are translated to typed effects.
- New derived values are recomputed.

## 19.3 Old perk migration

Create:

```ts
const LEGACY_SKILL_MIGRATIONS: Record<
  string,
  { targetId?: string; compensation?: number; note: string }
>;
```

Principles:

- Preserve meaningful unlocks where possible.
- Do not convert every old filler perk one-for-one.
- If an old perk is removed:
  - refund its spent cost;
  - or grant a skill-point/score credit;
  - or map it to a nearby meaningful perk.
- Do not grant multiple new capstones because the player bought several old numeric upgrades.
- Old branch completion achievements must be reevaluated against new definitions.
- Save migration must be idempotent.

## 19.4 Suggested mappings

- `swiftScales` → new `momentum.swiftScales`
- `phaseStride` → new `momentum.phaseStride`
- `thickScales` → new `survival.thickScales`
- `secondWind` rank:
  - first old rank may map to `survival.oneMoreChance`;
  - second old rank may refund or grant a second rank only if supported.
- `regenerator` → new `survival.regenerator`
- `hardenedScales` → new `survival.hardenedScales`
- `phoenixFrame` → new `survival.phoenixFrame`
- `manaBloom` → new `arcane.manaBloom`
- old mana-only upgrades → refund into currency or map one to `arcane.sparkReservoir`
- `arcanePulse` → new Arcane Pulse if retained
- `starlightVeil` → `combo.arcaneVeil` only when prerequisites or migration policy allow
- `shed` → new `growth.controlledShedding`
- old instant-growth perks → refund
- current Predation core unlocks → new Predator equivalents
- Traversal/Geometry mechanics:
  - preserve feature unlocks only if rehomed;
  - otherwise refund and retain a legacy feature flag only when removing it would break the save.

## 19.5 Migration UX

On loading a migrated save:

- show a one-time summary:
  - “Your skill tree has been rebuilt.”
  - number of mapped perks;
  - number of refunded purchases;
  - where to review the new tree.
- Do not overwhelm with every internal ID.
- Save a migration-complete version marker.

---

# 20. Integration Requirements

## 20.1 Momentum system

- Current momentum config flags should be replaced or wrapped by a typed config resolver.
- Current stacks and Surge state remain runtime.
- Perk effects add capabilities, not overwrite giant config objects.
- Near-miss detection requires performance review.
- Momentum and room transitions must work consistently.
- Mobile and controller input must not make sharp-turn perks unreliable.

## 20.2 Health and lives

- Consolidate heart maximum sources:
  - base;
  - SPECIAL;
  - background;
  - faith;
  - perks;
  - equipment.
- Extra-life charges need:
  - current;
  - maximum;
  - source breakdown;
  - reset behavior.
- Christianity’s +1 life and Survival’s +1 life must stack under an explicit cap.
- Phoenix triggers must have priority relative to:
  - Arcane Veil;
  - equipment such as Phoenix Charm;
  - Archipelago DeathLink behavior;
  - companion rescue;
  - ordinary life charges.

Define a deterministic lethal-hit resolution order.

Recommended:

1. Scripted unavoidable death bypass, if explicitly tagged.
2. Temporary invulnerability/ward.
3. Collision-specific prevention.
4. Arcane Veil.
5. Fellowship rescue.
6. Growth length sacrifice.
7. Life charge.
8. Phoenix post-revival enhancement.
9. Death.

The exact order may change, but it must be explicit and tested.

## 20.3 Mana and spells

- Mana enablement must be idempotent.
- Class-granted Mana Bloom must initialize current mana correctly.
- Derived-stat changes must update max/current mana safely.
- Spell tags should be standardized if Spellweaver is implemented.
- Overcast cost preview must be available.
- Arcane Veil must not recursively trigger.
- World-acquired spells must remain independent of tree migration.

## 20.4 Growth and body

- Define minimum functional snake length.
- Define which length is spendable.
- Shed must not corrupt body arrays or room transitions.
- Decoy chunks need lifecycle and save policy.
- Stored Nutrition needs HUD, persistence, and cap.
- Length-as-armor must distinguish intentional spend from collision truncation.
- Body effects must work with raccoon/alternate character modes or be hidden/disabled where not applicable.

## 20.5 Predator and hunting

- Define prey tags across:
  - animals;
  - hostile actors;
  - rivals;
  - bosses;
  - summoned entities.
- Hunt Momentum must not be farmable from disposable spawns.
- Companion kills need attribution.
- Marks need room-transition and save behavior.
- Rend must have one authoritative charge state.
- Frenzy visuals and HUD should be clear.
- Cooking and meat drops should use existing inventory items and recipes.

## 20.6 Fellowship

- Connection qualification must use existing relationship data.
- Merchant Connection requires stable merchant identity.
- Shops must support reserved or special-order stock without corrupting ordinary inventory.
- Companion capacity must respect current follower limits.
- Spouse and family systems must not assume combat presence.
- Rescue perks must not permanently kill or remove important NPCs unless designed.
- Network effects must remain deterministic after save/load.
- Reputation spread must avoid making hostile/crime systems meaningless.
- Archipelago and achievements listening to relationship events must continue working.

## 20.7 Shops and items

- Every class item grant must use `getItem`/item registry validation.
- No string-only unknown items.
- Special orders must filter:
  - progression-locked items;
  - quest items;
  - unique artifacts;
  - Archipelago-controlled items where relevant.
- Merchant perks should add inventory behavior rather than only discounts.

## 20.8 Achievements

Update skill-related achievements.

Current achievements include branch completion concepts.

New definitions should include:

- Buy first skill.
- Reach a branch fork.
- Complete one specialization route.
- Unlock a combo perk.
- Complete a branch.
- Build across three branches.
- Possibly acquire a perk through class or faith, but avoid trivial automatic achievements unless desired.

Achievement UI continues using shared viewport infrastructure after refactor.

## 20.9 Archipelago

Review existing AP checks for:

- one branch complete;
- all branches complete.

The redesign changes branch count and node topology.

Requirements:

- Stable location keys should not be silently reused for different meaning unless backward compatibility is intended.
- Update AP metadata and validation.
- Decide whether combo perks count toward branch completion.
- Percentage goals should use updated enabled achievements.
- Starting class/faith perks should not incorrectly send purchase checks unless the check means ownership rather than purchase.

---

# 21. Localization

All new player-facing strings must use i18n.

Do not embed final English descriptions directly in skill definitions.

Keys should cover:

- branch names;
- route names;
- perk titles;
- short labels;
- perk descriptions;
- rank descriptions;
- source labels;
- cost labels;
- prerequisite labels;
- character creation options;
- faith explanations;
- migration notices;
- UI help.

Descriptions must avoid tick jargon.

Example:

Bad:

> Gain +4 phase ticks on room entry.

Good:

> Entering a new room briefly lets you pass through hazards.

Exact durations may be displayed in seconds in an advanced line.

---

# 22. Testing Requirements

## 22.1 Definition validation

Tests must verify:

- unique perk IDs;
- valid branch IDs;
- valid positions;
- valid requirements;
- no cycles;
- all combo nodes have two branches;
- all grantable starting perks are rank-one safe;
- rank descriptions match rank count;
- cost count matches rank count;
- effect count matches rank count;
- all icon and localization keys exist;
- branch fork structure is readable according to declared route metadata.

## 22.2 Purchase tests

- Cannot buy locked perk.
- Cannot buy unaffordable perk.
- Purchase deducts correct currency.
- Purchase applies effect once.
- Rank up applies only delta.
- Duplicate source grant does not double-apply.
- Class grant satisfies prerequisites.
- Faith grant satisfies prerequisites.
- Combo perk requires both sides.
- Buying both fork routes is allowed unless explicitly exclusive.
- Capstone requirement works.

## 22.3 Derived-stat tests

- Source aggregation order.
- Add/multiply interaction.
- Clamping.
- Removal.
- Save/load recomputation.
- Duplicate source protection.
- Background preview equals runtime.
- Equipment and perk stacking.
- Faith and class stacking.

## 22.4 Branch mechanics tests

Momentum:
- gain;
- turn forgiveness;
- Surge activation;
- manual cash-out;
- phasing;
- near miss;
- combo casting.

Survival:
- heart increase;
- ward;
- collision protection;
- stored vitality;
- extra life;
- lethal resolution order;
- Phoenix state.

Arcane:
- mana enablement;
- max/current updates;
- slot changes;
- overcast;
- Spellweaver sequence;
- Arcane Veil.

Growth:
- length spending;
- minimum length;
- decoy lifecycle;
- nutrition;
- rapid regrowth;
- length-as-armor;
- Ouroboros loop prevention.

Predator:
- mark eligibility;
- Hunt Momentum;
- Rend;
- Frenzy;
- companion attribution;
- boss behavior;
- spawn farming prevention.

Fellowship:
- Connection qualification;
- service availability;
- merchant special order;
- relationship depth;
- network breadth;
- rescue safety;
- save/load identity.

## 22.5 UI tests

Shared viewport:

- drag changes pan.
- click below drag threshold still selects.
- wheel zoom is cursor-centered.
- zoom clamps.
- root recenter.
- controller pan.
- controller zoom.
- selected node auto-pan.
- mask alignment with parent/world offset.
- teardown removes listeners.

Skill overlay:

- correct node state.
- details display.
- purchase.
- grant source.
- combo prerequisites.
- branch center buttons.
- currency refresh.
- rank refresh.
- localization.
- touch behavior.

Achievement regression:

- panning unchanged.
- zoom unchanged.
- controller selection unchanged.
- details unchanged.
- root recenter unchanged.

## 22.6 Migration tests

- Old save with every known current perk.
- Old save with partial ranks.
- Old save with unknown perk.
- Old save with class/faith/background mods.
- Repeat migration.
- Save after migration and reload.
- Refund total correctness.
- Existing spells/items/relationships unaffected.
- AP and achievements unaffected where intended.

## 22.7 Build validation

Required:

```bash
npm run test
npm run typecheck
npm run build
npm run validate:ap
```

Any specialized world-generation test remains required if touched.

---

# 23. Implementation Plan

## Phase 0 — Audit and lock design

- Enumerate every current perk in `src/systems/skillTree.ts`.
- Enumerate all consumers of current flag keys.
- Enumerate class, religion, and background definitions.
- Enumerate registered items relevant to class starts.
- Enumerate current derived-stat logic.
- Record current save examples.
- Finalize branch names and exact perk list.
- Select launch combo perks.
- Decide currency semantics.

Deliverable:
- checked-in migration matrix;
- approved perk catalog.

## Phase 1 — Shared tree viewport

- Extract panning/zoom/mask/controller camera behavior from `AchievementTreeOverlay`.
- Refactor achievement UI onto shared component.
- Add regression tests.
- Do not change achievement visuals unnecessarily.

Deliverable:
- reusable viewport component;
- unchanged achievement behavior.

## Phase 2 — Progression data model

- Add branch IDs, node kinds, tags, route metadata, source-aware ownership.
- Introduce typed derived-stat modifiers.
- Separate configuration from runtime resources.
- Add definition validation.
- Keep old system behind compatibility adapter temporarily.

Deliverable:
- new skill registry;
- validation tests.

## Phase 3 — Character creation

- Implement background definitions.
- Implement class definitions with exact item/mechanic/perk grants.
- Implement faith definitions and blessings.
- Build derived-stat preview.
- Persist identity.
- Add duplicate-grant handling.

Deliverable:
- lightweight new-game flow.

## Phase 4 — Core branch mechanics

Implement in risk order:

1. Momentum
2. Survival
3. Arcane
4. Growth
5. Predator
6. Fellowship

For each:

- entry;
- universal core;
- fork;
- route perks;
- capstone;
- HUD changes;
- tests.

Do not implement all six as one unreviewable giant patch.

## Phase 5 — Combo perks

- Add selected launch combos.
- Add requirement rendering.
- Add cross-system integration tests.
- Add balance caps.

## Phase 6 — Skill tree overlay

- Render new tree using shared viewport.
- Add details/purchase flow.
- Add controller/touch support.
- Add branch center controls.
- Add source badges and combo visuals.
- Add layout tests.

This phase may start earlier with placeholder definitions but should stabilize after the data model.

## Phase 7 — Save migration

- Add save version.
- Map known perks.
- Refund removed numeric perks.
- Translate identity fields.
- Show one-time migration summary.
- Add full-fixture tests.

## Phase 8 — Achievements, AP, localization, polish

- Update skill achievements.
- Update AP mappings/options.
- Add all translations.
- Add effects/animations/audio.
- Balance costs.
- Validate mobile and low resolution.

---

# 24. Acceptance Criteria

## Character creation

- A returning player can create a character in under one minute.
- Every background has a clear tradeoff.
- Every class grants exactly one concrete advantage.
- Every item grant references a valid registry item.
- Faiths are respectful and mechanically distinctive.
- Islam’s blessing clearly rewards voluntary restraint and has an understandable Fast/Iftar state.
- The summary accurately previews runtime stats.
- Starting granted perks appear in the tree.

## Skill design

- Six launch branches exist.
- Traversal and Geometry are no longer launch branches.
- Every branch has one clear fantasy.
- Every branch establishes its mechanic before its fork.
- Every fork can be described as A versus B in one sentence.
- Most perks have one rank.
- Small score and timer bonuses are largely absent.
- Each numeric perk is major and legible.
- At least six combo perks connect systems.
- Combo perks require real investment in both branches.
- No combo introduces an unnecessary third meter.

## UI

- Skill tree pans by mouse and touch drag.
- Wheel zoom is cursor-centered.
- Controller pan, zoom, selection, confirm, and cancel work.
- Tree can be recentered.
- Selection is not triggered by a drag.
- Branch routes and combos are visually readable.
- Node details show exact costs and requirements.
- Achievement tree retains its current interactions using shared viewport code.

## Engineering

- Definitions are data-driven.
- No prerequisite cycles.
- Runtime resource state is separated from static configuration.
- Quantitative effects use derived-stat aggregation where appropriate.
- Starting perk grants are source-aware and idempotent.
- Save migration is idempotent.
- Removed perks are mapped or refunded.
- Tests, typecheck, build, and AP validation pass.

---

# 25. Risks and Mitigations

## Risk: Scope explosion

This touches many systems.

Mitigation:

- implement branch by branch;
- preserve existing feature hooks;
- defer Worldshaper/Geometry;
- select only the strongest combo perks;
- avoid rewriting unrelated systems.

## Risk: Fellowship requires broad integration

Mitigation:

- start with Connections, companion coordination, and merchant reserved stock;
- treat advanced faction networking as later route perks;
- use existing relationship states;
- keep services typed and role-specific.

## Risk: Derived-stat refactor breaks gameplay

Mitigation:

- add resolver alongside existing values;
- compare output in tests;
- migrate one stat family at a time;
- provide debug source breakdown.

## Risk: Save migration over-rewards old saves

Mitigation:

- map unlocks conservatively;
- refund filler perks rather than converting all to strong new perks;
- cap conversion;
- use fixture tests.

## Risk: Shared viewport refactor regresses achievements

Mitigation:

- extract behavior with tests before building skill UI;
- preserve public methods;
- perform behavior parity checks.

## Risk: Combo loops become infinite

Mitigation:

- event source tags;
- cooldowns;
- once-per-action guards;
- no recursive echo triggers;
- resource minimums;
- simulation tests.

## Risk: Faith mechanics are insensitive

Mitigation:

- use central concepts respectfully;
- write literal, positive descriptions;
- avoid caricatures;
- avoid morality rankings;
- keep blessings comparable in power;
- review wording independently from balance.

---

# 26. Open Decisions Requiring Implementation Audit

These decisions must be resolved against exact current code before final coding:

1. Is score permanent progression currency, run score, or both?
2. What exact class/background/faith registries already exist and what IDs must be migrated?
3. Which exact fishing rod, cooking, archaeology, and shop item IDs are valid class grants?
4. How are spell slots currently represented?
5. Which spells already have tags suitable for Spellweaver?
6. What actor tags exist for prey and companion attribution?
7. How do companions move and attack?
8. How are merchant inventories persisted?
9. What relationship thresholds should create Connections?
10. Which wall-manipulation features are safe to preserve outside the launch tree?
11. How do alternate character modes interact with length-spending perks?
12. What is the current branch-completion achievement algorithm?
13. Does respec already exist?
14. Which current current-perk flags are referenced outside `skillTree.ts`?
15. Which current perk IDs have shipped and therefore require migration aliases?

These are audit questions, not invitations to invent generic substitutes.

---

# 27. Final Design Position

The progression system should become simpler at the beginning and richer over time.

Character creation gives the player three clean statements:

- **Background:** what shaped me.
- **Class:** what I already know.
- **Faith:** what blessing I carry.

SPECIAL and derived stats describe the starting body.

The skill tree describes transformation.

The tree should not ask the player to buy:

- five-percent apple bonuses;
- fractional score trails;
- another minor mana increment;
- another two ticks of grace;
- another one-time handful of segments.

It should ask:

- Do I preserve speed or detonate it?
- Do I prevent harm or rise from it?
- Do I prepare spells or cast beyond my limits?
- Do I remain enormous or spend my own body?
- Do I chase prey or wait in ambush?
- Do I invest in a few people or build a network across the world?
- Which two systems can I combine into something the game never offered me directly?

That is the standard for every retained, moved, redesigned, or newly created perk.

The repository already contains the raw material. The redesign’s purpose is to turn that material into readable, intentional buildcraft.
