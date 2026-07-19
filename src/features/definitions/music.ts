/**
 * Music Feature
 *
 * Integrates the musical apple system, dynamic soundtrack, genre detection,
 * melody collection, and rhythm mini-game into the core game loop.
 * The wise old snake's symphony grows with every apple eaten.
 *
 * The wise old snake's music feature was added by a composer who believed
 * that every apple tells a story through sound.
 */

import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { SoundtrackComposer } from '../../audio/SoundtrackComposer.js';
import { GenreDetector } from '../../audio/GenreDetector.js';
import { MelodyCollection } from '../../audio/MelodyCollection.js';
import { RhythmMiniGame } from '../../audio/RhythmMiniGame.js';
import { SoundtrackPlayer } from '../../ui/SoundtrackPlayer.js';
import { i18n } from '../../i18n/i18nManager.js';

/**
 * Music Feature — orchestrates all music system components.
 */
class MusicFeature extends Feature {
  private composer: SoundtrackComposer | null = null;
  private genreDetector: GenreDetector | null = null;
  private melodyCollection: MelodyCollection | null = null;
  private rhythmMiniGame: RhythmMiniGame | null = null;
  private soundtrackPlayer: SoundtrackPlayer | null = null;
  private equalizerBar?: Phaser.GameObjects.Graphics;
  private genreLabel?: Phaser.GameObjects.Text;
  private melodyProgressText?: Phaser.GameObjects.Text;
  private rhythmOverlay?: Phaser.GameObjects.Container;
  private isMusicInitialized = false;

  constructor() {
    super('music', 'Musical Apple System');
  }

  override onRegister(scene: SnakeScene): void {
    // Initialize components on first register
    if (!this.isMusicInitialized) {
      this.initializeMusicSystem(scene);
      this.isMusicInitialized = true;
    }
  }

  /**
   * Initialize the music system components.
   */
  private initializeMusicSystem(scene: SnakeScene): void {
    // Create the composer
    this.composer = new SoundtrackComposer({
      baseBpm: 120,
      masterVolume: 0.4,
      reverbMix: 0.25,
      delayFeedback: 0.15,
      enableAnalyser: true,
      analyserFftSize: 256,
    });

    // Create the genre detector
    this.genreDetector = new GenreDetector({
      minimumApples: 5,
      minConfidence: 0.3,
      historySize: 30,
      decayFactor: 0.95,
    });

    // Create the melody collection
    this.melodyCollection = new MelodyCollection();

    // Create the rhythm mini-game
    this.rhythmMiniGame = new RhythmMiniGame();

    // Create the soundtrack player UI
    this.soundtrackPlayer = new SoundtrackPlayer(scene);

    // Set up callbacks
    this.setupCallbacks(scene);

    // Build the player UI (hidden until accessed)
    this.soundtrackPlayer.hide();

    // Create HUD elements
    this.buildHudElements(scene);
  }

  /**
   * Set up event callbacks for all components.
   */
  private setupCallbacks(scene: SnakeScene): void {
    if (!this.composer || !this.genreDetector || !this.melodyCollection || !this.rhythmMiniGame) {
      return;
    }

    // Composer callbacks
    this.composer?.onNotePlayed((event) => {
      // Could trigger visual effects here
    });

    this.composer?.onGenreChange((genre) => {
      if (this.genreLabel) {
        const label = genre
          ? i18n.getFeatureString(`music.genre.${genre}`) ?? genre
          : i18n.getFeatureString('music.genre.none') ?? 'Silence';
        this.genreLabel.setText(label);
      }
    });

    // Melody collection callbacks
    this.melodyCollection?.onFragmentUnlocked((fragment) => {
      // Could show a popup: "Melody fragment unlocked: {name}"
    });

    this.melodyCollection?.onTrackUnlocked((genre) => {
      // Could show a popup: "Full track unlocked: {genre}"
    });

    // Rhythm mini-game callbacks
    this.rhythmMiniGame?.onGameStart((round) => {
      // Show rhythm mini-game UI
      this.showRhythmOverlay(scene, round);
    });

    this.rhythmMiniGame?.onBeatUpdate((beatIndex, totalBeats) => {
      // Update rhythm progress UI
    });

    this.rhythmMiniGame?.onScoreUpdate((score, maxScore) => {
      // Update rhythm score UI
    });

    this.rhythmMiniGame?.onResult((result) => {
      // Hide rhythm overlay
      this.hideRhythmOverlay();

      // Show result
      if (result.success) {
        // Grant bonus rewards
        scene.addScore(result.score);
      }
    });
  }

  /**
   * Build HUD elements for music display.
   */
  private buildHudElements(scene: SnakeScene): void {
    if (!this.genreDetector || !this.melodyCollection) return;

    // Genre label
    const genreLabel = scene.add.text(10, 60, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffcc7e',
    }).setDepth(40);

