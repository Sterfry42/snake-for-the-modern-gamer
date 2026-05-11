import type { Quest, QuestRuntime } from '../quests/quest.js';
import type { QuestRegistry } from '../quests/questRegistry.js';

export interface QuestGiverRequest {
  quest: Quest | null;
  state: 'available' | 'active' | 'completed' | 'none';
}

export interface QuestControllerOptions {
  initialQuestCount?: number;
  initialQuestIds?: string[];
  maxActiveQuests?: number;
  questOfferChance?: number;
  rng?: () => number;
}

export class QuestController {
  private active: Quest[] = [];
  private completed: string[] = [];
  private accepted: string[] = [];
  private offered: Quest | null = null;
  private offeredByRoomId: string | undefined;
  private giverAssignments = new Map<string, string>();

  private readonly initialQuestCount: number;
  private readonly initialQuestIds: string[];
  private readonly maxActiveQuests: number;
  private readonly questOfferChance: number;
  private readonly rng: () => number;

  constructor(
    private readonly registry: QuestRegistry,
    options: QuestControllerOptions = {},
  ) {
    this.initialQuestCount = options.initialQuestCount ?? 3;
    this.initialQuestIds = options.initialQuestIds ?? [];
    this.maxActiveQuests = options.maxActiveQuests ?? 5;
    this.questOfferChance = options.questOfferChance ?? 0.002;
    this.rng = options.rng ?? Math.random;
  }

  reset(runtime: QuestRuntime): void {
    this.active = [];
    this.completed = [];
    this.accepted = [];
    this.offered = null;
    this.offeredByRoomId = undefined;
    this.giverAssignments.clear();
    this.assignInitialQuests(runtime);
  }

  getActive(): Quest[] {
    return this.active.slice();
  }

  getCompletedIds(): string[] {
    return this.completed.slice();
  }

  getAcceptedIds(): string[] {
    return this.accepted.slice();
  }

  getOffered(): Quest | null {
    return this.offered;
  }

  restoreQuestIds(
    state: { active?: string[]; completed?: string[]; accepted?: string[] },
    runtime: QuestRuntime,
  ): void {
    const completed = Array.from(new Set(state.completed ?? []));
    const accepted = Array.from(
      new Set([...(state.accepted ?? []), ...(state.active ?? []), ...completed]),
    );
    const active: Quest[] = [];
    for (const id of state.active ?? []) {
      if (completed.includes(id)) {
        continue;
      }
      const quest = this.registry.getById(id);
      if (!quest || active.some((entry) => entry.id === id)) {
        continue;
      }
      quest.onAccept(runtime);
      active.push(quest);
    }
    this.active = active;
    this.completed = completed;
    this.accepted = accepted;
    this.offered = null;
    this.offeredByRoomId = undefined;
  }

  acceptOffered(runtime: QuestRuntime): Quest | null {
    if (!this.offered) {
      return null;
    }
    const quest = this.offered;
    this.offered = null;
    const giverRoomId = this.offeredByRoomId;
    this.offeredByRoomId = undefined;
    if (!this.accepted.includes(quest.id)) {
      this.accepted.push(quest.id);
    }
    quest.onAccept(runtime);
    runtime.onQuestAcceptedFromGiver?.(quest, giverRoomId);
    if (quest.isCompleted(runtime)) {
      if (!this.completed.includes(quest.id)) {
        this.completed.push(quest.id);
        quest.onReward(runtime);
      }
      return quest;
    }
    if (this.active.length < this.maxActiveQuests) {
      this.active.push(quest);
    }
    return quest;
  }

  rejectOffered(): void {
    this.offered = null;
    this.offeredByRoomId = undefined;
  }

  offerSpecificQuestById(id: string, runtime: QuestRuntime, giverRoomId?: string): Quest | null {
    const quest = this.registry.getById(id);
    if (!quest) {
      return null;
    }
    if (!this.canOfferFromGiver(quest, runtime, giverRoomId)) {
      return null;
    }
    if (this.accepted.includes(quest.id) || this.completed.includes(quest.id)) {
      return null;
    }
    if (this.active.some((activeQuest) => activeQuest.id === quest.id)) {
      return quest;
    }
    if (this.offered?.id === quest.id) {
      return quest;
    }
    if (quest.isCompleted(runtime)) {
      return null;
    }
    this.offered = quest;
    this.offeredByRoomId = giverRoomId;
    return quest;
  }

  offerNow(_runtime: QuestRuntime): Quest | null {
    return null;
  }

  maybeCreateOffer(paused: boolean, runtime: QuestRuntime): Quest | null {
    void paused;
    void runtime;
    return null;
  }

