# Snake for the Modern Gamer — Agriculture, Territory & Greenhouse Systems

**Implementation design specification / AI coding-agent handoff**  
**Status:** Approved product direction; implementation proposed, not yet built  
**Scope:** Full, production-quality, persistent farming integrated with the normal Snake game, territorial ownership, seasons, weather, towns, creatures, commerce, consumables, and multiplayer  
**Repository:** `Sterfry42/snake-for-the-modern-gamer` — <https://github.com/Sterfry42/snake-for-the-modern-gamer>  
**Reference branch at investigation:** `main`, November 7, 2026  
**Document authority:** Product decisions in this spec are requirements; numeric balance values and suggested new interfaces are initial design defaults, not existing repository APIs. Verify paths and types against the latest branch before editing.

> **Core principle:** A hoe lets you cultivate suitable ground **for free, anywhere you are allowed to farm**. A paid land claim grants rights, not the ability to grow plants. A paid greenhouse provides stable, neutral, season- and weather-resistant growth, not universally optimal growth. Crops are persistent, vulnerable world objects that animals, enemies, NPCs, other players, weather, and the economy can interact with.

## 0. Instructions to the implementing AI

1. **Implement, not merely prototype.** Deliver the complete feature across world simulation, player input, validation, UI, saves, snapshots, economy, crop catalog, greenhouse, town permissions, and NPC/animal interactions. A two-crop demo, placeholder menu, client-only simulation, or feature that fails when the player leaves the room is not completion.
2. Read root `AGENTS.md`, applicable nested agent instructions, project conventions, and existing tests before changing code. Tony is the default engineering personality unless the operator chooses otherwise. Persona never overrides sound engineering, test results, or source code.
3. Inspect actual code before touching it. The code locations in §2 were verified during design, but repository contents may change. Adapt the implementation to current interfaces; do not force code into outdated pseudocode.
4. Ship in **tested vertical slices** and keep the project building. This is a large scope, not a license for one unreviewable god-class patch. The milestones in §19 are sequencing, not optional cuts to the final product.
5. Preserve existing playable systems: movement, Minecraft mode, construction, house furniture/garden, day/night, weather, inns/rest, town elections, guild, inventory, shops, animals, enemies, saving/loading, and multiplayer. Characterization tests before changing legacy behavior; migration before deleting it.
6. Authoritative session owns all gameplay mutations. UI sends **intent**, not prices, yields, climate values, growth, target room, replacement state, or permission verdicts. Reject forged, stale, repeated, invalid and remote commands without side effects.
7. Use the existing player identity, room coordinates, inventory, world generation, season/weather, construction, and town civic services. Do not create competing clocks, terrain maps, economies, claim databases or item inventories.
8. Do not make farming advance according to FPS, render frames, animation ticks, browser refresh counts, or client wall-clock time. It must be deterministic under different update chunking and work with offscreen rooms, rest, save/reload, and multiplayer.
9. At completion: run the available unit/integration test suite, typecheck, lint, build, plus targeted performance tests. Report exactly what passed, failed, or could not be run. Do not claim verification that did not occur.
10. When source code contradicts this design, prefer preserving existing invariants and implement the intended product behavior in the narrowest correct integration seam. Record deliberate deviations and why.

---

## 1. Product vision and non-negotiable outcomes

### 1.1 Intended player story

A snake discovers grassland, acquires or crafts a hoe, tills an accessible patch of earth and plants seeds without buying or claiming anything. Rain waters the soil while the snake adventures elsewhere. Returning later reveals vegetables that have grown—or have been eaten, trampled, stolen, frozen or destroyed. The player can harvest and eat produce, cook with it, sell it, replant saved seeds, or invest in land ownership and defenses. A more established player claims a wilderness room by paying score after eliminating present hostiles, fences it, adds irrigation and a greenhouse, and grows reliable crops year-round. A mayor may designate legal farming space in their own town. A criminal player grows cannabis and finds black-market buyers, accepting greater risk and social consequences.

This must be mechanically true, not just flavor text.

### 1.2 Required gameplay pillars

- **Accessible:** Tool + seeds + valid ground + permission are sufficient. No mandatory purchased plot.
- **Physical:** Plants appear at specific world coordinates and can be interacted with by multiple systems.
- **Persistent:** Crops and land claims survive travel, room-cache eviction, browser refresh, save/reload and multiplayer reconnection.
- **Environmental:** Season, resolved local weather, shelter, soil and biome affect growth and viability; rain matters.
- **Strategic:** Open-air ideal conditions can outperform a greenhouse; the greenhouse offers reliable baseline conditions.
- **Emergent:** Animals graze/trample; bandits steal; hostile/freak entities can destroy; defenses actually reduce incidents.
- **Economic:** All ordinary produce can be consumed or sold; seeds cost money; profitable farms require time/work and cannot print unlimited score.
- **Political:** Town boundaries and mayoral authority have enforceable consequences.
- **Composable:** The same land-permission service eventually supports more than agriculture.
- **Visible:** Player receives clear action previews, rejection reasons, growth/moisture/state indicators, map ownership markings, and comprehensible incident reports.

### 1.3 Explicit non-goals

- No real-world time-based crop growth while the game is closed in v1; only authoritative **in-game** time advances farms.
- No mandatory realistic irrigation plumbing network, soil pH, crop genetics, livestock breeding, or full biome-specific farm-map generation.
- No universal protection merely from owning land. Ownership is a right against other players and ordinary construction permissions, not an invulnerability shield against wildlife/enemies.
- No wholesale replacement of Minecraft mode or all existing construction/world-generation code.
- No client-side farm authority, duplicate inventory representation, or per-frame scanning of the entire infinite world.
- No requirement that farmers buy a plot before tilling.

---

## 2. Verified current repository integration points

**These are descriptions of existing code as examined, not claims that the new feature exists.**

| Existing area | Relevant files / anchors | What exists and what to do |
|---|---|---|
| Old house garden | `src/game/snakeGame.ts` around `purchaseHouseItem`, `tickHouseGarden`, `interactHouseGarden`; `src/scenes/snakeScene.ts` house menus | Purchased garden costs 6 score, places legacy tiles, ripens after 45,000 ms only while at home and awards +5 score/+1 length. Migrate/replace with actual greenhouse beds and preserve prior purchases. |
| Old Minecraft farming | `src/minecraft/farming.ts`, `MinecraftFeature.ts`, `minecraft/save.ts` | Separate wheat/pumpkin farming, block state, inventory and day/night; tilling requires a shovel; wheat harvesting does not verify maturity; growth is active-room-only. Use as conceptual reference, not as the new authoritative farm state. |
| Construction ownership | `src/building/constructionState.ts`; `src/game/snakeGame.ts`; `src/session/SceneGameplayActions.ts` | `RoomClaim` already has room/owner/build-demolish permissions. `claimRoom()` can replace another owner's claim at the low level; command currently checks ownership but charges no score. Add atomic secure paid claims and broaden permissions. |
| Structure placement | `src/building/structureBlueprint.ts`, `constructionState.ts`, `snakeGame.ts` | Blueprints, rotation, occupancy checks and previews exist. `stepStructurePlacement` moves the snake; do **not** use it to water or till. Extend footprint and greenhouse coverage without undermining collision checks. |
| Weather and seasons | `src/world/atmosphereTypes.ts`, `atmosphereSystem.ts`, `atmosphereResolver.ts`, `snakeGame.updateAtmosphere` | Spring/summer/autumn/winter, rain/storm/clear/fog/heatwave/coldfront/wind, local biome weather effects, shelter modes, persisted world day. Use this clock, not Minecraft's. |
| Authoritative simulation | `src/session/AuthoritativeGameSession.ts`, `SceneActionCommand.ts`, `SceneGameplayActions.ts` | Session command queue, player context and central environment advancement exist. Add typed farm/claim/transaction intents and authoritative outcomes. |
| Inventory / food | `src/inventory/item.ts`, `inventory.ts`, `itemRegistry.ts`; `snakeGame.useInventoryItem`, `cookRecipe` | Named items, counts, consumable effects and cooking exist. Register produce/seeds/tools/food as normal game items. |
| Commerce / crime | `src/shops/shopProfiles.ts`, `villageShop.ts`, `src/session/GuildActions.ts` | Rotating shop stock, general/black-market profiles, score currency and guild exist. Build actual crop buying/selling; guild fence currently awards score without consuming goods, so do **not** use that as a generic sell implementation. |
| Wildlife / enemies | `src/animals/animalManager.ts`, `src/systems/enemies.ts`; actors in `snakeGame.ts` | Grazing/wandering animals, hostile movement, bandit roles and NPC brains exist but no crop targets. Movement often checks layout rather than placed construction collision—fences need an actual blocking integration. |
| Town politics | `src/civic/civicTypes.ts`, `civicService.ts`; `src/world/town.ts`, `safeZones.ts` | Player/actor mayors, elections, per-town civic state, multi-room towns, town perimeter, protected interiors. Check mayor **player ID**, not merely `mayor.kind === 'player'`. |
| World/renderer/map | `src/world/types.ts`, `roomSnapshotCache.ts`, `src/ui/snakeRenderer.ts`, `minimapRenderer.ts` | Room layout and vegetation, cached rooms, pooled rendering and 3×3-room minimap. Farm overlays should not modify base terrain strings or depend on hot-room cache lifetime. |
| Save and replication | `src/game/saveTypes.ts`, `snakeGame.getSaveData/loadFromData`, `src/session/GameSnapshot.ts`, `SceneClientState.ts`, `SceneReadReplica.ts` | Saves and snapshots explicitly enumerate fields. Add farming state and claim/structure projections, not an unpersisted scene flag. |

**Specific current facts:** Four day phases have lengths of approximately 45 s / 100 s / 60 s / 80 s: one world day is **285 seconds (4:45)**. Default season length is **7 game days**. Do not hardcode these durations into farming; derive from the existing atmosphere configuration. `room.vegetation` has variants such as `grass-*`; a normal Snake grass surface does not necessarily equal a Minecraft `grass` block. `room.town`, `room.townPerimeter`, `room.village`, `room.layer`, and physical town room IDs help determine land legality. `getStructureAt()` currently scans structures and may merit a per-room/cell index if heavily used by agriculture.

---

## 3. Exact rules for farming on land

### 3.1 Cultivation is free

The hoe's primary action tills **one eligible cell**, selected relative to the snake head (see §9). No score cost, deed, placement blueprint, purchase confirmation, or ownership requirement exists in unclaimed wilderness. Planting consumes one corresponding seed from the player's normal inventory. Watering consumes a use of a watering tool or available water resource, as specified in §8; harvesting consumes the crop state and awards items atomically. Re-tilling an already tilled empty cell is idempotent and free.

Eligible ground must meet all conditions:

