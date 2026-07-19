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
      actorVoice?: ActorVoiceTranslations;
      humanStrings: HumanTranslations;
    }
  > = {
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
    const current = (
      this.translations[this.currentLanguage]?.featureStrings as unknown as Record<string, string>
    )?.[key];
    if (current !== undefined && current !== null) return current;
    // Fallback to English
    const en = (this.translations['en']?.featureStrings as unknown as Record<string, string>)?.[
      key
    ];
    if (en !== undefined && en !== null) return en;
    return key;
  }

  getCommon(key: string): string {
    return getNestedString(this.translations[this.currentLanguage]?.common, key) ?? key;
  }

  getActorVoice(entryId: string, part: 'line' | 'beat'): string | undefined {
    return this.translations[this.currentLanguage]?.actorVoice?.[entryId]?.[part];
  }

  getHumanString(key: string): string {
    const current = (
      this.translations[this.currentLanguage]?.humanStrings as unknown as Record<string, string>
    )?.[key];
    if (current !== undefined && current !== null) return current;
    // Fallback to English
    const en = (this.translations['en']?.humanStrings as unknown as Record<string, string>)?.[key];
    if (en !== undefined && en !== null) return en;
    return key;
  }

  getHumanEncounter(encounterId: string): import('./types.js').NpcTranslations[LanguageId] | undefined {
    return this.translations[this.currentLanguage]?.npcEncounters?.[encounterId];
  }

  getBulletTrain(key: string): string {
    const current = (
      this.translations[this.currentLanguage]?.common as unknown as Record<string, unknown>
    )?.['bulletTrain'] as Record<string, string> | undefined;
    if (current) {
      const value = current[key];
      if (value !== undefined && value !== null) return value as string;
    }
    // Fallback to English
    const en = (this.translations['en']?.common as unknown as Record<string, unknown>)?.[
      'bulletTrain'
    ] as Record<string, string> | undefined;
    if (en) {
      const value = en[key];
      if (value !== undefined && value !== null) return value as string;
    }
    return key;
  }

  getRollercoaster(key: string): string {
    const current = (
      this.translations[this.currentLanguage]?.common as unknown as Record<string, unknown>
    )?.['rollercoaster'] as Record<string, string> | undefined;
    if (current) {
      const value = current[key];
      if (value !== undefined && value !== null) return value as string;
    }
    // Fallback to English
    const en = (this.translations['en']?.common as unknown as Record<string, unknown>)?.[
      'rollercoaster'
    ] as Record<string, string> | undefined;
    if (en) {
      const value = en[key];
      if (value !== undefined && value !== null) return value as string;
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
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, translations);
  return typeof value === 'string' ? value : undefined;
}
