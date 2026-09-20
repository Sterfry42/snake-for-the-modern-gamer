import { describe, expect, it } from 'vitest';

import {
  CARD_TABLES,
  beginCardRound,
  createCompetitionState,
  getActiveHouseCardIds,
  getActiveScoreWindow,
  getCardTable,
  getCardTablePayout,
  getCardWagerOptions,
  getDestroyedCardsForRound,
  getHandSizeForRound,
  getLegalCardWagers,
  removeDestroyedCardsFromCollection,
  rollHouseCardsForRound,
  scoreCardHand,
  type ActiveHouseCard,
  type CardCollection,
} from './cardGame.js';

function randomSequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

describe('card table redesign rules', () => {
  it('preserves existing scoring when no house cards are active', () => {
    const table = getCardTable('porch-table');

    expect(scoreCardHand(['moss-two', 'moss-five'], table)).toMatchObject({
      chips: 7,
      multiplier: 1,
      finalScore: 7,
      minScore: 18,
      maxScore: 34,
    });
    expect(scoreCardHand(['teeth-three', 'moss-five', 'moss-eight'], table)).toMatchObject({
      chips: 20,
      multiplier: 1.5,
      finalScore: 30,
    });
  });

  it('rolls house cards from each table pool with the expected counts', () => {
    const porch = getCardTable('porch-table');
    const market = getCardTable('market-table');
    const dennis = getCardTable('dennis-dare');

    const porchRoll = rollHouseCardsForRound(porch, randomSequence([0, 0.2]));
    const marketRoll = rollHouseCardsForRound(market, randomSequence([0.99, 0.1, 0.9]));
    const dennisRoll = rollHouseCardsForRound(dennis, randomSequence([0, 0.2]));

    expect(porchRoll).toHaveLength(1);
    expect(marketRoll).toHaveLength(2);
    expect(new Set(marketRoll).size).toBe(marketRoll.length);
    expect(dennisRoll).toHaveLength(1);
    expect(porchRoll.every((id) => porch.houseCardPool.includes(id))).toBe(true);
    expect(marketRoll.every((id) => market.houseCardPool.includes(id))).toBe(true);
    expect(dennisRoll.every((id) => dennis.houseCardPool.includes(id))).toBe(true);
  });

  it('keeps Burn Notice in every table pool', () => {
    expect(CARD_TABLES.every((table) => table.houseCardPool.includes('burn-notice'))).toBe(true);
  });

  it('prevents persistent duplicate house cards from rolling', () => {
    const table = getCardTable('dennis-dare');
    const active: ActiveHouseCard[] = [{ id: 'tighten-the-gap', roundPlayed: 1, persistent: true }];

    const roll = rollHouseCardsForRound(table, randomSequence([0]), active);

    expect(roll).not.toContain('tighten-the-gap');
  });

  it('applies the score-window house card', () => {
    const table = getCardTable('porch-table');

    expect(getActiveScoreWindow(table, ['tighten-the-gap'])).toEqual({
      minScore: 20,
      maxScore: 32,
    });
  });

  it('applies before-draw and before-score house cards', () => {
    const table = getCardTable('porch-table');

    expect(getHandSizeForRound(['short-hand'])).toBe(4);
    expect(
      scoreCardHand(['moss-two', 'moss-five'], table, { houseCards: ['chip-tax'] }),
    ).toMatchObject({
      chips: 5,
      finalScore: 5,
    });
    expect(scoreCardHand(['moss-two'], table, { houseCards: ['big-blind'] })).toMatchObject({
      finalScore: 7,
    });
  });

  it('lets Dealer Skims ignore the lowest selected card while still reporting it', () => {
    const table = getCardTable('porch-table');
    const result = scoreCardHand(['moss-five', 'moss-two'], table, {
      houseCards: ['dealer-skims'],
    });

    expect(result.scoredCards).toEqual(['moss-five']);
    expect(result.ignoredCards).toEqual(['moss-two']);
    expect(result.finalScore).toBe(5);
  });

  it('combines Dealer Skims with No Cowards and Burn Notice', () => {
    const table = getCardTable('porch-table');
    const result = scoreCardHand(['moss-two', 'moss-five'], table, {
      houseCards: ['dealer-skims', 'no-cowards', 'burn-notice'],
    });

    expect(result.scoredCards).toEqual(['moss-five']);
    expect(result.finalScore).toBe(0);
    expect(result.destroyedCards).toEqual(['moss-two', 'moss-five']);
  });

  it('adds Two Pair multiplier for two different printed chip pairs', () => {
    const table = getCardTable('porch-table');
    const result = scoreCardHand(
      ['moss-five', 'careful-five', 'teeth-three', 'lantern-three'],
      table,
      {
        houseCards: ['two-pair'],
      },
    );

    expect(result.multiplier).toBe(2);
    expect(result.finalScore).toBe(38);
  });

  it('accumulates persistent house cards and clears non-persistent cards between rounds', () => {
    const collection: CardCollection = { 'moss-two': 3, 'moss-five': 3 };
    const dennisState = createCompetitionState('dennis-dare', collection, randomSequence([0]));
    const dennis = getCardTable('dennis-dare');
    beginCardRound(dennisState, dennis, randomSequence([0, 0]));
    dennisState.round += 1;
    beginCardRound(dennisState, dennis, randomSequence([0, 0]));

    expect(getActiveHouseCardIds(dennisState)).toHaveLength(2);
    expect(new Set(getActiveHouseCardIds(dennisState)).size).toBe(2);

    const porchState = createCompetitionState('porch-table', collection, randomSequence([0]));
    const porch = getCardTable('porch-table');
    beginCardRound(porchState, porch, randomSequence([0, 0]));
    const firstRound = getActiveHouseCardIds(porchState);
    porchState.round += 1;
    beginCardRound(porchState, porch, randomSequence([0, 0]));

    expect(firstRound).toHaveLength(1);
    expect(getActiveHouseCardIds(porchState)).toHaveLength(1);
  });

  it('caps wagers by player score and table max and calculates payout', () => {
    expect(getLegalCardWagers(100, getCardTable('porch-table'))).toEqual([10, 25, 50]);
    expect(getLegalCardWagers(100, getCardTable('market-table'))).toEqual([10, 25, 50]);
    expect(getLegalCardWagers(100, getCardTable('dennis-dare'))).toEqual([10, 25, 50]);
    expect(getLegalCardWagers(9, getCardTable('market-table'))).toEqual([]);
    expect(getCardTablePayout(10, getCardTable('porch-table'))).toBe(15);
    expect(getCardTablePayout(5, getCardTable('market-table'))).toBe(10);
    expect(getCardTablePayout(5, getCardTable('dennis-dare'))).toBe(15);
  });

  it('uses fixed Porch wagers and percentage wagers at Market and Dennis tables', () => {
    expect(getCardWagerOptions(100, getCardTable('porch-table'))).toEqual([
      { label: 'Bet 10', amount: 10 },
      { label: 'Bet 25', amount: 25 },
      { label: 'Bet 50', amount: 50 },
    ]);
    expect(getCardWagerOptions(100, getCardTable('market-table'))).toEqual([
      { label: 'Bet 10%', amount: 10 },
      { label: 'Bet 25%', amount: 25 },
      { label: 'Bet 50%', amount: 50 },
      { label: 'All In (100)', amount: 100 },
    ]);
    expect(getCardWagerOptions(80, getCardTable('dennis-dare'))).toEqual([
      { label: 'Bet 10%', amount: 8 },
      { label: 'Bet 25%', amount: 20 },
      { label: 'Bet 50%', amount: 40 },
      { label: 'All In (80)', amount: 80 },
    ]);
  });

  it('removes only played Burn Notice copies and clamps at zero', () => {
    expect(getDestroyedCardsForRound(['moss-two'], [])).toEqual([]);
    expect(getDestroyedCardsForRound(['moss-two'], ['burn-notice'])).toEqual(['moss-two']);
    expect(
      removeDestroyedCardsFromCollection({ 'moss-two': 1, 'moss-five': 3 }, [
        'moss-two',
        'moss-two',
        'moss-five',
      ]),
    ).toEqual({ 'moss-two': 0, 'moss-five': 2 });
  });
});
