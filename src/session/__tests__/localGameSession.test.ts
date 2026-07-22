import { defaultGameConfig } from '../../config/gameConfig.js';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { LocalGameConnection } from '../LocalGameConnection.js';
import { LocalGameSession } from '../LocalGameSession.js';

function createGame(): SnakeGame {
  return new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
}

describe('LocalGameSession', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
  });

  it('produces a snapshot with the local player and current room', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });

    const snapshot = session.getSnapshot();
    const player = snapshot.players[snapshot.localPlayerId];

    expect(player).toBeDefined();
    expect(player?.isLocal).toBe(true);
    expect(player?.body).toEqual(game.getSnakeBody().map((segment) => ({ ...segment })));
    expect(snapshot.viewport.rooms[player!.roomId]?.room.id).toBe(player?.roomId);
    expect(snapshot.ui.health).toEqual(game.getPlayerHealth());
  });

  it('copies player body data instead of exposing the snake array directly', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });

    const snapshot = session.getSnapshot();
    const snapshotBody = snapshot.players[snapshot.localPlayerId]!.body;
    snapshotBody[0]!.x = 9999;

    expect(game.getSnakeBody()[0]?.x).not.toBe(9999);
  });

  it('routes direction commands through the local connection', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });
    const connection = new LocalGameConnection(session);
    const playerId = game.getLocalPlayerId();

    const result = connection.send({
      type: 'setDirection',
      playerId,
      direction: { x: 0, y: -1 },
    });

    expect(result).toEqual({ ok: true });
    expect(session.getSnapshot().players[playerId]?.direction).toEqual({ x: 1, y: 0 });

    session.actionStep(false);

    expect(session.getSnapshot().players[playerId]?.direction).toEqual({ x: 0, y: -1 });
  });

  it('emits snapshots after commands and action steps', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });
    const snapshots: number[] = [];

    const unsubscribe = session.onSnapshot((snapshot) => {
      snapshots.push(snapshot.tick);
    });

    const result = session.handleCommand({
      type: 'setDirection',
      playerId: game.getLocalPlayerId(),
      direction: { x: 0, y: -1 },
    });
    session.actionStep(false);
    unsubscribe();

    expect(result.ok).toBe(true);
    expect(snapshots.length).toBeGreaterThanOrEqual(3);
  });

  it('ignores commands for unknown players', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });
    const before = session.getSnapshot().players[game.getLocalPlayerId()]?.direction;

    const result = session.handleCommand({
      type: 'setDirection',
      playerId: 'missing-player',
      direction: { x: 0, y: -1 },
    });

    expect(result).toEqual({ ok: false, reason: 'unknown-player' });
    expect(session.getSnapshot().players[game.getLocalPlayerId()]?.direction).toEqual(before);
  });

  it('routes pause and resume commands through the runtime boundary', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });
    const connection = new LocalGameConnection(session);
    const playerId = game.getLocalPlayerId();
    const snapshots: number[] = [];
    session.onSnapshot((snapshot) => snapshots.push(snapshot.tick));

    expect(connection.send({ type: 'pause', playerId })).toEqual({ ok: true });
    expect(connection.send({ type: 'resume', playerId })).toEqual({ ok: true });

    expect(snapshots.length).toBeGreaterThanOrEqual(3);
  });

  it('can include and step a debug second player without changing the local player id', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    game.setDebugSecondPlayerEnabled(true);
    const session = new LocalGameSession({ game });

    const before = session.getSnapshot();
    const debugBefore = before.players['debug-player-2'];

    expect(before.localPlayerId).toBe(game.getLocalPlayerId());
    expect(debugBefore).toBeDefined();
    expect(debugBefore?.isLocal).toBe(false);

    session.actionStep(false);

    const debugAfter = session.getSnapshot().players['debug-player-2'];
    expect(debugAfter?.body).not.toEqual(debugBefore?.body);
    expect(debugAfter?.alive).toBe(true);
  });

  it('lets the debug second player consume the shared room apple', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    game.setDebugSecondPlayerEnabled(true);
    const before = game.getSnapshot().players['debug-player-2']!;
    const head = before.body[0]!;
    const roomId = before.roomId;
    const localApple = { x: head.x + 1, y: head.y };
    const room = game.getRoom(roomId);
    const rows = room.layout.map((row) => row.split(''));
    rows[localApple.y]![localApple.x] = '.';
    room.layout = rows.map((row) => row.join(''));
    (game as unknown as { apples: { placeApple(roomId: string, position: { x: number; y: number }, type: string, snake: { x: number; y: number }[]): void } }).apples.placeApple(roomId, localApple, 'normal', [
      ...game.getSnakeBody(),
      ...before.body,
    ]);

    const result = game.stepDebugPlayers();
    const after = game.getSnapshot().players['debug-player-2']!;

    expect(result.appleEaten).toBe(true);
    expect(result.roomsChanged.has(roomId)).toBe(true);
    expect(after.body).toHaveLength(before.body.length + 1);
    expect(game.getApple(roomId)?.position).not.toEqual(localApple);
  });

  it('reports caffeinated apple consumption through the action result', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const head = game.getSnakeBody()[0]!;
    const roomId = game.getCurrentRoom().id;
    const localApple = { x: head.x + 1, y: head.y };
    const room = game.getRoom(roomId);
    const rows = room.layout.map((row) => row.split(''));
    rows[localApple.y]![localApple.x] = '.';
    room.layout = rows.map((row) => row.join(''));
    (game as unknown as { apples: { placeApple(roomId: string, position: { x: number; y: number }, type: string, snake: { x: number; y: number }[]): void } }).apples.placeApple(roomId, localApple, 'caffeinated', [...game.getSnakeBody()]);

    const result = game.actionStep(false);

    expect(result.apple.eaten).toBe(true);
    expect(result.apple.typeId).toBe('caffeinated');
  });

  it('kills the local player when it runs into the debug second player', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    game.setDebugSecondPlayerEnabled(true);
    game.forceDirection(1, 0);

    let result = game.actionStep(false);
    for (let i = 0; i < 8 && result.status === 'alive'; i += 1) {
      result = game.actionStep(false);
    }

    expect(result.status).toBe('dead');
    expect(result.deathReason).toBe('self');
  });

  it('owns the browser save orchestration for local single-player', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });
    game.addScore(12);

    session.saveGame();

    expect(session.hasSaveSync()).toBe(true);

    game.setScore(0);
    expect(game.getScore()).toBe(0);

    expect(session.loadGame()).toBe(true);
    expect(game.getScore()).toBe(12);

    session.clearSaveSync();
    expect(session.hasSaveSync()).toBe(false);
  });

  it('routes save, load, and clear through client commands', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const session = new LocalGameSession({ game });
    const connection = new LocalGameConnection(session);
    const playerId = game.getLocalPlayerId();
    game.addScore(7);

    expect(connection.send({ type: 'saveGame', playerId })).toEqual({ ok: true, saved: true });
    expect(session.hasSaveSync()).toBe(true);

    game.setScore(0);

    expect(connection.send({ type: 'loadGame', playerId })).toEqual({ ok: true, loaded: true });
    expect(game.getScore()).toBe(7);

    expect(connection.send({ type: 'clearSave', playerId })).toEqual({ ok: true, cleared: true });
    expect(session.hasSaveSync()).toBe(false);
  });

  it('emits runtime events for apple pickup and death outcomes', () => {
    const game = createGame();
    game.reset({ preserveRunSeed: true });
    const head = game.getSnakeBody()[0]!;
    const roomId = game.getCurrentRoom().id;
    const localApple = { x: head.x + 1, y: head.y };
    const room = game.getRoom(roomId);
    const rows = room.layout.map((row) => row.split(''));
    rows[localApple.y]![localApple.x] = '.';
    room.layout = rows.map((row) => row.join(''));
    (game as unknown as { apples: { placeApple(roomId: string, position: { x: number; y: number }, type: string, snake: { x: number; y: number }[]): void } }).apples.placeApple(roomId, localApple, 'normal', [...game.getSnakeBody()]);
    const session = new LocalGameSession({ game });
    const events: string[] = [];
    session.onEvent((event) => events.push(event.type));

    session.actionStep(false);

    expect(events).toContain('item.picked_up');
    expect(events).toContain('sound.play');
  });
});
