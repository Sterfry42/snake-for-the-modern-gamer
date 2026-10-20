import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ServerLogger } from '../ServerLogger.js';

const directories: string[] = [];
const loggers: ServerLogger[] = [];
afterEach(async () => {
  for (const logger of loggers.splice(0)) await logger.close();
  for (const directory of directories.splice(0)) {
    if (dirname(directory) !== tmpdir() || !basename(directory).startsWith('snake-server-log-'))
      throw new Error('Unexpected temporary log directory');
    await rm(directory, { recursive: true, force: true });
  }
});
async function setup(options: Partial<Parameters<typeof ServerLogger.create>[0]> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'snake-server-log-'));
  directories.push(directory);
  const logger = await ServerLogger.create({ directory, ...options });
  loggers.push(logger);
  return { logger, directory };
}

describe('persistent server diagnostics', () => {
  it('writes parseable chronological entries with run identity, flushes, and appends across restarts', async () => {
    const { logger, directory } = await setup();
    logger.log({ level: 'info', event: 'server.starting' });
    logger.log({
      level: 'warn',
      event: 'connection.closed',
      fields: { connectionId: 'wire-1', code: 1006 },
    });
    await logger.close();
    const next = await ServerLogger.create({ directory });
    loggers.push(next);
    next.log({ level: 'info', event: 'server.starting' });
    await next.flush();
    const lines = (await readFile(logger.path, 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0])).toMatchObject({
      event: 'server.starting',
      runId: logger.runId,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(JSON.parse(lines[1])).toMatchObject({
      level: 'warn',
      fields: { connectionId: 'wire-1', code: 1006 },
    });
    expect(JSON.parse(lines[2])).toMatchObject({ runId: next.runId });
    expect(next.runId).not.toBe(logger.runId);
  });

  it('redacts credentials in nested fields, URLs and error stacks and bounds pathological values', async () => {
    const { logger } = await setup();
    const fields: Record<string, unknown> = {
      resumeToken: 'private-resume',
      hostToken: 'private-host',
      nested: { password: 'private-password' },
      error: new Error('Failed ws://user:pass@host/game?resume=url-resume&hostToken=url-host'),
      text: 'token=plain-secret',
      huge: 'x'.repeat(100000),
    };
    fields.circular = fields;
    logger.log({ level: 'error', event: 'test', fields });
    await logger.flush();
    const raw = await readFile(logger.path, 'utf8');
    for (const secret of [
      'private-resume',
      'private-host',
      'private-password',
      'url-resume',
      'url-host',
      'user:pass',
      'plain-secret',
    ])
      expect(raw).not.toContain(secret);
    expect(raw).toContain('[redacted]');
    expect(raw).toContain('[circular]');
    expect(raw.length).toBeLessThan(16384);
  });

  it('rotates into a fixed number of bounded archives and retains the newest records', async () => {
    const { logger, directory } = await setup({ maxBytes: 1024, archives: 2 });
    for (let sequence = 0; sequence < 30; sequence++) {
      logger.log({ level: 'info', event: 'test', fields: { sequence, text: 'x'.repeat(150) } });
      await logger.flush();
    }
    const files = await readdir(directory);
    expect(files.sort()).toEqual(['server.1.jsonl', 'server.2.jsonl', 'server.jsonl']);
    for (const file of files) {
      expect((await stat(join(directory, file))).size).toBeLessThanOrEqual(1024);
      for (const line of (await readFile(join(directory, file), 'utf8')).trim().split('\n'))
        expect(() => JSON.parse(line)).not.toThrow();
    }
    expect(await readFile(logger.path, 'utf8')).toContain('"sequence":29');
  });

  it('bounds queued logging under a burst and reports dropped records instead of stalling gameplay', async () => {
    const { logger } = await setup({ maxBufferedBytes: 1024 });
    for (let sequence = 0; sequence < 100; sequence++)
      logger.log({ level: 'info', event: 'burst', fields: { sequence } });
    await logger.flush();
    const raw = await readFile(logger.path, 'utf8');
    expect(raw).toContain('logger.dropped');
    expect(raw.trim().split('\n').length).toBeLessThan(12);
  });

  it('reports a filesystem failure once and lets the server continue without throwing', async () => {
    const { directory } = await setup();
    const obstruction = join(directory, 'file');
    await writeFile(obstruction, 'not a directory');
    const errors: unknown[] = [];
    const logger = await ServerLogger.create({
      directory: join(obstruction, 'logs'),
      onError: (error) => errors.push(error),
    });
    loggers.push(logger);
    logger.log({ level: 'error', event: 'test' });
    await logger.close();
    expect(errors).toHaveLength(1);
  });

  it('writes the fatal-process record synchronously without changing process exception handling', async () => {
    const { logger } = await setup();
    logger.fatal('process.fatal', { error: new Error('a broken beam') });
    expect(await readFile(logger.path, 'utf8')).toContain('a broken beam');
  });
});
