import type { MinecraftPlayer } from './player.js';

// ─── Weather Types ──────────────────────────────────────────────────────────

export type WeatherType = 'clear' | 'rain' | 'thunderstorm' | 'snow' | 'sandstorm';

export interface WeatherState {
  current: WeatherType;
  nextWeather: WeatherType;
  weatherTimer: number;
  weatherDuration: number;
  isRaining: boolean;
  isThundering: boolean;
  rainIntensity: number;
  thunderIntensity: number;
  stormProgress: number;
  worldTime: number;
}

export interface WeatherChangeEvent {
  from: WeatherType;
  to: WeatherType;
  worldTime: number;
}

// ─── Weather Definitions ────────────────────────────────────────────────────

export const WEATHER_TYPES: WeatherType[] = ['clear', 'rain', 'thunderstorm', 'snow', 'sandstorm'];

export const DEFAULT_WEATHER: WeatherState = {
  current: 'clear',
  nextWeather: 'clear',
  weatherTimer: 0,
  weatherDuration: 24000,
  isRaining: false,
  isThundering: false,
  rainIntensity: 0,
  thunderIntensity: 0,
  stormProgress: 0,
  worldTime: 0,
};

export const WEATHER_WEIGHTS: Record<WeatherType, number> = {
  clear: 60,
  rain: 25,
  thunderstorm: 10,
  snow: 3,
  sandstorm: 2,
};

// ─── Weather Effects ────────────────────────────────────────────────────────

export interface WeatherEffect {
  effectType: WeatherEffectType;
  description: string;
}

export type WeatherEffectType =
  | 'mob_spawn_boost'
  | 'vision_reduction'
  | 'movement_penalty'
  | 'fire_spread'
  | 'crop_watering'
  | 'farmland_hydration'
  | 'lightning_damage'
  | 'fire_resistance_req';

export function getWeatherEffects(weather: WeatherType): WeatherEffectType[] {
  const effects: WeatherEffectType[] = [];

  switch (weather) {
    case 'clear':
      break;
    case 'rain':
      effects.push('crop_watering', 'farmland_hydration');
      break;
    case 'thunderstorm':
      effects.push('mob_spawn_boost', 'vision_reduction', 'lightning_damage');
      break;
    case 'snow':
      effects.push('farmland_hydration', 'vision_reduction');
      break;
    case 'sandstorm':
      effects.push('mob_spawn_boost', 'vision_reduction', 'movement_penalty');
      break;
  }

  return effects;
}

export function applyWeatherEffects(
  player: MinecraftPlayer,
  weather: WeatherType,
  tickDelta: number,
): void {
  switch (weather) {
    case 'thunderstorm':
      // Lightning damage chance
      if (this.rng() < 0.0001 * tickDelta) {
        if (!player.state.fireResistant) {
          player.takeDamage(1);
        }
      }
      break;
    case 'sandstorm':
      // Slow movement
      break;
    case 'rain':
      // Put out fire
      break;
  }
}

// ─── Weather Manager ────────────────────────────────────────────────────────

export class WeatherManager {
  private state: WeatherState;
  private listeners: Array<(event: WeatherChangeEvent) => void> = [];
  private _rng: (() => number) | null = null;

  constructor(initialState: WeatherState = { ...DEFAULT_WEATHER }) {
    this.state = initialState;
  }

  private get rng(): () => number {
    if (!this._rng) {
      this._rng = () => this.rng();
    }
    return this._rng;
  }

  setRng(rng: () => number): void {
    this._rng = rng;
  }

  public tick(): void {
    this.state.worldTime += 1;

    // Update rain/thunder intensity
    if (this.state.isRaining) {
      this.state.rainIntensity = Math.min(1, this.state.rainIntensity + 0.01);
    } else {
      this.state.rainIntensity = Math.max(0, this.state.rainIntensity - 0.01);
    }

    if (this.state.isThundering) {
      this.state.thunderIntensity = Math.min(1, this.state.thunderIntensity + 0.02);
      this.state.stormProgress += 0.001;
    } else {
      this.state.thunderIntensity = Math.max(0, this.state.thunderIntensity - 0.01);
    }

    // Check for weather change
    this.state.weatherTimer += 1;
    if (this.state.weatherTimer >= this.state.weatherDuration) {
      this.changeWeather();
    }
  }

  public changeWeather(to?: WeatherType): void {
    const from = this.state.current;

    if (to) {
      this.state.current = to;
      this.state.isRaining = to === 'rain' || to === 'thunderstorm';
      this.state.isThundering = to === 'thunderstorm';
      this.state.weatherTimer = 0;
      this.state.weatherDuration = this.getRandomDuration();

      this.emitChange({ from, to: to, worldTime: this.state.worldTime });
    } else {
      const next = this.getRandomNextWeather();
      this.state.nextWeather = next;
      this.state.current = next;
      this.state.isRaining = next === 'rain' || next === 'thunderstorm';
      this.state.isThundering = next === 'thunderstorm';
      this.state.weatherTimer = 0;
      this.state.weatherDuration = this.getRandomDuration();

      this.emitChange({ from, to: next, worldTime: this.state.worldTime });
    }
  }

