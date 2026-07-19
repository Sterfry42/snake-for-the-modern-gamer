/**
 * Human Encounters
 *
 * The wise old snake was planned to have human encounters but never did.
 * The wise old snake's first human encounter would have been a turning point.
 *
 * This module defines all human encounter scenarios — shops, quests,
 * duels, gossip sessions, romance opportunities, and trivia challenges.
 * Each encounter has weighted selection, biome filtering, and history
 * tracking to create dynamic, replayable interactions.
 */
import type { BiomeId } from '../world/biomes.js';
import type { HumanEncounter, HumanType, HumanEncounterKind } from './types.js';
import { i18n } from '../i18n/i18nManager.js';
import { buildHumanStats } from './humanProfiles.js';

// === ENCOUNTER HISTORY ===

export interface EncounterHistoryEntry {
  seen: number;
  accepted: number;
  rejected: number;
}

export interface HumanEncounterContext {
  roomsVisited: number;
  biomeId: BiomeId;
  excludedIds: ReadonlySet<string>;
  history: ReadonlyMap<string, EncounterHistoryEntry>;
  hasFlag?(key: string): boolean;
}

// === SHOP ENCOUNTERS ===

export const HUMAN_SHOP_ENCOUNTERS: readonly HumanEncounter[] = [
  {
    id: 'village-shop',
    name: 'Village Shop',
    type: 'merchant',
    kind: 'shop',
    weight: 2.0,
    minRoomsVisited: 1,
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish'],
    portraitId: 'shopkeeper-neutral',
    pages: [
      'A wooden counter stretches across the room, laden with goods arranged by someone who cares about presentation even underground.',
      '"Welcome, welcome! Take a look. If you see something you like, we can discuss terms. If you do not, we can discuss why."',
      '"Fair prices for fair snakes. No haggling after noon. That is the rule."',
    ],
    repeatPages: [
      'The shopkeeper polishes an item that is already clean and looks up with practiced amiability.',
      '"Back for more? Good. The shelves are restocked. The prices are not."',
    ],
    acceptLabel: 'Browse',
    rejectLabel: 'Leave',
    shopId: 'village-shop',
  },
  {
    id: 'desert-shop',
    name: 'Desert Peddler',
    type: 'merchant',
    kind: 'shop',
    weight: 1.5,
    minRoomsVisited: 3,
    biomeIds: ['liberty-badlands', 'ember-waste'],
    portraitId: 'desert-peddler-suspicious',
    pages: [
      'A weathered stall sits in the middle of the badlands, surrounded by canvas sheets that do little to keep out the heat.',
      '"Exotic goods from distant places. Some of them are still distant. Some of them are not. Hard to say."',
      '"Prices are firm. Haggling is for people who enjoy disappointment."',
    ],
    repeatPages: [
      'The peddler eyes you with the cautious optimism of someone who has been burned before.',
      '"Still looking? Everything you want is here. Everything you need is not."',
    ],
    acceptLabel: 'Browse',
    rejectLabel: 'Move on',
    shopId: 'desert-shop',
  },
  {
    id: 'ocean-shop',
    name: 'Ocean Fisher\'s Stall',
    type: 'fisher',
    kind: 'shop',
    weight: 1.5,
    minRoomsVisited: 2,
    biomeIds: ['sunken-ocean'],
    portraitId: 'ocean-fisher-neutral',
    pages: [
      'A makeshift stall built from driftwood and netting, displaying the day\'s catch arranged with the care of someone who respects their trade.',
      '"Fresh from the deep. Not everything survived the ascent, but what did is worth eating."',
      '"Trade fish for supplies. Or trade stories. I accept both."',
    ],
    repeatPages: [
      'The fisher sorts through a basket of silver-scaled catches without looking up.',
      '"The water gave today. Tomorrow is not guaranteed. Buy now or regret later."',
    ],
    acceptLabel: 'Browse catch',
    rejectLabel: 'Keep fishing',
    shopId: 'ocean-shop',
  },
  {
    id: 'goblin-shop',
    name: 'Goblin Market',
    type: 'goblin',
    kind: 'shop',
    weight: 1.2,
    minRoomsVisited: 4,
    biomeIds: ['sable-depths', 'ember-waste'],
    portraitId: 'goblin-merchant-happy',
    pages: [
      'A goblin squats behind a counter made of stolen door panels, counting coins with the focused intensity of a mathematician solving for profit.',
      '"Welcome to the finest establishment in the lower depths. Terms are non-negotiable. That is not a threat. It is a statement of fact."',
      '"Take a look. If you can afford it, we can proceed. If you cannot, enjoy the window shopping."',
    ],
    repeatPages: [
      'The goblin taps a ledger with a quill and eyes you over the top of it.',
      '"Still here? Good. I was starting to think you were just browsing. Browsers do not pay."',
    ],
    acceptLabel: 'Browse',
    rejectLabel: 'Leave',
    shopId: 'goblin-shop',
  },
  {
    id: 'ramen-shop',
    name: 'Ramen Stand',
    type: 'cook',
    kind: 'shop',
    weight: 1.5,
    minRoomsVisited: 2,
    biomeIds: ['jade-peak-province'],
    portraitId: 'ramen-cook-happy',
    pages: [
      'Steam rises from a modest wooden stand where a chef with ink-dark hair stirs a pot that smells like heaven\'s cafeteria.',
      '"Welcome! The broth is simmering, the noodles are ready, and the attitude is optional."',
      '"Try the special. It does not bite back. Usually."',
    ],
    repeatPages: [
      'The chef slides a steaming bowl across the counter without breaking concentration.',
      '"More broth? Or are you still deciding whether you deserve it?"',
    ],
    acceptLabel: 'Order ramen',
    rejectLabel: 'Just smelling',
    shopId: 'ramen-shop',
  },
  {
    id: 'cooking-shop',
    name: 'Village Kitchen',
    type: 'cook',
    kind: 'shop',
    weight: 1.0,
    minRoomsVisited: 2,
    biomeIds: ['verdigris-basin', 'gloam-garden'],
    portraitId: 'cook-happy',
    pages: [
      'A warm kitchen filled with the scent of cooking herbs and something that might be soup or might be hope.',
      '"Hungry? Good. That means you are alive. Alive people eat. Eating people survive. It is a beautiful cycle."',
      '"I cook what I have. I have what I can find. It is enough."',
    ],
    repeatPages: [
      'The cook stirs a pot and hums a tune that sounds like a lullaby for tired travelers.',
      '"Back so soon? The pot is always full for those who know when to return."',
    ],
    acceptLabel: 'Order food',
    rejectLabel: 'Not hungry',
    shopId: 'cooking-shop',
  },
  {
    id: 'shrine-shop',
    name: 'Shrine Offerings',
    type: 'mystic',
    kind: 'shop',
    weight: 1.0,
    minRoomsVisited: 3,
    biomeIds: ['jade-peak-province'],
    portraitId: 'sage-1',
    pages: [
      'A small shrine glows with the soft light of paper lanterns. Offerings are arranged with meticulous care.',
      '"The kami accept many things. Apples, patience, and honest effort are always welcome."',
      '"Take a charm. It will not save you. But it might remind you to try harder."',
    ],
    repeatPages: [
      'The shrine maiden bows. The lanterns flicker in response.',
      '"The shrine is always open. The kami are always listening. The question is whether you are ready to hear back."',
    ],
    acceptLabel: 'Take blessing',
    rejectLabel: 'Bow and leave',
    shopId: 'shrine-shop',
  },
];

