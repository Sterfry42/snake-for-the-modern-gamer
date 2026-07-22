/**
 * Mutation Journal Overlay
 */
import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import { uiColors, uiTypography } from './theme/uiTokens.js';
import type { MutationSystem } from '../apples/mutation/MutationSystem.js';

export interface MutationJournalOverlayOptions {
  width?: number;
  height?: number;
  depth?: number;
}

interface JournalEntryView {
  mutationId: string;
  name: string;
  description: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  requiredApples: string[];
  evolvedAppleId: string;
  discovered: boolean;
  timesEaten: number;
  discoveredAtMs?: number;
}

const TIER_COLORS: Record<string, number> = {
  common: 0xaaaaaa,
  uncommon: 0x00ff00,
  rare: 0x0088ff,
  legendary: 0xffd700,
};

const TIER_LABELS: Record<string, string> = {
  common: 'mutation.common',
  uncommon: 'mutation.uncommon',
  rare: 'mutation.rare',
  legendary: 'mutation.legendary',
};

const DEFAULT_OPTIONS: Required<MutationJournalOverlayOptions> = {
  width: 800,
  height: 600,
  depth: 100,
};

export class MutationJournalOverlay {
  private readonly scene: SnakeScene;
  private readonly mutationSystem: MutationSystem;
  private readonly root: Phaser.GameObjects.Container;
  private entries: JournalEntryView[] = [];
  private selectedEntry: JournalEntryView | null = null;
  private listContainer: Phaser.GameObjects.Container | null = null;
  private detailContainer: Phaser.GameObjects.Container | null = null;
  private closeBtn: Phaser.GameObjects.Text | null = null;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private page = 0;
  private readonly entriesPerPage = 6;
  private readonly options: Required<MutationJournalOverlayOptions>;

  constructor(
    scene: SnakeScene,
    mutationSystem: MutationSystem,
    options: MutationJournalOverlayOptions = {},
  ) {
    this.scene = scene;
    this.mutationSystem = mutationSystem;
    this.options = {
      width: options.width ?? DEFAULT_OPTIONS.width,
      height: options.height ?? DEFAULT_OPTIONS.height,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
    };

    const x = (this.scene.scale.width - this.options.width) / 2;
    const y = (this.scene.scale.height - this.options.height) / 2;

    this.root = scene.add.container(x, y);
    this.root.setDepth(this.options.depth);

    this.createBackground();
    this.createHeader();
    this.createContent();

    scene.cameras.main.fadeIn(200, 0, 0, 0);
  }

  get container(): Phaser.GameObjects.Container {
    return this.root;
  }

  private createBackground(): void {
    this.background = this.scene.add
      .rectangle(0, 0, this.options.width, this.options.height, uiColors.panelBgPrimary, 0.95)
      .setStrokeStyle(2, uiColors.panelBorder);
    this.root.add(this.background);
  }

