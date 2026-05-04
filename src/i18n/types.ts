export interface LanguageConfig {
  id: string;
  code: string;
  nativeName: string;
  name: string;
}

export const AVAILABLE_LANGUAGES: readonly LanguageConfig[] = [
  { id: 'en', code: 'en', nativeName: 'English', name: 'English' },
  { id: 'es', code: 'es', nativeName: 'Español', name: 'Spanish' },
];

export type LanguageId = typeof AVAILABLE_LANGUAGES[number]['id'];
export const DEFAULT_LANGUAGE: LanguageId = 'en';

export interface QuestDialogue {
  title: string;
  pages: string[];
}

export interface NpcDialogue {
  pages: string[];
  repeatPages?: string[];
  acceptLabel?: string;
  rejectLabel?: string;
}

export interface QuestTranslations {
  [questId: string]: QuestDialogue;
}

export interface NpcTranslations {
  [npcId: string]: NpcDialogue;
}

export interface CommonTranslations {
  [key: string]: string;
}