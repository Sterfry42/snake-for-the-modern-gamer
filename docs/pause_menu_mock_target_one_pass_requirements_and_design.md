# Pause Menu Mock-Target Redesign Requirements and Design

## Purpose

This document defines the one-pass requirements and design target for turning the current pause menu UI into the much juicier, mock-inspired, retro-neon RPG command center shown in the generated mockups.

The goal is not to make a small incremental visual cleanup.

The goal is to make the pause menu feel like a premium, systemic, buildcraft-heavy game interface while still being unmistakably **Snake for the Modern Gamer**: strange, dense, procedural, self-generating, playful, and excessive in the correct ways.

The current implementation is a good first scaffolding pass. It introduces UI tokens, generated assets, layout helpers, a scroll panel class, and a first attempt at the SPECIAL screen. But the screenshots show that it does not yet reach the mock direction. It is still too cramped, too text-first, too monolithic, too fixed-position, and not componentized enough to produce the visual hierarchy, readability, and majesty of the mocks.

This document is intended to give an AI coding agent enough detail to implement the redesign in one integrated pass.

---

# One-Pass Instruction

Do this as one cohesive implementation pass.

Do **not** stop after adding scaffolding.

Do **not** only add tokens, helpers, or placeholder components.

Do **not** only make SPECIAL slightly prettier while leaving the shell, tabs, inventory split, scrolling, and component model half-migrated.

The expected result of this pass is a working pause menu that is visibly and structurally aligned with the mock direction:

- larger, more confident shell
- non-overlapping top navigation
- clear top tabs and subtabs
- procedural UI sprite generation upgraded into a real in-code UI sprite forge
- SPECIAL screen rebuilt as a componentized, quantitative build sheet
- derived stats rendered as grouped scrollable rows, not a text blob
- inventory split into Equipment and Items
- all list-heavy tabs regain proper scrolling
- footer controls become segmented control hints, not one centered sentence
- screenshots should look meaningfully closer to the mocks, not merely like the old menu with new colors

This is a one-pass implementation target. The code may still be improved later, but the pass should be complete enough that the mock direction is recognizably present in-game.

---

# Design North Star

The pause menu should feel like the game’s systemic command center.

It should answer:

- What can my snake do?
- What is my build?
- What am I wearing?
- What do I own?
- What rules have I bent?
- What does the world know about me?
- Where am I?
- What factions, quests, artifacts, cards, spells, and systems are active?

It should feel like a real interface shell for a game with many interlocking systems.

The mock direction can be summarized as:

> A neon ritual terminal: part retro RPG menu, part arcade command center, part magical diagnostic screen, part roguelike dossier.

The UI should be readable, structured, crunchy, and beautiful.

---

# Procedural UI Sprite Philosophy

## First-class requirement

The UI sprites should be generated in code right now.

This is not a temporary compromise.

This is part of the game’s identity.

For **Snake for the Modern Gamer**, a pause menu that procedurally generates its own fake UI asset kit is more fitting than immediately relying on hand-authored sprite sheets. The game is systemic, weird, accumulated, and code-forward. The UI should embrace that.

## Current state

The current generated asset code already creates basic frame textures, card/button textures, scroll rail textures, simple icons, tab icons, glow dots, and corner glints. This is the correct starting point.

However, the current generated assets are still too simple. They read as procedural geometry, not as a rich procedural UI kit.

The pass must upgrade this into an intentional procedural sprite forge.

## Required direction

The code should generate reusable, named UI sprites/textures for:

- outer window frames
- inner panel frames
- active top tab frames
- inactive top tab frames
- active subtab frames
- inactive subtab frames
- detail panel frames
- card frames
- stat row frames
- selected stat row frames
- disabled stat row frames
- action button frames
- disabled action button frames
- icon tiles
- section header plates
- derived stat row plates
- scroll rail with arrow caps
- scroll thumb
- footer keycaps
- lock/check/arrow/status glyphs
- SPECIAL stat icons
- derived stat group icons
- top-level tab icons
- subtab icons
- faction, map, gear, item, card, artifact, and system icons where needed

Generated sprites must be allowed to look authored.

They should include:

- layered strokes
- corner ornament pixels
- inner glow lines
- accent strips
- tiny notches
- decorative cap pixels
- selected-state glows
- disabled-state desaturation
- hover/focus variants where useful

Do not settle for rounded rectangles with text.

---

# Mock Descriptions

This section verbally describes the mock direction so implementation can target the same feeling even without image access.

---

## Mock: SPECIAL Screen

The SPECIAL mock shows a large dark translucent pause menu over the grid gameplay background. The outer frame is a bright electric-blue pixel frame with glowing corners, inner border lines, and a bottom control strip.

At the top, the global tabs are large, physical tab plates:

- Growth is active with a green sprout icon.
- Gear, World, and System are inactive but still framed and iconized.
- Mana: latent lives in a clean top-right status cluster and does not collide with tabs.

Under the top tabs, the Growth subtabs are displayed as real buttons:

- Skill Tree
- SPECIAL, active and glowing blue
- Spells

The SPECIAL page has a compact build summary strip near the top of the content area:

- Speed +0%
- Max Hearts 3
- Apple Invulnerability 0.5s
- possibly Frost Resistance or another headline stat

