import type { LanguageId } from './types.js';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from './types.js';
import { COMMON_EN } from './languages/en/common.js';
import { COMMON_ES } from './languages/es/common.js';
import { QUEST_DIALOGUE_EN } from './languages/en/questDialogue.js';
import { QUEST_DIALOGUE_ES } from './languages/es/questDialogue.js';
import { NPC_ENCOUNTERS_EN } from './languages/en/npcEncounters.js';
import { NPC_ENCOUNTERS_ES } from './languages/es/npcEncounters.js';
import { QUEST_STRINGS_EN } from './languages/en/questStrings.js';
import { QUEST_STRINGS_ES } from './languages/es/questStrings.js';
import { FEATURE_STRINGS_EN } from './languages/en/featureStrings.js';
import { FEATURE_STRINGS_ES } from './languages/es/featureStrings.js';
import type {
  QuestTranslations,
  NpcTranslations,
  CommonTranslations,
  QuestStrings,
  FeatureStrings,
} from './types.js';

class I18nManager {
  private currentLanguage: LanguageId = DEFAULT_LANGUAGE;
  private translations: Record<
    LanguageId,
    {
      questDialogue: QuestTranslations;
      npcEncounters: NpcTranslations;
      common: CommonTranslations;
      questStrings: QuestStrings;
      featureStrings: FeatureStrings;
    }
  > = {
    en: {
      questDialogue: QUEST_DIALOGUE_EN,
      npcEncounters: NPC_ENCOUNTERS_EN,
      common: COMMON_EN,
      questStrings: QUEST_STRINGS_EN,
      featureStrings: FEATURE_STRINGS_EN,
    },
    es: {
      questDialogue: QUEST_DIALOGUE_ES,
      npcEncounters: NPC_ENCOUNTERS_ES,
      common: COMMON_ES,
      questStrings: QUEST_STRINGS_ES,
      featureStrings: FEATURE_STRINGS_ES,
    },
  };

  setLanguage(languageId: LanguageId) {
    if (AVAILABLE_LANGUAGES.some((l) => l.id === languageId)) {
      this.currentLanguage = languageId;
    }
  }

  getCurrentLanguage(): LanguageId {
    return this.currentLanguage;
  }

  getQuestDialogue(questId: string): QuestTranslations[LanguageId] | undefined {
    return this.translations[this.currentLanguage]?.questDialogue?.[questId];
  }

  getNpcEncounter(npcId: string): NpcTranslations[LanguageId] | undefined {
    return this.translations[this.currentLanguage]?.npcEncounters?.[npcId];
  }

  getQuestString(questId: string): { label: string; description: string } | undefined {
    return this.translations[this.currentLanguage]?.questStrings?.[questId];
  }

  getFeatureString(key: string): string {
    return (this.translations[this.currentLanguage]?.featureStrings as unknown as Record<string, string>)?.[key] ?? key;
  }

  getCommon(key: string): string {
    return (this.translations[this.currentLanguage]?.common?.[key] ?? key) as string;
  }
}

export const i18n = new I18nManager();
