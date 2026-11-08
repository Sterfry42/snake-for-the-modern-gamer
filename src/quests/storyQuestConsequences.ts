import type { StoryActorResponse } from './storyQuestCharacter.js';
import type { FactionId } from '../factions/factions.js';

/**
 * Authored story consequences, kept separate from the transition engine.
 * The world authority applies these through its existing gameplay services.
 */
export interface StoryQuestConsequence {
  message: string;
  score?: number;
  karma?: number;
  bindActor?: boolean;
  releaseCaptives?: boolean;
  wizardReported?: boolean;
  wallWards?: number;
  actorResponse?: StoryActorResponse;
  factionChanges?: readonly { id: FactionId; amount: number }[];
}

const EFFECTS: Record<string, StoryQuestConsequence> = {
  // The ledger's author is less interesting than who will live with its consequences.
  'ink-and-ashes:investigate': {
    message: 'The guard asks you to find the missing ration ledger without accusing the poor.',
    actorResponse: { trust: 7, respect: 4 },
  },
  'ink-and-ashes:audit': {
    message: '{actor} shows you the missing entries: the town counted crates, not meals.',
    actorResponse: { trust: 3 },
  },
  'ink-and-ashes:informant': {
    message: '{actor} points you toward the altered pages and asks not to be named.',
    actorResponse: { respect: 4 },
  },
  'ink-and-ashes:goblin-witness': {
    message: '{actor} describes deliveries the humans never recorded.',
    actorResponse: { trust: 8, respect: 5 },
  },
  'ink-and-ashes:expose': {
    message: 'The guard files the real ledger. The ration scandal is out in the open.',
    score: 120,
    karma: 16,
    factionChanges: [
      { id: 'hearthbound-remnant', amount: 12 },
      { id: 'goblin-camps', amount: 7 },
    ],
    actorResponse: { trust: 14, respect: 12 },
  },
  'ink-and-ashes:bury': {
    message: 'The merchant seals the ledger away. The missing rations stay missing.',
    score: 95,
    karma: -12,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -7 }],
    actorResponse: { trust: 7, resentment: -3 },
  },
  'ink-and-ashes:sell': {
    message: 'The altered ledger sells for 180 score. Blackmail has a long shelf life.',
    score: 180,
    karma: -17,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -12 }],
    actorResponse: { respect: 13 },
  },
  'ink-and-ashes:bribe': {
    message: 'The guard pays 145 score to misplace the evidence. Everybody has a price.',
    score: 145,
    karma: -20,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -18 }],
    actorResponse: { trust: 10, resentment: 6 },
  },
  'the-last-ration:feed': {
    message: 'A meal is served without a ledger entry. The families remember.',
    score: 80,
    karma: 14,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 12 }],
    actorResponse: { trust: 14, respect: 8 },
  },
  'the-last-ration:amnesty': {
    message: 'The watch wipes the unjust debts from its books.',
    karma: 16,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 9 }],
    actorResponse: { trust: 10, respect: 9 },
  },
  'the-last-ration:reform': {
    message: 'The town agrees to publish its ration accounts. Several officials look ill.',
    score: 100,
    karma: 15,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 15 }],
    actorResponse: { respect: 12 },
  },
  'the-last-ration:profit': {
    message: 'You collect 175 score for leaving the ration racket alone.',
    score: 175,
    karma: -17,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -12 }],
    actorResponse: { respect: 11 },
  },
  'the-last-ration:license': {
    message: 'The official sells ration licenses. Even hunger needs paperwork now.',
    score: 220,
    karma: -20,
    factionChanges: [{ id: 'hearthbound-remnant', amount: -18 }],
    actorResponse: { trust: 8, resentment: 6 },
  },
  'paper-bridges:accept': {
    message: 'Your goblin contact asks for one signed promise of safe passage.',
    actorResponse: { trust: 12, respect: 5 },
  },
  'paper-bridges:seal': {
    message: 'The guard signs a legitimate travel seal. It will need to be honored.',
    actorResponse: { respect: 8, trust: 4 },
  },
  'paper-bridges:forge': {
    message: 'An outlaw makes a convincing seal. The law will not be convinced forever.',
    score: -35,
    actorResponse: { respect: 8 },
  },
  'paper-bridges:toll': {
    message: 'A guard offers a protection seal in return for an unofficial 50-score fee.',
    score: -50,
    actorResponse: { trust: 6, resentment: 3 },
  },
  'paper-bridges:betray': {
    message: 'The guard marks the trade route as a smuggling corridor.',
    karma: -18,
    factionChanges: [{ id: 'goblin-camps', amount: -28 }],
    actorResponse: { respect: 7 },
  },
  'paper-bridges:treaty': {
    message: '{actor} signs the trade agreement and marks the first safe cart.',
    score: 110,
    karma: 18,
    factionChanges: [
      { id: 'goblin-camps', amount: 25 },
      { id: 'hearthbound-remnant', amount: 8 },
    ],
    actorResponse: { trust: 20, respect: 10 },
  },
  'paper-bridges:counterfeit': {
    message: '{actor} accepts the forged seal. The traders travel, but trouble can follow.',
    score: 125,
    karma: -8,
    factionChanges: [
      { id: 'goblin-camps', amount: 10 },
      { id: 'hearthbound-remnant', amount: -9 },
    ],
    actorResponse: { trust: 8, resentment: 2 },
  },
  'paper-bridges:protection': {
    message: 'The goblins agree to the toll, but a bought road is not a free road.',
    score: 80,
    karma: -8,
    factionChanges: [
      { id: 'goblin-camps', amount: -8 },
      { id: 'hearthbound-remnant', amount: -5 },
    ],
    actorResponse: { trust: -9, resentment: 12 },
  },
  'tollkeepers-debt:celebrate': {
    message: 'The traders present one Wall Ward contract, a token of an honest road.',
    wallWards: 1,
    karma: 8,
    factionChanges: [{ id: 'goblin-camps', amount: 12 }],
    actorResponse: { trust: 12, respect: 7 },
  },
  'tollkeepers-debt:confess': {
    message: 'The watch is told the seal was forged before anyone can be ambushed.',
    karma: 12,
    factionChanges: [
      { id: 'goblin-camps', amount: 6 },
      { id: 'hearthbound-remnant', amount: 7 },
    ],
    actorResponse: { respect: 8 },
  },
  'tollkeepers-debt:blackmail': {
    message: 'You sell the secret of the forged seal for 200 score.',
    score: 200,
    karma: -18,
    factionChanges: [{ id: 'goblin-camps', amount: -13 }],
    actorResponse: { respect: 13, resentment: 4 },
  },
  'tollkeepers-debt:refund': {
    message: 'The watch cancels the private toll and refunds the merchants.',
    karma: 15,
    factionChanges: [
      { id: 'goblin-camps', amount: 12 },
      { id: 'hearthbound-remnant', amount: 6 },
    ],
    actorResponse: { respect: 9 },
  },
  'tollkeepers-debt:apologize': {
    message: 'You admit the betrayal and arrange a small reparations fund.',
    karma: 10,
    factionChanges: [{ id: 'goblin-camps', amount: 14 }],
    actorResponse: { trust: 5, resentment: -8 },
  },
  'the-open-table:convene': {
    message: 'The official convenes the open table. The ration ledger and road seals are evidence.',
    actorResponse: { respect: 9, trust: 4 },
  },
  'the-open-table:guard-testimony': {
    message: 'The guard admits how easily official papers can hide a person.',
    actorResponse: { trust: 6, respect: 3 },
  },
  'the-open-table:goblin-testimony': {
    message: 'The goblin witness describes paying to cross a road built by neither faction.',
    actorResponse: { trust: 10, respect: 6 },
  },
  'the-open-table:charter': {
    message: 'A shared charter guarantees passage and public ration accounts.',
    score: 300,
    karma: 30,
    factionChanges: [
      { id: 'goblin-camps', amount: 35 },
      { id: 'hearthbound-remnant', amount: 24 },
    ],
    actorResponse: { respect: 18, trust: 14 },
  },
  'the-open-table:monopoly': {
    message: 'The official grants the town a monopoly on the road and its tolls.',
    score: 420,
    karma: -25,
    factionChanges: [
      { id: 'goblin-camps', amount: -35 },
      { id: 'hearthbound-remnant', amount: 4 },
    ],
    actorResponse: { respect: 7, resentment: 10 },
  },
  'the-open-table:auction': {
    message: 'The road charter is auctioned for 600 score. The poor never got a bid.',
    score: 600,
    karma: -32,
    factionChanges: [
      { id: 'goblin-camps', amount: -28 },
      { id: 'hearthbound-remnant', amount: -18 },
    ],
    actorResponse: { trust: 10, resentment: 12 },
  },
  'the-open-table:expose-network': {
    message: 'The hearing exposes both the ledger cover-up and the false road seals.',
    score: 180,
    karma: 22,
    factionChanges: [
      { id: 'goblin-camps', amount: 12 },
      { id: 'hearthbound-remnant', amount: 10 },
    ],
    actorResponse: { respect: 20 },
  },
  'crystal-clause:accept': {
    message: 'The wizard hands you two enchanted crystals. They are not for collecting rocks.',
  },
  'crystal-clause:decline': {
    message: 'You refuse the contract. No one is captured and no payment changes hands.',
  },
  'crystal-clause:imprison': {
    message: '{actor} vanishes into a crystal. {count}/2 goblins captured.',
    bindActor: true,
    karma: -8,
    factionChanges: [{ id: 'goblin-camps', amount: -5 }],
  },
  'crystal-clause:report': {
    message: 'The guard records your testimony. The captives are freed; you receive 45 score.',
    releaseCaptives: true,
    wizardReported: true,
    score: 45,
    karma: 18,
    factionChanges: [
      { id: 'goblin-camps', amount: 16 },
      { id: 'hearthbound-remnant', amount: 8 },
    ],
  },
  'crystal-clause:free': {
    message: 'You shatter the crystals. The goblins are free; the wizard receives nothing.',
    releaseCaptives: true,
    karma: 16,
    factionChanges: [{ id: 'goblin-camps', amount: 20 }],
  },
  'crystal-clause:deliver': {
    message: 'The wizard takes both crystals and pays 350 score. The goblin camps remember.',
    score: 350,
    karma: -35,
    factionChanges: [{ id: 'goblin-camps', amount: -25 }],
  },
  'crystal-aftermath:confess': {
    message: 'You confess the crystal scheme. The guard takes a statement.',
    karma: 22,
    factionChanges: [{ id: 'hearthbound-remnant', amount: 8 }],
  },
  'crystal-aftermath:silence': {
    message: 'The wizard pays 110 score to keep your silence.',
    score: 110,
    karma: -16,
  },
  'crystal-aftermath:reparation': {
    message: 'The goblins thank you with one Wall Ward contract.',
    wallWards: 1,
    factionChanges: [{ id: 'goblin-camps', amount: 12 }],
  },
};

export function storyQuestConsequence(
  questId: string,
  actionKey: string,
): StoryQuestConsequence | undefined {
  return EFFECTS[`${questId}:${actionKey}`];
}