  private getRandomNextWeather(): WeatherType {
    const totalWeight = Object.values(WEATHER_WEIGHTS).reduce((sum, w) => sum + w, 0);
    let roll = this.rng() * totalWeight;

    for (const [type, weight] of Object.entries(WEATHER_WEIGHTS)) {
      roll -= weight;
      if (roll <= 0) return type as WeatherType;
    }

    return 'clear';
  }

  private getRandomDuration(): number {
    const baseDuration = 24000;
    const variation = this.rng() * 24000;
    return Math.floor(baseDuration + variation);
  }

  public getCurrentWeather(): WeatherType {
    return this.state.current;
  }

  public isRaining(): boolean {
    return this.state.isRaining;
  }

  public isThundering(): boolean {
    return this.state.isThundering;
  }

  public getRainIntensity(): number {
    return this.state.rainIntensity;
  }

  public getThunderIntensity(): number {
    return this.state.thunderIntensity;
  }

  public getStormProgress(): number {
    return this.state.stormProgress;
  }

  public setWeather(weather: WeatherType): void {
    const from = this.state.current;
    this.state.current = weather;
    this.state.isRaining = weather === 'rain' || weather === 'thunderstorm';
    this.state.isThundering = weather === 'thunderstorm';
    this.state.weatherTimer = 0;
    this.state.weatherDuration = this.getRandomDuration();

    this.emitChange({ from, to: weather, worldTime: this.state.worldTime });
  }

  public forceClearWeather(): void {
    this.state.current = 'clear';
    this.state.isRaining = false;
    this.state.isThundering = false;
    this.state.weatherTimer = 0;
    this.state.weatherDuration = this.getRandomDuration();
  }

  public onWeatherChange(listener: (event: WeatherChangeEvent) => void): void {
    this.listeners.push(listener);
  }

  private emitChange(event: WeatherChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public getWeatherColor(): number {
    switch (this.state.current) {
      case 'clear':
        return 0xFFFFFF;
      case 'rain':
        return 0x888888;
      case 'thunderstorm':
        return 0x333333;
      case 'snow':
        return 0xDDDDFF;
      case 'sandstorm':
        return 0xCCAA66;
      default:
        return 0xFFFFFF;
    }
  }

  public getSkyAlpha(): number {
    switch (this.state.current) {
      case 'clear':
        return 0;
      case 'rain':
        return 0.3 * this.state.rainIntensity;
      case 'thunderstorm':
        return 0.6 * this.state.rainIntensity;
      case 'snow':
        return 0.2;
      case 'sandstorm':
        return 0.4;
      default:
        return 0;
    }
  }

  public destroy(): void {
    this.listeners.length = 0;
  }
}

// ─── Lightning System ───────────────────────────────────────────────────────

export interface LightningStrike {
  x: number;
  y: number;
  roomId: string;
  damage: number;
  fires: boolean;
  time: number;
}

export class LightningSystem {
  private strikes: LightningStrike[] = [];

  public strike(
    x: number,
    y: number,
    roomId: string,
    damage: number = 5,
    fires: boolean = true,
  ): LightningStrike {
    const strike: LightningStrike = {
      x,
      y,
      roomId,
      damage,
      fires,
      time: Date.now(),
    };

    this.strikes.push(strike);

    // Remove after a while
    setTimeout(() => {
      const idx = this.strikes.indexOf(strike);
      if (idx >= 0) this.strikes.splice(idx, 1);
    }, 10000);

    return strike;
  }

  public getStrikesInRoom(roomId: string): LightningStrike[] {
    return this.strikes.filter((s) => s.roomId === roomId);
  }

  public clear(): void {
    this.strikes.length = 0;
  }

  public destroy(): void {
    this.clear();
  }
}

// ─── Weather UI ─────────────────────────────────────────────────────────────

export interface WeatherUIState {
  showWeatherInfo: boolean;
  weatherText: string;
  weatherIcon: string;
}

export function getWeatherDisplayText(weather: WeatherType): string {
  switch (weather) {
    case 'clear':
      return 'Clear Sky';
    case 'rain':
      return 'Rainy';
    case 'thunderstorm':
      return 'Thunderstorm';
    case 'snow':
      return 'Snowing';
    case 'sandstorm':
      return 'Sandstorm';
    default:
      return 'Unknown';
  }
}

export function getWeatherIcon(weather: WeatherType): string {
  switch (weather) {
    case 'clear':
      return '\u2600\uFE0F';
    case 'rain':
      return '\u2614';
    case 'thunderstorm':
      return '\u26C8';
    case 'snow':
      return '\u2744\uFE0F';
    case 'sandstorm':
      return '\uD83C\uDFDC';
    default:
      return '?';
  }
}
