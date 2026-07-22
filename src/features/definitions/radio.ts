/**
 * Radio Feature
 */
import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { i18n } from '../../i18n/i18nManager.js';

export type RadioStationId =
  | 'static'
  | 'classical'
  | 'jazz'
  | 'country'
  | 'rock'
  | 'electronic'
  | 'lofi'
  | 'talk';

export interface RadioStation {
  id: RadioStationId;
  label: string;
  color: string;
  // Buff applied when tuned to this station
  tickDelayScalar?: number;
  scoreMultiplier?: number;
  visualTint?: number;
}

const STATIONS: RadioStation[] = [
  { id: 'static', label: 'Static', color: '#888888' },
  {
    id: 'classical',
    label: 'Classical',
    color: '#c084fc',
    tickDelayScalar: 0.92,
  },
  {
    id: 'jazz',
    label: 'Jazz',
    color: '#fbbf24',
    scoreMultiplier: 1.1,
  },
  {
    id: 'country',
    label: 'Country',
    color: '#a3e635',
    tickDelayScalar: 0.95,
  },
  {
    id: 'rock',
    label: 'Rock',
    color: '#f87171',
    tickDelayScalar: 0.88,
  },
  {
    id: 'electronic',
    label: 'Electronic',
    color: '#38bdf8',
    tickDelayScalar: 0.9,
    scoreMultiplier: 1.05,
  },
  {
    id: 'lofi',
    label: 'Lo-Fi',
    color: '#818cf8',
    tickDelayScalar: 0.97,
  },
  {
    id: 'talk',
    label: 'Talk',
    color: '#fb923c',
    scoreMultiplier: 1.15,
  },
];

const STATION_ORDER: RadioStationId[] = STATIONS.map((s) => s.id);

export class RadioFeature extends Feature {
  private hudText: Phaser.GameObjects.Text | null = null;
  private currentStation: RadioStationId = 'static';
  private stationIndex: number = 0;
  private tuneFlashAlpha: number = 0;

  constructor() {
    super('radio', 'Radio');
  }

  override onRegister(scene: SnakeScene): void {
    scene.setFlag('radio.tunedStation', 'static');
    scene.setFlag('radio.stationIndex', 0);
    this.currentStation = 'static';
    this.stationIndex = 0;

    // Create HUD text
    this.hudText = scene.add
      .text(10, 10, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setDepth(40);
  }

  override onTick(scene: SnakeScene): void {
    const tunedStation = scene.getFlag<RadioStationId>('radio.tunedStation') ?? 'static';
    const stationIndex = scene.getFlag<number>('radio.stationIndex') ?? 0;
    this.currentStation = tunedStation;
    this.stationIndex = stationIndex;

    // Fade out tune flash
    if (this.tuneFlashAlpha > 0) {
      this.tuneFlashAlpha = Math.max(0, this.tuneFlashAlpha - 0.02);
    }
  }

  override onRender(scene: SnakeScene): void {
    if (!this.hudText) return;

    const suppressed =
      !!scene.getFlag<boolean>('ui.suppressHud') &&
      !scene.snakeGame.hasArtifactCoordinatesAlwaysVisible();
    this.hudText.setVisible(!suppressed);

    if (!suppressed) {
      const station = STATIONS.find((s) => s.id === this.currentStation) ?? STATIONS[0];
      const label = i18n.getFeatureString('radioStationLabel') ?? 'Radio';

      let text = `${label}: ${station.label}`;

      if (this.tuneFlashAlpha > 0) {
        text += ` [TUNING...]`;
      }

      this.hudText.setText(text);
      this.hudText.setColor(station.color);
      this.hudText.setAlpha(0.6 + this.tuneFlashAlpha * 0.4);

      // Position below coordinates
      const coordsFeature = scene.getFeature('coordinates');
      const coordsY = coordsFeature
        ? ((coordsFeature as unknown as { getBottomY?: () => number }).getBottomY?.() ?? 30)
        : 30;
      this.hudText.setPosition(10, coordsY + 18);
    }
  }

  /** Advance to the next station. Returns the new station. */
  tuneNext(scene: SnakeScene): RadioStation {
    const currentIndex = (this.stationIndex + 1) % STATION_ORDER.length;
    const stationId = STATION_ORDER[currentIndex];
    const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];

    scene.setFlag('radio.tunedStation', stationId);
    scene.setFlag('radio.stationIndex', currentIndex);
    this.currentStation = stationId;
    this.stationIndex = currentIndex;
    this.tuneFlashAlpha = 1;

    // Set score multiplier flag for apple scoring
    const scoreMult = station.scoreMultiplier ?? 1;
    if (scoreMult > 1) {
      scene.setFlag('radio.appleScoreMultiplier', scoreMult);
    } else {
      scene.setFlag('radio.appleScoreMultiplier', 1);
    }

    // Trigger a visual pulse effect
    this.tuneFlash(scene);

    return station;
  }

  /** Jump to a specific station by ID. */
  tuneTo(scene: SnakeScene, stationId: RadioStationId): RadioStation {
    const index = STATION_ORDER.indexOf(stationId);
    if (index === -1) {
      return STATIONS[0];
    }

    scene.setFlag('radio.tunedStation', stationId);
    scene.setFlag('radio.stationIndex', index);
    this.currentStation = stationId;
    this.stationIndex = index;
    this.tuneFlashAlpha = 1;

    // Set score multiplier flag for apple scoring
    const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];
    const scoreMult = station.scoreMultiplier ?? 1;
    if (scoreMult > 1) {
      scene.setFlag('radio.appleScoreMultiplier', scoreMult);
    } else {
      scene.setFlag('radio.appleScoreMultiplier', 1);
    }

    this.tuneFlash(scene);

    return station;
  }

  /** Get the currently tuned station. */
  getStation(): RadioStation {
    return STATIONS.find((s) => s.id === this.currentStation) ?? STATIONS[0];
  }

  /** Get all available stations. */
  getStations(): RadioStation[] {
    return STATIONS;
  }

  /** Apply station buffs to the scene. */
  applyStationBuffs(scene: SnakeScene): { tickDelayScalar: number; scoreMultiplier: number } {
    void scene;
    const station = this.getStation();
    return {
      tickDelayScalar: station.tickDelayScalar ?? 1,
      scoreMultiplier: station.scoreMultiplier ?? 1,
    };
  }

  private tuneFlash(scene: SnakeScene): void {
    // Brief screen flash to simulate tuning
    const flash = scene.add.rectangle(
      scene.cameras.main.width / 2,
      scene.cameras.main.height / 2,
      scene.cameras.main.width,
      scene.cameras.main.height,
      0xffffff,
      0.15,
    );
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }
}

export default new RadioFeature();
