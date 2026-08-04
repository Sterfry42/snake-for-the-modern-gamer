import type { PauseMenuContext } from './pauseMenuCommon.js';
import { addUiText, drawUiCard, insetRect, type UiRect } from '../core/UiLayout.js';
import { uiColors } from '../theme/uiTokens.js';
import { getCheatsByCategory, getCategoryLabel } from '../../cheats/cheatRegistry.js';
import {
  INPUT_MODES,
  CONTROL_CATEGORIES,
  formatBindingsForDisplay,
  getBindingsForMode,
  getControlActionsByCategory,
  resetAllBindingsForMode,
  type ControlCategoryId,
  type InputModeId,
} from '../../input/controlActions.js';

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function renderControls(
  ctx: PauseMenuContext,
  rect: UiRect,
  activeControlsMode: InputModeId,
  setActiveControlsMode: (mode: InputModeId) => void,
  rebindingControlActionId: string | null,
  getStructuredScrollOffset: () => number,
): void {
  const { scene, structuredContainer } = ctx;
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'CONTROLS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  // Mode buttons
  renderModeButtons(ctx, content, activeControlsMode, setActiveControlsMode);

  const mode = INPUT_MODES.find((e) => e.id === activeControlsMode) ?? INPUT_MODES[0];
  addUiText(scene, structuredContainer, content.x, content.y + 46, mode.description, {
    color: uiColors.textSecondary,
    fontSize: '10px',
    wordWrapWidth: content.width - 8,
  });

  const categories: readonly ControlCategoryId[] = ['movement', 'actions', 'system'];
  let y = content.y + 72 - getStructuredScrollOffset();

  for (const category of categories) {
    y = renderCategoryRows(ctx, content, y, activeControlsMode, category);
  }

  ctx.setStructuredContentHeight(content, y + getStructuredScrollOffset());

  ctx.detailTitle.setText('Controls').setVisible(true);
  ctx.detailSubtitle
    .setText(
      rebindingControlActionId
        ? activeControlsMode === 'controller'
          ? 'Press a controller button to bind'
          : 'Press a key to bind'
        : 'Custom bindings',
    )
    .setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText(
      [
        'Move actions also cover arcade, fishing, and manual room movement.',
        'Confirm handles interaction and UI selection. Back closes screens and cancels minigames.',
        'Controller: A selects, B backs out, LB/RB move primary tabs, LT/RT move subtabs, Start opens menu.',
        'Inspect is intentionally contextual through hover, focus, or touch-hold.',
      ].join('\n\n'),
    )
    .setVisible(true);
}

function renderModeButtons(
  ctx: PauseMenuContext,
  content: UiRect,
  activeControlsMode: InputModeId,
  setActiveControlsMode: (mode: InputModeId) => void,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const gap = 8;
  const resetWidth = 56;
  const modeWidth = Math.floor((content.width - resetWidth - gap * INPUT_MODES.length) / 3);
  let x = content.x;
  const y = content.y + 21;

  for (const mode of INPUT_MODES) {
    const active = mode.id === activeControlsMode;
    const modeRect: UiRect = { x, y, width: modeWidth, height: 26 };

    drawUiCard(structuredGraphics, {
      rect: modeRect,
      fill: active ? uiColors.accentSystem : uiColors.panelBgInset,
      stroke: uiColors.accentSystem,
      alpha: active ? 0.76 : 0.52,
      strokeAlpha: active ? 0.88 : 0.42,
    });

    addUiText(
      scene,
      structuredContainer,
      modeRect.x + modeRect.width / 2,
      modeRect.y + 7,
      mode.label,
      {
        color: active ? uiColors.textPrimary : uiColors.textSecondary,
        fontSize: '10px',
        fontStyle: active ? 'bold' : 'normal',
        align: 'center',
      },
    );

    const zone = scene.add
      .zone(modeRect.x, modeRect.y, modeRect.width, modeRect.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      setActiveControlsMode(mode.id);
    });
    structuredContainer.add(zone);

    x += modeWidth + gap;
  }

  // Reset button
  const resetRect: UiRect = { x, y, width: resetWidth, height: 26 };
  drawUiCard(structuredGraphics, {
    rect: resetRect,
    fill: uiColors.panelBgInset,
    stroke: uiColors.warning,
    alpha: 0.48,
    strokeAlpha: 0.5,
  });

  addUiText(
    scene,
    structuredContainer,
    resetRect.x + resetRect.width / 2,
    resetRect.y + 7,
    'Reset',
    {
      color: uiColors.textSecondary,
      fontSize: '10px',
      align: 'center',
    },
  );

  const resetZone = scene.add
    .zone(resetRect.x, resetRect.y, resetRect.width, resetRect.height)
    .setOrigin(0, 0)
    .setInteractive({ useHandCursor: true });
  resetZone.on('pointerdown', () => {
    resetAllBindingsForMode(activeControlsMode);
  });
  structuredContainer.add(resetZone);
}

