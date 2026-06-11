# Pause Menu UI Redesign Requirements and Design

## Purpose

The pause menu should become the game’s systemic command center: a polished, readable, highly-structured interface where players manage growth, gear, world state, systems, buildcraft, progression, and run identity.

The current pause menu is functional, but visually and structurally it still behaves like a text-heavy debug overlay. The redesign should preserve the retro pixel-art identity of the game while moving the interface toward a premium neon RPG terminal: more readable, more navigable, more consistent, more interactive, and much more visually juicy.

This document defines the requirements, design tenets, architecture direction, reusable UI system, asset pipeline, and implementation plan for turning the current pause menu into the richer direction shown in the recent mockups.

---

## North Star

The pause menu is not a collection of unrelated screens.

It is a unified shell for the whole game.

Every tab should feel like it belongs to the same designed operating system:

- Growth explains how the player develops.
- Gear explains what the player owns, equips, collects, and customizes.
- World explains where the player is and how the world responds.
- System explains settings, meta controls, and technical/system information.
- SPECIAL and derived stats explain the current quantitative build state of the run.

The menu should feel like a real place players want to spend time in.

---

## Core Design Tenets

### 1. The pause menu is a system shell

The menu should have a consistent global identity across every tab:

- shared outer frame
- shared top tab treatment
- shared subtab treatment
- shared footer/control hint bar
- shared panel styles
- shared typography rules
- shared colors and accents
- shared selected/hover/disabled states
- shared scroll affordances
- shared detail pane behavior

Individual tabs can have unique layouts, but they should all feel like specialized pages inside the same interface language.

---

### 2. Make information denser and easier to read

The goal is not to reduce information. The goal is to structure it.

The current menu often displays information as large text blocks. The redesign should instead use:

- section headers
- cards
- stat rows
- value chips
- progress bars
- scroll panels
- summary strips
- icons
- detail panes
- selected states
- compact breakdowns

A screen can show more data than before as long as the player can scan it faster.

---

### 3. Quantitative information should be primary

For stats, builds, equipment, skills, and derived values, the UI should prioritize numbers over qualitative explanations.

The player should be able to use the UI to answer:

- How much speed do I have?
- How many hearts do I have?
- How long is apple invulnerability?
- What is my frost resistance?
- What is my apple bloom chance?
- How much does this item change my build?
- What would improve if I bought or equipped this?

The UI may include short labels or descriptions, but the main interaction should be quantitative and buildcraft-friendly.

---

### 4. The right pane should be contextual, not a wiki

The right-side detail pane should explain the selected thing, but it should not become a wall of text.

Good right-pane content:

- title
- icon
- category/subtitle
- cost/rank/status
- short description
- effect rows
- numerical preview
- unlock/locked state
- concise hints

Avoid:

- long paragraphs explaining the entire feature
- repeated tutorial text
- exact systemic documentation that belongs in a help screen
- text that does not change with selection

---

### 5. Controls should be discoverable

The footer hint bar should clearly show the controls relevant to the current screen.

Examples:

- `WASD / Arrows: Navigate`
- `Enter: Select`
- `E: Equip`
- `R: Refund`
- `Tab: Switch Tab`
- `Mouse Wheel: Scroll`
- `Esc: Resume`

Avoid hidden interactions like requiring `I` to inspect a skill unless the UI clearly communicates that behavior. Prefer selecting/hovering an item to immediately populate the detail pane.

---

### 6. Juice should support clarity

The redesign should have much more visual juice:

- neon borders
- selected glows
- pixel ornaments
- iconography
- animated glints
- panel shadows
- scroll rails
- color-coded sections
- richer cards
- stronger selected states

But juice must not reduce readability.

Rule of thumb:

> Ornament belongs at the edges. Information belongs in the center.

---

### 7. Buildcraft should be visible

The redesigned UI should make the game feel like it has more permutations, not just more features.

Especially for SPECIAL and derived stats, the menu should expose stackable build channels:

- Speed
- Max Hearts
- Apple Invulnerability
- Post-Hit Invulnerability
- Frost Resistance
- Heat Resistance
- Buoyancy
- Apple Bloom Chance
- Bonus Apple Count
- Special Apple Chance
- Rare Apple Chance
- Seismic Radius
- Wall Eating Chance
- Powerup Duration
- Treasure Discovery
- Fishing Control
- Suspicion Reduction

Players should be able to look at the menu and start planning builds.

---

## Visual Identity

### Theme

The UI should feel like:

