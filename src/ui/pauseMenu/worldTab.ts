import type { PauseMenuContext } from './pauseMenuCommon.js';
import { addUiText, drawUiCard, insetRect, type UiRect } from '../core/UiLayout.js';
import { uiColors } from '../theme/uiTokens.js';
import { i18n } from '../../i18n/i18nManager.js';
import type { DatingCandidateView } from '../../relationships/relationshipTypes.js';
import type { AnimalCompanionView } from '../../animals/companions.js';
import type { ActorJournalEntry } from '../../game/snakeGame.js';
import type { Quest } from '../../../quests.js';

// ---------------------------------------------------------------------------
// Dating
// ---------------------------------------------------------------------------

export function renderDating(
  ctx: PauseMenuContext,
  rect: UiRect,
  getDatingView: () => readonly DatingCandidateView[],
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const views = getDatingView();
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'DATING', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  if (views.length === 0) {
    addUiText(
      scene,
      structuredContainer,
      content.x,
      y,
      i18n.getFeatureString('noActiveRelationships'),
      {
        color: uiColors.textMuted,
        fontSize: '13px',
      },
    );
    y += 24;
  } else {
    for (const view of views.slice(0, 5)) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 58 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentSocial,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 8, view.displayName, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(
        scene,
        structuredContainer,
        card.x + 10,
        card.y + 28,
        `Aff ${view.affection} // Trust ${view.trust} // Jealousy ${view.jealousy}`,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
        },
      );

      y += 66;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText(i18n.getFeatureString('datingTitle')).setVisible(true);
  ctx.detailSubtitle.setText(i18n.getFeatureString('detailRelationships')).setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText('Relationships appear here after opt-in romance choices.')
    .setVisible(true);
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export function renderQuests(
  ctx: PauseMenuContext,
  rect: UiRect,
  getAcceptedQuestList: () => readonly Quest[],
  setActiveQuestMarkerQuestId: (questId: string) => boolean,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const quests = getAcceptedQuestList();
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'QUESTS', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  if (quests.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, i18n.getFeatureString('noAcceptedQuests'), {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  } else {
    for (const quest of quests.slice(0, 5)) {
      const questStrings = i18n.getQuestString(quest.id) ?? {
        label: quest.label,
        description: quest.description,
      };
      const card: UiRect = { x: content.x, y, width: content.width, height: 62 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentWorld,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 8, questStrings.label, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 27, questStrings.description, {
        color: uiColors.textMuted,
        fontSize: '10px',
        wordWrapWidth: card.width - 28,
      });

      const zone = scene.add
        .zone(card.x, card.y, card.width, card.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        const ok =
          typeof setActiveQuestMarkerQuestId === 'function'
            ? setActiveQuestMarkerQuestId(quest.id)
            : false;
        ctx.announce(
          ok ? 'Tracking quest marker.' : 'Quest marker unavailable.',
          ok ? '#9ad1ff' : '#ff6b6b',
          1600,
        );
      });
      structuredContainer.add(zone);

      y += 70;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText('Quests').setVisible(true);
  ctx.detailSubtitle.setText(i18n.getFeatureString('detailAcceptedTasks')).setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody.setText('Click a quest card to track its marker when available.').setVisible(true);
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export function renderPeople(
  ctx: PauseMenuContext,
  rect: UiRect,
  getPeopleView: () => readonly ActorJournalEntry[],
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const views = getPeopleView();
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'PEOPLE', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  if (views.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, 'No people known yet.', {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  } else {
    for (const view of views.slice(0, 30)) {
      const details = [
        view.faction ? `Faction: ${view.faction}` : '',
        view.memories[0] ? `Remembers: ${view.memories[0]}` : '',
        view.knownFacts[0] ? `Knows: ${view.knownFacts[0]}` : '',
      ].filter(Boolean);
      const cardHeight = details.length > 0 ? 64 : 48;
      const card: UiRect = { x: content.x, y, width: content.width, height: cardHeight };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentWorld,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 7, view.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
      });

      addUiText(
        scene,
        structuredContainer,
        card.x + 10,
        card.y + 25,
        `${view.role} // ${view.mood}`,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
        },
      );

      if (details.length > 0) {
        addUiText(scene, structuredContainer, card.x + 10, card.y + 42, details.join(' // '), {
          color: '#7895b4',
          fontSize: '9px',
          wordWrapWidth: card.width - 20,
        });
      }

      y += cardHeight + 6;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText(i18n.getFeatureString('peopleTitle')).setVisible(true);
  ctx.detailSubtitle.setText(i18n.getFeatureString('detailActorJournal')).setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText('NPC memories, social ties, reveals, and mood summaries.')
    .setVisible(true);
}

// ---------------------------------------------------------------------------
// Companions
// ---------------------------------------------------------------------------

export function renderCompanions(
  ctx: PauseMenuContext,
  rect: UiRect,
  getAnimalCompanionView: () => readonly AnimalCompanionView[],
  onFeedAnimalCompanion: (companionId: string) => boolean,
  onReleaseAnimalCompanion: (companionId: string) => boolean,
): void {
  const { scene, structuredContainer, structuredGraphics } = ctx;
  const companions = getAnimalCompanionView();
  const content = insetRect(rect, 14);

  // Title
  addUiText(scene, structuredContainer, content.x, content.y, 'COMPANION HERD', {
    color: uiColors.textPrimary,
    fontSize: '14px',
    fontStyle: 'bold',
  });

  let y = content.y + 30;

  if (companions.length === 0) {
    addUiText(scene, structuredContainer, content.x, y, 'No companions yet.', {
      color: uiColors.textMuted,
      fontSize: '13px',
    });
    y += 24;
  } else {
    for (const companion of companions.slice(0, 8)) {
      const card: UiRect = { x: content.x, y, width: content.width, height: 72 };

      drawUiCard(structuredGraphics, {
        rect: card,
        fill: uiColors.panelBgInset,
        stroke: uiColors.accentWorld,
        alpha: 0.62,
        strokeAlpha: 0.58,
      });

      addUiText(scene, structuredContainer, card.x + 10, card.y + 8, companion.name, {
        color: uiColors.textPrimary,
        fontSize: '12px',
        fontStyle: 'bold',
      });

      addUiText(
        scene,
        structuredContainer,
        card.x + 10,
        card.y + 27,
        `${companion.type} // Bond Tier ${companion.bondTier}`,
        {
          color: uiColors.textMuted,
          fontSize: '10px',
        },
      );

      // Progress bar
      const barX = card.x + 10;
      const barY = card.y + 42;
      const barWidth = card.width - 20;
      const barHeight = 8;
      const progress = companion.bond / 20; // Max bond is 20
      structuredGraphics
        .fillStyle(uiColors.panelBgSecondary, 0.5)
        .fillRoundedRect(barX, barY, barWidth, barHeight, 3);
      structuredGraphics
        .fillStyle(uiColors.accentWorld, 0.7)
        .fillRoundedRect(barX, barY, barWidth * progress, barHeight, 3);

      // Feed button
      const feedRect: UiRect = {
        x: card.x + card.width - 140,
        y: card.y + 10,
        width: 64,
        height: 24,
      };
      drawUiCard(structuredGraphics, {
        rect: feedRect,
        fill: uiColors.success,
        stroke: uiColors.success,
        alpha: 0.28,
        strokeAlpha: 0.9,
      });
      addUiText(
        scene,
        structuredContainer,
        feedRect.x + feedRect.width / 2,
        feedRect.y + feedRect.height / 2,
        'Feed',
        {
          color: uiColors.textPrimary,
          fontSize: '10px',
          fontStyle: 'bold',
          align: 'center',
        },
      );

      const feedZone = scene.add
        .zone(feedRect.x, feedRect.y, feedRect.width, feedRect.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      feedZone.on('pointerdown', () => {
        onFeedAnimalCompanion(companion.id);
        ctx.announce('Companion fed.', '#9ad1ff', 1200);
      });
      structuredContainer.add(feedZone);

      // Release button
      const releaseRect: UiRect = {
        x: card.x + card.width - 70,
        y: card.y + 40,
        width: 56,
        height: 24,
      };
      drawUiCard(structuredGraphics, {
        rect: releaseRect,
        fill: uiColors.warning,
        stroke: uiColors.warning,
        alpha: 0.28,
        strokeAlpha: 0.9,
      });
      addUiText(
        scene,
        structuredContainer,
        releaseRect.x + releaseRect.width / 2,
        releaseRect.y + releaseRect.height / 2,
        'Release',
        {
          color: uiColors.textPrimary,
          fontSize: '10px',
          fontStyle: 'bold',
          align: 'center',
        },
      );

      const releaseZone = scene.add
        .zone(releaseRect.x, releaseRect.y, releaseRect.width, releaseRect.height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      releaseZone.on('pointerdown', () => {
        onReleaseAnimalCompanion(companion.id);
        ctx.announce('Companion released.', '#9ad1ff', 1200);
      });
      structuredContainer.add(releaseZone);

      y += 82;
    }
  }

  ctx.setStructuredContentHeight(content, y);

  ctx.detailTitle.setText('Herd').setVisible(true);
  ctx.detailSubtitle.setText('Animal companions').setVisible(true);
  ctx.detailRankText.setText('').setVisible(false);
  ctx.detailBody
    .setText('Feed companions to raise bond tiers and hunting bonuses.')
    .setVisible(true);
}
