# Snake for the Modern Gamer — World Atmosphere System Requirements & Design

**Document purpose:** Define a comprehensive one-pass implementation plan for weather, biome atmosphere enhancements, day-night, and seasons in *Snake for the Modern Gamer*.

**Core thesis:** This pass is not “four unrelated systems.” It is one system with one trunk:

> **Weather is the feature. Day-night and seasons drive weather. Biomes translate weather. Biome enhancements are the visible payoff.**

The pass should make the world feel more alive, reactive, and absurd without changing the core identity of any existing biome.

---

## 1. Executive Summary

The game already has a robust biome foundation. Each biome currently defines identity through:

- `BiomeId`
- `BiomeFamily`
- `BiomeTag[]`
- climate/generation preferences
- transition style
- base palette
- `dangerLevel`
- `temperatureHazard`
- `temperatureRate`
- `enemyFireBias`
- `enemyMoveBias`
- `animalSpawnChance`
- `animalSpawnBias`
- `vegetationDensity`
- some biome-specific room/tile generation and rendering hooks

This design adds a **World Atmosphere System** that layers over that existing biome model. It should not rewrite the biome generator, replace room layouts, or make each biome into a separate minigame. It should add a shared global rhythm and local biome interpretations.

### One-sentence model

> The world emits global atmosphere signals; each biome interprets those signals through its own personality.

### The four visible pieces

1. **Day-night**  
   A global clock that cycles through `dawn`, `day`, `dusk`, and `night`.

2. **Seasons**  
   A global long-cycle state that changes weather probabilities and small visual accents.

3. **Weather**  
   A global event/state such as `rain`, `storm`, `fog`, `heatwave`, `coldfront`, or `wind`.

4. **Biome atmosphere responses**  
   Local translation rules that determine what the global weather actually looks and does in each biome.

### Example

Global weather says:

```ts
globalWeather = 'rain'
```

But local biome response says:

| Biome | Local interpretation |
|---|---|
| Verdigris Basin | normal rain |
| Rainforest | heavy rain / monsoon ambience |
| Frozen Sea | snow |
| Sable Depths | cave drips |
| Ember Waste | steam |
| Glass Desert | sizzling mist |
| Radioactive Orchard | glowing fallout drizzle |
| Neon Underpass | neon rain reflections |
| Moonlit Parish | graveyard mist and bells |

This creates the important player-facing question:

> “The world is raining. What does that mean **here**?”

---

## 2. Existing System Audit

This section summarizes relevant existing systems and how the atmosphere pass should integrate with them.

### 2.1 Biomes

Existing biome definitions live in:

```text
src/world/biomes.ts
```

Current biome fields already support this pass well:

```ts
export interface BiomeDefinition {
  id: BiomeId;
  title: string;
  family: BiomeFamily;
  tags: BiomeTag[];
  countsAs?: BiomeFamily[];
  temperature: string;
  dangerLevel: number;
  temperatureHazard: 'hot' | 'cold' | null;
  temperatureRate: number;
  hue: number;
  saturation: number;
  lightness: number;
  tintVariance: number;
  accentColor: number;
  enemyFireBias: number;
  enemyMoveBias: number;
  animalSpawnChance: number;
  animalSpawnBias: Record<string, number>;
  vegetationDensity?: number;
  generation?: BiomeGenerationProfile;
  transition?: BiomeTransitionProfile;
  peakZThreshold?: number;
  peakColdRate?: number;
}
```

### 2.2 Biome tags

Existing tags are extremely valuable for automatic atmosphere defaults:

```ts
export type BiomeTag =
  | 'hot'
  | 'warm'
  | 'temperate'
  | 'cold'
  | 'frigid'
  | 'dry'
  | 'wet'
  | 'humid'
  | 'underground'
  | 'high-altitude'
  | 'haunted'
  | 'magical'
  | 'civilized'
  | 'dangerous'
  | 'shore'
  | 'forest'
  | 'oceanic'
  | 'cave'
  | 'sparse'
  | 'dense'
  | 'starter'
  | 'special';
```

Atmosphere should use these tags to derive safe defaults. Biome-specific profiles should override only where a biome needs stronger flavor.

### 2.3 Room snapshots

Existing `RoomSnapshot` already exposes biome identity and rendering fields:

```ts
biomeId: BiomeId;
biomeTitle: string;
backgroundColor: number;
wallColor: number;
wallOutlineColor: number;
vegetation?: VegetationInstance[];
temperatureReliefs?: Array<{ x: number; y: number; kind: 'warm' | 'cool' | 'onsen' }>;
```

Atmosphere should be exposed through snapshots without requiring room regeneration.

### 2.4 Rendering

Rendering currently draws:

1. floors
2. walls
3. temperature reliefs
4. furniture
5. vegetation
6. wall highlights
7. grid
8. apple/treasure/powerup
9. snake
10. other players
11. animals
12. enemies
13. bullets/footballs

Atmosphere visuals should be layered carefully:

- background/day tint after floors/walls, before gameplay entities
- particles over the room but under UI
- lightning flash over most world layers
- fog/mist preferably after static room draw but before important entity draw, or with low alpha over all world objects

### 2.5 Enemy spawning

Enemy spawning currently uses `dangerLevel`, `enemyFireBias`, and `enemyMoveBias`.

Atmosphere should be allowed to modify enemy behavior only lightly:

- storm/night can adjust fire cooldown in selected biomes
- fog can slow aim/fire slightly
- never create huge combat rebalance in this pass

### 2.6 Animal spawning

Animal spawning currently uses `animalSpawnChance` and `animalSpawnBias`.

Atmosphere can reasonably affect animals:

- dawn increases harmless animal activity
- rain increases frogs/fish
- night increases wolves/snakes in some biomes
- storm suppresses birds in exposed biomes
- snow/coldfront suppresses most animals except cold-biome exceptions

### 2.7 Temperature hazards

Several biomes already have hot/cold hazards. Atmosphere should mostly scale those existing hazards instead of inventing new survival systems.

Examples:

- Heatwave increases `temperatureRate` for hot biomes.
- Coldfront increases `temperatureRate` for cold/frigid biomes.
- Rain may reduce heat rate in some hot biomes.
- Night may reduce heat exposure in deserts.
- Storm may not affect temperature unless biome profile says so.

---

## 3. Design Goals

### 3.1 Make biomes feel more alive

The same room should feel slightly different at dawn, in the rain, during winter, or under storm conditions.

### 3.2 Preserve biome identity

The pass must not turn every biome into a generic weather playground.

Bad:

> Ember Waste receives lush rain, lots of frogs, and flowers.

Good:

> Ember Waste turns rain into steam and hissing sand.

### 3.3 Favor local translation over global literalism

Global weather should not be rendered literally everywhere.

Global `rain` can locally become:

- rain
- snow
- steam
- cave drips
- neon reflections
- radioactive drizzle
- ash paste
- bone condensation
- monsoon

### 3.4 Use one atmosphere spine

The pass should add one cohesive feature, not several isolated ones.

The intended hierarchy:

```text
World clock
  -> season
  -> day phase
  -> global weather
  -> biome-specific translation
  -> final local atmosphere view
  -> visual juice + tiny gameplay hooks
```

### 3.5 Keep gameplay effects readable and fair

Weather can affect the snake, but only when the player can understand and respond.

Especially for lightning:

- no random instant death
- warning first
- visible target
- at least one movement beat before strike
- can hit enemies too
- can be avoided, exploited, or mitigated

### 3.6 Make content data-driven

Adding future biomes should require defining an atmosphere profile, not writing custom renderer/gameplay logic for each biome.

### 3.7 Do not break existing saves

Existing save data should load without atmosphere data. New fields should have safe defaults.

---

## 4. Non-Goals

This pass should **not** implement:

- a full calendar UI
- farming seasons
- NPC daily schedules
- complex climate simulation
- tile-by-tile water accumulation
- global morality/karma
- sleep mechanics
- long-term biome mutation
- destructible terrain from storms
- large art asset pipelines
- a completely new enemy/animal ecosystem
- hard survival game mechanics
- unavoidable weather deaths

These may be future systems. This pass should stay focused on atmosphere.

---

## 5. Core Concepts

## 5.1 Season

```ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
```

Seasons are global. They influence:

- weather probability
- day/night tint warmth
- ambient particle accents
- animal spawn modifiers
- selected biome-specific seasonal juice

They should not regenerate the world.

### Recommended initial season behavior

| Season | Weather bias | Visual bias | Gameplay bias |
|---|---|---|---|
| Spring | rain, fog, wind | flowers, petals, fresh growth | frogs/birds up |
| Summer | clear, heatwave, storm | bright glare, insects | heat hazards up |
| Autumn | wind, fog, storm | leaves, amber tint | foraging/foxes up |
| Winter | coldfront, fog, clear | frost, snow in cold biomes | cold hazards up |

## 5.2 DayPhase

```ts
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
```

Day-night is global across the board.

### Recommended initial phase behavior

| Phase | Visual | Weather bias | Gameplay |
|---|---|---|---|
| Dawn | soft light, mist | fog/rain slightly up | harmless animals up |
| Day | baseline | clear/seasonal | baseline |
| Dusk | warm transition | wind/fog/storm slightly up | rare encounters slightly up |
| Night | darker, local glow | fog/storm/weirdness up | haunted/magical/civilized profiles activate |

