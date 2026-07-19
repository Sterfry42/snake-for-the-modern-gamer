import type { DerivedStatModifier } from '../stats/derivedStats.js';
import type { SpecialStatId } from '../stats/specialTypes.js';

export interface CharacterCreationMods {
  tickDelayScalar?: number;
  wallSenseBonus?: number;
  seismicPulseBonus?: number;
  invulnerabilityBonus?: number;
  regenerator?: { interval: number; amount: number } | null;
  phoenixCharges?: number;
  masonryEnabled?: boolean;
  shrineBlessing?: boolean;
  yokaiInsight?: boolean;
  spiritualLength?: boolean;
  startingPerkId?: string;
  specialModifiers?: Readonly<Partial<Record<SpecialStatId, number>>>;
  derivedModifiers?: readonly DerivedStatModifier[];
  mechanicFlags?: Readonly<Record<string, boolean | number | string>>;
}

export interface CharacterCreationOption {
  id: string;
  name: string;
  description: string;
  mods: CharacterCreationMods;
}

export const FAITHS: readonly CharacterCreationOption[] = [
  {
    id: 'christianity',
    name: 'Christianity',
    description: 'Begin with +1 Life Charge.',
    mods: {
      derivedModifiers: [{ stat: 'extraLifeCapacity', operation: 'add', value: 1 }],
    },
  },
  {
    id: 'islam',
    name: 'Islam',
    description: 'Pass 3 available foods to Fast. Your next meal heals and grows +1.',
    mods: {
      mechanicFlags: { 'faith.islam.fastEnabled': true },
    },
  },
  {
    id: 'hinduism',
    name: 'Hinduism',
    description: 'Pickup radius +1 tile.',
    mods: {
      mechanicFlags: { 'faith.hinduism.renewal': true },
      derivedModifiers: [{ stat: 'pickupRadius', operation: 'add', value: 1 }],
    },
  },
  {
    id: 'buddhism',
    name: 'Buddhism',
    description: 'Movement step time -3%.',
    mods: {
      mechanicFlags: { 'faith.buddhism.mindfulTurning': true },
      derivedModifiers: [{ stat: 'actionStepIntervalScalar', operation: 'multiply', value: 0.97 }],
    },
  },
  {
    id: 'judaism',
    name: 'Judaism',
    description: 'Prepared spell slots +1.',
    mods: {
      mechanicFlags: { 'faith.judaism.study': true },
      derivedModifiers: [{ stat: 'spellSlotCapacity', operation: 'add', value: 1 }],
    },
  },
  {
    id: 'sikhism',
    name: 'Sikhism',
    description: 'Companion capacity +1.',
    mods: {
      mechanicFlags: { 'faith.sikhism.seva': true },
      derivedModifiers: [{ stat: 'companionCapacity', operation: 'add', value: 1 }],
    },
  },
  {
    id: 'shinto',
    name: 'Shinto',
    description: 'Ward duration +2 ticks.',
    mods: {
      shrineBlessing: true,
      yokaiInsight: true,
      derivedModifiers: [{ stat: 'wardDuration', operation: 'add', value: 2 }],
    },
  },
];

// These faith effects remain provisional pending a dedicated design pass grounded in existing
// player actions. Keep them small, save-safe, and derived-stat-backed in the meantime.