- retro pixel RPG
- neon terminal
- magical system interface
- arcade command center
- roguelike dossier

A good shorthand:

> Neon ritual terminal.

### Primary visual ingredients

- dark navy/black translucent panels
- electric cyan/blue outer frames
- green Growth accents
- blue Gear accents
- cyan World accents
- steel/gray System accents
- colored subdomain accents
- crisp white pixel text
- muted blue secondary text
- gold/yellow numbers for important values
- ornate pixel corners and separators
- subtle background grid/scanline texture
- tasteful glow effects

### Avoid

- flat rectangles with plain text
- huge paragraphs
- inconsistent tab styles
- tiny unstyled controls
- placeholder bracket buttons like `[Apply disabled]`
- important text hidden below non-scrollable areas
- every element glowing equally

---

## Information Architecture

### Global top-level tabs

The pause menu should keep four primary top-level tabs:

1. **Growth**
2. **Gear**
3. **World**
4. **System**

### Current subtabs

Growth:

- Skill Tree
- SPECIAL
- Spells

Gear:

- Inventory
- Style
- Cards
- Artifacts

World:

- Map
- Dating
- Quests
- Factions

System:

- To be defined, but should use the same shell and components.

### Standard screen anatomy

Most screens should use this structure:

1. Outer neon frame
2. Top-level tab bar
3. Mana/status area
4. Subtab bar
5. Optional summary strip
6. Main content pane
7. Context/detail pane
8. Footer hint bar

A standard split should be approximately:

- 60–70% left/main content
- 30–40% right/detail pane

Some screens may use custom layouts, but they should still use the same shell, frame, tab bars, and footer.

---

## UI Design System Requirements

The redesign should introduce a centralized UI design system rather than continuing to hand-build each tab independently.

### Required theme/token files

Recommended structure:

```txt
src/ui/theme/
  uiTokens.ts
  uiColors.ts
  uiSpacing.ts
  uiTypography.ts
  uiMotion.ts
```

### Color tokens

Define named colors instead of inline values.

Required token groups:

```ts
panelBgPrimary
panelBgSecondary
panelBgInset
panelBorder
panelBorderMuted
panelGlow
textPrimary
textSecondary
textMuted
textDisabled
valuePrimary
valuePositive
valueNegative
valueWarning
accentGrowth
accentGear
accentWorld
accentSystem
accentCore
accentSurvival
accentUtility
accentFlow
accentCommand
accentArcana
accentExploration
accentApples
accentFishing
accentSocial
danger
warning
success
locked
disabled
```

### Spacing tokens

```ts
xs
sm
md
lg
xl
panelPadding
sectionGap
cardGap
rowGap
tabGap
footerHeight
headerHeight
detailPaneWidth
```

### Typography tokens

```ts
titleLarge
titleMedium
sectionHeader
body
bodySmall
valueLarge
valueMedium
hint
caption
```

These do not need to be complex at first. Even constants for font size, line height, and color are enough to make a major improvement.

### Motion/effect tokens

```ts
glowLow
glowMedium
glowHigh
hoverPulse
selectionPulse
panelFadeMs
tabTransitionMs
scrollEaseMs
```

Motion should be optional and restrained.

---

## Core UI Components

The redesign should introduce reusable components/widgets.

Recommended structure:

```txt
src/ui/core/
  UiPanel.ts
  UiText.ts
  UiIcon.ts
  UiButton.ts
  UiScrollPanel.ts
  UiFocusManager.ts
  UiInputMap.ts
  UiNineSlice.ts

src/ui/layout/
  PauseShell.ts
  TopTabBar.ts
  SubTabBar.ts
  FooterHintBar.ts
  SplitPane.ts
  DetailPane.ts
  SummaryStrip.ts
  SectionBlock.ts
  CardGrid.ts
  ListPanel.ts

src/ui/widgets/
  StatRow.ts
  StatCard.ts
  EffectRow.ts
  CostBadge.ts
  ProgressBar.ts
  StandingBar.ts
  HeaderCard.ts
  ItemRow.ts
  LockTile.ts
  MiniPreviewCard.ts
  LegendBlock.ts
  SkillNode.ts
  SkillLink.ts
  SkillDetailPanel.ts
  MapRoomTile.ts
  MapLegend.ts
  ScrollRail.ts
```

The exact file names can change, but the goal is clear:

> Screens should be assembled from reusable pieces, not redrawn from scratch every time.

---

## Required Shared Components

### PauseShell

Responsible for:

- outer frame
- dark overlay background
- top-level tabs
- mana/status area
- subtab row
- content region bounds
- footer hint bar
- consistent padding/margins

