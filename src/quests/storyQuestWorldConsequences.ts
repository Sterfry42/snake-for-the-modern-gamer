import type { StoryQuestConsequence } from './storyQuestConsequences.js';

/**
 * Narrative outcomes are not client rewards. SnakeGame applies this catalog
 * through its existing score, karma, faction, ward and Actor relationship APIs.
 */
export const WORLD_STORY_CONSEQUENCES: Readonly<Record<string, StoryQuestConsequence>> = {
  'the-borrowed-bones:commission': {
    message: "{actor} points to a map where the excavation's original owners have been erased.",
    actorResponse: { trust: 6, respect: 4 },
  },
  'the-borrowed-bones:decline': {
    message: 'The mapper folds the survey. Nobody asks you to dig again.',
  },
  'the-borrowed-bones:file-findings': {
    message: '{actor} reads your real field notes and admits the site is older than the town.',
    actorResponse: { trust: 12, respect: 9 },
  },
  'the-borrowed-bones:forge-findings': {
    message: 'The scribe invents a convincing survey for 35 score.',
    score: -35,
    karma: -9,
    actorResponse: { respect: 6, resentment: 2 },
  },
  'the-borrowed-bones:steal-survey': {
    message: "A thief delivers someone else's field notes for 45 score.",
    score: -45,
    karma: -7,
    actorResponse: { respect: 7 },
  },
  'the-borrowed-bones:publish': {
    message: "The findings are published with the owners' names. You receive 170 score.",
    score: 170,
    karma: 16,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 9 },
      { id: 'goblin-camps', amount: 5 },
    ],
    actorResponse: { trust: 16, respect: 14 },
  },
  'the-borrowed-bones:repatriate': {
    message: 'The record goes to its goblin keepers, not the kingdom. They pay 85 score.',
    score: 85,
    karma: 21,
    factionChanges: [
      { id: 'goblin-camps', amount: 24 },
      { id: 'hearthbound-remnant', amount: -3 },
    ],
    actorResponse: { trust: 20, respect: 11 },
  },
  'the-borrowed-bones:launder': {
    message: 'The false survey enters the public archive. A museum is built on a lie.',
    score: 185,
    karma: -24,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: -15 },
      { id: 'goblin-camps', amount: -9 },
    ],
    actorResponse: { respect: 8, resentment: 5 },
  },
  'the-borrowed-bones:sell': {
    message: 'A collector buys the disputed discovery for 320 score and promises absolute secrecy.',
    score: 320,
    karma: -22,
    factionChanges: [
      { id: 'goblin-camps', amount: -18 },
      { id: 'hearthbound-remnant', amount: -7 },
    ],
    actorResponse: { respect: 16 },
  },
  'the-borrowed-bones:bury': {
    message: 'The mapper seals the survey and agrees to protect the gravesite.',
    score: 45,
    karma: 5,
    factionChanges: [{ id: 'goblin-camps', amount: 3 }],
    actorResponse: { trust: 12, respect: 4 },
  },
  'the-museum-that-shouldnt-be:public-museum': {
    message: 'The archives open to everybody. Names belong beside artifacts, not below them.',
    score: 145,
    karma: 18,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 14 },
      { id: 'goblin-camps', amount: 7 },
    ],
    actorResponse: { respect: 14 },
  },
  'the-museum-that-shouldnt-be:gallery-scam': {
    message: 'A private admission booth appears around a supposedly public discovery.',
    score: 300,
    karma: -20,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -12 }],
    actorResponse: { respect: 10, resentment: 5 },
  },
  'the-museum-that-shouldnt-be:goblin-archive': {
    message: 'The goblins found their own archive and give you a Wall Ward contract.',
    wallWards: 1,
    karma: 15,
    factionChanges: [{ id: 'goblin-camps', amount: 18 }],
    actorResponse: { trust: 18, respect: 13 },
  },
  'the-museum-that-shouldnt-be:claim-remnant': {
    message: 'The wizard takes the goblin record into a vault only they can open.',
    score: 210,
    karma: -19,
    factionChanges: [{ id: 'goblin-camps', amount: -22 }],
    actorResponse: { respect: 8, resentment: 6 },
  },
  'the-museum-that-shouldnt-be:buy-back': {
    message: "You pay 75 score to restore the artifact's provenance to the public record.",
    score: -75,
    karma: 19,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 12 },
      { id: 'goblin-camps', amount: 7 },
    ],
    actorResponse: { respect: 10 },
  },
  'the-museum-that-shouldnt-be:keep-secret': {
    message: 'A locked vault and 175 score stand between the public and the truth.',
    score: 175,
    karma: -18,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -8 }],
    actorResponse: { respect: 11 },
  },
  'the-museum-that-shouldnt-be:admit-forgery': {
    message: 'The guard records the falsified excavation and orders the museum claim withdrawn.',
    karma: 17,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 10 },
      { id: 'goblin-camps', amount: 6 },
    ],
    actorResponse: { trust: 8, respect: 12 },
  },
  'the-museum-that-shouldnt-be:fake-gallery': {
    message: 'A counterfeit museum opens behind a velvet rope. The dealer pays 345 score.',
    score: 345,
    karma: -30,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: -20 },
      { id: 'goblin-camps', amount: -16 },
    ],
    actorResponse: { respect: 12, resentment: 9 },
  },
  'the-museum-that-shouldnt-be:admit-burial': {
    message: 'The watch records your reason for concealing the gravesite.',
    karma: 10,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 6 }],
    actorResponse: { trust: 8, respect: 8 },
  },
  'the-museum-that-shouldnt-be:leave-buried': {
    message: 'The mapper marks the land protected, not abandoned.',
    karma: 9,
    factionChanges: [{ id: 'goblin-camps', amount: 6 }],
    actorResponse: { trust: 9 },
  },
  'the-velvet-ledger:offer': {
    message: '{actor} opens a velvet-bound debt book. Every entry ends in a threat.',
    actorResponse: { trust: 7, respect: 4 },
  },
  'the-velvet-ledger:decline': {
    message: "You decline the guild's offer. The debt book stays with the thieves.",
  },
  'the-velvet-ledger:debtor': {
    message: '{actor} shows you a paid receipt. The guild still wants payment.',
    actorResponse: { trust: 10 },
  },
  'the-velvet-ledger:copy': {
    message: 'The scribe finds a second layer of interest added after the debts were settled.',
    actorResponse: { respect: 8 },
  },
  'the-velvet-ledger:enforce': {
    message: 'The guild pays 260 score to make you its newest collection agent.',
    score: 260,
    karma: -23,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -16 }],
    actorResponse: { trust: 14, respect: 11 },
  },
  'the-velvet-ledger:report': {
    message: 'The watch takes the fraudulent book as evidence and pays 115 score.',
    score: 115,
    karma: 19,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 13 }],
    actorResponse: { respect: 11 },
  },
  'the-velvet-ledger:erase': {
    message: 'The scribe voids the fabricated debts before more families lose their shops.',
    score: 65,
    karma: 16,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 9 }],
    actorResponse: { trust: 9, respect: 9 },
  },
  'the-velvet-ledger:auction': {
    message: 'The private names sell for 345 score. Debt becomes a new kind of blackmail.',
    score: 345,
    karma: -29,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -18 }],
    actorResponse: { respect: 12, resentment: 4 },
  },
  'clean-hands-dirty-money:take-protection': {
    message: 'The merchant pays 190 score, but the racket is still alive.',
    score: 190,
    karma: -19,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -13 }],
    actorResponse: { trust: -14, resentment: 19 },
  },
  'clean-hands-dirty-money:turn-in': {
    message: 'You help the watch dismantle the protection scheme you once enforced.',
    karma: 20,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 12 }],
    actorResponse: { respect: 10 },
  },
  'clean-hands-dirty-money:shelter': {
    message: 'The threatened shops organize watch patrols without the guild.',
    karma: 17,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 15 }],
    actorResponse: { trust: 17 },
  },
  'clean-hands-dirty-money:retaliate': {
    message: "You sell the informant's name back to the guild for 235 score.",
    score: 235,
    karma: -28,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -22 }],
    actorResponse: { respect: 14 },
  },
  'clean-hands-dirty-money:audit': {
    message: 'An official confirms that the fabricated debts are legally void.',
    karma: 14,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 13 }],
    actorResponse: { respect: 11 },
  },
  'clean-hands-dirty-money:restore-racket': {
    message: 'The guild restores the books and pays 200 score to keep the ink wet.',
    score: 200,
    karma: -20,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -14 }],
    actorResponse: { trust: 10, respect: 9 },
  },
  'clean-hands-dirty-money:publish-list': {
    message: 'The civic office publishes the names of the buyers and clears the victims.',
    karma: 18,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 14 }],
    actorResponse: { respect: 13 },
  },
  'clean-hands-dirty-money:collect-premium': {
    message: 'The guild pays 230 score for a second round of silence.',
    score: 230,
    karma: -25,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -17 }],
    actorResponse: { respect: 11 },
  },
  'the-soup-offensive:taste': {
    message: 'The bartender describes a soup so controversial it needs a witness.',
    actorResponse: { trust: 7 },
  },
  'the-soup-offensive:decline': {
    message: 'You decline to referee the kitchen. The feud keeps simmering.',
  },
  'the-soup-offensive:butcher': {
    message: '{actor} insists the potion maker ruined a perfectly good stock.',
    actorResponse: { trust: 7, respect: 4 },
  },
  'the-soup-offensive:alchemist': {
    message: '{actor} claims the butcher cooked the herbs wrong.',
    actorResponse: { trust: 5, respect: 5 },
  },
  'the-soup-offensive:reconcile': {
    message: 'Both recipes return to the menu. You receive 135 score and a free meal in spirit.',
    score: 135,
    karma: 17,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 8 }],
    actorResponse: { trust: 17, respect: 11 },
  },
  'the-soup-offensive:sell-recipe': {
    message: 'The secret sauce sells to the thieves for 250 score.',
    score: 250,
    karma: -13,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -6 }],
    actorResponse: { respect: 11 },
  },
  'the-soup-offensive:taint': {
    message: 'The potion maker pays 290 score to sabotage the next bowl.',
    score: 290,
    karma: -33,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -18 }],
    actorResponse: { respect: 8, resentment: 10 },
  },
  'the-soup-offensive:blame-butcher': {
    message: 'The watch closes the soup case by blaming the butcher.',
    score: 120,
    karma: -13,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -8 }],
    actorResponse: { respect: 6 },
  },
  'second-helpings:soup-kitchen': {
    message: 'The inn serves soup for free. It does more good than the original argument.',
    score: 110,
    karma: 21,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 13 }],
    actorResponse: { trust: 15, respect: 8 },
  },
  'second-helpings:catering-rights': {
    message: 'The town grants an exclusive catering license for 230 score.',
    score: 230,
    karma: -6,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -3 }],
    actorResponse: { respect: 10 },
  },
  'second-helpings:buy-recipe': {
    message: 'You pay 60 score to return the secret recipe to the kitchen.',
    score: -60,
    karma: 15,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 8 }],
    actorResponse: { trust: 10 },
  },
  'second-helpings:franchise': {
    message: 'The guild turns the broth into a franchise and pays 300 score.',
    score: 300,
    karma: -17,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -10 }],
    actorResponse: { respect: 11 },
  },
  'second-helpings:antidote': {
    message: 'The alchemist brews an antidote. Everyone gets another chance at dinner.',
    score: 90,
    karma: 22,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 11 }],
    actorResponse: { trust: 12 },
  },
  'second-helpings:deny-poison': {
    message: 'You bury the poison evidence for 280 score. The kitchen stays dangerous.',
    score: 280,
    karma: -28,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -20 }],
    actorResponse: { respect: 11 },
  },
  'second-helpings:exonerate': {
    message: 'The guard clears the butcher, who goes home with his reputation intact.',
    score: 85,
    karma: 18,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 12 }],
    actorResponse: { respect: 10 },
  },
  'second-helpings:double-down': {
    message: 'The potion maker takes an exclusive cooking license and pays 240 score.',
    score: 240,
    karma: -15,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -11 }],
    actorResponse: { respect: 12 },
  },
  'the-peoples-potluck:assemble': {
    message: 'The civic official schedules a feast and promises to hear every faction.',
    actorResponse: { trust: 7, respect: 7 },
  },
  'the-peoples-potluck:decline': {
    message: 'The feast is canceled. The town keeps its private arguments.',
  },
  'the-peoples-potluck:history-voice': {
    message: 'The archivist agrees to explain who owns the disputed excavation.',
    actorResponse: { trust: 6, respect: 7 },
  },
  'the-peoples-potluck:merchants-voice': {
    message: 'A merchant will testify about the stolen debts and the poisoned soup.',
    actorResponse: { trust: 7, respect: 5 },
  },
  'the-peoples-potluck:guild-voice': {
    message: 'The thieves agree to attend. Nobody believes they will bring their whole ledger.',
    actorResponse: { respect: 8 },
  },
  'the-peoples-potluck:commons': {
    message: 'The town adopts public archives, protected merchants and an open community kitchen.',
    score: 650,
    karma: 40,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 30 },
      { id: 'goblin-camps', amount: 20 },
    ],
    actorResponse: { trust: 18, respect: 20 },
  },
  'the-peoples-potluck:private-club': {
    message: 'A private club buys the town feast, guild debts and museum displays for 950 score.',
    score: 950,
    karma: -49,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: -32 },
      { id: 'goblin-camps', amount: -23 },
    ],
    actorResponse: { respect: 8, resentment: 15 },
  },
  'the-peoples-potluck:grand-exposure': {
    message:
      'Every buried ledger is read aloud. The guild, museum and kitchen scandal become one public case.',
    score: 390,
    karma: 29,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 18 },
      { id: 'goblin-camps', amount: 12 },
    ],
    actorResponse: { respect: 24 },
  },
  'the-peoples-potluck:goblin-table': {
    message:
      'The merchants and goblins form a shared cooperative over the road, records and kitchens.',
    score: 525,
    karma: 37,
    wallWards: 1,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 20 },
      { id: 'goblin-camps', amount: 30 },
    ],
    actorResponse: { trust: 20, respect: 23 },
  },
};
