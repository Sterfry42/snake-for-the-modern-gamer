import type {
  ArcadeCorruptionTier,
  ArcadeDirection,
  ArcadeRandom,
  ArcadeSnakeRunState,
  ArcadeSnakeStats,
  ArcadeTickEvent,
} from './arcadeSnakeTypes.js';

export function getArcadeGlitchPressure(stats: ArcadeSnakeStats, run: ArcadeSnakeRunState): number {
  return stats.corruption + run.corruptionThisRun + Math.floor(run.elapsedMs / 5_000);
}

export function getArcadeCorruptionTier(pressure: number): ArcadeCorruptionTier {
  if (pressure >= 50) return 4;
  if (pressure >= 30) return 3;
  if (pressure >= 15) return 2;
  if (pressure >= 5) return 1;
  return 0;
}

export function getArcadeDeadPixelCount(tier: ArcadeCorruptionTier, rng: ArcadeRandom): number {
  const ranges: Record<ArcadeCorruptionTier, readonly [number, number]> = {
    0: [0, 0],
    1: [1, 2],
    2: [3, 6],
    3: [7, 12],
    4: [13, 20],
  };
  const [min, max] = ranges[tier];
  return min + Math.floor(rng() * (max - min + 1));
}

export function isArcadeBlueScreenEligible(
  stats: ArcadeSnakeStats,
  run: ArcadeSnakeRunState,
  pressure = getArcadeGlitchPressure(stats, run),
): boolean {
  return pressure >= 30 && run.corruptedApplesEatenThisRun >= 1 && run.elapsedMs >= 12_000;
}

export function shouldTriggerArcadeBlueScreen(
  stats: ArcadeSnakeStats,
  run: ArcadeSnakeRunState,
  rng: ArcadeRandom,
): boolean {
  const pressure = getArcadeGlitchPressure(stats, run);
  if (!isArcadeBlueScreenEligible(stats, run, pressure)) return false;
  if (run.tick % 18 !== 0) return false;
  return rng() < Math.min(0.04, 0.008 + Math.max(0, pressure - 30) * 0.0008);
}

export function maybeScheduleArcadeCorruption(
  stats: ArcadeSnakeStats,
  run: ArcadeSnakeRunState,
  rng: ArcadeRandom,
): ArcadeTickEvent[] {
  const pressure = getArcadeGlitchPressure(stats, run);
  const tier = getArcadeCorruptionTier(pressure);
  const events: ArcadeTickEvent[] = [];
  if (tier === 0) return events;

  if (run.tick % 8 === 0 && rng() < Math.min(0.18, pressure * 0.0025)) {
    const glitches =
      tier >= 2
        ? (['row-shift', 'chunk-swap', 'tile-flicker', 'text', 'light-mode', 'snake-hide'] as const)
        : (['tile-flicker', 'text'] as const);
    events.push({
      type: 'visual-glitch',
      glitch: glitches[Math.floor(rng() * glitches.length)]!,
      tier,
    });
  }
  if (tier >= 2 && run.tick % 20 === 0 && rng() < 0.22) {
    events.push({ type: 'visual-glitch', glitch: 'text', tier });
  }
  if (tier >= 2 && run.tick % 18 === 0 && rng() < Math.min(0.08, pressure * 0.0015)) {
    events.push({ type: 'popup-resize-glitch', tier });
  }
  if (shouldTriggerArcadeBlueScreen(stats, run, rng)) {
    run.lastBlueScreenAtTick = run.tick;
    events.push({ type: 'blue-screen' });
  }
  if (
    tier >= 2 &&
    run.elapsedMs >= 10_000 &&
    (!run.systemPauseCooldownUntilTick || run.tick >= run.systemPauseCooldownUntilTick) &&
    run.tick % 20 === 0 &&
    rng() < Math.min(0.08, Math.max(0, pressure - 12) * 0.0015)
  ) {
    const durationMs = 450 + Math.floor(rng() * (tier >= 4 ? 1250 : 700));
    run.systemPauseCooldownUntilTick = run.tick + Math.ceil((12_000 + rng() * 10_000) / 140);
    events.push({ type: 'system-pause', durationMs });
  }
  if (
    tier >= 2 &&
    (!run.speedShiftCooldownUntilTick || run.tick >= run.speedShiftCooldownUntilTick) &&
    run.tick % 24 === 0 &&
    rng() < Math.min(0.1, Math.max(0, pressure - 12) * 0.0018)
  ) {
    const multiplier = rng() < 0.5 ? (tier >= 4 ? 0.52 : 0.68) : tier >= 4 ? 1.65 : 1.38;
    const durationTicks = 18 + Math.floor(rng() * 25);
    run.speedMultiplier = multiplier;
    run.speedMultiplierUntilTick = run.tick + durationTicks;
    run.speedShiftCooldownUntilTick = run.tick + durationTicks + 45;
    events.push({ type: 'speed-shift', multiplier, durationTicks });
  }
  if (
    tier >= 2 &&
    run.tick % (tier >= 4 ? 22 : 38) === 0 &&
    run.deletedTiles.length < (tier === 2 ? 2 : tier === 3 ? 5 : 9) &&
    rng() < 0.32
  ) {
    const blocked = new Set(
      [...run.snake, run.apple.position, ...run.deletedTiles].map(
        (position) => `${position.x},${position.y}`,
      ),
    );
    const candidates = [];
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        if (!blocked.has(`${x},${y}`)) candidates.push({ x, y });
      }
    }
    const position = candidates[Math.floor(rng() * candidates.length)];
    if (position) {
      run.deletedTiles.push(position);
      events.push({ type: 'deleted-tile-added', position });
    }
  }
  if (
    tier >= 2 &&
    run.elapsedMs >= 6_000 &&
    (!run.disabledDirectionCooldownUntilTick ||
      run.tick >= run.disabledDirectionCooldownUntilTick) &&
    !run.disabledDirection &&
    run.tick % 10 === 0 &&
    rng() < Math.min(0.2, 0.04 + Math.max(0, pressure - 15) * 0.006)
  ) {
    const directions: ArcadeDirection[] = ['up', 'down', 'left', 'right'];
    const choices = directions.filter((direction) => direction !== run.direction);
    const direction = choices[Math.floor(rng() * choices.length)]!;
    const durationTicks = Math.ceil((2_500 + rng() * 2_500) / 140);
    run.disabledDirection = direction;
    run.disabledDirectionUntilTick = run.tick + durationTicks;
    run.disabledDirectionCooldownUntilTick = run.tick + Math.ceil((12_000 + rng() * 6_000) / 140);
    events.push({ type: 'direction-failure-start', direction, durationTicks });
  }
  return events;
}