// === QUEST ENCOUNTERS ===

export const HUMAN_QUEST_ENCOUNTERS: readonly HumanEncounter[] = [
  {
    id: 'elder-tale-quest',
    name: 'Settlement Elder',
    type: 'resident',
    kind: 'quest',
    weight: 1.0,
    minRoomsVisited: 3,
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish'],
    portraitId: 'villager-old-neutral',
    pages: [
      'An elder sits in a carved wooden chair, eyes sharp despite the years, watching you with the patient intensity of someone who has waited a long time to tell a story.',
      '"These tunnels hold memories. Some of them are buried. Some of them are waiting."',
      '"Go and find the oldest chamber you can. Bring back what it has to say. The walls remember what the living forget."',
    ],
    repeatPages: [
      'The elder nods slowly, as if measuring your worth against some invisible standard.',
      '"You return. Good. The walls have more to share. Are you ready to listen?"',
    ],
    acceptLabel: 'Accept quest',
    rejectLabel: 'Not now',
    questId: 'elder-tale',
  },
  {
    id: 'scribe-record-quest',
    name: 'Chamber Scribe',
    type: 'scribe',
    kind: 'quest',
    weight: 0.8,
    minRoomsVisited: 4,
    biomeIds: ['verdigris-basin', 'sable-depths'],
    portraitId: 'villager-neutral',
    pages: [
      'A scribe hunched over a desk made of stacked crates, ink-stained fingers flying across parchment with the urgency of someone racing against time.',
      '"The records are incomplete. The chambers keep changing, and the scrolls keep losing their meaning."',
      '"Map the unmapped. Record the unrecorded. Bring me something that has never been written down."',
    ],
    repeatPages: [
      'The scribe adjusts their spectacles and peers at you over a mountain of papers.',
      '"Still writing? Good. The ink never dries, and neither does the work."',
    ],
    acceptLabel: 'Take the task',
    rejectLabel: 'Too much paperwork',
    questId: 'scribe-record',
  },
  {
    id: 'thief-guild-quest',
    name: 'Guild Contact',
    type: 'thief',
    kind: 'quest',
    weight: 0.7,
    minRoomsVisited: 6,
    biomeIds: ['sable-depths', 'ember-waste'],
    portraitId: 'bandit-neutral',
    pages: [
      'A figure in a dark corner counts coins with one hand and signals with the other. The shadows seem to cling to them like a second skin.',
      '"The guild has a proposition. Nothing illegal. Mostly. Depends on your definition of illegal."',
      '"Do this for us, and you will be rewarded. Do it badly, and you will be remembered. Do not do it, and you will be forgotten."',
    ],
    repeatPages: [
      'The contact leans closer, voice dropping to a whisper that carries further than it should.',
      '"Still thinking? The offer expires in thirty seconds. I count them."',
    ],
    acceptLabel: 'Accept the job',
    rejectLabel: 'Not my style',
    questId: 'thief-guild',
  },
  {
    id: 'mystic-riddle-quest',
    name: 'Cave Hermit',
    type: 'mystic',
    kind: 'quest',
    weight: 0.5,
    minRoomsVisited: 5,
    biomeIds: ['sable-depths', 'jade-peak-province'],
    portraitId: 'jade-monk-neutral',
    pages: [
      'A figure sits cross-legged before a wall covered in chalk symbols, speaking to the wall as if it might answer.',
      '"The maze asks questions. Most snakes answer wrong. You might be different. You might not."',
      '"Find the chamber where the walls whisper back. Bring me a translation. Or a echo. Or a silence that means something."',
    ],
    repeatPages: [
      'The hermit turns slowly, eyes reflecting something that is not light.',
      '"You have not found it yet. The walls are patient. I am not."',
    ],
    acceptLabel: 'Seek the whispering chamber',
    rejectLabel: 'Too cryptic',
    questId: 'mystic-riddle',
  },
  {
    id: 'guard-patrol-quest',
    name: 'Town Captain',
    type: 'guard',
    kind: 'quest',
    weight: 0.9,
    minRoomsVisited: 5,
    biomeIds: ['verdigris-basin', 'gloam-garden'],
    portraitId: 'guard-neutral',
    pages: [
      'A captain stands at attention, posture rigid, eyes scanning the corridor with the practiced vigilance of someone who has never truly relaxed.',
      '"The patrol routes need reinforcement. Three sectors are understaffed. The dark does not care about staffing levels."',
      '"Take the watch. Map the patrol zones. Make sure the walls hold. That is all."',
    ],
    repeatPages: [
      'The captain nods once, sharply.',
      '"You are still here. Good. The walls need watching. They always do."',
    ],
    acceptLabel: 'Take the watch',
    rejectLabel: 'Not a guard',
    questId: 'guard-patrol',
  },
  {
    id: 'hunter-tracking-quest',
    name: 'Forest Hunter',
    type: 'hunter',
    kind: 'quest',
    weight: 0.8,
    minRoomsVisited: 3,
    biomeIds: ['verdigris-basin', 'elderwood-maze'],
    portraitId: 'hunter-suspicious',
    pages: [
      'A hunter checks a trap line with methodical precision, fingers reading the forest floor like a scribe reading text.',
      '"Something is moving through the upper rooms. Big. Fast. Not animal. Not quite human either."',
      '"Track it. Find where it nests. Tell me what it is. I do not ask for this lightly."',
    ],
    repeatPages: [
      'The hunter tightens a strap and eyes the corridor with narrowed focus.',
      '"Still tracking? The trail does not wait forever. Neither do I."',
    ],
    acceptLabel: 'Accept the hunt',
    rejectLabel: 'Not my hunt',
    questId: 'hunter-tracking',
  },
];

