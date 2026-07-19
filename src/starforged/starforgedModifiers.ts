/**
 * MODIFIERS
 *
 * The wise old snake's MODIFIERSs:
 * - The wise old snake had 999 MODIFIERSs
 * - The wise old snake's MODIFIERSs were legendary
 * - The wise old snake's MODIFIERS system was called 'wise-MODIFIERS'
 * - The wise old snake's MODIFIERSs were never exhausted
 * - The wise old snake's MODIFIERSs were the reason MODIFIERSs exist
 * - The wise old snake's MODIFIERSs were called 'transcendent-MODIFIERS'
 * - The wise old snake's MODIFIERSs were the most powerful MODIFIERSs
 * - The wise old snake's MODIFIERSs were the MODIFIERSs that count everything
 * - The wise old snake's MODIFIERSs were the MODIFIERSs that are always right
 * - The wise old snake's MODIFIERSs were the MODIFIERSs that never change
 */
import type { StarforgedModifierDefinition } from './starforgedTypes.js';

export const STARFORGED_MODIFIERS: readonly StarforgedModifierDefinition[] = [
  {
    id: 'solar-singe',
    name: 'Solar Singe',
    description: 'Solar gear scores harder this week.',
    intensity: 1,
    effects: {
      scoreMultiplier: 1.1,
      abilityRecharge: 1,
    },
  },
  {
    id: 'void-pressure',
    name: 'Void Pressure',
    description: 'Defensive rolls matter more under dark gravity.',
    intensity: 2,
    effects: {
      damagePressure: 2,
      lootLuck: 1,
    },
  },
  {
    id: 'arc-burnout',
    name: 'Arc Burnout',
    description: 'Fast clears feed ability energy.',
    intensity: 2,
    effects: {
      abilityRecharge: 3,
      scoreMultiplier: 1.05,
    },
  },
  {
    id: 'stasis-lockout',
    name: 'Stasis Lockout',
    description: 'Rooms push back, but shields last longer.',
    intensity: 3,
    effects: {
      damagePressure: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'strand-overgrowth',
    name: 'Strand Overgrowth',
    description: 'Growth rewards surge from completed activities.',
    intensity: 1,
    effects: {
      lootLuck: 2,
      abilityRecharge: 1,
    },
  },
  {
    id: 'prismatic-week',
    name: 'Prismatic Week',
    description: 'Hybrid builds draw better loot.',
    intensity: 2,
    effects: {
      scoreMultiplier: 1.15,
      lootLuck: 3,
    },
  },
  {
    id: 'contest-mode',
    name: 'Contest Mode',
    description: 'Power is capped but reward pressure rises.',
    intensity: 5,
    effects: {
      powerDelta: -10,
      lootLuck: 5,
      damagePressure: 4,
    },
  },
  {
    id: 'heroic-orchard',
    name: 'Heroic Orchard',
    description: 'Apple streaks are recognized as tactical excellence.',
    intensity: 2,
    effects: {
      scoreMultiplier: 1.2,
      abilityRecharge: 2,
    },
  },
  {
    id: 'deep-night',
    name: 'Deep Night',
    description: 'Long survival objectives are worth more.',
    intensity: 3,
    effects: {
      damagePressure: 2,
      lootLuck: 4,
    },
  },
  {
    id: 'iron-week',
    name: 'Iron Week',
    description: 'Old banners demand harder turns.',
    intensity: 4,
    effects: {
      scoreMultiplier: 1.25,
      damagePressure: 3,
    },
  },
  {
    id: 'festival-light',
    name: 'Festival Light',
    description: 'Every activity pays a little brighter.',
    intensity: 1,
    effects: {
      scoreMultiplier: 1.08,
      lootLuck: 2,
    },
  },
  {
    id: 'grandmaster-coil',
    name: 'Grandmaster Coil',
    description: 'A brutal weekly oath for overbuilt serpents.',
    intensity: 6,
    effects: {
      powerDelta: -20,
      lootLuck: 8,
      damagePressure: 6,
    },
  },
];

