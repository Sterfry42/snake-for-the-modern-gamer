import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng.js';
import { FarmingState, WORLD_DAY_MS } from './farmingState.js';
import { WorldAtmosphereSystem } from '../world/atmosphereSystem.js';
import { defaultGameConfig } from '../config/gameConfig.js';
import { CROPS } from './cropCatalog.js';
import type { FarmingSaveData } from './farmingTypes.js';

function atmosphere() {
  const config = defaultGameConfig.atmosphere;
  if (!config) throw new Error('Missing atmosphere');
  return new WorldAtmosphereSystem(config, 'farm-fps');
}
function plant(farms: FarmingState) {
  const cell = farms.till('0,0,0', 'verdigris-basin', 5, 5, 'loam')!;
  farms.plant(cell, 'potato', 'owner');
  cell.moisture = 100;
  return cell;
}

describe('agriculture long-running invariants and work bounds', () => {
  it.each([30, 60, 120, 144, 240])(
    'matches authoritative crop outcomes at %i FPS including fractional frame times',
    (fps) => {
      const simulate = (chunk: number) => {
        const farms = new FarmingState(),
          clock = atmosphere();
        plant(farms);
        let elapsed = 0;
        const target = WORLD_DAY_MS * 1.5;
        while (elapsed < target) {
          const duration = Math.min(chunk, target - elapsed);
          clock.update(duration, (duration, climate) =>
            farms.advance(duration, climate, () => ({ greenhouse: true })),
          );
          elapsed += duration;
        }
        farms.flush(() => ({ greenhouse: true }));
        return farms.cells('0,0,0')[0]!;
      };
      const reference = simulate(250),
        actual = simulate(1000 / fps);
      expect(actual.moisture).toBeCloseTo(reference.moisture, 7);
      expect(actual.crop!.progress).toBeCloseTo(reference.crop!.progress, 7);
      expect(actual.crop!.health).toBeCloseTo(reference.crop!.health, 7);
      expect(actual.crop!.stage).toBe(reference.crop!.stage);
    },
  );
  it('does no per-plot integration on individual browser frames, even with 1,000 plots', () => {
    const farms = new FarmingState(),
      clock = atmosphere();
    for (let room = 0; room < 20; room++)
      for (let index = 0; index < (room === 0 ? 200 : room <= 2 ? 43 : 42); index++) {
        const cell = farms.till(
          `${room},0,0`,
          'verdigris-basin',
          index % 20,
          Math.floor(index / 20),
          'loam',
        )!;
        farms.plant(cell, 'carrot', 'owner');
      }
    expect(farms.diagnostics().plots).toBe(1000);
    for (let i = 0; i < 30; i++) farms.advance(16, clock.getState(), () => ({ greenhouse: false }));
    expect(farms.diagnostics().integratedCells).toBe(0);
    farms.advance(520, clock.getState(), () => ({ greenhouse: false }));
    expect(farms.diagnostics().integratedCells).toBe(1000);
    expect(farms.projection(['0,0,0'], 'owner').rooms[0]?.cells).toHaveLength(200);
    expect(farms.projection(['0,0,0'], 'owner').rooms).toHaveLength(1);
  });
  it('bounds seeded multi-season growth, repeated regrowth and malformed numeric saves', () => {
    const rng = createRng('farm-fuzz'),
      farms = new FarmingState(),
      clock = atmosphere();
    for (let i = 0; i < 20; i++) {
      const cell = farms.till('0,0,0', 'verdigris-basin', i, 5, 'loam')!;
      farms.plant(cell, CROPS[i]?.id ?? 'radish', 'owner');
    }
    for (let action = 0; action < 300; action++) {
      const index = Math.floor(rng() * 20),
        cell = farms.get('0,0,0', index, 5)!;
      cell.moisture = Math.min(100, cell.moisture + 50);
      cell.fertility = Math.min(100, cell.fertility + 25);
      if (
        cell.crop?.stage === 'ready' &&
        CROPS.find((crop) => crop.id === cell.crop?.cropId)?.regrowDays
      ) {
        cell.crop.progress = 0;
        cell.crop.stage = 'young';
        cell.crop.regrowCount++;
      }
      clock.update(rng() * WORLD_DAY_MS, (duration, climate) =>
        farms.advance(duration, climate, () => ({ greenhouse: true })),
      );
      if (action % 17 === 0)
        farms.load(JSON.parse(JSON.stringify(farms.save())) as FarmingSaveData);
      for (const plot of farms.cells('0,0,0')) {
        for (const value of [plot.moisture, plot.fertility, plot.weeds, plot.crop?.health ?? 0]) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
        expect(plot.crop!.progress).toBeGreaterThanOrEqual(0);
        expect(plot.crop!.progress).toBeLessThanOrEqual(1);
      }
    }
    const save = farms.save();
    save.rooms[0]!.cells[0]!.x = 999999;
    save.rooms[0]!.cells[1]!.crop!.progress = NaN;
    farms.load(save, { cols: 32, rows: 24 });
    expect(farms.cells('0,0,0')).toHaveLength(19);
    expect(farms.cells('0,0,0').every((cell) => Number.isFinite(cell.crop!.progress))).toBe(true);
  });
});
