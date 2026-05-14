import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { RuntimeSpriteFactory } from './runtimeSpriteFactory.js';
import type {
  RelationshipCandidateProfile,
  RelationshipChoice,
  RelationshipEventResult,
  RelationshipSpecies,
  RelationshipState,
} from '../relationships/relationshipTypes.js';
import { getDatingPortraitAsset } from '../relationships/datingPortraitManifest.js';
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
  private actionTexts: Phaser.GameObjects.Text[] = [];
  private onAction?: (action: DatingSceneAction) => void;

  constructor(private readonly scene: SnakeScene) {
    this.spriteFactory = new RuntimeSpriteFactory(scene);
    this.build();
  }

  show(options: DatingSceneOptions): void {
    this.onAction = options.onAction;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const profile = options.profile;
    const state = options.state;
    const portraitSize = Math.min(512, Math.floor(Math.min(width * 0.62, height * 0.68)));
    const topHeight = Math.floor(height * 0.68);
    this.setPortrait(profile, portraitSize, topHeight);

    this.title?.setText(profile.displayName);
    this.statText?.setText(
      state
        ? `Stage ${state.stage}   Affection ${state.affection}   Trust ${state.trust}   Jealousy ${state.jealousy}   Resentment ${state.resentment}`
        : 'Stage stranger   Affection 0   Trust 0   Jealousy 0   Resentment 0',
    );
    this.lineText?.setText(options.lineIsNarration ? options.line : `"${options.line}"`);
    this.resultText?.setText(options.result?.message ?? '');
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

  private setPortrait(profile: RelationshipCandidateProfile, portraitSize: number, topHeight: number): void {
    const width = this.scene.scale.width;
    const asset = getDatingPortraitAsset(profile);

    if (asset && this.scene.textures.exists(asset.key)) {
      this.portrait
        ?.setTexture(asset.key)
        .setDisplaySize(portraitSize, portraitSize)
        .setPosition(width / 2, Math.max(18 + portraitSize / 2, topHeight / 2))
        .setVisible(true);
      return;
    }

    this.setGeneratedPortrait(profile, portraitSize, topHeight);
  }

  private setGeneratedPortrait(
    profile: RelationshipCandidateProfile,
    portraitSize: number,
    topHeight: number,
  ): void {
    const width = this.scene.scale.width;
    const keys = this.spriteFactory.ensureRecipe(
      datingPortraitRecipe,
      512,
      this.paletteFor(profile),
    );
    this.portrait
      ?.setTexture(keys[this.variantFor(profile)])
      .setDisplaySize(portraitSize, portraitSize)
      .setPosition(width / 2, Math.max(18 + portraitSize / 2, topHeight / 2))
      .setVisible(true);
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
      .rectangle(24, height * 0.66, width - 48, 88, 0x080610, 0.82)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffbdfd, 0.58);
    this.lineText = this.scene.add
      .text(42, height * 0.675, '', {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '19px',
        color: '#fff6fb',
        wordWrap: { width: width - 84 },
      })
      .setOrigin(0, 0);
    this.resultText = this.scene.add
      .text(42, height * 0.735, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffbdfd',
        wordWrap: { width: width - 84 },
      })
      .setOrigin(0, 0);

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
      ])
      .setVisible(false);
  }

  private layoutActions(width: number, height: number, overrideActions?: readonly DatingSceneButton[]): void {
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

  private layoutActionButtons(actions: readonly DatingSceneButton[], width: number, height: number): void {
    this.actionTexts.forEach((text) => text.destroy());
    this.actionTexts = [];
    const bottomY = height - 62;
    const buttonWidth = Math.max(82, Math.floor((width - 64) / actions.length) - 6);
    const totalWidth = actions.length * buttonWidth + (actions.length - 1) * 6;
    let x = Math.floor((width - totalWidth) / 2);
    for (const action of actions) {
      const quiet = action.tone === 'quiet' || action.id === 'leave';
      const danger = action.tone === 'danger';
      const disabled = Boolean(action.disabled);
      const text = this.scene.add
        .text(x + buttonWidth / 2, bottomY, disabled && action.reason ? `${action.label}\n${action.reason}` : action.label, {
          fontFamily: 'monospace',
          fontSize: disabled || actions.length > 8 ? '12px' : '15px',
          color: disabled ? '#7b7b86' : quiet ? '#9ad1ff' : danger ? '#ffc0b8' : '#ffe6f4',
          backgroundColor: disabled ? '#211d28' : quiet ? '#172438' : danger ? '#4a1717' : '#4a1738',
          padding: { left: 8, right: 8, top: 7, bottom: 7 },
          fixedWidth: buttonWidth,
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setAlpha(disabled ? 0.62 : 1);
      if (!disabled) {
        text
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => text.setColor('#ffffff'))
          .on('pointerout', () => text.setColor(quiet ? '#9ad1ff' : danger ? '#ffc0b8' : '#ffe6f4'))
          .on('pointerdown', () => this.onAction?.(action.id));
      }
      this.container?.add(text);
      this.actionTexts.push(text);
      x += buttonWidth + 6;
    }
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
      { skin: '#d9a37f', hair: '#2a1713', accent: '#ff8fb8', outfit: '#293b5f', eye: '#5dd6a2', blush: '#ff8fb8' },
      { skin: '#f0c6a6', hair: '#5b2b46', accent: '#9ad1ff', outfit: '#4c2742', eye: '#8bdcff', blush: '#ff9fc6' },
      { skin: '#b9836f', hair: '#111827', accent: '#ffd166', outfit: '#263d36', eye: '#ffd166', blush: '#ff8a90' },
      { skin: '#e4b58f', hair: '#8b5a2b', accent: '#c8ffe1', outfit: '#3f2c5f', eye: '#c8ffe1', blush: '#ff9fc6' },
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
