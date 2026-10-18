import { describe, expect, it } from 'vitest';
import { getDatingPortraitAsset } from './datingPortraitManifest.js';
import type { RelationshipCandidateProfile } from './relationshipTypes.js';

function profile(overrides: Partial<RelationshipCandidateProfile>): RelationshipCandidateProfile {
  return {
    id: 'profile:a',
    actorId: undefined,
    displayName: 'Marta',
    species: 'human',
    portraitId: 'sage-1',
    ...overrides,
  };
}

describe('dating portrait manifest', () => {
  it('uses actor identity before relationship profile identity', () => {
    const actorBacked = getDatingPortraitAsset(
      profile({
        id: 'profile:a',
        actorId: 'actor:canonical',
        portraitId: undefined,
      }),
    );
    const sameActorDifferentProfile = getDatingPortraitAsset(
      profile({
        id: 'profile:b',
        actorId: 'actor:canonical',
        portraitId: undefined,
      }),
    );

    expect(actorBacked?.key).toBe(sameActorDifferentProfile?.key);
  });
});
