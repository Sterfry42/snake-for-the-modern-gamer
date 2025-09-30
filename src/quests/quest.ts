export interface QuestRuntime {
  getSnakeLength(): number;
  getScore(): number;
  addScore(amount: number): void;
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
}

export abstract class Quest {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly description: string
  ) {}

  abstract isCompleted(runtime: QuestRuntime): boolean;

  onReward(_runtime: QuestRuntime): void {}
}
