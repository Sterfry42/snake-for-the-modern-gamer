import type { GridConfig } from '../../config/gameConfig.js';
import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';
import { TransitStationResolver, type TransitStationResolverConfig } from '../transitShared.js';

const COASTER_CONFIG: TransitStationResolverConfig = {
  idPrefix: 'rollercoaster-region:',
  regionSize: 16,
  candidateAttempts: 6,
  destinationRadius: 12,
  destinationZRadius: 4,
  minSeparation: 4,
};

/** Resolver that pre-computes rollercoaster station placements and destinations. */
export class RollercoasterStructureResolver extends TransitStationResolver {
  constructor(identity: WorldGenerationIdentity, grid: GridConfig) {
    super(identity, grid, COASTER_CONFIG);
  }
}
