export type GameplayFlags = Record<string, unknown>;

export interface CollisionProtection {
  cheatImmortal: boolean;
  invulnerabilityTicks: number;
  phaseTicks: number;
}

function numericFlag(flags: GameplayFlags, key: string): number {
  const value = Number(flags[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function booleanFlag(flags: GameplayFlags, key: string): boolean {
  return Boolean(flags[key]);
}

export function getUnifiedInvulnerabilityTicks(flags: GameplayFlags): number {
  return Math.max(
    0,
    numericFlag(flags, 'fortitude.invulnerabilityTicks'),
    numericFlag(flags, 'player.bulletInvulnTicks'),
  );
}

export function getCollisionProtection(flags: GameplayFlags): CollisionProtection {
  return {
    cheatImmortal: booleanFlag(flags, 'cheat.immortal'),
    invulnerabilityTicks: getUnifiedInvulnerabilityTicks(flags),
    phaseTicks: Math.max(0, numericFlag(flags, 'traversal.phaseTicks')),
  };
}

export function hasCollisionInvulnerability(flags: GameplayFlags): boolean {
  const protection = getCollisionProtection(flags);
  return (
    protection.cheatImmortal || protection.invulnerabilityTicks > 0 || protection.phaseTicks > 0
  );
}

export function canPhaseThroughBody(flags: GameplayFlags): boolean {
  return hasCollisionInvulnerability(flags);
}

export function canPhaseThroughWalls(
  flags: GameplayFlags,
  safeZonePhaseThroughWalls = false,
): boolean {
  return hasCollisionInvulnerability(flags) || safeZonePhaseThroughWalls;
}

export function canSwimWithoutBreath(flags: GameplayFlags): boolean {
  return booleanFlag(flags, 'equipment.swimmingEnabled') || hasCollisionInvulnerability(flags);
}

export function getPositiveChargeCount(flags: GameplayFlags, key: string): number {
  const value = flags[key] as { charges?: unknown } | undefined;
  const charges = Number(value?.charges ?? 0);
  return Number.isFinite(charges) ? Math.max(0, charges) : 0;
}
