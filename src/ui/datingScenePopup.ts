import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { RuntimeSpriteFactory } from './runtimeSpriteFactory.js';
import type {
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipEventResult,
  RelationshipState,
} from '../relationships/relationshipTypes.js';
import {
  getDatingPortraitAsset,
  type DatingPortraitMood,
} from '../relationships/datingPortraitManifest.js';
import type { ControllerNavCommand } from '../input/controllerNavigation.js';
import {
  datingPortraitRecipe,
  type DatingPortraitPalette,
  type DatingPortraitVariant,
} from './spriteRecipes/datingPortraitRecipe.js';

export type DatingSceneAction =
  | RelationshipChoice
  | 'gift'
  | 'leave'
  | 'continue'
  | 'branch-protect'
  | 'branch-run'
  | 'branch-joke'
  | 'branch-honest'
  | 'branch-pineapple'
  | 'branch-pepperoni'
  | 'branch-mushroom'
  | `branch-${string}`;

export interface DatingSceneButton {
  id: DatingSceneAction;
  label: string;
  tone?: 'romance' | 'danger' | 'quiet';
  disabled?: boolean;
  reason?: string;
}

interface DatingSceneOptions {
  profile: RelationshipCandidateProfile;
  state?: RelationshipState;
  line: string;
  result?: RelationshipEventResult;
  actions?: readonly DatingSceneButton[];
  lineIsNarration?: boolean;
  onAction(action: DatingSceneAction): void;
}

export class DatingScenePopup {
  private readonly spriteFactory: RuntimeSpriteFactory;
  private container?: Phaser.GameObjects.Container;
  private portrait?: Phaser.GameObjects.Image;
  private title?: Phaser.GameObjects.Text;
  private statText?: Phaser.GameObjects.Text;
  private lineText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;
  private controllerHint?: Phaser.GameObjects.Text;
  private actionTexts: Phaser.GameObjects.Text[] = [];
  private actionButtons: Phaser.GameObjects.Rectangle[] = [];
  private currentActions: readonly DatingSceneButton[] = [];
  private selectedActionIndex = 0;
  private controllerMode = false;
  private keyboardFocus = false;
  private hoveredActionIndex = -1;
  private onAction?: (action: DatingSceneAction) => void;

  constructor(private readonly scene: SnakeScene) {
    this.spriteFactory = new RuntimeSpriteFactory(scene);
    this.build();
  }

  show(options: DatingSceneOptions): void {
    this.onAction = options.onAction;
    this.keyboardFocus = false;
    this.hoveredActionIndex = -1;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const profile = options.profile;
    const state = options.state;
    const portraitSize = Math.min(512, Math.floor(Math.min(width * 0.62, height * 0.68)));
    const topHeight = Math.floor(height * 0.68);
    const mood = this.getPortraitMood(state, options.result);
    this.setPortrait(profile, portraitSize, topHeight, mood);

    this.title?.setText(profile.displayName);
    this.statText?.setText(
      state
        ? `Stage ${state.stage}   Affection ${state.affection}   Trust ${state.trust}   Jealousy ${state.jealousy}   Resentment ${state.resentment}`
        : 'Stage stranger   Affection 0   Trust 0   Jealousy 0   Resentment 0',
    );
    this.lineText?.setText(options.lineIsNarration ? options.line : `"${options.line}"`);
    const resultMessage = this.formatResultMessage(
      options.result?.message ?? '',
      options.line,
      profile.displayName,
    );
    this.resultText?.setText(resultMessage).setVisible(resultMessage.length > 0);
    this.resultText?.setColor(options.result?.color ?? '#ffbdfd');
    this.layoutActions(width, height, options.actions);
    this.container?.setVisible(true).setDepth(76).setAlpha(1);
  }

  hide(): void {
    this.container?.setVisible(false);
    this.onAction = undefined;
  }

  isVisible(): boolean {
    return Boolean(this.container?.visible);
  }

  setControllerMode(active: boolean): void {
    this.controllerMode = active;
    this.controllerHint?.setVisible(active);
    this.refreshControllerSelection();
  }

  handleControllerCommand(command: ControllerNavCommand): boolean {
    if (!this.isVisible()) return false;
    if (command === 'left' || command === 'up') {
      this.moveControllerSelection(-1);
      return true;
    }
    if (command === 'right' || command === 'down') {
      this.moveControllerSelection(1);
      return true;
    }
    if (command === 'confirm') {
      const action = this.currentActions[this.selectedActionIndex];
      if (action && !action.disabled) this.onAction?.(action.id);
      return true;
    }
    if (command === 'cancel') {
      const leave = this.currentActions.find((action) => action.id === 'leave' && !action.disabled);
      if (leave) this.onAction?.(leave.id);
      return true;
    }
    return false;
  }

  handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!this.isVisible()) return false;
    this.keyboardFocus = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      this.moveControllerSelection(-1);
      return true;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Tab') {
      this.moveControllerSelection(event.shiftKey ? -1 : 1);
      return true;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      return this.handleControllerCommand('confirm');
    }
    if (event.key === 'Escape') {
      return this.handleControllerCommand('cancel');
    }
    return false;
  }

  private formatResultMessage(message: string, visibleLine: string, displayName: string): string {
    const match = message.match(/^(Loved|Liked|Neutral|Disliked|Hated):\s*[^"]*"([^"]+)"\s*$/i);
    if (!match) return message;
    const tier = match[1] ?? '';
    const spoken = match[2] ?? '';
    if (spoken === visibleLine) {
      return `${displayName} ${tier.toLowerCase()} that.`;
    }
    return message;
  }

  private setPortrait(
    profile: RelationshipCandidateProfile,
    portraitSize: number,
    topHeight: number,
    mood: DatingPortraitMood,
  ): void {
    const width = this.scene.scale.width;
    const asset = getDatingPortraitAsset(profile, mood);

    if (asset && this.scene.textures.exists(asset.key)) {
      this.portrait
        ?.setTexture(asset.key)
        .clearTint()
        .setAlpha(1)
        .setDisplaySize(portraitSize, portraitSize)
        .setPosition(width / 2, Math.max(18 + portraitSize / 2, topHeight / 2))
        .setVisible(true);
      this.applyPortraitMoodTreatment(mood, asset.mood === mood);
      return;
    }

    this.setGeneratedPortrait(profile, portraitSize, topHeight, mood);
  }

  private setGeneratedPortrait(
    profile: RelationshipCandidateProfile,
    portraitSize: number,
    topHeight: number,
    mood: DatingPortraitMood,
  ): void {
    const width = this.scene.scale.width;
    const keys = this.spriteFactory.ensureRecipe(
      datingPortraitRecipe,
      512,
      this.paletteFor(profile),
    );
    this.portrait
      ?.setTexture(keys[this.variantFor(profile)])
      .clearTint()
      .setAlpha(1)
      .setDisplaySize(portraitSize, portraitSize)
      .setPosition(width / 2, Math.max(18 + portraitSize / 2, topHeight / 2))
      .setVisible(true);
    this.applyPortraitMoodTreatment(mood, false);
  }

  private getPortraitMood(
    state?: RelationshipState,
    result?: RelationshipEventResult,
  ): DatingPortraitMood {
    const message = result?.message ?? '';
    if (/Hated|Disliked|hostile|murderous|knife|cruel|already married/i.test(message))
      return 'angry';
    if (/proposal before|hurt|divorced|breakup|neglect|silence|rejected/i.test(message))
      return 'sad';
    if (/Loved|Liked|married|accepted|reassured|apologized/i.test(message)) return 'happy';
    if (!state) return 'neutral';
    const latest = state.memories[state.memories.length - 1];
    if (state.stage === 'murderous' || state.stage === 'hostile' || state.resentment >= 55)
      return 'angry';
    if (state.stage === 'heartbroken' || state.stage === 'estranged' || state.jealousy >= 55)
      return 'sad';
    if (latest?.tone === 'traumatic') return 'angry';
    if (latest?.tone === 'negative')
      return latest.kind === 'neglect' || latest.kind === 'proposalRejected' ? 'sad' : 'angry';
    if (latest?.tone === 'positive' || state.stage === 'lover' || state.stage === 'married')
      return 'happy';
    return 'neutral';
  }

  private applyPortraitMoodTreatment(mood: DatingPortraitMood, hasExactMoodAsset: boolean): void {
    if (hasExactMoodAsset || mood === 'neutral') {
      return;
    }
    if (mood === 'angry') {
      this.portrait?.setTint(0xff9b9b).setAlpha(1);
    } else if (mood === 'sad') {
      this.portrait?.setTint(0x9fb7d8).setAlpha(0.88);
    } else if (mood === 'happy') {
      this.portrait?.setTint(0xffd3ee).setAlpha(1);
    }
  }

  private build(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const background = this.scene.add
      .rectangle(0, 0, width, height, 0x130d1f, 0.96)
      .setOrigin(0, 0);
    const vignette = this.scene.add
      .rectangle(width / 2, height / 2, width - 28, height - 28, 0x000000, 0)
      .setStrokeStyle(3, 0xffbdfd, 0.62);
    this.portrait = this.scene.add.image(width / 2, height * 0.34, '').setOrigin(0.5);
    this.title = this.scene.add
      .text(24, 18, '', {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '30px',
        color: '#fff3f8',
        stroke: '#301124',
        strokeThickness: 4,
      })
      .setOrigin(0, 0);
    this.statText = this.scene.add
      .text(24, 56, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffc7ea',
      })
      .setOrigin(0, 0);
    const dialoguePanel = this.scene.add
      .rectangle(24, height * 0.64, width - 48, 118, 0x080610, 0.82)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffbdfd, 0.58);
    this.lineText = this.scene.add
      .text(42, height * 0.655, '', {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '18px',
        color: '#fff6fb',
        wordWrap: { width: width - 84 },
      })
      .setOrigin(0, 0);
    this.resultText = this.scene.add
      .text(42, height * 0.735, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffbdfd',
        wordWrap: { width: width - 84 },
      })
      .setOrigin(0, 0);
    this.controllerHint = this.scene.add
      .text(width - 24, 24, 'LEFT STICK: SELECT   SOUTH: CHOOSE   EAST: LEAVE', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fff3a8',
        backgroundColor: '#130d1f',
        padding: { left: 7, right: 7, top: 4, bottom: 4 },
      })
      .setOrigin(1, 0)
      .setVisible(false);

    this.container = this.scene.add
      .container(0, 0, [
        background,
        vignette,
        this.portrait,
        dialoguePanel,
        this.title,
        this.statText,
        this.lineText,
        this.resultText,
        this.controllerHint,
      ])
      .setVisible(false);
  }

  private layoutActions(
    width: number,
    height: number,
    overrideActions?: readonly DatingSceneButton[],
  ): void {
    const actions: readonly DatingSceneButton[] = overrideActions ?? [
      { id: 'talk', label: 'Talk' },
      { id: 'gift', label: 'Gift' },
      { id: 'flirt', label: 'Flirt' },
      { id: 'date', label: 'Date' },
      { id: 'apologize', label: 'Apologize' },
      { id: 'mean', label: 'Be Mean', tone: 'danger' },
      { id: 'break-up', label: 'Break Up', tone: 'danger' },
      { id: 'boundary', label: 'Boundary' },
      { id: 'leave', label: 'Leave' },
    ];
    this.layoutActionButtons(actions, width, height);
  }

  private layoutActionButtons(
    actions: readonly DatingSceneButton[],
    width: number,
    height: number,
  ): void {
    this.currentActions = actions;
    this.selectedActionIndex = Math.max(
      0,
      actions.findIndex((action) => !action.disabled),
    );
    this.actionTexts.forEach((text) => text.destroy());
    this.actionButtons.forEach((button) => button.destroy());
    this.actionTexts = [];
    this.actionButtons = [];
    const columns = Math.min(5, Math.max(1, actions.length));
    const rows = Math.ceil(actions.length / columns);
    const gap = 8;
    const buttonHeight = 42;
    const buttonWidth = Math.max(108, Math.floor((width - 48 - gap * (columns - 1)) / columns));
    const totalWidth = columns * buttonWidth + (columns - 1) * gap;
    const startX = Math.floor((width - totalWidth) / 2);
    const startY = height - 18 - rows * buttonHeight - (rows - 1) * gap;
    actions.forEach((action, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + column * (buttonWidth + gap);
      const y = startY + row * (buttonHeight + gap);
      const quiet = action.tone === 'quiet' || action.id === 'leave';
      const danger = action.tone === 'danger';
      const disabled = Boolean(action.disabled);
      const fill = disabled ? 0x211d28 : quiet ? 0x172438 : danger ? 0x4a1717 : 0x4a1738;
      const button = this.scene.add
        .rectangle(x, y, buttonWidth, buttonHeight, fill, disabled ? 0.62 : 0.94)
        .setOrigin(0, 0)
        .setStrokeStyle(2, disabled ? 0x45404d : quiet ? 0x5e8bbd : danger ? 0xc66b62 : 0xb85c91);
      const text = this.scene.add
        .text(
          x + buttonWidth / 2,
          y + buttonHeight / 2,
          disabled && action.reason ? `${action.label}\n${action.reason}` : action.label,
          {
            fontFamily: 'monospace',
            fontSize: disabled || actions.length > 8 ? '11px' : '14px',
            color: disabled ? '#7b7b86' : quiet ? '#9ad1ff' : danger ? '#ffc0b8' : '#ffe6f4',
            fixedWidth: buttonWidth - 12,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setAlpha(disabled ? 0.62 : 1);
      if (!disabled) {
        button
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            this.keyboardFocus = false;
            this.hoveredActionIndex = index;
            this.selectedActionIndex = index;
            this.refreshControllerSelection();
          })
          .on('pointerout', () => {
            this.hoveredActionIndex = -1;
            this.refreshControllerSelection();
          })
          .on('pointerdown', () => this.onAction?.(action.id));
      }
      this.container?.add([button, text]);
      this.actionButtons.push(button);
      this.actionTexts.push(text);
    });
    this.refreshControllerSelection();
  }

  private moveControllerSelection(delta: number): void {
    if (this.currentActions.length === 0) return;
    let next = this.selectedActionIndex;
    for (let attempts = 0; attempts < this.currentActions.length; attempts += 1) {
      next = (next + delta + this.currentActions.length) % this.currentActions.length;
      if (!this.currentActions[next]?.disabled) {
        this.selectedActionIndex = next;
        break;
      }
    }
    this.refreshControllerSelection();
  }

  private refreshControllerSelection(): void {
    this.actionTexts.forEach((text, index) => {
      const action = this.currentActions[index];
      const selected =
        ((this.controllerMode || this.keyboardFocus) && index === this.selectedActionIndex) ||
        index === this.hoveredActionIndex;
      const focused = selected && !action?.disabled;
      const quiet = action?.tone === 'quiet' || action?.id === 'leave';
      const danger = action?.tone === 'danger';
      const button = this.actionButtons[index];
      button?.setStrokeStyle(
        focused ? 4 : 2,
        focused
          ? 0xfff3a8
          : action?.disabled
            ? 0x45404d
            : quiet
              ? 0x5e8bbd
              : danger
                ? 0xc66b62
                : 0xb85c91,
        focused ? 1 : 0.88,
      );
      button?.setScale(focused ? 1.035 : 1);
      text.setColor(
        focused
          ? '#fff3a8'
          : action?.disabled
            ? '#7b7b86'
            : quiet
              ? '#9ad1ff'
              : danger
                ? '#ffc0b8'
                : '#ffe6f4',
      );
      text.setScale(focused ? 1.035 : 1);
    });
  }

  private variantFor(profile: RelationshipCandidateProfile): DatingPortraitVariant {
    if (profile.species === 'goblin') return 'goblin';
    if (profile.species === 'angel') return 'angel';
    if (profile.species === 'goblin-angel') return 'goblin-angel';
    return this.hash(profile.id) % 2 === 0 ? 'human-femme' : 'human-masc';
  }

  private paletteFor(profile: RelationshipCandidateProfile): DatingPortraitPalette {
    const hue = this.hash(profile.id);
    const species = profile.species;
    if (species === 'goblin' || species === 'goblin-angel') {
      return {
        skin: species === 'goblin-angel' ? '#b9e878' : '#7fc35b',
        hair: '#203512',
        accent: species === 'goblin-angel' ? '#ddff8c' : '#d2f06d',
        outfit: '#293317',
        eye: '#ffe66d',
        blush: '#e685a2',
      };
    }
    if (species === 'angel') {
      return {
        skin: '#f1d0b7',
        hair: '#f8e7a6',
        accent: '#fff3a8',
        outfit: '#f7fbff',
        eye: '#9ad1ff',
        blush: '#ff9fc6',
      };
    }
    const palettes: DatingPortraitPalette[] = [
      {
        skin: '#d9a37f',
        hair: '#2a1713',
        accent: '#ff8fb8',
        outfit: '#293b5f',
        eye: '#5dd6a2',
        blush: '#ff8fb8',
      },
      {
        skin: '#f0c6a6',
        hair: '#5b2b46',
        accent: '#9ad1ff',
        outfit: '#4c2742',
        eye: '#8bdcff',
        blush: '#ff9fc6',
      },
      {
        skin: '#b9836f',
        hair: '#111827',
        accent: '#ffd166',
        outfit: '#263d36',
        eye: '#ffd166',
        blush: '#ff8a90',
      },
      {
        skin: '#e4b58f',
        hair: '#8b5a2b',
        accent: '#c8ffe1',
        outfit: '#3f2c5f',
        eye: '#c8ffe1',
        blush: '#ff9fc6',
      },
    ];
    return palettes[hue % palettes.length];
  }

  private hash(value: string): number {
    let total = 0;
    for (let i = 0; i < value.length; i += 1) {
      total = (total * 31 + value.charCodeAt(i)) >>> 0;
    }
    return total;
  }
}
