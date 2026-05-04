const STORAGE_KEY = 'preferredLanguage';

export const loadLanguagePreference = (): string | null => {
  return localStorage.getItem(STORAGE_KEY);
};

export const saveLanguagePreference = (languageId: string): void => {
  localStorage.setItem(STORAGE_KEY, languageId);
};

export const clearLanguagePreference = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};