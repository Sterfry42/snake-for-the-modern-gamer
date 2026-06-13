import type { SnakeGame, StepResult } from '../game/snakeGame.js';
import {
  AP_PHASE_1_GOAL_CHECK_KEY,
  AP_PHASE_1_LOCATION_BY_KEY,
  type ArchipelagoPhase1CheckKey,
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

  constructor(private readonly events: ArchipelagoCheckTrackerEvents = {}) {}

  hydrate(sync: Partial<ArchipelagoCheckTrackerSync>): void {
    this.checkedLocationIds = new Set(
      (sync.checkedLocationIds ?? []).filter((id): id is number => Number.isInteger(id)),
    );
    this.completedGoal = sync.completedGoal === true;
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
    this.reconcileCurrentState(game);
    if (result.apple.eaten) {
      this.markChecked('first_apple_eaten');
    }
  }

  private checkScore(score: number): void {
    if (score >= 1) this.markChecked('score_1');
    if (score >= 10) this.markChecked('score_10');
  }

  private checkLength(length: number): void {
    if (length >= 1) this.markChecked('length_1');
    if (length >= 10) this.markChecked('length_10');
  }

  private markChecked(key: ArchipelagoPhase1CheckKey): void {
    const location = AP_PHASE_1_LOCATION_BY_KEY[key];
    if (this.checkedLocationIds.has(location.id)) {
      return;
    }
    this.checkedLocationIds.add(location.id);
    this.events.onCheck?.(location.id, location.name);

    if (key === AP_PHASE_1_GOAL_CHECK_KEY && !this.completedGoal) {
      this.completedGoal = true;
      this.events.onGoalComplete?.();
    }
  }
}
