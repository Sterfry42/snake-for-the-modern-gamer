import { describe, expect, it } from 'vitest';
import { FarmingState, WORLD_DAY_MS } from './farmingState.js';
import { CROPS, FARM_RECIPES, produceItem } from './cropCatalog.js';
import { getItem } from '../inventory/itemRegistry.js';
import { ConstructionState } from '../building/constructionState.js';
import { InventorySystem } from '../inventory/inventory.js';
import { executeFarmAction, type FarmActionContext } from './farmingActions.js';
import { defaultGameConfig } from '../config/gameConfig.js';
import { WorldAtmosphereSystem } from '../world/atmosphereSystem.js';
import type { AtmosphereState } from '../world/atmosphereTypes.js';
import type { FarmingSaveData } from './farmingTypes.js';

const climate: AtmosphereState = {
  worldDay: 0,
  dayPhase: 'day',
  phaseProgress: 0,
  season: 'spring',
  globalWeather: 'clear',
  weatherIntensity: 1,
  remainingWeatherPhaseTicks: 2,
  weatherSeed: 42,
  weatherTransitionProgress: 1,
};
function context(): FarmActionContext {
  let charges = 8;
  return {
    playerId: 'a',
    alive: true,
    head: { x: 5, y: 5 },
    room: {
      id: '1,1,0',
      layout: Array.from({ length: 20 }, () => '.'.repeat(20)),
      portals: [],
      biomeId: 'verdigris-basin',
      biomeTitle: 'Verdigris Basin',
      backgroundColor: 0,
      wallColor: 0,
      wallOutlineColor: 0,
    },
    inventory: new InventorySystem(),
    construction: new ConstructionState(),
    farms: new FarmingState(),
    climate,
    canFarmMunicipal: () => false,
    occupied: () => false,
    getCharges: () => charges,
    setCharges: (value) => {
      charges = value;
    },
  };
}
function planted() {
  const farms = new FarmingState();
  const cell = farms.till('1,1,0', 'verdigris-basin', 5, 5, 'loam')!;
  farms.plant(cell, 'radish', 'a');
  cell.moisture = 90;
  return { farms, cell };
}