export const BACKGROUNDS: readonly CharacterCreationOption[] = [
  {
    id: 'noble',
    name: 'Noble',
    description: '+2 CHA, +1 LCK, -2 AGI, -1 STR.\nWard duration +1 tick. Movement step time +4%.',
    mods: {
      specialModifiers: { charisma: 2, luck: 1, agility: -2, strength: -1 },
      invulnerabilityBonus: 1,
      tickDelayScalar: 1.04,
    },
  },
  {
    id: 'urchin',
    name: 'Urchin',
    description: '+2 AGI, +1 PER, -2 END, -1 CHA.\nMovement step time -5%.',
    mods: {
      specialModifiers: { agility: 2, perception: 1, endurance: -2, charisma: -1 },
      tickDelayScalar: 0.95,
      mechanicFlags: { 'background.urchin.fragile': true },
    },
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: '+2 INT, +1 PER, -2 STR, -1 END.\nWall-sense radius +1 tile.',
    mods: {
      specialModifiers: { intelligence: 2, perception: 1, strength: -2, endurance: -1 },
      wallSenseBonus: 1,
      mechanicFlags: { 'background.scholar': true },
    },
  },
  {
    id: 'soldier',
    name: 'Soldier',
    description: '+2 END, +1 STR, -2 INT, -1 CHA.\nWard duration +1 tick. Movement step time +3%.',
    mods: {
      specialModifiers: { endurance: 2, strength: 1, intelligence: -2, charisma: -1 },
      invulnerabilityBonus: 1,
      tickDelayScalar: 1.03,
    },
  },
  {
    id: 'hermit',
    name: 'Hermit',
    description:
      '+2 PER, +1 END, -2 CHA, -1 AGI.\nWhile critically short, regrow 1 segment every 30 ticks.',
    mods: {
      specialModifiers: { perception: 2, endurance: 1, charisma: -2, agility: -1 },
      regenerator: { interval: 30, amount: 1 },
      mechanicFlags: { 'background.hermit': true },
    },
  },
  {
    id: 'criminal',
    name: 'Criminal',
    description: '+2 LCK, +1 AGI, -2 CHA, -1 END.',
    mods: {
      specialModifiers: { luck: 2, agility: 1, charisma: -2, endurance: -1 },
      mechanicFlags: { 'background.criminal': true, 'background.criminal.suspicion': 1 },
    },
  },
  {
    id: 'laborer',
    name: 'Laborer',
    description: '+2 STR, +1 END, -2 INT, -1 AGI.\nUnlock masonry. Movement step time +5%.',
    mods: {
      specialModifiers: { strength: 2, endurance: 1, intelligence: -2, agility: -1 },
      masonryEnabled: true,
      tickDelayScalar: 1.05,
    },
  },
  {
    id: 'garden-snake',
    name: 'Garden Snake',
    description: '+2 END, +1 PER, -2 CHA, -1 INT.',
    mods: {
      specialModifiers: { endurance: 2, perception: 1, charisma: -2, intelligence: -1 },
      mechanicFlags: { 'background.gardenSnake': true },
    },
  },
];

export const CLASSES: readonly CharacterCreationOption[] = [
  {
    id: 'runner',
    name: 'Runner',
    description: 'Begin with Swift Scales: unlock the Momentum gauge, stacks, and Surges.',
    mods: { startingPerkId: 'swiftScales' },
  },
  {
    id: 'mage',
    name: 'Mage',
    description: 'Begin with Mana Bloom: 60 maximum mana and 1.2 mana regenerated each game tick.',
    mods: { startingPerkId: 'manaBloom' },
  },
  {
    id: 'hunter',
    name: 'Hunter',
    description:
      'Begin with Predator Instinct: hunt harmless animals and add 15 percentage points to animal bonus drops.',
    mods: { startingPerkId: 'predatorInstinct' },
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Begin with Thick Scales: maximum hearts increase by 1.',
    mods: { startingPerkId: 'thickScales' },
  },
  {
    id: 'archaeologist',
    name: 'Archaeologist',
    description: 'Begin with archaeology available and improved wall sense.',
    mods: { wallSenseBonus: 1, mechanicFlags: { 'archaeology.unlocked': true } },
  },
  {
    id: 'angler',
    name: 'Angler',
    description: 'Begin with fishing knowledge and a steadier catch window.',
    mods: { mechanicFlags: { 'fishing.classAngler': true } },
  },
  {
    id: 'cook',
    name: 'Cook',
    description: 'Begin able to cook basic meat and fish.',
    mods: { mechanicFlags: { 'skill.homestead.campCook': true } },
  },
  {
    id: 'merchant',
    name: 'Merchant',
    description: 'Begin with merchant appraisal and a reserved-stock contact.',
    mods: { mechanicFlags: { 'shops.merchantClass': true } },
  },
];

export function getCharacterCreationOption(
  kind: 'faith' | 'background' | 'class',
  id: string,
): CharacterCreationOption | undefined {
  const options = kind === 'faith' ? FAITHS : kind === 'background' ? BACKGROUNDS : CLASSES;
  return options.find((option) => option.id === id);
}

export function getCharacterCreationCardDescription(option: CharacterCreationOption): string {
  return option.description;
}
