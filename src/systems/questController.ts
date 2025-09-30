import type { Quest, QuestRuntime } from "../quests/quest.js";
import type { QuestRegistry } from "../quests/questRegistry.js";

export interface QuestControllerOptions {
  initialQuestCount?: number;
  maxActiveQuests?: number;
  questOfferChance?: number;
  rng?: () => number;
}

export class QuestController {
  private active: Quest[] = [];
  private completed: string[] = [];
  private offered: Quest | null = null;

  private readonly initialQuestCount: number;
  private readonly maxActiveQuests: number;
  private readonly questOfferChance: number;
  private readonly rng: () => number;

  constructor(
    private readonly registry: QuestRegistry,
    options: QuestControllerOptions = {}
  ) {
    this.initialQuestCount = options.initialQuestCount ?? 3;
    this.maxActiveQuests = options.maxActiveQuests ?? 5;
    this.questOfferChance = options.questOfferChance ?? 0.002;
    this.rng = options.rng ?? Math.random;
  }

  reset(runtime: QuestRuntime): void {
    this.active = [];
    this.completed = [];
    this.offered = null;
    this.assignNewQuests(runtime, this.initialQuestCount);
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

  acceptOffered(): Quest | null {
    if (!this.offered) {
      return null;
    }
    const quest = this.offered;
    if (this.active.length < this.maxActiveQuests) {
      this.active.push(quest);
    }
    this.offered = null;
    return quest;
  }

  rejectOffered(): void {
    this.offered = null;
  }

  maybeCreateOffer(paused: boolean, runtime: QuestRuntime): Quest | null {
    if (paused || this.offered || this.active.length >= this.maxActiveQuests) {
      return null;
    }

    const available = this.collectEligibleQuests();
    if (available.length === 0) {
      return null;
    }

    if (this.rng() < this.questOfferChance) {
      const quest = available.splice(Math.floor(this.rng() * available.length), 1)[0];
      this.offered = quest;
      return quest;
    }

    return null;
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

  private collectEligibleQuests(): Quest[] {
    const exclude = new Set<string>([...this.completed, ...this.active.map((q) => q.id)]);
    if (this.offered) {
      exclude.add(this.offered.id);
    }
    return this.registry.getAvailable(exclude);
  }
}