1. A valid ground-level room/cell exists; not off-map, underwater, in the sky or a disallowed interior.
2. The **base** terrain is accessible and tillable: walkable natural floor, and appropriate soil/grass/vegetation or ground tag determined by a small `resolveSoilSubstrate(room,x,y)` adapter. Do not judge legality from tile character `.` alone; roads, shops and constructed floors are frequently represented as ordinary floor.
3. There is no protected landmark, portal, cave/layer entrance, transit station, building, fixed NPC facility, existing blocking structure, water, rock, tree or other disallowed occupancy.
4. No conflicting cultivated state occupies the same cell. All plant/soil cells have a unique `(roomId,x,y)` key.
5. The player's farming access is permitted under §4. This includes town jurisdiction, existing claims and world-defined restricted areas.
6. A solid structure or other immutable occupant cannot be bypassed merely by moving the tool target onto the occupied cell.

A small flower/grass ground-cover decoration may be cleared as part of tilling; large trees, rare flora, protected vegetation and special landmarks cannot. Removing existing crops is a distinct deliberate **clear** action, never an accidental side effect of tilling.

### 3.2 Scope of land legality

| Location | Tilling / planting | Harvesting | Ownership / construction |
|---|---|---|---|
| Normal, unclaimed wilderness | Allowed on suitable ground | Publicly accessible; anybody may pick exposed crops | May claim eligible room for score; building requires claim |
| Wilderness claimed by self | Allowed | Allowed | Owner may build, manage, invite others |
| Wilderness claimed by another player | Denied unless explicitly granted farm permission | Denied unless owner grants harvest permission; NPC crime rules differ | No hostile takeover or construction without build permission |
| Town where another is mayor | Denied on public land | Existing permitted public harvests only; no default agricultural right | Claim action forbidden |
| Town where this player is mayor | Allowed directly on physically eligible public municipal soil; not roads/landmarks. The mayor may additionally designate community beds for other players | Allowed per municipal permission | May assign municipal farm zones; not convert entire city to private deed |
| Village / NPC-managed settlement | Denied unless an explicit permission/quest grants access | Explicit permissions only | Claim action forbidden |
| Existing house greenhouse | Allowed on dedicated legacy/new grow-bed cells | Allowed | Covered by house ownership, not wilderness deed |
| Cave, ocean, protected dungeon, other interiors | Denied by default; permit only if explicitly soil-equipped and authorized | Existing valid farms only | Do not create cheap claims in special instances |

In unclaimed wilderness, `plantedBy` is provenance, **not property ownership**: another player can lawfully harvest it. If future theft/reputation features apply, do not silently invent them for wild crops. NPCs and wildlife follow their own behavior rules and are not stopped by property permissions alone.

### 3.3 Soil state independent of terrain

A tilled cell is a lightweight overlay on immutable generated terrain. Proposed minimal record: substrate, moisture, fertility, weed pressure, crop and timestamps. Do **not** replace arbitrary layout characters with `'D'`, `'R'`, `'farmland'`, or Minecraft blocks. Rendering and collision read the overlay. Clearing a farm restores the underlying generated appearance. Plots survive room regeneration/cache eviction and do not modify world generation.

### 3.4 Fertility and soil types

Resolve initial soil from biome **and actual terrain**. Start with `loam` (normal), `rich` (wetland/meadow/appropriate forest), `dry` (arid), `ash` (ember), `poor` (degraded/barren but still naturally tillable), and `artificial` (greenhouse beds). Biome alone must not grant tilling on water or stone. Suggested fertility: 0–100, default 65 loam, 80 rich, 35 dry, 45 ash, 25 poor, 70 artificial. Each harvested cycle depletes 3–8 fertility based on crop intensity; compost adds 25 (cap 100), and leaving land fallow slowly restores fertility. Poor fertility reduces speed/quality but does not destroy every crop automatically. Keep this logic data-driven and unit-testable.

---

## 4. Paid territory claims: one room as the initial zone

### 4.1 Unit, identity and price

A claim initially covers **one existing coordinate room** (not an arbitrary drawn polygon). This matches `ConstructionState.RoomClaim` and the current minimap and avoids a second spatial-ownership engine. A user can own multiple adjacent rooms, individually purchased; later contiguous plots may be grouped cosmetically without changing enforcement.

Suggested initial pricing, all server computed:

```ts
const BASE_ROOM_CLAIM_SCORE = 40;
const ADDITIONAL_ROOM_COST = 20;
// claimCost = 40 + 20 * numberOfAlreadyOwnedWildernessRooms
// Examples: first claim 40, second 60, third 80.
```

Balance values are configurable. Existing claims loaded from older saves are **grandfathered**, not re-charged. A repeated claim by the same owner returns success / already-owned without a new charge. Do not permit a claimed room to be silently overwritten by another player. No recurring rent initially.

### 4.2 Validation and atomicity

Command `territoryAction:claimCurrentRoom` may succeed only when:

- the player is in that exact room, alive and authorized;
- room is ordinary claimable wilderness, not a town, town perimeter, village, house, protected special region or claimed by another;
- the player has sufficient score;
- **no active hostile enemies, hostile NPC actors, bosses or current hostile raid** occupy the room at validation time; peaceful animals do not block claims;
- active placement/movement state does not corrupt action semantics;
- one authoritative transaction verifies all conditions, deducts the price once, records the claim and emits a result/event.

**Threat clearance is a purchase precondition only.** Once claimed, ordinary enemy spawns and raids can still occur. Ownership alone must not change `getSpawnPolicy` or convert an unsafe room into a safe room. A fenced/guarded claim may affect *actual entry and damage* through defense systems, not blanket spawn suppression.

### 4.3 Ownership rights and lifecycle

Extend existing construction claim semantics with rights `build`, `demolish`, `farm`, `harvest`, `manage`, while retaining existing `build`/`demolish` compatibility. Owner has all rights; explicitly granted player IDs have only selected rights. Prefer a small access-control helper over duplicating owner checks throughout systems. Claims belong to actual `PlayerId` and persist in the existing construction save object; never bind ownership to the local client alone. Avoid making one player mayor of somebody else's town because merely *some* player owns the office.

Owner may release claim with confirmation, but **cannot sell/release and duplicate or automatically reclaim free of charge**. Initial design: no score refund; reject release while owner-built structures remain, so the owner must demolish/relocate them first. Crops remain world objects but become publicly harvestable once ownership is released. Never silently delete a structure or refund the original claim price. Non-owner re-claim is disallowed until legitimate release, not overwrite. Defeated/dead players retain property across normal death unless existing player-save semantics require otherwise.

### 4.4 Claim display

Minimap ownership overlay: distinct outline for owned/other/unclaimed; current room ownership in tooltip/status. Update signature/cache invalidation on claim revision, including release and permission updates. The local 3×3 minimap must not generate dozens of new distant rooms just to show ownership; query claims by room IDs. Territory panel lists costs, claims, access, occupancy blockers and existing structures. A failed claim states precise reason and never deducts score.

---

## 5. Towns, mayors and municipal farming

Check town membership by physical room geography, not merely whether `getCurrentRoom().town` is present: multi-room towns, perimeters and municipal layer rooms must remain protected. For most municipal regions, ordinary non-mayors cannot till public ground, even if the tile is grassy; the mayor can till any physically eligible municipal soil without first buying or designating a plot. The owner of a wilderness claim cannot claim a municipal room by stepping around its gate.

The election system already tracks `TownCivicState.mayor` as `actor`, `player`, or `vacant`. Only `mayor.kind === 'player' && mayor.playerId === command.playerId` grants mayoral authority. Treat the mayor as municipal custodian, not owner of everyone else's private property. The mayor may farm physically eligible public soil directly and may designate specific beds as community garden zones that grant nonmayors access; the mayor may optionally construct a public greenhouse where construction validation allows. Streets, town halls, shops, houses, entrance points, businesses, roads and monuments remain protected. Municipal permission revokes or changes according to current office; **existing crops do not vanish when office changes**, but new planting follows the new mayor/permission regime. Harvesting on legacy public beds uses explicit municipal policy.

Do not change civic election logic or invent a new faction ownership system. Add a narrow `canFarmMunicipalCell(playerId,town,cell)` evaluator to the existing civic/runtime state; persist designated plots as small town runtime metadata if needed. An ordinary visitor may harvest only when community garden policy permits it, and cannot farm outside that designated area. Unauthorized cultivation fails clearly; optional crime/reputation events can be attached if gameplay has an established trespass mechanism, but do not grant free access by recording a crime after the action.

---

## 6. The greenhouse: purchased climate control

### 6.1 Product promise

The greenhouse is what players pay for. It creates an **interior-like controlled agricultural microclimate** covering designated grow cells. Greenhouse crops ignore ordinary season eligibility, adverse weather penalties, frost and direct rain/storm crop damage. They grow at **baseline 1.0× climate suitability** regardless of biome, except intrinsic crop-specific rules such as shade or special substrate explicitly stated in the catalog. It is **not an automatic speed buff**: native crops outdoors in ideal conditions may grow faster and score better quality. Rain does not water greenhouse soil; the player must water or install irrigation.

A greenhouse prevents ordinary animal trampling/foraging *while intact and physically sealed*. It does **not** automatically prevent NPC theft or monster damage; doors/openings, raids and greenhouse health matter. Weather immunity does not imply invulnerability to an actual hostile attack or deliberate demolition.

### 6.2 Acquisition forms

1. **House greenhouse annex:** replace the old 6-score Garden Plot purchase/label with Greenhouse Annex. For balance, its **new-purchase price should be tuned independently** (suggested 25 score for a small two-bed annex); owners of the prior `garden` purchase are automatically grandfathered. Convert their two garden cells to persistent greenhouse grow beds, with equivalent reasonably valuable starter crops or seeds if needed; no loss of purchase, score, or prior ready-state reward without compensation. Do not turn the whole house into farmable ground.
2. **Wilderness greenhouse structure:** blueprint purchased for suggested 90 score and placed **only on own claimed wilderness land** (or explicitly authorized municipal farm zone). Suggested footprint 5×5, with 3×3 interior grow beds and a walkable door. Establish climate coverage from its placed structure footprint/metadata. The 90 score is charged **once on successful confirmation**, not on entering preview. Position and rotation use existing structure planning/validation.
3. **Upgrades:** irrigation and tougher doors may be purchased separately; greenhouse coverage is valid only while structure is intact. Damage may degrade protection before full destruction. Future greenhouse sizes may be separate blueprints, not bespoke room categories.

### 6.3 Technical shape and collisions

Extend `StructureBlueprint` metadata with explicit optional `agriculture` fields (e.g. `growCells`, `climateControlled`, `roofed`, `doorCells`) and compute rotated coverage using the existing `planStructureStamp` logic. Do not infer greenhouse area from arbitrary letters in room layout or use a separate overlapping coordinate model. Ensure the pattern/plan includes the farmable floor cells even though current `blueprintFromPattern` skips `.`; either represent grow beds explicitly or use a metadata mask transformed by the same rotation. A greenhouse must not delete existing crops under its footprint by accident; deny placement on nonempty crops unless migration/upgrading explicitly transfers them. Keep structure and farming saves independent but reference structure IDs.

