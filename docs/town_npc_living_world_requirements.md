# Town and NPC Living World Requirements

## Status and Completion Gate

This document defines the next town, NPC, structure-locator, tavern rest, patrol,
faction, and humanoid-combat pass for **Snake for the Modern Gamer**.

> **NON-NEGOTIABLE DEFINITION OF DONE:** This feature set is not done until every
> user story in this document has a passing headless integration test under
> `src/game/__tests__/stories`. Unit tests, browser checks, screenshots, manual
> verification, and partial implementations may supplement those tests, but none
> of them replace the required headless story coverage.

## 1. Product Outcome

Towns must become places whose people visibly live, work, close businesses,
respond to weather, travel, socialize, sleep, defend their neighbors, and react
to trouble. The player should be able to infer what is happening from physical
doors, Actor movement, activity props, interiors, and world events rather than
from permanent UI badges.

The pass must deepen the existing systems instead of creating parallel clocks,
NPC records, room caches, faction tables, or combat identities.

## 2. Governing Principles

1. **Physical space remains physical.** Town districts and wilderness patrol
   rooms are normal playable rooms. Menus are for interactions, not navigation.
2. **Open doors preserve automatic entry.** If entering is the only available
   verb, stepping through the doorway enters immediately.
3. **Actor is the person.** Schedule, activity, combat loadout, active weapon,
   memory, faction, health, and location belong to the persistent Actor.
4. **World atmosphere is the clock.** Day phase, weather, season, and sky events
   come from `WorldAtmosphereSystem`.
5. **WorldService is the room owner.** Locator searches must not generate or
   cache a field of rooms merely to inspect deterministic world intent.
6. **Stable seeds produce stable lives.** Long-lived decisions use stable hashes
   or dedicated deterministic random streams and do not move when unrelated RNG
   calls are added.
7. **Tile identity defines behavior.** A structural roof is solid because of its
   tile capabilities, not because it happens to share a display character with a
   canopy.
8. **Activity is not affordance.** Props show what an Actor is doing. Indicators
   communicate exceptional, immediately relevant information.
9. **Combat presentation follows combat state.** The sword prop and slash juice
   must be driven by the same canonical attack event that applies damage.
10. **Tests observe the real composition.** Headless stories use a real
    `SnakeGame`, canonical clocks, room generation, Actor simulation, save/load,
    and public gameplay entry points.

## 3. Canonical System Ownership

| Concern | Canonical owner or extension point |
| --- | --- |
| Persistent humanoid identity | `Actor`, `ActorRegistry`, `ActorSystem` |
| Base schedules and runtime goals | `ActorSchedule`, `actorPresence.ts`, `ActorSystem` |
| Weather and time | `WorldAtmosphereSystem` |
| Weather interruptions | `actorEnvironment.ts` layered over schedule intent |
| Activity props | `Actor.activity`, `actorActivityProps.ts` |
| Exceptional indicators | `actorIndicators.ts` |
| Faction hostility | `factionRelations.ts` and Actor faction-conflict goals |
| Town geometry and vicinity | `MultiRoomStructureResolver` / town resolver extensions |
| Lazy room creation and cache | `WorldService` |
| Biome locators | `biomeLocators.ts` and generated item registration |
| Structure planning and lookup | New deterministic world-feature intent resolver/index |
| Doors and interiors | Town building/layer entrance contracts and tile capabilities |
| Player and Actor damage | Existing canonical damage/Actor health paths |
| Cross-system acceptance | Headless User Story Harness |

## 4. Functional Requirements

### 4.1 Doors, Locks, Hours, and Service Availability

1. An open, accessible building door automatically enters its interior when the
   snake crosses the entrance. It must not display an interaction button or
   confirmation screen.
2. A closed or locked door blocks movement and exposes an interaction surface.
3. A business door interaction identifies the business, states that it is
   locked, shows its hours, and shows the next opening time.
4. Exceptional closure reasons may replace or supplement normal hours, including
   raid, curfew, owner absence, weather emergency, or condemnation.
5. Contextual locked-door actions may include knock, use key, pick lock, or
   leave. Their availability comes from player state and door policy.
6. Town shops lock when their service schedule closes and unlock when it opens.
7. Town merchants cannot buy or sell while their service is closed, even if the
   Actor is encountered elsewhere or awakened.
8. Village and special merchants may explicitly allow informal off-hours trade.
   This is an opt-in policy, not the town default.
9. Residential doors use the same access contract. Private hours are not shown
   unless the player has learned them or the home intentionally publishes them.
10. Door state, service state, and Actor location must not contradict one another
    after schedule changes or save/load.

### 4.2 Seeded Actor Schedules

1. Schedule variation must be deterministic per world, Actor, role, personality,
   town culture, day, and relevant event state.
2. Role supplies obligations and valid destinations; personality chooses among
   valid variations. Personality must never cause a role to abandon mandatory
   duties without an authored exception.
3. Schedules must support work, home, sleep, tavern, card table, meals, errands,
   worship/study, maintenance, mapping, leisure, and patrol destinations.
4. The scheduler writes base intent to `Actor.scheduleGoal`. Threats, faction
   conflict, raids, conversations, weather, and other urgent goals may interrupt
   it according to priority.
