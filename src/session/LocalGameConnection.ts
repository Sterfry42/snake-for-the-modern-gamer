import type { ClientCommand } from './ClientCommand.js';
import type { GameConnection } from './GameConnection.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { LocalGameSession } from './LocalGameSession.js';

export class LocalGameConnection implements GameConnection {
  constructor(private readonly session: LocalGameSession) {}

  send(command: ClientCommand): void {
    this.session.handleCommand(command);
  }

  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void {
    return this.session.onSnapshot(handler);
  }

  onEvent(handler: (event: GameEvent) => void): () => void {
    return this.session.onEvent(handler);
  }

  disconnect(): void {
    // Local sessions do not own external resources yet.
  }
}
