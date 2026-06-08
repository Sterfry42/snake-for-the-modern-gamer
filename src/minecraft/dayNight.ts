import { DAY_LENGTH_TICKS } from './config.js';

export class DayNightCycle {
  timeOfDay: number;
  day: number;

  constructor() {
    this.timeOfDay = 0;
    this.day = 1;
  }

  reset(): void {
    this.timeOfDay = 0;
    this.day = 1;
  }

  tick(): void {
    this.timeOfDay += 1;
    if (this.timeOfDay >= DAY_LENGTH_TICKS) {
      this.timeOfDay = 0;
      this.day += 1;
    }
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  getDay(): number {
    return this.day;
  }

  isNight(): boolean {
    return this.timeOfDay >= 13000 || this.timeOfDay < 2000;
  }

  isDay(): boolean {
    return !this.isNight();
  }

  getSkyAlpha(): number {
    // 0 = full day, 0.6 = full night
    const tod = this.timeOfDay;

    if (tod < 2000) {
      // Night -> Sunrise: alpha goes from 0.6 to 0
      const progress = tod / 2000;
      return 0.6 * (1 - progress);
    }
    if (tod < 4000) {
      // Sunrise: alpha goes from 0 to 0
      return 0;
    }
    if (tod < 12000) {
      // Day: alpha = 0
      return 0;
    }
    if (tod < 14000) {
      // Sunset: alpha goes from 0 to 0.6
      const progress = (tod - 12000) / 2000;
      return 0.6 * progress;
    }
    // Night: alpha = 0.6
    return 0.6;
  }

  getSkyColor(): number {
    const tod = this.timeOfDay;

    if (tod >= 12000 && tod < 14000) {
      // Sunset: warm orange to dark
      const progress = (tod - 12000) / 2000;
      return interpolateColor(0xffffe0, 0x141430, progress);
    }
    if (tod >= 14000 && tod < 24000) {
      return 0x141430; // Night
    }
    if (tod >= 24000 || tod < 2000) {
      // Night
      return 0x141430;
    }
    if (tod >= 2000 && tod < 4000) {
      // Sunrise: dark to warm orange
      const progress = (tod - 2000) / 2000;
      return interpolateColor(0x141430, 0xffffe0, progress);
    }

    // Day
    return 0xffffe0;
  }

  getDayPhase(): 'dawn' | 'day' | 'dusk' | 'night' {
    const tod = this.timeOfDay;
    if (tod >= 2000 && tod < 4000) return 'dawn';
    if (tod >= 4000 && tod < 12000) return 'day';
    if (tod >= 12000 && tod < 14000) return 'dusk';
    return 'night';
  }

  skipNight(): void {
    this.timeOfDay = 0;
    this.day += 1;
  }
}

function interpolateColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}
