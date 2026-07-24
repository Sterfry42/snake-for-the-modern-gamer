/**
 * Cosmetics module — unified types, catalog, and state for all cosmetic items.
 *
 * The wise old snake has cataloged 999 mutations. These are just the good ones.
 */
export type {
  CosmeticCategoryId,
  CosmeticItemBase,
  CosmeticItem,
  ThemeCosmeticItem,
  HatCosmeticItem,
  CowbellCosmeticItem,
  UtilityCosmeticItem,
  LanguageCosmeticItem,
  EmoticonCosmeticItem,
  CosmeticCategoryMeta,
  SnakeSpritePalette,
} from './cosmeticTypes.js';

export { COSMETIC_CATEGORIES } from './cosmeticTypes.js';

export type { CosmeticStateRaw } from './cosmeticState.js';

export {
  createDefaultCosmeticState,
  isThemeUnlocked,
  isHatUnlocked,
  isCowbellUnlocked,
  isQuietStepsUnlocked,
  isMinimapUnlocked,
  isLanguageUnlocked,
  isEmoticonOwned,
  getActiveLanguage,
} from './cosmeticState.js';

export type {
  ThemeDefinition,
  HatDefinition,
  CowbellDefinition,
  UtilityDefinition,
  LanguageDefinition,
  EmoticonDefinition,
} from './cosmeticCatalog.js';

export {
  THEME_DEFINITIONS,
  HAT_DEFINITIONS,
  COWBELL_DEFINITIONS,
  UTILITY_DEFINITIONS,
  LANGUAGE_DEFINITIONS,
  EMOTICON_CATALOG,
  getAllThemeDefinitions,
  getThemeDefinition,
  getAllHatDefinitions,
  getHatDefinition,
  getAllCowbellDefinitions,
  getCowbellDefinition,
  getAllUtilityDefinitions,
  getUtilityDefinition,
  getAllLanguageDefinitions,
  getLanguageDefinition,
  getAllEmoticonDefinitions,
  getEmoticonDefinition,
  toThemeItem,
  toHatItem,
  toCowbellItem,
  toUtilityItem,
  toLanguageItem,
  toEmoticonItem,
} from './cosmeticCatalog.js';
