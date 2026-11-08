import { resolve } from 'node:path';
import { AuthoritativeGameSession } from '../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../src/server/createGameServer.js';
import { FileGameSaveStore } from '../src/storage/FileGameSaveStore.js';
import { ServerLogger } from '../src/server/ServerLogger.js';

const logger = await ServerLogger.create({
  directory: process.env.SNAKE_LOG_DIRECTORY ?? '.snake-server-logs',
});
console.info(`[game-server] Log file: ${logger.path}`);
logger.log({
  level: 'info',
  event: 'server.starting',
  fields: {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    hostAuthenticationConfigured: (process.env.SNAKE_HOST_TOKEN?.length ?? 0) >= 16,
    saveDirectory: resolve(process.env.SNAKE_SAVE_DIRECTORY ?? '.snake-server-saves'),
  },
});
process.on('uncaughtExceptionMonitor', (error, origin) =>
  logger.fatal('process.fatal', { error, origin }),
);
process.on('warning', (warning) =>
  logger.log({ level: 'warn', event: 'process.warning', fields: { error: warning } }),
);

const session = await AuthoritativeGameSession.create({
  saveStore: new FileGameSaveStore(
    resolve(process.env.SNAKE_SAVE_DIRECTORY ?? '.snake-server-saves'),
  ),
});
const server = createGameServer(session, {
  hostToken: process.env.SNAKE_HOST_TOKEN,
  onDiagnostic: logger.log,
  onPerformance:
    process.env.SNAKE_PERF_TELEMETRY === '1'
      ? (report) => console.info('[game-server] Performance', JSON.stringify(report))
      : undefined,
});
const port = await server.listen(Number(process.env.PORT ?? 8787), process.env.HOST ?? '127.0.0.1');
session.start((error) => {
  logger.log({
    level: 'error',
    event: 'simulation.stopped',
    fields: { error, ...session.getQueueDiagnostics() },
  });
  console.error('[game-server] Simulation stopped', error);
  session.stop();
});
console.info(`[game-server] Listening at ws://127.0.0.1:${port}/game`);

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  logger.log({ level: 'info', event: 'process.shutdown', fields: { signal } });
  try {
    await server.close();
  } catch (error) {
    logger.log({ level: 'error', event: 'process.shutdown-failed', fields: { error } });
    console.error('[game-server] Shutdown failed', error);
    process.exitCode = 1;
  } finally {
    await logger.close();
  }
}
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
