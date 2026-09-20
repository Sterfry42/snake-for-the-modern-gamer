import { describe, expect, it } from 'vitest';
import { getTownTurnBasedBounds } from '../snakeSceneTurnBasedSupport.js';

describe('SnakeScene town turn-based movement', () => {
  it('includes town entry and boundary tiles in the manual movement zone', () => {
    expect(getTownTurnBasedBounds({ cols: 48, rows: 32 })).toEqual({
      left: 0,
      top: 0,
      width: 48,
      height: 32,
    });
  });
});
