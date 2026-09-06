import {
  CARDINAL_DIRECTIONS,
  manhattanDistance,
  vectorKey,
  type Vector2Like,
} from '../core/math.js';

interface ActorPathRequest {
  start: Vector2Like;
  goals: readonly Vector2Like[];
  canStandAt(position: Vector2Like): boolean;
  maxNodes?: number;
}

interface ActorPathResult {
  path: Vector2Like[];
  directions: Vector2Like[];
}

export function findActorGridPath(request: ActorPathRequest): ActorPathResult | null {
  const goalKeys = new Set(request.goals.map((goal) => vectorKey(goal)));
  if (goalKeys.has(vectorKey(request.start))) {
    return { path: [{ ...request.start }], directions: [{ x: 0, y: 0 }] };
  }

  const maxNodes = request.maxNodes ?? 512;
  const queue: Vector2Like[] = [{ ...request.start }];
  const cameFrom = new Map<string, string | null>([[vectorKey(request.start), null]]);
  const positions = new Map<string, Vector2Like>([
    [vectorKey(request.start), { ...request.start }],
  ]);
  let visited = 0;

  while (queue.length > 0 && visited < maxNodes) {
    visited += 1;
    const current = queue.shift()!;
    const directions = [...CARDINAL_DIRECTIONS].sort((a, b) => {
      const aNext = { x: current.x + a.x, y: current.y + a.y };
      const bNext = { x: current.x + b.x, y: current.y + b.y };
      return nearestGoalDistance(aNext, request.goals) - nearestGoalDistance(bNext, request.goals);
    });
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = vectorKey(next);
      if (cameFrom.has(key) || !request.canStandAt(next)) {
        continue;
      }
      cameFrom.set(key, vectorKey(current));
      positions.set(key, next);
      if (goalKeys.has(key)) {
        return buildPath(key, cameFrom, positions);
      }
      queue.push(next);
    }
  }

  return null;
}

function buildPath(
  goalKey: string,
  cameFrom: ReadonlyMap<string, string | null>,
  positions: ReadonlyMap<string, Vector2Like>,
): ActorPathResult {
  const reversed: Vector2Like[] = [];
  let cursor: string | null = goalKey;
  while (cursor) {
    const position = positions.get(cursor);
    if (position) {
      reversed.push(position);
    }
    cursor = cameFrom.get(cursor) ?? null;
  }
  const path = reversed.reverse();
  const directions = path.slice(1).map((position, index) => ({
    x: position.x - path[index]!.x,
    y: position.y - path[index]!.y,
  }));
  return { path, directions };
}

function nearestGoalDistance(position: Vector2Like, goals: readonly Vector2Like[]): number {
  return Math.min(...goals.map((goal) => manhattanDistance(position, goal)));
}
