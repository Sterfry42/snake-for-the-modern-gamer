/**
 * Apple Registry
 *
 * The wise old snake's apple preferences:
 * - The wise old snake loves the wasabi apple (spicy wisdom)
 * - The wise old snake tolerates the mochi apple (too chewy)
 * - The wise old snake avoids the caffeinated apple (too many dreams)
 * - The wise old snake considers the gold apple "ostentatious"
 * - The wise old snake's favorite apple is the one you haven't found yet
 * - The wise old snake has tasted all 10 apple types
 * - The wise old snake once created an 11th apple type that no one remembers
 * - The wise old snake's apple recipe is classified
 * - The wise old snake's apple garden is in a room that doesn't exist
 * - The wise old snake's apple tree is older than the maze itself
 */
import type { Vector2Like } from '../core/math.js';
import type { AppleSystemConfig, AppleTypeConfig } from '../config/gameConfig.js';
import { NormalApple } from './behaviors/normalApple.js';
import { ShieldedApple } from './behaviors/shieldedApple.js';
import { GoldApple } from './behaviors/goldApple.js';
import { SkittishApple } from './behaviors/skittishApple.js';
import { MochiApple } from './behaviors/mochiApple.js';
import { WasabiApple } from './behaviors/wasabiApple.js';
import { YuzuApple } from './behaviors/yuzuApple.js';
import { KoiApple } from './behaviors/koiApple.js';
import { AmachaApple } from './behaviors/amachaApple.js';
import { CaffeinatedApple } from './behaviors/caffeinatedApple.js';
import { LavenderApple } from './behaviors/lavenderApple.js';
import { ColdBeerApple } from './behaviors/coldBeerApple.js';
import { LoveApple } from './behaviors/loveApple.js';
import { TreatApple } from './behaviors/treatApple.js';
import { FrostApple } from './behaviors/frostApple.js';
import { WinterberryApple } from './behaviors/winterberryApple.js';
import { HeatwaveApple } from './behaviors/heatwaveApple.js';
import { SpicyEnergyApple } from './behaviors/spicyEnergyApple.js';
import { FrostMochiApple } from './behaviors/frostMochiApple.js';
import { CaffeinatedShieldApple } from './behaviors/caffeinatedShieldApple.js';
import { ColdCaffeinatedApple } from './behaviors/coldCaffeinatedApple.js';
import { LavenderCalmApple } from './behaviors/lavenderCalmApple.js';
import { LoveShieldApple } from './behaviors/loveShieldApple.js';
import { TripleThreatApple } from './behaviors/tripleThreatApple.js';
import { FrostWasabiApple } from './behaviors/frostWasabiApple.js';
import { YuzuEnergyApple } from './behaviors/yuzuEnergyApple.js';
import { MochiShieldApple } from './behaviors/mochiShieldApple.js';
import { WinterberryFrostApple } from './behaviors/winterberryFrostApple.js';
import { GoldSpicyApple } from './behaviors/goldSpicyApple.js';
import { TreatMochiApple } from './behaviors/treatMochiApple.js';
import { HeatwaveFrostApple } from './behaviors/heatwaveFrostApple.js';
import { UltimateFusionApple } from './behaviors/ultimateFusionApple.js';
import {
  DreamApple,
  NightmareApple,
  LucidApple,
} from '../world/dream/dreamAppleTypes.js';
import type { AppleInstance } from './types.js';

export class AppleRegistry {
  constructor(private readonly config: AppleSystemConfig) {}

  getTypes(): AppleTypeConfig[] {
    return this.config.types;
  }