## 5.3 GlobalWeather

```ts
export type GlobalWeather =
  | 'clear'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'heatwave'
  | 'coldfront'
  | 'wind';
```

Global weather is the world-level signal. It should persist for a duration rather than rerolling constantly.

### Recommended global weather meanings

| Global weather | Meaning |
|---|---|
| `clear` | no major weather system |
| `rain` | wet precipitation pattern |
| `storm` | high-energy weather, thunder, heavy rain, or local equivalent |
| `fog` | visibility/ambience condition |
| `heatwave` | heat pressure condition |
| `coldfront` | cold pressure condition |
| `wind` | movement/particle/gust condition |

## 5.4 LocalWeatherVisual

```ts
export type LocalWeatherVisual =
  | 'clear'
  | 'rain'
  | 'heavyRain'
  | 'snow'
  | 'sleet'
  | 'whiteout'
  | 'mist'
  | 'fog'
  | 'steam'
  | 'ashfall'
  | 'fallout'
  | 'caveDrip'
  | 'dryLightning'
  | 'thunder'
  | 'monsoon'
  | 'seaSpray'
  | 'neonRain'
  | 'petals'
  | 'fireflies'
  | 'boneDust'
  | 'oilRain'
  | 'dustStorm'
  | 'heatHaze'
  | 'aurora'
  | 'sporeCloud'
  | 'leafFall';
```

Local visuals are biome-specific interpretations of global weather.

---

## 6. Proposed File Structure

Recommended new files:

```text
src/world/atmosphereTypes.ts
src/world/atmosphereSystem.ts
src/world/biomeAtmosphereProfiles.ts
src/world/atmosphereDefaults.ts
src/world/atmosphereResolver.ts
src/world/__tests__/atmosphereSystem.test.ts
src/world/__tests__/biomeAtmosphereProfiles.test.ts
src/world/__tests__/atmosphereResolver.test.ts
```

Recommended changed files:

```text
src/world/types.ts
src/game/snakeGame.ts
src/scenes/snakeScene.ts
src/ui/snakeRenderer.ts
src/animals/animalManager.ts
src/systems/enemies.ts
src/config/gameConfig.ts
```

Optional changed files:

```text
src/fishing/*
src/ui/hud/*
src/save/*
src/systems/simulationScheduler.ts
```

---

## 7. Data Model Requirements

## 7.1 AtmosphereState

```ts
export interface AtmosphereState {
  worldDay: number;
  season: Season;
  dayPhase: DayPhase;
  phaseProgress: number; // 0..1
  globalWeather: GlobalWeather;
  weatherIntensity: number; // 0..1
  remainingWeatherPhaseTicks: number;
  weatherSeed: number;
}
```

### Requirements

- Must be serializable.
- Must have safe defaults.
- Must be deterministic when initialized with the same world seed.
- Must avoid rapidly changing weather.
- Must advance even if the player remains in one room.
- Must not require room regeneration.

## 7.2 AtmosphereConfig

Add a config object under `GameConfig`:

```ts
export interface AtmosphereConfig {
  enabled: boolean;
  phaseDurationMs: number;
  daysPerSeason: number;
  minWeatherPhases: number;
  maxWeatherPhases: number;
  weatherIntensityMin: number;
  weatherIntensityMax: number;
  lightningEnabled: boolean;
  visualParticlesEnabled: boolean;
  dayNightTintEnabled: boolean;
  gameplayModifiersEnabled: boolean;
}
```

Recommended defaults:

```ts
export const defaultAtmosphereConfig: AtmosphereConfig = {
  enabled: true,
  phaseDurationMs: 180_000,
  daysPerSeason: 7,
  minWeatherPhases: 1,
  maxWeatherPhases: 4,
  weatherIntensityMin: 0.35,
  weatherIntensityMax: 1,
  lightningEnabled: false,
  visualParticlesEnabled: true,
  dayNightTintEnabled: true,
  gameplayModifiersEnabled: true,
};
```

Lightning should be disabled by default until tested, or enabled only with extremely safe telegraphing.

## 7.3 BiomeAtmosphereProfile

```ts
export interface BiomeAtmosphereProfile {
  biomeId: BiomeId;

  /**
   * Always-on identity juice independent of weather.
   */
  baseJuice: AtmosphereJuiceTag[];

  /**
   * If set, this biome has a persistent local ambience even during global clear.
   * Example: rainforest has drip/rain ambience even when global weather is clear.
   */
  defaultLocalVisual?: LocalWeatherVisual;

  /**
   * Day phase reactions.
   */
  dayPhaseResponses?: Partial<Record<DayPhase, BiomeAtmosphereResponse>>;

  /**
   * Seasonal reactions.
   */
  seasonResponses?: Partial<Record<Season, BiomeAtmosphereResponse>>;

  /**
   * Main weather translation table.
   */
  weatherResponses: Partial<Record<GlobalWeather, BiomeAtmosphereResponse>>;

  /**
   * Explicit design note for future maintainers.
   */
  preserveCoreNote: string;
}
```

## 7.4 BiomeAtmosphereResponse

```ts
export interface BiomeAtmosphereResponse {
  localVisual: LocalWeatherVisual;
  juice?: AtmosphereJuiceTag[];
  tint?: AtmosphereTint;
  particles?: AtmosphereParticleProfile;
  gameplay?: AtmosphereGameplayModifiers;
  audio?: AtmosphereAudioTag[];
  messageTag?: string;
}
```

## 7.5 AtmosphereJuiceTag

Use string literal tags for renderer-friendly behavior:

```ts
export type AtmosphereJuiceTag =
  | 'soft-mist'
  | 'pond-ripples'
  | 'lantern-reflections'
  | 'leaf-drips'
  | 'canopy-drips'
  | 'steam-vents'
  | 'heat-haze'
  | 'dust-gusts'
  | 'ash-gusts'
  | 'grave-bells'
  | 'ghost-breath'
  | 'cave-echo'
  | 'falling-dust'
  | 'bioluminescent-pulse'
  | 'root-creak'
  | 'neon-reflections'
  | 'sign-flicker'
  | 'glass-glare'
  | 'prism-haze'
  | 'bone-condensation'
  | 'geiger-sparkle'
  | 'gear-drips'
  | 'oil-sheen'
  | 'fireflies'
  | 'petals'
  | 'leaf-fall'
  | 'snow-caps'
  | 'aurora'
  | 'moon-reflection'
  | 'sea-spray'
  | 'wave-chop';
```

These tags can initially be rendered with simple particle/overlay variants. Do not require custom art.

## 7.6 AtmosphereGameplayModifiers

```ts
export interface AtmosphereGameplayModifiers {
  heatRateScalar?: number;
  coldRateScalar?: number;
  animalSpawnChanceScalar?: number;
  animalSpawnBiasAdd?: Partial<Record<string, number>>;
  enemySpawnChanceScalar?: number;
  enemyFireCooldownScalar?: number;
  enemyMoveCooldownScalar?: number;
  fishingChanceScalar?: number;
  visibilityScalar?: number;
  lightningProfile?: LightningProfile;
}
```

### Rules

- Scalars default to `1`.
- Missing modifiers mean no gameplay change.
- Modifiers must be clamped in resolver.
- Do not allow stacked modifiers to produce impossible or unfair behavior.
- Visuals can be extravagant; gameplay should be conservative.

## 7.7 LightningProfile

```ts
export interface LightningProfile {
  enabled: boolean;
  strikeChancePerPhase?: number;
  strikeChancePerSnakeStep?: number;
  telegraphTicks: number;
  radius: number;
  targetsMetalEquipment: boolean;
  canHitEnemies: boolean;
  canHitPlayer: boolean;
  safeUnderCover: boolean;
}
```

Recommended first implementation:

```ts
export const RARE_TELEGRAPHED_LIGHTNING: LightningProfile = {
  enabled: true,
  strikeChancePerSnakeStep: 0.005,
  telegraphTicks: 2,
  radius: 0,
  targetsMetalEquipment: true,
  canHitEnemies: true,
  canHitPlayer: true,
  safeUnderCover: true,
};
```

But lightning can be stubbed in this pass if it risks scope.

## 7.8 ResolvedAtmosphereView

This is what the game/renderer consumes.

```ts
export interface ResolvedAtmosphereView {
  state: AtmosphereState;
  biomeId: BiomeId;
  localVisual: LocalWeatherVisual;
  activeJuice: AtmosphereJuiceTag[];
  gameplay: Required<AtmosphereGameplayModifiers>;
  tint: ResolvedAtmosphereTint;
  particles: ResolvedAtmosphereParticleProfile;
  debugLabel: string;
}
```

The resolver combines:

1. base biome profile
2. season response
3. day phase response
4. global weather response
5. default tag-derived behavior
6. clamping/defaults

---

## 8. System Behavior

## 8.1 Atmosphere advancement

`WorldAtmosphereSystem` should own the global atmosphere state.

```ts
export class WorldAtmosphereSystem {
  constructor(config: AtmosphereConfig, seed: string | number);

  getState(): AtmosphereState;

  reset(seed: string | number): void;

  hydrate(saved?: Partial<AtmosphereState>): void;

  update(deltaMs: number): AtmosphereState;
}
```

### Requirements

