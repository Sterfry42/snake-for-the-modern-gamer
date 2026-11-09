import { describe, expect, it } from 'vitest';
import {
  applyStoryAction,
  availableStoryActions,
  createStoryQuestState,
  CRYSTAL_CLAUSE,
  CRYSTAL_AFTERMATH,
  nextStoryQuestId,
} from '../storyQuestEngine.js';

const wizard = { actorId: 'wizard-1', role: 'wizard', species: 'human' };
const guard = { actorId: 'guard-1', role: 'guard', species: 'human' };
const goblin = (id: string) => ({ actorId: id, role: 'goblinMerchant', species: 'goblin' });

describe('data-driven story quest actions', () => {
  it('starts with real choices and advances after two distinct captives', () => {
    const offered = createStoryQuestState(CRYSTAL_CLAUSE);
    expect(availableStoryActions(CRYSTAL_CLAUSE, offered, wizard).map((a) => a.key)).toEqual([
      'accept',
      'decline',
    ]);
    const active = applyStoryAction(CRYSTAL_CLAUSE, offered, wizard, 'accept')!.state;
    const one = applyStoryAction(CRYSTAL_CLAUSE, active, goblin('a'), 'imprison')!.state;
    expect(one.stage).toBe('hunting');
    expect(applyStoryAction(CRYSTAL_CLAUSE, one, goblin('a'), 'imprison')).toBeNull();
    const two = applyStoryAction(CRYSTAL_CLAUSE, one, goblin('b'), 'imprison')!.state;
    expect(two.stage).toBe('ready');
    expect(two.counters.captured).toBe(2);
    expect(availableStoryActions(CRYSTAL_CLAUSE, two, wizard).map((a) => a.key)).toEqual([
      'deliver',
    ]);
    const delivered = applyStoryAction(CRYSTAL_CLAUSE, two, wizard, 'deliver')!.state;
    expect(delivered.outcome).toBe('delivered');
    expect(nextStoryQuestId(CRYSTAL_CLAUSE, delivered)).toBe('crystal-aftermath');
    expect(availableStoryActions(CRYSTAL_CLAUSE, delivered, wizard)).toEqual([]);
  });

  it('allows an ethical alternative even after imprisoning a goblin', () => {
    const start = applyStoryAction(
      CRYSTAL_CLAUSE,
      createStoryQuestState(CRYSTAL_CLAUSE),
      wizard,
      'accept',
    )!.state;
    const one = applyStoryAction(CRYSTAL_CLAUSE, start, goblin('a'), 'imprison')!.state;
    const reported = applyStoryAction(CRYSTAL_CLAUSE, one, guard, 'report')!.state;
    expect(reported.outcome).toBe('reported');
    const freed = applyStoryAction(CRYSTAL_CLAUSE, one, goblin('b'), 'free')!.state;
    expect(freed.outcome).toBe('freed');
    expect(applyStoryAction(CRYSTAL_CLAUSE, freed, goblin('c'), 'imprison')).toBeNull();
  });

  it('supports declining and follow-up forks without reoffering completed choices', () => {
    const declined = applyStoryAction(
      CRYSTAL_CLAUSE,
      createStoryQuestState(CRYSTAL_CLAUSE),
      wizard,
      'decline',
    )!.state;
    expect(nextStoryQuestId(CRYSTAL_CLAUSE, declined)).toBeNull();
    expect(availableStoryActions(CRYSTAL_CLAUSE, declined, wizard)).toEqual([]);
    const aftermath = createStoryQuestState(CRYSTAL_AFTERMATH, 'delivered');
    expect(availableStoryActions(CRYSTAL_AFTERMATH, aftermath, guard).map((a) => a.key)).toEqual([
      'confess',
    ]);
    expect(availableStoryActions(CRYSTAL_AFTERMATH, aftermath, goblin('a'))).toEqual([]);
    const ended = applyStoryAction(CRYSTAL_AFTERMATH, aftermath, guard, 'confess')!.state;
    expect(ended.outcome).toBe('atoned');
    expect(createStoryQuestState(CRYSTAL_AFTERMATH, 'reported').originOutcome).toBe('reported');
    expect(JSON.parse(JSON.stringify(ended))).toEqual(ended);
  });
});
