import { it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as prettier from 'prettier';

/** Temporary CI formatter probe; deleted after applying the exact patches. */
it('reports canonical Prettier changes for the world story work', async () => {
  const paths = [
    'src/game/__tests__/worldStoryRuntime.test.ts',
    'src/game/snakeGame.ts',
    'src/quests/__tests__/worldStoryChapters.test.ts',
    'src/quests/storyQuestEngine.ts',
    'src/quests/storyQuestWorldChapters.ts',
    'src/quests/storyQuestWorldConsequences.ts',
    'src/session/ActorIntent.ts',
    'src/quests/storyQuestConsequences.ts',
  ];
  for (const path of paths) {
    const raw = readFileSync(path, 'utf8');
    const config = (await prettier.resolveConfig(path)) ?? {};
    const formatted = await prettier.format(raw, { ...config, filepath: path });
    if (raw === formatted) continue;
    const target = join(tmpdir(), 'snake-world-prettier-' + path.split('/').pop());
    writeFileSync(target, formatted, 'utf8');
    let patch = '';
    try {
      patch = execFileSync('git', ['diff', '--no-index', '--', path, target], {
        encoding: 'utf8',
        maxBuffer: 2_000_000,
      });
    } catch (error) {
      patch = (error as { stdout?: string }).stdout ?? '';
    }
    console.log('WORLD_PRETTIER_PATCH:' + path + ':' + Buffer.from(patch).toString('base64'));
  }
});