5. When an interrupt ends, the Actor resumes or recomputes the valid base
   schedule rather than becoming permanently idle.
6. Schedule changes move the same Actor identity across rooms and interiors.
   Authored resident definitions are spawn metadata and must not recreate or
   reset the person.
7. Shops derive service availability from a schedule/service policy, not merely
   from whether a merchant happens to be standing at a counter.
8. Multiple workers and shifts are supported so a future business can remain open
   while one worker leaves.

### 4.3 Weather and Sky-Event Schedules

1. Weather modifies or interrupts schedules through the canonical atmosphere
   state.
2. Storms, heatwaves, cold fronts, rain, and fog may alter routes, destinations,
   activities, staffing, patrol composition, and tavern attendance.
3. Personality changes the response: cautious or cowardly Actors seek safety
   earlier; dutiful guards maintain watch; stubborn or outdoors-oriented Actors
   may continue lower-risk work.
4. Severe weather overrides mild errands but does not override combat, immediate
   rescue, or another higher-priority emergency.
5. Sky events can create specialized behavior, such as a wizard observing an
   aurora or blood moon, without introducing another time system.
6. The environment reaction records enough canonical state to avoid repeatedly
   applying mood/need deltas for the same unchanged condition.
7. When weather clears, affected Actors resume an appropriate current schedule.

### 4.4 Activity Props and Indicators

1. Activity props derive only from canonical `Actor.activity` or a canonical
   combat event/state owned by the Actor system.
2. Required props include sword, ranged weapon, shield, fishing rod, merchant
   bag, beer mug, cards, map/compass, book, broom, hammer/wrench, meal, cooking
   utensil, lantern, delivery crate/sack, and optional performance instrument.
3. A card dealer actively dealing or gambling shows cards, not a generic shop
   symbol or merchant bag.
4. A patron actively drinking shows a beer mug.
5. Sleeping uses an above-head `Z`/`Zzz` presentation and is removed from the
   bottom-right activity-prop anchor.
6. Indicators are reserved for immediate player-relevant state: quest,
   hostility, suspicion/noticing/searching, wounded/downed, or urgent faction
   event.
7. Generic talk, generic shop, ordinary memory, routine rumor, debt, romance, and
   personal-secret state must not produce permanent world-view indicator clutter.
8. Interaction menus may still expose relationship, rumor, shop, and personal
   details after the player chooses to interact.

### 4.5 Town Interiors, Residences, and Decoration

1. Every authored exterior building shell must be structurally solid except at
   valid entrances.
2. Structural roofs and walls cannot host Actor, NPC, enemy, apple, item, or
   interactable spawns.
3. A dedicated structural roof/wall tile identity or capability must be used.
   Reused visual characters such as canopy tiles must not acquire incorrect
   global collision behavior.
4. Exterior homes may be compact representations, but residential districts must
   contain multiple distinct enterable households.
5. Each household has a stable owner or household roster, private access policy,
   home/sleep positions, and correct return entrance.
6. Interiors must include more functional dressing: beds, tables, chairs,
   shelves, storage, lamps, rugs, counters, tools, dishes, wall decoration, and
   role-specific work areas.
7. The town center should support an expanded tavern and civic/watch use.
8. The market should support a mapper and rotating specialist shops.
9. The service/back-alley quarter should support a wizard, workshops, deliveries,
   guild access, and hidden entrances where generated.
10. The wizard initially sells or services existing magic-compatible content and
    acts as the future integration point for the spellcasting revamp.
11. Tile identity and behavior should move toward registry-backed IDs or compact
    indices. Palettes style tiles; palettes do not define collision semantics.
12. Additional tile varieties must retain the existing batched rendering model
    and avoid per-tile persistent display objects.

### 4.6 Mapper and Locator Commerce

1. A mapper is a normal persistent town Actor with a shop, schedule, home,
   activity, stock, and relationship state.
2. Mapper inventory is deterministic for a defined stock period and town.
3. Stock may contain a useful nearby/common biome locator, an uncommon distant
   locator, a rare-biome locator, and structure locators.
4. The initial required structure locators are garage and moleman dig site.
5. Future compatible locator targets include towns, villages, stations, motels,
   diners, goblin camps, and other deterministic structures.
6. Biome selection must use seeded usefulness and rarity rules rather than the
   first biome different from the current biome.
7. Structure lookup accepts world-generation identity, current coordinate room,
   structure kind, search bounds, and generation version.
8. Structure lookup must not call the canonical caching room getter for every
   searched coordinate.
9. A pure deterministic structure-intent resolver decides which primary
   structure a coordinate is intended to contain using a dedicated stable
   hash/random substream.
10. The normal room-generation pipeline consumes the same structure intent used
    by locators.
11. A promised structure must materialize. If preferred geometry fails, required
    locator structures use an authored compact or terrain-clearing fallback.
12. Locator results report room ID, coordinates, direction, and distance.
13. Results may be cached by world identity/generation version, origin region,
    and structure kind without populating the room cache.
14. Generation versioning must preserve existing-world compatibility rather than
    silently moving structures in an old save.

