import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const worldName = 'snaked_revised_revamped';
const source = path.join(root, 'apworld', worldName);
// The build (re)generates the .apworld package in place so it can be shared
// or uploaded. The zip keeps the world folder at its top level, matching how
// Archipelago installs packaged worlds.
const outFile = path.join(root, 'apworld', `${worldName}.apworld`);

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
