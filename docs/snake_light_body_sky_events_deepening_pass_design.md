# Snake for the Modern Gamer — Light, Body, and Sky Events Deepening Pass

**Document type:** Requirements and design specification  
**Feature pass:** Systemic atmosphere deepening pass  
**Output target:** Markdown implementation/design document for an AI coding agent  
**Core thesis:** The first atmosphere pass made the world have weather. This pass makes weather, night, shelter, light, and body state matter to the player without over-explaining the math.

---

## 1. Executive Summary

The current repository now has a substantial World Atmosphere system. It tracks seasons, day phases, global weather, local biome translations, particles, tint, atmosphere audio, save/load state, and gameplay modifiers. The next pass should **deepen** that system rather than simply add more weather.

The approved direction is:

1. **Darkness and light become real.**  
   Night exists, so visibility should matter. Normal night should remain playable, but some places, especially dense forests, underground spaces, interiors, eclipses, and a future always-night biome, can become meaningfully dark. A lantern should be useful and sometimes necessary.

2. **Heat and cold become separate body states.**  
   Heat and cold should not share one invisible generic temperature meter. Cold exposure and heat exposure should be independent tracks. Going from a cold biome into a hot biome should warm the snake up instead of continuing the same doom meter. Both states need escalating visual/audio juice before damage begins.

3. **Shelter becomes nuanced.**  
   The current implementation risks conflating cave biomes with cave interiors. Cave biomes should still have local weather translation. Actual interiors should suppress direct sky weather. Underground spaces should translate rain into cave drips, storms into rumble, fog into mist/spores, and so on.

4. **Rare sky events are added, but kept limited.**  
   Add only four: Blood Moon, Eclipse, Meteor Shower, Aurora. These are not ordinary weather types. They are rare world-level events that override or modify normal light/weather behavior.

5. **The Atmosphere UI becomes player-facing.**  
   The UI should keep the day clock. The season clock should be smaller. Current weather should be a forecast-like icon card, not just text. The UI should show sky, local air, light, body, shelter, and a broad weather shift indicator. It should hide exact percentages/scalars unless debug mode is enabled.

6. **Internal atmosphere effect tags make future systems easier.**  
   Add internal tags like `wet`, `low-visibility`, `heat-pressure`, `cold-pressure`, `storm-charged`, `requires-light`, `blood-moon`, etc. These tags should power systems. They should not be dumped into normal UI.

This pass should feel like the game now has **local skies, darkness, body feel, and rare nights**, not like a spreadsheet was added.

---

## 2. Current Repository Context

This design is rooted in the current code after PR #98.

### 2.1 Existing atmosphere types

Current file:

```text
src/world/atmosphereTypes.ts
```

Currently includes:

```ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type GlobalWeather = 'clear' | 'rain' | 'storm' | 'fog' | 'heatwave' | 'coldfront' | 'wind';
```

It also has `LocalWeatherVisual` with values including:

```ts
'clear' | 'rain' | 'heavyRain' | 'snow' | 'sleet' | 'whiteout' | 'mist' | 'fog' |
'steam' | 'ashfall' | 'fallout' | 'caveDrip' | 'dryLightning' | 'thunder' |
'monsoon' | 'seaSpray' | 'neonRain' | 'petals' | 'fireflies' | 'boneDust' |
'oilRain' | 'dustStorm' | 'heatHaze' | 'aurora' | 'sporeCloud' | 'leafFall'
```

Existing types also include:

- `AtmosphereState`
- `AtmosphereConfig`
- `AtmosphereTint`
- `ResolvedAtmosphereTint`
- `AtmosphereParticleProfile`
- `ResolvedAtmosphereParticleProfile`
- `LightningProfile`
- `AtmosphereGameplayModifiers`
- `ResolvedAtmosphereGameplayModifiers`
- `BiomeAtmosphereResponse`
- `BiomeAtmosphereProfile`
- `ResolvedAtmosphereView`
- `DAY_PHASE_ORDER`
- `DAY_PHASE_DURATION_SCALARS`
- `SEASON_ORDER`
- `NO_LIGHTNING_PROFILE`
- `RARE_TELEGRAPHED_LIGHTNING`

This pass should extend these types instead of replacing them.

### 2.2 Existing atmosphere system

Current file:

```text
src/world/atmosphereSystem.ts
```

Current behavior:

- Starts new runs at `spring`, `day`, `clear`.
- Advances through `dawn -> day -> dusk -> night`.
- Increments `worldDay` when wrapping from night to dawn.
- Computes season based on `worldDay / daysPerSeason`.
- Rolls global weather from base weights plus season/day-phase modifiers.
- Supports deterministic seeded weather sequences.
- Exposes `forceWeather(weather)` for dev/testing.
- Tracks `weatherIntensity`.
- Tracks remaining weather phase ticks.

This pass should add sky event rolling to this same system.

### 2.3 Existing atmosphere profiles

Current file:

```text
src/world/biomeAtmosphereProfiles.ts
```

There are explicit profiles for all 23 current biomes.

Important existing translations:

- `rainforest`: clear weather can still be local rain.
- `frozen-sea`: rain becomes snow; storm becomes whiteout.
- `glass-desert`: storm becomes dry lightning.
- `ember-waste`: rain becomes steam.
- `sable-depths`: rain becomes cave drips.
- `neon-underpass`: rain becomes neon rain.
- `radioactive-orchard`: rain/storm/clear can be fallout.
- `clockwork-quarry`: rain becomes oil rain.

This pass should not discard these. It should deepen them with shelter, darkness, sky events, and internal tags.

### 2.4 Existing resolver and defaults

Current files:

```text
src/world/atmosphereDefaults.ts
src/world/atmosphereResolver.ts
```

Current resolver produces `ResolvedAtmosphereView` from:

- biome definition
- atmosphere state
- config
- biome profile
- tag-derived weather defaults
- season/day/weather responses

Known issue to fix: tag-derived defaults can override biome-specific clear/default/day/night visuals. Tag defaults should become fallback, not destructive override.

### 2.5 Existing SnakeGame integration

Current file:

```text
src/game/snakeGame.ts
```

Current behavior:

- `SnakeGame` owns a `WorldAtmosphereSystem`.
- `updateAtmosphere(deltaMs)` updates it.
- `getAtmosphereState()` exposes it.
- `forceAtmosphereWeather(weather)` exists.
- `getAtmosphereForRoom(room)` resolves local atmosphere.
- Atmosphere saves/loads.
- Enemy and animal spawn code receives atmosphere.
- Temperature exposure uses atmosphere hot/cold scalars.