### 4.7 Tavern Rest and Time Advancement

1. A tavern lets the player spend score to wait until the next phase, rest until
   a named phase, sleep until dawn, or rent a longer stay where supported.
2. Price depends on elapsed time and may be modified by town reputation, room
   quality, relationships, or emergency state.
3. Time advances through explicit canonical atmosphere APIs and every crossed
   phase boundary is observable to dependent systems.
4. Schedule invalidation, business hours, Actor relocation, weather, sky events,
   temporary effects, patrol excursions, and faction/town events receive bounded
   catch-up processing.
5. Rest may heal and provide a bounded well-rested/temporary-health benefit. Its
   exact balance belongs in configuration, not scattered call sites.
6. The result summarizes meaningful elapsed changes such as new phase, weather,
   business closures, or patrol departure.
7. Rest is refused without charging score during immediate pursuit, adjacent
   hostility, or an active raid unless a future explicit siege-shelter rule says
   otherwise.
8. Save/load after resting preserves the resulting time, weather, schedule,
   service, and event state.

### 4.8 Outer Guard Patrols

1. Each eligible town deterministically owns a bounded patrol roster. Patrol
   members are persistent Actors with stable IDs and a home town/barracks.
2. Excursion packs contain one to four guards.
3. Active outer routes remain outside the town footprint and normally occupy a
   ring two to three coordinate rooms beyond the town wall. Immediate perimeter
   rooms are excluded unless explicitly used as departure/return transitions.
4. A town-vicinity resolver reports distance to a town footprint, nearest town,
   wall-facing direction, and whether a coordinate is inside, adjacent,
   approach/exit, or in an outer patrol band.
5. Patrol timing, route, pack composition, and goals are seeded by town and time
   period without rerolling on every room entry.
6. Only nearby/loaded patrol members need to materialize, but all remain canonical
   Actors.
7. A squad coordinator supplies shared route and threat intent while individual
   Actors retain their own health, personality, memory, and combat decisions.
8. Squad members cross room boundaries together, wait within a bounded tolerance
   for stragglers, retreat when appropriate, and do not duplicate.
9. Patrol activities include road watch, bandit suppression, predator clearing,
   traveler assistance, pursuit, escort, inspection, warning, and return to town.
10. Emergency town state may recall patrols or prevent a scheduled departure.

### 4.9 Faction Encounters and Raids

1. Guards and bandits use the existing hostile faction relationship and attack
   one another when valid targets share a room.
2. Guards and goblins default to tense, not hostile. Their default encounters may
   produce inspection, warning, toll dispute, escort, argument, or standoff, but
   not automatic combat.
3. Actual aggression, a faction event, or changed diplomacy may escalate a tense
   encounter to combat.
4. Faction conflict must use persistent Actor identities and Actor health. It
   must not create duplicate legacy hostile shells.
5. Bandit raids begin with Actors outside town, progress toward a valid gate, and
   enter town physically if not stopped.
6. Patrol discovery may create a raid warning, battle, delay, reinforcement
   request, rumor, or survivor report.
7. During a raid, town shops close, doors lock, civilians shelter, defenders take
   positions, and normal schedules become base intent beneath emergency goals.
8. Raid resolution records casualties, damage, witnesses, memories, faction
   consequences, gratitude/blame, and an aftermath state.
9. After the emergency ends, surviving Actors resume appropriate schedules and
   services reopen according to current time rather than automatically.

### 4.10 Humanoid Weapon Loadouts and Sword Swipes

1. Armed humanoid Actors must store an explicit weapon loadout. At minimum, the
   model distinguishes ranged weapons and melee weapons instead of treating
   `ranged: true` as the Actor's permanent visible combat mode.
2. Every civilian humanoid Actor carries a firearm. This universal civilian gun
   ownership is intentional world tone, not a factory-default bug. Guards,
   bandits, and other melee-capable roles additionally carry a sword through
   authored role/loadout policy.
3. Combat state records the currently selected weapon/attack, target, facing,
   cooldown, and stable attack/event ID needed by simulation and presentation.
4. Weapon choice is evaluated from target geometry and readiness. When the
   target is inside a valid ready sword footprint, a sword-capable Actor chooses
   melee instead of a ranged attack.
5. The sword footprint is a directional six-cell arc represented as two tiles
   deep by three tiles wide in front of the attacker. North/south attacks use a
   3-wide by 2-deep rectangle; east/west attacks rotate it to 2-deep by 3-wide.
6. Facing is chosen toward the target with a deterministic tie-break when the
   target is diagonal or equally aligned on two axes.
7. Solid structural tiles clip the resolved slash footprint. A sword cannot hit
   through a wall, closed door, or other melee-blocking terrain.
8. For attacks against the player, damage is determined from the snake head's
   position. Tail segments may receive visual juice but do not independently
   multiply player damage.
9. Actor-versus-Actor sword attacks use the same event and footprint contract and
   apply damage only to valid hostile targets according to current combat rules.
10. A chosen sword attack sets `Actor.activity` to `combat-melee`, causing the
    bottom-right activity prop to switch to a sword for the attack presentation.
11. A chosen ranged attack sets `Actor.activity` to `combat-ranged` and shows the
    Actor's actual ranged-weapon prop. A bow must not represent every firearm.
