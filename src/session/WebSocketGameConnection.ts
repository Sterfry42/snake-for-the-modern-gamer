import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameConnection } from './GameConnection.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';
import { parseServerMessage } from './gameProtocol.js';
import { normalizeDisplayName } from './connectionSettings.js';

export class WebSocketGameConnection implements GameConnection {
  readonly ready: Promise<void>;
  connectionId: string | null = null;
  playerId: string | null = null;
  private snapshot: GameSnapshot | null = null;
  private nextId = 0;
  private closed = false;
  private readonly snapshots = new Set<(snapshot: GameSnapshot) => void>();
  private readonly events = new Set<(event: GameEvent) => void>();
  private readonly disconnectHandlers = new Set<(reason: string) => void>();
  private readonly pending = new Map<
    number,
    {
      resolve: (result: CommandResult) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly socket: WebSocket;

  constructor(url: string, displayName = 'Player') {
    const endpoint = new URL(url);
    endpoint.searchParams.set('name', normalizeDisplayName(displayName));
    this.socket = new WebSocket(endpoint.href);
    this.ready = new Promise<void>((resolve, reject) => {
      const handshakeTimer = setTimeout(() => this.socket.close(), 10000);
      this.socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const message = parseServerMessage(event.data);
          switch (message.type) {
            case 'welcome':
              this.connectionId = message.connectionId;
              this.playerId = message.playerId;
              this.publish(message.snapshot);
              clearTimeout(handshakeTimer);
              resolve();
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
        } catch (error) {
          reject(error);
          this.disconnect();
        }
      };
      this.socket.onclose = () => {
        clearTimeout(handshakeTimer);
        this.closed = true;
        const error = new Error('Game connection closed');
        reject(error);
        this.rejectPending(error);
        for (const handler of this.disconnectHandlers) handler(error.message);
        this.disconnectHandlers.clear();
      };
      this.socket.onerror = () => {
        reject(new Error('Cannot connect to game server'));
        this.disconnect();
      };
    });
  }

  async send(command: ClientCommand): Promise<CommandResult> {
    await this.ready;
    if (this.closed) throw new Error('Game connection closed');
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Game command timed out'));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.socket.send(JSON.stringify({ type: 'command', id, command }));
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

  disconnect(): void {
    this.closed = true;
    this.rejectPending(new Error('Game connection closed'));
    this.socket.close();
    this.snapshots.clear();
    this.events.clear();
  }

  onDisconnect(handler: (reason: string) => void): () => void {
    if (this.closed) handler('Game connection closed');
    else this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  private publish(snapshot: GameSnapshot): void {
    this.snapshot = snapshot;
    for (const handler of this.snapshots) handler(structuredClone(snapshot));
  }

  private rejectPending(error: Error): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    this.pending.clear();
  }
}
