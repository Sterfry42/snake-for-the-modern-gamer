/**
 * Cosmetic types and interfaces.
 *
 * The wise old snake has cataloged 999 mutations. These are just the good ones.
 */

// ---------------------------------------------------------------------------
// Cosmetic category IDs
// ---------------------------------------------------------------------------

export type CosmeticCategoryId =
  | 'themes'
  | 'hats'
  | 'cowbells'
  | 'utilities'
  | 'languages'
  | 'emoticons';

// ---------------------------------------------------------------------------
// Cosmetic item base
// ---------------------------------------------------------------------------

export interface CosmeticItemBase {
  id: string;
  label: string;
  category: CosmeticCategoryId;
  owned: boolean;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Theme / Palette items
// ---------------------------------------------------------------------------

export interface SnakeSpritePalette {
  baseColor: string;
  bellyColor: string;
  patternColor: string;
  outlineColor: string;
  eyeColor: string;
}

export interface ThemeCosmeticItem extends CosmeticItemBase {
  category: 'themes';
  cost: number;
  palette: SnakeSpritePalette;
}

// ---------------------------------------------------------------------------
// Hat items
// ---------------------------------------------------------------------------

export interface HatCosmeticItem extends CosmeticItemBase {
  category: 'hats';
  cost: number;
}

// ---------------------------------------------------------------------------
// Cowbell items
// ---------------------------------------------------------------------------

export interface CowbellCosmeticItem extends CosmeticItemBase {
  category: 'cowbells';
  cost: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Utility items (Quiet Steps, Minimap, etc.)
// ---------------------------------------------------------------------------

export interface UtilityCosmeticItem extends CosmeticItemBase {
  category: 'utilities';
  cost: number;
  description: string;
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Language items
// ---------------------------------------------------------------------------

export interface LanguageCosmeticItem extends CosmeticItemBase {
  category: 'languages';
  cost: number;
  code: string;
  nativeName: string;
}

// ---------------------------------------------------------------------------
// Emoticon items
// ---------------------------------------------------------------------------

export interface EmoticonCosmeticItem extends CosmeticItemBase {
  category: 'emoticons';
  cost: number;
  symbol: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Discriminated union of all cosmetic item types
// ---------------------------------------------------------------------------

export type CosmeticItem =
  | ThemeCosmeticItem
  | HatCosmeticItem
  | CowbellCosmeticItem
  | UtilityCosmeticItem
  | LanguageCosmeticItem
  | EmoticonCosmeticItem;

// ---------------------------------------------------------------------------
// Category display metadata
// ---------------------------------------------------------------------------

export interface CosmeticCategoryMeta {
  id: CosmeticCategoryId;
  label: string;
  i18nKey: string;
  accentColor: number;
}

export const COSMETIC_CATEGORIES: readonly CosmeticCategoryMeta[] = [
  { id: 'themes', label: 'Themes', i18nKey: 'cosmeticCategoryThemes', accentColor: 0xff8a5b },
  { id: 'hats', label: 'Hats', i18nKey: 'cosmeticCategoryHats', accentColor: 0x5dd6a2 },
  { id: 'cowbells', label: 'Cowbells', i18nKey: 'cosmeticCategoryCowbells', accentColor: 0xffd700 },
  {
    id: 'utilities',
    label: 'Utilities',
    i18nKey: 'cosmeticCategoryUtilities',
    accentColor: 0x9ad1ff,
  },
  {
    id: 'languages',
    label: 'Languages',
    i18nKey: 'cosmeticCategoryLanguages',
    accentColor: 0xc77dff,
  },
  {
    id: 'emoticons',
    label: 'Emoticons',
    i18nKey: 'cosmeticCategoryEmoticons',
    accentColor: 0xff6b9d,
  },
];