12. The combat layer emits a renderer-independent slash event containing attacker
    ID, weapon kind, origin, facing, affected cells, target ID, hit result, and
    damage result.
13. The renderer consumes that event to display a directional 2x3 slashing
    juice/effect over the exact resolved cells. It must not independently
    recompute the footprint.
14. Melee has a configurable cooldown. An Actor cannot generate damage every
    render frame or duplicate damage for one attack event.
15. If melee is unavailable because of cooldown or obstruction, the Actor uses a
    legal combat fallback such as repositioning, waiting, retreating, or a ranged
    attack when role policy allows it.
16. Surrender, death, target loss, de-escalation, or combat end clears active
    attack presentation and restores the correct noncombat activity/prop.
17. Weapon selection and attack results are deterministic for identical headless
    state and action input.

## 5. Required Architectural Contracts

### 5.1 Door Access Resolution

Introduce or consolidate a pure query equivalent to:

```ts
interface DoorAccessResolution {
  access: 'open' | 'closed' | 'locked';
  autoEnter: boolean;
  buildingId: string;
  serviceId?: string;
  publicHours?: PublicHours;
  nextOpen?: AtmosphereMoment;
  closureReason?: TownClosureReason;
  actions: DoorAction[];
}
```

Movement consumes `autoEnter`. The interaction UI consumes the same resolution
when access is blocked.

### 5.2 Schedule Resolution Layers

Schedule evaluation should remain separable and testable:

1. resolve role obligations and destinations;
2. choose seeded personality variation;
3. apply town/event policy;
4. apply weather/sky conditional intent;
5. compare against higher-priority active goals;
6. store base `scheduleGoal` and accepted active goal.

The implementation may use different function names, but it must preserve the
base-intent/interrupt behavior.

### 5.3 Deterministic Structure Intent

The feature index must be callable without room creation:

```ts
type LocatableStructureKind = 'garage' | 'molemanDigSite';

interface StructureIntent {
  roomId: string;
  kind: LocatableStructureKind | 'other' | 'none';
  generationVersion: number;
  placementVariant?: string;
}
```

The generation pipeline and locator search must share this decision. A bounded
non-caching placement probe is allowed, but a locator cannot populate the
canonical room cache while scanning.

### 5.4 Town Vicinity and Patrol Squads

Town distance must be measured from the town footprint rather than its anchor.
Patrol pack identity must be derived from stable town/roster data, not a visit
timestamp. Runtime squad state stores a shared route and current excursion while
members remain independent Actors.

### 5.5 Humanoid Combat Loadout and Attack Event

The exact type names may change, but the canonical model must express equivalent
state:

```ts
type HumanoidWeaponKind = 'firearm' | 'bow' | 'sword';

interface ActorWeaponLoadout {
  weapons: HumanoidWeaponKind[];
  activeWeapon?: HumanoidWeaponKind;
}

interface ActorAreaAttackEvent {
  id: string;
  attackerActorId: string;
  targetActorId: string | 'player';
  weapon: 'sword';
  origin: Vector2Like;
  facing: 'north' | 'south' | 'east' | 'west';
  affectedCells: Vector2Like[];
  hit: boolean;
  damageApplied: number;
}
```

This event is the testable seam between simulation and Phaser juice. A browser
or renderer test may supplement pixel behavior, but it cannot replace the
headless story that verifies the event, geometry, weapon switch, and damage.

## 6. Determinism, Persistence, and Performance

1. Save data must preserve new persistent Actor loadout, schedule variation,
   patrol roster/excursion, door/service, locator/generation-version, raid, and
   time state where recomputation would change player-observable history.
2. Derived presentation state should be reconstructed from canonical state rather
   than saved redundantly.
3. Adding unrelated RNG calls must not move towns, structures, patrol rosters,
   NPC schedules, or mapper stock.
4. Locator search must have explicit radius/node limits and a no-result outcome.
5. Offscreen simulation must remain bounded. Patrol and schedule systems cannot
   fully pathfind every Actor through every unloaded room on every tick.
6. More decorative tile types must preserve batched rendering and semantic tile
   queries.
7. Repeated room reads must not mutate Actor registries, duplicate residents,
   advance clocks, or reroll stock/patrols.

## 7. Headless Integration User Stories

Every story below is a required test, not an optional backlog candidate.

### Doors and Services

#### TOWN-LIFE-001 — Open doors enter automatically

**Given** an open accessible town shop door, **when** the snake moves onto the
entrance, **then** the game enters the correct interior without opening a door
interaction prompt.

#### TOWN-LIFE-002 — A closed business door explains the closure

**Given** a closed apothecary, **when** the snake attempts entry and interacts
with the blocked door, **then** the response names the business, reports that it
is locked, and provides its next opening time.

#### TOWN-LIFE-003 — Open hours unlock physical access

**Given** a shop closed at night, **when** canonical time advances into its open
period, **then** its door becomes accessible and crossing it auto-enters.

#### TOWN-LIFE-004 — Closed means no commerce

**Given** a shopkeeper drinking at the tavern after closing, **when** the snake
interacts with that Actor, **then** no buy or sell action is available.

