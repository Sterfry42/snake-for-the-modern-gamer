import { describe, expect, it } from 'vitest';
import { ACTOR_INTENTS } from '../../session/ActorIntent.js';
import {
  applyStoryAction,
  availableStoryActions,
  initializeUnlockedStory,
  storyActionId,
  storyQuestObjectives,
  type StoryQuestState,
} from '../storyQuestEngine.js';
import { storyQuestConsequence } from '../storyQuestConsequences.js';
import {
  THE_BORROWED_BONES,
  THE_MUSEUM_THAT_SHOULDNT_BE,
  THE_VELVET_LEDGER,
  CLEAN_HANDS_DIRTY_MONEY,
  THE_SOUP_OFFENSIVE,
  SECOND_HELPINGS,
  THE_PEOPLES_POTLUCK,
  WORLD_STORY_QUESTS,
} from '../storyQuestWorldChapters.js';

const mapper = {
  actorId: 'mapmaker',
  role: 'mapper',
  species: 'human',
  personality: ['practical' as const],
  score: 200,
  worldCounters: { 'archaeology:excavationsCompleted': 5 },
};
const scribe = { actorId: 'scribe', role: 'scribe', species: 'human', score: 0 };
const guard = { actorId: 'watch', role: 'guard', species: 'human', score: 0 };
const goblin = { actorId: 'goblin', role: 'shopkeeper', species: 'goblin', score: 0 };
const thief = { actorId: 'pickpocket', role: 'thiefContact', species: 'human', score: 100 };
const guild = { actorId: 'guild', role: 'guildContact', species: 'human', score: 100 };
const merchant = { actorId: 'merchant', role: 'shopkeeper', species: 'human', score: 0 };
const bartender = { actorId: 'bartender', role: 'bartender', species: 'human', score: 0 };
const butcher = { actorId: 'butcher', role: 'butcher', species: 'human', score: 0 };
const potionMaker = { actorId: 'potion', role: 'potionMaker', species: 'human', score: 0 };
const official = { actorId: 'official', role: 'civicOfficial', species: 'human', score: 0 };
const completed = (questId: string, outcome: string): StoryQuestState => ({
  questId,
  outcome,
  stage: 'completed',
  counters: {},
  usedActorIds: [],
});
const lookup = (values: readonly StoryQuestState[]) => (id: string) =>
  values.find((entry) => entry.questId === id) ?? null;
const keys = (quest: typeof THE_BORROWED_BONES, state: StoryQuestState, target: typeof mapper) =>
  availableStoryActions(quest, state, target).map((action) => action.key);

