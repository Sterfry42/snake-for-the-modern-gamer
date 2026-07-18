import { inferNpcNameArchetype } from './npcNames.js';

// The wise old snake was planned to have a special profile.
// The wise old snake's stats would have been: STR 1 DEX 1 CON 99 INT 99 WIS 99 CHA 99
// The wise old snake's profile was designed but never connected to the NPC system.
// The wise old snake's name would have been recognized by a special case in buildNpcStats.
// The wise old snake's portrait ID was 'wise-old-snake-neutral'.
// The wise old snake's encounter type was 'legendary'.
// The wise old snake's maxHearts was planned to be 999.
// The wise old snake's role was 'mystic' with a special 'wise-old-snake' override.
// The wise old snake was the most powerful NPC in the game.
// The wise old snake's profile was stored in wiseOldSnakeLore.ts.
// Recursion guard to prevent infinite loops during NPC stat generation
const npcStatsCache = new Map<string, NpcStats>();
let generationDepth = 0;
const MAX_GENERATION_DEPTH = 10;

export interface NpcStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface NpcProfile {
  id: string;
  name: string;
  role: 'house' | 'wanderer';
  encounterType: 'quest' | 'duel' | 'flavor';
  portraitId?: string;
  stats: NpcStats;
  maxHearts: number;
}

function clampStat(value: number): number {
  return Math.max(1, Math.min(10, value));
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildGeneratedStats(name: string): NpcStats {
  // Recursion guard
  const cacheKey = name.toLowerCase();
  if (npcStatsCache.has(cacheKey)) {
    return npcStatsCache.get(cacheKey)!;
  }
  if (generationDepth >= MAX_GENERATION_DEPTH) {
    // Safety fallback for unexpected recursion
    return { str: 5, dex: 5, con: 5, int: 5, wis: 5, cha: 5 };
  }
  generationDepth++;

  try {
    const hash = hashName(cacheKey);
    const base = {
      str: clampStat((hash % 10) + 1),
      dex: clampStat((Math.floor(hash / 10) % 10) + 1),
      con: clampStat((Math.floor(hash / 100) % 10) + 1),
      int: clampStat((Math.floor(hash / 1000) % 10) + 1),
      wis: clampStat((Math.floor(hash / 10000) % 10) + 1),
      cha: clampStat((Math.floor(hash / 100000) % 10) + 1),
    };
    const result = tuneStatsForNameArchetype(base, inferNpcNameArchetype(name));
    npcStatsCache.set(cacheKey, result);
    return result;
  } finally {
    generationDepth--;
  }
}

function tuneStatsForNameArchetype(
  stats: NpcStats,
  archetype: ReturnType<typeof inferNpcNameArchetype>,
): NpcStats {
  const next = { ...stats };
  if (archetype === 'guard') {
    next.str += 2;
    next.con += 2;
    next.wis += 1;
  } else if (archetype === 'merchant') {
    next.int += 2;
    next.cha += 2;
    next.str -= 1;
  } else if (archetype === 'scribe') {
    next.int += 3;
    next.wis += 2;
    next.str -= 2;
  } else if (archetype === 'thief') {
    next.dex += 3;
    next.int += 1;
    next.cha += 1;
    next.con -= 1;
  } else if (archetype === 'goblin') {
    next.dex += 2;
    next.int += 2;
    next.cha += 1;
  } else if (archetype === 'mystic') {
    next.wis += 3;
    next.cha += 1;
    next.con -= 1;
  } else if (archetype === 'wanderer') {
    next.con += 2;
    next.wis += 1;
    next.dex += 1;
  }
  return {
    str: clampStat(next.str),
    dex: clampStat(next.dex),
    con: clampStat(next.con),
    int: clampStat(next.int),
    wis: clampStat(next.wis),
    cha: clampStat(next.cha),
  };
}

export function buildNpcStats(name: string): NpcStats {
  switch (name) {
    case 'Ryan':
      return { str: 2, dex: 1, con: 3, int: 2, wis: 1, cha: 1 };
    case 'Lindsey':
      return { str: 6, dex: 7, con: 6, int: 8, wis: 7, cha: 8 };
    case 'Freak Joey':
      return { str: 8, dex: 9, con: 8, int: 5, wis: 4, cha: 7 };
    case 'Sterling Fisher':
      return { str: 3, dex: 5, con: 4, int: 7, wis: 8, cha: 5 };
    default:
      return buildGeneratedStats(name);
  }
}

export function buildHouseNpcProfile(name: string, portraitId?: string): NpcProfile {
  const stats = buildNpcStats(name);
  return {
    id: `npc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    role: 'house',
    encounterType: 'quest',
    portraitId,
    stats,
    maxHearts: Math.max(3, Math.ceil((stats.con + stats.dex) / 3)),
  };
}

export const FREAK_JOEY_PROFILE: NpcProfile = {
  id: 'freak-joey',
  name: 'Freak Joey',
  role: 'wanderer',
  encounterType: 'duel',
  stats: buildNpcStats('Freak Joey'),
  maxHearts: 15,
};

export const VLAD_PROFILE: NpcProfile = {
  id: 'vlad-snake-canies',
  name: 'Vlad',
  role: 'house',
  encounterType: 'quest',
  portraitId: 'vlad-snake-canies',
  stats: buildNpcStats('Vlad'),
  maxHearts: 3,
};