#### TOWN-LIFE-005 — Waking a merchant does not open the business

**Given** a sleeping town merchant, **when** the snake wakes them after hours,
**then** sleep is interrupted but the service remains closed and commerce remains
unavailable.

#### TOWN-LIFE-006 — Village merchants may opt into informal trade

**Given** a village merchant configured for off-hours trade, **when** the snake
interacts after normal hours, **then** the merchant can still offer commerce
without changing town-shop defaults.

#### TOWN-LIFE-007 — Exceptional closure overrides normal hours

**Given** a normally open shop during an active town raid, **when** the snake
tries its door, **then** the door remains locked and reports the emergency closure.

#### TOWN-LIFE-008 — Door and service state survives save/load

**Given** a closed shop with its owner away from work, **when** the game is saved
and loaded, **then** the door, service availability, schedule goal, and Actor
location remain mutually consistent.

### Schedules, Weather, and Activities

#### TOWN-LIFE-009 — Schedule generation is repeatable per Actor

**Given** identical world, Actor, day, and town state, **when** schedule intent is
resolved across two fresh games, **then** the same Actor receives the same
destinations and activities.

#### TOWN-LIFE-010 — Personality produces real schedule variation

**Given** two eligible residents with different personalities, **when** evening
begins, **then** seeded variation may send one to the tavern and another home
while respecting both roles.

#### TOWN-LIFE-011 — A resident keeps one identity across a full day

**Given** a scheduled resident, **when** they travel from home to work to tavern
and back to sleep, **then** every materialization refers to one stable Actor and
preserves memory, health, and relationships.

#### TOWN-LIFE-012 — Shop service follows the business schedule

**Given** a merchant temporarily away on an errand during nominal hours, **when**
the shop has no valid worker on duty, **then** service availability follows its
staffing policy rather than the static clock alone.

#### TOWN-LIFE-013 — Higher-priority danger interrupts a schedule

**Given** a resident walking to work, **when** a hostile Actor threatens them,
**then** a safety/combat goal interrupts the schedule while the original base
schedule remains recorded.

#### TOWN-LIFE-014 — An Actor resumes life after interruption

**Given** an Actor interrupted by danger or conversation, **when** the interrupt
ends, **then** the Actor resumes or recomputes the appropriate current schedule
instead of remaining idle.

#### TOWN-LIFE-015 — Storm behavior depends on role and personality

**Given** a cautious resident and dutiful guard exposed to the same storm,
**when** environment reactions run, **then** the resident seeks shelter while the
guard adopts storm-watch behavior.

#### TOWN-LIFE-016 — Weather clearing restores schedule intent

**Given** a resident sheltering from severe weather, **when** clear weather
returns, **then** the shelter goal ends and the Actor returns to a valid current
routine.

#### TOWN-LIFE-017 — Mild weather cannot cancel sleep

**Given** a resident asleep at night, **when** rain or fog begins, **then** a
low-priority weather errand does not wake or relocate them.

#### TOWN-LIFE-018 — A sky event creates specialized activity

**Given** an eligible wizard and a configured nighttime sky event, **when** the
event begins, **then** the wizard receives the authored observation intent and
later returns to the normal schedule.

#### TOWN-LIFE-019 — Activity props describe current actions

**Given** a drinking patron, dealing card dealer, mapping mapper, and repairing
worker, **when** their canonical activities are inspected, **then** the selected
props are respectively mug, cards, map/compass, and tool.

#### TOWN-LIFE-020 — Sleeping uses an above-head presentation contract

**Given** a sleeping Actor, **when** presentation state is selected, **then** it
requests an above-head sleep marker and no bottom-right sleep prop.

#### TOWN-LIFE-021 — Routine roles do not create indicator clutter

**Given** an ordinary idle merchant with no urgent state, **when** indicators are
selected, **then** generic shop, talk, memory, and rumor indicators are absent.

#### TOWN-LIFE-022 — Urgent states remain visible

**Given** Actors with a quest, active suspicion, hostility, injury, and urgent
faction event, **when** indicators are selected, **then** each qualifying urgent
state remains represented according to priority limits.

### Interiors and Structural Integrity

#### TOWN-LIFE-023 — Exterior shells are solid

**Given** every exterior home and shop shell in a generated town, **when** the
snake attempts movement across each roof/wall cell, **then** entry is impossible
except through a valid doorway.

#### TOWN-LIFE-024 — Structural tiles reject spawns

**Given** repeated town generation across representative seeds, **when** all
spawned Actors, NPCs, enemies, apples, and items are checked, **then** none occupy
a structural roof or wall cell.

#### TOWN-LIFE-025 — Canopy behavior remains unchanged

**Given** a walkable canopy tile sharing legacy visual ancestry with a roof,
**when** structural roof collision is introduced, **then** the canopy retains its
authored capability behavior.

#### TOWN-LIFE-026 — Residential homes are distinct households

**Given** a residential district with multiple homes, **when** each door is
entered, **then** it leads to a distinct stable interior with the correct owner
or household and return doorway.

#### TOWN-LIFE-027 — Interior routing survives save/load

