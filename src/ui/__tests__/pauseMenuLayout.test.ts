import { describe, expect, it } from 'vitest';

import { computePauseMenuLayoutForTest, type UiRect } from '../core/PauseMenuLayout';

function intersects(a: UiRect, b: UiRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function contains(outer: UiRect, inner: UiRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

describe('pause menu layout zones', () => {
  const sizes = [
    { width: 640, height: 520 },
    { width: 720, height: 540 },
    { width: 960, height: 540 },
  ];

  it.each(sizes)('keeps major zones separated at $width x $height', ({ width, height }) => {
    const layout = computePauseMenuLayoutForTest(width, height);

    expect(intersects(layout.topTabs, layout.subTabs)).toBe(false);
    expect(intersects(layout.topTabs, layout.content)).toBe(false);
    expect(intersects(layout.topTabs, layout.detail)).toBe(false);
    expect(intersects(layout.status, layout.subTabs)).toBe(false);
    expect(intersects(layout.status, layout.content)).toBe(false);
    expect(intersects(layout.status, layout.detail)).toBe(false);
    expect(intersects(layout.subTabs, layout.content)).toBe(false);
    expect(intersects(layout.subTabs, layout.main)).toBe(false);
    expect(intersects(layout.subTabs, layout.detail)).toBe(false);
    expect(intersects(layout.main, layout.detail)).toBe(false);
    expect(intersects(layout.content, layout.footer)).toBe(false);
    expect(intersects(layout.main, layout.footer)).toBe(false);
    expect(intersects(layout.detail, layout.footer)).toBe(false);
  });

  it.each(sizes)('keeps zones inside the shell at $width x $height', ({ width, height }) => {
    const layout = computePauseMenuLayoutForTest(width, height);

    for (const rect of [
      layout.topTabs,
      layout.status,
      layout.subTabs,
      layout.content,
      layout.main,
      layout.detail,
      layout.footer,
      layout.summary,
    ]) {
      expect(contains(layout.shell, rect)).toBe(true);
    }
  });
});