  getQuestForGiver(roomId: string, runtime: QuestRuntime): QuestGiverRequest {
    let assignedId = this.giverAssignments.get(roomId);
    let quest = assignedId ? (this.registry.getById(assignedId) ?? null) : null;
    if (quest && !this.canOfferFromGiver(quest, runtime, roomId)) {
      this.giverAssignments.delete(roomId);
      assignedId = undefined;
      quest = null;
    }

    if (!quest) {
      quest = this.pickEligibleQuest(runtime, roomId);
      if (!quest) {
        return { quest: null, state: 'none' };
      }
      this.giverAssignments.set(roomId, quest.id);
    }

    if (this.accepted.includes(quest.id) || this.completed.includes(quest.id)) {
      this.giverAssignments.delete(roomId);
      const nextQuest = this.pickEligibleQuest(runtime, roomId);
      if (!nextQuest) {
        return { quest, state: 'completed' };
      }
      this.giverAssignments.set(roomId, nextQuest.id);
      quest = nextQuest;
    }

    if (this.active.some((activeQuest) => activeQuest.id === quest.id)) {
      return { quest, state: 'active' };
    }

    this.offered = quest;
    this.offeredByRoomId = roomId;
    return { quest, state: 'available' };
  }

  handleCompletions(runtime: QuestRuntime): Quest[] {
    const stillActive: Quest[] = [];
    const completedNow: Quest[] = [];

    for (const quest of this.active) {
      if (!this.completed.includes(quest.id) && quest.isCompleted(runtime)) {
        this.completed.push(quest.id);
        completedNow.push(quest);
      } else {
        stillActive.push(quest);
      }
    }

    if (completedNow.length === 0) {
      return [];
    }

    this.active = stillActive;
    for (const quest of completedNow) {
      for (const [roomId, assignedId] of this.giverAssignments) {
        if (assignedId === quest.id) {
          this.giverAssignments.delete(roomId);
        }
      }
      quest.onReward(runtime);
    }

    return completedNow;
  }

  completeQuestById(id: string, runtime: QuestRuntime): Quest | null {
    const quest = this.registry.getById(id);
    if (!quest || this.completed.includes(id)) {
      return null;
    }
    if (!this.accepted.includes(id)) {
      this.accepted.push(id);
    }
    this.active = this.active.filter((activeQuest) => activeQuest.id !== id);
    this.completed.push(id);
    for (const [roomId, assignedId] of this.giverAssignments) {
      if (assignedId === id) {
        this.giverAssignments.delete(roomId);
      }
    }
    quest.onReward(runtime);
    return quest;
  }

  failQuestById(id: string): void {
    if (!this.accepted.includes(id)) {
      this.accepted.push(id);
    }
    this.active = this.active.filter((activeQuest) => activeQuest.id !== id);
    for (const [roomId, assignedId] of this.giverAssignments) {
      if (assignedId === id) {
        this.giverAssignments.delete(roomId);
      }
    }
  }

  private assignNewQuests(runtime: QuestRuntime, requestedCount: number): void {
    const available = this.collectEligibleQuests();
    const maxAssignable = Math.min(requestedCount, this.maxActiveQuests - this.active.length);

    for (let i = 0; i < maxAssignable && available.length > 0; i++) {
      const questIndex = Math.floor(this.rng() * available.length);
      const quest = available.splice(questIndex, 1)[0];
      quest.onAccept(runtime);
      if (!this.accepted.includes(quest.id)) {
        this.accepted.push(quest.id);
      }
      this.active.push(quest);
      if (quest.isCompleted(runtime)) {
        this.completed.push(quest.id);
        quest.onReward(runtime);
      }
    }
  }

  private assignInitialQuests(runtime: QuestRuntime): void {
    let remaining = this.initialQuestCount;
    if (this.initialQuestIds.length > 0 && remaining > 0) {
      for (const id of this.initialQuestIds) {
        if (remaining <= 0 || this.active.length >= this.maxActiveQuests) {
          break;
        }
        const quest = this.registry.getById(id);
        if (!quest) {
          continue;
        }
        if (this.active.some((q) => q.id === quest.id) || this.completed.includes(quest.id)) {
          continue;
        }
        this.active.push(quest);
        quest.onAccept(runtime);
        if (!this.accepted.includes(quest.id)) {
          this.accepted.push(quest.id);
        }
        remaining -= 1;
        if (quest.isCompleted(runtime)) {
          this.completed.push(quest.id);
          quest.onReward(runtime);
        }
      }
    }
    if (remaining > 0) {
      this.assignNewQuests(runtime, remaining);
    }
  }

  private collectEligibleQuests(runtime?: QuestRuntime, giverRoomId?: string): Quest[] {
    const exclude = new Set<string>([
      ...this.accepted,
      ...this.completed,
      ...this.active.map((q) => q.id),
    ]);
    if (this.offered) {
      exclude.add(this.offered.id);
    }
    return this.registry
      .getAvailable(exclude)
      .filter((quest) => this.canOfferFromGiver(quest, runtime, giverRoomId));
  }

  private pickEligibleQuest(runtime?: QuestRuntime, giverRoomId?: string): Quest | null {
    const available = this.collectEligibleQuests(runtime, giverRoomId);
    if (available.length === 0) {
      return null;
    }
    return available[Math.floor(this.rng() * available.length)] ?? null;
  }

  private canOfferFromGiver(quest: Quest, runtime?: QuestRuntime, giverRoomId?: string): boolean {
    if (!runtime) {
      return true;
    }
    if (!giverRoomId) {
      return !(runtime.requiresQuestGiver?.(quest.id) ?? false);
    }
    return runtime.canOfferQuestFromGiver?.(quest.id, giverRoomId) ?? true;
  }
}
