import { describe, expect, it } from 'vitest';
import {
  parseSeededQuestRoomId,
  resolveCultTempleTarget,
  resolveLetterDeliveryTarget,
} from '../seededQuestTargets.js';

describe('seeded quest targets', () => {
  it('resolves letter targets deterministically for the same seed and origin room', () => {
    const first = resolveLetterDeliveryTarget('run:test-seed', '4,-2,0', 'letter-for-the-unspawned');
    const second = resolveLetterDeliveryTarget('run:test-seed', '4,-2,0', 'letter-for-the-unspawned');

    expect(second).toEqual(first);
  });

  it('places letter targets exactly thirty rooms away on the same depth by default', () => {
    const origin = parseSeededQuestRoomId('4,-2,3');
    const target = resolveLetterDeliveryTarget('run:test-seed', '4,-2,3', 'letter-for-the-unspawned');

    expect(target.coord.z).toBe(origin.z);
    expect(Math.abs(target.coord.x - origin.x) + Math.abs(target.coord.y - origin.y)).toBe(30);
    expect(target.distanceFromOrigin).toBe(30);
    expect(target.npcName).toBeTruthy();
  });

  it('places the buried temple at the requested depth without generating any rooms', () => {
    const target = resolveCultTempleTarget('run:test-seed', 'buried-temple-artifact', -20);

    expect(target.coord.z).toBe(-20);
    expect(target.roomId.endsWith(',-20')).toBe(true);
    expect(target.artifactName).toBeTruthy();
  });
});
