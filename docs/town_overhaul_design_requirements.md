<!--
Generated design document for Snake for the Modern Gamer town overhaul.
This file is intentionally long and implementation-ready.
-->
# Town Overhaul Design Requirements
Status: design + implementation requirements + regression plan
Repository: `Sterfry42/snake-for-the-modern-gamer`
Primary goal: replace the current sprawling 8-room town footprint with a compact 2x2 town core and 4x4 town influence footprint while preserving every current town function.
Secondary goal: promote town interiors from a special-case thieves guild implementation into a general town-building/interior system.
Non-goal: removing existing town economy, law, guild, resident, shop, UI, music, or generation behaviors.
> The practical design sentence: towns should feel like a small walled city, not a chain of eight self-contained rooms.
> The implementation sentence: keep the current exported town API alive, rewrite the town footprint/rendering/interior layer beneath it, and add regression coverage before deleting any compatibility alias.
## 0. Source Snapshot Read For This Design
The design below is grounded in the current repository files and observed behavior from the latest fetched default branch content.
| File | Fetched SHA | Why it matters |
| --- | --- | --- |
| `package.json` | `487619daabef09e7bae380f7b260e73432a4a538` | scripts for build, typecheck, test, world-generation test |
| `src/world/town.ts` | `0cacc817cafb56698e2b9662a2918dd2a9379338` | town model, town rooms, laws, residents, crime, physical district rendering, perimeter helpers |
| `src/world/generation/townStructureResolver.ts` | `f51c383210a73a81192c18351973458b28938130` | human town placement, footprint rotation, entrance/exit approach, adjacency classification |
| `src/world/generation/multiRoomStructures.ts` | `9820f056d046278cdaacc1e2af24ac352d86ff33` | multi-room structure placement and town membership types |
| `src/world/generation/stages/structureOperations.ts` | `4eb4883270ad07394eae29c73f2ee3e2ff19da82` | world generation stage that renders town districts and town perimeter walls |
| `src/world/worldService.ts` | `5d155df108bf59a617dff89dccee608789f0b72e` | room cache, town updates, layer instance creation, current thieves guild interior |
| `src/world/types.ts` | `6f538684ba9219ecf4c3ab8211fc043e19e7c932` | RoomSnapshot structure including town, townPerimeter, layerEntrances, layers, structures |
| `src/world/townRoles.ts` | `4817b36f2dffff51cd4bb459ce1e69d3ec036351` | town role classification, shop role mapping, merchant/guard/criminal helpers |
| `src/layers/layerTypes.ts` | `477f8aaae0689455c79afd47bed34791fb8d1940` | layer kind, layer template id, layer entrances, layer instances |
| `src/scenes/snakeScene.ts` | `62de1737fa587b7cb584a44d8de347af2ae1ffc8` | player interaction order, town reveal, town music, turn-based zone bounds, shop/guild UI |
| `src/world/__tests__/worldGenerationFairness.test.ts` | `02242b51e2a71f61c94c01bcba7a7d6ef0d38dab` | existing generation fairness tests and structure sanity tests |
Important current repository facts used by this design:
1. The test scripts available through package.json are `test`, `test:world-generation`, `typecheck`, `build`, `format`, `validate:ap`, and `build:apworld`.
2. The current town logical model still includes TownRoomKind aliases such as `outskirts`, `gate`, `square`, `market`, `marketStreet`, `tavern`, `tavernInterior`, `residential`, `residentialStreet`, `backAlley`, `guildHideout`, `exit`, and `townExit`.
3. The current physical footprint uses eight districts inside a four-by-four bounds: outskirts, gate, square, marketStreet, tavernInterior, residentialStreet, backAlley, and townExit.
4. The resolver still rotates the footprint by seed and stores an entrance side and exit side.
5. The current placement bounds are width four and height four, and the generated town is invalid near spawn, in ocean-like biomes, and in elderwood-maze.
6. The current world-generation stage renders town rooms before optional local structures and suppresses optional structure/lake conflicts inside town rooms and town perimeter rooms.
7. The current room snapshot has both `town` and `townPerimeter`, plus `layerEntrances` and `layer` for interiors/caves.
8. The current only supported town interior layer template is `thievesGuild`.
9. The current WorldService handles town state updates across cached rooms and special-cases `townInterior:thievesGuild` as `guildHideout`.
10. The current player-facing interaction order includes town quest board and town guild grate before other structure interactions.
11. The current scene starts town music when the current room is a town district other than outskirts, gate, or townExit.
12. The current scene treats `room.town.safeArea` as a turn-based/free movement zone.
13. The current collision system treats `#` as wall death unless invulnerable/smite/consume logic applies, and `~` as water death unless swimming/immortal applies.
14. The current safe/interior tile concept is tile-character-based and must be preserved or intentionally migrated.
15. The existing world-generation fairness tests deliberately skip town and townPerimeter rooms in some cross-room edge checks, which new town-specific tests must cover directly.
## 1. Executive Summary
- Replace the current eight-room physical town with a two-by-two walled town core.
- Keep a four-by-four total town influence footprint: four core city rooms plus twelve surrounding influence/perimeter/approach rooms.
- Draw walls only on the external edges of the two-by-two core, not between the four core rooms.
- Represent gates and exits as wall features and approach-room openings, not standalone full districts.
- Move tavern from a physical world district to a large townInterior layer template.
- Generalize the existing thieves guild layer logic into a reusable town interior framework.
- Model storefronts and homes as smaller interiors, with real doors, counters, shelves, loot, private zones, and crime triggers.
- Make theft, break-ins, and shop robbery physical when possible: owned objects and private areas should drive crimes.
- Keep town names, mood, laws, wanted level, suspicion, reputation, notices, rumors, patrols, guild jobs, guild discovery, guild wanted reduction, shops, NPC roles, town reveal, town music, turn-based zones, and interaction prompts.
- Preserve current exported functions and types long enough for compatibility; introduce new canonical names behind wrappers and aliases.
- Add robust regression tests before changing behavior: resolver footprint, external wall stamping, interior template contracts, crime ownership, guild continuity, shop continuity, and world-generation fairness.
- Perform the implementation in one intentionally sequenced pass that can be reviewed as a coherent town-overhaul PR.
## 2. Non-Negotiable Preservation Requirements
The overhaul is successful only if every player-facing and code-facing function of the current town system survives.
R-PRESERVE-001: `generateHumanTown` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
R-PRESERVE-002: `createPhysicalHumanTown` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
R-PRESERVE-003: `getTownRoom` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Find logical TownRoomNode by id.
R-PRESERVE-004: `getTownDistrictForRoom` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Map physical room id or layer room id to TownDistrictKind.
R-PRESERVE-005: `townDistrictDisplayName` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: User-facing district labels.
R-PRESERVE-006: `townShopKindForResidentRole` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Map resident roles to shop kind.
R-PRESERVE-007: `applyTownCrime` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
R-PRESERVE-008: `maybeTriggerPatrol` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
R-PRESERVE-009: `getPatrolChance` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Calculate patrol chance.
R-PRESERVE-010: `discoverThievesGuild` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Reveal guild, mark room discovered, add rumor.
R-PRESERVE-011: `reduceWantedViaGuild` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Spend score/karma path for wanted reduction.
R-PRESERVE-012: `resolveGuildJob` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
R-PRESERVE-013: `cloneTown` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Deep-enough town clone for immutable state updates.
R-PRESERVE-014: `stampTownBoundaryApproach` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
R-PRESERVE-015: `stampTownBoundaryCorner` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Stamp corner wall on diagonal town perimeter room.
R-PRESERVE-016: `createTownDistrictRoom` must remain exported or be replaced by a compatibility wrapper with the same effective behavior. Current purpose: Render a physical town district RoomSnapshot.
Additional preservation requirements:
R-PRESERVE-EXTRA-001: Existing save data that contains old district strings must not crash after the migration.
R-PRESERVE-EXTRA-002: Existing town ids should remain deterministic for the same placement seed where practical.
R-PRESERVE-EXTRA-003: Existing crime kinds must remain accepted by `applyTownCrime` and related UI flows.
R-PRESERVE-EXTRA-004: Existing guild jobs must continue to exist and resolve: pickpocket, house job, smuggle package.
R-PRESERVE-EXTRA-005: Existing town notices must continue to show welcome, law, warning, and job content unless replaced by equivalent or better content.
R-PRESERVE-EXTRA-006: Existing town reveal UI must still include name, mood, law/wanted information.
R-PRESERVE-EXTRA-007: Existing town music behavior must be replaced by an equivalent town/interior music state, not dropped.
R-PRESERVE-EXTRA-008: Existing turn-based/free movement zones for town rooms must continue to work.
R-PRESERVE-EXTRA-009: Existing shop role mapping must continue to work for equipment merchant, potion maker, butcher, card dealer, bartender, black market merchant, and general shopkeeper.
R-PRESERVE-EXTRA-010: Existing thieves guild discovery and entry must not regress while generalized interiors are introduced.
R-PRESERVE-EXTRA-011: Existing town perimeter pickup suppression must be maintained or explicitly redefined for the 4x4 influence footprint.
R-PRESERVE-EXTRA-012: Existing world-generation fairness tests must continue to pass, and new town-specific fairness tests must be added rather than relying on skips.
## 3. Current Town Model Audit
### 3.1 Current logical town
The logical town is richer than its physical footprint. Do not collapse it into a purely visual structure.
CURRENT-LOGICAL-001: Town has stable identity: id, name, biomeId, seed, factionId.
CURRENT-LOGICAL-002: Town stores physicalRoomIds and districtByRoomId, which allows a room or layer id to map back to a town district.
CURRENT-LOGICAL-003: Town stores room nodes with display names, tags, connections, visited/discovered/hidden/guarded flags.
CURRENT-LOGICAL-004: Town stores townTags such as human, safeHub, marketTown, roadTown, festival, curfew, crimeWave, guildPresence, rich, poor, guarded.
CURRENT-LOGICAL-005: Town stores mood, prosperity, danger, wantedLevel, suspicion, reputation.
CURRENT-LOGICAL-006: Town stores discoveredGuild and thievesGuild state.
CURRENT-LOGICAL-007: Town stores guildJobs, laws, rumors, notices.
CURRENT-LOGICAL-008: Town stores safeArea and center for room-local movement/interaction.
CURRENT-LOGICAL-009: Town stores residents and a selected shopkeeper.
### 3.2 Current physical districts
CURRENT-DISTRICT-001: `outskirts` — Current entrance district; social, visited by default; rendered with road, lanterns, field markers, NPC.
CURRENT-DISTRICT-002: `gate` — Current law/guard district; rendered as road plus central barrier/gate structure and multiple guards.
CURRENT-DISTRICT-003: `square` — Current central hub; social/law/quest; rendered with crossroad/plaza, notice board-ish symbol, NPCs.
CURRENT-DISTRICT-004: `marketStreet` — Current commerce district; rendered with stalls/counters, market/auction symbols, shop NPCs.
CURRENT-DISTRICT-005: `tavernInterior` — Current physical town district that behaves like an interior but is still a world room.
CURRENT-DISTRICT-006: `residentialStreet` — Current residential district; rendered with house blocks, doors, plants, residents.
CURRENT-DISTRICT-007: `backAlley` — Current crime/danger/hidden district; rendered enclosed with wall slats, grate/underground symbol, thieves.
CURRENT-DISTRICT-008: `townExit` — Current exit district; rendered with exit barrier/wall and guard.
### 3.3 Current resolver behavior
CURRENT-RESOLVER-001: Town placement is generated per 10x10 region with up to six candidate attempts.
CURRENT-RESOLVER-002: Town bounds are currently four rooms wide by four rooms tall.
CURRENT-RESOLVER-003: The eight district offsets are rotated by seed in four possible orientations.
CURRENT-RESOLVER-004: The entrance side starts as west and rotates by seed.
CURRENT-RESOLVER-005: The exit side starts as south and rotates by seed.
CURRENT-RESOLVER-006: The entrance room id is the rotated entrance offset room.
CURRENT-RESOLVER-007: The exit room id is the rotated exit offset room.
CURRENT-RESOLVER-008: Town connections are inferred from adjacent town membership plus one outside connection for the entrance and one outside connection for the exit.
CURRENT-RESOLVER-009: Adjacency classification detects cardinal sides and diagonal corners touching the current town footprint.
CURRENT-RESOLVER-010: Entrance and exit approaches are special adjacent rooms exactly one step outside the rotated entrance/exit side.
CURRENT-RESOLVER-011: Placement is invalid near spawn on z=0, in ocean-like biomes, and in elderwood-maze.
### 3.4 Current rendering behavior
CURRENT-RENDER-001: Town rooms are rendered by `createTownDistrictRoom`.
CURRENT-RENDER-002: Every current district calls or inherits `drawTownWalls`, which draws north/south/east/west boundary walls.
CURRENT-RENDER-003: Open sides are carved through the boundary wall as centered five-tile openings using `E` tiles.
CURRENT-RENDER-004: The wall itself is generally two tiles thick; the carve extends into a three-tile run-up.
CURRENT-RENDER-005: Roads are stamped as three-tile-wide `E` strips.
CURRENT-RENDER-006: Town structures use letters for visual/furniture/symbol tiles such as S, A, M, D, L, R, F, P, U, G.
CURRENT-RENDER-007: Residents are positioned after district-specific layout stamping and then stamped as `G` tiles.
CURRENT-RENDER-008: Town district rooms return no portals; normal coordinate-room edge traversal is used for physical town rooms.
CURRENT-RENDER-009: Town perimeter rooms are rendered by `stampTownBoundaryApproach` and `stampTownBoundaryCorner` from StructureOperations.
CURRENT-RENDER-010: Approach rooms reserve edge access with a five-tile opening and five-tile run-up.
### 3.5 Current interaction behavior
CURRENT-INTERACT-001: Interaction order sends a network interact command and then checks quest target, arcade, McDonalds, town quest board, town guild grate, Liberty structures, moleman dig site, relationship NPCs, village shop, goblin shop, quest giver, bullet train, house upgrades.
CURRENT-INTERACT-002: Town quest board has its own prompt and menu path.
CURRENT-INTERACT-003: Town guild grate has its own prompt and menu path.
CURRENT-INTERACT-004: The thieves guild menu supports wanted reduction, fencing, black market, and guild jobs.
CURRENT-INTERACT-005: VillageShopRoot is reused for town shops and black market cases.
CURRENT-INTERACT-006: Town reveal UI shows town name, mood, and wanted level.
CURRENT-INTERACT-007: Town hostility UI exists for hostile town encounters.
CURRENT-INTERACT-008: Town music starts inside town districts except outskirts, gate, and townExit.
CURRENT-INTERACT-009: Turn-based free movement uses town.safeArea when room.town is present.
### 3.6 Current layer/interior behavior
CURRENT-LAYER-001: LayerKind already includes `townInterior`.
CURRENT-LAYER-002: LayerTemplateId currently only includes `thievesGuild`.
CURRENT-LAYER-003: LayerEntrance has id, layerId, parentRoomId, x, y, kind, templateId, label, locked, discovered, returnPosition, tile.
CURRENT-LAYER-004: LayerInstance has parentRoomId, entranceId, templateId, seed, spawn, exit, returnPosition, zones, boundaryMode, townId, tags.
CURRENT-LAYER-005: WorldService can create LayerInstance from a LayerEntrance.
CURRENT-LAYER-006: WorldService only supports creating a `townInterior:thievesGuild` layer room.
CURRENT-LAYER-007: The guild layer returns a RoomSnapshot with layer set, town set, no portals, solid walls, exit tile Y, and guild residents positioned.
## 4. Target Design
### 4.1 Core geometry
The target town geometry is a compact two-by-two core inside a four-by-four influence footprint.
```text
4x4 influence footprint, one canonical orientation
[ influence NW ][ influence N  ][ influence N  ][ influence NE ]
[ influence W  ][ townCenter   ][ market      ][ influence E  ]
[ influence W  ][ residential  ][ backAlley   ][ influence E  ]
[ influence SW ][ influence S  ][ influence S  ][ influence SE ]
```
The two-by-two core is the player-visible town. The surrounding twelve rooms are town-influenced perimeter/approach rooms.
The core may rotate or mirror by seed, but its total occupied town core remains two rooms by two rooms and its influence footprint remains four rooms by four rooms.
TARGET-DISTRICT-001: `townCenter` — Public civic district. Former square/gate-notice functions live here: notice board, clerk/scribe, guards, town reveal focal point.
TARGET-DISTRICT-002: `market` — Public commercial district. General store, butcher, potion maker, equipment merchant, optional card table facade or shop door.
TARGET-DISTRICT-003: `residential` — Mixed public/private residential district. Houses are entrances; breaking in and stealing become physical actions.
TARGET-DISTRICT-004: `backAlley` — Crime/hidden district. Thieves guild grate/door, black market access, smuggling hooks, less patrol chance.
### 4.2 Wall rule
TARGET-WALL-001: Only external edges of the two-by-two core receive city walls.
TARGET-WALL-002: No internal edge between two core town districts may be blocked by a city wall.
TARGET-WALL-003: A core room can have two external walls if it is a corner of the core.
TARGET-WALL-004: A core room can have zero internal walls toward its neighboring core district.
TARGET-WALL-005: Gate openings are carved into external walls, not rendered as separate gate rooms.
TARGET-WALL-006: Exit openings are carved into external walls, not rendered as separate townExit rooms.
TARGET-WALL-007: The outside influence rooms should visually mirror the city wall on their town-facing edge.
TARGET-WALL-008: The entrance and exit approach rooms should have centered openings aligned with the core wall opening.
TARGET-WALL-009: Non-approach influence rooms may show closed wall edges, roads, farms, patrols, signage, or town ambience, but should not act as inside town.
TARGET-WALL-010: Diagonal influence rooms may receive corner wall stamping or lighter corner ambience.
### 4.3 Interior rule
TARGET-INTERIOR-001: Tavern becomes a townInterior layer, not a physical core room.
TARGET-INTERIOR-002: Thieves guild remains a townInterior layer and becomes one template in a larger template registry.
TARGET-INTERIOR-003: General store, butcher shop, potion maker, and residential homes become physical interiors where possible.
TARGET-INTERIOR-004: Interior sizes may differ: storefronts and homes can be small; tavern and guild can be larger.
TARGET-INTERIOR-005: Interior doors should not create fully filled rooms; every interior template must guarantee exposed playable space around the entrance.
TARGET-INTERIOR-006: Interior template contract must ensure at least two exposed sides for normal interiors and preferably three exposed sides for cramped shop counters/door landings.
TARGET-INTERIOR-007: Outside doors only need to align to the exterior wall or building facade; interior doors need walkable room context.
TARGET-INTERIOR-008: Entering an interior does not leave town; town laws, wanted level, mood, reputation, NPC memory, and music rules still apply.
TARGET-INTERIOR-009: Interiors should support public/private zones and owned objects for physical crime.
## 5. Proposed Type Model
This section describes target TypeScript shapes. Exact names can be adjusted during implementation, but concepts should remain stable.
```ts
export type TownInfluenceRole = 'outside' | 'influence' | 'perimeter' | 'approach' | 'inside';
export type TownCoreDistrictKind = 'townCenter' | 'market' | 'residential' | 'backAlley';
export type TownGateKind = 'entrance' | 'exit' | 'service' | 'locked';
export type TownInteriorKind =
  | 'generalStore'
  | 'tavern'
  | 'thievesGuild'
  | 'butcherShop'
  | 'potionMaker'
  | 'residentialHome'
;
export interface TownBuildingEntrance {
  id: string;
  townId: string;
  parentRoomId: string;
  district: TownCoreDistrictKind;
  interiorKind: TownInteriorKind;
  x: number;
  y: number;
  label: string;
  publicAccess: boolean;
  locked?: boolean;
  discovered?: boolean;
  crimeOnEntry?: TownCrimeKind;
  ownerNpcId?: string;
  ownerTownId?: string;
  layerEntranceId: string;
}
export interface TownOwnedObject {
  id: string;
  townId: string;
  roomId: string;
  x: number;
  y: number;
  itemId?: string;
  label: string;
  ownedBy: 'public' | 'town' | string;
  value: number;
  crimeOnTake?: TownCrimeKind;
  witnessRadius?: number;
  stolen?: boolean;
}
export interface TownPrivateZone {
  id: string;
  label: string;
  bounds: RoomArea;
  access: "public" | "staffOnly" | "private" | "hidden";
  crimeOnEntry?: TownCrimeKind;
  ownerNpcId?: string;
}
```
Type compatibility requirements:
TYPE-COMPAT-001: Keep `TownRoomKind` available during migration and normalize old values to new core or interior concepts.
TYPE-COMPAT-002: Keep `TownDistrictKind` as an exported type, but allow it to include new canonical district ids.
TYPE-COMPAT-003: Keep `TownPhysicalDistrictKind` exported from multiRoomStructures, but introduce a new canonical type for core districts.
TYPE-COMPAT-004: Do not break imports from SnakeScene, SnakeGame, StructureOperations, townRoles, shops, cards, relationships, or tests.
TYPE-COMPAT-005: Do not remove old enum-like string values until save migration and tests prove no references remain.
TYPE-COMPAT-006: Use compatibility helpers such as `normalizeTownDistrictKind`, `legacyTownDistrictFor`, and `townDistrictDisplayName` to bridge old/new names.
## 6. Footprint And Resolver Requirements
The resolver is the foundation. It must become simpler for the player and more explicit for the engine.
RESOLVER-REQ-001: Keep HUMAN_TOWN_REGION_SIZE at 10 unless broader world-density balancing requires a separate change.
RESOLVER-REQ-002: Keep HUMAN_TOWN_CANDIDATE_ATTEMPTS at 6 unless generation tests show unacceptable failure rates.
RESOLVER-REQ-003: Set placement bounds to width 4 and height 4 representing total influence footprint, not all physical districts.
RESOLVER-REQ-004: Define the canonical unrotated core as offsets (1,1), (2,1), (1,2), (2,2) inside the 4x4 footprint.
RESOLVER-REQ-005: Define the surrounding twelve offsets as influence/perimeter rooms.
RESOLVER-REQ-006: Store the town core offsets separately from influence offsets.
RESOLVER-REQ-007: The two-by-two core must contain exactly four core district assignments after rotation.
RESOLVER-REQ-008: The four core district assignments must always include townCenter, market, residential, and backAlley exactly once.
RESOLVER-REQ-009: The entrance side may rotate by seed and must choose a core external edge, not a standalone outskirts room.
RESOLVER-REQ-010: The exit side may rotate by seed and must choose a different or same external edge as allowed by design, but the default should avoid placing entrance and exit on the same side when possible.
RESOLVER-REQ-011: The entrance approach room is the influence room directly outside the entrance edge.
RESOLVER-REQ-012: The exit approach room is the influence room directly outside the exit edge.
RESOLVER-REQ-013: Adjacency/influence classification must explicitly distinguish core inside, side perimeter, corner perimeter, entrance approach, and exit approach.
RESOLVER-REQ-014: The old `getTownMembership(roomId)` must return inside only for the four core rooms and any townInterior layer rooms.
RESOLVER-REQ-015: The old `getTownAdjacency(roomId)` must return influence/perimeter/approach for the twelve surrounding rooms.
RESOLVER-REQ-016: `getTownConnections(roomId)` must return adjacent core room connections for open internal streets plus exterior gate/exit approach connections.
RESOLVER-REQ-017: Core-to-core connections should be open and wall-free.
RESOLVER-REQ-018: Core-to-influence connections should be blocked by external walls except where gate/exit openings exist.
RESOLVER-REQ-019: Do not place towns near spawn using the existing z=0 radius exclusion logic.
RESOLVER-REQ-020: Do not place towns in ocean-like biomes using biomeCountsAs(biome.id, "ocean").
RESOLVER-REQ-021: Do not place towns in elderwood-maze unless a future forest-town design explicitly supports dense forest towns.
RESOLVER-REQ-022: The placement seed and id format should remain stable enough for deterministic generation.
Suggested canonical footprint data:
```ts
const HUMAN_TOWN_CORE_DISTRICTS = {
  '1,1': 'townCenter',
  '2,1': 'market',
  '1,2': 'residential',
  '2,2': 'backAlley',
} as const;
const HUMAN_TOWN_INFLUENCE_OFFSETS = [
  '0,0',
  '1,0',
  '2,0',
  '3,0',
  '0,1',
  '3,1',
  '0,2',
  '3,2',
  '0,3',
  '1,3',
  '2,3',
  '3,3',
] as const;
```
## 7. District Rendering Requirements
RENDER-REQ-001: Replace `createTownDistrictRoom` internals with a core-aware renderer while retaining the exported function signature or compatibility wrapper.
RENDER-REQ-002: Add a new helper such as `createTownCoreRoom` or `createTownDistrictRoomV2` and have old `createTownDistrictRoom` call it after normalization.
RENDER-REQ-003: Compute external wall sides from whether a neighboring room is outside the two-by-two core, not from whether any connection exists.
RENDER-REQ-004: Draw external walls only on external sides.
RENDER-REQ-005: Do not call `drawTownWalls` blindly for every side of every core room.
RENDER-REQ-006: Do not render city walls between townCenter and market.
RENDER-REQ-007: Do not render city walls between residential and backAlley.
RENDER-REQ-008: Do not render city walls between townCenter and residential.
RENDER-REQ-009: Do not render city walls between market and backAlley.
RENDER-REQ-010: Keep road tiles visible enough to guide traversal between core rooms.
RENDER-REQ-011: Keep centered openings for entrance/exit gates aligned with outside approach openings.
RENDER-REQ-012: Keep walls on outside rooms via perimeter stamping for visual continuity.
RENDER-REQ-013: Set `town.safeArea` to the playable non-wall area of the core room.
RENDER-REQ-014: Place core-room residents after layout stamping and avoid stamping residents into `#` or `~`.
RENDER-REQ-015: Avoid placing static NPCs directly on gate transition tiles unless they are meant to block access.
RENDER-REQ-016: Stall/counter/building facade tiles should not all be treated as collision unless explicitly desired.
RENDER-REQ-017: Market storefront doors should be layer entrance tiles or explicitly interactable adjacent to a layer entrance.
RENDER-REQ-018: Residential houses should be small building markers with door/entrance tiles, not giant blocked rectangles that eat the whole district.
RENDER-REQ-019: BackAlley should remain visually distinct and support hidden guild access.
RENDER-REQ-020: TownCenter should keep the quest board/notice board interact point.
## 8. Interior System Requirements
The current thieves guild should be treated as the prototype for a generic townInterior registry.
INTERIOR-KIND-001: `generalStore` — Small or medium public shop; shelves/counter/merchant; theft objects.
INTERIOR-KIND-002: `tavern` — Large public social hub; bartender, card dealer, quest giver, rumors, food, dating/social hooks.
INTERIOR-KIND-003: `thievesGuild` — Hidden/private/conditional interior; currently implemented; must remain functional.
INTERIOR-KIND-004: `butcherShop` — Small public shop; butcher role; meat/food inventory; theft from counter/back room.
INTERIOR-KIND-005: `potionMaker` — Small public shop; potion/scribe role; potion shelves; theft from shelves/back room.
INTERIOR-KIND-006: `residentialHome` — Small private home; resident owner; break-in crime; loot containers; possible lawful invited variant later.
INTERIOR-CONTRACT-001: Every interior template must have a stable `templateId` that can be stored in LayerEntrance and LayerInstance.
INTERIOR-CONTRACT-002: Every interior template must have a declared size category: small, medium, large, or custom.
INTERIOR-CONTRACT-003: Every interior template must produce a valid RoomSnapshot with `layer` set.
INTERIOR-CONTRACT-004: Every town interior RoomSnapshot must include `town` with the same town id as the parent town.
INTERIOR-CONTRACT-005: Every town interior must set `layer.kind` to `townInterior`.
INTERIOR-CONTRACT-006: Every town interior must set `layer.townId` to the town id.
INTERIOR-CONTRACT-007: Every town interior must use `boundaryMode: solidWalls` unless a future explicit wrap template exists.
INTERIOR-CONTRACT-008: Every town interior must include exactly one functional exit tile or exit zone that returns to parentRoomId/returnPosition.
INTERIOR-CONTRACT-009: Every interior entrance must spawn the player on a valid, walkable tile.
INTERIOR-CONTRACT-010: Every interior exit returnPosition must be outside the interior and adjacent to the entrance facade/door when possible.
INTERIOR-CONTRACT-011: Every interior must guarantee at least two exposed walkable sides around the entrance landing.
INTERIOR-CONTRACT-012: Large social interiors such as tavern should guarantee at least three exposed walkable sides around major doors and counters.
INTERIOR-CONTRACT-013: Every template must declare public zones and private zones.
INTERIOR-CONTRACT-014: Every template must expose NPC anchors by role, such as bartender, cardDealer, questGiver, shopkeeper, resident, thiefContact.
INTERIOR-CONTRACT-015: Every template must expose owned object anchors or explicitly declare that it has no loot/theft objects.
INTERIOR-CONTRACT-016: Every template must avoid filling the entire room with walls/furniture.
INTERIOR-CONTRACT-017: Every template must be deterministic for the same layer id and world seed.
INTERIOR-CONTRACT-018: Every template must survive grid sizes at least 32x22 because current town placement requires grid.cols >= 32 and grid.rows >= 22.
INTERIOR-CONTRACT-019: Every template should use tile characters already supported by SnakeRenderer or add renderer support in the same PR.
### 8.1 Interior template size standards
INTERIOR-SIZE-001: `small` — One-room shop or home. Suggested bounds roughly 14x10 to 20x14 inside a 32x24 grid. Used for butcher, potion maker, residentialHome.
INTERIOR-SIZE-002: `medium` — General store or larger home. Suggested bounds roughly 20x14 to 26x18. Supports shelves, counter, staff/private back zone.
INTERIOR-SIZE-003: `large` — Tavern or guild. Suggested bounds almost full room but with walls and open space. Supports multiple NPCs, tables, board, shop/menu anchors.
INTERIOR-SIZE-004: `custom` — Reserved for special events, future town hall, jail, clinic, multi-zone interiors.
## 9. Crime And Ownership Requirements
- The redesign should make crime physical where feasible.
- Stealing should be a property of taking an owned object, not only a menu choice.
- Breaking in should be a property of entering a private building or private zone, not only a guild-job button.
- Shop robbery should be a stronger theft variant for shop zones, behind-counter theft, forced taking, or taking while witnessed.
- Witnessing should use distance, line-of-sight where feasible, room/layer publicness, and role/faction.
CRIME-PRESERVE-001: Existing crime kind `theft` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-002: Existing crime kind `shopRobbery` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-003: Existing crime kind `breakIn` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-004: Existing crime kind `assault` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-005: Existing crime kind `murder` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-006: Existing crime kind `guildJobDiscovered` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-007: Existing crime kind `romanticPublicMurder` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-008: Existing crime kind `biteGuard` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-009: Existing crime kind `curfewViolation` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-010: Existing crime kind `fakePermit` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-PRESERVE-011: Existing crime kind `refuseFine` must continue to be accepted and must have a physical or menu-driven path after the overhaul.
CRIME-REQ-001: Owned objects must have owner, value, crimeOnTake, and witness radius metadata.
CRIME-REQ-002: Private zones must have access level and optional crimeOnEntry.
CRIME-REQ-003: A residential home entrance with `publicAccess: false` should be capable of triggering breakIn when entered unlawfully.
CRIME-REQ-004: A shop public floor should not be crime by default.
CRIME-REQ-005: A shop back room or behind-counter zone should be staffOnly/private and may trigger suspicion or shopRobbery when entered/taken from.
CRIME-REQ-006: Taking public decorative objects should either be disallowed or have no crime/reward; do not accidentally make every floor tile loot.
CRIME-REQ-007: The player should receive feedback when a crime is witnessed and when it was not obviously witnessed.
CRIME-REQ-008: Unwitnessed theft currently produces no wanted delta; preserve that behavior unless deliberately revised in a separate balance change.
CRIME-REQ-009: Witnessed theft, breakIn, shopRobbery, assault, biteGuard, murder, and romanticPublicMurder must continue to map to wanted/reputation consequences.
CRIME-REQ-010: Guild jobs should increasingly point to physical targets: object id, room id, interior kind, owner, and complication metadata.
CRIME-REQ-011: The existing abstract guild-job resolver should remain available as a fallback for the first implementation pass.
## 10. NPC, Resident, And Shop Requirements
NPC-ROLE-PRESERVE-001: Role `shopkeeper` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-002: Role `equipmentMerchant` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-003: Role `potionMaker` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-004: Role `butcher` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-005: Role `cardDealer` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-006: Role `bartender` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-007: Role `guard` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-008: Role `resident` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-009: Role `thiefContact` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-010: Role `thief` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-011: Role `scribe` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-ROLE-PRESERVE-012: Role `questGiver` must still be placeable, interactable or behaviorally meaningful after the overhaul.
NPC-REQ-001: Residents should continue to have homeRoomId and workRoomId, but the target may be a core district id or a townInterior layer id.
NPC-REQ-002: Stationary town roles should remain stationary at anchors unless a schedule/movement feature is implemented intentionally.
NPC-REQ-003: The tavern should host bartender, cardDealer, questGiver, and optional resident/social NPCs.
NPC-REQ-004: The market should host equipmentMerchant, potionMaker, butcher, general shopkeeper, and possible residents.
NPC-REQ-005: The townCenter should host guards, scribe/clerk, quest board, and general town notice interactions.
NPC-REQ-006: The residential district should host residents and house entrances.
NPC-REQ-007: The backAlley should host thiefContact, thief, guild entrance, and possibly black market hooks.
NPC-REQ-008: NPCs may move in and out of interiors later, but first pass should preserve deterministic anchors.
NPC-REQ-009: Shop role filtering must continue to drive inventory categories in VillageShopRoot.
NPC-REQ-010: Black market must remain available through guild state/karma/discovery rules.
## 11. UI, Music, Prompt, And Player-Facing Requirements
UI-REQ-001: Town reveal must still display town name, mood, and wanted level.
UI-REQ-002: Town reveal should trigger when entering a core district or first gate approach, not every influence room.
UI-REQ-003: Quest board prompt must still appear near the board in townCenter.
UI-REQ-004: Guild grate prompt must still appear near the backAlley guild entrance and should say inspect/enter depending on initiation status.
UI-REQ-005: Shop prompts must appear near shopkeeper or storefront door as appropriate.
UI-REQ-006: Interior entrance prompts should use building labels such as Enter Tavern, Enter General Store, Break into Home, Inspect Grate.
UI-REQ-007: Town music should start in core districts and public town interiors; it may use distinct tavern/guild variants later.
UI-REQ-008: Town music should not start merely because the player is in an influence/perimeter room outside the walls unless a subtle outside-town ambience is added intentionally.
UI-REQ-009: House/interior ambience should not fight town music; define priority: special interior music > town music > house ambience > atmosphere.
UI-REQ-010: Turn-based/free movement should apply in core town safe areas and town interiors.
UI-REQ-011: Minimap should show core town rooms and perimeter walls distinctly enough that players can understand the 2x2 town shape.
UI-REQ-012: Renderer must support any new tile letters before they are emitted by generators.
## 12. Single-Pass Implementation Plan
This is intended as a single coherent implementation pass. The sequence matters: add compatibility first, add tests early, then switch generation, then generalize interiors, then clean up.
### Phase 1: Compatibility scaffold and tests before behavior change
PHASE-1-TASK-001: Add `normalizeTownDistrictKind` that maps legacy market/tavern/residential/exit aliases and future canonical districts.
PHASE-1-TASK-002: Add `legacyTownDistrictForDisplay` only if needed for old UI labels.
PHASE-1-TASK-003: Add failing/pending tests for desired 2x2 core footprint and external-only walls.
PHASE-1-TASK-004: Add tests that current exported functions are still exported.
PHASE-1-TASK-005: Add fixture helper for generating a town placement deterministically.
PHASE-1-TASK-006: Add fixture helper for walking all rooms in a 4x4 influence footprint.
### Phase 2: New 2x2 core + 4x4 influence resolver
PHASE-2-TASK-001: Replace HUMAN_TOWN_DISTRICTS with new core/influence data, or add V2 data next to old data while tests migrate.
PHASE-2-TASK-002: Keep placement bounds width/height 4.
PHASE-2-TASK-003: Update getHumanTownDistricts to return only four core districts or add getHumanTownCoreDistricts and preserve old wrapper where required.
PHASE-2-TASK-004: Add getHumanTownInfluenceOffsets.
PHASE-2-TASK-005: Update resolveAgainstPlacement to return inside for core offsets, approach/perimeter for influence offsets.
PHASE-2-TASK-006: Update getTownConnections to expose core-to-core connections and gate/exit approaches.
### Phase 3: External-only wall renderer and district remapping
PHASE-3-TASK-001: Introduce external side computation for core rooms.
PHASE-3-TASK-002: Render townCenter, market, residential, backAlley from new layouts.
PHASE-3-TASK-003: Move gate/townExit visual behavior into wall opening and approach-room rendering.
PHASE-3-TASK-004: Move tavern visual behavior out of physical district and into interior template.
PHASE-3-TASK-005: Ensure no internal edge between core rooms contains a blocking `#` wall run.
PHASE-3-TASK-006: Ensure external wall openings are aligned between core and approach rooms.
### Phase 4: Generic town interior registry
PHASE-4-TASK-001: Expand LayerTemplateId beyond thievesGuild.
PHASE-4-TASK-002: Create a townInterior template registry.
PHASE-4-TASK-003: Replace WorldService.createLayerRoom special-case with registry dispatch.
PHASE-4-TASK-004: Preserve createThievesGuildLayerRoom by moving it behind registry or wrapping it.
PHASE-4-TASK-005: Add generic parseTownIdFromLayerId that does not assume thievesGuild is the last segment.
PHASE-4-TASK-006: Add building entrance creation to town district rendering or town data generation.
### Phase 5: Tavern/storefront/home interiors
PHASE-5-TASK-001: Implement tavern template with bartender, cardDealer, questGiver, tables, large public floor.
PHASE-5-TASK-002: Implement generalStore template with counter, shelves, shopkeeper anchor, public/private zones.
PHASE-5-TASK-003: Implement butcherShop template with butcher anchor and owned food/meat objects.
PHASE-5-TASK-004: Implement potionMaker template with potion shelves and potionMaker/scribe anchor.
PHASE-5-TASK-005: Implement residentialHome template with owner, private entry, loot anchors, and break-in behavior hooks.
PHASE-5-TASK-006: Ensure every template has exit tile Y and valid returnPosition.
### Phase 6: Physical ownership/crime primitives
PHASE-6-TASK-001: Add TownOwnedObject and TownPrivateZone storage to RoomSnapshot or town/interior metadata.
PHASE-6-TASK-002: Add detection for taking owned objects.
PHASE-6-TASK-003: Add detection for entering private zones when not allowed.
PHASE-6-TASK-004: Route physical crimes through applyTownCrime.
PHASE-6-TASK-005: Keep existing abstract guild job resolver as fallback.
PHASE-6-TASK-006: Add physical guild job targets gradually without breaking current guild jobs.
### Phase 7: UI/prompts/music/shop/guild wiring
PHASE-7-TASK-001: Update interact prompt order to include town building entrances before generic quest giver/shop fallbacks when appropriate.
PHASE-7-TASK-002: Update getQuestGiverHint to mention building entrances and break-in prompts.
PHASE-7-TASK-003: Update town music to use core/influence/interior classification.
PHASE-7-TASK-004: Update town reveal so it triggers at gate/core entry and not every interior revisit.
PHASE-7-TASK-005: Update VillageShopRoot filtering to use actorRole from interior anchors.
PHASE-7-TASK-006: Update black market detection to use interior kind or district mapping, not only guildHideout district room.
### Phase 8: Regression suite, typecheck, build, polish
PHASE-8-TASK-001: Run npm run typecheck.
PHASE-8-TASK-002: Run npm run test:world-generation.
PHASE-8-TASK-003: Run npm run test.
PHASE-8-TASK-004: Run npm run build.
PHASE-8-TASK-005: Manually inspect at least one generated town in each rotation.
PHASE-8-TASK-006: Verify old functions still import and old saves do not crash.
## 13. Regression Test Plan
All tests should be written with Vitest and placed near current world-generation tests or in focused new files such as `src/world/__tests__/townOverhaul.test.ts`, `src/world/__tests__/townInteriorTemplates.test.ts`, and `src/world/__tests__/townCrime.test.ts`.
### 13.1 resolver-footprint
TEST-RESOLVER-FOOTPRINT-001: town placement bounds remain 4x4.
TEST-RESOLVER-FOOTPRINT-002: exactly four core rooms are inside.
TEST-RESOLVER-FOOTPRINT-003: exactly twelve influence rooms are adjacent/perimeter/approach.
TEST-RESOLVER-FOOTPRINT-004: core district set contains townCenter, market, residential, backAlley.
TEST-RESOLVER-FOOTPRINT-005: entrance approach is one room outside an external core edge.
TEST-RESOLVER-FOOTPRINT-006: exit approach is one room outside an external core edge.
TEST-RESOLVER-FOOTPRINT-007: rotations preserve the 2x2 core shape.
TEST-RESOLVER-FOOTPRINT-008: rotations preserve the 4x4 influence shape.
TEST-RESOLVER-FOOTPRINT-009: town invalid near spawn.
TEST-RESOLVER-FOOTPRINT-010: town invalid in ocean-like biome.
TEST-RESOLVER-FOOTPRINT-011: town invalid in elderwood-maze.
### 13.2 connections
TEST-CONNECTIONS-001: townCenter connects to market and residential when adjacent.
TEST-CONNECTIONS-002: market connects to townCenter and backAlley when adjacent.
TEST-CONNECTIONS-003: residential connects to townCenter and backAlley when adjacent.
TEST-CONNECTIONS-004: backAlley connects to market and residential when adjacent.
TEST-CONNECTIONS-005: entrance connection leads to approach room.
TEST-CONNECTIONS-006: exit connection leads to approach room.
TEST-CONNECTIONS-007: no nonexistent town connection is returned.
TEST-CONNECTIONS-008: legacy getTownConnections remains callable.
### 13.3 walls
TEST-WALLS-001: north external core edge has wall unless gate opening.
TEST-WALLS-002: south external core edge has wall unless gate opening.
TEST-WALLS-003: east external core edge has wall unless gate opening.
TEST-WALLS-004: west external core edge has wall unless gate opening.
TEST-WALLS-005: internal townCenter-market edge has no blocking wall run.
TEST-WALLS-006: internal townCenter-residential edge has no blocking wall run.
TEST-WALLS-007: internal market-backAlley edge has no blocking wall run.
TEST-WALLS-008: internal residential-backAlley edge has no blocking wall run.
TEST-WALLS-009: approach opening width is five tiles.
TEST-WALLS-010: approach opening has five-tile protected run-up.
### 13.4 district-rendering
TEST-DISTRICT-RENDERING-001: townCenter contains quest board interact marker.
TEST-DISTRICT-RENDERING-002: townCenter contains guard/clerk safe positions.
TEST-DISTRICT-RENDERING-003: market contains storefront entrance markers.
TEST-DISTRICT-RENDERING-004: residential contains house entrance markers.
TEST-DISTRICT-RENDERING-005: backAlley contains guild entrance marker when hidden or discovered state allows visual.
TEST-DISTRICT-RENDERING-006: resident positions are walkable.
TEST-DISTRICT-RENDERING-007: shopkeeper positions are walkable.
TEST-DISTRICT-RENDERING-008: guard positions are walkable or intentionally blocking.
TEST-DISTRICT-RENDERING-009: safeArea excludes external walls.
TEST-DISTRICT-RENDERING-010: layout dimensions match grid dimensions.
### 13.5 interiors
TEST-INTERIORS-001: thievesGuild template still creates a layer room.
TEST-INTERIORS-002: tavern template creates a layer room.
TEST-INTERIORS-003: generalStore template creates a layer room.
TEST-INTERIORS-004: butcherShop template creates a layer room.
TEST-INTERIORS-005: potionMaker template creates a layer room.
TEST-INTERIORS-006: residentialHome template creates a layer room.
TEST-INTERIORS-007: every interior has exit tile.
TEST-INTERIORS-008: every interior has spawn tile walkable.
TEST-INTERIORS-009: every interior returnPosition is valid in parent room.
TEST-INTERIORS-010: every interior keeps same town id.
TEST-INTERIORS-011: every interior sets boundaryMode solidWalls.
TEST-INTERIORS-012: every interior entrance landing has two exposed sides.
TEST-INTERIORS-013: large tavern has three exposed sides around main door.
TEST-INTERIORS-014: interior dimensions are deterministic.
TEST-INTERIORS-015: interior object anchors do not overlap walls.
### 13.6 crime
TEST-CRIME-001: unwitnessed theft does not raise wanted level.
TEST-CRIME-002: witnessed theft raises wanted/reputation as before.
TEST-CRIME-003: breakIn raises wanted/reputation as before.
TEST-CRIME-004: shopRobbery raises wanted/reputation as before.
TEST-CRIME-005: guildJobDiscovered affects guild karma.
TEST-CRIME-006: private residential entry can emit breakIn.
TEST-CRIME-007: taking owned shelf item can emit theft.
TEST-CRIME-008: taking behind-counter shop item can emit shopRobbery.
TEST-CRIME-009: crime rumors are capped and newest-first.
TEST-CRIME-010: suspicion clamps to 100.
TEST-CRIME-011: wanted level clamps to 5.
### 13.7 ui
TEST-UI-001: quest board prompt appears near townCenter board.
TEST-UI-002: guild grate prompt appears near backAlley guild entrance.
TEST-UI-003: enter tavern prompt appears near tavern door.
TEST-UI-004: enter shop prompt appears near shop door.
TEST-UI-005: break in prompt appears near private residential door if implemented.
TEST-UI-006: town reveal includes name/mood/wanted.
TEST-UI-007: town music starts in core district.
TEST-UI-008: town music starts in tavern interior.
TEST-UI-009: town music does not start in unrelated outside room.
TEST-UI-010: turn-based zone applies in town core room.
TEST-UI-011: turn-based zone applies in town interior.
### 13.8 compatibility
TEST-COMPATIBILITY-001: generateHumanTown still returns logical rooms.
TEST-COMPATIBILITY-002: createPhysicalHumanTown still returns residents.
TEST-COMPATIBILITY-003: getTownRoom still finds legacy room nodes.
TEST-COMPATIBILITY-004: townDistrictDisplayName handles old and new names.
TEST-COMPATIBILITY-005: getTownDistrictForRoom handles core room ids.
TEST-COMPATIBILITY-006: getTownDistrictForRoom handles townInterior layer ids.
TEST-COMPATIBILITY-007: townShopKindForResidentRole still maps all merchant roles.
TEST-COMPATIBILITY-008: discoverThievesGuild still reveals guild.
TEST-COMPATIBILITY-009: reduceWantedViaGuild still reduces wanted when guild discovered.
TEST-COMPATIBILITY-010: resolveGuildJob still resolves old guild jobs.
## 14. Detailed Acceptance Checklist
ACCEPT-GENERATION-001: generation acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-002: generation acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-003: generation acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-004: generation acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-005: generation acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-006: generation acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-007: generation acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-008: generation acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-009: generation acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-010: generation acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-011: generation acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-012: generation acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-013: generation acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-014: generation acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GENERATION-015: generation acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-001: resolver acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-002: resolver acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-003: resolver acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-004: resolver acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-005: resolver acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-006: resolver acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-007: resolver acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-008: resolver acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-009: resolver acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-010: resolver acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-011: resolver acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-012: resolver acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-013: resolver acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-014: resolver acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RESOLVER-015: resolver acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-001: rendering acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-002: rendering acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-003: rendering acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-004: rendering acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-005: rendering acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-006: rendering acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-007: rendering acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-008: rendering acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-009: rendering acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-010: rendering acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-011: rendering acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-012: rendering acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-013: rendering acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-014: rendering acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-RENDERING-015: rendering acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-001: interiors acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-002: interiors acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-003: interiors acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-004: interiors acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-005: interiors acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-006: interiors acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-007: interiors acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-008: interiors acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-009: interiors acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-010: interiors acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-011: interiors acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-012: interiors acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-013: interiors acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-014: interiors acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-INTERIORS-015: interiors acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-001: crime acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-002: crime acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-003: crime acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-004: crime acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-005: crime acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-006: crime acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-007: crime acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-008: crime acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-009: crime acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-010: crime acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-011: crime acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-012: crime acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-013: crime acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-014: crime acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-CRIME-015: crime acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-001: npc acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-002: npc acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-003: npc acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-004: npc acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-005: npc acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-006: npc acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-007: npc acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-008: npc acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-009: npc acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-010: npc acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-011: npc acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-012: npc acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-013: npc acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-014: npc acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-NPC-015: npc acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-001: shops acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-002: shops acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-003: shops acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-004: shops acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-005: shops acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-006: shops acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-007: shops acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-008: shops acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-009: shops acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-010: shops acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-011: shops acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-012: shops acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-013: shops acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-014: shops acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SHOPS-015: shops acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-001: guild acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-002: guild acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-003: guild acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-004: guild acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-005: guild acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-006: guild acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-007: guild acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-008: guild acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-009: guild acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-010: guild acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-011: guild acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-012: guild acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-013: guild acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-014: guild acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-GUILD-015: guild acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-001: ui acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-002: ui acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-003: ui acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-004: ui acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-005: ui acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-006: ui acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-007: ui acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-008: ui acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-009: ui acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-010: ui acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-011: ui acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-012: ui acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-013: ui acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-014: ui acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-UI-015: ui acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-001: audio acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-002: audio acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-003: audio acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-004: audio acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-005: audio acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-006: audio acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-007: audio acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-008: audio acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-009: audio acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-010: audio acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-011: audio acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-012: audio acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-013: audio acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-014: audio acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-AUDIO-015: audio acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-001: save-compatibility acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-002: save-compatibility acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-003: save-compatibility acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-004: save-compatibility acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-005: save-compatibility acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-006: save-compatibility acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-007: save-compatibility acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-008: save-compatibility acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-009: save-compatibility acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-010: save-compatibility acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-011: save-compatibility acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-012: save-compatibility acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-013: save-compatibility acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-014: save-compatibility acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-SAVE-COMPATIBILITY-015: save-compatibility acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-001: tests acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-002: tests acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-003: tests acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-004: tests acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-005: tests acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-006: tests acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-007: tests acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-008: tests acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-009: tests acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-010: tests acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-011: tests acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-012: tests acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-013: tests acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-014: tests acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-TESTS-015: tests acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-001: performance acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-002: performance acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-003: performance acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-004: performance acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-005: performance acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-006: performance acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-007: performance acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-008: performance acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-009: performance acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-010: performance acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-011: performance acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-012: performance acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-013: performance acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-014: performance acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-PERFORMANCE-015: performance acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-001: manual-qa acceptance item 1 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-002: manual-qa acceptance item 2 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-003: manual-qa acceptance item 3 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-004: manual-qa acceptance item 4 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-005: manual-qa acceptance item 5 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-006: manual-qa acceptance item 6 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-007: manual-qa acceptance item 7 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-008: manual-qa acceptance item 8 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-009: manual-qa acceptance item 9 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-010: manual-qa acceptance item 10 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-011: manual-qa acceptance item 11 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-012: manual-qa acceptance item 12 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-013: manual-qa acceptance item 13 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-014: manual-qa acceptance item 14 has been verified against both old-town preservation and new 2x2-core behavior.
ACCEPT-MANUAL-QA-015: manual-qa acceptance item 15 has been verified against both old-town preservation and new 2x2-core behavior.
## 15. Function Preservation Matrix
| Existing function/export | Preserve as | New implementation note | Regression expectation |
| --- | --- | --- | --- |
| `generateHumanTown` | same export or wrapper | Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk. | Import succeeds and behavior has dedicated test. |
| `createPhysicalHumanTown` | same export or wrapper | Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant. | Import succeeds and behavior has dedicated test. |
| `getTownRoom` | same export or wrapper | Find logical TownRoomNode by id. | Import succeeds and behavior has dedicated test. |
| `getTownDistrictForRoom` | same export or wrapper | Map physical room id or layer room id to TownDistrictKind. | Import succeeds and behavior has dedicated test. |
| `townDistrictDisplayName` | same export or wrapper | User-facing district labels. | Import succeeds and behavior has dedicated test. |
| `townShopKindForResidentRole` | same export or wrapper | Map resident roles to shop kind. | Import succeeds and behavior has dedicated test. |
| `applyTownCrime` | same export or wrapper | Mutate wanted/reputation/suspicion/rumors for crimes. | Import succeeds and behavior has dedicated test. |
| `maybeTriggerPatrol` | same export or wrapper | Roll a patrol encounter based on wanted level, destination room kind, and guild karma. | Import succeeds and behavior has dedicated test. |
| `getPatrolChance` | same export or wrapper | Calculate patrol chance. | Import succeeds and behavior has dedicated test. |
| `discoverThievesGuild` | same export or wrapper | Reveal guild, mark room discovered, add rumor. | Import succeeds and behavior has dedicated test. |
| `reduceWantedViaGuild` | same export or wrapper | Spend score/karma path for wanted reduction. | Import succeeds and behavior has dedicated test. |
| `resolveGuildJob` | same export or wrapper | Resolve guild job success/failure and update guild karma/wanted state. | Import succeeds and behavior has dedicated test. |
| `cloneTown` | same export or wrapper | Deep-enough town clone for immutable state updates. | Import succeeds and behavior has dedicated test. |
| `stampTownBoundaryApproach` | same export or wrapper | Stamp town-facing wall/opening on an adjacent outside room. | Import succeeds and behavior has dedicated test. |
| `stampTownBoundaryCorner` | same export or wrapper | Stamp corner wall on diagonal town perimeter room. | Import succeeds and behavior has dedicated test. |
| `createTownDistrictRoom` | same export or wrapper | Render a physical town district RoomSnapshot. | Import succeeds and behavior has dedicated test. |
## 16. District Migration Matrix
| Legacy district | New home | Compatibility rule |
| --- | --- | --- |
| `outskirts` | `influence/approach/perimeter` | No longer a core district; legacy display may read Outskirts for approach ring. |
| `gate` | `external wall gate feature + townCenter guards` | Normalize to townCenter or gateApproach depending context. |
| `square` | `townCenter` | Normalize to townCenter. |
| `market` | `market` | Normalize to market. |
| `marketStreet` | `market` | Normalize to market. |
| `tavern` | `townInterior:tavern` | Normalize display to Tavern; physical room becomes layer. |
| `tavernInterior` | `townInterior:tavern` | Normalize display to Tavern; use layer id for current room. |
| `residential` | `residential` | Normalize to residential. |
| `residentialStreet` | `residential` | Normalize to residential. |
| `backAlley` | `backAlley` | Keep as core district. |
| `guildHideout` | `townInterior:thievesGuild` | Keep as interior district alias for guild layer. |
| `exit` | `external wall exit feature` | Normalize to townExit/exitApproach for old display. |
| `townExit` | `external wall exit feature` | Not a core district; use exitApproach or townCenter/backAlley edge depending placement. |
## 17. Interior Template Registry Requirements
REGISTRY-REQ-001: Registry must be a plain TypeScript module, not hidden inside WorldService.
REGISTRY-REQ-002: Registry must map template id to builder function.
REGISTRY-REQ-003: Builder receives grid, instance, town, rng/seed, palette, and parent metadata.
REGISTRY-REQ-004: Builder returns RoomSnapshot or a focused interior build result consumed by WorldService.
REGISTRY-REQ-005: ThievesGuild builder must be moved from WorldService or wrapped by registry without behavior loss.
REGISTRY-REQ-006: Registry must produce helpful error messages for unsupported template ids.
REGISTRY-REQ-007: LayerTemplateId must enumerate every template used by generated entrances.
REGISTRY-REQ-008: Templates must be testable without booting Phaser.
Suggested file structure:
```text
src/world/town.ts
src/world/townDistrictRenderer.ts
src/world/townFootprint.ts
src/world/townInteriors/townInteriorRegistry.ts
src/world/townInteriors/thievesGuildInterior.ts
src/world/townInteriors/tavernInterior.ts
src/world/townInteriors/shopInteriors.ts
src/world/townInteriors/residentialInterior.ts
src/world/townCrimeObjects.ts
src/world/__tests__/townOverhaul.test.ts
src/world/__tests__/townInteriorTemplates.test.ts
src/world/__tests__/townCrime.test.ts
```
## 18. Manual QA Script
MANUAL-QA-001: Start a development build and locate a generated town.
MANUAL-QA-002: Approach the town from the entrance side and verify the outside wall has a visible opening.
MANUAL-QA-003: Move through the opening and verify the player enters one of four core town districts.
MANUAL-QA-004: Move between all four core districts and verify no internal city wall blocks movement.
MANUAL-QA-005: Verify town reveal appears once and is readable.
MANUAL-QA-006: Verify town music starts inside the core and stops outside/in unrelated rooms.
MANUAL-QA-007: Find the townCenter notice board and open the quest board.
MANUAL-QA-008: Find the market and enter at least one storefront interior.
MANUAL-QA-009: Verify the shopkeeper/menu still works.
MANUAL-QA-010: Find the tavern entrance and enter the tavern interior.
MANUAL-QA-011: Verify tavern NPC anchors work: bartender/card dealer/quest giver as implemented.
MANUAL-QA-012: Find a residential home and verify public/private behavior.
MANUAL-QA-013: Trigger a theft or break-in in a test/cheat scenario and verify wanted/reputation updates.
MANUAL-QA-014: Find the backAlley and inspect the thieves guild grate before initiation is complete.
MANUAL-QA-015: Complete or cheat the guild initiation and enter the thieves guild.
MANUAL-QA-016: Use guild wanted reduction or a guild job and verify the old guild menu still works.
MANUAL-QA-017: Exit every interior and verify the return position is outside the correct door.
MANUAL-QA-018: Leave the town through the exit gate and verify the outside approach aligns.
MANUAL-QA-019: Open minimap and verify town/core/perimeter are legible enough.
MANUAL-QA-020: Repeat for four rotations/seeds.
## 19. Risk Register
RISK-001: Save compatibility
  - Impact: Old saves may contain district ids that no longer exist.
  - Mitigation: Keep normalization wrappers and load-time migration.
