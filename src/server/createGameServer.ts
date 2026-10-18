import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';
import {
  GAME_PROTOCOL_VERSION,
  parseCommandMessage,
  type ServerMessage,
} from '../session/gameProtocol.js';

/** Transport only. The session owns player allocation and gameplay. */
export function createGameServer(session: AuthoritativeGameSession) {
  const http = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', protocol: GAME_PROTOCOL_VERSION }));
  });
  const sockets = new WebSocketServer({ server: http, path: '/game', maxPayload: 16384 });
  const publish = (socket: WebSocket, message: ServerMessage) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > 4 * 1024 * 1024) {
      socket.close(1013, 'Client is too slow');
      return;
    }
    socket.send(JSON.stringify(message));
  };
  sockets.on('connection', (socket, request) => {
    socket.pause();
    socket.on('error', () => socket.terminate());
    void attach().catch((error: unknown) => {
      console.error('[game-server] Connection failed', error);
      socket.close(1011, 'Cannot enter world');
    });
    async function attach() {
      const connectionId = randomUUID();
      const endpoint = new URL(request.url ?? '/game', 'http://localhost');
      const playerId = await session.attachConnection(
        connectionId,
        endpoint.searchParams.get('name') ?? 'Player',
      );
      if (socket.readyState !== WebSocket.OPEN) {
        await session.detachConnection(connectionId);
        return;
      }
      const snapshot = session.getSnapshot(playerId);
      publish(socket, {
        type: 'welcome',
        version: GAME_PROTOCOL_VERSION,
        connectionId,
        playerId,
        snapshot,
      });
      const snapshotSubscription = session.onSnapshot(
        (snapshot) => publish(socket, { type: 'snapshot', snapshot }),
        playerId,
      );
      const eventSubscription = session.onEvent((event) =>
        publish(socket, { type: 'event', event }),
      );
      session.refreshSnapshot();
      socket.once('close', () => {
        snapshotSubscription();
        eventSubscription();
        void session.detachConnection(connectionId);
      });
      socket.on('message', (data, binary) => {
        const message = binary ? null : parseCommandMessage(data.toString());
        if (!message) {
          socket.close(1008, 'Invalid command');
          return;
        }
        // A wire payload cannot impersonate another runtime player.
        void session.executeCommand({ ...message.command, playerId }).then(
          (result) => publish(socket, { type: 'result', id: message.id, result }),
          (error: unknown) => {
            console.error('[game-server] Command failed', error);
            publish(socket, {
              type: 'result',
              id: message.id,
              result: { ok: false, reason: 'command-failed' },
            });
          },
        );
      });
      socket.resume();
    }
  });

  return {
    http,
    async listen(port = 8787, host = '127.0.0.1'): Promise<number> {
      await new Promise<void>((resolve, reject) => {
        http.once('error', reject);
        http.listen(port, host, () => {
          http.off('error', reject);
          resolve();
        });
      });
      const address = http.address();
      if (!address || typeof address === 'string') throw new Error('Missing game server address');
      return address.port;
    },
    async close(): Promise<void> {
      session.stop();
      await session.flush();
      for (const socket of sockets.clients) socket.terminate();
      await new Promise<void>((resolve) => sockets.close(() => resolve()));
      await new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
