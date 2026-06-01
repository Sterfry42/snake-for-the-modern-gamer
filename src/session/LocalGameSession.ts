import { saveManager, type GameSaveData } from '../game/saveManager.js';
import type { SnakeGame, StepResult } from '../game/snakeGame.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { SaveStore } from '../storage/SaveStore.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { LocalAuthoritativeRuntime, LocalAuthoritativeRuntimeArgs } from './GameRuntime.js';
import type { GameSnapshot } from './GameSnapshot.js';

export type LocalGameSessionArgs = LocalAuthoritativeRuntimeArgs;

type SnapshotHandler = (snapshot: GameSnapshot) => void;
type EventHandler = (event: GameEvent) => void;

export class LocalGameSession implements LocalAuthoritativeRuntime {
  private readonly game: SnakeGame;
  private readonly localPlayerId: PlayerId;
  private readonly saveStore?: SaveStore<GameSaveData>;
  private readonly saveSlotId: string;
  private readonly snapshotHandlers = new Set<SnapshotHandler>();
  private readonly eventHandlers = new Set<EventHandler>();
  private lastSnapshot: GameSnapshot;

  constructor(args: LocalGameSessionArgs) {
    this.game = args.game;
    this.localPlayerId = args.localPlayerId ?? this.game.getLocalPlayerId();
    this.saveStore = args.saveStore;
    this.saveSlotId = args.saveSlotId ?? 'default';
    this.lastSnapshot = this.game.getSnapshot(this.localPlayerId);
  }

  handleCommand(command: ClientCommand): CommandResult {
    const player = this.game.getPlayer(command.playerId);
    if (!player) {
      return { ok: false, reason: 'unknown-player' };
    }

    if (command.type === 'saveGame') {
      this.saveGame(command.religionChoice, command.classChoice, command.backgroundChoice);
      return { ok: true, saved: true };
    }

    if (command.type === 'loadGame') {
      const loaded = this.loadGame(
        () => command.religionChoice ?? null,
        () => command.classChoice ?? null,
        () => command.backgroundChoice ?? null,
      );
      return { ok: loaded, loaded };
    }

    if (command.type === 'clearSave') {
      this.clearSaveSync();
      this.emitSnapshot();
      return { ok: true, cleared: true };
    }

    this.game.handleCommand(command);
    this.emitSnapshot();
    return { ok: true };
  }

  actionStep(paused: boolean): StepResult {
    const previousRoomId = this.getSnapshot().players[this.localPlayerId]?.roomId;
    const result = this.game.actionStep(paused);
    if (!paused) {
      const debugResult = this.game.stepDebugPlayers();
      if (debugResult.appleEaten) {
        this.emit({
          type: 'toast',
          message: `Debug snake ate ${debugResult.appleTypeId ?? 'an apple'}.`,
        });
      }
      if (debugResult.died) {
        this.emit({
          type: 'player.died',
          playerId: 'debug-player-2',
          reason: debugResult.deathReason ?? 'unknown',
        });
      }
    }
    this.emitSnapshot();
    this.emitStepEvents(previousRoomId, result);
    return result;
  }

  bossStep(): void {
    this.game.bossStep();
    this.emitSnapshot();
  }

  actorClockStep(): StepResult | null {
    return this.runClockStep(() => this.game.actorClockStep());
  }

  hazardClockStep(): StepResult | null {
    return this.runClockStep(() => this.game.hazardClockStep());
  }

  bulletClockStep(): StepResult | null {
    return this.runClockStep(() => this.game.bulletClockStep());
  }

  getSnapshot(): GameSnapshot {
    this.lastSnapshot = this.game.getSnapshot(this.localPlayerId);
    return this.lastSnapshot;
  }

  onSnapshot(handler: SnapshotHandler): () => void {
    this.snapshotHandlers.add(handler);
    handler(this.getSnapshot());
    return () => {
      this.snapshotHandlers.delete(handler);
    };
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  async save(): Promise<void> {
    if (!this.saveStore) {
      this.game.saveGame();
      return;
    }
    await this.saveStore.save(this.saveSlotId, this.game.getSaveData());
  }

  saveGame(religionChoice?: unknown, classChoice?: unknown, backgroundChoice?: unknown): void {
    saveManager.save(this.game, religionChoice, classChoice, backgroundChoice);
    this.emitSnapshot();
  }

  loadGame(
    getReligionChoice?: () => unknown,
    getClassChoice?: () => unknown,
    getBackgroundChoice?: () => unknown,
  ): boolean {
    const loaded = saveManager.load(
      this.game,
      getReligionChoice,
      getClassChoice,
      getBackgroundChoice,
    );
    if (loaded) {
      this.emitSnapshot();
    }
    return loaded;
  }

  hasSaveSync(): boolean {
    return saveManager.hasSave();
  }

  clearSaveSync(): void {
    saveManager.clear();
  }

  async hasSave(): Promise<boolean> {
    if (!this.saveStore) {
      return this.game.hasSaveFile();
    }
    return this.saveStore.has(this.saveSlotId);
  }

  async clearSave(): Promise<void> {
    if (!this.saveStore) {
      this.game.clearSaveFile();
      return;
    }
    await this.saveStore.clear(this.saveSlotId);
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot();
    for (const handler of this.snapshotHandlers) {
      handler(snapshot);
    }
  }

  private emit(event: GameEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  private runClockStep(step: () => StepResult | null): StepResult | null {
    const previousRoomId = this.getSnapshot().players[this.localPlayerId]?.roomId;
    const result = step();
    this.emitSnapshot();
    if (result) {
      this.emitStepEvents(previousRoomId, result);
    }
    return result;
  }

  private emitStepEvents(previousRoomId: string | undefined, result: StepResult): void {
    const player = this.getSnapshot().players[this.localPlayerId];
    if (!player) {
      return;
    }
    if (previousRoomId && previousRoomId !== player.roomId) {
      this.emit({
        type: 'room.changed',
        playerId: this.localPlayerId,
        fromRoomId: previousRoomId,
        toRoomId: player.roomId,
      });
    }
    if (result.status === 'dead') {
      this.emit({
        type: 'player.died',
        playerId: this.localPlayerId,
        reason: result.deathReason ?? 'unknown',
      });
      this.emit({
        type: 'sound.play',
        soundId: 'death',
      });
      this.emit({
        type: 'screen.shake',
        intensity: 0.006,
        durationMs: 220,
      });
    }
    if (result.apple.eaten) {
      this.emit({
        type: 'item.picked_up',
        playerId: this.localPlayerId,
        itemId: result.apple.typeId ?? 'apple',
        label: result.apple.typeId ?? 'apple',
      });
      this.emit({
        type: 'sound.play',
        soundId: 'apple.eat',
      });
    }
    for (const quest of result.questsCompleted) {
      this.emit({
        type: 'quest.completed',
        playerId: this.localPlayerId,
        questId: quest.id,
        label: quest.label,
      });
      this.emit({
        type: 'sound.play',
        soundId: 'quest.completed',
      });
    }
  }
}
