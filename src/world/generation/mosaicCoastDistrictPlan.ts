import type { RoomArchetypeId } from './types.js';

export type MosaicCoastDistrictZone =
  | 'mosaic-arrival'
  | 'old-town-alley'
  | 'sun-plaza'
  | 'orange-grove-courtyard'
  | 'awning-alley'
  | 'tapas-courtyard'
  | 'ruined-stucco-block'
  | 'fountain-court'
  | 'gaudi-park-approach'
  | 'el-drac-arena';

export interface MosaicCoastDistrictRoomPlan {
  roomId: string;
  zone: MosaicCoastDistrictZone;
  archetypeId: RoomArchetypeId;
  coolingRequired: boolean;
  gaudiAccent: boolean;
}

const STARTER_PLAN: Readonly<Record<string, MosaicCoastDistrictZone>> = {
  '-4,-9,0': 'mosaic-arrival',
  '-3,-9,0': 'awning-alley',
  '-2,-9,0': 'old-town-alley',
  '-1,-9,0': 'mosaic-arrival',
  '0,-9,0': 'mosaic-arrival',
  '1,-9,0': 'sun-plaza',
  '2,-9,0': 'fountain-court',
  '-4,-10,0': 'orange-grove-courtyard',
  '-3,-10,0': 'old-town-alley',
  '-2,-10,0': 'sun-plaza',
  '-1,-10,0': 'tapas-courtyard',
  '0,-10,0': 'tapas-courtyard',
  '1,-10,0': 'fountain-court',
  '2,-10,0': 'gaudi-park-approach',
  '-4,-11,0': 'ruined-stucco-block',
  '-3,-11,0': 'ruined-stucco-block',
  '-2,-11,0': 'orange-grove-courtyard',
  '-1,-11,0': 'fountain-court',
  '0,-11,0': 'gaudi-park-approach',
  '1,-11,0': 'gaudi-park-approach',
  '2,-11,0': 'el-drac-arena',
};

const ARCHETYPE_BY_ZONE: Readonly<Record<MosaicCoastDistrictZone, RoomArchetypeId>> = {
  'mosaic-arrival': 'mosaic-arrival',
  'old-town-alley': 'old-town-alley',
  'sun-plaza': 'sun-plaza',
  'orange-grove-courtyard': 'orange-grove-courtyard',
  'awning-alley': 'awning-alley',
  'tapas-courtyard': 'tapas-crawl-room',
  'ruined-stucco-block': 'ruined-stucco-block',
  'fountain-court': 'fountain-court',
  'gaudi-park-approach': 'gaudi-park-approach',
  'el-drac-arena': 'el-drac-arena',
};

export function getMosaicCoastDistrictPlan(roomId: string): MosaicCoastDistrictRoomPlan {
  const zone = STARTER_PLAN[roomId] ?? fallbackZone(roomId);
  return {
    roomId,
    zone,
    archetypeId: ARCHETYPE_BY_ZONE[zone],
    coolingRequired: zone !== 'gaudi-park-approach',
    gaudiAccent: zone === 'gaudi-park-approach' || zone === 'el-drac-arena',
  };
}

export function getMosaicCoastStarterZone(roomId: string): MosaicCoastDistrictZone | undefined {
  return STARTER_PLAN[roomId];
}

export function getMosaicCoastStarterPlan(): Readonly<Record<string, MosaicCoastDistrictZone>> {
  return STARTER_PLAN;
}

function fallbackZone(roomId: string): MosaicCoastDistrictZone {
  const [x = 0, y = 0] = roomId.split(',').map(Number);
  if (y <= -11 && x >= 0) {
    return 'gaudi-park-approach';
  }
  if (y <= -11) {
    return 'ruined-stucco-block';
  }
  if (y <= -10) {
    return Math.abs(x) % 2 === 0 ? 'fountain-court' : 'old-town-alley';
  }
  return Math.abs(x) % 2 === 0 ? 'mosaic-arrival' : 'awning-alley';
}