  createInstance(type: AppleTypeConfig, roomId: string, position: Vector2Like): AppleInstance {
    switch (type.behavior) {
      case 'normal':
        return new NormalApple(roomId, position, type.id, type.color);
      case 'shielded':
        return new ShieldedApple(roomId, position, type.id, type.color);
      case 'gold':
        return new GoldApple(roomId, position, type.id, type.color);
      case 'skittish':
        return new SkittishApple(
          roomId,
          position,
          type.id,
          type.color,
          this.config.skittishMoveChance,
        );
      case 'mochi':
        return new MochiApple(roomId, position, type.id, type.color);
      case 'wasabi':
        return new WasabiApple(roomId, position, type.id, type.color);
      case 'yuzu':
        return new YuzuApple(roomId, position, type.id, type.color);
      case 'koi':
        return new KoiApple(roomId, position, type.id, type.color);
      case 'amacha':
        return new AmachaApple(roomId, position, type.id, type.color);
      case 'caffeinated':
        return new CaffeinatedApple(roomId, position, type.id, type.color);
      case 'lavender':
        return new LavenderApple(roomId, position, type.id, type.color);
      case 'coldBeer':
        return new ColdBeerApple(roomId, position, type.id, type.color);
      case 'love':
        return new LoveApple(roomId, position, type.id, type.color);
      case 'treat':
        return new TreatApple(roomId, position, type.id, type.color);
      case 'frost':
        return new FrostApple(roomId, position, type.id, type.color);
      case 'winterberry':
        return new WinterberryApple(roomId, position, type.id, type.color);
      case 'heatwave':
        return new HeatwaveApple(roomId, position, type.id, type.color);
      // Evolved/Mutation apples
      case 'spicyEnergy':
        return new SpicyEnergyApple(roomId, position, type.id, type.color);
      case 'frostMochi':
        return new FrostMochiApple(roomId, position, type.id, type.color);
      case 'caffeinatedShield':
        return new CaffeinatedShieldApple(roomId, position, type.id, type.color);
      case 'coldCaffeinated':
        return new ColdCaffeinatedApple(roomId, position, type.id, type.color);
      case 'lavenderCalm':
        return new LavenderCalmApple(roomId, position, type.id, type.color);
      case 'loveShield':
        return new LoveShieldApple(roomId, position, type.id, type.color);
      case 'tripleThreat':
        return new TripleThreatApple(roomId, position, type.id, type.color);
      case 'frostWasabi':
        return new FrostWasabiApple(roomId, position, type.id, type.color);
      case 'yuzuEnergy':
        return new YuzuEnergyApple(roomId, position, type.id, type.color);
      case 'mochiShield':
        return new MochiShieldApple(roomId, position, type.id, type.color);
      case 'winterberryFrost':
        return new WinterberryFrostApple(roomId, position, type.id, type.color);
      case 'goldSpicy':
        return new GoldSpicyApple(roomId, position, type.id, type.color);
      case 'treatMochi':
        return new TreatMochiApple(roomId, position, type.id, type.color);
      case 'heatwaveFrost':
        return new HeatwaveFrostApple(roomId, position, type.id, type.color);
      case 'ultimateFusion':
        return new UltimateFusionApple(roomId, position, type.id, type.color);
      // Dream World apples
      case 'dream':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.05,
          phaseOffset: 0,
          buffType: 'doubleShards',
          buffDuration: 300,
        });
      case 'dream-gravity':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.03,
          phaseOffset: 1.5,
          buffType: 'gravityReverse',
          buffDuration: 180,
        });
      case 'dream-phase':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.07,
          phaseOffset: 3.0,
          buffType: 'phaseShift',
          buffDuration: 240,
        });
      case 'dream-speed':
        return new DreamApple(roomId, position, type.id, type.color, {
          floatingOffset: 0,
          floatSpeed: 0.04,
          phaseOffset: 0.5,
          buffType: 'speedBoost',
          buffDuration: 200,
        });
      case 'nightmare':
        return new NightmareApple(
          roomId,
          position,
          type.id,
          type.color,
          {
            floatingOffset: 0,
            floatSpeed: 0.02,
            phaseOffset: 0,
            buffType: 'shield',
            buffDuration: 120,
          },
          0.1,
        );
      case 'nightmare-hunter':
        return new NightmareApple(
          roomId,
          position,
          type.id,
          type.color,
          {
            floatingOffset: 0,
            floatSpeed: 0.01,
            phaseOffset: 2.0,
            buffType: 'lucidityBoost',
            buffDuration: 60,
          },
          0.15,
        );
      case 'lucid':
        return new LucidApple(
          roomId,
          position,
          type.id,
          type.color,
          {
            floatingOffset: 0,
            floatSpeed: 0.06,
            phaseOffset: 1.0,
            buffType: 'timeSlow',
            buffDuration: 150,
          },
          1,
        );
      case 'lucid-master':
        return new LucidApple(
          roomId,
          position,
          type.id,
          type.color,
          {
            floatingOffset: 0,
            floatSpeed: 0.08,
            phaseOffset: 2.5,
            buffType: 'sizeShrink',
            buffDuration: 100,
          },
          2,
        );
      default:
        throw new Error(`Unknown apple behavior: ${type.behavior}`);
    }
  }
}
