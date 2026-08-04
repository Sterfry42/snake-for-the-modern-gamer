import type { PauseMenuContext } from './pauseMenuCommon.js';
import { addUiText, addUiBadge, drawUiCard, insetRect, type UiRect } from '../core/UiLayout.js';
import { uiColors } from '../theme/uiTokens.js';
import { i18n } from '../../i18n/i18nManager.js';
import { getItem } from '../../inventory/itemRegistry.js';
import type { Item, EquipableItem, EquipmentSlot } from '../../inventory/item.js';
import { CARD_DEFINITIONS, type CardCollection } from '../../cards/cardGame.js';
import type { ArtifactView } from '../../artifacts/artifacts.js';

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export function renderEquipment(
  ctx: PauseMenuContext,
  rect: UiRect,
  getEquipmentSlots: () => readonly EquipmentSlot[],
  getAllEquipmentForMenu: () => readonly { item: Item; equipped: boolean }[],
  formatSlotLabel: (slot: EquipmentSlot | string) => string,
  getEquipmentSlotAccent: (slot: EquipmentSlot) => number,
  drawEquipmentSlotGlyph: (
    g: Phaser.GameObjects.Graphics,
    slot: EquipmentSlot,
    x: number,
    y: number,
    size: number,
  ) => void,
  toggleSelectedEquipment: () => void,
  setSelectedItemId: (id: string) => void,
  showInventoryItemDetails: () => void,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'EQUIPMENT', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  // Badge
  const allEquipment = getAllEquipmentForMenu();
  const equippedCount = allEquipment.filter((e) => e.equipped).length;
  const badgeW = Math.max(46, `${equippedCount} EQUIPPED`.length * 7 + 12);
  addUiBadge(
    scene,
    structuredContainer,
    structuredGraphics,
    { x: content.x + content.width - badgeW - 8, y: content.y - 2, width: badgeW, height: 20 },
    `${equippedCount} EQUIPPED`,
    uiColors.accentGear,
    uiColors.accentGear,
  );

  const slots = getEquipmentSlots();
  let y = content.y + 30;

  // Slot cards row
  const slotCardW = Math.floor((content.width - 16) / slots.length);
  const slotCardH = 80;
  for (let col = 0; col < slots.length; col++) {
    const slot = slots[col]!;
    const equipped = allEquipment.find(
      (e) => (e.item as EquipableItem).slot === slot && e.equipped,
    );
    const accent = getEquipmentSlotAccent(slot);

    const cardX = content.x + 8 + col * (slotCardW + 8);
    const card: UiRect = { x: cardX, y, width: slotCardW, height: slotCardH };

    drawUiCard(structuredGraphics, {
      rect: card,
      fill: uiColors.panelBgInset,
      stroke: accent,
      alpha: 0.62,
      strokeAlpha: 0.58,
    });

    // Slot glyph
    drawEquipmentSlotGlyph(structuredGraphics, slot, card.x + card.width / 2, card.y + 20, 24);

    // Slot label
    addUiText(
      scene,
      structuredContainer,
      card.x + card.width / 2,
      card.y + 46,
      formatSlotLabel(slot),
      {
        color: uiColors.textPrimary,
        fontSize: '10px',
        fontStyle: 'bold',
        align: 'center',
      },
    );

    // Equipped item name
    if (equipped) {
      addUiText(
        scene,
        structuredContainer,
        card.x + card.width / 2,
        card.y + 62,
        equipped.item.name,
        {
          color: uiColors.textSecondary,
          fontSize: '9px',
          align: 'center',
          wordWrapWidth: card.width - 12,
        },
      );
    }

    const zone = scene.add
      .zone(card.x, card.y, card.width, card.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      setSelectedItemId(equipped ? (equipped.item as EquipableItem).id : '');
      toggleSelectedEquipment();
    });
    structuredContainer.add(zone);
  }

  y += slots.length <= 4 ? slotCardH + 16 : slotCardH * 2 + 24;

  // Item list
  let unscrolledBottom = y;

  const filteredEquipment = allEquipment
    .filter((e) => (e.item as EquipableItem).slot !== undefined)
    .sort((a, b) => (a.equipped === b.equipped ? 0 : a.equipped ? -1 : 1));

  for (const { item, equipped } of filteredEquipment.slice(0, 12)) {
    const equipItem = item as EquipableItem;
    const card: UiRect = { x: content.x, y, width: content.width, height: 48 };

    drawUiCard(structuredGraphics, {
      rect: card,
      fill: uiColors.panelBgInset,
      stroke: equipped ? uiColors.accentGear : uiColors.panelBorderMuted,
      alpha: equipped ? 0.72 : 0.62,
      strokeAlpha: equipped ? 0.75 : 0.58,
    });

    addUiText(scene, structuredContainer, card.x + 10, card.y + 8, item.name, {
      color: uiColors.textPrimary,
      fontSize: '12px',
      fontStyle: 'bold',
    });

    addUiText(
      scene,
      structuredContainer,
      card.x + 10,
      card.y + 27,
      `${equipItem.slot} // ${equipped ? 'EQUIPPED' : 'UNEQUIPPED'}`,
      {
        color: uiColors.textMuted,
        fontSize: '10px',
      },
    );

    const zone = scene.add
      .zone(card.x, card.y, card.width, card.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      setSelectedItemId(equipItem.id);
      showInventoryItemDetails();
    });
    structuredContainer.add(zone);

    y += 56;
    unscrolledBottom += 56;
  }

  ctx.setStructuredContentHeight(content, unscrolledBottom);

  ctx.detailTitle.setText('Equipment').setVisible(true);
  ctx.detailSubtitle.setText('Gear and modifiers').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText('Select gear, compare modifiers, press confirm to equip or unequip.')
    .setVisible(true);
}