Known issue to fix: `getAtmosphereForRoom` currently disables atmosphere for cave/underground biome tags. That is too broad. Cave biomes should retain local atmosphere; actual interior/cave rooms should shelter direct sky effects.

Known issue to fix: atmosphere time and gameplay hazard time are too conflated. Menus/dialogues/shops should not accumulate hazard temperature damage via shared `timeMs`.

### 2.6 Existing renderer integration

Current file:

```text
src/ui/snakeRenderer.ts
```

Current renderer already accepts:

```ts
atmosphere?: ResolvedAtmosphereView;
renderTimeMs?: number;
```

It already draws:

- base atmosphere tint
- atmosphere ground juice
- background particles
- foreground particles
- lightning flash

This pass should add:

- darkness overlay
- local light sources
- lantern radius
- thermal body juice
- lightning telegraph markers if gameplay lightning is enabled/scaffolded
- meteor shower flashes / impact light if sky events include meteor impacts

### 2.7 Existing Atmosphere UI

The current screenshot shows an Atmosphere tab under WORLD. It has:

- a day clock
- a season clock
- text rows for shelter/time/global weather/local weather/weather reroll
- a right-side explanation panel

This is a solid prototype, but it is too debug-like. The redesigned UI should keep the clocks, make season smaller, add a current weather icon card, show light/body/shelter status, and hide raw percentages in normal mode.

---

## 3. Design Goals

### 3.1 Make atmosphere more player-facing

Players should notice:

- night has arrived
- this forest is too dark
- a lantern would help
- rain becomes snow here
- an eclipse made daylight fail
- the snake is freezing
- the cave is not raining, but it is dripping

Players should not need to read raw scalar values.

### 3.2 Add systemic depth, not one-off content bloat

This is a systemic pass. The implementation should create reusable systems:

- shelter mode
- darkness/light model
- thermal tracks
- sky event model
- effect tags
- UI helpers

Avoid adding lots of one-off weather-gated content in this pass.

### 3.3 Preserve the current biome atmosphere work

Existing biome profiles are good. Do not throw them away. Add profile fields for light/darkness and shelter handling.

### 3.4 Keep normal night playable

Night should not make the whole game annoying. Most outdoor night should be `dim`, not pitch black. Darkness should become severe in specific conditions or places.

### 3.5 Avoid over-explanation

The UI should abstract details. Debug mode can show exact values.

Normal UI examples:

```text
Spring · Day · Clear
Light: Bright
Body: Stable
Shelter: Exposed
```

Not:

```text
weatherIntensity=0.35
visibilityScalar=0.94
coldRateScalar=1.18
effects=[wet, low-visibility]
```

---

## 4. Non-Goals

This pass should not implement:

- many new ordinary weather types
- weather-is-wrong biomes
- a big forecast simulation
- farming/crop seasons
- NPC daily schedules
- a fuel economy for lanterns
- a full stealth system
- a large number of new biomes
- heavy weather-gated quest content
- unavoidable lightning or meteor deaths
- raw debug-stat UI as the normal player experience

---

## 5. New and Changed Types

All core types should live in or be exported from:

```text
src/world/atmosphereTypes.ts
```

### 5.1 ShelterMode

```ts
export type ShelterMode = 'exposed' | 'interior' | 'underground';
```

| Mode | Meaning | Direct precipitation | Direct sky lightning | Local atmosphere |
|---|---|---:|---:|---:|
| `exposed` | Outdoors/open sky | yes | yes, if enabled | yes |
| `interior` | house/shop/covered room | no | no | muffled only |
| `underground` | cave/tunnel/underground biome | no literal sky rain | no sky strike | translated |

### 5.2 DarknessLevel

```ts
export type DarknessLevel = 'bright' | 'dim' | 'dark' | 'pitchBlack';
```

| Level | Player meaning |
|---|---|
| `bright` | normal visibility |
| `dim` | night/dusk mood, still readable |
| `dark` | reduced visibility; lantern helpful |
| `pitchBlack` | very limited visibility; lantern strongly recommended |

### 5.3 LightSourceKind and LightSource

```ts
export type LightSourceKind =
  | 'player'
  | 'lantern'
  | 'town'
  | 'fireplace'
  | 'campfire'
  | 'lava'
  | 'neon'
  | 'radioactive'
  | 'fireflies'
  | 'aurora'
  | 'meteor'
  | 'lightning'
  | 'magic';

export interface LightSource {
  id: string;
  x: number;
  y: number;
  roomId: string;
  radiusTiles: number;
  intensity: number;
  color: number;
  kind: LightSourceKind;
  flicker?: boolean;
  pulse?: boolean;
}
```

`x` and `y` should be local tile coordinates.

### 5.4 DarknessView

```ts
export interface DarknessView {
  level: DarknessLevel;
  darknessAlpha: number;
  visibleRadiusTiles: number | null;
  lanternRecommended: boolean;
  lightSources: LightSource[];
  debugReason: string[];
}
```

Normal UI uses only:

- level
- lanternRecommended
- maybe light source state

Debug UI can show alpha/reasons.

### 5.5 SkyEvent and SkyEventState

```ts
export type SkyEvent = 'none' | 'bloodMoon' | 'eclipse' | 'meteorShower' | 'aurora';

export interface SkyEventState {
  current: SkyEvent;
  remainingPhaseTicks: number;
  intensity: number;
  seed: number;
}
```

Add to `AtmosphereState`:

```ts
skyEvent?: SkyEventState;
```

Backcompat: missing means `none`.

### 5.6 WeatherIconId

```ts
export type WeatherIconId =
  | 'sunny'
  | 'clear-night'
  | 'cloud'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'heatwave'
  | 'coldfront'
  | 'wind'
  | 'snow'
  | 'whiteout'
  | 'steam'
  | 'dry-lightning'
  | 'sea-spray'
  | 'neon-rain'
  | 'oil-rain'
  | 'fallout'
  | 'spores'
  | 'blood-moon'
  | 'eclipse'
  | 'meteor-shower'
  | 'aurora'
  | 'unknown';
```

### 5.7 AtmosphereEffectTag

Internal only:

