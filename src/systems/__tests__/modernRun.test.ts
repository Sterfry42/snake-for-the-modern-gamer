import { describe, expect, it } from 'vitest';
import {
  createModernRunState,
  getModernRunSummary,
  processModernRunEvent,
  type ModernRunState,
} from '../modernRun.js';

function apply(state: ModernRunState, appleTypeId: string, streak: number): ModernRunState {
  return processModernRunEvent(state, {
    kind: 'apple',
    appleTypeId,
    streak,
    roomId: '0,0,0',
    nowMs: streak * 100,
  }).state;
}

describe('modern run system', () => {
  it('tracks Flow as an apple-chain style layer', () => {
    const update = processModernRunEvent(createModernRunState(), {
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 5,
      roomId: '0,0,0',
      nowMs: 500,
    });

    expect(update.state.flow).toMatchObject({ tier: 2, bestTier: 2, chain: 1 });
    expect(update.scoreBonus).toBeGreaterThanOrEqual(3);
    expect(update.messages.some((message) => message.includes('FLOW HOT'))).toBe(true);
  });

  it('stamps the Apple Passport and pays milestone rewards once', () => {
    let state = createModernRunState();
    state = apply(state, 'base', 1);
    state = apply(state, 'golden', 1);
    const milestone = processModernRunEvent(state, {
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 1,
      roomId: '0,0,0',
      nowMs: 300,
    });
    const duplicate = processModernRunEvent(milestone.state, {
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 1,
      roomId: '0,0,0',
      nowMs: 400,
    });

    expect(milestone.state.passport.appleTypeIds).toEqual(['base', 'golden', 'wasabi']);
    expect(milestone.state.passport.claimedMilestones).toEqual([3]);
    expect(milestone.scoreBonus).toBeGreaterThanOrEqual(15);
    expect(duplicate.state.passport.claimedMilestones).toEqual([3]);
  });

  it('keeps the contract board progressing from ordinary run events', () => {
    let state = createModernRunState();
    for (const appleTypeId of ['base', 'golden', 'wasabi', 'mochi', 'caffeinated']) {
      state = apply(state, appleTypeId, 1);
    }
    for (const roomId of ['1,0,0', '2,0,0', '3,0,0']) {
      state = processModernRunEvent(state, { kind: 'room', roomId }).state;
    }

    const summary = getModernRunSummary(state);

    expect(state.contracts.find((contract) => contract.kind === 'apples')?.completed).toBe(true);
    expect(state.contracts.find((contract) => contract.kind === 'rooms')?.completed).toBe(true);
    expect(summary).toContain('Snack Sprint: done');
    expect(summary).toContain('Block Party: done');
  });
});
