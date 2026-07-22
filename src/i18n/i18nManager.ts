import type { LanguageId } from './types.js';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from './types.js';
import { COMMON_EN } from './languages/en/common.js';
import { COMMON_ES } from './languages/es/common.js';
import { COMMON_FR } from './languages/fr/common.js';
import { QUEST_DIALOGUE_EN } from './languages/en/questDialogue.js';
import { QUEST_DIALOGUE_ES } from './languages/es/questDialogue.js';
import { QUEST_DIALOGUE_FR } from './languages/fr/questDialogue.js';
import { NPC_ENCOUNTERS_EN } from './languages/en/npcEncounters.js';
import { NPC_ENCOUNTERS_ES } from './languages/es/npcEncounters.js';
import { NPC_ENCOUNTERS_FR } from './languages/fr/npcEncounters.js';
import { QUEST_STRINGS_EN } from './languages/en/questStrings.js';
import { QUEST_STRINGS_ES } from './languages/es/questStrings.js';
import { QUEST_STRINGS_FR } from './languages/fr/questStrings.js';
import { FEATURE_STRINGS_EN } from './languages/en/featureStrings.js';
import { FEATURE_STRINGS_ES } from './languages/es/featureStrings.js';
import { FEATURE_STRINGS_FR } from './languages/fr/featureStrings.js';
import { ACTOR_VOICE_ES } from './languages/es/actorVoice.js';
import { ACTOR_VOICE_FR } from './languages/fr/actorVoice.js';
import { HUMAN_STRINGS_EN } from './languages/en/humanStrings.js';
import { HUMAN_STRINGS_ES } from './languages/es/humanStrings.js';
import { HUMAN_STRINGS_FR } from './languages/fr/humanStrings.js';
import type {
  QuestTranslations,
  NpcTranslations,
  CommonTranslations,
  QuestStrings,
  FeatureStrings,
  ActorVoiceTranslations,
  HumanTranslations,
  BulletTrainTranslations,
  RollercoasterTranslations,
} from './types.js';

interface LanguageBundle {
  questDialogue: QuestTranslations;
  npcEncounters: NpcTranslations;
  common: CommonTranslations;
  questStrings: QuestStrings;
  featureStrings: FeatureStrings;
  actorVoice?: ActorVoiceTranslations;
  humanStrings: HumanTranslations;
  bulletTrain?: BulletTrainTranslations;
  rollercoaster?: RollercoasterTranslations;
}

class I18nManager {
  private currentLanguage: LanguageId = DEFAULT_LANGUAGE;
  private translations: Record<LanguageId, LanguageBundle> = {
    en: {
      questDialogue: QUEST_DIALOGUE_EN,
      npcEncounters: NPC_ENCOUNTERS_EN,
      common: COMMON_EN,
      questStrings: QUEST_STRINGS_EN,
      featureStrings: FEATURE_STRINGS_EN,
      humanStrings: HUMAN_STRINGS_EN,
    },
    es: {
      questDialogue: QUEST_DIALOGUE_ES,
      npcEncounters: NPC_ENCOUNTERS_ES,
      common: COMMON_ES,
      questStrings: QUEST_STRINGS_ES,
      featureStrings: FEATURE_STRINGS_ES,
      actorVoice: ACTOR_VOICE_ES,
      humanStrings: HUMAN_STRINGS_ES,
    },
    fr: {
      questDialogue: QUEST_DIALOGUE_FR,
      npcEncounters: NPC_ENCOUNTERS_FR,
      common: COMMON_FR,
      questStrings: QUEST_STRINGS_FR,
      featureStrings: FEATURE_STRINGS_FR,
      actorVoice: ACTOR_VOICE_FR,
      humanStrings: HUMAN_STRINGS_FR,
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
    const current = this.translations[this.currentLanguage]?.featureStrings[key];
    if (current !== undefined) return current;
    // Fallback to English
    const en = this.translations['en']?.featureStrings[key];
    if (en !== undefined) return en;
    return key;
  }

  getCommon(key: string): string {
    return getNestedString(this.translations[this.currentLanguage]?.common, key) ?? key;
  }

  getActorVoice(entryId: string, part: 'line' | 'beat'): string | undefined {
    return this.translations[this.currentLanguage]?.actorVoice?.[entryId]?.[part];
  }

  getHumanString(key: string): string {
    const current = this.translations[this.currentLanguage]?.humanStrings[key];
    if (current !== undefined) return current;
    // Fallback to English
    const en = this.translations['en']?.humanStrings[key];
    if (en !== undefined) return en;
    return key;
  }

  getHumanEncounter(
    encounterId: string,
  ): import('./types.js').NpcTranslations[LanguageId] | undefined {
    return this.translations[this.currentLanguage]?.npcEncounters?.[encounterId];
  }

  getBulletTrain(key: string): string {
    const current = this.translations[this.currentLanguage]?.common['bulletTrain'];
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const value = (current as BulletTrainTranslations)[key];
      if (value !== undefined) return value;
    }
    // Fallback to English
    const en = this.translations['en']?.common['bulletTrain'];
    if (en && typeof en === 'object' && !Array.isArray(en)) {
      const value = (en as BulletTrainTranslations)[key];
      if (value !== undefined) return value;
    }
    return key;
  }

  getRollercoaster(key: string): string {
    const current = this.translations[this.currentLanguage]?.common['rollercoaster'];
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const value = (current as RollercoasterTranslations)[key];
      if (value !== undefined) return value;
    }
    // Fallback to English
    const en = this.translations['en']?.common['rollercoaster'];
    if (en && typeof en === 'object' && !Array.isArray(en)) {
      const value = (en as RollercoasterTranslations)[key];
      if (value !== undefined) return value;
    }
    return key;
  }
}

export const i18n = new I18nManager();

function getNestedString(
  translations: CommonTranslations | undefined,
  key: string,
): string | undefined {
  if (!translations) return undefined;
  const direct = translations[key];
  if (typeof direct === 'string') return direct;
  const value = key.split('.').reduce<CommonTranslations | undefined>(
    (current, part) => {
      if (current && typeof current === 'object' && !Array.isArray(current) && part in current) {
        return current[part] as CommonTranslations;
      }
      return undefined;
    },
    translations,
  );
  return typeof value === 'string' ? value : undefined;
}
