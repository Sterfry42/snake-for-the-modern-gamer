import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import {
  createPhysicalHumanTown,
  renderTownGateSide,
  townGateFootprintCells,
  type TownGate,
  type TownStructure,
} from '../../world/town.js';
import { SnakeGame } from '../snakeGame.js';

const districtRoomIds = {
  '10,10,0': 'townCenter',
  '11,10,0': 'marketStreet',
  '10,11,0': 'residentialStreet',
  '11,11,0': 'backAlley',
} as const;

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  });
});

function createGateTown() {
  return createPhysicalHumanTown({
    biomeId: 'verdigris-basin',
    seed: 12345,
    townId: 'test-town',
    districtRoomIds,
    entranceRoomId: '10,10,0',
    exitRoomIds: ['11,11,0'],
  });
}

function moveSnakeToLocal(game: SnakeGame, roomId: string, local: { x: number; y: number }): void {
  const [roomX = 0, roomY = 0] = roomId.split(',').map(Number);
  const snake = (
    game as unknown as { snake: { currentRoomId: string; body: Array<{ x: number; y: number }> } }
  ).snake;
  snake.currentRoomId = roomId;
  snake.body = [
    {
      x: roomX * defaultGameConfig.grid.cols + local.x,
      y: roomY * defaultGameConfig.grid.rows + local.y,
    },
  ];
}

function attachTownToRoom(
  game: SnakeGame,
  roomId: string,
  gate: TownGate,
  town = createGateTown(),
): void {
  const room = game.getRoom(roomId);
  room.town = {
    ...town,
    gates: town.gates.map((entry) => (entry.id === gate.id ? gate : entry)),
  };
}

function stampClosedGateRoom(
  game: SnakeGame,
  town: TownStructure,
  roomId: string,
  gate: TownGate,
  perspective: 'inside' | 'outside',
): void {
  const room = game.getRoom(roomId);
  const layout = Array.from({ length: defaultGameConfig.grid.rows }, () =>
    Array.from({ length: defaultGameConfig.grid.cols }, () => '.'),
  );
  layout[10]![5] = 'x';
  renderTownGateSide({
    layout,
    gate,
    side: perspective === 'inside' ? gate.side : oppositeSide(gate.side),
    perspective,
    state: 'closed',
    includeGuard: false,
  });
  room.layout = layout.map((row) => row.join(''));
  room.town = {
    ...town,
    gates: town.gates.map((entry) => (entry.id === gate.id ? gate : entry)),
  };
}

function oppositeSide(side: TownGate['side']): TownGate['side'] {
  switch (side) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'east':
      return 'west';
    case 'west':
      return 'east';
  }
}

describe('town gate interactions', () => {
  it('opens a town gate from inside without charging score', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const town = createGateTown();
    const gate = town.gates.find((entry) => entry.kind === 'entrance')!;
    attachTownToRoom(game, gate.townRoomId, gate);
    moveSnakeToLocal(game, gate.townRoomId, { x: 18, y: 3 });
    game.addScore(10);

    const result = game.openNearbyTownGate();

    expect(result.ok).toBe(true);
    expect(result.message).toContain('opens the gate');
    expect(game.getScore()).toBe(10);
  });

  it('charges the old 75 score gate tax when opening from outside', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const town = createGateTown();
    const gate = town.gates.find((entry) => entry.kind === 'entrance')!;
    attachTownToRoom(game, gate.approachRoomId, gate);
    moveSnakeToLocal(game, gate.approachRoomId, { x: 18, y: 20 });
    game.addScore(75);

    const result = game.openNearbyTownGate();

    expect(result.ok).toBe(true);
    expect(result.message).toContain('takes 75 score');
    expect(game.getScore()).toBe(0);
  });

  it('carves the opened gate footprint on both cached paired rooms without opening unrelated gates', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const town = createGateTown();
    const gate = town.gates.find((entry) => entry.kind === 'entrance')!;
    stampClosedGateRoom(game, town, gate.townRoomId, gate, 'inside');
    stampClosedGateRoom(game, town, gate.approachRoomId, gate, 'outside');
    moveSnakeToLocal(game, gate.approachRoomId, { x: 18, y: 20 });
    game.addScore(75);

    const result = game.openNearbyTownGate();

    expect(result.ok).toBe(true);
    const inside = game.getRoom(gate.townRoomId).layout;
    const outside = game.getRoom(gate.approachRoomId).layout;
    const insideGateCells = townGateFootprintCells({
      side: gate.side,
      cols: defaultGameConfig.grid.cols,
      rows: defaultGameConfig.grid.rows,
    });
    const outsideGateCells = townGateFootprintCells({
      side: oppositeSide(gate.side),
      cols: defaultGameConfig.grid.cols,
      rows: defaultGameConfig.grid.rows,
    });
    for (const cell of insideGateCells) {
      expect(inside[cell.y]?.[cell.x]).toBe('.');
    }
    for (const cell of outsideGateCells) {
      expect(outside[cell.y]?.[cell.x]).toBe('.');
    }
    expect(game.getRoom(gate.townRoomId).layout[10]?.[5]).toBe('x');
    expect(game.getRoom(gate.approachRoomId).layout[10]?.[5]).toBe('x');
  });

  it('applies an opened gate before collision when crossing into a stale paired room', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const town = createGateTown();
    const gate = town.gates.find((entry) => entry.kind === 'entrance')!;
    stampClosedGateRoom(game, town, gate.townRoomId, gate, 'inside');
    stampClosedGateRoom(game, town, gate.approachRoomId, gate, 'outside');
    moveSnakeToLocal(game, gate.approachRoomId, { x: 18, y: 20 });
    game.addScore(75);

    const openResult = game.openNearbyTownGate();
    expect(openResult.ok).toBe(true);
    expect(game.getScore()).toBe(0);
    stampClosedGateRoom(game, town, gate.townRoomId, gate, 'inside');

    moveSnakeToLocal(game, gate.approachRoomId, {
      x: Math.floor(defaultGameConfig.grid.cols / 2),
      y: defaultGameConfig.grid.rows - 1,
    });
    game.forceDirection(0, 1);

    const stepResult = game.actionStep(false);

    expect(stepResult.status).toBe('alive');
    expect(game.getCurrentRoom().id).toBe(gate.townRoomId);
    const landingRoom = game.getRoom(gate.townRoomId);
    for (const cell of townGateFootprintCells({
      side: gate.side,
      cols: defaultGameConfig.grid.cols,
      rows: defaultGameConfig.grid.rows,
    })) {
      expect(landingRoom.layout[cell.y]?.[cell.x]).toBe('.');
    }
  });
});
