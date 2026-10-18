import { setSavedGameData } from '../game/saveManager.js';
import {
  describeActionOutcome,
  isGameplayFeedbackKey,
  type ActionOutcome,
} from './GameplayOutcome.js';
import type { ChoiceWithMods, GameSaveData } from '../game/saveTypes.js';
import type { SnakeGame, StepResult } from '../game/snakeGame.js';
import type { PlayerId, PlayerRuntime } from '../players/playerTypes.js';
import type { Boss } from '../systems/boss.js';
import type { SaveStore } from '../storage/SaveStore.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import { isInteractionCommand } from './ClientCommand.js';
import { isSceneActionCommand, type PlayerInteraction } from './SceneActionCommand.js';
import { executeSceneGameplayAction } from './SceneGameplayActions.js';
import { AuthoritativeProgression } from './AuthoritativeProgression.js';
import { isManualMovementArea } from '../world/manualMovementPolicy.js';
import { AuthoritativeVehicles } from './AuthoritativeVehicles.js';
import { AuthoritativeMinigames } from './AuthoritativeMinigames.js';
import { GameInteractionMenus } from './GameInteractionMenus.js';
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
  allowDebugCommands?: boolean;
};

type SnapshotHandler = (snapshot: GameSnapshot) => void;
type EventHandler = (event: GameEvent) => void;

export class AuthoritativeGameSession implements LocalAuthoritativeRuntime {
  private readonly connections = new Map<string, ConnectionPresence>();
  private outcomeSequence = 0;
  private readonly playerInteractions = new Map<PlayerId, PlayerInteraction>();
  private readonly progression = new Map<PlayerId, AuthoritativeProgression>();
  private readonly actionElapsed = new Map<PlayerId, number>();
  private readonly vehicles: AuthoritativeVehicles;
  private readonly minigames: AuthoritativeMinigames;

  attachConnection(connectionId: string, name: string): Promise<PlayerId> {
    return this.enqueue(async () => this.registerConnection(connectionId, name));
  }

  detachConnection(connectionId: string): Promise<void> {
    return this.enqueue(async () => {
      this.unregisterConnection(connectionId);
      this.refreshSnapshot();
    });
  }

  registerConnection(connectionId: string, displayName: string): PlayerId {
    const primaryAttached = [...this.connections.values()].some(
      (peer) => peer.playerId === this.localPlayerId,
    );
    const playerId = primaryAttached ? `player-${connectionId}` : this.localPlayerId;
    this.game.addConnectedPlayer(playerId, normalizeDisplayName(displayName)).alive = true;
    this.connections.set(connectionId, {
      connectionId,
      playerId,
      displayName: normalizeDisplayName(displayName),
    });
    return playerId;
  }

  unregisterConnection(connectionId: string): void {
    const peer = this.connections.get(connectionId);
    this.connections.delete(connectionId);
    if (!peer) return;
    this.interactions.remove(peer.playerId);
    this.playerInteractions.delete(peer.playerId);
    this.game.runForPlayer(peer.playerId, () => this.vehicles.abandon());
    this.minigames.reset(peer.playerId);
    this.progression.delete(peer.playerId);
    this.actionElapsed.delete(peer.playerId);
    if (peer.playerId === this.localPlayerId) {
      const player = this.game.getPlayer(peer.playerId);
      if (player) player.alive = false;
    } else this.game.removeConnectedPlayer(peer.playerId);
  }

