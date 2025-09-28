import { getAvailableQuests, type Quest } from "../../quests.js";
import type SnakeScene from "../scenes/snakeScene";

type RNG = () => number;

export interface QuestControllerOptions {
  initialQuestCount?: number;
  maxActiveQuests?: number;
  questOfferChance?: number;
  rng?: RNG;
}

export class QuestController {
  private active: Quest[] = [];
  private completed: string[] = [];
  private offered: Quest | null = null;

  private readonly initialQuestCount: number;
  private readonly maxActiveQuests: number;
  private readonly questOfferChance: number;
  private readonly rng: RNG;

  constructor(options: QuestControllerOptions = {}) {
    this.initialQuestCount = options.initialQuestCount ?? 3;
    this.maxActiveQuests = options.maxActiveQuests ?? 5;
    this.questOfferChance = options.questOfferChance ?? 0.002;
    this.rng = options.rng ?? Math.random;
  }

  reset(): void {
    this.active = [];
    this.completed = [];
    this.offered = null;
    this.assignNewQuests(this.initialQuestCount);
  }

  getActiveQuests(): Quest[] {
    return this.active;
  }

  getCompletedQuestIds(): string[] {
    return this.completed;
  }

  getOfferedQuest(): Quest | null {
    return this.offered;
  }

  acceptOfferedQuest(): Quest | null {
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

  rejectOfferedQuest(): void {
    this.offered = null;
  }

  maybeCreateOffer(paused: boolean): Quest | null {
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

  handleCompletions(scene: SnakeScene): boolean {
    const stillActive: Quest[] = [];
    const completedNow: Quest[] = [];

    for (const quest of this.active) {
      if (!this.completed.includes(quest.id) && quest.isCompleted(scene)) {
        this.completed.push(quest.id);
        completedNow.push(quest);
      } else {
        stillActive.push(quest);
      }
    }

    if (completedNow.length === 0) {
      return false;
    }

    this.active = stillActive;
    for (const quest of completedNow) {
      quest.onReward?.(scene);
      console.log(`Quest completed: ${quest.label}`);
    }

    this.assignNewQuests(completedNow.length);
    return true;
  }

  private assignNewQuests(requestedCount: number): void {
    const available = this.collectEligibleQuests();
    const maxAssignable = Math.min(
      requestedCount,
      this.maxActiveQuests - this.active.length
    );

    for (let i = 0; i < maxAssignable && available.length > 0; i++) {
      const questIndex = Math.floor(this.rng() * available.length);
      this.active.push(available.splice(questIndex, 1)[0]);
    }
  }

  private collectEligibleQuests(): Quest[] {
    const exclude = new Set<string>([...this.completed, ...this.active.map((q) => q.id)]);
    if (this.offered) {
      exclude.add(this.offered.id);
    }
    return getAvailableQuests(Array.from(exclude));
  }
}
