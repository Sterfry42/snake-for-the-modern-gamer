import type { Actor, ActorPresence } from '../../actors/actorTypes.js';
import type { LayerEntrance } from '../../layers/layerTypes.js';
import { isSolidTile } from '../../world/tiles.js';
import type { RoomSnapshot } from '../../world/types.js';
import type { HeadlessScenario } from './headlessScenario.js';

export interface ScenarioActorOptions {
  id: string;
  name: string;
  role: 'resident' | 'shopkeeper' | 'guard' | 'thief';
  roomId?: string;
  position?: { x: number; y: number };
  factionId?: string;
  homeRoomId?: string;
  workRoomId?: string;
}

export function ensureScenarioActor(
  scenario: HeadlessScenario,
  options: ScenarioActorOptions,
): Actor {
  const roomId = options.roomId ?? scenario.currentRoom().id;
  const position = options.position ?? { x: 10, y: 10 };
  const actor = scenario.game.getActorSystem().registry.ensureTownResidentActor({
    actorId: options.id,
    residentId: options.id,
    name: options.name,
    role: options.role === 'thief' ? 'resident' : options.role,
    factionId: options.factionId ?? defaultFactionForRole(options.role),
    townId: 'headless-town',
    currentRoomId: roomId,
    homeRoomId: options.homeRoomId ?? roomId,
    workRoomId: options.workRoomId ?? roomId,
    postPosition: position,
  });
  const presence: ActorPresence = {
    roomId,
    position,
    anchor: position,
    materialized: true,
  };
  scenario.placeActor(actor.id, presence, 'fixture-place-actor');
  if (options.role === 'thief') {
    return (
      scenario.game.getActorSystem().registry.update(actor.id, (current) => ({
        ...current,
        kind: 'criminal',
        role: 'thief',
        factionId: options.factionId ?? defaultFactionForRole(options.role),
        brainId: 'thief',
        flags: { ...current.flags, scenarioRole: 'thief' },
      })) ?? actor
    );
  }
  return scenario.actor(actor.id);
}

export function firstWalkableTile(
  scenario: HeadlessScenario,
  roomId = scenario.currentRoom().id,
): { x: number; y: number } {
  const room = scenario.getRoom(roomId);
  for (let y = 1; y < room.layout.length - 1; y += 1) {
    for (let x = 1; x < (room.layout[0]?.length ?? 0) - 1; x += 1) {
      const tile = room.layout[y]?.[x];
      if (tile !== '#' && tile !== '%' && tile !== 'x' && tile !== 'h' && tile !== 'u') {
        return { x, y };
      }
    }
  }
  throw new Error(`No walkable tile found in room ${roomId}.`);
}

export function offsetPosition(position: { x: number; y: number }, dx: number, dy: number) {
  return { x: position.x + dx, y: position.y + dy };
}

export function findGeneratedTownDoor(
  scenario: HeadlessScenario,
  options: { templateId?: LayerEntrance['templateId']; radius?: number } = {},
): { room: RoomSnapshot; entrance: LayerEntrance } {
  const radius = options.radius ?? 8;
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const room = scenario.getRoom(`${x},${y},0`);
      const entrance = room.layerEntrances?.find(
        (entry) =>
          entry.kind === 'townInterior' &&
          !entry.locked &&
          (!options.templateId || entry.templateId === options.templateId),
      );
      if (room.town && entrance) {
        return { room, entrance };
      }
    }
  }
  throw new Error(`No generated town door found within radius ${radius}.`);
}

export function adjacentWalkableTile(
  room: RoomSnapshot,
  target: { x: number; y: number },
): { x: number; y: number } {
  for (const candidate of [
    { x: target.x + 1, y: target.y },
    { x: target.x - 1, y: target.y },
    { x: target.x, y: target.y + 1 },
    { x: target.x, y: target.y - 1 },
    target,
  ]) {
    const tile = room.layout[candidate.y]?.[candidate.x];
    if (tile !== undefined && !isSolidTile(tile)) {
      return candidate;
    }
  }
  throw new Error(`No adjacent walkable tile near ${target.x},${target.y} in ${room.id}.`);
}

export function walkableTileAwayFrom(
  scenario: HeadlessScenario,
  roomId: string,
  target: { x: number; y: number },
  minimumDistance: number,
): { x: number; y: number } {
  const room = scenario.getRoom(roomId);
  for (let y = 1; y < room.layout.length - 1; y += 1) {
    for (let x = 1; x < (room.layout[0]?.length ?? 0) - 1; x += 1) {
      const tile = room.layout[y]?.[x];
      const distance = Math.abs(x - target.x) + Math.abs(y - target.y);
      if (tile !== undefined && !isSolidTile(tile) && distance >= minimumDistance) {
        return { x, y };
      }
    }
  }
  throw new Error(`No walkable tile at least ${minimumDistance} from ${target.x},${target.y}.`);
}

function defaultFactionForRole(role: ScenarioActorOptions['role']): string {
  switch (role) {
    case 'guard':
      return 'guards';
    case 'shopkeeper':
      return 'shopkeepers';
    case 'thief':
      return 'thieves-guild';
    case 'resident':
      return 'hearthbound-remnant';
  }
}
