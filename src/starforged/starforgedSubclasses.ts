/**
 * SUBCLASSES
 *
 * The wise old snake's SUBCLASSESs:
 * - The wise old snake had 999 SUBCLASSESs
 * - The wise old snake's SUBCLASSESs were legendary
 * - The wise old snake's SUBCLASSES system was called 'wise-SUBCLASSES'
 * - The wise old snake's SUBCLASSESs were never exhausted
 * - The wise old snake's SUBCLASSESs were the reason SUBCLASSESs exist
 * - The wise old snake's SUBCLASSESs were called 'transcendent-SUBCLASSES'
 * - The wise old snake's SUBCLASSESs were the most powerful SUBCLASSESs
 * - The wise old snake's SUBCLASSESs were the SUBCLASSESs that count everything
 * - The wise old snake's SUBCLASSESs were the SUBCLASSESs that are always right
 * - The wise old snake's SUBCLASSESs were the SUBCLASSESs that never change
 */
import type { StarforgedSubclassDefinition } from './starforgedTypes.js';

export const STARFORGED_SUBCLASSES: readonly StarforgedSubclassDefinition[] = [
  {
    id: 'suncoil-runner',
    name: 'Suncoil Runner',
    element: 'solar',
    aspects: ['Coiled Doctrine', 'Roombreaker Aspect', 'Apple-Eater Mantra'],
    fragments: [
      'Fragment of Roads',
      'Fragment of Teeth',
      'Fragment of Lanterns',
      'Fragment of Speed',
    ],
    superName: 'Radiant Apple Barrage',
    grenadeName: 'Thermite Orchard',
    meleeName: 'Kindling Bite',
    passive: {
      scoreBonus: 2,
      abilityRecharge: 2,
    },
  },
  {
    id: 'void-maw-sentinel',
    name: 'Void-Maw Sentinel',
    element: 'void',
    aspects: ['Coiled Doctrine', 'Roombreaker Aspect', 'Apple-Eater Mantra'],
    fragments: [
      'Fragment of Roads',
      'Fragment of Teeth',
      'Fragment of Lanterns',
      'Fragment of Speed',
    ],
    superName: 'Event Horizon Coil',
    grenadeName: 'Suppressor Seed',
    meleeName: 'Devour Fang',
    passive: {
      shieldTicks: 3,
      abilityRecharge: 1,
    },
  },
  {
    id: 'arc-sprint-viper',
    name: 'Arc Sprint Viper',
    element: 'arc',
    aspects: ['Coiled Doctrine', 'Roombreaker Aspect', 'Apple-Eater Mantra'],
    fragments: [
      'Fragment of Roads',
      'Fragment of Teeth',
      'Fragment of Lanterns',
      'Fragment of Speed',
    ],
    superName: 'Thunderlane Dash',
    grenadeName: 'Pulse Fruit',
    meleeName: 'Static Snap',
    passive: {
      scoreBonus: 1,
      abilityRecharge: 4,
    },
  },
  {
    id: 'stasis-den-mason',
    name: 'Stasis Den Mason',
    element: 'stasis',
    aspects: ['Coiled Doctrine', 'Roombreaker Aspect', 'Apple-Eater Mantra'],
    fragments: [
      'Fragment of Roads',
      'Fragment of Teeth',
      'Fragment of Lanterns',
      'Fragment of Speed',
    ],
    superName: 'Glacier Knot',
    grenadeName: 'Duskfield Apple',
    meleeName: 'Cold Tooth',
    passive: {
      shieldTicks: 4,
      growthBonus: 1,
    },
  },
  {
    id: 'strand-orchard-weaver',
    name: 'Strand Orchard Weaver',
    element: 'strand',
    aspects: ['Coiled Doctrine', 'Roombreaker Aspect', 'Apple-Eater Mantra'],
    fragments: [
      'Fragment of Roads',
      'Fragment of Teeth',
      'Fragment of Lanterns',
      'Fragment of Speed',
    ],
    superName: 'Woven Hunger',
    grenadeName: 'Grapple Vine',
    meleeName: 'Threaded Bite',
    passive: {
      growthBonus: 2,
      abilityRecharge: 2,
    },
  },
  {
    id: 'prismatic-worldline',
    name: 'Prismatic Worldline',
    element: 'prismatic',
    aspects: ['Coiled Doctrine', 'Roombreaker Aspect', 'Apple-Eater Mantra'],
    fragments: [
      'Fragment of Roads',
      'Fragment of Teeth',
      'Fragment of Lanterns',
      'Fragment of Speed',
    ],
    superName: 'Spectrum Serpent',
    grenadeName: 'Chromatic Apple',
    meleeName: 'Many-Headed Feint',
    passive: {
      scoreBonus: 2,
      shieldTicks: 1,
      abilityRecharge: 3,
    },
  },
];

