/**
 * Dream World Module
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

export { DEFAULT_DREAM_CONFIG } from './types.js';

export { DreamManager } from './DreamManager.js';

export { DreamPuzzleManager, DREAM_PUZZLE_DEFINITIONS } from './DreamPuzzles.js';

export {
  DREAM_LORE_FRAGMENTS,
  getLoreFragment,
  getLoreBySequence,
  getNextLoreFragment,
  getAllLoreFragments,
} from './dreamLore.js';

export { DreamShopManager, DREAM_SHOP_ITEMS, DREAM_SHOP_OFFERS } from './dreamShop.js';

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

export { DreamWorldScene, type DreamWorldSceneConfig } from './DreamWorldScene.js';

export { NightmareScene } from './NightmareScene.js';
