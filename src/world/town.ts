import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import { createRng, type RandomGenerator } from '../core/rng.js';
import { pickNpcName } from '../npcs/npcNames.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { NpcProfile } from '../npcs/profiles.js';
import { actorIdForTownResident } from '../actors/actorFactory.js';
import {
  LAYER_ENTRANCE_TILE,
  type LayerEntrance,
  type LayerTemplateId,
  type TownDoorKind,
} from '../layers/layerTypes.js';
import type { BiomeId } from './biomes.js';
import { selectPrimaryTownMerchant, shopKindForTownRole } from './townRoles.js';
import type { RoomArea, RoomSnapshot } from './types.js';

export type WantedLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type TownMood =
  | 'normal'
  | 'marketDay'
  | 'festival'
  | 'curfew'
  | 'election'
  | 'weddingSeason'
  | 'foodShortage'
  | 'crimeWave'
  | 'funeralWeek'
  | 'plagueScare';

export type TownRoomKind =
  | 'townCenter'
  | 'outskirts'
  | 'gate'
  | 'square'
  | 'market'
  | 'marketStreet'
  | 'tavern'
  | 'tavernInterior'
  | 'residential'
  | 'residentialStreet'
  | 'backAlley'
  | 'guildHideout'
  | 'exit'
  | 'townExit';

export type TownDistrictKind = TownRoomKind;
export type TownGateKind = 'entrance' | 'exit';
export type TownGateState = 'closed' | 'open';
export type TownGateSide = 'north' | 'south' | 'east' | 'west';

export interface TownGate {
  id: string;
  townId: string;
  kind: TownGateKind;
  townRoomId: string;
  approachRoomId: string;
  side: TownGateSide;
  state: TownGateState;
  insideGuardResidentId?: string;
  outsideGuardResidentId?: string;
}

export type TownTag =
  | 'human'
  | 'safeHub'
  | 'marketTown'
  | 'frontier'
  | 'coldTown'
  | 'roadTown'
  | 'festival'
  | 'curfew'
  | 'crimeWave'
  | 'weddingSeason'
  | 'foodShortage'
  | 'funeralWeek'
  | 'plagueScare'
  | 'rich'
  | 'poor'
  | 'guarded'
  | 'guildPresence';

export type TownRoomTag =
  | 'commerce'
  | 'social'
  | 'law'
  | 'residential'
  | 'crime'
  | 'romance'
  | 'healing'
  | 'quest'
  | 'exit'
  | 'danger'
  | 'hidden';

export type TownCrimeKind =
  | 'theft'
  | 'assault'
  | 'murder'
  | 'shopRobbery'
  | 'breakIn'
  | 'refuseFine'
  | 'guildJobDiscovered'
  | 'romanticPublicMurder'
  | 'biteGuard'
  | 'curfewViolation'
  | 'fakePermit';

export type TownShopKind =
  | 'general'
  | 'equipment'
  | 'potion'
  | 'butcher'
  | 'cards'
  | 'food'
  | 'florist'
  | 'jeweler'
  | 'tailor'
  | 'scribe'
  | 'clinic'
  | 'blackMarket';

export interface TownRoomNode {
  id: string;
  townId: string;
  kind: TownRoomKind;
  displayName: string;
  connections: string[];
  tags: TownRoomTag[];
  npcSlots: number;
  shopSlots: number;
  eventSlots: number;
  visited: boolean;
  discovered: boolean;
  locked?: boolean;
  hidden?: boolean;
  controlledByGuild?: boolean;
  guarded?: boolean;
}

export interface ThievesGuildState {
  townId: string;
  discovered: boolean;
  karma: number;
  rank: 'unknown' | 'contact' | 'runner' | 'cutpurse' | 'fixer' | 'guildFriend' | 'guildEnemy';
  completedJobs: string[];
  failedJobs: string[];
  betrayedGuild: boolean;
  lastJobRoom?: number;
  activeJobId?: string;
}

export interface TownLaw {
  id: string;
  description: string;
  brokenBy:
    | 'biting'
    | 'stealing'
    | 'publicProposal'
    | 'appleTransport'
    | 'weaponDrawn'
    | 'backAlleyEntry'
    | 'curfew'
    | 'fakePermit';
  wantedDelta: number;
  reputationDelta: number;
}

export interface TownRumor {
  id: string;
  townId: string;
  kind: 'crime' | 'romance' | 'marriage' | 'divorce' | 'guild' | 'heroic' | 'weird';
  summary: string;
  roomsRemaining: number;
  severity: number;
  relatedRelationshipId?: string;
  relatedNpcId?: string;
}

export interface TownNotice {
  id: string;
  townId: string;
  kind: 'law' | 'job' | 'wanted' | 'rumor' | 'event' | 'warning';
  title: string;
  body: string;
}

export interface TownCrime {
  kind: TownCrimeKind;
  witnessed: boolean;
  severity: number;
  roomId: string;
  targetNpcId?: string;
  stolenItemId?: string;
}

export interface TownPatrolEncounter {
  id: string;
  townId: string;
  roomId: string;
  text: string;
  fine: number;
  wantedLevel: WantedLevel;
}

export type GuildJobKind = 'pickpocket' | 'houseJob' | 'smugglePackage';
export type GuildJobStatus = 'available' | 'active' | 'completed' | 'failed';

export interface ThievesGuildJob {
  id: string;
  townId: string;
  kind: GuildJobKind;
  targetRoomId: string;
  targetNpcId?: string;
  targetItemId?: string;
  status: GuildJobStatus;
  reward: {
    kind: 'currency' | 'wantedReduction' | 'guildKarma' | 'blackMarketUnlock';
    amount?: number;
  };
  wantedRisk: number;
  karmaReward: number;
  karmaPenalty: number;
  complications: Array<
    | 'targetIsLover'
    | 'targetIsShopkeeper'
    | 'guardPatrol'
    | 'rivalThief'
    | 'guildLied'
    | 'weddingRelated'
  >;
}

export interface TownResident extends Omit<NpcProfile, 'role'> {
  actorId?: string;
  x: number;
  y: number;
  role:
    | 'shopkeeper'
    | 'equipmentMerchant'
    | 'potionMaker'
    | 'butcher'
    | 'cardDealer'
    | 'bartender'
    | 'guard'
    | 'resident'
    | 'thiefContact'
    | 'thief'
    | 'scribe'
    | 'questGiver';
  homeRoomId?: string;
  workRoomId?: string;
  townId: string;
  factionId: string;
}

export interface TownResidentPresence {
  residentId: string;
  roomId: string;
  x: number;
  y: number;
  source: 'district' | 'interior' | 'gate';
  role?: TownResident['role'];
}

export type TownBuildingKind =
  | 'gatehouse'
  | 'tavern'
  | 'generalStore'
  | 'butcherShop'
  | 'potionMaker'
  | 'residentialHome'
  | 'guildAccess';

export interface TownBuilding {
  id: string;
  townId: string;
  district: TownDistrictKind;
  roomId: string;
  kind: TownBuildingKind;
  displayName: string;
  shortLabel?: string;
  interiorTitle?: string;
  doorLabel: string;
  doorKind: TownDoorKind;
  door: { x: number; y: number };
  bounds: RoomArea;
  templateId?: LayerTemplateId;
  ownerResidentId?: string;
  ownerResidentRole?: TownResident['role'];
  enterable: boolean;
  publicAccess?: boolean;
  crimeTarget?: boolean;
  hidden?: boolean;
}

export interface TownStructure {
  id: string;
  name: string;
  biomeId: BiomeId;
  seed: number;
  factionId: string;
  physicalRoomIds: string[];
  districtByRoomId: Record<string, TownDistrictKind>;
  rooms: TownRoomNode[];
  entranceRoomId: string;
  exitRoomIds: string[];
  townTags: TownTag[];
  mood: TownMood;
  prosperity: number;
  danger: number;
  wantedLevel: WantedLevel;
  suspicion?: number;
  reputation: number;
  discoveredGuild: boolean;
  thievesGuild?: ThievesGuildState;
  guildJobs: ThievesGuildJob[];
  laws: TownLaw[];
  rumors: TownRumor[];
  notices: TownNotice[];
  createdAtRoomNumber: number;
  safeArea: RoomArea;
  center: { x: number; y: number };
  lanterns: Array<{ x: number; y: number }>;
  gates: TownGate[];
  buildings: TownBuilding[];
  residents: TownResident[];
  residentPresences?: TownResidentPresence[];
  shopkeeper: TownResident;
  stampConflicts?: TownStampConflict[];
}

export interface TownStampConflict {
  source: string;
  purpose: string;
  x: number;
  y: number;
  from?: string;
  to: string;
  blocking: boolean;
}

interface TownGenOptions {
  biomeId: BiomeId;
  seed: number;
  roomNumber: number;
}

