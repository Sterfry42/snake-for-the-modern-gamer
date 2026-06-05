import { describe, expect, it } from 'vitest';
import { shuffleDatingBranchActions } from './datingActionOrder.js';

function sequenceRng(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

describe('dating action order', () => {
  it('shuffles fallback romance branch labels while preserving ids', () => {
    const actions = [
      { id: 'branch-pineapple', label: 'Pineapple' },
      { id: 'branch-pepperoni', label: 'Pepperoni' },
      { id: 'branch-mushroom', label: 'Mushroom' },
      { id: 'leave', label: 'Back', tone: 'quiet' },
    ] as const;

    const shuffled = shuffleDatingBranchActions(actions, sequenceRng([0, 0]));

    expect(shuffled.map((action) => action.id)).toEqual([
      'branch-pepperoni',
      'branch-mushroom',
      'branch-pineapple',
      'leave',
    ]);
    expect(shuffled.map((action) => action.label).sort()).toEqual(
      actions.map((action) => action.label).sort(),
    );
  });

  it('keeps Back last and deterministic for a seeded random sequence', () => {
    const actions = [
      { id: 'branch-mooncrime', label: 'Moon Crime' },
      { id: 'branch-knifepoem', label: 'Knife Poem' },
      { id: 'branch-sincere', label: 'Sincere' },
      { id: 'leave', label: 'Back', tone: 'quiet' },
    ] as const;
    const first = shuffleDatingBranchActions(actions, sequenceRng([0.9, 0.1]));
    const second = shuffleDatingBranchActions(actions, sequenceRng([0.9, 0.1]));

    expect(first.map((action) => action.id)).toEqual(second.map((action) => action.id));
    expect(first[first.length - 1]).toMatchObject({ id: 'leave', label: 'Back' });
    expect(
      first
        .slice(0, -1)
        .map((action) => action.id)
        .sort(),
    ).toEqual(
      actions
        .slice(0, -1)
        .map((action) => action.id)
        .sort(),
    );
  });
});