function renderCategoryRows(
  ctx: PauseMenuContext,
  content: UiRect,
  startY: number,
  mode: InputModeId,
  category: ControlCategoryId,
): number {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  let y = startY;

  const categoryLabel = CONTROL_CATEGORIES[category];
  addUiText(scene, structuredContainer, content.x, y, categoryLabel, {
    color: uiColors.textSecondary,
    fontSize: '11px',
    fontStyle: 'bold',
  });
  y += 18;

  const actions = getControlActionsByCategory(category);
  for (const action of actions) {
    const bindings = getBindingsForMode(action.id, mode);
    const bindingLabel = formatBindingsForDisplay(bindings);

    const card: UiRect = { x: content.x, y, width: content.width, height: 36 };

    drawUiCard(structuredGraphics, {
      rect: card,
      fill: uiColors.panelBgInset,
      stroke: uiColors.panelBorderMuted,
      alpha: 0.52,
      strokeAlpha: 0.42,
    });

    addUiText(scene, structuredContainer, card.x + 10, card.y + 6, action.label, {
      color: uiColors.textPrimary,
      fontSize: '11px',
      fontStyle: 'bold',
    });

    addUiText(scene, structuredContainer, card.x + 10, card.y + 22, bindingLabel, {
      color: uiColors.textMuted,
      fontSize: '10px',
      wordWrapWidth: card.width - 140,
    });

    // Rebind button
    const bindRect: UiRect = { x: card.x + card.width - 136, y: card.y + 6, width: 64, height: 24 };
    drawUiCard(structuredGraphics, {
      rect: bindRect,
      fill: uiColors.accentSystem,
      stroke: uiColors.accentSystem,
      alpha: 0.28,
      strokeAlpha: 0.9,
    });
    addUiText(
      scene,
      structuredContainer,
      bindRect.x + bindRect.width / 2,
      bindRect.y + bindRect.height / 2,
      'Rebind',
      {
        color: uiColors.textPrimary,
        fontSize: '10px',
        fontStyle: 'bold',
        align: 'center',
      },
    );

    const bindZone = scene.add
      .zone(bindRect.x, bindRect.y, bindRect.width, bindRect.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    bindZone.on('pointerdown', () => {
      // The overlay will handle the rebind flow
    });
    structuredContainer.add(bindZone);

    y += 44;
  }

  return y + 8;
}

// ---------------------------------------------------------------------------
// Cheats
// ---------------------------------------------------------------------------

export function renderCheats(
  ctx: PauseMenuContext,
  rect: UiRect,
  applyCheatCode: (code: string) => { ok: boolean; message: string; color: string },
  accentSystem: number,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'CHEATS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  const cardWidth = content.width - 80;
  let y = content.y + 30 - ctx.getStructuredScrollOffset();

  const grouped = getCheatsByCategory();
  for (const category of grouped.keys()) {
    const cheats = grouped.get(category)!;
    if (cheats.length === 0) continue;

    // Category header
    addUiText(scene, structuredContainer, content.x + 6, y, getCategoryLabel(category), {
      color: uiColors.textPrimary,
      fontSize: '11px',
      fontStyle: 'bold',
    });
    y += 18;

    for (const cheat of cheats) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 30 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: accentSystem,
        alpha: 0.56,
        strokeAlpha: 0.5,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 7, cheat.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 20, cheat.description, {
        color: uiColors.textSecondary,
        fontSize: '10px',
        wordWrapWidth: cardWidth - 20,
      });

      // Click zone for details
      const zoneWidth = card.width - 72;
      const zone = scene.add
        .zone(card.x, card.y, zoneWidth, card.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        ctx.announce(`Cheat: ${cheat.name}`, '#9ad1ff', 1600);
        ctx.detailTitle.setText(cheat.name).setVisible(true);
        ctx.detailSubtitle.setText('Cheat Code').setVisible(true);
        ctx.detailRankText.setText(cheat.code).setVisible(true);
        ctx.detailBody.setText(cheat.description).setVisible(true);
        ctx.detailBody.setColor(uiColors.textPrimary);
      });
      structuredContainer.add(zone);

      // Enable button
      const btnX = card.x + zoneWidth;
      const btnRect: UiRect = { x: btnX, y: card.y + 2, width: 64, height: 26 };
      drawUiCard(structuredGraphics, {
        rect: btnRect,
        fill: uiColors.success,
        stroke: uiColors.success,
        alpha: 0.28,
        strokeAlpha: 0.9,
      });
      addUiText(
        scene,
        structuredContainer,
        btnRect.x + btnRect.width / 2,
        btnRect.y + btnRect.height / 2,
        'Enable',
        {
          color: uiColors.textPrimary,
          fontSize: '11px',
          fontStyle: 'bold',
          align: 'center',
        },
      );

      const enableZone = scene.add
        .zone(btnRect.x, btnRect.y, btnRect.width, btnRect.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      enableZone.on('pointerdown', () => {
        const result = applyCheatCode(cheat.primaryCode);
        ctx.announce(result.message, result.color, 2000);
        ctx.detailTitle.setText(cheat.name).setVisible(true);
        ctx.detailSubtitle.setText('Cheat Code').setVisible(true);
        ctx.detailRankText.setText(cheat.code).setVisible(true);
        ctx.detailBody.setText(result.message).setVisible(true);
        ctx.detailBody.setColor(result.color);
      });
      structuredContainer.add(enableZone);

      y += 36;
    }

    y += 6;
  }

  ctx.setStructuredContentHeight(content, y + 10);

  ctx.detailTitle.setText('Cheats').setVisible(true);
  ctx.detailSubtitle.setText('Click a cheat to view details.').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText('Press the Enable button to activate a cheat. Press Back to close.')
    .setVisible(true);
  ctx.detailBody.setColor(uiColors.textPrimary);
}

// ---------------------------------------------------------------------------
// Info (simple text lines)
// ---------------------------------------------------------------------------

export function renderInfo(
  ctx: PauseMenuContext,
  rect: UiRect,
  lines: string[],
  title: string,
): void {
  const { scene, structuredContainer } = ctx;
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, title, {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  for (const line of lines) {
    addUiText(scene, structuredContainer, content.x, y, line, {
      color: uiColors.textPrimary,
      fontSize: '11px',
      wordWrapWidth: content.width - 16,
    });
    y += 18;
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText(title).setVisible(true);
  ctx.detailSubtitle.setText('Information').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody.setText('Browse grouped menu systems and current run tools.').setVisible(true);
}
