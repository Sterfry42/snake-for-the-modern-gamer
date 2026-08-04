import Phaser from 'phaser';
import type { UiRect } from '../core/UiLayout.js';
import { addUiText, addUiBadge, drawUiCard } from '../core/UiLayout.js';
import { uiColors } from '../theme/uiTokens.js';

/**
 * Shared context that tab renderers need from the SkillTreeOverlay.
 * Keeps tab files decoupled from the overlay's private implementation.
 */
export interface PauseMenuContext {
  scene: Phaser.Scene;
  structuredContainer: Phaser.GameObjects.Container;
  structuredGraphics: Phaser.GameObjects.Graphics;
  detailTitle: Phaser.GameObjects.Text;
  detailSubtitle: Phaser.GameObjects.Text;
  detailRankText: Phaser.GameObjects.Text;
  detailBody: Phaser.GameObjects.Text;
  setStructuredContentHeight(content: UiRect, bottomY: number): void;
  addStructuredZone(rect: UiRect, onClick: () => void): void;
  getStructuredScrollOffset(): number;
  announce(message: string, color: string, duration?: number): void;
}

// ---------------------------------------------------------------------------
// Card list renderer
// ---------------------------------------------------------------------------

export interface CardListItem {
  height: number;
  label: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeColor?: number;
  badgeFill?: number;
  emptyState?: boolean;
}

export interface CardListOptions {
  title: string;
  items: CardListItem[];
  emptyLabel: string;
  renderExtra?(
    g: Phaser.GameObjects.Graphics,
    container: Phaser.GameObjects.Container,
    card: UiRect,
    item: CardListItem,
    index: number,
  ): void;
  onCardClick?(card: UiRect, item: CardListItem, index: number, ctx: PauseMenuContext): void;
  detailTitle?: string;
  detailSubtitle?: string;
  detailBodyText?: string;
  scrollOffset?: number;
}

/**
 * Renders a scrollable list of cards with a title, empty state, and optional
 * detail panel population.  This covers the most common pattern across all
 * structured tabs (equipment, items, spells, quests, dating, etc.).
 */
