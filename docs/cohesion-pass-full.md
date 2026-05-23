# Snake for the Modern Gamer — Cohesion Pass Requirements

## 1. Purpose

This pass is focused on making existing systems feel connected, intentional, and useful.

The goal is not to add a massive new expansion. The goal is to fix unfinished systems, clarify confused systems, and add small connective features so the game feels like one cohesive survival-snake RPG instead of separate systems sitting next to each other.

Core theme:

> Existing systems should acknowledge each other.

Primary focus areas:

- hunting, animals, meat, and food
- items, charms, crafting materials, and recipes
- cards and card-system cleanup
- scrollable pause/menu infrastructure
- skills and body-as-resource mechanics
- biome-aware towns, villages, and shops
- NPC voice lines and portrait sprites
- forest performance optimization
- diagnostic performance HUD
- healing and heart recovery

---

## 2. High-Level Requirements

### 2.1 Cohesion goals

The pass should make these systems intersect:

- Animals should feed into food, meat, crafting, shops, quests, and skills.
- Food should feed into hunger, healing, cooking, shops, towns, and survival.
- Equipment should solve terrain and biome problems.
- Skills should create new snake verbs, not just passive stats.
- Long snake body should become a strategic resource, not only a liability.
- Cards should be clarified as minigame-only objects.
- Former world-effect cards should become items/charms/recipes instead.
- Towns/villages/shops should react to local biome danger.
- NPCs should feel regionally aware through voice lines and portraits.
- The performance HUD should help diagnose slowdown causes.
- Forest rendering should be optimized without breaking terrain destruction.

### 2.2 Non-goals

Do not turn this pass into a full sequel-scale feature expansion.

Avoid:

- giant new biomes
- huge new questlines
- full town simulation
- complex farming systems
- complex crafting trees
- large branching dialogue systems
- permanent relic systems unless needed later
- turning card minigame cards into overworld spells

---

## 3. Pause Menu / UI Requirements

### 3.1 Tabbed pause menu

The pause menu should support multiple tabs.

Recommended tab list:

```text
Skills
Equipment
Items
Cards
Style
Options
```

Optional later tab:

```text
Map
```

### 3.2 Scrollable menu infrastructure

All major menu tabs must support scrolling.

Required behavior:

- Mouse wheel scrolling.
- Keyboard/gamepad up/down navigation if practical.
- Scroll clipping/masking so content does not overflow the panel.
- Selection details panel.
- Support for long lists of skills, items, equipment, styles, cards, and options.

This should be implemented as reusable UI infrastructure, not a separate custom scroller per tab.

### 3.3 Items tab

The previous concept of a “Relics” tab should become an **Items** tab.

The Items tab should contain:

- food
- consumables
- crafting materials
- charms
- recipes
- blueprints
- quest items
- weird one-use objects

The Items tab should support filters:

```text
All
Food
Materials
Charms
Recipes
Quest
```

Recommended item actions:

| Item category | Actions |
|---|---|
| Food | Use, Drop, Cook if near cooking source |
| Materials | Drop, Craft if recipe available |
| Charms | Use, Drop |
| Recipes / Blueprints | Inspect, Track recipe |
| Quest items | Inspect, Track quest |

---

## 4. Card System Cleanup Requirements

### 4.1 Card identity rule

Cards should be table-minigame objects only.

A card should not directly summon allies, kill enemies, place statues, fire lightning, or create overworld effects.

Cards should describe score/chip/table effects only.

Examples of acceptable card descriptions:

```text
+4 chips if another Moss card is played.
2x if it is the only Smoke card.
Widens the table score window by 5.
Copies the chips of the card to the left.
```

### 4.2 Move world-effect cards into Items

Existing card-like objects with overworld effects should be moved out of the card system and into the Items system as charms, recipes, or blueprints.

Rename examples:

| Current concept | New item type |
|---|---|
| Oni Card | Oni Charm |
| Kitsune Card | Kitsune Charm |
| Samurai Card | Samurai Token / Samurai Charm |
| Jizo Card | Jizo Stone |
| Raiju Card | Raiju Bottle / Raiju Charm |
| Kappa Card | Kappa Bowl / Kappa Charm |
| Katana Blueprint | Recipe / Blueprint item |

### 4.3 Charm behavior

Charms should usually be one-time consumables.

Example behaviors:

```text
Oni Charm
Use: Summons a temporary oni ally that attacks enemies.

Kitsune Charm
Use: Creates illusion snakes that distract nearby enemies.

Samurai Token
Use: Strikes one enemy in the current room.

Jizo Stone
Use: Places a short-lived guardian statue that blocks enemy movement.

Raiju Bottle
Use: Lightning damages enemies in a line.

Kappa Bowl
Use near water: summons a temporary kappa ally.
```

### 4.4 Card table consequences

Cards themselves should remain minigame-only, but winning or losing at tables may affect the world.

Examples:

- Winning at a village table can unlock gossip, discounts, or regional items.
- Losing at a goblin table can create debt.
- Winning with specific suits can affect payout flavor or shop reaction.
- Smoke-heavy victories may create strange or risky rewards.
- Lantern-heavy victories may reveal rumors or map hints.

The key rule:

> Table outcomes may affect the world. Individual cards should not act like overworld spells.

---

## 5. Animal / Hunting / Meat Requirements

### 5.1 Fix hunting rewards

Animals already support drops. Hunting must actually roll and award drops.

When an animal is hunted, the system should:

1. Identify the animal type.
2. Roll its drop table.
3. Add awarded items to inventory.
4. Optionally add score.
5. Show a clear UI message or popup.
6. Trigger appropriate juice/feedback.
7. Mark the room dirty if needed.

Example:

```text
Rabbit hunted.
Found: Raw Meat.
```

### 5.2 Animal encounter categories

Animal encounter categories should remain simple and readable:

| Encounter | Meaning |
|---|---|
| harmless | Startles/flees, does not hurt the player |
| dangerous | Can damage/kill the player |
| hunt | Can be hunted/eaten |
| tamable | Can become a pet/follower or special companion |

### 5.3 Startle vs hunt distinction

Harmless animals should not always automatically become meat on contact unless the player has the right skill/equipment.

Baseline behavior:

- Bumping harmless animals startles them.
- Hunting requires a hunting skill, trap, weapon, charge condition, or other intentional method.

Possible simple rule for first pass:

```text
Without Predator I:
  harmless animals startle on contact.

With Predator I:
  harmless animals can be hunted on contact.
```

### 5.4 Drops

Animal drops should be meaningful.

Examples:

| Animal | Possible drops |
|---|---|
| Rabbit | Raw Meat |
| Deer | Raw Meat, Hide |
| Wolf | Raw Meat, Hide |
| Bear | Raw Meat, Hide, Honey |
| Bird | Feather, Egg |
| Fish / Bass | Fish Meat |
| Raccoon / Possum | Meat, stolen junk, odd materials |
| Bison | Raw Meat, Hide |
| Armadillo | Hide / shell-like material |

### 5.5 Meat and food loop

The basic loop should be:

```text
Hunt animal → get raw food/materials → use, cook, sell, craft, bait, or quest-turn-in
```

Food should connect to hunger and hearts.

Required food behavior:

| Item | Behavior |
|---|---|
| Raw Meat | Fills hunger slightly; can be cooked |
| Cooked Meat | Fills hunger more; heals 1 heart |
| Fish Meat | Fills hunger slightly; can be cooked |
| Cooked Fish | Fills hunger more; may grant minor water/swim comfort |
| Honey | Heals 1 heart; may reduce temperature exposure; works as bear bait |
| Ramen | Fills hunger fully; may heal 1 heart or clear cold exposure |
| Senbei | Small hunger recovery |

### 5.6 Bait

Raw meat and/or bait items should be usable to influence animals.

Minimum first-pass behavior:

- Player can drop Raw Meat or Bait Chunk.
- Predators such as wolves and bears move toward bait.
- Bait can lure dangerous animals away from exits.
- Bait may help hunting quests.

Optional later:

- Fish bait works on water animals.
- Honey specifically attracts bears.
- Raccoons steal bait.

### 5.7 Taming

Existing items such as Rope and Lead should become relevant.

Baseline taming requirement:

```text
Lead or Rope + eligible tamable animal + interaction = tame attempt
```

Tamed animals can start simple.

Possible first-pass pet effects:

| Animal | Effect |
|---|---|
| Bird | Improves scouting/minimap hints |
| Fox | Finds occasional treasure/gossip |
| Wolf | Helps against enemies |
| Rabbit | Finds small food |
| Fish/Kappa-like pet | Water-region utility |

