import { describe, expect, it } from 'vitest';
import {
  createExpeditionBoardState,
  getExpeditionBoardSummary,
  processExpeditionEvent,
} from '../expeditionBoard.js';

describe('expedition board system', () => {
  it('advances active objectives from ordinary run events', () => {
    let state = createExpeditionBoardState();

    state = processExpeditionEvent(state, {
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 1,
      roomId: '0,0,0',
      nowMs: 100,
    }).state;
    state = processExpeditionEvent(state, { kind: 'room', roomId: '1,0,0' }).state;

    expect(state.objectives.find((objective) => objective.kind === 'apples')?.progress).toBe(1);
    expect(state.objectives.find((objective) => objective.kind === 'rooms')?.progress).toBe(1);
  });

  it('clears a chapter and rolls a new board when every objective is complete', () => {
    let state = createExpeditionBoardState();
    let scoreBonus = 0;
    let messages: string[] = [];

    for (let i = 0; i < 6; i += 1) {
      const update = processExpeditionEvent(state, {
        kind: 'apple',
        appleTypeId: 'base',
        streak: 1,
        roomId: '0,0,0',
        nowMs: i,
      });
      state = update.state;
      scoreBonus += update.scoreBonus;
      messages = [...messages, ...update.messages];
    }
    for (let i = 0; i < 5; i += 1) {
      const update = processExpeditionEvent(state, { kind: 'room', roomId: `${i},0,0` });
      state = update.state;
      scoreBonus += update.scoreBonus;
      messages = [...messages, ...update.messages];
    }
    for (let i = 0; i < 2; i += 1) {
      const update = processExpeditionEvent(state, { kind: 'treasure', roomId: `${i},1,0` });
      state = update.state;
      scoreBonus += update.scoreBonus;
      messages = [...messages, ...update.messages];
    }

    expect(state.chapter).toBe(2);
    expect(state.completedChapters).toBe(1);
    expect(scoreBonus).toBeGreaterThan(100);
    expect(messages.some((message) => message.includes('EXPEDITION BOARD CLEARED'))).toBe(true);
    expect(getExpeditionBoardSummary(state)).toContain('Chapter 2');
  });
});