The shell should not know the details of each tab’s content.

---

### TopTabBar

Required behavior:

- active tab highlight
- hover state
- icon + label
- disabled state if needed
- consistent dimensions
- clickable with mouse
- navigable by keyboard

---

### SubTabBar

Required behavior:

- active subtab highlight
- hover state
- icon + label where useful
- consistent row spacing
- clickable with mouse
- navigable by keyboard

---

### FooterHintBar

Required behavior:

- displays screen-specific controls
- uses icon/keycap components
- updates from the focused screen
- consistent location and style

Example model:

```ts
interface FooterHint {
  input: string;
  label: string;
}
```

---

### DetailPane

Required behavior:

- title
- subtitle/category
- optional icon
- optional cost/rank/status
- effect rows
- short text block
- optional preview area
- consistent section dividers

The detail pane should be updated by selection/hover where possible.

---

### ScrollPanel

Required behavior:

- clips child content
- supports mouse wheel
- supports keyboard scroll
- shows visible scroll rail when content overflows
- optionally supports scroll arrows
- can be used for derived stats, inventory lists, quest lists, etc.

---

### Button

Required states:

- default
- hover
- selected/focused
- pressed
- disabled
- locked

Buttons should never be represented as bracketed text.

---

### StatRow / StatCard

For derived stats and build values.

Required fields:

```ts
interface StatDisplay {
  id: string;
  label: string;
  value: string;
  icon?: string;
  accent?: string;
  breakdown?: string;
  previewValue?: string;
  state?: 'normal' | 'increased' | 'decreased' | 'disabled';
}
```

---

### EffectRow

For skill effects, item effects, artifact effects, preview deltas.

Example:

```txt
Block Strength      40 -> 50
Slow Duration       1.0s -> 1.5s
Cooldown            3.0s -> 2.5s
```

---

### ProgressBar / StandingBar

Used for:

- faction standing
- progress/rank
- maybe XP, reputation, relationship, etc.

Must support:

- min/max
- marker
- color zones
- labels
- selected/current state

---

## Screen Requirements

## Growth > SPECIAL

### Purpose

The SPECIAL screen should be the central buildcraft stats page.

It should show:

- core SPECIAL stats
- unspent points
- preview controls
- quantitative derived stats
- key build summary values

### Layout

Left side:

- top summary strip
- SPECIAL header
- seven stat rows
- unspent points
- Apply / Reset buttons
- short footer hint only

Right side:

- scrollable Derived Stats pane
- grouped stat sections
- visible scrollbar
- concise stat rows with values and numeric breakdowns

### Remove

The old non-scrollable “Affected Attributes” block under Apply/Reset should be removed or moved into a separate inspect/details behavior later. It currently wastes space and can be cut.

### Top summary strip

Show a small number of headline build stats, for example:

```txt
Speed: +0%
Max Hearts: 3
Apple Invulnerability: 0.5s
Frost Resistance: 0%
```

These should be configurable and may eventually update based on player build relevance.

### Derived stat sections

Initial recommended sections:

- Core
- Apples
- Survival
- Terrain
- Exploration
- Fishing
- Hunting
- Social

Example rows:

```txt
Speed                         +0%
Max Hearts                    3
Apple Invulnerability          0.5s
Post-Hit Invulnerability       0.0s
Frost Resistance               0%
Heat Resistance                0%
Buoyancy                       0%
Water Speed                    0%
Apple Bloom Chance             0%
Bonus Apple Count              +0
Special Apple Chance           0%
Treasure Discovery Chance      10%
Powerup Discovery Chance       10%
Fishing Control                +0%
Animal Bonus Drop Chance       +0%
Suspicion Reduction            0%
```

### Quantitative design rule

The SPECIAL page should avoid qualitative explanations like:

```txt
Water no longer kills you.
```

Prefer:

```txt
Buoyancy: 100%
Water Speed: 85%
```

Short labels are okay. The primary information should be numeric.

---

## Growth > Skill Tree

### Purpose

The skill tree should be a build planning screen, not a cryptic node grid.

### Required improvements

- show selected skill details automatically in right pane
- remove dependency on hidden `I` inspect behavior
- use branch/domain colors
- make selected node visually obvious
- show rank, cost, current effects, next-rank preview
- show locked nodes clearly
- show footer controls consistently

### Suggested domains

- Core
- Survival
- Utility
- Flow
- Command
- Arcana

### Right pane detail fields

