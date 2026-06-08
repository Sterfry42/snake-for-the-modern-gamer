import type { FactionStanding } from '../factions/factions.js';
import type { VillageShopStyleOffer } from './villageShop.js';
import type { EquipmentSlot } from '../inventory/item.js';

export type WardDeathSource =
  | 'wall'
  | 'self'
  | 'shielded'
  | 'boss'
  | 'bullet'
  | 'temperature'
  | 'water'
  | 'shark';

export interface WardScrollOffer {
  id: string;
  source: WardDeathSource;
  label: string;
  basePrice: number;
  description: string;
}

export interface GoblinSupplyOffer {
  id: string;
  itemId: string;
  name: string;
  price: number;
  note: string;
  slot?: EquipmentSlot;
}

export const GOBLIN_WARD_SCROLLS: readonly WardScrollOffer[] = [
  {
    id: 'ward-wall',
    source: 'wall',
    label: 'Wall Ward',
    basePrice: 34,
    description: 'Contracted mercy for the next argument you lose against stone.',
  },
  {
    id: 'ward-self',
    source: 'self',
    label: 'Coil Ward',
    basePrice: 38,
    description: 'Unties your next fatal knot before ordinary lives are charged.',
  },
  {
    id: 'ward-boss',
    source: 'boss',
    label: 'Boss Ward',
    basePrice: 62,
    description: 'A nasty clause against the next monster big enough to sign in blood.',
  },
  {
    id: 'ward-bullet',
    source: 'bullet',
    label: 'Bullet Ward',
    basePrice: 44,
    description: "Redirects one small metallic sermon into somebody else's paperwork.",
  },
  {
    id: 'ward-temperature',
    source: 'temperature',
    label: 'Weather Ward',
    basePrice: 42,
    description: 'One reprieve from heat or cold deciding it owns you.',
  },
  {
    id: 'ward-water',
    source: 'water',
    label: 'Drowning Ward',
    basePrice: 56,
    description: 'The next time water collects you, a goblin collects you first.',
  },
  {
    id: 'ward-shark',
    source: 'shark',
    label: 'Shark Ward',
    basePrice: 58,
    description: 'A dubious marine addendum for teeth that arrive from below.',
  },
  {
    id: 'ward-shielded',
    source: 'shielded',
    label: 'Backbite Ward',
    basePrice: 40,
    description: 'Covers one betrayal by protection that had opinions.',
  },
];

export const GOBLIN_SNAKE_STYLE: VillageShopStyleOffer = {
  id: 'goblin-hide',
  label: 'Goblin Hide',
  price: 46,
  palette: {
    baseColor: '#5f9f3a',
    bellyColor: '#d9ff72',
    patternColor: '#263d16',
    outlineColor: '#10220b',
    eyeColor: '#fff2c6',
  },
};

export const GOBLIN_SUPPLIES: readonly GoblinSupplyOffer[] = [
  {
    id: 'goblin-fishing-rod',
    itemId: 'fishing-rod',
    name: 'Fishing Rod',
    price: 42,
    note: 'A goblin-modified rod. The line is frayed but serviceable.',
    slot: 'gloves',
  },
  {
    id: 'goblin-fishing-rod-carpenter',
    itemId: 'fishing-rod-carpenter',
    name: "Carpenter's Rod",
    price: 70,
    note: 'Goblin-reinforced. The line is braided with wire. It bites back less.',
    slot: 'gloves',
  },
  {
    id: 'goblin-fishing-rod-master',
    itemId: 'fishing-rod-master',
    name: "Master Angler's Rod",
    price: 100,
    note: 'Goblin-forged masterwork. The legendary fish have heard the rumors.',
    slot: 'gloves',
  },
];

export function getWardScrollOffer(id: string): WardScrollOffer | undefined {
  return GOBLIN_WARD_SCROLLS.find((offer) => offer.id === id);
}

export function getWardPrice(
  offer: WardScrollOffer,
  standing: FactionStanding,
  uses = 0,
): number | null {
  if (standing === 'angry' || standing === 'violent') {
    return null;
  }
  const scalar = standing === 'friendly' ? 0.85 : standing === 'wary' ? 1.25 : 1;
  const usageScalar = 1 + Math.max(0, uses) / (Math.max(0, uses) + 3);
  return Math.max(1, Math.ceil(offer.basePrice * scalar * usageScalar));
}
