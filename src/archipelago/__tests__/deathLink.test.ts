import { describe, expect, it } from 'vitest';
import { resolveIncomingDeathLink, shouldSendDeathLink } from '../deathLink.js';

describe('DeathLink soft mode', () => {
  it('spends a life before ending the run', () => {
    expect(resolveIncomingDeathLink('soft', true)).toBe('consume-life');
    expect(resolveIncomingDeathLink('soft', false)).toBe('game-over');
  });

  it('does not echo incoming deaths or send on buffered life loss', () => {
    expect(shouldSendDeathLink('soft', true, true)).toBe(false);
    expect(shouldSendDeathLink('soft', false, false)).toBe(false);
    expect(shouldSendDeathLink('soft', false, true)).toBe(true);
  });
});