These are not plain text. They are little cards or chips with icons and strong numeric values.

The left pane is the SPECIAL stat editor. It has a clear `SPECIAL` or `SPECIAL COMMAND` heading and an `Unspent Points: 0` label. Each stat row has:

- a colored icon tile
- full stat name
- large numeric value
- minus button
- plus button
- strong row borders
- enough height to read comfortably

Rows:

- Strength
- Perception
- Endurance
- Charisma
- Intelligence
- Agility
- Luck

Apply Points and Reset Preview are large action buttons with icon + text, visually disabled if no changes exist.

The right pane is titled `Derived Stats`. It is a scrollable stat panel, not a text area. It has:

- visible scrollbar
- category header plates
- colored accents
- label-left / value-right stat rows
- smaller numeric breakdown text beneath each row

Example sections:

- Exploration
- Apples
- Survival
- Fishing
- Social

Example rows:

- Treasure Discovery Chance — 10%
- Powerup Discovery Chance — 10%
- Special Apple Chance — 0%
- Apple Invulnerability — 0.5s
- Max Hearts — 3
- Frost Resistance — 0%
- Rare Catch Chance — 0%
- Friendship Gain — +0%

The footer is a segmented control bar, not a sentence. It has icon/key hints like:

- Click +/- to preview stat changes
- Mouse Wheel scrolls derived stats
- Esc resume/back

The mock feels like a proper buildcraft sheet, not a debug panel.

---

## Current SPECIAL Screenshot: What It Misses

The current generated SPECIAL screen is directionally correct but still misses the mock in many specific ways:

1. The shell is too small. The whole layout is compressed.
2. Top tabs and Mana still feel cramped and can visually collide.
3. The top tabs are mostly text labels, not chunky physical plates.
4. The subtab row is better than before but not yet a proper button rail.
5. The left SPECIAL panel is still too compact.
6. SPECIAL rows use three-letter abbreviations instead of strong icons.
7. Stat rows do not have enough visual identity.
8. Summary values exist but read like a small text table rather than headline build chips.
9. Apply/Reset are real buttons now, but they are still too subdued and lack icon weight.
10. The derived stats pane is still essentially a vertical text list.
11. Derived stats are not grouped into colored sections.
12. Derived stat values are not consistently right-aligned.
13. There is too little row/card structure in the right pane.
14. The scroll affordance is too timid or unclear.
15. The footer is still one centered hint sentence rather than segmented key hints.
16. The visual hierarchy is not strong enough: too many text elements have similar weight.
17. The screen still feels like the old overlay with new styling rather than a new command-center shell.

---

## Mock: Gear > Style Screen

The Gear > Style mock turns the old cosmetics list into a collectible/customization dashboard.

Top-level Gear is active with a cog icon. Subtabs are:

- Inventory / Equipment
- Style, active
- Cards
- Artifacts

The left pane is structured into sections:

### Palette

A large selected palette card shows:

- palette swatch grid
- `Classic Green`
- equipped checkmark
- bright green selected/equipped outline

### Hats

A row/grid of hat slots shows:

- No Hat selected or available
- locked slots with lock icons
- unknown slots shown as `???`
- card/tile treatment for every slot

### Utilities

Utility rows show:

- icon
- item name
- cost chip
- lock or owned state

Examples:

- Disable Walking Noise — 100
- Cowbell — 45
- Minimap Module — 50

The right pane shows:

- `Snake Style`
- subtitle `Cosmetics`
- a large pixel snake preview
- concise detail text
- owned/unlocked count

It is a collection screen, not a paragraph list.

---

## Current Style Screenshot: What It Misses

The current/old Style screen is mostly text:

- `Classic Green [equipped]`
- `No Hats owned.`
- `Disable Walking Noise [100 score]`
- `Cowbell [45 score]`
- `Minimap Module [50 score]`

This works functionally, but it does not create the feeling of owning, unlocking, equipping, or collecting. It also puts too much explanatory copy in the right pane.

The redesign must turn this into cards, tiles, cost badges, and a preview panel.

---

## Mock: World > Factions Screen

The Factions mock turns faction state into a dashboard.

Top-level World is active. Factions subtab is active.

The left pane shows a selected faction:

- crest / emblem
- faction name: `The Hearthbound Remnant`
- standing label: `Neutral`
- standing value: `+35`
- horizontal reputation meter from -100 to +100
- colored zones: Hostile, Wary, Neutral, Friendly, Ally
- marker showing current standing

Below the meter, concise effect lines show what standing changes:

- better prices
- access
- contracts
- lower hostility

Below that, compact cards summarize:

- Contracts
- Access
- Hostility

The right pane has a `Factions` detail panel with compact categories:

- Prices
- Access
- Contracts
- Hostility

Each has a color, icon, and up/down indicator.

The screen feels like a diplomatic dossier, not a feature explanation page.

---

## Current Factions Screenshot: What It Misses

The current faction screen is paragraph-heavy. It explains what factions do, but does not strongly visualize the current standing state.

The redesign must prioritize:

- current standing number
- standing meter
- faction crest
- compact effects
- actionable state cards

Avoid long text that explains the entire feature. Use short descriptions only where useful.