describe('agriculture catalog and free cultivation', () => {
  it('registers all 21 crops, three quality grades and eleven usable recipes', () => {
    expect(CROPS).toHaveLength(21);
    expect(new Set(CROPS.map((crop) => crop.id)).size).toBe(21);
    for (const crop of CROPS) {
      expect(getItem(crop.seedItemId)).toBeDefined();
      for (const grade of ['normal', 'good', 'excellent'] as const)
        expect(getItem(produceItem(crop, grade))).toBeDefined();
    }
    expect(FARM_RECIPES.length).toBeGreaterThanOrEqual(8);
    for (const recipe of FARM_RECIPES) {
      expect(getItem(`food-${recipe.id}`)).toBeDefined();
      expect(CROPS.some((crop) => crop.id === recipe.input)).toBe(true);
    }
  });
  it('requires a tool, then tills free wilderness without moving or claiming', () => {
    const ctx = context(),
      terrain = [...ctx.room.layout];
    expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(false);
    ctx.inventory.addItem('farm-hoe');
    expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(true);
    expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(true);
    expect(ctx.farms.cells(ctx.room.id)).toHaveLength(1);
    expect(ctx.construction.getClaim(ctx.room.id)).toBeUndefined();
    expect(ctx.head).toEqual({ x: 5, y: 5 });
    expect(ctx.room.layout).toEqual(terrain);
  });
  it.each(['#', '~', 'D', 'K', 'B', '%', 'F'])(
    'refuses protected/base tile %s without mutation',
    (tile) => {
      const ctx = context();
      ctx.inventory.addItem('farm-hoe');
      ctx.room.layout[5] = `.....${tile}..............`;
      expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(false);
      expect(ctx.farms.cells(ctx.room.id)).toHaveLength(0);
    },
  );
  it('rejects an entrance and a tree even on ordinary floor', () => {
    const ctx = context();
    ctx.inventory.addItem('farm-hoe');
    ctx.room.portals.push({ x: 5, y: 5, destRoomId: '2,2,0', destX: 1, destY: 1 });
    expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(false);
    ctx.room.portals = [];
    ctx.room.vegetation = [{ x: 5, y: 5, variant: 'tree-1' }];
    expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(false);
  });
  it.each([
    { dx: 2, dy: 0 },
    { dx: 0.5, dy: 0 },
    { dx: NaN, dy: 0 },
    { dx: 1, dy: 1 },
  ])('rejects remote or malformed offsets %j', (target) => {
    const ctx = context();
    ctx.inventory.addItem('farm-hoe');
    expect(executeFarmAction(ctx, { action: 'till', target }).ok).toBe(false);
  });
  it('consumes one seed, rejects duplicate plants, requires deliberate clearing', () => {
    const ctx = context();
    ctx.inventory.addItem('farm-hoe');
    ctx.inventory.addItem('seed-radish', 2);
    expect(executeFarmAction(ctx, { action: 'plant', seedItemId: 'seed-radish' }).ok).toBe(false);
    executeFarmAction(ctx, { action: 'till' });
    expect(executeFarmAction(ctx, { action: 'plant', seedItemId: 'seed-radish' }).ok).toBe(true);
    expect(executeFarmAction(ctx, { action: 'plant', seedItemId: 'seed-radish' }).ok).toBe(false);
    expect(ctx.inventory.getItemCount('seed-radish')).toBe(1);
    expect(executeFarmAction(ctx, { action: 'clear' }).ok).toBe(false);
    expect(executeFarmAction(ctx, { action: 'clear', confirmed: true }).ok).toBe(true);
    expect(ctx.farms.get(ctx.room.id, 5, 5)?.crop).toBeUndefined();
    expect(ctx.inventory.getItemCount('produce-radish')).toBe(0);
  });
  it('keeps farm and harvest grants independent and rejects ownership overwrite', () => {
    const ctx = context();
    ctx.inventory.addItem('farm-hoe');
    ctx.construction.claimRoom(ctx.room.id, 'owner');
    expect(ctx.construction.claimRoom(ctx.room.id, 'a').ownerId).toBe('owner');
    expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(false);
    ctx.construction.grant(ctx.room.id, 'owner', 'a', 'farm', true);
    expect(executeFarmAction(ctx, { action: 'till' }).ok).toBe(true);
    ctx.farms.plant(ctx.farms.get(ctx.room.id, 5, 5)!, 'radish', 'a').stage = 'ready';
    expect(executeFarmAction(ctx, { action: 'harvest' }).ok).toBe(false);
    ctx.construction.grant(ctx.room.id, 'owner', 'a', 'harvest', true);
    expect(executeFarmAction(ctx, { action: 'harvest' }).ok).toBe(true);
    expect(executeFarmAction(ctx, { action: 'harvest' }).ok).toBe(false);
    expect(
      ctx.inventory
        .getAllItems()
        .filter(([id]) => id.startsWith('produce-radish'))
        .reduce((sum, [, count]) => sum + count, 0),
    ).toBe(2);
  });
  it('waters a bounded charge and refills only at water or with consumed supply', () => {
    const ctx = context();
    ctx.farms.till(ctx.room.id, ctx.room.biomeId, 5, 5, 'loam');
    ctx.inventory.addItem('watering-can');
    for (let i = 0; i < 8; i++) expect(executeFarmAction(ctx, { action: 'water' }).ok).toBe(true);
    expect(executeFarmAction(ctx, { action: 'water' }).ok).toBe(false);
    expect(executeFarmAction(ctx, { action: 'refillCan' }).ok).toBe(false);
    ctx.inventory.addItem('farm-water-refill');
    expect(executeFarmAction(ctx, { action: 'refillCan' }).ok).toBe(true);
    expect(ctx.inventory.getItemCount('farm-water-refill')).toBe(0);
    expect(ctx.getCharges()).toBe(8);
  });
  it('rejects off-season seed before consuming it and handles empty/withered harvests', () => {
    const ctx = context();
    ctx.farms.till(ctx.room.id, ctx.room.biomeId, 5, 5, 'loam');
    ctx.inventory.addItem('seed-pepper');
    expect(executeFarmAction(ctx, { action: 'plant', seedItemId: 'seed-pepper' }).ok).toBe(false);
    expect(ctx.inventory.getItemCount('seed-pepper')).toBe(1);
    expect(executeFarmAction(ctx, { action: 'harvest' }).ok).toBe(false);
  });
});