Taming can be expanded later; first pass only needs one or two functional cases.

---

## 6. Healing / Hearts Requirements

### 6.1 Healing sources

The game should have clear, practical ways to recover hearts.

Required healing sources:

- Cooked Meat heals 1 heart.
- Honey heals 1 heart.
- Ramen or diner meal heals 1 heart or clears temperature exposure.
- Shrines or angel/goblin systems may heal via special costs.
- House kitchen or cooking sources can improve healing.

### 6.2 Food-based healing rules

Recommended rules:

```text
Raw Meat:
  Hunger only, no heart heal.

Cooked Meat:
  Hunger + 1 heart.

Honey:
  1 heart + minor temperature relief.

Ramen:
  Full hunger + possible 1 heart or cold relief.

Cooked Fish:
  Hunger + minor water-related buff.
```

### 6.3 Cooking

Cooking should be possible at specific locations or with a specific item/skill.

Cooking sources may include:

- player house kitchen
- campfires
- ramen stands
- diners
- special village cooking stations
- Cookpot item or Camp Cook skill

Example recipes:

```text
Raw Meat → Cooked Meat
Fish Meat → Cooked Fish
Raw Meat + Honey → Hearty Skewer
Fish Meat + Senbei → Fisher Snack
```

---

## 7. Skills Requirements

### 7.1 Skill design rule

Skills should create gameplay verbs or meaningful survival identity.

Avoid pure stat bloat.

Skills should answer:

> What kind of snake am I becoming?

### 7.2 Required initial skill lines

Recommended first-pass skill lines:

```text
Predator
Tailcraft
Cartographer
Homestead
Fortitude
```

### 7.3 Predator skills

Predator should improve hunting, animal drops, and meat use.

Example skills:

```text
Predator I
Hunted animals roll drops properly and harmless animals can be hunted on contact.

Butcher’s Eye
Animals with useful drops flash subtly or appear on upgraded minimap.

Clean Harvest
Animal drops get a small bonus chance.

Danger Food
Dangerous animals grant better rewards when defeated.
```

### 7.4 Tailcraft skills

Tailcraft should make long body a strategic resource.

Example skills:

```text
Shed
Spend length to drop a temporary decoy/body chunk.

Bridge
Spend length to cross short water gaps.

Anchor
Pin tail briefly to resist pull, current, or sliding.

Clean Cut
Once per room, cut tail to avoid self-collision death.
```

### 7.5 Cartographer skills

Cartographer should improve minimap and route planning.

Example skills:

```text
Cartographer I
Minimap shows apples/treasure/powerups.

Threat Scanner
Minimap shows dangerous animals/enemies.

Death Marker
Minimap shows last death location and reason.

Surveyor’s Gut
Adjacent high-danger rooms pulse subtly.
```

### 7.6 Homestead skills

Homestead should connect cooking, house, towns, and safe recovery.

Example skills:

```text
Camp Cook
Cook raw meat at safe cooking sources.

Home Kitchen
Cooking at home produces better food.

Local Regular
Biome shops offer one extra regional item.

Comfort Food
Cooked meals heal better in houses or towns.
```

### 7.7 Fortitude skills

Fortitude should cover health, death, recovery, and survival warnings.

Example skills:

```text
Thick Scales
Gain +1 max heart.

Second Wind
Honey or hearty meals clear some temperature exposure.

Death Lesson
After death/revive, gain a temporary warning based on death reason.

Goblin Contract
Revive once by taking debt instead of ending the run.
```

---

## 8. Long Snake Body as Strategic Resource

### 8.1 Design goal

Snake length should not only be a liability. It should become a usable resource.

The player should sometimes want to stay long because length enables powerful tactical options.

### 8.2 Body verbs

Implement at least one body verb in the first pass.

Recommended first implementation:

```text
Shed
Spend 3 length to drop a temporary decoy/body chunk.
```

Other planned verbs:

```text
Bridge
Spend length to cross water.

Anchor
Pin tail to resist pull/current/slide.

Coil
Loop around an object/enemy/shrine to trigger effects.

Clean Cut
Sacrifice length to avoid self-collision or escape danger.
```

### 8.3 Body resource costs

Body abilities should cost length, cooldown, item charges, or skill unlocks.

Examples:

```text
Shed: costs 3 length.
Bridge: costs 4 length.
Clean Cut: costs 5 length or consumes Tail Shears.
Anchor: temporary, cooldown-based.
```

### 8.4 System intersections

Body abilities should interact with:

- water
- enemies
- animals
- traps
- pressure plates
- boss pull
- room hazards
- quests
- minimap readability

---

## 9. Biome-Aware Town / Village / Shop Requirements

### 9.1 Design goal

Towns, villages, and shops should react to nearby biome danger.

A shop in or near a dangerous biome should sell tools for that biome.

### 9.2 Biome shop stock

Recommended regional shop logic:

#### Elderwood / forest-adjacent

```text
Lantern
Machete / Axe
Trail Chalk
Animal Bait
Cooked Meat
Hunter’s Knife
```

#### Ocean / water-adjacent

```text
Swim Fins
Lead Flippers
Fish Bait
Cooked Fish
Waterproof Map / Surveyor Lens
Kappa Charm
```

#### Ember / hot-adjacent

```text
Firebreak Cape
Sunshade Helm
Cooling food
Canteen
Heat charm
```

#### Cold / Sable-adjacent

```text
Frostguard Cloak
Ramen
Cooked Meat
Warm Soup Coupon
Hide gear
Torch / Lantern
```

#### Dangerous high-danger areas

```text
Wards
Healing food
Honey
Armor-like equipment
Emergency Tail Shears
```

#### Goblin shops

```text
Debt contracts
Wards
Suspicious charms
Illegal minimap scanner
Bad meat prices
Goblin receipt items
```

### 9.3 Shop voice reactions

Shopkeepers should comment on regional danger and player condition.

Examples:

```text
“Looking fragile. We sell solutions and deniability.”

“Frostguard cloaks sell fast near the depths. Funny how markets predict corpses.”

“Fins are cheaper than funerals. Usually.”
```

---

## 10. NPC Voice Line Requirements

### 10.1 Pre-interaction bark

When talking to an NPC, before the interaction menu opens, the NPC should say a short voice line.

Flow:

```text
Player presses interact.
NPC displays one short bark/line.
Then interaction menu opens.
```

This should apply to:

- shopkeepers
- villagers
- goblins
- quest givers
- town NPCs
- special regional NPCs

### 10.2 Conditional voice line system

NPC voice lines should support conditions.

Recommended priority order:

1. urgent quest/event line
2. relationship or NPC-specific state
3. recent player action
4. town/village condition
5. biome condition
6. gossip
7. generic personality line

### 10.3 Supported conditions

Voice lines should be able to react to:

- biome ID
- biome danger level
- temperature hazard
- town/village/goblin camp presence
- player health
- hunger state
- snake length
- minimap unlocked/enabled
- hunting skill
- recent animal hunted
- recent death reason
- active quest
- completed quest
- nearby shop type
- nearby structures
- relationship state
- rooms visited
- local danger level

### 10.4 Voice line categories

Add lines for:

- biome comments
- town/village gossip
- shopkeeper sales flavor
- recent death comments
- animal/hunting comments
- card table comments
- relationship/NPC gossip
- local quest hints
- tutorial-ish system hints

### 10.5 Example lines

Forest:

```text
“Trees moved again last night. Nobody likes when I say that.”
“Keep a blade on you. Or teeth. You’ve got teeth, right?”
```

Ocean:

```text
“Water looks calm until it starts keeping score.”
“Fins are cheaper than funerals. Usually.”
```

Cold:

```text
“If you stop moving out there, the snow starts making plans.”
```

After player dies/revives:

```text
“You look... legally alive.”
```

After nearby hunting:

```text
“Something’s been eating the rabbits. I am looking at something.”
```

Card gossip:

```text
“Smoke cards win big until they don’t. That’s why goblins love them.”
```

Body resource hint:

```text
“Long snakes survive water if they’re willing to become infrastructure.”
```

---

## 11. Portrait Sprite Requirements

### 11.1 Purpose

Normal NPC interactions should use small portrait sprites.

These are distinct from larger dating portraits.

The goal is to make everyday NPCs feel more alive without requiring full dating-scene assets.

### 11.2 Portrait archetypes

Create small portrait sprites for common NPC archetypes:

```text
villager-neutral
villager-old
villager-young
shopkeeper
hunter
cook
goblin-clerk
goblin-merchant
angel
forest-hermit
ocean-fisher
desert-peddler
cold-trapper
badlands-ranger
jade-monk
ramen-cook
diner-worker
```