```txt
Skill Name
Domain
Rank X / Y
Cost
Short description
Current effects
Next rank effects
```

### Effect row style

Use numeric rows wherever possible:

```txt
Block Strength      40 -> 50
Slow Duration       1.0s -> 1.5s
Cooldown            3.0s -> 2.5s
```

---

## Gear > Style

### Purpose

Style should feel like a collectible/customization screen, not a plain list.

### Required improvements

- palette swatch cards
- selected/equipped states
- hat slot grid
- locked utility tiles
- cost badges
- right-side snake preview
- concise detail text

### Layout

Left:

- Palette section
- Hats section
- Utilities section

Right:

- Snake preview card
- selected item detail
- owned/unlocked count

### Example rows

```txt
Classic Green      Equipped
No Hat             Selected
Disable Walking Noise      100
Cowbell                    45
Minimap Module              50
```

### Detail pane

Keep concise:

```txt
Snake Style
Cosmetics

Equip owned palettes and hats.
Unlock new looks and utilities as you explore.
```

Do not over-explain minimap mechanics in the detail pane unless the Minimap Module row is selected.

---

## World > Factions

### Purpose

Factions should feel like a standing/reputation dashboard.

### Required improvements

- faction crest/icon
- numeric standing
- standing label
- horizontal reputation meter
- effect cards
- concise faction benefits
- right-side standing detail pane

### Layout

Left:

- selected faction title and crest
- standing value and label
- reputation meter from hostile to ally
- compact effect bullets
- cards for contracts/access/hostility/prices

Right:

- compact detail pane
- effect categories
- no massive explanation paragraphs

### Example data

```txt
The Hearthbound Remnant
Neutral +35

Prices: Improved
Access: Markets, Enclaves
Contracts: 2 available
Hostility: Low
```

### Standing meter labels

```txt
-100 Hostile
-50 Wary
0 Neutral
+50 Friendly
+100 Ally
```

---

## World > Map

### Purpose

Map should become a readable exploration dashboard.

### Required improvements

- framed map panel
- stronger room tile visuals
- current room highlight
- visited/special/unvisited/door indicators
- legend
- coordinate/biome/depth chips
- right-side room detail card

### Layout

Left:

- map title
- room grid
- compass
- legend
- coordinate footer chips

Right:

- current room title
- biome
- hazards
- features
- points of interest
- compact room note

### Example right pane

```txt
Current Room

Twisted Roots
Grove

Hazards
- Entangled Vines
- Low Light

Features
- Ancient Tree
- Soft Soil

Points of Interest
- Mossy Chest
- Whispering Stone
```

Descriptions should be concise.

---

## Asset Pipeline Requirements

The redesign requires real UI assets, not only drawn Phaser rectangles.

### Required asset categories

#### Structural UI

- outer window frame
- inner panel frame
- tab frames
- button frames
- section dividers
- scroll rails
- scroll thumbs
- decorative corners
- selection outlines
- card backgrounds

#### Icons

- top-level tab icons
- subtab icons
- SPECIAL stat icons
- derived stat icons
- skill domain icons
- item/category icons
- faction icons
- map legend icons
- hazard/feature/POI icons
- footer key/control icons
- lock/check/arrow/currency icons

#### FX sprites

- selected glints
- hover shimmer
- sparkle particles
- pulse rings
- subtle corner flickers
- glow overlays

#### Content preview art

- snake preview poses
- faction crests
- biome/room thumbnails
- artifact/card placeholders
- utility item icons

---

## Asset Production Workflow

### Recommended workflow

1. Generate concept mockups and style sheets.
2. Pick a canonical visual direction.
3. Generate or draw icon sheets and frame sheets.
4. Clean up final assets in Aseprite or another pixel-art tool.
5. Export to sprite atlases.
6. Use atlas keys from the UI component layer.
7. Implement UI via reusable components.

### Do not

- use mockup screenshots directly as UI assets
- create every panel as a one-off image
- generate random icons without a consistent icon family
- mix pixel densities
- rely on glow to hide poor readability

---

## Sprite Atlas Requirements

Recommended atlases:

```txt
assets/ui/ui_frames.png
assets/ui/ui_frames.json

assets/ui/ui_icons.png
assets/ui/ui_icons.json

assets/ui/ui_skill_icons.png
assets/ui/ui_skill_icons.json

assets/ui/ui_fx.png
assets/ui/ui_fx.json

assets/ui/ui_previews.png
assets/ui/ui_previews.json
```

### Atlas key examples

