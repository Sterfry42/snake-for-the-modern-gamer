import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const root = process.cwd();
const worldName = 'snaked_revised_revamped';
const source = path.join(root, 'apworld', worldName);
// The build (re)generates the .apworld package in place so it can be shared
// or uploaded. The zip keeps the world folder at its top level, matching how
// Archipelago installs packaged worlds.
const outFile = path.join(root, 'apworld', `${worldName}.apworld`);

// Regenerate the world's data tables from the browser manifest first, so the
// packaged world can never ship stale locations/items.
let vitestEntry;
try {
  vitestEntry = require.resolve('vitest/vitest.mjs');
} catch {
  // Vitest does not export the bin entry through its package exports map.
  vitestEntry = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
}
const codegen = spawnSync(
  process.execPath,
  [vitestEntry, 'run', 'src/archipelago/__tests__/generateApWorld.test.ts'],
  {
    cwd: root,
    env: { ...process.env, AP_CODEGEN_WRITE: '1' },
    stdio: 'inherit',
  },
);
if (codegen.status !== 0) {
  process.exit(codegen.status ?? 1);
}

await rm(outFile, { force: true });

const command = process.platform === 'win32' ? 'powershell' : 'python3';
const args =
  process.platform === 'win32'
    ? [
        '-NoProfile',
        '-Command',
        [
          '$ErrorActionPreference = "Stop"',
          '$tempZipFile = [System.IO.Path]::ChangeExtension([System.IO.Path]::GetTempFileName(), ".zip")',
          'Compress-Archive -Path ' + JSON.stringify(source) + ' -DestinationPath $tempZipFile -Force',
          `Move-Item -LiteralPath $tempZipFile -Destination ${JSON.stringify(outFile)} -Force`,
        ].join('; '),
      ]
    : [
        '-c',
        [
          'import pathlib, zipfile',
          `source = pathlib.Path(${JSON.stringify(source)})`,
          `out_file = pathlib.Path(${JSON.stringify(outFile)})`,
          'with zipfile.ZipFile(out_file, "w", zipfile.ZIP_DEFLATED) as zf:',
          '    for path_ in sorted(source.rglob("*")):',
          '        if "__pycache__" in path_.parts or path_.suffix == ".pyc":',
          '            continue',
          '        if path_.is_file():',
          '            zf.write(path_, path_.relative_to(source.parent))',
        ].join('\n'),
      ];

const result = spawnSync(command, args, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Wrote ${path.relative(root, outFile)}`);
