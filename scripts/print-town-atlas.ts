import { createHeadlessScenario } from '../src/test/headless/headlessScenario.js';
import { renderTownAtlas } from '../src/test/headless/townAtlas.js';
import type { RoomSnapshot } from '../src/world/types.js';

const seed = process.argv[2] ?? 'town-atlas-preview';
const radius = Number(process.argv[3] ?? 12);
const scenario = createHeadlessScenario({ seed });
const rooms = generatedTownRooms(radius);
const byTownId = new Map<string, RoomSnapshot[]>();

for (const room of rooms) {
  if (!room.town) continue;
  byTownId.set(room.town.id, [...(byTownId.get(room.town.id) ?? []), room]);
}

if (byTownId.size === 0) {
  console.log(`No generated towns found for seed "${seed}" within radius ${radius}.`);
  process.exit(1);
}

for (const [townId, townRooms] of byTownId) {
  const townName = townRooms.find((room) => room.town)?.town?.name ?? townId;
  console.log(`# ${townName} (${townId})`);
  console.log(renderTownAtlas(townRooms));
  console.log('');
}

function generatedTownRooms(searchRadius: number): RoomSnapshot[] {
  const result: RoomSnapshot[] = [];
  for (let y = -searchRadius; y <= searchRadius; y += 1) {
    for (let x = -searchRadius; x <= searchRadius; x += 1) {
      const room = scenario.getRoom(`${x},${y},0`);
      if (room.town) {
        result.push(room);
      }
    }
  }
  return result;
}
