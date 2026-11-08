import { it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as prettier from 'prettier';

/** Temporary CI-only formatter probe. Removed after its patches are applied. */
it('reports exact formatting diffs for all new story files', async () => {
  const paths = [
    'src/game/__tests__/characterStoryArcs.test.ts',
    'src/game/snakeGame.ts',
    'src/quests/__tests__/storyQuestArcs.test.ts',
    'src/quests/definitions/storyChapters.ts',
    'src/quests/storyQuestCatalog.ts',
    'src/quests/storyQuestChapters.ts',
    'src/quests/storyQuestCharacter.ts',
    'src/quests/storyQuestConsequences.ts',
    'src/quests/storyQuestEngine.ts',
  ];
  for (const path of paths) {
    const source = readFileSync(path, 'utf8');
    const config = (await prettier.resolveConfig(path)) ?? {};
    const formatted = await prettier.format(source, { ...config, filepath: path });
    if (formatted === source) continue;
    const temporary = join(tmpdir(), 'snake-story-format-' + path.split('/').pop());
    writeFileSync(temporary, formatted, 'utf8');
    let patch = '';
    try {
      patch = execFileSync('git', ['diff', '--no-index', '--', path, temporary], {
        encoding: 'utf8',
        maxBuffer: 2_000_000,
      });
    } catch (error) {
      const details = error as { stdout?: string };
      patch = details.stdout ?? '';
    }
    console.log('STORY_FORMAT_DIFF:' + path + ':' + Buffer.from(patch).toString('base64'));
  }
});