Cross-system collision is mandatory. Construction walls, fences and doors must be recognized by animal and enemy movement path/occupancy checks; currently those subsystems often inspect only `room.layout`. Provide one effective collision/occupancy callback or spatial query, not duplicated tile tests. Verify the snake can enter/exit greenhouse and tend every bed with chosen head-cell interaction model.

---

## 7. Crops, seeds, seasons, biomes and progression

### 7.1 Data-driven crop catalog

Use a typed `CropDefinition` registry, separate from scene UI, with at least: `id`, display name, seed item ID, produce item ID, growth duration in **world days**, valid outdoor seasons, preferred biome families/tags/explicit IDs, poor-environment tolerances, moisture thresholds, soil/fertility sensitivity, first and regrow time, base harvest quantities, sale value, consumable/cooking tags, legal classification, growth stages, render palette and optional special behaviors. Ensure every item ID exists in the normal inventory registry and every action references authoritative definitions.

**Mandatory initial crop roster — all rows are target deliverables, not optional examples:**

| Crop ID | Outdoor season(s) | First harvest (game days) | Yield | Base sale score each | Primary distinction |
|---|---|---:|---:|---:|---|
| `radish` | Spring, autumn | 0.65 | 2 | 2 | Fast starter; cheap seed |
| `lettuce` | Spring, autumn | 0.9 | 2 | 3 | High moisture preference; food |
| `carrot` | Spring, autumn | 1.25 | 2 | 4 | Reliable temperate staple; food |
| `potato` | Spring, summer, autumn | 1.5 | 3 | 3 | Broad soil tolerance; cooking |
| `wheat` | Spring, summer, autumn | 1.5 | 4 | 2 | Ingredient, bread chain, moderate water |
| `onion` | Spring, autumn | 1.6 | 2 | 4 | Cooking ingredient; drought tolerant |
| `garlic` | Spring, autumn | 1.75 | 2 | 5 | Cooking/alchemy ingredient |
| `strawberry` | Spring | 1.6 | 3 | 5 | Regrows every 1.0 day while valid |
| `tomato` | Summer, autumn | 2.0 | 3 | 5 | Regrows every 1.0 day; staple food |
| `corn` | Summer, autumn | 2.5 | 3 | 4 | Regrows every 1.25 days; warm climate |
| `pepper` | Summer | 2.0 | 2 | 7 | Regrows every 1.0 day; heat favored |
| `melon` | Summer | 2.75 | 2 | 10 | Valuable, high water demand |
| `pumpkin` | Autumn | 3.0 | 1 | 20 | Large harvest, autumn specialty |
| `cabbage` | Autumn, winter | 2.0 | 2 | 6 | Cool-weather produce |
| `beet` | Autumn, winter | 1.6 | 2 | 5 | Root crop; tolerates mild cold |
| `snow-pea` | Winter, spring | 1.75 | 3 | 5 | Cool-season crop, regrow 1.0 day |
| `frostroot` | Winter | 2.25 | 2 | 10 | Cold-favored fantasy ingredient |
| `forest-mushroom` | Spring, autumn | 1.2 | 2 | 6 | Shade / moist forest preference |
| `ash-chili` | Summer, autumn | 2.5 | 2 | 13 | Rare ember/ash-soil specialist |
| `luminous-mushroom` | Autumn, winter | 2.8 | 1 | 17 | Rare magical/underground specialist, special bed needed |
| `cannabis` | Summer, autumn | 3.0 | 2 | 15 black-market-only | Contraband crop with crime/market implications |

These are **initial numeric defaults** for tuning, not facts about existing items. A crop's days to harvest assume adequate water, baseline fertility and 1.0× climate. The existing game has approximately 4:45 per world day; e.g., 1.5 days is ~7:07 of play at ordinary time speed. Do not make every crop a 45-second automatic money printer. Evaluate balancing with repeated seasons and shop prices.

Seed costs (initial): 1–2 score for radish/lettuce; 3–5 for common staples; 6–10 for berries/pepper/melon; 12–15 for pumpkin and exotic crops; 20 for cannabis seeds through black market. Seeds must be consumable items, not one permanent global toggle. Crops may provide **limited** seed recovery on harvest (e.g., 0–2 according to crop definition), preserving progression while not creating guaranteed free exponential production. No seed duplication from a failed plant action.

### 7.2 Seasons and viable growing windows

- Outdoor planting is allowed in listed seasons only. Display exact reason and valid season(s) when disallowed. Existing living crops may survive a brief season transition, but growth becomes impaired or paused outside their allowed season and extended unsuitable conditions can wither them; **do not delete crops instantly at midnight on season change**.
- Suggested grace: 0.5 world day after leaving valid season, then crop health decreases by 12/day until suitable conditions return or the crop dies. Mature produce may remain harvestable for at least 0.5 world day before freshness decline. Greenhouses ignore seasonal eligibility and these penalties.
- Re-growing plants continue production until end-of-season, removal or death, and should not generate harvests offscreen automatically into player inventory; they become **ready** and wait for harvest. No infinite auto-yield accumulation without automation.
- Seasonal crops in fitting **local climates** may get a growth and quality bonus outdoors. A greenhouse gets stable baseline but not that peak bonus.
- Seasons follow `WorldAtmosphereSystem` and `daysPerSeason` configuration, never a hardcoded independent 7-day calendar.

### 7.3 Biome suitability and unique opportunities

`getBiomeDefinition(room.biomeId)` exposes family, tags, thermal attributes and other environment signals. Use those stable semantic fields rather than hardcoding a separate massive case statement for every biome. Add explicit special crop-to-biome overrides only where memorable.

| Environment characteristic | Agriculture response |
|---|---|
| Temperate grassland / starter meadow | Good ordinary vegetables, starter seeds, loam |
| Wetlands / rainy forests | Higher initial moisture, lettuce/mushroom bonus, excess-water risk |
| Hot coasts / dry grasslands | Pepper/melon bonus with watering; faster evaporation |
| Desert / arid / glass terrain | Naturally tillable soil rare; cultivated dirt or soil kits where permitted; extreme water burden |
| Wintergreen / frozen regions | Snow pea, beet and frostroot bonus; many warm crops stressed outdoors |
| Ember waste / ash steppe | Ash chili and heat crops; ash soil and dryness affect others |
| Gloam / magical woods | Luminous mushroom and special ingredient potential; local weather matters |
| Radioactive / corrupted areas | Optional special mutations and dangerous produce only if existing hazard rules can support them cleanly; no silent free buffs |
| Ocean or exposed solid stone | Not tillable without a deliberate future soil-bed structure |
| Greenhouse | All normal crops viable at neutral baseline; specialty crops may still require specific soil/light equipment |

**Growth multiplier proposal:** baseline 1.0, ideal biome/soil up to 1.25, harsh but viable conditions down to 0.55; greenhouse **exactly 1.0 climate multiplier**. Other independent inputs (water/fertility) still matter inside greenhouses. Clamp final multiplier to 0–1.5 for predictable economics. Biome strengths should emerge from the data, not hardcoded favorites. Exotic crop seeds can be rare biome finds, rewards or specialty shop stock, but accessible basic crops should never depend on obscure world generation.

### 7.4 Plant lifecycle

Stages: `seeded` → `sprout` → `young` → `mature` → `ready` → `withered/dead`. Visual stage thresholds suggested at progress 0, 0.2, 0.5, 0.8, 1.0. Only `ready` can grant full harvest (except explicitly documented green harvest recipes). `ready` is a stable state; elapsed time alone never triggers a reward. A regrow crop after harvest reverts to `young` and begins its regrow timer, **without consuming another seed**. Non-regrow crops leave tilled, empty soil after harvest.

Maturity, moisture, fertility, health and weeds are **different variables**. Overwatering may reduce quality, drought can pause growth, and repeated frost can kill. The goal is more decision making, not punitive maintenance every few seconds.

### 7.5 Quality and outputs

Suggested grades: `normal`, `good`, `excellent`. Calculate at harvest from accumulated care/climate score and a seeded per-crop quality roll; do not rely on global RNG consumed by frame rate or render callbacks. Quality affects score at sale (1.0× / 1.25× / 1.6×) and optionally a small consumable bonus. Since current inventory stacks by item ID, either create stable registered quality item variants or introduce a narrow inventory metadata abstraction **only after evaluating the existing item system**. Never discard grade information between harvest, save, trading, cooking and client projection. Always ensure the player can identify the grade and its sale value. Avoid combinatorial item boilerplate by generating grade definitions from a catalog at module initialization if type-safe and compatible with current registry.

## 8. Tools, materials and production upgrades

### 8.1 Mandatory tools and actions

- **Hoe:** equips/uses to till a single head-targeted natural soil cell. Purchase from general merchant (suggested 12 score) and optionally craft by existing systems where appropriate. Reusable: no per-till score cost. If equipment slots are awkward, support owned-tool quick-use from inventory without corrupting combat weapons.
- **Seed pouch / seed picker:** UI selects available seed item and plants at target; consumes one seed. This can be UI functionality rather than a required second paid tool.
- **Watering can:** adds **50 moisture** (cap 100) to one plot; limited capacity (suggested 8 charges), refilled near existing water sources or with an appropriate consumable. Validation prevents watering arbitrary blocked cells. Provide straightforward refilling; if refill infrastructure proves unclear, initially permit infinite uses near a water source and a reasonably priced refill item, but do not silently implement free unlimited remote watering.
- **Harvest:** interacts with mature crop; gives items; no paid sickle required. If inventory capacity exists, verify capacity before consuming crop; current inventory is count-based, so straightforward atomic granting should work.
- **Clear:** deliberate confirmation for a living crop; returns tilled soil, optional limited seed recovery, no produce payout. Clearing a withered crop can be immediate.
- **Inspect:** nonmutating panel showing plant, stage, estimated time, water, fertility, condition, season, likely risks and ownership.

### 8.2 Crop protection and automation

| Upgrade | Suggested cost | Mechanic | Required integration |
|---|---:|---|---|
| Fence section | 5 score | Physical obstacle to wandering animals / some enemies; gates for snake passage | Construction blueprint plus effective movement collision |
| Scarecrow | 25 score | Reduces opportunistic animal crop targeting in local radius; does not stop monsters | Simple room/radius deterrence query |
| Sprinkler | 35 score | Adds moisture to nearby tilled cells each dawn, only with supported water source or finite reservoir | Authoritative daily plot update and structure coverage |
| Compost | 8 score per use | Restores +25 soil fertility, cannot exceed 100 | Inventory transaction, soil update |
| Lockable gate | 20 score | Restricts ordinary NPC path into a fenced area without replacing ownership checks | Existing structure/collision + access control |
| Farm alarm | 30 score | Generates informative incident alerts, may improve player response opportunities | World events/notification delivery |
| Greenhouse | 90 score + claimed land | Stable climate and physical crop shelter | Construction footprint + farm climate adapter |
| Reinforced greenhouse | Later upgrade, suggest 50 | More resistant to deliberate attacks | Persistent structure durability, not special-case immortality |

