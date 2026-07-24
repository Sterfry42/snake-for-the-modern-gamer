import { describe, expect, it } from 'vitest';
import {
  canPhaseThroughBody,
  canPhaseThroughWalls,
  canSwimWithoutBreath,
  getPositiveChargeCount,
  getUnifiedInvulnerabilityTicks,
  hasCollisionInvulnerability,
  type GameplayFlags,
} from '../protection.js';

describe('collision protection helpers', () => {
  it('unifies legacy bullet and fortitude invulnerability timers', () => {
    const flags: GameplayFlags = {
      'fortitude.invulnerabilityTicks': 4,
      'player.bulletInvulnTicks': 9,
    };

    expect(getUnifiedInvulnerabilityTicks(flags)).toBe(9);
    expect(hasCollisionInvulnerability(flags)).toBe(true);
  });

  it('treats phase as body, wall, swim, and damage protection', () => {
    const flags: GameplayFlags = { 'traversal.phaseTicks': 2 };

    expect(canPhaseThroughBody(flags)).toBe(true);
    expect(canPhaseThroughWalls(flags)).toBe(true);
    expect(canSwimWithoutBreath(flags)).toBe(true);
  });

  it('keeps safe-zone wall phasing local to walls', () => {
    const flags: GameplayFlags = {};

    expect(canPhaseThroughWalls(flags, true)).toBe(true);
    expect(canPhaseThroughBody(flags)).toBe(false);
    expect(hasCollisionInvulnerability(flags)).toBe(false);
  });

  it('normalizes shield charges before collision predictors use them', () => {
    expect(
      getPositiveChargeCount({ 'geometry.terraShield': { charges: 3 } }, 'geometry.terraShield'),
    ).toBe(3);
    expect(
      getPositiveChargeCount({ 'geometry.terraShield': { charges: -1 } }, 'geometry.terraShield'),
    ).toBe(0);
    expect(
      getPositiveChargeCount(
        { 'geometry.terraShield': { charges: 'nope' } },
        'geometry.terraShield',
      ),
    ).toBe(0);
  });
});