```ts
export type AtmosphereEffectTag =
  | 'wet'
  | 'low-visibility'
  | 'heat-pressure'
  | 'cold-pressure'
  | 'storm-charged'
  | 'sky-lightning'
  | 'muffled-weather'
  | 'underground-weather'
  | 'night-active'
  | 'blood-moon'
  | 'eclipse'
  | 'meteor-shower'
  | 'aurora'
  | 'darkness'
  | 'requires-light'
  | 'lantern-helpful'
  | 'interior-shelter'
  | 'underground-shelter'
  | 'good-fishing'
  | 'bad-flying'
  | 'spore-bloom'
  | 'radioactive-air'
  | 'mechanical-active'
  | 'haunted-active';
```

### 5.8 Thermal types

```ts
export interface ThermalTrack {
  exposureMs: number;
  damageProgressMs: number;
}

export interface PlayerThermalState {
  hot: ThermalTrack;
  cold: ThermalTrack;
  activeHazard?: 'hot' | 'cold';
  lastTickMs: number;
}

export type ThermalStage =
  | 'stable'
  | 'warming'
  | 'chilled'
  | 'freezing'
  | 'frostbite'
  | 'warm'
  | 'overheating'
  | 'heatstroke';

export interface ThermalStatusView {
  activeKind: 'hot' | 'cold' | null;
  stage: ThermalStage;
  ratio: number;
  damageRatio: number;
  showHud: boolean;
  label: string;
  playerFacingHint?: string;
  justDamagedBy?: 'hot' | 'cold';
}
```

### 5.9 ResolvedAtmosphereView additions

Extend current `ResolvedAtmosphereView`:

```ts
export interface ResolvedAtmosphereView {
  state: AtmosphereState;
  biomeId: BiomeId;
  localVisual: LocalWeatherVisual;
  activeJuice: AtmosphereJuiceTag[];
  gameplay: ResolvedAtmosphereGameplayModifiers;
  tint: ResolvedAtmosphereTint;
  particles: ResolvedAtmosphereParticleProfile;
  debugLabel: string;

  shelterMode: ShelterMode;
  darkness: DarknessView;
  effects: AtmosphereEffectTag[];
  weatherIcon: WeatherIconId;
  playerSummary: AtmospherePlayerSummary;
}
```

Add:

```ts
export interface AtmospherePlayerSummary {
  skyLabel: string;
  localLabel: string;
  timeLabel: string;
  seasonLabel: string;
  shelterLabel: string;
  lightLabel: string;
  oneLine?: string;
}
```

---

## 6. Shelter Mode Design

### 6.1 Problem

Current atmosphere shelter logic disables atmosphere for cave family/tags. That blocks intended cave biome translations.

Bad behavior:

```ts
biome.family === 'cave' || biome.tags.includes('underground') || biome.tags.includes('cave')
```

This incorrectly removes local atmosphere from cave biomes.

### 6.2 Requirement

Replace boolean sheltering with `ShelterMode`.

Add helper:

```ts
function getShelterModeForRoom(room: RoomSnapshot, biome: BiomeDefinition): ShelterMode
```

Suggested logic:

```ts
if (room.id === '0,-1,0') return 'interior';
if (room.id.startsWith('cave:') || room.layer || room.cave) return 'underground';
if (isKnownInteriorRoom(room)) return 'interior';
if (biome.family === 'cave' || biome.tags.includes('underground') || biome.tags.includes('cave')) {
  return 'underground';
}
return 'exposed';
```

If there is no `isKnownInteriorRoom`, create a conservative helper using actual available room fields. Do not invent fields without adding them to room types.

### 6.3 Shelter behavior

#### Exposed

- Full particles.
- Full tint.
- Direct rain/snow/fog.
- Direct sky lightning if enabled.
- Meteor impacts if enabled.

#### Interior

- No direct rain/snow particles.
- No sky lightning.
- No meteor impacts.
- Allow muffled ambience:
  - roof rain
  - distant thunder
  - window fog
  - lamp/fireplace warmth
- Effects include:
  - `interior-shelter`
  - `muffled-weather`

#### Underground

- No direct sky lightning.
- No meteor impacts.
- No literal outdoor rain.
- Use local translations:
  - rain -> cave drips / steam / spores / condensation
  - storm -> rumble / falling dust / machinery hum
  - fog -> cave mist / spore cloud / bone dust
- Effects include:
  - `underground-shelter`
  - `underground-weather`

### 6.4 UI copy

| Mode | Primary | Secondary |
|---|---|---|
| exposed | Exposed | Open to sky |
| interior | Indoors | Weather muffled |
| underground | Underground | Weather translated below |

---

## 7. Darkness and Light System

### 7.1 Goal

Because day-night now exists, darkness should exist too.

Player-facing rule:

> Most nights are playable. Some places require light.

### 7.2 Darkness score model

Resolve a numeric score, then map to `DarknessLevel`.

Start:

```ts
let darknessScore = 0;
```

Day phase contribution:

| DayPhase | Score |
|---|---:|
| dawn | +0.15 |
| day | +0.00 |
| dusk | +0.25 |
| night | +0.45 |

Weather/local visual contribution:

| Condition | Score |
|---|---:|
| clear | +0.00 |
| rain | +0.05 |
| storm | +0.12 |
| fog/mist | +0.18 |
| whiteout | +0.22 |
| dustStorm/ashfall/fallout/sporeCloud | +0.12 |
| heatwave/heatHaze | +0.03 |
| coldfront/snow | +0.08 |
| wind | +0.03 |

Shelter contribution:

| ShelterMode | Score |
|---|---:|
| exposed | +0.00 |
| interior | +0.10 unless lit |
| underground | +0.25 |

Biome contribution:

| Biome tag/family | Score |
|---|---:|
| dense | +0.15 |
| forest | +0.05 |
| haunted | +0.10 |
| cave/underground | +0.20 |
| civilized | -0.05 |
| hot + dry + day | -0.10 |

Sky event contribution:

| SkyEvent | Score |
|---|---:|
| none | +0.00 |
| bloodMoon | +0.20 at night |
| eclipse | +0.45 during day/dusk |
| meteorShower | +0.05 normally, momentary flashes reduce it visually |
| aurora | -0.18 at night/cold contexts |

### 7.3 Score to level

| Score | Level |
|---:|---|
| `< 0.20` | bright |
| `0.20 - 0.45` | dim |
| `0.45 - 0.75` | dark |
| `>= 0.75` | pitchBlack |

