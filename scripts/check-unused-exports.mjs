#!/usr/bin/env node

/**
 * Check for unused exports across the codebase.
 *
 * This script finds all exported symbols and checks if they're imported
 * anywhere else in the project using a regex-based approach.
 *
 * Usage: node scripts/check-unused-exports.mjs
 *        node scripts/check-unused-exports.mjs --json  (JSON output)
 */

import { readFile } from 'node:fs/promises';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const SKIP_PATTERNS = [
  /__tests__\//,
  /\.test\./,
  /\.spec\./,
  /node_modules\//,
  /dist\//,
];

/**
 * Parse a TypeScript file for exports.
 */
function findExports(content, filePath) {
  const exports = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // export const/let/var/function/class/interface/type/enum ... name
    const namedMatch = line.match(/export\s+(?:const|let|var|function|class|interface|type|enum|namespace|abstract\s+class)\s+(\w+)/);
    if (namedMatch) {
      exports.push({ name: namedMatch[1], line: i + 1, file: filePath });
    }

    // export { foo, bar }
    const namedListMatch = line.match(/export\s*{([^}]+)}/);
    if (namedListMatch) {
      const items = namedListMatch[1].split(',').map(s => s.trim());
      for (const item of items) {
        const nameMatch = item.match(/\w+/);
        if (nameMatch) {
          exports.push({ name: nameMatch[1], line: i + 1, file: filePath });
        }
      }
    }

    // export default ... (with named function/class)
    const defaultMatch = line.match(/export\s+default\s+(?:function|class)\s+(\w+)/);
    if (defaultMatch) {
      exports.push({ name: defaultMatch[1], line: i + 1, file: filePath, isDefault: true });
    }
  }

  return exports;
}

/**
 * Find all imports of a specific symbol in the codebase.
 */
function findImports(symbol, allFiles) {
  const imports = [];
  const pattern = new RegExp(`\\b${symbol}\\b`);

  for (const file of allFiles) {
    const content = file.content;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line contains an import/export statement referencing the symbol
      if ((line.includes('import') || line.includes('export')) && pattern.test(line)) {
        imports.push({ file: file.relative, line: i + 1 });
      }
    }
  }

  return imports;
}

/**
 * Get all TypeScript files in the project.
 */
async function getTsFiles() {
  const files = [];
  const scanner = await glob('src/**/*.ts', { cwd: ROOT });

  for (const filePath of scanner) {
    if (SKIP_PATTERNS.some(p => p.test(filePath))) continue;

    const content = await readFile(join(SRC, filePath), 'utf-8');
    files.push({ path: join(SRC, filePath), content, relative: filePath });
  }

  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  console.log('🔍 Scanning for TypeScript files...');
  const allFiles = await getTsFiles();
  console.log(`   Found ${allFiles.length} files`);

  console.log('📦 Finding all exports...');
  const allExports = [];
  for (const file of allFiles) {
    const exports = findExports(file.content, file.relative);
    allExports.push(...exports);
  }
  console.log(`   Found ${allExports.length} exports`);

  // Deduplicate exports
  const uniqueExports = new Map();
  for (const exp of allExports) {
    const key = `${exp.file}:${exp.name}`;
    if (!uniqueExports.has(key)) {
      uniqueExports.set(key, exp);
    }
  }

  console.log('🔎 Checking which exports are imported...');
  const unusedExports = [];

  for (const [key, exp] of uniqueExports) {
    // Skip private exports (start with _)
    if (exp.name.startsWith('_')) continue;

    const imports = findImports(exp.name, allFiles);

    if (imports.length === 0) {
      unusedExports.push({ ...exp, imports });
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(unusedExports, null, 2));
    return;
  }

  if (unusedExports.length === 0) {
    console.log('✅ All exports are used!');
    return;
  }

  console.log(`\n⚠️  Found ${unusedExports.length} unused exports:\n`);

  // Group by file
  const byFile = new Map();
  for (const exp of unusedExports) {
    if (!byFile.has(exp.file)) byFile.set(exp.file, []);
    byFile.get(exp.file).push(exp);
  }

  for (const [file, exports] of byFile) {
    console.log(`  ${file}:`);
    for (const exp of exports) {
      console.log(`    Line ${exp.line}: ${exp.name}`);
    }
    console.log();
  }

  process.exit(unusedExports.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