export function renderCardList(
  ctx: PauseMenuContext,
  opts: CardListOptions,
  content: UiRect,
  accent: number,
): number {
  const { scene, structuredContainer, structuredGraphics, getStructuredScrollOffset } = ctx;
  const offset = opts.scrollOffset ?? getStructuredScrollOffset();

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, opts.title, {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30 - offset;

  // Empty state
  if (opts.items.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, opts.emptyLabel, {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  }

  // Cards
  for (let i = 0; i < opts.items.length; i++) {
    const item = opts.items[i]!;
    const card: UiRect = { x: content.x, y, width: content.width, height: item.height };

    drawUiCard(structuredGraphics, {
      rect: card,
      fill: uiColors.panelBgInset,
      stroke: accent,
      alpha: 0.62,
      strokeAlpha: 0.58,
    });

    // Title line
    addUiText(scene, structuredContainer, card.x + 10, card.y + 8, item.label, {
      color: uiColors.textPrimary,
      fontSize: '12px',
      fontStyle: 'bold',
    });

    // Subtitle line
    if (item.subtitle) {
      addUiText(scene, structuredContainer, card.x + 10, card.y + 27, item.subtitle, {
        color: uiColors.textMuted,
        fontSize: '10px',
        wordWrapWidth: card.width - 28,
      });
    }

    // Badge
    if (item.badgeLabel && item.badgeColor) {
      const badgeW = Math.max(46, item.badgeLabel.length * 8 + 12);
      addUiBadge(
        scene,
        structuredContainer,
        structuredGraphics,
        { x: card.x + card.width - badgeW - 6, y: card.y + 11, width: badgeW, height: 20 },
        item.badgeLabel,
        item.badgeColor,
        item.badgeFill ?? item.badgeColor,
      );
    }

    // Extra rendering (per-tab)
    if (opts.renderExtra) {
      opts.renderExtra(structuredGraphics, structuredContainer, card, item, i);
    }

    // Click zone
    if (opts.onCardClick) {
      ctx.addStructuredZone(card, () => opts.onCardClick!(card, item, i, ctx));
    }

    y += item.height + 6;
  }

  // Detail panel
  if (opts.detailTitle) {
    ctx.detailTitle.setText(opts.detailTitle).setVisible(true);
  }
  if (opts.detailSubtitle) {
    ctx.detailSubtitle.setText(opts.detailSubtitle).setVisible(true);
  }
  ctx.detailRankText.setText('').setVisible(false);
  if (opts.detailBodyText) {
    ctx.detailBody.setText(opts.detailBodyText).setVisible(true);
  }

  // Return the bottom Y so the caller can set scroll height
  return y;
}

// ---------------------------------------------------------------------------
// Category section renderer
// ---------------------------------------------------------------------------

export interface CategorySection {
  header: string;
  headerColor?: string;
  items: CardListItem[];
}

/**
 * Renders a category header followed by its card list.  Used by cosmetics
 * and other tabs that group items into named sections.
 */
export function renderCategorySection(
  ctx: PauseMenuContext,
  content: UiRect,
  y: number,
  section: CategorySection,
  accent: number,
  opts?: {
    renderExtra?(
      g: Phaser.GameObjects.Graphics,
      container: Phaser.GameObjects.Container,
      card: UiRect,
      item: CardListItem,
      index: number,
    ): void;
    onCardClick?(card: UiRect, item: CardListItem, index: number): void;
    emptyLabel?: string;
    badgeLabel?: string;
    badgeColor?: number;
  },
): number {
  const { scene, structuredContainer, structuredGraphics } = ctx;

  // Category header
  addUiText(scene, structuredContainer, content.x, y, section.header, {
    color: section.headerColor ?? uiColors.textSecondary,
    fontSize: '11px',
    fontStyle: 'bold',
  });
  y += 18;

  // Items
  const items = section.items;

  if (items.length === 0) {
    const label = opts?.emptyLabel ?? `No ${section.header.toLowerCase()} available.`;
    addUiText(scene, structuredContainer, content.x, y, label, {
      color: uiColors.textMuted,
      fontSize: '12px',
    });
    y += 24;
    return y;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const card: UiRect = { x: content.x, y, width: content.width, height: item.height };

    drawUiCard(structuredGraphics, {
      rect: card,
      fill: uiColors.panelBgInset,
      stroke: accent,
      alpha: 0.62,
      strokeAlpha: 0.58,
    });

    addUiText(scene, structuredContainer, card.x + 10, card.y + 7, item.label, {
      color: uiColors.textPrimary,
      fontSize: '12px',
    });

    if (item.subtitle) {
      addUiText(scene, structuredContainer, card.x + 10, card.y + 24, item.subtitle, {
        color: uiColors.textMuted,
        fontSize: '10px',
        wordWrapWidth: card.width - 28,
      });
    }

    if (opts?.renderExtra) {
      opts.renderExtra(structuredGraphics, structuredContainer, card, item, i);
    }

    if (opts?.onCardClick) {
      ctx.addStructuredZone(card, () => opts.onCardClick!(card, item, i));
    }

    y += item.height + 6;
  }

  return y;
}

// ---------------------------------------------------------------------------
// Detail panel helper
// ---------------------------------------------------------------------------

/**
 * Populates the detail panel with a title, subtitle, and body text.
 * Resets rank text to hidden.
 */
export function setDetailPanel(
  ctx: PauseMenuContext,
  title: string,
  subtitle: string,
  bodyText: string,
): void {
  ctx.detailTitle.setText(title).setVisible(true);
  ctx.detailSubtitle.setText(subtitle).setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody.setText(bodyText).setVisible(true);
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

/**
 * Renders a small status badge at the top-right of a content area.
 */
export function renderTopRightBadge(
  ctx: PauseMenuContext,
  content: UiRect,
  label: string,
  color: number,
  offsetY = -2,
): UiRect {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const badgeW = Math.max(46, label.length * 8 + 12);
  const badgeRect: UiRect = {
    x: content.x + content.width - badgeW - 8,
    y: content.y + offsetY,
    width: badgeW,
    height: 20,
  };
  addUiBadge(scene, structuredContainer, structuredGraphics, badgeRect, label, color, color);
  return badgeRect;
}

// ---------------------------------------------------------------------------
// Scroll height helper
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper that computes and sets the scroll content height.
 */
export function commitScrollHeight(ctx: PauseMenuContext, content: UiRect, bottomY: number): void {
  ctx.setStructuredContentHeight(content, bottomY);
}

// ---------------------------------------------------------------------------
// Zone helpers
// ---------------------------------------------------------------------------

/**
 * Creates a clickable zone that announces a message.  Useful for simple
 * "click to learn more" interactions.
 */
export function makeAnnounceZone(
  ctx: PauseMenuContext,
  rect: UiRect,
  message: string,
  color = '#9ad1ff',
  duration = 1600,
): void {
  ctx.addStructuredZone(rect, () => ctx.announce(message, color, duration));
}
