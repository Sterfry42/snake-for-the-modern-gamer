import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../../config/gameConfig.js';
import { SeededBiomeMap } from '../biomeMap.js';
import { TransitionContractResolver } from '../transitionContracts.js';
import { createWorldGenerationIdentity } from '../worldGenerationIdentity.js';

function opposite(side: 'north' | 'south' | 'east' | 'west') {
  switch (side) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'west':
      return 'east';
    case 'east':
      return 'west';
  }
}

describe('transition contracts', () => {
  it('resolves shared edge openings identically from both rooms', () => {
    const identity = createWorldGenerationIdentity('transition-canonical');
    const biomeMap = new SeededBiomeMap(identity);
    const resolver = new TransitionContractResolver(identity, biomeMap, defaultGameConfig.grid);
    const east = resolver.resolve('24,24,0', 'east');
    const west = resolver.resolve('25,24,0', 'west');
    const south = resolver.resolve('24,24,0', 'south');
    const north = resolver.resolve('24,25,0', 'north');

    expect(east.openingCenter).toBe(west.openingCenter);
    expect(east.openingWidth).toBe(west.openingWidth);
    expect(east.passable).toBe(west.passable);
    expect(south.openingCenter).toBe(north.openingCenter);
    expect(south.openingWidth).toBe(north.openingWidth);
    expect(south.passable).toBe(north.passable);
  });

  it('returns explicit special transition kinds for authored forest and ocean boundaries', () => {
    const identity = createWorldGenerationIdentity('transition-authored');
    const biomeMap = new SeededBiomeMap(identity);
    const resolver = new TransitionContractResolver(identity, biomeMap, defaultGameConfig.grid);

    expect(resolver.resolve('5,0,0', 'east').kind).toBe('forest-threshold');
    expect(resolver.resolve('0,-11,0', 'north').kind).toBe('shoreline');
  });

  it('converts passable contracts into edge access reservations', () => {
    const identity = createWorldGenerationIdentity('transition-reservations');
    const biomeMap = new SeededBiomeMap(identity);
    const resolver = new TransitionContractResolver(identity, biomeMap, defaultGameConfig.grid);

    for (const side of ['north', 'south', 'west', 'east'] as const) {
      const contract = resolver.resolve('0,0,0', side);
      const plan = resolver.toEdgeAccessPlan(contract);

      expect(plan.side).toBe(side);
      expect(plan.open).toBe(contract.passable);
      expect(plan.openingCenter).toBe(contract.openingCenter);
      expect(plan.runupDepth).toBe(5);
      expect(opposite(side)).toBeTypeOf('string');
    }
  });
});