These upgrades must **actually work**. Do not ship a fence that blocks only the rendering layer or an alarm that cannot identify real incidents. Upgrade prices are design defaults and should be centralized in balance data.

### 8.3 Farming should not immobilize the snake

Farming is an interaction overlay and tool action usable while stationary or paused in manual interaction mode. It must not call `stepStructurePlacement` or advance snake movement. Player may select tool and target, see a preview, commit once, and resume ordinary movement. Do not cause accidental snake death from tilling or planting. Validate death/pause/room changes before applying delayed UI choices.

---

## 9. Player controls, coordinates and interface contract

### 9.1 Targeting

The user wants the normal **at-the-head** interaction model. Default action target is the **current snake head's cell**, in local room coordinates, with an optional one-cell-ahead directional targeting mode if required by collision/visual comfort. The active targeting rule must be consistent for till, seed, water, inspect, clear and harvest. It must not require walking onto a living crop in order to tend it. A farm overlay should expose exactly one highlighted target cell and cycle actions from a dedicated action menu/hotkey; do not confuse farming with existing building placement or Minecraft mode controls.

For initial implementation, favor head cell with a lightweight select-adjacent control for dense fields. If the current movement system physically occupies the target cell, farming checks must intentionally permit the farmer on their own target—without permitting NPC/structure overlap. The snake walking over its own field should not instantly trample it; environmental trample risk is primarily animals/large hostiles.

### 9.2 Interaction flow

1. Open `Farming` from normal play; world interaction state pauses **manual movement** if existing UI semantics require it but does not stop the authoritative weather/world clock unless the game is fully paused by an established rule.
2. Show target cell state: `Untilled grass`, `Tilled — dry`, `Growing carrot — 60%`, `Tomato — ready`, `Protected greenhouse bed`, or explicit denial.
3. Offer context-valid actions with prerequisites and prices/items, e.g., `Till (hoe)`, `Plant (choose seeds)`, `Water (5/8 charges)`, `Inspect`, `Harvest (3 tomatoes)`, `Clear crop`, `Add compost`.
4. Confirm sends one typed command containing action and optional item ID / target-relative offset; no client-authored score or yield.
5. Authority revalidates against *current* room, head position, items, claim, structures and crop state, commits once, returns result and a state revision.
6. UI displays success/failure, updates render and inventory from the authoritative snapshot, and allows another action without moving the snake.

### 9.3 Required feedback

On-screen plant stage and soil moisture indicators, colorblind-readable states/icons, greenhouse coverage indication, crop hover/inspect or near-head popup, sale values in shop, selected seed count, accurate watering can charges, and explicit rejection messages. Examples: `Cannot till: this is town land`, `Claim denied: hostile bandit in room`, `Requires summer or autumn outdoors`, `Already harvested`, `Cannot build over a planted crop`, `Greenhouse: season neutral; soil dry`.

A farming journal or tab should show at least crops discovered, seed sources, preferred season and biome, time-to-harvest, produce uses, local weather effect, and legality/black-market classification. Do not assume the player knows undocumented mechanics.

### 9.4 Minimap and world rendering

Render soil (untilled/tilled/moist/dry), crop stages, mature harvest highlights and greenhouse/fence overlays as **dynamic** layers, not rewrites of base room layout strings. Reuse pooling/spatial culling patterns in `snakeRenderer.ts`. Minimap is for territory and broad farm presence: room claim outline and a small farm/greenhouse marker; avoid displaying every seed tile across all nine rooms at high cost. Invalidate visuals on farm/claim/structure revision or dirty region, not every animation frame. Alternate textures/colors may use existing palette conventions.

---

## 10. Climate, moisture, growth and deterministic world time

### 10.1 Sole authoritative clock

All crop timers must derive from the game's authoritative `WorldAtmosphereSystem` / session environment clock. Never use `Date.now()`, Phaser render ticks, `requestAnimationFrame`, browser uptime, local Minecraft `DayNightCycle`, or UI polling as authoritative growth input. Existing `AuthoritativeGameSession.advanceEnvironment(deltaMs)` clamps individual environment steps to 250 ms; `snakeGame.updateAtmosphere(deltaMs)` currently sees **only the state before and after a call**. A fast-forward or rest can span many phase/weather changes, so the farming adapter must not interpret one end state as the weather for the entire interval.

Implement an environment timeline or phase-boundary callback that reports all **chronological climate segments** advanced by the authoritative atmosphere clock. Alternative: maintain a deterministic, reproducible per-world-day/phase farming climate ledger using the same authoritative weather transitions. Choose whichever better fits current internals. It must include local biome weather resolution, not only global `'rain'`, because some biomes resolve weather into snow, ash, monsoon or other local conditions. Do not emit per-frame updates for every farm cell.

**Required clock behavior:** A fixed 285-second-world-day equivalent simulation must produce the same crop result whether advanced in 285,000 × 1 ms, 1,140 × 250 ms, 285 × 1,000 ms (if supported), or ordinary session chunks, to within explicit numerical rounding tolerance. Loading at dusk must preserve dusk progress and not double-charge moisture; resting until dawn advances farms exactly through the crossed phases. An old save with no farming time origin starts safely at current atmosphere state.

### 10.2 Time representation

Use an authoritative monotonic game-time offset or ordered `(worldDay, dayPhase, phaseProgress)` to compute deltas. Recommended farming state:

```ts
interface FarmingClockState {
  lastProcessedWorldDay: number;
  lastProcessedDayPhase: DayPhase;
  lastProcessedPhaseFraction: number; // [0,1]
  // Optional absolute simulation-time unit if generated by the same atmosphere scheduler.
  simulationElapsedMs?: number;
}
```

Do not create a second independently ticking calendar. If storing an absolute farm time, derive and advance it *only* from authority environment steps. Reconcile atmosphere/save data on hydration, using a tested versioned migration, and ensure world reset clears it. Time advancement must not depend on loaded room or number of connected clients.

### 10.3 Growth integration proposal

For each small climate-time segment, update active plots by room using the current environment conditions. Convert segment duration into **fractional game days**. Apply moisture changes, then growth using climate, soil, moisture and health. For example:

```ts
const climate = resolveCropClimate({
  crop, season, biome, localWeather, shelter, greenhouseCoverage,
});
const moistureFactor = cropMoistureFactor(crop, soil.moisture);
const fertilityFactor = 0.65 + 0.35 * (soil.fertility / 100);
const healthFactor = Math.max(0.25, soil.crop.health / 100);
const effectiveRate = clamp(
  climate.growthFactor * moistureFactor * fertilityFactor * healthFactor,
  0, 1.5,
);
soil.crop.progress += elapsedGameDays / crop.growDays * effectiveRate;
```

`crop.progress` represents fraction of the **current production cycle** (0–1). On a regrow crop, set progress 0 and `growDays = regrowDays` after harvest. Clamp at 1 and mark ready: time cannot automatically harvest extra products. Crop state must always remain finite, non-negative and bounded. Use double precision internally, consistent deterministic quantization when serializing, and tests for long accelerated intervals.

### 10.4 Concrete moisture rules

Use moisture 0–100. Starter baseline rules **per world day**, proportionally integrated across climate segments:

- Ordinary evaporation: −18/day; `dry` substrate / arid/hot biome additional −12/day; cold/humid biome can reduce evaporation by up to 10/day.
- Clear day: no free watering. Rain/monsoon: +40/day exposure-weighted. Heavy storm: +65/day, but may harm fragile outdoor plants. Fog/mist: +8/day where genuinely moist. Heatwave: additional −25/day. Coldfront: no automatic moisture gain unless resolved local snow/sleet counts as precipitation.
- Player watering action: +50 immediately, cap 100; sprinkler: +30 at dawn per covered plot if water supplies are available; greenhouse excludes external precipitation/heatwave evaporation effects, but not ordinary evaporation.
- Below 15 moisture, growth is paused and crop health declines 8/day; 15–29 is stressed slow growth; 30–79 supports normal growth; 80–100 satisfies thirsty crops but may impair dry-loving ones. Repeated waterlogging may reduce crop health/quality, never damage every crop identically.
- `weatherIntensity` and local weather modifiers may scale precipitation/evaporation within documented bounds; clamp the result, never apply precipitation to sheltered interiors merely because `globalWeather === 'rain'`.

Avoid refresh-based watering exploits: rain is a function of **elapsed game time during rainfall** or a unique phase transition, not a bonus on room entry, load or render.

### 10.5 Health and climate events

Crop health defaults to 100. Ordinary poor conditions affect growth/quality first; repeated hostile conditions cause damage. Suggested daily stress: sustained drought −8, hard frost on vulnerable crops −15, destructive weather/storm on exposed fragile plants −5–15, season mismatch after grace −12, unmanaged competing weeds −5. Greenhouse cancels ordinary seasonal/frost/weather damage when intact. Crop death at 0 produces `withered` state and requires clearing. A plant can be recoverable until dead; watering reverses drought **exposure**, not lost health magically. Optional compost or crop-care consumables can heal a capped amount, but avoid automatic full recovery per frame.

Quality accumulation records favorable days / environmental stress and care; if a plant reaches maturity during a heatwave, prior weeks of good care should still matter. Maintain an integer/fixed-point care score or exposure counters rather than sampling only the current weather at harvest.

### 10.6 Weeds are not cannabis

Unmanaged *invasive weeds* are a soil condition distinct from the **cannabis crop**. Weed pressure grows slowly in fertile, empty tilled soil and may affect crops in poor-care situations. An explicit weed-clear action reduces pressure; hoeing or harvesting should not accidentally count as cannabis possession. Use distinct identifiers, UI labels and effects. Avoid adding expensive decorative entities for every weed if a plot-level pressure value achieves the same gameplay.

### 10.7 Offscreen performance and deterministic replay

Persist plots independently of `RoomSnapshot` cache. Store `Map<roomId, Map<cellKey, FarmPlot>>` or equivalently indexed and serializable structures. Only update **rooms with plots**. Normal growth can be processed with a cached climate cursor and incremental scheduler; idle rooms need no per-frame actor simulation. Use scheduled phase boundaries/dawn updates and bounded elapsed segments. Keep processing O(number of active farm plots × number of relevant climate transitions), not O(all generated rooms × every animation frame). Establish a configurable plot cap per room (e.g., 200) and overall soft cap/performance telemetry; caps should not arbitrarily prevent a moderately large legitimate farm.

Deterministic incidents (weeds, climate damage and offscreen raids) use a stable hash seeded from world generation identity + room + crop instance ID + relevant world day/event type, not ambient global RNG consumed by rendering or unrelated AI. Keep an incident cursor or unique processed-event key to avoid double application on revisit, reload or multiple players occupying different rooms. Favor known world events/actual actor presence when attributing an offscreen theft; do **not** claim a specific NPC stole something if no simulated NPC or event exists. If abstract regional risk simulates a raid, record it explicitly as a simulated incident and show sensible evidence. Limit incident processing to one deterministic outcome per qualifying actor/window, not a random theft on every view.