---

## Mock: Growth > Skill Tree Screen

The Skill Tree mock turns the existing node cloud into a readable RPG skill tree.

It includes:

- active Growth tab
- active Skill Tree subtab
- top summary strip with key build values
- large left skill tree canvas
- clearly colored skill branches / domains
- row/domain labels on the left
- rank columns across the top
- connected glowing circular nodes
- locked nodes shown with locks
- selected node highlighted with a strong ring/pointer

The right pane immediately displays selected node details:

- skill name
- icon
- domain/category
- rank
- cost
- concise description
- current effects
- next-rank preview

This removes the need for hidden inspect behavior.

The player should not need to press `I` just to understand the selected/hovered skill. Hovering or selecting a node should populate the detail pane.

---

## Current Skill Tree Screenshot: What It Misses

The current skill tree is functional but visually dense and underexplained.

Major misses:

- right pane is often empty or underused
- inspect behavior is hidden behind `I`
- nodes are cramped and visually similar
- branch categories are not clear enough
- selected/hovered state is not dramatic enough
- effects are not shown as clean numerical rows
- locked/unlocked/progress states do not feel premium

The redesign should not necessarily complete the full skill tree art overhaul immediately if the project is prioritizing SPECIAL, but the shell and detail-pane architecture must support this direction.

---

## Mock: World > Map Screen

The Map mock turns the map into a strategic exploration interface.

The left pane includes:

- framed map card
- title `Map — Depth 0`
- compass
- room grid
- current room highlighted with gold border
- visited rooms in blue
- special/entrance rooms in green
- unvisited adjacent rooms as dotted outlines
- door connectors
- legend
- coordinate chips
- biome chip
- depth chip
- explored percentage

The right pane shows contextual selected/current room information:

- current room title
- biome
- small room/biome preview
- hazards
- features
- points of interest
- short room note

This makes the map screen useful, readable, and visually rewarding.

---

## Current Map Screenshot: What It Misses

The current map is functional but plain.

It has room blocks, but lacks:

- strong selected/current room treatment
- meaningful legend presentation
- contextual room details
- strong panel framing
- chips for coordinates/biome/depth
- visual distinction between types of rooms
- a right-pane reason to exist

The redesign must treat map as a real exploration dashboard.

---

# Current Code Diagnosis

## What the current PR does correctly

The current implementation has started the right foundation:

- theme color tokens
- spacing tokens
- typography tokens
- motion tokens
- UI layout helpers
- generated UI assets
- generated tab icons
- generated frames/buttons/scroll rails
- basic nine-slice-style drawing
- a scroll panel class
- a focus manager
- a new SPECIAL main content builder
- real Apply/Reset buttons for SPECIAL
- some structured card builders for other tabs

These are good and should not be thrown away.

## What the current PR does not solve yet

### 1. Shell size and layout

The shell is too small for the mock direction.

The current default shell size around 640x520 and detail width around 220 are not enough for the desired layout.

The mock requires a larger, more dashboard-like space.

### 2. Fixed-position top navigation

Top tabs, title remnants, and Mana/status content are still too fixed-position and cramped.

The top bar needs a real layout system.

### 3. Monolithic overlay

`SkillTreeOverlay` still owns too much:

- all tab state
- many screen containers
- map content
- graph content
- cheat content
- style content
- faction content
- SPECIAL content
- text objects
- detail panel
- scrolling state
- masks
- row maps
- hover state
- refresh branching

This makes the UI difficult to polish and easy to regress.

### 4. Mixed old/new rendering paths

Some tabs use new structured content. Some still use raw text blocks and old scroll offsets. Some have custom special paths. This creates inconsistent behavior.

### 5. Scrolling regression

The new `UiScrollPanel` exists but is not used consistently. Screens that need scrolling, especially inventory-like screens, must regain scrolling through the shared scroll system.

### 6. Derived stats are still text-first

SPECIAL derived stats must be componentized into groups and rows. A single text blob is not enough.

### 7. Generated assets are too basic

Generated assets are correct philosophically but need to become more detailed:

- stronger frames
- richer tabs
- icons per stat/domain
- more obvious scroll rails
- section headers
- keycaps
- row plates
- selected states

### 8. Inventory is conceptually overloaded

Inventory currently mixes equipment and consumables/items. Gear needs separate Equipment and Items tabs.

---

# Required Top-Level Tab Structure

## Growth

Required subtabs:

- Skill Tree
- SPECIAL
- Spells

## Gear

Required subtabs:

- Equipment
- Items
- Style
- Cards
- Artifacts

Inventory should no longer be one overloaded tab that mixes equipment and consumables. If the code still has an internal inventory concept, that is fine, but the UI must split it.

### Equipment

For wearable/equippable gear.

Examples:

- weapon
- boots
- helm
- ring
- gloves
- cloak
- belt
- amulet

### Items

For non-equipment inventory.

This can include:

- consumables
- food
- materials
- quest items
- utility items
- cards if not separately handled
- miscellaneous inventory objects

The user-facing tab name should be **Items**, not Consumables, unless the contents are strictly consumable.

## World

Required subtabs:

- Map
- Dating
- Quests
- Factions

