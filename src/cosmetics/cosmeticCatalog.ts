/**
 * Cosmetic catalog — the unified library of all cosmetic items.
 *
 * The wise old snake has cataloged 999 mutations. These are just the good ones.
 */
import type {
  ThemeCosmeticItem,
  HatCosmeticItem,
  CowbellCosmeticItem,
  UtilityCosmeticItem,
  LanguageCosmeticItem,
  EmoticonCosmeticItem,
} from './cosmeticTypes.js';
import type { SnakeSpritePalette } from './cosmeticTypes.js';
import { EMOTICON_DEFINITIONS } from '../emoticons/emoticonCatalog.js';
import { AVAILABLE_LANGUAGES } from '../i18n/types.js';

// ---------------------------------------------------------------------------
// Theme definitions (merged from snakeScene + village shop + black market)
// ---------------------------------------------------------------------------

export interface ThemeDefinition {
  id: string;
  label: string;
  cost: number;
  palette: SnakeSpritePalette;
}

export const THEME_DEFINITIONS: readonly ThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic Green',
    cost: 0,
    palette: {
      baseColor: '#5dd6a2',
      bellyColor: '#c8ffe1',
      patternColor: '#2e8b68',
      outlineColor: '#3c8a69',
      eyeColor: '#f8ffef',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset Coral',
    cost: 18,
    palette: {
      baseColor: '#ff8a5b',
      bellyColor: '#ffe2b8',
      patternColor: '#b84c2f',
      outlineColor: '#7c2f22',
      eyeColor: '#fff7ef',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight Coil',
    cost: 30,
    palette: {
      baseColor: '#4f69ff',
      bellyColor: '#d4dcff',
      patternColor: '#26358f',
      outlineColor: '#18204a',
      eyeColor: '#f5f7ff',
    },
  },
  {
    id: 'bone',
    label: 'Bone White',
    cost: 44,
    palette: {
      baseColor: '#f0e7d8',
      bellyColor: '#fffaf0',
      patternColor: '#a99574',
      outlineColor: '#665744',
      eyeColor: '#221b15',
    },
  },
  {
    id: 'unicorn',
    label: 'Unicorn',
    cost: 88,
    palette: {
      baseColor: '#f5f0ff',
      bellyColor: '#fff8fc',
      patternColor: '#e8d5f5',
      outlineColor: '#b89fd4',
      eyeColor: '#ff69b4',
    },
  },
  {
    id: 'infernal',
    label: 'Infernal Coil',
    cost: 0,
    palette: {
      baseColor: '#c52b20',
      bellyColor: '#ff7a1a',
      patternColor: '#3b0808',
      outlineColor: '#120304',
      eyeColor: '#ffcf5a',
    },
  },
  // Village shop themes (purchasable)
  {
    id: 'market-moss',
    label: 'Market Moss',
    cost: 22,
    palette: {
      baseColor: '#6fbf73',
      bellyColor: '#e5ffd7',
      patternColor: '#356a3a',
      outlineColor: '#203d24',
      eyeColor: '#fffde8',
    },
  },
  {
    id: 'charcoal-silk',
    label: 'Charcoal Silk',
    cost: 32,
    palette: {
      baseColor: '#353942',
      bellyColor: '#d6d7d9',
      patternColor: '#7c445a',
      outlineColor: '#17191f',
      eyeColor: '#fff2c6',
    },
  },
  {
    id: 'pearlwake',
    label: 'Pearlwake',
    cost: 40,
    palette: {
      baseColor: '#a8f0f2',
      bellyColor: '#f5ffff',
      patternColor: '#417b88',
      outlineColor: '#1e4550',
      eyeColor: '#151d24',
    },
  },
  // Black market themes
  {
    id: 'retro-grid',
    label: 'Retro Grid',
    cost: 27,
    palette: {
      baseColor: '#5dd6a2',
      bellyColor: '#5dd6a2',
      patternColor: '#5dd6a2',
      outlineColor: '#5dd6a2',
      eyeColor: '#5dd6a2',
    },
  },
];

// ---------------------------------------------------------------------------
// Hat definitions
// ---------------------------------------------------------------------------

export interface HatDefinition {
  id: string;
  label: string;
  cost: number;
}

export const HAT_DEFINITIONS: readonly HatDefinition[] = [
  { id: 'cowboy', label: 'Cowboy Hat', cost: 36 },
  { id: 'market-cap', label: 'Market Cap', cost: 18 },
  { id: 'ember-cowl', label: 'Ember Cowl', cost: 30 },
  { id: 'pearl-crown', label: 'Pearl Crown', cost: 42 },
  { id: 'unicorn-horn', label: 'Unicorn Horn', cost: 55 },
  { id: 'demon-horns', label: 'Demon Horns', cost: 0 },
];

// ---------------------------------------------------------------------------
// Cowbell definitions
// ---------------------------------------------------------------------------

export interface CowbellDefinition {
  id: string;
  label: string;
  cost: number;
  description: string;
}

export const COWBELL_DEFINITIONS: readonly CowbellDefinition[] = [
  {
    id: 'cowbell',
    label: 'Cowbell',
    cost: 45,
    description: 'Swing it on a chain and let every step announce your presence.',
  },
];

// ---------------------------------------------------------------------------
// Utility definitions
// ---------------------------------------------------------------------------

