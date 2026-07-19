import { describe, expect, it } from 'vitest';
import { DIG_SITE_VARIANTS, MolemanArchaeologySession } from './molemanArchaeology.js';

describe('Moleman artifact matches', () => {
  it('blasts a two-tile circular radius around every matched artifact cache', () => {
    const session = new MolemanArchaeologySession(DIG_SITE_VARIANTS[0]!, () => 0.5);
    const board = Array.from({ length: session.rows }, () =>
      Array.from({ length: session.cols }, () => 'dirt' as const),
    );
    for (let y = 0; y < session.rows; y += 1) {
      for (let x = 0; x < session.cols; x += 1) {
        board[y]![x] = (x + y) % 2 === 0 ? 'dirt' : ('stone' as (typeof board)[number][number]);
      }
    }
    board[6]![1] = 'artifact-cache' as (typeof board)[number][number];
    board[6]![2] = 'artifact-cache' as (typeof board)[number][number];
    board[6]![3] = 'artifact-cache' as (typeof board)[number][number];
    (session as any).board = board;

    expect((session as any).tryBeginMatchResolution(1)).toBe(true);
    const blast = session.consumeEvents().find((event) => event.kind === 'blast');
    expect(blast?.kind).toBe('blast');
    if (blast?.kind !== 'blast') return;
    const cells = new Set(blast.cells.map((cell) => `${cell.x},${cell.y}`));
    expect(cells.has('1,4')).toBe(true);
    expect(cells.has('0,5')).toBe(true);
    expect(cells.has('5,6')).toBe(true);
    expect(cells.has('1,8')).toBe(true);
    expect(cells.has('0,4')).toBe(false);
  });
});