- Accumulate elapsed time.
- Advance `phaseProgress`.
- When phase completes:
  - advance day phase
  - if wrapping from night to dawn, increment `worldDay`
  - update season if needed
  - decrement weather remaining phase ticks
  - reroll weather when remaining ticks reaches zero
- Use deterministic seeded rolling.
- Expose read-only or copied state to callers.

## 8.2 Day phase progression

Recommended cycle:

```ts
const DAY_PHASE_ORDER: DayPhase[] = ['dawn', 'day', 'dusk', 'night'];
```

Phase duration should be config-driven.

## 8.3 Season progression

Recommended cycle:

```ts
const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];
```

Season index:

```ts
Math.floor(worldDay / daysPerSeason) % 4
```

## 8.4 Weather rolling

Weather weights should be derived from season and day phase.

Example base weights:

```ts
const BASE_WEATHER_WEIGHTS: Record<GlobalWeather, number> = {
  clear: 40,
  rain: 18,
  storm: 8,
  fog: 10,
  heatwave: 4,
  coldfront: 4,
  wind: 10,
};
```

Season modifiers:

```ts
spring: { rain: +12, fog: +6, wind: +4 }
summer: { clear: +10, heatwave: +10, storm: +8 }
autumn: { wind: +12, fog: +8, storm: +4 }
winter: { coldfront: +16, fog: +4, clear: +4, heatwave: -4 }
```

Day phase modifiers:

```ts
dawn: { fog: +10, rain: +4 }
day: { clear: +8, heatwave: +4 }
dusk: { wind: +6, fog: +4, storm: +3 }
night: { fog: +8, storm: +4, clear: -4 }
```

### Weather duration

Weather should last between `minWeatherPhases` and `maxWeatherPhases`.

Recommended:

- clear: can last longer
- storm: shorter
- heatwave/coldfront: medium
- wind/fog/rain: medium

## 8.5 Weather intensity

`weatherIntensity` should be `0.35..1` by default.

Intensity affects:

- particle amount
- overlay alpha
- optional hazard scalar strength
- thunder flash frequency
- fog opacity

Intensity should not directly create lethal behavior.

---

## 9. Biome Atmosphere Resolution

## 9.1 Resolver function

```ts
export function resolveBiomeAtmosphere(
  biome: BiomeDefinition,
  profile: BiomeAtmosphereProfile | undefined,
  state: AtmosphereState,
): ResolvedAtmosphereView;
```

## 9.2 Resolution order

1. Start with tag-derived defaults.
2. Apply biome `baseJuice`.
3. Apply season response.
4. Apply day phase response.
5. Apply weather response.
6. Merge gameplay modifiers.
7. Clamp final values.
8. Return renderer/gameplay-friendly view.

## 9.3 Tag-derived fallback defaults

### Rain fallback

| Tags | Local visual |
|---|---|
| `frigid` | `snow` |
| `cold` + `high-altitude` | `sleet` or `snow` |
| `hot` + `dry` | `steam` |
| `underground`/`cave` | `caveDrip` |
| `oceanic` | `seaSpray` |
| `civilized` | `rain` with reflections |
| else | `rain` |

### Storm fallback

| Tags | Local visual |
|---|---|
| `hot` + `dry` | `dryLightning` |
| `underground`/`cave` | `caveDrip` + rumble |
| `oceanic` | `seaSpray` / rough water |
| `civilized` | `thunder` |
| else | `thunder` |

### Fog fallback

| Tags | Local visual |
|---|---|
| `hot` + `dry` | `heatHaze` |
| `underground`/`cave` | `mist` |
| `haunted` | `fog` |
| `oceanic` | `mist` |
| else | `mist` |

### Heatwave fallback

| Tags | Local visual |
|---|---|
| `hot` | `heatHaze` |
| `humid` | `steam` |
| `frigid`/`cold` | `clear` with thaw/glare |
| else | `clear` with warm tint |

### Coldfront fallback

| Tags | Local visual |
|---|---|
| `frigid` | `whiteout` |
| `cold` | `snow` |
| `wet` + `temperate` | `sleet` |
| `underground` | `mist` |
| else | `clear` with frost tint |

### Wind fallback

| Tags | Local visual |
|---|---|
| `dry` | `dustStorm` or dust gusts |
| `forest` | `leafFall` |
| `oceanic` | `seaSpray` |
| `civilized` | sign/lantern movement |
| else | wind streaks |

---

## 10. Renderer Requirements

## 10.1 General rendering strategy

Atmosphere rendering should be lightweight and procedural.

Initial supported visual features:

- day/night tint overlay
- rain particles
- snow particles
- fog/mist overlay
- steam/haze overlay
- ash/fallout particles
- thunder flash
- water/pond ripple highlights
- simple reflection accents
- fireflies/petals/leaves particles
- dust gusts

## 10.2 Renderer API change

Extend render options or room snapshot data to include atmosphere:

```ts
interface SnakeRenderOptions {
  atmosphere?: ResolvedAtmosphereView;
}
```

or add to snapshot:

```ts
interface RoomSnapshot {
  atmosphere?: ResolvedAtmosphereView;
}
```

Preferred: pass in render options to avoid making room snapshots carry volatile global state unless the current snapshot architecture strongly prefers that.

## 10.3 Static cache concern

Current static room cache signatures use biome/layout. Atmosphere changes should **not** constantly dirty static room rendering.

Therefore:

- day/weather overlays should be dynamic
- particles should be dynamic
- do not rewrite room `backgroundColor` every phase unless cache invalidation is handled
- keep static terrain unchanged

## 10.4 Layering proposal

Render order:

1. static room floors/walls/furniture/vegetation
2. base day/season tint, if below entities
3. atmosphere ground accents
4. apple/treasure/powerups
5. snake
6. animals/enemies/bullets
7. fog/precipitation overlay, if above entities
8. lightning flash
9. UI/hud

## 10.5 Accessibility/config requirements

Add toggles or config flags:

- particles enabled/disabled
- lightning flash intensity reduced
- day-night tint enabled/disabled
- low motion mode support
- high contrast mode should keep hazards visible

Lightning flashes must not be strobe-like.

---

## 11. Gameplay Requirements

## 11.1 Temperature

Atmosphere should modify existing temperature hazards through scalars.

Examples:

```ts
heatwave in hot biome -> heatRateScalar: 1.25
rain in hot/dry biome -> heatRateScalar: 0.75
coldfront in cold/frigid biome -> coldRateScalar: 1.25
night in hot desert -> heatRateScalar: 0.85
```

Hard cap:

```ts
heatRateScalar <= 1.5
coldRateScalar <= 1.5
```

unless an explicit future feature says otherwise.

## 11.2 Animals

Atmosphere can modify spawn chance and bias during `ensureAnimals`.

Examples:

- rain: frogs/fish +1 or +2 bias
- dawn: harmless animals + chance scalar
- night: wolves/snakes up in dangerous biomes
- storm: birds down in exposed biomes
- winter/coldfront: cold animals up if supported

Important: Existing animal manager only spawns once when a room first gets animals. This means atmosphere-driven spawn changes only affect newly generated/entered rooms unless animal respawn/refresh is implemented. That is acceptable for this pass.

## 11.3 Enemies

Atmosphere can modify:

- spawn chance slightly
- fire cooldown slightly
- move cooldown slightly

Do not let weather fully transform combat.

Examples:

- fog: enemy fire cooldown scalar `1.1` to make aim worse
- storm in Clockwork Quarry: enemy fire cooldown scalar `0.9`
- night in haunted/magical biomes: enemy spawn scalar `1.1`

## 11.4 Fishing

If fishing has an easy hook:

- rain increases fish chance in wet/oceanic biomes
- storm reduces safe fishing or increases rare fish chance
- dawn/dusk improve fishing in coast/ocean/garden

If not easy, document as follow-up.

## 11.5 Lightning

Lightning is allowed but must be fair.

### Lightning lifecycle

```text
1. Candidate strike selected.
2. Telegraph marker appears.
3. Telegraph persists for N snake movement ticks.
4. Strike lands.
5. Damage/effect resolves.
6. After-effect appears briefly.
```

### Player counterplay

- move away
- hide under cover
- unequip conductive equipment
- use insulating equipment
- bait enemies
- use lightning rod item if future feature exists

### Initial profiles

| Profile | Usage |
|---|---|
| `none` | default |
| `rareTelegraphed` | storms in Glass Desert, Clockwork Quarry, maybe Jade Peak |
| `frequentButSafe` | future only |

### Cover

For first pass, “cover” can be simple:

- cave/underground biomes disable direct sky lightning
- dense forests reduce lightning chance
- civilized structures may count as cover later

---

## 12. UI/HUD Requirements

Initial UI can be minimal.

### Required

- Debug/dev display of current atmosphere:
  - season
  - day phase
  - global weather
  - local weather visual
  - biome title

### Optional player-facing UI

Small HUD text/icon:

```text
Summer · Dusk · Storm
Local: Dry Lightning
```

or:

```text
Winter · Night · Snow
```

No full calendar screen required.

### Notification rules

Show small room-entry or phase-change toast only when useful:

- “Storm rolls over the world.”
- “Here, the rain becomes snow.”
- “The glass begins to sing with dry lightning.”
- “Night settles over Moonlit Parish.”

