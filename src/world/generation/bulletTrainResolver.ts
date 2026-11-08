import type { GridConfig } from '../../config/gameConfig.js';
import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';
import { TransitStationResolver, type TransitStationResolverConfig } from '../transitShared.js';

const JADE_PEAK_CONFIG: TransitStationResolverConfig = {
  idPrefix: 'bullet-train-region:',
  regionSize: 12,
  candidateAttempts: 8,
  destinationRadius: 10,
  destinationZRadius: 3,
  minSeparation: 3,
};

/** Resolver that pre-computes bullet train station placements and destinations. */
export class BulletTrainStructureResolver extends TransitStationResolver {
  constructor(identity: WorldGenerationIdentity, grid: GridConfig) {
    super(identity, grid, JADE_PEAK_CONFIG);
  }

  /** Register a Jade Peak room so it can be considered for stations and destinations. */
  registerJadePeakRoom(roomId: string): boolean {
    return this.registerStationableRoom(roomId);
  }

  /** Get all registered Jade Peak room IDs. */
  getJadePeakRooms(): Set<string> {
    return this.getStationableRooms();
  }

  hasJadePeakRoom(roomId: string): boolean {
    return this.hasStationableRoom(roomId);
  }
}