**Given** the snake saved inside any generated residence, tavern, mapper, or
wizard shop, **when** the save is loaded and the exit crossed, **then** the snake
returns to the correct exterior doorway.

#### TOWN-LIFE-028 — Required businesses have functional interiors

**Given** a town generated with tavern, mapper, and wizard services, **when** their
interiors are inspected headlessly, **then** each contains its required service
zone, valid movement space, entrance/exit, and role-appropriate interactables.

#### TOWN-LIFE-029 — Decorative variety preserves traversability

**Given** every supported town palette/decoration variant, **when** reachability
is calculated, **then** entrances, service points, residents, beds, and exits are
reachable without crossing solid decoration.

### Mapper and Locators

#### TOWN-LIFE-030 — Mapper stock is deterministic

**Given** the same town, world identity, and stock period, **when** mapper stock is
constructed across reloads, **then** offers and prices are identical.

#### TOWN-LIFE-031 — Mapper stock changes only at its stock boundary

**Given** a mapper stock period, **when** time advances within that period and
then crosses its boundary, **then** stock is stable before the boundary and
deterministically refreshes after it.

#### TOWN-LIFE-032 — Rare biome stock uses rarity and usefulness

**Given** a mapper in a common biome, **when** rare stock is selected, **then** it
comes from the seeded eligible rarity/usefulness pool rather than the first
non-local biome in registry order.

#### TOWN-LIFE-033 — Garage and dig-site locators can be sold

**Given** an eligible mapper stock roll, **when** offers are generated, **then**
garage and moleman dig-site locators are valid structure-locator offers.

#### TOWN-LIFE-034 — Locator scanning does not generate the countryside

**Given** an uncached world and a structure locator, **when** the nearest target
is searched, **then** the canonical room cache does not gain every examined
coordinate.

#### TOWN-LIFE-035 — A structure locator tells the truth

**Given** a returned garage or dig-site locator result, **when** its destination
room is generated normally, **then** the promised structure exists there.

#### TOWN-LIFE-036 — Failed preferred geometry has a valid fallback

**Given** a structure-intent coordinate whose preferred layout cannot fit,
**when** the destination room generates, **then** a valid compact or cleared
fallback materializes the promised structure.

#### TOWN-LIFE-037 — Nearest result is deterministic

**Given** a seed, origin, generation version, and target kind, **when** searches
run repeatedly and across save/load, **then** the same nearest result is returned.

#### TOWN-LIFE-038 — Locator output is actionable

**Given** a successful locator search, **when** its result is presented, **then**
it contains a room ID, coordinates, direction, and room distance consistent with
the origin.

#### TOWN-LIFE-039 — Bounded searches can fail safely

**Given** no target inside configured search bounds, **when** a locator is used,
**then** it returns a stable no-result response without generating excessive
rooms or hanging.

#### TOWN-LIFE-040 — Generation versions preserve old destinations

**Given** an existing save created under an older structure generation version,
**when** it is loaded after a newer algorithm exists, **then** its locator and
generated structure destinations remain compatible with the saved version.

### Tavern Rest and Time Advancement

#### TOWN-LIFE-041 — Tavern rest advances canonical time

**Given** sufficient score, **when** the snake sleeps until dawn, **then** score is
deducted and `WorldAtmosphereSystem` reaches dawn through its phase transitions.

#### TOWN-LIFE-042 — Every crossed phase updates schedules and services

**Given** a long tavern stay that crosses multiple phases, **when** it completes,
**then** Actor schedule goals, locations, doors, and shop availability reflect the
final phase and all required boundary processing occurred.

#### TOWN-LIFE-043 — Rest can change weather deterministically

**Given** atmosphere state near a weather transition, **when** the snake rests
through that transition, **then** the resulting weather matches normal canonical
time advancement for the same seed/state.

#### TOWN-LIFE-044 — Rest benefits are applied once

**Given** a paid rest option with healing or well-rested benefits, **when** it
completes, **then** configured benefits are applied once and remain within their
caps.

#### TOWN-LIFE-045 — Rest cannot skip immediate danger

**Given** active pursuit, adjacent hostility, or a town raid, **when** the snake
requests sleep, **then** rest is refused and no score is deducted.

#### TOWN-LIFE-046 — Rest reports meaningful elapsed changes

**Given** time advancement that changes phase, weather, business state, or patrol
state, **when** rest completes, **then** its result summarizes the relevant
changes.

#### TOWN-LIFE-047 — Rest outcome survives save/load

**Given** a completed tavern stay, **when** the resulting game is saved and loaded,
**then** time, weather, schedules, doors, score, benefits, and relevant events are
unchanged.

### Outer Patrols, Factions, and Raids

#### TOWN-LIFE-048 — Outer patrols never spawn in town

**Given** a generated town and active patrol excursion, **when** patrol locations
are resolved, **then** every outer patrol room lies outside the footprint and in
the configured two-to-three-room wall-distance band.

#### TOWN-LIFE-049 — Patrol size is one to four

**Given** any generated excursion pack, **when** its living roster is created,
**then** its initial membership contains one through four guards.

#### TOWN-LIFE-050 — Patrol identity is stable