### 7.4 Darkness alpha and radius

| Level | Alpha | Visible radius |
|---|---:|---:|
| bright | 0.00 | null |
| dim | 0.12-0.22 | null or 12 |
| dark | 0.38-0.55 | 6-8 |
| pitchBlack | 0.70-0.82 | 3-5 |

### 7.5 Biome light profiles

Add optional field to `BiomeAtmosphereProfile`:

```ts
lightProfile?: BiomeLightProfile;
```

```ts
export interface BiomeLightProfile {
  baseDarknessAdd?: number;
  nightDarknessAdd?: number;
  weatherDarknessAdd?: Partial<Record<GlobalWeather, number>>;
  localVisualDarknessAdd?: Partial<Record<LocalWeatherVisual, number>>;
  naturalLight?: Partial<Record<LightSourceKind, number>>;
  minDarkness?: DarknessLevel;
  maxDarkness?: DarknessLevel;
  alwaysNight?: boolean;
  lanternRecommendedAt?: DarknessLevel;
}
```

Examples:

```ts
'elderwood-maze': {
  lightProfile: {
    baseDarknessAdd: 0.05,
    nightDarknessAdd: 0.25,
    localVisualDarknessAdd: { fog: 0.15, mist: 0.1 },
    lanternRecommendedAt: 'dark',
  }
}
```

```ts
'neon-underpass': {
  lightProfile: {
    baseDarknessAdd: -0.05,
    nightDarknessAdd: -0.15,
    naturalLight: { neon: 0.8 },
    maxDarkness: 'dark',
  }
}
```

```ts
'ember-caverns': {
  lightProfile: {
    baseDarknessAdd: 0.25,
    naturalLight: { lava: 0.7 },
    maxDarkness: 'dark',
  }
}
```

### 7.6 Biome light guidance for all 23 current biomes

| Biome | Light behavior |
|---|---|
| Verdigris Basin | normal readable night |
| Ember Waste | bright day, cooler dim night, heat shimmer |
| Moonlit Parish | dark but moon/ghost-lit |
| Sable Depths | underground dark, minimal cave light |
| Gloam Garden | misty/firefly dim at night |
| Elderwood Maze | dense canopy, dark at night |
| Sunken Ocean | moon/water shimmer, fog darkens |
| Home Hearth | warm interior light |
| Jade Peak Province | lanterns, moon pond, mist |
| Liberty Badlands | harsh day, roadside glints at night |
| Rainforest | canopy makes night darker |
| Wintergreen Forest | cold blue dark night |
| Warm Coast | moonlit surf, generally readable |
| Frozen Sea | ice glare day, aurora potential at night |
| Ember Caverns | lava glow prevents pitch black |
| Fungal Grotto | bioluminescence prevents full darkness |
| Root-Buried Tunnels | underground dim, root glow possible |
| Ash Steppe | open but dusty dark |
| Neon Underpass | neon patches, bright in places |
| Glass Desert | blinding day, star-reflective night |
| Titan Ribcage | hollow bone darkness |
| Radioactive Orchard | green self-light |
| Clockwork Quarry | work lights/machine glow |

### 7.7 Always-night biome support

Support a future biome but do not necessarily implement full generation in this pass.

Working name:

```text
Blackbough Wood
```

Concept:

- always night or always dusk locally
- during global day: dim/dusk
- during global night: dark/pitch black
- during eclipse/blood moon: dangerous darkness
- lantern strongly recommended

Profile idea:

```ts
lightProfile: {
  alwaysNight: true,
  baseDarknessAdd: 0.35,
  nightDarknessAdd: 0.35,
  lanternRecommendedAt: 'dark',
  minDarkness: 'dark',
}
```

This is the approved future biome direction. Do not add "weather is wrong" biomes in this pass.

---

## 8. Lantern and Light Items

### 8.1 Basic Lantern

Add a lantern as an equipable item using existing inventory/equipment patterns.

Likely files:

```text
src/inventory/item.ts
src/inventory/itemRegistry.ts
src/inventory/inventorySystem.ts
src/game/snakeGame.ts
src/ui/skillTreeOverlay.ts
```

Definition:

```ts
{
  id: 'lantern',
  name: 'Lantern',
  description: 'Pushes back darkness. Somehow still works in snake hands.',
  slot: 'utility' // or closest existing slot
}
```

Do not add fuel in this pass.

Effect:

- adds player light source
- radius: 6 tiles
- intensity: 0.95
- color: warm yellow/orange
- flicker: true
- allows navigation in dark/pitch-black places

### 8.2 Player light source

When lantern equipped:

```ts
{
  id: 'player:lantern',
  roomId,
  x: headLocalX,
  y: headLocalY,
  radiusTiles: 6,
  intensity: 0.95,
  color: 0xffd98a,
  kind: 'lantern',
  flicker: true
}
```

Without lantern in dark/pitchBlack, provide minimal ambient player visibility so the game remains technically playable:

```ts
{
  id: 'player:ambient',
  radiusTiles: 2,
  intensity: 0.25,
  color: 0xd7e8ff,
  kind: 'player'
}
```

### 8.3 Lightning Rod Hat

Approved item concept.

Name:

```text
Lightning Rod Hat
```

Description:

```text
Attracts lightning. This is not advice.
```

Effect:

- matters only when lightning is active
- increases chance of lightning warning near player
- can be used to bait lightning into enemies
- must never cause untelegraphed instant death

UI hint during storm:

```text
Your hat hums.
```

### 8.4 Heat/cold items

Keep simple:

- scarf reduces cold buildup
- cooling bandana reduces heat buildup
- rubber boots reduce lightning targeting
- umbrella hat reduces rain/fog visibility penalty

Use existing equipment resistance flags where possible.

---

## 9. Thermal Body System

### 9.1 Problem

Current temperature uses one shared exposure meter. That makes hot and cold feel like the same generic hazard.

Requirement:

- Separate hot and cold tracks.
- Opposite environment helps recover the other track.
- Juice escalates before damage.
- Main UI shows simple body status only when relevant.

### 9.2 New thermal state

Use nested or flat flags.

Preferred conceptual shape:

```ts
interface PlayerThermalState {
  hot: { exposureMs: number; damageProgressMs: number };
  cold: { exposureMs: number; damageProgressMs: number };
  activeHazard?: 'hot' | 'cold';
  lastTickMs: number;
}
```

Flat flags acceptable if easier:

