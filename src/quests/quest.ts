import type { CardId } from '../cards/cardGame.js';

export interface QuestRuntime {
  getSnakeLength(): number;
  getScore(): number;
  addScore(amount: number): void;
  addItem(itemId: string, count?: number): void;
  addCardToCollection?(cardId: CardId, count?: number): void;
  addCosmeticReward(type: 'style' | 'hat', id: string): void;
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
  requiresQuestGiver?(questId: string): boolean;
  canOfferQuestFromGiver?(questId: string, giverRoomId: string): boolean;
  onQuestAcceptedFromGiver?(quest: Quest, giverRoomId?: string): void;
}

export abstract class Quest {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly description: string,
  ) {}

  abstract isCompleted(runtime: QuestRuntime): boolean;

  onAccept(runtime: QuestRuntime): void {
    const baseline: Record<string, number> = {};
    for (const key of this.baselineKeys()) {
      baseline[key] = Number(runtime.getFlag<number>(key) ?? 0);
    }
    runtime.setFlag(this.baselineFlagKey(), baseline);
  }

  onReward(_runtime: QuestRuntime): void {}

  protected baselineKeys(): readonly string[] {
    return [];
  }

  protected progressSinceAccept(runtime: QuestRuntime, key: string): number {
    const baseline = runtime.getFlag<Record<string, number>>(this.baselineFlagKey()) ?? {};
    return Number(runtime.getFlag<number>(key) ?? 0) - Number(baseline[key] ?? 0);
  }

  private baselineFlagKey(): string {
    return `quest.baseline.${this.id}`;
  }
}
