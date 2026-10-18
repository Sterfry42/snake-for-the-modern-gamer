/**
 * Game Connection
 */
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { GameEvent } from './GameEvent.js';
import type { GameSnapshot } from './GameSnapshot.js';

export interface GameConnection {
  send(command: ClientCommand): CommandResult | Promise<CommandResult>;
  onSnapshot(handler: (snapshot: GameSnapshot) => void): () => void;
  onEvent(handler: (event: GameEvent) => void): () => void;
  onDisconnect?(handler: (reason: string) => void): () => void;
  disconnect(): void;
}
