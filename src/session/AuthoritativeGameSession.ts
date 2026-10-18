import { setSavedGameData } from '../game/saveManager.js';
import type { ChoiceWithMods, GameSaveData } from '../game/saveTypes.js';
import type { SnakeGame, StepResult } from '../game/snakeGame.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { Boss } from '../systems/boss.js';
import type { SaveStore } from '../storage/SaveStore.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { LocalAuthoritativeRuntime, LocalAuthoritativeRuntimeArgs } from './GameRuntime.js';
import type { GameSnapshot, ConnectionPresence } from './GameSnapshot.js';
import { normalizeDisplayName } from './connectionSettings.js';
import { SimulationScheduler } from '../systems/simulationScheduler.js';
import { SnakeGame as Game } from '../game/snakeGame.js';
import { QuestRegistry } from '../quests/questRegistry.js';
import { defaultGameConfig, type GameConfig } from '../config/gameConfig.js';
import { copyGameSnapshot } from './gameProtocol.js';
import {
  awardAppleScore,
  awardBonusApple,
  stepBonusApple,
  stepHungerTimer,
} from '../features/basicGameplayHooks.js';

export type AuthoritativeGameSessionArgs = LocalAuthoritativeRuntimeArgs & {
  manageBasicFeatures?: boolean;
};

type SnapshotHandler = (snapshot: GameSnapshot) => void;
type EventHandler = (event: GameEvent) => void;

export class AuthoritativeGameSession implements LocalAuthoritativeRuntime {
  private readonly connections = new Map<string, ConnectionPresence>();

  registerConnection(connectionId: string, displayName: string): void {
    this.connections.set(connectionId, {
      connectionId,
      playerId: this.localPlayerId,
      displayName: normalizeDisplayName(displayName),
    });
  }

  unregisterConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }
  private paused = false;
  private dead = false;
  private work: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly dueSteps: Array<() => void | Promise<void>> = [];
  private readonly scheduler = new SimulationScheduler([
    {
      id: 'boss',
      intervalMs: 100,
      step: (ms) => this.dueSteps.push(() => this.bossStep(undefined, ms)),
    },
    {
      id: 'action',
      intervalMs: 100,
      step: () =>
        this.dueSteps.push(() => {
          this.actionStep(false);
        }),
    },
    {
      id: 'actor',
      intervalMs: 100,
      step: (ms) =>
        this.dueSteps.push(async () => {
          await this.actorClockStep(ms);
        }),
    },
    {
      id: 'bullet',
      intervalMs: 100,
      step: () =>
        this.dueSteps.push(() => {
          this.bulletClockStep();
        }),
    },
    {
      id: 'hazard',
      intervalMs: 100,
      step: () =>
        this.dueSteps.push(() => {
          this.hazardClockStep();
        }),
    },
  ]);
  private readonly game: SnakeGame;
  private readonly localPlayerId: PlayerId;
  private readonly saveStore?: SaveStore<GameSaveData>;
  private readonly saveSlotId: string;
  private readonly manageBasicFeatures: boolean;
  private readonly snapshotHandlers = new Set<SnapshotHandler>();
  private readonly eventHandlers = new Set<EventHandler>();
  private lastSnapshot: GameSnapshot;

  get rng(): import('../core/rng.js').RandomGenerator {
    return this.game.rng;
  }

  constructor(args: AuthoritativeGameSessionArgs) {
    this.game = args.game;
    this.localPlayerId = args.localPlayerId ?? this.game.getLocalPlayerId();
    this.saveStore = args.saveStore;
    this.saveSlotId = args.saveSlotId ?? 'default';
    this.manageBasicFeatures = args.manageBasicFeatures ?? false;
    this.lastSnapshot = this.buildSnapshot();
  }

  /** Production creation stays behind the same authority for either transport. */
  static async create(
    options: {
      config?: GameConfig;
      saveStore?: SaveStore<GameSaveData>;
      saveSlotId?: string;
    } = {},
  ): Promise<AuthoritativeGameSession> {
    const registry = new QuestRegistry();
    await registry.loadBuiltIns();
    const game = new Game(options.config ?? defaultGameConfig, registry);
    game.reset();
    if (game.config.features.enabled.includes('wrapWall')) game.enableTeleport(true);
    return new AuthoritativeGameSession({ ...options, game, manageBasicFeatures: true });
  }

  /** Commands, persistence, and asynchronous actor steps share one ordered queue. */
  executeCommand(command: ClientCommand): Promise<CommandResult> {
    return this.enqueue(async () => {
      if (!this.game.getPlayer(command.playerId)) return { ok: false, reason: 'unknown-player' };
      if (this.saveStore) {
        switch (command.type) {
          case 'saveGame':
            await this.save();
            return { ok: true, saved: true };
          case 'loadGame': {
            const data = await this.saveStore.load(this.saveSlotId);
            if (!data) return { ok: false, loaded: false };
            if (!this.game.loadFromSaveData(data)) return { ok: false, loaded: false };
            this.dead = false;
            for (const id of ['boss', 'action', 'actor', 'bullet', 'hazard'])
              this.scheduler.resetClock(id);
            this.refreshSnapshot();
            return { ok: true, loaded: true };
          }
          case 'clearSave':
            await this.clearSave();
            return { ok: true, cleared: true };
        }
      }
      return this.handleCommand(command);
    });
  }

  advance(deltaMs: number): Promise<void> {
    return this.enqueue(async () => {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid simulation delta');
      const running = !this.paused && !this.dead;
      if (running) {
        this.game.setFlag(
          'timeMs',
          Number(this.game.getFlag<number>('timeMs') ?? 0) + Math.min(deltaMs, 250),
        );
        this.game.updateAtmosphere(Math.min(deltaMs, 250));
      }
      this.scheduler.update(deltaMs, {
        boss: running,
        action: running,
        actor: running,
        bullet: running,
        hazard: running,
      });
      const steps = this.dueSteps.splice(0);
      for (const step of steps) {
        if (this.dead || this.paused) break;
        await step();
      }
    });
  }

  start(onError: (error: unknown) => void): void {
    if (this.timer) return;
    let last = performance.now();
    let advancing = false;
    this.timer = setInterval(() => {
      if (advancing) return;
      const now = performance.now();
      const delta = now - last;
      last = now;
      advancing = true;
      void this.advance(delta)
        .catch(onError)
        .finally(() => {
          advancing = false;
        });
    }, 20);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async flush(): Promise<void> {
    await this.work;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.work.then(operation);
    this.work = next.then(
      () => {},
      () => {},
    );
    return next;
  }

  handleCommand(command: ClientCommand): CommandResult {
    const player = this.game.getPlayer(command.playerId);
    if (!player) {
      return { ok: false, reason: 'unknown-player' };
    }

    if (command.type === 'restartRun') {
      this.game.reset();
      this.dead = false;
      this.paused = false;
      if (this.game.config.features.enabled.includes('wrapWall')) this.game.enableTeleport(true);
      for (const id of ['boss', 'action', 'actor', 'bullet', 'hazard'])
        this.scheduler.resetClock(id);
      this.emitSnapshot();
      return { ok: true };
    }

    if (command.type === 'pause') this.paused = true;
    if (command.type === 'resume') this.paused = false;
    if (command.type === 'interact') this.game.resolveQuestInteraction();
    if (command.type === 'chooseOption') this.game.resolveQuestInteraction(command.choiceId);
    if (command.type === 'useItem') {
      const result = this.game.useInventoryItem(command.itemId);
      this.emitSnapshot();
      return { ok: result.ok, reason: result.ok ? undefined : result.message };
    }

    if (command.type === 'saveGame') {
      this.saveGame(command.religionChoice, command.classChoice, command.backgroundChoice);
      return { ok: true, saved: true };
    }

    if (command.type === 'loadGame') {
      const loaded = this.loadGame(
        () => command.religionChoice,
        () => command.classChoice,
        () => command.backgroundChoice,
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
    const previousRoomId = this.game.getPlayer(this.localPlayerId)?.snake.currentRoomId;
    const result = this.game.actionStep(paused);
    if (result.status === 'dead') this.dead = true;
    if (this.manageBasicFeatures && !paused && result.status !== 'dead') {
      const enabled = this.game.config.features.enabled;
      if (enabled.includes('hungerTimer')) stepHungerTimer(this.game);
      if (enabled.includes('bonusApple')) stepBonusApple(this.game, this.game.rng);
      if (result.apple.eaten) {
        if (enabled.includes('coreScore')) awardAppleScore(this.game);
        if (enabled.includes('bonusApple')) awardBonusApple(this.game);
        if (enabled.includes('hungerTimer')) this.game.setFlag('timeSinceEat', 0);
      }
    }
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
    const snapshot = this.emitSnapshot();
    if (this.eventHandlers.size > 0) this.emitStepEvents(previousRoomId, result, snapshot);
    return result;
  }

  bossStep(
    onEvent?: (event: import('../systems/boss.js').BossEvent) => void,
    stepMs?: number,
  ): void {
    this.game.bossStep(onEvent, stepMs);
    this.emitSnapshot();
  }

  async actorClockStep(stepMs?: number): Promise<StepResult | null> {
    return this.runAsyncClockStep(() => this.game.actorClockStep(stepMs));
  }

  hazardClockStep(): StepResult | null {
    return this.runClockStep(() => this.game.hazardClockStep());
  }

  bulletClockStep(): StepResult | null {
    return this.runClockStep(() => this.game.bulletClockStep());
  }

  getSnapshot(): GameSnapshot {
    this.lastSnapshot = this.buildSnapshot();
    return this.lastSnapshot;
  }

  refreshSnapshot(): GameSnapshot {
    return this.emitSnapshot(true);
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

  saveGame(
    religionChoice?: ChoiceWithMods,
    classChoice?: ChoiceWithMods,
    backgroundChoice?: ChoiceWithMods,
  ): void {
    const data = this.game.getSaveData();
    if (religionChoice) {
      data.religionId = religionChoice.id;
      data.religionMods = religionChoice.mods;
    }
    if (classChoice) {
      data.classId = classChoice.id;
      data.classMods = classChoice.mods;
    }
    if (backgroundChoice) {
      data.backgroundId = backgroundChoice.id;
      data.backgroundMods = backgroundChoice.mods;
    }
    setSavedGameData(JSON.stringify(data));
    this.emitSnapshot();
  }

  loadGame(
    getReligionChoice?: () => ChoiceWithMods | undefined,
    getClassChoice?: () => ChoiceWithMods | undefined,
    getBackgroundChoice?: () => ChoiceWithMods | undefined,
  ): boolean {
    const loaded = this.game.loadGame(getReligionChoice, getClassChoice, getBackgroundChoice);
    if (loaded) {
      this.dead = false;
      this.emitSnapshot();
    }
    return loaded;
  }

  hasSaveSync(): boolean {
    return this.game.hasSaveFile();
  }

  clearSaveSync(): void {
    this.game.clearSaveFile();
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

  private buildSnapshot(detach = true): GameSnapshot {
    const snapshot = this.game.getSnapshot(this.localPlayerId);
    snapshot.connections = Object.fromEntries(this.connections);
    for (const room of Object.values(snapshot.viewport.rooms)) {
      room.bosses = this.game.getBosses(room.id).map(cloneBossForSnapshot);
    }
    snapshot.ui.paused = this.paused;
    snapshot.presentation = {
      characterMode: this.game.getCharacterMode(),
      atmosphere: this.game.getAtmosphereForRoom(),
    };
    if (this.manageBasicFeatures && snapshot.players[this.localPlayerId])
      snapshot.players[this.localPlayerId].alive = !this.dead;
    return detach ? copyGameSnapshot(snapshot) : snapshot;
  }

  private emitSnapshot(forceDetach = false): GameSnapshot {
    // Unobserved simulation needs no presentation projection. Public reads refresh it.
    if (!forceDetach && this.snapshotHandlers.size === 0 && this.eventHandlers.size === 0) {
      return this.lastSnapshot;
    }
    const snapshot = this.buildSnapshot(forceDetach || this.snapshotHandlers.size > 0);
    this.lastSnapshot = snapshot;
    for (const handler of this.snapshotHandlers) {
      handler(structuredClone(snapshot));
    }
    return snapshot;
  }

  private emit(event: GameEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  private runClockStep(step: () => StepResult | null): StepResult | null {
    const previousRoomId = this.game.getPlayer(this.localPlayerId)?.snake.currentRoomId;
    const result = step();
    if (result?.status === 'dead') this.dead = true;
    const snapshot = this.emitSnapshot();
    if (result && this.eventHandlers.size > 0) {
      this.emitStepEvents(previousRoomId, result, snapshot);
    }
    return result;
  }

  private async runAsyncClockStep(
    step: () => Promise<StepResult | null>,
  ): Promise<StepResult | null> {
    const previousRoomId = this.game.getPlayer(this.localPlayerId)?.snake.currentRoomId;
    const result = await step();
    if (result?.status === 'dead') this.dead = true;
    const snapshot = this.emitSnapshot();
    if (result && this.eventHandlers.size > 0) {
      this.emitStepEvents(previousRoomId, result, snapshot);
    }
    return result;
  }

  private emitStepEvents(
    previousRoomId: string | undefined,
    result: StepResult,
    snapshot: GameSnapshot,
  ): void {
    const player = snapshot.players[this.localPlayerId];
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

type SnapshotBossSource = ReturnType<SnakeGame['getBosses']>[number];

function cloneBossForSnapshot(boss: SnapshotBossSource): Boss {
  const pull =
    'pull' in boss && boss.pull
      ? { radius: boss.pull.radius, strength: boss.pull.strength }
      : undefined;
  return {
    ...boss,
    body: boss.body.map((segment) => ({ ...segment })),
    direction: boss.direction ? { ...boss.direction } : { x: 0, y: 1 },
    headCenter: boss.headCenter ? { ...boss.headCenter } : undefined,
    pull,
  };
}
