import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameConnection } from './GameConnection.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';
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
  connectionId: string | null = null;
  playerId: string | null = null;
  private readonly assembler = new SnapshotDeltaAssembler();
  private snapshot: GameSnapshot | null = null;
  private nextId = 0;
  private closed = false;
  private status: ConnectionStatus = 'reconnecting';
  private attempt = 0;
  private resumeToken: string | null;
  private socket: WebSocket | null = null;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private handshakeTimer?: ReturnType<typeof setTimeout>;
  private readonly snapshots = new Set<(snapshot: GameSnapshot) => void>();
  private readonly events = new Set<(event: GameEvent) => void>();
  private readonly statuses = new Set<(status: ConnectionStatus) => void>();
  private readonly disconnectHandlers = new Set<(reason: string) => void>();
  private readonly pending = new Map<
    number,
    {
      resolve: (result: CommandResult) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly url: string;
  private readonly displayName: string;

  constructor(url: string, displayName = 'Player') {
    this.url = normalizeServerUrl(url);
    this.displayName = normalizeDisplayName(displayName);
    this.resumeToken = loadServerCredential(this.url, 'resume');
    this.ready = new Promise<void>((resolve, reject) => this.connect(resolve, reject));
  }

  private connect(resolve: () => void, reject: (error: Error) => void): void {
    if (this.closed) return;
    const endpoint = new URL(this.url);
    endpoint.searchParams.set('name', this.displayName);
    if (this.resumeToken) endpoint.searchParams.set('resume', this.resumeToken);
    const host = loadServerCredential(this.url, 'host');
    if (host) endpoint.searchParams.set('hostToken', host);
    const socket = new WebSocket(endpoint.href);
    this.socket = socket;
    this.handshakeTimer = setTimeout(() => socket.close(), 10000);
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
            this.connectionId = message.connectionId;
            this.playerId = message.playerId;
            this.resumeToken = message.resumeToken;
            saveServerCredential(this.url, 'resume', message.resumeToken);
            clearTimeout(this.handshakeTimer);
            this.attempt = 0;
            this.assembler.reset(message.snapshot);
            this.publish(message.snapshot);
            this.setStatus('connected');
            resolve();
            break;
          case 'delta':
            this.publish(this.assembler.apply(message.delta));
            break;
          case 'snapshot':
            this.publish(message.snapshot);
            break;
          case 'event':
            for (const handler of this.events) handler(message.event);
            break;
          case 'result': {
            const request = this.pending.get(message.id);
            if (request) {
              clearTimeout(request.timer);
              this.pending.delete(message.id);
              request.resolve(message.result);
            }
          }
        }
      } catch {
        reject(new Error('Invalid game server response'));
        this.finish('Invalid game server response');
      }
    };
    socket.onerror = () => socket.close();
    socket.onclose = (event) => {
      if (socket !== this.socket) return;
      clearTimeout(this.handshakeTimer);
      this.rejectPending(new Error('Connection interrupted; action was not retried.'));
      if (this.closed) return;
      if (!this.playerId || [1008, 4001].includes(event.code)) {
        const reason = event.reason || 'Cannot connect to game server';
        reject(new Error(reason));
        this.finish(reason);
        return;
      }
      this.setStatus('reconnecting');
      this.retryTimer = setTimeout(
        () => this.connect(resolve, reject),
        Math.min(500 * 2 ** this.attempt++, 5000),
      );
    };
  }

  async send(command: ClientCommand): Promise<CommandResult> {
    await this.ready;
    const socket = this.socket;
    if (
      this.closed ||
      this.status !== 'connected' ||
      !socket ||
      socket.readyState !== WebSocket.OPEN
    )
      return { ok: false, reason: 'Reconnecting to server. Please wait.' };
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Game command timed out'));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        socket.send(JSON.stringify({ type: 'command', id, command }));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void {
    this.snapshots.add(handler);
    if (this.snapshot) handler(structuredClone(this.snapshot));
    return () => this.snapshots.delete(handler);
  }
  onEvent(handler: (event: GameEvent) => void): () => void {
    this.events.add(handler);
    return () => this.events.delete(handler);
  }
  onStatus(handler: (status: ConnectionStatus) => void): () => void {
    this.statuses.add(handler);
    handler(this.status);
    return () => this.statuses.delete(handler);
  }
  onDisconnect(handler: (reason: string) => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }
  disconnect(): void {
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearTimeout(this.handshakeTimer);
    this.rejectPending(new Error('Game connection closed'));
    this.socket?.close();
    this.snapshots.clear();
    this.events.clear();
    this.statuses.clear();
    this.disconnectHandlers.clear();
  }
  private finish(reason: string): void {
    this.setStatus('closed');
    for (const handler of this.disconnectHandlers) handler(reason);
    this.disconnect();
  }
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const handler of this.statuses) handler(status);
  }
  private publish(snapshot: GameSnapshot): void {
    this.snapshot = snapshot;
    for (const handler of this.snapshots) handler(structuredClone(snapshot));
  }
  private rejectPending(error: Error): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.resolve({ ok: false, reason: error.message });
    }
    this.pending.clear();
  }
}
