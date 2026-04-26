import type { Quest, QuestRuntime } from "../quests/quest.js";
import type { QuestRegistry } from "../quests/questRegistry.js";

export interface QuestGiverRequest {
  quest: Quest | null;
  state: "available" | "active" | "completed" | "none";
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
  private offered: Quest | null = null;
  private giverAssignments = new Map<string, string>();

  private readonly initialQuestCount: number;
  private readonly initialQuestIds: string[];
  private readonly maxActiveQuests: number;
  private readonly questOfferChance: number;
  private readonly rng: () => number;

  constructor(
    private readonly registry: QuestRegistry,
    options: QuestControllerOptions = {}
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
    this.offered = null;
    this.giverAssignments.clear();
    this.assignInitialQuests(runtime);
  }

  getActive(): Quest[] {
    return this.active.slice();
  }

  getCompletedIds(): string[] {
    return this.completed.slice();
  }

  getOffered(): Quest | null {
    return this.offered;
  }

  acceptOffered(runtime: QuestRuntime): Quest | null {
    if (!this.offered) {
      return null;
    }
    const quest = this.offered;
    this.offered = null;
    if (quest.isCompleted(runtime)) {
      if (!this.completed.includes(quest.id)) {
        this.completed.push(quest.id);
        quest.onReward(runtime);
        this.assignNewQuests(runtime, 1);
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
  }

  offerSpecificQuestById(id: string, runtime: QuestRuntime): Quest | null {
    const quest = this.registry.getById(id);
    if (!quest) {
      return null;
    }
    if (this.completed.includes(quest.id)) {
      return null;
    }
    if (this.active.some((activeQuest) => activeQuest.id === quest.id)) {
      return quest;
    }
    if (this.offered?.id === quest.id) {
      return quest;
    }
    if (quest.isCompleted(runtime)) {
      this.completed.push(quest.id);
      quest.onReward(runtime);
      return quest;
    }
    this.offered = quest;
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

  getQuestForGiver(roomId: string, _runtime: QuestRuntime): QuestGiverRequest {
    let assignedId = this.giverAssignments.get(roomId);
    let quest = assignedId ? this.registry.getById(assignedId) ?? null : null;

    if (!quest) {
      const available = this.collectEligibleQuests();
      quest = available[0] ?? null;
      if (!quest) {
        return { quest: null, state: "none" };
      }
      this.giverAssignments.set(roomId, quest.id);
    }

    if (this.completed.includes(quest.id)) {
      this.giverAssignments.delete(roomId);
      const available = this.collectEligibleQuests();
      const nextQuest = available[0] ?? null;
      if (!nextQuest) {
        return { quest, state: "completed" };
      }
      this.giverAssignments.set(roomId, nextQuest.id);
      quest = nextQuest;
    }

    if (this.active.some((activeQuest) => activeQuest.id === quest.id)) {
      return { quest, state: "active" };
    }

    this.offered = quest;
    return { quest, state: "available" };
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

    this.assignNewQuests(runtime, completedNow.length);
    return completedNow;
  }

  private assignNewQuests(runtime: QuestRuntime, requestedCount: number): void {
    const available = this.collectEligibleQuests();
    const maxAssignable = Math.min(requestedCount, this.maxActiveQuests - this.active.length);

    for (let i = 0; i < maxAssignable && available.length > 0; i++) {
      const questIndex = Math.floor(this.rng() * available.length);
      const quest = available.splice(questIndex, 1)[0];
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

  private collectEligibleQuests(): Quest[] {
    const exclude = new Set<string>([...this.completed, ...this.active.map((q) => q.id)]);
    if (this.offered) {
      exclude.add(this.offered.id);
    }
    return this.registry.getAvailable(exclude);
  }
}
