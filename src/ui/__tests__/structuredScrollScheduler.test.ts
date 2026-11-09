import { describe, expect, it } from 'vitest';

import { StructuredScrollScheduler } from '../core/structuredScrollScheduler';

describe('StructuredScrollScheduler', () => {
  it('returns null while no scroll event has been queued', () => {
    const scheduler = new StructuredScrollScheduler();
    expect(scheduler.consume()).toBeNull();
    expect(scheduler.consume()).toBeNull();
  });

  it('rebuilds once when the offset crosses the minimum movement', () => {
    const scheduler = new StructuredScrollScheduler(0, 1);
    scheduler.queue(3);
    expect(scheduler.consume()).toBe(3);
    // A second consume in the same "frame" must not rebuild again.
    expect(scheduler.consume()).toBeNull();
  });

  it('keeps sub-threshold drift pending until it crosses the threshold', () => {
    const scheduler = new StructuredScrollScheduler(0, 1);
    scheduler.queue(0.4);
    expect(scheduler.consume()).toBeNull();
    scheduler.queue(0.6);
    expect(scheduler.consume()).toBeNull();
    scheduler.queue(1.2);
    expect(scheduler.consume()).toBe(1.2);
  });

  it('lets the latest event win when many events arrive between frames', () => {
    const scheduler = new StructuredScrollScheduler(0, 1);
    scheduler.queue(2);
    scheduler.queue(5);
    scheduler.queue(9);
    expect(scheduler.consume()).toBe(9);
  });

  it('costs nothing for a drag clamped at the end of the list', () => {
    const scheduler = new StructuredScrollScheduler(500, 1);
    // Content already built at the max offset; the finger keeps dragging.
    scheduler.queue(500);
    expect(scheduler.consume()).toBeNull();
    scheduler.queue(500);
    expect(scheduler.consume()).toBeNull();
  });

  it('resyncs when content is rebuilt outside the scroll path', () => {
    const scheduler = new StructuredScrollScheduler(0, 1);
    scheduler.queue(40);
    scheduler.markBuilt(40);
    expect(scheduler.consume()).toBeNull();
    scheduler.queue(45);
    expect(scheduler.consume()).toBe(45);
  });

  it('supports scrolling back upward as well', () => {
    const scheduler = new StructuredScrollScheduler(50, 1);
    scheduler.queue(40);
    expect(scheduler.consume()).toBe(40);
    scheduler.queue(500);
    scheduler.markBuilt(500);
    scheduler.queue(499.6);
    expect(scheduler.consume()).toBeNull();
    scheduler.queue(498);
    expect(scheduler.consume()).toBe(498);
  });
});
