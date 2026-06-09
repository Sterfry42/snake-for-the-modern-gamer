import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { FISH_DEFINITIONS } from '../../fishing/fishDefinitions.js';
import {
  SPECIAL_BASELINE,
  createDefaultSpecialState,
  createDefaultSpecialStats,
  getStatDelta,
  normalizeSpecialState,
  normalizeSpecialStats,
} from '../specialStats.js';
import { SPECIAL_STAT_IDS } from '../specialTypes.js';
import { additiveChance, additivePercent } from '../statModifiers.js';
import {
  BASE_POWERUP_DISCOVERY_CHANCE,
  BASE_TREASURE_DISCOVERY_CHANCE,
  getPowerupDiscoveryChance,
  getTreasureDiscoveryChance,
} from '../explorationSpecial.js';
import { getAnimalBonusDropChance, getMeatRecoveryChance } from '../animalSpecial.js';
import { getFishingSpecialModifiers } from '../fishingSpecial.js';
import {
  getEquipmentRecoveryChanceBonus,
  getExcavationRewardChanceBonus,
} from '../archaeologySpecial.js';
import { getSocialSpecialModifiers } from '../socialSpecial.js';
import { SpecialStatsService } from '../specialStatsService.js';

describe('SPECIAL stats', () => {
  it('defaults every SPECIAL stat to neutral 5', () => {
    const stats = createDefaultSpecialStats();
    for (const stat of SPECIAL_STAT_IDS) {
      expect(stats[stat]).toBe(SPECIAL_BASELINE);
      expect(getStatDelta(stats, stat)).toBe(0);
    }
  });

  it('normalizes missing and invalid save data to safe defaults', () => {
    expect(normalizeSpecialState(undefined)).toEqual(createDefaultSpecialState());
    expect(
      normalizeSpecialStats({
        strength: 99,
        luck: Number.NaN,
        agility: 0,
      }),
    ).toMatchObject({
      strength: 10,
      perception: 5,
      endurance: 5,
      charisma: 5,
      intelligence: 5,
      agility: 1,
      luck: 5,
    });
  });

  it('keeps additive chance and percent modifiers neutral at all 5s', () => {
    const stats = createDefaultSpecialStats();
    expect(additiveChance(0.42, stats, { luck: 0.1, perception: 0.2 })).toBe(0.42);
    expect(additivePercent(stats, { strength: 0.1, charisma: 0.2 })).toBe(0);
  });

  it('keeps first-pass displayed domains neutral at all 5s', () => {
    const stats = createDefaultSpecialStats();
    expect(getTreasureDiscoveryChance(stats)).toBe(BASE_TREASURE_DISCOVERY_CHANCE);
    expect(getPowerupDiscoveryChance(stats)).toBe(BASE_POWERUP_DISCOVERY_CHANCE);
    expect(getAnimalBonusDropChance(stats)).toBe(0);
    expect(getMeatRecoveryChance(stats)).toBe(0);
    expect(getFishingSpecialModifiers(stats)).toEqual({
      fishingControl: 0,
      fishingStability: 0,
      fishRetention: 0,
      catchProgressBonus: 0,
      rareFishChance: 0,
    });
    expect(getExcavationRewardChanceBonus(stats)).toBe(0);
    expect(getEquipmentRecoveryChanceBonus(stats)).toBe(0);
    expect(getSocialSpecialModifiers(stats)).toEqual({
      affectionGainBonus: 0,
      trustGainBonus: 0,
      resentmentReduction: 0,
      jealousyReduction: 0,
      suspicionReduction: 0,
      fineReduction: 0,
      apologyEffectiveness: 0,
      intimidationControl: 0,
    });
  });

  it('previews, applies, resets, and cheats stats through the service', () => {
    const service = new SpecialStatsService();
    service.restore({ version: 1, stats: createDefaultSpecialStats(), unspentPoints: 2 });

    expect(service.previewIncrease('luck')).toBe(true);
    expect(service.previewIncrease('perception')).toBe(true);
    expect(service.previewIncrease('strength')).toBe(false);

    let view = service.getSpecialStatsView({
      score: 30,
      apples: defaultGameConfig.apples,
      fish: FISH_DEFINITIONS,
    });
    expect(view.hasPreviewChanges).toBe(true);
    expect(view.unspentPoints).toBe(0);
    expect(view.stats.find((stat) => stat.id === 'luck')?.value).toBe(6);

    service.resetPreview();
    view = service.getSpecialStatsView({ score: 30, apples: defaultGameConfig.apples });
    expect(view.hasPreviewChanges).toBe(false);
    expect(view.stats.find((stat) => stat.id === 'luck')?.value).toBe(5);

    service.grantUnspentPoints(1);
    expect(service.previewIncrease('luck')).toBe(true);
    service.applyPreview();
    expect(service.exportState().stats.luck).toBe(6);

    service.setAllStats(10);
    expect(SPECIAL_STAT_IDS.every((stat) => service.exportState().stats[stat] === 10)).toBe(true);
    expect(service.exportState().unspentPoints).toBe(0);
  });
});
