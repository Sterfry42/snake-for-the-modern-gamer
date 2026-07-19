import { describe, expect, it } from 'vitest';
import {
  clampKarma,
  karmaAfterlifeDestination,
  karmaDisposition,
  normalizeKarmaState,
} from './karma.js';

describe('karma', () => {
  it('clamps the ledger and exposes neutral, good, and bad presentation states', () => {
    expect(clampKarma(140)).toBe(100);
    expect(clampKarma(-140)).toBe(-100);
    expect(karmaDisposition(9)).toBe('neutral');
    expect(karmaDisposition(10)).toBe('good');
    expect(karmaDisposition(-10)).toBe('bad');
  });

  it('selects the afterlife deterministically', () => {
    expect(karmaAfterlifeDestination(0)).toBe('heaven');
    expect(karmaAfterlifeDestination(1)).toBe('heaven');
    expect(karmaAfterlifeDestination(-1)).toBe('hell');
  });

  it('normalizes saved state safely', () => {
    expect(
      normalizeKarmaState({ value: -200, talkedActorIds: ['a', 'a', 4], angelProvoked: 1 }),
    ).toEqual({ value: -100, talkedActorIds: ['a'], angelProvoked: true });
  });
});
