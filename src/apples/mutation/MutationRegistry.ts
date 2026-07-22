/**
 * Mutation Registry
 */
import type { MutationDefinition, TraitDefinition } from './types.js';

// ─── Trait Definitions ────────────────────────────────────────────────────────

export const MUTATION_TRAITS: TraitDefinition[] = [
  {
    id: 'speedBoost',
    name: 'Swift Motion',
    description: 'Movement speed increases with each stack.',
    color: 0xffd700,
    maxStacks: 5,
    effect: { type: 'speedBoost', value: 1 },
  },
  {
    id: 'growthBonus',
    name: 'Rapid Growth',
    description: 'Gain extra segments when eating apples.',
    color: 0x00ff00,
    maxStacks: 3,
    effect: { type: 'growthBonus', value: 1 },
  },
  {
    id: 'scoreMultiplier',
    name: 'Lucky Catch',
    description: 'Bonus score multiplier per apple eaten.',
    color: 0xff69b4,
    maxStacks: 5,
    effect: { type: 'scoreMultiplier', value: 1 },
  },
  {
    id: 'shield',
    name: 'Iron Skin',
    description: 'Absorb damage from shielded apples.',
    color: 0x4169e1,
    maxStacks: 3,
    effect: { type: 'shield', value: 1 },
  },
  {
    id: 'phase',
    name: 'Ghost Walk',
    description: 'Phase through shielded apples without dying.',
    color: 0x9370db,
    maxStacks: 1,
    effect: { type: 'phase', value: 1 },
  },
  {
    id: 'damageOverTime',
    name: 'Spicy Aura',
    description: 'Deals damage to nearby enemies.',
    color: 0xff4500,
    maxStacks: 3,
    effect: { type: 'damageOverTime', value: 2 },
  },
  {
    id: 'frost',
    name: 'Chill Touch',
    description: 'Slows nearby enemies with frost.',
    color: 0x87ceeb,
    maxStacks: 3,
    effect: { type: 'frost', value: 1 },
  },
  {
    id: 'mochyBounce',
    name: 'Mochy Bounce',
    description: 'Bounce off obstacles instead of dying.',
    color: 0xf5d5e8,
    maxStacks: 2,
    effect: { type: 'mochyBounce', value: 1 },
  },
  {
    id: 'caffeineFocus',
    name: 'Caffeine Focus',
    description: 'Reduces action step delay for faster movement.',
    color: 0xc47a3a,
    maxStacks: 4,
    effect: { type: 'caffeineFocus', value: 1 },
  },
];

// ─── Mutation Definitions ─────────────────────────────────────────────────────