Avoid spam.

---

## 13. Save/Load Requirements

Atmosphere state should be serializable.

Suggested save field:

```ts
worldAtmosphere?: AtmosphereState;
```

Backcompat:

- if missing, initialize default atmosphere
- if partial/malformed, hydrate safely
- do not invalidate old saves

---

## 14. Biome-by-Biome Atmosphere Profiles

This section defines all 23 biome profiles.

Each profile includes:

- current core
- preserve-core rule
- base juice
- day/night role
- seasonal role
- weather response plan
- gameplay hooks
- implementation priority

---

# 14.1 Verdigris Basin

## Current core

- ID: `verdigris-basin`
- Title: Verdigris Basin
- Family: `grassland`
- Tags: `temperate`, `wet`, `starter`
- Temperature: Mild
- Danger: 3
- Temperature hazard: none
- Animals: rabbits, deer, birds, frogs
- Vegetation: moderate

## Design role

The baseline biome. This is the “normal weather” reference point.

## Preserve-core rule

Do not make Verdigris strange. It should remain the control biome that teaches the player what ordinary atmosphere looks like.

## Base juice

- soft grass movement
- light field ambience
- small puddles after rain
- occasional fireflies at night in summer/spring

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | soft mist, more rabbits/deer/frogs |
| Day | baseline clear visibility |
| Dusk | golden tint, birds settle |
| Night | mild darkness, fireflies in warm seasons |

## Season responses

| Season | Response |
|---|---|
| Spring | flowers/petals, frogs up |
| Summer | fireflies, warm tint |
| Autumn | leaf flecks, amber grass |
| Winter | frost tint, rare sleet during coldfront |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear | soft field ambience | none |
| rain | rain | puddles, frog calls | frog/fish bias up slightly |
| storm | thunder | darker grass, distant thunder | enemy spawn unchanged |
| fog | mist | soft ground fog | visibility scalar 0.9 |
| heatwave | heatHaze | sun shimmer | harmless animals down slightly |
| coldfront | mist/sleet | frost on grass | harmless animals down slightly |
| wind | leafFall | grass gusts | none |

## Implementation priority

High. Use as baseline/control in tests.

---

# 14.2 Ember Waste

## Current core

- ID: `ember-waste`
- Family: `desert`
- Tags: `hot`, `dry`, `dangerous`, `starter`
- Temperature: Scorching
- Danger: 6
- Temperature hazard: hot, rate 1
- Animals: foxes, snakes
- Vegetation: sparse

## Design role

Primary heat biome and first proof that rain does not mean literal rain everywhere.

## Preserve-core rule

Rain should not make Ember Waste lush or safe. It should make the desert hiss.

## Base juice

- heat shimmer
- dust
- orange horizon tint
- cracked ground feel

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | brief cooler desert light |
| Day | strongest heat shimmer |
| Dusk | red-orange glow |
| Night | cooler but still dangerous |

## Season responses

| Season | Response |
|---|---|
| Spring | occasional dry wind |
| Summer | heat shimmer intensified |
| Autumn | dusty amber gusts |
| Winter | cold desert nights, slight heat relief |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | heatHaze | shimmering air | baseline hot hazard |
| rain | steam | hissing sand, steam vents | heatRateScalar 0.75 |
| storm | dryLightning | dust, red sky, telegraphed lightning optional | lightning rare/stubbed |
| fog | heatHaze | mirage haze | visibility 0.9 |
| heatwave | heatHaze | intense shimmer | heatRateScalar 1.3 |
| coldfront | clear | blue desert night/cold air | heatRateScalar 0.65 |
| wind | dustStorm | dust gusts | visibility 0.85 |

## Implementation priority

High. Proves hot/dry translation.

---

# 14.3 Moonlit Parish

## Current core

- ID: `moonlit-parish`
- Family: `weird`
- Tags: `cold`, `haunted`, `magical`, `starter`
- Temperature: Cold
- Danger: 4
- Temperature hazard: none
- Animals: birds, wolves
- Palette: cold blue haunted

## Design role

Haunted/night biome. Weather reveals the haunting.

## Preserve-core rule

The biome is already haunted. Weather should amplify it, not replace it with generic horror.

## Base juice

- grave mist
- moonlight
- church bell hints
- ghost breath
- pale blue glow

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | pale mist recedes |
| Day | still cold, subdued |
| Dusk | bells begin |
| Night | haunted effects activate strongly |

## Season responses

| Season | Response |
|---|---|
| Spring | wet grave grass |
| Summer | unnatural cold contrast |
| Autumn | dead leaves, funeral mood |
| Winter | frost, ghost breath, pale snow |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | mist | moon haze if night | none |
| rain | rain/mist | rain on graves, bell echoes | wolves slightly up at night |
| storm | thunder | bell thunder, window flashes | enemy spawn scalar 1.05 at night |
| fog | fog | dense grave fog | visibility 0.75 |
| heatwave | mist | unnatural cold resists heat | no heat effect |
| coldfront | snow/mist | ghost breath, frost | cold mood, no lethal hazard |
| wind | leafFall | dead leaves, bell rope sway | none |

## Implementation priority

High. Proves day-night + haunted tags.

---

# 14.4 Sable Depths

## Current core

- ID: `sable-depths`
- Family: `cave`
- Tags: `cold`, `underground`, `dangerous`, `cave`, `starter`
- Temperature: Frigid
- Danger: 8
- Temperature hazard: cold, rate 1
- Animals: wolves, bears, snakes
- Palette: dark purple

## Design role

Cold cave translation. Weather becomes cave ambience.

## Preserve-core rule

Do not render outdoor rain/snow. This is subterranean.

## Base juice

- cave echo
- falling dust
- dark mist
- cold breath

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | minimal surface leak |
| Day | baseline darkness |
| Dusk | deeper shadows |
| Night | darkest ambience, subtle cave echo |

## Season responses

| Season | Response |
|---|---|
| Spring | more drips |
| Summer | slight condensation |
| Autumn | dry echoes |
| Winter | cold intensifies |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear/mist | cave echo | baseline cold hazard |
| rain | caveDrip | dripping ceiling | none or coldRateScalar 0.95 |
| storm | caveDrip | deep rumble, falling dust | enemy spawn scalar 1.05 |
| fog | mist | cave mist | visibility 0.8 |
| heatwave | mist | condensation | coldRateScalar 0.8 |
| coldfront | mist | ice crust, breath | coldRateScalar 1.3 |
| wind | caveDrip | tunnel draft | visibility 0.95 |

## Implementation priority

High. Proves underground translation.

---

# 14.5 Gloam Garden

## Current core

- ID: `gloam-garden`
- Family: `wetland`
- Counts as: `forest`
- Tags: `temperate`, `humid`, `wet`, `forest`, `starter`
- Temperature: Humid
- Danger: 2
- Animals: frogs, fish, rabbits, birds
- Vegetation: high

## Design role

Gentle wetland payoff. Rain makes it more alive.

## Preserve-core rule

Do not make this a punishing swamp by default. It should be lush and alive.

## Base juice

- soft swamp mist
- frog calls
- damp vegetation
- fireflies

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | strongest mist/frog activity |
| Day | lush clear garden |
| Dusk | fireflies |
| Night | fireflies and frog chorus |

## Season responses

| Season | Response |
|---|---|
| Spring | bloom, frogs up |
| Summer | humid fireflies |
| Autumn | low mist, muted leaves |
| Winter | quiet marsh, pale mist |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | mist | damp air | none |
| rain | rain | pond ripples, frog chorus | frog/fish bias up |
| storm | heavyRain | heavy leaves, louder frogs | frog up, birds down |
| fog | fog | swamp fog | visibility 0.8 |
| heatwave | steam | humid haze | animal chance slightly down |
| coldfront | mist | chilled marsh | frog chance down |
| wind | leafFall | reeds sway | none |

## Implementation priority

Medium-high. Proves positive rain gameplay.

---

# 14.6 Elderwood Maze

## Current core

- ID: `elderwood-maze`
- Family: `forest`
- Tags: `temperate`, `forest`, `dense`, `magical`, `dangerous`, `starter`
- Temperature: Canopied
- Danger: 5
- Dense forest transition
- Generic vegetation disabled because it has forest tile logic
- Animals: broad forest set

## Design role

Dense canopy biome. Weather filters through leaves.

## Preserve-core rule

Weather should be occluded by canopy. Do not render it as an open field.

## Base juice

- canopy shadows
- magical leaves
- branch movement
- hidden fireflies

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | shafts of light, mist |
| Day | filtered canopy light |
| Dusk | maze shadows stretch |
| Night | magical glow, deeper darkness |

## Season responses

| Season | Response |
|---|---|
| Spring | green glow, pollen |
| Summer | dense canopy, fireflies |
| Autumn | heavy leaf fall |
| Winter | bare branch silhouettes |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear | canopy shimmer | none |
| rain | rain/canopyDrip | leaf drips, less direct rain | frogs slightly up |
| storm | thunder | branch shake, falling leaves | enemy spawn scalar 1.05 |
| fog | mist | maze fog | visibility 0.75 |
| heatwave | heatHaze | heavy still canopy | animal chance down |
| coldfront | mist/snow | frost branches | none |
| wind | leafFall | strong leaf drift | visibility 0.9 |

