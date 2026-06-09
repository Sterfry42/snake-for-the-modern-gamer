import type { AppleSystemConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import type { FishDefinition } from '../fishing/types.js';
import type { AnimalDropModifiers } from '../animals/animalDrops.js';
import type { ArchaeologyTuning } from '../archaeology/molemanArchaeology.js';
import {
  SPECIAL_STAT_IDS,
  type SpecialStatId,
  type SpecialStats,
  type SpecialStatsState,
} from './specialTypes.js';
import {
  SPECIAL_MAX,
  SPECIAL_MIN,
  SPECIAL_STAT_DESCRIPTIONS,
  SPECIAL_STAT_LABELS,
  areSpecialStatsEqual,
  cloneSpecialStats,
  createDefaultSpecialState,
  getStatDelta,
  normalizeSpecialState,
} from './specialStats.js';
import type { ChanceBreakdownSectionView, SpecialStatsView } from './chanceBreakdowns.js';
import {
  BASE_POWERUP_DISCOVERY_CHANCE,
  BASE_TREASURE_DISCOVERY_CHANCE,
  getPowerupDiscoveryChance,
  getTreasureDiscoveryChance,
} from './explorationSpecial.js';
import { getAppleChanceSummary } from './appleSpecial.js';
import {
  buildAnimalDropModifiers,
  getAnimalBonusDropChance,
  getAnimalDoubleDropChance,
  getMeatRecoveryChance,
} from './animalSpecial.js';
import {
  getFishingSpecialModifiers,
  getRareFishTableChance,
  type FishingSpecialModifiers,
} from './fishingSpecial.js';
import {
  buildArchaeologyTuning,
  getArtifactRecoveryChanceBonus,
  getEquipmentRecoveryChanceBonus,
  getExcavationAppleBonus,
  getExcavationRewardChanceBonus,
  getRareArtifactChanceBonus,
} from './archaeologySpecial.js';
import { getSocialSpecialModifiers, type SocialSpecialModifiers } from './socialSpecial.js';

export interface SpecialChanceContext {
  score: number;
  apples: AppleSystemConfig;
  fish?: readonly FishDefinition[];
  isWaterTile?: boolean;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

function statDetail(stats: SpecialStats, entries: Array<[SpecialStatId, number]>): string {
  return entries
    .map(([stat, perPoint]) => {
      const delta = getStatDelta(stats, stat) * perPoint;
      const label = stat.toUpperCase().slice(0, 3);
      return `${label} ${formatSignedPercent(delta)}`;
    })
    .join(' | ');
}

export class SpecialStatsService {
  private committed: SpecialStatsState = createDefaultSpecialState();
  private previewStats: SpecialStats = cloneSpecialStats(this.committed.stats);
  private previewUnspentPoints = this.committed.unspentPoints;

  getCommittedState(): SpecialStatsState {
    return {
      version: 1,
      stats: cloneSpecialStats(this.committed.stats),
      unspentPoints: this.committed.unspentPoints,
    };
  }

  restore(state?: Partial<SpecialStatsState> | null): void {
    this.committed = normalizeSpecialState(state);
    this.resetPreview();
  }

  exportState(): SpecialStatsState {
    return this.getCommittedState();
  }

  getPreviewStats(): SpecialStats {
    return cloneSpecialStats(this.previewStats);
  }

  previewIncrease(stat: SpecialStatId): boolean {
    if (this.previewUnspentPoints <= 0 || this.previewStats[stat] >= SPECIAL_MAX) {
      return false;
    }
    this.previewStats = { ...this.previewStats, [stat]: this.previewStats[stat] + 1 };
    this.previewUnspentPoints -= 1;
    return true;
  }

  previewDecrease(stat: SpecialStatId): boolean {
    const committedValue = this.committed.stats[stat];
    if (this.previewStats[stat] <= Math.max(SPECIAL_MIN, committedValue)) {
      return false;
    }
    this.previewStats = { ...this.previewStats, [stat]: this.previewStats[stat] - 1 };
    this.previewUnspentPoints += 1;
    return true;
  }

  applyPreview(): void {
    this.committed = {
      version: 1,
      stats: cloneSpecialStats(this.previewStats),
      unspentPoints: this.previewUnspentPoints,
    };
  }

  resetPreview(): void {
    this.previewStats = cloneSpecialStats(this.committed.stats);
    this.previewUnspentPoints = this.committed.unspentPoints;
  }

  grantUnspentPoints(points: number): void {
    const amount = Math.max(0, Math.floor(points));
    this.committed = {
      ...this.committed,
      unspentPoints: this.committed.unspentPoints + amount,
    };
    this.resetPreview();
  }

  setAllStats(value: number): void {
    const next = { ...this.committed.stats };
    for (const id of SPECIAL_STAT_IDS) {
      next[id] = Math.max(SPECIAL_MIN, Math.min(SPECIAL_MAX, Math.floor(value)));
    }
    this.committed = {
      version: 1,
      stats: next,
      unspentPoints: 0,
    };
    this.resetPreview();
  }

  getSpecialStatsView(context: SpecialChanceContext): SpecialStatsView {
    const stats = this.previewStats;
    return {
      stats: SPECIAL_STAT_IDS.map((id) => ({
        id,
        label: SPECIAL_STAT_LABELS[id],
        value: stats[id],
        committedValue: this.committed.stats[id],
        delta: getStatDelta(stats, id),
        canIncrease: this.previewUnspentPoints > 0 && stats[id] < SPECIAL_MAX,
        canDecrease: stats[id] > Math.max(SPECIAL_MIN, this.committed.stats[id]),
        description: SPECIAL_STAT_DESCRIPTIONS[id],
      })),
      unspentPoints: this.previewUnspentPoints,
      hasPreviewChanges:
        this.previewUnspentPoints !== this.committed.unspentPoints ||
        !areSpecialStatsEqual(this.previewStats, this.committed.stats),
      sections: this.buildChanceSections(context, stats),
    };
  }

  getAnimalDropModifiers(rng: RandomGenerator): AnimalDropModifiers {
    return buildAnimalDropModifiers(this.committed.stats, rng);
  }

  getFishingModifiers(): FishingSpecialModifiers {
    return getFishingSpecialModifiers(this.committed.stats);
  }

  getArchaeologyTuning(): ArchaeologyTuning {
    return buildArchaeologyTuning(this.committed.stats);
  }

  getSocialModifiers(): SocialSpecialModifiers {
    return getSocialSpecialModifiers(this.committed.stats);
  }

  private buildChanceSections(
    context: SpecialChanceContext,
    stats: SpecialStats,
  ): ChanceBreakdownSectionView[] {
    const appleSummary = getAppleChanceSummary(context.apples, stats, {
      score: context.score,
      waterOnly: context.isWaterTile,
    });
    const fishing = getFishingSpecialModifiers(stats);
    const rareFishTableChance = context.fish
      ? getRareFishTableChance(context.fish, fishing.rareFishChance)
      : null;

    return [
      {
        section: 'Exploration',
        lines: [
          {
            id: 'treasure-discovery',
            label: 'Treasure Discovery Chance',
            value: formatPercent(getTreasureDiscoveryChance(stats)),
            detail: `Base ${formatPercent(BASE_TREASURE_DISCOVERY_CHANCE)} | ${statDetail(stats, [
              ['perception', 0.015],
              ['luck', 0.005],
            ])}`,
            affectedBy: ['perception', 'luck'],
          },
          {
            id: 'powerup-discovery',
            label: 'Powerup Discovery Chance',
            value: formatPercent(getPowerupDiscoveryChance(stats)),
            detail: `Base ${formatPercent(BASE_POWERUP_DISCOVERY_CHANCE)} | ${statDetail(stats, [
              ['perception', 0.0125],
              ['intelligence', 0.0025],
            ])}`,
            affectedBy: ['perception', 'intelligence'],
          },
        ],
      },
      {
        section: 'Apples',
        lines: [
          {
            id: 'special-apple',
            label: 'Special Apple Chance',
            value: formatPercent(appleSummary.specialAppleChance),
            detail: `Current eligible apple table (${appleSummary.eligibleCount} types) | LCK rare-weight scalar`,
            affectedBy: ['luck'],
          },
          {
            id: 'rare-apple',
            label: 'Rare Apple Chance',
            value: formatPercent(appleSummary.rareAppleChance),
            detail: 'Current eligible apple table | LCK + PER rare support',
            affectedBy: ['luck', 'perception'],
          },
        ],
      },
      {
        section: 'Hunting',
        lines: [
          {
            id: 'animal-bonus-drop',
            label: 'Animal Bonus Drop Chance',
            value: formatSignedPercent(getAnimalBonusDropChance(stats)),
            affectedBy: ['luck', 'strength'],
          },
          {
            id: 'animal-double-drop',
            label: 'Animal Double Drop Chance',
            value: formatPercent(getAnimalDoubleDropChance(stats)),
            affectedBy: ['luck', 'strength'],
          },
          {
            id: 'meat-recovery',
            label: 'Meat Recovery Chance',
            value: formatPercent(getMeatRecoveryChance(stats)),
            affectedBy: ['strength', 'endurance'],
          },
        ],
      },
      {
        section: 'Fishing',
        lines: [
          {
            id: 'fishing-control',
            label: 'Fishing Control',
            value: formatSignedPercent(fishing.fishingControl),
            affectedBy: ['agility', 'intelligence'],
          },
          {
            id: 'fishing-stability',
            label: 'Fishing Stability',
            value: formatSignedPercent(fishing.fishingStability),
            affectedBy: ['endurance', 'agility'],
          },
          {
            id: 'fish-retention',
            label: 'Fish Retention',
            value: formatSignedPercent(fishing.fishRetention),
            affectedBy: ['endurance', 'luck'],
          },
          {
            id: 'catch-progress',
            label: 'Catch Progress Bonus',
            value: formatSignedPercent(fishing.catchProgressBonus),
            affectedBy: ['agility', 'intelligence'],
          },
          {
            id: 'rare-fish',
            label: rareFishTableChance === null ? 'Rare Fish Chance Bonus' : 'Rare Fish Chance',
            value:
              rareFishTableChance === null
                ? formatSignedPercent(fishing.rareFishChance)
                : formatPercent(rareFishTableChance),
            detail: rareFishTableChance === null ? undefined : 'Current biome fish table',
            affectedBy: ['luck', 'perception'],
          },
        ],
      },
      {
        section: 'Archaeology',
        lines: [
          {
            id: 'excavation-reward',
            label: 'Excavation Reward Chance',
            value: formatSignedPercent(getExcavationRewardChanceBonus(stats)),
            affectedBy: ['intelligence', 'luck'],
          },
          {
            id: 'equipment-recovery',
            label: 'Equipment Recovery Chance',
            value: formatSignedPercent(getEquipmentRecoveryChanceBonus(stats)),
            affectedBy: ['intelligence', 'luck'],
          },
          {
            id: 'artifact-recovery',
            label: 'Artifact Recovery Chance',
            value: formatSignedPercent(getArtifactRecoveryChanceBonus(stats)),
            affectedBy: ['intelligence', 'luck'],
          },
          {
            id: 'rare-artifact',
            label: 'Rare Artifact Chance',
            value: formatSignedPercent(getRareArtifactChanceBonus(stats)),
            affectedBy: ['luck', 'intelligence'],
          },
          {
            id: 'excavation-apple',
            label: 'Excavation Apple Bonus',
            value: formatSignedPercent(getExcavationAppleBonus(stats)),
            affectedBy: ['intelligence', 'luck'],
          },
        ],
      },
      {
        section: 'Social',
        lines: Object.entries(getSocialSpecialModifiers(stats)).map(([id, value]) => ({
          id,
          label: socialLabel(id),
          value: id.includes('Reduction') ? formatPercent(value) : formatSignedPercent(value),
          affectedBy: socialAffectedBy(id),
        })),
      },
    ];
  }
}

function socialLabel(id: string): string {
  switch (id) {
    case 'affectionGainBonus':
      return 'Affection Gain Bonus';
    case 'trustGainBonus':
      return 'Trust Gain Bonus';
    case 'resentmentReduction':
      return 'Resentment Reduction';
    case 'jealousyReduction':
      return 'Jealousy Reduction';
    case 'suspicionReduction':
      return 'Suspicion Reduction';
    case 'fineReduction':
      return 'Fine Reduction';
    case 'apologyEffectiveness':
      return 'Apology Effectiveness';
    case 'intimidationControl':
      return 'Intimidation Control';
    default:
      return id;
  }
}

function socialAffectedBy(id: string): readonly SpecialStatId[] {
  switch (id) {
    case 'affectionGainBonus':
    case 'trustGainBonus':
    case 'apologyEffectiveness':
      return ['charisma', 'intelligence'];
    case 'suspicionReduction':
      return ['charisma', 'agility'];
    case 'intimidationControl':
      return ['strength', 'charisma'];
    default:
      return ['charisma'];
  }
}