People may remain if already present, but the primary World subtabs should not become visually overcrowded. If People is retained, it needs a clear place and consistent styling.

## System

System tabs can include:

- Info
- Graph
- Cheats
- Settings
- Debug tools

System must use the same shell and layout style.

---

# Shell Requirements

## Shell size

The redesigned pause menu must be larger than the current 640x520 default.

Recommended behavior:

- use a responsive shell based on viewport size
- target approximately 86–92% of viewport width
- target approximately 82–88% of viewport height
- enforce minimum content-safe dimensions
- maintain pixel snapping

Suggested minimums:

```txt
shell width >= 900
shell height >= 560
detail pane width >= 300
main pane width >= 500
footer height >= 42
```

If the game window is too small, the UI may scale down, but the design should not be built around the cramped old shell.

## Outer frame

The outer frame must be generated procedurally but should look authored.

Requirements:

- dark translucent fill
- bright blue/cyan outer stroke
- inner glow stroke
- decorative pixel corners
- bottom footer enclosure
- subtle inner dividers
- ornamental edge pixels/notches
- no plain rectangle-only shell

## Background

The gameplay grid should remain faintly visible behind the menu.

Requirements:

- overlay dark enough for readability
- background still visible enough to retain game context
- no text contrast problems

## Top tab bar

Top tabs must be physical nav plates, not just text.

Each tab must include:

- icon
- label
- active/inactive state
- hover/focus state
- accent color
- generated tab frame
- consistent dimensions

Top tabs:

- Growth
- Gear
- World
- System

Mana/status cluster must be separate and must not collide with System.

## Subtab bar

Subtabs must be physical buttons/plates, not loose text.

Each subtab must include:

- label
- optional icon
- active state
- inactive state
- hover/focus state
- generated subtab frame
- consistent height

Subtabs must fit without collision. If a tab group has too many subtabs, use smaller labels, wrapping, or a layout strategy; do not allow overlap.

## Content region

The content region should support:

- main pane
- right detail pane
- optional top summary strip
- scroll panels
- card grids
- list rows
- maps
- skill graphs

## Footer control bar

The footer must be a segmented control hint bar.

Do not use one centered sentence as the primary footer.

Footer should support multiple hints:

```txt
[Click] Preview
[Wheel] Scroll
[Enter] Select
[Esc] Resume
```

Each hint should use generated keycap/icon sprites where possible.

Announcements may temporarily appear, but they should not permanently replace the structured footer.

---

# Procedural UI Sprite Forge Requirements

Create or expand a procedural UI asset generator that generates all necessary UI textures at runtime.

Recommended file direction:

```txt
src/ui/assets/pauseMenuGeneratedAssets.ts
src/ui/assets/uiAtlasKeys.ts
src/ui/assets/uiSpriteForge.ts
```

Names can vary, but the system should be explicit.

## Generated frame families

Generate frames for:

- outer shell
- inner panel
- detail panel
- content card
- selected card
- row
- selected row
- disabled row
- top tab active
- top tab inactive
- subtab active
- subtab inactive
- button active
- button disabled
- icon tile
- section header
- scroll rail
- scroll thumb
- keycap

Each frame should have consistent dimensions and variants.

## Generated icon families

Generate icons for:

### Top tabs

- Growth sprout
- Gear cog
- World globe
- System monitor

### Growth subtabs

- Skill Tree star/network
- SPECIAL star/badge
- Spells sparkle/rune

### Gear subtabs

- Equipment armor/slot
- Items pouch/bag
- Style sparkle/snake
- Cards card/book
- Artifacts relic/gem

### World subtabs

- Map folded map
- Dating heart
- Quests scroll
- Factions banner/bars/crest

### SPECIAL stats

- Strength fist
- Perception eye
- Endurance shield
- Charisma star/speech
- Intelligence book
- Agility wing/boot
- Luck clover

### Derived stat groups

- Core lightning/body
- Apples apple
- Survival heart/shield
- Terrain mountain/water
- Exploration compass
- Fishing hook
- Hunting claw/meat
- Social people/speech
- Factions crest
- Map compass
- Cards card
- Artifacts relic
- Equipment armor
- Items pouch

### Status/action icons

- lock
- check
- plus
- minus
- reset
- apply
- arrow up
- arrow down
- currency
- warning
- success
- disabled
- scroll wheel
- keyboard keycap

## Generated sprite quality requirements

Generated sprites must be:

- pixel-crisp
- readable at small sizes
- visually consistent
- accent-color aware
- dark-background compatible
- not blurry
- not overly thin
- not indistinct gray-on-blue

## Generated sprite style requirements

Use:

- chunky silhouettes
- 1–3 shade levels
- bright accent outline
- dark internal contrast
- optional glow dots
- small decorative highlights
- no complex unreadable details

---

# Layout System Requirements

## No hardcoded collision-prone top nav

Implement a layout helper for horizontal rows with fixed children and spacers.

The top bar should be computed, not hand-positioned.

Required concept:

```ts
layoutTopBar({
  left: topTabs,
  right: manaCluster,
  bounds,
  gap,
})
```

## Pixel snapping

All UI coordinates should snap to integer pixels.

Avoid fractional coordinates for text and small sprites where possible.

