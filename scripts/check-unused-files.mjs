#!/usr/bin/env node

/**
 * Check for unused source files in the project.
 *
 * This script finds all TypeScript files and checks if they're imported
 * by any other file in the project.
 *
 * Usage: node scripts/check-unused-files.mjs
 *        node scripts/check-unused-files.mjs --include-entry-points
 *        node scripts/check-unused-files.mjs --json
 *
 * Entry points (always considered used):
 *   - src/main.ts
 *   - src/App.tsx
 *   - vite.config.ts
 *   - index.html
 */

import { readFile, stat } from 'node:fs/promises';
import { join, relative, dirname, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import globPkg from 'glob';
const glob = globPkg.default || globPkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

// Entry point files that should never be flagged
const ENTRY_POINTS = [
  'src/main.ts',
  'src/main.tsx',
  'src/App.tsx',
  'src/App.ts',
  'vite.config.ts',
  'index.html',
];

// Files/directories to always skip
const SKIP_PATTERNS = [
  /__tests__\//,
  /\.test\./,
  /\.spec\./,
  /node_modules\//,
  /dist\//,
  /linting\//,  // Our linting utilities
  /scripts\//,  // Our scripts
];

/**
 * Get all TypeScript files in the project.
 */
function getTsFiles() {
  const files = [];
  const scanner = glob.sync('src/**/*.ts', { cwd: ROOT, absolute: true });

  for (const filePath of scanner) {
    if (SKIP_PATTERNS.some(p => p.test(filePath))) continue;
    files.push(filePath);
  }

  return files;
}

/**
 * Check if a file is imported by any other file.
 */
async function isFileImported(filePath, allFiles) {
  const relPath = relative(SRC, filePath);
  const baseName = basename(filePath, extname(filePath));

  // Try various import patterns
  const patterns = [
    // import ... from './filename'
    new RegExp(`['"]\\.\\/${baseName}(['/\0]|['"])`, 'g'),
    // import ... from './filename/'
    new RegExp(`['"]\\.\\/${baseName}\\/`, 'g'),
    // import ... from '../dir/filename'
    new RegExp(`['"]\\.\\.\\/${baseName}(['/\0]|['"])`, 'g'),
    // import ... from './dir/filename'
    new RegExp(`['"]\\.\\/[\\w-]+\\/${baseName}(['/\0]|['"])`, 'g'),
    // import ... from './filename.js'
    new RegExp(`['"]\\.\\/${baseName}\\.js(['/\0]|['"])`, 'g'),
    // import ... from './filename.ts'
    new RegExp(`['"]\\.\\/${baseName}\\.ts(['/\0]|['"])`, 'g'),
    // import ... from '../dir/filename.js'
    new RegExp(`['"]\\.\\.\\/[\\w-]+\\/${baseName}\\.js(['/\0]|['"])`, 'g'),
    // import ... from '../dir/filename.ts'
    new RegExp(`['"]\\.\\.\\/[\\w-]+\\/${baseName}\\.ts(['/\0]|['"])`, 'g'),
  ];

  for (const file of allFiles) {
    if (file.path === filePath) continue;

    try {
      const content = await readFile(file.path, 'utf-8');
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
    } catch {
      // Skip files we can't read
    }
  }

  return false;
}

/**
 * Check if a file is a barrel file (index.ts) that re-exports other files.
 */
function isBarrelFile(filePath) {
  const baseName = basename(filePath);
  return baseName === 'index.ts' || baseName === 'index.tsx';
}

async function main() {
  const args = process.argv.slice(2);
  const includeEntryPoints = args.includes('--include-entry-points');
  const jsonMode = args.includes('--json');

  console.log('🔍 Scanning for TypeScript files...');
  const allFiles = getTsFiles();
  console.log(`   Found ${allFiles.length} files`);

  // Add entry points
  const entryPointPaths = ENTRY_POINTS.map(p => join(ROOT, p));
  const allScanned = [...allFiles];

  if (includeEntryPoints) {
    for (const ep of entryPointPaths) {
      try {
        await stat(ep);
        allScanned.push(ep);
      } catch {
        // Entry point doesn't exist, skip
      }
    }
  }

  console.log('🔎 Checking which files are imported...');
  const unusedFiles = [];

  for (const filePath of allScanned) {
    const relPath = relative(SRC, filePath);

    // Skip entry points unless explicitly requested
    if (!includeEntryPoints && ENTRY_POINTS.includes(relPath)) continue;

    // Skip barrel files (they're import hubs)
    if (isBarrelFile(filePath)) continue;

    // Check if the file is imported
    const isImported = await isFileImported(filePath, allScanned);

    if (!isImported) {
      unusedFiles.push({ path: filePath, relative: relPath });
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(unusedFiles, null, 2));
    return;
  }

  if (unusedFiles.length === 0) {
    console.log('✅ All files are imported!');
    return;
  }

  console.log(`\n⚠️  Found ${unusedFiles.length} potentially unused files:\n`);

  for (const file of unusedFiles) {
    const size = await stat(file.path).then(s => s.size).catch(() => 0);
    const sizeStr = size > 10000 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
    console.log(`  ${file.relative} (${sizeStr})`);
  }

  console.log(`\n💡 Total unused code: ${unusedFiles.reduce((sum, f) => sum + (f.size || 0), 0)} bytes`);
  console.log('   Review each file before deleting - some may be used dynamically or as entry points');

  process.exit(unusedFiles.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
