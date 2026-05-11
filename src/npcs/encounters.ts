import { buildNpcStats } from './profiles.js';
import type { BiomeId } from '../world/biomes.js';
import { i18n } from '../i18n/i18nManager.js';
import type { CardId } from '../cards/cardGame.js';

export type WandererEncounterKind = 'duel' | 'quest' | 'flavor';
export type EncounterZoneTag = 'surface' | 'depths' | 'upper' | 'lower' | 'east' | 'west';

export interface EncounterHistoryEntry {
  seen: number;
  accepted: number;
  rejected: number;
}

export interface WandererEncounter {
  id: string;
  name: string;
  kind: WandererEncounterKind;
  weight: number;
  minRoomsVisited: number;
  oneShot?: boolean;
  zoneTags?: EncounterZoneTag[];
  biomeIds?: BiomeId[];
  portraitId?: 'sage-1' | 'sage-2' | 'sage-3' | 'goblin-happy' | 'goblin-neutral' | 'goblin-hostile';
  pages: string[];
  repeatPages?: string[];
  acceptLabel?: string;
  rejectLabel?: string;
  questId?: string;
  rewardScore?: number;
  rewardCardId?: CardId | 'random';
  startsCardGame?: boolean;
}

export interface WandererEncounterSelectionContext {
  roomsVisited: number;
  zoneTags: ReadonlySet<EncounterZoneTag>;
  biomeId: BiomeId;
  excludedIds: ReadonlySet<string>;
  history: ReadonlyMap<string, EncounterHistoryEntry>;
}