## Implementation priority

Medium. Proves dense forest filtering.

---

# 14.7 Sunken Ocean

## Current core

- ID: `sunken-ocean`
- Family: `ocean`
- Tags: `wet`, `oceanic`, `starter`
- Temperature: Briny
- Danger: 5
- Animals: fish
- Ocean transition
- Special Jason Statham spawn chance

## Design role

Water-world atmosphere.

## Preserve-core rule

Do not turn it into a normal beach. It is sunken and oceanic.

## Base juice

- water shimmer
- wave movement
- bubble particles
- deep blue ambience

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | pale water shimmer |
| Day | blue water clarity |
| Dusk | darkening surface |
| Night | moon reflection, deep water |

## Season responses

| Season | Response |
|---|---|
| Spring | brighter water |
| Summer | warm surface shimmer |
| Autumn | choppy gray-blue |
| Winter | colder darker water |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | seaSpray | water shimmer | fish baseline |
| rain | rain/seaSpray | surface disturbance | fish chance up slightly |
| storm | seaSpray | rough water, thunder | sharks/Jason optional future |
| fog | mist | sea fog | visibility 0.8 |
| heatwave | heatHaze | bright glare | fish chance down slightly |
| coldfront | mist | cold water tone | none |
| wind | seaSpray | wave chop | none |

## Implementation priority

Medium. Existing ocean and Jason hook make this juicy.

---

# 14.8 Home Hearth

## Current core

- ID: `home-hearth`
- Family: `town`
- Counts as: `grassland`
- Tags: `warm`, `civilized`, `starter`, `special`
- Temperature: Warm
- Danger: 0
- Animals: none
- Safe/cozy origin biome

## Design role

Safe/cozy contrast point.

## Preserve-core rule

Never make Home Hearth meaningfully hostile.

## Base juice

- fireplace glow
- warm windows
- small cozy particles
- home ambience

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | warm sunrise |
| Day | cozy normal |
| Dusk | lamps turn on |
| Night | fireplace/lantern glow |

## Season responses

| Season | Response |
|---|---|
| Spring | flowers outside |
| Summer | warm open-window feel |
| Autumn | cozy orange decor |
| Winter | snow outside, warm inside |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear | fireplace glow | none |
| rain | rain | roof/window rain | none |
| storm | thunder | fireplace flicker, distant thunder | none |
| fog | mist | window fog | none |
| heatwave | clear | warm still air | none |
| coldfront | snow/mist | cozy contrast | none |
| wind | leafFall | window gusts | none |

## Implementation priority

Medium. Important for emotional contrast, gameplay none.

---

# 14.9 Jade Peak Province

## Current core

- ID: `jade-peak-province`
- Family: `mountain`
- Counts as: `forest`
- Tags: `cold`, `wet`, `high-altitude`, `civilized`, `starter`
- Temperature: Serene
- Danger: 4
- Animals: koi, crane, tanuki, kappa, birds/foxes
- Special Jade Peak renderer hooks
- Peak cold support

## Design role

Premium juice biome. This is the “Japan biome” in spirit.

## Preserve-core rule

Keep it serene, elevated, wet/cold, and civilized. Weather should make it beautiful first and dangerous second.

## Base juice

- petals
- lantern reflections
- koi pond ripples
- shrine mist
- mountain air
- soft pink/green palette accents

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | mountain mist, pond shimmer |
| Day | serene clarity, petals |
| Dusk | lanterns/reflections |
| Night | lantern glow, moon pond |

## Season responses

| Season | Response |
|---|---|
| Spring | cherry petals |
| Summer | lush green, insects |
| Autumn | red leaves |
| Winter | snow caps, breath, frozen pond edge |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | petals | koi ripples, petals | koi/crane baseline |
| rain | rain | pond ripples, lantern reflections | koi/frog/fish up if supported |
| storm | thunder | shrine thunder, lantern flicker | rare lightning optional |
| fog | mist | heavy mountain mist | visibility 0.85 |
| heatwave | mist | humid mountain haze | no heat hazard |
| coldfront | snow | snow caps, white breath | coldRateScalar 1.1 only at peaks |
| wind | petals/leafFall | petals or leaves drift | none |

## Implementation priority

Highest. This is the showcase biome.

---

# 14.10 Liberty Badlands

## Current core

- ID: `liberty-badlands`
- Family: `desert`
- Tags: `hot`, `dry`, `sparse`, `starter`
- Temperature: Sunburnt
- Danger: 5
- Temperature hazard: hot, rate 0.45
- Animals: eagle, jackalope, raccoon, coyote, bison, bass, possum, armadillo, frog, etc.
- Special Liberty tile hooks

## Design role

Western/Americana desert biome.

## Preserve-core rule

Keep it sparse, roadside, frontier, and sunburnt. Do not make it Ember Waste clone.

## Base juice

- dust
- highway shimmer
- roadside signs
- tumbleweed
- sunburnt palette

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | prairie sunrise |
| Day | harsh sun |
| Dusk | western sunset |
| Night | diner/motel/neon contrast |

## Season responses

| Season | Response |
|---|---|
| Spring | brief desert bloom |
| Summer | harsh sunburn |
| Autumn | dry amber grass |
| Winter | pale cold badlands |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | heatHaze | dust, glare | baseline hot hazard |
| rain | rain | rare desert rain, puddles | frogs/bass slightly up |
| storm | thunder/dustStorm | thunderheads, dust | eagle down, coyote up maybe |
| fog | dustStorm/mist | low road haze | visibility 0.85 |
| heatwave | heatHaze | shimmering road | heatRateScalar 1.2 |
| coldfront | clear | pale blue prairie cold | heatRateScalar 0.75 |
| wind | dustStorm | tumbleweed/dust | visibility 0.85 |

## Implementation priority

High. Strong flavor, uses existing special tiles.

---

# 14.11 Rainforest

## Current core

- ID: `rainforest`
- Family: `forest`
- Tags: `hot`, `humid`, `wet`, `forest`, `dense`
- Temperature: Steamy
- Danger: 4
- Animals: frogs, birds, fish, snakes
- Vegetation: very high

## Design role

Constant local weather biome.

## Preserve-core rule

It should feel wet even when global weather is clear.

## Base juice

- constant drips
- canopy rain
- mist
- insects
- dense green ambience

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | mist, birds/frogs |
| Day | humid green |
| Dusk | insects rise |
| Night | loud insects, fireflies |

## Season responses

| Season | Response |
|---|---|
| Spring | maximum growth |
| Summer | oppressive humidity |
| Autumn | heavy wet leaves |
| Winter | still wet, slightly cooler |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | rain | light constant rain/drips | baseline wet ecology |
| rain | heavyRain | heavy canopy rain | frogs/fish up |
| storm | monsoon | sheets of rain, branch shake | birds down, snakes/frogs up |
| fog | steam | thick humid mist | visibility 0.8 |
| heatwave | steam | oppressive steam | animal chance down slightly |
| coldfront | mist | cool wet fog | none |
| wind | leafFall | canopy movement | visibility 0.9 |

## Implementation priority

Highest. Proves biome-local constant weather.

---

# 14.12 Wintergreen Forest

## Current core

- ID: `wintergreen-forest`
- Family: `forest`
- Tags: `cold`, `wet`, `forest`, `dense`, `high-altitude`
- Temperature: Snow Needled
- Danger: 5
- Temperature hazard: cold, rate 0.35
- Animals: wolves, deer, foxes
- Vegetation: moderate

## Design role

Snowy/cold forest.

## Preserve-core rule

Keep it forest-first. Do not make it Frozen Sea.

## Base juice

- snow needles
- evergreen shadows
- cold mist
- wolf tracks implied

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | pale snow mist |
| Day | crisp evergreen light |
| Dusk | blue forest shade |
| Night | cold blue darkness |

## Season responses

| Season | Response |
|---|---|
| Spring | thawing drips |
| Summer | cool pine forest |
| Autumn | needles/leaves |
| Winter | snow intensifies |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | mist | cold evergreen air | baseline cold hazard |
| rain | sleet | dripping needles | coldRateScalar 1.05 |
| storm | snow | branch shake, snow gusts | wolves up slightly |
| fog | mist | cold forest fog | visibility 0.8 |
| heatwave | clear | thaw drip | coldRateScalar 0.7 |
| coldfront | snow | snow needles | coldRateScalar 1.25 |
| wind | leafFall/snow | needle gusts | visibility 0.9 |

## Implementation priority

Medium-high.

---

# 14.13 Warm Coast

## Current core

- ID: `warm-coast`
- Family: `ocean`
- Tags: `warm`, `wet`, `oceanic`, `shore`
- Temperature: Balmy
- Danger: 4
- Animals: fish, birds, frogs
- Ocean transition

## Design role

Coastal weather biome.

## Preserve-core rule

Keep it warm, coastal, and readable. Storms should add drama without making it brutal.

## Base juice

- surf shimmer
- coastal breeze
- gull/bird ambience
- wet sand glints

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | sunrise surf |
| Day | bright coast |
| Dusk | orange water |
| Night | moonlit surf |

## Season responses

