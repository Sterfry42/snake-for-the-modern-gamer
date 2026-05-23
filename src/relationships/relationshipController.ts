import type { FactionId } from '../factions/factions.js';
import type {
  DatingCandidateView,
  DatingBranchChoice,
  ConflictStyle,
  ExclusivityPreference,
  NeglectTier,
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipEncounter,
  RelationshipCutscene,
  RelationshipEventResult,
  RelationshipMemory,
  RelationshipOutcomeTier,
  RelationshipPreferenceProfile,
  RelationshipPersonality,
  RelationshipReward,
  RelationshipSpecies,
  RelationshipStage,
  RelationshipState,
  RelationshipTag,
  RelationshipTalkResult,
} from './relationshipTypes.js';

interface RelationshipRuntime {
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
}

const STATES_FLAG = 'relationships.states';
const LAST_ENCOUNTER_FLAG = 'relationships.lastEncountered';
const CUTSCENES_FLAG = 'relationships.cutscenes';
const LAST_MAJOR_EVENT_ROOM_FLAG = 'relationships.lastMajorEventRoom';
const MAX_MEMORIES_PER_RELATIONSHIP = 24;
const FORCEABLE_STAGES = new Set<RelationshipStage>([
  'married',
  'heartbroken',
  'vengeful',
  'estranged',
  'hostile',
  'murderous',
  'dead',
]);

const PERSONALITY_TAG_WEIGHTS: Record<RelationshipPersonality, Partial<Record<RelationshipTag, number>>> = {
  poetic: { dramatic: 3, honesty: 4, privateAffection: 3, commitment: 4, bravery: 2, selfPreserving: -2, avoidance: -4, betrayal: -8, giftSpamming: -5 },
  deadpan: { honesty: 4, competence: 3, pragmatic: 4, clever: 2, dramatic: -3, neediness: -2, giftSpamming: -4, publicAffection: -1, selfPreserving: 2 },
  hungry: { food: 6, comfort: 4, protective: 3, loyalty: 4, neglect: -5, betrayal: -8, selfPreserving: -1, family: 4 },
  regal: { bravery: 4, protective: 4, ritual: 5, commitment: 5, humility: 3, avoidance: -4, publicAffection: 2, betrayal: -10, secrecy: -6, marriage: 5 },
  sharp: { clever: 5, pragmatic: 5, selfPreserving: 3, transaction: 4, contract: 5, competence: 4, dramatic: -1, neediness: -3, betrayal: -7, ledger: 4, goblin: 3 },
};

