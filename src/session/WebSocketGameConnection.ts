import { diagnosticText, type ClientDiagnostic } from './ClientDiagnostic.js';
import type { PlayerInteraction } from './SceneActionCommand.js';
import type { Vector2Like } from '../core/math.js';
import { MAX_RESUME_INPUTS } from './MovementResume.js';
import { ClientMovementPredictor } from './ClientMovementPredictor.js';
import { PeerMovementPresentation } from './PeerMovementPresentation.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameConnection } from './GameConnection.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { MovementUpdate } from './MovementUpdate.js';
import { SnapshotDeltaAssembler } from './SnapshotDelta.js';
import { parseServerMessage } from './gameProtocol.js';
import {
  normalizeDisplayName,
  normalizeServerUrl,
  loadServerCredential,
  saveServerCredential,
} from './connectionSettings.js';

type ConnectionStatus = 'connected' | 'reconnecting' | 'closed';

export class WebSocketGameConnection implements GameConnection {
  readonly ready: Promise<void>;
  private readyResolved = false;
  private readonly predictor = new ClientMovementPredictor();
  private readonly peers = new PeerMovementPresentation();
  private desiredHold: PlayerInteraction = 'playing';
  private interactionRelease?: Promise<CommandResult>;
  private lastMovementInput?: { direction: Vector2Like; at: number };
  private movementUnchangedSince = performance.now();
  private reportedMovementStall = false;
  private readonly handoffDirections: Vector2Like[] = [];
  connectionId: string | null = null;
  playerId: string | null = null;
  private readonly assembler = new SnapshotDeltaAssembler();
  private snapshot: GameSnapshot | null = null;
  private diagnosticsEnabled = false;
  private lastSnapshotAt = performance.now();
  private readonly diagnostics: ClientDiagnostic[] = [];
  private nextId = 0;
  private closed = false;
  private status: ConnectionStatus = 'reconnecting';
  private attempt = 0;
  private resumeToken: string | null;
  private socket: WebSocket | null = null;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private pageSuspended = false;
  private removeLifecycleListeners?: () => void;
  private handshakeTimer?: ReturnType<typeof setTimeout>;
  private clockTimer?: ReturnType<typeof setInterval>;
  private readonly snapshots = new Set<(snapshot: GameSnapshot) => void>();
  private readonly movements = new Set<(update: MovementUpdate) => void>();
  private readonly events = new Set<(event: GameEvent) => void>();
  private readonly statuses = new Set<(status: ConnectionStatus) => void>();
  private readonly disconnectHandlers = new Set<(reason: string) => void>();
  private readonly pending = new Map<
    number,
    {
      resolve: (result: CommandResult) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
      direction: boolean;
    }
  >();
  private readonly url: string;
  private readonly displayName: string;

