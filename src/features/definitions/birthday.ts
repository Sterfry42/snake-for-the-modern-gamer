/**
 * Birthday Feature
 *
 * A little daily celebration for whoever's birthday it is.
 * The wise old snake says 25 apples is the ripe number for a wish.
 */
import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { formatBirthdayMessage, getBirthdaysForDate } from '../birthdays.js';

export const BIRTHDAY_AGE = 25;

/** Apples eaten in a round before the celebration milestone triggers. */
const MILESTONE_APPLES = BIRTHDAY_AGE;
/** Score bonus granted when the milestone is reached. */
const MILESTONE_BONUS_SCORE = BIRTHDAY_AGE;

class BirthdayFeature extends Feature {
  private applesEaten = 0;
  private bannerShownThisRound = false;
  private callout?: Phaser.GameObjects.Text;

  constructor() {
    // The id stays 'lindseyBirthday25' so existing saves keep the feature.
    super('lindseyBirthday25', 'Birthday');
  }

  override onRegister(scene: SnakeScene): void {
    this.applesEaten = 0;
    this.bannerShownThisRound = false;
    void scene;
  }

  // The scene only runs action steps while actively playing (the title screen
  // and pause screens keep the scene paused), so the first action step of a
  // round is the moment whoever is celebrating deserves a shout-out.
  override onActionStep(scene: SnakeScene): void {
    if (this.bannerShownThisRound) {
      return;
    }
    this.bannerShownThisRound = true;
    const today = new Date();
    const birthdays = getBirthdaysForDate(today.getMonth() + 1, today.getDate());
    this.showBanner(
      scene,
      formatBirthdayMessage(today.getMonth() + 1, today.getDate()),
      `Eat ${MILESTONE_APPLES} apples to toast ${
        birthdays.length === 0 ? 'the wise old snake' : birthdays.length === 1 ? 'them' : 'you all'
      }`,
    );
  }

  override onAppleEaten(scene: SnakeScene): void {
    this.applesEaten += 1;

    if (this.applesEaten % MILESTONE_APPLES !== 0) {
      return;
    }

    // Every 25th apple is a birthday apple — the wise old snake considers
    // that the most delicious way to make a wish.
    scene.addScore(MILESTONE_BONUS_SCORE);
    this.showBanner(
      scene,
      `Aaah! ${this.applesEaten} apples!`,
      `Happy Birthday bonus: +${MILESTONE_BONUS_SCORE} score`,
    );
  }

  override onGameOver(scene: SnakeScene): void {
    this.applesEaten = 0;
    this.bannerShownThisRound = false;
    this.destroyCallout(scene);
  }

  private showBanner(scene: SnakeScene, title: string, subtitle: string): void {
    this.destroyCallout(scene);

    const width = scene.grid.cols * scene.grid.cell;
    const text = scene.add
      .text(width / 2, 60, `${title}\n${subtitle}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff9ecf',
        stroke: '#05060a',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0.98);

    this.callout = text;

    scene.tweens.add({
      targets: text,
      y: 50,
      alpha: 0,
      duration: 2500,
      delay: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (text.active) {
          text.destroy();
        }
        if (this.callout === text) {
          this.callout = undefined;
        }
      },
    });
  }

  private destroyCallout(_scene?: SnakeScene): void {
    void _scene;
    if (this.callout) {
      this.callout.destroy();
      this.callout = undefined;
    }
  }
}

export default new BirthdayFeature();
