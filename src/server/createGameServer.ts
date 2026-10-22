import { parseClientDiagnostic } from '../session/ClientDiagnostic.js';
import type { DiagnosticSink, SessionDiagnostic } from '../session/SessionDiagnostic.js';
import { ProcessPerformance } from './ProcessPerformance.js';
import { createServer } from 'node:http';
import { randomUUID, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { SpawnAreaUnavailable } from '../players/safePlayerSpawn.js';
import { WebSocketServer, WebSocket } from 'ws';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';
import {
  GAME_PROTOCOL_VERSION,
  parseCommandMessage,
  type ServerMessage,
} from '../session/gameProtocol.js';
import { SnapshotDeltaEncoder } from '../session/SnapshotDelta.js';
import { MOVEMENT_GRACE_MS, parseMovementHello } from '../session/MovementResume.js';
import type { ServerPerformanceReport } from '../session/ServerPerformance.js';
import { defaultAllowedOrigins, isAllowedGameOrigin } from './originPolicy.js';

export interface GameServerOptions {
  hostToken?: string;
  onDiagnostic?: DiagnosticSink;
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
    {
      socket: WebSocket;
      encoder: SnapshotDeltaEncoder;
      pending: Array<{
        message: ServerMessage;
        command?: { type: string; receivedAt: number; requestId: number };
      }>;
    }
  >();
  const socketDetails = new WeakMap<
    WebSocket,
    {
      connectionId: string;
      playerId?: string;
      roomId?: string;
      openedAt: number;
      lastReceivedAt: number;
      lastPongAt: number;
      pingAt?: number;
      rttMs?: number;
      closeCause?: string;
      sentBytes: number;
      maximumBufferedBytes: number;
      commands: number;
      rejected: number;
      errors: number;
      maximumCommandMs: number;
      maximumAckMs: number;
      lastCommandWarningAt: number;
    }
  >();
  let diagnosticFailed = false;
  const log = (
    level: SessionDiagnostic['level'],
    event: string,
    fields: Record<string, unknown> = {},
  ) => {
    try {
      options.onDiagnostic?.({ level, event, fields });
    } catch (error) {
      if (!diagnosticFailed) console.error('[game-server] Diagnostic sink failed', error);
      diagnosticFailed = true;
    }
  };
  const unsubscribeDiagnostics = session.onDiagnostic((diagnostic) =>
    log(diagnostic.level, diagnostic.event, diagnostic.fields),
  );
  const processPerformance = options.onDiagnostic ? new ProcessPerformance() : undefined;
  let pendingAttachments = 0;
  let skippedNetworkTicks = 0;
  let maximumPublicationMs = 0;
  let lastPublicationAt = performance.now();
  const closeSocket = (socket: WebSocket, code: number, cause: string, reason: string) => {
    const details = socketDetails.get(socket);
    if (details) details.closeCause = cause;
    log(code === 4001 || code === 1000 ? 'info' : 'warn', 'connection.closing', {
      connectionId: details?.connectionId,
      playerId: details?.playerId,
      roomId: details?.roomId,
      code,
      cause,
      bufferedBytes: socket.bufferedAmount,
    });
    socket.close(code, reason);
  };
  const active = new Map<string, { socket: WebSocket; connectionId: string }>();
  const suspensionTimers = new Set<ReturnType<typeof setTimeout>>();
  let closing = false;
  let initialCharacterClaimed =
    session.hasClaimedPrimaryCharacter() ||
    Object.keys(session.getSnapshot().connections ?? {}).length > 0;
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
      log('warn', 'upgrade.rejected', { reason: 'wrong-path' });
      socket.destroy();
      return;
    }
    if (!isAllowedGameOrigin(request.headers.origin, allowedOrigins)) {
      log('warn', 'upgrade.rejected', { reason: 'origin-not-allowed' });
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
      closeSocket(socket, 1013, 'outbound-backpressure', 'Client is too slow');
      return;
    }
    const startedAt = performance.now();
    const serialized = JSON.stringify(message);
    if (message.type === 'welcome' || message.type === 'delta')
      session.performance.payload(Buffer.byteLength(serialized), performance.now() - startedAt);
    else if (message.type === 'movement')
      session.performance.movement(Buffer.byteLength(serialized), performance.now() - startedAt);
    const details = socketDetails.get(socket);
    if (details) {
      details.sentBytes += Buffer.byteLength(serialized);
      details.maximumBufferedBytes = Math.max(details.maximumBufferedBytes, socket.bufferedAmount);
    }
    socket.send(serialized, (error) => {
      if (!error) return;
      log('error', 'socket.send-failed', {
        connectionId: details?.connectionId,
        playerId: details?.playerId,
        error,
      });
    });
  };
  const movementSubscription = session.onMovement((update) => {
    const publicPlayer = { ...update.player };
    delete publicPlayer.movementGrid;
    delete publicPlayer.movementPredictionAllowed;
    delete publicPlayer.acknowledgedDirectionSequence;
    delete publicPlayer.directionQueue;
    const publicUpdate = { ...update, player: publicPlayer };
    for (const [id, channel] of channels) {
      if (channel.socket.readyState !== WebSocket.OPEN) continue;
      if (socketDetails.get(channel.socket)?.playerId === update.player.id)
        session.recordPublishedMovement(id, update);
      publish(channel.socket, {
        type: 'movement',
        update:
          socketDetails.get(channel.socket)?.playerId === update.player.id ? update : publicUpdate,
      });
      const details = socketDetails.get(channel.socket)!;
      if (details.playerId === update.player.id && details.roomId !== update.player.roomId) {
        details.roomId = update.player.roomId;
        void session
          .getConnectionSnapshot(update.player.id)
          .then((snapshot) => {
            publish(channel.socket, {
              type: 'delta',
              delta: channel.encoder.encode(snapshot, true),
            });
            flushEvents(channel);
          })
          .catch((error: unknown) =>
            log('error', 'network.room-transition-failed', { connectionId: id, error }),
          );
      }
    }
  });
  const flushEvents = (channel: {
    socket: WebSocket;
    pending: Array<{ message: ServerMessage }>;
  }) => {
    for (const entry of channel.pending.splice(0)) publish(channel.socket, entry.message);
  };
  const acknowledge = (
    socket: WebSocket,
    command: { receivedAt: number; requestId: number; type: string },
    result: import('../session/ClientCommand.js').CommandResult,
  ) => {
    const state = socketDetails.get(socket)!;
    const ackMs = performance.now() - command.receivedAt;
    state.maximumAckMs = Math.max(state.maximumAckMs, ackMs);
    if (ackMs > 500)
      log('warn', 'command.slow-ack', {
        connectionId: state.connectionId,
        playerId: state.playerId,
        commandType: command.type,
        requestId: command.requestId,
        ackMs,
      });
    publish(socket, { type: 'result', id: command.requestId, result });
  };
  sockets.on('connection', (socket, request) => {
    const connectionId = randomUUID();
    const openedAt = performance.now();
    const details = {
      connectionId,
      openedAt,
      lastReceivedAt: openedAt,
      lastPongAt: openedAt,
      sentBytes: 0,
      maximumBufferedBytes: 0,
      commands: 0,
      rejected: 0,
      errors: 0,
      maximumCommandMs: 0,
      maximumAckMs: 0,
      lastCommandWarningAt: -Infinity,
    };
    socketDetails.set(socket, details);
    pendingAttachments++;
    log('info', 'connection.opened', { connectionId, pendingAttachments });
    socket.once('close', (code, reason) => {
      const state = socketDetails.get(socket)!;
      log(
        code === 1000 || code === 1001 || code === 4001 || code === 4002 || closing
          ? 'info'
          : 'warn',
        'connection.closed',
        {
          connectionId,
          playerId: state.playerId,
          roomId: state.roomId,
          code,
          cause:
            state.closeCause ??
            (code === 4002
              ? 'browser-page-lifecycle'
              : code === 1001
                ? 'browser-going-away'
                : code === 1006
                  ? 'abnormal-transport-close'
                  : 'peer-close'),
          peerReasonBytes: reason.length,
          lifetimeMs: performance.now() - openedAt,
          sinceLastMessageMs: performance.now() - state.lastReceivedAt,
          sinceLastPongMs: performance.now() - state.lastPongAt,
          rttMs: state.rttMs,
          bufferedBytes: socket.bufferedAmount,
          maximumBufferedBytes: state.maximumBufferedBytes,
          commands: state.commands,
          sentBytes: state.sentBytes,
        },
      );
    });
    socket.pause();
    socket.on('error', (error) => {
      const state = socketDetails.get(socket)!;
      state.closeCause = 'socket-error';
      log('error', 'socket.error', { connectionId, playerId: state.playerId, error });
      socket.terminate();
    });
    attachments = attachments
      .then(attach)
      .catch((error: unknown) => {
        log('error', 'connection.attach-failed', { connectionId, error });
        console.error('[game-server] Connection failed', error);
        closeSocket(
          socket,
          1011,
          'attach-failed',
          error instanceof SpawnAreaUnavailable ? error.message : 'Cannot enter world',
        );
      })
      .finally(() => {
        pendingAttachments--;
      });
    async function attach() {
      log('info', 'connection.attach-started', {
        connectionId,
        attachmentQueueWaitMs: performance.now() - openedAt,
      });
      const endpoint = new URL(request.url ?? '/game', 'http://localhost');
      const requestedToken = endpoint.searchParams.get('resume') ?? '';
      // Prediction clients send a bounded input-only hello before receiving a welcome.
      // Older/raw clients can still reconnect without requesting catch-up.
      let helloTimedOut = false;
      const hello =
        endpoint.searchParams.get('prediction') === '1'
          ? await new Promise<ReturnType<typeof parseMovementHello>>((resolve) => {
              const finish = (value: ReturnType<typeof parseMovementHello>) => {
                clearTimeout(timer);
                socket.off('message', receive);
                socket.off('close', closed);
                socket.pause();
                resolve(value);
              };
              const receive = (data: import('ws').RawData, binary: boolean) =>
                finish(binary ? null : parseMovementHello(data.toString()));
              const closed = () => finish(null);
              const timer = setTimeout(() => {
                helloTimedOut = true;
                finish(null);
              }, 1000);
              socket.once('message', receive);
              socket.once('close', closed);
              socket.resume();
            })
          : {};
      if (!hello || socket.readyState !== WebSocket.OPEN) {
        socket.resume();
        closeSocket(
          socket,
          helloTimedOut ? 1013 : 1008,
          helloTimedOut ? 'resume-hello-timeout' : 'invalid-resume-hello',
          helloTimedOut ? 'Resume handshake timed out' : 'Invalid movement resume',
        );
        return;
      }
      const digest = (token: string) => createHash('sha256').update(token).digest('hex');
      let playerId = requestedToken
        ? session.resolveResumeDigest(digest(requestedToken))
        : undefined;
      const knownIdentity = Boolean(playerId);
      const resumeToken = playerId ? requestedToken : randomBytes(32).toString('hex');
      if (!playerId) {
        // The saved world character may be claimed once; it never grants privileges.
        playerId = initialCharacterClaimed
          ? `player-${randomUUID()}`
          : session.getSnapshot().localPlayerId;
        initialCharacterClaimed = true;
      }
      const suppliedHostToken = Buffer.from(endpoint.searchParams.get('hostToken') ?? '');
      const configuredHostToken = Buffer.from(options.hostToken ?? '');
      const admin =
        configuredHostToken.length >= 16 &&
        suppliedHostToken.length === configuredHostToken.length &&
        timingSafeEqual(suppliedHostToken, configuredHostToken);
      const previous = active.get(playerId);
      if (previous) {
        await session.suspendConnection(previous.connectionId);
        closeSocket(previous.socket, 4001, 'superseded', 'Resumed in another window');
      }
      socketDetails.get(socket)!.playerId = playerId;
      active.set(playerId, { socket, connectionId });
      const channel = {
        socket,
        encoder: new SnapshotDeltaEncoder(),
        pending: new Array<{
          message: ServerMessage;
          command?: { type: string; receivedAt: number; requestId: number };
        }>(),
      };
      const eventSubscription = session.onEvent((event) => {
        if ('playerId' in event && event.playerId !== playerId) return;
        channel.pending.push({ message: { type: 'event', event } });
      });
      socket.once('close', (code) => {
        channels.delete(connectionId);
        eventSubscription();
        if (active.get(playerId)?.connectionId === connectionId) active.delete(playerId);
        if (closing || code === 1000) {
          void session.detachConnection(
            connectionId,
            closing ? 'server-shutdown' : 'intentional-leave',
          );
        } else {
          void session.suspendConnection(connectionId);
          const timer = setTimeout(() => {
            suspensionTimers.delete(timer);
            void session.detachConnection(connectionId, 'grace-expired');
          }, MOVEMENT_GRACE_MS);
          suspensionTimers.add(timer);
          timer.unref();
        }
      });
      await session.attachConnection(
        connectionId,
        endpoint.searchParams.get('name') ?? 'Player',
        {
          playerId,
          admin,
          resumeDigest: digest(resumeToken),
        },
        hello.replay,
      );
      if (socket.readyState !== WebSocket.OPEN) {
        eventSubscription();
        await session.detachConnection(connectionId);
        return;
      }
      const snapshot = await session.getConnectionSnapshot(playerId);
      if (socket.readyState !== WebSocket.OPEN) return;
      socketDetails.get(socket)!.roomId = snapshot.viewport.centerRoomId;
      log('info', 'connection.ready', {
        connectionId,
        playerId,
        roomId: snapshot.viewport.centerRoomId,
        knownIdentity,
        resumeRequested: Boolean(requestedToken),
        replayRequested: Boolean(hello.replay),
        attachMs: performance.now() - openedAt,
        admin,
      });
      channel.encoder.encode(snapshot, true);
      channels.set(connectionId, channel);
      session.recordPublishedMovement(connectionId, snapshot);
      publish(socket, {
        type: 'welcome',
        diagnostics: Boolean(options.onDiagnostic),
        version: GAME_PROTOCOL_VERSION,
        connectionId,
        playerId,
        resumeToken,
        snapshot,
      });
      let diagnosticWindowAt = performance.now();
      let clientReports = 0;
      socket.on('message', (data, binary) => {
        if (active.get(playerId)?.connectionId !== connectionId) return;
        const receivedAt = performance.now();
        const state = socketDetails.get(socket)!;
        state.lastReceivedAt = receivedAt;
        const raw = binary ? '' : data.toString();
        const message = binary ? null : parseCommandMessage(raw);
        if (!message) {
          const diagnostic = binary ? null : parseClientDiagnostic(raw);
          if (diagnostic) {
            if (receivedAt - diagnosticWindowAt >= 10000) {
              diagnosticWindowAt = receivedAt;
              clientReports = 0;
            }
            if (clientReports++ < 5)
              log(
                diagnostic.event === 'browser-lifecycle' ? 'info' : 'warn',
                `client.${diagnostic.event}`,
                {
                  ...diagnostic,
                  source: 'client',
                  connectionId,
                  playerId,
                  roomId: state.roomId,
                },
              );
            return;
          }
          closeSocket(socket, 1008, 'invalid-command', 'Invalid command');
          return;
        }
        state.commands++;
        const command = { type: message.command.type, receivedAt, requestId: message.id };
        // A wire payload cannot impersonate another runtime player.
        void session
          .executeCommand({ ...message.command, playerId })
          .then(
            async (result) => {
              state.maximumCommandMs = Math.max(
                state.maximumCommandMs,
                performance.now() - receivedAt,
              );
              if (!result.ok) state.rejected++;
              if (
                !result.ok &&
                result.reason !== 'shot-unavailable' &&
                message.command.type !== 'setDirection' &&
                receivedAt - state.lastCommandWarningAt > 1000
              ) {
                state.lastCommandWarningAt = receivedAt;
                log('warn', 'command.rejected', {
                  connectionId,
                  playerId,
                  commandType: command.type,
                  requestId: command.requestId,
                  reason: result.reason ?? result.message ?? 'action-unavailable',
                });
              }
              // Steering already published its bounded movement/queue state on the
              // authority queue. Domain commands publish their changed UI before ack.
              if (!['setDirection', 'forceDirection'].includes(command.type)) {
                const current = await session.getConnectionSnapshot(playerId);
                publish(socket, { type: 'delta', delta: channel.encoder.encode(current, true) });
                flushEvents(channel);
              }
              acknowledge(socket, command, result);
            },
            (error: unknown) => {
              state.errors++;
              log('error', 'command.failed', {
                connectionId,
                playerId,
                commandType: command.type,
                requestId: command.requestId,
                error,
              });
              console.error('[game-server] Command failed', error);
              acknowledge(socket, command, { ok: false, reason: 'command-failed' });
            },
          )
          .catch((error: unknown) => {
            log('error', 'command.publication-failed', {
              connectionId,
              playerId,
              requestId: command.requestId,
              error,
            });
            acknowledge(socket, command, {
              ok: false,
              reason: 'State publication unavailable; check state before repeating the action.',
            });
          });
      });
      socket.resume();
    }
  });

  let publishing = false;
  const networkTimer = setInterval(() => {
    if (publishing) {
      skippedNetworkTicks++;
      return;
    }
    const startedAt = performance.now();
    publishing = true;
    void session
      .publishNetworkState((playerId, snapshot) => {
        const connection = active.get(playerId);
        const channel = connection && channels.get(connection.connectionId);
        if (channel) {
          if (channel.socket.readyState === WebSocket.OPEN)
            session.recordPublishedMovement(connection!.connectionId, snapshot);
          socketDetails.get(channel.socket)!.roomId = snapshot.viewport.centerRoomId;
          publish(channel.socket, { type: 'delta', delta: channel.encoder.encode(snapshot, true) });
        }
      })
      .then(() => {
        for (const channel of channels.values()) flushEvents(channel);
      })
      .catch((error: unknown) => {
        log('error', 'network.publication-failed', { error });
        console.error('[game-server] Publication failed', error);
      })
      .finally(() => {
        maximumPublicationMs = Math.max(maximumPublicationMs, performance.now() - startedAt);
        lastPublicationAt = performance.now();
        publishing = false;
      });
  }, 100);
  networkTimer.unref();
  const performanceTimer =
    options.onPerformance || options.onDiagnostic
      ? setInterval(() => {
          const report = session.getPerformanceReport(true);
          options.onPerformance?.(report);
          const processReport = processPerformance?.read();
          const connections = [...channels.values()].slice(0, 16).map((channel) => {
            const state = socketDetails.get(channel.socket)!;
            return {
              connectionId: state.connectionId,
              playerId: state.playerId,
              roomId: state.roomId,
              bufferedBytes: channel.socket.bufferedAmount,
              maximumBufferedBytes: state.maximumBufferedBytes,
              pendingMessages: channel.pending.length,
              rttMs: state.rttMs,
              commands: state.commands,
              rejectedCommands: state.rejected,
              commandErrors: state.errors,
              maximumCommandMs: state.maximumCommandMs,
              maximumAckMs: state.maximumAckMs,
              sinceLastPongMs: performance.now() - state.lastPongAt,
            };
          });
          log(
            (processReport?.eventLoopMaxMs ?? 0) > 250 || report.maximumUpdateMs > 100
              ? 'warn'
              : 'info',
            'performance.sample',
            {
              ...report,
              ...processReport,
              sockets: sockets.clients.size,
              attachedSockets: channels.size,
              pendingAttachments,
              skippedNetworkTicks,
              maximumPublicationMs,
              sinceLastNetworkCycleMs: performance.now() - lastPublicationAt,
              connections,
              connectionsTruncated: channels.size > connections.length,
            },
          );
          skippedNetworkTicks = 0;
          maximumPublicationMs = 0;
        }, 10000)
      : undefined;
  performanceTimer?.unref();

  let autosaving: Promise<void> | undefined;
  const autosaveTimer = setInterval(() => {
    if (closing || autosaving) return;
    const startedAt = performance.now();
    autosaving = session
      .autosave()
      .then((saved) => {
        if (saved)
          log('info', 'checkpoint.autosaved', { durationMs: performance.now() - startedAt });
      })
      .catch((error: unknown) => {
        log('error', 'checkpoint.autosave-failed', { error });
      })
      .finally(() => {
        autosaving = undefined;
      });
  }, 30000);
  autosaveTimer.unref();

  const alive = new Set<WebSocket>();
  sockets.on('connection', (socket) => {
    alive.add(socket);
    socket.on('pong', () => {
      alive.add(socket);
      const state = socketDetails.get(socket)!;
      state.lastPongAt = performance.now();
      if (state.pingAt !== undefined) state.rttMs = performance.now() - state.pingAt;
    });
    socket.on('close', () => alive.delete(socket));
  });
  const heartbeat = setInterval(() => {
    for (const socket of sockets.clients) {
      const state = socketDetails.get(socket)!;
      if (!alive.delete(socket)) {
        state.closeCause = 'heartbeat-timeout';
        log('warn', 'connection.heartbeat-timeout', {
          connectionId: state.connectionId,
          playerId: state.playerId,
          roomId: state.roomId,
          sinceLastPongMs: performance.now() - state.lastPongAt,
          sinceLastMessageMs: performance.now() - state.lastReceivedAt,
          bufferedBytes: socket.bufferedAmount,
          sinceLastNetworkCycleMs: performance.now() - lastPublicationAt,
        });
        socket.terminate();
      } else {
        state.pingAt = performance.now();
        socket.ping();
      }
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
      log('info', 'server.listening', {
        host,
        port: address.port,
        protocol: GAME_PROTOCOL_VERSION,
      });
      return address.port;
    },
    async close(): Promise<void> {
      closing = true;
      log('info', 'server.stopping', { sockets: sockets.clients.size });
      for (const timer of suspensionTimers) clearTimeout(timer);
      suspensionTimers.clear();
      clearInterval(heartbeat);
      clearInterval(networkTimer);
      movementSubscription();
      clearInterval(performanceTimer);
      clearInterval(autosaveTimer);
      processPerformance?.close();
      await attachments;
      session.stop();
      await session.flush();
      await autosaving;
      for (const socket of sockets.clients) {
        const details = socketDetails.get(socket);
        if (details) details.closeCause = 'server-shutdown';
        socket.terminate();
      }
      await new Promise<void>((resolve) => sockets.close(() => resolve()));
      await new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      );
      unsubscribeDiagnostics();
      log('info', 'server.stopped');
    },
  };
}
