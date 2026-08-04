import type { PauseMenuContext } from './pauseMenuCommon.js';
import { addUiText, addUiBadge, drawUiCard, insetRect, type UiRect } from '../core/UiLayout.js';
import { uiColors } from '../theme/uiTokens.js';
import { i18n } from '../../i18n/i18nManager.js';
import type { ActionAbilityView } from '../../systems/actionSlots.js';
import type { ManeuverSaveState } from '../../maneuvers/maneuverTypes.js';
import { getManeuverDefinition } from '../../maneuvers/maneuverCatalog.js';

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

export function renderSpells(
  ctx: PauseMenuContext,
  rect: UiRect,
  getSpellSlotView: () => readonly ActionAbilityView[],
  primaryAbilityKeyLabel: () => string,
  onBindSpellSlot: (id: string) => void,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const views = getSpellSlotView();
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'SPELLS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  // Q-slot badge
  const bound = views.find((v) => v.bound);
  const badgeW = 126;
  const badgeRect: UiRect = {
    x: content.x + content.width - badgeW - 8,
    y: content.y - 2,
    width: badgeW,
    height: 20,
  };
  addUiBadge(
    scene,
    structuredContainer,
    structuredGraphics,
    badgeRect,
    `${primaryAbilityKeyLabel()}: ${bound?.label ?? 'Empty'}`,
    uiColors.accentArcana,
    uiColors.accentArcana,
  );

  let y = content.y + 30;

  if (views.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, i18n.getFeatureString('noSpellAvailable'), {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  } else {
    for (const view of views) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 58 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: view.bound ? uiColors.accentArcana : uiColors.panelBgInset,
        stroke: view.bound ? uiColors.accentCore : uiColors.panelBorderMuted,
        alpha: view.bound ? 0.15 : 0.62,
        strokeAlpha: view.bound ? 0.85 : 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 8, view.label, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 27, view.description, {
        color: uiColors.textMuted,
        fontSize: '10px',
        wordWrapWidth: card.width - 110,
      });

      const statusLabel = view.bound ? 'BOUND' : view.canBind ? 'BIND' : 'LOCKED';
      const statusColor = view.canBind || view.bound ? uiColors.accentArcana : uiColors.locked;
      const statusBadgeW = 70;
      const statusBadgeRect: UiRect = {
        x: card.x + card.width - statusBadgeW - 6,
        y: card.y + 16,
        width: statusBadgeW,
        height: 20,
      };
      addUiBadge(
        scene,
        structuredContainer,
        structuredGraphics,
        statusBadgeRect,
        statusLabel,
        statusColor,
        statusColor,
      );

      // Click zone
      ctx.addStructuredZone(card, () => {
        if (view.canBind) {
          onBindSpellSlot(view.id);
        } else {
          ctx.announce(
            view.disabledReason ?? i18n.getFeatureString('skillTreeQOptionUnavailable'),
            '#ff6b6b',
            1800,
          );
        }
      });

      y += 66;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText(i18n.getFeatureString('detailQSlot')).setVisible(true);
  ctx.detailSubtitle.setText(i18n.getFeatureString('detailSpellsTitle')).setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText(`Click an available ability to bind it to ${primaryAbilityKeyLabel()}.`)
    .setVisible(true);
}

// ---------------------------------------------------------------------------
// Maneuvers
// ---------------------------------------------------------------------------

export function renderManeuvers(
  ctx: PauseMenuContext,
  rect: UiRect,
  getManeuverState: () => ManeuverSaveState,
  onEquipManeuver: (id: string) => { ok: boolean; message: string; color: string },
  confirmKeyLabel: () => string,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const state = getManeuverState();
  const learnedIds = state.learnedIds ?? [];
  const equippedId = state.equippedId ?? null;
  const cooldownRemaining = state.cooldownRemaining ?? 0;
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'MANEUVERS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  // Status line
  const statusParts: string[] = [];
  if (learnedIds.length > 0) {
    statusParts.push(`${learnedIds.length} learned`);
  }
  if (equippedId) {
    statusParts.push(`Equipped: ${equippedId}`);
  }
  if (cooldownRemaining > 0) {
    statusParts.push(`Cooldown: ${cooldownRemaining} steps`);
  }
  if (statusParts.length > 0) {
    addUiText(scene, structuredContainer, content.x, content.y + 22, statusParts.join('  •  '), {
      color: uiColors.textSecondary,
      fontSize: '10px',
    });
  }

  let y = content.y + 42;

  if (learnedIds.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, 'No maneuvers learned yet.', {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  } else {
    for (let i = 0; i < Math.min(learnedIds.length, 10); i++) {
      const id = learnedIds[i]!;
      const def = getManeuverDefinition(id);
      if (!def) continue;

      const equipped = id === equippedId;
      const card: UiRect = { x: content.x, y, width: content.width, height: 58 };

      const accent = equipped
        ? [uiColors.accentArcana, uiColors.accentCore]
        : [uiColors.panelBgInset, uiColors.panelBorderMuted];

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: accent[0],
        stroke: accent[1],
        alpha: equipped ? 0.15 : 0.62,
        strokeAlpha: equipped ? 0.85 : 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 8, def.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 27, def.description, {
        color: uiColors.textMuted,
        fontSize: '10px',
        wordWrapWidth: card.width - 110,
      });

      // Equip button (only if not already equipped)
      if (!equipped) {
        const btnRect: UiRect = {
          x: card.x + card.width - 76,
          y: card.y + 16,
          width: 64,
          height: 26,
        };
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
          'Equip',
          {
            color: uiColors.textPrimary,
            fontSize: '11px',
            fontStyle: 'bold',
            align: 'center',
          },
        );

        const equipZone = scene.add
          .zone(btnRect.x, btnRect.y, btnRect.width, btnRect.height)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        equipZone.on('pointerdown', () => {
          const result = onEquipManeuver(id);
          ctx.announce(result.message, result.color, 2000);
        });
        structuredContainer.add(equipZone);
      }

      // Click zone for details
      const zone = scene.add
        .zone(card.x, card.y, card.width, card.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        ctx.detailTitle.setText(def.name).setVisible(true);
        ctx.detailSubtitle.setText('Maneuver').setVisible(true);
        ctx.detailRankText.setText('').setVisible(false);
        const detailLines: string[] = [def.description];
        if (equippedId) {
          detailLines.push(`Currently equipped: ${equippedId}`);
        }
        if (cooldownRemaining > 0) {
          detailLines.push(`Cooldown: ${cooldownRemaining} steps remaining`);
        }
        ctx.detailBody.setText(detailLines.join('\n')).setVisible(true);
      });
      structuredContainer.add(zone);

      y += 66;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText('Maneuvers').setVisible(true);
  ctx.detailSubtitle.setText('Learned techniques').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText(`Equip one learned technique; use ${confirmKeyLabel()} during play.`)
    .setVisible(true);
}
