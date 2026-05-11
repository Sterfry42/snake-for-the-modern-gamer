export type CardSuit = 'moss' | 'teeth' | 'lanterns' | 'moons' | 'smoke';

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

export interface CardDefinition {
  id: CardId;
  name: string;
  suit: CardSuit;
  chips: number;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare';
  description: string;
}

export interface CardTableDefinition {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  entryFee: number;
  rewardScore: number;
}

export type CardCollection = Partial<Record<CardId, number>>;

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
    suit: 'moss',
    chips: 2,
    price: 4,
    rarity: 'common',
    description: 'A humble green starter.',
  },
  {
    id: 'moss-five',
    name: 'Moss Five',
    suit: 'moss',
    chips: 5,
    price: 7,
    rarity: 'common',
    description: 'Reliable chips, no drama.',
  },
  {
    id: 'moss-eight',
    name: 'Moss Eight',
    suit: 'moss',
    chips: 8,
    price: 12,
    rarity: 'uncommon',
    description: '+4 chips if another Moss card is played.',
  },
  {
    id: 'teeth-three',
    name: 'Teeth Three',
    suit: 'teeth',
    chips: 3,
    price: 8,
    rarity: 'common',
    description: '+0.5x if exactly 3 cards are played.',
  },
  {
    id: 'teeth-seven',
    name: 'Teeth Seven',
    suit: 'teeth',
    chips: 7,
    price: 14,
    rarity: 'uncommon',
    description: '+1x if the hand has at least 15 chips before multiplier.',
  },
  {
    id: 'lantern-three',
    name: 'Lantern Three',
    suit: 'lanterns',
    chips: 3,
    price: 8,
    rarity: 'common',
    description: '+3 chips in village matches.',
  },
  {
    id: 'market-ace',
    name: 'Market Ace',
    suit: 'lanterns',
    chips: 11,
    price: 20,
    rarity: 'rare',
    description: 'Widens the table score window by 3 on both sides.',
  },
  {
    id: 'moon-jack',
    name: 'Moon Jack',
    suit: 'moons',
    chips: 4,
    price: 18,
    rarity: 'uncommon',
    description: 'Copies the chips of the card to its left.',
  },
  {
    id: 'smoke-smog',
    name: 'Smoke Smog',
    suit: 'smoke',
    chips: 3,
    price: 16,
    rarity: 'uncommon',
    description: '2x if it is the only Smoke card played; otherwise -10 chips.',
  },
  {
    id: 'careful-five',
    name: 'Careful Five',
    suit: 'moons',
    chips: 5,
    price: 13,
    rarity: 'common',
    description: 'If the hand overshoots, pulls 8 chips back.',
  },
  {
    id: 'accountant-one',
    name: 'Accountant One',
    suit: 'lanterns',
    chips: 1,
    price: 15,
    rarity: 'uncommon',
    description: 'Widens the table score window by 5 on both sides.',
  },
  {
    id: 'too-much-sauce',
    name: 'Too Much Sauce',
    suit: 'teeth',
    chips: 30,
    price: 24,
    rarity: 'rare',
    description: 'Huge score. Dangerous near the ceiling.',
  },
  {
    id: 'angel-audit',
    name: 'Angel Audit',
    suit: 'moons',
    chips: 10,
    price: 28,
    rarity: 'rare',
    description: '3x if no Smoke card is played.',
  },
  {
    id: 'royal-scale',
    name: 'Royal Scale',
    suit: 'moss',
    chips: 20,
    price: 30,
    rarity: 'rare',
    description: '+10 chips if it is the biggest card in the hand.',
  },
  {
    id: 'freak-dennis-fog',
    name: 'Freak Dennis Fog',
    suit: 'smoke',
    chips: 13,
    price: 26,
    rarity: 'rare',
    description: 'Narrows the window by 4, then adds 2x. Absolute menace behavior.',
  },
  {
    id: 'goblin-receipt',
    name: 'Goblin Receipt',
    suit: 'teeth',
    chips: 6,
    price: 22,
    rarity: 'rare',
    description: '+12 chips if the hand has a Lantern card. Otherwise it complains and adds 1.',
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
    minScore: 18,
    maxScore: 34,
    entryFee: 3,
    rewardScore: 10,
  },
  {
    id: 'market-table',
    name: 'Market Table',
    minScore: 36,
    maxScore: 62,
    entryFee: 9,
    rewardScore: 26,
  },
  {
    id: 'dennis-dare',
    name: 'Freak Dennis Dare',
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
