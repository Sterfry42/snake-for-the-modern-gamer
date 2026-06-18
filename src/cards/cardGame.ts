export type CardSuit = 'moss' | 'teeth' | 'lanterns' | 'moons' | 'smoke' | 'jade';

export type CardTableId = 'porch-table' | 'market-table' | 'dennis-dare';

export type HouseCardTiming = 'before-draw' | 'score-window' | 'before-score' | 'after-round';

export type HouseCardRarity = 'common' | 'uncommon' | 'rare' | 'freak';

export type HouseCardId =
  | 'tighten-the-gap'
  | 'short-hand'
  | 'chip-tax'
  | 'dealer-skims'
  | 'big-blind'
  | 'no-cowards'
  | 'two-pair'
  | 'burn-notice';

export type HouseMode =
  | {
      kind: 'fixed';
      cardsPerRound: number;
      persistent: boolean;
    }
  | {
      kind: 'variable';
      minCardsPerRound: number;
      maxCardsPerRound: number;
      persistent: boolean;
    };

export type CardId =
  | 'moss-two'
  | 'moss-five'
  | 'moss-eight'
  | 'teeth-three'
  | 'teeth-seven'
  | 'lantern-three'
  | 'market-ace'
  | 'moon-jack'
  | 'smoke-smog'
  | 'careful-five'
  | 'accountant-one'
  | 'too-much-sauce'
  | 'angel-audit'
  | 'royal-scale'
  | 'freak-dennis-fog'
  | 'goblin-receipt';

export type LegacyWorldEffectCardId =
  | 'oni-card'
  | 'kitsune-card'
  | 'samurai-card'
  | 'jizo-card'
  | 'raiju-card'
  | 'kappa-card'
  | 'katana-blueprint';

export interface CardDefinition {
  id: CardId;
  name: string;
  i18nName: string;
  suit: CardSuit;
  i18nSuit: string;
  chips: number;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare';
  i18nRarity: string;
  description: string;
  i18nDescription: string;
}

export interface CardTableDefinition {
  id: CardTableId;
  name: string;
  i18nName: string;
  description: string;
  minScore: number;
  maxScore: number;
  maxWager: number;
  payoutMultiplier: number;
  houseMode: HouseMode;
  houseCardPool: HouseCardId[];
  houseCardWeightOverrides?: Partial<Record<HouseCardId, number>>;
  riskLabel?: string;
  tableFlavor?: string;
  entryFee?: number;
  rewardScore?: number;
}

export interface HouseCardDefinition {
  id: HouseCardId;
  name: string;
  shortText: string;
  description: string;
  timing: HouseCardTiming;
  rarity: HouseCardRarity;
  weight: number;
}

export interface ActiveHouseCard {
  id: HouseCardId;
  roundPlayed: number;
  persistent: boolean;
}

export type CardCollection = Partial<Record<CardId, number>>;

export const CARD_TO_ITEM_MIGRATION: Record<LegacyWorldEffectCardId, string> = {
  'oni-card': 'oni-charm',
  'kitsune-card': 'kitsune-charm',
  'samurai-card': 'samurai-token',
  'jizo-card': 'jizo-stone',
  'raiju-card': 'raiju-bottle',
  'kappa-card': 'kappa-bowl',
  'katana-blueprint': 'katana-blueprint',
};

export interface CardCompetitionState {
  tableId: CardTableId;
  wagerScore: number;
  round: number;
  wins: number;
  losses: number;
  spentCards: CardId[];
  deck: CardId[];
  discard: CardId[];
  activeHouseCards: ActiveHouseCard[];
  houseCardsThisRound: HouseCardId[];
  destroyedCards: CardId[];
}

export interface CardScoreResult {
  chips: number;
  multiplier: number;
  finalScore: number;
  minScore: number;
  maxScore: number;
  details: string[];
  houseCards: HouseCardId[];
  scoredCards: CardId[];
  ignoredCards: CardId[];
  destroyedCards: CardId[];
  appliedHouseEffects: string[];
}

export interface ScoreCardHandOptions {
  houseCards?: HouseCardId[];
}

