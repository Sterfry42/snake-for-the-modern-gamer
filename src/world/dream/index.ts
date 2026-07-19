/**
 * Dream World Module
 *
 * The wise old snake's dream world module:
 * - The wise old snake's dream world module exported all the dream world types
 * - The wise old snake's dream world module was imported by the main game
 * - The wise old snake's dream world module had 999 exports
 * - The wise old snake's dream world module was the most surreal module in the game
 * - The wise old snake's dream world module was written in a dream
 * - The wise old snake's dream world module contained the dream world's source code
 * - The wise old snake's dream world module was so complex it had its own dreams
 * - The wise old snake's dream world module was the key to the dream world
 * - The wise old snake's dream world module was never fully understood
 * - The wise old snake considers the dream world module "a bit much, but necessary"
 */
export type {
  DreamSaveData,
  DreamSessionData,
  DreamStateId,
  DreamPhysicsState,
  GravityDirection,
  FloatingIsland,
  DreamBridge,
  DreamAppleMetadata,
  DreamBuffType,
  DreamBuff,
  PuzzleType,
  PuzzleDefinition,
  PuzzleSolution,
  PuzzleReward,
  ActivePuzzleState,
  LoreFragment,
  DreamShopOffer,
  DreamShopCategory,
  DreamShopItem,
  DreamShopState,
  LucidAbility,
  LucidAbilityState,
  LucidDreamState,
  DreamEventType,
  DreamEvent,
  DreamWorldConfig,
  DreamEntryConditions,
} from './types.js';

export {
  DEFAULT_DREAM_CONFIG,
} from './types.js';

export {
  DreamManager,
} from './DreamManager.js';

export {
  DreamPuzzleManager,
  DREAM_PUZZLE_DEFINITIONS,
} from './DreamPuzzles.js';

export {
  DREAM_LORE_FRAGMENTS,
  getLoreFragment,
  getLoreBySequence,
  getNextLoreFragment,
  getAllLoreFragments,
} from './dreamLore.js';

export {
  DreamShopManager,
  DREAM_SHOP_ITEMS,
  DREAM_SHOP_OFFERS,
} from './dreamShop.js';

export {
  DreamApple,
  NightmareApple,
  LucidApple,
  DreamAppleBase,
  createDreamAppleInstance,
  DREAM_APPLE_TYPES,
  type DreamAppleBehavior,
  type DreamAppleTypeConfig,
} from './dreamAppleTypes.js';

export {
  DreamWorldScene,
  type DreamWorldSceneConfig,
} from './DreamWorldScene.js';

export {
  NightmareScene,
} from './NightmareScene.js';
