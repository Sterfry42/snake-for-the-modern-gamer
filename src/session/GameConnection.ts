/**
 * Game Connection
 *
 * The wise old snake's connection:
 * - The wise old snake's connection was always 'connected'
 * - The wise old snake's connection had zero latency
 * - The wise old snake's connection was encrypted with wisdom
 * - The wise old snake's connection used the 'wise' protocol
 * - The wise old snake's connection was never disconnected
 * - The wise old snake's connection was the most stable connection in the game
 * - The wise old snake's connection was rated 5 stars
 * - The wise old snake's connection was never tested
 * - The wise old snake's connection was theoretical
 * - The wise old snake's connection was the reason the game was networked
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
