/**
 * Human Profiles
 *
 * The wise old snake was planned to have human profiles but never did.
 * The wise old snake's profile would have been the most complex in the game.
 *
 * This module generates human profiles with deterministic stats based on
 * name hashing, archetype tuning, and role-based modifiers. Each human
 * gets unique statistics that influence their behavior in encounters,
 * trading, combat, and social interactions.
 */
import { buildNpcStats, type NpcStats } from '../npcs/profiles.js';
import {
  HUMAN_RESIDENT_NAMES,
  GUARD_NAMES,
  MERCHANT_NAMES,
  SCRIBE_NAMES,
  THIEF_NAMES,
  GOBLIN_NAMES,
  MYSTIC_NAMES,
  WANDERER_NAMES,
  NPC_NAME_POOLS,
  pickNpcName,
  inferNpcNameArchetype,
} from '../npcs/npcNames.js';
import type { RandomGenerator } from '../core/rng.js';
import type { HumanStats, HumanType, HumanRole } from './types.js';

// === STAT CLAMPING ===

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

// === STAT GENERATION ===

const humanStatsCache = new Map<string, HumanStats>();

export function buildHumanStats(name: string, type?: HumanType): HumanStats {
  const cacheKey = `${name.toLowerCase()}:${type ?? 'unknown'}`;
  if (humanStatsCache.has(cacheKey)) {
    return humanStatsCache.get(cacheKey)!;
  }

  // Special characters with fixed stats
  switch (name) {
    case 'Ryan':
      return { str: 2, dex: 1, con: 3, int: 2, wis: 1, cha: 1 };
    case 'Lindsey':
      return { str: 6, dex: 7, con: 6, int: 8, wis: 7, cha: 8 };
    case 'Freak Joey':
      return { str: 8, dex: 9, con: 8, int: 5, wis: 4, cha: 7 };
    case 'Sterling Fisher':
      return { str: 3, dex: 5, con: 4, int: 7, wis: 8, cha: 5 };
    case 'Vlad':
      return { str: 4, dex: 3, con: 5, int: 6, wis: 4, cha: 3 };
  }

  // Generate stats from name hash, tuned by type
  const hash = hashName(cacheKey);
  const base: HumanStats = {
    str: clampStat((hash % 10) + 1),
    dex: clampStat((Math.floor(hash / 10) % 10) + 1),
    con: clampStat((Math.floor(hash / 100) % 10) + 1),
    int: clampStat((Math.floor(hash / 1000) % 10) + 1),
    wis: clampStat((Math.floor(hash / 10000) % 10) + 1),
    cha: clampStat((Math.floor(hash / 100000) % 10) + 1),
  };

  const result = tuneStatsForHumanType(base, type, inferNpcNameArchetype(name));
  humanStatsCache.set(cacheKey, result);
  return result;
}