// ---------------------------------------------------------------------------
// Items (shared with inventory)
// ---------------------------------------------------------------------------

export function renderItems(
  ctx: PauseMenuContext,
  rect: UiRect,
  getAllItems: () => Iterable<[string, number]>,
  setSelectedItemId: (id: string) => void,
  showInventoryItemDetails: () => void,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const content = insetRect(rect, 14);
  const offset = ctx.getStructuredScrollOffset();

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'ITEMS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  // Badge
  const items = Array.from(getAllItems()).filter(
    ([itemId]) => (getItem(itemId) as Item | undefined)?.kind !== 'equipment',
  );
  addUiBadge(
    scene,
    structuredContainer,
    structuredGraphics,
    { x: content.x + content.width - 98, y: content.y - 2, width: 86, height: 20 },
    `${items.length} STACKS`,
    uiColors.accentGear,
    uiColors.accentGear,
  );

  let y = content.y + 30 - offset;
  let unscrolledBottom = content.y + 30;

  if (items.length === 0) {
    addUiText(
      scene,
      structuredContainer,
      content.x,
      y,
      i18n.getFeatureString('noItemsInInventory'),
      {
        color: uiColors.textMuted,
        fontSize: '13px',
      },
    );
    y += 24;
  } else {
    for (const [itemId, count] of items.slice(0, 12)) {
      const item = getItem(itemId) as Item | undefined;
      const card: UiRect = { x: content.x, y, width: content.width, height: 48 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.panelBorderMuted,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 8, item?.name ?? itemId, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(
        scene,
        structuredContainer,
        card.x + 10,
        card.y + 27,
        `${item?.category ?? item?.kind ?? 'misc'} // x${count}`,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
        },
      );

      const actionLabel = item?.category === 'food' || item?.kind === 'consumable' ? 'USE' : 'VIEW';
      const badgeW = 50;
      addUiBadge(
        scene,
        structuredContainer,
        structuredGraphics,
        { x: card.x + card.width - badgeW - 6, y: card.y + 14, width: badgeW, height: 20 },
        actionLabel,
        uiColors.accentGear,
        uiColors.accentGear,
      );

      const zone = scene.add
        .zone(card.x, card.y, card.width, card.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        setSelectedItemId(itemId);
        showInventoryItemDetails();
      });
      structuredContainer.add(zone);

      y += 56;
      unscrolledBottom += 56;
    }
  }

  ctx.setStructuredContentHeight(content, unscrolledBottom);

  ctx.detailTitle.setText('Items').setVisible(true);
  ctx.detailSubtitle.setText('Food, materials, quest goods').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText('Click an item row for details. Food and consumables can still use U.')
    .setVisible(true);
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function renderCards(
  ctx: PauseMenuContext,
  rect: UiRect,
  getCardCollection: () => CardCollection,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const collection = getCardCollection();
  const owned = CARD_DEFINITIONS.map((card) => ({
    card,
    count: Number(collection[card.id] ?? 0),
  })).filter((entry) => entry.count > 0);
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'CARDS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  if (owned.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, i18n.getFeatureString('noCardsOwned'), {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
  } else {
    for (const { card, count } of owned.slice(0, 8)) {
      const cardRect: UiRect = { x: content.x, y, width: content.width, height: 42 };

      drawUiCard(structuredGraphics, {
        rect: cardRect,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentGear,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, cardRect.x + 10, cardRect.y + 7, card.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
      });

      addUiText(
        scene,
        structuredContainer,
        cardRect.x + 10,
        cardRect.y + 24,
        `${card.suit} // ${card.chips} chips // ${card.rarity}`,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
        },
      );

      const countBadgeW = 46;
      addUiBadge(
        scene,
        structuredContainer,
        structuredGraphics,
        {
          x: cardRect.x + cardRect.width - countBadgeW - 6,
          y: cardRect.y + 11,
          width: countBadgeW,
          height: 18,
        },
        `x${count}`,
        uiColors.accentGear,
        uiColors.accentGear,
      );

      y += 48;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText(i18n.getFeatureString('cardDetailCollection')).setVisible(true);
  ctx.detailSubtitle.setText('Collection').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody.setText(i18n.getFeatureString('cardCollectionInfo')).setVisible(true);
}

// ---------------------------------------------------------------------------
// Destiny
// ---------------------------------------------------------------------------

export function renderDestiny(
  ctx: PauseMenuContext,
  rect: UiRect,
  getDestinyView: () => readonly string[],
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const lines = getDestinyView();
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'DESTINY', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  if (lines.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, 'No destiny lines unlocked yet.', {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  } else {
    for (const line of lines) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 36 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentWorld,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 10, line, {
        color: uiColors.textPrimary,
        fontSize: '11px',
        wordWrapWidth: card.width - 20,
      });

      y += 44;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText('Destiny').setVisible(true);
  ctx.detailSubtitle.setText('Narrative threads').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText('Destiny lines appear as you progress through story beats.')
    .setVisible(true);
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export function renderArtifacts(
  ctx: PauseMenuContext,
  rect: UiRect,
  getArtifactView: () => readonly ArtifactView[],
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const artifacts = getArtifactView();
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'ARTIFACTS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  if (artifacts.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, 'No artifacts discovered yet.', {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  } else {
    for (const artifact of artifacts.slice(0, 10)) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 48 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentGear,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 8, artifact.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 27, artifact.description, {
        color: uiColors.textMuted,
        fontSize: '10px',
        wordWrapWidth: card.width - 20,
      });

      y += 56;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText('Artifacts').setVisible(true);
  ctx.detailSubtitle.setText('Discovered relics').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody.setText('Artifacts are unique items with special properties.').setVisible(true);
}
