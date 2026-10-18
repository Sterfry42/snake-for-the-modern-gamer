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

// ── Shared parser for the generated Python dict literals.
function parseDictBlock(source, header) {
  const start = source.indexOf(header);
  if (start < 0) fail(`could not find ${header} in the generated table`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('\n}', open);
  const block = source.slice(open + 1, close);
  const entries = new Map();
  for (const match of block.matchAll(
    /^\s*"((?:[^"\\]|\\.)*)": ("((?:[^"\\]|\\.)*)"|(\d+)|(\{[^\n]*\}))\s*,\s*$/gm,
  )) {
    const value = match[3] !== undefined ? match[3] : (match[4] ?? match[5]);
    entries.set(match[1], value);
  }
  return entries;
}

// ── Structural checks: stable id base, goal location, goal id.
const locationTable = parseDictBlock(locationsPy, 'location_table = {');
if (locationTable.get('Achievement Percentage Goal') !== '912009999') {
  fail('achievement goal location id (912009999) is stale');
}
pythonEntries.forEach((entry, index) => {
  const id = locationTable.get(entry.name);
  if (id !== String(912001000 + index)) {
    fail(`achievement ${entry.key}: location_table id ${id} != 912001000 + ${index}`);
  }
});
const goalLocation = manifestSrc.match(
  /AP_ACHIEVEMENT_GOAL_LOCATION[^=]*=\s*\{[^}]*name:\s*'([^']+)'[^}]*id:\s*(\d+)/,
);
if (!goalLocation) fail('could not parse AP_ACHIEVEMENT_GOAL_LOCATION');
if (locationTable.get(goalLocation[1]) !== goalLocation[2]) {
  fail(`goal location ${goalLocation[1]} id drifted in locations.py`);
}

// ── Item contract: every bundle/trap item key, name, id, kind, and
// classification must match on both sides.
const itemTable = parseDictBlock(itemsPy, 'item_table = {');
const itemKeyToName = parseDictBlock(itemsPy, 'item_key_to_name = {');
const itemMetadata = parseDictBlock(itemsPy, 'item_metadata = {');
const bundleBlock = manifestSrc.match(/AP_PHASE_2_BUNDLE_AND_TRAP_ITEMS = \[([\s\S]*?)\n\] as const/);
if (!bundleBlock) fail('could not find AP_PHASE_2_BUNDLE_AND_TRAP_ITEMS in archipelagoCheckManifest.ts');
const itemBaseId = Number(
  /AP_PHASE_1_ITEM_BASE_ID = (\d+)/.exec(manifestSrc)?.[1] ?? 913000000,
);
const browserItems = [...bundleBlock[1].matchAll(
  /item\('([^']+)',\s*'([^']+)',\s*(\d+),\s*\{([\s\S]*?)\}\),/g,
)].map((match) => ({
  key: match[1],
  name: match[2],
  id: itemBaseId + Number(match[3]),
  kind: /kind:\s*'([^']+)'/.exec(match[4])?.[1] ?? '',
  classification: /classification:\s*'([^']+)'/.exec(match[4])?.[1] ?? 'useful',
}));
if (browserItems.length === 0) {
  fail('could not parse bundle/trap items in archipelagoCheckManifest.ts');
}
for (const browserItem of browserItems) {
  if (itemKeyToName.get(browserItem.key) !== browserItem.name) {
    fail(`item key ${browserItem.key} does not map to ${browserItem.name} in items.py`);
  }
  if (itemTable.get(browserItem.name) !== String(browserItem.id)) {
    fail(`item ${browserItem.name}: id drift between items.py and the manifest`);
  }
  const meta = itemMetadata.get(browserItem.name) ?? '';
  const metaKind = /"kind":\s*"([^"]+)"/.exec(meta)?.[1];
  const metaClassification = /"classification":\s*"([^"]+)"/.exec(meta)?.[1];
  if (metaKind !== browserItem.kind || metaClassification !== browserItem.classification) {
    fail(
      `item ${browserItem.key}: metadata drift (python kind=${metaKind} classification=${metaClassification} vs browser kind=${browserItem.kind} classification=${browserItem.classification})`,
    );
  }
}

console.log(
  `Validated ${expected.length} synchronized achievement locations and ${browserItems.length} bundle/trap items.`,
);
