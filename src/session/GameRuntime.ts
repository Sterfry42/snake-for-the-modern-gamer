import type { GameSaveData } from '../game/saveManager.js';
import type { StepResult } from '../game/snakeGame.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { SaveStore } from '../storage/SaveStore.js';
import type { CommandHandler } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';

export interface LocalAuthoritativeRuntime extends CommandHandler {
  actionStep(paused: boolean): StepResult;
  bossStep(): void;
  actorClockStep(): StepResult | null;
  hazardClockStep(): StepResult | null;
  bulletClockStep(): StepResult | null;
  getSnapshot(): GameSnapshot;
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