**Given** a patrol encountered outside town, **when** the player leaves, reloads,
and returns during the same excursion, **then** the same Actor IDs, health, and
pack identity are present.

#### TOWN-LIFE-051 — Patrols do not multiply under repeated reads

**Given** an active patrol room, **when** that room and its neighbors are read
repeatedly, **then** no guard Actors are duplicated and no excursion is rerolled.

#### TOWN-LIFE-052 — A squad crosses rooms coherently

**Given** a multi-member patrol following a route, **when** it crosses a room
boundary, **then** all living members reach the shared next destination within a
bounded tolerance without identity replacement.

#### TOWN-LIFE-053 — A weakened patrol can retreat

**Given** a patrol whose configured retreat condition is met, **when** its squad
decision runs, **then** surviving members adopt a return-to-town route rather than
continuing the outer objective.

#### TOWN-LIFE-054 — Guards attack bandits without attacking an innocent player

**Given** patrol guards, bandit Actors, and an innocent snake in one room,
**when** faction conflict resolves, **then** guards target bandits and do not gain
player hostility solely from that fight.

#### TOWN-LIFE-055 — Goblin tension is not automatic combat

**Given** patrol guards and non-hostile goblins in one room, **when** their faction
encounter resolves, **then** neither faction receives an attack goal solely from
the default tense relationship.

#### TOWN-LIFE-056 — Goblin aggression can escalate the encounter

**Given** guards and goblins in a tense encounter, **when** a goblin commits a
qualifying hostile act or diplomacy changes to hostility, **then** guards may
receive valid combat goals against the aggressor.

#### TOWN-LIFE-057 — Faction combat preserves Actor identity

**Given** a guard fighting a bandit, **when** damage, defeat, or retreat occurs,
**then** health and state mutate on the persistent Actors and no duplicate legacy
humanoid combat shell is created.

#### TOWN-LIFE-058 — A raid begins outside town

**Given** a scheduled bandit raid, **when** the raid activates, **then** its
bandit Actors begin outside the town and receive a route toward a valid entrance.

#### TOWN-LIFE-059 — Raiders enter through a physical gate

**Given** unstopped raiders approaching town, **when** they reach a valid gate,
**then** their same Actor identities transition into the town and become active
interior attackers.

#### TOWN-LIFE-060 — Patrol interception changes raid progress

**Given** an outer patrol encountering approaching raiders, **when** their fight
resolves, **then** raid strength/timing and warning state reflect the surviving
Actors rather than an unrelated random result.

#### TOWN-LIFE-061 — Town emergency behavior composes

**Given** raiders entering town, **when** emergency goals activate, **then** shops
lock, civilians shelter, guards defend, and base schedules remain available for
later recovery.

#### TOWN-LIFE-062 — Raid aftermath returns to current-time life

**Given** a resolved raid, **when** emergency state clears, **then** survivors
resume schedules and businesses reopen only if the current time/service policy
allows it.

#### TOWN-LIFE-063 — Raid consequences persist

**Given** raid casualties, witnesses, and property damage, **when** the game is
saved and loaded, **then** Actor health/death, memories, town aftermath, and
faction consequences remain intact.

### Humanoid Weapons and Sword Swipes

#### TOWN-LIFE-064 — Armed roles receive explicit loadouts

**Given** generated guards and bandits, **when** they are promoted to Actors,
**then** their combat state contains explicit ranged and sword weapon entries
rather than only boolean capability implying one permanent weapon.

#### TOWN-LIFE-065 — Every civilian humanoid owns a gun

**Given** generated civilian humanoid roles, **when** they are promoted to
Actors, **then** every civilian has an explicit firearm in their loadout while
role policy independently determines whether they also carry a sword or another
weapon.

#### TOWN-LIFE-066 — Close player targets force a ready sword choice

**Given** a hostile guard or bandit with ranged and sword weapons ready and the
snake head inside the valid slash footprint, **when** the Actor chooses an attack,
**then** the selected weapon is sword and the activity becomes `combat-melee`.

#### TOWN-LIFE-067 — Distant targets retain ranged combat

**Given** the same loadout with the snake head outside melee reach and a legal
ranged attack, **when** the Actor chooses an attack, **then** the selected weapon
is ranged and activity becomes `combat-ranged`.

#### TOWN-LIFE-068 — Sword attacks emit a directional 2x3 footprint

**Given** a sword attack in each cardinal facing, **when** its canonical attack
event is emitted, **then** it contains the correctly rotated six-cell footprint
two tiles deep and three tiles wide in front of the attacker.

#### TOWN-LIFE-069 — Direction ties resolve deterministically

**Given** a diagonal or equally aligned target, **when** sword facing is chosen
from identical game state, **then** repeated runs choose the same cardinal facing
and affected cells.

#### TOWN-LIFE-070 — Walls clip a sword arc

**Given** a closed door or solid wall between a sword Actor and target, **when**
the attack footprint resolves, **then** cells behind the blocking structure are
excluded and the target is not damaged through it.

#### TOWN-LIFE-071 — The snake head is the player hit target

**Given** a sword footprint overlapping tail segments but not the snake head,
**when** the attack resolves, **then** visual affected cells remain available but
no player damage is applied.