```text
player.thermal.hotExposureMs
player.thermal.hotDamageProgressMs
player.thermal.coldExposureMs
player.thermal.coldDamageProgressMs
player.thermal.activeHazard
player.thermal.lastTickMs
```

### 9.3 Update rules

#### Hot biome

- heat exposure increases
- cold exposure decreases
- cold damage progress decreases
- if cold exposure is still high, heat builds more slowly while the snake is warming up

Pseudo:

```ts
if (cold.exposureMs > 0) {
  cold.exposureMs -= deltaMs * oppositeRecoveryRate;
  heat.exposureMs += deltaMs * heatRate * 0.35;
} else {
  heat.exposureMs += deltaMs * heatRate;
}
```

#### Cold biome

- cold exposure increases
- heat exposure decreases
- heat damage progress decreases
- if heat exposure is still high, cold builds more slowly while the snake is cooling down

Pseudo:

```ts
if (hot.exposureMs > 0) {
  hot.exposureMs -= deltaMs * oppositeRecoveryRate;
  cold.exposureMs += deltaMs * coldRate * 0.35;
} else {
  cold.exposureMs += deltaMs * coldRate;
}
```

#### Neutral biome

Both decay:

```ts
hot.exposureMs -= deltaMs * neutralRecoveryRate;
cold.exposureMs -= deltaMs * neutralRecoveryRate;
```

#### Relief tiles

| Relief | Effect |
|---|---|
| warm | strongly reduces cold |
| cool | strongly reduces heat |
| onsen | strongly reduces both |

### 9.4 Stage thresholds

Use exposure ratio:

```ts
ratio = exposureMs / thresholdMs
```

| Ratio | Cold stage | Heat stage |
|---:|---|---|
| `< 0.25` | stable | stable |
| `0.25 - 0.55` | chilled | warm |
| `0.55 - 0.90` | freezing | overheating |
| `0.90 - 1.00` | frostbite | heatstroke |
| damage tick | frostbite damage | heatstroke damage |

### 9.5 Thermal juice

#### Cold buildup

Chilled:

- faint blue vignette
- occasional breath puff from snake head
- tiny frost sparkle

Freezing:

- stronger blue vignette
- more frequent breath
- pale/icy snake outline
- cold particle trail

Frostbite/critical:

- frost creeps onto screen edges
- pulsing blue/white warning
- muffled audio

Cold damage:

- ice crack flash
- blue-white hit burst
- distinct from normal damage

#### Heat buildup

Warm:

- subtle orange vignette
- heat shimmer near snake
- small sweat/sizzle particles

Overheating:

- stronger orange/red vignette
- mirage lines near snake
- warm/red snake outline

Heatstroke/critical:

- red/orange pulsing edges
- white-hot flashes
- dry crackle audio

Heat damage:

- orange-white hit burst
- sizzling damage effect

### 9.6 Thermal UI

Main HUD only appears when relevant:

```text
Chilled
Freezing
Overheating
Heatstroke
```

Atmosphere page body card:

```text
Body: Stable
```

or:

```text
Body: Freezing — seek warmth
```

No permanent giant meters by default.

### 9.7 Time fix

Split atmosphere time from gameplay hazard time.

Current `advanceSimulationTime` advances both `timeMs` and atmosphere. Replace with:

```ts
advanceAtmosphereTime(deltaMs)
advanceGameplayTime(deltaMs)
```

Rules:

- atmosphere can advance during many non-paused modes
- gameplay hazard time advances only when hazards/action clocks should advance
- thermal tick should use gameplay/hazard delta, not menu time

---

## 10. Sky Events

### 10.1 Event set

Only add:

1. Blood Moon
2. Eclipse
3. Meteor Shower
4. Aurora

These are rare sky events, not ordinary weather.

### 10.2 Scheduling

Sky events roll on phase transitions only.

Eligibility:

| Event | Eligible phase | Notes |
|---|---|---|
| Blood Moon | night | hostile rare night |
| Eclipse | day/dusk | daylight fails |
| Meteor Shower | night | falling stars |
| Aurora | night/dawn | winter/cold-biased, positive |

Config:

```ts
skyEventsEnabled: boolean;
skyEventChanceScalar: number;
bloodMoonEnabled: boolean;
eclipseEnabled: boolean;
meteorShowerEnabled: boolean;
auroraEnabled: boolean;
```

Suggested base chances per eligible phase:

| Event | Chance |
|---|---:|
| Blood Moon | 2% |
| Eclipse | 1% |
| Meteor Shower | 2% |
| Aurora | 3% winter/night, 1% otherwise if eligible |

### 10.3 Blood Moon

Player-facing:

```text
Blood Moon
The night is hostile.
```

Effects:

- red tint
- night darker/more hostile
- enemy spawn scalar slightly up
- dangerous/haunted biomes intensify
- tags: `blood-moon`, `night-active`, `haunted-active`

### 10.4 Eclipse

Player-facing:

```text
Eclipse
Daylight fails.
```

Effects:

- day behaves like darkness
- lanterns matter during day
- heat exposure from sun can ease slightly
- night-active/magical/haunted systems may activate
- tags: `eclipse`, `darkness`, `night-active`

### 10.5 Meteor Shower

Player-facing:

```text
Meteor Shower
Stars are falling.
```

Effects:

- intermittent flashes
- optional telegraphed impact tiles
- impacts create temporary light sources
- future star-metal rewards possible
- tags: `meteor-shower`, `storm-charged`

First implementation may be visual + temporary light only. If damaging impacts are added, they must be telegraphed.

### 10.6 Aurora

Player-facing:

```text
Aurora
The dark is gentle.
```

Effects:

- improves night visibility
- beautiful sky tint
- strongest in winter/cold biomes
- tags: `aurora`

Aurora is important because not all rare events should be hostile.

---

## 11. Lightning Telegraph Model

### 11.1 Requirement

No untelegraphed lightning damage.

### 11.2 State

```ts
export interface LightningStrikeWarning {
  id: string;
  roomId: string;
  x: number;
  y: number;
  remainingTicks: number;
  radius: number;
  source: 'storm' | 'dryLightning' | 'lightningRodHat';
}
```

### 11.3 Lifecycle

1. Roll candidate strike only when allowed.
2. Create warning marker.
3. Render warning for configured ticks.
4. Decrement per movement/hazard tick.
5. Strike resolves.
6. Strike may hit enemies/player/objects.

