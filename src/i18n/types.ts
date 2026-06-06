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

export type LanguageId = (typeof AVAILABLE_LANGUAGES)[number]['id'];
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
  questId?: string;
  rewardScore?: number;
}

export interface QuestTranslations {
  [questId: string]: QuestDialogue;
}

export interface NpcTranslations {
  [npcId: string]: NpcDialogue;
}

export interface CommonTranslations {
  [key: string]: unknown;
}

export interface QuestStrings {
  [questId: string]: {
    label: string;
    description: string;
  };
}

export interface FeatureStrings {
  questLabel: string;
  questsHeader: string;
  noCardsOwned: string;
  cardsOwnedHeader: string;
  cardsInfo: string;
  scoreLabel: string;
  lengthLabel: string;
  bonusAppleReady: string;
  killstreakHeader: string;
  killstreakToNext: string;
  killstreakMaxStreak: string;
  killstreakBest: string;
  killstreakScoreTime: string;
  killConfirmed: string;
  streakReset: string;
  streakLost: string;
  tierReconDrone: string;
  tierReconDroneCallout: string;
  tierAttackChopper: string;
  tierAttackChopperCallout: string;
  tierTacticalNuke: string;
  tierTacticalNukeCallout: string;
  faithTitle: string;
  backgroundTitle: string;
  classTitle: string;
  gameplayBonus: string;
  startReligionTitle: string;
  alreadyCarriesThis: string;
  taskAlreadyDone: string;
  cardInfo: string;
  snakeBurger: string;
  snakeFries: string;
  snakeNuggets: string;
  flushToilet: string;
  mcCashierDialogue: string;
  // Fishing
  fishingCast: string;
  fishingBite: string;
  fishingTug: string;
  fishingStruggle: string;
  fishingCaught: string;
  fishingEscaped: string;
  fishingLineBroken: string;
  fishingNoRod: string;
  fishingNoWater: string;
  fishingInWater: string;
  fishingProgress: string;
  fishingTension: string;
  fishingZoneSafe: string;
  fishingZoneWarning: string;
  fishingZoneDanger: string;
  fishingZoneCritical: string;
  fishingReleaseNow: string;
  fishingAdjustReeling: string;
  fishingHoldLeftRight: string;
  fishingFishCaught: string;
  fishingSellOffer: string;
  fishingInventoryFull: string;
  fishingSellOrDiscard: string;
  fishingQuestFishTitle: string;
  fishingQuestFishDesc: string;
  fishingQuestCatchLabel: string;
}
