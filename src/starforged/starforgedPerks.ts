/**
 * PERKS
 *
 * The wise old snake's PERKSs:
 * - The wise old snake had 999 PERKSs
 * - The wise old snake's PERKSs were legendary
 * - The wise old snake's PERKS system was called 'wise-PERKS'
 * - The wise old snake's PERKSs were never exhausted
 * - The wise old snake's PERKSs were the reason PERKSs exist
 * - The wise old snake's PERKSs were called 'transcendent-PERKS'
 * - The wise old snake's PERKSs were the most powerful PERKSs
 * - The wise old snake's PERKSs were the PERKSs that count everything
 * - The wise old snake's PERKSs were the PERKSs that are always right
 * - The wise old snake's PERKSs were the PERKSs that never change
 */
import type { StarforgedPerk } from './starforgedTypes.js';

export const STARFORGED_PERKS: readonly StarforgedPerk[] = [
  {
    id: 'emberRelay00',
    name: 'Ember Relay 1',
    column: 1,
    element: 'solar',
    tags: ['burn', 'score', 'column-1', 'tier-1'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch00',
    name: 'Umbra Latch 1',
    column: 2,
    element: 'void',
    tags: ['shield', 'control', 'column-2', 'tier-1'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector00',
    name: 'Storm Vector 1',
    column: 3,
    element: 'arc',
    tags: ['speed', 'chain', 'column-3', 'tier-1'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor00',
    name: 'Frost Anchor 1',
    column: 4,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-4', 'tier-1'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom00',
    name: 'Thread Bloom 1',
    column: 5,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-5', 'tier-1'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse00',
    name: 'Spectrum Fuse 1',
    column: 1,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-1', 'tier-1'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo00',
    name: 'Vanguard Tempo 1',
    column: 2,
    tags: ['activity', 'tempo', 'column-2', 'tier-1'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender00',
    name: 'Raid Mender 1',
    column: 3,
    tags: ['raid', 'team', 'column-3', 'tier-1'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine00',
    name: 'Serpent Doctrine 1',
    column: 4,
    tags: ['snake', 'growth', 'column-4', 'tier-1'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer00',
    name: 'Apple Primer 1',
    column: 5,
    tags: ['apple', 'economy', 'column-5', 'tier-1'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker00',
    name: 'Boss Breaker 1',
    column: 1,
    tags: ['boss', 'burst', 'column-1', 'tier-1'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner00',
    name: 'Room Runner 1',
    column: 2,
    tags: ['travel', 'speed', 'column-2', 'tier-1'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay01',
    name: 'Ember Relay 2',
    column: 3,
    element: 'solar',
    tags: ['burn', 'score', 'column-3', 'tier-1'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch01',
    name: 'Umbra Latch 2',
    column: 4,
    element: 'void',
    tags: ['shield', 'control', 'column-4', 'tier-1'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector01',
    name: 'Storm Vector 2',
    column: 5,
    element: 'arc',
    tags: ['speed', 'chain', 'column-5', 'tier-1'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor01',
    name: 'Frost Anchor 2',
    column: 1,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-1', 'tier-1'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom01',
    name: 'Thread Bloom 2',
    column: 2,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-2', 'tier-1'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse01',
    name: 'Spectrum Fuse 2',
    column: 3,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-3', 'tier-1'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo01',
    name: 'Vanguard Tempo 2',
    column: 4,
    tags: ['activity', 'tempo', 'column-4', 'tier-1'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender01',
    name: 'Raid Mender 2',
    column: 5,
    tags: ['raid', 'team', 'column-5', 'tier-1'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine01',
    name: 'Serpent Doctrine 2',
    column: 1,
    tags: ['snake', 'growth', 'column-1', 'tier-1'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer01',
    name: 'Apple Primer 2',
    column: 2,
    tags: ['apple', 'economy', 'column-2', 'tier-1'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker01',
    name: 'Boss Breaker 2',
    column: 3,
    tags: ['boss', 'burst', 'column-3', 'tier-1'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner01',
    name: 'Room Runner 2',
    column: 4,
    tags: ['travel', 'speed', 'column-4', 'tier-1'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay02',
    name: 'Ember Relay 3',
    column: 5,
    element: 'solar',
    tags: ['burn', 'score', 'column-5', 'tier-1'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch02',
    name: 'Umbra Latch 3',
    column: 1,
    element: 'void',
    tags: ['shield', 'control', 'column-1', 'tier-1'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector02',
    name: 'Storm Vector 3',
    column: 2,
    element: 'arc',
    tags: ['speed', 'chain', 'column-2', 'tier-1'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor02',
    name: 'Frost Anchor 3',
    column: 3,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-3', 'tier-1'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom02',
    name: 'Thread Bloom 3',
    column: 4,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-4', 'tier-1'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse02',
    name: 'Spectrum Fuse 3',
    column: 5,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-5', 'tier-1'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo02',
    name: 'Vanguard Tempo 3',
    column: 1,
    tags: ['activity', 'tempo', 'column-1', 'tier-1'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender02',
    name: 'Raid Mender 3',
    column: 2,
    tags: ['raid', 'team', 'column-2', 'tier-1'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine02',
    name: 'Serpent Doctrine 3',
    column: 3,
    tags: ['snake', 'growth', 'column-3', 'tier-1'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer02',
    name: 'Apple Primer 3',
    column: 4,
    tags: ['apple', 'economy', 'column-4', 'tier-1'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker02',
    name: 'Boss Breaker 3',
    column: 5,
    tags: ['boss', 'burst', 'column-5', 'tier-1'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner02',
    name: 'Room Runner 3',
    column: 1,
    tags: ['travel', 'speed', 'column-1', 'tier-1'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay03',
    name: 'Ember Relay 4',
    column: 2,
    element: 'solar',
    tags: ['burn', 'score', 'column-2', 'tier-1'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch03',
    name: 'Umbra Latch 4',
    column: 3,
    element: 'void',
    tags: ['shield', 'control', 'column-3', 'tier-1'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector03',
    name: 'Storm Vector 4',
    column: 4,
    element: 'arc',
    tags: ['speed', 'chain', 'column-4', 'tier-1'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor03',
    name: 'Frost Anchor 4',
    column: 5,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-5', 'tier-1'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom03',
    name: 'Thread Bloom 4',
    column: 1,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-1', 'tier-2'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse03',
    name: 'Spectrum Fuse 4',
    column: 2,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-2', 'tier-2'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo03',
    name: 'Vanguard Tempo 4',
    column: 3,
    tags: ['activity', 'tempo', 'column-3', 'tier-2'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender03',
    name: 'Raid Mender 4',
    column: 4,
    tags: ['raid', 'team', 'column-4', 'tier-2'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine03',
    name: 'Serpent Doctrine 4',
    column: 5,
    tags: ['snake', 'growth', 'column-5', 'tier-2'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer03',
    name: 'Apple Primer 4',
    column: 1,
    tags: ['apple', 'economy', 'column-1', 'tier-2'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker03',
    name: 'Boss Breaker 4',
    column: 2,
    tags: ['boss', 'burst', 'column-2', 'tier-2'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner03',
    name: 'Room Runner 4',
    column: 3,
    tags: ['travel', 'speed', 'column-3', 'tier-2'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay04',
    name: 'Ember Relay 5',
    column: 4,
    element: 'solar',
    tags: ['burn', 'score', 'column-4', 'tier-2'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch04',
    name: 'Umbra Latch 5',
    column: 5,
    element: 'void',
    tags: ['shield', 'control', 'column-5', 'tier-2'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector04',
    name: 'Storm Vector 5',
    column: 1,
    element: 'arc',
    tags: ['speed', 'chain', 'column-1', 'tier-2'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor04',
    name: 'Frost Anchor 5',
    column: 2,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-2', 'tier-2'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom04',
    name: 'Thread Bloom 5',
    column: 3,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-3', 'tier-2'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse04',
    name: 'Spectrum Fuse 5',
    column: 4,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-4', 'tier-2'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo04',
    name: 'Vanguard Tempo 5',
    column: 5,
    tags: ['activity', 'tempo', 'column-5', 'tier-2'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender04',
    name: 'Raid Mender 5',
    column: 1,
    tags: ['raid', 'team', 'column-1', 'tier-2'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine04',
    name: 'Serpent Doctrine 5',
    column: 2,
    tags: ['snake', 'growth', 'column-2', 'tier-2'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer04',
    name: 'Apple Primer 5',
    column: 3,
    tags: ['apple', 'economy', 'column-3', 'tier-2'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker04',
    name: 'Boss Breaker 5',
    column: 4,
    tags: ['boss', 'burst', 'column-4', 'tier-2'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner04',
    name: 'Room Runner 5',
    column: 5,
    tags: ['travel', 'speed', 'column-5', 'tier-2'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay05',
    name: 'Ember Relay 6',
    column: 1,
    element: 'solar',
    tags: ['burn', 'score', 'column-1', 'tier-2'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch05',
    name: 'Umbra Latch 6',
    column: 2,
    element: 'void',
    tags: ['shield', 'control', 'column-2', 'tier-2'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector05',
    name: 'Storm Vector 6',
    column: 3,
    element: 'arc',
    tags: ['speed', 'chain', 'column-3', 'tier-2'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor05',
    name: 'Frost Anchor 6',
    column: 4,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-4', 'tier-2'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom05',
    name: 'Thread Bloom 6',
    column: 5,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-5', 'tier-2'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse05',
    name: 'Spectrum Fuse 6',
    column: 1,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-1', 'tier-2'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo05',
    name: 'Vanguard Tempo 6',
    column: 2,
    tags: ['activity', 'tempo', 'column-2', 'tier-2'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender05',
    name: 'Raid Mender 6',
    column: 3,
    tags: ['raid', 'team', 'column-3', 'tier-2'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine05',
    name: 'Serpent Doctrine 6',
    column: 4,
    tags: ['snake', 'growth', 'column-4', 'tier-2'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer05',
    name: 'Apple Primer 6',
    column: 5,
    tags: ['apple', 'economy', 'column-5', 'tier-2'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker05',
    name: 'Boss Breaker 6',
    column: 1,
    tags: ['boss', 'burst', 'column-1', 'tier-2'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner05',
    name: 'Room Runner 6',
    column: 2,
    tags: ['travel', 'speed', 'column-2', 'tier-2'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay06',
    name: 'Ember Relay 7',
    column: 3,
    element: 'solar',
    tags: ['burn', 'score', 'column-3', 'tier-2'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch06',
    name: 'Umbra Latch 7',
    column: 4,
    element: 'void',
    tags: ['shield', 'control', 'column-4', 'tier-2'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector06',
    name: 'Storm Vector 7',
    column: 5,
    element: 'arc',
    tags: ['speed', 'chain', 'column-5', 'tier-2'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor06',
    name: 'Frost Anchor 7',
    column: 1,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-1', 'tier-2'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom06',
    name: 'Thread Bloom 7',
    column: 2,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-2', 'tier-2'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse06',
    name: 'Spectrum Fuse 7',
    column: 3,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-3', 'tier-2'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo06',
    name: 'Vanguard Tempo 7',
    column: 4,
    tags: ['activity', 'tempo', 'column-4', 'tier-2'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender06',
    name: 'Raid Mender 7',
    column: 5,
    tags: ['raid', 'team', 'column-5', 'tier-2'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine06',
    name: 'Serpent Doctrine 7',
    column: 1,
    tags: ['snake', 'growth', 'column-1', 'tier-3'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer06',
    name: 'Apple Primer 7',
    column: 2,
    tags: ['apple', 'economy', 'column-2', 'tier-3'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker06',
    name: 'Boss Breaker 7',
    column: 3,
    tags: ['boss', 'burst', 'column-3', 'tier-3'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner06',
    name: 'Room Runner 7',
    column: 4,
    tags: ['travel', 'speed', 'column-4', 'tier-3'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay07',
    name: 'Ember Relay 8',
    column: 5,
    element: 'solar',
    tags: ['burn', 'score', 'column-5', 'tier-3'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch07',
    name: 'Umbra Latch 8',
    column: 1,
    element: 'void',
    tags: ['shield', 'control', 'column-1', 'tier-3'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector07',
    name: 'Storm Vector 8',
    column: 2,
    element: 'arc',
    tags: ['speed', 'chain', 'column-2', 'tier-3'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor07',
    name: 'Frost Anchor 8',
    column: 3,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-3', 'tier-3'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom07',
    name: 'Thread Bloom 8',
    column: 4,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-4', 'tier-3'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse07',
    name: 'Spectrum Fuse 8',
    column: 5,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-5', 'tier-3'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo07',
    name: 'Vanguard Tempo 8',
    column: 1,
    tags: ['activity', 'tempo', 'column-1', 'tier-3'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender07',
    name: 'Raid Mender 8',
    column: 2,
    tags: ['raid', 'team', 'column-2', 'tier-3'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine07',
    name: 'Serpent Doctrine 8',
    column: 3,
    tags: ['snake', 'growth', 'column-3', 'tier-3'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer07',
    name: 'Apple Primer 8',
    column: 4,
    tags: ['apple', 'economy', 'column-4', 'tier-3'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker07',
    name: 'Boss Breaker 8',
    column: 5,
    tags: ['boss', 'burst', 'column-5', 'tier-3'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner07',
    name: 'Room Runner 8',
    column: 1,
    tags: ['travel', 'speed', 'column-1', 'tier-3'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay08',
    name: 'Ember Relay 9',
    column: 2,
    element: 'solar',
    tags: ['burn', 'score', 'column-2', 'tier-3'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch08',
    name: 'Umbra Latch 9',
    column: 3,
    element: 'void',
    tags: ['shield', 'control', 'column-3', 'tier-3'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector08',
    name: 'Storm Vector 9',
    column: 4,
    element: 'arc',
    tags: ['speed', 'chain', 'column-4', 'tier-3'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor08',
    name: 'Frost Anchor 9',
    column: 5,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-5', 'tier-3'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom08',
    name: 'Thread Bloom 9',
    column: 1,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-1', 'tier-3'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse08',
    name: 'Spectrum Fuse 9',
    column: 2,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-2', 'tier-3'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo08',
    name: 'Vanguard Tempo 9',
    column: 3,
    tags: ['activity', 'tempo', 'column-3', 'tier-3'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender08',
    name: 'Raid Mender 9',
    column: 4,
    tags: ['raid', 'team', 'column-4', 'tier-3'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine08',
    name: 'Serpent Doctrine 9',
    column: 5,
    tags: ['snake', 'growth', 'column-5', 'tier-3'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer08',
    name: 'Apple Primer 9',
    column: 1,
    tags: ['apple', 'economy', 'column-1', 'tier-3'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker08',
    name: 'Boss Breaker 9',
    column: 2,
    tags: ['boss', 'burst', 'column-2', 'tier-3'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner08',
    name: 'Room Runner 9',
    column: 3,
    tags: ['travel', 'speed', 'column-3', 'tier-3'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay09',
    name: 'Ember Relay 10',
    column: 4,
    element: 'solar',
    tags: ['burn', 'score', 'column-4', 'tier-3'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch09',
    name: 'Umbra Latch 10',
    column: 5,
    element: 'void',
    tags: ['shield', 'control', 'column-5', 'tier-3'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector09',
    name: 'Storm Vector 10',
    column: 1,
    element: 'arc',
    tags: ['speed', 'chain', 'column-1', 'tier-3'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor09',
    name: 'Frost Anchor 10',
    column: 2,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-2', 'tier-3'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom09',
    name: 'Thread Bloom 10',
    column: 3,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-3', 'tier-3'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse09',
    name: 'Spectrum Fuse 10',
    column: 4,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-4', 'tier-3'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo09',
    name: 'Vanguard Tempo 10',
    column: 5,
    tags: ['activity', 'tempo', 'column-5', 'tier-3'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender09',
    name: 'Raid Mender 10',
    column: 1,
    tags: ['raid', 'team', 'column-1', 'tier-3'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine09',
    name: 'Serpent Doctrine 10',
    column: 2,
    tags: ['snake', 'growth', 'column-2', 'tier-3'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer09',
    name: 'Apple Primer 10',
    column: 3,
    tags: ['apple', 'economy', 'column-3', 'tier-3'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker09',
    name: 'Boss Breaker 10',
    column: 4,
    tags: ['boss', 'burst', 'column-4', 'tier-3'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner09',
    name: 'Room Runner 10',
    column: 5,
    tags: ['travel', 'speed', 'column-5', 'tier-3'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay10',
    name: 'Ember Relay 11',
    column: 1,
    element: 'solar',
    tags: ['burn', 'score', 'column-1', 'tier-4'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch10',
    name: 'Umbra Latch 11',
    column: 2,
    element: 'void',
    tags: ['shield', 'control', 'column-2', 'tier-4'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector10',
    name: 'Storm Vector 11',
    column: 3,
    element: 'arc',
    tags: ['speed', 'chain', 'column-3', 'tier-4'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor10',
    name: 'Frost Anchor 11',
    column: 4,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-4', 'tier-4'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom10',
    name: 'Thread Bloom 11',
    column: 5,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-5', 'tier-4'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse10',
    name: 'Spectrum Fuse 11',
    column: 1,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-1', 'tier-4'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo10',
    name: 'Vanguard Tempo 11',
    column: 2,
    tags: ['activity', 'tempo', 'column-2', 'tier-4'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender10',
    name: 'Raid Mender 11',
    column: 3,
    tags: ['raid', 'team', 'column-3', 'tier-4'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine10',
    name: 'Serpent Doctrine 11',
    column: 4,
    tags: ['snake', 'growth', 'column-4', 'tier-4'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer10',
    name: 'Apple Primer 11',
    column: 5,
    tags: ['apple', 'economy', 'column-5', 'tier-4'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker10',
    name: 'Boss Breaker 11',
    column: 1,
    tags: ['boss', 'burst', 'column-1', 'tier-4'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner10',
    name: 'Room Runner 11',
    column: 2,
    tags: ['travel', 'speed', 'column-2', 'tier-4'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay11',
    name: 'Ember Relay 12',
    column: 3,
    element: 'solar',
    tags: ['burn', 'score', 'column-3', 'tier-4'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch11',
    name: 'Umbra Latch 12',
    column: 4,
    element: 'void',
    tags: ['shield', 'control', 'column-4', 'tier-4'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector11',
    name: 'Storm Vector 12',
    column: 5,
    element: 'arc',
    tags: ['speed', 'chain', 'column-5', 'tier-4'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor11',
    name: 'Frost Anchor 12',
    column: 1,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-1', 'tier-4'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom11',
    name: 'Thread Bloom 12',
    column: 2,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-2', 'tier-4'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse11',
    name: 'Spectrum Fuse 12',
    column: 3,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-3', 'tier-4'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo11',
    name: 'Vanguard Tempo 12',
    column: 4,
    tags: ['activity', 'tempo', 'column-4', 'tier-4'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender11',
    name: 'Raid Mender 12',
    column: 5,
    tags: ['raid', 'team', 'column-5', 'tier-4'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine11',
    name: 'Serpent Doctrine 12',
    column: 1,
    tags: ['snake', 'growth', 'column-1', 'tier-4'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer11',
    name: 'Apple Primer 12',
    column: 2,
    tags: ['apple', 'economy', 'column-2', 'tier-4'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker11',
    name: 'Boss Breaker 12',
    column: 3,
    tags: ['boss', 'burst', 'column-3', 'tier-4'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner11',
    name: 'Room Runner 12',
    column: 4,
    tags: ['travel', 'speed', 'column-4', 'tier-4'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay12',
    name: 'Ember Relay 13',
    column: 5,
    element: 'solar',
    tags: ['burn', 'score', 'column-5', 'tier-4'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch12',
    name: 'Umbra Latch 13',
    column: 1,
    element: 'void',
    tags: ['shield', 'control', 'column-1', 'tier-4'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector12',
    name: 'Storm Vector 13',
    column: 2,
    element: 'arc',
    tags: ['speed', 'chain', 'column-2', 'tier-4'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor12',
    name: 'Frost Anchor 13',
    column: 3,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-3', 'tier-4'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom12',
    name: 'Thread Bloom 13',
    column: 4,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-4', 'tier-4'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse12',
    name: 'Spectrum Fuse 13',
    column: 5,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-5', 'tier-4'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo12',
    name: 'Vanguard Tempo 13',
    column: 1,
    tags: ['activity', 'tempo', 'column-1', 'tier-4'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender12',
    name: 'Raid Mender 13',
    column: 2,
    tags: ['raid', 'team', 'column-2', 'tier-4'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine12',
    name: 'Serpent Doctrine 13',
    column: 3,
    tags: ['snake', 'growth', 'column-3', 'tier-4'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer12',
    name: 'Apple Primer 13',
    column: 4,
    tags: ['apple', 'economy', 'column-4', 'tier-4'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker12',
    name: 'Boss Breaker 13',
    column: 5,
    tags: ['boss', 'burst', 'column-5', 'tier-4'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner12',
    name: 'Room Runner 13',
    column: 1,
    tags: ['travel', 'speed', 'column-1', 'tier-4'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay13',
    name: 'Ember Relay 14',
    column: 2,
    element: 'solar',
    tags: ['burn', 'score', 'column-2', 'tier-4'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch13',
    name: 'Umbra Latch 14',
    column: 3,
    element: 'void',
    tags: ['shield', 'control', 'column-3', 'tier-4'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector13',
    name: 'Storm Vector 14',
    column: 4,
    element: 'arc',
    tags: ['speed', 'chain', 'column-4', 'tier-4'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor13',
    name: 'Frost Anchor 14',
    column: 5,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-5', 'tier-4'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom13',
    name: 'Thread Bloom 14',
    column: 1,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-1', 'tier-5'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse13',
    name: 'Spectrum Fuse 14',
    column: 2,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-2', 'tier-5'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo13',
    name: 'Vanguard Tempo 14',
    column: 3,
    tags: ['activity', 'tempo', 'column-3', 'tier-5'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender13',
    name: 'Raid Mender 14',
    column: 4,
    tags: ['raid', 'team', 'column-4', 'tier-5'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine13',
    name: 'Serpent Doctrine 14',
    column: 5,
    tags: ['snake', 'growth', 'column-5', 'tier-5'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer13',
    name: 'Apple Primer 14',
    column: 1,
    tags: ['apple', 'economy', 'column-1', 'tier-5'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker13',
    name: 'Boss Breaker 14',
    column: 2,
    tags: ['boss', 'burst', 'column-2', 'tier-5'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner13',
    name: 'Room Runner 14',
    column: 3,
    tags: ['travel', 'speed', 'column-3', 'tier-5'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay14',
    name: 'Ember Relay 15',
    column: 4,
    element: 'solar',
    tags: ['burn', 'score', 'column-4', 'tier-5'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch14',
    name: 'Umbra Latch 15',
    column: 5,
    element: 'void',
    tags: ['shield', 'control', 'column-5', 'tier-5'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector14',
    name: 'Storm Vector 15',
    column: 1,
    element: 'arc',
    tags: ['speed', 'chain', 'column-1', 'tier-5'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor14',
    name: 'Frost Anchor 15',
    column: 2,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-2', 'tier-5'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom14',
    name: 'Thread Bloom 15',
    column: 3,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-3', 'tier-5'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse14',
    name: 'Spectrum Fuse 15',
    column: 4,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-4', 'tier-5'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo14',
    name: 'Vanguard Tempo 15',
    column: 5,
    tags: ['activity', 'tempo', 'column-5', 'tier-5'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender14',
    name: 'Raid Mender 15',
    column: 1,
    tags: ['raid', 'team', 'column-1', 'tier-5'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine14',
    name: 'Serpent Doctrine 15',
    column: 2,
    tags: ['snake', 'growth', 'column-2', 'tier-5'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer14',
    name: 'Apple Primer 15',
    column: 3,
    tags: ['apple', 'economy', 'column-3', 'tier-5'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker14',
    name: 'Boss Breaker 15',
    column: 4,
    tags: ['boss', 'burst', 'column-4', 'tier-5'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner14',
    name: 'Room Runner 15',
    column: 5,
    tags: ['travel', 'speed', 'column-5', 'tier-5'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay15',
    name: 'Ember Relay 16',
    column: 1,
    element: 'solar',
    tags: ['burn', 'score', 'column-1', 'tier-5'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch15',
    name: 'Umbra Latch 16',
    column: 2,
    element: 'void',
    tags: ['shield', 'control', 'column-2', 'tier-5'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector15',
    name: 'Storm Vector 16',
    column: 3,
    element: 'arc',
    tags: ['speed', 'chain', 'column-3', 'tier-5'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor15',
    name: 'Frost Anchor 16',
    column: 4,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-4', 'tier-5'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom15',
    name: 'Thread Bloom 16',
    column: 5,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-5', 'tier-5'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse15',
    name: 'Spectrum Fuse 16',
    column: 1,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-1', 'tier-5'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo15',
    name: 'Vanguard Tempo 16',
    column: 2,
    tags: ['activity', 'tempo', 'column-2', 'tier-5'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender15',
    name: 'Raid Mender 16',
    column: 3,
    tags: ['raid', 'team', 'column-3', 'tier-5'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine15',
    name: 'Serpent Doctrine 16',
    column: 4,
    tags: ['snake', 'growth', 'column-4', 'tier-5'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer15',
    name: 'Apple Primer 16',
    column: 5,
    tags: ['apple', 'economy', 'column-5', 'tier-5'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker15',
    name: 'Boss Breaker 16',
    column: 1,
    tags: ['boss', 'burst', 'column-1', 'tier-5'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner15',
    name: 'Room Runner 16',
    column: 2,
    tags: ['travel', 'speed', 'column-2', 'tier-5'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay16',
    name: 'Ember Relay 17',
    column: 3,
    element: 'solar',
    tags: ['burn', 'score', 'column-3', 'tier-5'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch16',
    name: 'Umbra Latch 17',
    column: 4,
    element: 'void',
    tags: ['shield', 'control', 'column-4', 'tier-5'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector16',
    name: 'Storm Vector 17',
    column: 5,
    element: 'arc',
    tags: ['speed', 'chain', 'column-5', 'tier-5'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor16',
    name: 'Frost Anchor 17',
    column: 1,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-1', 'tier-5'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom16',
    name: 'Thread Bloom 17',
    column: 2,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-2', 'tier-5'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse16',
    name: 'Spectrum Fuse 17',
    column: 3,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-3', 'tier-5'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo16',
    name: 'Vanguard Tempo 17',
    column: 4,
    tags: ['activity', 'tempo', 'column-4', 'tier-5'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender16',
    name: 'Raid Mender 17',
    column: 5,
    tags: ['raid', 'team', 'column-5', 'tier-5'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine16',
    name: 'Serpent Doctrine 17',
    column: 1,
    tags: ['snake', 'growth', 'column-1', 'tier-6'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer16',
    name: 'Apple Primer 17',
    column: 2,
    tags: ['apple', 'economy', 'column-2', 'tier-6'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker16',
    name: 'Boss Breaker 17',
    column: 3,
    tags: ['boss', 'burst', 'column-3', 'tier-6'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner16',
    name: 'Room Runner 17',
    column: 4,
    tags: ['travel', 'speed', 'column-4', 'tier-6'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay17',
    name: 'Ember Relay 18',
    column: 5,
    element: 'solar',
    tags: ['burn', 'score', 'column-5', 'tier-6'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch17',
    name: 'Umbra Latch 18',
    column: 1,
    element: 'void',
    tags: ['shield', 'control', 'column-1', 'tier-6'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector17',
    name: 'Storm Vector 18',
    column: 2,
    element: 'arc',
    tags: ['speed', 'chain', 'column-2', 'tier-6'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor17',
    name: 'Frost Anchor 18',
    column: 3,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-3', 'tier-6'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom17',
    name: 'Thread Bloom 18',
    column: 4,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-4', 'tier-6'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse17',
    name: 'Spectrum Fuse 18',
    column: 5,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-5', 'tier-6'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo17',
    name: 'Vanguard Tempo 18',
    column: 1,
    tags: ['activity', 'tempo', 'column-1', 'tier-6'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender17',
    name: 'Raid Mender 18',
    column: 2,
    tags: ['raid', 'team', 'column-2', 'tier-6'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine17',
    name: 'Serpent Doctrine 18',
    column: 3,
    tags: ['snake', 'growth', 'column-3', 'tier-6'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer17',
    name: 'Apple Primer 18',
    column: 4,
    tags: ['apple', 'economy', 'column-4', 'tier-6'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker17',
    name: 'Boss Breaker 18',
    column: 5,
    tags: ['boss', 'burst', 'column-5', 'tier-6'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner17',
    name: 'Room Runner 18',
    column: 1,
    tags: ['travel', 'speed', 'column-1', 'tier-6'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay18',
    name: 'Ember Relay 19',
    column: 2,
    element: 'solar',
    tags: ['burn', 'score', 'column-2', 'tier-6'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch18',
    name: 'Umbra Latch 19',
    column: 3,
    element: 'void',
    tags: ['shield', 'control', 'column-3', 'tier-6'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector18',
    name: 'Storm Vector 19',
    column: 4,
    element: 'arc',
    tags: ['speed', 'chain', 'column-4', 'tier-6'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor18',
    name: 'Frost Anchor 19',
    column: 5,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-5', 'tier-6'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom18',
    name: 'Thread Bloom 19',
    column: 1,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-1', 'tier-6'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse18',
    name: 'Spectrum Fuse 19',
    column: 2,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-2', 'tier-6'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo18',
    name: 'Vanguard Tempo 19',
    column: 3,
    tags: ['activity', 'tempo', 'column-3', 'tier-6'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender18',
    name: 'Raid Mender 19',
    column: 4,
    tags: ['raid', 'team', 'column-4', 'tier-6'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine18',
    name: 'Serpent Doctrine 19',
    column: 5,
    tags: ['snake', 'growth', 'column-5', 'tier-6'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer18',
    name: 'Apple Primer 19',
    column: 1,
    tags: ['apple', 'economy', 'column-1', 'tier-6'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker18',
    name: 'Boss Breaker 19',
    column: 2,
    tags: ['boss', 'burst', 'column-2', 'tier-6'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner18',
    name: 'Room Runner 19',
    column: 3,
    tags: ['travel', 'speed', 'column-3', 'tier-6'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
  {
    id: 'emberRelay19',
    name: 'Ember Relay 20',
    column: 4,
    element: 'solar',
    tags: ['burn', 'score', 'column-4', 'tier-6'],
    effects: {
      scoreBonus: 3,
      superEnergy: 2,
    },
  },
  {
    id: 'umbraLatch19',
    name: 'Umbra Latch 20',
    column: 5,
    element: 'void',
    tags: ['shield', 'control', 'column-5', 'tier-6'],
    effects: {
      shieldTicks: 1,
      abilityEnergy: 1,
    },
  },
  {
    id: 'stormVector19',
    name: 'Storm Vector 20',
    column: 1,
    element: 'arc',
    tags: ['speed', 'chain', 'column-1', 'tier-6'],
    effects: {
      speedScalar: 0.98,
      scoreBonus: 1,
    },
  },
  {
    id: 'frostAnchor19',
    name: 'Frost Anchor 20',
    column: 2,
    element: 'stasis',
    tags: ['survive', 'resilience', 'column-2', 'tier-6'],
    effects: {
      shieldTicks: 3,
    },
  },
  {
    id: 'threadBloom19',
    name: 'Thread Bloom 20',
    column: 3,
    element: 'strand',
    tags: ['growth', 'mobility', 'column-3', 'tier-6'],
    effects: {
      growthBonus: 1,
    },
  },
  {
    id: 'spectrumFuse19',
    name: 'Spectrum Fuse 20',
    column: 4,
    element: 'prismatic',
    tags: ['hybrid', 'loot', 'column-4', 'tier-6'],
    effects: {
      lootLuck: 1,
      superEnergy: 1,
    },
  },
  {
    id: 'vanguardTempo19',
    name: 'Vanguard Tempo 20',
    column: 5,
    tags: ['activity', 'tempo', 'column-5', 'tier-6'],
    effects: {
      abilityEnergy: 3,
    },
  },
  {
    id: 'raidMender19',
    name: 'Raid Mender 20',
    column: 1,
    tags: ['raid', 'team', 'column-1', 'tier-6'],
    effects: {
      shieldTicks: 1,
      scoreBonus: 3,
    },
  },
  {
    id: 'serpentDoctrine19',
    name: 'Serpent Doctrine 20',
    column: 2,
    tags: ['snake', 'growth', 'column-2', 'tier-6'],
    effects: {
      growthBonus: 1,
      scoreBonus: 1,
    },
  },
  {
    id: 'applePrimer19',
    name: 'Apple Primer 20',
    column: 3,
    tags: ['apple', 'economy', 'column-3', 'tier-6'],
    effects: {
      scoreBonus: 3,
      lootLuck: 2,
    },
  },
  {
    id: 'bossBreaker19',
    name: 'Boss Breaker 20',
    column: 4,
    tags: ['boss', 'burst', 'column-4', 'tier-6'],
    effects: {
      superEnergy: 2,
    },
  },
  {
    id: 'roomRunner19',
    name: 'Room Runner 20',
    column: 5,
    tags: ['travel', 'speed', 'column-5', 'tier-6'],
    effects: {
      speedScalar: 0.97,
      abilityEnergy: 1,
    },
  },
];

