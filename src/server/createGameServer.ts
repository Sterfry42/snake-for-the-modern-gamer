import { createServer } from 'node:http';
import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';
import {
  GAME_PROTOCOL_VERSION,
  parseCommandMessage,
  type ServerMessage,
} from '../session/gameProtocol.js';
import { SnapshotDeltaEncoder } from '../session/SnapshotDelta.js';
import type { ServerPerformanceReport } from '../session/ServerPerformance.js';
import { defaultAllowedOrigins, isAllowedGameOrigin } from './originPolicy.js';

export interface GameServerOptions {
  hostToken?: string;
  onPerformance?: (report: ServerPerformanceReport) => void;
  /**
   * Browser origins allowed to open game sockets. Defaults to the built-in
   * list (local development plus SNAKE_ALLOWED_ORIGINS) when omitted.
   */
  allowedOrigins?: readonly string[];
}

/** Transport only. The session owns player allocation and gameplay. */
export function createGameServer(
  session: AuthoritativeGameSession,
  options: GameServerOptions = {},
) {
  session.configureHosting();
  const channels = new Map<
    string,
    { socket: WebSocket; encoder: SnapshotDeltaEncoder; pending: ServerMessage[] }
  >();
  const identities = new Map<string, string>();
  const active = new Map<string, { socket: WebSocket; connectionId: string }>();
  let initialCharacterClaimed = Object.keys(session.getSnapshot().connections ?? {}).length > 0;
  let attachments: Promise<void> = Promise.resolve();
  const http = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', protocol: GAME_PROTOCOL_VERSION }));
  });
  const allowedOrigins = options.allowedOrigins ?? defaultAllowedOrigins();
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 16384 });
  http.on('upgrade', (request, socket, head) => {
    const path = new URL(request.url ?? '', 'http://localhost').pathname;
    if (path !== '/game') {
      socket.destroy();
      return;
    }
    if (!isAllowedGameOrigin(request.headers.origin, allowedOrigins)) {
      // Reject before the WebSocket handshake completes.
      socket.write('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, (ws) => {
      sockets.emit('connection', ws, request);
    });
  });
  const publish = (socket: WebSocket, message: ServerMessage) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > 4 * 1024 * 1024) {
      socket.close(1013, 'Client is too slow');
      return;
    }
    const startedAt = performance.now();
    const serialized = JSON.stringify(message);
    if (message.type === 'welcome' || message.type === 'delta')
      session.performance.payload(Buffer.byteLength(serialized), performance.now() - startedAt);
    socket.send(serialized);
  };
  sockets.on('connection', (socket, request) => {
    socket.pause();
    socket.on('error', () => socket.terminate());
    attachments = attachments.then(attach).catch((error: unknown) => {
      console.error('[game-server] Connection failed', error);
      socket.close(1011, 'Cannot enter world');
    });
    async function attach() {
      const connectionId = randomUUID();
      const endpoint = new URL(request.url ?? '/game', 'http://localhost');
      const requestedToken = endpoint.searchParams.get('resume') ?? '';
      let playerId = identities.get(requestedToken);
      const resumeToken = playerId ? requestedToken : randomBytes(32).toString('hex');
      if (!playerId) {
        // The saved world character may be claimed once; it never grants privileges.
        playerId = initialCharacterClaimed
          ? `player-${randomUUID()}`
          : session.getSnapshot().localPlayerId;
        initialCharacterClaimed = true;
        identities.set(resumeToken, playerId);
      }
      const suppliedHostToken = Buffer.from(endpoint.searchParams.get('hostToken') ?? '');
      const configuredHostToken = Buffer.from(options.hostToken ?? '');
      const admin =
        configuredHostToken.length >= 16 &&
        suppliedHostToken.length === configuredHostToken.length &&
        timingSafeEqual(suppliedHostToken, configuredHostToken);
      const previous = active.get(playerId);
      if (previous) {
        await session.detachConnection(previous.connectionId);
        previous.socket.close(4001, 'Resumed in another window');
      }
      active.set(playerId, { socket, connectionId });
      await session.attachConnection(connectionId, endpoint.searchParams.get('name') ?? 'Player', {
        playerId,
        admin,
      });
      if (socket.readyState !== WebSocket.OPEN) {
        await session.detachConnection(connectionId);
        return;
      }
      const snapshot = await session.getConnectionSnapshot(playerId);
      const channel = {
        socket,
        encoder: new SnapshotDeltaEncoder(),
        pending: new Array<ServerMessage>(),
      };
      channel.encoder.encode(snapshot);
      channels.set(connectionId, channel);
      publish(socket, {
        type: 'welcome',
        version: GAME_PROTOCOL_VERSION,
        connectionId,
        playerId,
        resumeToken,
        snapshot,
      });
      const eventSubscription = session.onEvent((event) => {
        if ('playerId' in event && event.playerId !== playerId) return;
        channel.pending.push({ type: 'event', event });
      });
      socket.once('close', () => {
        channels.delete(connectionId);
        eventSubscription();
        if (active.get(playerId)?.connectionId === connectionId) active.delete(playerId);
        void session.detachConnection(connectionId);
      });
      socket.on('message', (data, binary) => {
        if (active.get(playerId)?.connectionId !== connectionId) return;
        const message = binary ? null : parseCommandMessage(data.toString());
        if (!message) {
          socket.close(1008, 'Invalid command');
          return;
        }
        // A wire payload cannot impersonate another runtime player.
        void session.executeCommand({ ...message.command, playerId }).then(
          (result) => channel.pending.push({ type: 'result', id: message.id, result }),
          (error: unknown) => {
            console.error('[game-server] Command failed', error);
            channel.pending.push({
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

  let publishing = false;
  const networkTimer = setInterval(() => {
    if (publishing) return;
    publishing = true;
    void session
      .publishNetworkState((playerId, snapshot) => {
        const connection = active.get(playerId);
        const channel = connection && channels.get(connection.connectionId);
        if (channel)
          publish(channel.socket, { type: 'delta', delta: channel.encoder.encode(snapshot) });
      })
      .then(() => {
        for (const channel of channels.values())
          for (const message of channel.pending.splice(0)) publish(channel.socket, message);
      })
      .catch((error: unknown) => console.error('[game-server] Publication failed', error))
      .finally(() => {
        publishing = false;
      });
  }, 100);
  networkTimer.unref();
  const performanceTimer = options.onPerformance
    ? setInterval(() => options.onPerformance?.(session.getPerformanceReport(true)), 10000)
    : undefined;
  performanceTimer?.unref();

  const alive = new Set<WebSocket>();
  sockets.on('connection', (socket) => {
    alive.add(socket);
    socket.on('pong', () => alive.add(socket));
    socket.on('close', () => alive.delete(socket));
  });
  const heartbeat = setInterval(() => {
    for (const socket of sockets.clients) {
      if (!alive.delete(socket)) socket.terminate();
      else socket.ping();
    }
  }, 15000);
  heartbeat.unref();

  return {
    http,
    getPerformance: () => session.getPerformanceReport(),
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
      clearInterval(heartbeat);
      clearInterval(networkTimer);
      clearInterval(performanceTimer);
      await attachments;
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
