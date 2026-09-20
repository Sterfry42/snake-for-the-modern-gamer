import {
  ARCADE_GRID_HEIGHT,
  ARCADE_GRID_WIDTH,
  type ArcadeApple,
  type ArcadeAppleType,
  type ArcadeDirection,
  type ArcadeRandom,
  type ArcadeSnakeRunState,
  type ArcadeSnakeStats,
  type ArcadeTilePosition,
} from './arcadeSnakeTypes.js';

const positionKey = (position: ArcadeTilePosition): string => `${position.x},${position.y}`;

export function getCorruptedAppleChance(stats: ArcadeSnakeStats, runScore: number): number {
  if (!isCorruptedAppleEligible(stats, runScore)) return 0;
  return Math.min(
    0.18,
    0.03 +
      stats.corruptedApplesEaten * 0.012 +
      stats.corruption * 0.002 +
      Math.floor(stats.playCount / 3) * 0.005,
  );
}

export function isCorruptedAppleEligible(stats: ArcadeSnakeStats, runScore: number): boolean {
  return (
    stats.corruption > 0 || stats.playCount >= 2 || stats.lifetimeScore >= 30 || runScore >= 10
  );
}

export function chooseArcadeAppleType(
  stats: ArcadeSnakeStats,
  runScore: number,
  rng: ArcadeRandom,
): ArcadeAppleType {
  if (rng() < getCorruptedAppleChance(stats, runScore)) return 'corrupted';
  if (runScore < 5) return 'regular';
  const roll = rng();
  if (roll < 0.58) return 'regular';
  if (roll < 0.74) return 'golden';
  if (roll < 0.88) return 'scurry';
  return 'barrier';
}

export function spawnArcadeApple(
  type: ArcadeAppleType,
  tick: number,
  snake: readonly ArcadeTilePosition[],
  barriers: readonly ArcadeTilePosition[],
  rng: ArcadeRandom,
): ArcadeApple {
  const blocked = new Set([...snake, ...barriers].map(positionKey));
  const head = snake[0];
  const candidates: ArcadeTilePosition[] = [];
  const preferred: ArcadeTilePosition[] = [];
  for (let y = 0; y < ARCADE_GRID_HEIGHT; y += 1) {
    for (let x = 0; x < ARCADE_GRID_WIDTH; x += 1) {
      const position = { x, y };
      if (blocked.has(positionKey(position))) continue;
      candidates.push(position);
      if (!head || Math.abs(head.x - x) + Math.abs(head.y - y) > 1) preferred.push(position);
    }
  }
  const pool = preferred.length > 0 ? preferred : candidates;
  const position = pool[Math.floor(rng() * pool.length)] ?? { x: 0, y: 0 };
  return {
    type,
    position,
    spawnedAtTick: tick,
    expiresAtTick: type === 'corrupted' ? tick + 70 : undefined,
    nextMoveAtTick: type === 'scurry' ? tick + 3 + Math.floor(rng() * 3) : undefined,
    protectedDirections:
      type === 'barrier' ? shuffleDirections(rng).slice(0, 1 + Math.floor(rng() * 3)) : undefined,
    visualTell:
      type === 'corrupted'
        ? (['scanline', 'split', 'blink', 'static'] as const)[Math.floor(rng() * 4)]
        : undefined,
  };
}

function shuffleDirections(rng: ArcadeRandom): ArcadeDirection[] {
  const directions: ArcadeDirection[] = ['up', 'down', 'left', 'right'];
  for (let index = directions.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [directions[index], directions[target]] = [directions[target]!, directions[index]!];
  }
  return directions;
}

export function spawnBarrierBlocks(
  apple: ArcadeApple,
  snake: readonly ArcadeTilePosition[],
  rng: ArcadeRandom,
): ArcadeTilePosition[] {
  if (apple.type !== 'barrier') return [];
  const blocked = new Set([...snake, apple.position].map(positionKey));
  const candidates: ArcadeTilePosition[] = [];
  for (let y = 0; y < ARCADE_GRID_HEIGHT; y += 1) {
    for (let x = 0; x < ARCADE_GRID_WIDTH; x += 1) {
      const position = { x, y };
      if (blocked.has(positionKey(position))) continue;
      const head = snake[0];
      if (head && Math.abs(head.x - x) + Math.abs(head.y - y) <= 2) continue;
      candidates.push(position);
    }
  }
  const count = 1 + Math.floor(rng() * 3);
  const result: ArcadeTilePosition[] = [];
  while (result.length < count && candidates.length > 0) {
    const index = Math.floor(rng() * candidates.length);
    result.push(candidates.splice(index, 1)[0]!);
  }
  return result;
}

export function moveScurryApple(
  state: ArcadeSnakeRunState,
  rng: ArcadeRandom,
): { apple: ArcadeApple; movedFrom?: ArcadeTilePosition } {
  const apple = state.apple;
  const head = state.snake[0];
  if (
    apple.type !== 'scurry' ||
    !head ||
    apple.nextMoveAtTick === undefined ||
    state.tick < apple.nextMoveAtTick
  ) {
    return { apple };
  }
  const distance = Math.abs(head.x - apple.position.x) + Math.abs(head.y - apple.position.y);
  const nextMoveAtTick = state.tick + 3 + Math.floor(rng() * 3);
  if (distance > 4) return { apple: { ...apple, nextMoveAtTick } };

  const blocked = new Set(
    [...state.snake, ...state.barriers, ...state.deletedTiles].map(positionKey),
  );
  const candidates = [
    { x: apple.position.x + 1, y: apple.position.y },
    { x: apple.position.x - 1, y: apple.position.y },
    { x: apple.position.x, y: apple.position.y + 1 },
    { x: apple.position.x, y: apple.position.y - 1 },
  ]
    .map((position) => ({
      x: (position.x + ARCADE_GRID_WIDTH) % ARCADE_GRID_WIDTH,
      y: (position.y + ARCADE_GRID_HEIGHT) % ARCADE_GRID_HEIGHT,
    }))
    .filter((position) => !blocked.has(positionKey(position)))
    .sort((a, b) => {
      const aDistance = Math.abs(head.x - a.x) + Math.abs(head.y - a.y);
      const bDistance = Math.abs(head.x - b.x) + Math.abs(head.y - b.y);
      return bDistance - aDistance;
    });
  const bestDistance = candidates[0]
    ? Math.abs(head.x - candidates[0].x) + Math.abs(head.y - candidates[0].y)
    : distance;
  const best = candidates.filter(
    (position) => Math.abs(head.x - position.x) + Math.abs(head.y - position.y) === bestDistance,
  );
  const next = best[Math.floor(rng() * best.length)];
  if (!next || bestDistance <= distance) return { apple: { ...apple, nextMoveAtTick } };
  return {
    movedFrom: apple.position,
    apple: { ...apple, position: next, nextMoveAtTick },
  };
}