```ts
ui.frame.outer
ui.frame.panel.standard
ui.frame.panel.hero
ui.frame.button.default
ui.frame.button.hover
ui.frame.button.disabled
ui.icon.tab.growth
ui.icon.tab.gear
ui.icon.stat.strength
ui.icon.stat.perception
ui.icon.domain.survival
ui.icon.lock
ui.icon.check
ui.fx.sparkle
```

---

## Nine-Slice Requirements

Panel frames, buttons, cards, and major content boxes should use nine-slice or tiled-frame logic where possible.

This allows:

- scalable ornate frames
- reusable corner art
- consistent borders
- fewer one-off assets
- easier responsive layout adjustments

Required nine-slice components:

- outer window frame
- content panel
- detail panel
- card
- list row
- button
- selected highlight

If Phaser’s built-in support is insufficient, create a small wrapper/helper for pixel-perfect nine-slice rendering.

---

## Interaction Requirements

### Keyboard

Required:

- switch top tabs
- switch subtabs
- navigate within current screen
- confirm/select
- back/resume
- scroll focused pane
- screen-specific actions where needed

### Mouse

Required:

- click top tabs
- click subtabs
- hover rows/cards/nodes
- click buttons
- mouse wheel scroll
- visible hover/focus states

### Focus

The UI should track a current focus/selection state.

Example:

```ts
interface PauseUiFocusState {
  topTab: 'growth' | 'gear' | 'world' | 'system';
  subTab: string;
  focusedRegion: 'main' | 'detail' | 'footer';
  selectedId?: string;
  selectedIndex?: number;
  scrollOffset?: number;
}
```

A focus manager should eventually own directional navigation, selected item, hover state, and footer hint updates.

---

## Data/View Model Requirements

Each tab should render from a view model rather than directly pulling arbitrary game state throughout the UI.

Recommended view model builders:

```ts
buildSpecialViewModel(game): SpecialScreenViewModel
buildSkillTreeViewModel(game): SkillTreeScreenViewModel
buildStyleViewModel(game): StyleScreenViewModel
buildFactionViewModel(game): FactionScreenViewModel
buildMapViewModel(game): MapScreenViewModel
```

Benefits:

- cleaner rendering code
- easier tests
- easier mocks
- easier future redesigns
- less coupling between UI and game internals

---

## Suggested Code Structure

```txt
src/ui/
  theme/
    uiTokens.ts
    uiColors.ts
    uiSpacing.ts
    uiTypography.ts
    uiMotion.ts

  assets/
    uiAtlasKeys.ts
    uiIconKeys.ts
    uiFrameKeys.ts

  core/
    UiPanel.ts
    UiText.ts
    UiIcon.ts
    UiButton.ts
    UiScrollPanel.ts
    UiNineSlice.ts
    UiFocusManager.ts
    UiInputMap.ts

  layout/
    PauseShell.ts
    TopTabBar.ts
    SubTabBar.ts
    FooterHintBar.ts
    SplitPane.ts
    DetailPane.ts
    SummaryStrip.ts
    SectionBlock.ts
    CardGrid.ts
    ListPanel.ts

  widgets/
    StatRow.ts
    StatCard.ts
    EffectRow.ts
    CostBadge.ts
    ProgressBar.ts
    StandingBar.ts
    HeaderCard.ts
    ItemRow.ts
    LockTile.ts
    MiniPreviewCard.ts
    LegendBlock.ts
    ScrollRail.ts
    SkillNode.ts
    SkillLink.ts
    SkillDetailPanel.ts
    MapRoomTile.ts
    MapLegend.ts

  screens/
    pause/
      PauseMenuScreen.ts
      tabs/
        GrowthSkillTreeScreen.ts
        GrowthSpecialScreen.ts
        GrowthSpellsScreen.ts
        GearInventoryScreen.ts
        GearStyleScreen.ts
        GearCardsScreen.ts
        GearArtifactsScreen.ts
        WorldMapScreen.ts
        WorldDatingScreen.ts
        WorldQuestsScreen.ts
        WorldFactionsScreen.ts
        SystemScreen.ts
```

This does not need to be implemented all at once. It is the destination architecture.

---

## Migration Plan

### Phase 1: Design-system foundation

Implement:

- UI tokens
- color palette
- text helpers
- panel helper
- button helper
- footer hint helper
- scroll panel helper
- basic icon abstraction

Deliverable:

- Current screens still work.
- New primitives exist.
- No major visual rewrite yet.

---

### Phase 2: Pause shell extraction

Extract the global pause menu shell from the current overlay.