RISK-002: Interaction order
  - Impact: Interior entrances may conflict with quest board/guild/shop prompts.
  - Mitigation: Define priority and add prompt tests.
RISK-003: Town music
  - Impact: House ambience and town music may conflict.
  - Mitigation: Centralize audio state priority.
RISK-004: Renderer tiles
  - Impact: New interior symbols may render as generic background or minimap barrier incorrectly.
  - Mitigation: Add renderer support before templates emit new tiles.
RISK-005: NPC anchors
  - Impact: Residents may spawn on walls/furniture after layout changes.
  - Mitigation: Add anchor validation tests.
RISK-006: Crime spam
  - Impact: Private-zone entry may repeatedly apply breakIn every tick.
  - Mitigation: Add per-zone/per-entry cooldown or one-shot event key.
RISK-007: Pathing/navigation
  - Impact: 2x2 core could still feel blocked if facades/counters take too much space.
  - Mitigation: Enforce interior/exposed-space and core safeArea tests.
RISK-008: World density
  - Impact: Smaller town may alter optional structure spawn distribution.
  - Mitigation: Update broad generation sanity expectations.
RISK-009: Guild access
  - Impact: Moving guild to interior registry may break discoveredGuild logic.
  - Mitigation: Dedicated guild regression tests.
RISK-010: AP/achievements
  - Impact: Shops/items/achievements may assume old room locations.
  - Mitigation: Run AP validation and full tests.