const TOWN_NAMES: Record<BiomeId, readonly string[]> = {
  'verdigris-basin': ['Brinewick', 'Reedgate', 'Mossford', 'Bellfen', 'Marrowmarket'],
  'ember-waste': ['Cinderford', 'Ashgate', 'Kilntown', 'Red Toll', 'Charwick'],
  'moonlit-parish': ['Palegate', 'Moonford', 'Lampswick', 'Silver Toll', 'Chapelmarket'],
  'sable-depths': ['Blackgate', 'Gravecrown', 'Duskford', 'Mourning Toll', 'Sepulcher Row'],
  'gloam-garden': ['Thornwick', 'Petalford', 'Gloamgate', 'Rose Toll', 'Rootmarket'],
  'elderwood-maze': ['Briarford', 'Canopy Gate', 'Oldroot', 'Green Toll', 'Mosswick'],
  'sunken-ocean': ['Pearlford', 'Foamgate', 'Saltwick', 'Tide Toll', 'Brinemarket'],
  'home-hearth': ['Hearthwick', 'Cinderhome', 'Lampford', 'Quiet Gate', 'Warmmarket'],
  'jade-peak-province': ['Jadeford', 'Mistgate', 'Cedar Toll', 'Koiwick', 'Shrinemarket'],
  'liberty-badlands': [
    'Pie Junction',
    'Bellrock',
    'Eaglegate',
    'Cactus Toll',
    'Griddleford',
    'Monument Bend',
    'Vacancy Wells',
  ],
  rainforest: ['Canopyford', 'Vinegate', 'Rain Toll', 'Frogwick', 'Greenmarket'],
  'wintergreen-forest': ['Pineford', 'Frostgate', 'Needle Toll', 'Snowwick', 'Wintermarket'],
  'warm-coast': ['Coralford', 'Palmsgate', 'Lagoon Toll', 'Sunwick', 'Shellmarket'],
  'frozen-sea': ['Iceford', 'Floegate', 'Sealight Toll', 'Snowbrine', 'Glaciermarket'],
  'ember-caverns': ['Coalgate', 'Cinderdeep', 'Magma Toll', 'Glowwick', 'Kilnmarket'],
  'fungal-grotto': ['Sporeford', 'Mushgate', 'Glowcap Toll', 'Mycelwick', 'Grotmarket'],
  'root-buried-tunnels': ['Rootford', 'Loamgate', 'Underbough Toll', 'Taproot', 'Burrowmarket'],
  'ash-steppe': ['Ashford', 'Dustgate', 'Soot Toll', 'Greywick', 'Steppe Market'],
  'neon-underpass': ['Neon Row', 'Tube Gate', 'Hotwire Toll', 'Glowford', 'Underpass Market'],
  'glass-desert': ['Prismford', 'Mirrorgate', 'Shard Toll', 'Sunspike', 'Glassmarket'],
  'titan-ribcage': ['Ribford', 'Marrowgate', 'Bone Toll', 'Ossuary Row', 'Titanmarket'],
  'radioactive-orchard': ['Glowbranch', 'Radgate', 'Isotope Toll', 'Greenflash', 'Orchardmarket'],
  'clockwork-quarry': ['Gearford', 'Brassgate', 'Cog Toll', 'Quarrywick', 'Pendulummarket'],
  'provence-valley': ['Lavendelford', 'Vinegate', 'Baguette Toll', 'Rosswick', 'Chardmarket'],
};

const PORTRAITS = ['sage-1', 'sage-2', 'sage-3'] as const;
const BANDIT_PORTRAITS = ['bandit-neutral', 'bandit-hostile'] as const;

const ROOM_BLUEPRINTS: Array<{
  kind: TownRoomKind;
  displayName: string;
  tags: TownRoomTag[];
  npcSlots: number;
  shopSlots: number;
  eventSlots: number;
  hidden?: boolean;
  guarded?: boolean;
}> = [
  {
    kind: 'outskirts',
    displayName: 'Outskirts',
    tags: ['social'],
    npcSlots: 1,
    shopSlots: 0,
    eventSlots: 1,
  },
  {
    kind: 'gate',
    displayName: 'Town Gate',
    tags: ['law'],
    npcSlots: 1,
    shopSlots: 0,
    eventSlots: 1,
    guarded: true,
  },
  {
    kind: 'square',
    displayName: 'Town Square',
    tags: ['social', 'law', 'quest'],
    npcSlots: 2,
    shopSlots: 0,
    eventSlots: 2,
  },
  {
    kind: 'market',
    displayName: 'Market',
    tags: ['commerce', 'social', 'romance'],
    npcSlots: 2,
    shopSlots: 4,
    eventSlots: 2,
  },
  {
    kind: 'tavern',
    displayName: 'Tavern',
    tags: ['social', 'romance', 'quest'],
    npcSlots: 2,
    shopSlots: 1,
    eventSlots: 2,
  },
  {
    kind: 'residential',
    displayName: 'Residential District',
    tags: ['residential', 'romance'],
    npcSlots: 2,
    shopSlots: 0,
    eventSlots: 2,
  },
  {
    kind: 'backAlley',
    displayName: 'Back Alley',
    tags: ['crime', 'danger', 'hidden'],
    npcSlots: 1,
    shopSlots: 0,
    eventSlots: 2,
  },
  {
    kind: 'guildHideout',
    displayName: 'Thieves Guild',
    tags: ['crime', 'quest', 'hidden'],
    npcSlots: 1,
    shopSlots: 1,
    eventSlots: 3,
    hidden: true,
  },
  {
    kind: 'exit',
    displayName: 'Back Road Exit',
    tags: ['exit'],
    npcSlots: 0,
    shopSlots: 0,
    eventSlots: 1,
  },
];

const DISTRICT_DISPLAY_NAMES: Record<TownDistrictKind, string> = {
  townCenter: 'Town Center',
  outskirts: 'Outskirts',
  gate: 'Town Gate',
  square: 'Town Square',
  market: 'Market Street',
  marketStreet: 'Market Street',
  tavern: 'Tavern',
  tavernInterior: 'Tavern',
  residential: 'Residential Street',
  residentialStreet: 'Residential Street',
  backAlley: 'Back Alley',
  guildHideout: 'Thieves Guild',
  exit: 'Town Exit',
  townExit: 'Town Exit',
};

export const PHYSICAL_TOWN_DISTRICTS: readonly TownDistrictKind[] = [
  'townCenter',
  'marketStreet',
  'residentialStreet',
  'backAlley',
] as const;

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
}

const IMPORTANT_TOWN_TILES = new Set(['G', 'Y', 'v', 't', 'd', 'h', 'j', 'u', 'U', 'x', 'o']);
const BLOCKING_TOWN_TILES = new Set(['#', '~', 'h', 'u', 'x']);

export function isBlockingTownTile(tile: string | undefined): boolean {
  return Boolean(tile && BLOCKING_TOWN_TILES.has(tile));
}

export function townResidentPresences(town: TownStructure, roomId: string): TownResidentPresence[] {
  return (town.residentPresences ?? []).filter((presence) => presence.roomId === roomId);
}

export function townResidentsForRoom(town: TownStructure, roomId: string): TownResident[] {
  const presences = townResidentPresences(town, roomId);
  if (presences.length === 0 && town.residentPresences !== undefined) return [];
  if (presences.length === 0) {
    return town.residents.filter(
      (resident) => resident.homeRoomId === roomId || resident.workRoomId === roomId,
    );
  }
  const byId = new Map(town.residents.map((resident) => [resident.id, resident]));
  return presences.flatMap((presence) => {
    const resident = byId.get(presence.residentId);
    return resident
      ? [
          {
            ...resident,
            x: presence.x,
            y: presence.y,
            workRoomId: presence.roomId,
          },
        ]
      : [];
  });
}

class TownRoomBuildContext {
  readonly conflicts: TownStampConflict[] = [];

  constructor(private readonly layout: string[][]) {}

  stamp(args: {
    x: number;
    y: number;
    tile: string;
    source: string;
    purpose: string;
    blocking?: boolean;
    overwriteImportant?: boolean;
  }): void {
    const existing = this.layout[args.y]?.[args.x];
    if (existing === undefined) return;
    if (
      existing !== args.tile &&
      IMPORTANT_TOWN_TILES.has(existing) &&
      args.overwriteImportant !== true
    ) {
      this.conflicts.push({
        source: args.source,
        purpose: args.purpose,
        x: args.x,
        y: args.y,
        from: existing,
        to: args.tile,
        blocking: Boolean(args.blocking),
      });
      return;
    }
    this.layout[args.y]![args.x] = args.tile;
  }
}

function fillRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  ch: string,
): void {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      setChar(layout, x, y, ch);
    }
  }
}

function canPlaceRect(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      if (layout[y]?.[x] !== '.') return false;
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
    }
  }
  return true;
}

function roomId(townId: string, kind: TownRoomKind): string {
  return `${townId}:${kind}`;
}

function parseCoordinateRoomId(id: string): { x: number; y: number; z: number } | null {
  const [x, y, z = 0] = id.split(',').map(Number);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
}

function roomIdOnSide(roomIdValue: string, side: TownGateSide): string {
  const coord = parseCoordinateRoomId(roomIdValue);
  if (!coord) return roomIdValue;
  switch (side) {
    case 'north':
      return `${coord.x},${coord.y - 1},${coord.z}`;
    case 'south':
      return `${coord.x},${coord.y + 1},${coord.z}`;
    case 'east':
      return `${coord.x + 1},${coord.y},${coord.z}`;
    case 'west':
      return `${coord.x - 1},${coord.y},${coord.z}`;
  }
}

function oppositeGateSide(side: TownGateSide): TownGateSide {
  switch (side) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'east':
      return 'west';
    case 'west':
      return 'east';
  }
}

function exteriorSideForRoom(
  roomIdValue: string,
  districtRoomIds: Record<string, TownDistrictKind>,
): TownGateSide | null {
  const coord = parseCoordinateRoomId(roomIdValue);
  if (!coord) return null;
  const neighbors: Array<{ side: TownGateSide; id: string }> = [
    { side: 'north', id: `${coord.x},${coord.y - 1},${coord.z}` },
    { side: 'south', id: `${coord.x},${coord.y + 1},${coord.z}` },
    { side: 'east', id: `${coord.x + 1},${coord.y},${coord.z}` },
    { side: 'west', id: `${coord.x - 1},${coord.y},${coord.z}` },
  ];
  return neighbors.find((neighbor) => !districtRoomIds[neighbor.id])?.side ?? null;
}

function connect(rooms: TownRoomNode[], from: TownRoomKind, to: TownRoomKind): void {
  const a = rooms.find((room) => room.kind === from);
  const b = rooms.find((room) => room.kind === to);
  if (!a || !b) return;
  if (!a.connections.includes(b.id)) a.connections.push(b.id);
  if (!b.connections.includes(a.id)) b.connections.push(a.id);
}

function pick<T>(items: readonly T[], rng: RandomGenerator): T {
  return items[Math.floor(rng() * items.length)] ?? items[0]!;
}