Implement:

- outer frame
- top tab bar
- subtab row
- content bounds
- footer hint bar

Deliverable:

- All existing tabs render inside the new shell.
- Tabs still function.
- The code has a clear place for shared visual style.

---

### Phase 3: First hero screen

Choose one screen to fully redesign using the new design system.

Recommended first candidates:

1. Growth > SPECIAL
2. World > Factions

SPECIAL is probably best because it directly supports the current buildcraft/stat work.

Deliverable:

- one screen looks close to the mock style
- proves layout/components
- reveals missing primitives before wider migration

---

### Phase 4: Second hero screen

Redesign a very different screen to prove flexibility.

Recommended:

- World > Factions if SPECIAL was first
- Gear > Style if Factions was first

Deliverable:

- design system supports both numeric/stat screens and list/detail screens

---

### Phase 5: Remaining tab conversions

Recommended order:

1. SPECIAL
2. Factions
3. Style
4. Map
5. Skill Tree
6. Inventory
7. Artifacts
8. Cards
9. Spells
10. Quests
11. Dating
12. System

Skill Tree is visually high-impact but likely more complex. It can wait until the core shell and component system are stable.

---

### Phase 6: Art/juice pass

After components and screens are stable, add:

- sprite atlas frames
- icon families
- glow sprites
- hover glints
- subtle animations
- better panel ornaments
- richer preview art

Do not over-polish before the component structure is stable.

---

## Acceptance Criteria

### Global UI

- All pause menu tabs use the shared shell.
- Top tab and subtab visual behavior is consistent.
- Footer controls are visible and context-specific.
- No screen relies on hidden keybinds for basic inspection.
- Hover/selected/disabled states are visually distinct.
- Scrollable content has visible scroll affordances.

### Visual

- Screens have clear hierarchy.
- Large walls of text are reduced or transformed into structured cards/rows.
- Color semantics are consistent.
- Icons are used for major categories and rows.
- Important values are visually emphasized.
- Disabled buttons look intentional, not placeholder-like.

### SPECIAL

- SPECIAL stat rows are clean and visually prominent.
- Apply/Reset are real buttons.
- Unspent points are clear.
- Derived stats are grouped, scrollable, and quantitative.
- The useless non-scrollable “Affected Attributes” area is removed.
- Top summary strip shows headline build values.

### Skill Tree

- Selecting/hovering a node immediately updates the detail pane.
- Node ranks/cost/effects are visible.
- Locked nodes are clearly locked.
- Domain/branch colors are consistent.
- No required `I` inspect behavior for basic details.

### Gear > Style

- Palette, hats, and utility unlocks are visually distinct.
- Equipped/locked/available states are clear.
- Right pane shows a snake/style preview.
- Utility rows show cost/status cleanly.

### World > Factions

- Faction standing is visible as both number and meter.
- Benefits are structured into compact cards.
- Right pane avoids oversized explanatory text.
- Switching factions is discoverable.

### World > Map

- Current room is visually obvious.
- Visited/special/unvisited rooms are visually distinct.
- Legend is readable.
- Right pane shows concise contextual room data.

---

## Non-Goals For Initial Redesign

Do not try to solve all of these in the first pass:

- full controller support
- complete animation system
- fully finalized icon atlas
- every tab fully redesigned at once
- draggable windows
- responsive layouts for arbitrary screen sizes
- complete accessibility overhaul
- in-game tutorial/help codex
- fully generated art pipeline automation

These can come later.

---

## Open Questions

1. Should the menu have an in-universe name or framing device?
2. Should the summary strip appear on all Growth screens or only SPECIAL/Skill Tree?
3. Should each top-level tab have a distinct accent shape, or only a distinct color/icon?
4. Should mouse hover or keyboard selection be the primary detail-pane driver?
5. Should SPECIAL derived stats eventually support equipment comparison previews?
6. Should the right pane always exist, or can some screens use full-width layouts?
7. Should tab content be rebuilt on selection or kept alive and hidden?
8. What is the final icon resolution target?
9. What pixel font sizes are acceptable at 1280x720 and 1440x1080?
10. How much animation is acceptable before the menu feels too noisy?

---

## Final Design Statement

The redesigned pause menu should feel like a premium retro-neon command center for the entire game.

It should preserve the game’s weirdness, humor, and density while making every system easier to understand, compare, navigate, and build around.

The goal is not merely to make the UI prettier.

The goal is to make the game feel deeper.

A player should open the menu and think:

> “There is a whole machine here, and I can build around it.”