const TIER_DELTAS: Record<RelationshipOutcomeTier, Partial<Pick<RelationshipState, 'affection' | 'trust' | 'fascination' | 'resentment' | 'jealousy'>>> = {
  loved: { affection: 8, trust: 4, fascination: 3, resentment: -3 },
  liked: { affection: 4, trust: 2, fascination: 1 },
  neutral: { fascination: 1 },
  disliked: { affection: -3, trust: -2, resentment: 3 },
  hated: { affection: -8, trust: -6, resentment: 8, jealousy: 2 },
};

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
        actorId: profile.actorId ?? existing.actorId,
        displayName: profile.displayName,
        portraitId: normalizePortrait(profile.species, profile.portraitId),
        homeRoomId: profile.homeRoomId ?? existing.homeRoomId,
        factionId: profile.factionId ?? existing.factionId,
        conflictStyle: profile.conflictStyle ?? existing.conflictStyle,
        exclusivityPreference: profile.exclusivityPreference ?? existing.exclusivityPreference,
      };
      this.saveState(updated);
      return updated;
    }

    const state: RelationshipState = {
      id: profile.id,
      actorId: profile.actorId,
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
      conflictStyle: profile.conflictStyle ?? this.deriveConflictStyle(profile),
      exclusivityPreference: profile.exclusivityPreference ?? this.deriveExclusivityPreference(profile),
      memories: [],
      children: [],
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
          memories: state.memories.slice(-5),
          spouseId: this.getCurrentSpouse()?.id,
        };
      });
  }

  getCurrentSpouse(): RelationshipState | undefined {
    return this.getAllStates().find((state) => state.stage === 'married' && !state.flags.dead);
  }

  getSocialContext(): {
    spouseId?: string;
    lovers: string[];
    dating: string[];
    crushes: string[];
    exes: string[];
    deadRomances: string[];
  } {
    const states = this.getAllStates();
    return {
      spouseId: states.find((state) => state.stage === 'married' && !state.flags.dead)?.id,
      lovers: states.filter((state) => state.stage === 'lover' && !state.flags.dead).map((state) => state.id),
      dating: states.filter((state) => state.stage === 'dating' && !state.flags.dead).map((state) => state.id),
      crushes: states.filter((state) => state.stage === 'crush' && !state.flags.dead).map((state) => state.id),
      exes: states
        .filter((state) => state.stage === 'estranged' || state.stage === 'heartbroken' || state.stage === 'vengeful')
        .map((state) => state.id),
      deadRomances: states.filter((state) => state.stage === 'dead' || state.flags.dead).map((state) => state.id),
    };
  }

  enqueueCutscene(cutscene: RelationshipCutscene): void {
    const queue = this.getCutsceneQueue().filter((entry) => entry.id !== cutscene.id);
    queue.push(cutscene);
    queue.sort((a, b) => b.priority - a.priority);
    this.runtime.setFlag(CUTSCENES_FLAG, queue.slice(0, 12));
  }

  popNextCutscene(relationshipId?: string, roomsVisited?: number): RelationshipCutscene | undefined {
    const queue = this.getCutsceneQueue();
    const index = queue.findIndex((cutscene) => !relationshipId || cutscene.relationshipId === relationshipId);
    if (index < 0) {
      return undefined;
    }
    if (
      roomsVisited !== undefined &&
      Number(this.runtime.getFlag<number>(LAST_MAJOR_EVENT_ROOM_FLAG) ?? -1000) === roomsVisited
    ) {
      return undefined;
    }
    const [cutscene] = queue.splice(index, 1);
    this.runtime.setFlag(CUTSCENES_FLAG, queue);
    if (roomsVisited !== undefined) {
      this.runtime.setFlag(LAST_MAJOR_EVENT_ROOM_FLAG, roomsVisited);
    }
    return cutscene;
  }

  getAvailableChoices(id: string): Array<RelationshipChoice | 'gift'> {
    const state = this.getState(id);
    if (!state || state.stage === 'dead') return ['talk'];
    if (state.stage === 'murderous' || state.stage === 'hostile') return ['plead', 'fight', 'run'];
    if (state.stage === 'married') return ['talk', 'gift', 'date', 'family', 'discuss-arrangement', 'divorce'];
    if (state.stage === 'lover') return ['talk', 'gift', 'date', 'propose', 'reassure', 'apologize', 'break-up'];
    if (state.stage === 'dating') return ['talk', 'gift', 'date', 'reassure', 'apologize', 'break-up'];
    if (state.stage === 'estranged' || state.stage === 'heartbroken' || state.stage === 'vengeful') return ['talk', 'apologize', 'explain', 'gift'];
    if (state.stage === 'crush') return ['talk', 'gift', 'flirt', 'ask-out', 'apologize'];
    return ['talk', 'gift', 'flirt'];
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
        this.lowerNeglect(next);
        this.recordMemory(next, {
          roomsVisited,
          kind: 'apology',
          tags: ['honesty', 'humility'],
          intensity: 8,
          tone: 'positive',
          summary: `You apologized to ${next.displayName}.`,
        });
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
        this.recordMemory(next, {
          roomsVisited,
          kind: 'breakup',
          tags: ['commitment', 'betrayal'],
          intensity: 18,
          tone: 'negative',
          summary: `You broke up with ${next.displayName}.`,
        });
        break;
      case 'propose':
        return this.propose(next, roomsVisited);
      case 'family':
        return this.familyAction(next, roomsVisited);
      case 'discuss-arrangement':
        return this.discussArrangement(next, roomsVisited);
      case 'divorce':
        return this.divorce(next, roomsVisited);
      case 'reassure':
        next.trust += 6;
        next.jealousy -= 12;
        next.resentment -= 4;
        this.lowerNeglect(next);
        this.recordMemory(next, {
          roomsVisited,
          kind: 'talk',
          tags: ['loyalty', 'honesty'],
          intensity: 8,
          tone: 'positive',
          summary: `You reassured ${next.displayName}.`,
        });
        break;
      case 'explain': {
        const tier = this.interpretTags(next, ['honesty', 'pragmatic', 'restraint']);
        this.applyTaggedDeltas(next, tier);
        this.recordMemory(next, {
          roomsVisited,
          kind: 'talk',
          tags: ['honesty', 'pragmatic'],
          intensity: 7,
          tone: 'neutral',
          summary: `You explained yourself to ${next.displayName}.`,
        });
        break;
      }
      case 'plead':
        next.trust += 2;
        next.resentment -= this.getPersonality(next) === 'regal' ? 1 : 6;
        next.fear -= 3;
        break;
      case 'fight':
        next.trust -= 6;
        next.resentment += 10;
        next.fear += 8;
        next.flags.forceStage = 'murderous';
        break;
      case 'run':
        next.trust -= 8;
        next.resentment += 5;
        next.fear += 3;
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

  applyBranchChoice(
    id: string,
    branch: DatingBranchChoice,
    roomsVisited: number,
    kind: Extract<RelationshipChoice, 'talk' | 'flirt' | 'date'> = 'date',
  ): RelationshipEventResult {
    const state = this.getState(id);
    if (!state) {
      return { ok: false, title: 'No One', message: 'That branch goes nowhere.', color: '#ff6b6b' };
    }
    const next = {
      ...state,
      flags: { ...state.flags },
      memories: [...state.memories],
      lastSeenRoomsVisited: roomsVisited,
    };
    const tier = branch.targetTier ?? this.interpretTags(next, branch.tags);
    this.applyTaggedDeltas(next, tier);
    if (kind === 'flirt') {
      next.romanceOptIn = true;
      this.applyJealousyToOthers(next.id, 6);
    }
    if (kind === 'date') {
      next.romanceOptIn = true;
      next.flags.firstDateAccepted = true;
      if (tier !== 'disliked' && tier !== 'hated') {
        next.acceptedDates += 1;
      } else {
        next.rejectedDates += 1;
      }
      this.applyJealousyToOthers(next.id, tier === 'loved' ? 14 : 8);
    }
    const summary = branch.outcomeLines?.[tier] ?? this.createBranchOutcomeSummary(next, branch, tier);
    this.recordMemory(next, {
      roomsVisited,
      kind,
      tags: branch.tags,
      intensity: this.intensityForTier(tier),
      tone: tier === 'loved' || tier === 'liked' ? 'positive' : tier === 'neutral' ? 'neutral' : 'negative',
      summary,
    });
    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: `${this.labelForTier(tier)}: ${summary}`,
      color: this.colorFor(saved),
      state: saved,
      becameHostile: saved.stage === 'hostile' || saved.stage === 'murderous',
    };
  }

  completeMarriage(id: string, roomsVisited: number): RelationshipEventResult {
    const state = this.getState(id);
    if (!state) {
      return { ok: false, title: 'No One', message: 'The wedding has no partner.', color: '#ff6b6b' };
    }
    const spouse = this.getCurrentSpouse();
    if (spouse && spouse.id !== id) {
      return {
        ok: false,
        title: state.displayName,
        message: `You are already married to ${spouse.displayName}.`,
        color: '#ff6b6b',
        state,
      };
    }
    const next = {
      ...state,
      stage: 'married' as RelationshipStage,
      affection: Math.max(state.affection, 100),
      trust: Math.max(state.trust, 75),
      romanceOptIn: true,
      flags: {
        ...state.flags,
        married: true,
        marriedRoom: roomsVisited,
        engaged: false,
        pendingBouquetQuest: false,
        forceStage: 'married',
      },
      memories: [...state.memories],
    };
    this.recordMemory(next, {
      roomsVisited,
      kind: 'marriage',
      tags: ['commitment', 'ritual', 'marriage'],
      intensity: 30,
      tone: 'positive',
      summary: `You married ${next.displayName} after bringing back the Deep-Lying Bouquet.`,
      questId: 'deep-lying-bouquet',
      uniqueKey: `marriage:${next.id}`,
    });
    const saved = this.finalize(next);
    this.resolveMarriageFallout(saved.id, roomsVisited);
    return {
      ok: true,
      title: saved.displayName,
      message: `${saved.displayName} married you. The bouquet is legally and emotionally ridiculous.`,
      color: '#ffbdfd',
      state: saved,
      reward: this.createRelationshipReward(saved, 'marriage'),
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
    const repeatedSameGift =
      state.lastGiftRoomsVisited !== undefined &&
      roomsVisited - state.lastGiftRoomsVisited <= 8 &&
      state.flags.lastGiftItemId === itemId;
    const next = {
      ...state,
      flags: { ...state.flags, lastGiftItemId: itemId },
      memories: [...state.memories],
      lastGiftRoomsVisited: roomsVisited,
      lastSeenRoomsVisited: roomsVisited,
    };
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
    this.recordMemory(next, {
      roomsVisited,
      kind: 'gift',
      tags: ['giftGiving', ...(repeatedSameGift ? ['giftSpamming' as RelationshipTag] : [])],
      intensity: tone === 'loved' ? 10 : tone === 'hated' ? 12 : 5,
      tone: tone === 'loved' || tone === 'liked' ? 'positive' : tone === 'neutral' ? 'neutral' : 'negative',
      itemId,
      summary: repeatedSameGift
        ? `You gave ${next.displayName} another ${itemName}. They noticed the repetition.`
        : `You gave ${next.displayName} ${itemName}.`,
    });

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
      if (!this.isSeriousRelationship(state)) continue;
      const roomsAgo = roomsVisited - state.lastSeenRoomsVisited;
      const tier = this.calculateNeglectTier(roomsAgo);
      const currentTier = this.getNeglectTier(state);
      if (tier <= currentTier) continue;
      const next = {
        ...state,
        flags: { ...state.flags, neglectTier: tier, lastNeglectTierRoom: roomsVisited },
        memories: [...state.memories],
        jealousy: state.jealousy + tier * 4,
        resentment: state.resentment + tier * 3,
        ignoredEncounters: state.ignoredEncounters + 1,
      };
      this.recordMemory(next, {
        roomsVisited,
        kind: 'neglect',
        tags: ['neglect', 'avoidance'],
        intensity: tier * 10,
        tone: tier >= 3 ? 'negative' : 'neutral',
        summary: this.neglectSummaryFor(next, tier),
        uniqueKey: `neglect:${state.id}:${tier}`,
      });
      const saved = this.finalize(next);
      results.push({
        ok: true,
        title: saved.displayName,
        message: this.neglectSummaryFor(saved, tier),
        color: '#ffbdfd',
        state: saved,
      });
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
    const next = { ...state, flags: { ...state.flags }, memories: [...state.memories], lastSeenRoomsVisited: roomsVisited };
    if (accepted) {
      next.affection += 5;
      next.trust += 5;
      next.jealousy -= 8;
      next.resentment -= 5;
      this.lowerNeglect(next);
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

  recordEaten(id: string, roomsVisited: number): RelationshipEventResult {
    const state = this.getState(id);
    if (!state) {
      return { ok: false, title: 'No One', message: 'No relationship remembered the bite.', color: '#ff6b6b' };
    }
    const next: RelationshipState = {
      ...state,
      stage: 'murderous',
      affection: -100,
      trust: -100,
      resentment: 100,
      fear: 100,
      lastSeenRoomsVisited: roomsVisited,
      romanceOptIn: false,
      flags: {
        ...state.flags,
        eatenByPlayer: true,
        eatenRoomsVisited: roomsVisited,
        forceStage: 'murderous',
        stageReason: 'eatenByPlayer',
      },
    };
    this.recordMemory(next, {
      roomsVisited,
      kind: 'deathScene',
      tags: ['betrayal', 'violence', 'death', 'trauma'],
      intensity: 100,
      tone: 'traumatic',
      summary: `${state.displayName} was eaten by you and will not let the tracker downgrade it.`,
      uniqueKey: `eaten:${state.id}`,
    });
    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: `${saved.displayName} was eaten by you. The relationship tracker is keeping the receipt.`,
      color: '#ff6b6b',
      state: saved,
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
    const profile = {
      id: state.id,
      displayName: state.displayName,
      species: state.species,
      portraitId: state.portraitId,
      homeRoomId: state.homeRoomId,
      factionId: state.factionId,
    };
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
      conflictStyle: state.conflictStyle ?? this.deriveConflictStyle(profile),
      exclusivityPreference: state.exclusivityPreference ?? this.deriveExclusivityPreference(profile),
      memories: this.trimMemories(Array.isArray(state.memories) ? state.memories : []),
      children: Array.isArray(state.children) ? state.children : [],
      flags: state.flags ?? {},
    };
  }

  private deriveStage(state: RelationshipState): RelationshipStage {
    const forceStage = typeof state.flags.forceStage === 'string' ? state.flags.forceStage : undefined;
    if (forceStage && FORCEABLE_STAGES.has(forceStage as RelationshipStage)) return forceStage as RelationshipStage;
    if (state.flags.dead) return 'dead';
    if (state.flags.married) return 'married';
    const wasSerious = this.isSeriousRelationship(state) || Boolean(state.flags.firstDateAccepted);
    if (wasSerious && (state.resentment >= 65 || state.trust <= -25)) return this.resolveConflictEscalation(state);
    if (state.resentment >= 65 || state.fear >= 75) return 'hostile';
    if (wasSerious && (state.resentment >= 45 || state.trust <= -20)) return 'estranged';
    if (wasSerious && state.affection >= 70 && state.trust >= 50) return 'lover';
    if (wasSerious) return 'dating';
    if (state.romanceOptIn && state.affection >= 45 && state.trust >= 20 && state.resentment < 30) return 'crush';
    if (state.affection >= 25 && state.trust >= 10) return 'friendly';
    if (state.affection >= 10 || state.trust >= 8 || state.fascination >= 15) return 'acquaintance';
    return 'stranger';
  }

  private deriveConflictStyle(profile: RelationshipCandidateProfile): ConflictStyle {
    if (profile.species === 'goblin-angel') return 'contractual';
    if (profile.species === 'angel') return 'formalDuel';
    const personality = profile.personality ?? this.getPersonality({ id: profile.id, species: profile.species } as RelationshipState);
    if (personality === 'poetic') return 'heartbroken';
    if (personality === 'deadpan') return 'withdrawn';
    if (personality === 'hungry') return 'forgiving';
    if (personality === 'regal') return 'formalDuel';
    if (personality === 'sharp') return profile.species === 'goblin' ? 'contractual' : 'vengeful';
    return 'withdrawn';
  }

  private deriveExclusivityPreference(profile: RelationshipCandidateProfile): ExclusivityPreference {
    if (profile.species === 'goblin-angel') return 'transactional';
    if (profile.species === 'angel') return 'monogamous';
    const personality = profile.personality ?? this.getPersonality({ id: profile.id, species: profile.species } as RelationshipState);
    if (personality === 'deadpan') return 'tolerant';
    if (personality === 'poetic') return 'devotional';
    if (personality === 'hungry') return 'jealous';
    if (personality === 'regal') return 'monogamous';
    if (personality === 'sharp') return profile.species === 'goblin' ? 'transactional' : 'possessive';
    return 'jealous';
  }

  private resolveConflictEscalation(state: RelationshipState): RelationshipStage {
    switch (state.conflictStyle) {
      case 'heartbroken':
        return state.resentment >= 70 ? 'heartbroken' : 'estranged';
      case 'withdrawn':
        return 'estranged';
      case 'vengeful':
        return state.resentment >= 80 ? 'hostile' : 'vengeful';
      case 'murderous':
        return state.resentment >= 80 && state.jealousy >= 70 ? 'murderous' : 'hostile';
      case 'petty':
        return 'vengeful';
      case 'formalDuel':
        return state.trust <= -30 || state.resentment >= 70 ? 'hostile' : 'estranged';
      case 'contractual':
        return state.resentment >= 80 ? 'hostile' : 'estranged';
      case 'forgiving':
        return state.resentment >= 90 && state.trust <= -60 ? 'heartbroken' : 'estranged';
    }
  }

  private isSeriousRelationship(state: RelationshipState): boolean {
    return state.stage === 'dating' || state.stage === 'lover' || state.stage === 'married';
  }

  private calculateNeglectTier(roomsSinceSeen: number): NeglectTier {
    if (roomsSinceSeen >= 40) return 4;
    if (roomsSinceSeen >= 28) return 3;
    if (roomsSinceSeen >= 18) return 2;
    if (roomsSinceSeen >= 10) return 1;
    return 0;
  }

  private getNeglectTier(state: RelationshipState): NeglectTier {
    const value = Number(state.flags.neglectTier ?? 0);
    return value >= 4 ? 4 : value >= 3 ? 3 : value >= 2 ? 2 : value >= 1 ? 1 : 0;
  }

  private lowerNeglect(state: RelationshipState): void {
    state.flags.neglectTier = Math.max(0, this.getNeglectTier(state) - 1);
  }

  private neglectSummaryFor(state: RelationshipState, tier: NeglectTier): string {
    if (tier >= 4) return `${state.displayName} has stopped treating your absence as accidental.`;
    if (tier >= 3) return `${state.displayName} confronts the silence you left behind.`;
    if (tier >= 2) return `${state.displayName} is hurt that you keep passing through life without them.`;
    return `${state.displayName} has started counting the rooms since you last made time.`;
  }

  private interpretTags(state: RelationshipState, tags: readonly RelationshipTag[]): RelationshipOutcomeTier {
    const weights = PERSONALITY_TAG_WEIGHTS[this.getPersonality(state)];
    const score = tags.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0);
    if (score >= 10) return 'loved';
    if (score >= 4) return 'liked';
    if (score <= -10) return 'hated';
    if (score <= -4) return 'disliked';
    return 'neutral';
  }

  private applyTaggedDeltas(state: RelationshipState, tier: RelationshipOutcomeTier): void {
    const delta = TIER_DELTAS[tier];
    state.affection += delta.affection ?? 0;
    state.trust += delta.trust ?? 0;
    state.fascination += delta.fascination ?? 0;
    state.resentment += delta.resentment ?? 0;
    state.jealousy += delta.jealousy ?? 0;
  }

  private recordMemory(
    state: RelationshipState,
    memory: Omit<RelationshipMemory, 'id' | 'relationshipId'>,
  ): void {
    const memories = [...(state.memories ?? [])];
    if (memory.uniqueKey && memories.some((entry) => entry.uniqueKey === memory.uniqueKey)) return;
    memories.push({
      ...memory,
      id: `mem_${memory.roomsVisited}_${memories.length}_${Math.abs(this.hash(state.id + memory.summary))}`,
      relationshipId: state.id,
    });
    state.memories = this.trimMemories(memories);
  }

  private trimMemories(memories: RelationshipMemory[]): RelationshipMemory[] {
    if (memories.length <= MAX_MEMORIES_PER_RELATIONSHIP) return memories;
    const major = memories.filter((memory) =>
      memory.tone === 'traumatic' ||
      memory.kind === 'marriage' ||
      memory.kind === 'divorce' ||
      memory.kind === 'child' ||
      memory.kind === 'rivalMurder' ||
      memory.kind === 'death',
    );
    const normal = memories.filter((memory) => !major.includes(memory));
    return [...major, ...normal.slice(-(MAX_MEMORIES_PER_RELATIONSHIP - major.length))].slice(-MAX_MEMORIES_PER_RELATIONSHIP);
  }

  private labelForTier(tier: RelationshipOutcomeTier): string {
    return tier[0]!.toUpperCase() + tier.slice(1);
  }

  private summaryVerbForTier(tier: RelationshipOutcomeTier): string {
    if (tier === 'loved') return 'loved';
    if (tier === 'liked') return 'liked';
    if (tier === 'disliked') return 'disliked';
    if (tier === 'hated') return 'hated';
    return 'considered';
  }

  private createBranchOutcomeSummary(
    state: RelationshipState,
    branch: DatingBranchChoice,
    tier: RelationshipOutcomeTier,
  ): string {
    const personality = this.getPersonality(state);
    const tags = new Set(branch.tags);
    const subject = branch.label.toLowerCase();
    if (tier === 'loved') {
      if (tags.has('honesty')) return `${state.displayName} loves that you chose the honest answer instead of decorating the moment.`;
      if (tags.has('protective')) return `${state.displayName} loves the way you stepped toward danger before asking it to be convenient.`;
      if (tags.has('clever')) return `${state.displayName} loves the cleverness and immediately tries not to look too impressed.`;
      if (tags.has('food')) return `${state.displayName} loves the answer with the uncomplicated joy of someone whose heart has snacks.`;
      if (tags.has('commitment')) return `${state.displayName} loves how casually you let the future into the room.`;
      return `${state.displayName} loves the ${subject} answer more than they planned to admit.`;
    }
    if (tier === 'liked') {
      if (personality === 'sharp' && tags.has('selfPreserving')) return `${state.displayName} likes the survival instinct. Romance is better when both parties remain billable.`;
      if (personality === 'deadpan' && tags.has('pragmatic')) return `${state.displayName} likes the practical answer and files one quiet point in your favor.`;
      if (tags.has('clever')) return `${state.displayName} likes the answer because it has enough teeth to be interesting.`;
      if (tags.has('honesty')) return `${state.displayName} likes the honesty, even while pretending it was merely efficient.`;
      return `${state.displayName} likes the ${subject} answer, though they make you work to notice it.`;
    }
    if (tier === 'neutral') {
      if (tags.has('selfPreserving')) return `${state.displayName} understands the survival logic, but it does not warm the moment.`;
      if (tags.has('clever')) return `${state.displayName} accepts the joke as structurally adequate, which is almost praise.`;
      if (tags.has('food')) return `${state.displayName} accepts the answer, but wanted something with a little more pulse.`;
      return `${state.displayName} accepts the ${subject} answer, but the moment stays balanced on the fence.`;
    }
    if (tier === 'disliked') {
      if (tags.has('avoidance')) return `${state.displayName} dislikes the avoidance. They heard the exit before they heard you.`;
      if (tags.has('violence')) return `${state.displayName} dislikes how quickly the answer turned sharp.`;
      if (tags.has('betrayal')) return `${state.displayName} dislikes the joke because it sounds too much like a rehearsal.`;
      return `${state.displayName} dislikes the ${subject} answer and lets the silence carry the rest.`;
    }
    if (tags.has('betrayal')) return `${state.displayName} hates the answer. The word betrayal has stopped being hypothetical.`;
    if (tags.has('avoidance')) return `${state.displayName} hates being left alone inside the scene you started together.`;
    return `${state.displayName} hates the ${subject} answer, and the room notices before you do.`;
  }

  private intensityForTier(tier: RelationshipOutcomeTier): number {
    return tier === 'loved' || tier === 'hated' ? 12 : tier === 'liked' || tier === 'disliked' ? 7 : 3;
  }

  private hash(value: string): number {
    let total = 0;
    for (let i = 0; i < value.length; i += 1) total = (total * 31 + value.charCodeAt(i)) >>> 0;
    return total;
  }

  private propose(state: RelationshipState, roomsVisited: number): RelationshipEventResult {
    const next: RelationshipState = { ...state, flags: { ...state.flags, lastProposalRoom: roomsVisited }, memories: [...state.memories] };
    const spouse = this.getCurrentSpouse();
    const proposalCooldown = Number(state.flags.lastProposalRoom ?? -1000);
    if (roomsVisited - proposalCooldown < 4) {
      return {
        ok: false,
        title: state.displayName,
        message: `"Not every room needs to contain the same enormous question."`,
        color: '#ffbdfd',
        state,
      };
    }
    if (spouse && spouse.id !== state.id) {
      next.jealousy += 20;
      next.resentment += 18;
      this.recordMemory(next, {
        roomsVisited,
        kind: 'proposalRejected',
        tags: ['commitment', 'betrayal', 'secrecy'],
        intensity: 18,
        tone: 'negative',
        targetRelationshipId: spouse.id,
        summary: `You proposed to ${next.displayName} while already married to ${spouse.displayName}.`,
      });
      this.enqueueMajorCutscene(next, roomsVisited, 'afterProposal', 80, [
        `${next.displayName} looks at the invisible ring already on your life.`,
        '"You are already married. That is not romance. That is calendar fraud."',
      ]);
      const saved = this.finalize(next);
      return {
        ok: false,
        title: saved.displayName,
        message: `"You are already married. That is not romance. That is calendar fraud."`,
        color: this.colorFor(saved),
        state: saved,
        becameHostile: saved.stage === 'hostile' || saved.stage === 'murderous',
      };
    }
    if (this.canAcceptProposal(next)) {
      next.flags.engaged = true;
      next.flags.pendingBouquetQuest = true;
      next.romanceOptIn = true;
      this.recordMemory(next, {
        roomsVisited,
        kind: 'proposal',
        tags: ['commitment', 'ritual', 'marriage'],
        intensity: 20,
        tone: 'positive',
        summary: `${next.displayName} accepted your proposal. Find the Deep-Lying Bouquet to complete the wedding.`,
        questId: 'deep-lying-bouquet',
        uniqueKey: `proposal:${next.id}`,
      });
      this.enqueueMajorCutscene(next, roomsVisited, 'afterProposal', 60, [
        `${next.displayName} says yes, then immediately makes the romance logistical.`,
        '"Bring me the Deep-Lying Bouquet. Let the cold prove you can keep a promise."',
      ]);
      const saved = this.finalize(next);
      return {
        ok: true,
        title: saved.displayName,
        message: `"Yes. Bring me the Deep-Lying Bouquet, and we will make this legally romantic."`,
        color: '#ffbdfd',
        state: saved,
        questId: 'deep-lying-bouquet',
        reward: this.createRelationshipReward(saved, 'proposalAccepted'),
      };
    }
    next.resentment += next.resentment > 20 ? 5 : 1;
    this.recordMemory(next, {
      roomsVisited,
      kind: 'proposalRejected',
      tags: ['commitment', 'premature'],
      intensity: 10,
      tone: 'neutral',
      summary: `You proposed before ${next.displayName} was ready.`,
    });
    this.enqueueMajorCutscene(next, roomsVisited, 'afterProposal', 45, [
      `${next.displayName} holds the proposal carefully, as if it might bruise.`,
      '"No. Not because the question is ugly. Because the timing is."',
    ]);
    const saved = this.finalize(next);
    return {
      ok: false,
      title: saved.displayName,
      message: `"No. Not because the question is ugly. Because the timing is."`,
      color: this.colorFor(saved),
      state: saved,
    };
  }

  private canAcceptProposal(state: RelationshipState): boolean {
    return state.stage === 'lover' && state.affection >= 100 && state.trust >= 70 && state.resentment < 20 && state.jealousy < 30;
  }

  private familyAction(state: RelationshipState, roomsVisited: number): RelationshipEventResult {
    const next = { ...state, flags: { ...state.flags }, memories: [...state.memories], children: [...state.children] };
    if (state.stage !== 'married') {
      return { ok: false, title: state.displayName, message: 'Family options unlock after marriage.', color: '#ff6b6b', state };
    }
    const marriedRoom = Number(state.flags.marriedRoom ?? roomsVisited);
    if (roomsVisited - marriedRoom < 8 || state.trust < 65 || state.resentment > 20) {
      return {
        ok: true,
        title: state.displayName,
        message: `"Family is not a button you press. It is a room we build carefully."`,
        color: '#ffbdfd',
        state,
      };
    }
    if (next.children.length === 0) {
      const child = {
        id: `child_${next.id}_${roomsVisited}`,
        parentRelationshipId: next.id,
        name: next.species === 'goblin' ? 'Tiny Clause' : next.species === 'angel' ? 'Aster' : 'Eggbert',
        type: next.species === 'goblin' ? ('adoptedGoblin' as const) : next.species === 'angel' ? ('cosmic' as const) : ('egg' as const),
        createdRoom: roomsVisited,
        memories: [],
      };
      next.children.push(child);
      this.recordMemory(next, {
        roomsVisited,
        kind: 'child',
        tags: ['family', 'commitment'],
        intensity: 20,
        tone: 'positive',
        summary: `${next.displayName} started a family with you. ${child.name} is now everyone's problem.`,
        uniqueKey: `child:${next.id}`,
      });
      this.enqueueMajorCutscene(next, roomsVisited, 'afterRelationshipGraphEvent', 70, [
        `${next.displayName} introduces ${child.name} with the solemnity of a treaty and the panic of a breakfast accident.`,
        '"Our family survives another room. I am choosing to find that romantic."',
      ]);
    }
    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: `"Our family survives another room. I am choosing to find that romantic."`,
      color: '#ffbdfd',
      state: saved,
      reward: this.createRelationshipReward(saved, next.children.length === 1 ? 'family' : 'spouseVisit'),
    };
  }

  private discussArrangement(state: RelationshipState, roomsVisited: number): RelationshipEventResult {
    const next = { ...state, flags: { ...state.flags }, memories: [...state.memories] };
    const tier = this.interpretTags(next, ['honesty', 'rivalAttention', state.exclusivityPreference === 'transactional' ? 'contract' : 'commitment']);
    this.applyTaggedDeltas(next, tier);
    if (state.exclusivityPreference === 'monogamous' || state.exclusivityPreference === 'territorial') {
      next.jealousy += 12;
      next.resentment += 8;
    } else if (state.exclusivityPreference === 'open' || state.exclusivityPreference === 'tolerant' || state.exclusivityPreference === 'transactional') {
      next.trust += 6;
      next.jealousy -= 8;
    }
    this.recordMemory(next, {
      roomsVisited,
      kind: 'rivalConflict',
      tags: ['honesty', 'rivalAttention'],
      intensity: 12,
      tone: tier === 'liked' || tier === 'loved' ? 'positive' : 'negative',
      summary: `You discussed other lovers with ${next.displayName}.`,
    });
    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: saved.exclusivityPreference === 'transactional'
        ? `"Undisclosed affection is affection fraud. We can draft terms."`
        : `"Thank you for telling me. I will decide how furious honesty allows me to be."`,
      color: this.colorFor(saved),
      state: saved,
    };
  }

  private divorce(state: RelationshipState, roomsVisited: number): RelationshipEventResult {
    const next = {
      ...state,
      flags: { ...state.flags, married: false, forceStage: state.conflictStyle === 'heartbroken' ? 'heartbroken' : 'estranged' },
      memories: [...state.memories],
      romanceOptIn: false,
      affection: state.affection - 35,
      trust: state.trust - 30,
      resentment: state.resentment + 35,
      jealousy: 0,
    };
    this.recordMemory(next, {
      roomsVisited,
      kind: 'divorce',
      tags: ['divorce', 'commitment', 'betrayal'],
      intensity: 30,
      tone: 'negative',
      summary: `You divorced ${next.displayName}.`,
      uniqueKey: `divorce:${next.id}:${roomsVisited}`,
    });
    this.enqueueMajorCutscene(next, roomsVisited, 'afterDivorce', 85, [
      `${next.displayName} listens to the divorce as if the room itself said it.`,
      '"Then let the record show we were real, and then we were not."',
    ]);
    const saved = this.finalize(next);
    return {
      ok: true,
      title: saved.displayName,
      message: `"Then let the record show we were real, and then we were not."`,
      color: this.colorFor(saved),
      state: saved,
    };
  }

  private resolveMarriageFallout(newSpouseId: string, roomsVisited: number): void {
    for (const state of this.getAllStates()) {
      if (state.id === newSpouseId || !state.romanceOptIn) continue;
      if (state.stage !== 'lover' && state.stage !== 'dating' && state.stage !== 'crush') continue;
      const next = { ...state, flags: { ...state.flags }, memories: [...state.memories] };
      const harsh =
        state.exclusivityPreference === 'possessive' ||
        state.exclusivityPreference === 'territorial' ||
        state.exclusivityPreference === 'monogamous' ||
        state.exclusivityPreference === 'devotional';
      next.jealousy += harsh ? 35 : 14;
      next.resentment += harsh ? 28 : 8;
      next.trust -= harsh ? 18 : 4;
      this.recordMemory(next, {
        roomsVisited,
        kind: 'rivalConflict',
        tags: ['rivalAttention', 'marriage', 'betrayal'],
        intensity: harsh ? 30 : 12,
        tone: harsh ? 'negative' : 'neutral',
        targetRelationshipId: newSpouseId,
        summary: `${next.displayName} learned that you married someone else.`,
        uniqueKey: `marriageFallout:${next.id}:${newSpouseId}`,
      });
      if (
        harsh &&
        (next.conflictStyle === 'murderous' || next.conflictStyle === 'vengeful') &&
        next.jealousy >= 85 &&
        next.resentment >= 60 &&
        !next.flags.rivalMurder
      ) {
        next.flags.rivalMurder = true;
        next.flags.forceStage = next.conflictStyle === 'murderous' ? 'murderous' : 'vengeful';
        this.killRelationshipTarget(newSpouseId, next, roomsVisited);
        this.recordMemory(next, {
          roomsVisited,
          kind: 'rivalMurder',
          tags: ['rival', 'murder', 'violence', 'trauma'],
          intensity: 100,
          tone: 'traumatic',
          targetRelationshipId: newSpouseId,
          summary: `${next.displayName} decided the new spouse was the problem.`,
          uniqueKey: `rivalMurder:${next.id}:${newSpouseId}`,
        });
        this.enqueueMajorCutscene(next, roomsVisited, 'afterRelationshipGraphEvent', 100, [
          `${next.displayName} finds you before the room has finished loading.`,
          '"I do not blame you," they say. "I blamed them."',
        ]);
      }
      this.finalize(next);
    }
  }

  private getCutsceneQueue(): RelationshipCutscene[] {
    const raw = this.runtime.getFlag<RelationshipCutscene[]>(CUTSCENES_FLAG);
    return Array.isArray(raw) ? raw.slice() : [];
  }

  private enqueueMajorCutscene(
    state: RelationshipState,
    roomsVisited: number,
    trigger: RelationshipCutscene['trigger'],
    priority: number,
    pages: string[],
  ): void {
    if (Number(this.runtime.getFlag<number>(LAST_MAJOR_EVENT_ROOM_FLAG) ?? -1000) === roomsVisited) {
      return;
    }
    this.enqueueCutscene({
      id: `cutscene:${state.id}:${trigger}:${roomsVisited}:${Math.abs(this.hash(pages.join('|')))}`,
      relationshipId: state.id,
      trigger,
      priority,
      once: true,
      pages,
    });
  }

  private killRelationshipTarget(victimId: string, killer: RelationshipState, roomsVisited: number): void {
    const victim = this.getState(victimId);
    if (!victim || victim.flags.dead || victim.stage === 'dead') {
      return;
    }
    const next: RelationshipState = {
      ...victim,
      stage: 'dead',
      romanceOptIn: false,
      flags: {
        ...victim.flags,
        dead: true,
        forceStage: 'dead',
        causeOfDeath: `Killed by ${killer.displayName}`,
        killedByRelationshipId: killer.id,
      },
      memories: [...victim.memories],
    };
    this.recordMemory(next, {
      roomsVisited,
      kind: 'death',
      tags: ['death', 'relationship', 'trauma', 'rival'],
      intensity: 100,
      tone: 'traumatic',
      targetRelationshipId: killer.id,
      summary: `${next.displayName} was killed by ${killer.displayName} after marriage fallout.`,
      uniqueKey: `death:${next.id}:${killer.id}`,
    });
    this.finalize(next);
  }

  private createRelationshipReward(
    state: RelationshipState,
    occasion: 'proposalAccepted' | 'marriage' | 'family' | 'spouseVisit',
  ): RelationshipReward {
    if (occasion === 'proposalAccepted') {
      if (state.species === 'goblin' || state.species === 'goblin-angel') {
        return { kind: 'shopDiscount', factionId: state.factionId ?? 'goblin-camps', rooms: 8 };
      }
      if (state.species === 'angel') {
        return { kind: 'rescueChance', percent: 12 };
      }
      return { kind: 'mapHint', roomId: state.homeRoomId ?? '0,-1,0' };
    }
    if (occasion === 'family') {
      if (state.species === 'goblin' || state.species === 'goblin-angel') {
        return { kind: 'perk', perkId: 'relationship.family.contractual-dependent' };
      }
      if (state.species === 'angel') {
        return { kind: 'temporaryBuff', buffId: 'relationship.family.mercy', durationRooms: 12 };
      }
      return { kind: 'item', itemId: 'cooked-meat', count: 2 };
    }
    if (state.species === 'goblin' || state.species === 'goblin-angel') {
      return state.exclusivityPreference === 'transactional'
        ? { kind: 'perk', perkId: 'relationship.spouse.audit-shield' }
        : { kind: 'item', itemId: 'ring-ledger', count: 1 };
    }
    if (state.species === 'angel') {
      return { kind: 'item', itemId: 'amulet-phoenix', count: 1 };
    }
    switch (this.getPersonality(state)) {
      case 'hungry':
        return { kind: 'item', itemId: 'cooked-meat', count: 3 };
      case 'poetic':
        return { kind: 'cosmetic', cosmeticId: 'relationship-poetic-vow' };
      case 'deadpan':
        return { kind: 'temporaryBuff', buffId: 'relationship.deadpan-calm', durationRooms: 10 };
      case 'regal':
        return { kind: 'perk', perkId: 'relationship.regal-blessing' };
      case 'sharp':
        return { kind: 'card', cardId: 'random' };
      default:
        return { kind: 'score', amount: 25 };
    }
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
      const next = {
        ...state,
        flags: { ...state.flags },
        memories: [...state.memories],
        jealousy: state.jealousy + amount,
        trust: state.trust - 2,
      };
      this.recordMemory(next, {
        roomsVisited: state.lastSeenRoomsVisited,
        kind: 'rivalConflict',
        tags: ['rivalAttention'],
        intensity: amount,
        tone: 'negative',
        targetRelationshipId: exceptId,
        summary: `${state.displayName} noticed your attention wandering.`,
      });
      this.finalize(next);
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

  private getLinePool(state: RelationshipState, context: string): readonly string[] {
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
    const memoryLine = this.getMemoryReferenceLine(state, context);
    if (memoryLine) {
      return [memoryLine, ...personalityLines.neutral];
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
    if (state.stage === 'dead') return 'dead romance';
    if (state.stage === 'murderous') return 'murderous route active';
    if (state.stage === 'hostile') return 'hostile';
    if (state.jealousy >= 55) return 'jealous and watching';
    if (state.resentment >= 45) return 'resentment is high';
    if (this.isSeriousRelationship(state) && roomsAgo >= 10) return `neglect tier ${this.calculateNeglectTier(roomsAgo)}`;
    return undefined;
  }

  private colorFor(state: RelationshipState): string {
    if (state.stage === 'hostile' || state.stage === 'murderous') return '#ff6b6b';
    if (state.stage === 'dating' || state.stage === 'lover' || state.stage === 'crush') return '#ffbdfd';
    return '#9ad1ff';
  }

  private stageWeight(stage: RelationshipStage): number {
    return [
      'stranger',
      'acquaintance',
      'friendly',
      'crush',
      'dating',
      'lover',
      'married',
      'heartbroken',
      'estranged',
      'vengeful',
      'hostile',
      'murderous',
      'dead',
    ].indexOf(stage);
  }

  private getOpeningLinePool(state: RelationshipState): readonly string[] {
    const memoryLine = this.getMemoryReferenceLine(state, 'opening');
    if (memoryLine) {
      return [memoryLine, ...this.getPersonalityLines(state).neutral];
    }
    if (this.hasOtherSeriousRomance(state) && (state.romanceOptIn || state.stage !== 'stranger')) {
      return [
        'I heard. Of course I heard. Affection is loudest when it thinks it is being discreet.',
        'You smell like someone else said your name softly. I am deciding how furious to be.',
        'Before you begin, decide whether this is confession, defense, or comedy.',
      ];
    }
    return this.getLinePool(state, 'talk');
  }

  private getMemoryReferenceLine(state: RelationshipState, context: string): string | null {
    if (state.memories.length === 0) return null;
    const memory = this.pickMemoryToReference(state, context);
    if (!memory) return null;
    const personality = this.getPersonality(state);
    if (memory.kind === 'gift' && memory.itemId) {
      if (memory.tags.includes('giftSpamming')) {
        return personality === 'sharp'
          ? `You gave me that gift before. I am tracking repeat tenderness under suspicious assets.`
          : `You gave me that before. I am deciding whether repetition is devotion or panic.`;
      }
      return memory.tone === 'positive'
        ? `I still remember that gift. I am pretending not to, which is different from forgetting.`
        : `I remember that gift. Some objects arrive with little warning labels after the fact.`;
    }
    if (memory.kind === 'date') {
      if (memory.tags.includes('selfPreserving')) {
        return personality === 'sharp' || personality === 'deadpan'
          ? `I keep thinking about that date. Running was not cowardice; it was math with legs.`
          : `I keep thinking about that date, and about the part where survival became more important than me.`;
      }
      if (memory.tags.includes('protective')) {
        return personality === 'regal'
          ? `I remember when you protected me. Courage looks better when it remembers respect.`
          : `I remember how you moved when danger arrived. That did something inconvenient to my standards.`;
      }
      if (memory.tags.includes('violence')) {
        return `I remember the dangerous part of that date. I am still deciding whether it was thrilling or evidence.`;
      }
      return `I remember our date. The room has been acting smug about it ever since.`;
    }
    if (memory.kind === 'proposalRejected') {
      return `I remember the proposal. The answer was no, but the question did not vanish.`;
    }
    if (memory.kind === 'proposal') {
      return `I remember saying yes. Bring the bouquet back and make the promise survive logistics.`;
    }
    if (memory.kind === 'marriage') {
      return `I remember the bouquet. I remember choosing you after the cold tried to keep it.`;
    }
    if (memory.kind === 'neglect') {
      return personality === 'deadpan'
        ? `I noticed the absence. I made it a chart. The chart was unflattering.`
        : `I noticed how many rooms passed without you. Absence is loud when it wants to be.`;
    }
    if (memory.kind === 'apology') {
      return `I remember the apology. It helped because it sounded less like strategy than usual.`;
    }
    if (memory.kind === 'breakup' || memory.kind === 'divorce') {
      return `I remember the ending. Do not ask me to treat it like ordinary weather.`;
    }
    if (memory.kind === 'rivalConflict') {
      return personality === 'sharp'
        ? `I know about the other affection. Disclosure has consequences, but secrecy has fees.`
        : `I know about the other heart in the room, even when the room is pretending otherwise.`;
    }
    if (memory.kind === 'rivalMurder') {
      return `I remember what jealousy did. Some memories do not sit down when asked.`;
    }
    if (memory.tone === 'traumatic') {
      return `I remember the worst part. It is still standing very close to us.`;
    }
    return null;
  }

  private pickMemoryToReference(state: RelationshipState, context: string): RelationshipMemory | null {
    const majorMemories = state.memories.filter(
      (memory) =>
        memory.tone === 'traumatic' ||
        memory.kind === 'marriage' ||
        memory.kind === 'divorce' ||
        memory.kind === 'proposal' ||
        memory.kind === 'proposalRejected',
    );
    const major = majorMemories[majorMemories.length - 1] ?? null;
    if (major && context !== 'flirt') return major;
    const memories = state.memories.filter((memory) => memory.kind !== 'talk' && memory.kind !== 'flirt');
    return memories[memories.length - 1] ?? null;
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
        (other.stage === 'dating' || other.stage === 'lover' || other.stage === 'crush' || other.stage === 'married'),
    );
  }

  private getPersonality(state: Pick<RelationshipState, 'id' | 'species'>): RelationshipPersonality {
    if (state.species === 'goblin' || state.species === 'goblin-angel') return 'sharp';
    if (state.species === 'angel') return 'regal';
    const options = ['poetic', 'deadpan', 'hungry', 'regal', 'sharp'] as const;
    let total = 0;
    for (let i = 0; i < state.id.length; i += 1) total = (total * 31 + state.id.charCodeAt(i)) >>> 0;
    return options[total % options.length] ?? 'poetic';
  }

  private getPersonalityLines(state: RelationshipState): {
    neutral: readonly string[];
    crush: readonly string[];
    dating: readonly string[];
    flirt: readonly string[];
    date: readonly string[];
    hurt: readonly string[];
    hostile: readonly string[];
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