### 11.3 Expression variants

Each portrait should support a small set of expressions where practical:

```text
neutral
happy
worried
angry
suspicious
```

### 11.4 Regional accessories

Optional but recommended:

- forest NPCs: hood, leaves, lantern
- ocean NPCs: fisher hat, wet cloak
- ember NPCs: goggles, sunwrap
- cold NPCs: fur collar, scarf
- badlands NPCs: badge, hat
- jade NPCs: robe, hairpin
- goblins: visor, ledger, receipt stamp

### 11.5 Integration

Small portraits should appear in:

- pre-interaction bark panel
- shop dialogue
- quest dialogue
- gossip dialogue
- basic NPC interaction menus

Dating portraits remain separate and larger.

---

## 12. Performance / Forest Requirements

### 12.1 Forest slowdown issue

The Elderwood / forest biome should be optimized.

Forest rooms contain many tree/wall tiles, and tree rendering is visually richer than normal walls. This can cause slowdown.

### 12.2 Static room rendering cache

Implement a static room rendering cache.

Static layer should include:

- floor
- walls
- trees
- water
- biome accents
- static structures
- grid, if appropriate

Dynamic layer should include:

- snake
- animals
- enemies
- bullets
- apples
- treasure
- powerups
- quest actors
- temporary effects

### 12.3 Cache invalidation

Caching must not break destruction or terrain changes.

Invalidate static room cache when:

- wall is eaten
- tree is chopped
- terrain changes
- water changes
- structure changes
- portal changes
- any room layout mutation occurs

Recommended structure:

```ts
dirtyStaticRooms: Set<string>
```

When terrain changes:

```ts
dirtyStaticRooms.add(roomId)
```

### 12.4 Forest-specific optimization

Optional but recommended:

- Detailed tree tiles should only draw near exposed paths.
- Fully surrounded tree tiles can render as cheaper dark forest mass.
- Consider pre-generated tree tile textures or texture variants.

### 12.5 Must preserve gameplay

Optimization must not break:

- wall eating
- tree chopping
- minimap accuracy
- room destruction
- collision
- water rendering
- biome visual identity

---

## 13. Diagnostic Performance HUD Requirements

### 13.1 Purpose

The performance HUD should help diagnose why the game is slowing down.

It should be more than FPS.

### 13.2 Required diagnostic fields

Show:

```text
FPS
Delta ms
Delta clamped: yes/no
Current room ID
Biome ID
Static cache status: cached/rebuilt/dirty
Static tile count
Dynamic object count
Particle/effect count
Action clock accumulator/steps
Actor clock accumulator/steps
Bullet clock accumulator/steps
Hazard clock accumulator/steps
Render dirty: yes/no
```

### 13.3 Forest diagnostics

When in Elderwood/forest rooms, show:

```text
Forest draw mode: cached / uncached
Tree tiles
Detailed tree tiles
Cheap forest mass tiles
```

### 13.4 Snake slowdown diagnosis

The HUD should make it clear when frame drops are affecting real-time simulation.

Important line:

```text
Delta clamped: YES
```

This explains when the scheduler is intentionally not catching up fully after a long frame.

---

## 14. New Items Requirements

### 14.1 Add only glue items

New items should make existing systems interact.

Avoid adding items that are only stat sticks.

### 14.2 Recommended new items

#### Hunter’s Knife

```text
Category: Equipment or Item
Effect: Improves animal drop rolls.
```

#### Cookpot

```text
Category: Item / Recipe / Tool
Effect: Allows cooking at safe cooking locations or campfires.
```

#### Trail Chalk

```text
Category: Consumable
Effect: Marks current room; minimap can show the mark.
```

#### Bait Chunk

```text
Category: Consumable
Effect: Attracts predators or animals.
Crafted from Raw Meat.
```

#### Tail Shears

```text
Category: Consumable
Effect: Emergency tail cut to avoid self-collision or reduce length.
```

#### Surveyor Lens

```text
Category: Charm / Equipment / Item
Effect: Upgrades minimap to show treasure/powerups.
```

#### Cheap Compass

```text
Category: Charm / Item
Effect: Shows rough quest/shop direction.
```

#### Warm Soup Coupon

```text
Category: Food / Quest reward
Effect: Redeem at ramen/diner for healing and cold relief.
```

---

## 15. New Background Requirements

### 15.1 Background design rule

Backgrounds should provide:

- starting item
- one passive rule
- one NPC/voice line hook
- one shop/town interaction hook

Avoid large stat bundles.

### 15.2 Recommended backgrounds

#### Hunter

```text
Starts with Hunter’s Knife.
Animal drops are slightly better.
NPCs comment if the player overhunts.
```

#### Cartographer

```text
Starts with Minimap Module unlocked.
Adjacent danger rooms pulse subtly.
Lower starting score or slower early growth if balance requires.
```

#### Line Cook

```text
Starts with Cookpot.
Cooked foods heal better.
Ramen stands/diners offer discounts.
```

#### Goblin Debtor

```text
Starts with a Goblin Receipt item.
Can revive through debt once.
Goblin shops offer special but suspicious deals.
```

#### Former Park Ranger

```text
Better forest survival.
Occasionally sees animal tracks.
Forest NPCs respond differently.
```

#### Mall Snake

```text
Style/shop discounts.
Worse wilderness survival.
NPCs comment on terrible commercial energy.
```

---

## 16. Quest / Rumor Requirements

### 16.1 Regional quest templates

Add small quest templates that require multiple systems.

Examples:

#### Soup Weather

```text
Cold village wants meat.
Bring 2 Raw Meat.
Reward: Warm Soup Coupon or soup recipe.
```

#### Bear Market

```text
Shop wants bear honey.
Reward: Honey tonic recipe or discount.
```

#### Path Through the Wood

```text
Village wants a forest route opened.
Cut/chomp specific tree tiles.
Reward: Machete upgrade or forest minimap scanner.
```

#### Body Bridge Rescue

```text
NPC trapped across water.
Solve with swimming, body bridge, or alternate route.
Reward: swimming discount or gratitude item.
```

#### Goblin Meat Debt

```text
Pay debt with score, meat, card victory, or length.
```

#### Tailor’s Hide

```text
Bring Hide to a tailor.
Reward: cloak/boots/cosmetic.
```

### 16.2 Rumors as soft tutorials

NPC gossip should teach mechanics indirectly.

Examples:

```text
“Bears love honey. Hate competition. Respect neither.”
“Cooked meat fixes more than hunger. Raw meat fixes mostly regret.”
“Smoke cards win big until they don’t.”
“Long snakes survive water if they’re willing to become infrastructure.”
```

Rumors may optionally unlock recipe hints, map hints, or shop hints.

---

## 17. Acceptance Checklist

The cohesion pass is complete when:

### Menu / UI

- Pause menu has scrollable tabs.
- Items tab exists.
- Items tab supports food/material/charm/recipe/quest filtering.
- Cards tab contains only minigame cards.
- Equipment remains separate from Items.
- Style/customization remains accessible and scrollable.

### Cards

- World-effect cards are removed from card minigame definitions.
- Former world-effect cards become Items/Charms/Recipes/Blueprints.
- Card descriptions accurately match card minigame behavior.
- Table outcomes may optionally produce world/shop/debt consequences.

### Animals / Hunting

- Hunted animals roll drops.
- Meat, fish meat, hide, honey, feathers, eggs can be awarded.
- Hunting produces feedback.
- Meat can be used or cooked.
- Dangerous animals provide better rewards.
- At least one hunting-related skill or item exists.

### Food / Healing

- Cooked Meat heals at least 1 heart.
- Honey heals at least 1 heart or provides survival relief.
- Ramen/diner/food sources matter.
- Cooking exists at least in basic form.
- Food connects to hunger and/or health.

### Skills / Body

- Skill menu scrolls.
- At least initial skill lines exist.
- At least one body-as-resource ability exists.
- Long snake body has at least one strategic use besides being dangerous.

### Towns / Shops

- Shops react to biome danger.
- Forest/water/hot/cold/dangerous regions sell appropriate items.
- NPC/shopkeeper lines reference biome and local risks.

### NPCs / Dialogue

- NPCs say a short bark before interaction menu.
- Conditional voice lines exist.
- NPCs can comment on biome, town, player state, events, or gossip.
- Small portrait sprites exist for basic NPC interactions.

### Performance