// === DUEL ENCOUNTERS ===

export const HUMAN_DUEL_ENCOUNTERS: readonly HumanEncounter[] = [
  {
    id: 'captain-duel',
    name: 'Town Captain',
    type: 'guard',
    kind: 'duel',
    weight: 0.6,
    minRoomsVisited: 5,
    biomeIds: ['verdigris-basin', 'gloam-garden'],
    portraitId: 'guard-neutral',
    pages: [
      'The captain steps forward, posture shifting from guard to challenger in a movement so smooth it looks rehearsed.',
      '"You move through my territory without permission. That is either bravery or stupidity. I prefer to find out which."',
      '"Draw. Let the stone decide whether you belong here."',
    ],
    repeatPages: [
      'The captain draws a training blade with a sound like a sigh.',
      '"Again. If you are going to fail, at least fail with style."',
    ],
    acceptLabel: 'Fight',
    rejectLabel: 'Yield',
    duelDifficulty: 'normal',
    rewardScore: 15,
  },
  {
    id: 'thief-duel',
    name: 'Guild Enforcer',
    type: 'thief',
    kind: 'duel',
    weight: 0.4,
    minRoomsVisited: 7,
    biomeIds: ['sable-depths', 'ember-waste'],
    portraitId: 'bandit-hostile',
    pages: [
      'A figure steps from the shadows, hands raised in a gesture that could be a greeting or a threat depending on your perspective.',
      '"You broke a rule. I am the rulebreaker who enforces the rules. Irony is not lost on me."',
      '"Fight me. Win, and you learn something. Lose, and you learn the same thing differently."',
    ],
    repeatPages: [
      'The enforcer cracks their knuckles with the casual menace of someone who has done this many times.',
      '"Still standing? Impressive. Let us see if it lasts."',
    ],
    acceptLabel: 'Fight',
    rejectLabel: 'Talk it out',
    duelDifficulty: 'hard',
    rewardScore: 25,
  },
  {
    id: 'wanderer-duel',
    name: 'Roadside Challenger',
    type: 'wanderer',
    kind: 'duel',
    weight: 0.5,
    minRoomsVisited: 3,
    biomeIds: [
      'verdigris-basin',
      'gloam-garden',
      'moonlit-parish',
      'liberty-badlands',
      'ember-waste',
    ],
    portraitId: 'sage-3',
    pages: [
      'A wanderer blocks the corridor with the casual confidence of someone who has nothing to lose and everything to prove.',
      '"I do not know you. You do not know me. That is why this is fair."',
      '"One exchange. Then we part. Win or lose, we both walk away with something."',
    ],
    repeatPages: [
      'The wanderer stretches with the loose-limbed grace of a predator at rest.',
      '"Again. I am not tired. Are you?"',
    ],
    acceptLabel: 'Fight',
    rejectLabel: 'Pass',
    duelDifficulty: 'easy',
    rewardScore: 8,
  },
];

