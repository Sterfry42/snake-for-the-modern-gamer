import type { GridConfig } from '../config/gameConfig.js';
import { vectorKey } from '../core/math.js';
import { createRng, type RandomGenerator } from '../core/rng.js';
import { pickNpcName } from '../npcs/npcNames.js';
import { buildHouseNpcProfile } from '../npcs/profiles.js';
import type { NpcProfile } from '../npcs/profiles.js';
import { actorIdForTownResident } from '../actors/actorFactory.js';
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
  residents: TownResident[];
  shopkeeper: TownResident;
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
  'outskirts',
  'gate',
  'square',
  'marketStreet',
  'tavernInterior',
  'backAlley',
  'residentialStreet',
  'townExit',
] as const;

function setChar(layout: string[][], x: number, y: number, ch: string): void {
  if (y < 0 || y >= layout.length) return;
  if (x < 0 || x >= layout[y].length) return;
  layout[y][x] = ch;
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
  town.rooms = town.rooms.map((room) => ({ ...room, townId: args.townId }));
  town.thievesGuild = town.thievesGuild ? { ...town.thievesGuild, townId: args.townId } : undefined;
  town.guildJobs = town.guildJobs.map((job) => ({ ...job, townId: args.townId }));
  town.laws = town.laws.map((law) => ({ ...law, townId: args.townId }));
  town.notices = town.notices.map((notice) => ({ ...notice, townId: args.townId }));
  const roomFor = (district: TownDistrictKind): string =>
    Object.entries(args.districtRoomIds).find(([, kind]) => kind === district)?.[0] ??
    args.entranceRoomId;
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
      workDistrict: 'tavernInterior' as const,
    },
    {
      role: 'cardDealer' as const,
      name: pickNpcName('thief', rng),
      workDistrict: 'tavernInterior' as const,
    },
    {
      role: 'questGiver' as const,
      name: pickNpcName('wanderer', rng),
      workDistrict: 'tavernInterior' as const,
    },
    { role: 'guard' as const, name: pickNpcName('guard', rng), workDistrict: 'gate' as const },
    { role: 'guard' as const, name: pickNpcName('guard', rng), workDistrict: 'gate' as const },
    { role: 'guard' as const, name: pickNpcName('guard', rng), workDistrict: 'square' as const },
    { role: 'guard' as const, name: pickNpcName('guard', rng), workDistrict: 'townExit' as const },
    { role: 'scribe' as const, name: pickNpcName('scribe', rng), workDistrict: 'square' as const },
    {
      role: 'resident' as const,
      name: pickNpcName('resident', rng),
      workDistrict: 'square' as const,
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
      workDistrict: 'tavernInterior' as const,
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
          ? 'tavernInterior'
          : spot.role === 'equipmentMerchant' ||
              spot.role === 'potionMaker' ||
              spot.role === 'butcher'
            ? 'marketStreet'
            : 'square',
    ),
    workRoomId: roomFor(spot.workDistrict),
    id: `${town.id}:resident:${spot.role}:${index}`,
  }));
  town.shopkeeper = selectPrimaryTownMerchant(town.residents, town.shopkeeper);
  return town;
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
    residents: town.residents.map((resident) => ({ ...resident })),
    shopkeeper: { ...town.shopkeeper },
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