export const CARD_DEFINITIONS: readonly CardDefinition[] = [
  {
    id: 'moss-two',
    name: 'Moss Two',
    i18nName: 'cardMossTwo',
    suit: 'moss',
    i18nSuit: 'cardSuitMoss',
    chips: 2,
    price: 4,
    rarity: 'common',
    i18nRarity: 'cardRarityCommon',
    description: 'A humble green starter.',
    i18nDescription: 'cardMossTwoDesc',
  },
  {
    id: 'moss-five',
    name: 'Moss Five',
    i18nName: 'cardMossFive',
    suit: 'moss',
    i18nSuit: 'cardSuitMoss',
    chips: 5,
    price: 7,
    rarity: 'common',
    i18nRarity: 'cardRarityCommon',
    description: 'Reliable chips, no drama.',
    i18nDescription: 'cardMossFiveDesc',
  },
  {
    id: 'moss-eight',
    name: 'Moss Eight',
    i18nName: 'cardMossEight',
    suit: 'moss',
    i18nSuit: 'cardSuitMoss',
    chips: 8,
    price: 12,
    rarity: 'uncommon',
    i18nRarity: 'cardRarityUncommon',
    description: '+4 chips if another Moss card is played.',
    i18nDescription: 'cardMossEightDesc',
  },
  {
    id: 'teeth-three',
    name: 'Teeth Three',
    i18nName: 'cardTeethThree',
    suit: 'teeth',
    i18nSuit: 'cardSuitTeeth',
    chips: 3,
    price: 8,
    rarity: 'common',
    i18nRarity: 'cardRarityCommon',
    description: '+0.5x if exactly 3 cards are played.',
    i18nDescription: 'cardTeethThreeDesc',
  },
  {
    id: 'teeth-seven',
    name: 'Teeth Seven',
    i18nName: 'cardTeethSeven',
    suit: 'teeth',
    i18nSuit: 'cardSuitTeeth',
    chips: 7,
    price: 14,
    rarity: 'uncommon',
    i18nRarity: 'cardRarityUncommon',
    description: '+1x if the hand has at least 15 chips before multiplier.',
    i18nDescription: 'cardTeethSevenDesc',
  },
  {
    id: 'lantern-three',
    name: 'Lantern Three',
    i18nName: 'cardLanternThree',
    suit: 'lanterns',
    i18nSuit: 'cardSuitLanterns',
    chips: 3,
    price: 8,
    rarity: 'common',
    i18nRarity: 'cardRarityCommon',
    description: '+3 chips in village matches.',
    i18nDescription: 'cardLanternThreeDesc',
  },
  {
    id: 'market-ace',
    name: 'Market Ace',
    i18nName: 'cardMarketAce',
    suit: 'lanterns',
    i18nSuit: 'cardSuitLanterns',
    chips: 11,
    price: 20,
    rarity: 'rare',
    i18nRarity: 'cardRarityRare',
    description: 'Widens the table score window by 3 on both sides.',
    i18nDescription: 'cardMarketAceDesc',
  },
  {
    id: 'moon-jack',
    name: 'Moon Jack',
    i18nName: 'cardMoonJack',
    suit: 'moons',
    i18nSuit: 'cardSuitMoons',
    chips: 4,
    price: 18,
    rarity: 'uncommon',
    i18nRarity: 'cardRarityUncommon',
    description: 'Copies the chips of the card to its left.',
    i18nDescription: 'cardMoonJackDesc',
  },
  {
    id: 'smoke-smog',
    name: 'Smoke Smog',
    i18nName: 'cardSmokeSmog',
    suit: 'smoke',
    i18nSuit: 'cardSuitSmoke',
    chips: 3,
    price: 16,
    rarity: 'uncommon',
    i18nRarity: 'cardRarityUncommon',
    description: '2x if it is the only Smoke card played; otherwise -10 chips.',
    i18nDescription: 'cardSmokeSmogDesc',
  },
  {
    id: 'careful-five',
    name: 'Careful Five',
    i18nName: 'cardCarefulFive',
    suit: 'moons',
    i18nSuit: 'cardSuitMoons',
    chips: 5,
    price: 13,
    rarity: 'common',
    i18nRarity: 'cardRarityCommon',
    description: 'If the hand overshoots, pulls 8 chips back.',
    i18nDescription: 'cardCarefulFiveDesc',
  },
  {
    id: 'accountant-one',
    name: 'Accountant One',
    i18nName: 'cardAccountantOne',
    suit: 'lanterns',
    i18nSuit: 'cardSuitLanterns',
    chips: 1,
    price: 15,
    rarity: 'uncommon',
    i18nRarity: 'cardRarityUncommon',
    description: 'Widens the table score window by 5 on both sides.',
    i18nDescription: 'cardAccountantOneDesc',
  },
  {
    id: 'too-much-sauce',
    name: 'Too Much Sauce',
    i18nName: 'cardTooMuchSauce',
    suit: 'teeth',
    i18nSuit: 'cardSuitTeeth',
    chips: 30,
    price: 24,
    rarity: 'rare',
    i18nRarity: 'cardRarityRare',
    description: 'Huge score. Dangerous near the ceiling.',
    i18nDescription: 'cardTooMuchSauceDesc',
  },
  {
    id: 'angel-audit',
    name: 'Angel Audit',
    i18nName: 'cardAngelAudit',
    suit: 'moons',
    i18nSuit: 'cardSuitMoons',
    chips: 10,
    price: 28,
    rarity: 'rare',
    i18nRarity: 'cardRarityRare',
    description: '3x if no Smoke card is played.',
    i18nDescription: 'cardAngelAuditDesc',
  },
  {
    id: 'royal-scale',
    name: 'Royal Scale',
    i18nName: 'cardRoyalScale',
    suit: 'lanterns',
    i18nSuit: 'cardSuitLanterns',
    chips: 12,
    price: 30,
    rarity: 'rare',
    i18nRarity: 'cardRarityRare',
    description: 'Doubles the highest chip card.',
    i18nDescription: 'cardRoyalScaleDesc',
  },
  {
    id: 'freak-dennis-fog',
    name: 'Freak Dennis Fog',
    i18nName: 'cardFreakDennisFog',
    suit: 'smoke',
    i18nSuit: 'cardSuitSmoke',
    chips: 1,
    price: 35,
    rarity: 'rare',
    i18nRarity: 'cardRarityRare',
    description: 'Doubles all chips, then adds 10 more.',
    i18nDescription: 'cardFreakDennisFogDesc',
  },
  {
    id: 'goblin-receipt',
    name: 'Goblin Receipt',
    i18nName: 'cardGoblinReceipt',
    suit: 'lanterns',
    i18nSuit: 'cardSuitLanterns',
    chips: 1,
    price: 25,
    rarity: 'uncommon',
    i18nRarity: 'cardRarityUncommon',
    description: '+12 chips if another Lantern is played, +1 if not.',
    i18nDescription: 'cardGoblinReceiptDesc',
  },
];