## Standard panes

Define standard regions:

```ts
shellRect
topTabRect
subTabRect
contentRect
mainPaneRect
detailPaneRect
footerRect
summaryStripRect
```

All screens should derive layout from these regions.

## Avoid one-off layout constants per screen

Some screen-specific layout is fine, but the shell bounds, gutters, pane widths, footer, tab rows, and detail pane placement should be centralized.

---

# Component Requirements

The implementation should introduce or complete semantic components, not only low-level graphics helpers.

## Required components

### PauseMenuShell

Owns:

- shell frame
- top tab bar
- subtab bar
- status/mana cluster
- content bounds
- footer hints
- common background
- screen switching

### TopTabBar

Owns:

- top tabs
- active state
- hover state
- click handling
- keyboard focus
- generated tab frames/icons

### SubTabBar

Owns:

- subtabs for active top tab
- active state
- hover state
- click handling
- generated subtab frames/icons

### FooterHintBar

Owns:

- segmented hints
- keycaps/icons
- default hint state
- temporary announcement behavior

### UiScrollPanel

Must become the standard list/card scrolling container.

Required:

- visible scroll rail
- wheel support
- content clipping
- keyboard scroll support where applicable
- works with containers of child objects, not only text
- can be used by any tab

### StatRow

For SPECIAL/derived stat rows.

Fields:

```ts
id
label
value
icon
accent
breakdown
previewValue
state
```

### DerivedStatGroup

Fields:

```ts
id
title
icon
accent
rows
```

### SpecialStatRow

Fields:

```ts
statId
label
value
committedValue
canIncrease
canDecrease
icon
accent
onIncrease
onDecrease
```

### ActionButton

States:

- default
- hover
- focus
- pressed
- disabled

Should support icon + label.

### DetailPane

Standard detail pane component.

Fields:

```ts
title
subtitle
icon
rank
cost
description
effectRows
footer
```

### EffectRow

For skill/item/stat deltas.

Fields:

```ts
label
currentValue
nextValue
deltaDirection
description
icon
```

### Card

Reusable base card with:

- title
- subtitle
- icon
- status
- accent
- selected/hover/disabled/locked states

---

# Scrolling Requirements

Scrolling is mandatory and must be restored everywhere content can overflow.

## Required scrollable tabs/panels

- SPECIAL derived stats
- Equipment list if equipment overflows
- Items list
- Style utilities
- Cards collection
- Artifacts list
- Quests
- Dating/People lists if present
- Factions list if multiple factions
- Spells list
- Any long detail/effect list where content exceeds available height

## Scroll affordance requirements

Every scrollable panel must show:

- visible rail when overflow exists
- visible thumb
- preferably arrow caps
- mouse wheel support
- clipped content
- no content drawing under footer or outside panel

## No invisible scroll

If a panel scrolls, the player must be able to see that it scrolls.

## No lost old scroll behavior

Any tab that scrolled before must still scroll after redesign.

---

# Focus and Input Requirements

## Mouse

Required:

- click top tab
- click subtab
- click row/card/node
- hover row/card/node updates detail pane where useful
- click buttons
- mouse wheel scrolls hovered/focused scroll panel
- hover state visible

## Keyboard

Required:

- navigate top tabs
- navigate subtabs
- navigate within active panel
- confirm/select
- back/resume
- scroll current panel
- use screen-specific actions

## Hidden inspect behavior

Do not require hidden `I` to inspect core info.

For skill tree, item rows, equipment, factions, cards, and artifacts, selection or hover should populate the detail pane.

`I` can remain as an alternate shortcut if desired, but not as the only way to access information.

## Focus manager

The focus manager should be used or expanded so that keyboard/controller-like navigation can work across cards, rows, buttons, and tabs.

---

# View Model Requirements

Avoid rendering raw game state directly in screen code.

Each redesigned screen should consume a view model.

Recommended builders:

```ts
buildSpecialScreenViewModel()
buildSkillTreeScreenViewModel()
buildEquipmentScreenViewModel()
buildItemsScreenViewModel()
buildStyleScreenViewModel()
buildCardsScreenViewModel()
buildArtifactsScreenViewModel()
buildMapScreenViewModel()
buildFactionsScreenViewModel()
buildQuestsScreenViewModel()
buildDatingScreenViewModel()
buildSpellsScreenViewModel()
buildSystemScreenViewModel()
```

The exact file structure is flexible, but screen rendering should receive structured data.

## Why this matters

The UI becomes easier to:

- render
- test
- mock
- redesign
- scroll
- compare
- inspect
- keep consistent

---

# SPECIAL Screen Detailed Requirements

## Purpose

SPECIAL should become the first true mock-quality screen.

It is the buildcraft page.

It must be quantitative, readable, and componentized.

## Required layout

### Top summary strip

Show headline build values as cards/chips:

- Speed
- Max Hearts
- Apple Invulnerability
- Frost Resistance or Heat Resistance

Each summary item must have:

- icon
- label
- value
- strong numeric emphasis
- consistent chip/card frame

### Left SPECIAL pane

Must include:

- section header
- unspent points display
- seven stat rows
- action buttons

Each stat row must include:

