import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const source = path.join(root, 'apworld', 'snaked_revised_revamped');
const outDir = path.join(root, 'dist');
const outFile = path.join(outDir, 'snaked_revised_revamped.apworld');
const tempZipFile = path.join(outDir, 'snaked_revised_revamped.zip');

await mkdir(outDir, { recursive: true });
await rm(outFile, { force: true });
await rm(tempZipFile, { force: true });

const command = process.platform === 'win32' ? 'powershell' : 'python3';
const args =
  process.platform === 'win32'
    ? [
        '-NoProfile',
        '-Command',
        [
          '$ErrorActionPreference = "Stop"',
          `$source = ${JSON.stringify(path.join(source, '*'))}`,
          `$outFile = ${JSON.stringify(outFile)}`,
          `$tempZipFile = ${JSON.stringify(tempZipFile)}`,
          'Compress-Archive -Path $source -DestinationPath $tempZipFile -Force',
          'Move-Item -LiteralPath $tempZipFile -Destination $outFile -Force',
        ].join('; '),
      ]
    : [
        '-c',
        [
          'import pathlib, zipfile',
          `source = pathlib.Path(${JSON.stringify(source)})`,
          `out_file = pathlib.Path(${JSON.stringify(outFile)})`,
          'with zipfile.ZipFile(out_file, "w", zipfile.ZIP_DEFLATED) as zf:',
          '    for path in source.rglob("*"):',
          '        if "__pycache__" in path.parts or path.suffix == ".pyc":',
          '            continue',
          '        if path.is_file():',
          '            zf.write(path, path.relative_to(source))',
        ].join('\n'),
      ];

const result = spawnSync(command, args, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Wrote ${path.relative(root, outFile)}`);
