export interface LanguageConfig {
  id: string;
  code: string;
  nativeName: string;
  name: string;
}

export const AVAILABLE_LANGUAGES: readonly LanguageConfig[] = [
  { id: 'en', code: 'en', nativeName: 'English', name: 'English' },
  { id: 'es', code: 'es', nativeName: 'Español', name: 'Spanish' },
  { id: 'fr', code: 'fr', nativeName: 'Français', name: 'French' },
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
  // Jason Statham Boss
  jason_statham_name?: string;
  jason_statham_intro?: string;
  jason_statham_tired?: string;
  jason_statham_tired_sub?: string;
  jason_statham_attack_charge?: string;
  jason_statham_attack_spiral?: string;
  jason_statham_attack_dash?: string;
  jason_statham_defeated?: string;
  jason_statham_victory?: string;
  jason_statham_score_bonus?: string;

  // === SAVE SYSTEM ===
  saveButton: string;
  loadButton: string;
  clearButton: string;
  gameSaved: string;
  noSaveFound: string;
  gameLoaded: string;
  loadFailed: string;
  saveCleared: string;
  autosave: string;

  // === SAVE LOAD MENU ===
  loadGameMenuTitle: string;
  regularSaves: string;
  autosaves: string;
  load: string;
  delete: string;
  back: string;
  confirmDelete: string;
  noSaves: string;
  noAutosaves: string;

  // === CARD GAME NAMES & DESCRIPTIONS ===
  cardMossTwo: string;
  cardMossFive: string;
  cardMossEight: string;
  cardTeethThree: string;
  cardTeethSeven: string;
  cardLanternThree: string;
  cardMarketAce: string;
  cardMoonJack: string;
  cardSmokeSmog: string;
  cardCarefulFive: string;
  cardAccountantOne: string;
  cardTooMuchSauce: string;
  cardAngelAudit: string;
  cardRoyalScale: string;
  cardFreakDennisFog: string;
  cardGoblinReceipt: string;
  cardMossTwoDesc: string;
  cardMossFiveDesc: string;
  cardMossEightDesc: string;
  cardTeethThreeDesc: string;
  cardTeethSevenDesc: string;
  cardLanternThreeDesc: string;
  cardMarketAceDesc: string;
  cardMoonJackDesc: string;
  cardSmokeSmogDesc: string;
  cardCarefulFiveDesc: string;
  cardAccountantOneDesc: string;
  cardTooMuchSauceDesc: string;
  cardAngelAuditDesc: string;
  cardRoyalScaleDesc: string;
  cardFreakDennisFogDesc: string;
  cardGoblinReceiptDesc: string;
  cardTablePorch: string;
  cardTableMarket: string;
  cardTableDennisDare: string;

  // === CARD SCORING MESSAGES ===
  cardScoreMoonJack: string;
  cardScoreMossEight: string;
  cardScoreTeethThree: string;
  cardScoreTeethSeven: string;
  cardScoreLanternThree: string;
  cardScoreMarketAce: string;
  cardScoreSmokeSmogDoubled: string;
  cardScoreSmokeSmogPenalty: string;
  cardScoreAccountantOne: string;
  cardScoreAngelAudit: string;
  cardScoreRoyalScale: string;
  cardScoreFreakDennisFog: string;
  cardScoreGoblinReceiptSuccess: string;
  cardScoreGoblinReceiptFail: string;
  cardScoreCarefulFive: string;

  // === CARD UI ===
  cardHoverHint: string;
  cardNoCardsInDeck: string;
  cardChipsLabel: string;
  cardMultiplierLabel: string;
  cardModifiersResolve: string;
  cardRoundWon: string;
  cardTooLow: string;
  cardTooHigh: string;
  cardTargetWindow: string;
  cardBestOf3: string;
  cardWagerLabel: string;
  cardDetailCollection: string;
  cardCollectionInfo: string;
  cardHintCards: string;
  cardDeckLabel: string;
  cardOwnedLabel: string;
  cardNoCardsOwned: string;

  // === TAB LABELS ===
  tabSkills: string;
  tabSpecial: string;
  tabSpells: string;
  tabInventory: string;
  tabCustomize: string;
  tabCards: string;
  tabDestiny: string;
  tabArtifacts: string;
  tabMap: string;
  tabDating: string;
  tabQuests: string;
  tabFactions: string;
  tabGraph: string;
  tabCheats: string;
  tabInfo: string;
  tabPeople: string;

  // === PRIMARY TAB LABELS ===
  primaryGrowth: string;
  primaryGear: string;
  primaryWorld: string;
  primarySystem: string;

  // === TAB PLACEHOLDER TEXT ===
  placeholderInventory: string;
  placeholderCustomize: string;
  placeholderMap: string;
  placeholderCheats: string;

  // === HUD ===
  hudHearts: string;
  hudLives: string;
  hudHeat: string;
  hudCold: string;

  // === TITLE SCREEN ===
  titleRaccoon: string;
  titleNormal: string;
  titleRaccoonLabel: string;
  titleNormalLabel: string;
  titleRaccoonDesc: string;
  titleNormalDesc: string;

  // === POPUP LABELS ===
  popupNewQuest: string;
  popupAccept: string;
  popupReject: string;
  popupNext: string;
  popupClose: string;

  // === ARCHAEOLOGY ===
  archaeologyTitle: string;
  archaeologyControls: string;
  archaeologySwap: string;
  archaeologyQuit: string;
  archaeologyRising: string;
  archaeologyPaused: string;
  archaeologyRecovered: string;
  archaeologyNothingYet: string;
  archaeologyDepth: string;
  archaeologyScore: string;
  archaeologyChain: string;
  archaeologyBest: string;
  archaeologyTileDirt: string;
  archaeologyTileStone: string;
  archaeologyTileRoots: string;
  archaeologyTileClay: string;
  archaeologyTileShell: string;
  archaeologyTileBone: string;
  archaeologyTileNormalApple: string;
  archaeologyTileSkittishApple: string;
  archaeologyTilePearlApple: string;
  archaeologyTileYuzuApple: string;
  archaeologyTileGoldenApple: string;
  archaeologyTileWasabiApple: string;
  archaeologyTileArtifactCache: string;
  archaeologyForestDig: string;
  archaeologyOceanDig: string;
  archaeologyDeepDig: string;
  archaeologyGameOver: string;
  archaeologyDepthMessage: string;
  archaeologyMatchTile: string;

  // === SKILL TREE ===
  skillTreeScore: string;
  skillTreeTypeCheat: string;
  skillTreeUnequipped: string;
  skillTreeCannotEquip: string;
  skillTreeQOptionUnavailable: string;
  skillTreeUnknownItem: string;
  skillTreeHoverSkill: string;
  skillTreeUnableToDisplay: string;
  skillTreeManaUnlocked: string;
  skillTreeArcanePulseUnlocked: string;
  skillTreeStarlightVeilPriming: string;
  skillTreeArcanePulseSurges: string;
  skillTreeStarlightVeilAbsorbed: string;
  skillTreeCouldNotInvest: string;
  skillTreeCouldNotUnlock: string;
  skillTreeHoverItem: string;
  skillTreeItemAcquired: string;
  skillTreeChosenFaith: string;
  skillTreeChosenBackground: string;
  skillTreeChosenClass: string;
  skillTreeCannotUseCheats: string;
  skillTreeNotQuickCookable: string;
  skillTreeStubText: string;
  skillTreeExploreHint: string;
  skillTreeMouseScrollHint: string;
  skillTreeScrollProgress: string;
  skillTreeRankLabel: string;
  skillTreeCostLabel: string;
  skillTreeMaxedLabel: string;
  skillTreeRequiresLabel: string;
  skillTreeNextLabel: string;

  // === RACCOON MODE ===
  raccoonLoad: string;
  raccoonLibertyBonus: string;
  raccoonNoGuildJob: string;
  raccoonTierLight: string;
  raccoonTierPocketed: string;
  raccoonTierLoaded: string;
  raccoonTierPacked: string;
  raccoonTierBurdened: string;
  raccoonTierHeavy: string;
  raccoonTierHefty: string;
  raccoonTierDragging: string;
  raccoonTierSagging: string;
  raccoonTierStraining: string;
  raccoonTierOverloaded: string;
  raccoonTierBuried: string;

  // === FISHING ===
  fishingTensionLabel: string;
  fishingProgressLabel: string;

  // === DATING ===
  datingTitle: string;
  datingHint: string;
  datingCounter: string;
  datingRelationships: string;
  datingNoRelationships: string;

  // === PEOPLE ===
  peopleTitle: string;
  peopleHint: string;
  peopleJournal: string;
  peopleNoPeople: string;

  // === FACTIONS ===
  factionsTitle: string;
  factionsHint: string;
  factionsStanding: string;

  // === DESTINY ===
  destinyTitle: string;
  destinyHint: string;
  destinyGuardianState: string;
  destinySystemsOffline: string;

  // === ARTIFACTS ===
  artifactsTitle: string;
  artifactsHint: string;
  artifactsRunModifiers: string;
  artifactsNoArtifacts: string;

  // === MISCELLANEOUS UI ===
  noItemsInInventory: string;
  noSaveFoundNoFile: string;
  loadFailedMessage: string;
  gameSavedTitle: string;
  noSaveFoundTitle: string;
  gameLoadedTitle: string;
  loadFailedTitle: string;
  saveClearedTitle: string;
  houseHudLabel: string;
  radioactiveSubstance: string;
  caveCollapse: string;
  pauseMenu: string;
  manaLatent: string;
  hintScroll: string;
  hintSelectTab: string;
  hintArcanePulseReady: string;
  hintManaBlooms: string;
  hintInspectItem: string;
  hintPressInspect: string;
  hintClickAvailableAbility: string;
  moreModulesComingSoon: string;
  questBoardLabel: string;
  thievesGuildLabel: string;
  wardContractsLabel: string;
  cardTableLabel: string;
  shopkeepersCounterLabel: string;
  tavernRunnerNote: string;
  actionUnlockArcanePulse: string;
  actionArcanePulseMana: string;
  actionArcanePulseFizzle: string;
  arcanePulseLabel: string;

  // === CARD SUITS & RARITY ===
  cardSuitMoss: string;
  cardSuitTeeth: string;
  cardSuitLanterns: string;
  cardSuitMoons: string;
  cardSuitSmoke: string;
  cardSuitJade: string;
  cardRarityCommon: string;
  cardRarityUncommon: string;
  cardRarityRare: string;
  cardRarityLegendary: string;

  // === JASON STATHAM VICTORY ===
  jasonStathamVictory: string;

  // === ARCHITECTURE / GROWTH TABS ===
  detailQSlot: string;
  detailSpellsTitle: string;
  hintSpells: string;
  detailAcceptedTasks: string;
  hintQuests: string;
  detailRelationships: string;
  hintDating: string;
  detailActorJournal: string;
  hintPeople: string;
  detailStanding: string;
  hintFactions: string;
  detailGuardianState: string;
  hintDestiny: string;
  detailRunModifiers: string;
  hintArtifacts: string;
  detailMenu: string;
  hintCheats: string;
  detailSnakeStyle: string;
  detailCosmetics: string;
  hintCustomization: string;
  detailStyle: string;
  detailHats: string;
  noHatsOwned: string;
  labelEnabled: string;
  labelOwned: string;
  labelOn: string;
  labelOff: string;
  labelEquipped: string;
  hintInventory: string;
  luckGraphTitle: string;
  luckGraphSubtitle: string;
  hintGraph: string;
  luckGraphYAxis: string;
  luckGraphXAxis: string;
  cheatApply: string;
  hintCheatInput: string;
  noAcceptedQuests: string;
  noActiveRelationships: string;
  noArtifactsRecovery: string;
  noSpellAvailable: string;

  // === SHOP LABELS ===
  shopTitlePrefix: string;

  // === HUD MISC ===
  hudScore: string;

  // === BULLET TRAIN ===
  boardTrain: string;
  departureAnnouncement: string;
  arrivalAnnouncement: string;
  stationSign: string;
  ticketBooth: string;
  platformLantern: string;
}

export interface ActorVoiceTranslations {
  [entryId: string]: {
    line?: string;
    beat?: string;
  };
}