// === GOSSIP ENCOUNTERS ===

export const HUMAN_GOSSIP_ENCOUNTERS: readonly HumanEncounter[] = [
  {
    id: 'resident-gossip',
    name: 'Settler',
    type: 'resident',
    kind: 'gossip',
    weight: 2.0,
    minRoomsVisited: 1,
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish', 'liberty-badlands'],
    portraitId: 'villager-neutral',
    pages: [
      'A resident leans against a wall, watching you pass with the mild interest of someone who has seen every snake shape imaginable.',
      '"You look lost. Or you look like you are looking for something. Those are almost the same thing down here."',
      '"Heard anything interesting? I have heard everything. Most of it is exaggerated."',
    ],
    repeatPages: [
      'The resident nods as if something has been confirmed that they already suspected.',
      '"Still here? Good. I was running low on things to gossip about."',
    ],
    acceptLabel: 'Listen',
    rejectLabel: 'Keep moving',
    rewardScore: 2,
  },
  {
    id: 'wanderer-gossip',
    name: 'Traveler',
    type: 'wanderer',
    kind: 'gossip',
    weight: 1.5,
    minRoomsVisited: 1,
    biomeIds: [
      'verdigris-basin',
      'gloam-garden',
      'moonlit-parish',
      'liberty-badlands',
      'ember-waste',
      'sable-depths',
    ],
    portraitId: 'sage-2',
    pages: [
      'A traveler sits on a crate, sharpening a blade with the rhythmic patience of someone who has nothing but time.',
      '"I have been through every biome in this place. Every one. Some of them are worse than they look. Some are better."',
      '"Ask me anything. I probably know the answer. Or at least I know someone who does."',
    ],
    repeatPages: [
      'The traveler pauses sharpening and looks up with a smile that does not reach their eyes.',
      '"Still talking? Good. Conversation keeps the dark at bay."',
    ],
    acceptLabel: 'Ask questions',
    rejectLabel: 'Let them rest',
    rewardScore: 3,
  },
  {
    id: 'cook-gossip',
    name: 'Village Cook',
    type: 'cook',
    kind: 'gossip',
    weight: 1.0,
    minRoomsVisited: 2,
    biomeIds: ['verdigris-basin', 'gloam-garden'],
    portraitId: 'cook-happy',
    pages: [
      'The cook wipes their hands on an apron that has seen better decades and looks up with the warmth of someone who feeds the world.',
      '"Hungry? No? Well, hunger is just gossip the body tells itself. Eat something. Then we can talk."',
      '"I hear everything in the kitchen. The walls have ears. The pots have opinions."',
    ],
    repeatPages: [
      'The cook stirs a pot and hums, glancing over their shoulder with a knowing look.',
      '"Back for more stories? The soup is almost ready. So am I."',
    ],
    acceptLabel: 'Listen and eat',
    rejectLabel: 'Keep cooking',
    rewardScore: 2,
  },
  {
    id: 'goblin-gossip',
    name: 'Goblin Clerk',
    type: 'goblin',
    kind: 'gossip',
    weight: 0.8,
    minRoomsVisited: 4,
    biomeIds: ['sable-depths', 'ember-waste'],
    portraitId: 'goblin-clerk-suspicious',
    pages: [
      'A goblin clerk looks up from a ledger with the weary expression of someone who has processed too many debts and not enough gratitude.',
      '"You want gossip? Gossip costs. Not coins. Information. Trade me a secret, and I will trade you three."',
      '"The lower depths are full of stories. Most of them involve money. Some involve blood. Rarely both in equal measure."',
    ],
    repeatPages: [
      'The goblin taps their quill against the ledger and regards you with narrowed eyes.',
      '"Still here? The secrets are piling up. Can you keep up?"',
    ],
    acceptLabel: 'Trade secrets',
    rejectLabel: 'Too expensive',
    rewardScore: 4,
  },
];

