const STORAGE_KEY = 'preferredLanguage';

function getStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export const loadLanguagePreference = (): string | null => {
  return getStorage()?.getItem(STORAGE_KEY) ?? null;
};

export const saveLanguagePreference = (languageId: string): void => {
  getStorage()?.setItem(STORAGE_KEY, languageId);
};

export const clearLanguagePreference = (): void => {
  getStorage()?.removeItem(STORAGE_KEY);
};
