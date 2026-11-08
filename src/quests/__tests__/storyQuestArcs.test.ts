import { describe, expect, it } from 'vitest';
import {
  applyStoryAction,
  availableStoryActions,
  initializeUnlockedStory,
  storyQuestCharacterLine,
  storyQuestObjectives,
  type StoryQuestState,
} from '../storyQuestEngine.js';
import {
  INK_AND_ASHES,
  THE_LAST_RATION,
  PAPER_BRIDGES,
  TOLLKEEPERS_DEBT,
  THE_OPEN_TABLE,
} from '../storyQuestChapters.js';

const guard = {
  actorId: 'guard-1',
  role: 'guard',
  species: 'human',
  personality: ['lawful' as const],
  trust: 35,
  score: 100,
};
const greedyGuard = {
  ...guard,
  actorId: 'guard-2',
  personality: ['greedy' as const, 'cynical' as const],
};
const goblin = { actorId: 'goblin-1', role: 'shopkeeper', species: 'goblin', score: 0 };
const thief = { actorId: 'thief-1', role: 'thief', species: 'human', score: 0 };
const official = { actorId: 'mayor', role: 'civicOfficial', species: 'human', score: 50 };
const shopkeeper = { actorId: 'clerk', role: 'shopkeeper', species: 'human', score: 0 };

const state = (questId: string, outcome: string): StoryQuestState => ({
  questId,
  stage: 'completed',
  counters: {},
  usedActorIds: [],
  outcome,
});
const lookup = (values: readonly StoryQuestState[]) => (id: string) =>
  values.find((value) => value.questId === id) ?? null;

describe('character-driven and intersecting quest rules', () => {
  it('offers a real evidence trail and keeps corruption exclusive to greedy or cynical guards', () => {
    const start = initializeUnlockedStory(INK_AND_ASHES, lookup([]))!;
    expect(availableStoryActions(INK_AND_ASHES, start, guard).map((a) => a.key)).toEqual([
      'investigate',
      'decline',
    ]);
    const work = applyStoryAction(INK_AND_ASHES, start, guard, 'investigate')!.state;
    expect(work.giverActorId).toBe(guard.actorId);
    const evidence = applyStoryAction(INK_AND_ASHES, work, shopkeeper, 'audit')!.state;
    expect(evidence.stage).toBe('verdict');
    expect(availableStoryActions(INK_AND_ASHES, evidence, guard).map((a) => a.key)).toEqual([
      'expose',
    ]);
    expect(availableStoryActions(INK_AND_ASHES, evidence, greedyGuard).map((a) => a.key)).toEqual([]);
    const dishonest = { ...evidence, giverActorId: greedyGuard.actorId };
    expect(availableStoryActions(INK_AND_ASHES, dishonest, greedyGuard).map((a) => a.key)).toEqual([
      'expose',
      'bribe',
    ]);
    expect(storyQuestCharacterLine(INK_AND_ASHES.actions[0]!, guard)).toContain('Names');
    expect(storyQuestObjectives(INK_AND_ASHES, evidence)[0]).toContain('evidence');
  });

  it('requires both plotlines to resolve before the town council appears', () => {
    const resolved = [
      state('ink-and-ashes', 'exposed'),
      state('the-last-ration', 'aid'),
      state('paper-bridges', 'treaty'),
      state('tollkeepers-debt', 'mutuality'),
    ];
    expect(initializeUnlockedStory(THE_LAST_RATION, lookup(resolved))).not.toBeNull();
    expect(initializeUnlockedStory(TOLLKEEPERS_DEBT, lookup(resolved))).not.toBeNull();
    expect(initializeUnlockedStory(THE_OPEN_TABLE, lookup(resolved.slice(0, 3)))).toBeNull();
    expect(initializeUnlockedStory(THE_OPEN_TABLE, lookup(resolved))?.stage).toBe('offered');
    const wrong = [...resolved.slice(0, 3), state('tollkeepers-debt', 'unknown')];
    expect(initializeUnlockedStory(THE_OPEN_TABLE, lookup(wrong))).toBeNull();
  });

  it('changes faction epilogue actions based on both past endings', () => {
    const adverse = [
      state('ink-and-ashes', 'buried'),
      state('the-last-ration', 'aid'),
      state('paper-bridges', 'forged'),
      state('tollkeepers-debt', 'blackmail'),
    ];
    const offered = initializeUnlockedStory(THE_OPEN_TABLE, lookup(adverse))!;
    const hearing = applyStoryAction(
      THE_OPEN_TABLE,
      offered,
      official,
      'convene',
      lookup(adverse),
    )!.state;
    const decision = applyStoryAction(
      THE_OPEN_TABLE,
      hearing,
      goblin,
      'goblin-testimony',
      lookup(adverse),
    )!.state;
    const options = availableStoryActions(THE_OPEN_TABLE, decision, official, lookup(adverse));
    expect(options.map((action) => action.key)).toEqual([
      'charter',
      'monopoly',
      'expose-network',
    ]);
    const righteous = adverse.map((item) =>
      item.questId === 'ink-and-ashes' ? state('ink-and-ashes', 'exposed') : item,
    );
    expect(availableStoryActions(THE_OPEN_TABLE, decision, official, lookup(righteous)).map(
      (action) => action.key,
    )).not.toContain('expose-network');
  });

  it('does not allow forging without money or return to the wrong goblin', () => {
    const start = initializeUnlockedStory(PAPER_BRIDGES, lookup([]))!;
    const requested = applyStoryAction(PAPER_BRIDGES, start, goblin, 'accept')!.state;
    expect(availableStoryActions(PAPER_BRIDGES, requested, thief)).toEqual([]);
    const payingThief = { ...thief, score: 50 };
    const forged = applyStoryAction(PAPER_BRIDGES, requested, payingThief, 'forge')!.state;
    expect(availableStoryActions(PAPER_BRIDGES, forged, {
      ...goblin, actorId: 'other-goblin',
    })).toEqual([]);
    expect(applyStoryAction(PAPER_BRIDGES, forged, goblin, 'counterfeit')?.state.outcome).toBe(
      'forged',
    );
    expect(availableStoryActions(PAPER_BRIDGES, requested, greedyGuard).map((a) => a.key)).toEqual([
      'seal',
      'toll',
      'betray',
    ]);
  });

  it('shows the second chapter outcomes relevant to the original deal', () => {
    const clean = initializeUnlockedStory(TOLLKEEPERS_DEBT, lookup([
      state('paper-bridges', 'treaty'),
    ]))!;
    expect(availableStoryActions(TOLLKEEPERS_DEBT, clean, goblin).map((a) => a.key)).toEqual([
      'celebrate',
    ]);
    const forged = initializeUnlockedStory(TOLLKEEPERS_DEBT, lookup([
      state('paper-bridges', 'forged'),
    ]))!;
    expect(availableStoryActions(TOLLKEEPERS_DEBT, forged, guard).map((a) => a.key)).toEqual([
      'confess',
    ]);
  });
});