#### TOWN-LIFE-072 — A head inside the arc takes one attack's damage

**Given** the snake head inside an unobstructed sword footprint, **when** one
attack event resolves, **then** canonical player damage is applied exactly once
regardless of tail overlap or render-frame count.

#### TOWN-LIFE-073 — The sword prop follows the attack

**Given** an Actor switching from ranged combat to a close sword attack, **when**
presentation state is selected, **then** the activity prop changes from the
Actor's ranged weapon to a sword for that attack state.

#### TOWN-LIFE-074 — Slash juice consumes canonical cells

**Given** a canonical sword attack event, **when** renderer-independent
presentation commands are produced headlessly, **then** the slash command uses
the event's exact six-or-fewer clipped cells and does not recompute different
geometry.

#### TOWN-LIFE-075 — Sword cooldown prevents duplicate damage

**Given** a sword attack just resolved, **when** combat and presentation clocks
advance within its cooldown, **then** no second damage event is emitted for the
same attack and no render-frame multiplication occurs.

#### TOWN-LIFE-076 — A blocked or cooling melee attack uses a legal fallback

**Given** a target nearby but melee obstructed or cooling down, **when** the Actor
decides its next action, **then** it waits, repositions, retreats, or uses a legal
ranged option according to policy rather than applying an invalid sword hit.

#### TOWN-LIFE-077 — Guards can sword-fight bandits

**Given** a guard and bandit in the same room and inside melee geometry, **when**
faction combat advances, **then** a sword event can damage the hostile Actor using
the same footprint/loadout system used against the player.

#### TOWN-LIFE-078 — Melee does not damage allies in the arc

**Given** an allied patrol member and hostile target inside a sword footprint,
**when** the guard's attack resolves, **then** only targets permitted by combat
rules receive damage.

#### TOWN-LIFE-079 — Combat end clears weapon presentation

**Given** an Actor whose target dies, escapes, surrenders, or de-escalates,
**when** combat ends, **then** active attack state clears and the Actor returns to
the correct schedule/activity prop.

#### TOWN-LIFE-080 — Weapon state survives mid-combat save/load

**Given** a save made during a sword cooldown or active combat pursuit, **when**
it is loaded, **then** loadout, target, cooldown, Actor identity, and damage
eligibility remain consistent without replaying the prior hit.

### Whole-System Integrity

#### TOWN-LIFE-081 — Town life survives a composed save/load

**Given** a resident traveling, a closed shop, active weather, an outer patrol,
mapper stock, and an unresolved raid warning, **when** the game is saved and
loaded, **then** identities, goals, locations, services, atmosphere, stock,
patrol, and warning state remain consistent.

#### TOWN-LIFE-082 — Repeated reads do not simulate time or population

**Given** a town and its surrounding rooms, **when** the nine-room neighborhood
is read repeatedly without advancing the gameplay clock, **then** time, Actor
ticks, schedules, patrols, raids, stock, and combat do not advance or duplicate.

#### TOWN-LIFE-083 — Unrelated RNG does not rewrite the town

**Given** two games with identical generation identity but extra unrelated random
rolls in one, **when** town geometry, resident schedules, mapper stock, structure
targets, and patrol rosters are compared, **then** all persistent seeded results
match.

#### TOWN-LIFE-084 — Offscreen work remains bounded

**Given** multiple discovered towns and patrol rosters, **when** gameplay advances
far from them, **then** diagnostics show bounded schedule/patrol processing and no
full-room generation or per-Actor global pathfinding storm.

#### TOWN-LIFE-085 — World integrity holds after a town emergency day

**Given** weather changes, tavern time advancement, patrol combat, a raid, shop
closures, Actor deaths, and save/load in one scenario, **when** the scenario ends,
**then** headless world-integrity assertions report no duplicate Actors, invalid
room ownership, contradictory presence, blocked spawn, or broken interior route.

## 8. Required Test Organization and Final Acceptance

1. Every `TOWN-LIFE-001` through `TOWN-LIFE-085` story must exist as a named
   headless integration test under `src/game/__tests__/stories`.
2. Tests may be grouped by domain into multiple story files, but IDs must remain
   stable and searchable.
3. Shared setup belongs in `src/test/headless`; tests must not bypass public game
   behavior by directly forging the final result under assertion.
4. Deterministic tests must use explicit seeds and bounded `advanceUntil` calls
   with diagnostics on timeout.
5. Visual requirements must expose renderer-independent presentation commands or
   events that headless tests can inspect. Browser/render tests are additive.
6. Unit tests are required for pure geometry, seed selection, schedule resolution,
   access resolution, and combat selection where useful, but do not satisfy a
   story by themselves.
7. The implementation must update the Snake Encyclopedia for every new canonical
   reusable contract and remove any consolidation target it actually resolves.
8. Repository format, typecheck, lint, and the complete test suite must pass with
   no errors or warnings.

> **THE FEATURE SET IS NOT COMPLETE WHILE EVEN ONE USER STORY LACKS A PASSING
> HEADLESS INTEGRATION TEST.** A story may be deliberately staged as failing
> during development, but it cannot be waived, replaced with a unit test, or
> marked complete based only on manual play.
