/**
 * Soundtrack Player UI
 *
 * Music player UI component for viewing composed tracks, favorites,
 * and listening in the pause menu. The wise old snake's playlist
 * grows with every adventure.
 *
 * The wise old snake's soundtrack player has 999 tracks.
 * The wise old snake once listened to their own composition for 7 days straight.
 * The wise old snake's favorite track is "Wasabi Waltz in A Minor."
 */

import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import { i18n } from '../i18n/i18nManager.js';
import type { AppleGenre } from '../audio/MusicalAppleMap.js';
import type { MelodyCollectionState } from '../audio/MelodyCollection.js';

/** Track entry for the playlist */
export interface TrackEntry {
  /** Track ID */
  id: string;
  /** Track name (i18n key) */
  nameKey: string;
  /** Genre this track belongs to */
  genre: AppleGenre;
  /** Duration in beats */
  duration: number;
  /** Whether the track is unlocked */
  unlocked: boolean;
  /** Whether the track is a favorite */
  favorite: boolean;
  /** Notes in the track */
  notes: number[];
  /** Durations in beats */
  durations: number[];
}

/** Soundtrack player UI state */
export type PlayerView = 'tracks' | 'genres' | 'favorites' | 'collection';

/** Soundtrack player UI configuration */
export interface SoundtrackPlayerConfig {
  /** Initial view */
  initialView?: PlayerView;
  /** Track height per row */
  rowHeight?: number;
  /** Font size for track names */
  fontSize?: number;
}

/** Default configuration */
const DEFAULT_CONFIG: Required<SoundtrackPlayerConfig> = {
  initialView: 'tracks',
  rowHeight: 32,
  fontSize: 12,
};

/**
 * Soundtrack Player UI — displays the music player in the pause menu.
 */
export class SoundtrackPlayer {
  private scene: SnakeScene;
  private config: Required<SoundtrackPlayerConfig>;
  private view: PlayerView;
  private scrollOffset = 0;
  private selectedIndex = 0;
  private isPlaying = false;
  private currentTrackIndex = 0;
  private playerContainer?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private trackList?: Phaser.GameObjects.Container;
  private currentTrackText?: Phaser.GameObjects.Text;
  private closeButton?: Phaser.GameObjects.Container;
  private genreFilterActive: AppleGenre | null = null;
  private favoritesOnly = false;

  // Track data
  private tracks: TrackEntry[] = [];
  private collectionState: MelodyCollectionState | null = null;