export const CARD_SHOP_OFFERS: readonly CardId[] = [
  'moss-two',
  'moss-five',
  'moss-eight',
  'teeth-three',
  'teeth-seven',
  'lantern-three',
  'market-ace',
  'moon-jack',
  'smoke-smog',
  'careful-five',
  'accountant-one',
  'too-much-sauce',
  'angel-audit',
  'royal-scale',
  'freak-dennis-fog',
];

export const HOUSE_CARD_DEFINITIONS: Record<HouseCardId, HouseCardDefinition> = {
  'tighten-the-gap': {
    id: 'tighten-the-gap',
    name: 'Tighten the Gap',
    shortText: 'Window narrows',
    description: 'Increase the target minimum by 2 and decrease the maximum by 2.',
    timing: 'score-window',
    rarity: 'common',
    weight: 12,
  },
  'short-hand': {
    id: 'short-hand',
    name: 'Short Hand',
    shortText: 'Draw 4',
    description: 'The player draws 4 cards instead of 5 this round.',
    timing: 'before-draw',
    rarity: 'uncommon',
    weight: 7,
  },
  'chip-tax': {
    id: 'chip-tax',
    name: 'Chip Tax',
    shortText: 'Each card -1',
    description: 'Each scored card contributes 1 fewer chip, to a minimum of 0 per card.',
    timing: 'before-score',
    rarity: 'common',
    weight: 10,
  },
  'dealer-skims': {
    id: 'dealer-skims',
    name: 'Dealer Skims',
    shortText: 'Lowest ignored',
    description: 'The lowest-chip selected card is ignored for scoring. It is still spent.',
    timing: 'before-score',
    rarity: 'rare',
    weight: 4,
  },
  'big-blind': {
    id: 'big-blind',
    name: 'Big Blind',
    shortText: 'Score +5',
    description: 'Add 5 chips to the final score.',
    timing: 'before-score',
    rarity: 'uncommon',
    weight: 8,
  },
  'no-cowards': {
    id: 'no-cowards',
    name: 'No Cowards',
    shortText: '1 card = -10',
    description: 'If exactly 1 card is scored, final score gets -10.',
    timing: 'before-score',
    rarity: 'uncommon',
    weight: 6,
  },
  'two-pair': {
    id: 'two-pair',
    name: 'Two Pair',
    shortText: 'Pairs score double',
    description: 'If the scored hand has at least two different printed chip pairs, multiplier +1.',
    timing: 'before-score',
    rarity: 'rare',
    weight: 4,
  },
  'burn-notice': {
    id: 'burn-notice',
    name: 'Burn Notice',
    shortText: 'Played cards destroyed',
    description: 'Selected cards are permanently removed from your collection after scoring.',
    timing: 'after-round',
    rarity: 'freak',
    weight: 2,
  },
};

