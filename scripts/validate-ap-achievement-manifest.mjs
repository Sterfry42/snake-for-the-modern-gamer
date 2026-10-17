import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

const definitionsSrc = read('src/achievements/achievementDefinitions.ts');
const mappingSrc = read('src/achievements/achievementApMapping.ts');
const manifestSrc = read('src/archipelago/archipelagoCheckManifest.ts');
const cardsSrc = read('src/cards/cardGame.ts');
const locationsPy = read('apworld/snaked_revised_revamped/locations.py');
const itemsPy = read('apworld/snaked_revised_revamped/items.py');

function fail(message) {
  throw new Error(`Archipelago manifest drift: ${message}`);
}

// ── Parse CARD_TABLES so loop-generated Card Sharp achievements get real ids.
const cardTablesBlock = cardsSrc.match(/export const CARD_TABLES[^\[]*\[([\s\S]*?)\n\]/);
if (!cardTablesBlock) fail('could not find CARD_TABLES in cardGame.ts');
const cardTables = [...cardTablesBlock[1].matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'/g)].map(
  ([, id, name]) => ({ id, name }),
);
if (cardTables.length === 0) fail('could not parse CARD_TABLES entries');

// ── Parse every achievement definition block, in file order.
function achievementKey(id) {
  return `achievement_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

function parseUnescaped(raw) {
  return raw[0] === "'" ? raw.slice(1, -1).replace(/\\'/g, "'") : raw.slice(1, -1);
}

const definitionStarts = [...definitionsSrc.matchAll(/\bd\(\{/g)];
if (definitionStarts.length < 40) {
  fail(`expected the achievement catalog, found ${definitionStarts.length} definitions`);
}
const definitions = [];
for (let i = 0; i < definitionStarts.length; i += 1) {
  const chunkStart = definitionStarts[i].index;
  const chunkEnd = i + 1 < definitionStarts.length ? definitionStarts[i + 1].index : definitionsSrc.length;
  const chunk = definitionsSrc.slice(chunkStart, chunkEnd);
  const apEnabled = /archipelago:\s*ap\b/.test(chunk);
  const idMatch = chunk.match(/id:\s*(?:'([^']+)'|`([^`]*)`)/);
  if (!idMatch) fail(`could not parse achievement id in block at offset ${chunkStart}`);
  if (idMatch[2] !== undefined) {
    const nameMatch = chunk.match(/name:\s*`([^`]*)`/);
    if (!nameMatch) fail(`template achievement ${idMatch[2]} has no template name`);
    for (const table of cardTables) {
      definitions.push({
        id: idMatch[2].replace('${table.id}', table.id),
        name: nameMatch[1].replace('${table.name}', table.name),
        apEnabled,
      });
    }
    continue;
  }
  const nameMatch = chunk.match(/name:\s*('(?:\\.|[^']*)'|"([^"]*)")/);
  if (!nameMatch) fail(`could not parse achievement name for ${idMatch[1]}`);
  definitions.push({ id: idMatch[1], name: parseUnescaped(nameMatch[1]), apEnabled });
}

// ── Reproduce the browser AP ordering: enabled definitions in file order,
// with the appended ids moved to the tail (see achievementApMapping.ts).
const disabledBlock = definitionsSrc.match(/DISABLED_ACHIEVEMENT_IDS = new Set<string>\(\[([\s\S]*?)\]\)/);
const disabled = new Set(
  disabledBlock ? [...disabledBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]) : [],
);
const appendedBlock = mappingSrc.match(/APPENDED_ACHIEVEMENT_IDS = \[([\s\S]*?)\] as const/);
if (!appendedBlock) fail('could not find APPENDED_ACHIEVEMENT_IDS');
const appended = [...appendedBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

const enabled = definitions.filter((definition) => definition.apEnabled && !disabled.has(definition.id));
const enabledById = new Map(enabled.map((definition) => [definition.id, definition]));
const expected = [
  ...enabled.filter((definition) => !appended.includes(definition.id)),
  ...appended.filter((id) => enabledById.has(id)).map((id) => enabledById.get(id)),
];
if (expected.length === 0) fail('no AP-enabled achievements resolved from definitions');

// ── Parse the Python ACHIEVEMENT_LOCATIONS table in order.
const pythonBlock = locationsPy.match(/ACHIEVEMENT_LOCATIONS = \[([\s\S]*?)\n\]/);
if (!pythonBlock) fail('could not find ACHIEVEMENT_LOCATIONS in locations.py');
const pythonEntries = [...pythonBlock[1].matchAll(/^\s*\("([^"]+)",\s*"((?:[^"\\]|\\.)*)"\),?/gm)].map(
  ([, key, name]) => ({ key, name }),
);

if (pythonEntries.length !== expected.length) {
  fail(`locations.py lists ${pythonEntries.length} achievements, browser expects ${expected.length}`);
}
expected.forEach((definition, index) => {
  const key = achievementKey(definition.id);
  const python = pythonEntries[index];
  if (python.key !== key || python.name !== definition.name) {
    fail(
      `achievement order drift at index ${index}: browser ${key} (${definition.name}) vs python ${python.key} (${python.name})`,
    );
  }
});

// ── Structural checks: stable id base, goal location, goal id.
if (!/912001000 \+ index/.test(locationsPy)) fail('achievement id base (912001000 + index) is missing');
if (!/location_table\["Achievement Percentage Goal"\] = 912009999/.test(locationsPy)) {
  fail('achievement goal location id (912009999) is stale');
}
const goalLocation = manifestSrc.match(
  /AP_ACHIEVEMENT_GOAL_LOCATION[^=]*=\s*\{[^}]*name:\s*'([^']+)'[^}]*id:\s*(\d+)/,
);
if (!goalLocation) fail('could not parse AP_ACHIEVEMENT_GOAL_LOCATION');
if (!locationsPy.includes(JSON.stringify(goalLocation[1]))) {
  fail(`goal location name ${goalLocation[1]} is missing from locations.py`);
}
if (!locationsPy.includes(goalLocation[2])) {
  fail(`goal location id ${goalLocation[2]} is missing from locations.py`);
}

// ── Item contract: every bundle/trap item key, name, and classification must
// match on both sides.
function parseBundleItems(source, blockPattern, notFoundMessage, isPython) {
  const block = source.match(blockPattern);
  if (!block) fail(notFoundMessage);
  const entries = [];
  if (isPython) {
    // Mirror items.py's runtime loop: trap items become classification "trap",
    // everything else falls back to "useful" when unclassified.
    for (const match of block[1].matchAll(/^\s*\("([^"]+)",\s*"([^"]+)",\s*(\d+),\s*(\{[^\n]*\})\),?/gm)) {
      const [, key, name, offset, meta] = match;
      const kind = /"kind":\s*"([^"]+)"/.exec(meta)?.[1];
      entries.push({
        key,
        name,
        offset: Number(offset),
        classification:
          kind === 'trap' ? 'trap' : (/"classification":\s*"([^"]+)"/.exec(meta)?.[1] ?? 'useful'),
      });
    }
    return entries;
  }
  for (const match of block[1].matchAll(
    /item\('([^']+)',\s*'([^']+)',\s*(\d+),\s*\{([\s\S]*?)\}\),/g,
  )) {
    const [, key, name, offset, meta] = match;
    entries.push({
      key,
      name,
      offset: Number(offset),
      classification: /classification:\s*'([^']+)'/.exec(meta)?.[1] ?? 'useful',
    });
  }
  return entries;
}

const pythonItems = parseBundleItems(
  itemsPy,
  /bundle_and_trap_items = \[([\s\S]*?)\n\]/,
  'could not find bundle_and_trap_items in items.py',
  true,
);
const browserItems = parseBundleItems(
  manifestSrc,
  /AP_PHASE_2_BUNDLE_AND_TRAP_ITEMS = \[([\s\S]*?)\n\] as const/,
  'could not find AP_PHASE_2_BUNDLE_AND_TRAP_ITEMS in archipelagoCheckManifest.ts',
  false,
);
if (pythonItems.length === 0 || browserItems.length === 0) {
  fail('could not parse bundle/trap items on both sides');
}
if (pythonItems.length !== browserItems.length) {
  fail(
    `items.py lists ${pythonItems.length} bundle/trap items, browser manifest lists ${browserItems.length}`,
  );
}
browserItems.forEach((browserItem, index) => {
  const pythonItem = pythonItems[index];
  if (
    pythonItem.key !== browserItem.key ||
    pythonItem.name !== browserItem.name ||
    pythonItem.offset !== browserItem.offset ||
    pythonItem.classification !== browserItem.classification
  ) {
    fail(
      `bundle/trap item drift at index ${index}: browser ${browserItem.key} (${browserItem.classification}) vs python ${pythonItem.key} (${pythonItem.classification})`,
    );
  }
});

console.log(
  `Validated ${expected.length} synchronized achievement locations and ${browserItems.length} bundle/trap items.`,
);
