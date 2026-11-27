import { parseClientDiagnostic } from '../session/ClientDiagnostic.js';
import { isRecord } from '../core/saveNormalize.js';
import type { DiagnosticSink, SessionDiagnostic } from '../session/SessionDiagnostic.js';
import { ProcessPerformance } from './ProcessPerformance.js';
import { createServer } from 'node:http';
import { randomUUID, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { SpawnAreaUnavailable } from '../players/safePlayerSpawn.js';
import { WebSocketServer, WebSocket } from 'ws';
import type { GameServerSession } from './GameServerSession.js';
import {
  GAME_PROTOCOL_VERSION,
  readCommandMessage,
  type ServerMessage,
} from '../session/gameProtocol.js';
import type { NetworkPublication } from '../session/NetworkPublication.js';
import {
  isImmediateGameEvent,
  type GameEvent,
  type GameEventTiming,
} from '../session/GameEvent.js';
import {
  markMultiplayer,
  MultiplayerProfiler,
  multiplayerCommandType,
  multiplayerNow,
  multiplayerProfilingEnabled,
  multiplayerThresholds,
  type MultiplayerCommandTrace,
} from '../session/MultiplayerProfiler.js';
import { CONNECTION_RECOVERY_MS, parseMovementHello } from '../session/MovementResume.js';
import type { ServerPerformanceReport } from '../session/ServerPerformance.js';
import { defaultAllowedOrigins, isAllowedGameOrigin } from './originPolicy.js';

export interface GameServerOptions {
  hostToken?: string;
  onDiagnostic?: DiagnosticSink;
  profileMultiplayer?: boolean;
  onPerformance?: (report: ServerPerformanceReport) => void;
  /**
   * Browser origins allowed to open game sockets. Defaults to the built-in
   * list (local development plus SNAKE_ALLOWED_ORIGINS) when omitted.
   */
  allowedOrigins?: readonly string[];
}

/** Transport only. The session owns player allocation and gameplay. */
export function createGameServer(session: GameServerSession, options: GameServerOptions = {}) {
  session.configureHosting();
  const profiler = new MultiplayerProfiler(
    options.profileMultiplayer ?? multiplayerProfilingEnabled(),
  );
  type Channel = {
    socket: WebSocket;
    pending: Array<{ event: GameEvent; sequence: number; trace?: MultiplayerCommandTrace }>;
    transition?: Promise<void>;
    recordedMovement?: { epoch?: number; revision: number; at: number };
  };
  const channels = new Map<string, Channel>();
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
      lastRequestId: number;
      lastSlowAckAt: number;
      maximumBufferedBytes: number;
      commands: number;
      rejected: number;
      errors: number;
      maximumCommandMs: number;
      maximumAckMs: number;
      lastCommandWarningAt: number;
      lastMovementAttempt?: { type: string; requestId: number; at: number };
      lastMovementCommand?: { type: string; accepted: boolean; requestId: number };
      lastMovementRejection?: { reason: string; requestId: number };
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
  let lastSlowPublicationAt = -Infinity;
  let lastSlowEncodingAt = -Infinity;
  let maximumImmediateEventMs = 0;
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
  const suspensionTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
  const serialize = (message: ServerMessage) => {
    const text = JSON.stringify(message);
    return { text, bytes: Buffer.byteLength(text) };
  };
  const publishPayload = (
    socket: WebSocket,
    type: ServerMessage['type'],
    { text, bytes }: ReturnType<typeof serialize>,
    serializeMs: number,
  ) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > 4 * 1024 * 1024) {
      closeSocket(socket, 1013, 'outbound-backpressure', 'Client is too slow');
      return;
    }
    profiler.record('wire/' + type + '/bytes', bytes);
    profiler.record('wire/' + type + '/serialization', serializeMs);
    if (type === 'welcome' || type === 'delta') session.performance.payload(bytes, serializeMs);
    else if (type === 'movement') session.performance.movement(bytes, serializeMs);
    const details = socketDetails.get(socket);
    if (details) {
      details.sentBytes += bytes;
      details.maximumBufferedBytes = Math.max(details.maximumBufferedBytes, socket.bufferedAmount);
    }
    socket.send(text, (error) => {
      if (!error || (details?.closeCause && 'code' in error && error.code === 'ECANCELED')) return;
      log('error', 'socket.send-failed', {
        connectionId: details?.connectionId,
        playerId: details?.playerId,
        error,
      });
    });
  };
  const publish = (
    socket: WebSocket,
    message: ServerMessage,
    prepared?: ReturnType<typeof serialize>,
  ) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const startedAt = performance.now();
    const payload = prepared ?? serialize(message);
    publishPayload(socket, message.type, payload, prepared ? 0 : performance.now() - startedAt);
  };
  const eventTrace = (
    connectionId: string,
    event: GameEvent,
    sequence: number,
    timing?: GameEventTiming,
  ) => {
    const trace = profiler.begin(connectionId + ':event:' + sequence, 'event/' + event.type);
    if (trace) {
      trace.times['event-generated'] = timing?.generatedAt;
      trace.parentId = timing?.correlationId;
      markMultiplayer(trace, 'network-received');
    }
    return trace;
  };
  const publishEvent = (
    socket: WebSocket,
    event: GameEvent,
    sequence: number,
    trace?: MultiplayerCommandTrace,
  ) => {
    markMultiplayer(trace, 'network-send');
    publish(socket, { type: 'event', event, sequence });
    profiler.finish(trace);
  };
  const recordMovement = (
    channel: Channel,
    connectionId: string,
    playerId: string,
    revision?: number,
    epoch?: number,
  ) => {
    if (revision === undefined) return;
    const at = performance.now();
    const previous = channel.recordedMovement;
    if (
      previous &&
      previous.epoch === epoch &&
      (revision < previous.revision || (revision === previous.revision && at - previous.at < 1000))
    )
      return;
    channel.recordedMovement = { epoch, revision, at };
    session.recordPublishedMovementRevision(connectionId, playerId, revision);
  };
  const deliverPublication = (publication: NetworkPublication) => {
    const { connectionId, playerId, roomId, encoded } = publication;
    const channel = channels.get(connectionId);
    if (!channel || channel.socket.readyState !== WebSocket.OPEN) return;
    const details = socketDetails.get(channel.socket)!;
    if (details.roomId !== roomId)
      log('info', 'room.transition-published', {
        connectionId,
        playerId,
        fromRoomId: details.roomId,
        roomId,
        movementRevision: publication.movementRevision,
      });
    details.roomId = roomId;
    if (encoded) {
      profiler.record('publication/delta-encode', encoded.encodeMs);
      if (encoded.categoryBytes)
        for (const [category, bytes] of Object.entries(encoded.categoryBytes))
          profiler.record('publication/bytes/' + category, bytes);
      if (
        encoded.encodeMs >= multiplayerThresholds.encoding &&
        performance.now() - lastSlowEncodingAt >= 1000
      ) {
        lastSlowEncodingAt = performance.now();
        log('info', 'network.delta-encode-slow', { playerId, roomId, encodeMs: encoded.encodeMs });
      }
      publishPayload(
        channel.socket,
        'delta',
        { text: encoded.text, bytes: Buffer.byteLength(encoded.text) },
        encoded.serializationMs,
      );
      recordMovement(
        channel,
        connectionId,
        playerId,
        publication.movementRevision,
        publication.epoch,
      );
    }
    // Only events already generated by the authority when it took this
    // projection may run against it. Later events wait for their own projection.
    const next = channel.pending.findIndex(({ sequence }) => sequence > publication.eventSequence);
    for (const { event, sequence, trace } of channel.pending.splice(
      0,
      next === -1 ? channel.pending.length : next,
    ))
      publishEvent(channel.socket, event, sequence, trace);
  };
  const movementSubscription = session.onMovement((update) => {
    const publicPlayer = { ...update.player };
    delete publicPlayer.movementGrid;
    delete publicPlayer.movementPredictionAllowed;
    delete publicPlayer.acknowledgedDirectionSequence;
    delete publicPlayer.directionQueue;
    const publicMessage: ServerMessage = {
      type: 'movement',
      update: { ...update, player: publicPlayer },
    };
    let publicPayload: ReturnType<typeof serialize> | undefined;
    for (const [id, channel] of channels) {
      if (channel.socket.readyState !== WebSocket.OPEN) continue;
      const details = socketDetails.get(channel.socket)!;
      if (details.playerId === update.player.id) {
        recordMovement(channel, id, update.player.id, update.player.movementRevision, update.epoch);
        publish(channel.socket, { type: 'movement', update });
        if (details.roomId !== update.player.roomId && !channel.transition) {
          channel.transition = session
            .publishConnectionState(id)
            .then((publication) => {
              if (publication) deliverPublication(publication);
            })
            .catch((error: unknown) =>
              log('error', 'network.room-transition-failed', { connectionId: id, error }),
            )
            .finally(() => {
              channel.transition = undefined;
            });
        }
      } else {
        // Charge serialization to the first send, then reuse the bytes for peers.
        if (!publicPayload) {
          const startedAt = performance.now();
          publicPayload = serialize(publicMessage);
          session.performance.movementEncoding(performance.now() - startedAt);
        }
        publish(channel.socket, publicMessage, publicPayload);
      }
    }
  });
  const acknowledge = (
    socket: WebSocket,
    command: { receivedAt: number; requestId: number; type: string },
    result: import('../session/ClientCommand.js').CommandResult,
    trace?: MultiplayerCommandTrace,
  ) => {
    const state = socketDetails.get(socket)!;
    const ackMs = performance.now() - command.receivedAt;
    state.maximumAckMs = Math.max(state.maximumAckMs, ackMs);
    if (
      ackMs >= multiplayerThresholds.acknowledgment &&
      performance.now() - state.lastSlowAckAt >= 1000
    ) {
      state.lastSlowAckAt = performance.now();
      log('info', 'command.slow-ack', {
        connectionId: state.connectionId,
        playerId: state.playerId,
        commandType: command.type,
        requestId: command.requestId,
        correlationId: state.connectionId + ':' + command.requestId,
        ackMs,
      });
    }
    markMultiplayer(trace, 'network-send');
    publish(socket, { type: 'result', id: command.requestId, result });
    profiler.finish(trace);
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
      lastRequestId: 0,
      lastSlowAckAt: -Infinity,
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
        ? await session.resolveResumeDigest(digest(requestedToken))
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
      const channel: Channel = { socket, pending: [] };
      const eventSubscription = session.onEvent((event, sequence, timing) => {
        if ('playerId' in event && event.playerId !== playerId) return;
        const trace = eventTrace(connectionId, event, sequence, timing);
        if (isImmediateGameEvent(event)) {
          if (!channels.has(connectionId)) return;
          if (event.type === 'apple.bite') {
            const elapsed = multiplayerNow() - event.committedAt;
            maximumImmediateEventMs = Math.max(maximumImmediateEventMs, elapsed);
            profiler.record('event/apple.bite/commit-to-send', elapsed);
          }
          publishEvent(socket, event, sequence, trace);
        } else if (channel.pending.length >= 256) {
          closeSocket(
            socket,
            1013,
            'outbound-event-backpressure',
            'Client event queue is too large',
          );
        } else {
          channel.pending.push({ event, sequence, trace });
        }
      });
      const settleConnection = (work: Promise<void>) => {
        void work.catch((error: unknown) =>
          log('warn', 'connection.cleanup-failed', { connectionId, error }),
        );
      };
      socket.once('close', (code) => {
        channels.delete(connectionId);
        eventSubscription();
        const current = active.get(playerId);
        if (current && current.connectionId !== connectionId) return;
        active.delete(playerId);
        if (closing || code === 1000) {
          settleConnection(
            session.detachConnection(
              connectionId,
              closing ? 'server-shutdown' : 'intentional-leave',
            ),
          );
        } else {
          settleConnection(session.suspendConnection(connectionId));
          clearTimeout(suspensionTimers.get(playerId));
          const timer = setTimeout(() => {
            suspensionTimers.delete(playerId);
            settleConnection(session.detachConnection(connectionId, 'recovery-expired'));
          }, CONNECTION_RECOVERY_MS);
          suspensionTimers.set(playerId, timer);
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
      clearTimeout(suspensionTimers.get(playerId));
      suspensionTimers.delete(playerId);
      if (socket.readyState !== WebSocket.OPEN) {
        eventSubscription();
        await session.detachConnection(connectionId);
        return;
      }
      if (endpoint.searchParams.get('turnSteps') === '1')
        await session.enableMovementGrace(playerId);
      const snapshot = await session.openNetworkPublication(connectionId);
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
      channels.set(connectionId, channel);
      recordMovement(
        channel,
        connectionId,
        playerId,
        snapshot.players[playerId]?.movementRevision,
        snapshot.replication?.epoch,
      );
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
      let lastClockProbeAt = -Infinity;
      socket.on('message', (data, binary) => {
        if (active.get(playerId)?.connectionId !== connectionId) return;
        const receivedAt = performance.now();
        const state = socketDetails.get(socket)!;
        state.lastReceivedAt = receivedAt;
        const raw = binary ? '' : data.toString();
        let clock: unknown;
        try {
          clock = JSON.parse(raw);
        } catch {
          clock = null;
        }
        if (
          isRecord(clock) &&
          clock.type === 'movementClock' &&
          typeof clock.clientTimeMs === 'number' &&
          Number.isFinite(clock.clientTimeMs)
        ) {
          if (receivedAt - lastClockProbeAt >= 250) {
            lastClockProbeAt = receivedAt;
            const clientTimeMs = clock.clientTimeMs;
            void Promise.resolve(session.getMovementClockTime())
              .then((serverTimeMs) => {
                publish(socket, { type: 'movementClock', clientTimeMs, serverTimeMs });
              })
              .catch((error: unknown) =>
                log('warn', 'network.clock-failed', { connectionId, error }),
              );
          }
          return;
        }
        const message = readCommandMessage(clock);
        if (!message) {
          const diagnostic = binary ? null : parseClientDiagnostic(raw);
          if (diagnostic) {
            if (receivedAt - diagnosticWindowAt >= 10000) {
              diagnosticWindowAt = receivedAt;
              clientReports = 0;
            }
            if (options.onDiagnostic && clientReports++ < 5) {
              const fields = {
                ...diagnostic,
                source: 'client',
                connectionId,
                playerId,
                roomId: state.roomId,
                lastMovementAttempt: state.lastMovementAttempt && {
                  type: state.lastMovementAttempt.type,
                  requestId: state.lastMovementAttempt.requestId,
                  ageMs: Math.max(0, receivedAt - state.lastMovementAttempt.at),
                },
                lastMovementCommand: state.lastMovementCommand,
                lastMovementRejection: state.lastMovementRejection,
              };
              const report = (
                authorityMovement?: Awaited<
                  ReturnType<GameServerSession['getPlayerMovementDiagnostic']>
                >,
              ) => {
                let disposition: string | undefined;
                if (diagnostic.event === 'movement-stalled' && authorityMovement) {
                  const recent =
                    fields.lastMovementAttempt && fields.lastMovementAttempt.ageMs < 5000;
                  if (
                    authorityMovement.controlMode === 'manual' &&
                    diagnostic.desiredInteraction === 'playing'
                  )
                    disposition = 'manual-mode-mismatch';
                  else if (authorityMovement.controlMode === 'held') disposition = 'expected-hold';
                  else if (
                    recent &&
                    fields.lastMovementAttempt?.requestId ===
                      fields.lastMovementRejection?.requestId
                  )
                    disposition = 'movement-rejected';
                  else if (
                    authorityMovement.controlMode === 'manual' &&
                    recent &&
                    fields.lastMovementAttempt?.type === 'setDirection'
                  )
                    disposition = 'manual-step-missing';
                  else disposition = authorityMovement.held ? 'expected-hold' : 'automatic-stall';
                }
                log(
                  diagnostic.event === 'browser-lifecycle' || disposition === 'expected-hold'
                    ? 'info'
                    : 'warn',
                  `client.${diagnostic.event}`,
                  { ...fields, authorityMovement, disposition },
                );
              };
              if (
                diagnostic.event === 'presentation-error' ||
                diagnostic.event === 'movement-stalled'
              )
                void Promise.resolve(session.getPlayerMovementDiagnostic(playerId)).then(
                  report,
                  () => report(),
                );
              else report();
            }
            return;
          }
          closeSocket(socket, 1008, 'invalid-command', 'Invalid command');
          return;
        }
        if (message.id <= state.lastRequestId) return;
        state.lastRequestId = message.id;
        state.commands++;
        const input = message.command;
        const command = { type: input.type, receivedAt, requestId: message.id };
        const correlationId = connectionId + ':' + message.id;
        const category = multiplayerCommandType(input);
        const trace = profiler.begin(correlationId, category);
        if (trace) trace.times['network-received'] = performance.timeOrigin + receivedAt;
        const movementCommand =
          command.type === 'manualStep' ||
          command.type === 'setDirection' ||
          command.type === 'forceDirection';
        if (movementCommand)
          state.lastMovementAttempt = { type: command.type, at: receivedAt, requestId: message.id };
        // A wire payload cannot impersonate another runtime player.
        markMultiplayer(trace, 'network-dispatch');
        void session
          .executeNetworkCommand(connectionId, { ...input, playerId }, trace)
          .then(
            ({ result, publication, trace: completed, rejection }) => {
              markMultiplayer(completed, 'network-response');
              state.maximumCommandMs = Math.max(
                state.maximumCommandMs,
                performance.now() - receivedAt,
              );
              if (!result.ok) state.rejected++;
              if (movementCommand) {
                state.lastMovementCommand = {
                  type: command.type,
                  accepted: result.ok,
                  requestId: command.requestId,
                };
                if (!result.ok)
                  state.lastMovementRejection = {
                    reason: result.reason ?? 'action-unavailable',
                    requestId: command.requestId,
                  };
              }
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
                  category,
                  correlationId,
                  requestId: command.requestId,
                  actorId: 'actorId' in input ? input.actorId : undefined,
                  menuId: 'menuId' in input ? input.menuId : undefined,
                  expectedMode: input.type === 'playerInteraction' ? input.mode : undefined,
                  clientContext: message.context,
                  authority: rejection,
                  reason: result.reason ?? result.message ?? 'action-unavailable',
                });
              }
              if (publication) deliverPublication(publication);
              acknowledge(socket, command, result, completed);
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
              acknowledge(socket, command, { ok: false, reason: 'command-failed' }, trace);
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
    if (!channels.size) return;
    if (publishing) {
      skippedNetworkTicks++;
      return;
    }
    const startedAt = performance.now();
    const cpuStartedAt = process.threadCpuUsage?.();
    publishing = true;
    void session
      .publishNetworkDeltas(deliverPublication)
      .catch((error: unknown) => {
        log('error', 'network.publication-failed', { error });
        console.error('[game-server] Publication failed', error);
      })
      .finally(() => {
        const durationMs = performance.now() - startedAt;
        maximumPublicationMs = Math.max(maximumPublicationMs, durationMs);
        profiler.record('publication/round-trip', durationMs);
        if (
          durationMs >= multiplayerThresholds.publication &&
          performance.now() - lastSlowPublicationAt >= 1000
        ) {
          lastSlowPublicationAt = performance.now();
          const cpu = cpuStartedAt && process.threadCpuUsage?.(cpuStartedAt);
          log('info', 'network.publication-cpu-breakdown', {
            durationMs,
            coordinatorCpuMs: cpu && (cpu.user + cpu.system) / 1000,
          });
        }
        lastPublicationAt = performance.now();
        publishing = false;
      });
  }, 100);
  networkTimer.unref();
  let refreshingPerformance = false;
  const performanceTimer =
    options.onPerformance || options.onDiagnostic
      ? setInterval(() => {
          if (refreshingPerformance) return;
          refreshingPerformance = true;
          void Promise.resolve(
            session.refreshPerformance?.(true) ?? session.getPerformanceReport(true),
          )
            .then((report) => {
              options.onPerformance?.(report);
              const processReport = processPerformance?.read();
              if (profiler.enabled) {
                const { metrics, traces } = profiler.read();
                const entries = Object.entries(metrics);
                for (let offset = 0; offset < entries.length; offset += 24)
                  log('info', 'multiplayer.profile', {
                    metrics: Object.fromEntries(entries.slice(offset, offset + 24)),
                  });
                for (const trace of traces) log('info', 'multiplayer.trace', { ...trace });
              }
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
                  maximumImmediateEventMs,
                  sinceLastNetworkCycleMs: performance.now() - lastPublicationAt,
                  connections,
                  connectionsTruncated: channels.size > connections.length,
                },
              );
              skippedNetworkTicks = 0;
              maximumPublicationMs = 0;
              maximumImmediateEventMs = 0;
            })
            .catch((error: unknown) => log('warn', 'performance.sample-failed', { error }))
            .finally(() => {
              refreshingPerformance = false;
            });
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
  const heartbeatIntervalMs = 15000;
  let lastHeartbeatAt = performance.now();
  const heartbeat = setInterval(() => {
    const now = performance.now();
    const gapMs = now - lastHeartbeatAt;
    lastHeartbeatAt = now;
    if (gapMs >= 2 * heartbeatIntervalMs)
      log('warn', 'server.heartbeat-gap', { gapMs, sockets: sockets.clients.size });
    for (const socket of sockets.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
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
  }, heartbeatIntervalMs);
  heartbeat.unref();

  return {
    http,
    getPerformance: () => session.getPerformanceReport(),
    samplePerformance: async () =>
      session.refreshPerformance?.(false) ?? session.getPerformanceReport(),
    getMultiplayerProfile: () => profiler.read(),
    getMaximumImmediateEventMs: () => maximumImmediateEventMs,
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
      for (const timer of suspensionTimers.values()) clearTimeout(timer);
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
      await session.flush();
      await new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      );
      unsubscribeDiagnostics();
      log('info', 'server.stopped');
    },
  };
}
