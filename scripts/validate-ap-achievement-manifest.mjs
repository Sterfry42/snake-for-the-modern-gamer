import { readFileSync } from 'node:fs';

const definitions = readFileSync('src/achievements/achievementDefinitions.ts', 'utf8');
const cards = readFileSync('src/cards/cardGame.ts', 'utf8');
const python = readFileSync('apworld/snaked_revised_revamped/locations.py', 'utf8');
const entries = [...definitions.matchAll(/d\(\{\s*id: '([^']+)',\s*name: (?:'([^']+)'|"([^"]+)")/g)].map(
  ([, id, singleName, doubleName]) => ({
    key: `achievement_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    name: singleName ?? doubleName,
  }),
);
for (const [, id, name] of cards.matchAll(
  /\{\s*id: '(porch-table|market-table|dennis-dare)',\s*name: '([^']+)'/g,
)) {
  entries.push({
    key: `achievement_cards_win_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    name: `Card Sharp: ${name}`,
  });
}

if (entries.length < 40) throw new Error(`Expected the achievement catalog, found ${entries.length}`);
for (const entry of entries) {
  if (!python.includes(JSON.stringify(entry.key)) || !python.includes(JSON.stringify(entry.name))) {
    throw new Error(`Python AP manifest is missing ${entry.key}: ${entry.name}`);
  }
}
if (!python.includes('912009999')) throw new Error('Python achievement goal ID is stale');
console.log(`Validated ${entries.length} synchronized achievement locations.`);
