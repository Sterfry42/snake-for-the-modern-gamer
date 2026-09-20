/**
 * Cosmetic state management.
 *
 * The wise old snake's configuration was never saved to disk — it was stored in a dream.
 */
// ---------------------------------------------------------------------------
// Raw save state (mirrors the existing SnakeCosmeticState shape for compatibility)
// ---------------------------------------------------------------------------

export interface CosmeticStateRaw {
  unlockedThemes: string[];
  activeTheme: string;
  unlockedHats: string[];
  activeHat: string | null;
  cowboyHatUnlocked: boolean;
  cowboyHatEquipped: boolean;
  cowbellUnlocked: boolean;
  cowbellEquipped: boolean;
  loudWalkingNoiseUnlocked: boolean;
  loudWalkingNoiseEnabled: boolean;
  minimapUnlocked: boolean;
  minimapEnabled: boolean;
  languageSelected: boolean;
  languageSet: boolean;
  activeLanguage: string;
  ownedEmoticons: string[];
  activeEmoticon: string | null;
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

export function createDefaultCosmeticState(): CosmeticStateRaw {
  return {
    unlockedThemes: ['classic'],
    activeTheme: 'classic',
    unlockedHats: [],
    activeHat: null,
    cowboyHatUnlocked: false,
    cowboyHatEquipped: false,
    cowbellUnlocked: false,
    cowbellEquipped: false,
    loudWalkingNoiseUnlocked: false,
    loudWalkingNoiseEnabled: false,
    minimapUnlocked: false,
    minimapEnabled: false,
    languageSelected: false,
    languageSet: false,
    activeLanguage: 'en',
    ownedEmoticons: [],
    activeEmoticon: null,
  };
}

// ---------------------------------------------------------------------------
// Helper: check if a theme is unlocked
// ---------------------------------------------------------------------------

export function isThemeUnlocked(state: CosmeticStateRaw, themeId: string): boolean {
  return state.unlockedThemes.includes(themeId);
}

// ---------------------------------------------------------------------------
// Helper: check if a hat is unlocked
// ---------------------------------------------------------------------------

export function isHatUnlocked(state: CosmeticStateRaw, hatId: string): boolean {
  return state.unlockedHats.includes(hatId);
}

// ---------------------------------------------------------------------------
// Helper: check if a cowbell is unlocked
// ---------------------------------------------------------------------------

export function isCowbellUnlocked(state: CosmeticStateRaw): boolean {
  return state.cowbellUnlocked;
}

// ---------------------------------------------------------------------------
// Helper: check if a utility is unlocked
// ---------------------------------------------------------------------------

export function isQuietStepsUnlocked(state: CosmeticStateRaw): boolean {
  return state.loudWalkingNoiseUnlocked;
}

export function isMinimapUnlocked(state: CosmeticStateRaw): boolean {
  return state.minimapUnlocked;
}

// ---------------------------------------------------------------------------
// Helper: check if a language is unlocked
// ---------------------------------------------------------------------------

export function isLanguageUnlocked(state: CosmeticStateRaw): boolean {
  return state.languageSelected;
}

// ---------------------------------------------------------------------------
// Helper: check if an emoticon is owned
// ---------------------------------------------------------------------------

export function isEmoticonOwned(state: CosmeticStateRaw, emoticonId: string): boolean {
  return state.ownedEmoticons.includes(emoticonId);
}

// ---------------------------------------------------------------------------
// Helper: get the active language
// ---------------------------------------------------------------------------

export function getActiveLanguage(state: CosmeticStateRaw): string {
  return state.languageSet ? state.activeLanguage : 'en';
}
