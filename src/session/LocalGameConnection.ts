import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameConnection } from './GameConnection.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { LocalAuthoritativeRuntime } from './GameRuntime.js';

export class LocalGameConnection implements GameConnection {
  constructor(private readonly runtime: LocalAuthoritativeRuntime) {}

  send(command: ClientCommand): CommandResult {
    return this.runtime.handleCommand(command);
  }

  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void {
    return this.runtime.onSnapshot(handler);
  }

  onEvent(handler: (event: GameEvent) => void): () => void {
    return this.runtime.onEvent(handler);
  }

  disconnect(): void {
    // Local sessions do not own external resources yet.
  }
}