- generated SPECIAL icon
- full stat name
- value
- plus button
- minus button
- changed preview state if applicable
- disabled state if max/min/no points

Rows must be tall enough to read comfortably.

Avoid cramped abbreviations as the main identity. Abbreviations may appear as secondary text, but icons + full labels should carry the row.

### Action bar

Apply/Reset buttons must:

- be real button components
- include icons
- use uppercase or consistent button labels
- show disabled state clearly
- not appear as placeholder text
- not overlap footer

### Right derived stats pane

Must be a `UiScrollPanel` or equivalent.

Must render componentized groups, not one text blob.

Each group:

- header plate
- icon
- accent color
- stat rows

Each row:

- label left
- value right
- optional smaller breakdown line under
- row/card background
- numeric values emphasized

Example:

```txt
EXPLORATION
Treasure Discovery Chance             10%
Base 10% + PER 0% + LCK 0%

Powerup Discovery Chance              10%
Base 10% + PER 0% + INT 0%
```

### Derived stat groups

Required initial groups:

- Core
- Apples
- Survival
- Terrain
- Exploration
- Fishing
- Hunting
- Social

Not every group needs many rows, but the grouping must exist if rows exist.

## Quantitative-only requirement

SPECIAL derived stats should avoid qualitative explanations.

Prefer:

```txt
Buoyancy                         100%
Water Speed                       85%
Apple Invulnerability             0.5s
Frost Resistance                   75%
```

Avoid:

```txt
Water no longer kills you.
Cold rooms drain you slower.
```

Those explanations may belong in tooltips or future help, but not as the main derived stat list.

## Derived stats to support/display when available

Core:

- Speed
- Max Hearts
- Extra Lives
- Post-Hit Invulnerability

Apples:

- Apple Invulnerability
- Apple Bloom Chance
- Bonus Apple Count
- Special Apple Chance
- Rare Apple Chance
- Apple Score Multiplier
- Apple Shockwave Radius

Survival:

- Frost Resistance
- Heat Resistance
- Damage Reduction
- Powerup Invulnerability Duration

Terrain:

- Buoyancy
- Water Speed
- Wall Eating Chance
- Seismic Radius
- Terra Shield Charges

Exploration:

- Treasure Discovery Chance
- Powerup Discovery Chance
- Hazard Sense
- Wall Sense Radius

Fishing:

- Fishing Control
- Fishing Stability
- Fish Retention
- Rare Catch Chance

Hunting:

- Animal Bonus Drop Chance
- Animal Double Drop Chance
- Meat Recovery Chance

Social:

- Suspicion Reduction
- Fine Reduction
- Affection Gain
- Trust Gain
- Apology Effectiveness
- Intimidation Control

If some values are not wired yet, either omit them or show true zero/default values if they are honest. Do not show fake active values.

---

# Gear > Equipment Requirements

## Purpose

Equipment should be separated from Items.

It should show what the player has equipped and how it affects the build.

## Layout

Left pane:

- equipment slots as cards/rows
- current equipped item per slot
- empty states
- selected slot/item highlight

Slots:

- Weapon
- Boots
- Helm
- Ring
- Gloves
- Cloak
- Belt
- Amulet

Right pane:

- selected equipment detail
- item name
- slot
- description
- modifiers
- equip/unequip hint
- stat deltas if available

## Modifier display

Show equipment modifiers numerically.

Examples:

```txt
Speed                         +15%
Frost Resistance              +75%
Heat Resistance               +35%
Apple Invulnerability         +0.2s
Swimming / Buoyancy           +100%
```

If comparison against current equipment is possible, show deltas.

Example:

```txt
Speed                         +15% -> +3%
Frost Resistance              0% -> 75%
```

---

# Gear > Items Requirements

## Purpose

Items should hold non-equipment inventory.

This replaces the overloaded old Inventory tab for consumables and general items.

## Layout

Left pane:

- scrollable item list
- category badges if useful
- item count
- selected state

Right pane:

- selected item detail
- description
- use/eat/sell/quest status if available
- quantity
- any numeric effects

## Item categories

Possible categories:

- Food
- Consumable
- Material
- Quest
- Utility
- Misc

Do not overbuild category filtering unless easy. The required split is Equipment vs Items.

## Scrolling

Items must scroll.

This is required.

---

# Gear > Style Requirements

## Purpose

Style should feel collectible.

## Layout

Left:

- Palette section
- Hats section
- Utilities section

Right:

- snake preview
- selected item/card detail
- ownership count/status

## Palette section

Must render palette as visual swatch cards.

Classic Green should be marked equipped.

## Hats section

Must render hat slots as tiles.

States:

- selected
- available
- locked
- unknown

## Utilities section

Must render utility rows/cards with:

- icon
- name
- cost
- lock/owned state
- selected/hover state

Examples:

- Disable Walking Noise
- Cowbell
- Minimap Module

## Scrolling

Utilities/list content must scroll if it overflows.

---

# Gear > Cards Requirements

Cards should use the shared shell and scroll/card systems.

Minimum requirements:

- card list or grid
- selected card detail
- counts/status
- no raw wall-of-text collection dump if avoidable
- scrolling if collection overflows

---

# Gear > Artifacts Requirements

Artifacts should use card rows.

