import { resolve } from 'node:path';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../src/server/createGameServer.js';
import { FileGameSaveStore } from '../src/storage/FileGameSaveStore.js';

const session = await AuthoritativeGameSession.create({
  saveStore: new FileGameSaveStore(
    resolve(process.env.SNAKE_SAVE_DIRECTORY ?? '.snake-server-saves'),
  ),
});
await session.executeCommand({ type: 'pause', playerId: session.getSnapshot().localPlayerId });
const server = createGameServer(session);
const port = await server.listen(Number(process.env.PORT ?? 8787), process.env.HOST ?? '127.0.0.1');
session.start((error) => {
  console.error('[game-server] Simulation stopped', error);
  session.stop();
});
console.info(`[game-server] Listening at ws://127.0.0.1:${port}/game`);

let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  await server.close();
}
process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