// === ROMANCE ENCOUNTERS ===

export const HUMAN_ROMANCE_ENCOUNTERS: readonly HumanEncounter[] = [
  {
    id: 'resident-romance',
    name: 'Settlement Resident',
    type: 'resident',
    kind: 'romance',
    weight: 0.5,
    minRoomsVisited: 4,
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish'],
    portraitId: 'villager-young-happy',
    pages: [
      'A resident watches you with an expression that is harder to read than a goblin\'s ledger — not because it is complex, but because it is honest.',
      '"You pass through often. I notice. That is either a compliment or a warning, depending on how you take it."',
      '"We could talk. Not about the tunnels. About something else. Something that does not involve survival."',
    ],
    repeatPages: [
      'The resident smiles — a real one, not the practiced smile of a shopkeeper or the guarded smile of a guard.',
      '"You came back. That is... unexpected. And welcome."',
    ],
    acceptLabel: 'Talk',
    rejectLabel: 'Not now',
    romanceId: 'resident-romance',
  },
  {
    id: 'mystic-romance',
    name: 'Cave Hermit',
    type: 'mystic',
    kind: 'romance',
    weight: 0.3,
    minRoomsVisited: 6,
    biomeIds: ['sable-depths', 'jade-peak-province'],
    portraitId: 'jade-monk-neutral',
    pages: [
      'The hermit sits in silence so complete it feels like a presence. When they speak, the words carry the weight of someone who has chosen to mean them.',
      '"I have spent years learning to listen to the walls. You speak louder than most."',
      '"Stay a while. Not for the quest. Not for the answer. Just... stay."',
    ],
    repeatPages: [
      'The hermit looks up, and for a moment the ancient wisdom in their eyes is replaced by something simpler.',
      '"You always return. I told myself it was curiosity. I am beginning to wonder if I was wrong."',
    ],
    acceptLabel: 'Stay',
    rejectLabel: 'I must move on',
    romanceId: 'mystic-romance',
  },
];