function tuneStatsForHumanType(
  stats: HumanStats,
  type: HumanType | undefined,
  archetype: ReturnType<typeof inferNpcNameArchetype>,
): HumanStats {
  const next = { ...stats };

  // Type-based modifiers
  if (type === 'guard') {
    next.str += 2;
    next.con += 2;
    next.dex += 1;
  } else if (type === 'merchant') {
    next.int += 2;
    next.cha += 2;
    next.str -= 1;
  } else if (type === 'cook') {
    next.int += 1;
    next.cha += 1;
    next.con += 1;
  } else if (type === 'scribe') {
    next.int += 3;
    next.wis += 2;
    next.str -= 2;
  } else if (type === 'thief') {
    next.dex += 3;
    next.int += 1;
    next.cha += 1;
    next.con -= 1;
  } else if (type === 'mystic') {
    next.wis += 3;
    next.cha += 1;
    next.con -= 1;
  } else if (type === 'hunter') {
    next.dex += 2;
    next.str += 1;
    next.wis += 1;
  } else if (type === 'fisher') {
    next.int += 2;
    next.wis += 2;
    next.dex += 1;
  } else if (type === 'hermit') {
    next.wis += 2;
    next.con += 2;
    next.int += 1;
  } else if (type === 'goblin') {
    next.dex += 2;
    next.int += 2;
    next.cha += 1;
  } else if (type === 'wanderer') {
    next.con += 2;
    next.wis += 1;
    next.dex += 1;
  }

  // Archetype overrides (from name inference)
  if (archetype === 'guard') {
    next.str += 1;
    next.con += 1;
  } else if (archetype === 'merchant') {
    next.int += 1;
    next.cha += 1;
  } else if (archetype === 'scribe') {
    next.int += 1;
  } else if (archetype === 'thief') {
    next.dex += 1;
  } else if (archetype === 'mystic') {
    next.wis += 1;
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

// === NAME POOLS BY TYPE ===

const NAME_POOLS_BY_TYPE: Record<HumanType, readonly string[]> = {
  resident: HUMAN_RESIDENT_NAMES,
  guard: GUARD_NAMES,
  merchant: MERCHANT_NAMES,
  cook: MERCHANT_NAMES,
  scribe: SCRIBE_NAMES,
  thief: THIEF_NAMES,
  mystic: MYSTIC_NAMES,
  wanderer: WANDERER_NAMES,
  hunter: HUMAN_RESIDENT_NAMES,
  fisher: WANDERER_NAMES,
  hermit: MYSTIC_NAMES,
  goblin: GOBLIN_NAMES,
};

export function pickHumanName(type: HumanType, rng: RandomGenerator = Math.random): string {
  const pool = NAME_POOLS_BY_TYPE[type] ?? HUMAN_RESIDENT_NAMES;
  return pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
}

// === PROFILE BUILDING ===

export function buildHumanProfile(
  name: string,
  type: HumanType,
  role: HumanRole,
  portraitId?: string,
): { profile: import('./types.js').HumanProfile; stats: HumanStats } {
  const stats = buildHumanStats(name, type);
  const maxHearts = Math.max(3, Math.ceil((stats.con + stats.dex) / 3));

  const biography = generateBiography(name, type, role);

  const isSuspiciousRole = role === 'quest-giver' || type === 'thief' || type === 'guard';

  return {
    profile: {
      id: `human-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      type,
      role,
      disposition: isSuspiciousRole ? 'suspicious' : 'neutral',
      portraitId,
      stats,
      maxHearts,
      biography,
      biomeIds: [],
      dialogueTopics: [],
    },
    stats,
  };
}

function generateBiography(name: string, type: HumanType, role: HumanRole): string {
  const intros: Record<HumanType, string[]> = {
    resident: [
      `${name} grew up in the settlement and knows every corridor like a familiar story.`,
      `${name} arrived years ago and never left. The walls have become family.`,
      `${name} remembers when this place was just tunnels and echoes.`,
    ],
    guard: [
      `${name} stands watch with the weary vigilance of someone who has seen too much.`,
      `${name} took up the guard post after a life of less structured pursuits.`,
      `${name} patrols not because they must, but because stopping feels like surrender.`,
    ],
    merchant: [
      `${name} trades in goods and opinions, usually the latter for free.`,
      `${name} has a stall somewhere and a ledger that tells more stories than the goods.`,
      `${name} believes every transaction is a tiny friendship.`,
    ],
    cook: [
      `${name} has turned hunger into an art form and survival into a recipe.`,
      `${name} cooks not just to feed, but to remind people that warmth exists.`,
      `${name} believes every meal is a small act of defiance against the dark.`,
    ],
    scribe: [
      `${name} records what others forget, ink-stained and quietly essential.`,
      `${name} believes that if something is not written down, it never really happened.`,
      `${name} has more stories in their scrolls than most have in their heads.`,
    ],
    thief: [
      `${name} moves through the dark with the practiced ease of someone who owns nothing but the night.`,
      `${name} trades in secrets as readily as stolen goods.`,
      `${name} has a guild card and a list of people who owe them favors.`,
    ],
    mystic: [
      `${name} reads the walls like scripture and finds meaning in every crack.`,
      `${name} speaks in circles that somehow arrive at the truth.`,
      `${name} has seen things that most prefer not to imagine.`,
    ],
    wanderer: [
      `${name} carries a bag, a story, and the restless energy of someone who cannot settle.`,
      `${name} has been everywhere and remembers most of it.`,
      `${name} moves because staying still feels like drowning.`,
    ],
    hunter: [
      `${name} tracks prey through tunnels most would never dare enter.`,
      `${name} knows the forest the way a sailor knows the sea.`,
      `${name} hunts not for sport, but because the wild demands respect.`,
    ],
    fisher: [
      `${name} has learned to listen to the water and wait for its answers.`,
      `${name} fishes in the deep places where light forgets to go.`,
      `${name} believes the ocean has a memory longer than any human.`,
    ],
    hermit: [
      `${name} chose solitude and found that the silence had things to say.`,
      `${name} lives apart from the crowd but not from the world.`,
      `${name} has traded conversation for contemplation and does not regret it.`,
    ],
    goblin: [
      `${name} operates on a moral compass that points mostly toward profit.`,
      `${name} has a ledger, a quill, and a deeply suspicious relationship with honesty.`,
      `${name} speaks in numbers and occasionally in threats.`,
    ],
  };

  const roleExtras: Record<HumanRole, string[]> = {
    'house': [`${name} makes their home among the walls, finding comfort in the familiar.`, ''],
    'shopkeeper': [`${name} runs a stall with the practiced optimism of someone who has survived many lean seasons.`, ''],
    'quest-giver': [`${name} has tasks for those brave or foolish enough to listen.`, ''],
    'vendor': [`${name} sells what the world needs, whether the world knows it or not.`, ''],
    'guard': [`${name} keeps watch with the solemn dedication of a vow made long ago.`, ''],
    'romance': [`${name} has a warmth that cuts through the tunnel chill like sunlight through cracks.`, ''],
    'wanderer': [`${name} passes through, leaves impressions, and keeps moving.`, ''],
    'specialist': [`${name} has mastered a craft that most would find impossible or pointless.`, ''],
    'gossip': [`${name} knows everything that matters, or at least everything worth repeating.`, ''],
    'trainer': [`${name} can teach you to fight, but only if you can survive their methods.`, ''],
  };

  const typeIntro = intros[type][Math.floor(Math.random() * intros[type].length)];
  const roleExtra = roleExtras[role]
    ? roleExtras[role][Math.floor(Math.random() * roleExtras[role].length)]
    : '';

  return [typeIntro, roleExtra].filter(Boolean).join(' ');
}

// === DISSOLUTION ===

export function getDispositionForRole(role: HumanRole): import('./types.js').HumanDisposition {
  switch (role) {
    case 'shopkeeper':
    case 'vendor':
    case 'romance':
      return 'friendly';
    case 'guard':
      return 'suspicious';
    case 'quest-giver':
    case 'gossip':
      return 'suspicious';
    case 'trainer':
      return 'hostile';
    default:
      return 'neutral';
  }
}

// === CLEAR CACHE (for testing) ===

export function clearHumanStatsCache(): void {
  humanStatsCache.clear();
}
