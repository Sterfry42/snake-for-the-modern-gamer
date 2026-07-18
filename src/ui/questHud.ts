import Phaser from 'phaser';
import type SnakeScene from '../scenes/snakeScene.js';
import type { Quest } from '../../quests.js';
import type { AtmosphereState, GlobalWeather, Season, DayPhase, SkyEvent } from '../world/atmosphereTypes.js';
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
  depth: 40,
};

const MAX_VISIBLE_QUESTS = 3;

const SEASON_LABELS: Record<Season, string> = {
  spring: 'spring',
  summer: 'summer',
  autumn: 'autumn',
  winter: 'winter',
};

const DAY_PHASE_LABELS: Record<DayPhase, string> = {
  dawn: 'dawn',
  day: 'day',
  dusk: 'dusk',
  night: 'night',
};

const WEATHER_LABELS: Record<GlobalWeather, string> = {
  clear: 'weatherClear',
  rain: 'weatherRain',
  fog: 'weatherFog',
  storm: 'weatherStorm',
  heatwave: 'weatherHeatwave',
  coldfront: 'weatherColdfront',
  wind: 'weatherWind',
};

const SKY_EVENT_LABELS: Record<SkyEvent, string> = {
  none: 'skyNone',
  bloodMoon: 'skyBloodMoon',
  eclipse: 'skyEclipse',
  meteorShower: 'skyMeteorShower',
  aurora: 'skyAurora',
};

function getIntensityLabel(intensity: number): string {
  if (intensity < 0.4) return 'weatherIntensityLow';
  if (intensity < 0.7) return 'weatherIntensityMedium';
  return 'weatherIntensityHigh';
}

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

// === Weather HUD Widget ===

interface WeatherHudOptions {
  position?: { x: number; y: number };
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  depth?: number;
}

const DEFAULT_WEATHER_OPTIONS: Required<WeatherHudOptions> = {
  position: { x: 0, y: 0 },
  fontSize: '12px',
  fontFamily: 'monospace',
  color: '#d0d8e8',
  depth: 35,
};

export class WeatherHud {
  private readonly container: Phaser.GameObjects.Container;
  private readonly seasonText: Phaser.GameObjects.Text;
  private readonly weatherText: Phaser.GameObjects.Text;
  private readonly phaseText: Phaser.GameObjects.Text;
  private readonly skyText: Phaser.GameObjects.Text;
  private readonly intensityText: Phaser.GameObjects.Text;
  private options: Required<WeatherHudOptions>;
  private requestedVisible = true;

  constructor(
    private readonly scene: SnakeScene,
    options: WeatherHudOptions = {},
  ) {
    this.options = {
      position: options.position ?? DEFAULT_WEATHER_OPTIONS.position,
      fontSize: options.fontSize ?? DEFAULT_WEATHER_OPTIONS.fontSize,
      fontFamily: options.fontFamily ?? DEFAULT_WEATHER_OPTIONS.fontFamily,
      color: options.color ?? DEFAULT_WEATHER_OPTIONS.color,
      depth: options.depth ?? DEFAULT_WEATHER_OPTIONS.depth,
    };

    const { x, y } = this.options.position;
    const fontSize = this.options.fontSize;
    const fontFamily = this.options.fontFamily;
    const color = this.options.color;

    this.seasonText = scene.add.text(x, y, '', {
      fontFamily,
      fontSize,
      color,
    }).setOrigin(1, 0).setDepth(this.options.depth);

    this.weatherText = scene.add.text(x, y + 14, '', {
      fontFamily,
      fontSize,
      color,
    }).setOrigin(1, 0).setDepth(this.options.depth);

    this.phaseText = scene.add.text(x, y + 28, '', {
      fontFamily,
      fontSize,
      color,
    }).setOrigin(1, 0).setDepth(this.options.depth);

    this.skyText = scene.add.text(x, y + 42, '', {
      fontFamily,
      fontSize,
      color,
    }).setOrigin(1, 0).setDepth(this.options.depth);

    this.intensityText = scene.add.text(x, y + 56, '', {
      fontFamily,
      fontSize,
      color,
    }).setOrigin(1, 0).setDepth(this.options.depth);

    this.container = scene.add.container(x, y);
    this.container.add([this.seasonText, this.weatherText, this.phaseText, this.skyText, this.intensityText]);
    this.container.setDepth(this.options.depth);
    this.container.setVisible(false);
  }

  update(atmosphere: AtmosphereState): void {
    const season = i18n.getCommon(SEASON_LABELS[atmosphere.season]) || atmosphere.season;
    const weather = i18n.getCommon(WEATHER_LABELS[atmosphere.globalWeather]) || atmosphere.globalWeather;
    const phase = i18n.getCommon(DAY_PHASE_LABELS[atmosphere.dayPhase]) || atmosphere.dayPhase;
    const skyEvent = atmosphere.skyEvent && atmosphere.skyEvent.current !== 'none'
      ? i18n.getCommon(SKY_EVENT_LABELS[atmosphere.skyEvent.current]) || atmosphere.skyEvent.current
      : null;
    const intensity = i18n.getCommon(getIntensityLabel(atmosphere.weatherIntensity)) || '';

    this.seasonText.setText(`Season: ${season}`);
    this.weatherText.setText(`Weather: ${weather}`);
    this.phaseText.setText(`Phase: ${phase}`);
    this.skyText.setText(skyEvent ? `Sky: ${skyEvent}` : '');
    this.intensityText.setText(`Intensity: ${intensity}`);

    this.container.setVisible(this.requestedVisible);
  }

  setVisible(visible: boolean): void {
    this.requestedVisible = visible;
    this.container.setVisible(visible);
  }
}