- Forest rendering is optimized.
- Static cache invalidates correctly when terrain changes.
- Destruction/wall eating/tree changes still display correctly.
- Performance HUD shows diagnostic information.
- HUD indicates when delta is clamped.

---

## 18. Guiding Design Statement

This pass should make the game feel like:

> A bizarre survival-snake RPG where every dumb system feeds the next dumb system.

Every new item, skill, line, menu, or fix should answer one of these questions:

- What existing system does this connect to?
- What decision does this create for the player?
- What problem does this help solve?
- What other system now gets more meaningful because this exists?


---

# Part 2 — Design

## 19. Design Overview

This pass should make the game’s existing systems feel like they belong to the same ecosystem.

The core gameplay loop should become:

```text
Scout nearby rooms
Choose a route
Prepare with items/equipment/food/body skills
Enter danger
Use snake movement/body/gear to survive
Hunt, loot, cook, shop, gamble, talk, recover
Return stronger or weirder
```

The player should increasingly understand the game as:

```text
Biome creates the problem.
Minimap reveals the problem.
Equipment changes what problems are solvable.
Skills change how the snake solves problems.
Items let the player prepare or recover.
Animals supply food/materials/danger.
Towns and shops respond to local problems.
NPCs explain and flavor the world.
Cards are a local gambling/minigame economy.
Long body becomes a resource, not just danger.
```

This is the main design thesis for the cohesion pass.

---

## 20. Menu Design

### 20.1 Tab structure

The pause menu should become the hub for long-term and mid-run player management.

Recommended tabs:

```text
Skills | Equipment | Items | Cards | Style | Options
```

Each tab should use the same underlying scrollable list component.

### 20.2 Layout

Recommended layout:

```text
┌────────────────────────────────────────────┐
│ Skills  Equipment  Items  Cards  Style ... │
├────────────────────────────────────────────┤
│ Points: 82       Room: Elderwood Maze      │
├───────────────────┬────────────────────────┤
│ > Selected item   │ Name                   │
│   Item 2          │ Description            │
│   Item 3          │                        │
│   Item 4          │ Effects / Actions      │
│   ...             │                        │
├───────────────────┴────────────────────────┤
│ Controls / hint text                        │
└────────────────────────────────────────────┘
```

The left panel is the scrollable list. The right panel is the details/actions panel.

### 20.3 Details panel

The details panel should show:

- item/skill/card/equipment name
- category
- description
- cost if purchasable
- owned count if stackable
- equipped status if equipment
- actions
- unavailable reason if disabled

Example item detail:

```text
Cooked Meat x2
Food

A strip of well-cooked meat. Filling and satisfying.

Effects:
- Fills hunger
- Heals 1 heart

Actions:
[Use] [Drop]
```

Example skill detail:

```text
Shed
Tailcraft Skill

Spend 3 length to drop a temporary body chunk that distracts enemies and blocks movement.

Cost: 25 points
Requires: length 6+
```

### 20.4 Items tab categories

Items tab should support filters:

```text
All | Food | Materials | Charms | Recipes | Quest
```

The filters should be horizontally selectable or button-like.

Design principle:

> The player should never wonder whether meat, honey, charms, recipes, or quest junk are “equipment” or “cards.” They all live in Items.

### 20.5 Cards tab

Cards tab should contain only table-minigame cards.

Card details should show:

- chips
- suit
- rarity
- card table effect
- count owned
- whether spent in current competition, if relevant

Example:

```text
Smoke Smog
Suit: Smoke
Chips: 3
Rarity: Uncommon

Effect:
2x if it is the only Smoke card played.
Otherwise -10 chips.
```

### 20.6 Equipment tab

Equipment tab should remain for worn gear and equipped slots.

Slots:

```text
Weapon
Boots
Helm
Cloak
Ring
Gloves
Belt
Amulet
```

Equipment should emphasize terrain/function identity rather than only stats.

Example details:

```text
Swim Fins
Boots

Lets you cross water. Slightly slows movement.

Good for:
- Sunken Ocean
- Water-heavy rooms
- Fish hunting
```

### 20.7 Skills tab

Skills should be grouped by line:

```text
Predator
Tailcraft
Cartographer
Homestead
Fortitude
```

The player should be able to scroll within the list and see prerequisites.

Skill nodes can start simple as a vertical list.

The first implementation does not need a full graphical skill tree.

---

## 21. Items Design

### 21.1 Item taxonomy

Recommended item structure:

```text
Equipment
- worn/equipped gear
- lives in Equipment tab

Card
- minigame card
- lives in Cards tab

Item
- food/material/charm/recipe/quest object
- lives in Items tab
```

Items should have a category:

```text
Food
Material
Charm
Recipe
Quest
Misc
```

### 21.2 Food design

Food is the primary glue between animals, hunting, hunger, healing, towns, and cooking.

Food should be immediately useful. If the player hunts a rabbit and gets meat, they should understand the value quickly.

Food categories:

```text
Raw food:
- easier to get
- weaker
- can be cooked

Cooked food:
- stronger
- can heal hearts
- may give small biome-specific benefits

Special food:
- honey
- ramen
- diner meals
- soup coupons
- weird goblin snacks
```

### 21.3 Food examples

```text
Raw Meat
Use: restore some hunger.
Cook: becomes Cooked Meat.

Cooked Meat
Use: restore hunger and heal 1 heart.

Fish Meat
Use: restore a little hunger.
Cook: becomes Cooked Fish.

Cooked Fish
Use: restore hunger and grant minor water comfort.

Honey
Use: heal 1 heart and reduce temperature exposure slightly.
Drop: can bait bears.

Ramen
Use: restore hunger fully and clear cold exposure or heal 1 heart.
```

### 21.4 Charms design

Charms are one-time consumable weird effects.

They are not cards.

They are not permanent relics.

Design principle:

> A charm is a bottled incident.

Examples:

```text
Oni Charm
Summons a temporary oni ally.

Kitsune Charm
Creates illusion snakes that distract enemies.

Jizo Stone
Places a temporary guardian statue.

Raiju Bottle
Lightning damages enemies in a line.

Kappa Bowl
Use near water to summon temporary kappa help.
```

Charms should be rare enough to feel special but common enough to be used.

### 21.5 Materials design

Materials should mostly come from hunting, treasure, shops, and quests.

Examples:

```text
Hide
Used for cloaks, boots, cold gear, hunter gear.

Feather
Used for scouting items, light gear, charms.

Egg
Food, quest item, or special recipe ingredient.

Rope
Used for traps or taming.

Lead
Used for taming.

Honey
Food, bait, recipe ingredient.
```

Materials should not become a giant crafting grind. They should be used in small, readable recipes.

### 21.6 Recipes / blueprints

Recipes and blueprints should unlock options rather than clutter inventory forever.

Example:

```text
Katana Blueprint
Unlocks Jade Katana crafting at a forge.

Warm Soup Recipe
Allows cooking Warm Soup at house kitchens or diners.

Trail Chalk Recipe
Allows crafting Trail Chalk from Hide + Feather maybe.
```

Once learned, a recipe may move to a recipe list rather than remaining a normal stackable item.

---

## 22. Animal and Hunting Design

### 22.1 Animal roles

Each animal should have a readable gameplay role.

| Animal | Role |
|---|---|
| Rabbit | easy food, skittish |
| Deer | better food/materials, flees |
| Wolf | predator, dangerous, good hide/meat |
| Bear | mini-threat, high reward, honey |
| Bird | scouting/feather/egg source |
| Fish/Bass | water-region food |
| Fox | clever animal, treasure/gossip potential |
| Raccoon/Possum | nuisance/scavenger |
| Bison | high meat/hide, dangerous mass |
| Armadillo | defensive hide source |
| Snake animal | mirror threat/weird prey |

### 22.2 Hunting should be intentional

The first pass can be simple, but the design should trend toward hunting being a player decision.

Baseline:

```text
Harmless animal contact = startle
Predator skill or hunting tool = hunt
Dangerous animal contact = danger/death unless defeated properly
```

This prevents animals from being accidental meat pickups.

### 22.3 Hunting methods

Possible hunting methods:

```text
Predator I skill
Hunter’s Knife equipment/item
Trap/bait setup
Weapon hit
Charging from behind
Cornering animal
Body shed trap
```

Only one or two need to exist in first implementation.

### 22.4 Animal feedback

Hunting needs clear feedback.

Examples:

```text
Rabbit hunted.
Found Raw Meat.

Bear defeated.
Found Raw Meat, Hide, Honey.

Wolf lunged!
```

Animal startle feedback:

```text
Rabbit startled.
Deer fled.
Bird took off.
```