| Season | Response |
|---|---|
| Spring | breezy |
| Summer | bright humid coast |
| Autumn | choppier surf |
| Winter | gray coast, cooler air |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | seaSpray | surf shimmer | fish baseline |
| rain | rain | tropical rain, ripples | fish/frogs up |
| storm | seaSpray/thunder | rough surf, wind | birds down |
| fog | mist | sea haze | visibility 0.8 |
| heatwave | heatHaze | humid glare | none |
| coldfront | mist | cool gray surf | none |
| wind | seaSpray | wave chop | none |

## Implementation priority

Medium.

---

# 14.14 Frozen Sea

## Current core

- ID: `frozen-sea`
- Family: `ocean`
- Tags: `frigid`, `wet`, `oceanic`, `high-altitude`
- Temperature: Icebound
- Danger: 6
- Temperature hazard: cold, rate 0.5
- Animals: fish, birds
- No vegetation

## Design role

Rain-to-snow biome and ice/ocean cold biome.

## Preserve-core rule

Keep it icebound and oceanic, not forest-snowy.

## Base juice

- ice shimmer
- cold wind
- frozen water glints
- distant cracking

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | pale ice light |
| Day | cold glare |
| Dusk | blue ice |
| Night | aurora/moon ice |

## Season responses

| Season | Response |
|---|---|
| Spring | slight thaw glints |
| Summer | glare/thin melt |
| Autumn | hardening ice |
| Winter | strongest snow/whiteout |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear/aurora at night | ice shimmer | baseline cold hazard |
| rain | snow | rain becomes snow | coldRateScalar 1.1 |
| storm | whiteout | heavy snow, low visibility | visibility 0.7, coldRateScalar 1.25 |
| fog | mist | ice fog | visibility 0.75 |
| heatwave | clear | thaw glare | coldRateScalar 0.65 |
| coldfront | whiteout | hard freeze | coldRateScalar 1.35 |
| wind | snow | blowing snow | visibility 0.8 |

## Implementation priority

Highest. Proves rain-to-snow.

---

# 14.15 Ember Caverns

## Current core

- ID: `ember-caverns`
- Family: `cave`
- Tags: `hot`, `dry`, `underground`, `dangerous`, `cave`
- Temperature: Molten
- Danger: 8
- Temperature hazard: hot, rate 0.8
- Animals: snakes, some dangerous animals
- Vegetation: sparse

## Design role

Underground heat/volcanic biome.

## Preserve-core rule

No literal outdoor weather. Weather becomes pressure, steam, rumble, sulfur.

## Base juice

- lava glow
- sulfur haze
- ember motes
- steam cracks

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | minimal |
| Day | baseline molten |
| Dusk | red glow stronger |
| Night | deeper red/black contrast |

## Season responses

| Season | Response |
|---|---|
| Spring | more condensation if rain |
| Summer | hotter glow |
| Autumn | ash motes |
| Winter | steam contrast |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | heatHaze | molten shimmer | baseline hot hazard |
| rain | steam | water sizzles through cracks | heatRateScalar 0.8 |
| storm | thunder/steam | magma rumble, red flashes | enemy spawn scalar 1.05 |
| fog | steam | sulfur haze | visibility 0.85 |
| heatwave | heatHaze | intense red glow | heatRateScalar 1.25 |
| coldfront | steam | thermal shock | heatRateScalar 0.75 |
| wind | ashfall | ash tunnel draft | visibility 0.9 |

## Implementation priority

High. Proves underground hot translation.

---

# 14.16 Fungal Grotto

## Current core

- ID: `fungal-grotto`
- Family: `cave`
- Tags: `wet`, `humid`, `underground`, `cave`, `magical`
- Temperature: Spore-Warm
- Danger: 6
- Animals: frogs, snakes, fish
- Vegetation: very high

## Design role

Spore/mushroom magical cave.

## Preserve-core rule

Do not make it a generic poison biome unless later systems need that. Start with magical spore ambience.

## Base juice

- mushroom glow
- spores
- wet cave drips
- bioluminescent pulses

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | faint glow |
| Day | baseline spores |
| Dusk | glow strengthens |
| Night | bioluminescence strongest |

## Season responses

| Season | Response |
|---|---|
| Spring | spore bloom |
| Summer | humid growth |
| Autumn | fungal decay |
| Winter | pale dormant spores |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | sporeCloud | mild spores | baseline |
| rain | caveDrip/sporeCloud | dripping mushrooms | frogs up |
| storm | sporeCloud | pulsing glow, rumble | magical enemy spawn scalar 1.05 if easy |
| fog | sporeCloud | thick spores | visibility 0.8 |
| heatwave | steam/sporeCloud | humid spore bloom | frogs/snakes up slightly |
| coldfront | mist | dormant spores | animal chance down slightly |
| wind | sporeCloud | drifting spores | visibility 0.85 |

## Implementation priority

High. Proves magical cave atmosphere.

---

# 14.17 Root-Buried Tunnels

## Current core

- ID: `root-buried-tunnels`
- Family: `cave`
- Counts as: `forest`
- Tags: `temperate`, `wet`, `underground`, `cave`, `forest`, `dense`
- Temperature: Earthen
- Danger: 5
- Animals: wolves, bears, snakes, frogs
- Vegetation: moderate-high

## Design role

Living underground forest/root biome.

## Preserve-core rule

Keep it earthen and root-filled. It should feel alive underground, not like Sable Depths.

## Base juice

- root creak
- soil motes
- dripping roots
- faint green/brown ambience

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | roots glow faintly |
| Day | earthy baseline |
| Dusk | shadows deepen |
| Night | root silhouettes/glow |

## Season responses

| Season | Response |
|---|---|
| Spring | root growth, fresh drips |
| Summer | dense root warmth |
| Autumn | dead leaves through cracks |
| Winter | dry roots, pale frost at cracks |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | mist | soil motes | baseline |
| rain | caveDrip | water through roots | frogs up |
| storm | caveDrip | roots creak, dirt falls | visibility 0.9 |
| fog | mist | loam mist | visibility 0.85 |
| heatwave | steam | warm soil smell | none |
| coldfront | mist | cold root breath | none |
| wind | leafFall | leaves/dust through cracks | none |

## Implementation priority

Medium.

---

# 14.18 Ash Steppe

## Current core

- ID: `ash-steppe`
- Family: `desert`
- Tags: `warm`, `dry`, `sparse`, `dangerous`
- Temperature: Dry
- Danger: 4
- Temperature hazard: none
- Animals: rabbits, deer, foxes, birds, wolves, snakes
- Vegetation: sparse

## Design role

Dry ashland/steppe transition biome.

## Preserve-core rule

Keep it sparse and dry. Do not make it volcanic like Ember Caverns.

## Base juice

- ash flecks
- gray-brown grass
- dry wind
- muted sky

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | pale ash light |
| Day | dry steppe |
| Dusk | smoky orange |
| Night | quiet gray dark |

## Season responses

| Season | Response |
|---|---|
| Spring | sparse regrowth |
| Summer | dry heat |
| Autumn | strongest ash/leaf mood |
| Winter | brittle gray frost |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear | ash flecks | baseline |
| rain | ashfall/mist | ash paste, dark mud | animal chance slightly down |
| storm | dustStorm | ash wind | visibility 0.8 |
| fog | ashfall | ash haze | visibility 0.75 |
| heatwave | heatHaze | dry shimmer | none |
| coldfront | mist | brittle frost | none |
| wind | ashfall | drifting ash | visibility 0.85 |

## Implementation priority

Medium-low. Tag defaults can handle much of it.

---

# 14.19 Neon Underpass

## Current core

- ID: `neon-underpass`
- Family: `weird`
- Counts as: `town`
- Tags: `warm`, `civilized`, `dangerous`, `special`
- Temperature: Electric
- Danger: 6
- Animals: snakes, raccoons, possums
- Enemy fire bias: high
- Rare, far from origin

## Design role

Urban/electric weather translator.

## Preserve-core rule

This is not natural weather. Weather becomes city/electric atmosphere.

## Base juice

- neon glow
- sign flicker
- asphalt reflections
- vapor vents
- electric hum

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | washed-out neon |
| Day | underpass shadow |
| Dusk | signs wake up |
| Night | strongest neon/reflections |

## Season responses

| Season | Response |
|---|---|
| Spring | puddles/neon |
| Summer | heat from pavement |
| Autumn | trash/leaves in gutters |
| Winter | cold fluorescent glow |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear | neon idle | baseline |
| rain | neonRain | wet asphalt reflections | raccoon/possum up slightly |
| storm | thunder/neonRain | sign flicker, arcs | enemyFireCooldownScalar 0.95 optional |
| fog | mist | vapor/smog | visibility 0.8 |
| heatwave | heatHaze | pavement shimmer | none |
| coldfront | mist | fluorescent chill | none |
| wind | dustStorm/leafFall | trash gusts | none |

## Implementation priority

High. Proves civilized/weird translation.

---

# 14.20 Glass Desert

## Current core

- ID: `glass-desert`
- Family: `desert`
- Tags: `hot`, `dry`, `sparse`, `dangerous`
- Temperature: Blinding
- Danger: 8
- Temperature hazard: hot, rate 0.8
- Animals: snakes, coyotes, armadillos
- Enemy movement bias: very high
- Rare, far from origin

## Design role

Dry lightning/glare biome.

## Preserve-core rule

Keep it brutal, bright, sharp, dry. Storm means dry lightning, not rain.

