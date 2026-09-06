import { stableStringHashUnsigned } from '../core/math.js';
import { inferNpcNameArchetype } from './npcNames.js';

export interface WandererStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

function clampStat(value: number): number {
  return Math.max(1, Math.min(10, value));
}

function tuneForNameArchetype(
  stats: WandererStats,
  archetype: ReturnType<typeof inferNpcNameArchetype>,
): WandererStats {
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

export function getWandererStats(name: string): WandererStats {
  switch (name) {
    case 'Ryan':
      return { str: 2, dex: 1, con: 3, int: 2, wis: 1, cha: 1 };
    case 'Lindsey':
      return { str: 6, dex: 7, con: 6, int: 8, wis: 7, cha: 8 };
    case 'Freak Joey':
      return { str: 8, dex: 9, con: 8, int: 5, wis: 4, cha: 7 };
    case 'Sterling Fisher':
      return { str: 3, dex: 5, con: 4, int: 7, wis: 8, cha: 5 };
    default: {
      const hash = stableStringHashUnsigned(name.toLowerCase());
      const base: WandererStats = {
        str: (hash % 10) + 1,
        dex: (Math.floor(hash / 10) % 10) + 1,
        con: (Math.floor(hash / 100) % 10) + 1,
        int: (Math.floor(hash / 1000) % 10) + 1,
        wis: (Math.floor(hash / 10000) % 10) + 1,
        cha: (Math.floor(hash / 100000) % 10) + 1,
      };
      return tuneForNameArchetype(base, inferNpcNameArchetype(name));
    }
  }
}
