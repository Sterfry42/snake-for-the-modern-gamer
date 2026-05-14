import type { Item } from './item.js';

export const ITEMS: readonly Item[] = [
  {
    id: 'weapon-revolver',
    name: 'Pilgrim Revolver',
    description: 'A worn sidearm for formal disagreements. Equip it in your weapon slot to fire.',
    kind: 'equipment',
    slot: 'weapon',
    modifiers: {
      gunEnabled: true,
    },
  },
  {
    id: 'weapon-market-revolver',
    name: 'Market Revolver',
    description: 'A discounted revolver with an honest cylinder and a dishonest weight.',
    kind: 'equipment',
    slot: 'weapon',
    modifiers: {
      gunEnabled: true,
      tickDelayScalar: 1.08,
    },
  },
  {
    id: 'boots-quick',
    name: 'Quick Boots',
    description: 'Lightweight boots that quicken your stride.',
    kind: 'equipment',
    slot: 'boots',
    modifiers: {
      tickDelayScalar: 0.85,
    },
  },
  {
    id: 'boots-heavy',
    name: 'Heavy Boots',
    description: 'Bulky boots that weigh you down.',
    kind: 'equipment',
    slot: 'boots',
    modifiers: {
      tickDelayScalar: 1.2,
    },
  },
  {
    id: 'boots-swim-fins',
    name: 'Swim Fins',
    description: 'Flexible fins that let you cross lakes and ocean water.',
    kind: 'equipment',
    slot: 'boots',
    modifiers: {
      swimmingEnabled: true,
      tickDelayScalar: 1.05,
    },
  },
  {
    id: 'boots-lead-flippers',
    name: 'Lead Flippers',
    description: 'Village-grade flippers. They cross water and make every tile feel farther away.',
    kind: 'equipment',
    slot: 'boots',
    modifiers: {
      swimmingEnabled: true,
      tickDelayScalar: 1.12,
    },
  },
  {
    id: 'helm-seer',
    name: "Seer's Helm",
    description: 'Attuned senses reveal nearby walls.',
    kind: 'equipment',
    slot: 'helm',
    modifiers: {
      wallSenseBonus: 2,
    },
  },
  {
    id: 'ring-seismic',
    name: 'Seismic Ring',
    description: 'Each bite sends ripples through the stone.',
    kind: 'equipment',
    slot: 'ring',
    modifiers: {
      seismicPulseBonus: 1,
    },
  },
  {
    id: 'gloves-mason',
    name: "Mason's Gloves",
    description: 'Your tail lays bricks behind you.',
    kind: 'equipment',
    slot: 'gloves',
    modifiers: {
      masonryEnabled: true,
    },
  },
  {
    id: 'cloak-veil',
    name: 'Veil Cloak',
    description: 'Starlight lingers, granting fleeting invulnerability.',
    kind: 'equipment',
    slot: 'cloak',
    modifiers: {
      invulnerabilityBonus: 1,
    },
  },
  {
    id: 'cloak-frostguard',
    name: 'Frostguard Cloak',
    description: 'A lined travel cloak that keeps frigid depths from biting so quickly.',
    kind: 'equipment',
    slot: 'cloak',
    modifiers: {
      coldResistance: 0.75,
    },
  },
  {
    id: 'cloak-firebreak',
    name: 'Firebreak Cape',
    description: 'A patched cape that keeps ember heat off your scales while slowing your swagger.',
    kind: 'equipment',
    slot: 'cloak',
    modifiers: {
      heatResistance: 0.75,
      tickDelayScalar: 1.04,
    },
  },
  {
    id: 'helm-sunshade',
    name: 'Sunshade Helm',
    description: 'A broad-brimmed helm that cuts the worst of scorching heat.',
    kind: 'equipment',
    slot: 'helm',
    modifiers: {
      heatResistance: 0.75,
    },
  },
  {
    id: 'belt-regenerator',
    name: 'Belt of Renewal',
    description: 'Slow, steady growth over time.',
    kind: 'equipment',
    slot: 'belt',
    modifiers: {
      regenerator: { interval: 24, amount: 1 },
    },
  },
  {
    id: 'amulet-phoenix',
    name: 'Phoenix Charm',
    description: 'A single ember that cheats death once.',
    kind: 'equipment',
    slot: 'amulet',
    modifiers: {
      phoenixCharges: 1,
    },
  },
  {
    id: 'amulet-baby-bottle',
    name: 'Baby Bottle',
    description:
      'A warm little bottle full of second chances. Once per run, it remembers you whole.',
    kind: 'equipment',
    slot: 'amulet',
    modifiers: {
      phoenixCharges: 1,
    },
  },
  {
    id: 'amulet-time-splinter',
    name: 'Time Splinter',
    description: 'A shard of the future that flinches before the present arrives.',
    kind: 'equipment',
    slot: 'amulet',
    modifiers: {
      tickDelayScalar: 0.92,
      invulnerabilityBonus: 20,
    },
  },
  {
    id: 'ring-ledger',
    name: 'Ledger Ring',
    description:
      'A brass ring engraved with numbers that change when you are not looking. Every debt wants to become a weapon.',
    kind: 'equipment',
    slot: 'ring',
    modifiers: {
      refundEveryRooms: { interval: 10, score: 20 },
      appleScorePenalty: 1,
    },
  },
  {
    id: 'helm-hazard-halo',
    name: 'Hazard Halo',
    description: 'A dim green halo that warns your skull before the world becomes technical.',
    kind: 'equipment',
    slot: 'helm',
    modifiers: {
      heatResistance: 0.35,
      coldResistance: 0.35,
      hazardMapSense: 1,
      radiationTimerScalar: 0.9,
    },
  },
  {
    id: 'raw-meat',
    name: 'Raw Meat',
    description: 'A strip of raw meat, still warm. Cooking it would make it safe and nourishing.',
    kind: 'consumable',
  },
  {
    id: 'cooked-meat',
    name: 'Cooked Meat',
    description: 'A strip of well-cooked meat. Filling and satisfying.',
    kind: 'consumable',
  },
  {
    id: 'fish-meat',
    name: 'Fish Meat',
    description: 'A strip of raw fish meat. Slimy, but edible if you are desperate enough.',
    kind: 'consumable',
  },
  {
    id: 'cooked-fish',
    name: 'Cooked Fish',
    description: 'A strip of grilled fish. Flaky and warm.',
    kind: 'consumable',
  },
  {
    id: 'hide',
    name: 'Hide',
    description: 'A scrap of cured animal hide. Tough and flexible.',
    kind: 'consumable',
  },
  {
    id: 'feather',
    name: 'Feather',
    description: 'A brightly colored feather. Light as air.',
    kind: 'consumable',
  },
  {
    id: 'egg',
    name: 'Egg',
    description: 'A small bird egg. Smooth and slightly warm.',
    kind: 'consumable',
  },
  {
    id: 'honey',
    name: 'Honey',
    description: 'A glob of wild honey. Sweet and golden.',
    kind: 'consumable',
  },
  {
    id: 'rope',
    name: 'Rope',
    description: 'A coil of braided rope. Useful for lassoing animals.',
    kind: 'consumable',
  },
  {
    id: 'lead',
    name: 'Lead',
    description: 'A sturdy leather lead strap. The key to taming wild creatures.',
    kind: 'consumable',
  },
  {
    id: 'food-snake-burger',
    name: 'Snake Burger',
    description: 'A juicy burger made with premium snake meat. +5 length, 1 minute invulnerability.',
    kind: 'consumable',
  },
  {
    id: 'food-snake-fries',
    name: 'Snake Fries',
    description: 'Crispy golden fries seasoned with serpent herbs. +5 length, 1 minute invulnerability.',
    kind: 'consumable',
  },
  {
    id: 'food-snake-nuggets',
    name: 'Snake Nuggets',
    description: 'Crispy little nuggets of snake. +2 length, 30 seconds invulnerability.',
    kind: 'consumable',
  },
];

const ITEM_MAP = new Map<string, Item>(ITEMS.map((item) => [item.id, item]));
const CHEST_LOOT_EXCLUDED_IDS = new Set([
  'weapon-market-revolver',
  'boots-lead-flippers',
  'cloak-firebreak',
  'cloak-frostguard',
  'amulet-baby-bottle',
  'amulet-time-splinter',
  'ring-ledger',
  'helm-hazard-halo',
]);

export const CHEST_LOOT_ITEMS: readonly Item[] = ITEMS.filter(
  (item) => !CHEST_LOOT_EXCLUDED_IDS.has(item.id),
);

export function getItem(id: string): Item | undefined {
  return ITEM_MAP.get(id);
}