## 20. Codex Implementation Prompt
Use this prompt for a single implementation pass.
```text
Implement the town overhaul described in docs/town_overhaul_design_requirements.md.
The current repository has an eight-district human town footprint, but the new target is a compact 2x2 town core inside a 4x4 influence footprint.
Do not remove any current town function. Preserve logical town data, town laws, wanted level, suspicion, reputation, notices, rumors, patrols, guild jobs, thieves guild discovery, guild wanted reduction, shop role mapping, town reveal UI, town music, turn-based safe zones, and all exported helper functions through compatibility wrappers if needed.
Replace standalone gate/townExit physical districts with external wall gate/exit features.
Remove internal city walls between the four core town rooms.
Make tavern a townInterior layer template.
Generalize the current thievesGuild townInterior special case into a registry of townInterior templates.
Add initial templates for tavern, generalStore, butcherShop, potionMaker, residentialHome, and keep thievesGuild working.
Add physical object/private-zone primitives for theft and break-in, but keep existing abstract guild job resolution working as fallback.
Write regression tests before and during the change: resolver footprint, wall topology, interior contracts, crime preservation, guild preservation, shop preservation, and world-generation fairness.
Run npm run typecheck, npm run test:world-generation, npm run test, and npm run build.
```
## 21. Expanded Test Case Appendix
The following granular cases are intentionally verbose to make omissions easy to spot during implementation review.
### 21.1 District cases: townCenter
APPENDIX-DISTRICT-TOWNCENTER-001: `townCenter` room exists for every rotation.
APPENDIX-DISTRICT-TOWNCENTER-002: `townCenter` room has town metadata.
APPENDIX-DISTRICT-TOWNCENTER-003: `townCenter` room maps to same town id as other core rooms.
APPENDIX-DISTRICT-TOWNCENTER-004: `townCenter` safeArea is inside layout bounds.
APPENDIX-DISTRICT-TOWNCENTER-005: `townCenter` safeArea has at least one walkable tile.
APPENDIX-DISTRICT-TOWNCENTER-006: `townCenter` external wall sides are correct for rotation.
APPENDIX-DISTRICT-TOWNCENTER-007: `townCenter` internal sides are passable to neighboring core rooms.
APPENDIX-DISTRICT-TOWNCENTER-008: `townCenter` resident anchors are not walls.
APPENDIX-DISTRICT-TOWNCENTER-009: `townCenter` interaction markers are not walls.
APPENDIX-DISTRICT-TOWNCENTER-010: `townCenter` layout has no undefined rows.
APPENDIX-DISTRICT-TOWNCENTER-011: `townCenter` layout row lengths equal grid cols.
APPENDIX-DISTRICT-TOWNCENTER-012: `townCenter` layout row count equals grid rows.
APPENDIX-DISTRICT-TOWNCENTER-013: `townCenter` does not spawn generic village/goblin/quest house structure.
APPENDIX-DISTRICT-TOWNCENTER-014: `townCenter` does not spawn random treasure/powerup by world service.
APPENDIX-DISTRICT-TOWNCENTER-015: `townCenter` town music classification is correct.
APPENDIX-DISTRICT-TOWNCENTER-016: `townCenter` turn-based movement zone includes intended interior/city floor.
APPENDIX-DISTRICT-TOWNCENTER-017: `townCenter` minimap classification does not hide all walls.
APPENDIX-DISTRICT-TOWNCENTER-018: `townCenter` renderer supports all emitted tile letters.
APPENDIX-DISTRICT-TOWNCENTER-019: `townCenter` can be cloned through cloneTown.
APPENDIX-DISTRICT-TOWNCENTER-020: `townCenter` survives updateTown propagation.
### 21.2 District cases: market
APPENDIX-DISTRICT-MARKET-001: `market` room exists for every rotation.
APPENDIX-DISTRICT-MARKET-002: `market` room has town metadata.
APPENDIX-DISTRICT-MARKET-003: `market` room maps to same town id as other core rooms.
APPENDIX-DISTRICT-MARKET-004: `market` safeArea is inside layout bounds.
APPENDIX-DISTRICT-MARKET-005: `market` safeArea has at least one walkable tile.
APPENDIX-DISTRICT-MARKET-006: `market` external wall sides are correct for rotation.
APPENDIX-DISTRICT-MARKET-007: `market` internal sides are passable to neighboring core rooms.
APPENDIX-DISTRICT-MARKET-008: `market` resident anchors are not walls.
APPENDIX-DISTRICT-MARKET-009: `market` interaction markers are not walls.
APPENDIX-DISTRICT-MARKET-010: `market` layout has no undefined rows.
APPENDIX-DISTRICT-MARKET-011: `market` layout row lengths equal grid cols.
APPENDIX-DISTRICT-MARKET-012: `market` layout row count equals grid rows.
APPENDIX-DISTRICT-MARKET-013: `market` does not spawn generic village/goblin/quest house structure.
APPENDIX-DISTRICT-MARKET-014: `market` does not spawn random treasure/powerup by world service.
APPENDIX-DISTRICT-MARKET-015: `market` town music classification is correct.
APPENDIX-DISTRICT-MARKET-016: `market` turn-based movement zone includes intended interior/city floor.
APPENDIX-DISTRICT-MARKET-017: `market` minimap classification does not hide all walls.
APPENDIX-DISTRICT-MARKET-018: `market` renderer supports all emitted tile letters.
APPENDIX-DISTRICT-MARKET-019: `market` can be cloned through cloneTown.
APPENDIX-DISTRICT-MARKET-020: `market` survives updateTown propagation.
### 21.3 District cases: residential
APPENDIX-DISTRICT-RESIDENTIAL-001: `residential` room exists for every rotation.
APPENDIX-DISTRICT-RESIDENTIAL-002: `residential` room has town metadata.
APPENDIX-DISTRICT-RESIDENTIAL-003: `residential` room maps to same town id as other core rooms.
APPENDIX-DISTRICT-RESIDENTIAL-004: `residential` safeArea is inside layout bounds.
APPENDIX-DISTRICT-RESIDENTIAL-005: `residential` safeArea has at least one walkable tile.
APPENDIX-DISTRICT-RESIDENTIAL-006: `residential` external wall sides are correct for rotation.
APPENDIX-DISTRICT-RESIDENTIAL-007: `residential` internal sides are passable to neighboring core rooms.
APPENDIX-DISTRICT-RESIDENTIAL-008: `residential` resident anchors are not walls.
APPENDIX-DISTRICT-RESIDENTIAL-009: `residential` interaction markers are not walls.
APPENDIX-DISTRICT-RESIDENTIAL-010: `residential` layout has no undefined rows.
APPENDIX-DISTRICT-RESIDENTIAL-011: `residential` layout row lengths equal grid cols.
APPENDIX-DISTRICT-RESIDENTIAL-012: `residential` layout row count equals grid rows.
APPENDIX-DISTRICT-RESIDENTIAL-013: `residential` does not spawn generic village/goblin/quest house structure.
APPENDIX-DISTRICT-RESIDENTIAL-014: `residential` does not spawn random treasure/powerup by world service.
APPENDIX-DISTRICT-RESIDENTIAL-015: `residential` town music classification is correct.
APPENDIX-DISTRICT-RESIDENTIAL-016: `residential` turn-based movement zone includes intended interior/city floor.
APPENDIX-DISTRICT-RESIDENTIAL-017: `residential` minimap classification does not hide all walls.
APPENDIX-DISTRICT-RESIDENTIAL-018: `residential` renderer supports all emitted tile letters.
APPENDIX-DISTRICT-RESIDENTIAL-019: `residential` can be cloned through cloneTown.
APPENDIX-DISTRICT-RESIDENTIAL-020: `residential` survives updateTown propagation.
### 21.4 District cases: backAlley
APPENDIX-DISTRICT-BACKALLEY-001: `backAlley` room exists for every rotation.
APPENDIX-DISTRICT-BACKALLEY-002: `backAlley` room has town metadata.
APPENDIX-DISTRICT-BACKALLEY-003: `backAlley` room maps to same town id as other core rooms.
APPENDIX-DISTRICT-BACKALLEY-004: `backAlley` safeArea is inside layout bounds.
APPENDIX-DISTRICT-BACKALLEY-005: `backAlley` safeArea has at least one walkable tile.
APPENDIX-DISTRICT-BACKALLEY-006: `backAlley` external wall sides are correct for rotation.
APPENDIX-DISTRICT-BACKALLEY-007: `backAlley` internal sides are passable to neighboring core rooms.
APPENDIX-DISTRICT-BACKALLEY-008: `backAlley` resident anchors are not walls.
APPENDIX-DISTRICT-BACKALLEY-009: `backAlley` interaction markers are not walls.
APPENDIX-DISTRICT-BACKALLEY-010: `backAlley` layout has no undefined rows.
APPENDIX-DISTRICT-BACKALLEY-011: `backAlley` layout row lengths equal grid cols.
APPENDIX-DISTRICT-BACKALLEY-012: `backAlley` layout row count equals grid rows.
APPENDIX-DISTRICT-BACKALLEY-013: `backAlley` does not spawn generic village/goblin/quest house structure.
APPENDIX-DISTRICT-BACKALLEY-014: `backAlley` does not spawn random treasure/powerup by world service.
APPENDIX-DISTRICT-BACKALLEY-015: `backAlley` town music classification is correct.
APPENDIX-DISTRICT-BACKALLEY-016: `backAlley` turn-based movement zone includes intended interior/city floor.
APPENDIX-DISTRICT-BACKALLEY-017: `backAlley` minimap classification does not hide all walls.
APPENDIX-DISTRICT-BACKALLEY-018: `backAlley` renderer supports all emitted tile letters.
APPENDIX-DISTRICT-BACKALLEY-019: `backAlley` can be cloned through cloneTown.
APPENDIX-DISTRICT-BACKALLEY-020: `backAlley` survives updateTown propagation.
### 21.5 Interior cases: generalStore
APPENDIX-INTERIOR-GENERALSTORE-001: `generalStore` template id is included in LayerTemplateId.
APPENDIX-INTERIOR-GENERALSTORE-002: `generalStore` registry can resolve template id.
APPENDIX-INTERIOR-GENERALSTORE-003: `generalStore` builder returns RoomSnapshot.
APPENDIX-INTERIOR-GENERALSTORE-004: `generalStore` RoomSnapshot.layer exists.
APPENDIX-INTERIOR-GENERALSTORE-005: `generalStore` layer.kind is townInterior.
APPENDIX-INTERIOR-GENERALSTORE-006: `generalStore` layer.templateId matches template id.
APPENDIX-INTERIOR-GENERALSTORE-007: `generalStore` layer.townId matches parent town id.
APPENDIX-INTERIOR-GENERALSTORE-008: `generalStore` RoomSnapshot.town exists and matches parent town id.
APPENDIX-INTERIOR-GENERALSTORE-009: `generalStore` boundaryMode is solidWalls.
APPENDIX-INTERIOR-GENERALSTORE-010: `generalStore` spawn is walkable.
APPENDIX-INTERIOR-GENERALSTORE-011: `generalStore` exit is walkable and marked.
APPENDIX-INTERIOR-GENERALSTORE-012: `generalStore` returnPosition points to parent room.
APPENDIX-INTERIOR-GENERALSTORE-013: `generalStore` entrance landing has two exposed sides.
APPENDIX-INTERIOR-GENERALSTORE-014: `generalStore` no NPC anchor overlaps wall.
APPENDIX-INTERIOR-GENERALSTORE-015: `generalStore` no object anchor overlaps wall.
APPENDIX-INTERIOR-GENERALSTORE-016: `generalStore` public zone exists when publicAccess is true.
APPENDIX-INTERIOR-GENERALSTORE-017: `generalStore` private zone exists when template supports crime.
APPENDIX-INTERIOR-GENERALSTORE-018: `generalStore` deterministic output for same instance seed.
APPENDIX-INTERIOR-GENERALSTORE-019: `generalStore` layout dimensions match grid.
APPENDIX-INTERIOR-GENERALSTORE-020: `generalStore` renderer supports emitted tiles.
APPENDIX-INTERIOR-GENERALSTORE-021: `generalStore` minimap classification acceptable.
APPENDIX-INTERIOR-GENERALSTORE-022: `generalStore` can enter from prompt.
APPENDIX-INTERIOR-GENERALSTORE-023: `generalStore` can exit back to parent door.
APPENDIX-INTERIOR-GENERALSTORE-024: `generalStore` town music/interior ambience classification correct.
APPENDIX-INTERIOR-GENERALSTORE-025: `generalStore` turn-based movement active inside.
### 21.6 Interior cases: tavern
APPENDIX-INTERIOR-TAVERN-001: `tavern` template id is included in LayerTemplateId.
APPENDIX-INTERIOR-TAVERN-002: `tavern` registry can resolve template id.
APPENDIX-INTERIOR-TAVERN-003: `tavern` builder returns RoomSnapshot.
APPENDIX-INTERIOR-TAVERN-004: `tavern` RoomSnapshot.layer exists.
APPENDIX-INTERIOR-TAVERN-005: `tavern` layer.kind is townInterior.
APPENDIX-INTERIOR-TAVERN-006: `tavern` layer.templateId matches template id.
APPENDIX-INTERIOR-TAVERN-007: `tavern` layer.townId matches parent town id.
APPENDIX-INTERIOR-TAVERN-008: `tavern` RoomSnapshot.town exists and matches parent town id.
APPENDIX-INTERIOR-TAVERN-009: `tavern` boundaryMode is solidWalls.
APPENDIX-INTERIOR-TAVERN-010: `tavern` spawn is walkable.
APPENDIX-INTERIOR-TAVERN-011: `tavern` exit is walkable and marked.
APPENDIX-INTERIOR-TAVERN-012: `tavern` returnPosition points to parent room.
APPENDIX-INTERIOR-TAVERN-013: `tavern` entrance landing has two exposed sides.
APPENDIX-INTERIOR-TAVERN-014: `tavern` no NPC anchor overlaps wall.
APPENDIX-INTERIOR-TAVERN-015: `tavern` no object anchor overlaps wall.
APPENDIX-INTERIOR-TAVERN-016: `tavern` public zone exists when publicAccess is true.
APPENDIX-INTERIOR-TAVERN-017: `tavern` private zone exists when template supports crime.
APPENDIX-INTERIOR-TAVERN-018: `tavern` deterministic output for same instance seed.
APPENDIX-INTERIOR-TAVERN-019: `tavern` layout dimensions match grid.
APPENDIX-INTERIOR-TAVERN-020: `tavern` renderer supports emitted tiles.
APPENDIX-INTERIOR-TAVERN-021: `tavern` minimap classification acceptable.
APPENDIX-INTERIOR-TAVERN-022: `tavern` can enter from prompt.
APPENDIX-INTERIOR-TAVERN-023: `tavern` can exit back to parent door.
APPENDIX-INTERIOR-TAVERN-024: `tavern` town music/interior ambience classification correct.
APPENDIX-INTERIOR-TAVERN-025: `tavern` turn-based movement active inside.
### 21.7 Interior cases: thievesGuild
APPENDIX-INTERIOR-THIEVESGUILD-001: `thievesGuild` template id is included in LayerTemplateId.
APPENDIX-INTERIOR-THIEVESGUILD-002: `thievesGuild` registry can resolve template id.
APPENDIX-INTERIOR-THIEVESGUILD-003: `thievesGuild` builder returns RoomSnapshot.
APPENDIX-INTERIOR-THIEVESGUILD-004: `thievesGuild` RoomSnapshot.layer exists.
APPENDIX-INTERIOR-THIEVESGUILD-005: `thievesGuild` layer.kind is townInterior.
APPENDIX-INTERIOR-THIEVESGUILD-006: `thievesGuild` layer.templateId matches template id.
APPENDIX-INTERIOR-THIEVESGUILD-007: `thievesGuild` layer.townId matches parent town id.
APPENDIX-INTERIOR-THIEVESGUILD-008: `thievesGuild` RoomSnapshot.town exists and matches parent town id.
APPENDIX-INTERIOR-THIEVESGUILD-009: `thievesGuild` boundaryMode is solidWalls.
APPENDIX-INTERIOR-THIEVESGUILD-010: `thievesGuild` spawn is walkable.
APPENDIX-INTERIOR-THIEVESGUILD-011: `thievesGuild` exit is walkable and marked.
APPENDIX-INTERIOR-THIEVESGUILD-012: `thievesGuild` returnPosition points to parent room.
APPENDIX-INTERIOR-THIEVESGUILD-013: `thievesGuild` entrance landing has two exposed sides.
APPENDIX-INTERIOR-THIEVESGUILD-014: `thievesGuild` no NPC anchor overlaps wall.
APPENDIX-INTERIOR-THIEVESGUILD-015: `thievesGuild` no object anchor overlaps wall.
APPENDIX-INTERIOR-THIEVESGUILD-016: `thievesGuild` public zone exists when publicAccess is true.
APPENDIX-INTERIOR-THIEVESGUILD-017: `thievesGuild` private zone exists when template supports crime.
APPENDIX-INTERIOR-THIEVESGUILD-018: `thievesGuild` deterministic output for same instance seed.
APPENDIX-INTERIOR-THIEVESGUILD-019: `thievesGuild` layout dimensions match grid.
APPENDIX-INTERIOR-THIEVESGUILD-020: `thievesGuild` renderer supports emitted tiles.
APPENDIX-INTERIOR-THIEVESGUILD-021: `thievesGuild` minimap classification acceptable.
APPENDIX-INTERIOR-THIEVESGUILD-022: `thievesGuild` can enter from prompt.
APPENDIX-INTERIOR-THIEVESGUILD-023: `thievesGuild` can exit back to parent door.
APPENDIX-INTERIOR-THIEVESGUILD-024: `thievesGuild` town music/interior ambience classification correct.
APPENDIX-INTERIOR-THIEVESGUILD-025: `thievesGuild` turn-based movement active inside.
### 21.8 Interior cases: butcherShop
APPENDIX-INTERIOR-BUTCHERSHOP-001: `butcherShop` template id is included in LayerTemplateId.
APPENDIX-INTERIOR-BUTCHERSHOP-002: `butcherShop` registry can resolve template id.
APPENDIX-INTERIOR-BUTCHERSHOP-003: `butcherShop` builder returns RoomSnapshot.
APPENDIX-INTERIOR-BUTCHERSHOP-004: `butcherShop` RoomSnapshot.layer exists.
APPENDIX-INTERIOR-BUTCHERSHOP-005: `butcherShop` layer.kind is townInterior.
APPENDIX-INTERIOR-BUTCHERSHOP-006: `butcherShop` layer.templateId matches template id.
APPENDIX-INTERIOR-BUTCHERSHOP-007: `butcherShop` layer.townId matches parent town id.
APPENDIX-INTERIOR-BUTCHERSHOP-008: `butcherShop` RoomSnapshot.town exists and matches parent town id.
APPENDIX-INTERIOR-BUTCHERSHOP-009: `butcherShop` boundaryMode is solidWalls.
APPENDIX-INTERIOR-BUTCHERSHOP-010: `butcherShop` spawn is walkable.
APPENDIX-INTERIOR-BUTCHERSHOP-011: `butcherShop` exit is walkable and marked.
APPENDIX-INTERIOR-BUTCHERSHOP-012: `butcherShop` returnPosition points to parent room.
APPENDIX-INTERIOR-BUTCHERSHOP-013: `butcherShop` entrance landing has two exposed sides.
APPENDIX-INTERIOR-BUTCHERSHOP-014: `butcherShop` no NPC anchor overlaps wall.
APPENDIX-INTERIOR-BUTCHERSHOP-015: `butcherShop` no object anchor overlaps wall.
APPENDIX-INTERIOR-BUTCHERSHOP-016: `butcherShop` public zone exists when publicAccess is true.
APPENDIX-INTERIOR-BUTCHERSHOP-017: `butcherShop` private zone exists when template supports crime.
APPENDIX-INTERIOR-BUTCHERSHOP-018: `butcherShop` deterministic output for same instance seed.
APPENDIX-INTERIOR-BUTCHERSHOP-019: `butcherShop` layout dimensions match grid.
APPENDIX-INTERIOR-BUTCHERSHOP-020: `butcherShop` renderer supports emitted tiles.
APPENDIX-INTERIOR-BUTCHERSHOP-021: `butcherShop` minimap classification acceptable.
APPENDIX-INTERIOR-BUTCHERSHOP-022: `butcherShop` can enter from prompt.
APPENDIX-INTERIOR-BUTCHERSHOP-023: `butcherShop` can exit back to parent door.
APPENDIX-INTERIOR-BUTCHERSHOP-024: `butcherShop` town music/interior ambience classification correct.
APPENDIX-INTERIOR-BUTCHERSHOP-025: `butcherShop` turn-based movement active inside.
### 21.9 Interior cases: potionMaker
APPENDIX-INTERIOR-POTIONMAKER-001: `potionMaker` template id is included in LayerTemplateId.
APPENDIX-INTERIOR-POTIONMAKER-002: `potionMaker` registry can resolve template id.
APPENDIX-INTERIOR-POTIONMAKER-003: `potionMaker` builder returns RoomSnapshot.
APPENDIX-INTERIOR-POTIONMAKER-004: `potionMaker` RoomSnapshot.layer exists.
APPENDIX-INTERIOR-POTIONMAKER-005: `potionMaker` layer.kind is townInterior.
APPENDIX-INTERIOR-POTIONMAKER-006: `potionMaker` layer.templateId matches template id.
APPENDIX-INTERIOR-POTIONMAKER-007: `potionMaker` layer.townId matches parent town id.
APPENDIX-INTERIOR-POTIONMAKER-008: `potionMaker` RoomSnapshot.town exists and matches parent town id.
APPENDIX-INTERIOR-POTIONMAKER-009: `potionMaker` boundaryMode is solidWalls.
APPENDIX-INTERIOR-POTIONMAKER-010: `potionMaker` spawn is walkable.
APPENDIX-INTERIOR-POTIONMAKER-011: `potionMaker` exit is walkable and marked.
APPENDIX-INTERIOR-POTIONMAKER-012: `potionMaker` returnPosition points to parent room.
APPENDIX-INTERIOR-POTIONMAKER-013: `potionMaker` entrance landing has two exposed sides.
APPENDIX-INTERIOR-POTIONMAKER-014: `potionMaker` no NPC anchor overlaps wall.
APPENDIX-INTERIOR-POTIONMAKER-015: `potionMaker` no object anchor overlaps wall.
APPENDIX-INTERIOR-POTIONMAKER-016: `potionMaker` public zone exists when publicAccess is true.
APPENDIX-INTERIOR-POTIONMAKER-017: `potionMaker` private zone exists when template supports crime.
APPENDIX-INTERIOR-POTIONMAKER-018: `potionMaker` deterministic output for same instance seed.
APPENDIX-INTERIOR-POTIONMAKER-019: `potionMaker` layout dimensions match grid.
APPENDIX-INTERIOR-POTIONMAKER-020: `potionMaker` renderer supports emitted tiles.
APPENDIX-INTERIOR-POTIONMAKER-021: `potionMaker` minimap classification acceptable.
APPENDIX-INTERIOR-POTIONMAKER-022: `potionMaker` can enter from prompt.
APPENDIX-INTERIOR-POTIONMAKER-023: `potionMaker` can exit back to parent door.
APPENDIX-INTERIOR-POTIONMAKER-024: `potionMaker` town music/interior ambience classification correct.
APPENDIX-INTERIOR-POTIONMAKER-025: `potionMaker` turn-based movement active inside.
### 21.10 Interior cases: residentialHome
APPENDIX-INTERIOR-RESIDENTIALHOME-001: `residentialHome` template id is included in LayerTemplateId.
APPENDIX-INTERIOR-RESIDENTIALHOME-002: `residentialHome` registry can resolve template id.
APPENDIX-INTERIOR-RESIDENTIALHOME-003: `residentialHome` builder returns RoomSnapshot.
APPENDIX-INTERIOR-RESIDENTIALHOME-004: `residentialHome` RoomSnapshot.layer exists.
APPENDIX-INTERIOR-RESIDENTIALHOME-005: `residentialHome` layer.kind is townInterior.
APPENDIX-INTERIOR-RESIDENTIALHOME-006: `residentialHome` layer.templateId matches template id.
APPENDIX-INTERIOR-RESIDENTIALHOME-007: `residentialHome` layer.townId matches parent town id.
APPENDIX-INTERIOR-RESIDENTIALHOME-008: `residentialHome` RoomSnapshot.town exists and matches parent town id.
APPENDIX-INTERIOR-RESIDENTIALHOME-009: `residentialHome` boundaryMode is solidWalls.
APPENDIX-INTERIOR-RESIDENTIALHOME-010: `residentialHome` spawn is walkable.
APPENDIX-INTERIOR-RESIDENTIALHOME-011: `residentialHome` exit is walkable and marked.
APPENDIX-INTERIOR-RESIDENTIALHOME-012: `residentialHome` returnPosition points to parent room.
APPENDIX-INTERIOR-RESIDENTIALHOME-013: `residentialHome` entrance landing has two exposed sides.
APPENDIX-INTERIOR-RESIDENTIALHOME-014: `residentialHome` no NPC anchor overlaps wall.
APPENDIX-INTERIOR-RESIDENTIALHOME-015: `residentialHome` no object anchor overlaps wall.
APPENDIX-INTERIOR-RESIDENTIALHOME-016: `residentialHome` public zone exists when publicAccess is true.
APPENDIX-INTERIOR-RESIDENTIALHOME-017: `residentialHome` private zone exists when template supports crime.
APPENDIX-INTERIOR-RESIDENTIALHOME-018: `residentialHome` deterministic output for same instance seed.
APPENDIX-INTERIOR-RESIDENTIALHOME-019: `residentialHome` layout dimensions match grid.
APPENDIX-INTERIOR-RESIDENTIALHOME-020: `residentialHome` renderer supports emitted tiles.
APPENDIX-INTERIOR-RESIDENTIALHOME-021: `residentialHome` minimap classification acceptable.
APPENDIX-INTERIOR-RESIDENTIALHOME-022: `residentialHome` can enter from prompt.
APPENDIX-INTERIOR-RESIDENTIALHOME-023: `residentialHome` can exit back to parent door.
APPENDIX-INTERIOR-RESIDENTIALHOME-024: `residentialHome` town music/interior ambience classification correct.
APPENDIX-INTERIOR-RESIDENTIALHOME-025: `residentialHome` turn-based movement active inside.
### 21.11 Compatibility cases: generateHumanTown
APPENDIX-COMPAT-GENERATEHUMANTOWN-001: `generateHumanTown` export still exists. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
APPENDIX-COMPAT-GENERATEHUMANTOWN-002: `generateHumanTown` TypeScript import still compiles. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
APPENDIX-COMPAT-GENERATEHUMANTOWN-003: `generateHumanTown` old caller shape still accepted. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
APPENDIX-COMPAT-GENERATEHUMANTOWN-004: `generateHumanTown` new canonical model path covered. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
APPENDIX-COMPAT-GENERATEHUMANTOWN-005: `generateHumanTown` legacy district names normalized where applicable. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
APPENDIX-COMPAT-GENERATEHUMANTOWN-006: `generateHumanTown` does not mutate input unexpectedly unless current behavior already does. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
APPENDIX-COMPAT-GENERATEHUMANTOWN-007: `generateHumanTown` has at least one focused unit test or integration assertion. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
APPENDIX-COMPAT-GENERATEHUMANTOWN-008: `generateHumanTown` documented in migration matrix. Current purpose: Create logical town with name, mood, laws, notices, rooms, guild state, and default clerk.
### 21.12 Compatibility cases: createPhysicalHumanTown
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-001: `createPhysicalHumanTown` export still exists. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-002: `createPhysicalHumanTown` TypeScript import still compiles. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-003: `createPhysicalHumanTown` old caller shape still accepted. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-004: `createPhysicalHumanTown` new canonical model path covered. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-005: `createPhysicalHumanTown` legacy district names normalized where applicable. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-006: `createPhysicalHumanTown` does not mutate input unexpectedly unless current behavior already does. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-007: `createPhysicalHumanTown` has at least one focused unit test or integration assertion. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
APPENDIX-COMPAT-CREATEPHYSICALHUMANTOWN-008: `createPhysicalHumanTown` documented in migration matrix. Current purpose: Bind a logical town to physical room ids, place residents, assign home/work rooms, choose primary merchant.
### 21.13 Compatibility cases: getTownRoom
APPENDIX-COMPAT-GETTOWNROOM-001: `getTownRoom` export still exists. Current purpose: Find logical TownRoomNode by id.
APPENDIX-COMPAT-GETTOWNROOM-002: `getTownRoom` TypeScript import still compiles. Current purpose: Find logical TownRoomNode by id.
APPENDIX-COMPAT-GETTOWNROOM-003: `getTownRoom` old caller shape still accepted. Current purpose: Find logical TownRoomNode by id.
APPENDIX-COMPAT-GETTOWNROOM-004: `getTownRoom` new canonical model path covered. Current purpose: Find logical TownRoomNode by id.
APPENDIX-COMPAT-GETTOWNROOM-005: `getTownRoom` legacy district names normalized where applicable. Current purpose: Find logical TownRoomNode by id.
APPENDIX-COMPAT-GETTOWNROOM-006: `getTownRoom` does not mutate input unexpectedly unless current behavior already does. Current purpose: Find logical TownRoomNode by id.
APPENDIX-COMPAT-GETTOWNROOM-007: `getTownRoom` has at least one focused unit test or integration assertion. Current purpose: Find logical TownRoomNode by id.
APPENDIX-COMPAT-GETTOWNROOM-008: `getTownRoom` documented in migration matrix. Current purpose: Find logical TownRoomNode by id.
### 21.14 Compatibility cases: getTownDistrictForRoom
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-001: `getTownDistrictForRoom` export still exists. Current purpose: Map physical room id or layer room id to TownDistrictKind.
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-002: `getTownDistrictForRoom` TypeScript import still compiles. Current purpose: Map physical room id or layer room id to TownDistrictKind.
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-003: `getTownDistrictForRoom` old caller shape still accepted. Current purpose: Map physical room id or layer room id to TownDistrictKind.
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-004: `getTownDistrictForRoom` new canonical model path covered. Current purpose: Map physical room id or layer room id to TownDistrictKind.
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-005: `getTownDistrictForRoom` legacy district names normalized where applicable. Current purpose: Map physical room id or layer room id to TownDistrictKind.
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-006: `getTownDistrictForRoom` does not mutate input unexpectedly unless current behavior already does. Current purpose: Map physical room id or layer room id to TownDistrictKind.
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-007: `getTownDistrictForRoom` has at least one focused unit test or integration assertion. Current purpose: Map physical room id or layer room id to TownDistrictKind.
APPENDIX-COMPAT-GETTOWNDISTRICTFORROOM-008: `getTownDistrictForRoom` documented in migration matrix. Current purpose: Map physical room id or layer room id to TownDistrictKind.
### 21.15 Compatibility cases: townDistrictDisplayName
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-001: `townDistrictDisplayName` export still exists. Current purpose: User-facing district labels.
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-002: `townDistrictDisplayName` TypeScript import still compiles. Current purpose: User-facing district labels.
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-003: `townDistrictDisplayName` old caller shape still accepted. Current purpose: User-facing district labels.
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-004: `townDistrictDisplayName` new canonical model path covered. Current purpose: User-facing district labels.
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-005: `townDistrictDisplayName` legacy district names normalized where applicable. Current purpose: User-facing district labels.
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-006: `townDistrictDisplayName` does not mutate input unexpectedly unless current behavior already does. Current purpose: User-facing district labels.
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-007: `townDistrictDisplayName` has at least one focused unit test or integration assertion. Current purpose: User-facing district labels.
APPENDIX-COMPAT-TOWNDISTRICTDISPLAYNAME-008: `townDistrictDisplayName` documented in migration matrix. Current purpose: User-facing district labels.
### 21.16 Compatibility cases: townShopKindForResidentRole
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-001: `townShopKindForResidentRole` export still exists. Current purpose: Map resident roles to shop kind.
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-002: `townShopKindForResidentRole` TypeScript import still compiles. Current purpose: Map resident roles to shop kind.
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-003: `townShopKindForResidentRole` old caller shape still accepted. Current purpose: Map resident roles to shop kind.
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-004: `townShopKindForResidentRole` new canonical model path covered. Current purpose: Map resident roles to shop kind.
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-005: `townShopKindForResidentRole` legacy district names normalized where applicable. Current purpose: Map resident roles to shop kind.
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-006: `townShopKindForResidentRole` does not mutate input unexpectedly unless current behavior already does. Current purpose: Map resident roles to shop kind.
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-007: `townShopKindForResidentRole` has at least one focused unit test or integration assertion. Current purpose: Map resident roles to shop kind.
APPENDIX-COMPAT-TOWNSHOPKINDFORRESIDENTROLE-008: `townShopKindForResidentRole` documented in migration matrix. Current purpose: Map resident roles to shop kind.
### 21.17 Compatibility cases: applyTownCrime
APPENDIX-COMPAT-APPLYTOWNCRIME-001: `applyTownCrime` export still exists. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
APPENDIX-COMPAT-APPLYTOWNCRIME-002: `applyTownCrime` TypeScript import still compiles. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
APPENDIX-COMPAT-APPLYTOWNCRIME-003: `applyTownCrime` old caller shape still accepted. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
APPENDIX-COMPAT-APPLYTOWNCRIME-004: `applyTownCrime` new canonical model path covered. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
APPENDIX-COMPAT-APPLYTOWNCRIME-005: `applyTownCrime` legacy district names normalized where applicable. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
APPENDIX-COMPAT-APPLYTOWNCRIME-006: `applyTownCrime` does not mutate input unexpectedly unless current behavior already does. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
APPENDIX-COMPAT-APPLYTOWNCRIME-007: `applyTownCrime` has at least one focused unit test or integration assertion. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
APPENDIX-COMPAT-APPLYTOWNCRIME-008: `applyTownCrime` documented in migration matrix. Current purpose: Mutate wanted/reputation/suspicion/rumors for crimes.
### 21.18 Compatibility cases: maybeTriggerPatrol
APPENDIX-COMPAT-MAYBETRIGGERPATROL-001: `maybeTriggerPatrol` export still exists. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
APPENDIX-COMPAT-MAYBETRIGGERPATROL-002: `maybeTriggerPatrol` TypeScript import still compiles. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
APPENDIX-COMPAT-MAYBETRIGGERPATROL-003: `maybeTriggerPatrol` old caller shape still accepted. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
APPENDIX-COMPAT-MAYBETRIGGERPATROL-004: `maybeTriggerPatrol` new canonical model path covered. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
APPENDIX-COMPAT-MAYBETRIGGERPATROL-005: `maybeTriggerPatrol` legacy district names normalized where applicable. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
APPENDIX-COMPAT-MAYBETRIGGERPATROL-006: `maybeTriggerPatrol` does not mutate input unexpectedly unless current behavior already does. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
APPENDIX-COMPAT-MAYBETRIGGERPATROL-007: `maybeTriggerPatrol` has at least one focused unit test or integration assertion. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
APPENDIX-COMPAT-MAYBETRIGGERPATROL-008: `maybeTriggerPatrol` documented in migration matrix. Current purpose: Roll a patrol encounter based on wanted level, destination room kind, and guild karma.
### 21.19 Compatibility cases: getPatrolChance
APPENDIX-COMPAT-GETPATROLCHANCE-001: `getPatrolChance` export still exists. Current purpose: Calculate patrol chance.
APPENDIX-COMPAT-GETPATROLCHANCE-002: `getPatrolChance` TypeScript import still compiles. Current purpose: Calculate patrol chance.
APPENDIX-COMPAT-GETPATROLCHANCE-003: `getPatrolChance` old caller shape still accepted. Current purpose: Calculate patrol chance.
APPENDIX-COMPAT-GETPATROLCHANCE-004: `getPatrolChance` new canonical model path covered. Current purpose: Calculate patrol chance.
APPENDIX-COMPAT-GETPATROLCHANCE-005: `getPatrolChance` legacy district names normalized where applicable. Current purpose: Calculate patrol chance.
APPENDIX-COMPAT-GETPATROLCHANCE-006: `getPatrolChance` does not mutate input unexpectedly unless current behavior already does. Current purpose: Calculate patrol chance.
APPENDIX-COMPAT-GETPATROLCHANCE-007: `getPatrolChance` has at least one focused unit test or integration assertion. Current purpose: Calculate patrol chance.
APPENDIX-COMPAT-GETPATROLCHANCE-008: `getPatrolChance` documented in migration matrix. Current purpose: Calculate patrol chance.
### 21.20 Compatibility cases: discoverThievesGuild
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-001: `discoverThievesGuild` export still exists. Current purpose: Reveal guild, mark room discovered, add rumor.
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-002: `discoverThievesGuild` TypeScript import still compiles. Current purpose: Reveal guild, mark room discovered, add rumor.
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-003: `discoverThievesGuild` old caller shape still accepted. Current purpose: Reveal guild, mark room discovered, add rumor.
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-004: `discoverThievesGuild` new canonical model path covered. Current purpose: Reveal guild, mark room discovered, add rumor.
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-005: `discoverThievesGuild` legacy district names normalized where applicable. Current purpose: Reveal guild, mark room discovered, add rumor.
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-006: `discoverThievesGuild` does not mutate input unexpectedly unless current behavior already does. Current purpose: Reveal guild, mark room discovered, add rumor.
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-007: `discoverThievesGuild` has at least one focused unit test or integration assertion. Current purpose: Reveal guild, mark room discovered, add rumor.
APPENDIX-COMPAT-DISCOVERTHIEVESGUILD-008: `discoverThievesGuild` documented in migration matrix. Current purpose: Reveal guild, mark room discovered, add rumor.
### 21.21 Compatibility cases: reduceWantedViaGuild
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-001: `reduceWantedViaGuild` export still exists. Current purpose: Spend score/karma path for wanted reduction.
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-002: `reduceWantedViaGuild` TypeScript import still compiles. Current purpose: Spend score/karma path for wanted reduction.
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-003: `reduceWantedViaGuild` old caller shape still accepted. Current purpose: Spend score/karma path for wanted reduction.
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-004: `reduceWantedViaGuild` new canonical model path covered. Current purpose: Spend score/karma path for wanted reduction.
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-005: `reduceWantedViaGuild` legacy district names normalized where applicable. Current purpose: Spend score/karma path for wanted reduction.
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-006: `reduceWantedViaGuild` does not mutate input unexpectedly unless current behavior already does. Current purpose: Spend score/karma path for wanted reduction.
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-007: `reduceWantedViaGuild` has at least one focused unit test or integration assertion. Current purpose: Spend score/karma path for wanted reduction.
APPENDIX-COMPAT-REDUCEWANTEDVIAGUILD-008: `reduceWantedViaGuild` documented in migration matrix. Current purpose: Spend score/karma path for wanted reduction.
### 21.22 Compatibility cases: resolveGuildJob
APPENDIX-COMPAT-RESOLVEGUILDJOB-001: `resolveGuildJob` export still exists. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
APPENDIX-COMPAT-RESOLVEGUILDJOB-002: `resolveGuildJob` TypeScript import still compiles. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
APPENDIX-COMPAT-RESOLVEGUILDJOB-003: `resolveGuildJob` old caller shape still accepted. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
APPENDIX-COMPAT-RESOLVEGUILDJOB-004: `resolveGuildJob` new canonical model path covered. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
APPENDIX-COMPAT-RESOLVEGUILDJOB-005: `resolveGuildJob` legacy district names normalized where applicable. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
APPENDIX-COMPAT-RESOLVEGUILDJOB-006: `resolveGuildJob` does not mutate input unexpectedly unless current behavior already does. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
APPENDIX-COMPAT-RESOLVEGUILDJOB-007: `resolveGuildJob` has at least one focused unit test or integration assertion. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
APPENDIX-COMPAT-RESOLVEGUILDJOB-008: `resolveGuildJob` documented in migration matrix. Current purpose: Resolve guild job success/failure and update guild karma/wanted state.
### 21.23 Compatibility cases: cloneTown
APPENDIX-COMPAT-CLONETOWN-001: `cloneTown` export still exists. Current purpose: Deep-enough town clone for immutable state updates.
APPENDIX-COMPAT-CLONETOWN-002: `cloneTown` TypeScript import still compiles. Current purpose: Deep-enough town clone for immutable state updates.
APPENDIX-COMPAT-CLONETOWN-003: `cloneTown` old caller shape still accepted. Current purpose: Deep-enough town clone for immutable state updates.
APPENDIX-COMPAT-CLONETOWN-004: `cloneTown` new canonical model path covered. Current purpose: Deep-enough town clone for immutable state updates.
APPENDIX-COMPAT-CLONETOWN-005: `cloneTown` legacy district names normalized where applicable. Current purpose: Deep-enough town clone for immutable state updates.
APPENDIX-COMPAT-CLONETOWN-006: `cloneTown` does not mutate input unexpectedly unless current behavior already does. Current purpose: Deep-enough town clone for immutable state updates.
APPENDIX-COMPAT-CLONETOWN-007: `cloneTown` has at least one focused unit test or integration assertion. Current purpose: Deep-enough town clone for immutable state updates.
APPENDIX-COMPAT-CLONETOWN-008: `cloneTown` documented in migration matrix. Current purpose: Deep-enough town clone for immutable state updates.
### 21.24 Compatibility cases: stampTownBoundaryApproach
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-001: `stampTownBoundaryApproach` export still exists. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-002: `stampTownBoundaryApproach` TypeScript import still compiles. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-003: `stampTownBoundaryApproach` old caller shape still accepted. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-004: `stampTownBoundaryApproach` new canonical model path covered. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-005: `stampTownBoundaryApproach` legacy district names normalized where applicable. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-006: `stampTownBoundaryApproach` does not mutate input unexpectedly unless current behavior already does. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-007: `stampTownBoundaryApproach` has at least one focused unit test or integration assertion. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYAPPROACH-008: `stampTownBoundaryApproach` documented in migration matrix. Current purpose: Stamp town-facing wall/opening on an adjacent outside room.
### 21.25 Compatibility cases: stampTownBoundaryCorner
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-001: `stampTownBoundaryCorner` export still exists. Current purpose: Stamp corner wall on diagonal town perimeter room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-002: `stampTownBoundaryCorner` TypeScript import still compiles. Current purpose: Stamp corner wall on diagonal town perimeter room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-003: `stampTownBoundaryCorner` old caller shape still accepted. Current purpose: Stamp corner wall on diagonal town perimeter room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-004: `stampTownBoundaryCorner` new canonical model path covered. Current purpose: Stamp corner wall on diagonal town perimeter room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-005: `stampTownBoundaryCorner` legacy district names normalized where applicable. Current purpose: Stamp corner wall on diagonal town perimeter room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-006: `stampTownBoundaryCorner` does not mutate input unexpectedly unless current behavior already does. Current purpose: Stamp corner wall on diagonal town perimeter room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-007: `stampTownBoundaryCorner` has at least one focused unit test or integration assertion. Current purpose: Stamp corner wall on diagonal town perimeter room.
APPENDIX-COMPAT-STAMPTOWNBOUNDARYCORNER-008: `stampTownBoundaryCorner` documented in migration matrix. Current purpose: Stamp corner wall on diagonal town perimeter room.
### 21.26 Compatibility cases: createTownDistrictRoom
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-001: `createTownDistrictRoom` export still exists. Current purpose: Render a physical town district RoomSnapshot.
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-002: `createTownDistrictRoom` TypeScript import still compiles. Current purpose: Render a physical town district RoomSnapshot.
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-003: `createTownDistrictRoom` old caller shape still accepted. Current purpose: Render a physical town district RoomSnapshot.
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-004: `createTownDistrictRoom` new canonical model path covered. Current purpose: Render a physical town district RoomSnapshot.
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-005: `createTownDistrictRoom` legacy district names normalized where applicable. Current purpose: Render a physical town district RoomSnapshot.
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-006: `createTownDistrictRoom` does not mutate input unexpectedly unless current behavior already does. Current purpose: Render a physical town district RoomSnapshot.
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-007: `createTownDistrictRoom` has at least one focused unit test or integration assertion. Current purpose: Render a physical town district RoomSnapshot.
APPENDIX-COMPAT-CREATETOWNDISTRICTROOM-008: `createTownDistrictRoom` documented in migration matrix. Current purpose: Render a physical town district RoomSnapshot.
### 21.27 Crime cases: theft
APPENDIX-CRIME-THEFT-001: `theft` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-THEFT-002: `theft` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-THEFT-003: `theft` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-THEFT-004: `theft` suspicion contribution clamps correctly.
APPENDIX-CRIME-THEFT-005: `theft` rumor generation includes sensible summary.
APPENDIX-CRIME-THEFT-006: `theft` witnessed path tested.
APPENDIX-CRIME-THEFT-007: `theft` unwitnessed path tested if applicable.
APPENDIX-CRIME-THEFT-008: `theft` physical object/zone path tested if applicable.
APPENDIX-CRIME-THEFT-009: `theft` guild interaction path tested if applicable.
APPENDIX-CRIME-THEFT-010: `theft` UI feedback tested or manually verified.
### 21.28 Crime cases: shopRobbery
APPENDIX-CRIME-SHOPROBBERY-001: `shopRobbery` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-SHOPROBBERY-002: `shopRobbery` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-SHOPROBBERY-003: `shopRobbery` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-SHOPROBBERY-004: `shopRobbery` suspicion contribution clamps correctly.
APPENDIX-CRIME-SHOPROBBERY-005: `shopRobbery` rumor generation includes sensible summary.
APPENDIX-CRIME-SHOPROBBERY-006: `shopRobbery` witnessed path tested.
APPENDIX-CRIME-SHOPROBBERY-007: `shopRobbery` unwitnessed path tested if applicable.
APPENDIX-CRIME-SHOPROBBERY-008: `shopRobbery` physical object/zone path tested if applicable.
APPENDIX-CRIME-SHOPROBBERY-009: `shopRobbery` guild interaction path tested if applicable.
APPENDIX-CRIME-SHOPROBBERY-010: `shopRobbery` UI feedback tested or manually verified.
### 21.29 Crime cases: breakIn
APPENDIX-CRIME-BREAKIN-001: `breakIn` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-BREAKIN-002: `breakIn` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-BREAKIN-003: `breakIn` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-BREAKIN-004: `breakIn` suspicion contribution clamps correctly.
APPENDIX-CRIME-BREAKIN-005: `breakIn` rumor generation includes sensible summary.
APPENDIX-CRIME-BREAKIN-006: `breakIn` witnessed path tested.
APPENDIX-CRIME-BREAKIN-007: `breakIn` unwitnessed path tested if applicable.
APPENDIX-CRIME-BREAKIN-008: `breakIn` physical object/zone path tested if applicable.
APPENDIX-CRIME-BREAKIN-009: `breakIn` guild interaction path tested if applicable.
APPENDIX-CRIME-BREAKIN-010: `breakIn` UI feedback tested or manually verified.
### 21.30 Crime cases: assault
APPENDIX-CRIME-ASSAULT-001: `assault` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-ASSAULT-002: `assault` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-ASSAULT-003: `assault` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-ASSAULT-004: `assault` suspicion contribution clamps correctly.
APPENDIX-CRIME-ASSAULT-005: `assault` rumor generation includes sensible summary.
APPENDIX-CRIME-ASSAULT-006: `assault` witnessed path tested.
APPENDIX-CRIME-ASSAULT-007: `assault` unwitnessed path tested if applicable.
APPENDIX-CRIME-ASSAULT-008: `assault` physical object/zone path tested if applicable.
APPENDIX-CRIME-ASSAULT-009: `assault` guild interaction path tested if applicable.
APPENDIX-CRIME-ASSAULT-010: `assault` UI feedback tested or manually verified.
### 21.31 Crime cases: murder
APPENDIX-CRIME-MURDER-001: `murder` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-MURDER-002: `murder` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-MURDER-003: `murder` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-MURDER-004: `murder` suspicion contribution clamps correctly.
APPENDIX-CRIME-MURDER-005: `murder` rumor generation includes sensible summary.
APPENDIX-CRIME-MURDER-006: `murder` witnessed path tested.
APPENDIX-CRIME-MURDER-007: `murder` unwitnessed path tested if applicable.
APPENDIX-CRIME-MURDER-008: `murder` physical object/zone path tested if applicable.
APPENDIX-CRIME-MURDER-009: `murder` guild interaction path tested if applicable.
APPENDIX-CRIME-MURDER-010: `murder` UI feedback tested or manually verified.
### 21.32 Crime cases: guildJobDiscovered
APPENDIX-CRIME-GUILDJOBDISCOVERED-001: `guildJobDiscovered` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-GUILDJOBDISCOVERED-002: `guildJobDiscovered` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-GUILDJOBDISCOVERED-003: `guildJobDiscovered` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-GUILDJOBDISCOVERED-004: `guildJobDiscovered` suspicion contribution clamps correctly.
APPENDIX-CRIME-GUILDJOBDISCOVERED-005: `guildJobDiscovered` rumor generation includes sensible summary.
APPENDIX-CRIME-GUILDJOBDISCOVERED-006: `guildJobDiscovered` witnessed path tested.
APPENDIX-CRIME-GUILDJOBDISCOVERED-007: `guildJobDiscovered` unwitnessed path tested if applicable.
APPENDIX-CRIME-GUILDJOBDISCOVERED-008: `guildJobDiscovered` physical object/zone path tested if applicable.
APPENDIX-CRIME-GUILDJOBDISCOVERED-009: `guildJobDiscovered` guild interaction path tested if applicable.
APPENDIX-CRIME-GUILDJOBDISCOVERED-010: `guildJobDiscovered` UI feedback tested or manually verified.
### 21.33 Crime cases: romanticPublicMurder
APPENDIX-CRIME-ROMANTICPUBLICMURDER-001: `romanticPublicMurder` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-002: `romanticPublicMurder` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-003: `romanticPublicMurder` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-004: `romanticPublicMurder` suspicion contribution clamps correctly.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-005: `romanticPublicMurder` rumor generation includes sensible summary.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-006: `romanticPublicMurder` witnessed path tested.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-007: `romanticPublicMurder` unwitnessed path tested if applicable.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-008: `romanticPublicMurder` physical object/zone path tested if applicable.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-009: `romanticPublicMurder` guild interaction path tested if applicable.
APPENDIX-CRIME-ROMANTICPUBLICMURDER-010: `romanticPublicMurder` UI feedback tested or manually verified.
### 21.34 Crime cases: biteGuard
APPENDIX-CRIME-BITEGUARD-001: `biteGuard` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-BITEGUARD-002: `biteGuard` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-BITEGUARD-003: `biteGuard` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-BITEGUARD-004: `biteGuard` suspicion contribution clamps correctly.
APPENDIX-CRIME-BITEGUARD-005: `biteGuard` rumor generation includes sensible summary.
APPENDIX-CRIME-BITEGUARD-006: `biteGuard` witnessed path tested.
APPENDIX-CRIME-BITEGUARD-007: `biteGuard` unwitnessed path tested if applicable.
APPENDIX-CRIME-BITEGUARD-008: `biteGuard` physical object/zone path tested if applicable.
APPENDIX-CRIME-BITEGUARD-009: `biteGuard` guild interaction path tested if applicable.
APPENDIX-CRIME-BITEGUARD-010: `biteGuard` UI feedback tested or manually verified.
### 21.35 Crime cases: curfewViolation
APPENDIX-CRIME-CURFEWVIOLATION-001: `curfewViolation` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-CURFEWVIOLATION-002: `curfewViolation` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-CURFEWVIOLATION-003: `curfewViolation` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-CURFEWVIOLATION-004: `curfewViolation` suspicion contribution clamps correctly.
APPENDIX-CRIME-CURFEWVIOLATION-005: `curfewViolation` rumor generation includes sensible summary.
APPENDIX-CRIME-CURFEWVIOLATION-006: `curfewViolation` witnessed path tested.
APPENDIX-CRIME-CURFEWVIOLATION-007: `curfewViolation` unwitnessed path tested if applicable.
APPENDIX-CRIME-CURFEWVIOLATION-008: `curfewViolation` physical object/zone path tested if applicable.
APPENDIX-CRIME-CURFEWVIOLATION-009: `curfewViolation` guild interaction path tested if applicable.
APPENDIX-CRIME-CURFEWVIOLATION-010: `curfewViolation` UI feedback tested or manually verified.
### 21.36 Crime cases: fakePermit
APPENDIX-CRIME-FAKEPERMIT-001: `fakePermit` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-FAKEPERMIT-002: `fakePermit` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-FAKEPERMIT-003: `fakePermit` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-FAKEPERMIT-004: `fakePermit` suspicion contribution clamps correctly.
APPENDIX-CRIME-FAKEPERMIT-005: `fakePermit` rumor generation includes sensible summary.
APPENDIX-CRIME-FAKEPERMIT-006: `fakePermit` witnessed path tested.
APPENDIX-CRIME-FAKEPERMIT-007: `fakePermit` unwitnessed path tested if applicable.
APPENDIX-CRIME-FAKEPERMIT-008: `fakePermit` physical object/zone path tested if applicable.
APPENDIX-CRIME-FAKEPERMIT-009: `fakePermit` guild interaction path tested if applicable.
APPENDIX-CRIME-FAKEPERMIT-010: `fakePermit` UI feedback tested or manually verified.
### 21.37 Crime cases: refuseFine
APPENDIX-CRIME-REFUSEFINE-001: `refuseFine` applyTownCrime accepts the crime kind.
APPENDIX-CRIME-REFUSEFINE-002: `refuseFine` wanted delta remains compatible with current balancing.
APPENDIX-CRIME-REFUSEFINE-003: `refuseFine` reputation delta remains compatible with current balancing.
APPENDIX-CRIME-REFUSEFINE-004: `refuseFine` suspicion contribution clamps correctly.
APPENDIX-CRIME-REFUSEFINE-005: `refuseFine` rumor generation includes sensible summary.
APPENDIX-CRIME-REFUSEFINE-006: `refuseFine` witnessed path tested.
APPENDIX-CRIME-REFUSEFINE-007: `refuseFine` unwitnessed path tested if applicable.
APPENDIX-CRIME-REFUSEFINE-008: `refuseFine` physical object/zone path tested if applicable.
APPENDIX-CRIME-REFUSEFINE-009: `refuseFine` guild interaction path tested if applicable.
APPENDIX-CRIME-REFUSEFINE-010: `refuseFine` UI feedback tested or manually verified.
## 22. Definition Of Done
DOD-001: All current town functions remain importable.
DOD-002: Four core town districts render in a 2x2 core.
DOD-003: Four-by-four influence footprint is deterministic and test-covered.
DOD-004: No internal city wall blocks movement between core districts.
DOD-005: External wall and approach openings align.
DOD-006: Tavern exists as a town interior and performs all old tavern-facing jobs.
DOD-007: Thieves guild still works and is backed by generic interior registry.
DOD-008: General store, butcher, potion maker, and residential homes have first-pass interiors or explicit stubs with tests.
DOD-009: Physical crime primitives exist for owned objects/private zones, even if some gameplay remains abstract in first pass.
DOD-010: Quest board, guild grate, shops, residents, guards, town reveal, music, and turn-based movement still work.
DOD-011: World-generation fairness tests pass.
DOD-012: New town-specific regression tests pass.
DOD-013: Typecheck passes.
DOD-014: Build passes.
DOD-015: Manual QA has been run for four rotations.
## 23. Implementation Notes By File
### src/world/generation/townStructureResolver.ts
FILE-NOTE-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-001: This is where the 2x2 core and 4x4 influence footprint should be introduced.
FILE-NOTE-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-002: Keep biomeCountsAs for ocean exclusion.
FILE-NOTE-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-003: Keep region size and candidate attempts unless tests drive a change.
FILE-NOTE-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-004: Update bounds semantics to mean influence footprint, not physical district footprint.
FILE-NOTE-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-005: Add helpers to compute core offsets, influence offsets, entrance approach, exit approach, external sides.
### src/world/generation/multiRoomStructures.ts
FILE-NOTE-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-001: Add new role/classification fields without removing old ones.
FILE-NOTE-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-002: Consider TownInfluenceRole or richer TownRoomMembership fields.
FILE-NOTE-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-003: Keep StructureRoomRole compatible: inside/adjacent/approach.
### src/world/generation/stages/structureOperations.ts
FILE-NOTE-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-001: Render core district rooms through new renderer.
FILE-NOTE-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-002: Render influence/perimeter rooms through updated perimeter logic.
FILE-NOTE-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-003: Ensure optional structures do not spawn inside town influence unless explicitly allowed.
FILE-NOTE-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-004: Preserve edge access protection for gate and exit approach.
### src/world/town.ts
FILE-NOTE-SRC_WORLD_TOWN_TS-001: Keep logical town state.
FILE-NOTE-SRC_WORLD_TOWN_TS-002: Add building/interior metadata or delegate to a new module.
FILE-NOTE-SRC_WORLD_TOWN_TS-003: Keep exported functions as wrappers if implementation moves.
FILE-NOTE-SRC_WORLD_TOWN_TS-004: Keep crime/guild functions behavior-compatible.
### src/world/worldService.ts
FILE-NOTE-SRC_WORLD_WORLDSERVICE_TS-001: Move townInterior layer room creation to registry dispatch.
FILE-NOTE-SRC_WORLD_WORLDSERVICE_TS-002: Preserve cached town update propagation into layer rooms.
FILE-NOTE-SRC_WORLD_WORLDSERVICE_TS-003: Keep thieves guild behavior working through new registry.
### src/layers/layerTypes.ts
FILE-NOTE-SRC_LAYERS_LAYERTYPES_TS-001: Expand LayerTemplateId to include tavern, stores, and homes.
FILE-NOTE-SRC_LAYERS_LAYERTYPES_TS-002: Avoid making the union so broad that unsupported templates can be generated without a registry builder.
### src/world/types.ts
FILE-NOTE-SRC_WORLD_TYPES_TS-001: Add owned objects/private zones/building entrances only if they belong on RoomSnapshot.
FILE-NOTE-SRC_WORLD_TYPES_TS-002: Otherwise store them under town/interior metadata and keep RoomSnapshot lean.
### src/scenes/snakeScene.ts
FILE-NOTE-SRC_SCENES_SNAKESCENE_TS-001: Add building entrance prompts/interactions.
FILE-NOTE-SRC_SCENES_SNAKESCENE_TS-002: Update town music classification.
FILE-NOTE-SRC_SCENES_SNAKESCENE_TS-003: Update turn-based zone bounds for interior templates.
FILE-NOTE-SRC_SCENES_SNAKESCENE_TS-004: Preserve quest board and guild grate priority.
### src/ui/snakeRenderer.ts
FILE-NOTE-SRC_UI_SNAKERENDERER_TS-001: Render any new tile letters emitted by town/interior templates.
FILE-NOTE-SRC_UI_SNAKERENDERER_TS-002: Do not add new tile letters without renderer/minimap fallback.
### src/ui/minimapRenderer.ts
FILE-NOTE-SRC_UI_MINIMAPRENDERER_TS-001: Classify new town/interior tiles as wall, barrier, water, or empty as appropriate.
## 24. Final Review Checklist
FINAL-CHECK-001: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-002: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-003: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-004: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-005: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-006: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-007: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-008: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-009: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-010: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-011: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-012: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-013: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-014: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-015: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-016: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-017: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-018: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-019: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-020: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-021: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-022: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-023: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-024: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-025: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-026: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-027: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-028: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-029: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-030: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-031: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-032: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-033: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-034: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-035: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-036: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-037: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-038: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-039: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-040: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-041: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-042: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-043: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-044: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-045: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-046: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-047: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-048: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-049: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-050: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-051: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-052: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-053: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-054: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-055: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-056: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-057: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-058: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-059: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-060: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-061: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-062: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-063: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-064: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-065: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-066: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-067: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-068: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-069: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-070: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-071: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-072: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-073: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-074: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-075: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-076: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-077: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-078: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-079: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-080: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-081: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-082: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-083: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-084: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-085: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-086: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-087: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-088: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-089: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-090: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-091: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-092: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-093: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-094: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-095: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-096: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-097: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-098: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-099: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-100: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-101: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-102: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-103: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-104: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-105: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-106: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-107: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-108: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-109: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-110: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-111: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-112: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-113: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-114: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-115: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-116: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-117: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-118: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-119: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-120: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-121: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-122: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-123: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-124: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-125: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-126: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-127: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-128: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-129: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-130: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-131: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-132: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-133: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-134: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-135: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-136: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-137: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-138: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-139: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-140: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-141: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-142: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-143: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-144: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-145: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-146: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-147: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-148: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-149: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-150: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-151: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-152: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-153: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-154: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-155: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-156: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-157: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-158: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-159: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-160: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-161: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-162: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-163: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-164: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-165: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-166: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-167: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-168: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-169: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-170: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-171: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-172: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-173: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-174: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-175: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-176: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-177: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-178: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-179: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-180: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-181: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-182: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-183: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-184: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-185: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-186: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-187: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-188: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-189: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-190: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-191: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-192: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-193: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-194: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-195: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-196: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-197: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-198: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-199: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-200: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-201: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-202: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-203: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-204: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-205: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-206: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-207: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-208: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-209: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-210: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-211: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-212: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-213: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-214: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-215: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-216: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-217: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-218: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-219: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-220: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-221: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-222: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-223: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-224: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-225: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-226: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-227: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-228: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-229: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-230: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-231: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-232: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-233: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-234: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-235: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-236: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-237: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-238: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-239: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-240: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-241: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-242: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-243: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-244: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-245: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-246: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-247: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-248: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-249: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-250: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-251: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-252: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-253: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-254: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-255: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-256: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-257: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-258: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-259: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-260: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-261: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-262: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-263: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-264: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-265: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-266: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-267: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-268: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-269: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-270: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-271: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-272: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-273: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-274: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-275: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-276: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-277: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-278: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-279: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-280: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-281: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-282: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-283: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-284: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-285: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-286: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-287: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-288: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-289: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-290: Review save/migration safety against this document and confirm no current town function has been removed.
FINAL-CHECK-291: Review source compatibility against this document and confirm no current town function has been removed.
FINAL-CHECK-292: Review footprint determinism against this document and confirm no current town function has been removed.
FINAL-CHECK-293: Review wall topology against this document and confirm no current town function has been removed.
FINAL-CHECK-294: Review interior contract against this document and confirm no current town function has been removed.
FINAL-CHECK-295: Review crime behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-296: Review NPC/shop/guild behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-297: Review UI/music/prompt behavior against this document and confirm no current town function has been removed.
FINAL-CHECK-298: Review tests/build/typecheck against this document and confirm no current town function has been removed.
FINAL-CHECK-299: Review manual QA against this document and confirm no current town function has been removed.
FINAL-CHECK-300: Review save/migration safety against this document and confirm no current town function has been removed.
## 25. Tile Semantics And Renderer Contract
Town and interior generation are tile-character driven. The overhaul must not emit a tile unless SnakeRenderer, MinimapRenderer, SnakeState collision, and prompt logic all have an intentional interpretation for that tile.
| Tile | Current / target meaning | Overhaul requirement |
| --- | --- | --- |
| `#` | solid wall / lethal wall collision unless invulnerable/smite/consume logic applies | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `~` | water hazard / lethal unless swimming or immortal | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `E` | road, open floor, entrance run-up, plaza floor, or interior open space | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `W` | wood/interior floor or building fill | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `S` | stall, counter, service desk, altar/canopy, or shop-facing symbol | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `A` | auction/counter/table/market counter or black-market/guild object | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `M` | market symbol or merchant marker | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `D` | district/notice board symbol | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `L` | lantern or light marker | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `R` | rug/table/seat/furniture tile | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `F` | field/farm/fire/flavor tile depending room | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `P` | plant/pot/prop/private object marker | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `U` | underground/guild/grate clue marker | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `G` | NPC stamped position / cozy floor under NPC | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `Y` | layer entrance/exit tile | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `H` | portal/ladder tile | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `V` | cave entrance | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `X` | cave exit | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `Q` | collapsed cave entrance | Keep meaning stable or add renderer/minimap/collision tests before changing. |
| `Z` | arcade cabinet | Keep meaning stable or add renderer/minimap/collision tests before changing. |
TILE-CONTRACT-001: Tile `#` currently means solid wall / lethal wall collision unless invulnerable/smite/consume logic applies; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-002: Tile `~` currently means water hazard / lethal unless swimming or immortal; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-003: Tile `E` currently means road, open floor, entrance run-up, plaza floor, or interior open space; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-004: Tile `W` currently means wood/interior floor or building fill; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-005: Tile `S` currently means stall, counter, service desk, altar/canopy, or shop-facing symbol; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-006: Tile `A` currently means auction/counter/table/market counter or black-market/guild object; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-007: Tile `M` currently means market symbol or merchant marker; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-008: Tile `D` currently means district/notice board symbol; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-009: Tile `L` currently means lantern or light marker; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-010: Tile `R` currently means rug/table/seat/furniture tile; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-011: Tile `F` currently means field/farm/fire/flavor tile depending room; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-012: Tile `P` currently means plant/pot/prop/private object marker; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-013: Tile `U` currently means underground/guild/grate clue marker; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-014: Tile `G` currently means NPC stamped position / cozy floor under NPC; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-015: Tile `Y` currently means layer entrance/exit tile; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-016: Tile `H` currently means portal/ladder tile; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-017: Tile `V` currently means cave entrance; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-018: Tile `X` currently means cave exit; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-019: Tile `Q` currently means collapsed cave entrance; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
TILE-CONTRACT-020: Tile `Z` currently means arcade cabinet; the town overhaul must either preserve that meaning or document and test any changed meaning in the same pass.
### 25.1 Tile `#` detailed checks
TILE-035-CHECK-001: `#` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-035-CHECK-002: `#` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-035-CHECK-003: `#` SnakeState collision semantics are clear.
TILE-035-CHECK-004: `#` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-035-CHECK-005: `#` If used for interaction, prompt code can locate it deterministically.
TILE-035-CHECK-006: `#` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-035-CHECK-007: `#` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-035-CHECK-008: `#` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.2 Tile `~` detailed checks
TILE-126-CHECK-001: `~` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-126-CHECK-002: `~` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-126-CHECK-003: `~` SnakeState collision semantics are clear.
TILE-126-CHECK-004: `~` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-126-CHECK-005: `~` If used for interaction, prompt code can locate it deterministically.
TILE-126-CHECK-006: `~` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-126-CHECK-007: `~` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-126-CHECK-008: `~` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.3 Tile `E` detailed checks
TILE-069-CHECK-001: `E` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-069-CHECK-002: `E` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-069-CHECK-003: `E` SnakeState collision semantics are clear.
TILE-069-CHECK-004: `E` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-069-CHECK-005: `E` If used for interaction, prompt code can locate it deterministically.
TILE-069-CHECK-006: `E` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-069-CHECK-007: `E` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-069-CHECK-008: `E` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.4 Tile `W` detailed checks
TILE-087-CHECK-001: `W` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-087-CHECK-002: `W` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-087-CHECK-003: `W` SnakeState collision semantics are clear.
TILE-087-CHECK-004: `W` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-087-CHECK-005: `W` If used for interaction, prompt code can locate it deterministically.
TILE-087-CHECK-006: `W` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-087-CHECK-007: `W` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-087-CHECK-008: `W` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.5 Tile `S` detailed checks
TILE-083-CHECK-001: `S` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-083-CHECK-002: `S` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-083-CHECK-003: `S` SnakeState collision semantics are clear.
TILE-083-CHECK-004: `S` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-083-CHECK-005: `S` If used for interaction, prompt code can locate it deterministically.
TILE-083-CHECK-006: `S` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-083-CHECK-007: `S` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-083-CHECK-008: `S` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.6 Tile `A` detailed checks
TILE-065-CHECK-001: `A` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-065-CHECK-002: `A` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-065-CHECK-003: `A` SnakeState collision semantics are clear.
TILE-065-CHECK-004: `A` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-065-CHECK-005: `A` If used for interaction, prompt code can locate it deterministically.
TILE-065-CHECK-006: `A` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-065-CHECK-007: `A` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-065-CHECK-008: `A` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.7 Tile `M` detailed checks
TILE-077-CHECK-001: `M` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-077-CHECK-002: `M` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-077-CHECK-003: `M` SnakeState collision semantics are clear.
TILE-077-CHECK-004: `M` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-077-CHECK-005: `M` If used for interaction, prompt code can locate it deterministically.
TILE-077-CHECK-006: `M` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-077-CHECK-007: `M` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-077-CHECK-008: `M` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.8 Tile `D` detailed checks
TILE-068-CHECK-001: `D` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-068-CHECK-002: `D` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-068-CHECK-003: `D` SnakeState collision semantics are clear.
TILE-068-CHECK-004: `D` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-068-CHECK-005: `D` If used for interaction, prompt code can locate it deterministically.
TILE-068-CHECK-006: `D` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-068-CHECK-007: `D` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-068-CHECK-008: `D` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.9 Tile `L` detailed checks
TILE-076-CHECK-001: `L` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-076-CHECK-002: `L` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-076-CHECK-003: `L` SnakeState collision semantics are clear.
TILE-076-CHECK-004: `L` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-076-CHECK-005: `L` If used for interaction, prompt code can locate it deterministically.
TILE-076-CHECK-006: `L` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-076-CHECK-007: `L` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-076-CHECK-008: `L` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.10 Tile `R` detailed checks
TILE-082-CHECK-001: `R` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-082-CHECK-002: `R` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-082-CHECK-003: `R` SnakeState collision semantics are clear.
TILE-082-CHECK-004: `R` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-082-CHECK-005: `R` If used for interaction, prompt code can locate it deterministically.
TILE-082-CHECK-006: `R` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-082-CHECK-007: `R` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-082-CHECK-008: `R` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.11 Tile `F` detailed checks
TILE-070-CHECK-001: `F` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-070-CHECK-002: `F` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-070-CHECK-003: `F` SnakeState collision semantics are clear.
TILE-070-CHECK-004: `F` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-070-CHECK-005: `F` If used for interaction, prompt code can locate it deterministically.
TILE-070-CHECK-006: `F` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-070-CHECK-007: `F` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-070-CHECK-008: `F` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.12 Tile `P` detailed checks
TILE-080-CHECK-001: `P` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-080-CHECK-002: `P` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-080-CHECK-003: `P` SnakeState collision semantics are clear.
TILE-080-CHECK-004: `P` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-080-CHECK-005: `P` If used for interaction, prompt code can locate it deterministically.
TILE-080-CHECK-006: `P` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-080-CHECK-007: `P` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-080-CHECK-008: `P` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.13 Tile `U` detailed checks
TILE-085-CHECK-001: `U` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-085-CHECK-002: `U` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-085-CHECK-003: `U` SnakeState collision semantics are clear.
TILE-085-CHECK-004: `U` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-085-CHECK-005: `U` If used for interaction, prompt code can locate it deterministically.
TILE-085-CHECK-006: `U` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-085-CHECK-007: `U` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-085-CHECK-008: `U` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.14 Tile `G` detailed checks
TILE-071-CHECK-001: `G` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-071-CHECK-002: `G` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-071-CHECK-003: `G` SnakeState collision semantics are clear.
TILE-071-CHECK-004: `G` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-071-CHECK-005: `G` If used for interaction, prompt code can locate it deterministically.
TILE-071-CHECK-006: `G` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-071-CHECK-007: `G` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-071-CHECK-008: `G` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.15 Tile `Y` detailed checks
TILE-089-CHECK-001: `Y` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-089-CHECK-002: `Y` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-089-CHECK-003: `Y` SnakeState collision semantics are clear.
TILE-089-CHECK-004: `Y` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-089-CHECK-005: `Y` If used for interaction, prompt code can locate it deterministically.
TILE-089-CHECK-006: `Y` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-089-CHECK-007: `Y` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-089-CHECK-008: `Y` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.16 Tile `H` detailed checks
TILE-072-CHECK-001: `H` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-072-CHECK-002: `H` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-072-CHECK-003: `H` SnakeState collision semantics are clear.
TILE-072-CHECK-004: `H` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-072-CHECK-005: `H` If used for interaction, prompt code can locate it deterministically.
TILE-072-CHECK-006: `H` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-072-CHECK-007: `H` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-072-CHECK-008: `H` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.17 Tile `V` detailed checks
TILE-086-CHECK-001: `V` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-086-CHECK-002: `V` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-086-CHECK-003: `V` SnakeState collision semantics are clear.
TILE-086-CHECK-004: `V` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-086-CHECK-005: `V` If used for interaction, prompt code can locate it deterministically.
TILE-086-CHECK-006: `V` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-086-CHECK-007: `V` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-086-CHECK-008: `V` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.18 Tile `X` detailed checks
TILE-088-CHECK-001: `X` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-088-CHECK-002: `X` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-088-CHECK-003: `X` SnakeState collision semantics are clear.
TILE-088-CHECK-004: `X` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-088-CHECK-005: `X` If used for interaction, prompt code can locate it deterministically.
TILE-088-CHECK-006: `X` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-088-CHECK-007: `X` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-088-CHECK-008: `X` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.19 Tile `Q` detailed checks
TILE-081-CHECK-001: `Q` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-081-CHECK-002: `Q` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-081-CHECK-003: `Q` SnakeState collision semantics are clear.
TILE-081-CHECK-004: `Q` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-081-CHECK-005: `Q` If used for interaction, prompt code can locate it deterministically.
TILE-081-CHECK-006: `Q` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-081-CHECK-007: `Q` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-081-CHECK-008: `Q` If used for private/owned objects, crime metadata exists outside the raw tile character.
### 25.20 Tile `Z` detailed checks
TILE-090-CHECK-001: `Z` SnakeRenderer has a visible rendering path or intentional fallback.
TILE-090-CHECK-002: `Z` MinimapRenderer classifies it as empty, wall, barrier, or water intentionally.
TILE-090-CHECK-003: `Z` SnakeState collision semantics are clear.
TILE-090-CHECK-004: `Z` Town/interior templates do not use it for two conflicting gameplay meanings in the same room.
TILE-090-CHECK-005: `Z` If used for interaction, prompt code can locate it deterministically.
TILE-090-CHECK-006: `Z` If used for NPC anchor, resident stamping does not overwrite critical objects.
TILE-090-CHECK-007: `Z` If used for exit/entrance, returnPosition and spawn placement are test-covered.
TILE-090-CHECK-008: `Z` If used for private/owned objects, crime metadata exists outside the raw tile character.
## 26. Save And Migration Requirements
The town overhaul should be safe for old runs and future saves. The safest first pass is additive: support new names and old names simultaneously, then migrate in a later cleanup.
SAVE-REQ-001: Do not assume old saved town rooms have only new core district ids.
SAVE-REQ-002: Do not assume old saved residents have workRoomId in a current physical core room.
SAVE-REQ-003: If a saved workRoomId points to legacy tavernInterior, map it to the tavern interior layer entrance or tavern anchor.
SAVE-REQ-004: If a saved workRoomId points to legacy gate, map guard work to townCenter/gateFeature anchors.
SAVE-REQ-005: If a saved workRoomId points to legacy townExit, map guard work to exit gate feature anchors.
SAVE-REQ-006: If a saved guildHideout exists as a physical district, map it to townInterior:thievesGuild.
SAVE-REQ-007: If old districtByRoomId has eight physical rooms, treat the town as legacy and lazily regenerate physical metadata on room load.
SAVE-REQ-008: Do not erase wantedLevel, suspicion, reputation, guild karma, completedJobs, failedJobs, betrayedGuild, rumors, notices, laws, or resident ids.
SAVE-REQ-009: Actor ids should remain stable enough that known facts/memories/social links do not break.
SAVE-REQ-010: Layer ids should include town id and template id in a parseable way.
Suggested load-time compatibility helpers:
```ts
export function normalizeTownDistrictKind(...) { /* compatibility bridge */ }
export function normalizeTownWorkRoom(...) { /* compatibility bridge */ }
export function isLegacyTownDistrict(...) { /* compatibility bridge */ }
export function migrateTownPhysicalRoomsIfNeeded(...) { /* compatibility bridge */ }
export function resolveTownInteriorLayerId(...) { /* compatibility bridge */ }
export function legacyTownRoomKindForDisplay(...) { /* compatibility bridge */ }
```
SAVE-HELPER-NORMALIZETOWNDISTRICTKIND-001: `normalizeTownDistrictKind` has unit test with legacy value.
SAVE-HELPER-NORMALIZETOWNDISTRICTKIND-002: `normalizeTownDistrictKind` has unit test with new value.
SAVE-HELPER-NORMALIZETOWNDISTRICTKIND-003: `normalizeTownDistrictKind` has unit test with undefined/null path.
SAVE-HELPER-NORMALIZETOWNDISTRICTKIND-004: `normalizeTownDistrictKind` has integration test through current room load.
SAVE-HELPER-NORMALIZETOWNDISTRICTKIND-005: `normalizeTownDistrictKind` has documented in code comments.
SAVE-HELPER-NORMALIZETOWNWORKROOM-001: `normalizeTownWorkRoom` has unit test with legacy value.
SAVE-HELPER-NORMALIZETOWNWORKROOM-002: `normalizeTownWorkRoom` has unit test with new value.
SAVE-HELPER-NORMALIZETOWNWORKROOM-003: `normalizeTownWorkRoom` has unit test with undefined/null path.
SAVE-HELPER-NORMALIZETOWNWORKROOM-004: `normalizeTownWorkRoom` has integration test through current room load.
SAVE-HELPER-NORMALIZETOWNWORKROOM-005: `normalizeTownWorkRoom` has documented in code comments.
SAVE-HELPER-ISLEGACYTOWNDISTRICT-001: `isLegacyTownDistrict` has unit test with legacy value.
SAVE-HELPER-ISLEGACYTOWNDISTRICT-002: `isLegacyTownDistrict` has unit test with new value.
SAVE-HELPER-ISLEGACYTOWNDISTRICT-003: `isLegacyTownDistrict` has unit test with undefined/null path.
SAVE-HELPER-ISLEGACYTOWNDISTRICT-004: `isLegacyTownDistrict` has integration test through current room load.
SAVE-HELPER-ISLEGACYTOWNDISTRICT-005: `isLegacyTownDistrict` has documented in code comments.
SAVE-HELPER-MIGRATETOWNPHYSICALROOMSIFNEEDED-001: `migrateTownPhysicalRoomsIfNeeded` has unit test with legacy value.
SAVE-HELPER-MIGRATETOWNPHYSICALROOMSIFNEEDED-002: `migrateTownPhysicalRoomsIfNeeded` has unit test with new value.
SAVE-HELPER-MIGRATETOWNPHYSICALROOMSIFNEEDED-003: `migrateTownPhysicalRoomsIfNeeded` has unit test with undefined/null path.
SAVE-HELPER-MIGRATETOWNPHYSICALROOMSIFNEEDED-004: `migrateTownPhysicalRoomsIfNeeded` has integration test through current room load.
SAVE-HELPER-MIGRATETOWNPHYSICALROOMSIFNEEDED-005: `migrateTownPhysicalRoomsIfNeeded` has documented in code comments.
SAVE-HELPER-RESOLVETOWNINTERIORLAYERID-001: `resolveTownInteriorLayerId` has unit test with legacy value.
SAVE-HELPER-RESOLVETOWNINTERIORLAYERID-002: `resolveTownInteriorLayerId` has unit test with new value.
SAVE-HELPER-RESOLVETOWNINTERIORLAYERID-003: `resolveTownInteriorLayerId` has unit test with undefined/null path.
SAVE-HELPER-RESOLVETOWNINTERIORLAYERID-004: `resolveTownInteriorLayerId` has integration test through current room load.
SAVE-HELPER-RESOLVETOWNINTERIORLAYERID-005: `resolveTownInteriorLayerId` has documented in code comments.
SAVE-HELPER-LEGACYTOWNROOMKINDFORDISPLAY-001: `legacyTownRoomKindForDisplay` has unit test with legacy value.
SAVE-HELPER-LEGACYTOWNROOMKINDFORDISPLAY-002: `legacyTownRoomKindForDisplay` has unit test with new value.
SAVE-HELPER-LEGACYTOWNROOMKINDFORDISPLAY-003: `legacyTownRoomKindForDisplay` has unit test with undefined/null path.
SAVE-HELPER-LEGACYTOWNROOMKINDFORDISPLAY-004: `legacyTownRoomKindForDisplay` has integration test through current room load.
SAVE-HELPER-LEGACYTOWNROOMKINDFORDISPLAY-005: `legacyTownRoomKindForDisplay` has documented in code comments.
## 27. Detailed Interior Template Contracts
### 27.1 `generalStore` contract
INTERIOR-SUMMARY-GENERALSTORE: Small/medium public storefront with shopkeeper, counter, shelves, public sales floor, private back counter or back room.
INTERIOR-SIZE-TARGET-GENERALSTORE: medium
INTERIOR-PUBLIC-ACCESS-GENERALSTORE: yes
INTERIOR-FIELD-GENERALSTORE-001: `generalStore` declares or derives `templateId`.
INTERIOR-FIELD-GENERALSTORE-002: `generalStore` declares or derives `size`.
INTERIOR-FIELD-GENERALSTORE-003: `generalStore` declares or derives `displayName`.
INTERIOR-FIELD-GENERALSTORE-004: `generalStore` declares or derives `publicAccess`.
INTERIOR-FIELD-GENERALSTORE-005: `generalStore` declares or derives `parentDistrict`.
INTERIOR-FIELD-GENERALSTORE-006: `generalStore` declares or derives `npcAnchors`.
INTERIOR-FIELD-GENERALSTORE-007: `generalStore` declares or derives `objectAnchors`.
INTERIOR-FIELD-GENERALSTORE-008: `generalStore` declares or derives `publicZones`.
INTERIOR-FIELD-GENERALSTORE-009: `generalStore` declares or derives `privateZones`.
INTERIOR-FIELD-GENERALSTORE-010: `generalStore` declares or derives `spawn`.
INTERIOR-FIELD-GENERALSTORE-011: `generalStore` declares or derives `exit`.
INTERIOR-FIELD-GENERALSTORE-012: `generalStore` declares or derives `returnPosition`.
INTERIOR-FIELD-GENERALSTORE-013: `generalStore` declares or derives `tileLegend`.
INTERIOR-FIELD-GENERALSTORE-014: `generalStore` declares or derives `musicTag`.
INTERIOR-FIELD-GENERALSTORE-015: `generalStore` declares or derives `crimeRules`.
INTERIOR-FIELD-GENERALSTORE-016: `generalStore` declares or derives `shopRole`.
INTERIOR-FIELD-GENERALSTORE-017: `generalStore` declares or derives `questHooks`.
INTERIOR-FIELD-GENERALSTORE-018: `generalStore` declares or derives `guildHooks`.
INTERIOR-FIELD-GENERALSTORE-019: `generalStore` declares or derives `relationshipHooks`.
INTERIOR-FIELD-GENERALSTORE-020: `generalStore` declares or derives `testFixtureSeed`.
INTERIOR-VALIDATION-GENERALSTORE-001: `generalStore` validation: layout is rectangular.
INTERIOR-VALIDATION-GENERALSTORE-002: `generalStore` validation: all rows match grid width.
INTERIOR-VALIDATION-GENERALSTORE-003: `generalStore` validation: exit tile is reachable from spawn.
INTERIOR-VALIDATION-GENERALSTORE-004: `generalStore` validation: at least 25 percent of template interior is walkable.
INTERIOR-VALIDATION-GENERALSTORE-005: `generalStore` validation: door landing has exposed sides.
INTERIOR-VALIDATION-GENERALSTORE-006: `generalStore` validation: NPC anchors do not overlap owned objects.
INTERIOR-VALIDATION-GENERALSTORE-007: `generalStore` validation: owned objects do not overlap exit.
INTERIOR-VALIDATION-GENERALSTORE-008: `generalStore` validation: private zone does not contain spawn unless private entry is intended.
INTERIOR-VALIDATION-GENERALSTORE-009: `generalStore` validation: public shop floor exists when public access true.
INTERIOR-VALIDATION-GENERALSTORE-010: `generalStore` validation: town id propagates into RoomSnapshot.town.
### 27.2 `tavern` contract
INTERIOR-SUMMARY-TAVERN: Large public social/commercial interior with bartender, card dealer, quest giver, tables, rumor hooks, food shop, and possible relationship/social content.
INTERIOR-SIZE-TARGET-TAVERN: large
INTERIOR-PUBLIC-ACCESS-TAVERN: yes
INTERIOR-FIELD-TAVERN-001: `tavern` declares or derives `templateId`.
INTERIOR-FIELD-TAVERN-002: `tavern` declares or derives `size`.
INTERIOR-FIELD-TAVERN-003: `tavern` declares or derives `displayName`.
INTERIOR-FIELD-TAVERN-004: `tavern` declares or derives `publicAccess`.
INTERIOR-FIELD-TAVERN-005: `tavern` declares or derives `parentDistrict`.
INTERIOR-FIELD-TAVERN-006: `tavern` declares or derives `npcAnchors`.
INTERIOR-FIELD-TAVERN-007: `tavern` declares or derives `objectAnchors`.
INTERIOR-FIELD-TAVERN-008: `tavern` declares or derives `publicZones`.
INTERIOR-FIELD-TAVERN-009: `tavern` declares or derives `privateZones`.
INTERIOR-FIELD-TAVERN-010: `tavern` declares or derives `spawn`.
INTERIOR-FIELD-TAVERN-011: `tavern` declares or derives `exit`.
INTERIOR-FIELD-TAVERN-012: `tavern` declares or derives `returnPosition`.
INTERIOR-FIELD-TAVERN-013: `tavern` declares or derives `tileLegend`.
INTERIOR-FIELD-TAVERN-014: `tavern` declares or derives `musicTag`.
INTERIOR-FIELD-TAVERN-015: `tavern` declares or derives `crimeRules`.
INTERIOR-FIELD-TAVERN-016: `tavern` declares or derives `shopRole`.
INTERIOR-FIELD-TAVERN-017: `tavern` declares or derives `questHooks`.
INTERIOR-FIELD-TAVERN-018: `tavern` declares or derives `guildHooks`.
INTERIOR-FIELD-TAVERN-019: `tavern` declares or derives `relationshipHooks`.
INTERIOR-FIELD-TAVERN-020: `tavern` declares or derives `testFixtureSeed`.
INTERIOR-VALIDATION-TAVERN-001: `tavern` validation: layout is rectangular.
INTERIOR-VALIDATION-TAVERN-002: `tavern` validation: all rows match grid width.
INTERIOR-VALIDATION-TAVERN-003: `tavern` validation: exit tile is reachable from spawn.
INTERIOR-VALIDATION-TAVERN-004: `tavern` validation: at least 25 percent of template interior is walkable.
INTERIOR-VALIDATION-TAVERN-005: `tavern` validation: door landing has exposed sides.
INTERIOR-VALIDATION-TAVERN-006: `tavern` validation: NPC anchors do not overlap owned objects.
INTERIOR-VALIDATION-TAVERN-007: `tavern` validation: owned objects do not overlap exit.
INTERIOR-VALIDATION-TAVERN-008: `tavern` validation: private zone does not contain spawn unless private entry is intended.
INTERIOR-VALIDATION-TAVERN-009: `tavern` validation: public shop floor exists when public access true.
INTERIOR-VALIDATION-TAVERN-010: `tavern` validation: town id propagates into RoomSnapshot.town.
### 27.3 `thievesGuild` contract
INTERIOR-SUMMARY-THIEVESGUILD: Hidden/private criminal interior with thief contact, thief NPCs, guild menu, wanted reduction, fence, black market, and guild jobs.
INTERIOR-SIZE-TARGET-THIEVESGUILD: large or medium
INTERIOR-PUBLIC-ACCESS-THIEVESGUILD: conditional
INTERIOR-FIELD-THIEVESGUILD-001: `thievesGuild` declares or derives `templateId`.
INTERIOR-FIELD-THIEVESGUILD-002: `thievesGuild` declares or derives `size`.
INTERIOR-FIELD-THIEVESGUILD-003: `thievesGuild` declares or derives `displayName`.
INTERIOR-FIELD-THIEVESGUILD-004: `thievesGuild` declares or derives `publicAccess`.
INTERIOR-FIELD-THIEVESGUILD-005: `thievesGuild` declares or derives `parentDistrict`.
INTERIOR-FIELD-THIEVESGUILD-006: `thievesGuild` declares or derives `npcAnchors`.
INTERIOR-FIELD-THIEVESGUILD-007: `thievesGuild` declares or derives `objectAnchors`.
INTERIOR-FIELD-THIEVESGUILD-008: `thievesGuild` declares or derives `publicZones`.
INTERIOR-FIELD-THIEVESGUILD-009: `thievesGuild` declares or derives `privateZones`.
INTERIOR-FIELD-THIEVESGUILD-010: `thievesGuild` declares or derives `spawn`.
INTERIOR-FIELD-THIEVESGUILD-011: `thievesGuild` declares or derives `exit`.
INTERIOR-FIELD-THIEVESGUILD-012: `thievesGuild` declares or derives `returnPosition`.
INTERIOR-FIELD-THIEVESGUILD-013: `thievesGuild` declares or derives `tileLegend`.
INTERIOR-FIELD-THIEVESGUILD-014: `thievesGuild` declares or derives `musicTag`.
INTERIOR-FIELD-THIEVESGUILD-015: `thievesGuild` declares or derives `crimeRules`.
INTERIOR-FIELD-THIEVESGUILD-016: `thievesGuild` declares or derives `shopRole`.
INTERIOR-FIELD-THIEVESGUILD-017: `thievesGuild` declares or derives `questHooks`.
INTERIOR-FIELD-THIEVESGUILD-018: `thievesGuild` declares or derives `guildHooks`.
INTERIOR-FIELD-THIEVESGUILD-019: `thievesGuild` declares or derives `relationshipHooks`.
INTERIOR-FIELD-THIEVESGUILD-020: `thievesGuild` declares or derives `testFixtureSeed`.
INTERIOR-VALIDATION-THIEVESGUILD-001: `thievesGuild` validation: layout is rectangular.
INTERIOR-VALIDATION-THIEVESGUILD-002: `thievesGuild` validation: all rows match grid width.
INTERIOR-VALIDATION-THIEVESGUILD-003: `thievesGuild` validation: exit tile is reachable from spawn.
INTERIOR-VALIDATION-THIEVESGUILD-004: `thievesGuild` validation: at least 25 percent of template interior is walkable.
INTERIOR-VALIDATION-THIEVESGUILD-005: `thievesGuild` validation: door landing has exposed sides.
INTERIOR-VALIDATION-THIEVESGUILD-006: `thievesGuild` validation: NPC anchors do not overlap owned objects.
INTERIOR-VALIDATION-THIEVESGUILD-007: `thievesGuild` validation: owned objects do not overlap exit.
INTERIOR-VALIDATION-THIEVESGUILD-008: `thievesGuild` validation: private zone does not contain spawn unless private entry is intended.
INTERIOR-VALIDATION-THIEVESGUILD-009: `thievesGuild` validation: public shop floor exists when public access true.
INTERIOR-VALIDATION-THIEVESGUILD-010: `thievesGuild` validation: town id propagates into RoomSnapshot.town.
### 27.4 `butcherShop` contract
INTERIOR-SUMMARY-BUTCHERSHOP: Small public storefront with butcher, counter, food/meat objects, and staff/private area.
INTERIOR-SIZE-TARGET-BUTCHERSHOP: small
INTERIOR-PUBLIC-ACCESS-BUTCHERSHOP: yes
INTERIOR-FIELD-BUTCHERSHOP-001: `butcherShop` declares or derives `templateId`.
INTERIOR-FIELD-BUTCHERSHOP-002: `butcherShop` declares or derives `size`.
INTERIOR-FIELD-BUTCHERSHOP-003: `butcherShop` declares or derives `displayName`.
INTERIOR-FIELD-BUTCHERSHOP-004: `butcherShop` declares or derives `publicAccess`.
INTERIOR-FIELD-BUTCHERSHOP-005: `butcherShop` declares or derives `parentDistrict`.
INTERIOR-FIELD-BUTCHERSHOP-006: `butcherShop` declares or derives `npcAnchors`.
INTERIOR-FIELD-BUTCHERSHOP-007: `butcherShop` declares or derives `objectAnchors`.
INTERIOR-FIELD-BUTCHERSHOP-008: `butcherShop` declares or derives `publicZones`.
INTERIOR-FIELD-BUTCHERSHOP-009: `butcherShop` declares or derives `privateZones`.
INTERIOR-FIELD-BUTCHERSHOP-010: `butcherShop` declares or derives `spawn`.
INTERIOR-FIELD-BUTCHERSHOP-011: `butcherShop` declares or derives `exit`.
INTERIOR-FIELD-BUTCHERSHOP-012: `butcherShop` declares or derives `returnPosition`.
INTERIOR-FIELD-BUTCHERSHOP-013: `butcherShop` declares or derives `tileLegend`.
INTERIOR-FIELD-BUTCHERSHOP-014: `butcherShop` declares or derives `musicTag`.
INTERIOR-FIELD-BUTCHERSHOP-015: `butcherShop` declares or derives `crimeRules`.
INTERIOR-FIELD-BUTCHERSHOP-016: `butcherShop` declares or derives `shopRole`.
INTERIOR-FIELD-BUTCHERSHOP-017: `butcherShop` declares or derives `questHooks`.
INTERIOR-FIELD-BUTCHERSHOP-018: `butcherShop` declares or derives `guildHooks`.
INTERIOR-FIELD-BUTCHERSHOP-019: `butcherShop` declares or derives `relationshipHooks`.
INTERIOR-FIELD-BUTCHERSHOP-020: `butcherShop` declares or derives `testFixtureSeed`.
INTERIOR-VALIDATION-BUTCHERSHOP-001: `butcherShop` validation: layout is rectangular.
INTERIOR-VALIDATION-BUTCHERSHOP-002: `butcherShop` validation: all rows match grid width.
INTERIOR-VALIDATION-BUTCHERSHOP-003: `butcherShop` validation: exit tile is reachable from spawn.
INTERIOR-VALIDATION-BUTCHERSHOP-004: `butcherShop` validation: at least 25 percent of template interior is walkable.
INTERIOR-VALIDATION-BUTCHERSHOP-005: `butcherShop` validation: door landing has exposed sides.
INTERIOR-VALIDATION-BUTCHERSHOP-006: `butcherShop` validation: NPC anchors do not overlap owned objects.
INTERIOR-VALIDATION-BUTCHERSHOP-007: `butcherShop` validation: owned objects do not overlap exit.
INTERIOR-VALIDATION-BUTCHERSHOP-008: `butcherShop` validation: private zone does not contain spawn unless private entry is intended.
INTERIOR-VALIDATION-BUTCHERSHOP-009: `butcherShop` validation: public shop floor exists when public access true.
INTERIOR-VALIDATION-BUTCHERSHOP-010: `butcherShop` validation: town id propagates into RoomSnapshot.town.
### 27.5 `potionMaker` contract
INTERIOR-SUMMARY-POTIONMAKER: Small public potion/scribe storefront with shelves, counter, potion maker anchor, and theft objects.
INTERIOR-SIZE-TARGET-POTIONMAKER: small
INTERIOR-PUBLIC-ACCESS-POTIONMAKER: yes
INTERIOR-FIELD-POTIONMAKER-001: `potionMaker` declares or derives `templateId`.
INTERIOR-FIELD-POTIONMAKER-002: `potionMaker` declares or derives `size`.
INTERIOR-FIELD-POTIONMAKER-003: `potionMaker` declares or derives `displayName`.
INTERIOR-FIELD-POTIONMAKER-004: `potionMaker` declares or derives `publicAccess`.
INTERIOR-FIELD-POTIONMAKER-005: `potionMaker` declares or derives `parentDistrict`.
INTERIOR-FIELD-POTIONMAKER-006: `potionMaker` declares or derives `npcAnchors`.
INTERIOR-FIELD-POTIONMAKER-007: `potionMaker` declares or derives `objectAnchors`.
INTERIOR-FIELD-POTIONMAKER-008: `potionMaker` declares or derives `publicZones`.
INTERIOR-FIELD-POTIONMAKER-009: `potionMaker` declares or derives `privateZones`.
INTERIOR-FIELD-POTIONMAKER-010: `potionMaker` declares or derives `spawn`.
INTERIOR-FIELD-POTIONMAKER-011: `potionMaker` declares or derives `exit`.
INTERIOR-FIELD-POTIONMAKER-012: `potionMaker` declares or derives `returnPosition`.
INTERIOR-FIELD-POTIONMAKER-013: `potionMaker` declares or derives `tileLegend`.
INTERIOR-FIELD-POTIONMAKER-014: `potionMaker` declares or derives `musicTag`.
INTERIOR-FIELD-POTIONMAKER-015: `potionMaker` declares or derives `crimeRules`.
INTERIOR-FIELD-POTIONMAKER-016: `potionMaker` declares or derives `shopRole`.
INTERIOR-FIELD-POTIONMAKER-017: `potionMaker` declares or derives `questHooks`.
INTERIOR-FIELD-POTIONMAKER-018: `potionMaker` declares or derives `guildHooks`.
INTERIOR-FIELD-POTIONMAKER-019: `potionMaker` declares or derives `relationshipHooks`.
INTERIOR-FIELD-POTIONMAKER-020: `potionMaker` declares or derives `testFixtureSeed`.
INTERIOR-VALIDATION-POTIONMAKER-001: `potionMaker` validation: layout is rectangular.
INTERIOR-VALIDATION-POTIONMAKER-002: `potionMaker` validation: all rows match grid width.
INTERIOR-VALIDATION-POTIONMAKER-003: `potionMaker` validation: exit tile is reachable from spawn.
INTERIOR-VALIDATION-POTIONMAKER-004: `potionMaker` validation: at least 25 percent of template interior is walkable.
INTERIOR-VALIDATION-POTIONMAKER-005: `potionMaker` validation: door landing has exposed sides.
INTERIOR-VALIDATION-POTIONMAKER-006: `potionMaker` validation: NPC anchors do not overlap owned objects.
INTERIOR-VALIDATION-POTIONMAKER-007: `potionMaker` validation: owned objects do not overlap exit.
INTERIOR-VALIDATION-POTIONMAKER-008: `potionMaker` validation: private zone does not contain spawn unless private entry is intended.
INTERIOR-VALIDATION-POTIONMAKER-009: `potionMaker` validation: public shop floor exists when public access true.
INTERIOR-VALIDATION-POTIONMAKER-010: `potionMaker` validation: town id propagates into RoomSnapshot.town.
### 27.6 `residentialHome` contract
INTERIOR-SUMMARY-RESIDENTIALHOME: Small private home with owner metadata, private zones, loot/owned objects, and break-in crime hooks.
INTERIOR-SIZE-TARGET-RESIDENTIALHOME: small
INTERIOR-PUBLIC-ACCESS-RESIDENTIALHOME: no
INTERIOR-FIELD-RESIDENTIALHOME-001: `residentialHome` declares or derives `templateId`.
INTERIOR-FIELD-RESIDENTIALHOME-002: `residentialHome` declares or derives `size`.
INTERIOR-FIELD-RESIDENTIALHOME-003: `residentialHome` declares or derives `displayName`.
INTERIOR-FIELD-RESIDENTIALHOME-004: `residentialHome` declares or derives `publicAccess`.
INTERIOR-FIELD-RESIDENTIALHOME-005: `residentialHome` declares or derives `parentDistrict`.
INTERIOR-FIELD-RESIDENTIALHOME-006: `residentialHome` declares or derives `npcAnchors`.
INTERIOR-FIELD-RESIDENTIALHOME-007: `residentialHome` declares or derives `objectAnchors`.
INTERIOR-FIELD-RESIDENTIALHOME-008: `residentialHome` declares or derives `publicZones`.
INTERIOR-FIELD-RESIDENTIALHOME-009: `residentialHome` declares or derives `privateZones`.
INTERIOR-FIELD-RESIDENTIALHOME-010: `residentialHome` declares or derives `spawn`.
INTERIOR-FIELD-RESIDENTIALHOME-011: `residentialHome` declares or derives `exit`.
INTERIOR-FIELD-RESIDENTIALHOME-012: `residentialHome` declares or derives `returnPosition`.
INTERIOR-FIELD-RESIDENTIALHOME-013: `residentialHome` declares or derives `tileLegend`.
INTERIOR-FIELD-RESIDENTIALHOME-014: `residentialHome` declares or derives `musicTag`.
INTERIOR-FIELD-RESIDENTIALHOME-015: `residentialHome` declares or derives `crimeRules`.
INTERIOR-FIELD-RESIDENTIALHOME-016: `residentialHome` declares or derives `shopRole`.
INTERIOR-FIELD-RESIDENTIALHOME-017: `residentialHome` declares or derives `questHooks`.
INTERIOR-FIELD-RESIDENTIALHOME-018: `residentialHome` declares or derives `guildHooks`.
INTERIOR-FIELD-RESIDENTIALHOME-019: `residentialHome` declares or derives `relationshipHooks`.
INTERIOR-FIELD-RESIDENTIALHOME-020: `residentialHome` declares or derives `testFixtureSeed`.
INTERIOR-VALIDATION-RESIDENTIALHOME-001: `residentialHome` validation: layout is rectangular.
INTERIOR-VALIDATION-RESIDENTIALHOME-002: `residentialHome` validation: all rows match grid width.
INTERIOR-VALIDATION-RESIDENTIALHOME-003: `residentialHome` validation: exit tile is reachable from spawn.
INTERIOR-VALIDATION-RESIDENTIALHOME-004: `residentialHome` validation: at least 25 percent of template interior is walkable.
INTERIOR-VALIDATION-RESIDENTIALHOME-005: `residentialHome` validation: door landing has exposed sides.
INTERIOR-VALIDATION-RESIDENTIALHOME-006: `residentialHome` validation: NPC anchors do not overlap owned objects.
INTERIOR-VALIDATION-RESIDENTIALHOME-007: `residentialHome` validation: owned objects do not overlap exit.
INTERIOR-VALIDATION-RESIDENTIALHOME-008: `residentialHome` validation: private zone does not contain spawn unless private entry is intended.
INTERIOR-VALIDATION-RESIDENTIALHOME-009: `residentialHome` validation: public shop floor exists when public access true.
INTERIOR-VALIDATION-RESIDENTIALHOME-010: `residentialHome` validation: town id propagates into RoomSnapshot.town.
## 28. Detailed Role And Shop Preservation
Roles and shops are where town content actually reaches the player. Treat these as gameplay contracts, not mere strings.
### 28.1 Role `shopkeeper`
ROLE-SHOPKEEPER-001: `shopkeeper` still appears in town.residents when appropriate.
ROLE-SHOPKEEPER-002: `shopkeeper` has valid faction assignment.
ROLE-SHOPKEEPER-003: `shopkeeper` has valid homeRoomId or home layer id.
ROLE-SHOPKEEPER-004: `shopkeeper` has valid workRoomId or work layer id.
ROLE-SHOPKEEPER-005: `shopkeeper` if stationary, anchor is stable and walkable.
ROLE-SHOPKEEPER-006: `shopkeeper` if shop role, maps to shop kind.
ROLE-SHOPKEEPER-007: `shopkeeper` if guard role, participates in patrol/law semantics.
ROLE-SHOPKEEPER-008: `shopkeeper` if criminal role, participates in guild/backAlley semantics.
ROLE-SHOPKEEPER-009: `shopkeeper` prompt text is sensible when nearby.
ROLE-SHOPKEEPER-010: `shopkeeper` does not spawn on external wall or closed door.
### 28.2 Role `equipmentMerchant`
ROLE-EQUIPMENTMERCHANT-001: `equipmentMerchant` still appears in town.residents when appropriate.
ROLE-EQUIPMENTMERCHANT-002: `equipmentMerchant` has valid faction assignment.
ROLE-EQUIPMENTMERCHANT-003: `equipmentMerchant` has valid homeRoomId or home layer id.
ROLE-EQUIPMENTMERCHANT-004: `equipmentMerchant` has valid workRoomId or work layer id.
ROLE-EQUIPMENTMERCHANT-005: `equipmentMerchant` if stationary, anchor is stable and walkable.
ROLE-EQUIPMENTMERCHANT-006: `equipmentMerchant` if shop role, maps to shop kind.
ROLE-EQUIPMENTMERCHANT-007: `equipmentMerchant` if guard role, participates in patrol/law semantics.
ROLE-EQUIPMENTMERCHANT-008: `equipmentMerchant` if criminal role, participates in guild/backAlley semantics.
ROLE-EQUIPMENTMERCHANT-009: `equipmentMerchant` prompt text is sensible when nearby.
ROLE-EQUIPMENTMERCHANT-010: `equipmentMerchant` does not spawn on external wall or closed door.
### 28.3 Role `potionMaker`
ROLE-POTIONMAKER-001: `potionMaker` still appears in town.residents when appropriate.
ROLE-POTIONMAKER-002: `potionMaker` has valid faction assignment.
ROLE-POTIONMAKER-003: `potionMaker` has valid homeRoomId or home layer id.
ROLE-POTIONMAKER-004: `potionMaker` has valid workRoomId or work layer id.
ROLE-POTIONMAKER-005: `potionMaker` if stationary, anchor is stable and walkable.
ROLE-POTIONMAKER-006: `potionMaker` if shop role, maps to shop kind.
ROLE-POTIONMAKER-007: `potionMaker` if guard role, participates in patrol/law semantics.
ROLE-POTIONMAKER-008: `potionMaker` if criminal role, participates in guild/backAlley semantics.
ROLE-POTIONMAKER-009: `potionMaker` prompt text is sensible when nearby.
ROLE-POTIONMAKER-010: `potionMaker` does not spawn on external wall or closed door.
### 28.4 Role `butcher`
ROLE-BUTCHER-001: `butcher` still appears in town.residents when appropriate.
ROLE-BUTCHER-002: `butcher` has valid faction assignment.
ROLE-BUTCHER-003: `butcher` has valid homeRoomId or home layer id.
ROLE-BUTCHER-004: `butcher` has valid workRoomId or work layer id.
ROLE-BUTCHER-005: `butcher` if stationary, anchor is stable and walkable.
ROLE-BUTCHER-006: `butcher` if shop role, maps to shop kind.
ROLE-BUTCHER-007: `butcher` if guard role, participates in patrol/law semantics.
ROLE-BUTCHER-008: `butcher` if criminal role, participates in guild/backAlley semantics.
ROLE-BUTCHER-009: `butcher` prompt text is sensible when nearby.
ROLE-BUTCHER-010: `butcher` does not spawn on external wall or closed door.
### 28.5 Role `cardDealer`
ROLE-CARDDEALER-001: `cardDealer` still appears in town.residents when appropriate.
ROLE-CARDDEALER-002: `cardDealer` has valid faction assignment.
ROLE-CARDDEALER-003: `cardDealer` has valid homeRoomId or home layer id.
ROLE-CARDDEALER-004: `cardDealer` has valid workRoomId or work layer id.
ROLE-CARDDEALER-005: `cardDealer` if stationary, anchor is stable and walkable.
ROLE-CARDDEALER-006: `cardDealer` if shop role, maps to shop kind.
ROLE-CARDDEALER-007: `cardDealer` if guard role, participates in patrol/law semantics.
ROLE-CARDDEALER-008: `cardDealer` if criminal role, participates in guild/backAlley semantics.
ROLE-CARDDEALER-009: `cardDealer` prompt text is sensible when nearby.
ROLE-CARDDEALER-010: `cardDealer` does not spawn on external wall or closed door.
### 28.6 Role `bartender`
ROLE-BARTENDER-001: `bartender` still appears in town.residents when appropriate.
ROLE-BARTENDER-002: `bartender` has valid faction assignment.
ROLE-BARTENDER-003: `bartender` has valid homeRoomId or home layer id.
ROLE-BARTENDER-004: `bartender` has valid workRoomId or work layer id.
ROLE-BARTENDER-005: `bartender` if stationary, anchor is stable and walkable.
ROLE-BARTENDER-006: `bartender` if shop role, maps to shop kind.
ROLE-BARTENDER-007: `bartender` if guard role, participates in patrol/law semantics.
ROLE-BARTENDER-008: `bartender` if criminal role, participates in guild/backAlley semantics.
ROLE-BARTENDER-009: `bartender` prompt text is sensible when nearby.
ROLE-BARTENDER-010: `bartender` does not spawn on external wall or closed door.
### 28.7 Role `guard`
ROLE-GUARD-001: `guard` still appears in town.residents when appropriate.
ROLE-GUARD-002: `guard` has valid faction assignment.
ROLE-GUARD-003: `guard` has valid homeRoomId or home layer id.
ROLE-GUARD-004: `guard` has valid workRoomId or work layer id.
ROLE-GUARD-005: `guard` if stationary, anchor is stable and walkable.
ROLE-GUARD-006: `guard` if shop role, maps to shop kind.
ROLE-GUARD-007: `guard` if guard role, participates in patrol/law semantics.
ROLE-GUARD-008: `guard` if criminal role, participates in guild/backAlley semantics.
ROLE-GUARD-009: `guard` prompt text is sensible when nearby.
ROLE-GUARD-010: `guard` does not spawn on external wall or closed door.
### 28.8 Role `resident`
ROLE-RESIDENT-001: `resident` still appears in town.residents when appropriate.
ROLE-RESIDENT-002: `resident` has valid faction assignment.
ROLE-RESIDENT-003: `resident` has valid homeRoomId or home layer id.
ROLE-RESIDENT-004: `resident` has valid workRoomId or work layer id.
ROLE-RESIDENT-005: `resident` if stationary, anchor is stable and walkable.
ROLE-RESIDENT-006: `resident` if shop role, maps to shop kind.
ROLE-RESIDENT-007: `resident` if guard role, participates in patrol/law semantics.
ROLE-RESIDENT-008: `resident` if criminal role, participates in guild/backAlley semantics.
ROLE-RESIDENT-009: `resident` prompt text is sensible when nearby.
ROLE-RESIDENT-010: `resident` does not spawn on external wall or closed door.
### 28.9 Role `thiefContact`
ROLE-THIEFCONTACT-001: `thiefContact` still appears in town.residents when appropriate.
ROLE-THIEFCONTACT-002: `thiefContact` has valid faction assignment.
ROLE-THIEFCONTACT-003: `thiefContact` has valid homeRoomId or home layer id.
ROLE-THIEFCONTACT-004: `thiefContact` has valid workRoomId or work layer id.
ROLE-THIEFCONTACT-005: `thiefContact` if stationary, anchor is stable and walkable.
ROLE-THIEFCONTACT-006: `thiefContact` if shop role, maps to shop kind.
ROLE-THIEFCONTACT-007: `thiefContact` if guard role, participates in patrol/law semantics.
ROLE-THIEFCONTACT-008: `thiefContact` if criminal role, participates in guild/backAlley semantics.
ROLE-THIEFCONTACT-009: `thiefContact` prompt text is sensible when nearby.
ROLE-THIEFCONTACT-010: `thiefContact` does not spawn on external wall or closed door.
### 28.10 Role `thief`
ROLE-THIEF-001: `thief` still appears in town.residents when appropriate.
ROLE-THIEF-002: `thief` has valid faction assignment.
ROLE-THIEF-003: `thief` has valid homeRoomId or home layer id.
ROLE-THIEF-004: `thief` has valid workRoomId or work layer id.
ROLE-THIEF-005: `thief` if stationary, anchor is stable and walkable.
ROLE-THIEF-006: `thief` if shop role, maps to shop kind.
ROLE-THIEF-007: `thief` if guard role, participates in patrol/law semantics.
ROLE-THIEF-008: `thief` if criminal role, participates in guild/backAlley semantics.
ROLE-THIEF-009: `thief` prompt text is sensible when nearby.
ROLE-THIEF-010: `thief` does not spawn on external wall or closed door.
### 28.11 Role `scribe`
ROLE-SCRIBE-001: `scribe` still appears in town.residents when appropriate.
ROLE-SCRIBE-002: `scribe` has valid faction assignment.
ROLE-SCRIBE-003: `scribe` has valid homeRoomId or home layer id.
ROLE-SCRIBE-004: `scribe` has valid workRoomId or work layer id.
ROLE-SCRIBE-005: `scribe` if stationary, anchor is stable and walkable.
ROLE-SCRIBE-006: `scribe` if shop role, maps to shop kind.
ROLE-SCRIBE-007: `scribe` if guard role, participates in patrol/law semantics.
ROLE-SCRIBE-008: `scribe` if criminal role, participates in guild/backAlley semantics.
ROLE-SCRIBE-009: `scribe` prompt text is sensible when nearby.
ROLE-SCRIBE-010: `scribe` does not spawn on external wall or closed door.
### 28.12 Role `questGiver`
ROLE-QUESTGIVER-001: `questGiver` still appears in town.residents when appropriate.
ROLE-QUESTGIVER-002: `questGiver` has valid faction assignment.
ROLE-QUESTGIVER-003: `questGiver` has valid homeRoomId or home layer id.
ROLE-QUESTGIVER-004: `questGiver` has valid workRoomId or work layer id.
ROLE-QUESTGIVER-005: `questGiver` if stationary, anchor is stable and walkable.
ROLE-QUESTGIVER-006: `questGiver` if shop role, maps to shop kind.
ROLE-QUESTGIVER-007: `questGiver` if guard role, participates in patrol/law semantics.
ROLE-QUESTGIVER-008: `questGiver` if criminal role, participates in guild/backAlley semantics.
ROLE-QUESTGIVER-009: `questGiver` prompt text is sensible when nearby.
ROLE-QUESTGIVER-010: `questGiver` does not spawn on external wall or closed door.
### 28.13 Role `blackMarketMerchant`
ROLE-BLACKMARKETMERCHANT-001: `blackMarketMerchant` still appears in town.residents when appropriate.
ROLE-BLACKMARKETMERCHANT-002: `blackMarketMerchant` has valid faction assignment.
ROLE-BLACKMARKETMERCHANT-003: `blackMarketMerchant` has valid homeRoomId or home layer id.
ROLE-BLACKMARKETMERCHANT-004: `blackMarketMerchant` has valid workRoomId or work layer id.
ROLE-BLACKMARKETMERCHANT-005: `blackMarketMerchant` if stationary, anchor is stable and walkable.
ROLE-BLACKMARKETMERCHANT-006: `blackMarketMerchant` if shop role, maps to shop kind.
ROLE-BLACKMARKETMERCHANT-007: `blackMarketMerchant` if guard role, participates in patrol/law semantics.
ROLE-BLACKMARKETMERCHANT-008: `blackMarketMerchant` if criminal role, participates in guild/backAlley semantics.
ROLE-BLACKMARKETMERCHANT-009: `blackMarketMerchant` prompt text is sensible when nearby.
ROLE-BLACKMARKETMERCHANT-010: `blackMarketMerchant` does not spawn on external wall or closed door.
### 28.14 Role `gateGuard`
ROLE-GATEGUARD-001: `gateGuard` still appears in town.residents when appropriate.
ROLE-GATEGUARD-002: `gateGuard` has valid faction assignment.
ROLE-GATEGUARD-003: `gateGuard` has valid homeRoomId or home layer id.
ROLE-GATEGUARD-004: `gateGuard` has valid workRoomId or work layer id.
ROLE-GATEGUARD-005: `gateGuard` if stationary, anchor is stable and walkable.
ROLE-GATEGUARD-006: `gateGuard` if shop role, maps to shop kind.
ROLE-GATEGUARD-007: `gateGuard` if guard role, participates in patrol/law semantics.
ROLE-GATEGUARD-008: `gateGuard` if criminal role, participates in guild/backAlley semantics.
ROLE-GATEGUARD-009: `gateGuard` prompt text is sensible when nearby.
ROLE-GATEGUARD-010: `gateGuard` does not spawn on external wall or closed door.
### 28.shop.1 Shop `general`
SHOP-GENERAL-001: `general` shop kind remains representable.
SHOP-GENERAL-002: `general` shop can be opened through existing VillageShopRoot or successor.
SHOP-GENERAL-003: `general` shop inventory can be filtered by actorRole or shopKind.
SHOP-GENERAL-004: `general` insufficient score path still shows user feedback.
SHOP-GENERAL-005: `general` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-GENERAL-006: `general` shop hostile/closed cases remain supported if relevant.
SHOP-GENERAL-007: `general` black market or special stock rules remain isolated from normal shops.
SHOP-GENERAL-008: `general` regression test or manual QA path exists.
### 28.shop.2 Shop `equipment`
SHOP-EQUIPMENT-001: `equipment` shop kind remains representable.
SHOP-EQUIPMENT-002: `equipment` shop can be opened through existing VillageShopRoot or successor.
SHOP-EQUIPMENT-003: `equipment` shop inventory can be filtered by actorRole or shopKind.
SHOP-EQUIPMENT-004: `equipment` insufficient score path still shows user feedback.
SHOP-EQUIPMENT-005: `equipment` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-EQUIPMENT-006: `equipment` shop hostile/closed cases remain supported if relevant.
SHOP-EQUIPMENT-007: `equipment` black market or special stock rules remain isolated from normal shops.
SHOP-EQUIPMENT-008: `equipment` regression test or manual QA path exists.
### 28.shop.3 Shop `potion`
SHOP-POTION-001: `potion` shop kind remains representable.
SHOP-POTION-002: `potion` shop can be opened through existing VillageShopRoot or successor.
SHOP-POTION-003: `potion` shop inventory can be filtered by actorRole or shopKind.
SHOP-POTION-004: `potion` insufficient score path still shows user feedback.
SHOP-POTION-005: `potion` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-POTION-006: `potion` shop hostile/closed cases remain supported if relevant.
SHOP-POTION-007: `potion` black market or special stock rules remain isolated from normal shops.
SHOP-POTION-008: `potion` regression test or manual QA path exists.
### 28.shop.4 Shop `butcher`
SHOP-BUTCHER-001: `butcher` shop kind remains representable.
SHOP-BUTCHER-002: `butcher` shop can be opened through existing VillageShopRoot or successor.
SHOP-BUTCHER-003: `butcher` shop inventory can be filtered by actorRole or shopKind.
SHOP-BUTCHER-004: `butcher` insufficient score path still shows user feedback.
SHOP-BUTCHER-005: `butcher` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-BUTCHER-006: `butcher` shop hostile/closed cases remain supported if relevant.
SHOP-BUTCHER-007: `butcher` black market or special stock rules remain isolated from normal shops.
SHOP-BUTCHER-008: `butcher` regression test or manual QA path exists.
### 28.shop.5 Shop `cards`
SHOP-CARDS-001: `cards` shop kind remains representable.
SHOP-CARDS-002: `cards` shop can be opened through existing VillageShopRoot or successor.
SHOP-CARDS-003: `cards` shop inventory can be filtered by actorRole or shopKind.
SHOP-CARDS-004: `cards` insufficient score path still shows user feedback.
SHOP-CARDS-005: `cards` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-CARDS-006: `cards` shop hostile/closed cases remain supported if relevant.
SHOP-CARDS-007: `cards` black market or special stock rules remain isolated from normal shops.
SHOP-CARDS-008: `cards` regression test or manual QA path exists.
### 28.shop.6 Shop `food`
SHOP-FOOD-001: `food` shop kind remains representable.
SHOP-FOOD-002: `food` shop can be opened through existing VillageShopRoot or successor.
SHOP-FOOD-003: `food` shop inventory can be filtered by actorRole or shopKind.
SHOP-FOOD-004: `food` insufficient score path still shows user feedback.
SHOP-FOOD-005: `food` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-FOOD-006: `food` shop hostile/closed cases remain supported if relevant.
SHOP-FOOD-007: `food` black market or special stock rules remain isolated from normal shops.
SHOP-FOOD-008: `food` regression test or manual QA path exists.
### 28.shop.7 Shop `florist`
SHOP-FLORIST-001: `florist` shop kind remains representable.
SHOP-FLORIST-002: `florist` shop can be opened through existing VillageShopRoot or successor.
SHOP-FLORIST-003: `florist` shop inventory can be filtered by actorRole or shopKind.
SHOP-FLORIST-004: `florist` insufficient score path still shows user feedback.
SHOP-FLORIST-005: `florist` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-FLORIST-006: `florist` shop hostile/closed cases remain supported if relevant.
SHOP-FLORIST-007: `florist` black market or special stock rules remain isolated from normal shops.
SHOP-FLORIST-008: `florist` regression test or manual QA path exists.
### 28.shop.8 Shop `jeweler`
SHOP-JEWELER-001: `jeweler` shop kind remains representable.
SHOP-JEWELER-002: `jeweler` shop can be opened through existing VillageShopRoot or successor.
SHOP-JEWELER-003: `jeweler` shop inventory can be filtered by actorRole or shopKind.
SHOP-JEWELER-004: `jeweler` insufficient score path still shows user feedback.
SHOP-JEWELER-005: `jeweler` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-JEWELER-006: `jeweler` shop hostile/closed cases remain supported if relevant.
SHOP-JEWELER-007: `jeweler` black market or special stock rules remain isolated from normal shops.
SHOP-JEWELER-008: `jeweler` regression test or manual QA path exists.
### 28.shop.9 Shop `tailor`
SHOP-TAILOR-001: `tailor` shop kind remains representable.
SHOP-TAILOR-002: `tailor` shop can be opened through existing VillageShopRoot or successor.
SHOP-TAILOR-003: `tailor` shop inventory can be filtered by actorRole or shopKind.
SHOP-TAILOR-004: `tailor` insufficient score path still shows user feedback.
SHOP-TAILOR-005: `tailor` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-TAILOR-006: `tailor` shop hostile/closed cases remain supported if relevant.
SHOP-TAILOR-007: `tailor` black market or special stock rules remain isolated from normal shops.
SHOP-TAILOR-008: `tailor` regression test or manual QA path exists.
### 28.shop.10 Shop `scribe`
SHOP-SCRIBE-001: `scribe` shop kind remains representable.
SHOP-SCRIBE-002: `scribe` shop can be opened through existing VillageShopRoot or successor.
SHOP-SCRIBE-003: `scribe` shop inventory can be filtered by actorRole or shopKind.
SHOP-SCRIBE-004: `scribe` insufficient score path still shows user feedback.
SHOP-SCRIBE-005: `scribe` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-SCRIBE-006: `scribe` shop hostile/closed cases remain supported if relevant.
SHOP-SCRIBE-007: `scribe` black market or special stock rules remain isolated from normal shops.
SHOP-SCRIBE-008: `scribe` regression test or manual QA path exists.
### 28.shop.11 Shop `clinic`
SHOP-CLINIC-001: `clinic` shop kind remains representable.
SHOP-CLINIC-002: `clinic` shop can be opened through existing VillageShopRoot or successor.
SHOP-CLINIC-003: `clinic` shop inventory can be filtered by actorRole or shopKind.
SHOP-CLINIC-004: `clinic` insufficient score path still shows user feedback.
SHOP-CLINIC-005: `clinic` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-CLINIC-006: `clinic` shop hostile/closed cases remain supported if relevant.
SHOP-CLINIC-007: `clinic` black market or special stock rules remain isolated from normal shops.
SHOP-CLINIC-008: `clinic` regression test or manual QA path exists.
### 28.shop.12 Shop `blackMarket`
SHOP-BLACKMARKET-001: `blackMarket` shop kind remains representable.
SHOP-BLACKMARKET-002: `blackMarket` shop can be opened through existing VillageShopRoot or successor.
SHOP-BLACKMARKET-003: `blackMarket` shop inventory can be filtered by actorRole or shopKind.
SHOP-BLACKMARKET-004: `blackMarket` insufficient score path still shows user feedback.
SHOP-BLACKMARKET-005: `blackMarket` successful purchase changes score/inventory/cosmetics as applicable.
SHOP-BLACKMARKET-006: `blackMarket` shop hostile/closed cases remain supported if relevant.
SHOP-BLACKMARKET-007: `blackMarket` black market or special stock rules remain isolated from normal shops.
SHOP-BLACKMARKET-008: `blackMarket` regression test or manual QA path exists.
## 29. Pseudocode Test Skeletons
These skeletons are not meant to compile verbatim. They specify the tests Codex should create using actual module names and helpers after implementation.
### 29.1 town footprint has four inside rooms
```ts
it('town footprint has four inside rooms', () => {
  const rooms = resolveTownFixture(seed);
  expect(insideRooms).toHaveLength(4);
  expect(coreDistricts).toEqual(new Set(["townCenter","market","residential","backAlley"]));
});
```
PSEUDOTEST-001-ASSERTION-001: const rooms = resolveTownFixture(seed);
PSEUDOTEST-001-ASSERTION-002: expect(insideRooms).toHaveLength(4);
PSEUDOTEST-001-ASSERTION-003: expect(coreDistricts).toEqual(new Set(["townCenter","market","residential","backAlley"]));
### 29.2 town influence has twelve non-core rooms
```ts
it('town influence has twelve non-core rooms', () => {
  const influence = getInfluenceRooms(placement);
  expect(influence).toHaveLength(12);
  expect(influence.every(r => r.role !== "inside")).toBe(true);
});
```
PSEUDOTEST-002-ASSERTION-001: const influence = getInfluenceRooms(placement);
PSEUDOTEST-002-ASSERTION-002: expect(influence).toHaveLength(12);
PSEUDOTEST-002-ASSERTION-003: expect(influence.every(r => r.role !== "inside")).toBe(true);
### 29.3 internal town edges are open
```ts
it('internal town edges are open', () => {
  for (const edge of internalCoreEdges) {
    expect(edgeHasBlockingWallRun(edge)).toBe(false);
  }
});
```
PSEUDOTEST-003-ASSERTION-001: for (const edge of internalCoreEdges) {
PSEUDOTEST-003-ASSERTION-002:   expect(edgeHasBlockingWallRun(edge)).toBe(false);
PSEUDOTEST-003-ASSERTION-003: }
### 29.4 external wall openings align
```ts
it('external wall openings align', () => {
  const entranceCore = getEntranceCoreRoom();
  const approach = getEntranceApproachRoom();
  expect(openingCenter(entranceCore)).toBe(openingCenter(approach));
  expect(openingWidth(approach)).toBe(5);
});
```
PSEUDOTEST-004-ASSERTION-001: const entranceCore = getEntranceCoreRoom();
PSEUDOTEST-004-ASSERTION-002: const approach = getEntranceApproachRoom();
PSEUDOTEST-004-ASSERTION-003: expect(openingCenter(entranceCore)).toBe(openingCenter(approach));
PSEUDOTEST-004-ASSERTION-004: expect(openingWidth(approach)).toBe(5);
### 29.5 thieves guild still builds
```ts
it('thieves guild still builds', () => {
  const instance = ensureLayerInstance(thievesGuildEntrance);
  const room = world.getRoom(instance.id);
  expect(room.layer?.templateId).toBe("thievesGuild");
  expect(room.town?.id).toBe(town.id);
});
```
PSEUDOTEST-005-ASSERTION-001: const instance = ensureLayerInstance(thievesGuildEntrance);
PSEUDOTEST-005-ASSERTION-002: const room = world.getRoom(instance.id);
PSEUDOTEST-005-ASSERTION-003: expect(room.layer?.templateId).toBe("thievesGuild");
PSEUDOTEST-005-ASSERTION-004: expect(room.town?.id).toBe(town.id);
### 29.6 tavern builds as town interior
```ts
it('tavern builds as town interior', () => {
  const entrance = findBuildingEntrance(town,"tavern");
  const instance = world.ensureLayerInstance(entrance);
  const room = world.getRoom(instance.id);
  expect(room.layer?.kind).toBe("townInterior");
});
```
PSEUDOTEST-006-ASSERTION-001: const entrance = findBuildingEntrance(town,"tavern");
PSEUDOTEST-006-ASSERTION-002: const instance = world.ensureLayerInstance(entrance);
PSEUDOTEST-006-ASSERTION-003: const room = world.getRoom(instance.id);
PSEUDOTEST-006-ASSERTION-004: expect(room.layer?.kind).toBe("townInterior");
### 29.7 break-in applies town crime
```ts
it('break-in applies town crime', () => {
  enterPrivateHomeWithoutPermission();
  const town = game.getCurrentTown();
  expect(town.wantedLevel).toBeGreaterThan(previousWanted);
});
```
PSEUDOTEST-007-ASSERTION-001: enterPrivateHomeWithoutPermission();
PSEUDOTEST-007-ASSERTION-002: const town = game.getCurrentTown();
PSEUDOTEST-007-ASSERTION-003: expect(town.wantedLevel).toBeGreaterThan(previousWanted);
### 29.8 owned object theft applies theft
```ts
it('owned object theft applies theft', () => {
  takeOwnedObjectFromShelf();
  expect(lastTownCrime.kind).toBe("theft");
});
```
PSEUDOTEST-008-ASSERTION-001: takeOwnedObjectFromShelf();
PSEUDOTEST-008-ASSERTION-002: expect(lastTownCrime.kind).toBe("theft");
### 29.9 shop robbery stronger than theft
```ts
it('shop robbery stronger than theft', () => {
  takeBehindCounterObjectWhileWitnessed();
  expect(lastTownCrime.kind).toBe("shopRobbery");
});
```
PSEUDOTEST-009-ASSERTION-001: takeBehindCounterObjectWhileWitnessed();
PSEUDOTEST-009-ASSERTION-002: expect(lastTownCrime.kind).toBe("shopRobbery");
### 29.10 legacy district names normalize
```ts
it('legacy district names normalize', () => {
  expect(normalizeTownDistrictKind("marketStreet")).toBe("market");
  expect(normalizeTownDistrictKind("tavernInterior")).toBe("tavern");
});
```
PSEUDOTEST-010-ASSERTION-001: expect(normalizeTownDistrictKind("marketStreet")).toBe("market");
PSEUDOTEST-010-ASSERTION-002: expect(normalizeTownDistrictKind("tavernInterior")).toBe("tavern");
## 30. Per-File Implementation Checklist
### 30.1 `src/world/town.ts`
FILE-CHECK-SRC_WORLD_TOWN_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD_TOWN_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD_TOWN_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD_TOWN_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD_TOWN_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD_TOWN_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD_TOWN_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD_TOWN_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD_TOWN_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD_TOWN_TS-010: include migration notes in PR description.
### 30.2 `src/world/generation/townStructureResolver.ts`
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD_GENERATION_TOWNSTRUCTURERESOLVER_TS-010: include migration notes in PR description.
### 30.3 `src/world/generation/multiRoomStructures.ts`
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD_GENERATION_MULTIROOMSTRUCTURES_TS-010: include migration notes in PR description.
### 30.4 `src/world/generation/stages/structureOperations.ts`
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD_GENERATION_STAGES_STRUCTUREOPERATIONS_TS-010: include migration notes in PR description.
### 30.5 `src/world/worldService.ts`
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD_WORLDSERVICE_TS-010: include migration notes in PR description.
### 30.6 `src/world/types.ts`
FILE-CHECK-SRC_WORLD_TYPES_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD_TYPES_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD_TYPES_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD_TYPES_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD_TYPES_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD_TYPES_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD_TYPES_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD_TYPES_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD_TYPES_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD_TYPES_TS-010: include migration notes in PR description.
### 30.7 `src/world/townRoles.ts`
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD_TOWNROLES_TS-010: include migration notes in PR description.
### 30.8 `src/layers/layerTypes.ts`
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-001: read current imports before editing.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_LAYERS_LAYERTYPES_TS-010: include migration notes in PR description.
### 30.9 `src/scenes/snakeScene.ts`
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-001: read current imports before editing.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_SCENES_SNAKESCENE_TS-010: include migration notes in PR description.
### 30.10 `src/ui/snakeRenderer.ts`
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-001: read current imports before editing.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_UI_SNAKERENDERER_TS-010: include migration notes in PR description.
### 30.11 `src/ui/minimapRenderer.ts`
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-001: read current imports before editing.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_UI_MINIMAPRENDERER_TS-010: include migration notes in PR description.
### 30.12 `src/world/__tests__/worldGenerationFairness.test.ts`
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-001: read current imports before editing.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-002: add or update focused tests before behavior change when possible.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-003: preserve existing exports unless intentionally wrapped.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-004: avoid circular dependencies.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-005: keep deterministic generation seeds stable.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-006: update comments for new 2x2/4x4 terminology.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-007: run TypeScript after edit.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-008: verify no renderer emits unsupported tile.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-009: verify no current town function disappeared.
FILE-CHECK-SRC_WORLD___TESTS___WORLDGENERATIONFAIRNESS_TEST_TS-010: include migration notes in PR description.
## 31. Review Questions For The PR
PR-QUESTION-001: Can a player enter, traverse, shop, quest, use guild functions, and exit town without encountering a dead end?
PR-QUESTION-002: Can a player understand the town as a walled city rather than separate rooms?
PR-QUESTION-003: Does the 4x4 influence footprint avoid making towns annoying to navigate?
PR-QUESTION-004: Are all old functions still present or intentionally wrapped?
PR-QUESTION-005: Are old saves and old district ids safe?
PR-QUESTION-006: Do interiors use different sizes appropriately?
PR-QUESTION-007: Do interior doors have enough exposed walkable space?
PR-QUESTION-008: Does theft feel physical in at least the first implemented cases?
PR-QUESTION-009: Does break-in exist as a physical interaction or clear stub?
PR-QUESTION-010: Does the tavern do the same high-value work it did before, but as an interior?
PR-QUESTION-011: Does the thieves guild still behave exactly as before from the player perspective?
PR-QUESTION-012: Are tests sufficient to prevent accidental return to internal city walls?
PR-QUESTION-013: Is the minimap still readable?
PR-QUESTION-014: Did performance remain acceptable?
PR-QUESTION-015: Did build/typecheck/test pass?
## 32. Commit-Level Work Breakdown
A single PR can still be reviewed in commit-sized units. The following breakdown is a concrete checklist for sequencing the implementation while keeping the PR coherent.
### 32.1 `compat-types`
COMMIT-GOAL-001: Add compatibility types and normalization helpers without changing generation.
COMMIT-COMPAT-TYPES-CHECK-001: has focused tests.
COMMIT-COMPAT-TYPES-CHECK-002: does not remove old exports.
COMMIT-COMPAT-TYPES-CHECK-003: keeps game compiling.
COMMIT-COMPAT-TYPES-CHECK-004: is independently reviewable.
COMMIT-COMPAT-TYPES-CHECK-005: does not mix unrelated balance changes.
COMMIT-COMPAT-TYPES-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-COMPAT-TYPES-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-COMPAT-TYPES-CHECK-008: does not introduce unsupported tile chars.
COMMIT-COMPAT-TYPES-CHECK-009: does not bypass current world generation safety rules.
COMMIT-COMPAT-TYPES-CHECK-010: preserves current town functions.
### 32.2 `town-tests-fixtures`
COMMIT-GOAL-002: Add town fixture helpers and failing tests for 2x2 core and 4x4 influence.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-001: has focused tests.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-002: does not remove old exports.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-003: keeps game compiling.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-004: is independently reviewable.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-005: does not mix unrelated balance changes.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-008: does not introduce unsupported tile chars.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-009: does not bypass current world generation safety rules.
COMMIT-TOWN-TESTS-FIXTURES-CHECK-010: preserves current town functions.
### 32.3 `footprint-v2`
COMMIT-GOAL-003: Implement new footprint and resolver behavior behind compatibility exports.
COMMIT-FOOTPRINT-V2-CHECK-001: has focused tests.
COMMIT-FOOTPRINT-V2-CHECK-002: does not remove old exports.
COMMIT-FOOTPRINT-V2-CHECK-003: keeps game compiling.
COMMIT-FOOTPRINT-V2-CHECK-004: is independently reviewable.
COMMIT-FOOTPRINT-V2-CHECK-005: does not mix unrelated balance changes.
COMMIT-FOOTPRINT-V2-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-FOOTPRINT-V2-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-FOOTPRINT-V2-CHECK-008: does not introduce unsupported tile chars.
COMMIT-FOOTPRINT-V2-CHECK-009: does not bypass current world generation safety rules.
COMMIT-FOOTPRINT-V2-CHECK-010: preserves current town functions.
### 32.4 `external-wall-renderer`
COMMIT-GOAL-004: Update town renderer to use external-only walls and open internal streets.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-001: has focused tests.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-002: does not remove old exports.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-003: keeps game compiling.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-004: is independently reviewable.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-005: does not mix unrelated balance changes.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-008: does not introduce unsupported tile chars.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-009: does not bypass current world generation safety rules.
COMMIT-EXTERNAL-WALL-RENDERER-CHECK-010: preserves current town functions.
### 32.5 `perimeter-v2`
COMMIT-GOAL-005: Update influence/perimeter stamping and gate/exit approach protection.
COMMIT-PERIMETER-V2-CHECK-001: has focused tests.
COMMIT-PERIMETER-V2-CHECK-002: does not remove old exports.
COMMIT-PERIMETER-V2-CHECK-003: keeps game compiling.
COMMIT-PERIMETER-V2-CHECK-004: is independently reviewable.
COMMIT-PERIMETER-V2-CHECK-005: does not mix unrelated balance changes.
COMMIT-PERIMETER-V2-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-PERIMETER-V2-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-PERIMETER-V2-CHECK-008: does not introduce unsupported tile chars.
COMMIT-PERIMETER-V2-CHECK-009: does not bypass current world generation safety rules.
COMMIT-PERIMETER-V2-CHECK-010: preserves current town functions.
### 32.6 `interior-registry`
COMMIT-GOAL-006: Introduce generic townInterior registry and move thieves guild into it.
COMMIT-INTERIOR-REGISTRY-CHECK-001: has focused tests.
COMMIT-INTERIOR-REGISTRY-CHECK-002: does not remove old exports.
COMMIT-INTERIOR-REGISTRY-CHECK-003: keeps game compiling.
COMMIT-INTERIOR-REGISTRY-CHECK-004: is independently reviewable.
COMMIT-INTERIOR-REGISTRY-CHECK-005: does not mix unrelated balance changes.
COMMIT-INTERIOR-REGISTRY-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-INTERIOR-REGISTRY-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-INTERIOR-REGISTRY-CHECK-008: does not introduce unsupported tile chars.
COMMIT-INTERIOR-REGISTRY-CHECK-009: does not bypass current world generation safety rules.
COMMIT-INTERIOR-REGISTRY-CHECK-010: preserves current town functions.
### 32.7 `tavern-interior`
COMMIT-GOAL-007: Implement tavern as a large interior and route tavern roles there.
COMMIT-TAVERN-INTERIOR-CHECK-001: has focused tests.
COMMIT-TAVERN-INTERIOR-CHECK-002: does not remove old exports.
COMMIT-TAVERN-INTERIOR-CHECK-003: keeps game compiling.
COMMIT-TAVERN-INTERIOR-CHECK-004: is independently reviewable.
COMMIT-TAVERN-INTERIOR-CHECK-005: does not mix unrelated balance changes.
COMMIT-TAVERN-INTERIOR-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-TAVERN-INTERIOR-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-TAVERN-INTERIOR-CHECK-008: does not introduce unsupported tile chars.
COMMIT-TAVERN-INTERIOR-CHECK-009: does not bypass current world generation safety rules.
COMMIT-TAVERN-INTERIOR-CHECK-010: preserves current town functions.
### 32.8 `store-interiors`
COMMIT-GOAL-008: Implement general store, butcher shop, and potion maker interiors.
COMMIT-STORE-INTERIORS-CHECK-001: has focused tests.
COMMIT-STORE-INTERIORS-CHECK-002: does not remove old exports.
COMMIT-STORE-INTERIORS-CHECK-003: keeps game compiling.
COMMIT-STORE-INTERIORS-CHECK-004: is independently reviewable.
COMMIT-STORE-INTERIORS-CHECK-005: does not mix unrelated balance changes.
COMMIT-STORE-INTERIORS-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-STORE-INTERIORS-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-STORE-INTERIORS-CHECK-008: does not introduce unsupported tile chars.
COMMIT-STORE-INTERIORS-CHECK-009: does not bypass current world generation safety rules.
COMMIT-STORE-INTERIORS-CHECK-010: preserves current town functions.
### 32.9 `home-interiors`
COMMIT-GOAL-009: Implement residential home interiors and private entry metadata.
COMMIT-HOME-INTERIORS-CHECK-001: has focused tests.
COMMIT-HOME-INTERIORS-CHECK-002: does not remove old exports.
COMMIT-HOME-INTERIORS-CHECK-003: keeps game compiling.
COMMIT-HOME-INTERIORS-CHECK-004: is independently reviewable.
COMMIT-HOME-INTERIORS-CHECK-005: does not mix unrelated balance changes.
COMMIT-HOME-INTERIORS-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-HOME-INTERIORS-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-HOME-INTERIORS-CHECK-008: does not introduce unsupported tile chars.
COMMIT-HOME-INTERIORS-CHECK-009: does not bypass current world generation safety rules.
COMMIT-HOME-INTERIORS-CHECK-010: preserves current town functions.
### 32.10 `crime-objects`
COMMIT-GOAL-010: Add owned object and private-zone crime primitives.
COMMIT-CRIME-OBJECTS-CHECK-001: has focused tests.
COMMIT-CRIME-OBJECTS-CHECK-002: does not remove old exports.
COMMIT-CRIME-OBJECTS-CHECK-003: keeps game compiling.
COMMIT-CRIME-OBJECTS-CHECK-004: is independently reviewable.
COMMIT-CRIME-OBJECTS-CHECK-005: does not mix unrelated balance changes.
COMMIT-CRIME-OBJECTS-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-CRIME-OBJECTS-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-CRIME-OBJECTS-CHECK-008: does not introduce unsupported tile chars.
COMMIT-CRIME-OBJECTS-CHECK-009: does not bypass current world generation safety rules.
COMMIT-CRIME-OBJECTS-CHECK-010: preserves current town functions.
### 32.11 `prompt-ui`
COMMIT-GOAL-011: Wire building entrance prompts, shop prompts, guild prompts, and quest board prompts.
COMMIT-PROMPT-UI-CHECK-001: has focused tests.
COMMIT-PROMPT-UI-CHECK-002: does not remove old exports.
COMMIT-PROMPT-UI-CHECK-003: keeps game compiling.
COMMIT-PROMPT-UI-CHECK-004: is independently reviewable.
COMMIT-PROMPT-UI-CHECK-005: does not mix unrelated balance changes.
COMMIT-PROMPT-UI-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-PROMPT-UI-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-PROMPT-UI-CHECK-008: does not introduce unsupported tile chars.
COMMIT-PROMPT-UI-CHECK-009: does not bypass current world generation safety rules.
COMMIT-PROMPT-UI-CHECK-010: preserves current town functions.
### 32.12 `music-zones`
COMMIT-GOAL-012: Update town music, ambience priority, and turn-based zone classification.
COMMIT-MUSIC-ZONES-CHECK-001: has focused tests.
COMMIT-MUSIC-ZONES-CHECK-002: does not remove old exports.
COMMIT-MUSIC-ZONES-CHECK-003: keeps game compiling.
COMMIT-MUSIC-ZONES-CHECK-004: is independently reviewable.
COMMIT-MUSIC-ZONES-CHECK-005: does not mix unrelated balance changes.
COMMIT-MUSIC-ZONES-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-MUSIC-ZONES-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-MUSIC-ZONES-CHECK-008: does not introduce unsupported tile chars.
COMMIT-MUSIC-ZONES-CHECK-009: does not bypass current world generation safety rules.
COMMIT-MUSIC-ZONES-CHECK-010: preserves current town functions.
### 32.13 `save-migration`
COMMIT-GOAL-013: Add save/district normalization and old town compatibility handling.
COMMIT-SAVE-MIGRATION-CHECK-001: has focused tests.
COMMIT-SAVE-MIGRATION-CHECK-002: does not remove old exports.
COMMIT-SAVE-MIGRATION-CHECK-003: keeps game compiling.
COMMIT-SAVE-MIGRATION-CHECK-004: is independently reviewable.
COMMIT-SAVE-MIGRATION-CHECK-005: does not mix unrelated balance changes.
COMMIT-SAVE-MIGRATION-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-SAVE-MIGRATION-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-SAVE-MIGRATION-CHECK-008: does not introduce unsupported tile chars.
COMMIT-SAVE-MIGRATION-CHECK-009: does not bypass current world generation safety rules.
COMMIT-SAVE-MIGRATION-CHECK-010: preserves current town functions.
### 32.14 `regression-suite`
COMMIT-GOAL-014: Complete tests, run typecheck/build/test, and update documentation.
COMMIT-REGRESSION-SUITE-CHECK-001: has focused tests.
COMMIT-REGRESSION-SUITE-CHECK-002: does not remove old exports.
COMMIT-REGRESSION-SUITE-CHECK-003: keeps game compiling.
COMMIT-REGRESSION-SUITE-CHECK-004: is independently reviewable.
COMMIT-REGRESSION-SUITE-CHECK-005: does not mix unrelated balance changes.
COMMIT-REGRESSION-SUITE-CHECK-006: updates docs/comments if public behavior changes.
COMMIT-REGRESSION-SUITE-CHECK-007: has manual smoke instructions if UI-facing.
COMMIT-REGRESSION-SUITE-CHECK-008: does not introduce unsupported tile chars.
COMMIT-REGRESSION-SUITE-CHECK-009: does not bypass current world generation safety rules.
COMMIT-REGRESSION-SUITE-CHECK-010: preserves current town functions.
## 33. Generated Data Examples
These examples are not exact final code. They show the shape of generated data that should be easy to assert in tests.
### 33.1 `coreDistricts`
```json
{
  "example": "coreDistricts",
  "expected": [
    "townCenter at offset 1,1",
    "market at offset 2,1",
    "residential at offset 1,2",
    "backAlley at offset 2,2"
  ]
}
```
DATA-EXAMPLE-COREDISTRICTS-001: townCenter at offset 1,1.
DATA-EXAMPLE-COREDISTRICTS-002: market at offset 2,1.
DATA-EXAMPLE-COREDISTRICTS-003: residential at offset 1,2.
DATA-EXAMPLE-COREDISTRICTS-004: backAlley at offset 2,2.
### 33.2 `entrance`
```json
{
  "example": "entrance",
  "expected": [
    "side west in canonical orientation",
    "core room townCenter or residential depending selected side",
    "approach room at offset 0,1 or 0,2",
    "opening width 5",
    "runup depth 5"
  ]
}
```
DATA-EXAMPLE-ENTRANCE-001: side west in canonical orientation.
DATA-EXAMPLE-ENTRANCE-002: core room townCenter or residential depending selected side.
DATA-EXAMPLE-ENTRANCE-003: approach room at offset 0,1 or 0,2.
DATA-EXAMPLE-ENTRANCE-004: opening width 5.
DATA-EXAMPLE-ENTRANCE-005: runup depth 5.
### 33.3 `exit`
```json
{
  "example": "exit",
  "expected": [
    "side south in canonical orientation",
    "core room residential or backAlley depending selected side",
    "approach room at offset 1,3 or 2,3",
    "opening width 5",
    "runup depth 5"
  ]
}
```
DATA-EXAMPLE-EXIT-001: side south in canonical orientation.
DATA-EXAMPLE-EXIT-002: core room residential or backAlley depending selected side.
DATA-EXAMPLE-EXIT-003: approach room at offset 1,3 or 2,3.
DATA-EXAMPLE-EXIT-004: opening width 5.
DATA-EXAMPLE-EXIT-005: runup depth 5.
### 33.4 `marketBuildings`
```json
{
  "example": "marketBuildings",
  "expected": [
    "generalStore door",
    "butcherShop door",
    "potionMaker door",
    "optional equipment merchant counter",
    "owned shelf objects"
  ]
}
```
DATA-EXAMPLE-MARKETBUILDINGS-001: generalStore door.
DATA-EXAMPLE-MARKETBUILDINGS-002: butcherShop door.
DATA-EXAMPLE-MARKETBUILDINGS-003: potionMaker door.
DATA-EXAMPLE-MARKETBUILDINGS-004: optional equipment merchant counter.
DATA-EXAMPLE-MARKETBUILDINGS-005: owned shelf objects.
### 33.5 `townCenterFeatures`
```json
{
  "example": "townCenterFeatures",
  "expected": [
    "quest board",
    "scribe/clerk anchor",
    "guard anchor",
    "notice/law display",
    "gate road if entrance edge touches townCenter"
  ]
}
```
DATA-EXAMPLE-TOWNCENTERFEATURES-001: quest board.
DATA-EXAMPLE-TOWNCENTERFEATURES-002: scribe/clerk anchor.
DATA-EXAMPLE-TOWNCENTERFEATURES-003: guard anchor.
DATA-EXAMPLE-TOWNCENTERFEATURES-004: notice/law display.
DATA-EXAMPLE-TOWNCENTERFEATURES-005: gate road if entrance edge touches townCenter.
### 33.6 `residentialFeatures`
```json
{
  "example": "residentialFeatures",
  "expected": [
    "four home doors",
    "private residentialHome interiors",
    "resident anchors",
    "owned household objects",
    "break-in hooks"
  ]
}
```
DATA-EXAMPLE-RESIDENTIALFEATURES-001: four home doors.
DATA-EXAMPLE-RESIDENTIALFEATURES-002: private residentialHome interiors.
DATA-EXAMPLE-RESIDENTIALFEATURES-003: resident anchors.
DATA-EXAMPLE-RESIDENTIALFEATURES-004: owned household objects.
DATA-EXAMPLE-RESIDENTIALFEATURES-005: break-in hooks.
### 33.7 `backAlleyFeatures`
```json
{
  "example": "backAlleyFeatures",
  "expected": [
    "guild grate",
    "thiefContact anchor",
    "thief anchor",
    "black market/guild clue",
    "lower patrol chance"
  ]
}
```
DATA-EXAMPLE-BACKALLEYFEATURES-001: guild grate.
DATA-EXAMPLE-BACKALLEYFEATURES-002: thiefContact anchor.
DATA-EXAMPLE-BACKALLEYFEATURES-003: thief anchor.
DATA-EXAMPLE-BACKALLEYFEATURES-004: black market/guild clue.
DATA-EXAMPLE-BACKALLEYFEATURES-005: lower patrol chance.
### 33.8 `tavernInterior`
```json
{
  "example": "tavernInterior",
  "expected": [
    "bartender anchor",
    "cardDealer anchor",
    "questGiver anchor",
    "tables",
    "food shop",
    "rumor/social/dating hooks"
  ]
}
```
DATA-EXAMPLE-TAVERNINTERIOR-001: bartender anchor.
DATA-EXAMPLE-TAVERNINTERIOR-002: cardDealer anchor.
DATA-EXAMPLE-TAVERNINTERIOR-003: questGiver anchor.
DATA-EXAMPLE-TAVERNINTERIOR-004: tables.
DATA-EXAMPLE-TAVERNINTERIOR-005: food shop.
DATA-EXAMPLE-TAVERNINTERIOR-006: rumor/social/dating hooks.
## 34. Negative Tests
NEGATIVE-TEST-001: No generated core room may contain old physical district `tavernInterior` as its canonical district.
NEGATIVE-TEST-002: No generated core room may contain old physical district `gate` as its canonical district.
NEGATIVE-TEST-003: No generated core room may contain old physical district `townExit` as its canonical district.
NEGATIVE-TEST-004: No internal edge between two core districts may have a four-tile-or-longer shared wall run.
NEGATIVE-TEST-005: No shop interior may omit an exit.
NEGATIVE-TEST-006: No residential private interior may be treated as public by default.
NEGATIVE-TEST-007: No unsupported LayerTemplateId may be generated.
NEGATIVE-TEST-008: No townInterior layer may lose its town id.
NEGATIVE-TEST-009: No theft object may be created without an owner or explicit public ownership.
NEGATIVE-TEST-010: No private-zone entry may spam wanted level every movement tick.
NEGATIVE-TEST-011: No town room may spawn generic treasure/powerup through WorldService unless explicitly allowed.
NEGATIVE-TEST-012: No influence room should count as inside town for shop/guild interactions unless a building entrance exists there intentionally.
NEGATIVE-TEST-013: No old exported function may disappear from `src/world/town.ts` public API without wrapper.
NEGATIVE-TEST-014: No renderer-emitted town tile may be invisible on the minimap by accident if it blocks movement.
NEGATIVE-TEST-015: No new test may skip all town rooms without a replacement town-specific assertion.
## 35. Open Decisions To Resolve Before Coding
OPEN-DECISION-001: `entrance-placement` — Should entrance edge be random among four sides, derived from old rotated west side, or biased toward nearest road?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-002: `exit-placement` — Should entrance and exit be allowed on the same side for tiny towns or forced apart?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-003: `district-orientation` — Should townCenter always be northwest canonical before rotation, or should district layout rotate/mirror separately?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-004: `building-doors` — Should a building door be a `Y` tile, an interact-only marker, or both?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-005: `home-count` — How many residentialHome interiors should be generated per residential district in first pass?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-006: `shop-count` — Do generalStore/equipmentMerchant share one general store or separate storefronts?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-007: `tavern-size` — Should tavern use almost full grid like current tavernInterior or a smaller rectangle inside the room?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-008: `crime-prompt` — Should entering a private home warn before break-in or immediately apply breakIn?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-009: `witnessing` — Is first-pass witnessing radius-based only, or should line-of-sight be included?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-010: `town-music` — Should tavern have distinct music or use town music in first pass?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-011: `guild-door` — Should undiscovered guild entrance be physically present but hidden, or only appear after discovery?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
OPEN-DECISION-012: `save-migration` — Should old physical town rooms lazily regenerate as new town on next visit or remain legacy until a new run?
  - Default recommendation: choose the option that preserves current behavior first and improves player readability second.
## 36. Final Anti-Regression Mantra
MANTRA-001: The town gets smaller, not poorer.
MANTRA-002: The walls move outward, not inward.
MANTRA-003: The tavern moves inside, but keeps its job.
MANTRA-004: The thieves guild becomes generic infrastructure, but keeps its identity.
MANTRA-005: Crime becomes physical, but old crime consequences survive.
MANTRA-006: Stores get doors, but shop menus still work.
MANTRA-007: Homes become interiors, but residents remain residents.
MANTRA-008: Perimeter remains meaningful, but does not become navigation tax.
MANTRA-009: Tests should catch accidental removal of every current town function.
MANTRA-010: The player should understand the city in one glance.
