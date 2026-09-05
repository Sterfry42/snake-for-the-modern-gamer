# Removed Feature Ledger

This file tracks gameplay/system code intentionally removed by the `cleanup/reachability-purge` branch because the production game could not reach it.

The point of this cleanup is **not** to declare these ideas bad. Many are good feature concepts that may be worth rebuilding. The rule is that an idea should not live indefinitely as a disconnected parallel architecture. If a feature returns, restore the useful design/content and wire it into the real game through production verbs, registries, state ownership, and headless user stories.

Base commit before the purge: `aa87490899a626c823378783c1b29fd4533e25a6`.

## Restoration rule

When restoring one of these features:

1. Start from the current canonical systems, not the deleted subsystem's old ownership model.
2. Recover old code/content from the base commit only as reference or reusable data.
3. Add a real production route from `src/main.ts` through gameplay.
4. Add a headless story that performs the feature as a player/world action.
5. Avoid reviving compatibility bridges merely to make the old subsystem compile.

## Removed features / systems

### Dream world

**Removed:** the detached Dream/Nightmare scene and simulation stack: Dream world scene, Nightmare scene, DreamManager, DreamPuzzles, dream apples, lore, dream shop, types/barrel, and their isolated unit tests.

**Why:** no production route remained into the Dream subsystem. Its scenes had already become unreachable and the remaining manager/puzzle/data stack was reachable only from its own tests.

**If restored:** make entering a dream a real game transition/verb, use current item/effect ownership for dream apples, and test entering, interacting with, and exiting a dream through the headless game.

### Gardening

**Removed:** garden manager, plants, seed registry, pest system, garden types/barrel, garden NPC, and isolated garden tests. Dead garden localization strings may also be removed as cleanup continues.

**Why:** the garden package had no production entrance and existed as a self-contained simulation package.

**If restored:** model gardening through real world tiles/structures/items/verbs rather than reviving a parallel simulation island.

### Alchemy

**Removed:** AlchemyManager, AlchemyStation, PotionSystem, RecipeManager, AlchemyJournal, ingredient catalog, alchemy types/barrel, alchemy overlay, and isolated unit tests.

**Why:** the entire parallel alchemy framework was runtime-unreachable. Live item/potion behavior elsewhere in the game remains.

**If restored:** recipes and potion effects should plug into the canonical inventory/item-effect pipeline and a real station/shop/world interaction. Do not recreate a second inventory/effect architecture.

### Crafting workshop

**Removed:** detached CraftingWorkshop implementation and its dedicated unit test.

**Why:** it was not reachable from gameplay. A stale import of deleted alchemy types exposed it as another dead parent rather than a live consumer.

**If restored:** implement crafting through canonical item ownership and a player-facing crafting verb/station, with a headless story.

### Archaeology / fossil-museum framework

**Removed:** ArchaeologyMiniGame, ExcavationSystem, MuseumManager, fossil registry, museum overlay, barrel, and isolated tests.

**Preserved:** the separately implemented live Moleman archaeology path.

**Why:** the generic excavation/fossil/museum framework had no production route even though archaeology exists elsewhere as actual gameplay.

**If restored:** extend the live archaeology path or extract shared primitives from real use cases; do not revive a second archaeology game beside it.

### Archipelago expedition framework

**Removed:** ExpeditionManager, ExpeditionScene, ExpeditionBoss, ExpeditionLog, ExpeditionSupplies, ExpeditionAppleTypes, IslandRegistry, expedition types/barrel, and their isolated tests.

**Preserved:** live Archipelago integration outside this detached expedition package.

**Why:** the expedition package had no production entrance; its only consumers were its own tests.

**If restored:** enter expeditions from actual Archipelago/world gameplay and reuse canonical combat, inventory, travel, and actor systems.

### Faction territory / diplomacy / war strategy layer

**Removed:** TerritoryManager, TerritoryMapOverlay, DiplomacySystem, WarSystem, SerpentFaction, territory types, and their isolated tests.

**Preserved:** runtime-reachable faction reputation/events/relations systems.

**Why:** this was a detached strategy-game layer beside the faction mechanics the real game actually uses.

**If restored:** build territory/diplomacy outward from the live faction identity/event/relation model rather than recreating a parallel faction domain.

### Legacy human subsystem

**Removed:** `src/humans` manager, registry, profiles, portraits, voice, encounters, types, and barrel.

**Why:** obsolete parallel representation of people with no runtime/test reachability. Current NPC/Actor/Town work should converge on canonical Actor identity instead of adding another human model.

**If restored:** do not restore this subsystem as-is. Human characters should be Actors with content/configuration layered onto canonical actor systems.

### Minecraft-inspired detached systems

**Removed:** enchanting, brewing, fishing, mob spawner, portal, structures, weather.

**Why:** these modules were unreachable feature islands / leaves with no production path.

**If restored:** treat each mechanic independently and integrate it into existing item/world/weather/combat systems rather than restoring a `minecraft` parallel namespace by default.

### Animal kingdom / seasonal leaves

**Removed so far:** `KingdomSystem.ts` and `seasonal.ts`.

**Why:** no production/test/Encyclopedia reachability at deletion time.

**Note:** additional animal simulation packages remain under investigation; record them here if removed.

### Unsupported generic layer kinds

**Removed:** fake `LayerKind` variants for `cave`, `building`, `basement`, `dungeon`, and `other`.

**Preserved:** `townInterior`, the only layer kind the runtime actually implemented.

**Why:** the type system advertised runtime capabilities that immediately threw when used.

**If restored:** add a new layer kind only when a real second runtime implementation exists.

### Miscellaneous dead presentation/helpers

Removed dead leaves include presentation or helper code such as the bullet-train renderer and mutation journal overlay when no production route or supported subsystem consumed them.

These are intentionally lower-level than the feature entries above. Recover from the base commit if a future integrated feature genuinely needs the old presentation/content.

## Philosophy

A unit test is evidence that code can execute in isolation; it is **not** evidence that the game can reach the feature.

A barrel importing a subsystem is not integration.

A compatibility adapter is not a reason to keep two owners for the same concept.

If deleting a module breaks another unreachable module, prefer deleting upward until reaching a real production owner. If deleting a module breaks a live path, migrate that live path toward the canonical system instead of rebuilding the legacy island.