---

## 11. Animals, bandits, freaks and environmental destruction

### 11.1 Threat interactions must be real

Crops are interactable world resources. They expose queries such as `getEdibleCropsNear(roomId,position,radius)`, `getStealableHarvests`, `getDestructibleFarmCells`, and `applyFarmIncident`. They do not independently teleport items out of inventory or delete random plants every time a room renders. Hostile/friendly AI chooses behaviors consistent with its existing role and world movement.

**Grazers:** A subset of creatures with `graze` or appropriate food preference may target a mature/edible crop within short perception distance, walk there using established movement rules, and consume or damage a crop when physically adjacent/on the cell. A hungry animal may prioritize an exposed lettuce plant over wandering. Animals have no right to move through an effective fence wall.

**Trampling:** Larger animals and hostile creatures have a deterministic or seeded per-contact chance of damaging vulnerable seedling/young crops; ordinary small animals may trample less often. Trampling occurs on actual entry/overlap after valid movement, not when a room is loaded. Fences, greenhouse walls and deterrents change the probability by keeping animals away. Tamed companions should not grief the owner's crops by default; explicit companion behaviors may differ later.

**Bandits:** On a farm raid or sufficiently attractive nearby harvest, a qualifying bandit actor/enemy may switch from generic wander/attack to `stealCrop` target. Select accessible, valuable, **ready** produce; pathfind to an adjacent tile, harvest into bandit loot/state or record removed goods, and attempt escape. A bandit must be defeatable/interruptible. Do not teleport harvested produce into the player's inventory or award player score. If the thief dies, stolen items may be recoverable via existing loot/drop conventions; if loot support is too narrow, use a single typed farm loot drop. A thief leaving the room should create an incident event, not silently erase inventory.

**Freak/monster behavior:** Certain hostile categories may deliberately target nearby vulnerable farm structures/crops or cause damage while chasing the snake. They do not all need complex farming strategies. Use tags/AI utility weights to add `destroyCrop` / `attackFarmStructure` actions to relevant beings. Crop damage is bounded and visually reflected. A greenhouse may lose durability under deliberate attack, revealing its plants to weather/animals if destroyed. Avoid forcing pacifist NPCs to become vandals merely because crops exist.

**Ordinary townsfolk:** Do not randomly steal from players unless consistent with actor role/reputation. Guards and town residents may react to illegal cultivation through existing law/suspicion/social event channels when crimes are observable and territory is municipal. The mayor is allowed to designate farms as in §5.

### 11.2 Protection mechanics

An effective fence must block appropriate movement in **every** relevant movement system (animals, enemies, NPC bodies and snake rules) using a unified collision query. Fences require gates or buildable paths to prevent trapping the owner. A scarecrow discourages grazing-target selection but does not magically block enemy movement. Greenhouse blocks wildlife while sealed, but can be raided; reinforcement resists damage, alarms report events, optional guards react according to existing combat AI. This makes land improvement meaningful without introducing false permanent safe zones.

### 11.3 Offscreen interactions

The active room is simulated directly; for inactive rooms, simulate only constrained **farm incidents** at deterministic windows (e.g., dawn or known raid) based on actual known presence, biome fauna likelihood, farm exposure and defenses. A richly fenced, sealed greenhouse should have very low/zero ordinary offscreen animal damage; a wild crop bed in dangerous grassland should have higher risk. It must never be strictly *safer* just because the player leaves the room. Conversely do not penalize the player every time they open the map.

On returning, the player can inspect damage and recent incidents: `1 lettuce eaten by grazing animals`, `3 peppers stolen during a bandit raid`, `2 seedlings trampled`, `greenhouse door damaged`. Events are deduplicated, timestamped in game time, and bounded to prevent a spam feed after long absences. If an offscreen incident affects a world actor, reconcile that actor's state to avoid a second contradictory live theft.

### 11.4 AI hook guidance

Prefer narrow optional callbacks/queries into existing `AnimalManager.step`, `EnemyManager.stepEnemies` and relevant actor-goal/brain utilities. Do not import `SnakeGame` into low-level animal or enemy modules and produce a dependency cycle. Inject `FarmEnvironmentView`/`FarmInteractionSink` interfaces with only needed nearby targets and validated actions. Do not update high-frequency AI with an O(all plots) scan; use per-room spatial lookup. Test animals cannot walk through placed structure walls and do not interfere with unrelated mobs.

---

## 12. Commerce, food, cooking, cannabis and reputation

### 12.1 Every crop has a use

Ordinary harvested produce can be sold at appropriate existing merchants and eaten (raw where edible) or used in at least one recipe/ingredient pathway. Better food should have meaning beyond a name: use current hunger, healing, temperature relief, disorientation recovery and existing consumable mechanics. Do not invent an incompatible second buff/status system. Raw onion/garlic or wheat can primarily be ingredients if eating them directly would not provide sensible benefits; the UI must explain their use. Crop quality should be reflected in sale prices and optionally healing/hunger output.

**Minimum content:** raw carrot/lettuce/tomato/strawberry/melon restore small hunger amounts; potato/corn/wheat benefit from cooking; pepper/ash chili provide food/temperature-aligned effects where supported; frostroot and luminous mushroom contribute to cooking/alchemy; pumpkins and mushrooms have recipes. Add at least eight coherent recipes using existing `cookRecipe`/registry patterns, for example vegetable stew, roasted potatoes, tomato soup, bread, grilled corn, berry bowl, pumpkin soup, spicy chili and mushroom stew. If a recipe needs ingredients not already available, supply them through sensible shops/harvest sources. Avoid naming a recipe that cannot actually be made.

### 12.2 Real sale transaction

Implement a generic shop sell capability or narrow farm produce sell menu using existing merchant interaction and inventory APIs. Server computes quantity, actual owned inventory, quality, merchant acceptance, reputation modifiers, and price; then **removes items and adds score atomically**. Reject negative/zero/NaN quantities, nonexistent grades, overselling, impossible client price claims and repeat commands. Return an itemized receipt. `guildAction:fence` currently grants score without consuming goods; **do not reuse or extend that exploit**. If enhancing the guild fence, fix it with inventory exchange and regression tests rather than granting constant free money.

Buy seeds from general and specialized merchants with world-day rotating stock; always maintain basic starter seed availability at some accessible merchant. Rare biome/exotic seeds can be found in the world or purchased from specialty sources. Sale price = base produce value × quality × accepted vendor modifier × documented market condition (bounded; e.g., 0.75–1.3). The player must generally profit from well-run farms, but profits require watering/care/time and seed investment. Protect against infinite buy-sell loops and cycling shops by rest/day advancement. Store or derive daily local demand deterministically from existing world day/town stock key if adding market variation.

### 12.3 Cannabis / contraband crop

Cannabis is a **fictional in-game contraband crop** alongside the ordinary crop catalog. The player grows it using normal soil/water/time, subject to summer/autumn outdoors or any season under greenhouse cover. It produces `cannabis-bud` and optionally a limited seed return. Normal law-abiding merchants refuse it; black-market merchants and a genuinely inventory-consuming thieves' guild fence accept it. Price premium is compensated by slow growth, expensive seeds, detection risk and limited buyers. This is a video-game economic/law mechanic, not a real-world cultivation guide.

Existing town suspicion, wanted level, guard roles, social/world events and guild affiliations should mediate consequences. An observed illegal farm in town or a suspicious transaction may cause law/suspicion changes, not an omniscient punishment while nobody is present. In wilderness, mere cultivation is not automatically detected by every distant town. Guarded municipal property and public exposure increase risk; concealed greenhouse farming reduces detection opportunities but does not mean permanent immunity. Mayoral authority to use public ground is **not** a legal exemption for contraband; the mayor could still face scandal/guard reactions where existing civic systems allow. A drug-dealer quest/trading storyline is welcome if implemented through existing actors/guild quest architecture, but do not ship a menu labeled "sell weed" that simply gives score without consuming produce.

For consumables, cannabis may optionally be processed into a fictional edible or other item with a bounded in-game effect plus a drawback, using existing hunger/disorientation/status APIs; no new stealth mechanic should be claimed unless the game genuinely implements one. Keep its economic role complete even if consumption is not the centerpiece.

### 12.4 Prevent abuse

A sale requires actual items. A harvest requires `ready` state and cannot be repeated. A shop cannot buy a crop item at a price higher than its own identical sell price without an explicit finite demand limit. Repeated client commands, reconnect/replay and rapid clicking must not create money. Inventory and score changes are transactional and tied to authoritative player context. Test seeds/crops from other players' inventories cannot be consumed, and remote clients cannot sell crops they don't own.

---

## 13. Proposed architecture and TypeScript domain contracts

These are **illustrative design shapes**, to adapt after inspecting actual code. Avoid duplicating existing `RoomClaim`, `PlacedStructure`, `PlayerId`, `Vector2Like`, `Season`, `BiomeId`, `Item` or atmosphere types.

### 13.1 Modules

```text
src/farming/
  cropCatalog.ts          // data definitions, seasons, crop item IDs, quality
  farmingTypes.ts         // serializable plot and incident types
  farmingState.ts         // world-owned indexed farm state, load/save
  soilResolver.ts         // tillability, substrate, protected cells
  farmingRules.ts         // pure legality, growth, care, harvest calculation
  farmingClimate.ts       // adapters for existing atmosphere/biome/shelter
  farmingSimulation.ts    // authoritative deterministic time advancement
  farmingIncidents.ts     // animal/hostile and offscreen incident reconciliation
  farmingEconomy.ts       // sale values, seed sourcing, crop pricing
  farming.test.ts         // pure rules/regression tests (others as needed)

src/territory/
  territoryRules.ts       // pure claim legality, jurisdiction, room eligibility
  territoryActions.ts     // authoritative paid claim + permissions

Existing modules to adapt:
  src/building/constructionState.ts
  src/building/structureBlueprint.ts
  src/game/snakeGame.ts
  src/game/saveTypes.ts
  src/session/SceneActionCommand.ts
  src/session/SceneGameplayActions.ts
  src/session/AuthoritativeGameSession.ts
  src/session/GameSnapshot.ts + client read/replica state
  src/world/atmosphereSystem.ts + local resolution integration
  src/world/types.ts, room cache/projections as appropriate
  src/inventory/*, src/shops/*, cooking/use item paths
  src/animals/animalManager.ts, src/systems/enemies.ts, actor AI
  src/scenes/snakeScene.ts, src/ui/snakeRenderer.ts, minimapRenderer.ts
```

You may consolidate these proposed files if existing patterns make a smaller set cleaner. The key is **dependency direction**: catalog/pure rules depend on primitive domain types; the session/game orchestrates authority; UI and actor movement consume narrow interfaces. Keep heavy domain behavior out of the giant scene and avoid a new `FarmingManager` that directly imports every system.

