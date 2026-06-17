import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';

export class SaveUI {
  private saveButton?: Phaser.GameObjects.Text;
  private loadButton?: Phaser.GameObjects.Text;
  private clearButton?: Phaser.GameObjects.Text;
  private seedLabel?: Phaser.GameObjects.Text;
  private scene: SnakeScene;

  constructor(scene: SnakeScene) {
    this.scene = scene;
    console.log(`[SaveUI] Constructor called, scene:`, scene);
    this.scene.events.once(Phaser.Scenes.Events.CREATE, this.build.bind(this));
  }

  private build(): void {
    console.log(`[SaveUI] build() called`);

    const buttonWidth = 100;
    const buttonHeight = 30;
    const buttonGap = 5;
    const x = this.scene.scale.width - buttonWidth - 15;
    const y = 15;

    console.log(`[SaveUI] Screen size: ${this.scene.scale.width}x${this.scene.scale.height}`);
    console.log(`[SaveUI] Button base X: ${x}, Button base Y: ${y}`);

    const saveBtn = this.scene.add
      .text(x, y, 'SAVE', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(100)
      .on('pointerover', () => this.saveButton?.setTint(0x4da3ff))
      .on('pointerout', () => this.saveButton?.clearTint())
      .on('pointerdown', () => this.saveGame());

    const loadBtn = this.scene.add
      .text(x, y + buttonHeight + buttonGap, 'LOAD', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(100)
      .on('pointerover', () => this.loadButton?.setTint(0x4da3ff))
      .on('pointerout', () => this.loadButton?.clearTint())
      .on('pointerdown', () => this.loadGame());

    const clearBtn = this.scene.add
      .text(x, y + (buttonHeight + buttonGap) * 2, 'CLEAR', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(100)
      .on('pointerover', () => this.clearButton?.setTint(0xff6b6b))
      .on('pointerout', () => this.clearButton?.clearTint())
      .on('pointerdown', () => this.clearSave());

    this.saveButton = saveBtn;
    this.loadButton = loadBtn;
    this.clearButton = clearBtn;

    const seedLabelText = this.scene.add
      .text(x, y - 24, 'Seed: —', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#8b939f',
      })
      .setOrigin(1, 0)
      .setDepth(100);
    this.seedLabel = seedLabelText;

    console.log(
      `[SaveUI] Created buttons at: SAVE(${x},${y}), LOAD(${x},${y + buttonHeight + buttonGap}), CLEAR(${x},${y + (buttonHeight + buttonGap) * 2})`,
    );
    console.log(`[SaveUI] Button text:`, {
      save: this.saveButton?.text,
      load: this.loadButton?.text,
      clear: this.clearButton?.text,
    });
    console.log(`[SaveUI] Button visible:`, {
      save: this.saveButton?.visible,
      load: this.loadButton?.visible,
      clear: this.clearButton?.visible,
    });
    console.log(`[SaveUI] Button depth:`, {
      save: this.saveButton?.depth,
      load: this.loadButton?.depth,
      clear: this.clearButton?.depth,
    });
  }

  private saveGame(): void {
    this.scene.prepareCharacterSave();
    this.scene.saveGameToSession(
      this.scene.getChosenReligionId()
        ? { id: this.scene.getChosenReligionId(), mods: this.scene.getReligionMods() }
        : undefined,
      this.scene.getChosenClassId()
        ? { id: this.scene.getChosenClassId(), mods: this.scene.getClassMods() }
        : undefined,
      this.scene.getChosenBackgroundId()
        ? { id: this.scene.getChosenBackgroundId(), mods: this.scene.getBackgroundMods() }
        : undefined,
    );

    this.scene.juice.announce('Game saved!', '#4da3ff', 1000);
  }

  private loadGame(): void {
    if (!this.scene.hasSessionSave()) {
      this.scene.juice.announce('No save file found!', '#ff6b6b', 1000);
      return;
    }

    const success = this.scene.loadGameFromSession(
      () =>
        this.scene.getChosenReligionId()
          ? { id: this.scene.getChosenReligionId(), mods: this.scene.getReligionMods() }
          : null,
      () =>
        this.scene.getChosenClassId()
          ? { id: this.scene.getChosenClassId(), mods: this.scene.getClassMods() }
          : null,
      () =>
        this.scene.getChosenBackgroundId()
          ? { id: this.scene.getChosenBackgroundId(), mods: this.scene.getBackgroundMods() }
          : null,
    );

    if (success) {
      this.scene.restoreCharacterSaveState();
      this.scene.juice.announce('Game loaded!', '#4da3ff', 1000);
    } else {
      this.scene.juice.announce('Failed to load game!', '#ff6b6b', 1000);
    }
  }

  private clearSave(): void {
    this.scene.clearSessionSave();
    this.scene.juice.announce('Save file cleared!', '#4da3ff', 1000);
  }

  isVisible(): boolean {
    const isVisible = Boolean(
      this.saveButton?.visible && this.loadButton?.visible && this.clearButton?.visible,
    );
    console.log(`[SaveUI] isVisible() returning: ${isVisible}`);
    console.log(
      `[SaveUI] Button visibilities: save=${this.saveButton?.visible}, load=${this.loadButton?.visible}, clear=${this.clearButton?.visible}`,
    );
    return isVisible;
  }

  hide(): void {
    console.log(`[SaveUI] hide() called`);
    this.saveButton?.setVisible(false);
    this.loadButton?.setVisible(false);
    this.clearButton?.setVisible(false);
    console.log(
      `[SaveUI] Buttons hidden: save=${this.saveButton?.visible}, load=${this.loadButton?.visible}, clear=${this.clearButton?.visible}`,
    );
  }

  show(): void {
    console.log(`[SaveUI] show() called`);
    this.saveButton?.setVisible(true);
    this.loadButton?.setVisible(true);
    this.clearButton?.setVisible(true);
    console.log(
      `[SaveUI] Button shown: save=${this.saveButton?.visible}, load=${this.loadButton?.visible}, clear=${this.clearButton?.visible}`,
    );
    console.log(
      `[SaveUI] Button depths: save=${this.saveButton?.depth}, load=${this.loadButton?.depth}, clear=${this.clearButton?.depth}`,
    );
  }

  setSeed(seed: string): void {
    this.seedLabel?.setText(`Seed: ${seed}`);
  }
}

export default SaveUI; // Force recompile