function drawTownWalls(layout: string[][], openSides: readonly ExitSide[] = []): void {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  if (rows < 8 || cols < 8) {
    return;
  }
  const open = new Set(openSides);
  drawBoundaryWall(layout, 'north', open.has('north'));
  drawBoundaryWall(layout, 'south', open.has('south'));
  drawBoundaryWall(layout, 'west', open.has('west'));
  drawBoundaryWall(layout, 'east', open.has('east'));
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

function stampNpc(layout: string[][], x: number, y: number): void {
  setChar(layout, x, y, 'G');
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
  const center = { x: Math.floor(args.grid.cols / 2), y: Math.floor(args.grid.rows / 2) };
  const town = cloneTownForRoom(args.town, args.roomId, args.districtKind);
  const district = args.districtKind;
  town.safeArea = { left: 1, top: 1, width: args.grid.cols - 2, height: args.grid.rows - 2 };
  town.center = center;
  const rawOpenSides = Object.keys(args.connections) as ExitSide[];
  const openSides = rawOpenSides.filter((side) => {
    const neighborId = args.connections[side];
    const neighborDistrict = neighborId ? town.districtByRoomId[neighborId] : undefined;
    const guildGrate =
      (district === 'backAlley' && neighborDistrict === 'guildHideout') ||
      (district === 'guildHideout' && neighborDistrict === 'backAlley');
    return !guildGrate || town.discoveredGuild;
  });
  drawTownWalls(layout, openSides);

  switch (district) {
    case 'outskirts':
      drawConnectedRoad(layout, openSides);
      for (let x = 3; x < args.grid.cols - 3; x += 4) {
        setChar(layout, x, center.y - 5, 'L');
        setChar(layout, x, center.y + 5, 'L');
      }
      for (let x = 4; x < args.grid.cols - 4; x += 6) {
        setChar(layout, x, center.y - 8, 'F');
      }
      stampNpc(layout, center.x, center.y);
      break;
    case 'gate':
      if (drawConnectedRoad(layout, openSides) === 'vertical') {
        fillRect(layout, 2, center.y - 2, args.grid.cols - 4, 5, '#');
        fillRect(layout, center.x - 1, center.y - 1, 3, 3, 'S');
      } else {
        fillRect(layout, center.x - 2, 2, 5, args.grid.rows - 4, '#');
        fillRect(layout, center.x - 1, center.y - 1, 3, 3, 'S');
      }
      stampNpc(layout, center.x - 4, center.y - 2);
      stampNpc(layout, center.x + 4, center.y + 2);
      stampNpc(layout, center.x - 4, center.y + 2);
      stampNpc(layout, center.x + 4, center.y - 2);
      setChar(layout, center.x - 7, center.y, 'L');
      setChar(layout, center.x + 7, center.y, 'L');
      break;
    case 'square':
      drawRoad(layout, true);
      drawRoad(layout, false);
      fillRect(layout, center.x - 3, center.y - 2, 7, 5, 'E');
      setChar(layout, center.x, center.y, 'E');
      setChar(layout, center.x + 7, center.y - 3, 'D');
      setChar(layout, center.x - 7, center.y - 3, 'S');
      setChar(layout, center.x + 7, center.y + 3, 'L');
      setChar(layout, center.x - 7, center.y + 3, 'L');
      stampNpc(layout, center.x + 5, center.y - 3);
      stampNpc(layout, center.x - 5, center.y + 3);
      break;
    case 'market':
    case 'marketStreet':
      drawConnectedRoad(layout, openSides);
      for (let x = 4; x < args.grid.cols - 6; x += 7) {
        fillRect(layout, x, center.y - 6, 5, 3, 'S');
        fillRect(layout, x, center.y + 4, 5, 3, 'S');
        setChar(layout, x + 2, center.y - 4, 'M');
        setChar(layout, x + 2, center.y + 6, 'A');
      }
      setChar(layout, center.x + 2, center.y - 2, 'L');
      setChar(layout, center.x - 2, center.y + 2, 'L');
      stampNpc(layout, center.x - 8, center.y);
      break;
    case 'tavern':
    case 'tavernInterior':
      fillRect(layout, 3, 3, args.grid.cols - 6, args.grid.rows - 6, 'W');
      drawTownWalls(layout, openSides);
      fillRect(layout, 4, 4, args.grid.cols - 8, 3, 'S');
      for (let x = 7; x < args.grid.cols - 5; x += 8) {
        setChar(layout, x, center.y + 2, 'R');
        setChar(layout, x + 1, center.y + 2, 'E');
      }
      setChar(layout, center.x + 8, center.y - 1, 'L');
      stampNpc(layout, center.x, 5);
      stampNpc(layout, center.x + 6, center.y + 3);
      break;
    case 'residential':
    case 'residentialStreet':
      drawConnectedRoad(layout, openSides);
      for (let y = 4; y < args.grid.rows - 5; y += 6) {
        fillRect(layout, 3, y, 6, 4, 'W');
        fillRect(layout, args.grid.cols - 9, y, 6, 4, 'W');
        setChar(layout, 6, y + 3, '.');
        setChar(layout, args.grid.cols - 6, y + 3, '.');
        setChar(layout, 4, y + 1, 'P');
        setChar(layout, args.grid.cols - 5, y + 1, 'P');
      }
      stampNpc(layout, center.x - 3, center.y);
      break;
    case 'backAlley':
      fillRect(layout, 3, 3, args.grid.cols - 6, args.grid.rows - 6, 'E');
      drawTownWalls(layout, openSides);
      for (let y = 3; y < args.grid.rows - 3; y += 4) {
        fillRect(layout, 4, y, args.grid.cols - 8, 1, '#');
        setChar(layout, 6 + (y % 5), y, '.');
      }
      setChar(layout, center.x - 5, center.y, 'U');
      setChar(layout, center.x + 5, center.y, 'S');
      setChar(layout, center.x - 8, center.y - 2, 'P');
      stampNpc(layout, center.x, center.y + 3);
      stampNpc(layout, center.x + 4, center.y - 3);
      break;
    case 'guildHideout':
      fillRect(layout, 3, 3, args.grid.cols - 6, args.grid.rows - 6, 'W');
      drawTownWalls(layout, openSides);
      fillRect(layout, center.x - 8, center.y - 3, 16, 6, 'E');
      setChar(layout, center.x - 6, center.y, 'S');
      setChar(layout, center.x, center.y, 'E');
      setChar(layout, center.x + 2, center.y + 2, 'A');
      setChar(layout, center.x - 2, center.y - 2, 'P');
      stampNpc(layout, center.x + 5, center.y);
      stampNpc(layout, center.x - 5, center.y);
      break;
    case 'exit':
    case 'townExit':
      drawConnectedRoad(layout, openSides);
      if (
        exteriorConnectionSides(args.connections, town).some(
          (side) => side === 'east' || side === 'west',
        )
      ) {
        fillRect(layout, center.x - 2, 2, 5, args.grid.rows - 4, '#');
        fillRect(layout, center.x - 1, center.y - 1, 3, 3, 'S');
      } else {
        fillRect(layout, 2, args.grid.rows - 6, args.grid.cols - 4, 3, '#');
        fillRect(layout, center.x - 1, args.grid.rows - 6, 3, 3, 'S');
      }
      setChar(layout, center.x + 5, center.y - 2, 'L');
      stampNpc(layout, center.x + 3, center.y);
      break;
  }

  const residents = town.residents.filter(
    (resident) =>
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
  town.residents = town.residents.map((resident) => {
    const index = residents.findIndex((entry) => entry.id === resident.id);
    if (index < 0) {
      return resident;
    }
    const position = residentPositions[index % residentPositions.length] ?? center;
    return {
      ...resident,
      x: Math.max(2, Math.min(args.grid.cols - 3, position.x)),
      y: Math.max(2, Math.min(args.grid.rows - 3, position.y)),
    };
  });
  town.residents
    .filter((resident) => residents.some((entry) => entry.id === resident.id))
    .forEach((resident) => stampNpc(layout, resident.x, resident.y));
  town.shopkeeper = selectPrimaryTownMerchant(town.residents, town.shopkeeper);

  return {
    id: args.roomId,
    layout: rowsToStrings(layout),
    portals: [],
    town,
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
  if (kind === 'market') return 'marketStreet';
  if (kind === 'tavern') return 'tavernInterior';
  if (kind === 'residential') return 'residentialStreet';
  if (kind === 'exit') return 'townExit';
  return kind;
}
