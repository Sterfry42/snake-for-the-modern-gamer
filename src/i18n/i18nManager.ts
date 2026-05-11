import type { LanguageId } from "./types.js";
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from "./types.js";
import { COMMON_EN } from "./languages/en/common.js";
import { COMMON_ES } from "./languages/es/common.js";
import { QUEST_DIALOGUE_EN } from "./languages/en/questDialogue.js";
import { QUEST_DIALOGUE_ES } from "./languages/es/questDialogue.js";
import { NPC_ENCOUNTERS_EN } from "./languages/en/npcEncounters.js";
import { NPC_ENCOUNTERS_ES } from "./languages/es/npcEncounters.js";
import type { QuestTranslations, NpcTranslations, CommonTranslations } from "./types.js";

class I18nManager {
  private currentLanguage: LanguageId = DEFAULT_LANGUAGE;
  private translations: Record<LanguageId, {
    questDialogue: QuestTranslations;
    npcEncounters: NpcTranslations;
    common: CommonTranslations;
  }> = {
    en: {
      questDialogue: QUEST_DIALOGUE_EN,
      npcEncounters: NPC_ENCOUNTERS_EN,
      common: COMMON_EN,
    },
    es: {
      questDialogue: QUEST_DIALOGUE_ES,
      npcEncounters: NPC_ENCOUNTERS_ES,
      common: COMMON_ES,
    },
  };

  setLanguage(languageId: LanguageId) {
    if (AVAILABLE_LANGUAGES.some(l => l.id === languageId)) {
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

  getCommon(key: string): string | unknown {
    return this.translations[this.currentLanguage]?.common?.[key] ?? key;
  }
}

export const i18n = new I18nManager();