/**
 * Game Connection
 */
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';

export interface GameConnection {
  send(command: ClientCommand): CommandResult;
  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void;
  onEvent(handler: (event: GameEvent) => void): () => void;
  disconnect(): void;
}