    // Melody progress text
    const melodyProgress = scene.add.text(10, 74, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#9ad1ff',
    }).setDepth(40);

    this.genreLabel = genreLabel;
    this.melodyProgressText = melodyProgress;
  }

  /**
   * Show the rhythm mini-game overlay.
   */
  private showRhythmOverlay(scene: SnakeScene, round: {
    sequence: string[];
    genre: string;
    difficulty: number;
  }): void {
    const overlay = scene.add.container(
      scene.scale.width / 2,
      scene.scale.height / 2,
    ).setDepth(100);

    // Background
    const bg = scene.add.rectangle(0, 0, 400, 300, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0xff9944, 0.8);

    // Title
    const title = scene.add.text(0, -120, '🎵 Rhythm Challenge', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffcc7e',
    }).setOrigin(0.5, 0.5);

    // Instructions
    const instructions = scene.add.text(0, -80, 'Eat apples in the correct sequence!', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    // Sequence display
    const sequenceText = scene.add.text(0, -40,
      round.sequence.join(' → '), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#9ad1ff',
    }).setOrigin(0.5, 0.5);

    // Progress bar
    const progressBg = scene.add.rectangle(0, 20, 300, 20, 0x2a2a3a, 0.8);
    const progressFill = scene.add.rectangle(-150, 20, 0, 20, 0x44aaff, 0.8);

    overlay.add([bg, title, instructions, sequenceText, progressBg, progressFill]);
    this.rhythmOverlay = overlay;
  }

  /**
   * Hide the rhythm mini-game overlay.
   */
  private hideRhythmOverlay(): void {
    this.rhythmOverlay?.destroy();
    this.rhythmOverlay = undefined;
  }

  override onAppleEaten(scene: SnakeScene): void {
    if (!this.composer || !this.genreDetector || !this.melodyCollection) {
      return;
    }

    // Get the apple type from the scene
    const appleId = (scene as any).lastAppleType ?? 'normal';

    // Update all components
    this.composer.onAppleEaten(appleId);
    this.genreDetector.recordAppleEaten(appleId);
    this.melodyCollection.onAppleEaten(appleId);

    // Check rhythm mini-game
    if (this.rhythmMiniGame?.getState() === 'playing') {
      this.rhythmMiniGame.onAppleEaten(appleId);
    }
  }

  override onTick(scene: SnakeScene): void {
    if (!this.composer || !this.genreDetector || !this.melodyCollection) {
      return;
    }

    // Update HUD
    const genreState = this.genreDetector.getCurrentGenre();
    const collectionState = this.melodyCollection.getState();

    if (this.genreLabel && genreState) {
      const label = i18n.getFeatureString(`music.genre.${genreState}`) ?? genreState;
      this.genreLabel.setText(label);
    }

    if (this.melodyProgressText) {
      const lockedCount = Object.values(collectionState.fragments).filter((f) => f.state === 'locked').length;
      const text = `${i18n.getFeatureString('music.collection.progress') ?? 'Melodies'}: ${collectionState.totalUnlocked}/${collectionState.totalUnlocked + lockedCount}`;
      this.melodyProgressText.setText(text);
    }

    // Check rhythm game timeout
    if (this.rhythmMiniGame?.getState() === 'playing') {
      this.rhythmMiniGame.checkTimeout();
    }
  }

  override onRender(scene: SnakeScene): void {
    const suppressed = !!scene.getFlag<boolean>('ui.suppressHud');
    this.genreLabel?.setVisible(!suppressed);
    this.melodyProgressText?.setVisible(!suppressed);
  }

  override onGameOver(scene: SnakeScene): void {
    // Save melody collection state
    if (this.melodyCollection) {
      const state = this.melodyCollection.serialize();
      scene.setFlag('music.collectionState', state);
    }

    // Stop the composer
    this.composer?.stop();
  }

  /**
   * Get the composer instance.
   */
  getComposer(): SoundtrackComposer | null {
    return this.composer;
  }

  /**
   * Get the genre detector instance.
   */
  getGenreDetector(): GenreDetector | null {
    return this.genreDetector;
  }

  /**
   * Get the melody collection instance.
   */
  getMelodyCollection(): MelodyCollection | null {
    return this.melodyCollection;
  }

  /**
   * Get the rhythm mini-game instance.
   */
  getRhythmMiniGame(): RhythmMiniGame | null {
    return this.rhythmMiniGame;
  }

  /**
   * Get the soundtrack player instance.
   */
  getSoundtrackPlayer(): SoundtrackPlayer | null {
    return this.soundtrackPlayer;
  }

  /**
   * Toggle the soundtrack player UI.
   */
  toggleSoundtrackPlayer(scene: SnakeScene): void {
    if (!this.soundtrackPlayer) return;

    this.soundtrackPlayer.hide();
    // Update collection state
    if (this.melodyCollection) {
      this.soundtrackPlayer.updateCollectionState(this.melodyCollection.getState());
    }
    this.soundtrackPlayer.show();
  }
}

export default new MusicFeature();
