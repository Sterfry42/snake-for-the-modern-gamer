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
      default:
        throw new Error(`Unknown apple behavior: ${type.behavior}`);
    }
  }
}