  private createHeader(): void {
    const title = this.scene.add
      .text(
        this.options.width / 2,
        -280,
        i18n.getFeatureString('mutationJournalTitle') ?? 'Mutation Journal',
        {
          fontFamily: uiTypography.titleLarge.fontFamily,
          fontSize: uiTypography.titleLarge.fontSize,
          color: '#ffffff',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5, 0);
    this.root.add(title);

    // Close button
    this.closeBtn = this.scene.add
      .text(this.options.width - 40, -280, '✕', {
        fontFamily: uiTypography.titleLarge.fontFamily,
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.close());
    this.root.add(this.closeBtn);
  }

  private createContent(): void {
    this.listContainer = this.scene.add.container(-380, -200);
    this.detailContainer = this.scene.add.container(20, -200);

    this.refreshEntries();
    this.renderList();
    this.renderDetail();

    this.root.add(this.listContainer!);
    this.root.add(this.detailContainer!);
  }

  private refreshEntries(): void {
    this.entries = this.mutationSystem.getJournalEntries();
  }

  private renderList(): void {
    if (!this.listContainer) return;
    this.listContainer.removeAll(true);

    const start = this.page * this.entriesPerPage;
    const end = Math.min(start + this.entriesPerPage, this.entries.length);

    for (let i = start; i < end; i++) {
      const entry = this.entries[i];
      const y = (i - start) * 60;

      const card = this.createEntryCard(entry, y);
      this.listContainer!.add(card);

      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        this.selectedEntry = entry;
        this.renderList();
        this.renderDetail();
      });
    }

    // Pagination
    if (this.entries.length > this.entriesPerPage) {
      const totalPages = Math.ceil(this.entries.length / this.entriesPerPage);

      if (this.page > 0) {
        const prevBtn = this.scene.add
          .text(-350, 280, '◀', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff' })
          .setInteractive({ useHandCursor: true });
        prevBtn.on('pointerdown', () => {
          this.page--;
          this.renderList();
        });
        this.listContainer!.add(prevBtn);
      }

      if (this.page < totalPages - 1) {
        const nextBtn = this.scene.add
          .text(350, 280, '▶', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff' })
          .setInteractive({ useHandCursor: true });
        nextBtn.on('pointerdown', () => {
          this.page++;
          this.renderList();
        });
        this.listContainer!.add(nextBtn);
      }
    }
  }

  private renderDetail(): void {
    if (!this.detailContainer) return;
    this.detailContainer.removeAll(true);

    if (!this.selectedEntry) {
      const hint = this.scene.add
        .text(
          0,
          0,
          i18n.getFeatureString('mutationJournalSelectHint') ?? 'Select a mutation to view details',
          {
            fontFamily: uiTypography.body.fontFamily,
            fontSize: uiTypography.body.fontSize,
            color: '#888888',
            align: 'center',
          },
        )
        .setOrigin(0.5);
      this.detailContainer!.add(hint);
      return;
    }

    const entry = this.selectedEntry;
    const tierColor = TIER_COLORS[entry.tier] ?? 0xffffff;

    // Title
    const title = this.scene.add
      .text(0, -200, entry.name, {
        fontFamily: uiTypography.titleMedium.fontFamily,
        fontSize: uiTypography.titleMedium.fontSize,
        color: '#' + tierColor.toString(16).padStart(6, '0'),
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    this.detailContainer!.add(title);

    // Tier badge
    const tierLabel = i18n.getFeatureString(TIER_LABELS[entry.tier] ?? entry.tier) ?? entry.tier;
    const tierBadge = this.scene.add
      .text(0, -160, tierLabel, {
        fontFamily: uiTypography.caption.fontFamily,
        fontSize: uiTypography.caption.fontSize,
        color: '#' + tierColor.toString(16).padStart(6, '0'),
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);
    this.detailContainer!.add(tierBadge);

    // Description
    const desc = this.scene.add
      .text(0, -120, entry.description, {
        fontFamily: uiTypography.body.fontFamily,
        fontSize: uiTypography.body.fontSize,
        color: '#ffffff',
        wordWrap: { width: 340 },
        align: 'left',
      })
      .setOrigin(0.5, 0);
    this.detailContainer!.add(desc);

    // Required apples
    const applesLabel = this.scene.add.text(
      -160,
      50,
      i18n.getFeatureString('mutationRequiredApples') ?? 'Required Apples:',
      {
        fontFamily: uiTypography.caption.fontFamily,
        fontSize: uiTypography.caption.fontSize,
        color: '#888888',
      },
    );
    this.detailContainer!.add(applesLabel);

    const applesText = entry.requiredApples.join(', ');
    const apples = this.scene.add.text(160, 50, applesText, {
      fontFamily: uiTypography.caption.fontFamily,
      fontSize: uiTypography.caption.fontSize,
      color: '#ffffff',
    });
    this.detailContainer!.add(apples);

    // Status
    const statusText = entry.discovered
      ? (i18n.getFeatureString('mutationDiscovered') ?? 'Discovered')
      : (i18n.getFeatureString('mutationNotDiscovered') ?? 'Not yet discovered');
    const status = this.scene.add
      .text(0, 100, statusText, {
        fontFamily: uiTypography.caption.fontFamily,
        fontSize: uiTypography.caption.fontSize,
        color: entry.discovered
          ? '#' + uiColors.success.toString(16).padStart(6, '0')
          : '#' + uiColors.warning.toString(16).padStart(6, '0'),
      })
      .setOrigin(0.5, 0);
    this.detailContainer!.add(status);

    // Times eaten
    if (entry.discovered && entry.timesEaten > 0) {
      const eatenLabel = i18n.getFeatureString('mutationTimesEaten') ?? 'Times Eaten';
      const eatenText = this.scene.add
        .text(0, 130, `${eatenLabel}: ${entry.timesEaten}`, {
          fontFamily: uiTypography.caption.fontFamily,
          fontSize: uiTypography.caption.fontSize,
          color: '#888888',
        })
        .setOrigin(0.5, 0);
      this.detailContainer!.add(eatenText);
    }
  }

  private createEntryCard(entry: JournalEntryView, y: number): Phaser.GameObjects.Container {
    const card = this.scene.add.container(0, y);
    const tierColor = TIER_COLORS[entry.tier] ?? 0xffffff;

    // Background
    const bg = this.scene.add
      .rectangle(0, 0, 340, 50, entry.discovered ? tierColor : 0x333333, 0.2)
      .setStrokeStyle(2, tierColor);
    card.add(bg);

    // Name
    const name = this.scene.add
      .text(-150, 0, entry.name, {
        fontFamily: uiTypography.body.fontFamily,
        fontSize: uiTypography.body.fontSize,
        color: entry.discovered ? '#ffffff' : '#888888',
      })
      .setOrigin(0, 0.5);
    card.add(name);

    // Tier indicator
    const indicator = this.scene.add.circle(150, 0, 6, tierColor);
    card.add(indicator);

    // Discovered status
    if (entry.discovered) {
      const check = this.scene.add
        .text(170, 0, '✓', {
          fontFamily: uiTypography.body.fontFamily,
          fontSize: uiTypography.body.fontSize,
          color: '#' + uiColors.success.toString(16).padStart(6, '0'),
        })
        .setOrigin(0.5);
      card.add(check);
    }

    card.setSize(340, 50);
    return card;
  }

  update(): void {
    this.refreshEntries();
    if (this.selectedEntry) {
      const stillValid = this.entries.find((e) => e.mutationId === this.selectedEntry!.mutationId);
      if (!stillValid) {
        this.selectedEntry = this.entries[0] ?? null;
      }
    }
    this.renderList();
    this.renderDetail();
  }

  close(): void {
    this.scene.cameras.main.fadeOut(200, 0, 0, 0);
    this.scene.time.delayedCall(200, () => {
      this.destroy();
    });
  }

  destroy(): void {
    this.listContainer?.destroy();
    this.detailContainer?.destroy();
    this.closeBtn?.destroy();
    this.background?.destroy();
    this.root.destroy();
  }
}