### 22.5 Animal drops

Drops should be rolled visibly enough that the player learns the loop.

A small floating pickup line is enough:

```text
+ Raw Meat
+ Hide
```

### 22.6 Predator danger

Dangerous animals should feel like tactical threats, not just random death tiles.

Wolves:

- chase the player
- can be distracted with meat
- can be killed with tools/body tricks

Bears:

- slower
- tougher
- may be baited with honey or meat
- high reward

Birds/eagles:

- perch, flee, maybe steal/drop items

Fish:

- school in water
- become valuable after swimming/fishing unlocks

---

## 23. Cooking and Healing Design

### 23.1 Healing philosophy

Healing should come from the world.

The player should learn:

```text
Hunt → cook → heal.
Find town → buy food → recover.
Find shrine → bargain/heal.
Build house kitchen → improve recovery.
```

### 23.2 Heart recovery

Heart recovery should be rare enough to matter, but common enough that health does not feel permanently doomed.

Primary healing sources:

```text
Cooked Meat
Honey
Ramen
Diner Meal
Warm Soup
Shrine blessing
House meal
Goblin contract, if desperate
```

### 23.3 Cooking locations

Cooking can occur at:

```text
House kitchen
Ramen stand
Diner
Campfire
Village kitchen
Cookpot-enabled safe spot
```

The first pass can support only house kitchen + ramen/diner/campfire equivalents.

### 23.4 Cooking UX

When near a cooking source, Items tab should show Cook actions.

Example:

```text
Raw Meat x3
[Use] [Drop] [Cook]
```

Cooking result:

```text
Cooked Raw Meat into Cooked Meat.
```

If not near a source:

```text
Cook unavailable: needs kitchen, diner, campfire, or Cookpot.
```

### 23.5 Recipes

Simple first-pass recipes:

```text
Raw Meat → Cooked Meat
Fish Meat → Cooked Fish
Raw Meat + Honey → Hearty Skewer
Fish Meat + Senbei → Fisher Snack
```

Hearty Skewer could heal 2 hearts or heal 1 heart plus temperature relief.

---

## 24. Skills Design

### 24.1 Skill philosophy

Skills should unlock new decisions.

Bad skill:

```text
+2% score.
```

Good skill:

```text
Spend length to create a bridge over water.
```

### 24.2 Predator line

Fantasy:

> I am a hunting snake.

Gameplay:

- better animal drops
- hunt harmless animals intentionally
- dangerous prey gives better rewards
- animals appear on minimap with upgrades
- meat healing gets better

First-pass recommended skills:

```text
Predator I
Harmless animals can be hunted on contact and animal drops are awarded.

Clean Harvest
Animal drop chances increase slightly.

Danger Food
Dangerous animals grant bonus meat/materials when defeated.
```

### 24.3 Tailcraft line

Fantasy:

> My body is a tool.

Gameplay:

- spend length
- manipulate space
- survive water
- escape self-collision
- block enemies

First-pass recommended skill:

```text
Shed
Spend 3 length to drop a temporary body chunk.
```

Future:

```text
Bridge
Anchor
Clean Cut
Coil
```

### 24.4 Cartographer line

Fantasy:

> I survive by knowing what is around me.

Gameplay:

- minimap upgrades
- death markers
- threat scanner
- route hints

First-pass recommended skills:

```text
Death Marker
Last death appears on minimap.

Surveyor I
Minimap shows apples/treasure/powerups.

Threat Scanner
Minimap shows dangerous animals/enemies.
```

### 24.5 Homestead line

Fantasy:

> I survive by making safe places useful.

Gameplay:

- cooking
- house healing
- town discounts
- regional shop stock
- better recovery

First-pass recommended skills:

```text
Camp Cook
Cook raw meat at cooking sources.

Local Regular
Biome shops stock one extra regional survival item.
```

### 24.6 Fortitude line

Fantasy:

> I survive disasters and come back weird.

Gameplay:

- hearts
- death lessons
- honey/food recovery
- debt revives

First-pass recommended skills:

```text
Thick Scales
+1 max heart.

Death Lesson
After revive, gain a temporary warning based on death reason.
```

---

## 25. Long Body Design

### 25.1 Core problem

Snake length is currently mostly a danger multiplier.

That is good, but incomplete.

Long body should also enable tactical options.

### 25.2 Core design loop

```text
Grow longer
Gain more score/risk
Use length as resource
Become shorter/safer but lose potential
```

This creates a meaningful tension:

> Do I stay long and powerful, or spend body to survive?

### 25.3 Shed design

Shed is the best first body ability.

Possible behavior:

```text
Cost: 3 length
Creates: temporary body chunk behind the snake or at tail
Duration: several actor ticks or until destroyed
Effects:
- blocks some enemies
- distracts predators
- can hold simple pressure plates later
- may be eaten by dangerous animals
```

Shed should not be free when snake is very short.

Minimum length requirement:

```text
Length must remain at least 3 after shedding.
```

### 25.4 Bridge design

Future ability.

```text
Cost: 4+ length
Creates temporary bridge across water tiles.
Use: solve water crossings without swimming gear.
```

Bridge should be useful but costly.

### 25.5 Clean Cut design

Future ability or item.

```text
Tail Shears:
Use to cut 5 length and avoid one self-collision death.
```

This makes length both risk and emergency currency.

---

## 26. Town, Village, and Shop Design

### 26.1 Local problem / local solution

Every town/shop should feel like it exists near its local danger.

Design rule:

> If a biome is dangerous, nearby shops should sell tools that make sense for that danger.

### 26.2 Regional shop personalities

Forest shop:

```text
Sells forest survival and hunting tools.
Tone: suspicious, practical, warns about trees.
```

Ocean shop:

```text
Sells swimming/fishing/water tools.
Tone: fatalistic fisher weirdos.
```

Cold shop:

```text
Sells warmth, ramen, cooked meat, hide gear.
Tone: survivalist, grim, soup-forward.
```

Hot shop:

```text
Sells heat protection, cooling foods, water/canteen equivalents.
Tone: overheated huckster.
```

Goblin shop:

```text
Sells suspicious bargains, debt items, wards, illegal scanners.
Tone: ledger-poisoned capitalism.
```

### 26.3 Dynamic stock

Shop stock can be influenced by:

```text
current biome
neighboring biomes
danger level
temperature hazard
player health
active quest
player background
skills
recent events
```

First pass can use only current/neighbor biome + danger level.

### 26.4 Shop reactions to player state

Examples:

Low health:

```text
“You look like a before picture. Buy soup.”
```

Long snake:

```text
“That is too much snake for one customer.”
```

Recently hunted:

```text
“Smells like rabbit panic in here.”
```

Has minimap:

```text
“Map people always think knowing helps. Adorable.”
```

---

## 27. NPC Voice and Portrait Design

### 27.1 Interaction flow

Current NPC interactions should gain a short personality beat before the menu.

Flow:

```text
Player presses E
Bark panel appears with portrait and line
Player confirms / short delay
Interaction menu opens
```

Optional quicker flow:

```text
Player presses E
Bark displays at top of interaction menu
Menu opens immediately
```

The second approach is faster and may be better for gameplay.

### 27.2 Bark panel design

Bark panel should show:

- small portrait
- NPC name/title
- one short line
- optional hint icon if line is tutorial-ish

Example:

```text
[portrait] Goblin Clerk
“Your money smells like future debt. Excellent.”
```

### 27.3 Voice line selection

Use weighted priority.

Priority order:

```text
quest-critical
recent event
player condition
local biome
town/shop state
gossip
generic
```

The system should pick one valid line from the highest-priority category available.

### 27.4 Voice line length

Lines should be short.

Ideal length:

```text
1 sentence
under 120 characters when possible
```

NPC barks should not become full dialogue pages.

### 27.5 Portrait sprite style

Small portrait sprites should be visually distinct from dating portraits.

They should be:

- small
- expressive
- readable
- reusable
- archetype-based
- optionally regionally tinted

Suggested size:

```text
64x64 or 96x96
```

Pixel-art or simple stylized rendering is acceptable.

### 27.6 Portrait reuse

Portraits should be reusable by role.

Example:

```text
forest-shopkeeper-neutral
forest-shopkeeper-worried
goblin-clerk-neutral
goblin-clerk-happy
cold-trapper-neutral
```

Do not require bespoke art for every NPC.

---

## 28. Forest Performance Design

### 28.1 Problem

Dense forest rooms create many wall/tree tiles.

If each tree tile is drawn with multiple shapes every render, forest rooms become expensive.

### 28.2 Static/dynamic split