  constructor(url: string, displayName = 'Player') {
    this.url = normalizeServerUrl(url);
    this.displayName = normalizeDisplayName(displayName);
    this.resumeToken = loadServerCredential(this.url, 'resume');
    this.ready = new Promise<void>((resolve, reject) => this.connect(resolve, reject));
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const lifecycle = (browserState: ClientDiagnostic['browserState']) =>
        this.reportDiagnostic({
          event: 'browser-lifecycle',
          browserState,
          pendingCommands: this.pending.size,
        });
      const visibility = () => {
        const hidden = document.visibilityState === 'hidden';
        this.movementUnchangedSince = performance.now();
        this.reportedMovementStall = false;
        if (!hidden && this.snapshot && this.status === 'connected') {
          this.predictor.resetClock();
          this.predictor.seedFrom(this.snapshot, performance.now(), this.desiredHold === 'playing');
        }
        lifecycle(hidden ? 'hidden' : 'visible');
      };
      const hide = () => {
        lifecycle('pagehide');
        this.pageSuspended = true;
        clearTimeout(this.retryTimer);
        if (this.connectionId && this.desiredHold === 'playing')
          this.predictor.begin(this.connectionId);
        this.socket?.close(4002, 'Browser page lifecycle');
      };
      const show = () => {
        lifecycle('pageshow');
        if (!this.pageSuspended || this.closed) return;
        this.pageSuspended = false;
        if (this.socket?.readyState === WebSocket.CLOSING) return;
        this.ready
          .then(() =>
            this.connect(
              () => {},
              () => {},
            ),
          )
          .catch(() => {});
      };
      window.addEventListener('pagehide', hide);
      window.addEventListener('pageshow', show);
      document.addEventListener('visibilitychange', visibility);
      this.removeLifecycleListeners = () => {
        window.removeEventListener('pagehide', hide);
        window.removeEventListener('pageshow', show);
        document.removeEventListener('visibilitychange', visibility);
      };
    }
  }

  private connect(resolve: () => void, reject: (error: Error) => void): void {
    if (this.closed || this.pageSuspended) return;
    const endpoint = new URL(this.url);
    endpoint.searchParams.set('name', this.displayName);
    endpoint.searchParams.set('prediction', '1');
    endpoint.searchParams.set('turnSteps', '1');
    if (this.resumeToken) endpoint.searchParams.set('resume', this.resumeToken);
    const host = loadServerCredential(this.url, 'host');
    if (host) endpoint.searchParams.set('hostToken', host);
    const socket = new WebSocket(endpoint.href);
    this.socket = socket;
    socket.onopen = () => {
      if (this.closed || socket !== this.socket) return;
      socket.send(JSON.stringify({ type: 'movementResume', replay: this.predictor.replay() }));
    };
    this.handshakeTimer = setTimeout(() => socket.close(4000, 'Handshake timed out'), 10000);
    socket.onmessage = (event: MessageEvent<string>) => {
      if (this.closed || socket !== this.socket) return;
      try {
        const message = parseServerMessage(event.data);
        switch (message.type) {
          case 'welcome':
            if (this.playerId && message.playerId !== this.playerId) {
              this.finish(
                'This server no longer has your character. Join again to start a new session.',
              );
              return;
            }
            this.diagnosticsEnabled = message.diagnostics === true;
            this.connectionId = message.connectionId;
            this.playerId = message.playerId;
            this.resumeToken = message.resumeToken;
            saveServerCredential(this.url, 'resume', message.resumeToken);
            clearTimeout(this.handshakeTimer);
            this.attempt = 0;
            this.movementUnchangedSince = performance.now();
            this.reportedMovementStall = false;
            this.lastMovementInput = undefined;
            this.predictor.discardReplayedInputs();
            this.predictor.resetClock();
            this.assembler.reset(message.snapshot);
            this.publish(message.snapshot);
            this.setStatus('connected');
            clearInterval(this.clockTimer);
            const probe = () => {
              if (socket.readyState === WebSocket.OPEN) {
                this.checkMovementStall();
                socket.send(
                  JSON.stringify({ type: 'movementClock', clientTimeMs: performance.now() }),
                );
              }
            };
            probe();
            this.clockTimer = setInterval(probe, 1000);
            this.flushDiagnostics();
            for (const direction of this.handoffDirections.splice(0))
              void this.send({ type: 'setDirection', playerId: message.playerId, direction });
            resolve();
            this.readyResolved = true;
            break;
          case 'movementClock':
            this.predictor.synchronizeClock(
              message.clientTimeMs,
              performance.now(),
              message.serverTimeMs,
            );
            break;
          case 'delta':
            this.publish(this.assembler.apply(message.delta));
            break;
          case 'snapshot':
            this.publish(message.snapshot);
            break;
          case 'movement': {
            const next = this.assembler.applyMovement(message.update);
            if (!next) break;
            this.observeMovement(next);
            this.snapshot = next;
            if (message.update.player.id === this.playerId) {
              this.predictor.accept(
                next.players[next.localPlayerId],
                message.update.epoch,
                message.update.tick,
                performance.now(),
                this.desiredHold === 'playing',
              );
            }
            this.peers.accept(next);
            this.notify(this.movements, message.update, 'movement');
            break;
          }
          case 'event':
            this.notify(this.events, message.event, 'event', message.event.type);
            break;
          case 'result': {
            const request = this.pending.get(message.id);
            if (!message.result.ok && request?.direction)
              this.rejectDirection(message.id, message.result.reason);
            if (request) {
              clearTimeout(request.timer);
              this.pending.delete(message.id);
              request.resolve(message.result);
            }
          }
        }
      } catch {
        this.reportDiagnostic({ event: 'protocol-error', pendingCommands: this.pending.size });
        reject(new Error('Invalid game server response'));
        this.finish('Invalid game server response');
      }
    };
    socket.onerror = () => socket.close(4000, 'Transport error');
    socket.onclose = (event) => {
      if (socket !== this.socket) return;
      clearInterval(this.clockTimer);
      clearTimeout(this.handshakeTimer);
      if (!this.closed && this.playerId && ![1000, 1008, 4001].includes(event.code))
        this.reportDiagnostic({
          event: 'connection-lost',
          closeCode: event.code,
          closeWasClean: event.wasClean,
          pendingCommands: this.pending.size,
        });
      this.rejectPending(new Error('Connection interrupted; action was not retried.'));
      if (this.closed) return;
      if (!this.playerId || [1008, 4001].includes(event.code)) {
        const reason = event.reason || 'Cannot connect to game server';
        reject(new Error(reason));
        this.finish(reason);
        return;
      }
      this.predictor.resumePredictionAfterFailedHello();
      for (const direction of this.handoffDirections.splice(0)) this.predictor.direction(direction);
      if (this.connectionId && this.desiredHold === 'playing')
        this.predictor.begin(this.connectionId);
      this.setStatus('reconnecting');
      if (this.pageSuspended) return;
      this.retryTimer = setTimeout(
        () => this.connect(resolve, reject),
        Math.min(500 * 2 ** this.attempt++, 5000),
      );
    };
  }

  async send(command: ClientCommand): Promise<CommandResult> {
    if (!this.readyResolved) await this.ready;
    if (command.type === 'playerInteraction') {
      this.desiredHold = command.mode;
      if (command.mode !== 'playing') this.predictor.cancel();
      else if (this.snapshot && this.status === 'connected')
        this.predictor.seedFrom(this.snapshot, performance.now(), true);
    }
    if (command.type === 'setDirection') {
      this.lastMovementInput = { direction: command.direction, at: performance.now() };
      const release = this.interactionRelease;
      if (release && this.desiredHold === 'playing') {
        const result = await release;
        if (!result.ok) return result;
      }
    }
    const socket = this.socket;
    if (!this.closed && this.status === 'reconnecting' && command.type === 'setDirection') {
      if (
        this.predictor.awaitingAuthority &&
        this.predictor.canBufferHandoff() &&
        this.handoffDirections.length < MAX_RESUME_INPUTS
      ) {
        this.handoffDirections.push({ ...command.direction });
        return { ok: true };
      }
      return this.predictor.direction(command.direction)
        ? { ok: true }
        : { ok: false, reason: 'Movement prediction is waiting for the server.' };
    }
    if (
      this.closed ||
      this.status !== 'connected' ||
      !socket ||
      socket.readyState !== WebSocket.OPEN
    )
      return { ok: false, reason: 'Reconnecting to server. Please wait.' };
    const id = ++this.nextId;
    if (command.type === 'setDirection') {
      const accepted = this.predictor.direction(command.direction, performance.now(), id);
      const intent = this.predictor.turnIntent;
      if (!accepted && this.snapshot?.players[command.playerId]?.movementPredictionAllowed)
        return this.predictor.directionIgnored
          ? { ok: true }
          : { ok: false, reason: 'Movement prediction is waiting for the server.' };
      command = { ...command, inputSequence: id, ...intent };
    }
    const response = new Promise<CommandResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        if (command.type === 'setDirection') this.rejectDirection(id, 'command-timeout');
        this.reportDiagnostic({
          event: 'command-timeout',
          requestId: id,
          commandType: command.type,
          pendingCommands: this.pending.size,
        });
        reject(new Error('Game command timed out'));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer, direction: command.type === 'setDirection' });
      try {
        socket.send(JSON.stringify({ type: 'command', id, command }));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        if (command.type === 'setDirection') this.rejectDirection(id, 'send-failed');
        reject(error);
      }
    });
    if (command.type === 'playerInteraction' && command.mode === 'playing') {
      this.interactionRelease = response;
      try {
        return await response;
      } finally {
        if (this.interactionRelease === response) this.interactionRelease = undefined;
      }
    }
    return response;
  }

  private rejectDirection(id: number, reason?: string): void {
    this.predictor.rejectDirection(id, reason);
    if (this.snapshot)
      this.predictor.seedFrom(this.snapshot, performance.now(), this.desiredHold === 'playing');
  }

  private reportDiagnostic(
    details: Omit<ClientDiagnostic, 'type' | 'previousConnectionId' | 'snapshotAgeMs'>,
  ): void {
    if (!this.diagnosticsEnabled || !this.connectionId) return;
    if (this.diagnostics.length >= 8) this.diagnostics.shift();
    this.diagnostics.push({
      type: 'clientDiagnostic',
      previousConnectionId: this.connectionId,
      snapshotAgeMs: Math.min(86400000, Math.max(0, performance.now() - this.lastSnapshotAt)),
      ...details,
    });
    this.flushDiagnostics();
  }

  private flushDiagnostics(): void {
    if (
      !this.diagnosticsEnabled ||
      this.status !== 'connected' ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return;
    while (this.diagnostics.length) {
      try {
        this.socket.send(JSON.stringify(this.diagnostics[0]));
        this.diagnostics.shift();
      } catch {
        return;
      }
    }
  }
  private notify<T>(
    handlers: Iterable<(value: T) => void>,
    value: T,
    presentationKind: NonNullable<ClientDiagnostic['presentationKind']>,
    gameplayEvent?: string,
  ): void {
    for (const handler of handlers) {
      try {
        handler(value);
      } catch (error) {
        console.error(`[game-client] ${presentationKind} handler failed`, error);
        this.reportDiagnostic({
          event: 'presentation-error',
          presentationKind,
          gameplayEvent,
          errorMessage: diagnosticText(error instanceof Error ? error.message : error, 300),
          errorStack: diagnosticText(error instanceof Error ? error.stack : undefined, 1500),
          ...this.movementDiagnosticContext(),
          pendingCommands: this.pending.size,
        });
      }
    }
  }

  getMovementPresentation() {
    if (this.desiredHold !== 'playing') return null;
    const player = this.snapshot?.players[this.snapshot.localPlayerId];
    return player ? this.predictor.presentation(player) : null;
  }

  getMovementPresentationRevision(): number {
    return this.predictor.presentationRevision;
  }

  recordMovementFrame(direction: Vector2Like): void {
    this.predictor.recordMovementFrame(direction);
  }

  getMovementDiagnostics() {
    return this.predictor.getDiagnostics();
  }

  getPeerMovementPresentation(playerId: string) {
    return this.peers.sample(playerId, performance.now());
  }
  hasPeerMovementPresentation(): boolean {
    return this.peers.active();
  }

  isPredictionExhausted(): boolean {
    this.getMovementPresentation();
    return this.predictor.exhausted;
  }

  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void {
    this.snapshots.add(handler);
    if (this.snapshot) this.notify([handler], structuredClone(this.snapshot), 'snapshot');
    return () => this.snapshots.delete(handler);
  }
  onMovement(handler: (update: MovementUpdate) => void): () => void {
    this.movements.add(handler);
    return () => this.movements.delete(handler);
  }
  onEvent(handler: (event: GameEvent) => void): () => void {
    this.events.add(handler);
    return () => this.events.delete(handler);
  }
  onStatus(handler: (status: ConnectionStatus) => void): () => void {
    this.statuses.add(handler);
    this.notify([handler], this.status, 'status');
    return () => this.statuses.delete(handler);
  }
  onDisconnect(handler: (reason: string) => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }
  disconnect(): void {
    this.removeLifecycleListeners?.();
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearTimeout(this.handshakeTimer);
    clearInterval(this.clockTimer);
    this.rejectPending(new Error('Game connection closed'));
    this.socket?.close(1000, 'Left server');
    this.diagnostics.length = 0;
    this.snapshots.clear();
    this.movements.clear();
    this.events.clear();
    this.statuses.clear();
    this.disconnectHandlers.clear();
  }
  private finish(reason: string): void {
    this.setStatus('closed');
    this.notify(this.disconnectHandlers, reason, 'disconnect');
    this.disconnect();
  }
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.notify(this.statuses, status, 'status');
  }
  private publish(snapshot: GameSnapshot): void {
    this.lastSnapshotAt = performance.now();
    this.observeMovement(snapshot);
    this.predictor.seedFrom(snapshot, performance.now(), this.desiredHold === 'playing');
    this.peers.accept(snapshot);
    this.snapshot = snapshot;
    for (const handler of this.snapshots)
      this.notify([handler], structuredClone(snapshot), 'snapshot');
  }
  private observeMovement(snapshot: GameSnapshot): void {
    if (
      this.snapshot?.replication?.epoch !== snapshot.replication?.epoch ||
      this.snapshot?.players[snapshot.localPlayerId]?.movementRevision !==
        snapshot.players[snapshot.localPlayerId]?.movementRevision
    ) {
      this.movementUnchangedSince = performance.now();
      this.reportedMovementStall = false;
    }
  }

  private movementDiagnosticContext() {
    const input = this.lastMovementInput;
    const direction = input?.direction;
    const lastInputDirection =
      direction?.x === 1
        ? 'right'
        : direction?.x === -1
          ? 'left'
          : direction?.y === 1
            ? 'down'
            : direction?.y === -1
              ? 'up'
              : undefined;
    const roomId = this.snapshot?.viewport.centerRoomId;
    return {
      browserState: typeof document === 'undefined' ? undefined : document.visibilityState,
      snapshotTick: this.snapshot?.tick,
      snapshotEpoch: this.snapshot?.replication?.epoch,
      snapshotRoomId: roomId,
      snapshotRoomRevision: roomId ? this.snapshot?.replication?.roomRevisions[roomId] : undefined,
      movementRevision: this.snapshot?.players[this.snapshot.localPlayerId]?.movementRevision,
      desiredInteraction: this.desiredHold,
      lastInputDirection,
      lastInputAgeMs: input ? performance.now() - input.at : undefined,
    } satisfies Partial<ClientDiagnostic>;
  }

  private checkMovementStall(): void {
    if (
      !this.diagnosticsEnabled ||
      this.reportedMovementStall ||
      !this.snapshot ||
      typeof document === 'undefined' ||
      document.visibilityState !== 'visible'
    )
      return;
    const player = this.snapshot.players[this.snapshot.localPlayerId];
    const now = performance.now();
    if (
      !player?.alive ||
      now - this.movementUnchangedSince < Math.max(5000, (player.movementIntervalMs ?? 0) * 3)
    )
      return;
    this.reportedMovementStall = true;
    if (
      this.desiredHold === 'playing' &&
      player.movementPredictionAllowed &&
      now - this.lastSnapshotAt < 500
    ) {
      this.predictor.resetClock(now);
      this.predictor.seedFrom(this.snapshot, now, true);
    }
    this.reportDiagnostic({
      event: 'movement-stalled',
      ...this.movementDiagnosticContext(),
      pendingCommands: this.pending.size,
    });
  }

  private rejectPending(error: Error): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.resolve({ ok: false, reason: error.message });
    }
    this.pending.clear();
  }
}
