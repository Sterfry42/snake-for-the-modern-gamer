import { uiSpacing } from '../theme/uiSpacing.js';

export interface UiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PauseMenuLayout {
  shell: UiRect;
  topTabs: UiRect;
  status: UiRect;
  subTabs: UiRect;
  content: UiRect;
  main: UiRect;
  detail: UiRect;
  footer: UiRect;
  summary?: UiRect;
}

export const TREE_PADDING = { top: 104, bottom: 72, horizontal: 32 };
export const DETAIL_PANEL_WIDTH = 230;
export const DETAIL_PANEL_MARGIN = 18;

export function computePauseMenuLayoutForTest(width = 640, height = 520): PauseMenuLayout {
  const footerHeight = Math.max(42, uiSpacing.footerHeight);
  const contentTop = TREE_PADDING.top - 12;
  const contentBottom = height - footerHeight - 22;
  const content: UiRect = {
    x: TREE_PADDING.horizontal - 12,
    y: contentTop,
    width: width - TREE_PADDING.horizontal * 2 + 24,
    height: Math.max(240, contentBottom - contentTop),
  };
  const detail: UiRect = {
    x: width - DETAIL_PANEL_WIDTH - DETAIL_PANEL_MARGIN,
    y: contentTop,
    width: DETAIL_PANEL_WIDTH,
    height: Math.max(240, contentBottom - contentTop),
  };
  const main: UiRect = {
    x: content.x,
    y: content.y,
    width: Math.max(260, detail.x - DETAIL_PANEL_MARGIN - content.x),
    height: content.height,
  };
  return {
    shell: { x: 0, y: 0, width, height },
    topTabs: { x: 28, y: 24, width: width - 268, height: 34 },
    status: { x: width - 226, y: 24, width: 198, height: 34 },
    subTabs: { x: 28, y: 60, width: width - 56, height: 30 },
    content,
    main,
    detail,
    footer: {
      x: 16,
      y: height - footerHeight - 10,
      width: width - 32,
      height: footerHeight,
    },
    summary: { x: main.x + 14, y: main.y + 42, width: main.width - 28, height: 64 },
  };
}