Static cache should render things that rarely change.

Static:

```text
floor
walls
trees
water
grid
static structures
biome accents
```

Dynamic:

```text
snake
animals
enemies
bullets
items
effects
UI
```

### 28.3 Cache invalidation philosophy

The cache must be treated as a visual snapshot of mutable room terrain.

Whenever terrain changes, mark that room dirty.

The next render rebuilds the cached static layer.

This preserves destruction.

### 28.4 Forest mass rendering

Dense forest should distinguish:

```text
exposed tree tile
interior forest mass tile
```

Exposed tree tile:

- adjacent to open space
- gets detailed visual

Interior forest mass tile:

- surrounded by other tree tiles
- gets cheap block/fill visual

This keeps paths pretty while making solid forest cheap.

### 28.5 Performance validation

After implementation, test:

```text
forest room before caching
forest room after caching
normal room before/after
room where wall is eaten
room where tree is chopped
room transition into/out of forest
minimap accuracy after terrain change
```

---

## 29. Diagnostic HUD Design

### 29.1 HUD modes

Performance HUD should support at least two display modes.

Simple mode:

```text
FPS
Speed
Room
Biome
```

Diagnostic mode:

```text
FPS
Delta
Delta clamped
Cache status
Dynamic object count
Clock steps
Particle count
```

### 29.2 Delta clamping visibility

The most important diagnostic is whether the scheduler is clamping delta.

If the HUD says:

```text
Delta clamped: YES
```

then the player/dev knows simulation may be slowing relative to real time.

### 29.3 Render diagnostics

Show:

```text
Static cache: cached / rebuilt / dirty
Static tile count
Dynamic object count
Forest detailed tiles
Forest cheap mass tiles
```

This directly helps validate forest optimization.

---

## 30. Cohesive Gameplay Examples

### 30.1 Forest route example

Player enters a forest-adjacent village.

NPC says:

```text
“Keep a blade on you. Or teeth. You’ve got teeth, right?”
```

Shop sells:

```text
Hunter’s Knife
Trail Chalk
Cooked Meat
Lantern
```

Player buys Hunter’s Knife.

In Elderwood, the minimap shows dense walls and a narrow route.

A rabbit appears. With Predator I or Hunter’s Knife, the player hunts it and gets Raw Meat.

Later, at a campfire, Raw Meat becomes Cooked Meat.

Cooked Meat heals a heart.

This connects:

```text
NPC line → shop → equipment → animal → food → cooking → healing → forest survival
```

### 30.2 Water rescue example

NPC says:

```text
“Long snakes survive water if they’re willing to become infrastructure.”
```

Quest asks the player to reach someone across water.

Solutions:

```text
Swim Fins
Body Bridge skill
alternate route
Kappa Charm
```

Reward:

```text
Cooked Fish
Swimming discount
Cartographer hint
```

This connects:

```text
quest → water biome → equipment/body skill/item → reward → future route options
```

### 30.3 Goblin debt example

Player loses card game at goblin shop.

Outcome:

```text
Debt added.
Goblin offers payment options:
- score
- raw meat
- hide
- win another table
- sacrifice length
```

This connects:

```text
cards → economy → hunting → body length → goblin shops
```

### 30.4 Long body example

Player is too long and close to self-collision.

With Tail Shears or Clean Cut:

```text
Sacrifice length to survive.
```

With Shed:

```text
Drop body chunk to distract wolf.
```

Long body is now risk and resource.

---

# Part 3 — Specs

## 31. Data Model Specs

### 31.1 Item category extension

Add a category field to item definitions.

Suggested type:

```ts
export type ItemCategory =
  | 'food'
  | 'material'
  | 'charm'
  | 'recipe'
  | 'quest'
  | 'misc';
```

Suggested item extension:

```ts
interface Item {
  id: string;
  name: string;
  description: string;
  kind: 'equipment' | 'consumable';
  category?: ItemCategory;
  slot?: EquipmentSlot;
  modifiers?: ItemModifiers;
  usable?: boolean;
  stackable?: boolean;
}
```

Existing items can default to:

```ts
category: 'misc'
```

Equipment does not need category for Equipment tab, but category can still exist.

### 31.2 Consumable effect definitions

Add a consumable effect mapping.

Example:

```ts
interface ConsumableEffect {
  hungerRestore?: number;
  healHearts?: number;
  temperatureRelief?: number;
  invulnerabilityTicks?: number;
  grow?: number;
  flagsToSet?: Record<string, unknown>;
}
```

Example registry:

```ts
const CONSUMABLE_EFFECTS: Record<string, ConsumableEffect> = {
  'raw-meat': { hungerRestore: 25 },
  'cooked-meat': { hungerRestore: 50, healHearts: 1 },
  honey: { healHearts: 1, temperatureRelief: 0.25 },
  ramen: { hungerRestore: 100, healHearts: 1, temperatureRelief: 0.5 },
};
```

### 31.3 Charm definitions

Charms can use a separate effect mapping.

Example:

```ts
interface CharmEffect {
  id: string;
  requiresCurrentRoom?: boolean;
  requiresWaterNearby?: boolean;
  consumeOnUse: boolean;
  apply(sceneOrGame: unknown): UseItemResult;
}
```

Example charm IDs:

```text
oni-charm
kitsune-charm
samurai-token
jizo-stone
raiju-bottle
kappa-bowl
```

### 31.4 Recipe definitions

Add recipe definitions.

```ts
interface RecipeDefinition {
  id: string;
  name: string;
  inputs: Array<{ itemId: string; count: number }>;
  outputs: Array<{ itemId: string; count: number }>;
  requiresSource?: 'kitchen' | 'campfire' | 'diner' | 'ramen-stand' | 'cookpot' | 'any-cooking';
  learnedFlag?: string;
}
```

Examples:

```ts
{
  id: 'cook-meat',
  name: 'Cook Meat',
  inputs: [{ itemId: 'raw-meat', count: 1 }],
  outputs: [{ itemId: 'cooked-meat', count: 1 }],
  requiresSource: 'any-cooking',
}
```

```ts
{
  id: 'hearty-skewer',
  name: 'Hearty Skewer',
  inputs: [
    { itemId: 'raw-meat', count: 1 },
    { itemId: 'honey', count: 1 },
  ],
  outputs: [{ itemId: 'hearty-skewer', count: 1 }],
  requiresSource: 'any-cooking',
  learnedFlag: 'recipe.heartySkewer',
}
```

---

## 32. Menu Specs

### 32.1 Scrollable tab component

Create a reusable scrollable menu component.

Suggested file:

```text
src/ui/scrollableTabbedMenu.ts
```

Suggested interfaces:

```ts
interface MenuTab {
  id: string;
  label: string;
  getItems(): MenuListItem[];
}

interface MenuListItem {
  id: string;
  label: string;
  subtitle?: string;
  disabled?: boolean;
  disabledReason?: string;
  count?: number;
  category?: string;
  renderDetails(): MenuDetails;
  actions?: MenuAction[];
}

interface MenuDetails {
  title: string;
  body: string[];
  footer?: string;
}

interface MenuAction {
  id: string;
  label: string;
  disabled?: boolean;
  reason?: string;
  run(): void;
}
```

### 32.2 Required behavior

The component should support:

```text
open / close
switch tab
scroll list
select item
perform action
refresh current tab
preserve scroll position per tab
```

### 32.3 Items tab data source

Items tab should read from inventory.

It should group stackable items by item ID and show count.

Filters:

```ts
type ItemFilter = 'all' | 'food' | 'material' | 'charm' | 'recipe' | 'quest';
```

### 32.4 Cards tab data source

Cards tab should read from card collection only.

It should not include charms or blueprint items.

### 32.5 Equipment tab data source

Equipment tab should show:

- equipped item by slot
- unequipped equipment items
- action: equip
- action: unequip if applicable

### 32.6 Skills tab data source

Skills tab should read from SkillTreeManager or equivalent.

It should support locked/unlocked/purchasable states.

---

## 33. Card Cleanup Specs

### 33.1 Remove world-effect cards from card definitions

Remove or migrate these card IDs from card minigame definitions:

```text
oni-card
kitsune-card
samurai-card
jizo-card
raiju-card
kappa-card
katana-blueprint
```

If save compatibility matters, map old card IDs to new item IDs during load.

Migration map:

```ts
const CARD_TO_ITEM_MIGRATION: Record<string, string> = {
  'oni-card': 'oni-charm',
  'kitsune-card': 'kitsune-charm',
  'samurai-card': 'samurai-token',
  'jizo-card': 'jizo-stone',
  'raiju-card': 'raiju-bottle',
  'kappa-card': 'kappa-bowl',
  'katana-blueprint': 'katana-blueprint',
};
```