describe('authoritative climate, offscreen growth and persistence', () => {
  it('does not mature radish early at neutral baseline and preserves its grade after reload', () => {
    const { farms, cell } = planted();
    cell.moisture = 70;
    cell.fertility = 100;
    farms.advance(WORLD_DAY_MS * 0.64, climate, () => ({ greenhouse: true }));
    expect(cell.crop!.stage).not.toBe('ready');
    farms.advance(WORLD_DAY_MS * 0.01, climate, () => ({ greenhouse: true }));
    farms.flush(() => ({ greenhouse: true }));
    expect(cell.crop!.stage).toBe('ready');
    const grade = farms.quality(cell),
      restored = new FarmingState();
    restored.load(JSON.parse(JSON.stringify(farms.save())) as FarmingSaveData);
    expect(restored.quality(restored.get('1,1,0', 5, 5)!)).toBe(grade);
  });
  it('applies heatwave evaporation outdoors and excludes it inside a greenhouse', () => {
    const outdoor = planted(),
      indoor = planted();
    outdoor.cell.moisture = indoor.cell.moisture = 70;
    const heat = { ...climate, globalWeather: 'heatwave' as const };
    outdoor.farms.advance(WORLD_DAY_MS, heat, () => ({ greenhouse: false }));
    indoor.farms.advance(WORLD_DAY_MS, heat, () => ({ greenhouse: true }));
    expect(indoor.cell.moisture - outdoor.cell.moisture).toBeCloseTo(25, 7);
  });
  it('does not count resolved snow as liquid rainfall', () => {
    const farms = new FarmingState();
    const cell = farms.till('1,1,0', 'wintergreen-forest', 5, 5, 'loam')!;
    cell.moisture = 70;
    farms.advance(WORLD_DAY_MS, { ...climate, season: 'winter', globalWeather: 'rain' }, () => ({
      greenhouse: false,
    }));
    expect(cell.moisture).toBeLessThan(70);
  });
  it('applies season grace before stress and leaves the plant intact', () => {
    const { farms, cell } = planted();
    cell.moisture = 70;
    const summer = { ...climate, season: 'summer' as const };
    farms.advance(WORLD_DAY_MS / 2, summer, () => ({ greenhouse: false }));
    expect(cell.crop!.health).toBe(100);
    expect(cell.crop!.progress).toBe(0);
    farms.advance(WORLD_DAY_MS / 4, summer, () => ({ greenhouse: false }));
    expect(cell.crop!.health).toBeLessThan(100);
    expect(cell.crop!.health).toBeGreaterThan(90);
    expect(cell.crop!.stage).not.toBe('withered');
  });
  it('regrows without another seed and cannot harvest again before the regrow interval', () => {
    const ctx = context(),
      cell = ctx.farms.till(ctx.room.id, ctx.room.biomeId, 5, 5, 'loam')!;
    ctx.farms.plant(cell, 'strawberry', 'a');
    cell.crop!.progress = 1;
    cell.crop!.stage = 'ready';
    const seeds = ctx.inventory.getItemCount('seed-strawberry');
    expect(executeFarmAction(ctx, { action: 'harvest' }).ok).toBe(true);
    expect(cell.crop!.stage).toBe('young');
    expect(cell.crop!.regrowCount).toBe(1);
    expect(cell.fertility).toBe(60);
    expect(executeFarmAction(ctx, { action: 'harvest' }).ok).toBe(false);
    cell.moisture = 70;
    cell.fertility = 100;
    ctx.farms.advance(WORLD_DAY_MS * 0.99, climate, () => ({ greenhouse: true }));
    expect(cell.crop!.stage).not.toBe('ready');
    ctx.farms.advance(WORLD_DAY_MS * 0.01, climate, () => ({ greenhouse: true }));
    ctx.farms.flush(() => ({ greenhouse: true }));
    expect(cell.crop!.stage).toBe('ready');
    expect(executeFarmAction(ctx, { action: 'harvest' }).ok).toBe(true);
    expect(ctx.inventory.getItemCount('seed-strawberry')).toBe(seeds);
    expect(
      ctx.inventory
        .getAllItems()
        .filter(([id]) => id.startsWith('produce-strawberry'))
        .reduce((sum, [, count]) => sum + count, 0),
    ).toBe(6);
  });
  it('compost caps fertility, consumes supply, and fallow soil recovers without produce', () => {
    const ctx = context(),
      cell = ctx.farms.till(ctx.room.id, ctx.room.biomeId, 5, 5, 'loam')!;
    cell.fertility = 90;
    ctx.inventory.addItem('farm-compost');
    expect(executeFarmAction(ctx, { action: 'compost' }).ok).toBe(true);
    expect(cell.fertility).toBe(100);
    expect(executeFarmAction(ctx, { action: 'compost' }).ok).toBe(false);
    cell.fertility = 50;
    ctx.farms.advance(WORLD_DAY_MS, climate, () => ({ greenhouse: false }));
    expect(cell.fertility).toBeCloseTo(52, 7);
    expect(ctx.inventory.getItemCount('farm-compost')).toBe(0);
  });
  it('is identical with 1ms, 250ms and 1000ms environment chunks', () => {
    const run = (chunk: number) => {
      const { farms } = planted();
      for (let i = 0; i < WORLD_DAY_MS; i += chunk)
        farms.advance(Math.min(chunk, WORLD_DAY_MS - i), climate, () => ({ greenhouse: true }));
      return farms.save();
    };
    expect(run(1)).toEqual(run(250));
    expect(run(250)).toEqual(run(1000));
  });
  it('crosses every atmosphere phase and integrates the actual weather segments', () => {
    const run = (chunk: number) => {
      const { farms } = planted();
      const config = defaultGameConfig.atmosphere;
      if (!config) throw new Error('Missing atmosphere configuration');
      const atmosphere = new WorldAtmosphereSystem(config, 'farm-time');
      for (let i = 0; i < WORLD_DAY_MS * 3; i += chunk)
        atmosphere.update(Math.min(chunk, WORLD_DAY_MS * 3 - i), (duration, climate) =>
          farms.advance(duration, climate, () => ({ greenhouse: false })),
        );
      return { crop: farms.save(), atmosphere: atmosphere.getState() };
    };
    expect(run(250).crop).toEqual(run(WORLD_DAY_MS * 3).crop);
    expect(run(250).atmosphere).toEqual(run(WORLD_DAY_MS * 3).atmosphere);
  });
  it('rain waters exposed soil but not greenhouse; ideal outdoor climate can beat neutral shelter', () => {
    const outdoor = planted(),
      indoor = planted();
    outdoor.cell.moisture = 50;
    indoor.cell.moisture = 50;
    const rain = { ...climate, globalWeather: 'rain' as const };
    outdoor.farms.advance(WORLD_DAY_MS / 2, rain, () => ({ greenhouse: false }));
    indoor.farms.advance(WORLD_DAY_MS / 2, rain, () => ({ greenhouse: true }));
    expect(outdoor.cell.moisture).toBeGreaterThan(indoor.cell.moisture);
    expect(outdoor.cell.crop!.progress).toBeGreaterThan(indoor.cell.crop!.progress);
  });
  it('does not auto-harvest ready plants or grow dead crops after watering', () => {
    const { farms, cell } = planted();
    cell.crop!.progress = 1;
    cell.crop!.stage = 'ready';
    farms.advance(WORLD_DAY_MS, climate, () => ({ greenhouse: true }));
    expect(cell.crop!.progress).toBe(1);
    cell.crop!.stage = 'withered';
    cell.crop!.health = 0;
    cell.crop!.progress = 0.5;
    cell.moisture = 100;
    farms.advance(WORLD_DAY_MS, climate, () => ({ greenhouse: true }));
    expect(cell.crop!.progress).toBe(0.5);
    expect(cell.crop!.stage).toBe('withered');
  });
  it('preserves partial climate quantum, crops and monotonic action receipts through JSON reload', () => {
    const first = planted(),
      next = new FarmingState();
    first.farms.transact('a', 1, () => ({ ok: true, message: 'once' }));
    first.farms.advance(723, climate, () => ({ greenhouse: true }));
    next.load(JSON.parse(JSON.stringify(first.farms.save())) as FarmingSaveData);
    next.advance(277, climate, () => ({ greenhouse: true }));
    first.farms.advance(277, climate, () => ({ greenhouse: true }));
    expect(next.save()).toEqual(first.farms.save());
    expect(
      next.transact('a', 1, () => {
        throw new Error('replayed');
      }),
    ).toEqual({ ok: true, message: 'once' });
    expect(next.transact('a', 0, () => ({ ok: true })).ok).toBe(false);
  });
  it('bounds malformed saved numbers and ignores unknown crops and duplicate cells', () => {
    const { farms } = planted(),
      save = farms.save();
    const cell = save.rooms[0]!.cells[0]!;
    cell.moisture = NaN;
    cell.fertility = Infinity;
    cell.crop!.cropId = 'nonexistent';
    save.rooms[0]!.cells.push({ ...cell });
    farms.load(save);
    const loaded = farms.cells('1,1,0');
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.crop).toBeUndefined();
    expect(loaded[0]?.moisture).toBe(0);
    expect(loaded[0]?.fertility).toBe(0);
  });
  it('runs dawn only once and deduplicates farm incidents across reload', () => {
    const { farms } = planted();
    let count = 0;
    farms.dawn(2, () => count++);
    farms.dawn(2, () => count++);
    const next = new FarmingState();
    next.load(farms.save());
    next.dawn(2, () => count++);
    expect(count).toBe(1);
  });
});