### 11.4 Shelter rules

| ShelterMode | Lightning |
|---|---|
| exposed | allowed if enabled/profile says yes |
| interior | blocked/muffled |
| underground | blocked as sky strike |

### 11.5 Visuals

- flashing target tile
- yellow/white outline
- static particles
- final-tick stronger flash
- strike can hit enemies too

---

## 12. Atmosphere UI Redesign — Detailed Spec

This is one of the most important parts of the pass. The AI implementer should follow this closely.

### 12.1 Philosophy

The UI should feel like a weather/sky/body panel, not a debug page.

Keep:

- World tab
- Atmosphere subtab
- clock visual language
- retro pixel UI style

Change:

- weather becomes icon card
- season clock smaller
- exact percentages hidden
- local translation gets a clear player-facing card
- light/body/shelter become prominent

### 12.2 Overall layout

Current broad layout is good:

```text
[ left/main scroll panel ] [ right detail panel ]
```

Keep this split.

Left panel should contain:

1. Header
2. Summary strip
3. Day clock + season clock + weather icon
4. Local Air card
5. Light card
6. Body card
7. Shelter card
8. Weather Shift card
9. Debug collapse if enabled

Right panel should show contextual explanation/flavor for selected card.

### 12.3 Header

```text
ATMOSPHERE
```

Optional subtitle:

```text
Sky, light, and body
```

### 12.4 Summary strip

Examples:

```text
Spring · Day · Clear
```

```text
Winter · Night · Rain → Snow
```

```text
Blood Moon · Night
```

```text
Eclipse · Daylight fails
```

This is the first thing the player should read.

### 12.5 Day Clock

Keep the day clock large.

Title:

```text
DAY CLOCK
```

Main label:

```text
Day
```

Secondary:

```text
Next: Dusk
```

Do not show `4% through phase` in normal mode. Debug mode can.

#### Sync formula

Use full-day progress:

```ts
const phaseIndex = DAY_PHASE_ORDER.indexOf(state.dayPhase);
const fullDayProgress = (phaseIndex + state.phaseProgress) / DAY_PHASE_ORDER.length;
const angle = -Math.PI / 2 + fullDayProgress * Math.PI * 2;
```

Phase marker positions:

| Phase | Position |
|---|---|
| Dawn | top |
| Day | right |
| Dusk | bottom |
| Night | left |

Highlight current wedge.

### 12.6 Season Clock

Season clock should be smaller than the day clock.

Title:

```text
SEASON
```

Main label:

```text
Spring
```

Secondary:

```text
Day 1 / 7
```

Sync formula:

```ts
const dayInSeason = state.worldDay % daysPerSeason;
const seasonIndex = SEASON_ORDER.indexOf(state.season);
const progress = (seasonIndex + dayInSeason / daysPerSeason) / 4;
const angle = -Math.PI / 2 + progress * Math.PI * 2;
```

### 12.7 Weather Icon Card

This replaces plain text as the main weather display.

Title:

```text
SKY
```

Contents:

- large procedural icon
- sky label
- local label or short phrase

Examples:

```text
SKY
[ sun icon ]
Clear
Here: Clear
```

```text
SKY
[ rain cloud icon ]
Rain
Here: Snow
```

```text
SKY
[ red moon icon ]
Blood Moon
The night is hostile
```

### 12.8 Procedural weather icons

Implement in helper:

```ts
drawWeatherIcon(graphics, iconId, rect, options)
```

Icon requirements:

| Icon | Procedural drawing |
|---|---|
| sunny | circle + rays |
| clear-night | crescent + stars |
| rain | cloud + rain lines |
| storm | cloud + rain + lightning bolt |
| fog | horizontal wavy lines |
| heatwave | sun + heat waves |
| coldfront/snow | cloud + snowflake/dots |
| wind | curved gust lines |
| dry-lightning | lightning bolt without cloud |
| steam | rising wavy lines |
| sea-spray | wave lines/drops |
| neon-rain | cloud + cyan/magenta rain/reflection |
| oil-rain | dark drops/amber sheen |
| fallout | green particles/simple radiation motif |
| spores | purple/pink dots/cloud |
| blood-moon | red moon circle |
| eclipse | dark disk with corona |
| meteor-shower | diagonal streaks/stars |
| aurora | soft wave ribbons |

Do not require new image assets.

### 12.9 Local Air card

Title:

```text
LOCAL AIR
```

Examples:

```text
Clear
```

```text
Rain becomes snow here.
```

```text
Storm becomes dry lightning here.
```

```text
Weather reaches here as cave drips.
```

```text
The orchard glows with fallout.
```

Use curated strings from `localVisual`, `shelterMode`, and sky event.

### 12.10 Light card

Title:

```text
LIGHT
```

Labels:

```text
Bright
Dim
Dark
Pitch black
```

With lantern:

```text
Dark — lantern lit
```

Without lantern:

```text
Dark — lantern recommended
```

Pitch black without lantern:

```text
Pitch black — find light
```

### 12.11 Body card

Title:

```text
BODY
```

Labels:

```text
Stable
Chilled
Freezing
Frostbite
Warm
Overheating
Heatstroke
```

Hints:

| Stage | Hint |
|---|---|
| stable | Body stable |
| chilled | Cold is building |
| freezing | Seek warmth |
| frostbite | Freezing to death |
| warm | Heat is building |
| overheating | Seek shade/cool |
| heatstroke | Heatstroke |

### 12.12 Shelter card

Title:

```text
SHELTER
```

Examples:

```text
Exposed — open to sky
```

```text
Indoors — weather muffled
```

```text
Underground — weather translated below
```

### 12.13 Weather Shift card

Do not primarily show `reroll in 2 phases`.

Use:

| Remaining ticks | Label |
|---:|---|
| 0/1 | Shift soon |
| 2 | Holding |
| 3+ | Settled |

Debug mode may show exact phases.

### 12.14 Right detail panel

Default text:

```text
Atmosphere

The sky changes globally.
Each biome translates it locally.

Night changes light.
Weather changes air.
Your body reacts to heat and cold.
```

Weather selected:

```text
Sky

The global sky state rolls across the world.
This room may translate it into a different local condition.
```

Light selected:

```text
Light

Most nights are readable.
Some places become dark enough that a lantern matters.
```

Body selected:

```text
Body

Heat and cold build separately.
Warmth can thaw cold. Cold can cool heat.
```