Minimum requirements:

- artifact icon
- artifact name
- concise effect/description
- selected detail pane
- numeric modifiers where possible
- scrolling if list overflows

---

# Growth > Skill Tree Requirements

The full skill tree redesign may not be the first priority, but the one-pass shell/component work must support it.

Minimum requirements for this pass:

- selected/hovered skill populates detail pane automatically
- no required hidden `I` for basic details
- node selected state is visually stronger
- domain/category colors are consistent
- locked nodes are visually clear
- footer controls are segmented
- detail pane can show effect rows

If fully redesigning skill tree in this pass, target the mock:

- branch lanes
- rank columns
- category labels
- glowing circular nodes
- selected node ring
- right pane with rank/cost/effects/next-rank preview

---

# Growth > Spells Requirements

Spells should use structured rows/cards.

Minimum requirements:

- spell/action slot rows
- selected spell detail pane
- bind/unbind hints
- scrolling if list overflows
- no raw text blob if avoidable

---

# World > Map Requirements

## Layout

Left:

- map card
- title
- room grid
- compass
- legend
- coordinate chips
- biome/depth/explored chips

Right:

- current/selected room detail

## Required map visuals

- current room visually obvious
- visited rooms distinct
- special/entrance rooms distinct
- adjacent unvisited rooms distinct
- doors/connectors visible
- depth visible
- coordinate visible
- legend readable

## Right pane

Should include compact sections:

- Current Room
- Biome
- Hazards
- Features
- Points of Interest
- short note

Avoid long explanations.

---

# World > Factions Requirements

## Layout

Left:

- faction crest
- faction name
- standing label
- standing value
- standing meter
- compact effect bullets
- cards for contracts/access/hostility/prices

Right:

- selected faction/system detail
- compact effect categories

## Standing meter

Must include:

- -100 Hostile
- -50 Wary
- 0 Neutral
- +50 Friendly
- +100 Ally
- current marker
- color zones

## No paragraph-first layout

The faction screen should not primarily be paragraphs explaining the feature. It should be a state dashboard.

---

# World > Quests Requirements

Quests should render as cards/rows.

Each quest card should include:

- title
- status
- short objective summary
- tracking state if available
- selected detail pane

Must scroll.

---

# World > Dating / People Requirements

Dating/People should use card rows.

Each card should include:

- name
- relationship/status values
- mood/affection/trust/jealousy if relevant
- selected detail pane

Must scroll if content overflows.

Avoid long explanation paragraphs in the right pane.

---

# System Requirements

System tabs should use the same shell.

Cheats/debug can remain more text-heavy, but should still use:

- card/list layout
- scroll panel
- footer hints
- detail pane

The System section should not visually regress to the old plain overlay.

---

# Detailed Mock vs Screenshot Nitpick Checklist

The implementation should address every item below.

## Shell

- [ ] Shell is larger than the current cramped screenshot.
- [ ] Outer frame has layered procedural ornamentation.
- [ ] Inner content areas have clear card/panel boundaries.
- [ ] Footer is part of the frame, not floating text.
- [ ] Background grid remains visible but subdued.
- [ ] Corners have generated decorative glints/notches.

## Top nav

- [ ] Growth/Gear/World/System are real tab plates.
- [ ] Active top tab is obvious.
- [ ] Inactive top tabs still have shape and icon.
- [ ] Mana/status does not overlap System.
- [ ] Top nav does not collide with HUD/title remnants.
- [ ] Top nav uses layout, not fragile fixed coordinates.

## Subtabs

- [ ] Subtabs are real buttons/plates.
- [ ] Active subtab is obvious.
- [ ] Subtabs have icons where useful.
- [ ] Subtab row does not overlap content.
- [ ] Long subtab sets fit or handle overflow gracefully.

## SPECIAL left pane

- [ ] Summary strip feels like headline build chips.
- [ ] Summary values have icons.
- [ ] SPECIAL rows have generated icons.
- [ ] Stat values are large enough.
- [ ] +/- buttons are easy to click.
- [ ] Apply/Reset buttons are styled and iconized.
- [ ] No useless non-scrollable Affected Attributes block.
- [ ] Left pane does not feel cramped.

## SPECIAL right pane

- [ ] Derived stats are grouped.
- [ ] Groups have colored header plates.
- [ ] Rows use label-left/value-right.
- [ ] Breakdown text is smaller and subordinate.
- [ ] Pane uses actual scroll panel.
- [ ] Scrollbar is obvious and juicy.
- [ ] No single giant derived-stats text blob.
- [ ] No qualitative feature explanations as main content.

## Footer

- [ ] Footer uses segmented hints.
- [ ] Hints use keycaps/icons.
- [ ] Announcements do not permanently replace structure.
- [ ] Controls are screen-specific.
- [ ] Footer text does not collide with content.

## Gear

- [ ] Equipment and Items are split.
- [ ] Equipment uses slots.
- [ ] Items uses item rows/cards.
- [ ] Both scroll when needed.
- [ ] Style uses cards/tiles/preview.
- [ ] Utility rows have icons/cost/lock states.

## World

- [ ] Map uses stronger room visuals and legend.
- [ ] Factions uses meter and cards, not paragraphs.
- [ ] Quests use cards/rows.
- [ ] Dating/People use cards/rows.
- [ ] All long lists scroll.