### 13.2 Core types

```ts
type FarmCellKey = string; // `${x},${y}` within room; validate integers/bounds

type CropStage =
  | 'seeded' | 'sprout' | 'young' | 'mature' | 'ready' | 'withered';
type CropQuality = 'normal' | 'good' | 'excellent';
type SoilSubstrate = 'loam' | 'rich' | 'dry' | 'ash' | 'poor' | 'artificial';

interface CropInstance {
  instanceId: string;         // unique in world; never reused after harvest
  cropId: string;             // must exist in crop catalog
  plantedBy: PlayerId;       // provenance, not ownership
  plantedAtGameTime: number; // authoritative elapsed world time, not Date.now()
  stage: CropStage;
  progress: number;          // 0..1 of current first/regrow cycle
  regrowCount: number;
  health: number;            // 0..100
  careScore: number;         // bounded/fixed-point aggregate
  unsuitableDays: number;
  lastProcessedGameTime: number;
}

interface FarmCell {
  x: number;
  y: number;
  substrate: SoilSubstrate;
  moisture: number;          // 0..100
  fertility: number;         // 0..100
  weedPressure: number;      // 0..100
  crop?: CropInstance;
  revision: number;          // for snapshot invalidation
}

interface FarmIncident {
  id: string;                 // stable deduplication key
  roomId: string;
  x: number;
  y: number;
  worldDay: number;
  kind: 'eaten' | 'trampled' | 'stolen' | 'destroyed' |
        'frost' | 'drought' | 'storm' | 'withered' | 'structure-damaged';
  actorId?: string;          // only when there is a real attributable actor
  cropId?: string;
  quantity?: number;
  summary: string;
}

interface FarmingSaveData {
  schemaVersion: number;
  clock: FarmingClockState;
  rooms: Array<{ roomId: string; cells: FarmCell[]; revision: number }>;
  recentIncidents: FarmIncident[];
  nextCropInstanceNumber: number;
}
```

Do not serialize Maps or classes directly into JSON without a defined conversion. Bound/validate all loaded values, reject malformed coordinates and unknown crops gracefully, and ensure schema migrations are idempotent. Empty rooms should be pruned from farm storage when no tilled cells exist. Keep one source of truth for greenhouse coverage: actual placed structure ID and rotated footprint, not a duplicated list of climate cells copied into every plot. House greenhouse beds may use one stable synthetic coverage ID.

### 13.3 Crop definition shape

```ts
interface CropDefinition {
  id: string;
  label: string;
  seedItemId: string;
  produceItemId: string;
  outdoorSeasons: readonly Season[];
  growDays: number;
  regrowDays?: number;
  yieldMin: number;
  yieldMax: number;
  baseSaleScore: number;
  preferredBiomeTags?: readonly string[];
  preferredBiomeIds?: readonly BiomeId[];
  moistureIdealMin: number;
  moistureIdealMax: number;
  droughtTolerance: number;
  frostTolerance: number;
  soilAffinity?: Partial<Record<SoilSubstrate, number>>;
  shelteredAllowed: boolean;
  legalClass: 'ordinary' | 'contraband';
  seedRecoverMin?: number;
  seedRecoverMax?: number;
  visualStyle: string;
}
```

### 13.4 Single legality resolver

Provide a pure/low-side-effect function that returns actionable failure detail:

```ts
interface LandUseVerdict {
  allowed: boolean;
  reason?:
    | 'protected' | 'town-permission' | 'foreign-claim'
    | 'unsuitable-ground' | 'structure' | 'occupied'
    | 'unavailable-season' | 'missing-tool' | 'missing-seed';
  ownerId?: PlayerId;
  jurisdiction?: 'wilderness' | 'claimed' | 'town' | 'village' | 'special';
}

// A single cell is judged against actual room, claims, civic status, structures
// and validated player context; it does not directly mutate game state.
function evaluateFarmAction(context: FarmActionContext): LandUseVerdict;
```

Do not accept player-supplied `ownerId` as truth. The authority derives it from `command.playerId` and current session. Share jurisdiction tests with paid claiming and construction wherever possible, but do not couple **free wilderness tilling** to existing `ConstructionState.can('build')` (which requires a claim).

---

## 14. Authoritative commands, security, snapshots and multiplayer

### 14.1 Command contract

Extend `SceneActionCommand` and its discriminator guard with specific, serializable **intent** commands. Suggested union:

```ts
type AgricultureIntent =
  | { type: 'farmingAction'; action: 'till'; target?: { dx: number; dy: number } }
  | { type: 'farmingAction'; action: 'plant'; seedItemId: string; target?: { dx: number; dy: number } }
  | { type: 'farmingAction'; action: 'water' | 'harvest' | 'clear' | 'weed' | 'inspect';
      target?: { dx: number; dy: number } }
  | { type: 'farmingAction'; action: 'compost'; itemId: string;
      target?: { dx: number; dy: number } }
  | { type: 'farmingAction'; action: 'refillCan' }
  | { type: 'territoryAction'; action: 'claimCurrentRoom' | 'releaseCurrentRoom' }
  | { type: 'territoryAction'; action: 'grant' | 'revoke';
      granteePlayerId: PlayerId; permission: 'build' | 'demolish' | 'farm' | 'harvest' }
  | { type: 'territoryAction'; action: 'designateMunicipalFarm';
      target?: { dx: number; dy: number } }
  | { type: 'farmSellAction'; merchantActorId: string;
      itemId: string; count: number };
```

Each actual command will include the existing authenticated `playerId` wrapper. The sender **must not** set `roomId`, absolute position, crop progress, sale value, product yield, owner, greenhouse effect, claim price, weather, RNG result or inventory balance. Resolve the target from the authoritative snake head + bounded relative offset; reject non-integer/out-of-range offsets, stale room transitions and requests made while dead/out of interaction distance. Revalidate world ownership and item counts at commit time even if the UI preview was valid.

### 14.2 Transaction semantics

A successful action is a single authoritative state transition:

- **Till:** verify permission/tool/soil → create farm cell once.
- **Plant:** verify seed exists, empty tilled cell, season, access → consume exactly one seed → attach crop state.
- **Water:** verify can charge and valid plot → consume one charge → modify moisture once.
- **Harvest:** verify ready/access/known output → determine yield/quality once → remove or reset crop → add items once.
- **Claim:** verify owner/room/threats/score → charge once → install claim once.
- **Build greenhouse:** verify blueprint, owned/authorized location, no crop conflict, cost → deduct score once → place structure once.
- **Sell:** verify merchant proximity/open status/acceptance/item/count → remove exact quantity → credit exact score once.

Every failure is side-effect-free; optionally return stable reason code and user-friendly text. A duplicated command due to retries cannot generate two harvests, two purchases, two score credits or multiple claims. Prefer existing session command IDs/ordering if available; otherwise use state/revision guards and an explicit per-player action nonce for economy-critical operations. Never assume UI buttons are security boundaries.

### 14.3 Snapshot model

Replicate **only relevant farm rooms** to a client: current room and small adjacent/visible neighborhood, plus aggregate status for owned distant farms if a remote journal/map shows them. Include `FarmingRoomView` (cell states, crop display IDs/stages, moisture, revision), `ClaimRoomView` (owner/permissions/revision), and placement/greenhouse coverage. Avoid replicating the entire world's farm collection to each client every 250 ms.

Snapshots should obey the existing `GameSnapshot`, `SceneClientState` and `SceneReadReplica` patterns. The client renders a read-only projection and sends intents. On reconciliation, the server snapshot replaces optimistic state. A newly connected client must see crops planted by another player; a remote player must not be able to harvest another's claimed crop by forging an action. A second player visiting a different room must not cause the world climate clock or crop growth to tick twice.

### 14.4 Multiplayer ownership cases

- A claims wilderness room; B cannot claim it, cultivate new land or harvest there without appropriate ACL.
- A can explicitly grant B `farm` but not `harvest`; B can plant/water but cannot harvest until granted that right.
- Two players try to harvest the same mature crop in the same authoritative tick: exactly **one** transaction succeeds and exactly one set of items is awarded.
- A plants in unclaimed wilderness; B may harvest because land is public. Claiming afterward grants prospectively enforced rights without changing planted provenance or duplicating crop state.
- A is mayor of Town X; B, though mayor of Town Y, does not gain Town X powers.
- The last client leaves the room, then returns: crop progress is based on global world time, not number of watching clients.
- Save/load/reconnect retains ACL and stable greenhouse references.

### 14.5 World events / achievements

Emit bounded, meaningful typed events through `SnakeGame.emitWorldEvent` where suitable: `farm-claimed`, `crop-planted`, `crop-harvested`, `crop-stolen`, `farm-raided`, `greenhouse-destroyed`, `municipal-garden-designated`, `contraband-sale`. High-frequency watering/tilling must not flood global rumor systems; set appropriate severity/loudness and use aggregation. Existing achievements can later hook into events such as first crop, first greenhouse, every-season harvest, major crop raid, or criminal sale without farming explicitly importing achievement UI.

---

## 15. Persistence, migration, cache eviction and legacy compatibility

### 15.1 Canonical saves

Add optional `farming?: FarmingSaveData` to `GameSaveData`, and explicitly serialize/deserialize the state in `SnakeGame.getSaveData()` / `loadFromData()` (or the authoritative game-save service if code has since moved). Persist soil, crop stages, moisture, care, health, quality determinants, crop IDs, greenhouse references where necessary, last processed world time, incidents/cursors and claim access controls. Existing `construction?: ConstructionSaveData` remains the canonical source for claims and structures. If structure costs/durability are new, persist that on structures via a backwards-compatible optional field.

Do not bury farm state solely in player flags or `RoomSnapshot` objects that may be evicted or regenerated. `roomSnapshotCache.ts` may archive hundreds of rooms, but authoritative farm data should exist independently with only transient room projections. On load, hydrate world generation identity and atmosphere before resolving crop biome/clock and greenhouse structure references. Loaded farm records referencing missing structure IDs become safely uncovered outdoor plots or intentionally migrated house beds rather than crashing.

### 15.2 Migration of the old house garden

The current house purchase called `garden` stores purchase/growth/ready flags and changes house layout tiles (`D`/`R`). Audit which `house.*` flags/layout changes are included in persisted saves: the existing `getSaveData()` has an explicit flag whitelist and may omit these; **write a regression test rather than asserting a migration can always recover missing data**. For saved legacy gardens that *are* recoverable:

1. Detect purchase once (old purchase flag or explicit old save metadata).
2. Mark house Greenhouse Annex as purchased, free of extra charge.
3. Install stable house grow beds on equivalent logical cells, reconcile the existing special tiles without damaging other house furniture.
4. Preserve readiness equivalently: a `ready` legacy garden becomes a valid mature starter crop or one-time unclaimed pending harvest, not a vanished reward. Convert partial progress proportionally when possible.
5. Ensure repeating load/migration never yields more than one crop/reward or purchases a duplicate greenhouse.
6. Redirect old house garden UI/interaction to the new agriculture actions. Remove the old 45s incremental tick **only after** state migration and behavior parity tests pass. Otherwise it can double-grow a house crop.
7. Handle brand-new saves, old saves without garden, malformed legacy flags, and old saves with garden but unavailable room state.