### 33.2 Add new items

Add corresponding items to item registry:

```text
oni-charm
kitsune-charm
samurai-token
jizo-stone
raiju-bottle
kappa-bowl
katana-blueprint
```

Categories:

```text
charms for one-use effects
recipe for katana blueprint
```

### 33.3 Update shop/treasure card rewards

Any source that currently awards a random card should only choose from true card-table cards.

Any source that should award charms should use an item/loot table instead.

### 33.4 Update card descriptions

Every card description should match `scoreCardHand` behavior.

Add tests or simple validation notes:

```text
For each card:
- description mentions only implemented scoring behavior
- scoring behavior exists in scoreCardHand
```

---

## 34. Hunting Specs

### 34.1 Animal overlap result extension

Current animal overlap should return hunted animal detail.

Suggested result:

```ts
interface HuntedAnimalResult {
  animalId: string;
  animalType: AnimalType;
  animalName: string;
  position: Vector2Like;
  drops: DropEntry[];
}

interface SnakeAnimalResult {
  tamed: boolean;
  damaged: boolean;
  hunted: boolean;
  huntedAnimal?: HuntedAnimalResult;
  startleCount: number;
}
```

### 34.2 Drop rolling

Add a helper:

```ts
function rollAnimalDrops(
  drops: readonly DropEntry[] | undefined,
  rng: RandomGenerator,
  modifiers?: AnimalDropModifiers,
): Array<{ itemId: string; count: number }>;
```

Modifier examples:

```ts
interface AnimalDropModifiers {
  bonusChance?: number;
  doubleRoll?: boolean;
  guaranteedMeat?: boolean;
}
```

### 34.3 Award drops in SnakeGame

When hunted animal result exists:

```ts
for (const drop of rolledDrops) {
  inventory.addItem(drop.itemId, drop.count);
}

setFlag('ui.animalHunted', {
  animalName,
  drops: rolledDrops,
  x,
  y,
  roomId,
});
```

### 34.4 Hunting skill flag

Predator I can set a flag:

```text
skill.predator.huntHarmless
```

AnimalManager or SnakeGame can check this flag to decide whether harmless animals are startled or hunted.

### 34.5 Dangerous animal rewards

Dangerous animals defeated by combat/damage should also roll drops.

If `damageAnimal(...)` returns defeated animal, SnakeGame should roll drops and set UI feedback.

### 34.6 Room dirty handling

Animal removal does not require static terrain cache invalidation unless carcasses or dropped items become static.

If drops are represented as pickup items on the ground, mark dynamic dirty only.

---

## 35. Food / Consumable Specs

### 35.1 Use item action

Implement a generic item use path.

Suggested method:

```ts
useInventoryItem(itemId: string): UseItemResult
```

Result:

```ts
interface UseItemResult {
  ok: boolean;
  message: string;
  color?: string;
  consume?: boolean;
  roomsChanged?: string[];
}
```

### 35.2 Food effects

Food use should:

- check inventory count
- apply hunger/health/temperature effect
- consume one item if successful
- show message
- refresh UI
- mark dirty

### 35.3 Health methods

SnakeGame or player status manager should expose:

```ts
healPlayer(amount: number): number
getPlayerHealth(): number
getPlayerMaxHealth(): number
```

`healPlayer` should return actual amount healed.

### 35.4 Hunger methods

Expose a method or flag update:

```ts
restoreHunger(amount: number): void
```

If hunger is currently represented by time-since-eat flags, wrap those flags in a method.

### 35.5 Temperature relief

Expose:

```ts
relieveTemperatureExposure(amountScalarOrMs: number): void
```

This can reduce:

```text
player.temperatureExposureMs
player.temperatureDamageProgressMs
```

depending on current implementation.

---

## 36. Cooking Specs

### 36.1 Detect cooking source

Add helper:

```ts
getCurrentCookingSource(): CookingSource | null
```

Possible return:

```ts
type CookingSource =
  | 'house-kitchen'
  | 'campfire'
  | 'diner'
  | 'ramen-stand'
  | 'cookpot';
```

### 36.2 Recipe availability

A recipe is available if:

- player has required input items
- player is near required cooking source
- recipe is learned if it has `learnedFlag`
- required skill/item exists if applicable

### 36.3 Cook action

Items tab should show Cook action on eligible raw foods when a recipe is available.

Example method:

```ts
cookRecipe(recipeId: string): UseItemResult
```

### 36.4 Cooking messages

Examples:

```text
Cooked Raw Meat into Cooked Meat.
Grilled Fish Meat into Cooked Fish.
No cooking source nearby.
Missing Honey.
```

---

## 37. Skills Specs

### 37.1 Skill definition shape

If not already flexible enough, skill definitions should support:

```ts
interface SkillDefinition {
  id: string;
  line: 'predator' | 'tailcraft' | 'cartographer' | 'homestead' | 'fortitude';
  name: string;
  description: string;
  cost: number;
  prerequisites?: string[];
  apply(sceneOrGame: unknown): void;
}
```

### 37.2 Skill flags

Suggested flags:

```text
skill.predator.huntHarmless
skill.predator.dropBonus
skill.tailcraft.shed
skill.tailcraft.bridge
skill.tailcraft.anchor
skill.cartographer.deathMarker
skill.cartographer.threatScanner
skill.homestead.campCook
skill.homestead.localRegular
skill.fortitude.thickScales
skill.fortitude.deathLesson
```

### 37.3 Skill menu

The Skills tab should show:

```text
unlocked skills
purchasable skills
locked skills with requirements
cost
line/category
description
```

### 37.4 Initial skill implementation

First-pass minimum:

```text
Predator I
Shed
Death Marker
Camp Cook
Thick Scales
```

---

## 38. Body Ability Specs

### 38.1 Shed ability

Suggested method:

```ts
tryShedTail(): UseAbilityResult
```

Requirements:

```text
skill.tailcraft.shed = true
snake length >= minimum
not paused
not in modal
cooldown ready
```

Effect:

```text
remove 3 tail segments
create decoy body chunk at tail location or last removed segment positions
set cooldown
set UI feedback
```

### 38.2 Decoy body chunk

Represent as a dynamic room actor/effect.

Suggested data:

```ts
interface ShedBodyChunk {
  id: string;
  roomId: string;
  positions: Vector2Like[];
  expiresAtTick: number;
}
```

Interactions:

- blocks or distracts animals/enemies
- disappears after duration
- does not count as live snake body for self-collision
- appears on minimap if easy

### 38.3 Tail Shears

Tail Shears can call a similar body shortening path.

```text
Use Tail Shears:
- remove 5 length
- clear immediate self-collision risk if applicable
- consume item
```

---

## 39. Biome Shop Specs

### 39.1 Shop stock builder

Create or extend shop stock generation.

Suggested function:

```ts
buildShopStock(context: ShopContext): ShopOffer[]
```

Context:

```ts
interface ShopContext {
  room: RoomSnapshot;
  biomeId: string;
  dangerLevel: number;
  neighboringBiomeIds: string[];
  playerHealth: number;
  playerMaxHealth: number;
  flags: Record<string, unknown>;
}
```

### 39.2 Regional stock injection

Inject regional offers based on biome/danger.

Example:

```ts
if (isForestAdjacent(context)) addForestStock();
if (isWaterAdjacent(context)) addWaterStock();
if (isColdDanger(context)) addColdStock();
if (isHotDanger(context)) addHotStock();
if (context.dangerLevel >= 6) addDangerStock();
```

### 39.3 Skill/background interaction

Local Regular skill:

```text
adds one extra regional item
```

Line Cook background:

```text
discount on food items
```

Hunter background:

```text
higher chance of Hunter’s Knife, bait, cooked meat
```

### 39.4 Shop UI messages

Shop UI should be able to display one contextual line before stock list.

Example:

```text
“Fins are cheaper than funerals. Usually.”
```

---

## 40. NPC Voice Specs

### 40.1 Voice line definition

Suggested structure:

```ts
interface NpcVoiceLine {
  id: string;
  text: string;
  priority: number;
  roles?: string[];
  biomeIds?: string[];
  tags?: string[];
  conditions?: NpcVoiceCondition[];
  portraitId?: string;
}
```

### 40.2 Condition types

Suggested condition examples:

