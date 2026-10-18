import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AP_ACHIEVEMENT_GOAL_LOCATION,
  AP_ACHIEVEMENT_LOCATIONS,
  AP_ALL_ITEM_LIST,
} from '../archipelagoCheckManifest.js';
import {
  apWorldLocationCatalog,
  generateItemsPython,
  generateLocationsPython,
} from '../apWorldCodegen.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const worldDir = path.resolve(here, '../../../apworld/snaked_revised_revamped');
const locationsPath = path.join(worldDir, 'locations.py');
const itemsPath = path.join(worldDir, 'items.py');

const isWriteMode = process.env.AP_CODEGEN_WRITE === '1';

describe('AP world codegen freshness', () => {
  it('keeps apworld locations.py in sync with the browser manifest', () => {
    const generated = generateLocationsPython();
    if (isWriteMode) writeFileSync(locationsPath, generated);
    expect(readFileSync(locationsPath, 'utf8')).toBe(generated);
  });

  it('keeps apworld items.py in sync with the browser manifest', () => {
    const generated = generateItemsPython();
    if (isWriteMode) writeFileSync(itemsPath, generated);
    expect(readFileSync(itemsPath, 'utf8')).toBe(generated);
  });
});

function unescape(value: string): string {
  return value.replace(/\\(.)/g, '$1');
}

function parsePyDictBlock(source: string, header: string): Map<string, string> {
  const start = source.indexOf(header);
  expect(start, `missing ${header}`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf('{', start);
  const close = source.indexOf('\n}', open);
  const block = source.slice(open + 1, close);
  const entries = new Map<string, string>();
  for (const match of block.matchAll(
    /^\s*"((?:[^"\\]|\\.)*)": ("((?:[^"\\]|\\.)*)"|(\d+)|(\{[^\n]*\}))\s*,\s*$/gm,
  )) {
    const value = match[3] !== undefined ? unescape(match[3]) : (match[4] ?? match[5]);
    entries.set(unescape(match[1]), value);
  }
  return entries;
}

function parsePyTupleBlock(source: string, header: string): Array<[string, string]> {
  const start = source.indexOf(header);
  expect(start, `missing ${header}`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf('[', start);
  const close = source.indexOf('\n]', open);
  const block = source.slice(open + 1, close);
  return [...block.matchAll(/^\s*\("((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\),?$/gm)].map(
    (match) => [unescape(match[1]), unescape(match[2])] as [string, string],
  );
}

describe('AP world codegen round trip', () => {
  it('emits the achievement table in manifest order with manifest ids', () => {
    const python = generateLocationsPython();
    const emitted = parsePyTupleBlock(python, 'ACHIEVEMENT_LOCATIONS = [');
    expect(emitted).toEqual(
      AP_ACHIEVEMENT_LOCATIONS.map((location) => [location.key, location.name] as [string, string]),
    );
  });

  it('emits every catalog location with its manifest id', () => {
    const python = generateLocationsPython();
    const table = parsePyDictBlock(python, 'location_table = {');
    const catalog = apWorldLocationCatalog();
    expect(table.size).toBe(catalog.length);
    for (const location of catalog) {
      expect(table.get(location.name), `location ${location.key}`).toBe(String(location.id));
    }
    const keyToName = parsePyDictBlock(python, 'location_key_to_name = {');
    expect(keyToName.size).toBe(catalog.length);
    for (const location of catalog) {
      expect(keyToName.get(location.key), `location ${location.key}`).toBe(location.name);
    }
    expect(
      parsePyDictBlock(python, 'location_table = {').get(AP_ACHIEVEMENT_GOAL_LOCATION.name),
    ).toBe(String(AP_ACHIEVEMENT_GOAL_LOCATION.id));
  });

  it('emits every item with its manifest id, key, and metadata', () => {
    const python = generateItemsPython();
    const table = parsePyDictBlock(python, 'item_table = {');
    const keyToName = parsePyDictBlock(python, 'item_key_to_name = {');
    expect(table.size).toBe(AP_ALL_ITEM_LIST.length);
    expect(keyToName.size).toBe(AP_ALL_ITEM_LIST.length);
    for (const item of AP_ALL_ITEM_LIST) {
      expect(table.get(item.name), `item ${item.key}`).toBe(String(item.id));
      expect(keyToName.get(item.key), `item ${item.key}`).toBe(item.name);
    }
  });

  it('emits item metadata that matches the manifest item definitions', () => {
    const python = generateItemsPython();
    const metadata = parsePyDictBlock(python, 'item_metadata = {');
    expect(metadata.size).toBe(AP_ALL_ITEM_LIST.length);
    for (const item of AP_ALL_ITEM_LIST) {
      const raw = metadata.get(item.name);
      expect(raw, `metadata for ${item.key}`).toBeDefined();
      const fields = new Map<string, string>();
      for (const match of (raw ?? '').matchAll(/"((?:[^"\\]|\\.)*)": ("(?:[^"\\]|\\.)*"|\d+)/g)) {
        const token = match[2];
        const value = token.startsWith('"') ? unescape(token.slice(1, -1)) : token;
        fields.set(unescape(match[1]), value);
      }
      expect(fields.get('kind'), `kind for ${item.key}`).toBe(item.kind);
      expect(fields.get('classification'), `classification for ${item.key}`).toBe(
        item.classification ?? 'useful',
      );
      if (item.kind === 'score-bundle' || item.kind === 'length-bundle') {
        expect(fields.get('amount'), `amount for ${item.key}`).toBe(String(item.amount ?? 0));
      }
      if (item.itemId !== undefined) expect(fields.get('item_id')).toBe(item.itemId);
      if (item.cardId !== undefined) expect(fields.get('card_id')).toBe(item.cardId);
      if (item.artifactId !== undefined) expect(fields.get('artifact_id')).toBe(item.artifactId);
      if (item.trapId !== undefined) expect(fields.get('trap_id')).toBe(item.trapId);
    }
  });
});
