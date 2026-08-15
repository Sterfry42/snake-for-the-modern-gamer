import type { Actor, ActorPresence } from '../../actors/actorTypes.js';
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