describe('the world story chapters', () => {
  it('registers every authored verb and has distinct chapters, actions and consequences', () => {
    expect(new Set(WORLD_STORY_QUESTS.map((chapter) => chapter.id)).size).toBe(7);
    const permitted = new Set<string>(ACTOR_INTENTS);
    for (const chapter of WORLD_STORY_QUESTS) {
      expect(new Set(chapter.actions.map((action) => action.key)).size).toBe(
        chapter.actions.length,
      );
      for (const action of chapter.actions) {
        expect(permitted.has(storyActionId(chapter.id, action.key))).toBe(true);
        expect(storyQuestConsequence(chapter.id, action.key)).toBeDefined();
      }
    }
  });

  it('requires a NEW real excavation, records its baseline and cannot be forged through the UI', () => {
    const offered = initializeUnlockedStory(THE_BORROWED_BONES, lookup([]))!;
    const active = applyStoryAction(THE_BORROWED_BONES, offered, mapper, 'commission')!.state;
    expect(active.worldBaselines?.['archaeology:excavationsCompleted']).toBe(5);
    expect(keys(THE_BORROWED_BONES, active, mapper)).not.toContain('file-findings');
    const afterDig = {
      ...mapper,
      worldCounters: { 'archaeology:excavationsCompleted': 6 },
    };
    expect(keys(THE_BORROWED_BONES, active, afterDig)).toContain('file-findings');
    expect(storyQuestObjectives(
      THE_BORROWED_BONES,
      active,
      afterDig.worldCounters,
    )[1]).toContain('(1/1)');
    expect(availableStoryActions(THE_BORROWED_BONES, active, {
      ...afterDig,
      actorId: 'different-mapmaker',
    }).map((action) => action.key)).not.toContain('file-findings');
    const ready = applyStoryAction(THE_BORROWED_BONES, active, afterDig, 'file-findings')!.state;
    const completedQuest = applyStoryAction(THE_BORROWED_BONES, ready, mapper, 'publish')!.state;
    expect(completedQuest.outcome).toBe('published');
    expect(JSON.parse(JSON.stringify(completedQuest))).toEqual(completedQuest);
  });

  it('supports paying for false archaeology while making unauthorized costs impossible', () => {
    const offered = initializeUnlockedStory(THE_BORROWED_BONES, lookup([]))!;
    const active = applyStoryAction(THE_BORROWED_BONES, offered, mapper, 'commission')!.state;
    expect(applyStoryAction(THE_BORROWED_BONES, active, scribe, 'forge-findings')).toBeNull();
    const dishonest = applyStoryAction(THE_BORROWED_BONES, active, {
      ...scribe, score: 35,
    }, 'forge-findings')!.state;
    expect(dishonest.choiceHistory?.fieldwork).toBe('forge-findings');
    expect(availableStoryActions(THE_BORROWED_BONES, dishonest, mapper).map(
      (action) => action.key,
    )).not.toContain('publish');
    expect(availableStoryActions(THE_BORROWED_BONES, dishonest, scribe).map(
      (action) => action.key,
    )).toContain('launder');
    const sold = applyStoryAction(THE_BORROWED_BONES, dishonest, guild, 'sell')!.state;
    expect(sold.outcome).toBe('sold');
    expect(storyQuestConsequence('the-borrowed-bones', 'forge-findings')?.score).toBe(-35);
    expect(storyQuestConsequence('the-borrowed-bones', 'sell')?.score).toBeGreaterThan(0);
  });

  it('allows a forged museum claim to be exposed or turned into a counterfeit gallery', () => {
    const offered = initializeUnlockedStory(THE_BORROWED_BONES, lookup([]))!;
    const active = applyStoryAction(THE_BORROWED_BONES, offered, mapper, 'commission')!.state;
    const fabricated = applyStoryAction(THE_BORROWED_BONES, active, {
      ...scribe, score: 40,
    }, 'forge-findings')!.state;
    const falsified = applyStoryAction(THE_BORROWED_BONES, fabricated, scribe, 'launder')!.state;
    expect(falsified.outcome).toBe('laundered');
    const followup = initializeUnlockedStory(
      THE_MUSEUM_THAT_SHOULDNT_BE,
      lookup([falsified]),
    )!;
    expect(availableStoryActions(THE_MUSEUM_THAT_SHOULDNT_BE, followup, guard).map(
      (action) => action.key,
    )).toEqual(['admit-forgery']);
    expect(availableStoryActions(THE_MUSEUM_THAT_SHOULDNT_BE, followup, guild).map(
      (action) => action.key,
    )).toEqual(['fake-gallery']);
  });

  it('follows the excavation ending with different museum decisions', () => {
    const history = lookup([completed('the-borrowed-bones', 'returned')]);
    const restored = initializeUnlockedStory(THE_MUSEUM_THAT_SHOULDNT_BE, history)!;
    expect(availableStoryActions(THE_MUSEUM_THAT_SHOULDNT_BE, restored, goblin).map(
      (action) => action.key,
    )).toEqual(['goblin-archive']);
    const sold = initializeUnlockedStory(THE_MUSEUM_THAT_SHOULDNT_BE, lookup([
      completed('the-borrowed-bones', 'sold'),
    ]))!;
    expect(availableStoryActions(THE_MUSEUM_THAT_SHOULDNT_BE, sold, scribe)).toEqual([]);
    expect(availableStoryActions(THE_MUSEUM_THAT_SHOULDNT_BE, sold, {
      ...scribe, score: 75,
    }).map((action) => action.key)).toEqual(['buy-back']);
  });

  it('lets debtors testify, then follows an exploitative guild choice into a second moral choice', () => {
    const offered = initializeUnlockedStory(THE_VELVET_LEDGER, lookup([]))!;
    const active = applyStoryAction(THE_VELVET_LEDGER, offered, guild, 'offer')!.state;
    const evidence = applyStoryAction(THE_VELVET_LEDGER, active, merchant, 'debtor')!.state;
    expect(evidence.stage).toBe('decision');
    expect(applyStoryAction(THE_VELVET_LEDGER, evidence, thief, 'enforce')).toBeNull();
    const enforced = applyStoryAction(THE_VELVET_LEDGER, evidence, guild, 'enforce')!.state;
    expect(enforced.outcome).toBe('enforced');
    const debt = initializeUnlockedStory(CLEAN_HANDS_DIRTY_MONEY, lookup([enforced]))!;
    expect(availableStoryActions(CLEAN_HANDS_DIRTY_MONEY, debt, guard).map(
      (action) => action.key,
    )).toEqual(['turn-in']);
    expect(availableStoryActions(CLEAN_HANDS_DIRTY_MONEY, debt, merchant).map(
      (action) => action.key,
    )).toEqual(['take-protection']);
  });

  it('requires testimony from both cooks and prevents duplicate testimony', () => {
    const offered = initializeUnlockedStory(THE_SOUP_OFFENSIVE, lookup([]))!;
    const active = applyStoryAction(THE_SOUP_OFFENSIVE, offered, bartender, 'taste')!.state;
    const first = applyStoryAction(THE_SOUP_OFFENSIVE, active, butcher, 'butcher')!.state;
    expect(first.stage).toBe('tasting');
    expect(applyStoryAction(THE_SOUP_OFFENSIVE, first, butcher, 'butcher')).toBeNull();
    const second = applyStoryAction(THE_SOUP_OFFENSIVE, first, potionMaker, 'alchemist')!.state;
    expect(second.stage).toBe('judgement');
    const resolved = applyStoryAction(THE_SOUP_OFFENSIVE, second, bartender, 'reconcile')!.state;
    expect(resolved.outcome).toBe('reconciled');
    const aftermath = initializeUnlockedStory(SECOND_HELPINGS, lookup([resolved]))!;
    expect(availableStoryActions(SECOND_HELPINGS, aftermath, bartender).map(
      (action) => action.key,
    )).toEqual(['soup-kitchen']);
  });

  it('requires three separately resolved arcs, then exactly three voices for the final feast', () => {
    const roots = [
      completed('the-borrowed-bones', 'returned'),
      completed('the-velvet-ledger', 'erased'),
      completed('the-soup-offensive', 'reconciled'),
    ];
    const finals = [
      ...roots,
      completed('the-museum-that-shouldnt-be', 'self-governed'),
      completed('clean-hands-dirty-money', 'amnesty'),
      completed('second-helpings', 'community'),
    ];
    expect(initializeUnlockedStory(THE_PEOPLES_POTLUCK, lookup(finals.slice(0, 5)))).toBeNull();
    const offered = initializeUnlockedStory(THE_PEOPLES_POTLUCK, lookup(finals))!;
    const gathering = applyStoryAction(THE_PEOPLES_POTLUCK, offered, official, 'assemble')!.state;
    const first = applyStoryAction(THE_PEOPLES_POTLUCK, gathering, mapper, 'history-voice')!.state;
    const second = applyStoryAction(THE_PEOPLES_POTLUCK, first, merchant, 'merchants-voice')!.state;
    expect(second.stage).toBe('gathering');
    expect(availableStoryActions(THE_PEOPLES_POTLUCK, second, {
      ...mapper, actorId: 'another-mapmaker',
    }).map((action) => action.key)).not.toContain('history-voice');
    const decision = applyStoryAction(THE_PEOPLES_POTLUCK, second, thief, 'guild-voice')!.state;
    expect(decision.stage).toBe('decision');
    expect(availableStoryActions(THE_PEOPLES_POTLUCK, decision, official, lookup(finals)).map(
      (action) => action.key,
    )).toEqual(['commons', 'private-club', 'goblin-table']);
    const end = applyStoryAction(
      THE_PEOPLES_POTLUCK, decision, official, 'goblin-table', lookup(finals),
    )!.state;
    expect(end.outcome).toBe('cooperative');
  });

  it('makes the grand-exposure ending contingent on all three original betrayals', () => {
    const originals = [
      completed('the-borrowed-bones', 'sold'),
      completed('the-velvet-ledger', 'enforced'),
      completed('the-soup-offensive', 'tainted'),
    ];
    const aftermaths = [
      completed('the-museum-that-shouldnt-be', 'hidden'),
      completed('clean-hands-dirty-money', 'protection'),
      completed('second-helpings', 'concealed'),
    ];
    const context = lookup([...originals, ...aftermaths]);
    const offered = initializeUnlockedStory(THE_PEOPLES_POTLUCK, context)!;
    const gathered = applyStoryAction(THE_PEOPLES_POTLUCK, offered, official, 'assemble')!.state;
    const withHistory = applyStoryAction(THE_PEOPLES_POTLUCK, gathered, mapper, 'history-voice')!.state;
    const withMerchant = applyStoryAction(
      THE_PEOPLES_POTLUCK, withHistory, merchant, 'merchants-voice',
    )!.state;
    const decision = applyStoryAction(THE_PEOPLES_POTLUCK, withMerchant, guild, 'guild-voice')!.state;
    expect(availableStoryActions(THE_PEOPLES_POTLUCK, decision, official, context).map(
      (action) => action.key,
    )).toContain('grand-exposure');
    expect(availableStoryActions(THE_PEOPLES_POTLUCK, decision, official, lookup([
      completed('the-borrowed-bones', 'published'),
      ...originals.slice(1),
      ...aftermaths,
    ])).map((action) => action.key)).not.toContain('grand-exposure');
  });
});
