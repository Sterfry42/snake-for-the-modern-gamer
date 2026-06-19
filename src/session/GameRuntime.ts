import type { GameSaveData } from '../game/saveManager.js';
import type { RandomGenerator } from '../core/rng.js';
import type { StepResult } from '../game/snakeGame.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { SaveStore } from '../storage/SaveStore.js';
import type { CommandHandler } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';

export interface LocalAuthoritativeRuntime extends CommandHandler {
  readonly rng: RandomGenerator;
  actionStep(paused: boolean): StepResult;
  bossStep(
    onEvent?: (event: import('../systems/boss.js').BossEvent) => void,
    stepMs?: number,
  ): void;
  actorClockStep(): Promise<StepResult | null>;
  hazardClockStep(): StepResult | null;
  bulletClockStep(): StepResult | null;
  getSnapshot(): GameSnapshot;
  refreshSnapshot(): GameSnapshot;
  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void;
  onEvent(handler: (event: GameEvent) => void): () => void;
  save(): Promise<void>;
  saveGame(religionChoice?: unknown, classChoice?: unknown, backgroundChoice?: unknown): void;
  loadGame(
    getReligionChoice?: () => unknown,
    getClassChoice?: () => unknown,
    getBackgroundChoice?: () => unknown,
  ): boolean;
  hasSaveSync(): boolean;
  clearSaveSync(): void;
  hasSave(): Promise<boolean>;
  clearSave(): Promise<void>;
}

export interface LocalAuthoritativeRuntimeArgs {
  game: import('../game/snakeGame.js').SnakeGame;
  localPlayerId?: PlayerId;
  saveStore?: SaveStore<GameSaveData>;
  saveSlotId?: string;
}