export const WANDERER_ENCOUNTERS: readonly WandererEncounter[] = [
  {
    id: 'goblin-nackle-receipts',
    name: 'Nackle the Receipt-Biter',
    kind: 'flavor',
    weight: 0.85,
    minRoomsVisited: 4,
    oneShot: true,
    zoneTags: ['lower', 'east'],
    biomeIds: ['ember-waste', 'sable-depths', 'moonlit-parish'],
    portraitId: 'goblin-neutral',
    pages: [
      'A goblin squats on a ledger bigger than his torso, chewing the corner of one page with deep professional resentment.',
      '"Snake got no pockets. Snake got no shoes. Snake still wants fair dealing? Hah. Horrible shape for business."',
      '"Take receipt-card. It proves nothing, which makes it very flexible. Use it bad, use it mean."',
    ],
    repeatPages: [
      'Nackle waves a damp ledger page like a flag from a doomed little kingdom.',
      '"No more free paper, long belly. Paper costs blood or teeth now."',
    ],
    acceptLabel: 'Take card',
    rejectLabel: 'Hiss off',
    rewardCardId: 'goblin-receipt',
  },
  {
    id: 'goblin-mott-warning',
    name: 'Mott of the Split Nail',
    kind: 'flavor',
    weight: 0.7,
    minRoomsVisited: 5,
    zoneTags: ['west', 'lower'],
    biomeIds: ['gloam-garden', 'ember-waste', 'sable-depths'],
    portraitId: 'goblin-happy',
    pages: [
      'A goblin peers from behind a cracked cooking shield, smiling with the private joy of someone watching a trap almost become educational.',
      '"Snake goes fast, snake dies flat. Mott has seen it. Mott laughed respectful-like."',
      '"Take shiny score crumb. Buy ward later. Or don\'t. Dead snakes are quiet customers."',
    ],
    acceptLabel: 'Take crumb',
    rejectLabel: 'Ignore',
    rewardScore: 6,
  },
  {
    id: 'goblin-vellum-debt',
    name: 'Vellum-Fang',
    kind: 'quest',
    weight: 0.75,
    minRoomsVisited: 6,
    oneShot: true,
    zoneTags: ['depths', 'lower'],
    biomeIds: ['sable-depths', 'ember-waste'],
    portraitId: 'goblin-neutral',
    pages: [
      'A goblin clerk stands beside a sack of bones sorted by size, tapping a quill against his teeth.',
      '"Bad thing happened. Ledger-stamp ran off. Maybe walked. Maybe stolen. Maybe Vellum-Fang dropped it and will never admit."',
      '"Snake finds stamp, brings back. Goblins stop saying snake is useless tube. Maybe."',
    ],
    repeatPages: [
      'Vellum-Fang squints at you like a debt that learned locomotion.',
      '"Stamp first. Talking after. That is civilized order."',
    ],
    acceptLabel: 'Take errand',
    rejectLabel: 'Refuse',
    questId: 'goblin-ledger-debt',
  },
  {
    id: 'maribel-cardwright',
    name: 'Maribel Cardwright',
    kind: 'flavor',
    weight: 0.85,
    minRoomsVisited: 2,
    zoneTags: ['surface', 'upper'],
    biomeIds: ['verdigris-basin', 'moonlit-parish', 'gloam-garden'],
    portraitId: 'sage-1',
    pages: [
      'Maribel sits behind a cracked travel case full of painted pasteboard, each card sleeved in wax paper and old superstition.',
      '"Cards are honest in the way knives are honest. They only ruin you if you pretend they are not sharp."',
      '"Take one. Build a little deck. Lose beautifully, then learn with your remaining dignity."',
    ],
    repeatPages: [
      'Maribel taps the travel case twice and smiles like a dealer hearing thunder approach.',
      '"Another card for the road. Do not spend all your caution in one hand."',
    ],
    acceptLabel: 'Take card',
    rejectLabel: 'Pass',
    rewardCardId: 'random',
  },
  {
    id: 'osric-window',
    name: 'Osric Window',
    kind: 'flavor',
    weight: 0.65,
    minRoomsVisited: 5,
    zoneTags: ['east', 'lower'],
    biomeIds: ['sable-depths', 'ember-waste', 'moonlit-parish'],
    portraitId: 'sage-2',
    pages: [
      'Osric lays five cards on a broken shield and measures the distance between them like a surgeon choosing where history should hurt.',
      '"Too little score is cowardice. Too much score is vanity. The correct number is the only number with manners."',
      '"Sit. One table. One lesson. If Freak Dennis is listening, let him learn fear through arithmetic."',
    ],
    repeatPages: [
      'Osric has already dealt the cards before you finish arriving.',
      '"Again. The window opens only for snakes willing to aim."',
    ],
    acceptLabel: 'Play',
    rejectLabel: 'Leave',
    startsCardGame: true,
  },
  {
    id: 'freak-joey',
    name: 'Freak Joey',
    kind: 'duel',
    weight: 0.85,
    minRoomsVisited: 2,
    oneShot: true,
    zoneTags: ['depths', 'lower'],
    biomeIds: ['sable-depths'],
    portraitId: 'sage-2',
    pages: [
      'He steps out of the lower dark wearing a grin too eager to belong to a living thing. The rooms around him go quiet in the way old chapels do when someone enters carrying murder like a sacrament.',
      '"They call me Freak Joey. Not because I was born wrong. Because I kept agreeing to become more wrong each time the tunnels asked."',
      '"Take the duel. Let the stone hear whether your courage is a living principle or just a noise your body makes before it is opened."',
    ],
    acceptLabel: 'Duel',
    rejectLabel: 'Refuse',
  },
  {
    id: 'lindsey-wanderer',
    name: 'Lindsey',
    kind: 'quest',
    weight: 1.05,
    minRoomsVisited: 3,
    oneShot: true,
    zoneTags: ['surface', 'east'],
    biomeIds: ['verdigris-basin', 'moonlit-parish', 'gloam-garden'],
    portraitId: 'sage-1',
    pages: [
      'Lindsey waits in the mouth of a ruined threshold with the composure of someone who has already outlived the panic that would ruin lesser creatures.',
      '"These upper rooms used to answer to surveyors, lamp-bearers, and clerks with steady hands. Now they answer mostly to hunger and accidents."',
      '"Go and name six chambers with your passing. If the dark means to keep swallowing memory, the least we can do is make it choke on record-keeping."',
    ],
    acceptLabel: 'Take quest',
    rejectLabel: 'Dismiss',
    questId: 'explore-6-rooms',
  },
  {
    id: 'ryan-wanderer',
    name: 'Ryan',
    kind: 'flavor',
    weight: 0.75,
    minRoomsVisited: 1,
    oneShot: true,
    zoneTags: ['surface', 'west'],
    biomeIds: ['ember-waste', 'verdigris-basin'],
    portraitId: 'sage-3',
    pages: [
      'Ryan has the look of a pilgrim who made peace with failure early and has been faithfully honoring that peace ever since.',
      '"I once thought these tunnels were a proving ground. Then I watched three braver snakes get reduced to history and loose scales before I finished that thought."',
      '"If gunfire starts, do not defend your pride. Pride is plentiful down here. Blood is not. Leave first. Reflect later, if the world is unusually merciful."',
    ],
    acceptLabel: 'Listen',
    rejectLabel: 'Move on',
    rewardScore: 4,
  },
  {
    id: 'aurex-wanderer',
    name: 'Aurex',
    kind: 'quest',
    weight: 0.95,
    minRoomsVisited: 4,
    zoneTags: ['upper', 'east'],
    biomeIds: ['moonlit-parish', 'gloam-garden'],
    portraitId: 'sage-1',
    pages: [
      'Aurex stands where a blade of pale light has managed, against all sense, to survive this far beneath the earth. It makes his stillness look ceremonial.',
      '"The upper passages remember order the way a corpse remembers heat. Not usefully. Only enough to be tragic."',
      '"Carry the old fast for me. Twenty seconds beside an empty mouth is not holiness, but it is long enough for the soul to reveal whether it still commands the body at all."',
    ],
    repeatPages: [
      'Aurex turns his head by a degree so slight it feels less like attention than judgment finally deciding to acknowledge a nuisance.',
      '"I asked for discipline, not another little speech from appetite wearing your face. Finish the rite, or spare me the rehearsal of your reasons."',
    ],
    acceptLabel: 'Take quest',
    rejectLabel: 'Scoff',
    questId: 'survive-20s-no-eat',
  },
  {
    id: 'belisar-wanderer',
    name: 'Belisar',
    kind: 'duel',
    weight: 0.7,
    minRoomsVisited: 6,
    zoneTags: ['depths', 'west'],
    biomeIds: ['sable-depths', 'ember-waste'],
    portraitId: 'sage-2',
    pages: [
      'Belisar rises from the western dark so quietly that for a moment it seems the room itself has chosen to stand up and address you.',
      '"No prayer. No bargain. I have listened to both from the mouths of dying things, and neither improved the ending."',
      '"Fight me. If your nerve is true, let it ring. If it is false, let the stone hear that as well. These halls deserve honest music for once."',
    ],
    repeatPages: [
      'Belisar regards you with the reserved contempt of an executioner forced to reschedule on account of weather.',
      '"Good. I despise unfinished measures. A refused duel rots in the memory like a body left in shallow earth."',
    ],
    acceptLabel: 'Fight',
    rejectLabel: 'Decline',
    rewardScore: 10,
  },
  {
    id: 'cyrene-wanderer',
    name: 'Cyrene',
    kind: 'flavor',
    weight: 0.9,
    minRoomsVisited: 2,
    zoneTags: ['lower', 'east'],
    biomeIds: ['verdigris-basin', 'gloam-garden', 'moonlit-parish'],
    portraitId: 'sage-3',
    pages: [
      'Cyrene draws a circle in the dust and the dust hesitates, as if uncertain whether it still belongs more to gravity or to whatever old vow animates her hand.',
      '"Every chamber in this place teaches the same lesson in a different dialect: remain moving, remain doubtful, and never mistake survival for pardon."',
      '"Your gift is speed. Guard it carefully. Velocity becomes stupidity the moment it starts believing itself chosen."',
    ],
    repeatPages: [
      'Cyrene recognizes you with a look too measured to count as warmth and too gentle to be called indifference.',
      '"Still alive. That means you are either learning, or the grave has misplaced your name for another day. I advise you not to grow arrogant about either possibility."',
    ],
    acceptLabel: 'Listen',
    rejectLabel: 'Leave',
    rewardScore: 5,
  },
];

