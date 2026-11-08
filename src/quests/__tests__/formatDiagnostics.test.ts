import { it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as prettier from 'prettier';

it('temporarily reports exact formatting diffs for the quest branch', async () => {
  const paths = [
    'src/game/__tests__/crystalQuestRuntime.test.ts',
    'src/game/snakeGame.ts',
    'src/quests/definitions/crystalClause.ts',
    'src/quests/storyQuestEngine.ts',
  ];
  for (const path of paths) {
    const source = readFileSync(path, 'utf8');
    const config = (await prettier.resolveConfig(path)) ?? {};
    const result = await prettier.format(source, { ...config, filepath: path });
    if (source === result) continue;
    const target = join(tmpdir(), 'snake-quest-fmt-' + path.split('/').pop());
    writeFileSync(target, result, 'utf8');
    let patch = '';
    try {
      patch = execFileSync('git', ['diff', '--no-index', '--', path, target], {
        encoding: 'utf8',
        maxBuffer: 2_000_000,
      });
    } catch (error) {
      const detail = error as { stdout?: string };
      patch = detail.stdout ?? '';
    }
    const encoded = Buffer.from(patch).toString('base64');
    console.log('QUEST_FORMAT_DIAGNOSTIC:' + path + ':' + encoded);
  }
});