## Base juice

- glass glare
- prism haze
- heat shimmer
- sharp reflections

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | crystalline pale light |
| Day | blinding glare |
| Dusk | red reflective shards |
| Night | stars reflected in glass |

## Season responses

| Season | Response |
|---|---|
| Spring | rare glints |
| Summer | maximum glare |
| Autumn | amber glass |
| Winter | frost cracks |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | heatHaze | glass glare | baseline hot hazard |
| rain | steam | sizzling glass mist | heatRateScalar 0.85 |
| storm | dryLightning | dry lightning, glass singing | rare telegraphed lightning |
| fog | prism-haze | refracted haze | visibility 0.8 |
| heatwave | heatHaze | blinding glare | heatRateScalar 1.3 |
| coldfront | mist | frost cracks | heatRateScalar 0.7 |
| wind | dustStorm | glass dust gusts | visibility 0.8 |

## Implementation priority

Highest. Proves storm-to-dry-lightning.

---

# 14.21 Titan Ribcage

## Current core

- ID: `titan-ribcage`
- Family: `cave`
- Tags: `cold`, `dry`, `underground`, `dangerous`, `cave`
- Temperature: Marrow-Cold
- Danger: 7
- Temperature hazard: cold, rate 0.25
- Animals: wolves, bears, snakes
- Vegetation: nearly none
- Bone-colored palette

## Design role

Bone cave / dead giant atmosphere.

## Preserve-core rule

Keep it dry, cold, and skeletal. Rain should become condensation or marrow-drip, not wet cave rain.

## Base juice

- bone dust
- marrow-cold mist
- rib shadows
- hollow resonance

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | faint pale bone light |
| Day | baseline bone shadows |
| Dusk | deeper rib shadows |
| Night | hollow resonance stronger |

## Season responses

| Season | Response |
|---|---|
| Spring | condensation |
| Summer | dry bone dust |
| Autumn | brittle dust |
| Winter | marrow-cold intensifies |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | boneDust | dry resonance | baseline cold hazard |
| rain | caveDrip | marrow condensation | none |
| storm | boneDust | ribcage rumble | enemy spawn scalar 1.05 |
| fog | mist/boneDust | bone fog | visibility 0.8 |
| heatwave | boneDust | dry expansion creak | coldRateScalar 0.75 |
| coldfront | mist | marrow-cold breath | coldRateScalar 1.2 |
| wind | boneDust | hollow draft | visibility 0.85 |

## Implementation priority

Medium. Distinctive juice, low mechanical burden.

---

# 14.22 Radioactive Orchard

## Current core

- ID: `radioactive-orchard`
- Family: `forest`
- Tags: `warm`, `humid`, `forest`, `dangerous`, `magical`
- Temperature: Glowing
- Danger: 8
- Temperature hazard: none
- Animals: snakes, frogs, possums, wolves
- High vegetation
- Rare, far from origin

## Design role

Mutated/fallout magical forest.

## Preserve-core rule

Weather should reveal the existing glowing/radioactive identity. Do not invent a whole radiation survival system unless tied to existing quest timer/hazard hooks.

## Base juice

- green glow
- Geiger sparkle
- mutated fruit shimmer
- luminous fog

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | glow under mist |
| Day | sickly green orchard |
| Dusk | glow ramps up |
| Night | strongest glow |

## Season responses

| Season | Response |
|---|---|
| Spring | mutated bloom |
| Summer | humid radiation shimmer |
| Autumn | glowing fruit fall |
| Winter | pale radioactive frost |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | fallout/mist | green motes | baseline danger |
| rain | fallout | radioactive drizzle | frogs/possums up, radiation hook optional |
| storm | fallout/thunder | green lightning, Geiger storm | enemy spawn scalar 1.05 |
| fog | fallout | glowing haze | visibility 0.75 |
| heatwave | heatHaze/fallout | radiation shimmer | none |
| coldfront | mist/fallout | glowing frost | none |
| wind | leafFall/fallout | glowing leaves | visibility 0.85 |

## Implementation priority

High. Proves weird/magical translation.

---

# 14.23 Clockwork Quarry

## Current core

- ID: `clockwork-quarry`
- Family: `mountain`
- Tags: `temperate`, `dry`, `high-altitude`, `civilized`, `dangerous`
- Temperature: Oiled
- Danger: 7
- Enemy fire bias: high
- Animals: low chance, birds/eagles/snakes
- Rare, far from origin

## Design role

Mechanical/industrial weather translator.

## Preserve-core rule

Keep it dry, oiled, mechanical, high-altitude, and civilized. Rain becomes industrial, not pastoral.

## Base juice

- gear movement
- oil sheen
- steam vents
- amber work lights
- machine rhythm

## Day phase responses

| Day phase | Response |
|---|---|
| Dawn | machines warm up |
| Day | quarry work rhythm |
| Dusk | amber work lights |
| Night | strongest lights/gear glow |

## Season responses

| Season | Response |
|---|---|
| Spring | oil/rain mix |
| Summer | hot metal shimmer |
| Autumn | rust leaves/dust |
| Winter | cold metal creak |

## Weather responses

| Global weather | Local visual | Juice | Gameplay |
|---|---|---|---|
| clear | clear | gears/oil sheen | baseline |
| rain | oilRain | oil-slick rain, gear drips | none |
| storm | thunder | lightning powers machinery | enemyFireCooldownScalar 0.9, rare lightning optional |
| fog | steam | steam exhaust | visibility 0.85 |
| heatwave | heatHaze | hot metal shimmer | none |
| coldfront | mist | cold metal creak | none |
| wind | dustStorm | turbine/gust motion | none |

## Implementation priority

High. Proves industrial/civilized translation.

---

## 15. Initial Profile Table Implementation Sketch

Create `src/world/biomeAtmosphereProfiles.ts`.

Example structure:

```ts
import type { BiomeId } from './biomes.js';
import type {
  BiomeAtmosphereProfile,
  GlobalWeather,
  Season,
  DayPhase,
} from './atmosphereTypes.js';

export const BIOME_ATMOSPHERE_PROFILES: Record<BiomeId, BiomeAtmosphereProfile> = {
  'verdigris-basin': {
    biomeId: 'verdigris-basin',
    baseJuice: ['soft-mist'],
    preserveCoreNote: 'Baseline temperate wet grassland. Keep ordinary and readable.',
    weatherResponses: {
      rain: {
        localVisual: 'rain',
        juice: ['pond-ripples'],
        gameplay: {
          animalSpawnBiasAdd: { frog: 1 },
        },
      },
      fog: {
        localVisual: 'mist',
        juice: ['soft-mist'],
        gameplay: {
          visibilityScalar: 0.9,
        },
      },
    },
  },

  'frozen-sea': {
    biomeId: 'frozen-sea',
    baseJuice: ['ice-shimmer'],
    preserveCoreNote: 'Icebound ocean. Rain becomes snow; storm becomes whiteout.',
    weatherResponses: {
      rain: {
        localVisual: 'snow',
        juice: ['snow-caps'],
        gameplay: {
          coldRateScalar: 1.1,
        },
      },
      storm: {
        localVisual: 'whiteout',
        juice: ['snow-caps'],
        gameplay: {
          coldRateScalar: 1.25,
          visibilityScalar: 0.7,
        },
      },
    },
  },
};
```

Note: `ice-shimmer` is not in the earlier proposed union; either add it or use existing tags. The final implementation should keep the string union and profile values consistent.

---

## 16. Integration Plan

## 16.1 Step 1 — Types and config

Add:

```text
src/world/atmosphereTypes.ts
```

Add `AtmosphereConfig` to game config.

Tests:

- type-level compile
- default config exists
- disabled config returns no-op atmosphere

## 16.2 Step 2 — WorldAtmosphereSystem

Add:

```text
src/world/atmosphereSystem.ts
```

Responsibilities:

- time accumulation
- phase cycling
- day counting
- season calculation
- deterministic weather rolling
- weather duration
- intensity rolling

Tests:

- phase advances after configured duration
- dawn/day/dusk/night order
- world day increments after night
- season changes after configured days
- same seed gives same weather sequence

## 16.3 Step 3 — Profiles and resolver

Add:

```text
src/world/biomeAtmosphereProfiles.ts
src/world/atmosphereResolver.ts
src/world/atmosphereDefaults.ts
```

Tests:

- all 23 biome IDs have profiles or defaults
- profile table has no invalid biome IDs
- Frozen Sea rain resolves to snow
- Ember Waste rain resolves to steam
- Glass Desert storm resolves to dryLightning
- Sable Depths rain resolves to caveDrip
- Rainforest clear resolves to local rain/drips
- Jade Peak rain includes pond/lantern juice
- Home Hearth produces no gameplay hazards

## 16.4 Step 4 — Snapshot/render integration

Add atmosphere view to render call.

Possible implementation:

```ts
const atmosphereState = this.atmosphere.getState();
const room = this.game.getCurrentRoom();
const atmosphereView = resolveBiomeAtmosphere(
  getBiomeDefinition(room.biomeId),
  getBiomeAtmosphereProfile(room.biomeId),
  atmosphereState,
);
renderer.render(room, snakeBody, currentRoomId, apple, {
  ...existingOptions,
  atmosphere: atmosphereView,
});
```

