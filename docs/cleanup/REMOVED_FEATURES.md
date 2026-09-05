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

**Removed:** garden manager, plants, seed registry, pest system, garden types/barrel, garden NPC, English/Spanish garden localization, and isolated garden tests.

**Why:** the garden package had no production entrance and existed as a self-contained simulation package.

**If restored:** model gardening through real world tiles/structures/items/verbs rather than reviving a parallel simulation island.

### Alchemy

**Removed:** AlchemyManager, AlchemyStation, PotionSystem, RecipeManager, AlchemyJournal, ingredient catalog, alchemy types/barrel, alchemy overlay, Hermes the Alchemist/trade data, and isolated unit tests.

**Why:** the entire parallel alchemy framework was runtime-unreachable. Hermes only referenced recipes/ingredients from that detached framework. Live item/potion behavior elsewhere in the game remains.

**If restored:** recipes and potion effects should plug into the canonical inventory/item-effect pipeline and a real station/shop/world interaction. Reintroduce Hermes as a canonical Actor/shopkeeper if the character is still wanted; do not recreate a second NPC or inventory architecture around him.

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

### Animal ecosystem simulation

**Removed:** EcosystemManager, ecosystem balance/photo types, ecosystem HUD, standalone predator/prey ecology helper, standalone animal AI state helper, animal weather-behavior rules, and their isolated ecosystem/weather tests.

**Preserved:** the runtime-reachable `animalManager`, `animalRegistry`, animal definitions, drops, and other animal behavior that the real game actually reaches.

**Why:** the ecosystem package and related helpers formed a simulation layer beside the live animal system but had no production path.

**If restored:** put ecosystem consequences behind actual animal/world simulation events. Predator/prey and weather behavior should be behavior owned by the live animal simulation rather than a second detached model.

### Wildlife photography / journal

**Removed:** CameraSystem, wildlife journal overlay, photo data that lived only in the detached ecosystem types, and the camera system's isolated test.

**Preserved:** live animal registry/content.

**Why:** the player could not reach the photography system; the journal was likewise unreachable presentation for it.

**If restored:** introduce a real camera item/verb, capture photos from live Actor/animal/world state, and test the complete loop: acquire camera -> photograph animal -> journal records observation.

### Animal settlements / civilization

**Removed:** AnimalSettlement and its isolated unit test. `KingdomSystem.ts` had already been removed as an unreachable leaf.

**Why:** animal civilization existed as detached strategy/simulation code rather than something spawned or observed by the production world.

**If restored:** represent settlements as real world structures plus persistent actors/animals. Avoid a second world-state graph owned only by the civilization subsystem.

### Detached companion manager

**Removed:** `src/animals/companion/CompanionManager.ts` and its isolated test.

**Preserved:** the separately existing runtime-reachable animal/companion behavior such as `src/animals/companions.ts`.

**Why:** this was a second manager with no production route, not evidence that companion animals themselves should disappear.

**If restored:** extend the live companion path and canonical animal/actor identity rather than reviving a parallel companion state owner.

### Apple mutation / trait framework

**Removed:** MutationRegistry, MutationSystem, mutation types, TraitManager, trait types, the mutation journal overlay, and the isolated mutation/trait unit tests.

**Preserved:** runtime-reachable apple definitions, spawning, item behavior, and effects outside this detached framework.

**Why:** mutation and trait simulation existed only as a self-tested subsystem; the production game had no route into it, and mutation-related achievement branches were already disabled.

**If restored:** make mutation a property or transformation of apples the live world can actually generate and the snake can actually encounter/consume. Reuse canonical apple/item-effect ownership, and prove the full player-facing loop with a headless story instead of restoring a parallel evolution simulator.

### Animal seasonal leaf

**Removed:** `seasonal.ts`.

**Why:** no production/test/Encyclopedia reachability at deletion time.

### Unsupported generic layer kinds

**Removed:** fake `LayerKind` variants for `cave`, `building`, `basement`, `dungeon`, and `other`.

**Preserved:** `townInterior`, the only layer kind the runtime actually implemented.

**Why:** the type system advertised runtime capabilities that immediately threw when used.

**If restored:** add a new layer kind only when a real second runtime implementation exists.

### Wise Old Snake lore dump

**Removed:** the standalone `wiseOldSnakeLore.ts` quote/lore/quest-idea catalog.

**Why:** nothing in production, tests, or the Encyclopedia consumed it. It was content sitting beside the game rather than content registered into it.

**If restored:** keep the character/lore if desired, but put it in the canonical dialogue/rumor/quest/content registries that the game actually reads.

### Miscellaneous dead presentation/helpers

Removed dead leaves include presentation or helper code such as the bullet-train renderer, mutation journal overlay, unused generic scrollable tabbed-menu model, unused NPC portrait registry, and a duplicate TypeScript Vite debug middleware implementation when no production route or canonical owner consumed them.

These are intentionally lower-level than the feature entries above. Recover from the base commit if a future integrated feature genuinely needs the old presentation/content.

## Philosophy

A unit test is evidence that code can execute in isolation; it is **not** evidence that the game can reach the feature.

A barrel importing a subsystem is not integration.

A compatibility adapter is not a reason to keep two owners for the same concept.

If deleting a module breaks another unreachable module, prefer deleting upward until reaching a real production owner. If deleting a module breaks a live path, migrate that live path toward the canonical system instead of rebuilding the legacy island.