### 15.3 Old claims and blueprints

Existing construction claims have no acquisition cost. Preserve their owners when loading, do not retroactively charge, and augment permission defaults so owner retains rights. Do not reinterpret another player's old claim as ours. Existing old structure blueprints must remain valid. If extending `StructureBlueprint`/`PlacedStructure` metadata for greenhouses, provide defaults on load and ensure plan regeneration remains deterministic. A `claimRoom()` function must no longer permit overwrite by conflicting owner except through an explicit authorized administrative/migration path.

### 15.4 Reset, old builds and cross-version saves

A world reset removes farms, pending incidents, claim records and greenhouse structures consistently with existing new-game rules; it must not retain ghost plot overlays. Import of old saves with absent `farming` starts empty and valid. New saves opened by older clients may naturally be unsupported; do not silently corrupt. Use explicit schema versioning and guarded parsing. Never serialize floating NaN/Infinity or unbounded invalid array sizes. Test round-trip JSON rather than only in-memory saves.

---

## 16. Rendering, frame rate and performance requirements

Given the project's recent FPS variability concerns, agriculture must not become another full-screen redraw or frame-dependent sim.

1. **No per-frame crop simulation**: all growth on authoritative environment time/phase changes; no client sprite `update()` that mutates growth.
2. **No full-world iteration**: active room/nearby cells for rendering; active farm index and climate event cursors for simulation.
3. **Dirty regions:** when a single crop grows a stage, water is applied or a structure is placed, invalidate only relevant dynamic layer/room revision. Don't force every static room tile to redraw merely to update a vegetable.
4. **Pooled/simple visuals:** reuse rendering primitives/sprites/textures; avoid new Phaser objects per plot per frame and dispose on room change.
5. **Collision index:** cache occupied structure/fence cells by room; current `getStructureAt()` and `effectiveCell()` scan structure lists. Hot AI path queries must not repeatedly perform whole-list scans.
6. **Bounded UI:** no giant allocations from all crop/tool inventory on every input frame, no invisible panels polling global state.
7. **Bounded incidents:** aggregate and cap history (e.g., last 100 notable incidents across farm system) and prune ancient entries; preserve enough for reports.
8. **Large farm test:** at least 1,000 plots distributed over 20 rooms, including 200 in one active room, must remain performant without an unexpected per-frame scan. Establish measurable CPU/alloc baseline and report before/after in dev tooling. This is a diagnostic target, not a promise of a specific machine's FPS.
9. **Reload equivalence:** a crop's actual maturity after identical world-time simulation must not differ depending on browser reload, foreground/background, screen refresh rate, local vs connected session, or number of visible rooms.
10. **No explosive spawn:** farm plots are not new generic spawn points for enemies and NPCs. Animal attraction occurs within existing population and explicit bounded raid events.

---

## 17. Test plan — mandatory, with explicit expected outcomes

The following test cases should be implemented as appropriate unit, property-based, integration and scripted end-to-end tests. Prefer deterministic fake world clocks, fixed world seeds, test fixtures and authoritative local sessions. When a test requires Phaser/browser, use the project's established integration/browser harness instead of mocking away the behavior under test.

### A. Soil, terrain and action legality

1. Hoe on open grass/natural soil in **unclaimed** wilderness succeeds without any score deduction or claim creation.
2. Plant consumes exactly one seed and creates exactly one crop. Watering/harvesting work without a claim.
3. Hoe with no owned tool fails without modifying room, score or inventory.
4. Hoe on a solid wall, water, road, building door, landmark, protected tree, dungeon entrance or station fails with precise reason; no terrain damage.
5. Hoe at an ordinary visual grass decoration clears only the allowed small decoration, not nearby vegetation.
6. Hoe twice on an already tilled empty cell yields one plot, not two.
7. Plant on untilled floor fails; plant on occupied plot fails; both retain seed.
8. Clear a living crop requires explicit action and does not award produce; clearing dead crop leaves soil and is safe.
9. Invalid cell coordinates, fractional/NaN offsets and remote room targets fail.
10. Same action at a room boundary resolves to the proper current authoritative room/cell, with no accidental neighbor mutation.
11. Tilling and watering never invoke snake movement or advance snake position.
12. Changing character modes, UI overlays or Minecraft mode does not cause unintended cross-mode farming mutations.

### B. Season, weather, biome and growth

13. Baseline radish under adequate care matures after its defined fraction of a game day, no earlier.
14. A 1.5-day carrot/potato/wheat result is identical under different legal environment delta chunking.
15. Rain adds moisture to exposed crops but not sealed greenhouse beds.
16. Heatwave evaporates more moisture outdoors than inside climate-controlled coverage.
17. Local snow/fallout/ash weather uses resolved biome effects rather than treating any global rain as ordinary rain.
18. Ideal outdoor biome/season produces faster growth than greenhouse baseline where crop data specifies a bonus.
19. A greenhouse crop planted during a normally illegal season grows normally at neutral baseline.
20. An outdoor crop planted in an illegal season is rejected before consuming seed.
21. A crop crossing a season boundary receives grace/stress logic exactly once; no instant deletion, no missing time.
22. Inadequate moisture slows/stops growth; watering resumes it. Dead crop cannot resurrect merely from water.
23. Rain entering/exiting a weather phase applies only for actual elapsed rainy portion, including fast-forward.
24. Soil fertility impacts growth/quality, compost caps at 100, repeated harvest depletes fertility, and fallow recovers slowly.
25. Greenhouse immunity ends if the roof/structure is destroyed; the plant remains in the world.
26. Ready plant waits indefinitely for player harvest subject only to documented freshness/wither rules; it never auto-farms to inventory.
27. Regrow crop provides a harvest, returns to grow stage, waits correct regrow interval; no seed consumed on regrow.
28. Quality grade is stable under save/reload, alternate render FPS and action retries.
29. A greenhouse does not make specialty soil/light impossible requirements disappear unless catalog explicitly says so.
30. All 21 catalog crop definitions pass registry/item/season/price/data validation.

### C. Territory / authorization / mayor

31. Claiming eligible empty wilderness deducts exact server price and establishes one owner.
32. A second claim by same owner is no-charge/idempotent; another player cannot replace owner.
33. Claim during hostile enemy, hostile actor, boss or active raid presence fails with no cost, even if UI preview earlier said clear.
34. Peaceful animals do not block claim acquisition; a normal future raid still can occur after claiming.
35. Claim in a town, town perimeter, village, protected house or special interior fails without deducting score.
36. Claim with insufficient score fails atomically; number-of-claims price increment matches configured schedule.
37. Old existing claims load with same owner and no retroactive charge.
38. A foreign claim blocks farm/harvest/build unless respective ACL grants it. A permission to farm does **not** imply permission to harvest.
39. On unclaimed wilderness, a second player can harvest an exposed ripe crop.
40. Player mayor of Town A can cultivate eligible public soil in Town A; nonmayor cannot. Town B mayor gets no Town A permission.
41. The town's roads, public buildings, permanent facilities and protected landmarks remain invalid even for its mayor.
42. Mayoral resignation/election transition does not delete crops; new actions follow latest office and designated community permissions.
43. Claim release preserves/cleans up crops/structures according to documented rules, with no refund exploit.
44. Permissions and claim boundaries are correctly displayed after join/reconnect and are enforced on server even if client view is stale.

### D. Structures, greenhouse and movement

45. Greenhouse placement requires owned or explicitly authorized land, valid footprint, correct price and successful confirmation; preview costs nothing.
46. Successful greenhouse confirmation charges exactly once; retry/reconnect cannot duplicate charge or structure.
47. Rotation rotates both drawn structure and its climate/grow-bed coverage identically.
48. Greenhouse cannot stamp on portal, protected NPC, player, active crop, special building or outside room.
49. Greenhouse grow beds are physically accessible to snake; door does not trap player.
50. An animal cannot path through a solid player-placed fence; enemy and NPC movement obey effective collision as intended.
51. Scarecrow changes grazer targeting in range without stopping every animal globally.
52. Sprinkler waters exactly its covered cells once per scheduled interval and cannot fire infinite times when room is reopened.
53. Damage/destruction of greenhouse and fences modifies protection/collision and remains correct after load.
54. House annex retains two legacy grow beds and does not overwrite couch, bed, other furniture or house entrances.

### E. AI, world events and farm damage

55. An actual grazing animal reaches a valid unprotected crop and eats/damages it once; crop visibly changes.
56. Large-animal trample can damage a seedling on contact, never merely due to screen refresh.
57. Bandit with accessible ready produce targets, steals and departs or can be interrupted; player gets no free produce from theft.
58. A defeated thief's recoverable loot follows existing loot logic without duplicating stolen crops.
59. Hostile/freak destruction occurs only with valid targeting/contact or explicitly supported attack range.
60. Fence, intact greenhouse and appropriate defense reduce real animal incidents; ownership alone does not.
61. Leaving a farm for multiple days produces deterministic bounded incidents that do not reoccur when revisiting/loading.
62. If no qualifying actor/raid is known, incident attribution does not falsely name a specific thief.
63. Multiple clients do not process the same offscreen incident twice.
64. World event/rumor systems do not get spammed by every crop tick or watering input.

### F. Inventory, commerce, food and contraband

65. Harvest changes crop to absent/regrowing and grants exactly one authoritative item batch with quality.
66. Two simultaneous harvest requests award produce to only one player.
67. Seeds exist in shops, are purchased with correct cost, and one seed is consumed per successful plant.
68. Every ordinary crop can be sold through at least one vendor; every sale consumes exact inventory count and awards calculated score.
69. Selling a nonexistent item, wrong merchant, illegal produce to ordinary merchant, negative quantity or duplicated sale fails with no score gain.
70. Cannabis can be harvested and sold through a legitimate black-market inventory-consuming transaction; ordinary merchant refuses.
71. Illegal activity creates law/reputation events only under explicit awareness/observation conditions.
72. Crop quality survives inventory stacking, save/load and sale; excellent crops pay configured premium.
73. Raw-food and at least eight recipe paths work and apply existing hunger/health/effect mechanics, without unregistered items.
74. Repeated buy/sell loops and guild fence action cannot mint score without consuming inventory.

### G. Save, authority, lifecycle, FPS