## Skill Tree

- [ ] Hover/selection updates detail pane.
- [ ] No hidden inspect requirement.
- [ ] Selected node is obvious.
- [ ] Details include numeric effects where possible.

---

# Code Requirements

## 1. Centralize shell layout

Create central layout computation.

Required output:

```ts
interface PauseMenuLayout {
  shell: UiRect;
  topTabs: UiRect;
  status: UiRect;
  subTabs: UiRect;
  content: UiRect;
  main: UiRect;
  detail: UiRect;
  footer: UiRect;
  summary?: UiRect;
}
```

All screens should use this.

## 2. Replace single hint text with FooterHintBar

Current one-line hint behavior is not enough.

Footer should support:

```ts
interface FooterHint {
  icon?: string;
  key?: string;
  label: string;
}
```

## 3. Use UiScrollPanel broadly

Do not maintain parallel old scroll systems for newly redesigned screens.

Use shared scroll panels for:

- derived stats
- equipment
- items
- style utilities
- cards
- artifacts
- quests
- dating/people
- spells
- factions if needed

## 4. Split Gear tabs

Update tab definitions:

From:

```txt
Inventory
Style
Cards
Artifacts
```

To:

```txt
Equipment
Items
Style
Cards
Artifacts
```

If internal tab IDs need to remain stable, map old `inventory` internally, but user-facing subtabs must be split.

## 5. Create generated sprite variants

Generated assets must include active/inactive/disabled/selected variants for frames/buttons/tabs/rows.

## 6. Make derived stats data structured

SPECIAL derived stats should not be rendered from formatted freeform strings.

Preferred structure:

```ts
interface DerivedStatRowView {
  id: string;
  label: string;
  value: string;
  breakdown?: string;
  icon?: string;
  accent?: number;
}

interface DerivedStatGroupView {
  id: string;
  title: string;
  icon?: string;
  accent: number;
  rows: DerivedStatRowView[];
}
```

Then the UI renders groups/rows.

## 7. Avoid fake values

If a stat is not wired, either:

- omit it
- show true zero/default
- mark it clearly as unavailable only if necessary

Do not imply a stat is active if gameplay does not consume it.

## 8. Preserve existing gameplay behavior

This pass is UI-focused.

Do not accidentally change:

- gameplay balance
- save compatibility
- item behavior
- skill effects
- SPECIAL math
- world generation behavior

Unless explicitly required for Equipment/Items UI splitting.

## 9. Preserve i18n where practical

The current code uses feature strings. Continue using i18n for labels where the system already supports it.

If adding temporary hardcoded labels for rapid UI iteration, isolate them so they can be moved into i18n later.

## 10. Avoid making the monolith worse

If `SkillTreeOverlay` remains the main class for this pass, at least extract rendering helpers/components enough that it does not become much worse.

Preferred:

- screen-specific render methods or classes
- shared components
- structured view models
- fewer raw text blobs
- fewer fixed-position constants

---

# Acceptance Criteria

## Visual acceptance

The redesigned SPECIAL screen should visibly resemble the mock direction:

- larger shell
- chunky top tabs
- chunky subtabs
- build summary strip
- iconized SPECIAL rows
- real action buttons
- grouped derived stats
- visible juicy scrollbar
- segmented footer hints

A screenshot of the implementation should not look like the old overlay with minor polish.

## Functional acceptance

- All tabs open.
- Top tabs switch correctly.
- Subtabs switch correctly.
- Gear has separate Equipment and Items tabs.
- Equipment and Items render correct contents.
- Scroll works where content overflows.
- SPECIAL +/- preview still works.
- SPECIAL Apply/Reset still works.
- Existing game menus remain usable.
- Existing save/load is not broken.
- Existing inventory/equipment actions still work.
- Existing style purchases/toggles still work.
- Existing quest/faction/map displays still work.

## Code acceptance

- UI tokens are used instead of scattered colors where possible.
- New procedural sprites are generated through a central forge.
- Derived stats are rendered from structured groups/rows.
- New scroll panels are used for redesigned list content.
- Footer hints are structured.
- Top nav layout avoids collision.
- There is no newly introduced requirement to press hidden keys for basic inspection.

## UX acceptance

- Player can tell which top tab is active.
- Player can tell which subtab is active.
- Player can tell what is selected.
- Player can tell what scrolls.
- Player can tell which controls are available.
- Player can read important values at a glance.
- Player can compare build-relevant numbers.
- Player can navigate with mouse.
- Player can navigate core elements with keyboard.

---

# Final Implementation Charge

Build the menu like the mocks are real targets, not inspirational posters.

The pass should not say:

> “We added the foundations and will make it pretty later.”

It should say:

> “The pause menu is now structurally and visually pointed at the mock direction, with the key screens already using the new language.”

The procedural sprite generator should become the game’s UI forge.

The shell should grow into a command center.

SPECIAL should become a real quantitative build sheet.

Gear should split Equipment and Items.

Scroll should work everywhere it is needed.

The right panes should show state, not essays.

The footer should show controls, not a sentence.

The whole menu should feel like a machine the player wants to open.