const ALL_HOUSE_CARD_IDS: HouseCardId[] = [
  'tighten-the-gap',
  'short-hand',
  'chip-tax',
  'dealer-skims',
  'big-blind',
  'no-cowards',
  'two-pair',
  'burn-notice',
];

export const CARD_TABLES: readonly CardTableDefinition[] = [
  {
    id: 'porch-table',
    name: 'Porch Table',
    i18nName: 'cardTablePorch',
    description: 'A low-stakes table where the house only cheats a little.',
    minScore: 18,
    maxScore: 34,
    maxWager: 50,
    payoutMultiplier: 1.5,
    houseMode: {
      kind: 'fixed',
      cardsPerRound: 1,
      persistent: false,
    },
    houseCardPool: ALL_HOUSE_CARD_IDS,
    houseCardWeightOverrides: {
      'burn-notice': 1,
    },
    riskLabel: 'Low Risk',
    tableFlavor: 'The porch table smiles like it knows your mother.',
    entryFee: 3,
    rewardScore: 10,
  },
  {
    id: 'market-table',
    name: 'Market Table',
    i18nName: 'cardTableMarket',
    description: 'A busy table with flexible rules and flexible morals.',
    minScore: 36,
    maxScore: 62,
    maxWager: Number.MAX_SAFE_INTEGER,
    payoutMultiplier: 2,
    houseMode: {
      kind: 'variable',
      minCardsPerRound: 1,
      maxCardsPerRound: 2,
      persistent: false,
    },
    houseCardPool: ALL_HOUSE_CARD_IDS,
    houseCardWeightOverrides: {
      'burn-notice': 2,
    },
    riskLabel: 'Medium Risk',
    tableFlavor: 'Everyone at the market table insists this is normal.',
    entryFee: 9,
    rewardScore: 26,
  },
  {
    id: 'dennis-dare',
    name: 'Freak Dennis Dare',
    i18nName: 'cardTableDennisDare',
    description: 'The table where the house remembers.',
    minScore: 78,
    maxScore: 118,
    maxWager: Number.MAX_SAFE_INTEGER,
    payoutMultiplier: 3,
    houseMode: {
      kind: 'fixed',
      cardsPerRound: 1,
      persistent: true,
    },
    houseCardPool: ALL_HOUSE_CARD_IDS,
    houseCardWeightOverrides: {
      'burn-notice': 3,
    },
    riskLabel: 'High Risk',
    tableFlavor: 'Freak Dennis smiles. The house remembers.',
    entryFee: 18,
    rewardScore: 58,
  },
];

export function getCardDefinition(id: CardId): CardDefinition {
  const card = CARD_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!card) {
    throw new Error(`Unknown card id: ${id}`);
  }
  return card;
}

export function getCardTable(id: string): CardTableDefinition {
  const table = CARD_TABLES.find((candidate) => candidate.id === id);
  if (!table) {
    throw new Error(`Unknown card table id: ${id}`);
  }
  return table;
}

export const BASE_WAGER_AMOUNTS = [10, 25, 50] as const;

export interface CardWagerOption {
  label: string;
  amount: number;
}

export function getLegalCardWagers(
  playerScore: number,
  table: CardTableDefinition,
): readonly number[] {
  const score = Math.max(0, Math.floor(playerScore));
  return BASE_WAGER_AMOUNTS.filter(
    (amount) => amount <= score && (table.id !== 'porch-table' || amount <= table.maxWager),
  );
}

