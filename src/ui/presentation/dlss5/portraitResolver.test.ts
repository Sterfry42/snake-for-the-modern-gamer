import { describe, expect, it } from 'vitest';
import {
  SYNTHETIC_PORTRAIT_COUNT,
  canonicalDlss5PortraitIdentityId,
  isEligibleForDlss5SyntheticPortrait,
  resolveDlss5PortraitIdentity,
} from './portraitResolver.js';

describe('DLSS 5 portrait resolver', () => {
  it('derives stable synthetic portrait identities from actor IDs', () => {
    const first = resolveDlss5PortraitIdentity({
      id: 'resident:0,0,0:nina',
      portraitId: 'villager-neutral',
      species: 'human',
    });
    const second = resolveDlss5PortraitIdentity({
      id: 'resident:0,0,0:nina',
      portraitId: 'villager-neutral',
      species: 'human',
    });

    expect(first).toEqual(second);
    expect(first?.index).toBeGreaterThanOrEqual(0);
    expect(first?.index).toBeLessThan(SYNTHETIC_PORTRAIT_COUNT);
    expect(SYNTHETIC_PORTRAIT_COUNT).toBe(10_000);
  });

  it('prefers actor IDs over relationship profile IDs for canonical identity', () => {
    const actorIdentity = resolveDlss5PortraitIdentity({
      id: 'relationship:market:nina',
      actorId: 'town:market:shopkeeper:nina',
      portraitId: 'sage-1',
      species: 'human',
    });
    const prewarmIdentity = resolveDlss5PortraitIdentity({
      id: 'town:market:shopkeeper:nina',
      actorId: 'town:market:shopkeeper:nina',
      portraitId: 'sage-1',
      species: 'human',
    });

    expect(canonicalDlss5PortraitIdentityId({ id: 'profile:nina', actorId: 'actor:nina' })).toBe(
      'actor:nina',
    );
    expect(actorIdentity).toEqual(prewarmIdentity);
  });

  it('keeps authored non-human portraits authoritative', () => {
    expect(
      isEligibleForDlss5SyntheticPortrait({
        id: 'goblin',
        portraitId: 'goblin-neutral',
        species: 'goblin',
      }),
    ).toBe(false);
    expect(
      resolveDlss5PortraitIdentity({
        id: 'moleman',
        portraitId: 'moleman-date',
        species: 'moleman',
      }),
    ).toBeNull();
  });

  it('allows generic human fallback portrait IDs', () => {
    expect(
      isEligibleForDlss5SyntheticPortrait({
        id: 'guard',
        portraitId: 'guard-neutral',
        species: 'human',
      }),
    ).toBe(true);
    expect(
      isEligibleForDlss5SyntheticPortrait({
        id: 'default-human',
        portraitId: 'sage-1',
        species: 'human',
      }),
    ).toBe(true);
  });
});
