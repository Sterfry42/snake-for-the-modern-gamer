import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type { Quest } from '../../quests.js';
import { i18n } from '../i18n/i18nManager.js';

interface QuestHudOptions {
  position?: { x: number; y: number };
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  lineSpacing?: number;
  depth?: number;
}

const DEFAULT_OPTIONS: Required<QuestHudOptions> = {
  position: { x: 0, y: 0 },
  fontSize: '14px',
  fontFamily: 'monospace',
  color: '#e6e6e6',
  lineSpacing: 4,
  depth: 10,
};

const MAX_VISIBLE_QUESTS = 3;

export class QuestHud {
  private readonly text: Phaser.GameObjects.Text;
  private options: Required<QuestHudOptions>;
  private hasContent = false;
  private requestedVisible = true;

  constructor(
    private readonly scene: SnakeScene,
    options: QuestHudOptions = {},
  ) {
    this.options = {
      position: options.position ?? DEFAULT_OPTIONS.position,
      fontSize: options.fontSize ?? DEFAULT_OPTIONS.fontSize,
      fontFamily: options.fontFamily ?? DEFAULT_OPTIONS.fontFamily,
      color: options.color ?? DEFAULT_OPTIONS.color,
      lineSpacing: options.lineSpacing ?? DEFAULT_OPTIONS.lineSpacing,
      depth: options.depth ?? DEFAULT_OPTIONS.depth,
    };

    this.text = this.scene.add
      .text(this.options.position.x, this.options.position.y, '', {
        fontFamily: this.options.fontFamily,
        fontSize: this.options.fontSize,
        color: this.options.color,
        lineSpacing: this.options.lineSpacing,
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(this.options.depth);
  }

  update(quests: Quest[], gridWidth: number): void {
    const visibleQuests = quests.slice(0, MAX_VISIBLE_QUESTS);
    this.hasContent = visibleQuests.length > 0;
    if (!this.hasContent) {
      this.text.setText('');
      this.text.setVisible(false);
      return;
    }

    const lines = visibleQuests.map((quest) => {
      const questStrings = i18n.getQuestString(quest.id);
      const desc = questStrings?.description ?? quest.description;
      return `[ ] ${desc}`;
    });
    const content = [i18n.getFeatureString('questsHeader'), ...lines].join('\n');

    this.text.setText(content);
    this.text.setPosition(gridWidth - 10, this.options.position.y);
    this.text.setVisible(this.requestedVisible);
  }

  setVisible(visible: boolean): void {
    this.requestedVisible = visible;
    this.text.setVisible(visible && this.hasContent);
  }
}
