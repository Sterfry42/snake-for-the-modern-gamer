export interface Vector2Like {
  x: number;
  y: number;
}

export function cloneVector(vec: Vector2Like): Vector2Like {
  return { x: vec.x, y: vec.y };
}

export function addVectors(a: Vector2Like, b: Vector2Like): Vector2Like {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorEquals(a: Vector2Like, b: Vector2Like): boolean {
  return a.x === b.x && a.y === b.y;
}

export function vectorKey(vec: Vector2Like): string {
  return `${vec.x},${vec.y}`;
}

export function manhattanDistance(a: Vector2Like, b: Vector2Like): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function withinBounds(vec: Vector2Like, width: number, height: number): boolean {
  return vec.x >= 0 && vec.x < width && vec.y >= 0 && vec.y < height;
}
