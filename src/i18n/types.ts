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
  treatLabel: string;
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
  // Snake Cane's
  canesCashierDialogue: string;
  canesReward: string;
  canesClosing: string;
  canesBoxComboExtraToast: string;
  canesBoxComboColeslaw: string;
  canesThreeFingerCombo: string;
  canesCaniacCombo: string;
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
  // Child Catch Mini-Game
  childCatchLabel: string;
  childCatchHint: string;
  childCatchNoChildren: string;
  childCatchSuccess: string;
  childCatchMiss: string;
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
  pauseButton: string;
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
  archaeologyTileColdBeerApple: string;
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

  // === RADIO ===
  radioLabel: string;
  radioStationLabel: string;
  radioNoStation: string;
  radioTuning: string;
  radioStationChanged: string;
  radioStationStatic: string;
  radioStationClassical: string;
  radioStationJazz: string;
  radioStationCountry: string;
  radioStationRock: string;
  radioStationElectronic: string;
  radioStationLofi: string;
  radioStationTalk: string;
  radioEquipHint: string;

  // === DREAM WORLD ===
  dreamWorldTitle: string;
  nightmareRealmTitle: string;
  dreamShopTitle: string;
  dreamLoreTitle: string;
  dreamLucidityTitle: string;
  dreamExit: string;
  dreamShards: string;
  dreamGravity: string;
  dreamGravityUp: string;
  dreamGravityDown: string;
  dreamGravityLeft: string;
  dreamGravityRight: string;
  dreamCollectApple: string;
  dreamOpenShop: string;
  dreamOpenPuzzles: string;
  dreamOpenLucid: string;
  dreamGravityShifted: string;
  dreamBuffApplied: string;
  dreamLoreDiscovered: string;
  dreamAppleCollected: string;
  dreamNightmareSurvived: string;
  dreamShopPurchase: string;
  dreamShopNotEnough: string;
  dreamShopRequiresLucidity: string;
  dreamLucidNotUnlocked: string;
  dreamLucidAbilityUsed: string;
  dreamLucidAbilityCooldown: string;
  dreamPuzzleSolved: string;
  dreamPuzzleFailed: string;
  dreamWelcome: string;
  dreamNightmareWelcome: string;
  dreamShopLabel: string;
  dreamShopClose: string;
  dreamPuzzleLabel: string;
  dreamPuzzleClose: string;
  dreamLucidLabel: string;
  dreamLucidClose: string;
  dreamReverseGravity: string;
  dreamTimeStop: string;
  dreamIslandTeleport: string;
  dreamBuffSpeedBoost: string;
  dreamBuffSizeShrink: string;
  dreamBuffPhaseShift: string;
  dreamBuffShield: string;
  dreamBuffDoubleShards: string;
  dreamBuffGravityReverse: string;
  dreamBuffTimeSlow: string;
  dreamBuffLucidityBoost: string;

  // === ECOSYSTEM ===
  ecosystemTitle: string;
  ecosystemHealth: string;
  ecosystemBalanced: string;
  ecosystemHealthy: string;
  ecosystemStressed: string;
  ecosystemCritical: string;
  ecosystemCollapsing: string;
  ecosystemPredatorPrey: string;
  ecosystemHerbivores: string;
  ecosystemPlantBiomass: string;
  ecosystemEventWarning: string;
  ecosystemPredatorOutbreak: string;
  ecosystemHerbivoreMigration: string;
  ecosystemPlague: string;
  ecosystemFamine: string;
  ecosystemMatingSeason: string;
  ecosystemRecovery: string;

  // === SETTLEMENTS ===
  settlementTitle: string;
  settlementFounded: string;
  settlementDissolved: string;
  settlementBeaverDam: string;
  settlementAntColony: string;
  settlementBirdCity: string;
  settlementBearCave: string;
  settlementRabbitWarren: string;
  settlementFishSchool: string;
  settlementWolfPackLair: string;
  settlementFoxDen: string;
  settlementEagleEyrie: string;
  settlementRaccoonKingdom: string;
  settlementBisonHerd: string;
  settlementFrogPond: string;

  // === KINGDOMS ===
  kingdomTitle: string;
  kingdomFormed: string;
  kingdomRuler: string;
  kingdomCapital: string;
  kingdomPower: string;
  kingdomAllied: string;
  kingdomNeutral: string;
  kingdomHostile: string;
  kingdomRoyalEvent: string;
  kingdomCoronation: string;
  kingdomRoyalFeast: string;
  kingdomRoyalHunt: string;
  kingdomDiplomaticSummit: string;
  kingdomWarCouncil: string;

  // === COMPANIONS ===
  companionTitle: string;
  companionBond: string;
  companionTierWary: string;
  companionTierTrusting: string;
  companionTierLoyal: string;
  companionTierSoulbound: string;
  companionTraitSwift: string;
  companionTraitStrong: string;
  companionTraitClever: string;
  companionTraitFierce: string;
  companionTraitGentle: string;
  companionTraitStealthy: string;
  companionTraitLoyal: string;
  companionTraitWild: string;
  companionTraitAncient: string;
  companionTraitRareBreed: string;
  companionBred: string;
  companionTraitGained: string;
  companionLevelUp: string;

  // === PHOTOGRAPHY ===
  photographyTitle: string;
  photoTaken: string;
  photoCommon: string;
  photoUncommon: string;
  photoRare: string;
  photoEpic: string;
  photoLegendary: string;
  photoJournalScore: string;
  photoUniqueSpecies: string;
  photoTotalPhotos: string;
  photoCameraCharge: string;
  photoMiniGameHint: string;
  photoMiniGameSuccess: string;
  photoMiniGameFail: string;

  // === ANIMAL MARKETS ===
  animalMarketTitle: string;
  marketGoods: string;
  marketHoney: string;
  marketFur: string;
  marketFeathers: string;
  marketWoodPlanks: string;
  marketPearls: string;
  marketPelts: string;
  marketPurchase: string;
  marketSpecialDeal: string;
  marketRestocked: string;

  // === WILDLIFE JOURNAL ===
  wildlifeJournalTitle: string;
  wildlifeJournalComplete: string;
  wildlifeSpeciesDiscovered: string;
  wildlifeSpeciesTotal: string;
  wildlifeCompletion: string;
  wildlifeNoPhotos: string;
  wildlifePhotoDetail: string;
  wildlifeBestRarity: string;
  wildlifeBestScore: string;

  // === ALCHEMY & CRAFTING ===
  alchemyTitle: string;
  alchemyRecipes: string;
  alchemyCrafting: string;
  alchemyJournal: string;
  alchemyLore: string;
  alchemyWorkshops: string;
  alchemyNoRecipes: string;
  alchemyCraftSuccess: string;
  alchemyCraftMythic: string;
  alchemyCraftFailed: string;
  alchemyInsufficientIngredients: string;
  alchemyStationNotActive: string;
  alchemyRecipeNotFound: string;
  alchemyDiscoverProgress: string;
  alchemyJournalEntries: string;
  alchemyLoreDiscovered: string;
  alchemyLoreLocked: string;
  alchemyLoreRequires: string;
  alchemyWorkshopBuilding: string;
  alchemyTabRecipes: string;
  alchemyTabCrafting: string;
  alchemyTabJournal: string;
  alchemyTabLore: string;
  alchemyTabWorkshops: string;
  alchemyPotionGrowth: string;
  alchemyPotionPhase: string;
  alchemyPotionMagnet: string;
  alchemyPotionTimeSlow: string;
  alchemyPotionShadowCloak: string;
  alchemyPotionRainbowTrail: string;
  alchemyPotionSpeedBoost: string;
  alchemyPotionShield: string;
  alchemyPotionSizeShrink: string;
  alchemyPotionLucidity: string;
  alchemyMythicTitansBane: string;
  alchemyMythicVoidWalker: string;
  alchemyMythicAppleStorm: string;
  alchemyMythicGoldenSerpent: string;
  alchemyIngredientCommon: string;
  alchemyIngredientUncommon: string;
  alchemyIngredientRare: string;
  alchemyIngredientLegendary: string;
  alchemyRarityCommon: string;
  alchemyRarityUncommon: string;
  alchemyRarityRare: string;
  alchemyRarityLegendary: string;
  alchemyWorkshopEnchantedLoom: string;
  alchemyWorkshopCartographersDesk: string;
  alchemyWorkshopMusicBox: string;
  alchemyWorkshopPotionBrewery: string;
  alchemyCosmeticSkins: string;
  alchemyPatterns: string;
  alchemyRecipeScroll: string;
  alchemyFirstSteps: string;
  alchemyApprentice: string;
  alchemyMaster: string;
}

export interface ActorVoiceTranslations {
  [entryId: string]: {
    line?: string;
    beat?: string;
  };
}