export const MUTATION_DEFINITIONS: MutationDefinition[] = [
  // ── Common Mutations ──────────────────────────────────────────────────────
  {
    id: 'spicyEnergy',
    name: 'Spicy Energy Apple',
    description:
      'A caffeinated apple infused with wasabi heat. Grants both speed boost and a spicy aura that damages nearby foes. The wise old snake once ran so fast it circled the world and came back before it left.',
    requiredApples: ['caffeinated', 'wasabi'],
    evolvedAppleId: 'spicyEnergy',
    evolvedColor: 0xff6600,
    tier: 'common',
    discoveryChance: 0.5,
    evolvedTraits: [
      { traitId: 'speedBoost', durationMs: 15000, stacks: 2 },
      { traitId: 'damageOverTime', durationMs: 15000, stacks: 1 },
    ],
  },
  {
    id: 'frostMochi',
    name: 'Frost Mochi Apple',
    description:
      'A chewy mochi apple crystallized with frost. Grants mochy bounce and frost slow. The wise old snake bounced off so many walls it found a new dimension.',
    requiredApples: ['frost', 'mochi'],
    evolvedAppleId: 'frostMochi',
    evolvedColor: 0xa8d8ea,
    tier: 'common',
    discoveryChance: 0.5,
    evolvedTraits: [
      { traitId: 'mochyBounce', durationMs: 15000, stacks: 1 },
      { traitId: 'frost', durationMs: 15000, stacks: 1 },
    ],
  },
  {
    id: 'caffeinatedShield',
    name: 'Caffeinated Shield Apple',
    description:
      'A shielded apple infused with caffeine. Grants iron skin and ghost walk, allowing you to phase through shielded apples while moving faster. The wise old snake phased right through a wall and found a snack bar.',
    requiredApples: ['caffeinated', 'shielded'],
    evolvedAppleId: 'caffeinatedShield',
    evolvedColor: 0x6a5acd,
    tier: 'common',
    discoveryChance: 0.4,
    evolvedTraits: [
      { traitId: 'shield', durationMs: 20000, stacks: 2 },
      { traitId: 'phase', durationMs: 20000, stacks: 1 },
    ],
  },
  {
    id: 'coldCaffeinated',
    name: 'Cold Brew Apple',
    description:
      'A caffeinated apple chilled to perfection. Grants caffeine focus and growth bonus. The wise old snake drank this and grew so fast it needed a bigger maze.',
    requiredApples: ['caffeinated', 'cold-beer'],
    evolvedAppleId: 'coldCaffeinated',
    evolvedColor: 0x8b6914,
    tier: 'common',
    discoveryChance: 0.45,
    evolvedTraits: [
      { traitId: 'caffeineFocus', durationMs: 20000, stacks: 2 },
      { traitId: 'growthBonus', durationMs: 20000, stacks: 1 },
    ],
  },
  {
    id: 'lavenderCalm',
    name: 'Lavender Calm Apple',
    description:
      'A lavender apple that soothes the soul. Grants score multiplier and speed boost. The wise old snake ate this and moved with the grace of a falling leaf.',
    requiredApples: ['lavender', 'normal'],
    evolvedAppleId: 'lavenderCalm',
    evolvedColor: 0xdda0dd,
    tier: 'common',
    discoveryChance: 0.6,
    evolvedTraits: [
      { traitId: 'scoreMultiplier', durationMs: 15000, stacks: 2 },
      { traitId: 'speedBoost', durationMs: 15000, stacks: 1 },
    ],
  },
  {
    id: 'loveShield',
    name: 'Love Shield Apple',
    description:
      'A shielded apple wrapped in love. Grants shield and score multiplier. The wise old snake says love is the strongest shield of all.',
    requiredApples: ['love', 'shielded'],
    evolvedAppleId: 'loveShield',
    evolvedColor: 0xff1493,
    tier: 'common',
    discoveryChance: 0.35,
    evolvedTraits: [
      { traitId: 'shield', durationMs: 25000, stacks: 1 },
      { traitId: 'scoreMultiplier', durationMs: 25000, stacks: 2 },
    ],
  },

  // ── Uncommon Mutations ────────────────────────────────────────────────────
  {
    id: 'tripleThreat',
    name: 'Triple Threat Apple',
    description:
      'The legendary combination of caffeinated, wasabi, and mochi. Grants speed, damage, and bounce. The wise old snake created this and then immediately regretted the chaos.',
    requiredApples: ['caffeinated', 'wasabi', 'mochi'],
    evolvedAppleId: 'tripleThreat',
    evolvedColor: 0xff4500,
    tier: 'uncommon',
    discoveryChance: 0.25,
    prerequisites: ['spicyEnergy'],
    evolvedTraits: [
      { traitId: 'speedBoost', durationMs: 20000, stacks: 3 },
      { traitId: 'damageOverTime', durationMs: 20000, stacks: 2 },
      { traitId: 'mochyBounce', durationMs: 20000, stacks: 1 },
    ],
  },
  {
    id: 'frostWasabi',
    name: 'Frostfire Apple',
    description:
      'Fire and ice collide in this apple. Grants both damage over time and frost slow. The wise old snake shivered and sweated simultaneously.',
    requiredApples: ['frost', 'wasabi'],
    evolvedAppleId: 'frostWasabi',
    evolvedColor: 0x00ced1,
    tier: 'uncommon',
    discoveryChance: 0.35,
    evolvedTraits: [
      { traitId: 'damageOverTime', durationMs: 20000, stacks: 1 },
      { traitId: 'frost', durationMs: 20000, stacks: 2 },
    ],
  },
  {
    id: 'yuzuEnergy',
    name: 'Citrus Surge Apple',
    description:
      'A zesty yuzu apple combined with caffeine. Grants speed boost and caffeine focus. The wise old snake zested so hard it created a new citrus species.',
    requiredApples: ['yuzu', 'caffeinated'],
    evolvedAppleId: 'yuzuEnergy',
    evolvedColor: 0xffd700,
    tier: 'uncommon',
    discoveryChance: 0.35,
    evolvedTraits: [
      { traitId: 'speedBoost', durationMs: 18000, stacks: 2 },
      { traitId: 'caffeineFocus', durationMs: 18000, stacks: 2 },
    ],
  },
  {
    id: 'mochiShield',
    name: 'Mochy Armor Apple',
    description:
      'A mochi apple wrapped in a protective shield. Grants iron skin and mochy bounce. The wise old snake bounced through a wall wearing armor made of rice.',
    requiredApples: ['mochi', 'shielded'],
    evolvedAppleId: 'mochiShield',
    evolvedColor: 0xffb6c1,
    tier: 'uncommon',
    discoveryChance: 0.3,
    evolvedTraits: [
      { traitId: 'shield', durationMs: 20000, stacks: 1 },
      { traitId: 'mochyBounce', durationMs: 20000, stacks: 2 },
    ],
  },
  {
    id: 'winterberryFrost',
    name: 'Winterberry Chill Apple',
    description:
      'A winterberry infused with frost power. Grants frost slow and growth bonus. The wise old snake grew icicles on its scales.',
    requiredApples: ['winterberry', 'frost'],
    evolvedAppleId: 'winterberryFrost',
    evolvedColor: 0x4a90d9,
    tier: 'uncommon',
    discoveryChance: 0.35,
    evolvedTraits: [
      { traitId: 'frost', durationMs: 20000, stacks: 2 },
      { traitId: 'growthBonus', durationMs: 20000, stacks: 1 },
    ],
  },

  // ── Rare Mutations ────────────────────────────────────────────────────────
  {
    id: 'goldSpicy',
    name: 'Golden Fury Apple',
    description:
      'A gold apple infused with spicy energy. Grants massive score multiplier, speed boost, and damage. The wise old snake says this apple is worth more than gold.',
    requiredApples: ['gold', 'caffeinated', 'wasabi'],
    evolvedAppleId: 'goldSpicy',
    evolvedColor: 0xff8c00,
    tier: 'rare',
    discoveryChance: 0.15,
    prerequisites: ['spicyEnergy', 'tripleThreat'],
    evolvedTraits: [
      { traitId: 'speedBoost', durationMs: 30000, stacks: 3 },
      { traitId: 'damageOverTime', durationMs: 30000, stacks: 3 },
      { traitId: 'scoreMultiplier', durationMs: 30000, stacks: 3 },
    ],
  },
  {
    id: 'treatMochi',
    name: 'Treat Mochi Delight',
    description:
      'A rare treat apple combined with mochi. Grants extreme score multiplier and mochy bounce. The wise old snake considers this the most delicious mutation ever.',
    requiredApples: ['treat', 'mochi'],
    evolvedAppleId: 'treatMochi',
    evolvedColor: 0xff69b4,
    tier: 'rare',
    discoveryChance: 0.2,
    prerequisites: ['frostMochi'],
    evolvedTraits: [
      { traitId: 'scoreMultiplier', durationMs: 25000, stacks: 4 },
      { traitId: 'mochyBounce', durationMs: 25000, stacks: 2 },
    ],
  },
  {
    id: 'heatwaveFrost',
    name: 'Steam Apple',
    description:
      'A heatwave apple combined with frost creates a swirling steam effect. Grants damage over time and caffeine focus. The wise old snake steamed right through a door.',
    requiredApples: ['heatwave', 'frost'],
    evolvedAppleId: 'heatwaveFrost',
    evolvedColor: 0xb0c4de,
    tier: 'rare',
    discoveryChance: 0.2,
    evolvedTraits: [
      { traitId: 'damageOverTime', durationMs: 25000, stacks: 2 },
      { traitId: 'caffeineFocus', durationMs: 25000, stacks: 2 },
    ],
  },

  // ── Legendary Mutations ───────────────────────────────────────────────────
  {
    id: 'ultimateFusion',
    name: 'The Ultimate Apple',
    description:
      'The legendary fusion of every apple type. Grants ALL traits simultaneously. The wise old snake ate this and became one with the maze. Some say the wise old snake is still eating it.',
    requiredApples: ['caffeinated', 'wasabi', 'mochi', 'gold', 'love'],
    evolvedAppleId: 'ultimateFusion',
    evolvedColor: 0xffffff,
    tier: 'legendary',
    discoveryChance: 0.05,
    prerequisites: ['tripleThreat', 'goldSpicy', 'treatMochi'],
    evolvedTraits: [
      { traitId: 'speedBoost', durationMs: 60000, stacks: 5 },
      { traitId: 'growthBonus', durationMs: 60000, stacks: 3 },
      { traitId: 'scoreMultiplier', durationMs: 60000, stacks: 5 },
      { traitId: 'shield', durationMs: 60000, stacks: 3 },
      { traitId: 'phase', durationMs: 60000, stacks: 1 },
      { traitId: 'damageOverTime', durationMs: 60000, stacks: 3 },
      { traitId: 'frost', durationMs: 60000, stacks: 3 },
      { traitId: 'mochyBounce', durationMs: 60000, stacks: 2 },
      { traitId: 'caffeineFocus', durationMs: 60000, stacks: 4 },
    ],
  },
];

