import type { FactionId } from '../factions/factions.js';
import type {
  DatingCandidateView,
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipEncounter,
  RelationshipEventResult,
  RelationshipPreferenceProfile,
  RelationshipSpecies,
  RelationshipStage,
  RelationshipState,
  RelationshipTalkResult,
} from './relationshipTypes.js';

interface RelationshipRuntime {
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
}

const STATES_FLAG = 'relationships.states';
const LAST_ENCOUNTER_FLAG = 'relationships.lastEncountered';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizePortrait(species: RelationshipSpecies, portraitId?: string): string {
  if (portraitId) return portraitId;
  if (species === 'goblin' || species === 'goblin-angel') return 'goblin-neutral';
  if (species === 'angel') return 'sage-3';
  return 'sage-1';
}

export class RelationshipController {
  constructor(private readonly runtime: RelationshipRuntime) {}

  getAllStates(): RelationshipState[] {
    const raw = this.runtime.getFlag<Record<string, RelationshipState>>(STATES_FLAG) ?? {};
    return Object.values(raw).map((state) => this.normalizeState(state));
  }

  getState(id: string): RelationshipState | undefined {
    return this.getStateMap()[id];
  }

  ensureCandidate(profile: RelationshipCandidateProfile, roomsVisited: number): RelationshipState {
    const states = this.getStateMap();
    const existing = states[profile.id];
    if (existing) {
      const updated = {
        ...existing,
        displayName: profile.displayName,
        portraitId: normalizePortrait(profile.species, profile.portraitId),
        homeRoomId: profile.homeRoomId ?? existing.homeRoomId,
        factionId: profile.factionId ?? existing.factionId,
      };
      this.saveState(updated);
      return updated;
    }

    const state: RelationshipState = {
      id: profile.id,
      displayName: profile.displayName,
      species: profile.species,
      homeRoomId: profile.homeRoomId,
      factionId: profile.factionId,
      portraitId: normalizePortrait(profile.species, profile.portraitId),
      stage: 'stranger',
      affection: 0,
      trust: 0,
      jealousy: 0,
      resentment: 0,
      fear: 0,
      fascination: profile.species.includes('angel') ? 12 : 0,
      lastSeenRoomsVisited: roomsVisited,
      acceptedDates: 0,
      rejectedDates: 0,
      ignoredEncounters: 0,
      romanceOptIn: false,
      flags: {},
    };
    this.saveState(state);
    return state;
  }

  getDatingTabView(roomsVisited: number, factionLabel: (id?: FactionId) => string): DatingCandidateView[] {
    return this.getAllStates()
      .filter((state) => state.romanceOptIn || state.stage !== 'stranger' || state.affection !== 0 || state.resentment > 0)
      .sort((a, b) => this.stageWeight(b.stage) - this.stageWeight(a.stage) || b.affection - a.affection)
      .map((state) => {
        const preferences = this.getPreferences(state);
        return {
          id: state.id,
          displayName: state.displayName,
          species: state.species,
          factionLabel: factionLabel(state.factionId),
          stage: state.stage,
          affection: state.affection,
          trust: state.trust,
          jealousy: state.jealousy,
          resentment: state.resentment,
          fear: state.fear,
          fascination: state.fascination,
          lastSeenRoomsAgo: Math.max(0, roomsVisited - state.lastSeenRoomsVisited),
          likes: [...preferences.lovedItemTags, ...preferences.likedItemTags].slice(0, 5),
          personality: this.getPersonality(state),
          personalityDescription: this.getPersonalityDescription(state),
          warning: this.getWarning(state, roomsVisited),
        };
      });
  }

