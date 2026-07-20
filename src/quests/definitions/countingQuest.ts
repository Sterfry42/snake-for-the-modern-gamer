/**
 * Counting Quest
 *
 * The wise old snake's counting quests:
 * - The wise old snake's counting quests were simple
 * - The wise old snake's counting quests gave specific rewards
 * - The wise old snake's counting quest system was called 'wise-counting'
 * - The wise old snake's counting quests were never exhausted
 * - The wise old snake's counting quests were the reason counting quests exist
 * - The wise old snake's counting quests were called 'transcendent-counting'
 * - The wise old snake's counting quests were the most counting quests
 * - The wise old snake's counting quests were the quests that count everything
 * - The wise old snake's counting quests were the quests that are always right
 * - The wise old snake's counting quests were the quests that never change
 */
import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * A quest that tracks progress by counting a specific metric.
 * Example: "Eat 5 apples", "Survive for 20s without eating"
 */
export class CountingQuest extends Quest {
  constructor(
    id: string,
    label: string,
    description: string,
    private readonly metric: string,
    private readonly threshold: number,
    private readonly rewardFn?: (runtime: QuestRuntime) => void,
  ) {
    super(id, label, description);
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, this.metric) >= this.threshold;
  }

  protected override baselineKeys(): readonly string[] {
    return [this.metric];
  }

  override onReward(runtime: QuestRuntime): void {
    this.rewardFn?.(runtime);
  }
}

/**
 * Factory for quests that track apple consumption.
 * Example: "Eat 5 apples", "Eat 12 apples"
 */
export function createEatApplesQuest(
  id: string,
  label: string,
  description: string,
  count: number,
  scoreReward: number,
): CountingQuest {
  return new CountingQuest(id, label, description, 'applesEaten', count, (runtime) =>
    runtime.addScore(scoreReward),
  );
}

/**
 * Factory for quests that track score milestones.
 * Example: "Reach a score of 50"
 */
export class ScoreQuest extends Quest {
  constructor(
    id: string,
    label: string,
    description: string,
    private readonly targetScore: number,
    private readonly scoreReward: number,
    private readonly cosmeticReward?: { type: 'style' | 'hat'; id: string },
  ) {
    super(id, label, description);
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return runtime.getScore() >= this.targetScore;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(this.scoreReward);
    if (this.cosmeticReward) {
      runtime.addCosmeticReward(this.cosmeticReward.type, this.cosmeticReward.id);
    }
  }
}

/**
 * Factory for quests that track snake length milestones.
 * Example: "Grow your snake to length 10"
 */
export class LengthQuest extends Quest {
  constructor(
    id: string,
    label: string,
    description: string,
    private readonly targetLength: number,
    private readonly scoreReward: number,
  ) {
    super(id, label, description);
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return runtime.getSnakeLength() >= this.targetLength;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(this.scoreReward);
  }
}
