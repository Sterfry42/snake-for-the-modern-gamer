export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashWorldCoordinate(args: {
  x: number;
  y: number;
  z: number;
  salt: number;
  featureSalt?: number;
}): number {
  let hash = 2166136261;
  hash ^= args.salt;
  hash = Math.imul(hash, 16777619);
  hash ^= args.featureSalt ?? 0;
  hash = Math.imul(hash, 16777619);
  hash ^= args.x + 0x9e3779b9;
  hash = Math.imul(hash, 16777619);
  hash ^= args.y + 0x85ebca6b;
  hash = Math.imul(hash, 16777619);
  hash ^= args.z + 0xc2b2ae35;
  hash = Math.imul(hash, 16777619);
  return hash >>> 0;
}

export function positiveMod(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

/**
 * FNV-1a hash of room coordinates with a per-callsite salt. The world
 * generation stages rely on the exact mixed values, so the chain is fixed:
 * x, then y, then z+salt. Pass worldSalt to mix it in first (cross-room
 * feature stages).
 */
export function hashRoomCoordinates(
  roomX: number,
  roomY: number,
  roomZ: number,
  salt: number,
  worldSalt?: number,
): number {
  let hash = 2166136261;
  if (worldSalt !== undefined) {
    hash ^= worldSalt;
    hash = Math.imul(hash, 16777619);
  }
  hash ^= roomX + 0x9e3779b9;
  hash = Math.imul(hash, 16777619);
  hash ^= roomY + 0x85ebca6b;
  hash = Math.imul(hash, 16777619);
  hash ^= roomZ + salt;
  hash = Math.imul(hash, 16777619);
  return hash >>> 0;
}

export function hashChance(hash: number, chancePercent: number): boolean {
  const clamped = Math.max(0, Math.min(100, chancePercent));
  return (hash / 0xffffffff) * 100 < clamped;
}
