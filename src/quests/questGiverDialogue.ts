import type { Quest } from './quest.js';

export interface QuestGiverDialogueContext {
  /** Use the real Actor role where one exists; loose house NPCs are local sages. */
  role: string;
  giverName?: string;
  locationName?: string;
  /** Keep the existing scripted narrative for an actual named or anchored story giver. */
  preserveAuthored?: boolean;
}

type Voice = { opening: string; reason: string; closing: string };

const VOICES: Record<'sage' | 'resident' | 'guard' | 'wizard' | 'merchant' | 'thief' | 'civic' | 'bartender', Voice> = {
  sage: {
    opening: 'I have been keeping track of the trouble that passes through these rooms.',
    reason: 'I can point you toward the work, but I cannot promise the world will cooperate.',
    closing: 'Tell me what you discover. I would rather hear an imperfect truth than a polished guess.',
  },
  resident: {
    opening: 'Around here we all end up needing a hand sooner or later.',
    reason: 'It is a real problem for someone living here, not a tale for the tavern.',
    closing: 'No grand speeches. Just come back and tell me how it went.',
  },
  guard: {
    opening: 'The watch has more work than hands, and I need a capable volunteer.',
    reason: 'Every delay gives the roads one more opportunity to become dangerous.',
    closing: 'Report back with the facts. I will take facts over heroics any day.',
  },
  wizard: {
    opening: 'I have a proposition, and this time it is not an experimental curse.',
    reason: 'I know how the theory works. What I need is someone willing to test reality.',
    closing: 'Bring results, not guesses. If anything starts glowing, do not touch it twice.',
  },
  merchant: {
    opening: 'I have a practical problem, and I would rather pay attention to it before it gets expensive.',
    reason: 'Supply, trust, and a functioning road matter more than a heroic reputation.',
    closing: 'Come back with news. I like transactions where everybody survives.',
  },
  thief: {
    opening: 'Keep your voice down. I have some work that benefits from discretion.',
    reason: 'There are people who would rather you never found out what is going on.',
    closing: 'If anybody asks, this conversation was about the weather.',
  },
  civic: {
    opening: 'A town does not run on speeches alone. There is a matter needing attention.',
    reason: 'There are people depending on this, whether or not they know your name.',
    closing: 'Bring back a clear account. I will handle the paperwork.',
  },
  bartender: {
    opening: 'I hear about every problem that walks through that door, and one of them needs solving.',
    reason: 'A rumor becomes real trouble when the same people keep bringing it up.',
    closing: 'Come back in one piece. I will have a story waiting for you.',
  },
};

// Loose house sages are people, not one shared dialogue vending machine. Give
// each generated resident a stable voice based on their generated identity.
const HOUSE_VOICES: readonly Voice[] = [
  VOICES.sage,
  {
    opening: 'I have checked the road twice today. Something about it still bothers me.',
    reason: 'I would handle this myself, except somebody needs to keep an eye on the place.',
    closing: 'When you return, knock twice. I am not opening the door for every passing noise.',
  },
  {
    opening: 'I keep notes on travelers and the things they manage to survive.',
    reason: 'There is a pattern here. I will understand it better once I hear what happened.',
    closing: 'I would appreciate a careful account, even if the answer is simply that it was difficult.',
  },
  {
    opening: 'I do not ordinarily ask strangers for favors, but I need some practical help.',
    reason: 'I would rather solve a small problem today than explain a large disaster tomorrow.',
    closing: 'Find me here when you are done. I believe in settling what I owe.',
  },
  {
    opening: 'The last traveler who came through gave me a good story and a terrible warning.',
    reason: 'Most of what people say is rumor. The important part is finding out what is true.',
    closing: 'Tell me the interesting details. No need to make yourself the hero of every sentence.',
  },
];

function voiceForHouseGiver(name: string | undefined): Voice {
  if (!name) return HOUSE_VOICES[0]!;
  let hash = 0;
  for (let index = 0; index < name.length; index++) {
    hash = (Math.imul(hash, 31) + name.charCodeAt(index)) >>> 0;
  }
  return HOUSE_VOICES[hash % HOUSE_VOICES.length]!;
}

function voiceForRole(role: string): Voice {
  if (role === 'guard' || role === 'gateGuard') return VOICES.guard;
  if (role === 'wizard' || role === 'potionMaker') return VOICES.wizard;
  if (role === 'thief' || role === 'thiefContact' || role === 'guildContact') return VOICES.thief;
  if (role === 'civicOfficial' || role === 'scribe') return VOICES.civic;
  if (role === 'bartender' || role === 'innkeeper' || role === 'cardDealer') return VOICES.bartender;
  if (role === 'shopkeeper' || role.endsWith('Merchant') || role === 'butcher') return VOICES.merchant;
  return VOICES[role as keyof typeof VOICES] ?? VOICES.sage;
}

function stakesForQuest(id: string): string {
  if (/hunt|bear|wolf|rabbit|hide|herd|animal/.test(id)) {
    return 'The creatures outside have their own plans. Treat them as living dangers, not decorations.';
  }
  if (/apple|honey|food|fish|snack|ramen|garden/.test(id)) {
    return 'Food does not appear because somebody wrote it on a list. Somebody has to do the work.';
  }
  if (/explor|room|temple|treasure|archaeology|biome/.test(id)) {
    return 'There is more out there than anyone has managed to put on a reliable map.';
  }
  if (/alchemy|potion|powerup|craft|upgrade|furnish/.test(id)) {
    return 'Experience is worth more than a clever theory when something goes wrong.';
  }
  if (/tax|ledger|debt|trade|purchase|kingdom|settlement/.test(id)) {
    return 'There is always somebody counting the cost, even when nobody agrees what it should be.';
  }
  return 'The task may sound small. That does not mean the consequences are.';
}

/**
 * Loose NPCs cannot safely recite the hard-coded personal histories in legacy
 * dialogue ("my son", "my clutch-brother"): those belong to no particular actor.
 * Give them a consistent role voice while retaining the objective as authored.
 */
export function contextualQuestPages(
  quest: Pick<Quest, 'id' | 'label' | 'description'>,
  context: QuestGiverDialogueContext,
  authoredPages: readonly string[],
): string[] {
  const voice = context.role === 'sage'
    ? voiceForHouseGiver(context.giverName)
    : voiceForRole(context.role);
  const location = context.locationName ? ` Around ${context.locationName}, that matters.` : '';
  const request = quest.description.replace(/[.\s]+$/, '') + '.';
  if (context.preserveAuthored && authoredPages.length > 0) {
    return [voice.opening + location, ...authoredPages, voice.closing];
  }
  return [
    voice.opening + location,
    `Here is what needs doing: ${request} ${stakesForQuest(quest.id)}`,
    `${voice.reason} ${voice.closing}`,
  ];
}

/** Reactions use the same identity as the offer, instead of a universal stock line. */
export function questGiverStatusLine(
  context: QuestGiverDialogueContext,
  status: 'active' | 'completed' | 'none',
  questLabel?: string,
): string {
  const voice = context.role === 'sage'
    ? voiceForHouseGiver(context.giverName)
    : voiceForRole(context.role);
  switch (status) {
    case 'active':
      return `I still need the work on ${questLabel ?? 'that job'} finished. ${voice.closing}`;
    case 'completed':
      return `${questLabel ?? 'That job'} is already behind us. ${voice.closing}`;
    case 'none':
      return `Nothing I can use your help with right now. ${voice.reason}`;
  }
}