  private simulationPlayers() {
    const ids =
      this.connections.size > 0
        ? [...new Set([...this.connections.values()].map((peer) => peer.playerId))]
        : [this.localPlayerId];
    return ids
      .map((id) => this.game.getPlayer(id))
      .filter((player): player is PlayerRuntime => player !== null && player.alive);
  }
  private paused = false;
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
      intervalMs: 20,
      step: () =>
        this.dueSteps.push(() => {
          if (this.manageBasicFeatures) this.scheduledActionStep(20);
          else {
            this.legacyActionElapsed += 20;
            if (this.legacyActionElapsed >= 100) {
              this.legacyActionElapsed -= 100;
              this.actionStep(false);
            }
          }
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
  private legacyActionElapsed = 0;
  private readonly interactions: GameInteractionMenus;
  private readonly localPlayerId: PlayerId;
  private readonly saveStore?: SaveStore<GameSaveData>;
  private readonly saveSlotId: string;
  private checkpoint: GameSaveData | null = null;
  private readonly manageBasicFeatures: boolean;
  private readonly allowDebugCommands: boolean;
  private readonly snapshotHandlers = new Map<SnapshotHandler, PlayerId>();
  private readonly eventHandlers = new Set<EventHandler>();
  private lastSnapshot: GameSnapshot;

  get rng(): import('../core/rng.js').RandomGenerator {
    return this.game.rng;
  }

  constructor(args: AuthoritativeGameSessionArgs) {
    this.game = args.game;
    this.vehicles = new AuthoritativeVehicles(this.game);
    this.minigames = new AuthoritativeMinigames(this.game);
    this.interactions = new GameInteractionMenus(this.game);
    this.localPlayerId = args.localPlayerId ?? this.game.getLocalPlayerId();
    this.saveStore = args.saveStore;
    this.saveSlotId = args.saveSlotId ?? 'default';
    this.manageBasicFeatures = args.manageBasicFeatures ?? false;
    this.allowDebugCommands = args.allowDebugCommands ?? false;
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
    const session = new AuthoritativeGameSession({
      ...options,
      game,
      manageBasicFeatures: true,
    });
    if (options.saveStore) session.checkpoint = await options.saveStore.load(session.saveSlotId);
    return session;
  }

  /** Commands, persistence, and asynchronous actor steps share one ordered queue. */
  executeCommand(command: ClientCommand): Promise<CommandResult> {
    return this.enqueue(async () => {
      if (!this.game.getPlayer(command.playerId)) return { ok: false, reason: 'unknown-player' };
      if (command.type === 'actorAction' || command.type === 'datingAction') {
        const result = await this.game.runForPlayerAsync(command.playerId, () => {
          if (!this.game.getPlayer(command.playerId)?.alive)
            return Promise.resolve({ ok: false, reason: 'Respawn before acting.' });
          return command.type === 'actorAction'
            ? this.interactions.act(command.playerId, command)
            : Promise.resolve(this.interactions.date(command.playerId, command));
        });
        this.emitSnapshot();
        return result;
      }
      if (
        ['saveGame', 'loadGame', 'clearSave'].includes(command.type) &&
        this.connections.size > 0 &&
        command.playerId !== this.localPlayerId
      )
        return { ok: false, reason: 'Only the host can manage the world checkpoint.' };
      if (isSceneActionCommand(command)) {
        const result = this.game.runForPlayer(command.playerId, () => {
          if (command.type === 'playerInteraction') {
            this.playerInteractions.set(command.playerId, command.mode);
            return { ok: true };
          }
          if (!this.game.getPlayer(command.playerId)?.alive)
            return { ok: false, reason: 'Respawn before acting.' };
          if (command.type === 'debugAction' && !this.allowDebugCommands)
            return { ok: false, reason: 'Debug commands are disabled for this session.' };
          if (command.type === 'manualStep') {
            const head = this.game.getSnakeBody()[0];
            if (
              !head ||
              (!this.game.getFlag<boolean>('traversal.manualResumePending') &&
                !isManualMovementArea(this.game.getCurrentRoom(), head, this.game.config.grid))
            )
              return { ok: false, reason: 'Manual steps require a turn-step area.' };
            if (
              this.interactions.getView(command.playerId) ||
              this.minigames.getView(command.playerId) ||
              this.game.getFlag('vehicle.active') ||
              !['playing', 'manual'].includes(
                this.playerInteractions.get(command.playerId) ?? 'playing',
              )
            )
              return { ok: false, reason: 'Close the current menu before moving.' };
            this.game.setFlag('traversal.manualResumePending', undefined);
            this.stepPlayerAction(false, command.playerId);
            return { ok: true };
          }
          if (command.type === 'vehicleAction') {
            if (command.action === 'enter') return this.vehicles.enter(command.carId);
            if (command.action === 'exit') return this.vehicles.exit();
            if (command.action === 'input')
              return this.vehicles.input(command.throttle, command.steering);
            const result = this.game.buyGarageCar();
            return { ok: result.ok, message: result.message };
          }
          if (command.type === 'minigameAction') return this.minigames.command(command);
          if (command.type === 'progressionAction') {
            const progression = this.getProgression(command.playerId);
            if (command.action === 'bind' || command.action === 'usePrimary') {
              const result =
                command.action === 'bind'
                  ? progression.actions.bind('q', command.abilityId)
                  : progression.actions.use('q');
              progression.persist();
              return { ok: result.ok, reason: result.ok ? undefined : result.reason };
            }
            if (command.action === 'purchase') {
              if (!progression.skills.getDefinition(command.perkId))
                return { ok: false, reason: 'Unknown perk.' };
              const ok = Boolean(progression.skills.purchase(command.perkId));
              progression.refreshEquipment();
              return { ok };
            }
            const cast = progression.skills.tryCastSpell(command.spellId);
            progression.persist();
            return { ok: cast.ok };
          }
          const result = executeSceneGameplayAction(this.game, command);
          if (result.ok && (command.type === 'inventoryAction' || command.type === 'specialAction'))
            this.getProgression(command.playerId).refreshEquipment();
          return result;
        });
        this.emitSnapshot();
        return result;
      }
      if (isInteractionCommand(command)) {
        const result = await this.game.runForPlayerAsync(command.playerId, async () => {
          if (!this.game.getPlayer(command.playerId)?.alive && command.type !== 'closeInteraction')
            return { ok: false, reason: 'Respawn before acting.' };
          switch (command.type) {
            case 'openActor':
              return this.interactions.open(command.playerId, command.actorId);
            case 'closeInteraction':
              return this.interactions.close(command.playerId, command.menuId);
            case 'selectInteraction':
              return this.interactions.select(command.playerId, command.menuId, command.optionId);
          }
        });
        this.emitSnapshot();
        return result;
      }
      if (this.saveStore) {
        switch (command.type) {
          case 'saveGame':
            await this.save();
            this.emitSnapshot();
            return { ok: true, saved: true };
          case 'loadGame': {
            const data = await this.saveStore.load(this.saveSlotId);
            if (!data) return { ok: false, loaded: false };
            if (!this.game.loadConnectedCheckpoint(data)) return { ok: false, loaded: false };
            for (const peer of this.connections.values())
              this.game.addConnectedPlayer(peer.playerId, peer.displayName);
            this.checkpoint = structuredClone(data);
            this.progression.clear();
            this.actionElapsed.clear();
            this.vehicles.reset();
            this.minigames.reset();
            this.interactions.reset();
            this.playerInteractions.clear();
            this.game.getPlayer(this.localPlayerId)!.alive = true;
            for (const id of ['boss', 'action', 'actor', 'bullet', 'hazard'])
              this.scheduler.resetClock(id);
            this.refreshSnapshot();
            return { ok: true, loaded: true };
          }
          case 'clearSave':
            await this.clearSave();
            this.emitSnapshot();
            return { ok: true, cleared: true };
        }
      }
      return this.game.runForPlayer(command.playerId, () => this.handleCommand(command));
    });
  }

  private getProgression(playerId: PlayerId): AuthoritativeProgression {
    let progression = this.progression.get(playerId);
    if (!progression) {
      progression = new AuthoritativeProgression(this.game);
      this.progression.set(playerId, progression);
    }
    return progression;
  }

  advance(deltaMs: number): Promise<void> {
    return this.enqueue(async () => {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid simulation delta');
      const running = !this.paused && this.simulationPlayers().length > 0;
      if (running) {
        this.advanceEnvironment(deltaMs);
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
        if (this.paused || this.simulationPlayers().length === 0) break;
        await step();
      }
    });
  }

  /** Shared environment clock for the headless scheduler and the legacy local clock adapter. */
  advanceEnvironment(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid simulation delta');
    const elapsed = Math.min(deltaMs, 250);
    const now = Number(this.game.getFlag<number>('timeMs') ?? 0) + elapsed;
    this.game.setFlag('timeMs', now);
    for (const player of this.simulationPlayers()) player.snake.flags.timeMs = now;
    this.game.updateAtmosphere(elapsed);
    if (this.manageBasicFeatures)
      for (const player of this.simulationPlayers())
        this.game.runForPlayer(player.id, () => {
          this.game.tickHouseGarden(elapsed);
          this.minigames.step(elapsed);
          this.vehicles.step(
            elapsed,
            (this.playerInteractions.get(player.id) ?? 'playing') !== 'playing' ||
              Boolean(this.interactions.getView(player.id)) ||
              Boolean(this.minigames.getView(player.id)),
          );
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
    const next = this.work.then(async () => {
      try {
        return await operation();
      } finally {
        if (this.manageBasicFeatures) {
          const ids = new Set([
            this.localPlayerId,
            ...[...this.connections.values()].map((peer) => peer.playerId),
          ]);
          for (const id of ids)
            if (this.game.getPlayer(id))
              this.game.runForPlayer(id, () => this.publishGameplayOutcome(id));
        }
      }
    });
    this.work = next.then(
      () => {},
      () => {},
    );
    return next;
  }

  handleCommand(command: ClientCommand): CommandResult {
    if (isInteractionCommand(command) || isSceneActionCommand(command))
      return { ok: false, reason: 'Interaction commands require the session queue.' };
    if (
      this.game.getLocalPlayerId() !== command.playerId &&
      this.game.getPlayer(command.playerId)
    ) {
      return this.game.runForPlayer(command.playerId, () => this.handleCommand(command));
    }
    const player = this.game.getPlayer(command.playerId);
    if (!player) {
      return { ok: false, reason: 'unknown-player' };
    }
    if (
      !player.alive &&
      [
        'setDirection',
        'forceDirection',
        'interact',
        'chooseOption',
        'talkToActor',
        'useItem',
      ].includes(command.type)
    ) {
      return { ok: false, reason: 'Respawn before acting.' };
    }

    if (command.type === 'talkToActor') {
      const result = this.game.talkToNearbyActor(command.actorId);
      this.emitSnapshot();
      return result;
    }

    if (command.type === 'restartRun' && this.connections.size > 0) {
      this.vehicles.abandon();
      this.minigames.reset(command.playerId);
      this.actionElapsed.delete(command.playerId);
      this.interactions.remove(command.playerId);
      this.playerInteractions.delete(command.playerId);
      this.game.respawnConnectedPlayer(command.playerId);
      this.game.getPlayer(command.playerId)!.alive = true;
      this.emitSnapshot();
      return { ok: true };
    }
    if (command.type === 'restartRun') {
      this.vehicles.reset();
      this.minigames.reset();
      this.progression.clear();
      this.actionElapsed.clear();
      this.interactions.reset();
      this.playerInteractions.clear();
      this.game.reset();
      this.game.getPlayer(command.playerId)!.alive = true;
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
      if (result.ok && this.manageBasicFeatures)
        this.getProgression(command.playerId).refreshEquipment();
      this.emitSnapshot();
      return {
        ok: result.ok,
        reason: result.ok ? undefined : result.message,
        message: result.message,
        color: result.color,
      };
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

  private playerHeld(playerId: PlayerId): boolean {
    return (
      Boolean(this.game.getForcedEncounter()) ||
      Boolean(this.game.getOfferedQuest()) ||
      Boolean(this.minigames.getView(playerId)) ||
      Boolean(this.interactions.getView(playerId)) ||
      (this.playerInteractions.get(playerId) ?? 'playing') !== 'playing' ||
      Boolean(this.game.getFlag('vehicle.active')) ||
      (this.manageBasicFeatures &&
        isManualMovementArea(
          this.game.getCurrentRoom(),
          this.game.getSnakeBody()[0],
          this.game.config.grid,
        )) ||
      Boolean(this.game.getStructurePlacement())
    );
  }

  private scheduledActionStep(deltaMs: number): void {
    for (const player of this.simulationPlayers())
      this.game.runForPlayer(player.id, () => {
        if (this.playerHeld(player.id)) {
          this.actionElapsed.set(player.id, 0);
          return;
        }
        const interval = Math.max(20, this.getProgression(player.id).intervalMs);
        let elapsed = (this.actionElapsed.get(player.id) ?? 0) + deltaMs;
        while (elapsed >= interval && player.alive) {
          elapsed -= interval;
          this.stepPlayerAction(false, player.id);
        }
        this.actionElapsed.set(player.id, elapsed);
      });
  }

  actionStep(paused: boolean): StepResult {
    let first: StepResult | undefined;
    for (const player of this.simulationPlayers()) {
      const result = this.game.runForPlayer(player.id, () =>
        this.stepPlayerAction(paused || this.playerHeld(player.id), player.id),
      );
      first ??= result;
    }
    return first ?? this.game.actionStep(true);
  }

  private stepPlayerAction(paused: boolean, playerId: PlayerId): StepResult {
    const previousRoomId = this.game.getPlayer(playerId)?.snake.currentRoomId;
    const scoreBefore = this.game.getScore();
    const lengthBefore = this.game.getSnakeLength();
    const result = this.game.actionStep(paused);
    this.resolvePlayerDeath(result, playerId);
    if (this.manageBasicFeatures && !paused && result.status !== 'dead') {
      const progression = this.getProgression(playerId);
      progression.refreshIfNeeded();
      progression.skills.tick();
      progression.persist();
    }
    if (result.status === 'dead') {
      this.game.getPlayer(playerId)!.alive = false;
    }
    if (this.manageBasicFeatures && !paused && result.status !== 'dead') {
      const enabled = this.game.config.features.enabled;
      if (enabled.includes('hungerTimer')) stepHungerTimer(this.game);
      if (enabled.includes('bonusApple')) stepBonusApple(this.game, this.game.rng);
      if (result.apple.eaten) {
        const score = (amount: number) =>
          this.game.addScore(this.getProgression(playerId).skills.modifyScoreGain(amount));
        if (enabled.includes('coreScore')) awardAppleScore(this.game, score);
        if (enabled.includes('bonusApple')) awardBonusApple(this.game, score);
        if (enabled.includes('hungerTimer')) this.game.setFlag('timeSinceEat', 0);
      }
    }
    if (!paused && playerId === this.localPlayerId) {
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
    if (this.manageBasicFeatures && !paused)
      this.publishGameplayOutcome(
        playerId,
        describeActionOutcome(result, {
          scoreBefore,
          lengthBefore,
          scoreAfter: this.game.getScore(),
          lengthAfter: this.game.getSnakeLength(),
          head: this.game.getSnakeBody()[0] ?? null,
          roomId: this.game.getCurrentRoom().id,
        }),
      );
    if (this.eventHandlers.size > 0)
      this.emitStepEvents(previousRoomId, result, this.buildSnapshot(true, playerId), playerId);
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
    let first: StepResult | null = null;
    for (const player of this.simulationPlayers()) {
      const result = this.game.runForPlayer(player.id, () => {
        const result = this.game.hazardClockStep();
        if (result) this.resolvePlayerDeath(result, player.id);
        return result;
      });
      if (result?.status === 'dead') player.alive = false;
      if (result && this.eventHandlers.size > 0)
        this.emitStepEvents(
          player.snake.currentRoomId,
          result,
          this.buildSnapshot(true, player.id),
          player.id,
        );
      first ??= result;
    }
    this.emitSnapshot();
    return first;
  }

  bulletClockStep(): StepResult | null {
    return this.runClockStep(() => this.game.bulletClockStep());
  }

  getSnapshot(playerId = this.localPlayerId): GameSnapshot {
    this.lastSnapshot = this.buildSnapshot(true, playerId);
    return this.lastSnapshot;
  }

  refreshSnapshot(): GameSnapshot {
    return this.emitSnapshot(true);
  }

  onSnapshot(handler: SnapshotHandler, playerId = this.localPlayerId): () => void {
    this.snapshotHandlers.set(handler, playerId);
    handler(this.getSnapshot(playerId));
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
    const data = this.game.getSaveData();
    await this.saveStore.save(this.saveSlotId, data);
    this.checkpoint = structuredClone(data);
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
      this.interactions.reset();
      this.playerInteractions.clear();
      this.game.getPlayer(this.localPlayerId)!.alive = true;
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
    this.checkpoint = null;
  }

  private buildSnapshot(detach = true, playerId = this.localPlayerId): GameSnapshot {
    if (this.game.getLocalPlayerId() !== playerId) {
      return this.game.runForPlayer(playerId, () => this.buildSnapshot(detach, playerId));
    }
    const snapshot = this.game.getSnapshot(playerId);
    snapshot.clientState = this.game.getSceneClientState();
    snapshot.forcedEncounter = this.game.getForcedEncounter();
    if (this.manageBasicFeatures)
      snapshot.clientState.flags = Object.fromEntries(
        Object.entries(snapshot.clientState.flags).filter(([key]) => !isGameplayFeedbackKey(key)),
      );
    snapshot.minigame = this.minigames.getView(playerId);
    snapshot.persistence = {
      slotId: this.saveSlotId,
      checkpoint: playerId === this.localPlayerId ? this.checkpoint : null,
    };
    snapshot.connections = Object.fromEntries(this.connections);
    for (const room of Object.values(snapshot.viewport.rooms)) {
      room.bosses = this.game.getBosses(room.id).map(cloneBossForSnapshot);
    }
    snapshot.ui.paused = this.paused;
    snapshot.ui.interaction = this.interactions.getView(playerId);
    snapshot.ui.playerInteraction = this.playerInteractions.get(playerId) ?? 'playing';
    snapshot.presentation = {
      characterMode: this.game.getCharacterMode(),
      atmosphere: this.game.getAtmosphereForRoom(),
    };

    return detach ? copyGameSnapshot(snapshot) : snapshot;
  }

  private emitSnapshot(forceDetach = false): GameSnapshot {
    // Unobserved simulation needs no presentation projection. Public reads refresh it.
    if (!forceDetach && this.snapshotHandlers.size === 0 && this.eventHandlers.size === 0) {
      return this.lastSnapshot;
    }
    const snapshot = this.buildSnapshot(forceDetach || this.snapshotHandlers.size > 0);
    this.lastSnapshot = snapshot;
    for (const [handler, playerId] of this.snapshotHandlers) {
      handler(
        playerId === this.localPlayerId
          ? structuredClone(snapshot)
          : this.buildSnapshot(true, playerId),
      );
    }
    return snapshot;
  }

  private emit(event: GameEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  private publishGameplayOutcome(playerId: PlayerId, action?: ActionOutcome): void {
    if (
      this.game.getPlayer(playerId)?.alive &&
      !this.interactions.getView(playerId) &&
      !this.minigames.getView(playerId)
    )
      this.game.beginAdjacentRandomEncounter();
    const feedback = this.game.drainGameplayFeedback();
    if (!action && feedback.length === 0) {
      this.emitSnapshot();
      return;
    }
    this.emitSnapshot();
    this.emit({
      type: 'gameplay.outcome',
      playerId,
      outcome: { sequence: ++this.outcomeSequence, playerId, action, feedback },
    });
  }

  private runClockStep(step: () => StepResult | null): StepResult | null {
    const previousRoomId = this.game.getPlayer(this.localPlayerId)?.snake.currentRoomId;
    const result = step();
    if (result) this.resolvePlayerDeath(result, this.localPlayerId);
    if (result?.status === 'dead') this.game.getPlayer(this.localPlayerId)!.alive = false;
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
    if (result) this.resolvePlayerDeath(result, this.localPlayerId);
    if (result?.status === 'dead') this.game.getPlayer(this.localPlayerId)!.alive = false;
    const snapshot = this.emitSnapshot();
    if (result && this.eventHandlers.size > 0) {
      this.emitStepEvents(previousRoomId, result, snapshot);
    }
    return result;
  }

  private resolvePlayerDeath(result: StepResult, playerId: PlayerId): void {
    if (!this.manageBasicFeatures || result.status !== 'dead') return;
    const progression = this.getProgression(playerId);
    const angel =
      this.game.getFlag<boolean>('boss.insultedAngel') ||
      this.game.getFlag<string>('player.killedByBossKind') === 'angel' ||
      (result.deathReason === 'boss' &&
        this.game.getBosses(this.game.getCurrentRoom().id).some((boss) => boss.kind === 'angel'));
    if (angel) {
      progression.skills.setExtraLives(0);
      this.game.setFlag('equipment.phoenixCharges', 0);
      this.game.setFlag('equipment.itemPhoenixCharges', 0);
      this.game.setFlag('fortitude.phoenix', { charges: 0 });
      return;
    }
    const rescued =
      this.game.tryConsumeWardForDeath(result.deathReason) ||
      this.game.tryConsumeFellowshipRescue() ||
      this.game.tryConsumeGrowthForDeath(result.deathReason) ||
      progression.skills.consumeExtraLife();
    if (!rescued) return;
    this.game.reviveAfterExtraLife(result.deathReason);
    this.game.setFlag('traversal.manualResumePending', undefined);
    this.game.getPlayer(playerId)!.alive = true;
    result.status = 'alive';
    progression.persist();
    this.emit({ type: 'player.revived', playerId, reason: result.deathReason ?? 'unknown' });
    result.deathReason = undefined;
  }

  private emitStepEvents(
    previousRoomId: string | undefined,
    result: StepResult,
    snapshot: GameSnapshot,
    playerId = this.localPlayerId,
  ): void {
    const player = snapshot.players[playerId];
    if (!player) {
      return;
    }
    if (previousRoomId && previousRoomId !== player.roomId) {
      this.emit({
        type: 'room.changed',
        playerId,
        fromRoomId: previousRoomId,
        toRoomId: player.roomId,
        head: player.body[0],
      });
    }
    if (result.status === 'dead') {
      this.emit({
        type: 'player.died',
        playerId,
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
        playerId,
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
        playerId,
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