export function getCardWagerOptions(
  playerScore: number,
  table: CardTableDefinition,
): CardWagerOption[] {
  const score = Math.max(0, Math.floor(playerScore));
  if (score < 10) {
    return [];
  }
  if (table.id === 'porch-table') {
    return getLegalCardWagers(score, table).map((amount) => ({
      label: `Bet ${amount}`,
      amount,
    }));
  }
  return [
    { label: 'Bet 10%', amount: Math.max(1, Math.floor(score * 0.1)) },
    { label: 'Bet 25%', amount: Math.max(1, Math.floor(score * 0.25)) },
    { label: 'Bet 50%', amount: Math.max(1, Math.floor(score * 0.5)) },
    { label: `All In (${score})`, amount: score },
  ];
}

export function getCardTablePayout(wagerScore: number, table: CardTableDefinition): number {
  return Math.max(wagerScore + 1, Math.ceil(wagerScore * table.payoutMultiplier));
}

export function getHouseCardDefinition(id: HouseCardId): HouseCardDefinition {
  return HOUSE_CARD_DEFINITIONS[id];
}

export function getActiveHouseCardIds(state: CardCompetitionState): HouseCardId[] {
  return state.activeHouseCards.map((card) => card.id);
}

function normalizeScoreWindow(
  minScore: number,
  maxScore: number,
): {
  minScore: number;
  maxScore: number;
} {
  const clampedMin = Math.max(0, minScore);
  const clampedMax = Math.max(clampedMin, maxScore);
  return { minScore: clampedMin, maxScore: clampedMax };
}

export function getActiveScoreWindow(
  table: CardTableDefinition,
  houseCards: readonly HouseCardId[] = [],
): { minScore: number; maxScore: number } {
  let minScore = table.minScore;
  let maxScore = table.maxScore;
  for (const houseCard of houseCards) {
    if (houseCard === 'tighten-the-gap') {
      minScore += 2;
      maxScore -= 2;
    }
  }
  return normalizeScoreWindow(minScore, maxScore);
}

export function getHandSizeForRound(houseCards: readonly HouseCardId[] = []): number {
  return houseCards.includes('short-hand') ? 4 : 5;
}

function getHouseCardWeight(table: CardTableDefinition, id: HouseCardId): number {
  return Math.max(0, table.houseCardWeightOverrides?.[id] ?? HOUSE_CARD_DEFINITIONS[id].weight);
}

function getHouseCardsPerRound(table: CardTableDefinition, random: () => number): number {
  if (table.houseMode.kind === 'fixed') {
    return Math.max(0, table.houseMode.cardsPerRound);
  }
  const min = Math.max(0, Math.floor(table.houseMode.minCardsPerRound));
  const max = Math.max(min, Math.floor(table.houseMode.maxCardsPerRound));
  return min + Math.floor(random() * (max - min + 1));
}

export function rollHouseCardsForRound(
  table: CardTableDefinition,
  random: () => number,
  activeHouseCards: readonly ActiveHouseCard[] = [],
): HouseCardId[] {
  const targetCount = getHouseCardsPerRound(table, random);
  const rolled: HouseCardId[] = [];
  const rolledSet = new Set<HouseCardId>();
  const activeSet = new Set(activeHouseCards.map((card) => card.id));

  for (let i = 0; i < targetCount; i += 1) {
    const candidates = table.houseCardPool.filter((id) => {
      if (rolledSet.has(id)) return false;
      if (table.houseMode.persistent && activeSet.has(id)) return false;
      return getHouseCardWeight(table, id) > 0;
    });
    if (candidates.length === 0) {
      break;
    }
    const totalWeight = candidates.reduce((sum, id) => sum + getHouseCardWeight(table, id), 0);
    let roll = random() * totalWeight;
    let selected = candidates[0]!;
    for (const candidate of candidates) {
      roll -= getHouseCardWeight(table, candidate);
      if (roll <= 0) {
        selected = candidate;
        break;
      }
    }
    rolled.push(selected);
    rolledSet.add(selected);
  }

  return rolled;
}

export function startCardCompetitionRound(
  state: CardCompetitionState,
  table: CardTableDefinition,
  random: () => number,
): CardCompetitionState {
  const persistentCards = state.activeHouseCards.filter((card) => card.persistent);
  const rolled = rollHouseCardsForRound(table, random, persistentCards);
  const newlyActive = rolled.map((id) => ({
    id,
    roundPlayed: state.round,
    persistent: table.houseMode.persistent,
  }));

  return {
    ...state,
    activeHouseCards: [...persistentCards, ...newlyActive],
    houseCardsThisRound: rolled,
  };
}