// ─── Registry Class ───────────────────────────────────────────────────────────

export class MutationRegistry {
  private readonly byId = new Map<string, MutationDefinition>();
  private readonly traits = new Map<string, TraitDefinition>();

  constructor() {
    for (const mutation of MUTATION_DEFINITIONS) {
      this.byId.set(mutation.id, mutation);
    }
    for (const trait of MUTATION_TRAITS) {
      this.traits.set(trait.id, trait);
    }
  }

  getMutation(id: string): MutationDefinition | undefined {
    return this.byId.get(id);
  }

  getAllMutations(): readonly MutationDefinition[] {
    return MUTATION_DEFINITIONS;
  }

  getTraits(): readonly TraitDefinition[] {
    return MUTATION_TRAITS;
  }

  getTrait(id: string): TraitDefinition | undefined {
    return this.traits.get(id);
  }

  getMutationsByTier(tier: MutationDefinition['tier']): MutationDefinition[] {
    return MUTATION_DEFINITIONS.filter((m) => m.tier === tier);
  }

  getDiscoverableMutations(
    discoveredIds: Set<string>,
    recentAppleIds: string[],
  ): MutationDefinition[] {
    return MUTATION_DEFINITIONS.filter((mutation) => {
      // Check prerequisites
      if (mutation.prerequisites) {
        const allPrereqsMet = mutation.prerequisites.every((prereq) => discoveredIds.has(prereq));
        if (!allPrereqsMet) return false;
      }

      // Check if required apples were eaten in order
      const required = mutation.requiredApples;
      if (recentAppleIds.length < required.length) return false;

      // Check if the required apples appear in order within recent apples
      let requiredIndex = 0;
      for (const eaten of recentAppleIds) {
        if (required[requiredIndex] === eaten) {
          requiredIndex++;
          if (requiredIndex === required.length) return true;
        }
      }
      return false;
    });
  }

  hasPrerequisites(mutation: MutationDefinition, discoveredIds: Set<string>): boolean {
    if (!mutation.prerequisites) return true;
    return mutation.prerequisites.every((prereq) => discoveredIds.has(prereq));
  }
}