export function getRoomEncounterTags(roomId: string): ReadonlySet<EncounterZoneTag> {
  const [roomX = 0, roomY = 0, roomZ = 0] = roomId.split(',').map(Number);
  const tags = new Set<EncounterZoneTag>();
  tags.add(roomZ >= 0 ? 'surface' : 'depths');
  tags.add(roomY <= 0 ? 'upper' : 'lower');
  tags.add(roomX >= 0 ? 'east' : 'west');
  return tags;
}

export function chooseWandererEncounter(
  rng: () => number,
  context: WandererEncounterSelectionContext,
): WandererEncounter | null {
  const candidates = WANDERER_ENCOUNTERS.filter((encounter) => {
    if (context.roomsVisited < encounter.minRoomsVisited) {
      return false;
    }
    if (context.excludedIds.has(encounter.id)) {
      return false;
    }
    if (encounter.zoneTags && !encounter.zoneTags.some((tag) => context.zoneTags.has(tag))) {
      return false;
    }
    return true;
  }).map((encounter) => {
    const history = context.history.get(encounter.id);
    const seen = history?.seen ?? 0;
    const rejected = history?.rejected ?? 0;
    const biomeBias = encounter.biomeIds?.includes(context.biomeId) ? 1.5 : 1;
    const adjustedWeight = Math.max(
      0.15,
      (encounter.weight * biomeBias) / (1 + seen * 0.35 + rejected * 0.25),
    );
    return { encounter, adjustedWeight };
  });

  if (candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.adjustedWeight, 0);
  let roll = rng() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.adjustedWeight;
    if (roll <= 0) {
      return candidate.encounter;
    }
  }
  return candidates[candidates.length - 1]?.encounter ?? null;
}

export function getEncounterPages(
  encounter: WandererEncounter,
  history: EncounterHistoryEntry | undefined,
): string[] {
  const translation = i18n.getNpcEncounter(encounter.id);

  if (translation && history && translation.pages) {
    return translation.pages;
  }

  if ((history?.seen ?? 0) > 0 && encounter.repeatPages && encounter.repeatPages.length > 0) {
    return encounter.repeatPages;
  }
  return encounter.pages;
}

export function getEncounterStatsNote(name: string): string {
  const stats = buildNpcStats(name);
  return `STR ${stats.str} DEX ${stats.dex} CON ${stats.con} INT ${stats.int} WIS ${stats.wis} CHA ${stats.cha}`;
}
