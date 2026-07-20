import type { SnakeGame, StepResult } from '../game/snakeGame.js';
import {
  AP_LOCATION_BY_KEY,
  AP_PHASE_2_GOAL_CHECK_KEY,
  AP_PHASE_2_CORE_ITEM_IDS,
  type ArchipelagoCheckKey,
} from './archipelagoCheckManifest.js';

export interface ArchipelagoCheckTrackerSync {
  checkedLocationIds: number[];
  completedGoal: boolean;
}

export interface ArchipelagoCheckTrackerEvents {
  onCheck?: (locationId: number, locationName: string) => void;
  onGoalComplete?: () => void;
}

export class ArchipelagoCheckTracker {
  private checkedLocationIds = new Set<number>();
  private completedGoal = false;
  private goalCheckKey: ArchipelagoCheckKey = AP_PHASE_2_GOAL_CHECK_KEY;

  constructor(private readonly events: ArchipelagoCheckTrackerEvents = {}) {}

  hydrate(sync: Partial<ArchipelagoCheckTrackerSync>): void {
    this.checkedLocationIds = new Set(
      (sync.checkedLocationIds ?? []).filter((id): id is number => Number.isInteger(id)),
    );
    this.completedGoal = sync.completedGoal === true;
  }

  setGoalCheckKey(key: string | undefined): void {
    if (key && AP_LOCATION_BY_KEY[key]) {
      this.goalCheckKey = key;
    }
  }

  snapshot(): ArchipelagoCheckTrackerSync {
    return {
      checkedLocationIds: [...this.checkedLocationIds].sort((a, b) => a - b),
      completedGoal: this.completedGoal,
    };
  }

  reconcileCurrentState(game: SnakeGame): void {
    this.checkScore(game.getScore());
    this.checkLength(game.getSnakeLength());
  }

  processStep(game: SnakeGame, result: StepResult): void {
    console.info('[AP] processStep', {
      score: game.getScore(),
      length: game.getSnakeLength(),
      appleEaten: result.apple.eaten,
    });
    this.reconcileCurrentState(game);
    if (result.apple.eaten) {
      this.markChecked('first_apple_eaten');
      if (result.apple.typeId) {
        this.markChecked(`apple_${this.keyPart(result.apple.typeId)}`);
      }
    }
    for (const quest of result.questsCompleted) {
      this.markChecked(`quest_${this.keyPart(quest.id)}`);
    }
  }

  processInventoryItem(itemId: string): void {
    if (AP_PHASE_2_CORE_ITEM_IDS.includes(itemId as (typeof AP_PHASE_2_CORE_ITEM_IDS)[number])) {
      this.markChecked(`item_${this.keyPart(itemId)}`);
    }
  }

  processCard(cardId: string): void {
    this.markChecked(`card_${this.keyPart(cardId)}`);
  }

  processArtifact(artifactId: string): void {
    this.markChecked(`artifact_${this.keyPart(artifactId)}`);
  }

  processCardTableWin(tableId: string): void {
    this.markChecked(`card_table_${this.keyPart(tableId)}`);
  }

  processArchaeologyMilestones(
    snapshot: { depth: number; maxChain: number },
    cacheCount: number,
  ): void {
    if (snapshot.depth >= 10) this.markChecked('archaeology_depth_10');
    if (snapshot.depth >= 25) this.markChecked('archaeology_depth_25');
    if (snapshot.depth >= 50) this.markChecked('archaeology_depth_50');
    if (snapshot.maxChain >= 5) this.markChecked('archaeology_chain_5');
    if (snapshot.maxChain >= 10) this.markChecked('archaeology_chain_10');
    if (cacheCount > 0) this.markChecked('archaeology_first_cache');
  }

  processBossDefeat(bossId: string): void {
    if (bossId.toLowerCase().includes('jason')) {
      this.markChecked('boss_jason_statham');
    }
  }

  private keyPart(value: string): string {
    return value.replace(/-/g, '_');
  }

  private checkScore(score: number): void {
    if (score >= 1) this.markChecked('score_1');
    if (score >= 10) this.markChecked('score_10');
    if (score >= 100) this.markChecked('score_100');
    if (score >= 250) this.markChecked('score_250');
    if (score >= 1000) this.markChecked('score_1000');
    if (score >= 10000) this.markChecked('score_10000');
  }

  private checkLength(length: number): void {
    if (length >= 1) this.markChecked('length_1');
    if (length >= 10) this.markChecked('length_10');
    if (length >= 100) this.markChecked('length_100');
    if (length >= 250) this.markChecked('length_250');
  }

  markChecked(key: ArchipelagoCheckKey): void {
    const location = AP_LOCATION_BY_KEY[key];
    if (!location) {
      return;
    }
    if (this.checkedLocationIds.has(location.id)) {
      return;
    }
    this.checkedLocationIds.add(location.id);
    console.info('[AP] checked', location.id, location.name);
    this.events.onCheck?.(location.id, location.name);

    if (key === this.goalCheckKey && !this.completedGoal) {
      this.completedGoal = true;
      this.events.onGoalComplete?.();
    }
  }
}