75. Save/load round trip preserves all soil/crops/claims/greenhouses/ACL/incidents/time cursors.
76. Crop at offscreen room survives room-cache eviction and re-generation of visual snapshot.
77. A garden-purchased old save migrates once without charging twice or losing current harvest; old no-garden save remains valid.
78. Loading missing/invalid/older farming data is safe; no NaN, duplicate crop or crash.
79. A world reset clears farm/territory state; normal player death does not erase property unexpectedly.
80. Inn rest until dawn advances crop growth through each crossed weather/day phase exactly once.
81. 30/60/120/144+ FPS and browser refresh produce equivalent crop outcomes for equivalent authoritative elapsed time.
82. Authoritative local session and connected client projection converge; client edits cannot create crops, wealth or land.
83. Performance test with 1,000 plots across 20 rooms and active 200-cell farm shows no per-frame global scan/regression; report measured data.
84. `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` (or current project equivalents) pass, except explicitly documented unrelated baseline failures.

### 17.1 Fuzz/property-based checks

For random action sequences, these invariants always hold: moisture/fertility/health 0–100; progress finite and 0–1; item and score quantities non-negative under ordinary business rules; at most one crop per room/cell; no overlapping claims for a room; farm location valid and not out of bounds; nonowners never gain extra rights; successful harvest/sale count equals removed state/items; no repeat command increases total conserved resources twice; no save/load creates duplicate instances; incidents cannot process the same stable key twice. Run seeded fuzz tests for malformed saves and long multi-season time advancement, including several harvest/regrow cycles.

---

## 18. User-facing walkthroughs to use as acceptance demonstrations

**Scenario 1 — The penniless gardener:** Start with no claim. Obtain hoe and radish seeds, travel to legal wilderness grass, till two cells, plant, water, leave to explore a different room, return after enough world time and harvest radishes. Eat one, sell one. No deed was ever required. UI explains what happened and map shows farm presence.

**Scenario 2 — The property investor:** Earn 40 score, find empty wilderness, clear hostile enemies, purchase the room claim. The map marks it owned. A second player cannot plant there until invited. Place a greenhouse with sufficient score; grow an off-season tomato. Rain waters outdoor radishes but does not water the tomato inside. Indoor tomato survives coldfront, while ideal summer peppers outside still have faster growth.

**Scenario 3 — The very unfortunate farmer:** Plant exposed lettuce. A grazing animal enters and eats a ripe plant; another large animal may trample a seedling. After a fence and scarecrow are installed, incidents become rarer for physical reasons. A bandit nevertheless attacks, steals ripe produce and attempts escape. The player may fight or pursue, and an event explains the loss. Property ownership did not magically make the field safe.

**Scenario 4 — Political agriculture:** Enter Town A where another NPC is mayor. The hoe refuses to till public municipal grass. Win Town A's election; farm an eligible patch, while main streets remain protected. Designate a community bed for public use. Visit Town B: Town A authority does not apply. When electoral control changes, existing plants persist and new access checks reflect the new administration.

**Scenario 5 — The criminal farmer:** Obtain expensive cannabis seeds from a criminal contact, grow them on remote wilderness soil or under greenhouse shelter, harvest physical produce, travel to a real black-market buyer, trade actual inventory for score and observe appropriate witnessed/unwitnessed crime consequences. No invented free-money `fence` action.

**Scenario 6 — Time and technology:** Plant five crops with known conditions. Save, refresh browser, replay same amount of authoritative world time at different FPS, sleep at an inn, travel until the room cache evicts the original map, reconnect a second client, return to find all farm states consistent and no extra harvests.

---

## 19. Implementation sequence (full scope, milestone-by-milestone)

**Milestone 0 — Characterize and protect old behavior.** Inspect `AGENTS.md`, construction/house/Minecraft/atmosphere/session/save/actor subsystems; add regression tests for old garden purchase, old claim behavior, persistence and session timing. Record baseline test/typecheck/lint/build and whether existing FPS bottlenecks are present. Choose canonical ownership and world-clock integration points.

**Milestone 1 — Farm state and free cultivation.** Add catalog and normalized farm state; soil legality resolver; normal items for hoe, watering, seeds, crops; authoritative `till`, `plant`, `water`, `inspect`, `clear`, `harvest` intents and simple render/UI. Implement at-the-head/adjacent targeting without movement. Confirm free wild farming, saved offscreen plots, and no accidental scene-local authority.

**Milestone 2 — World time / weather / seasons / full catalog.** Add climate timeline/phase transitions, biome and shelter adapters, fertility/moisture/quality/health/regrowth, complete 21-crop definitions, rain/storm/heatwave/frost and greenhouse-neutral calculations. Test long fast-forward and rest/day-boundary crossings. Do not mark complete until non-active rooms grow correctly.

**Milestone 3 — Territory security and map.** Harden `ConstructionState.claimRoom`; add atomic price transaction, room/jurisdiction/threat guards, ACL and legacy claim compatibility. Add minimap borders, territory UI, claim/release/permissions. Test multiplayer ownership, no negative score, no hostile takeover and mayor identity.

**Milestone 4 — Actual greenhouse/construction improvements.** Add annex migration plus wilderness blueprint and greenhouse coverage; durable cost confirmation, rotation/collision, indoor beds, watering/rain separation, structure durability or safe destruction semantics, fences/gates and effective collision query. Do not ship fake protection that AI walks through.

**Milestone 5 — Animals, monsters, bandits and offscreen incidents.** Add narrow farm AI queries, grazing/trampling, hostile theft and deliberate destruction, incident ledger and deterministic offscreen resolution. Add scarecrow/alarm/defense effects and avoid duplicated incidents. Test with active and inactive rooms, including physically fenced layouts.

**Milestone 6 — Town politics and legal permissions.** Integrate multi-room town jurisdiction, true per-player mayor identity, eligible municipal farming, protected landmarks and community-garden permission. Preserve municipal crops through elections. Test towns, perimeters and village restrictions.

**Milestone 7 — Commerce, cooking and crime.** Register crops/seeds/produce quality; full buy and *actual sell* transactions; at least eight recipes; ordinary food buffs; black-market cannabis and witnessed law consequences; correct or isolate exploitable fence rewards. Verify all catalog items have working gameplay uses/sources.

**Milestone 8 — Persistence and multiplayer hardening.** Finish explicit `GameSaveData.farming`, legacy house garden migration, crop/structure references, room cache handling, snapshot projections, disconnect/reconnect and second-player races. Add error handling for old/corrupt saves, world reset, duplicate/out-of-order commands.

**Milestone 9 — Polish, regression and performance.** Final UX/tooltip/journal/map, actionable failure messages, visual crop stages, balancing, deterministic high-load farm test, full test suite, typecheck, lint, build, and regression check of construction/Minecraft/house/day-night systems. Produce implementation report with changed files, tests, known limitations and balance tuning points. The feature is not delivered until the end-to-end scenarios in §18 work.

These milestones can be parallelized across specialized agents when repo coordination permits; define ownership boundaries to avoid editing the same giant files concurrently. **No milestone may substitute a mock or placeholder for an advertised feature.** Prefer small merging units that pass tests while marching toward this full spec. If time/tool budgets prevent total completion in one run, make real coherent progress and explicitly identify incomplete pieces rather than calling the architecture complete.

---

## 20. Definition of done / acceptance gate

All of these must be true:

- [ ] Free, tool-gated tilling/planting on suitable unclaimed wilderness (no purchased plot required).
- [ ] Enforced land legality across wilderness, foreign claims, towns, mayor identity, villages and protected cells.
- [ ] Robust one-room paid claim, score deducted only on successful first purchase, no hostile takeover, map visibly marked.
- [ ] Claimed-land access control for building, farming and harvesting; multiplayer identity enforced.
- [ ] Greenhouse purchasable on valid claimed/municipal land, with stable neutral all-season climate, no auto-rain and real protection.
- [ ] Existing purchased home garden migrated into new greenhouse beds without double-charging or arbitrary loss.
- [ ] Complete 21-crop catalog, all growth stages/seed/produce registrations, proper seasonal and biome behavior.
- [ ] Crop moisture, fertility, quality, regrowth, health, watering, compost, weeds, withering and ordinary weather effects.
- [ ] Authoritative offscreen growth across all environments, day phases, inn rest, room-cache eviction and save/load.
- [ ] Animal grazing and trampling, bandit crop theft and hostile destruction with real AI interactions and bounded incident reporting.
- [ ] Fences, doors/scarecrows/alarms/sprinklers actually affect simulation/AI as advertised.
- [ ] Useful consumption/cooking paths and inventory-consuming sale transactions for ordinary crops.
- [ ] Cannabis crop, obtainable seeds, harvest, black-market sale, meaningful detection/legal distinctions, no free-money exploit.
- [ ] Farming controls are understandable, stationary, context-sensitive; map/journal/inspect tools provide useful information.
- [ ] Farm state/ownership/structure coverage work with multiple players, snapshots and authoritative command races.
- [ ] Existing construction, Minecraft mode, house, world movement, weather, NPCs and legacy saves remain functional.
- [ ] Deterministic replay/refresh/FPS equivalence and target performance tests pass.
- [ ] Tests, typecheck, lint and build pass or precise failures are transparently reported.

**Hard stops for acceptance:** A crop that only grows while on-screen; a purchased plot prerequisite; a greenhouse that is the fastest climate in every biome; a client-authorized harvest; paid claims that can overwrite other players; NPCs walking through fences that allegedly protect farms; black-market sales that never consume goods; lost farms after reload; or a feature that is merely menus and placeholder data.

---

## 21. Handoff prompt for a coding AI

Copy this exact brief along with the document (or provide the entire Markdown file as the agent's task context):

> **Implement the attached “Agriculture, Territory & Greenhouse Systems” design specification in `Sterfry42/snake-for-the-modern-gamer`. This is a full feature, not a prototype. Follow `AGENTS.md`, inspect the latest source and tests first, and use the existing authoritative session, construction claims, inventory, atmosphere, town civic, animal/enemy AI, renderer, save and multiplayer architecture. The critical product decisions are: wild farming requires no purchased plot; the hoe tills suitable legal terrain; a paid claim owns one room and is visible on the map; town permission depends on the actual player's mayoral office; the greenhouse is a purchased neutral-climate structure; crops keep growing offscreen; weather/biomes/seasons matter; creatures can eat/trample/steal/destroy; all harvested produce can be consumed/processed or sold; cannabis has a functional black-market economy. Work in tested vertical slices but continue until every definition-of-done item is implemented. Do not replace the spec with a simple demonstration. Provide an exact final implementation and validation report, and disclose any incomplete requirements.**

### Source references to inspect before coding

- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/game/snakeGame.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/building/constructionState.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/building/structureBlueprint.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/session/SceneActionCommand.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/session/SceneGameplayActions.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/session/AuthoritativeGameSession.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/world/atmosphereSystem.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/world/atmosphereTypes.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/world/biomes.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/world/safeZones.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/civic/civicService.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/animals/animalManager.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/systems/enemies.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/minecraft/farming.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/minecraft/save.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/game/saveTypes.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/ui/minimapRenderer.ts>
- <https://github.com/Sterfry42/snake-for-the-modern-gamer/blob/main/src/scenes/snakeScene.ts>

**End of spec.**