  constructor(scene: SnakeScene, config?: SoundtrackPlayerConfig) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.view = this.config.initialView;
    this.buildTracks();
  }

  /**
   * Build the track list from melody collection data.
   */
  private buildTracks(): void {
    this.tracks = [];

    // Generate tracks from genre definitions and melody fragments
    const genreNames: Record<AppleGenre, string> = {
      calm: 'music.track.calm',
      energetic: 'music.track.energetic',
      mysterious: 'music.track.mysterious',
      festival: 'music.track.festival',
    };

    for (const genre of ['calm', 'energetic', 'mysterious', 'festival'] as AppleGenre[]) {
      this.tracks.push({
        id: `${genre}-full`,
        nameKey: genreNames[genre],
        genre,
        duration: 128,
        unlocked: false,
        favorite: false,
        notes: [60, 64, 67, 72, 67, 64, 60],
        durations: [1, 1, 0.75, 0.5, 0.75, 1, 2],
      });
    }
  }

  /**
   * Update tracks with collection state.
   */
  updateCollectionState(state: MelodyCollectionState): void {
    this.collectionState = state;

    // Update track unlocked states
    for (const track of this.tracks) {
      track.unlocked = state.unlockedTracks.includes(track.genre);
    }

    // Update favorites from saved state
    if (state.fragments) {
      for (const fragment of Object.values(state.fragments)) {
        if (fragment.state === 'completed') {
          const track = this.tracks.find((t) => t.genre === fragment.id.split('-')[0]);
          if (track) {
            track.favorite = true;
          }
        }
      }
    }
  }

  /**
   * Build the UI components.
   */
  build(): void {
    const { scene, config } = this;

    // Container for the entire player
    const container = scene.add.container(0, 0);
    container.setDepth(50);

    // Background
    const bg = scene.add
      .rectangle(0, 0, 280, 360, 0x1a1a2e, 0.95)
      .setStrokeStyle(1.5, 0xff9944, 0.6)
      .setOrigin(0, 0);
    container.add(bg);

    // Title
    const title = scene.add.text(16, 12, i18n.getFeatureString('music.player.title') ?? '🎵 Soundtrack', {
      fontFamily: 'monospace',
      fontSize: `${config.fontSize + 2}px`,
      color: '#ffcc7e',
    });
    container.add(title);

    // View tabs
    this.buildViewTabs(container);

    // Track list container
    const trackList = scene.add.container(10, 50);
    container.add(trackList);

    // Build initial track list
    this.renderTrackList(trackList);

    // Current track info
    const currentTrackText = scene.add.text(16, 320, '', {
      fontFamily: 'monospace',
      fontSize: `${config.fontSize}px`,
      color: '#9ad1ff',
    });
    container.add(currentTrackText);

    // Close button
    const closeContainer = this.buildCloseButton(container);
    container.add(closeContainer);

    this.playerContainer = container;
    this.background = bg;
    this.titleText = title;
    this.trackList = trackList;
    this.currentTrackText = currentTrackText;
    this.closeButton = closeContainer;

    // Position the player
    container.setPosition(
      scene.scale.width - 296,
      scene.scale.height - 380,
    );
  }

  /**
   * Build view tabs (tracks, genres, favorites, collection).
   */
  private buildViewTabs(parent: Phaser.GameObjects.Container): Phaser.GameObjects.Container {
    const { scene } = this;
    const tabContainer = scene.add.container(16, 36);

    const views: { id: PlayerView; label: string }[] = [
      { id: 'tracks', label: i18n.getFeatureString('music.tab.tracks') ?? 'Tracks' },
      { id: 'genres', label: i18n.getFeatureString('music.tab.genres') ?? 'Genres' },
      { id: 'favorites', label: i18n.getFeatureString('music.tab.favorites') ?? 'Favorites' },
      { id: 'collection', label: i18n.getFeatureString('music.tab.collection') ?? 'Collection' },
    ];

    const tabWidth = 60;
    const tabGap = 4;

    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      i * (tabWidth + tabGap);

      const tabBg = scene.add.rectangle(0, 0, tabWidth, 20, 0x2a2a3a, 0.8)
        .setStrokeStyle(1, 0x666666, 0.5)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });

      const tabLabel = scene.add.text(tabWidth / 2, 10, view.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#cccccc',
      }).setOrigin(0.5, 0.5);

      tabBg.on('pointerdown', () => {
        this.switchView(view.id);
      });

      tabBg.on('pointerover', () => {
        tabBg.setFillStyle(0x3a3a4a, 0.9);
        tabBg.setStrokeStyle(1, 0xff9944, 0.8);
        tabLabel.setColor('#ffcc7e');
      });

      tabBg.on('pointerout', () => {
        tabBg.setFillStyle(0x2a2a3a, 0.8);
        tabBg.setStrokeStyle(1, 0x666666, 0.5);
        tabLabel.setColor('#cccccc');
      });

      tabContainer.add(tabBg);
      tabContainer.add(tabLabel);
    }

    parent.add(tabContainer);
    return tabContainer;
  }

  /**
   * Switch to a different view.
   */
  private switchView(view: PlayerView): void {
    this.view = view;
    this.scrollOffset = 0;
    this.selectedIndex = 0;
    this.renderTrackList(this.trackList!);
  }

  /**
   * Render the track list.
   */
  private renderTrackList(container: Phaser.GameObjects.Container): void {
    // Clear existing
    container.removeAll(true);

    let items: TrackEntry[] = [];

    switch (this.view) {
      case 'tracks':
        items = this.tracks.filter((t) => t.unlocked);
        break;
      case 'genres':
        items = this.tracks;
        break;
      case 'favorites':
        items = this.tracks.filter((t) => t.favorite);
        break;
      case 'collection':
        // Show genre completions
        this.renderCollectionView(container);
        return;
    }

    // Filter by favorites if active
    if (this.favoritesOnly && this.view !== 'favorites') {
      items = items.filter((t) => t.favorite);
    }

    // Filter by genre if active
    if (this.genreFilterActive && this.view !== 'genres') {
      items = items.filter((t) => t.genre === this.genreFilterActive);
    }

    // Apply scroll
    const visibleCount = Math.floor(280 / this.config.rowHeight);
    const start = Math.max(0, Math.min(this.scrollOffset, items.length - visibleCount));
    const visibleItems = items.slice(start, start + visibleCount);

    const genreColors: Record<AppleGenre, number> = {
      calm: 0x44aaff,
      energetic: 0xff4444,
      mysterious: 0xaa44ff,
      festival: 0xffaa00,
    };

    for (let i = 0; i < visibleItems.length; i++) {
      const track = visibleItems[i];
      const y = i * this.config.rowHeight;
      const globalIndex = start + i;
      const isSelected = globalIndex === this.selectedIndex;

      // Row background
      const rowBg = this.scene.add.rectangle(0, this.config.rowHeight / 2, 260, this.config.rowHeight - 2,
        isSelected ? 0x3a3a4a : 0x2a2a3a, 0.8);
      rowBg.setStrokeStyle(1, isSelected ? 0xff9944 : 0x444444, 0.5);
      rowBg.setInteractive({ useHandCursor: true });
      rowBg.on('pointerdown', () => {
        this.selectedIndex = globalIndex;
        this.renderTrackList(container);
      });
      container.add(rowBg);

      // Track name
      const nameText = this.scene.add.text(0, 0, i18n.getFeatureString(track.nameKey) ?? track.id, {
        fontFamily: 'monospace',
        fontSize: `${this.config.fontSize}px`,
        color: track.unlocked ? '#ffffff' : '#666666',
      });
      nameText.setOrigin(0, 0.5);
      container.add(nameText);

      // Genre indicator
      const genreDot = this.scene.add.circle(0, 0, 4, genreColors[track.genre]);
      container.add(genreDot);

      // Favorite star
      let star: Phaser.GameObjects.Text | undefined;
      if (track.favorite) {
        star = this.scene.add.text(0, 0, '★', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#ffcc00',
        });
        star.setOrigin(0.5, 0.5);
        container.add(star);
      }

      // Position children
      rowBg.setPosition(0, y);
      nameText.setPosition(10, y + this.config.rowHeight / 2);
      genreDot.setPosition(250, y + this.config.rowHeight / 2);
      if (star) {
        star.setPosition(240, y + this.config.rowHeight / 2);
      }
    }

    // Add genre filter bar if not in genres view
    if (this.view !== 'genres') {
      const filterBar = this.scene.add.text(10, 0,
        `Genre: ${this.genreFilterActive ? i18n.getFeatureString(`music.genre.${this.genreFilterActive}`) : 'All'} | ` +
        `Favorites: ${this.favoritesOnly ? 'On' : 'Off'}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888',
      });
      container.add(filterBar);
      filterBar.setPosition(0, visibleCount * this.config.rowHeight + 4);
    }
  }

  /**
   * Render the collection view.
   */
  private renderCollectionView(container: Phaser.GameObjects.Container): void {
    if (!this.collectionState) return;

    const genres: AppleGenre[] = ['calm', 'energetic', 'mysterious', 'festival'];
    const barColors: Record<AppleGenre, number> = {
      calm: 0x44aaff,
      energetic: 0xff4444,
      mysterious: 0xaa44ff,
      festival: 0xffaa00,
    };

    for (let i = 0; i < genres.length; i++) {
      const genre = genres[i];
      const completion = this.collectionState.genreCompletions[genre];
      const y = i * (this.config.rowHeight + 8);

      // Genre name
      const genreLabel = this.scene.add.text(0, 0, i18n.getFeatureString(`music.genre.${genre}`) ?? genre, {
        fontFamily: 'monospace',
        fontSize: `${this.config.fontSize}px`,
        color: '#ffcc7e',
      });
      container.add(genreLabel);
      genreLabel.setPosition(10, y);

      // Progress bar background
      const progressBarBg = this.scene.add.rectangle(0, 8, 100, 12, 0x2a2a3a, 0.8);
      container.add(progressBarBg);
      progressBarBg.setPosition(140, y + 2);

      // Progress bar fill
      const progressWidth = (completion.progress / 100) * 100;
      const progressBarFill = this.scene.add.rectangle(0, 8, progressWidth, 12, barColors[genre], 0.8);
      container.add(progressBarFill);
      progressBarFill.setPosition(140, y + 2);

      // Progress text
      const progressText = this.scene.add.text(0, 8, `${completion.progress.toFixed(0)}%`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
      });
      progressText.setOrigin(1, 0.5);
      container.add(progressText);
      progressText.setPosition(248, y + 2);

      // Track unlocked indicator
      if (completion.trackUnlocked) {
        const unlockedText = this.scene.add.text(0, 0, '✓ Track Unlocked!', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#44ff44',
        });
        container.add(unlockedText);
        unlockedText.setPosition(10, y + 16);
      }
    }
  }

  /**
   * Build the close button.
   */
  private buildCloseButton(parent: Phaser.GameObjects.Container): Phaser.GameObjects.Container {
    const { scene } = this;
    const container = scene.add.container(256, 8);

    const bg = scene.add.rectangle(0, 0, 20, 20, 0x3a2a2a, 0.8)
      .setStrokeStyle(1, 0xff4444, 0.6)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    const label = scene.add.text(0, 0, '✕', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ff6666',
    }).setOrigin(0.5, 0.5);

    bg.on('pointerdown', () => {
      this.close();
    });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x4a3a3a, 0.9);
      label.setColor('#ff8888');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x3a2a2a, 0.8);
      label.setColor('#ff6666');
    });

    container.add(bg);
    container.add(label);
    parent.add(container);
    return container;
  }

  /**
   * Update the display with current track info.
   */
  updateDisplay(): void {
    if (!this.currentTrackText) return;

    const items = this.getVisibleItems();
    if (this.selectedIndex < items.length) {
      const track = items[this.selectedIndex];
      const genreInfo = i18n.getFeatureString(`music.genre.${track.genre}`) ?? track.genre;
      this.currentTrackText.setText(
        `${i18n.getFeatureString(track.nameKey) ?? track.id}\n` +
        `Genre: ${genreInfo} | Duration: ${track.duration} beats`,
      );
    }
  }

  /**
   * Get visible items based on current view and filters.
   */
  private getVisibleItems(): TrackEntry[] {
    let items: TrackEntry[] = [];

    switch (this.view) {
      case 'tracks':
        items = this.tracks.filter((t) => t.unlocked);
        break;
      case 'genres':
        items = this.tracks;
        break;
      case 'favorites':
        items = this.tracks.filter((t) => t.favorite);
        break;
      default:
        items = [];
    }

    if (this.genreFilterActive && this.view !== 'genres') {
      items = items.filter((t) => t.genre === this.genreFilterActive);
    }

    return items;
  }

  /**
   * Navigate up in the track list.
   */
  navigateUp(): void {
    const items = this.getVisibleItems();
    if (items.length === 0) return;

    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    }
    this.renderTrackList(this.trackList!);
    this.updateDisplay();
  }

  /**
   * Navigate down in the track list.
   */
  navigateDown(): void {
    const items = this.getVisibleItems();
    if (items.length === 0) return;

    const visibleCount = Math.floor(280 / this.config.rowHeight);
    this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1);
    if (this.selectedIndex >= this.scrollOffset + visibleCount) {
      this.scrollOffset = this.selectedIndex - visibleCount + 1;
    }
    this.renderTrackList(this.trackList!);
    this.updateDisplay();
  }

  /**
   * Toggle the current track's favorite status.
   */
  toggleFavorite(): void {
    const items = this.getVisibleItems();
    if (this.selectedIndex >= items.length) return;

    const track = items[this.selectedIndex];
    track.favorite = !track.favorite;
    this.renderTrackList(this.trackList!);
  }

  /**
   * Toggle genre filter.
   */
  cycleGenreFilter(): void {
    const genres: AppleGenre[] = ['calm', 'energetic', 'mysterious', 'festival'];
    const currentIndex = this.genreFilterActive ? genres.indexOf(this.genreFilterActive) : -1;
    this.genreFilterActive = genres[(currentIndex + 1) % genres.length];
    this.renderTrackList(this.trackList!);
  }

  /**
   * Toggle favorites-only filter.
   */
  toggleFavoritesFilter(): void {
    this.favoritesOnly = !this.favoritesOnly;
    this.scrollOffset = 0;
    this.selectedIndex = 0;
    this.renderTrackList(this.trackList!);
  }

  /**
   * Play the selected track.
   */
  playTrack(): void {
    const items = this.getVisibleItems();
    if (this.selectedIndex >= items.length) return;

    const track = items[this.selectedIndex];
    if (!track.unlocked) return;

    this.isPlaying = true;
    this.currentTrackIndex = this.selectedIndex;
  }

  /**
   * Pause the current track.
   */
  pauseTrack(): void {
    this.isPlaying = false;
  }

  /**
   * Close the player UI.
   */
  close(): void {
    this.playerContainer?.destroy();
    this.playerContainer = undefined;
    this.background = undefined;
    this.titleText = undefined;
    this.trackList = undefined;
    this.currentTrackText = undefined;
    this.closeButton = undefined;
  }

  /**
   * Show the player UI.
   */
  show(): void {
    if (!this.playerContainer) {
      this.build();
    }
    this.playerContainer?.setVisible(true);
  }

  /**
   * Hide the player UI.
   */
  hide(): void {
    this.playerContainer?.setVisible(false);
  }

  /**
   * Update visibility based on game state.
   */
  updateVisibility(): void {
    const suppressed = !!this.scene.getFlag<boolean>('ui.suppressHud');
    this.playerContainer?.setVisible(!suppressed && this.playerContainer.visible);
  }

  /**
   * Destroy all UI components.
   */
  destroy(): void {
    this.close();
  }
}