export function beginCardRound(
  state: CardCompetitionState,
  table: CardTableDefinition,
  random: () => number,
): void {
  const next = startCardCompetitionRound(state, table, random);
  state.activeHouseCards = next.activeHouseCards;
  state.houseCardsThisRound = next.houseCardsThisRound;
}

export function countCards(collection: CardCollection): number {
  return Object.values(collection).reduce((sum, count) => sum + Math.max(0, Number(count ?? 0)), 0);
}

export function expandCollection(collection: CardCollection): CardId[] {
  const deck: CardId[] = [];
  for (const card of CARD_DEFINITIONS) {
    const count = Math.max(0, Math.floor(Number(collection[card.id] ?? 0)));
    for (let i = 0; i < count; i += 1) {
      deck.push(card.id);
    }
  }
  return deck;
}

export function shuffleCards(cards: CardId[], random: () => number): CardId[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createCompetitionState(
  tableId: string,
  collection: CardCollection,
  random: () => number,
  wagerScore = 0,
): CardCompetitionState {
  const table = getCardTable(tableId);
  return {
    tableId: table.id,
    wagerScore,
    round: 1,
    wins: 0,
    losses: 0,
    spentCards: [],
    deck: shuffleCards(expandCollection(collection), random),
    discard: [],
    activeHouseCards: [],
    houseCardsThisRound: [],
    destroyedCards: [],
  };
}

export function drawCompetitionHand(
  state: CardCompetitionState,
  random: () => number,
  size = 5,
): CardId[] {
  return shuffleCards(state.deck, random).slice(0, size);
}

export function finishCompetitionRound(state: CardCompetitionState, playedCards: CardId[]): void {
  for (const played of playedCards) {
    const index = state.deck.indexOf(played);
    if (index >= 0) {
      state.deck.splice(index, 1);
      state.spentCards.push(played);
    }
  }
  state.round += 1;
}

export function getDestroyedCardsForRound(
  playedCards: readonly CardId[],
  houseCards: readonly HouseCardId[] = [],
): CardId[] {
  return houseCards.includes('burn-notice') ? [...playedCards] : [];
}

export function removeDestroyedCardsFromCollection(
  collection: CardCollection,
  destroyedCards: readonly CardId[],
): CardCollection {
  if (destroyedCards.length === 0) {
    return { ...collection };
  }
  const next: CardCollection = { ...collection };
  for (const cardId of destroyedCards) {
    next[cardId] = Math.max(0, Math.floor(Number(next[cardId] ?? 0)) - 1);
  }
  return next;
}

export function scoreCardHand(
  cardIds: CardId[],
  table: CardTableDefinition,
  options: ScoreCardHandOptions = {},
): CardScoreResult {
  const houseCards = options.houseCards ?? [];
  const selectedCards = cardIds.map(getCardDefinition);
  const ignoredIndexes = new Set<number>();
  const ignoredCards: CardId[] = [];
  const appliedHouseEffects: string[] = [];

  if (houseCards.includes('dealer-skims') && selectedCards.length > 0) {
    let ignoredIndex = 0;
    for (let i = 1; i < selectedCards.length; i += 1) {
      if (selectedCards[i]!.chips < selectedCards[ignoredIndex]!.chips) {
        ignoredIndex = i;
      }
    }
    ignoredIndexes.add(ignoredIndex);
    ignoredCards.push(selectedCards[ignoredIndex]!.id);
    appliedHouseEffects.push(`Dealer Skims ignored ${selectedCards[ignoredIndex]!.name}.`);
  }

  const cards = selectedCards.filter((_, index) => !ignoredIndexes.has(index));
  let chips = 0;
  let multiplier = 1;
  let { minScore, maxScore } = getActiveScoreWindow(table, houseCards);
  const details: string[] = [];
  const chipTaxActive = houseCards.includes('chip-tax');

  if (houseCards.includes('tighten-the-gap')) {
    appliedHouseEffects.push('Tighten the Gap narrowed the target.');
  }

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    // Chip Tax changes scoring contribution only; printed chip values still drive card effects.
    chips += chipTaxActive ? Math.max(0, card.chips - 1) : card.chips;
    if (card.id === 'moon-jack' && i > 0) {
      chips += cards[i - 1].chips;
      details.push('Moon Jack copied left chips.');
    }
  }

  const mossCount = cards.filter((card) => card.suit === 'moss').length;
  const smokeCount = cards.filter((card) => card.suit === 'smoke').length;

  for (const card of cards) {
    if (card.id === 'moss-eight' && mossCount > 1) {
      chips += 4;
      details.push('Moss Eight found more moss.');
    } else if (card.id === 'teeth-three' && cards.length === 3) {
      multiplier += 0.5;
      details.push('Teeth Three liked the trio.');
    } else if (card.id === 'teeth-seven' && chips >= 15) {
      multiplier += 1;
      details.push('Teeth Seven doubled down.');
    } else if (card.id === 'lantern-three') {
      chips += 3;
      details.push('Lantern Three glowed in town.');
    } else if (card.id === 'market-ace') {
      minScore -= 3;
      maxScore += 3;
      details.push('Market Ace widened the window.');
    } else if (card.id === 'smoke-smog') {
      if (smokeCount === 1) {
        multiplier *= 2;
        details.push('Smoke Smog doubled alone.');
      } else {
        chips -= 10;
        details.push('Too much smoke cost chips.');
      }
    } else if (card.id === 'accountant-one') {
      minScore -= 5;
      maxScore += 5;
      details.push('Accountant One adjusted the books.');
    } else if (card.id === 'angel-audit' && smokeCount === 0) {
      multiplier *= 3;
      details.push('Angel Audit approved a clean hand.');
    } else if (
      card.id === 'royal-scale' &&
      card.chips >= Math.max(...cards.map((candidate) => candidate.chips))
    ) {
      chips += 10;
      details.push('Royal Scale ruled the hand.');
    } else if (card.id === 'freak-dennis-fog') {
      minScore += 4;
      maxScore -= 4;
      multiplier *= 2;
      details.push('Freak Dennis Fog made everything worse and bigger.');
    } else if (card.id === 'goblin-receipt') {
      const hasLantern = cards.some((candidate) => candidate.suit === 'lanterns');
      if (hasLantern) {
        chips += 12;
        details.push('Goblin Receipt found a lantern-stamp and added 12 chips.');
      } else {
        chips += 1;
        details.push('Goblin Receipt added 1 chip after failing to look official.');
      }
    }
  }

  if (
    cards.some((card) => card.id === 'careful-five') &&
    Math.round(chips * multiplier) > maxScore
  ) {
    chips -= 8;
    details.push('Careful Five pulled the score back.');
  }

  if (chipTaxActive) {
    appliedHouseEffects.push('Chip Tax shaved 1 chip from each scored card.');
  }

  if (houseCards.includes('two-pair')) {
    const pairs = new Map<number, number>();
    for (const card of cards) {
      pairs.set(card.chips, (pairs.get(card.chips) ?? 0) + 1);
    }
    const pairCount = [...pairs.values()].filter((count) => count >= 2).length;
    if (pairCount >= 2) {
      multiplier += 1;
      appliedHouseEffects.push('Two Pair added +1 multiplier.');
    }
  }

  minScore = Math.max(0, minScore);
  maxScore = Math.max(minScore, maxScore);
  chips = Math.max(0, chips);
  let finalScore = Math.max(0, Math.round(chips * multiplier));
  if (houseCards.includes('big-blind')) {
    finalScore += 5;
    appliedHouseEffects.push('Big Blind added 5 to the final score.');
  }
  if (houseCards.includes('no-cowards') && cards.length === 1) {
    finalScore = Math.max(0, finalScore - 10);
    appliedHouseEffects.push('No Cowards punished a one-card score.');
  }

  const destroyedCards = getDestroyedCardsForRound(cardIds, houseCards);
  if (destroyedCards.length > 0) {
    appliedHouseEffects.push('Burn Notice will destroy played cards after scoring.');
  }

  return {
    chips,
    multiplier,
    finalScore,
    minScore,
    maxScore,
    details: [...details, ...appliedHouseEffects],
    houseCards: [...houseCards],
    scoredCards: cards.map((card) => card.id),
    ignoredCards,
    destroyedCards,
    appliedHouseEffects,
  };
}
