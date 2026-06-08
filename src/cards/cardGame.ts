export type CardSuit = 'moss' | 'teeth' | 'lanterns' | 'moons' | 'smoke' | 'jade';

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
  id: string;
  name: string;
  i18nName: string;
  minScore: number;
  maxScore: number;
  entryFee: number;
  rewardScore: number;
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
  tableId: string;
  wagerScore: number;
  round: number;
  wins: number;
  losses: number;
  spentCards: CardId[];
  deck: CardId[];
  discard: CardId[];
}

export interface CardScoreResult {
  chips: number;
  multiplier: number;
  finalScore: number;
  minScore: number;
  maxScore: number;
  details: string[];
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

export const CARD_TABLES: readonly CardTableDefinition[] = [
  {
    id: 'porch-table',
    name: 'Porch Table',
    i18nName: 'cardTablePorch',
    minScore: 18,
    maxScore: 34,
    entryFee: 3,
    rewardScore: 10,
  },
  {
    id: 'market-table',
    name: 'Market Table',
    i18nName: 'cardTableMarket',
    minScore: 36,
    maxScore: 62,
    entryFee: 9,
    rewardScore: 26,
  },
  {
    id: 'dennis-dare',
    name: 'Freak Dennis Dare',
    i18nName: 'cardTableDennisDare',
    minScore: 78,
    maxScore: 118,
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
  return {
    tableId,
    wagerScore,
    round: 1,
    wins: 0,
    losses: 0,
    spentCards: [],
    deck: shuffleCards(expandCollection(collection), random),
    discard: [],
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

export function scoreCardHand(cardIds: CardId[], table: CardTableDefinition): CardScoreResult {
  const cards = cardIds.map(getCardDefinition);
  let chips = 0;
  let multiplier = 1;
  let minScore = table.minScore;
  let maxScore = table.maxScore;
  const details: string[] = [];

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    chips += card.chips;
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

  minScore = Math.max(0, minScore);
  maxScore = Math.max(minScore, maxScore);
  chips = Math.max(0, chips);
  return {
    chips,
    multiplier,
    finalScore: Math.max(0, Math.round(chips * multiplier)),
    minScore,
    maxScore,
    details,
  };
}