Shelter selected:

```text
Shelter

Interiors block direct sky weather.
Underground places translate weather into drips, rumble, spores, or steam.
```

Sky event active:

```text
Blood Moon

The night is hostile.
```

```text
Eclipse

Daylight fails.
Lanterns may matter even before night.
```

### 12.15 Debug section

Only if debug enabled:

```text
phaseProgress: 0.04
weatherIntensity: 0.35
remainingWeatherPhaseTicks: 2
localVisual: clear
shelterMode: exposed
darknessAlpha: 0.00
effects: wet, low-visibility
heatRateScalar: 1.00
coldRateScalar: 1.00
```

### 12.16 UI implementation files

Current likely file:

```text
src/ui/skillTreeOverlay.ts
```

Recommended helper files if allowed:

```text
src/ui/atmospherePanel.ts
src/ui/weatherIcons.ts
```

Add handler shape:

```ts
interface AtmospherePauseMenuView {
  atmosphere: ResolvedAtmosphereView;
  thermal: ThermalStatusView;
  debug: boolean;
}
```

Then expose from scene:

```ts
getAtmospherePauseMenuView(): AtmospherePauseMenuView
```

---

## 13. Renderer Requirements

### 13.1 Render options

Extend `SnakeRenderOptions`:

```ts
thermalStatus?: ThermalStatusView;
```

Atmosphere already contains darkness/light sources.

### 13.2 Render order

Recommended order:

1. floors/walls/masonry
2. base atmosphere tint
3. furniture/vegetation
4. atmosphere ground juice
5. wall highlights/grid
6. background particles
7. apple/treasure/powerup
8. snake/animals/enemies/bullets/footballs
9. darkness overlay/light sources
10. foreground particles
11. thermal overlay/body juice
12. lightning/meteor flashes

### 13.3 Darkness overlay implementation

First pass can be simple:

- draw translucent dark rectangle over room
- draw warm/cool light circles on top
- ensure snake remains readable

Better later:

- use render texture/mask to carve light holes

### 13.4 Thermal renderer implementation

Add helpers:

```ts
drawThermalOverlay(status, renderTimeMs)
drawThermalBodyJuice(room, snakeBody, currentRoomId, status, renderTimeMs)
```

Cold:

- blue vignette
- breath puffs
- frost particles
- ice crack damage flash

Heat:

- orange/red vignette
- heat shimmer
- sizzle particles
- heatstroke flash

### 13.5 Accessibility

- Keep lightning/meteor flashes brief and low intensity.
- Respect reduced motion if project has such config.
- Do not make darkness obscure the snake beyond playability.
- Ensure apple/enemies remain visible enough within lantern radius.

---

## 14. Atmosphere Audio Requirements

Current procedural audio exists in `SnakeScene`.

Add shelter-aware audio:

| Shelter | Audio behavior |
|---|---|
| exposed | full rain/storm/wind |
| interior | muffled rain/thunder, lower volume, lowpass |
| underground | cave drips, rumble, spores/steam, lowpass |

Add thermal audio lightly:

- cold: muffled wind, ice crack on damage
- heat: dry crackle/sizzle on damage

Do not make it annoying. Subtle is correct.

---

## 15. Save and Migration Requirements

Files:

```text
src/game/saveManager.ts
src/game/saveManagerV2.ts
```

Current save already has `atmosphere?: AtmosphereState`.

Need to ensure:

- `skyEvent` saves/loads
- invalid/missing `skyEvent` hydrates to none
- thermal state saves/loads or is stored in flags
- old temperature flags migrate safely
- old saves do not crash

Migration:

- if old `player.temperatureHazard === 'hot'`, old exposure goes to hot track
- if old `player.temperatureHazard === 'cold'`, old exposure goes to cold track
- otherwise both tracks start at zero

---

## 16. Implementation Plan

### Phase 1: Types/config

Files:

```text
src/world/atmosphereTypes.ts
src/config/gameConfig.ts
```

Add all new types and config flags.

### Phase 2: Shelter modes

Files:

```text
src/game/snakeGame.ts
src/world/atmosphereResolver.ts
```

Replace boolean sheltering with `ShelterMode`.

### Phase 3: Resolver fallback fix

Files:

```text
src/world/atmosphereResolver.ts
```

Use order:

```text
tag default as fallback
profile defaultLocalVisual
season response
day phase response
weather response
sky event overlay
shelter adaptation
```

### Phase 4: Darkness/light system

Files:

```text
src/world/atmosphereResolver.ts
src/world/biomeAtmosphereProfiles.ts
src/ui/snakeRenderer.ts
src/game/snakeGame.ts
```

Add light profiles, darkness view, renderer overlay.

### Phase 5: Lantern item

Files to inspect/update:

```text
src/inventory/item.ts
src/inventory/itemRegistry.ts
src/inventory/inventorySystem.ts
src/game/snakeGame.ts
```

Add lantern as equipped light source.

### Phase 6: Thermal body system

Files:

```text
src/game/snakeGame.ts
src/ui/snakeRenderer.ts
src/scenes/snakeScene.ts
```

Split heat/cold, add thermal status, add juice.

### Phase 7: Sky events

Files:

```text
src/world/atmosphereSystem.ts
src/world/atmosphereResolver.ts
src/ui/snakeRenderer.ts
src/ui/skillTreeOverlay.ts
```

Add Blood Moon, Eclipse, Meteor Shower, Aurora.

### Phase 8: UI redesign

Files:

```text
src/ui/skillTreeOverlay.ts
src/ui/weatherIcons.ts // optional new helper
src/ui/atmospherePanel.ts // optional new helper
```

Implement day clock, smaller season clock, weather icon card, local/light/body/shelter cards.

### Phase 9: Lightning telegraph scaffold

Files:

```text
src/game/snakeGame.ts
src/ui/snakeRenderer.ts
```

Add warning state and renderer marker. Damage optional/config-gated.

---

## 17. Test Requirements

### 17.1 Atmosphere system tests

Update:

```text
src/world/__tests__/atmosphereSystem.test.ts
```

Test:

- existing day/season/weather behavior still passes
- sky events deterministic by seed
- Blood Moon only night
- Eclipse only day/dusk
- Meteor Shower only night
- Aurora night/cold/winter favored
- save/hydrate missing sky event safe

### 17.2 Resolver tests

Update:

```text
src/world/__tests__/atmosphereResolver.test.ts
```

