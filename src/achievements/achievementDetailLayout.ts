export interface DetailRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AchievementDetailLayout {
  portrait: { x: number; y: number; size: number };
  title: DetailRect;
  description: DetailRect;
  status: DetailRect;
  section: DetailRect;
  category: DetailRect;
  progress: DetailRect;
  reward: DetailRect;
}

export function computeAchievementDetailLayout(panel: DetailRect): AchievementDetailLayout {
  const padding = 14;
  const gap = 6;
  const innerWidth = panel.width - padding * 2;
  const columnWidth = (innerWidth - gap) / 2;
  const cardHeight = 50;
  const statusHeight = 42;
  const cardsBottom = panel.y + panel.height - 12;
  const bottomRowY = cardsBottom - cardHeight;
  const middleRowY = bottomRowY - gap - cardHeight;
  const statusY = middleRowY - gap - statusHeight;
  const portraitSize = Math.min(58, Math.max(42, statusY - panel.y - 116));

  return {
    portrait: {
      x: panel.x + panel.width / 2,
      y: panel.y + 16 + portraitSize / 2,
      size: portraitSize,
    },
    title: {
      x: panel.x + padding,
      y: panel.y + 24 + portraitSize,
      width: innerWidth,
      height: 38,
    },
    description: {
      x: panel.x + padding,
      y: panel.y + 66 + portraitSize,
      width: innerWidth,
      height: Math.max(28, statusY - (panel.y + 66 + portraitSize) - 8),
    },
    status: { x: panel.x + padding, y: statusY, width: innerWidth, height: statusHeight },
    section: {
      x: panel.x + padding,
      y: middleRowY,
      width: columnWidth,
      height: cardHeight,
    },
    category: {
      x: panel.x + padding + columnWidth + gap,
      y: middleRowY,
      width: columnWidth,
      height: cardHeight,
    },
    progress: {
      x: panel.x + padding,
      y: bottomRowY,
      width: columnWidth,
      height: cardHeight,
    },
    reward: {
      x: panel.x + padding + columnWidth + gap,
      y: bottomRowY,
      width: columnWidth,
      height: cardHeight,
    },
  };
}