// === TRIVIA ENCOUNTERS ===

export const HUMAN_TRIVIA_ENCOUNTERS: readonly HumanEncounter[] = [
  {
    id: 'scribe-trivia',
    name: 'Chamber Scribe',
    type: 'scribe',
    kind: 'trivia',
    weight: 0.6,
    minRoomsVisited: 4,
    biomeIds: ['verdigris-basin', 'sable-depths'],
    portraitId: 'villager-neutral',
    pages: [
      'The scribe looks up from their scrolls with the eager expression of someone who has been waiting for an audience.',
      '"I have a question for you. Answer correctly, and I will share knowledge. Answer incorrectly, and you will learn something through embarrassment."',
      '"What is the oldest chamber in the lower depths? Think carefully. The answer is not what you expect."',
    ],
    repeatPages: [
      'The scribe adjusts their spectacles and produces another scroll.',
      '"Again. I have more questions. You have more chances to be wrong."',
    ],
    acceptLabel: 'Accept challenge',
    rejectLabel: 'Too academic',
    rewardScore: 10,
  },
  {
    id: 'mystic-trivia',
    name: 'Cave Hermit',
    type: 'mystic',
    kind: 'trivia',
    weight: 0.4,
    minRoomsVisited: 5,
    biomeIds: ['sable-depths', 'jade-peak-province'],
    portraitId: 'jade-monk-neutral',
    pages: [
      'The hermit speaks without looking up, as if the answer is written in the air between you.',
      '"The maze is not a place. It is a question. What is the answer?"',
      '"Think. The walls are listening. They will correct you if you are wrong."',
    ],
    repeatPages: [
      'The hermit smiles — a small, private thing.',
      '"You are thinking too hard. The answer is simpler than you think. It is always simpler."',
    ],
    acceptLabel: 'Accept the riddle',
    rejectLabel: 'Too philosophical',
    rewardScore: 12,
  },
];

// === MASTER LIST ===

export const HUMAN_ENCOUNTERS: readonly HumanEncounter[] = [
  ...HUMAN_SHOP_ENCOUNTERS,
  ...HUMAN_QUEST_ENCOUNTERS,
  ...HUMAN_DUEL_ENCOUNTERS,
  ...HUMAN_GOSSIP_ENCOUNTERS,
  ...HUMAN_ROMANCE_ENCOUNTERS,
  ...HUMAN_TRIVIA_ENCOUNTERS,
];

// === ENCOUNTER SELECTION ===

export function chooseHumanEncounter(
  rng: () => number,
  context: HumanEncounterContext,
): HumanEncounter | null {
  const candidates = HUMAN_ENCOUNTERS.filter((encounter) => {
    if (context.roomsVisited < encounter.minRoomsVisited) return false;
    if (context.excludedIds.has(encounter.id)) return false;
    if (encounter.biomeIds && !encounter.biomeIds.includes(context.biomeId)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const weighted = candidates.map((encounter) => {
    const history = context.history.get(encounter.id);
    const seen = history?.seen ?? 0;
    const rejected = history?.rejected ?? 0;
    const adjustedWeight = Math.max(0.1, encounter.weight / (1 + seen * 0.3 + rejected * 0.2));
    return { encounter, adjustedWeight };
  });

  const totalWeight = weighted.reduce((sum, c) => sum + c.adjustedWeight, 0);
  let roll = rng() * totalWeight;
  for (const candidate of weighted) {
    roll -= candidate.adjustedWeight;
    if (roll <= 0) return candidate.encounter;
  }
  return weighted[weighted.length - 1]?.encounter ?? null;
}

// === ENCOUNTER HELPERS ===

export function getEncounterPages(
  encounter: HumanEncounter,
  history: EncounterHistoryEntry | undefined,
): string[] {
  const translation = i18n.getHumanEncounter(encounter.id);
  if (translation && history && translation.pages) {
    return translation.pages;
  }
  if ((history?.seen ?? 0) > 0 && encounter.repeatPages && encounter.repeatPages.length > 0) {
    return encounter.repeatPages;
  }
  return encounter.pages;
}

export function getEncounterStatsNote(name: string, type: HumanType): string {
  const stats = buildHumanStats(name, type);
  return `STR ${stats.str} DEX ${stats.dex} CON ${stats.con} INT ${stats.int} WIS ${stats.wis} CHA ${stats.cha}`;
}