export interface UtilityDefinition {
  id: string;
  label: string;
  cost: number;
  description: string;
}

export const UTILITY_DEFINITIONS: readonly UtilityDefinition[] = [
  {
    id: 'quiet-steps',
    label: 'Quiet Steps',
    cost: 100,
    description: 'Silence your footsteps. The wise old snake always ascends.',
  },
  {
    id: 'minimap',
    label: 'Minimap',
    cost: 50,
    description: "A small window into the maze. The wise old snake's grid was 999×999.",
  },
];

// ---------------------------------------------------------------------------
// Language definitions
// ---------------------------------------------------------------------------

export interface LanguageDefinition {
  id: string;
  label: string;
  cost: number;
  code: string;
  nativeName: string;
}

export const LANGUAGE_DEFINITIONS: readonly LanguageDefinition[] = AVAILABLE_LANGUAGES.map(
  (lang) => ({
    id: lang.id,
    label: lang.name,
    cost: 200,
    code: lang.code,
    nativeName: lang.nativeName,
  }),
);

// ---------------------------------------------------------------------------
// Emoticon definitions (re-exported from emoticon catalog)
// ---------------------------------------------------------------------------

export interface EmoticonDefinition {
  id: string;
  label: string;
  cost: number;
  symbol: string;
  description: string;
}

export const EMOTICON_CATALOG: readonly EmoticonDefinition[] = EMOTICON_DEFINITIONS.map((e) => ({
  id: e.id,
  label: e.label,
  cost: e.price,
  symbol: e.symbol,
  description: e.description,
}));

// ---------------------------------------------------------------------------
// Unified accessor functions
// ---------------------------------------------------------------------------

export function getAllThemeDefinitions(): readonly ThemeDefinition[] {
  return THEME_DEFINITIONS;
}

export function getThemeDefinition(id: string): ThemeDefinition | undefined {
  return THEME_DEFINITIONS.find((t) => t.id === id);
}

export function getAllHatDefinitions(): readonly HatDefinition[] {
  return HAT_DEFINITIONS;
}

export function getHatDefinition(id: string): HatDefinition | undefined {
  return HAT_DEFINITIONS.find((h) => h.id === id);
}

export function getAllCowbellDefinitions(): readonly CowbellDefinition[] {
  return COWBELL_DEFINITIONS;
}

export function getCowbellDefinition(id: string): CowbellDefinition | undefined {
  return COWBELL_DEFINITIONS.find((c) => c.id === id);
}

export function getAllUtilityDefinitions(): readonly UtilityDefinition[] {
  return UTILITY_DEFINITIONS;
}

export function getUtilityDefinition(id: string): UtilityDefinition | undefined {
  return UTILITY_DEFINITIONS.find((u) => u.id === id);
}

export function getAllLanguageDefinitions(): readonly LanguageDefinition[] {
  return LANGUAGE_DEFINITIONS;
}

export function getLanguageDefinition(id: string): LanguageDefinition | undefined {
  return LANGUAGE_DEFINITIONS.find((l) => l.id === id);
}

export function getAllEmoticonDefinitions(): readonly EmoticonDefinition[] {
  return EMOTICON_CATALOG;
}

export function getEmoticonDefinition(id: string): EmoticonDefinition | undefined {
  return EMOTICON_CATALOG.find((e) => e.id === id);
}

// ---------------------------------------------------------------------------
// Convert raw definitions to CosmeticItem format
// ---------------------------------------------------------------------------

export function toThemeItem(
  def: ThemeDefinition,
  owned: boolean,
  active: boolean,
): ThemeCosmeticItem {
  return {
    id: def.id,
    label: def.label,
    category: 'themes',
    cost: def.cost,
    palette: def.palette,
    owned,
    active: active || false,
  };
}

export function toHatItem(def: HatDefinition, owned: boolean, active: boolean): HatCosmeticItem {
  return {
    id: def.id,
    label: def.label,
    category: 'hats',
    cost: def.cost,
    owned,
    active: active || false,
  };
}

export function toCowbellItem(
  def: CowbellDefinition,
  owned: boolean,
  enabled?: boolean,
): CowbellCosmeticItem {
  return {
    id: def.id,
    label: def.label,
    category: 'cowbells',
    cost: def.cost,
    description: def.description,
    owned,
    active: enabled || false,
  };
}

export function toUtilityItem(
  def: UtilityDefinition,
  owned: boolean,
  enabled?: boolean,
): UtilityCosmeticItem {
  return {
    id: def.id,
    label: def.label,
    category: 'utilities',
    cost: def.cost,
    description: def.description,
    owned,
    active: enabled || false,
  };
}

export function toLanguageItem(
  def: LanguageDefinition,
  owned: boolean,
  active: boolean,
): LanguageCosmeticItem {
  return {
    id: def.id,
    label: def.label,
    category: 'languages',
    cost: def.cost,
    code: def.code,
    nativeName: def.nativeName,
    owned,
    active: active || false,
  };
}

export function toEmoticonItem(
  def: EmoticonDefinition,
  owned: boolean,
  active: boolean,
): EmoticonCosmeticItem {
  return {
    id: def.id,
    label: def.label,
    category: 'emoticons',
    cost: def.cost,
    symbol: def.symbol,
    description: def.description,
    owned,
    active: active || false,
  };
}