Test:

- all 23 biomes resolve all weather
- cave biomes still have local atmosphere under underground shelter
- interiors suppress direct sky effects
- `defaultLocalVisual` survives clear weather
- Sunken Ocean clear -> seaSpray
- Fungal Grotto clear -> sporeCloud
- Rainforest clear -> rain
- Radioactive Orchard clear -> fallout
- Frozen Sea rain -> snow
- Glass Desert storm -> dryLightning
- shelter blocks sky lightning
- darkness levels reasonable
- effect tags generated

### 17.3 Thermal tests

Add:

```text
src/game/__tests__/thermalState.test.ts
```

Test:

- cold increases cold track only
- heat increases heat track only
- neutral decays both
- hot biome reduces cold exposure
- cold biome reduces heat exposure
- warm relief reduces cold
- cool relief reduces heat
- onsen reduces both
- heatwave increases heat rate
- coldfront increases cold rate
- damage only from active track
- old flags migrate
- menu time does not accumulate hazard damage

### 17.4 UI helper tests

Add pure helper tests if possible:

```text
src/ui/__tests__/weatherIcons.test.ts
src/ui/__tests__/atmospherePanelView.test.ts
```

Test:

- day clock angle by phase/progress
- season clock angle
- weather icon mapping
- local air phrase mapping
- intensity phrase hides raw percent
- weather shift label mapping
- light/body/shelter labels

### 17.5 Manual QA checklist

Check:

1. Verdigris day clear
2. Verdigris night clear
3. Rainforest clear local rain
4. Frozen Sea rain snow
5. Glass Desert storm dry lightning
6. Sable Depths rain cave drips underground
7. Home Hearth storm interior muffled
8. Elderwood night no lantern
9. Elderwood night with lantern
10. Eclipse day darkness
11. Blood Moon night tint
12. Meteor Shower flashes
13. Aurora night glow
14. Coldfront in Frozen Sea thermal cold
15. Heatwave in Ember Waste thermal heat
16. Cold biome -> hot biome recovery
17. Hot biome -> cold biome recovery
18. Pause/shop/dialogue in hazard room does not spike damage
19. Atmosphere tab at current screenshot resolution no overlap
20. Weather icons readable

---

## 18. Acceptance Criteria

This pass is complete when:

1. The atmosphere UI is redesigned:
   - day clock synced
   - season clock smaller
   - weather icon card present
   - light/body/shelter cards present
   - exact percentages hidden unless debug
2. Shelter modes exist and replace blanket cave disabling.
3. Cave biomes retain local atmosphere.
4. Interiors receive muffled weather, no direct sky hazards.
5. Darkness/light system exists.
6. Lantern item provides player light.
7. Thermal hot/cold tracks are separate.
8. Thermal cold/heat crescendo juice appears before damage.
9. Sky events exist: Blood Moon, Eclipse, Meteor Shower, Aurora.
10. Atmosphere effect tags exist internally.
11. Lightning telegraph scaffold exists if gameplay lightning is enabled.
12. Old saves load.
13. Existing tests pass.
14. New tests cover shelter, darkness, thermal, sky events, and UI helpers.

---

## 19. Suggested Codex Prompt

```text
Implement the "Light, Body, and Sky Events" systemic deepening pass for Snake for the Modern Gamer.

Context:
PR #98 added the World Atmosphere system with season, day phase, global weather, local biome weather translation, all 23 biome atmosphere profiles, renderer particles/tint/juice, atmosphere audio, save/load, and preliminary gameplay modifiers.

Goal:
Deepen atmosphere through light/darkness, separate heat/cold body state, shelter modes, rare sky events, lightning telegraphing, internal effect tags, and a redesigned player-facing Atmosphere UI.

Core requirements:
1. Add ShelterMode = exposed | interior | underground. Replace blanket cave atmosphere disabling. Cave biomes should still translate weather; interiors block direct sky weather; underground translates weather.
2. Fix atmosphere resolver merge order so tag-derived defaults are fallback, not destructive overrides. defaultLocalVisual and day/night responses must survive clear weather.
3. Add DarknessLevel, LightSource, DarknessView. Resolve darkness from day phase, weather, sky event, shelter mode, biome light profile, and light sources. Normal night is dim/readable; dense forests/underground/eclipses can be dark or pitch black.
4. Add a lantern equipable item with no fuel. When equipped, it creates a warm player light radius. Show lantern recommendation only when relevant.
5. Replace shared temperature exposure with separate hot/cold thermal tracks. Hot increases heat and reduces cold. Cold increases cold and reduces heat. Neutral decays both. Relief tiles reduce appropriate tracks. Add ThermalStatusView and cold/heat crescendo juice.
6. Split atmosphere time from gameplay hazard time so menus/dialogues/shops do not accumulate thermal damage.
7. Add rare SkyEvent = none | bloodMoon | eclipse | meteorShower | aurora. Blood Moon is hostile night, Eclipse makes daylight fail, Meteor Shower creates falling-star visuals/optional telegraphed impacts, Aurora improves night/cold visibility.
8. Add AtmosphereEffectTag internally for wet, low-visibility, heat-pressure, cold-pressure, storm-charged, requires-light, night-active, blood-moon, eclipse, meteor-shower, aurora, etc. Do not expose raw tags to normal UI.
9. Redesign the Atmosphere pause menu UI. Keep the day clock and sync it to real phase progress. Make the season clock smaller. Use a forecast-like weather icon card for current weather/sky event. Add Local Air, Light, Body, Shelter, and Weather Shift cards. Hide exact percentages/scalars unless debug mode is on.
10. Add/scaffold lightning telegraphing. No lightning damage without visible warning. Interior/underground block direct sky lightning. Lightning rod hat can be added/scaffolded.

Constraints:
- Preserve existing atmosphere profiles and save compatibility.
- Do not add many new weather types.
- Do not add fuel economy, full stealth, farming, or a large amount of weather-gated content.
- Run typecheck and tests.
```

---

## 20. Final Design Mantra

The player should not think:

> "The coldRateScalar is 1.18."

The player should think:

> "I am freezing. I need warmth."

The player should not think:

> "The local visual differs from global weather."

The player should think:

> "Rain becomes snow here."

The player should not think:

> "A sky event changed the day phase darkness contribution."

The player should think:

> "Daylight failed. I need my lantern."

That is the target of this deepening pass: less explanation, more readable consequence.