  applyChoice(id: string, choice: RelationshipChoice, roomsVisited: number): RelationshipEventResult {
    const state = this.getState(id);
    if (!state) {
      return { ok: false, title: 'No One', message: 'That relationship is not available.', color: '#ff6b6b' };
    }
    const next = { ...state, flags: { ...state.flags }, lastSeenRoomsVisited: roomsVisited };

    const repetitionPenalty = this.getRepetitionPenalty(next, choice, roomsVisited);

    switch (choice) {
      case 'talk':
        next.affection += Math.max(0, 2 - repetitionPenalty);
        next.trust += Math.max(0, 2 - repetitionPenalty);
        next.fascination += 1;
        break;
      case 'flirt':
        if (next.stage === 'hostile' || next.stage === 'murderous') {
          return { ok: false, title: state.displayName, message: 'They look at your flirtation like it is evidence.', color: '#ff6b6b', state };
        }
        next.romanceOptIn = true;
        next.affection += Math.max(1, 8 - repetitionPenalty * 2);
        next.fascination += Math.max(1, 5 - repetitionPenalty);
        next.trust += next.resentment > 20 ? -2 : Math.max(0, 1 - repetitionPenalty);
        if (repetitionPenalty >= 3) next.resentment += 2;
        this.applyJealousyToOthers(next.id);
        break;
      case 'ask-out':
        next.romanceOptIn = true;
        if (next.affection >= 35 && next.trust >= 10 && next.resentment < 45) {
          next.acceptedDates += 1;
          next.affection += 12;
          next.trust += 8;
          next.flags.firstDateAccepted = true;
          this.applyJealousyToOthers(next.id, 16);
        } else {
          next.rejectedDates += 1;
          next.affection -= 3;
          next.resentment += next.resentment > 25 ? 6 : 1;
        }
        break;
      case 'date':
        next.romanceOptIn = true;
        if (next.stage === 'hostile' || next.stage === 'murderous') {
          return { ok: false, title: state.displayName, message: 'They refuse the date with the clarity of a drawn blade.', color: '#ff6b6b', state };
        }
        if (next.affection >= 28 && next.trust >= 8 && next.resentment < 55) {
          next.acceptedDates += 1;
          next.affection += Math.max(3, 14 - repetitionPenalty * 2);
          next.trust += Math.max(2, 9 - repetitionPenalty);
          next.fascination += Math.max(1, 4 - repetitionPenalty);
          next.flags.firstDateAccepted = true;
          this.applyJealousyToOthers(next.id, 12);
        } else {
          next.rejectedDates += 1;
          next.affection -= 4;
          next.resentment += 4 + repetitionPenalty;
        }
        break;
      case 'apologize':
        next.trust += 8;
        next.resentment -= 12;
        next.jealousy -= 5;
        break;
      case 'boundary':
        next.romanceOptIn = false;
        next.jealousy = Math.max(0, next.jealousy - 18);
        next.resentment = Math.max(0, next.resentment - 4);
        next.flags.boundarySet = true;
        break;
      case 'mean':
        next.affection -= 10;
        next.trust -= 8;
        next.resentment += 14;
        next.fear += next.stage === 'dating' || next.stage === 'lover' ? 4 : 1;
        break;
      case 'break-up':
        next.romanceOptIn = false;
        next.affection -= next.stage === 'lover' ? 25 : 16;
        next.trust -= 18;
        next.resentment += next.stage === 'lover' ? 36 : 24;
        next.jealousy = Math.max(0, next.jealousy - 12);
        next.flags.ruthlessBreakup = true;
        break;
    }
    this.recordChoiceUse(next, choice, roomsVisited);

    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: this.describeChoice(saved, choice),
      color: this.colorFor(saved),
      state: saved,
      becameHostile: saved.stage === 'hostile' || saved.stage === 'murderous',
    };
  }

  getTalkLine(id: string, roomsVisited: number, rng: () => number): RelationshipTalkResult | null {
    const state = this.getState(id);
    if (!state) {
      return null;
    }
    const next = this.finalize({
      ...state,
      lastSeenRoomsVisited: roomsVisited,
      trust: state.trust + 1,
      affection: state.affection + (state.romanceOptIn ? 1 : 0),
    });
    const pool = this.getOpeningLinePool(next);
    return {
      title: next.displayName,
      line: pool[Math.floor(rng() * pool.length)] ?? pool[0],
      color: this.colorFor(next),
      state: next,
    };
  }

  applyGift(id: string, itemId: string, itemName: string, tags: string[], roomsVisited: number): RelationshipEventResult {
    const state = this.getState(id);
    if (!state) {
      return { ok: false, title: 'No One', message: 'No one accepts the gift.', color: '#ff6b6b' };
    }
    const preferences = this.getPreferences(state);
    const next = { ...state, flags: { ...state.flags }, lastGiftRoomsVisited: roomsVisited, lastSeenRoomsVisited: roomsVisited };
    let tone: 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated' = 'neutral';

    if (preferences.tabooItemIds?.includes(itemId) || tags.some((tag) => preferences.hatedItemTags.includes(tag))) {
      tone = 'hated';
      next.affection -= 15;
      next.resentment += 20;
      next.trust -= 8;
    } else if (preferences.favoriteItemIds?.includes(itemId) || tags.some((tag) => preferences.lovedItemTags.includes(tag))) {
      tone = 'loved';
      next.affection += 12;
      next.trust += 4;
      next.jealousy -= 4;
    } else if (tags.some((tag) => preferences.likedItemTags.includes(tag))) {
      tone = 'liked';
      next.affection += 6;
      next.trust += 2;
    } else if (tags.some((tag) => preferences.dislikedItemTags.includes(tag))) {
      tone = 'disliked';
      next.affection -= 5;
      next.resentment += 4;
    } else {
      next.affection += 1;
    }
    next.romanceOptIn = next.romanceOptIn || tone === 'loved';

    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: this.describeGift(saved, itemName, tone),
      color: this.colorFor(saved),
      state: saved,
      becameHostile: saved.stage === 'hostile' || saved.stage === 'murderous',
    };
  }

  tickNeglect(roomsVisited: number): RelationshipEventResult[] {
    const results: RelationshipEventResult[] = [];
    for (const state of this.getAllStates()) {
      if (state.stage !== 'dating' && state.stage !== 'lover') continue;
      const roomsAgo = roomsVisited - state.lastSeenRoomsVisited;
      if (roomsAgo < 14) continue;
      const next = { ...state, jealousy: state.jealousy + 4, resentment: state.resentment + 3, ignoredEncounters: state.ignoredEncounters + 1 };
      const saved = this.finalize(next);
      if (saved.ignoredEncounters !== state.ignoredEncounters) {
        results.push({
          ok: true,
          title: saved.displayName,
          message: `${saved.displayName} has started counting the rooms since you last made time.`,
          color: '#ffbdfd',
          state: saved,
        });
      }
    }
    return results;
  }

  chooseRelationshipEncounter(roomsVisited: number, rng: () => number): RelationshipEncounter | null {
    const last = this.runtime.getFlag<string>(LAST_ENCOUNTER_FLAG);
    const candidates = this.getAllStates().filter((state) => state.romanceOptIn && state.id !== last);
    const dangerous = candidates.find((state) => state.stage === 'murderous' || state.stage === 'hostile');
    const neglected = candidates.find((state) => (state.stage === 'dating' || state.stage === 'lover') && roomsVisited - state.lastSeenRoomsVisited >= 10);
    const warm = candidates.filter((state) => state.stage === 'dating' || state.stage === 'lover' || state.stage === 'crush');
    const chosen = dangerous ?? neglected ?? warm[Math.floor(rng() * Math.max(1, warm.length))];
    if (!chosen) return null;
    this.runtime.setFlag(LAST_ENCOUNTER_FLAG, chosen.id);

    if (chosen.stage === 'hostile' || chosen.stage === 'murderous') {
      return {
        relationshipId: chosen.id,
        kind: 'hostile',
        title: chosen.displayName,
        pages: [
          `${chosen.displayName} arrives with the terrible calm of someone who has rehearsed mercy and rejected it.`,
          '"I wanted a promise. I have accepted evidence instead."',
        ],
        acceptLabel: 'Face them',
        rejectLabel: 'Flee',
      };
    }
    if (neglected?.id === chosen.id) {
      return {
        relationshipId: chosen.id,
        kind: chosen.jealousy > 45 ? 'jealous' : 'longing',
        title: chosen.displayName,
        pages: [
          `${chosen.displayName} finds you between rooms, expression too composed to be accidental.`,
          chosen.jealousy > 45
            ? '"You make absence look like a hobby. Should I learn from you, or should I be offended correctly?"'
            : '"I am not asking for your whole life. I am asking not to be misplaced in it."',
        ],
        acceptLabel: 'Reassure',
        rejectLabel: 'Ignore',
      };
    }
    return {
      relationshipId: chosen.id,
      kind: 'gift',
      title: chosen.displayName,
      pages: [
        `${chosen.displayName} appears with a gift held like a verdict.`,
        '"Take it. Do not make a ceremonial disaster of gratitude."',
      ],
      acceptLabel: 'Accept gift',
      rejectLabel: 'Decline',
      rewardScore: 12,
    };
  }

  recordEncounterOutcome(id: string, accepted: boolean, roomsVisited: number): RelationshipEventResult {
    const state = this.getState(id);
    if (!state) {
      return { ok: false, title: 'No One', message: 'The encounter dissolves.', color: '#ff6b6b' };
    }
    const next = { ...state, lastSeenRoomsVisited: roomsVisited };
    if (accepted) {
      next.affection += 5;
      next.trust += 5;
      next.jealousy -= 8;
      next.resentment -= 5;
    } else {
      next.ignoredEncounters += 1;
      next.trust -= 8;
      next.resentment += 9;
      next.jealousy += 6;
    }
    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: accepted
        ? `${saved.displayName} believes you, for now.`
        : `${saved.displayName} files the silence where tenderness used to be.`,
      color: this.colorFor(saved),
      state: saved,
      becameHostile: saved.stage === 'hostile' || saved.stage === 'murderous',
    };
  }

  private getStateMap(): Record<string, RelationshipState> {
    const raw = this.runtime.getFlag<Record<string, RelationshipState>>(STATES_FLAG) ?? {};
    const states: Record<string, RelationshipState> = {};
    for (const [id, state] of Object.entries(raw)) {
      states[id] = this.normalizeState(state);
    }
    return states;
  }

  private saveState(state: RelationshipState): void {
    const states = this.getStateMap();
    states[state.id] = state;
    this.runtime.setFlag(STATES_FLAG, states);
  }

  private finalize(state: RelationshipState): RelationshipState {
    const next = this.normalizeState({
      ...state,
      affection: clamp(state.affection, -100, 100),
      trust: clamp(state.trust, -100, 100),
      jealousy: clamp(state.jealousy, 0, 100),
      resentment: clamp(state.resentment, 0, 100),
      fear: clamp(state.fear, 0, 100),
      fascination: clamp(state.fascination, -100, 100),
    });
    next.stage = this.deriveStage(next);
    this.saveState(next);
    return next;
  }

  private normalizeState(state: RelationshipState): RelationshipState {
    return {
      ...state,
      stage: state.stage ?? 'stranger',
      jealousy: Math.max(0, Number(state.jealousy ?? 0)),
      resentment: Math.max(0, Number(state.resentment ?? 0)),
      fear: Math.max(0, Number(state.fear ?? 0)),
      fascination: Number(state.fascination ?? 0),
      acceptedDates: Math.max(0, Number(state.acceptedDates ?? 0)),
      rejectedDates: Math.max(0, Number(state.rejectedDates ?? 0)),
      ignoredEncounters: Math.max(0, Number(state.ignoredEncounters ?? 0)),
      romanceOptIn: Boolean(state.romanceOptIn),
      flags: state.flags ?? {},
    };
  }

  private deriveStage(state: RelationshipState): RelationshipStage {
    const wasSerious = state.stage === 'dating' || state.stage === 'lover' || Boolean(state.flags.firstDateAccepted);
    if (wasSerious && state.resentment >= 80 && state.jealousy >= 70 && state.trust <= -40) return 'murderous';
    if (state.resentment >= 65 || state.fear >= 75) return 'hostile';
    if (wasSerious && (state.resentment >= 45 || state.trust <= -20)) return 'estranged';
    if (wasSerious && state.affection >= 70 && state.trust >= 50) return 'lover';
    if (wasSerious) return 'dating';
    if (state.romanceOptIn && state.affection >= 45 && state.trust >= 20 && state.resentment < 30) return 'crush';
    if (state.affection >= 25 && state.trust >= 10) return 'friendly';
    if (state.affection >= 10 || state.trust >= 8 || state.fascination >= 15) return 'acquaintance';
    return 'stranger';
  }

  private getPreferences(state: RelationshipState): RelationshipPreferenceProfile {
    if (state.species === 'goblin' || state.species === 'goblin-angel') {
      return {
        likedItemTags: ['contract', 'hide', 'tool', 'card'],
        lovedItemTags: ['ledger', 'ward', 'meat'],
        dislikedItemTags: ['holy', 'sentimental'],
        hatedItemTags: ['debt-forgiveness'],
        favoriteItemIds: ['ring-ledger', 'raw-meat', 'hide'],
        personalityTags: ['legalistic', 'possessive', 'sharp'],
      };
    }
    if (state.species === 'angel') {
      return {
        likedItemTags: ['holy', 'mercy', 'warmth'],
        lovedItemTags: ['phoenix', 'veil', 'luminous'],
        dislikedItemTags: ['gore', 'contract'],
        hatedItemTags: ['insult', 'debt'],
        favoriteItemIds: ['amulet-phoenix', 'cloak-veil'],
        personalityTags: ['severe', 'merciful', 'absolute'],
      };
    }
    return {
      likedItemTags: ['food', 'warmth', 'card', 'home'],
      lovedItemTags: ['honey', 'cooked', 'feather'],
      dislikedItemTags: ['gore', 'debt'],
      hatedItemTags: ['raw', 'contract'],
      favoriteItemIds: ['honey', 'cooked-meat', 'cooked-fish', 'feather'],
      personalityTags: ['earnest', 'dramatic', 'village'],
    };
  }

  private applyJealousyToOthers(exceptId: string, amount = 8): void {
    for (const state of this.getAllStates()) {
      if (state.id === exceptId || !state.romanceOptIn) continue;
      if (state.stage !== 'dating' && state.stage !== 'lover' && state.stage !== 'crush') continue;
      this.finalize({ ...state, jealousy: state.jealousy + amount, trust: state.trust - 2 });
    }
  }

  private describeChoice(state: RelationshipState, choice: string): string {
    const line = this.getLinePool(state, choice)[0];
    const response = `"${line}"`;
    switch (choice) {
      case 'flirt':
        return `${response}\nLiked: ${state.displayName} liked the attention. Stage: ${state.stage}.`;
      case 'ask-out':
        return state.flags.firstDateAccepted
          ? `${response}\n${state.displayName} accepts. The date is now a fact the world must survive.`
          : `${response}\n${state.displayName} refuses with enough dignity to make the floor nervous.`;
      case 'date':
        return state.flags.firstDateAccepted
          ? `${response}\nLoved: the date clearly went well. Stage: ${state.stage}.`
          : `${response}\nDisliked: they are not ready for a date yet.`;
      case 'apologize':
        return `${response}\nLiked: the apology helped. Resentment is lower.`;
      case 'boundary':
        return `${response}\nRespected: the romance route is cooled without cruelty.`;
      case 'mean':
        return `${response}\nDisliked: you hurt them on purpose. Resentment rises.`;
      case 'break-up':
        return `${response}\nHated: the breakup was cruel. Trust drops hard.`;
      default:
        return `${response}\nLiked: conversation helped a little.`;
    }
  }

  private describeGift(state: RelationshipState, itemName: string, tone: string): string {
    const response = `"${this.getLinePool(state, `gift-${tone}`)[0]}"`;
    if (tone === 'loved') return `${response}\nLoved: ${itemName} is exactly their kind of gift.`;
    if (tone === 'liked') return `${response}\nLiked: ${itemName} fits their taste.`;
    if (tone === 'disliked') return `${response}\nDisliked: ${itemName} annoyed them.`;
    if (tone === 'hated') return `${response}\nHated: ${itemName} hit a taboo.`;
    return `${response}\nNeutral: ${itemName} was acceptable, but not personal.`;
  }

  private getLinePool(state: RelationshipState, context: string): string[] {
    const personality = this.getPersonality(state);
    const personalityLines = this.getPersonalityLines(state);
    if (state.stage === 'murderous' || state.stage === 'hostile') {
      return personalityLines.hostile;
    }
    if (state.resentment >= 45) {
      return personalityLines.hurt;
    }
    if (state.jealousy >= 45) {
      return [
        'How generous of you to remember which heart you are currently haunting.',
        'If this is attention, I would hate to see your neglect sharpened.',
      ];
    }
    if (this.hasOtherSeriousRomance(state)) {
      if (state.stage === 'dating' || state.stage === 'lover' || state.stage === 'crush') {
        return [
          'I hear your devotion has been taking scenic routes through other people. Explain carefully.',
          'Do not smile at me with a mouth that has been promising elsewhere.',
          'Tell me whether I am beloved, convenient, or merely next in line. Choose slowly.',
        ];
      }
      return [
        'You collect intense conversations, apparently. I hope you label them better than your promises.',
        'Someone else has your attention. I can smell the drama from here.',
      ];
    }
    if (context === 'flirt') {
      return personalityLines.flirt;
    }
    if (context === 'ask-out') {
      return state.affection >= 35 && state.trust >= 10
        ? ['Fine. One date. If destiny interrupts, I am charging destiny for the table.']
        : ['No. Not yet. Wanting a scene does not mean you have earned the route.'];
    }
    if (context === 'date') {
      return personalityLines.date;
    }
    if (context === 'mean') {
      return ['Ah. There is the version of you that tenderness kept warning me about.'];
    }
    if (context === 'break-up') {
      return ['You could have been kind. Fascinating that you chose theatre instead.'];
    }
    if (context === 'apologize') {
      return ['An apology is not a key. But it is, at least, a hand no longer holding a knife.'];
    }
    if (context === 'boundary') {
      return ['Then let us be honest instead of dramatic. I can respect that.'];
    }
    if (context.startsWith('gift-loved')) {
      return ['You noticed. That is more dangerous than the gift.'];
    }
    if (context.startsWith('gift-liked')) {
      return ['Acceptable. Disturbingly acceptable.'];
    }
    if (context.startsWith('gift-hated')) {
      return ['This is not a gift. This is a thesis on why I should bite you.'];
    }
    if (context.startsWith('gift-disliked')) {
      return ['I will keep it as evidence that you tried with insufficient research.'];
    }
    if (state.stage === 'lover' || state.stage === 'dating') {
      return personalityLines.dating;
    }
    if (state.stage === 'crush') {
      return personalityLines.crush;
    }
    if (state.species === 'goblin') {
      return [
        'Speak quickly. My patience has a ledger and your name is gaining entries.',
        'You smell like coin, trouble, and poor contract literacy.',
      ];
    }
    if (personality === 'poetic') {
      return personalityLines.neutral;
    }
    if (personality === 'deadpan') {
      return personalityLines.neutral;
    }
    if (personality === 'hungry') {
      return personalityLines.neutral;
    }
    if (personality === 'regal') {
      return personalityLines.neutral;
    }
    return [
      'Careful. Around here, even small talk grows teeth.',
      'You have the look of someone about to make my day less ordinary.',
    ];
  }

  private getWarning(state: RelationshipState, roomsVisited: number): string | undefined {
    const roomsAgo = roomsVisited - state.lastSeenRoomsVisited;
    if (state.stage === 'murderous') return 'murderous route active';
    if (state.stage === 'hostile') return 'hostile';
    if (state.jealousy >= 55) return 'jealous and watching';
    if (state.resentment >= 45) return 'resentment is high';
    if ((state.stage === 'dating' || state.stage === 'lover') && roomsAgo >= 14) return 'neglected';
    return undefined;
  }

  private colorFor(state: RelationshipState): string {
    if (state.stage === 'hostile' || state.stage === 'murderous') return '#ff6b6b';
    if (state.stage === 'dating' || state.stage === 'lover' || state.stage === 'crush') return '#ffbdfd';
    return '#9ad1ff';
  }

  private stageWeight(stage: RelationshipStage): number {
    return ['stranger', 'acquaintance', 'friendly', 'crush', 'dating', 'lover', 'estranged', 'hostile', 'murderous'].indexOf(stage);
  }

  private getOpeningLinePool(state: RelationshipState): string[] {
    if (this.hasOtherSeriousRomance(state) && (state.romanceOptIn || state.stage !== 'stranger')) {
      return [
        'I heard. Of course I heard. Affection is loudest when it thinks it is being discreet.',
        'You smell like someone else said your name softly. I am deciding how furious to be.',
        'Before you begin, decide whether this is confession, defense, or comedy.',
      ];
    }
    return this.getLinePool(state, 'talk');
  }

  private getPersonalityDescription(state: RelationshipState): string {
    const personality = this.getPersonality(state);
    const descriptions: Record<string, string> = {
      poetic: 'Poetic romantic. Likes sincerity, dramatic gestures, and being understood. Dislikes mockery.',
      deadpan: 'Deadpan guarded. Likes clear effort and dry jokes. Dislikes empty charm.',
      hungry: 'Warm appetite. Likes food, comfort, and practical kindness. Dislikes waste and cruelty.',
      regal: 'Proud and intense. Likes respect, courage, and honesty. Dislikes cowardice.',
      sharp: 'Sharp negotiator. Likes boldness, useful gifts, and clever answers. Dislikes weakness and bad deals.',
    };
    return descriptions[personality] ?? descriptions.poetic;
  }

  private hasOtherSeriousRomance(state: RelationshipState): boolean {
    return this.getAllStates().some(
      (other) =>
        other.id !== state.id &&
        other.romanceOptIn &&
        (other.stage === 'dating' || other.stage === 'lover' || other.stage === 'crush'),
    );
  }

  private getPersonality(state: RelationshipState): 'poetic' | 'deadpan' | 'hungry' | 'regal' | 'sharp' {
    if (state.species === 'goblin' || state.species === 'goblin-angel') return 'sharp';
    if (state.species === 'angel') return 'regal';
    const options = ['poetic', 'deadpan', 'hungry', 'regal', 'sharp'] as const;
    let total = 0;
    for (let i = 0; i < state.id.length; i += 1) total = (total * 31 + state.id.charCodeAt(i)) >>> 0;
    return options[total % options.length] ?? 'poetic';
  }

  private getPersonalityLines(state: RelationshipState): {
    neutral: string[];
    crush: string[];
    dating: string[];
    flirt: string[];
    date: string[];
    hurt: string[];
    hostile: string[];
  } {
    const personality = this.getPersonality(state);
    const lines = {
      poetic: {
        neutral: [
          'I like when you talk to me like the room has gotten quieter on purpose.',
          'You have a way of arriving like weather I wanted but refused to name.',
          'Say something real. I like real things, even when they bruise.',
        ],
        crush: [
          'I am glad you came back. There, I said the obvious thing before it became poetry.',
          'You make me nervous in a way I mostly enjoy. Do not look too proud of that.',
          'I like talking to you. It keeps making ordinary moments act expensive.',
        ],
        dating: [
          'I missed you. I am trying not to say it like a confession, but it is one.',
          'Stay close. I like who I become when you are listening.',
          'You are mine in the soft, impossible way a song gets stuck in someone brave.',
        ],
        flirt: [
          'I liked that. You sounded ridiculous and sincere, which is a dangerous combination.',
          'That made me happy. Do it again when I am less prepared.',
          'I am blushing. Pretend you do not see it and I may forgive you faster.',
        ],
        date: [
          'Yes. I want the date. I want the whole dramatic little disaster with you.',
          'I had a good time. That is not subtle, but I am tired of pretending subtle is honest.',
          'This worked on me. You worked on me. I am admitting both.',
        ],
        hurt: [
          'That hurt. I still like you, and that is the worst part.',
          'I am upset because I wanted better from you specifically.',
          'Do not make me feel foolish for caring. I hate that more than the injury.',
        ],
        hostile: [
          'I loved the idea of you. I am furious at the evidence.',
          'Do not dress danger as intimacy. I can hear the costume tearing.',
        ],
      },
      deadpan: {
        neutral: [
          'I like direct conversation. This qualifies if you keep the nonsense under control.',
          'You may speak. I have lowered my standards to conversational.',
          'I am interested. Mildly. Do not make that weird.',
        ],
        crush: [
          'I am glad you are here. There, now neither of us has to act confused.',
          'You are becoming a habit. Annoyingly, I like this habit.',
          'I like you. That is the sentence. Do not add fireworks to it.',
        ],
        dating: [
          'I missed you. This is not a debate topic.',
          'You are important to me. I am saying it plainly so you cannot dodge it.',
          'Yes, I am happy to see you. No, I will not perform a festival about it.',
        ],
        flirt: [
          'That worked. I dislike that it worked, but it worked.',
          'I liked that. Your smug expression is the only downside.',
          'Good flirt. Terrible self-control on my part.',
        ],
        date: [
          'I liked the date. Simple report. Strong result.',
          'That was good. I would repeat the experiment.',
          'You did well. Please do not make me say it with more adjectives.',
        ],
        hurt: [
          'That bothered me. I am telling you because I still care about the repair.',
          'You hurt me. Do not make me explain why that should matter.',
        ],
        hostile: [
          'I am done making your cruelty interesting.',
          'You are standing inside my last good opinion. Move carefully.',
        ],
      },
      hungry: {
        neutral: [
          'I like food, warmth, and people who do not make affection complicated on purpose.',
          'If you brought snacks, I already like this conversation more.',
          'You look like trouble. I like trouble best with dinner.',
        ],
        crush: [
          'I am glad you are talking to me. You are warmer than you pretend.',
          'You make me hungry and happy and I am choosing not to unpack that.',
          'I like when you show up. It makes the day taste better.',
        ],
        dating: [
          'I missed you. Come closer and tell me if you ate.',
          'I like you loudly. Subtlety is for people with smaller appetites.',
          'You are my favorite bad decision and I want dinner with it.',
        ],
        flirt: [
          'I liked that. It was sweet enough to count as dessert.',
          'Say that again after food and I may become impossible.',
          'That made me happy. You are dangerously edible as company.',
        ],
        date: [
          'I loved that date. Feed me, flatter me, and keep choosing me.',
          'That was good. Next time, more food and even less pretending.',
        ],
        hurt: [
          'That hurt my feelings. Yes, I have them. No, you may not act surprised.',
          'You made this feel cold. I hate cold. Fix it.',
        ],
        hostile: [
          'I wanted warmth from you. You brought teeth.',
          'Go away before I decide anger is dinner.',
        ],
      },
      regal: {
        neutral: [
          'I value courage, respect, and people who do not flinch from honest answers.',
          'Approach. If you want my attention, spend it well.',
          'I am listening. Earn the luxury.',
        ],
        crush: [
          'I am pleased you returned. Do not mistake restraint for indifference.',
          'You interest me. That is rarer than it sounds.',
          'I like your courage when it remembers manners.',
        ],
        dating: [
          'I missed you. Yes, I am saying it plainly. Treasure the event.',
          'You stand beside me well. I like that more than I intended.',
          'You have my affection. Treat it like a crown you can still drop.',
        ],
        flirt: [
          'I liked that. Bold, respectful, and only slightly reckless.',
          'That pleased me. Continue with that exact level of danger.',
          'You flirt like someone willing to be judged. I approve.',
        ],
        date: [
          'The date pleased me. You were brave when it counted.',
          'I enjoyed myself. Do not cheapen that by looking shocked.',
        ],
        hurt: [
          'You disappointed me. I say that because I expected more.',
          'That was beneath you, which means it was beneath us.',
        ],
        hostile: [
          'Mercy had its hearing. You argued against it beautifully.',
          'Kneel, flee, or fight. I am finished with ambiguity.',
        ],
      },
      sharp: {
        neutral: [
          'I like boldness, useful gifts, and people who read the fine print before flirting.',
          'Talk fast. If you are clever, I may overcharge you less emotionally.',
          'You smell like coin, trouble, and possible entertainment. Continue.',
        ],
        crush: [
          'I like you. There, a clean confession. I will bill myself for the weakness.',
          'You keep coming back. Good. I was about to miss you aggressively.',
          'I am glad you are here. Do not make me repeat anything tender for free.',
        ],
        dating: [
          'I missed you. Disgusting. Profitable. Come here.',
          'You are mine by preference, not contract. Somehow worse.',
          'I like us. If you ruin it, I will itemize the damages.',
        ],
        flirt: [
          'I liked that. Reckless, flattering, and almost legally actionable.',
          'Good. That flirt had teeth. I respect teeth.',
          'That worked. I am annoyed, impressed, and interested.',
        ],
        date: [
          'The date was good. I am satisfied and therefore suspicious.',
          'I liked that outing. Next time, bring snacks or leverage.',
        ],
        hurt: [
          'That hurt. I am not hiding it; I am calculating interest.',
          'You upset me. Repair terms are available if you can afford sincerity.',
        ],
        hostile: [
          'You breached the softest contract. I am done being generous.',
          'This is not a gift. This is a thesis on why I should bite you.',
        ],
      },
    } as const;
    return lines[personality];
  }

  private getRepetitionPenalty(state: RelationshipState, choice: RelationshipChoice, roomsVisited: number): number {
    const history = this.getChoiceHistory(state);
    const entry = history[choice];
    if (!entry || roomsVisited - entry.room > 8) return 0;
    return Math.min(5, entry.count);
  }

  private recordChoiceUse(state: RelationshipState, choice: RelationshipChoice, roomsVisited: number): void {
    const history = this.getChoiceHistory(state);
    const current = history[choice];
    history[choice] =
      current && roomsVisited - current.room <= 8
        ? { room: roomsVisited, count: current.count + 1 }
        : { room: roomsVisited, count: 1 };
    state.flags.actionHistory = history;
  }

  private getChoiceHistory(state: RelationshipState): Record<string, { room: number; count: number }> {
    const raw = state.flags.actionHistory;
    if (!raw || typeof raw !== 'object') return {};
    return raw as Record<string, { room: number; count: number }>;
  }
}
