import { runMovementTurnScenario } from '../src/test/movementTurnScenario.js';

const results = [];
for (const grace of [false, true]) {
  for (const interval of [50, 70, 100, 126, 200]) {
    const samples = [];
    for (const offset of [-1, 1])
      for (const latency of [0, 15, 35, 65])
        samples.push(await runMovementTurnScenario(interval, offset, latency, grace));
    results.push({
      grace,
      interval,
      turns: samples.length,
      disagreements: samples.filter((sample) => sample.correctionTiles > 0).length,
      maximumCorrectionTiles: Math.max(...samples.map((sample) => sample.correctionTiles)),
      samples,
    });
  }
}
console.info(JSON.stringify(results, null, 2));