Tests:

- renderer can be called without atmosphere
- renderer can be called with atmosphere
- no crash for every local visual type

## 16.5 Step 5 — Visual overlays

Implement minimal render helpers:

```ts
private drawAtmosphereBaseTint(view: ResolvedAtmosphereView): void;
private drawAtmosphereGroundJuice(room: RoomSnapshot, view: ResolvedAtmosphereView): void;
private drawAtmosphereParticles(room: RoomSnapshot, view: ResolvedAtmosphereView): void;
private drawLightningFlash(view: ResolvedAtmosphereView): void;
```

Start simple:

- rain = diagonal/vertical lines
- snow = small dots
- fog = translucent rectangles/bands
- steam = translucent rising bands
- ash/fallout = small particles
- petals/leaves/fireflies = simple dots/ellipses
- lightning = low-frequency flash only

## 16.6 Step 6 — Temperature modifiers

Modify temperature tick logic to read resolved atmosphere gameplay modifiers.

Requirement:

```ts
effectiveTemperatureRate = biome.temperatureRate * atmosphereScalar * equipmentScalar * reliefScalar
```

Where:

- hot hazards use `heatRateScalar`
- cold hazards use `coldRateScalar`

Tests:

- heatwave increases hot hazard
- coldfront increases cold hazard
- rain reduces Ember Waste heat if profile says so
- Home Hearth never adds hazard

## 16.7 Step 7 — Animal modifiers

Modify animal spawn resolution to optionally accept atmosphere modifiers.

Possible API:

```ts
ensureAnimals(
  roomId: string,
  room: RoomSnapshot,
  occupied: readonly Vector2Like[],
  atmosphere?: ResolvedAtmosphereView,
): void
```

Apply:

- spawn chance scalar
- animal spawn bias additions

Tests:

- rain in Gloam Garden increases frog/fish weight
- storm in Warm Coast suppresses birds if implemented
- missing atmosphere preserves current behavior

## 16.8 Step 8 — Enemy modifiers

Modify enemy spawn/behavior lightly.

Possible API:

```ts
ensureEnemy(
  roomId: string,
  room: RoomSnapshot,
  occupied: readonly Vector2Like[],
  atmosphere?: ResolvedAtmosphereView,
): void
```

Apply:

- enemy spawn chance scalar
- fire cooldown scalar
- move cooldown scalar

Tests:

- missing atmosphere preserves current behavior
- Clockwork Quarry storm can lower fire cooldown slightly if enabled
- fog can increase fire cooldown if default says so

## 16.9 Step 9 — Lightning hazard, optional/stubbed

If implemented:

Add:

```text
src/world/lightningHazard.ts
```

or integrate with atmosphere system.

Requirements:

- deterministic-ish but not predictable enough to feel fake
- only active when resolved profile has lightning enabled
- telegraph before strike
- tile marker in render snapshot/flags
- can hit enemies
- can hit player only after telegraph
- no instant untelegraphed death

If not implemented, profile can include `lightningProfile` but config keeps `lightningEnabled: false`.

---

## 17. Testing Requirements

## 17.1 Unit tests

### Atmosphere system

- initializes to valid state
- respects disabled config
- advances day phases in order
- increments world day
- changes seasons after configured days
- weather persists for duration
- deterministic same-seed sequence
- different seed can produce different sequence

### Weather weights

- spring increases rain/fog odds
- summer increases heatwave/storm odds
- autumn increases wind/fog odds
- winter increases coldfront odds
- dawn increases fog odds
- night increases fog/storm odds

This can be tested by weight table generation, not random statistical tests.

### Resolver

For all 23 biomes:

- returns valid `ResolvedAtmosphereView`
- has valid `localVisual`
- has clamped gameplay scalars
- does not throw for any global weather, season, day phase combination

Specific assertions:

- `frozen-sea` + rain => snow
- `frozen-sea` + storm => whiteout
- `ember-waste` + rain => steam
- `ember-waste` + heatwave => heat scalar > 1
- `glass-desert` + storm => dryLightning
- `rainforest` + clear => rain/heavy humid local ambience
- `sable-depths` + rain => caveDrip
- `ember-caverns` + rain => steam
- `moonlit-parish` + night => haunted juice
- `jade-peak-province` + rain => pond/lantern juice
- `home-hearth` + any weather => no harmful gameplay scalar
- `radioactive-orchard` + rain => fallout
- `clockwork-quarry` + storm => industrial/thunder response

## 17.2 Integration tests

- Game initializes with atmosphere enabled.
- Game initializes with atmosphere disabled.
- Existing room generation still works.
- Entering every biome can resolve atmosphere.
- Renderer accepts every resolved visual.
- Save without atmosphere hydrates correctly.
- Save with atmosphere restores correctly.
- Existing tests pass.

## 17.3 Manual QA checklist

For each biome:

- visit during clear/day
- force rain
- force storm
- force fog
- force heatwave
- force coldfront
- force wind
- force night
- force winter

Check:

- visuals are visible but not overwhelming
- snake remains readable
- apple remains readable
- enemies/bullets remain readable
- water/terrain remains readable
- no excessive flashing
- no FPS collapse
- no stuck state

---

## 18. Acceptance Criteria

The pass is complete when:

1. Global day-night exists and advances.
2. Global seasons exist and advance.
3. Global weather exists, persists, and rerolls deterministically.
4. Every biome resolves a local atmosphere view.
5. All 23 biomes have explicit design coverage in `biomeAtmosphereProfiles.ts` or a default + documented profile.
6. Renderer shows at least:
   - day/night tint
   - rain
   - snow
   - fog/mist
   - steam/haze
   - ash/fallout/spores or equivalent particle variant
7. At least these translations are implemented:
   - Rainforest: clear still has wet/rain ambience
   - Frozen Sea: rain becomes snow
   - Ember Waste: rain becomes steam
   - Glass Desert: storm becomes dry lightning
   - Sable Depths: rain becomes cave drips
   - Jade Peak Province: rain adds pond/lantern juice
   - Neon Underpass: rain becomes neon reflections
   - Radioactive Orchard: rain becomes fallout drizzle
8. Temperature modifiers exist for heatwave/coldfront.
9. Animal spawn modifiers exist for at least rain/frogs/fish.
10. Existing saves remain compatible.
11. Existing tests pass.
12. New tests cover atmosphere system, resolver, and major biome mappings.
13. Weather does not randomly kill the player without warning.
14. Atmosphere can be disabled by config.

---

## 19. Risks and Mitigations

## 19.1 Scope explosion

Risk: The pass becomes weather + farming + NPC schedules + hazards + UI + new assets.

Mitigation:

- Keep one system spine.
- No room regeneration.
- No full calendar UI.
- Mostly procedural visuals.
- Gameplay modifiers small.

## 19.2 Visual noise

Risk: Rain/fog/particles obscure gameplay.

Mitigation:

- low alpha
- config toggles
- clamp particle density
- snake/apple/enemy readability tests
- low-motion mode

## 19.3 Static cache invalidation

Risk: Dynamic atmosphere dirties static room rendering every phase.

Mitigation:

- atmosphere overlays are dynamic
- do not mutate room layout/colors per phase
- keep base room cache keyed by biome/layout

## 19.4 Unfair hazards

Risk: Lightning or weather damage feels random.

Mitigation:

- lightning disabled by default or rare
- telegraph before strike
- never instant
- visible target markers
- can hit enemies too

## 19.5 Biome identity drift

Risk: Weather makes biomes feel samey.

Mitigation:

- all biomes get preserve-core notes
- local translation table per biome
- tag-derived defaults only as fallback
- showcase overrides for distinctive biomes

---

## 20. Recommended First-Pass Implementation Priority

Although this is one pass, implement in this order:

1. Types/config
2. Atmosphere clock
3. Weather rolling
4. Resolver
5. Profiles for all 23 biomes
6. Renderer overlays
7. Temperature modifiers
8. Animal modifiers
9. Enemy modifiers
10. Lightning stub or safe implementation
11. Save/load hydration
12. Tests
13. Manual QA

## Showcase biomes to verify first

1. Jade Peak Province
2. Rainforest
3. Frozen Sea
4. Glass Desert
5. Ember Waste
6. Sable Depths
7. Neon Underpass
8. Radioactive Orchard
9. Verdigris Basin

---

## 21. Future Extensions

After this pass, future systems can plug into atmosphere:

- town curfew at night
- seasonal shop inventory
- rare seasonal quests
- weather achievements
- lightning rod item
- insulating equipment
- rain-powered artifacts
- storm bosses
- biome-specific fish tables
- NPC schedules
- “weather forecast” oracle
- global events tied to season transitions
- festivals in civilized biomes
- Archipelago location checks tied to rare weather

These should not be part of the initial implementation unless they are tiny and natural.

---

## 22. Final Design Mantra

When implementing any specific behavior, ask:

1. Does this preserve the biome’s core?
2. Does this make weather locally interesting?
3. Is the player able to read what is happening?
4. Is any danger fair and telegraphed?
5. Can this be data-driven?
6. Does this make the next room funnier, stranger, prettier, or more memorable?

The target is not realism.

The target is:

> **A cursed maximalist Snake world where the sky changes globally, every biome has an opinion about it, and the snake occasionally realizes its hat may have attracted God.**
