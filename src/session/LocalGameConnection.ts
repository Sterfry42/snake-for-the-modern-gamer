import type { ClientCommand, CommandResult } from './ClientCommand.js';
import { isInteractionCommand } from './ClientCommand.js';
import type { GameConnection } from './GameConnection.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { LocalAuthoritativeRuntime } from './GameRuntime.js';

export class LocalGameConnection implements GameConnection {
  private readonly subscriptions = new Set<() => void>();
  private disconnected = false;

  constructor(
    private readonly runtime: LocalAuthoritativeRuntime,
    private readonly execute?: (command: ClientCommand) => Promise<CommandResult>,
  ) {}

  send(command: ClientCommand): CommandResult | Promise<CommandResult> {
    if (this.disconnected) return { ok: false, reason: 'disconnected' };
    if (!this.execute && isInteractionCommand(command) && this.runtime.executeCommand)
      return this.runtime.executeCommand(command);
    return this.execute ? this.execute(command) : this.runtime.handleCommand(command);
  }

  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void {
    return this.subscribe(() => this.runtime.onSnapshot(handler));
  }

  onEvent(handler: (event: GameEvent) => void): () => void {
    return this.subscribe(() => this.runtime.onEvent(handler));
  }

  disconnect(): void {
    this.disconnected = true;
    for (const unsubscribe of this.subscriptions) unsubscribe();
    this.subscriptions.clear();
  }

  private subscribe(subscribe: () => () => void): () => void {
    if (this.disconnected) throw new Error('Game connection closed');
    const unsubscribe = subscribe();
    this.subscriptions.add(unsubscribe);
    return () => {
      unsubscribe();
      this.subscriptions.delete(unsubscribe);
    };
  }
}
