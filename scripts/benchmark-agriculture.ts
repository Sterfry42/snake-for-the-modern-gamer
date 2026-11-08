import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { FarmingState } from '../src/farming/farmingState.js';
import { WorldAtmosphereSystem } from '../src/world/atmosphereSystem.js';
import { defaultGameConfig } from '../src/config/gameConfig.js';

const config = defaultGameConfig.atmosphere;
if (!config) throw new Error('Missing atmosphere config');
const climate = new WorldAtmosphereSystem(config, 'farm-benchmark').getState();
function fixture(populated: boolean) {
  const farms = new FarmingState();
  if (populated) for (let room = 0; room < 20; room++) {
    const count = room === 0 ? 200 : room <= 2 ? 43 : 42;
    for (let i = 0; i < count; i++) {
      const cell = farms.till(`${room},0,0`, 'verdigris-basin', i % 20, Math.floor(i / 20), 'loam');
      if (!cell) throw new Error('Plot capacity exceeded');
      farms.plant(cell, 'carrot', 'owner');
      cell.moisture = 70;
    }
  }
  return farms;
}
function measure(populated: boolean, operation: 'frames' | 'projection') {
  const samples: number[] = [];
  let scans = 0, bytes = 0;
  for (let repetition = 0; repetition < 9; repetition++) {
    const farms = fixture(populated);
    const start = performance.now();
    if (operation === 'frames') {
      for (let frame = 0; frame < 600; frame++) farms.advance(1000 / 60, climate, () => ({ greenhouse: false }));
    } else {
      for (let read = 0; read < 100; read++) bytes = JSON.stringify(farms.projection(['0,0,0'], 'owner')).length;
    }
    const elapsed = performance.now() - start;
    scans = farms.diagnostics().integratedCells;
    if (repetition > 1) samples.push(elapsed);
  }
  samples.sort((a,b) => a-b);
  return { medianMs: Number(samples[Math.floor(samples.length / 2)]!.toFixed(3)), integratedCells: scans, visibleProjectionBytes: bytes };
}
const result = {
  measuredAt: new Date().toISOString(), node: process.version,
  scope: 'CPU microbenchmark; empty agriculture baseline versus 1000 plots / 20 rooms / 200 visible. Seven measured repetitions after two warmups. Not browser FPS.',
  tenSeconds600Frames: { empty: measure(false, 'frames'), farm: measure(true, 'frames') },
  hundredVisibleProjections: { empty: measure(false, 'projection'), farm: measure(true, 'projection') },
};
writeFileSync('docs/agriculture-benchmark.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
