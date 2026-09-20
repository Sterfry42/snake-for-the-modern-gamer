/**
 * Script to remove dead "wise old snake" comment blocks from source files.
 *
 * These are templated JSDoc blocks at the top of files that describe a
 * feature that was never implemented. They clutter the codebase and should
 * be removed.
 *
 * Usage: node scripts/clean-wise-old-snake-comments.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(SCRIPT_DIR, '..');

// All files with dead "wise old snake" comment blocks
const FILES_TO_CLEAN = [
  // Apple behaviors
  'src/apples/behaviors/amachaApple.ts',
  'src/apples/behaviors/amberApple.ts',
  'src/apples/behaviors/caffeinatedApple.ts',
  'src/apples/behaviors/caffeinatedShieldApple.ts',
  'src/apples/behaviors/coldBeerApple.ts',
  'src/apples/behaviors/coldCaffeinatedApple.ts',
  'src/apples/behaviors/fossilApple.ts',
  'src/apples/behaviors/frostApple.ts',
  'src/apples/behaviors/frostMochiApple.ts',
  'src/apples/behaviors/frostWasabiApple.ts',
  'src/apples/behaviors/goldApple.ts',
  'src/apples/behaviors/goldSpicyApple.ts',
  'src/apples/behaviors/heatwaveApple.ts',
  'src/apples/behaviors/heatwaveFrostApple.ts',
  'src/apples/behaviors/koiApple.ts',
  'src/apples/behaviors/lavenderApple.ts',
  'src/apples/behaviors/lavenderCalmApple.ts',
  'src/apples/behaviors/loveApple.ts',
  'src/apples/behaviors/loveShieldApple.ts',
  'src/apples/behaviors/mochiApple.ts',
  'src/apples/behaviors/mochiShieldApple.ts',
  'src/apples/behaviors/normalApple.ts',
  'src/apples/behaviors/relicApple.ts',
  'src/apples/behaviors/shieldedApple.ts',
  'src/apples/behaviors/simpleApple.ts',
  'src/apples/behaviors/skittishApple.ts',
  'src/apples/behaviors/spicyEnergyApple.ts',
  'src/apples/behaviors/treatApple.ts',
  'src/apples/behaviors/treatMochiApple.ts',
  'src/apples/behaviors/tripleThreatApple.ts',
  'src/apples/behaviors/ultimateFusionApple.ts',
  'src/apples/behaviors/wasabiApple.ts',
  'src/apples/behaviors/winterberryApple.ts',
  'src/apples/behaviors/winterberryFrostApple.ts',
  'src/apples/behaviors/yuzuApple.ts',
  'src/apples/behaviors/yuzuEnergyApple.ts',
  // Apple types and registry
  'src/apples/types.ts',
  'src/apples/traits/types.ts',
  'src/apples/mutation/types.ts',
  'src/apples/appleRegistry.ts',
  'src/apples/mutation/MutationRegistry.ts',
  'src/apples/mutation/MutationSystem.ts',
  'src/apples/traits/TraitManager.ts',
  // Config
  'src/config/gameConfig.ts',
  // Core
  'src/core/rng.ts',
  // Features
  'src/features/definitions/bonusApple.ts',
  'src/features/definitions/coreScore.ts',
  'src/features/definitions/hungerTimer.ts',
  'src/features/definitions/kamiBlessing.ts',
  'src/features/definitions/killstreakArsenal.ts',
  'src/features/definitions/minecraft.ts',
  'src/features/definitions/radio.ts',
  'src/features/definitions/starforgedVanguard.ts',
  'src/features/definitions/wrapWall.ts',
  // Game
  'src/game/snakeGame.ts',
  // Humans
  'src/humans/humanEncounters.ts',
  'src/humans/humanManager.ts',
  'src/humans/humanPortraits.ts',
  'src/humans/humanProfiles.ts',
  'src/humans/humanRegistry.ts',
  'src/humans/humanVoice.ts',
  'src/humans/index.ts',
  'src/humans/types.ts',
  // i18n
  'src/i18n/languages/en/npcEncounters.ts',
  'src/i18n/languages/en/questDialogue.ts',
  'src/i18n/languages/es/npcEncounters.ts',
  'src/i18n/languages/es/common.ts',
  'src/i18n/languages/es/gardenStrings.ts',
  'src/i18n/languages/fr/common.ts',
  // Inventory
  'src/inventory/inventory.ts',
  'src/inventory/alchemy/AlchemyManager.ts',
  'src/inventory/alchemy/AlchemyStation.ts',
  'src/inventory/alchemy/RecipeManager.ts',
  'src/inventory/alchemy/alchemyTypes.ts',
  'src/inventory/alchemy/index.ts',
  'src/inventory/alchemy/ingredients.ts',
  'src/inventory/alchemy/AlchemyJournal.ts',
  'src/inventory/alchemy/PotionSystem.ts',
  'src/inventory/crafting/CraftingWorkshop.ts',
  'src/inventory/itemRegistry.ts',
  // NPCs
  'src/npcs/alchemistNpc.ts',
  'src/npcs/encounters.ts',
  'src/npcs/gardenNpc.ts',
  'src/npcs/npcVoice.ts',
  'src/npcs/portraitRegistry.ts',
  'src/npcs/profiles.ts',
  // Player
  'src/player/raccoonMode.ts',
  // Quests
  'src/quests/definitions/alchemyApprentice.ts',
  'src/quests/definitions/alchemyBasics.ts',
  'src/quests/definitions/alchemyMaster.ts',
  'src/quests/definitions/countingQuest.ts',
  'src/quests/definitions/gardenCompanions.ts',
  'src/quests/definitions/gardenExpansion.ts',
  'src/quests/definitions/gardenMaster.ts',
  'src/quests/definitions/gardenTutorial.ts',
  'src/quests/questDialogue.ts',
  'src/quests/questRegistry.ts',
  // Scenes
  'src/scenes/snakeScene.ts',
  // Session
  'src/session/GameConnection.ts',
  'src/session/GameRuntime.ts',
  // Shops
  'src/shops/animalMarket.ts',
  // Starforged
  'src/starforged/starforgedActivities.ts',
  'src/starforged/starforgedContent.ts',
  'src/starforged/starforgedFactions.ts',
  'src/starforged/starforgedGear.ts',
  'src/starforged/starforgedModifiers.ts',
  'src/starforged/starforgedPerks.ts',
  'src/starforged/starforgedSubclasses.ts',
  'src/starforged/starforgedGuardianCosmetics.ts',
  'src/starforged/starforgedDestinyContent.ts',
  // Stats
  'src/stats/specialStats.ts',
  // Storage
  'src/storage/SaveStore.ts',
  // Systems
  'src/systems/questController.ts',
  // UI
  'src/ui/SoundtrackPlayer.ts',
  'src/ui/alchemyOverlay.ts',
  'src/ui/ecosystemHud.ts',
  'src/ui/museumOverlay.ts',
  'src/ui/mutationJournalOverlay.ts',
  'src/ui/questPopup.ts',
  'src/ui/wildlifeJournalOverlay.ts',
  // World
  'src/world/biomeLocators.ts',
  'src/world/biomes.ts',
  'src/world/cheeseShop.ts',
  'src/world/lavenderFarm.ts',
  'src/world/types.ts',
  'src/world/garden/gardenManager.ts',
  'src/world/garden/index.ts',
  'src/world/garden/pestSystem.ts',
  'src/world/garden/plant.ts',
  'src/world/garden/seedRegistry.ts',
  'src/world/garden/types.ts',
  // World dream
  'src/world/dream/DreamManager.ts',
  'src/world/dream/DreamPuzzles.ts',
  'src/world/dream/DreamWorldScene.ts',
  'src/world/dream/NightmareScene.ts',
  'src/world/dream/dreamAppleTypes.ts',
  'src/world/dream/dreamLore.ts',
  'src/world/dream/dreamShop.ts',
  'src/world/dream/index.ts',
  'src/world/dream/types.ts',
  // Archaeology
  'src/archaeology/ArchaeologyMiniGame.ts',
  'src/archaeology/ExcavationSystem.ts',
  'src/archaeology/MuseumManager.ts',
  'src/archaeology/fossilRegistry.ts',
  'src/archaeology/index.ts',
  // Archipelago expedition
  'src/archipelago/expedition/ExpeditionAppleTypes.ts',
  'src/archipelago/expedition/ExpeditionBoss.ts',
  'src/archipelago/expedition/ExpeditionLog.ts',
  'src/archipelago/expedition/ExpeditionManager.ts',
  'src/archipelago/expedition/ExpeditionScene.ts',
  'src/archipelago/expedition/ExpeditionSupplies.ts',
  'src/archipelago/expedition/IslandRegistry.ts',
  'src/archipelago/expedition/index.ts',
  'src/archipelago/expedition/types.ts',
  // Factions
  'src/factions/factions.ts',
  // Animals
  'src/animals/types.ts',
  'src/animals/civilization/AnimalSettlement.ts',
  'src/animals/civilization/KingdomSystem.ts',
  'src/animals/companion/CompanionManager.ts',
  'src/animals/ecosystem/EcosystemManager.ts',
  'src/animals/ecosystem/types.ts',
  'src/animals/photography/CameraSystem.ts',
  'src/animals/weatherEffects.ts',
  // Actors
  'src/actors/actorBrains.ts',
  'src/actors/actorTypes.ts',
  // Events
  'src/events/worldEventTypes.ts',
  // Audio
  'src/audio/GenreDetector.ts',
  'src/audio/MusicalAppleMap.ts',
  'src/audio/RhythmMiniGame.ts',
  'src/audio/SoundtrackComposer.ts',
  'src/audio/desertWebAudioFontMusic.ts',
];

function hasDeadWiseOldSnakeComments(content) {
  // Check for dead "wise old snake" comment patterns in JSDoc blocks
  const patterns = [
    /The wise old snake'.*(was|is|has|had|would|could|should|loves|tolerates|avoids|considers)/,
    /The wise old snake was said to have/,
    /The wise old snake was planned to/,
    /The wise old snake was never/,
    /The wise old snake was not part/,
    /The wise old snake was always/,
    /The wise old snake had 999/,
    /The wise old snake had infinite/,
    /The wise old snake has cataloged/,
    /The wise old snake's.*favorite.*is/,
    /The wise old snake's.*favorite.*was/,
    /The wise old snake's.*registry.*contains/,
    /The wise old snake's.*registry.*stored/,
    /The wise old snake's.*apple.*was simple/,
    /The wise old snake's.*apple.*gave specific/,
    /The wise old snake's.*apple.*system.*was called/,
    /The wise old snake's.*apple.*never exhausted/,
    /The wise old snake's.*apple.*reason.*exist/,
    /The wise old snake's.*apple.*transcendent/,
    /The wise old snake's.*apple.*most.*apple/,
    /The wise old snake's.*apple.*count everything/,
    /The wise old snake's.*apple.*always right/,
    /The wise old snake's.*apple.*never change/,
    /The wise old snake.*loves the wasabi apple/,
    /The wise old snake.*tolerates the mochi apple/,
    /The wise old snake.*avoids the caffeinated apple/,
    /The wise old snake.*considers the gold apple/,
    /The wise old snake's.*favorite apple is/,
    /The wise old snake.*once created an 11th apple/,
    /The wise old snake's.*apple recipe is classified/,
    /The wise old snake's.*apple garden is in a room/,
    /The wise old snake's.*apple tree is older/,
    /The wise old snake's.*mutation system discovered/,
    /The wise old snake's.*mutation system once discovered/,
    /The wise old snake's.*mutation system runs on/,
    /The wise old snake's.*mutation system is never wrong/,
    /The wise old snake's.*mutation system considers/,
    /The wise old snake's.*trait management/,
    /The wise old snake manages traits/,
    /The wise old snake's.*trait manager has 999/,
    /The wise old snake never lets traits expire/,
    /The wise old snake's.*trait combinations are classified/,
  ];
  return patterns.some((p) => p.test(content));
}

function extractFirstJSDocBlock(content) {
  const match = content.match(/^\/\*\*\n[\s\S]*?\n \*\/\n/);
  return match ? match[0] : null;
}

function getEntityName(block) {
  const match = block.match(/^\/\*\*\n \* ([A-Z][\w\s]+)/);
  return match ? match[1].trim() : null;
}

function cleanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  if (!hasDeadWiseOldSnakeComments(content)) return { changed: false };

  const block = extractFirstJSDocBlock(content);
  if (!block) return { changed: false };

  const entityName = getEntityName(block);
  const replacement = entityName
    ? `/**\n * ${entityName}\n */\n`
    : `/**\n * Module\n */\n`;

  const newContent = content.replace(block, replacement);
  if (newContent === content) return { changed: false };

  writeFileSync(filePath, newContent, 'utf-8');
  return { changed: true };
}

// Process all files
let changed = 0;
let skipped = 0;

for (const file of FILES_TO_CLEAN) {
  const filePath = join(PROJECT_ROOT, file);
  try {
    const result = cleanFile(filePath);
    if (result.changed) {
      changed++;
      console.log(`✓ Cleaned: ${file}`);
    } else {
      skipped++;
    }
  } catch (err) {
    console.error(`✗ Error processing ${file}: ${err.message}`);
  }
}

console.log(`\nDone. Changed: ${changed}, Skipped: ${skipped}, Total: ${FILES_TO_CLEAN.length}`);