function rollInt(rng: RandomGenerator, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampWanted(value: number): WantedLevel {
  return clamp(Math.floor(value), 0, 5) as WantedLevel;
}

export function getTownRoom(town: TownStructure, roomId: string): TownRoomNode | undefined {
  return town.rooms.find((room) => room.id === roomId);
}

export function generateHumanTown(options: TownGenOptions): TownStructure {
  const rng = createRng(`human-town:${options.biomeId}:${options.seed}`);
  const townId = `town-${options.seed.toString(36)}`;
  const name = pick(TOWN_NAMES[options.biomeId], rng);
  const mood = pick<TownMood>(
    ['normal', 'marketDay', 'festival', 'curfew', 'weddingSeason', 'foodShortage', 'crimeWave'],
    rng,
  );
  const rooms = ROOM_BLUEPRINTS.map((blueprint) => ({
    id: roomId(townId, blueprint.kind),
    townId,
    kind: blueprint.kind,
    displayName: blueprint.displayName,
    connections: [],
    tags: [...blueprint.tags],
    npcSlots: blueprint.npcSlots,
    shopSlots: blueprint.shopSlots,
    eventSlots: blueprint.eventSlots,
    visited: blueprint.kind === 'outskirts',
    discovered: blueprint.kind !== 'guildHideout',
    hidden: blueprint.hidden,
    controlledByGuild: blueprint.kind === 'guildHideout',
    guarded: blueprint.guarded,
  }));

  connect(rooms, 'outskirts', 'gate');
  connect(rooms, 'gate', 'square');
  connect(rooms, 'square', 'market');
  connect(rooms, 'square', 'tavern');
  connect(rooms, 'square', 'residential');
  connect(rooms, 'tavern', 'backAlley');
  connect(rooms, 'backAlley', 'exit');

  const laws = rollTownLaws(townId, mood, rng);
  const prosperity = rollInt(rng, 35, 88);
  const danger = mood === 'crimeWave' ? rollInt(rng, 45, 80) : rollInt(rng, 12, 58);
  const tags: TownTag[] = ['human', 'safeHub', 'marketTown', 'roadTown'];
  if (mood === 'festival') tags.push('festival');
  if (mood === 'curfew') tags.push('curfew', 'guarded');
  if (mood === 'crimeWave') tags.push('crimeWave', 'guildPresence');
  if (mood === 'weddingSeason') tags.push('weddingSeason');
  if (mood === 'foodShortage') tags.push('foodShortage');
  if (prosperity >= 70) tags.push('rich');
  if (prosperity <= 42) tags.push('poor');

  return {
    id: townId,
    name,
    biomeId: options.biomeId,
    seed: options.seed,
    factionId: 'human-town',
    physicalRoomIds: [],
    districtByRoomId: {},
    rooms,
    entranceRoomId: roomId(townId, 'outskirts'),
    exitRoomIds: [roomId(townId, 'exit')],
    townTags: tags,
    mood,
    prosperity,
    danger,
    wantedLevel: 0,
    suspicion: 0,
    reputation: 0,
    discoveredGuild: false,
    thievesGuild: {
      townId,
      discovered: false,
      karma: 0,
      rank: 'unknown',
      completedJobs: [],
      failedJobs: [],
      betrayedGuild: false,
    },
    guildJobs: createGuildJobs(townId, rooms),
    laws,
    rumors: [],
    notices: generateTownNotices(townId, name, mood, laws),
    createdAtRoomNumber: options.roomNumber,
    safeArea: { left: 0, top: 0, width: 0, height: 0 },
    center: { x: 0, y: 0 },
    lanterns: [],
    gates: [],
    buildings: [],
    residents: [],
    shopkeeper: {
      ...buildHouseNpcProfile('Town Clerk', 'sage-1'),
      actorId: `town:${townId}:shopkeeper:npc-town-clerk`,
      x: 0,
      y: 0,
      role: 'shopkeeper',
      townId,
      factionId: 'human-town',
    },
  };
}

export function createPhysicalHumanTown(args: {
  biomeId: BiomeId;
  seed: number;
  townId: string;
  roomNumber?: number;
  districtRoomIds: Record<string, TownDistrictKind>;
  entranceRoomId: string;
  exitRoomIds: string[];
  entranceGateSide?: TownGateSide;
  exitGateSides?: TownGateSide[];
}): TownStructure {
  const rng = createRng(`physical-human-town:${args.townId}:${args.seed}`);
  const town = generateHumanTown({
    biomeId: args.biomeId,
    seed: args.seed,
    roomNumber: args.roomNumber ?? 0,
  });
  town.id = args.townId;
  town.physicalRoomIds = Object.keys(args.districtRoomIds);
  town.districtByRoomId = { ...args.districtRoomIds };
  town.entranceRoomId = args.entranceRoomId;
  town.exitRoomIds = [...args.exitRoomIds];
  town.gates = createDefaultTownGates({
    townId: town.id,
    districtRoomIds: args.districtRoomIds,
    entranceRoomId: args.entranceRoomId,
    exitRoomIds: args.exitRoomIds,
    entranceGateSide: args.entranceGateSide,
    exitGateSides: args.exitGateSides,
  });
  town.rooms = town.rooms.map((room) => ({ ...room, townId: args.townId }));
  town.thievesGuild = town.thievesGuild ? { ...town.thievesGuild, townId: args.townId } : undefined;
  town.guildJobs = town.guildJobs.map((job) => ({ ...job, townId: args.townId }));
  town.laws = town.laws.map((law) => ({ ...law, townId: args.townId }));
  town.notices = town.notices.map((notice) => ({ ...notice, townId: args.townId }));
  const roomFor = (district: TownDistrictKind): string => {
    const candidates = districtPhysicalCandidates(district);
    return (
      Object.entries(args.districtRoomIds).find(([, kind]) => candidates.includes(kind))?.[0] ??
      args.entranceRoomId
    );
  };
  const residentSpots = [
    {
      role: 'equipmentMerchant' as const,
      name: pickNpcName('merchant', rng),
      workDistrict: 'marketStreet' as const,
    },
    {
      role: 'potionMaker' as const,
      name: pickNpcName('scribe', rng),
      workDistrict: 'marketStreet' as const,
    },
    {
      role: 'butcher' as const,
      name: pickNpcName('keeper', rng),
      workDistrict: 'marketStreet' as const,
    },
    {
      role: 'bartender' as const,
      name: pickNpcName('keeper', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'cardDealer' as const,
      name: pickNpcName('thief', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'questGiver' as const,
      name: pickNpcName('wanderer', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'guard' as const,
      name: pickNpcName('guard', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'guard' as const,
      name: pickNpcName('guard', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'guard' as const,
      name: pickNpcName('guard', rng),
      workDistrict: 'townCenter' as const,
    },
    { role: 'guard' as const, name: pickNpcName('guard', rng), workDistrict: 'backAlley' as const },
    {
      role: 'scribe' as const,
      name: pickNpcName('scribe', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'marketStreet' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'marketStreet' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'townCenter' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'residentialStreet' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'residentialStreet' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'residentialStreet' as const,
    },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'residentialStreet' as const,
    },
    {
      role: 'thiefContact' as const,
      name: pickNpcName('thief', rng),
      workDistrict: 'backAlley' as const,
    },
    { role: 'thief' as const, name: pickNpcName('thief', rng), workDistrict: 'backAlley' as const },
  ];
  const usedNames = new Map<string, number>();
  const uniqueResidentSpots = residentSpots.map((spot) => {
    const count = usedNames.get(spot.name) ?? 0;
    usedNames.set(spot.name, count + 1);
    return {
      ...spot,
      name: count === 0 ? spot.name : `${spot.name} ${count + 1}`,
    };
  });
  town.residents = uniqueResidentSpots.map((spot, index) => ({
    ...buildHouseNpcProfile(
      spot.name,
      spot.role === 'thief' || spot.role === 'thiefContact' || spot.role === 'cardDealer'
        ? pick(BANDIT_PORTRAITS, rng)
        : pick(PORTRAITS, rng),
    ),
    actorId: actorIdForTownResident(
      town.id,
      `${town.id}:resident:${spot.role}:${index}`,
      spot.role,
    ),
    x: 0,
    y: 0,
    role: spot.role,
    townId: town.id,
    factionId:
      spot.role === 'thiefContact' || spot.role === 'thief' ? 'thieves-guild' : 'human-town',
    homeRoomId: roomFor(
      spot.role === 'resident'
        ? 'residentialStreet'
        : spot.role === 'questGiver' || spot.role === 'bartender' || spot.role === 'cardDealer'
          ? 'townCenter'
          : spot.role === 'equipmentMerchant' ||
              spot.role === 'potionMaker' ||
              spot.role === 'butcher'
            ? 'marketStreet'
            : 'townCenter',
    ),
    workRoomId: roomFor(spot.workDistrict),
    id: `${town.id}:resident:${spot.role}:${index}`,
  }));
  assignTownGateGuards(town, rng);
  town.buildings = createTownBuildings(town, roomFor);
  town.shopkeeper = selectPrimaryTownMerchant(town.residents, town.shopkeeper);
  return town;
}

function createDefaultTownGates(args: {
  townId: string;
  districtRoomIds: Record<string, TownDistrictKind>;
  entranceRoomId: string;
  exitRoomIds: string[];
  entranceGateSide?: TownGateSide;
  exitGateSides?: TownGateSide[];
}): TownGate[] {
  const entranceSide =
    args.entranceGateSide ?? exteriorSideForRoom(args.entranceRoomId, args.districtRoomIds);
  const gates: TownGate[] = [];
  if (entranceSide) {
    gates.push({
      id: `${args.townId}:gate:entrance`,
      townId: args.townId,
      kind: 'entrance',
      townRoomId: args.entranceRoomId,
      approachRoomId: roomIdOnSide(args.entranceRoomId, entranceSide),
      side: entranceSide,
      state: 'closed',
    });
  }
  for (const [index, exitRoomId] of args.exitRoomIds.entries()) {
    const side =
      args.exitGateSides?.[index] ?? exteriorSideForRoom(exitRoomId, args.districtRoomIds);
    if (!side) continue;
    gates.push({
      id: `${args.townId}:gate:exit:${index}`,
      townId: args.townId,
      kind: 'exit',
      townRoomId: exitRoomId,
      approachRoomId: roomIdOnSide(exitRoomId, side),
      side,
      state: 'closed',
    });
  }
  return gates;
}

function assignTownGateGuards(town: TownStructure, rng: RandomGenerator): void {
  const takeGuard = (gate: TownGate, side: 'inside' | 'outside'): TownResident => {
    const resident: TownResident = {
      ...buildHouseNpcProfile(pickNpcName('guard', rng), pick(PORTRAITS, rng)),
      id: `${town.id}:resident:guard:gate:${gate.kind}:${side}`,
      actorId: actorIdForTownResident(
        town.id,
        `${town.id}:resident:guard:gate:${gate.kind}:${side}`,
        'guard',
      ),
      x: 0,
      y: 0,
      role: 'guard',
      townId: town.id,
      factionId: 'human-town',
      homeRoomId: gate.townRoomId,
      workRoomId: side === 'inside' ? gate.townRoomId : gate.approachRoomId,
    };
    town.residents = [...town.residents, resident];
    return resident;
  };
  town.gates = town.gates.map((gate) => {
    const inside = takeGuard(gate, 'inside');
    const outside = gate.kind === 'entrance' ? takeGuard(gate, 'outside') : undefined;
    return {
      ...gate,
      insideGuardResidentId: inside.id,
      outsideGuardResidentId: outside?.id,
    };
  });
  town.residents = town.residents.map((resident) => {
    const insideGate = town.gates.find((gate) => gate.insideGuardResidentId === resident.id);
    const outsideGate = town.gates.find((gate) => gate.outsideGuardResidentId === resident.id);
    if (insideGate) {
      return { ...resident, homeRoomId: insideGate.townRoomId, workRoomId: insideGate.townRoomId };
    }
    if (outsideGate) {
      return {
        ...resident,
        homeRoomId: outsideGate.townRoomId,
        workRoomId: outsideGate.approachRoomId,
      };
    }
    return resident;
  });
}

function createTownBuildings(
  town: TownStructure,
  roomFor: (district: TownDistrictKind) => string,
): TownBuilding[] {
  const centerRoom = roomFor('townCenter');
  const marketRoom = roomFor('marketStreet');
  const residentialRoom = roomFor('residentialStreet');
  const alleyRoom = roomFor('backAlley');
  const ownerIdFor = (role: TownResident['role']): string | undefined =>
    town.residents.find((resident) => resident.role === role)?.id;
  return [
    {
      id: `${town.id}:building:gatehouse`,
      townId: town.id,
      district: 'townCenter',
      roomId: centerRoom,
      kind: 'gatehouse',
      displayName: `${town.name} Gatehouse`,
      shortLabel: 'Gatehouse',
      doorLabel: 'Gatehouse',
      doorKind: 'gateBarrierClosed',
      door: { x: 16, y: 12 },
      bounds: { left: 1, top: 1, width: 30, height: 22 },
      enterable: false,
      publicAccess: false,
    },
    {
      id: `${town.id}:building:tavern`,
      townId: town.id,
      district: 'townCenter',
      roomId: centerRoom,
      kind: 'tavern',
      displayName: `The Copper Ladle`,
      shortLabel: 'Tavern',
      interiorTitle: `The Copper Ladle Tavern`,
      doorLabel: 'Enter The Copper Ladle',
      doorKind: 'tavernDoor',
      door: { x: 9, y: 10 },
      bounds: { left: 4, top: 4, width: 11, height: 7 },
      templateId: 'tavern',
      ownerResidentId: ownerIdFor('bartender'),
      ownerResidentRole: 'bartender',
      enterable: true,
      publicAccess: true,
    },
    {
      id: `${town.id}:building:general-store`,
      townId: town.id,
      district: 'marketStreet',
      roomId: marketRoom,
      kind: 'generalStore',
      displayName: `${town.name} General Store`,
      shortLabel: 'General Store',
      interiorTitle: `${town.name} General Store`,
      doorLabel: 'Enter General Store',
      doorKind: 'shopDoorClosed',
      door: { x: 6, y: 9 },
      bounds: { left: 3, top: 4, width: 8, height: 6 },
      templateId: 'generalStore',
      ownerResidentId: ownerIdFor('equipmentMerchant') ?? ownerIdFor('shopkeeper'),
      ownerResidentRole: 'equipmentMerchant',
      enterable: true,
      publicAccess: true,
      crimeTarget: true,
    },
    {
      id: `${town.id}:building:butcher`,
      townId: town.id,
      district: 'marketStreet',
      roomId: marketRoom,
      kind: 'butcherShop',
      displayName: `${town.name} Butcher`,
      shortLabel: 'Butcher Shop',
      interiorTitle: `${town.name} Butcher`,
      doorLabel: 'Enter Butcher Shop',
      doorKind: 'shopDoorClosed',
      door: { x: 16, y: 8 },
      bounds: { left: 12, top: 3, width: 9, height: 6 },
      templateId: 'butcherShop',
      ownerResidentId: ownerIdFor('butcher'),
      ownerResidentRole: 'butcher',
      enterable: true,
      publicAccess: true,
      crimeTarget: true,
    },
    {
      id: `${town.id}:building:potion-maker`,
      townId: town.id,
      district: 'marketStreet',
      roomId: marketRoom,
      kind: 'potionMaker',
      displayName: `${town.name} Potion Maker`,
      shortLabel: 'Potion Maker',
      interiorTitle: `${town.name} Potion Maker`,
      doorLabel: 'Enter Potion Maker',
      doorKind: 'shopDoorClosed',
      door: { x: 25, y: 9 },
      bounds: { left: 21, top: 4, width: 8, height: 6 },
      templateId: 'potionMaker',
      ownerResidentId: ownerIdFor('potionMaker'),
      ownerResidentRole: 'potionMaker',
      enterable: true,
      publicAccess: true,
      crimeTarget: true,
    },
    {
      id: `${town.id}:building:home`,
      townId: town.id,
      district: 'residentialStreet',
      roomId: residentialRoom,
      kind: 'residentialHome',
      displayName: 'Locked Residence',
      shortLabel: 'Residence',
      interiorTitle: 'Town Home',
      doorLabel: 'Open Locked Residence',
      doorKind: 'homeDoorClosed',
      door: { x: 6, y: 9 },
      bounds: { left: 3, top: 5, width: 7, height: 5 },
      templateId: 'residentialHome',
      ownerResidentId: ownerIdFor('resident'),
      ownerResidentRole: 'resident',
      enterable: true,
      publicAccess: false,
      crimeTarget: true,
    },
    {
      id: `${town.id}:building:guild-grate`,
      townId: town.id,
      district: 'backAlley',
      roomId: alleyRoom,
      kind: 'guildAccess',
      displayName: 'Thieves Guild Grate',
      shortLabel: town.discoveredGuild ? 'Thieves Guild' : 'Old Drain',
      interiorTitle: 'Thieves Guild',
      doorLabel: town.discoveredGuild ? 'Enter Thieves Guild' : 'Inspect old grate',
      doorKind: town.discoveredGuild ? 'guildGrateOpen' : 'guildGrateClosed',
      door: { x: 11, y: 12 },
      bounds: { left: 8, top: 8, width: 16, height: 8 },
      templateId: 'thievesGuild',
      ownerResidentId: ownerIdFor('thiefContact'),
      ownerResidentRole: 'thiefContact',
      enterable: true,
      publicAccess: town.discoveredGuild,
      hidden: !town.discoveredGuild,
    },
  ];
}

export function townShopKindForResidentRole(role: string): TownShopKind | undefined {
  return shopKindForTownRole(role);
}

export function townDistrictDisplayName(kind: TownDistrictKind): string {
  return DISTRICT_DISPLAY_NAMES[kind];
}

export function getTownDistrictForRoom(
  town: TownStructure,
  roomId: string,
): TownDistrictKind | undefined {
  return town.districtByRoomId[roomId];
}

export function cloneTownForRoom(
  town: TownStructure,
  roomId: string,
  districtKind: TownDistrictKind,
): TownStructure {
  const next = cloneTown(town);
  next.districtByRoomId = { ...next.districtByRoomId, [roomId]: districtKind };
  if (!next.physicalRoomIds.includes(roomId)) {
    next.physicalRoomIds = [...next.physicalRoomIds, roomId];
  }
  return next;
}

export function applyTownCrime(town: TownStructure, crime: TownCrime): TownStructure {
  const wantedDelta = getWantedDelta(crime);
  const reputationDelta = getReputationDelta(crime);
  const next = cloneTown(town);
  next.wantedLevel = clampWanted(next.wantedLevel + wantedDelta);
  next.reputation = clamp(next.reputation + reputationDelta, -100, 100);
  next.suspicion = clamp(
    (next.suspicion ?? 0) + crime.severity * (crime.witnessed ? 12 : 3),
    0,
    100,
  );
  next.rumors = [rumorFromCrime(next, crime), ...next.rumors].slice(0, 8);
  if (crime.kind === 'guildJobDiscovered' && next.thievesGuild) {
    next.thievesGuild.karma = clamp(next.thievesGuild.karma - 5, -100, 100);
  }
  return next;
}

export function maybeTriggerPatrol(
  town: TownStructure,
  from: TownRoomNode,
  to: TownRoomNode,
  rng: RandomGenerator,
): TownPatrolEncounter | undefined {
  if (town.wantedLevel < 2) {
    return undefined;
  }
  const chance = getPatrolChance(town.wantedLevel, to.kind, town.thievesGuild?.karma ?? 0);
  if (rng() >= chance) {
    return undefined;
  }
  const text =
    from.kind === 'backAlley'
      ? 'A whistle cuts through the alley fog. The patrol was waiting at the wrong door until now.'
      : 'A town patrol blocks your path and asks why the wanted poster is shaped exactly like you.';
  return {
    id: `patrol-${town.id}-${Date.now()}`,
    townId: town.id,
    roomId: to.id,
    text,
    fine: 8 + town.wantedLevel * 7,
    wantedLevel: town.wantedLevel,
  };
}

export function getPatrolChance(
  wantedLevel: WantedLevel,
  roomKind: TownRoomKind,
  guildKarma: number,
): number {
  let chance = wantedLevel * 0.08;
  if (roomKind === 'square' || roomKind === 'gate') chance += 0.08;
  if (roomKind === 'backAlley') chance -= 0.06;
  if (guildKarma >= 50) chance -= 0.05;
  return clamp(chance, 0, 0.75);
}

export function discoverThievesGuild(town: TownStructure): TownStructure {
  const next = cloneTown(town);
  next.discoveredGuild = true;
  next.thievesGuild = {
    ...(next.thievesGuild ?? {
      townId: next.id,
      karma: 0,
      rank: 'unknown',
      completedJobs: [],
      failedJobs: [],
      betrayedGuild: false,
    }),
    discovered: true,
    rank:
      next.thievesGuild?.rank === 'unknown' ? 'contact' : (next.thievesGuild?.rank ?? 'contact'),
  };
  next.rooms = next.rooms.map((room) =>
    room.kind === 'guildHideout' ? { ...room, discovered: true, hidden: false } : room,
  );
  next.rumors = [
    {
      id: `rumor-${next.id}-guild-${next.rumors.length}`,
      townId: next.id,
      kind: 'guild' as const,
      summary: 'A chalk mark near the drain shows a snake biting a coin.',
      roomsRemaining: 8,
      severity: 2,
    },
    ...next.rumors,
  ].slice(0, 8);
  return next;
}

export function reduceWantedViaGuild(town: TownStructure): {
  town: TownStructure;
  message: string;
  cost: number;
} {
  const next = cloneTown(town);
  const guild = next.thievesGuild;
  if (!guild?.discovered) {
    return { town: next, message: 'No one answers the cellar door.', cost: 0 };
  }
  if (guild.karma < -20) {
    next.wantedLevel = clampWanted(next.wantedLevel + 1);
    return { town: next, message: 'They sell you out before you finish asking.', cost: 0 };
  }
  const reduction = guild.karma >= 35 ? 2 : 1;
  const cost = Math.max(6, next.wantedLevel * 10 - Math.floor(guild.karma / 6));
  next.wantedLevel = clampWanted(next.wantedLevel - reduction);
  guild.karma = clamp(guild.karma - 5, -100, 100);
  return { town: next, message: 'The guild makes the posters less accurate.', cost };
}

export function resolveGuildJob(
  town: TownStructure,
  jobId: string,
  success: boolean,
): TownStructure {
  const next = cloneTown(town);
  const guild = next.thievesGuild;
  const job = next.guildJobs.find((entry) => entry.id === jobId);
  if (!guild || !job || job.status === 'completed') {
    return next;
  }
  job.status = success ? 'completed' : 'failed';
  if (success) {
    guild.completedJobs = [...guild.completedJobs, job.id];
    guild.karma = clamp(guild.karma + job.karmaReward, -100, 100);
    if (job.reward.kind === 'wantedReduction') {
      next.wantedLevel = clampWanted(next.wantedLevel - (job.reward.amount ?? 1));
    }
  } else {
    guild.failedJobs = [...guild.failedJobs, job.id];
    guild.karma = clamp(guild.karma - job.karmaPenalty, -100, 100);
    next.wantedLevel = clampWanted(next.wantedLevel + job.wantedRisk);
  }
  guild.rank = rankForGuildKarma(guild.karma);
  return next;
}

export function cloneTown(town: TownStructure): TownStructure {
  return {
    ...town,
    rooms: town.rooms.map((room) => ({
      ...room,
      connections: [...room.connections],
      tags: [...room.tags],
    })),
    physicalRoomIds: [...town.physicalRoomIds],
    districtByRoomId: { ...town.districtByRoomId },
    townTags: [...town.townTags],
    thievesGuild: town.thievesGuild
      ? {
          ...town.thievesGuild,
          completedJobs: [...town.thievesGuild.completedJobs],
          failedJobs: [...town.thievesGuild.failedJobs],
        }
      : undefined,
    guildJobs: town.guildJobs.map((job) => ({ ...job, complications: [...job.complications] })),
    laws: town.laws.map((law) => ({ ...law })),
    rumors: town.rumors.map((rumor) => ({ ...rumor })),
    notices: town.notices.map((notice) => ({ ...notice })),
    lanterns: town.lanterns.map((lantern) => ({ ...lantern })),
    gates: (town.gates ?? []).map((gate) => ({ ...gate })),
    buildings: town.buildings.map((building) => ({
      ...building,
      door: { ...building.door },
      bounds: { ...building.bounds },
    })),
    residents: town.residents.map((resident) => ({ ...resident })),
    residentPresences: town.residentPresences?.map((presence) => ({ ...presence })),
    shopkeeper: { ...town.shopkeeper },
    stampConflicts: town.stampConflicts?.map((conflict) => ({ ...conflict })),
    safeArea: { ...town.safeArea },
    center: { ...town.center },
  };
}

function drawBuilding(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  kind: TownRoomKind,
): void {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      const border = x === left || x === left + width - 1 || y === top || y === top + height - 1;
      setChar(layout, x, y, border ? '#' : 'W');
    }
  }
  const doorX = left + Math.floor(width / 2);
  const doorY = top + height - 1;
  setChar(layout, doorX, doorY, '.');
  setChar(layout, doorX, doorY - 1, kind === 'backAlley' ? 'T' : 'S');
}

function rollTownLaws(townId: string, mood: TownMood, rng: RandomGenerator): TownLaw[] {
  const pool: TownLaw[] = [
    {
      id: `${townId}:law:no-biting`,
      description: 'No biting in the square.',
      brokenBy: 'biting',
      wantedDelta: 2,
      reputationDelta: -8,
    },
    {
      id: `${townId}:law:no-stealing`,
      description: 'Market goods must be paid for before swallowing.',
      brokenBy: 'stealing',
      wantedDelta: 1,
      reputationDelta: -4,
    },
    {
      id: `${townId}:law:proposal-permit`,
      description: 'Public proposals require a witness and a permit.',
      brokenBy: 'publicProposal',
      wantedDelta: 1,
      reputationDelta: -2,
    },
    {
      id: `${townId}:law:back-alley`,
      description: 'The Back Alley is not a shortcut. This is legal advice.',
      brokenBy: 'backAlleyEntry',
      wantedDelta: mood === 'curfew' ? 1 : 0,
      reputationDelta: -1,
    },
  ];
  const laws = [pool[0]!, pool[1]!];
  laws.push(pick(pool.slice(2), rng));
  return laws;
}

function generateTownNotices(
  townId: string,
  name: string,
  mood: TownMood,
  laws: TownLaw[],
): TownNotice[] {
  return [
    {
      id: `${townId}:notice:welcome`,
      townId,
      kind: 'event',
      title: `Welcome to ${name}`,
      body: `Town mood: ${formatTownMood(mood)}. Wanted Level: 0.`,
    },
    {
      id: `${townId}:notice:law`,
      townId,
      kind: 'law',
      title: 'Local Law',
      body: laws[0]?.description ?? 'Be polite where guards can see you.',
    },
    {
      id: `${townId}:notice:warning`,
      townId,
      kind: 'warning',
      title: 'Back Alley Warning',
      body: 'The Back Alley is not a shortcut. The handwriting below says it absolutely is.',
    },
    {
      id: `${townId}:notice:job`,
      townId,
      kind: 'job',
      title: 'Odd Jobs',
      body: 'Market pockets, residential ledgers, and gate packages are all moving today.',
    },
  ];
}

function createGuildJobs(townId: string, rooms: TownRoomNode[]): ThievesGuildJob[] {
  const room = (kind: TownRoomKind) =>
    rooms.find((entry) => entry.kind === kind)?.id ?? roomId(townId, kind);
  return [
    {
      id: `${townId}:job:pickpocket`,
      townId,
      kind: 'pickpocket',
      targetRoomId: room('market'),
      status: 'available',
      reward: { kind: 'currency', amount: 18 },
      wantedRisk: 1,
      karmaReward: 8,
      karmaPenalty: 6,
      complications: ['guardPatrol', 'targetIsShopkeeper'],
    },
    {
      id: `${townId}:job:house`,
      townId,
      kind: 'houseJob',
      targetRoomId: room('residential'),
      status: 'available',
      reward: { kind: 'wantedReduction', amount: 1 },
      wantedRisk: 2,
      karmaReward: 10,
      karmaPenalty: 8,
      complications: ['rivalThief', 'guildLied'],
    },
    {
      id: `${townId}:job:smuggle`,
      townId,
      kind: 'smugglePackage',
      targetRoomId: room('backAlley'),
      status: 'available',
      reward: { kind: 'guildKarma', amount: 12 },
      wantedRisk: 1,
      karmaReward: 12,
      karmaPenalty: 5,
      complications: ['guardPatrol', 'weddingRelated'],
    },
  ];
}

function getWantedDelta(crime: TownCrime): number {
  if (!crime.witnessed && crime.kind === 'theft') return 0;
  switch (crime.kind) {
    case 'theft':
    case 'breakIn':
    case 'refuseFine':
    case 'curfewViolation':
    case 'fakePermit':
      return 1;
    case 'shopRobbery':
    case 'assault':
    case 'biteGuard':
      return 2;
    case 'guildJobDiscovered':
      return clamp(crime.severity, 1, 3);
    case 'murder':
      return 4;
    case 'romanticPublicMurder':
      return 5;
  }
}

function getReputationDelta(crime: TownCrime): number {
  switch (crime.kind) {
    case 'theft':
      return crime.witnessed ? -2 : 0;
    case 'breakIn':
    case 'fakePermit':
      return -5;
    case 'shopRobbery':
    case 'assault':
    case 'biteGuard':
      return -12;
    case 'murder':
      return -50;
    case 'romanticPublicMurder':
      return -80;
    case 'guildJobDiscovered':
      return -8;
    case 'curfewViolation':
    case 'refuseFine':
      return -3;
  }
}

function rumorFromCrime(town: TownStructure, crime: TownCrime): TownRumor {
  const summary = crime.witnessed
    ? `The snake was seen committing ${crime.kind.replace(/([A-Z])/g, ' $1').toLowerCase()}.`
    : `Someone whispers that ${town.name} is missing something and a snake was nearby.`;
  return {
    id: `rumor-${town.id}-${town.rumors.length + 1}`,
    townId: town.id,
    kind: 'crime',
    summary,
    roomsRemaining: 10,
    severity: crime.severity,
    relatedNpcId: crime.targetNpcId,
  };
}

function rankForGuildKarma(karma: number): ThievesGuildState['rank'] {
  if (karma <= -50) return 'guildEnemy';
  if (karma >= 60) return 'guildFriend';
  if (karma >= 30) return 'fixer';
  if (karma >= 10) return 'runner';
  return 'contact';
}

export function formatTownMood(mood: TownMood): string {
  return mood.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
}

function emptyRows(grid: GridConfig, fill = '.'): string[][] {
  return Array.from({ length: grid.rows }, () => Array.from({ length: grid.cols }, () => fill));
}

function rowsToStrings(layout: string[][]): string[] {
  return layout.map((row) => row.join(''));
}

type ExitSide = 'north' | 'south' | 'east' | 'west';

export const TOWN_GATE_WIDTH = 5;
export const TOWN_GATE_DEPTH = 2;

function centeredOffsets(width: number): number[] {
  const start = -Math.floor(width / 2);
  return Array.from({ length: width }, (_, index) => start + index);
}

export function townGateFootprintCells(args: {
  side: TownGateSide;
  cols: number;
  rows: number;
}): Array<{ x: number; y: number }> {
  const centerX = Math.floor(args.cols / 2);
  const centerY = Math.floor(args.rows / 2);
  const offsets = centeredOffsets(TOWN_GATE_WIDTH);
  const cells: Array<{ x: number; y: number }> = [];
  if (args.side === 'north' || args.side === 'south') {
    const stripStartY = args.side === 'north' ? 0 : Math.max(0, args.rows - TOWN_GATE_DEPTH);
    for (let y = stripStartY; y < stripStartY + TOWN_GATE_DEPTH; y += 1) {
      for (const offset of offsets) {
        cells.push({ x: centerX + offset, y });
      }
    }
    return cells;
  }
  const stripStartX = args.side === 'west' ? 0 : Math.max(0, args.cols - TOWN_GATE_DEPTH);
  for (let x = stripStartX; x < stripStartX + TOWN_GATE_DEPTH; x += 1) {
    for (const offset of offsets) {
      cells.push({ x, y: centerY + offset });
    }
  }
  return cells;
}

function drawTownWalls(
  layout: string[][],
  openSides: readonly ExitSide[] = [],
  wallSides: readonly ExitSide[] = ['north', 'south', 'east', 'west'],
): void {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  if (rows < 8 || cols < 8) {
    return;
  }
  const open = new Set(openSides);
  const walls = new Set(wallSides);
  if (walls.has('north')) drawBoundaryWall(layout, 'north', open.has('north'));
  if (walls.has('south')) drawBoundaryWall(layout, 'south', open.has('south'));
  if (walls.has('west')) drawBoundaryWall(layout, 'west', open.has('west'));
  if (walls.has('east')) drawBoundaryWall(layout, 'east', open.has('east'));
}

function carveDoor(layout: string[][], side: ExitSide): void {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const halfWidth = 2;
  if (side === 'north' || side === 'south') {
    const runupStartY = side === 'north' ? 0 : rows - 3;
    for (let x = cx - halfWidth; x <= cx + halfWidth; x += 1) {
      for (let y = runupStartY; y < runupStartY + 3; y += 1) {
        setChar(layout, x, y, 'E');
      }
    }
    return;
  }
  const runupStartX = side === 'west' ? 0 : cols - 3;
  for (let y = cy - halfWidth; y <= cy + halfWidth; y += 1) {
    for (let x = runupStartX; x < runupStartX + 3; x += 1) {
      setChar(layout, x, y, 'E');
    }
  }
}

function drawBoundaryWall(layout: string[][], side: ExitSide, hasOpening: boolean): void {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const halfDoor = hasOpening ? 2 : -1;
  const isDoorX = (x: number) => hasOpening && Math.abs(x - cx) <= halfDoor;
  const isDoorY = (y: number) => hasOpening && Math.abs(y - cy) <= halfDoor;

  if (side === 'north' || side === 'south') {
    const startY = side === 'north' ? 0 : rows - 2;
    for (let y = startY; y < startY + 2; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        setChar(layout, x, y, isDoorX(x) ? 'E' : '#');
      }
    }
    if (hasOpening) {
      carveDoor(layout, side);
    }
    return;
  }

  const startX = side === 'west' ? 0 : cols - 2;
  for (let x = startX; x < startX + 2; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      setChar(layout, x, y, isDoorY(y) ? 'E' : '#');
    }
  }
  if (hasOpening) {
    carveDoor(layout, side);
  }
}

function drawRoad(layout: string[][], horizontal = true): void {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  if (horizontal) {
    fillRect(layout, 1, cy - 1, cols - 2, 3, 'E');
  } else {
    fillRect(layout, cx - 1, 1, 3, rows - 2, 'E');
  }
}

function connectedRoadMode(openSides: readonly ExitSide[]): 'horizontal' | 'vertical' | 'cross' {
  const horizontal = openSides.includes('east') || openSides.includes('west');
  const vertical = openSides.includes('north') || openSides.includes('south');
  if (horizontal && vertical) return 'cross';
  return vertical ? 'vertical' : 'horizontal';
}

function drawConnectedRoad(
  layout: string[][],
  openSides: readonly ExitSide[],
): 'horizontal' | 'vertical' | 'cross' {
  const mode = connectedRoadMode(openSides);
  if (mode === 'horizontal' || mode === 'cross') {
    drawRoad(layout, true);
  }
  if (mode === 'vertical' || mode === 'cross') {
    drawRoad(layout, false);
  }
  return mode;
}

function exteriorConnectionSides(
  connections: Partial<Record<ExitSide, string>>,
  town: TownStructure,
): ExitSide[] {
  return (Object.keys(connections) as ExitSide[]).filter((side) => {
    const roomId = connections[side];
    return !roomId || !town.districtByRoomId[roomId];
  });
}

function stampNpc(
  layout: string[][],
  x: number,
  y: number,
  context?: TownRoomBuildContext,
  source = 'resident-presence',
): void {
  if (context) {
    context.stamp({ x, y, tile: 'G', source, purpose: 'npc', blocking: false });
    return;
  }
  setChar(layout, x, y, 'G');
}

function createTownLayerEntrance(args: {
  townId: string;
  parentRoomId: string;
  templateId: LayerTemplateId;
  key: string;
  label: string;
  x: number;
  y: number;
  building?: TownBuilding;
  discovered?: boolean;
}): LayerEntrance {
  const building = args.building;
  return {
    id: `town:${args.townId}:${args.key}`,
    layerId: `layer:townInterior:${args.townId}:${args.templateId}`,
    parentRoomId: args.parentRoomId,
    x: args.x,
    y: args.y,
    kind: 'townInterior',
    templateId: args.templateId,
    label: building?.displayName ?? args.label,
    displayName: building?.interiorTitle ?? building?.displayName ?? args.label,
    doorLabel: building?.doorLabel ?? args.label,
    townBuildingId: building?.id,
    ownerResidentId: building?.ownerResidentId,
    ownerResidentRole: building?.ownerResidentRole,
    doorKind: building?.doorKind,
    publicAccess: building?.publicAccess,
    crimeOnEntry: Boolean(building?.crimeTarget && !building.publicAccess),
    locked: building?.doorKind === 'homeDoorClosed',
    discovered: args.discovered ?? true,
    returnPosition: { x: args.x, y: args.y },
    tile: townDoorTile(building?.doorKind),
  };
}

function addTownLayerEntrance(
  layout: string[][],
  entrances: LayerEntrance[],
  entrance: LayerEntrance,
  context?: TownRoomBuildContext,
): void {
  const tile = entrance.tile ?? LAYER_ENTRANCE_TILE;
  if (context) {
    context.stamp({
      x: entrance.x,
      y: entrance.y,
      tile,
      source: entrance.id,
      purpose: 'door',
      blocking: isBlockingTownTile(tile),
      overwriteImportant: true,
    });
  } else {
    setChar(layout, entrance.x, entrance.y, tile);
  }
  entrances.push(entrance);
}

function townDoorTile(kind: TownDoorKind | undefined): string {
  switch (kind) {
    case 'tavernDoor':
      return 't';
    case 'shopDoorClosed':
    case 'shopDoorOpen':
      return 'd';
    case 'homeDoorClosed':
      return 'h';
    case 'homeDoorOpen':
      return 'j';
    case 'guildGrateClosed':
      return 'u';
    case 'guildGrateOpen':
      return 'U';
    case 'gateBarrierClosed':
      return 'x';
    case 'gateBarrierOpen':
      return 'o';
    default:
      return LAYER_ENTRANCE_TILE;
  }
}

function townBuildingFor(
  town: TownStructure,
  kind: TownBuildingKind,
  district: TownDistrictKind,
): TownBuilding | undefined {
  return town.buildings.find((building) => building.kind === kind && building.district === district);
}

function drawBuildingShell(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  door: { x: number; y: number; tile?: string },
): void {
  fillRect(layout, left, top, width, height, 'S');
  for (let x = left; x < left + width; x += 1) {
    setChar(layout, x, top, '#');
    setChar(layout, x, top + height - 1, '#');
  }
  for (let y = top; y < top + height; y += 1) {
    setChar(layout, left, y, '#');
    setChar(layout, left + width - 1, y, '#');
  }
  setChar(layout, door.x, door.y, door.tile ?? '.');
  if (width >= 6 && height >= 5) {
    setChar(layout, Math.max(left + 1, door.x - 2), Math.max(top + 2, door.y - 2), 'R');
    setChar(layout, Math.min(left + width - 2, door.x + 2), Math.max(top + 2, door.y - 2), 'R');
  }
}

function drawFenceRun(
  layout: string[][],
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let x = from.x;
  let y = from.y;
  while (x !== to.x || y !== to.y) {
    setChar(layout, x, y, 'P');
    if (x !== to.x) x += dx;
    if (y !== to.y) y += dy;
  }
  setChar(layout, to.x, to.y, 'P');
}

function drawGatehouse(
  layout: string[][],
  side: ExitSide,
  center: { x: number; y: number },
  grid: GridConfig,
): void {
  if (side === 'west' || side === 'east') {
    const x = side === 'west' ? 2 : grid.cols - 3;
    fillRect(layout, x, center.y - 3, 1, 7, 'x');
    fillRect(layout, x + (side === 'west' ? 1 : -1), center.y - 5, 2, 2, '#');
    fillRect(layout, x + (side === 'west' ? 1 : -1), center.y + 4, 2, 2, '#');
    return;
  }
  const y = side === 'north' ? 2 : grid.rows - 3;
  fillRect(layout, center.x - 3, y, 7, 1, 'x');
  fillRect(layout, center.x - 6, y + (side === 'north' ? 1 : -1), 2, 2, '#');
  fillRect(layout, center.x + 5, y + (side === 'north' ? 1 : -1), 2, 2, '#');
}

function gateGuardPositionForSide(
  side: ExitSide,
  center: { x: number; y: number },
): { x: number; y: number } {
  switch (side) {
    case 'north':
      return { x: center.x, y: center.y - 6 };
    case 'south':
      return { x: center.x, y: center.y + 6 };
    case 'east':
      return { x: center.x + 8, y: center.y };
    case 'west':
      return { x: center.x - 8, y: center.y };
  }
}

export function renderTownGateSide(args: {
  layout: string[][];
  gate: TownGate;
  side: TownGateSide;
  perspective: 'inside' | 'outside';
  state: TownGateState;
  includeGuard: boolean;
}): { guardPosition?: { x: number; y: number } } {
  const rows = args.layout.length;
  const cols = args.layout[0]?.length ?? 0;
  if (rows < 8 || cols < 8) {
    return {};
  }
  const center = {
    x: Math.floor(cols / 2),
    y: Math.floor(rows / 2),
  };
  const gateTile = args.state === 'open' ? '.' : 'x';
  if (args.side === 'north' || args.side === 'south') {
    const stripYs = args.side === 'north' ? [0, 1] : [rows - 2, rows - 1];
    for (const y of stripYs) {
      for (let x = 0; x < cols; x += 1) {
        setChar(args.layout, x, y, '#');
      }
    }
    for (const cell of townGateFootprintCells({ side: args.side, cols, rows })) {
      setChar(args.layout, cell.x, cell.y, gateTile);
    }
    const innerY = args.side === 'north' ? 3 : rows - 4;
    const guardPosition = {
      x: center.x + 2,
      y: Math.max(1, Math.min(rows - 2, innerY)),
    };
    if (args.includeGuard) {
      setChar(args.layout, guardPosition.x, guardPosition.y, 'G');
    }
    return args.includeGuard ? { guardPosition } : {};
  }

  const stripXs = args.side === 'west' ? [0, 1] : [cols - 2, cols - 1];
  for (const x of stripXs) {
    for (let y = 0; y < rows; y += 1) {
      setChar(args.layout, x, y, '#');
    }
  }
  for (const cell of townGateFootprintCells({ side: args.side, cols, rows })) {
    setChar(args.layout, cell.x, cell.y, gateTile);
  }
  const innerX = args.side === 'west' ? 3 : cols - 4;
  const guardPosition = {
    x: Math.max(1, Math.min(cols - 2, innerX)),
    y: center.y + 2,
  };
  if (args.includeGuard) {
    setChar(args.layout, guardPosition.x, guardPosition.y, 'G');
  }
  return args.includeGuard ? { guardPosition } : {};
}

function gateGuardResidentPositions(args: {
  district: TownDistrictKind;
  center: { x: number; y: number };
  openSides: readonly ExitSide[];
  connections: Partial<Record<ExitSide, string>>;
  town: TownStructure;
}): Array<{ x: number; y: number }> {
  const fallback = [
    { x: args.center.x + 5, y: args.center.y + 3 },
    { x: args.center.x - 5, y: args.center.y - 3 },
    { x: args.center.x + 5, y: args.center.y - 3 },
    { x: args.center.x - 5, y: args.center.y + 3 },
  ];
  const openSides =
    args.district === 'townExit'
      ? [
          ...args.openSides.filter((side) => {
            const neighborId = args.connections[side];
            return Boolean(neighborId && args.town.districtByRoomId[neighborId]);
          }),
          ...args.openSides.filter((side) => {
            const neighborId = args.connections[side];
            return !neighborId || !args.town.districtByRoomId[neighborId];
          }),
        ]
      : [...args.openSides];
  const seen = new Set<string>();
  const positions = [
    ...openSides.map((side) => gateGuardPositionForSide(side, args.center)),
    ...fallback,
  ];
  return positions.filter((position) => {
    const key = vectorKey(position);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function createTownDistrictRoom(args: {
  town: TownStructure;
  roomId: string;
  districtKind: TownDistrictKind;
  grid: GridConfig;
  biomeId: BiomeId;
  biomeTitle: string;
  backgroundColor: number;
  wallColor: number;
  wallOutlineColor: number;
  connections: Partial<Record<'north' | 'south' | 'east' | 'west', string>>;
}): RoomSnapshot {
  const layout = emptyRows(args.grid);
  const context = new TownRoomBuildContext(layout);
  const center = { x: Math.floor(args.grid.cols / 2), y: Math.floor(args.grid.rows / 2) };
  const town = cloneTownForRoom(args.town, args.roomId, args.districtKind);
  const layerEntrances: LayerEntrance[] = [];
  const district = args.districtKind;
  town.safeArea = { left: 1, top: 1, width: args.grid.cols - 2, height: args.grid.rows - 2 };
  town.center = center;
  const rawOpenSides = Object.keys(args.connections) as ExitSide[];
  const externalWallSides = (['north', 'south', 'east', 'west'] as const).filter((side) => {
    const neighborId = args.connections[side];
    return !neighborId || !town.districtByRoomId[neighborId];
  });
  const wallOpenSides = rawOpenSides.filter((side) => {
    const neighborId = args.connections[side];
    return !neighborId || !town.districtByRoomId[neighborId];
  });
  const openSides = rawOpenSides.filter((side) => {
    const neighborId = args.connections[side];
    const neighborDistrict = neighborId ? town.districtByRoomId[neighborId] : undefined;
    const guildGrate =
      (district === 'backAlley' && neighborDistrict === 'guildHideout') ||
      (district === 'guildHideout' && neighborDistrict === 'backAlley');
    return !guildGrate || town.discoveredGuild;
  });
  drawTownWalls(layout, wallOpenSides, externalWallSides);

  switch (normalizePhysicalDistrictKind(district)) {
    case 'townCenter':
      {
      const tavern = townBuildingFor(town, 'tavern', 'townCenter');
      drawConnectedRoad(layout, openSides);
      fillRect(layout, center.x - 4, center.y - 3, 9, 7, 'E');
      fillRect(layout, center.x - 1, center.y - 1, 3, 3, 'P');
      setChar(layout, center.x, center.y, 'M');
      setChar(layout, center.x + 7, center.y - 3, 'D');
      if (tavern) {
        drawBuildingShell(layout, 4, 4, 11, 7, {
          x: tavern.door.x,
          y: tavern.door.y,
          tile: townDoorTile(tavern.doorKind),
        });
        fillRect(layout, 5, 5, 9, 2, 'S');
        setChar(layout, 7, 8, 'R');
        setChar(layout, 11, 8, 'R');
        addTownLayerEntrance(
          layout,
          layerEntrances,
          createTownLayerEntrance({
            townId: town.id,
            parentRoomId: args.roomId,
            templateId: 'tavern',
            key: 'tavern-door',
            label: 'Tavern door',
            x: tavern.door.x,
            y: tavern.door.y,
            building: tavern,
          }),
          context,
        );
      }
      drawBuildingShell(layout, args.grid.cols - 11, 5, 7, 5, {
        x: args.grid.cols - 8,
        y: 9,
        tile: 'D',
      });
      setChar(layout, args.grid.cols - 8, 7, 'D');
      setChar(layout, center.x + 5, center.y - 4, 'P');
      setChar(layout, center.x - 5, center.y + 4, 'P');
      }
      break;
    case 'marketStreet':
      {
      const generalStore = townBuildingFor(town, 'generalStore', 'marketStreet');
      const butcher = townBuildingFor(town, 'butcherShop', 'marketStreet');
      const potionMaker = townBuildingFor(town, 'potionMaker', 'marketStreet');
      drawConnectedRoad(layout, openSides);
      drawBuildingShell(layout, 3, 4, 8, 6, {
        x: generalStore?.door.x ?? 6,
        y: generalStore?.door.y ?? 9,
        tile: townDoorTile(generalStore?.doorKind),
      });
      if (generalStore) {
        addTownLayerEntrance(
          layout,
          layerEntrances,
          createTownLayerEntrance({
            townId: town.id,
            parentRoomId: args.roomId,
            templateId: 'generalStore',
            key: 'general-store-door',
            label: 'General Store door',
            x: generalStore.door.x,
            y: generalStore.door.y,
            building: generalStore,
          }),
          context,
        );
      }
      setChar(layout, 5, 6, 'M');
      setChar(layout, 8, 6, 'A');
      drawBuildingShell(layout, center.x - 4, 3, 9, 6, {
        x: butcher?.door.x ?? center.x,
        y: butcher?.door.y ?? 8,
        tile: townDoorTile(butcher?.doorKind),
      });
      if (butcher) {
        addTownLayerEntrance(
          layout,
          layerEntrances,
          createTownLayerEntrance({
            townId: town.id,
            parentRoomId: args.roomId,
            templateId: 'butcherShop',
            key: 'butcher-door',
            label: 'Butcher shop door',
            x: butcher.door.x,
            y: butcher.door.y,
            building: butcher,
          }),
          context,
        );
      }
      setChar(layout, center.x - 2, 5, 'F');
      setChar(layout, center.x + 2, 5, 'A');
      drawBuildingShell(layout, args.grid.cols - 11, 4, 8, 6, {
        x: potionMaker?.door.x ?? args.grid.cols - 7,
        y: potionMaker?.door.y ?? 9,
        tile: townDoorTile(potionMaker?.doorKind),
      });
      if (potionMaker) {
        addTownLayerEntrance(
          layout,
          layerEntrances,
          createTownLayerEntrance({
            townId: town.id,
            parentRoomId: args.roomId,
            templateId: 'potionMaker',
            key: 'potion-maker-door',
            label: 'Potion maker door',
            x: potionMaker.door.x,
            y: potionMaker.door.y,
            building: potionMaker,
          }),
          context,
        );
      }
      setChar(layout, args.grid.cols - 9, 6, 'P');
      setChar(layout, args.grid.cols - 6, 6, 'P');
      for (let x = 5; x < args.grid.cols - 5; x += 6) {
        fillRect(layout, x, center.y + 4, 4, 2, 'S');
        setChar(layout, x + 1, center.y + 5, x % 2 === 0 ? 'M' : 'A');
      }
      setChar(layout, center.x + 2, center.y - 2, 'P');
      setChar(layout, center.x - 2, center.y + 2, 'P');
      }
      break;
    case 'residentialStreet':
      {
      const home = townBuildingFor(town, 'residentialHome', 'residentialStreet');
      drawConnectedRoad(layout, openSides);
      drawFenceRun(layout, { x: 2, y: 3 }, { x: 13, y: 3 });
      drawFenceRun(layout, { x: args.grid.cols - 14, y: 3 }, { x: args.grid.cols - 3, y: 3 });
      drawBuildingShell(layout, 3, 5, 7, 5, {
        x: home?.door.x ?? 6,
        y: home?.door.y ?? 9,
        tile: townDoorTile(home?.doorKind),
      });
      drawBuildingShell(layout, 12, 4, 6, 6, { x: 15, y: 9, tile: 'h' });
      drawBuildingShell(layout, args.grid.cols - 18, 5, 7, 5, {
        x: args.grid.cols - 15,
        y: 9,
        tile: 'h',
      });
      drawBuildingShell(layout, args.grid.cols - 9, 4, 6, 6, {
        x: args.grid.cols - 6,
        y: 9,
        tile: 'h',
      });
      if (home) {
        addTownLayerEntrance(
          layout,
          layerEntrances,
          createTownLayerEntrance({
            townId: town.id,
            parentRoomId: args.roomId,
            templateId: 'residentialHome',
            key: 'home-door',
            label: 'Town home door',
            x: home.door.x,
            y: home.door.y,
            building: home,
          }),
          context,
        );
      }
      drawFenceRun(layout, { x: 3, y: center.y + 5 }, { x: 12, y: center.y + 5 });
      drawFenceRun(
        layout,
        { x: args.grid.cols - 13, y: center.y + 5 },
        { x: args.grid.cols - 4, y: center.y + 5 },
      );
      setChar(layout, 5, center.y + 3, 'P');
      setChar(layout, args.grid.cols - 6, center.y + 3, 'P');
      }
      break;
    case 'backAlley':
      {
      const guildGrate = townBuildingFor(town, 'guildAccess', 'backAlley');
      fillRect(layout, 3, 3, args.grid.cols - 6, args.grid.rows - 6, '.');
      drawTownWalls(layout, wallOpenSides, externalWallSides);
      fillRect(layout, 4, 4, args.grid.cols - 8, 2, '#');
      fillRect(layout, 4, args.grid.rows - 6, args.grid.cols - 8, 2, '#');
      fillRect(layout, 5, 7, 8, 4, 'S');
      fillRect(layout, args.grid.cols - 13, 7, 8, 4, 'S');
      fillRect(layout, 8, center.y - 1, args.grid.cols - 16, 2, 'E');
      fillRect(layout, center.x - 8, center.y - 5, 16, 2, 'A');
      fillRect(layout, center.x + 5, center.y + 2, 5, 3, 'A');
      setChar(layout, center.x + 7, center.y + 1, 'M');
      addTownLayerEntrance(layout, layerEntrances, {
        ...createTownLayerEntrance({
          townId: town.id,
          parentRoomId: args.roomId,
          templateId: 'thievesGuild',
          key: 'guild-grate',
          label: 'Thieves Guild grate',
          x: guildGrate?.door.x ?? center.x - 5,
          y: guildGrate?.door.y ?? center.y,
          building: guildGrate,
          discovered: town.discoveredGuild,
        }),
        layerId: `layer:townInterior:${town.id}:thievesGuild`,
        discovered: town.discoveredGuild,
        locked: !town.discoveredGuild,
        tile: town.discoveredGuild ? 'U' : 'u',
      }, context);
      setChar(layout, center.x + 5, center.y, 'S');
      setChar(layout, center.x - 8, center.y - 2, 'P');
      }
      break;
    case 'guildHideout':
      fillRect(layout, 3, 3, args.grid.cols - 6, args.grid.rows - 6, 'W');
      drawTownWalls(layout, wallOpenSides, externalWallSides);
      fillRect(layout, center.x - 9, center.y - 4, 18, 8, 'E');
      fillRect(layout, center.x - 8, center.y - 3, 6, 2, 'A');
      fillRect(layout, center.x + 3, center.y - 3, 6, 2, 'S');
      setChar(layout, center.x - 6, center.y + 1, 'P');
      setChar(layout, center.x, center.y, 'E');
      setChar(layout, center.x + 4, center.y + 2, 'A');
      break;
  }

  const gatePresences: TownResidentPresence[] = [];
  for (const gate of town.gates.filter((entry) => entry.townRoomId === args.roomId)) {
    const result = renderTownGateSide({
      layout,
      gate,
      side: gate.side,
      perspective: 'inside',
      state: gate.state,
      includeGuard: Boolean(gate.insideGuardResidentId),
    });
    if (gate.insideGuardResidentId && result.guardPosition) {
      gatePresences.push({
        residentId: gate.insideGuardResidentId,
        roomId: args.roomId,
        x: result.guardPosition.x,
        y: result.guardPosition.y,
        source: 'gate',
        role: 'guard',
      });
    }
  }
  town.residentPresences = gatePresences;
  town.residents = town.residents.map((resident) => {
    const presence = gatePresences.find((entry) => entry.residentId === resident.id);
    return presence ? { ...resident, x: presence.x, y: presence.y, workRoomId: presence.roomId } : resident;
  });

  const interiorOwnerIds = new Set(
    town.buildings
      .filter((building) => building.enterable && building.ownerResidentId)
      .map((building) => building.ownerResidentId),
  );
  const residents = town.residents.filter(
    (resident) =>
      !gatePresences.some((presence) => presence.residentId === resident.id) &&
      !interiorOwnerIds.has(resident.id) &&
      !['bartender', 'cardDealer'].includes(resident.role) &&
      normalizeDistrictKind(
        (resident.workRoomId ? town.districtByRoomId[resident.workRoomId] : undefined) ??
          (resident.workRoomId?.split(':').pop() as TownDistrictKind | undefined),
      ) === normalizeDistrictKind(district),
  );
  const residentPositions =
    district === 'gate' || district === 'townExit'
      ? gateGuardResidentPositions({
          district,
          center,
          openSides,
          connections: args.connections,
          town,
        })
      : [
          { x: center.x - 8, y: center.y + 4 },
          { x: center.x - 4, y: center.y + 4 },
          { x: center.x, y: center.y + 4 },
          { x: center.x + 4, y: center.y + 4 },
          { x: center.x + 8, y: center.y + 4 },
          { x: center.x - 8, y: center.y - 4 },
          { x: center.x - 4, y: center.y - 4 },
          { x: center.x, y: center.y - 4 },
          { x: center.x + 4, y: center.y - 4 },
          { x: center.x + 8, y: center.y - 4 },
        ];
  const residentPresences: TownResidentPresence[] = [];
  town.residents = town.residents.map((resident) => {
    const index = residents.findIndex((entry) => entry.id === resident.id);
    if (index < 0) {
      return resident;
    }
    const position = residentPositions[index % residentPositions.length] ?? center;
    const x = Math.max(2, Math.min(args.grid.cols - 3, position.x));
    const y = Math.max(2, Math.min(args.grid.rows - 3, position.y));
    residentPresences.push({
      residentId: resident.id,
      roomId: args.roomId,
      x,
      y,
      source: district === 'gate' || district === 'townExit' ? 'gate' : 'district',
      role: resident.role,
    });
    return {
      ...resident,
      x,
      y,
    };
  });
  town.residentPresences = [...gatePresences, ...residentPresences];
  townResidentsForRoom(town, args.roomId).forEach((resident) =>
    stampNpc(layout, resident.x, resident.y, context, `resident:${resident.id}`),
  );
  town.shopkeeper = selectPrimaryTownMerchant(town.residents, town.shopkeeper);
  town.stampConflicts = context.conflicts;

  return {
    id: args.roomId,
    layout: rowsToStrings(layout),
    portals: [],
    town,
    layerEntrances: layerEntrances.length > 0 ? layerEntrances : undefined,
    biomeId: args.biomeId,
    biomeTitle: args.biomeTitle,
    backgroundColor: args.backgroundColor,
    wallColor: args.wallColor,
    wallOutlineColor: args.wallOutlineColor,
  };
}

export function stampTownBoundaryApproach(
  rows: string[],
  sideFacingTown: ExitSide,
  hasOpening = true,
): string[] {
  const layout = rows.map((row) => row.split(''));
  drawBoundaryWall(layout, sideFacingTown, hasOpening);
  return rowsToStrings(layout);
}

export function stampTownBoundaryCorner(
  rows: string[],
  cornerFacingTown: 'northWest' | 'northEast' | 'southWest' | 'southEast',
): string[] {
  const layout = rows.map((row) => row.split(''));
  const rowsCount = layout.length;
  const cols = layout[0]?.length ?? 0;
  const north = cornerFacingTown === 'northWest' || cornerFacingTown === 'northEast';
  const west = cornerFacingTown === 'northWest' || cornerFacingTown === 'southWest';
  const xStart = west ? 0 : Math.max(0, cols - 2);
  const yStart = north ? 0 : Math.max(0, rowsCount - 2);
  const xEnd = west ? Math.min(cols - 1, 1) : cols - 1;
  const yEnd = north ? Math.min(rowsCount - 1, 1) : rowsCount - 1;
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      if (x === xStart || x === xEnd || y === yStart || y === yEnd) {
        setChar(layout, x, y, '#');
      }
    }
  }
  return rowsToStrings(layout);
}

function normalizeDistrictKind(kind: TownDistrictKind | undefined): TownDistrictKind | undefined {
  if (kind === 'townCenter') return 'square';
  if (kind === 'market') return 'marketStreet';
  if (kind === 'tavern') return 'tavernInterior';
  if (kind === 'residential') return 'residentialStreet';
  if (kind === 'exit') return 'townExit';
  return kind;
}

function normalizePhysicalDistrictKind(
  kind: TownDistrictKind,
): 'townCenter' | 'marketStreet' | 'residentialStreet' | 'backAlley' | 'guildHideout' {
  switch (kind) {
    case 'market':
    case 'marketStreet':
      return 'marketStreet';
    case 'residential':
    case 'residentialStreet':
      return 'residentialStreet';
    case 'backAlley':
      return 'backAlley';
    case 'guildHideout':
      return 'guildHideout';
    case 'townCenter':
    case 'square':
    case 'gate':
    case 'outskirts':
    case 'tavern':
    case 'tavernInterior':
    case 'exit':
    case 'townExit':
      return 'townCenter';
  }
}

function districtPhysicalCandidates(kind: TownDistrictKind): TownDistrictKind[] {
  switch (kind) {
    case 'townCenter':
    case 'square':
    case 'gate':
    case 'outskirts':
    case 'tavern':
    case 'tavernInterior':
    case 'exit':
    case 'townExit':
      return ['townCenter', 'square', 'gate', 'outskirts', 'tavernInterior', 'townExit'];
    case 'market':
    case 'marketStreet':
      return ['marketStreet', 'market'];
    case 'residential':
    case 'residentialStreet':
      return ['residentialStreet', 'residential'];
    case 'backAlley':
    case 'guildHideout':
      return ['backAlley', 'guildHideout'];
  }
}
