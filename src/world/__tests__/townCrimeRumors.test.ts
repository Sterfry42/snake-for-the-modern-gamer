import { describe, expect, it } from 'vitest';
import { applyTownCrime, createPhysicalHumanTown, type TownCrimeKind } from '../town.js';
import type { TownStructure } from '../town.js';

function makeTown(): TownStructure {
  return createPhysicalHumanTown({
    biomeId: 'verdigris-basin',
    seed: 42,
    townId: 'rumor-seq-town',
    districtRoomIds: {
      '0,0,0': 'townCenter',
      '1,0,0': 'marketStreet',
      '0,1,0': 'residentialStreet',
      '1,1,0': 'backAlley',
    },
    entranceRoomId: '0,0,0',
    exitRoomIds: ['1,1,0'],
  });
}

const CRIMES: readonly TownCrimeKind[] = [
  'contraband',
  'theft',
  'breakIn',
  'refuseFine',
  'curfewViolation',
  'fakePermit',
  'shopRobbery',
  'assault',
  'biteGuard',
  'murder',
  'romanticPublicMurder',
];

describe('town crime rumor ids', () => {
  it('stays unique once the rumor list reaches its cap', () => {
    let town = makeTown();
    for (let i = 0; i < CRIMES.length * 2; i += 1) {
      town = applyTownCrime(town, {
        kind: CRIMES[i % CRIMES.length]!,
        witnessed: true,
        severity: 1 + (i % 3),
        roomId: '0,0,0',
      });
    }

    const ids = town.rumors.map((rumor) => rumor.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(town.rumors.length).toBe(8);
  });

  it('derives the next sequence from the highest surviving rumor id', () => {
    let town = makeTown();
    town = applyTownCrime(town, { kind: 'theft', witnessed: true, severity: 1, roomId: '0,0,0' });
    expect(town.rumors[0]?.id).toBe('rumor-rumor-seq-town-1');

    // Simulate a persisted runtime whose oldest rumors were already trimmed.
    const trimmed = {
      ...town,
      rumors: [
        {
          id: 'rumor-rumor-seq-town-9',
          townId: town.id,
          kind: 'crime' as const,
          summary: 'An older crime that survived the trim.',
          roomsRemaining: 10,
          severity: 1,
        },
      ],
    };
    const next = applyTownCrime(trimmed, {
      kind: 'assault',
      witnessed: true,
      severity: 2,
      roomId: '0,0,0',
    });
    expect(next.rumors[0]?.id).toBe('rumor-rumor-seq-town-10');
  });

  it('ignores non-numeric and foreign rumor ids when computing the sequence', () => {
    const town = {
      ...makeTown(),
      rumors: [
        {
          id: 'rumor-rumor-seq-town-guild-8',
          townId: 'rumor-seq-town',
          kind: 'guild' as const,
          summary: 'Guild rumor.',
          roomsRemaining: 8,
          severity: 2,
        },
        {
          id: 'rumor:some-world-event',
          townId: 'rumor-seq-town',
          kind: 'weird' as const,
          summary: 'Seeded from a world event.',
          roomsRemaining: 12,
          severity: 1,
        },
      ],
    };
    const next = applyTownCrime(town, {
      kind: 'theft',
      witnessed: true,
      severity: 1,
      roomId: '0,0,0',
    });
    expect(next.rumors[0]?.id).toBe('rumor-rumor-seq-town-1');
  });
});