```ts
type NpcVoiceCondition =
  | { kind: 'biome'; biomeId: string }
  | { kind: 'dangerAtLeast'; value: number }
  | { kind: 'healthBelowPercent'; value: number }
  | { kind: 'flag'; key: string; equals?: unknown }
  | { kind: 'recentEvent'; eventId: string }
  | { kind: 'hasItem'; itemId: string }
  | { kind: 'hasSkill'; skillId: string }
  | { kind: 'snakeLengthAtLeast'; value: number };
```

### 40.3 Voice selection

Suggested method:

```ts
selectNpcVoiceLine(context: NpcVoiceContext): NpcVoiceLine
```

Context:

```ts
interface NpcVoiceContext {
  role: string;
  room: RoomSnapshot;
  biomeId: string;
  dangerLevel: number;
  playerHealth: number;
  playerMaxHealth: number;
  snakeLength: number;
  flags: Record<string, unknown>;
  recentEvents: string[];
}
```

Algorithm:

1. filter valid lines
2. group by priority
3. choose randomly among highest-priority lines
4. avoid repeating same line too often if possible

### 40.4 Pre-interaction integration

Before shop/quest/menu interaction:

```ts
const line = selectNpcVoiceLine(context);
showNpcBark(line, portraitId);
thenOpenInteractionMenu();
```

Option:

- display bark inside menu header instead of blocking interaction

### 40.5 Recent event flags

Suggested recent event flags:

```text
recent.animalHunted
recent.deathReason
recent.cardLoss
recent.cardWin
recent.bossDefeated
recent.enteredBiome
recent.lowHealth
```

These can decay after a number of rooms or ticks.

---

## 41. Portrait Specs

### 41.1 Portrait registry

Add portrait registry.

```ts
interface PortraitDefinition {
  id: string;
  textureKey: string;
  role: string;
  expression: 'neutral' | 'happy' | 'worried' | 'angry' | 'suspicious';
  biomeFlavor?: string;
}
```

### 41.2 Asset path convention

Suggested path convention:

```text
assets/portraits/small/{portrait-id}.png
```

Examples:

```text
assets/portraits/small/goblin-clerk-neutral.png
assets/portraits/small/forest-shopkeeper-worried.png
assets/portraits/small/ocean-fisher-neutral.png
```

### 41.3 Runtime fallback

If a requested portrait is missing:

```text
use generic villager-neutral
```

No NPC interaction should fail because a portrait asset is missing.

---

## 42. Performance Specs

### 42.1 Static room cache data

Suggested renderer state:

```ts
private staticRoomCache = new Map<string, Phaser.GameObjects.RenderTexture | string>();
private dirtyStaticRooms = new Set<string>();
```

Alternative:

- cache generated texture keys instead of RenderTexture objects

### 42.2 Cache key

Cache key should include room ID and possibly visual mode.

```ts
const cacheKey = `static-room:${room.id}:${visualVariant}`;
```

If biome palette or style changes, invalidate/rebuild.

### 42.3 Invalidation API

Expose:

```ts
markStaticRoomDirty(roomId: string): void
markAllStaticRoomsDirty(): void
```

Use whenever room layout mutates.

### 42.4 Render path

Pseudo-flow:

```ts
render(room) {
  drawOrBlitStaticRoom(room);
  drawDynamicObjects(room);
}
```

`drawOrBlitStaticRoom`:

```ts
if cache missing or dirty:
  rebuild static cache
draw cached static texture
```

### 42.5 Destruction integration

Any code that changes `room.layout` must call dirty marking.

Known terrain mutations to wire:

```text
wall eating
wall smite
tree chopping
landing zone clearing
collapse/seismic terrain changes
room structure changes
```

### 42.6 Diagnostic counters

Renderer should collect counters:

```ts
interface RenderDiagnostics {
  staticCacheStatus: 'cached' | 'rebuilt' | 'dirty' | 'disabled';
  staticTileCount: number;
  dynamicObjectCount: number;
  treeTileCount: number;
  detailedTreeTileCount: number;
  cheapForestTileCount: number;
}
```

---

## 43. Performance HUD Specs

### 43.1 Scheduler diagnostics

SimulationScheduler should optionally expose diagnostics.

Suggested data:

```ts
interface ClockDiagnostics {
  id: string;
  intervalMs: number;
  accumulatorMs: number;
  stepsLastUpdate: number;
}
```

Update should record:

```text
clampedDeltaMs
rawDeltaMs
wasDeltaClamped
steps per clock
```

### 43.2 HUD content

Diagnostic HUD should display:

```text
FPS: 58
Delta: 16.7ms
Clamped: no
Room: 2,-1,0
Biome: elderwood-maze
Static: cached
Tiles: 768
Dynamic: 31
Particles: 44
Action: 0/100ms steps 0
Actor: 0/200ms steps 0
Forest: trees 612 detailed 180 cheap 432
```

### 43.3 Toggle

Existing performance cheat can remain.

Diagnostic detail can use:

```text
90fps240hz
```

or a new toggle:

```text
debughud
```

---

## 44. Save / Migration Specs

### 44.1 Save additions

Ensure these can persist:

```text
item categories do not need save
inventory item counts already should
learned recipes
unlocked skills
menu settings
items acquired from migrated cards
minimap/item toggle state
```

### 44.2 Card-to-item migration

If old saves contain removed card IDs, migrate them into item inventory.

Example:

```ts
for each removed card in cardCollection:
  count = cardCollection[cardId]
  inventory.addItem(CARD_TO_ITEM_MIGRATION[cardId], count)
  delete cardCollection[cardId]
```

### 44.3 Backward compatibility

Old saves should not crash if:

- card no longer exists
- item category missing
- recipe flags missing
- skill flags missing
- portrait ID missing

Use fallbacks.

---

## 45. Testing Specs

### 45.1 Cards

Test:

```text
All remaining cards score correctly.
All card descriptions match implemented effects.
Removed card IDs no longer appear in random card shops.
Old card IDs migrate to items.
```

### 45.2 Items

Test:

```text
Food can be used.
Food consumes inventory.
Cooked Meat heals.
Honey heals.
Unavailable actions show reasons.
Items tab filters correctly.
```

### 45.3 Hunting

Test:

```text
Rabbit can startle.
Predator I allows hunting.
Drops are awarded.
Dangerous animal damage still works.
Defeated dangerous animals drop loot.
Animal UI feedback appears.
```

### 45.4 Cooking

Test:

```text
Raw Meat cooks near source.
Raw Meat cannot cook away from source.
Missing inputs block recipes.
Cooked item appears in inventory.
```

### 45.5 Skills

Test:

```text
Skills can be purchased.
Skill prerequisites work.
Skill flags apply.
Shed costs length and creates decoy.
Thick Scales increases max hearts.
```

### 45.6 Shops

Test:

```text
Forest shops sell forest items.
Ocean shops sell water items.
Cold shops sell warmth/food.
Hot shops sell heat protection.
Dangerous shops stock survival items.
```

### 45.7 NPC lines

Test:

```text
NPC bark appears before menu.
Biome-specific line appears in biome.
Low-health line appears when hurt.
Fallback line appears when no condition matches.
Portrait fallback works.
```

### 45.8 Performance

Test:

```text
Forest FPS improves.
Cache rebuilds when entering room first time.
Cache reused on subsequent renders.
Wall destruction invalidates cache.
Minimap remains accurate after terrain mutation.
Diagnostic HUD shows clamped delta when applicable.
```

---

## 46. Implementation Order

Recommended order:

### Phase 1 — Infrastructure

1. Scrollable tabbed pause menu.
2. Items tab.
3. Item categories.
4. Generic item use path.
5. Card cleanup/migration.
6. Diagnostic HUD groundwork.

### Phase 2 — Core Cohesion Fixes

1. Hunting drop awards.
2. Food use.
3. Heart healing from cooked meat/honey/ramen.
4. Basic cooking.
5. Biome-aware shop stock.
6. NPC pre-interaction bark.

### Phase 3 — Strategic Systems

1. Initial skills.
2. Shed body ability.
3. Minimap death marker / Cartographer upgrades.
4. Hunter/Cook/Cartographer backgrounds.
5. Charms converted from old world-effect cards.

### Phase 4 — Polish and Performance

1. Forest static cache.
2. Forest cheap mass tile optimization.
3. Performance HUD diagnostics.
4. Portrait sprite integration.
5. More voice lines and rumors.
6. Small regional quest templates.

---

## 47. Final Design Rule

Before adding any new feature in this pass, ask:

```text
Does this connect at least two existing systems?
Does this create a player decision?
Does this make a confusing system clearer?
Does this make the world feel more reactive?
```

If the answer is no, save it for a later expansion.
