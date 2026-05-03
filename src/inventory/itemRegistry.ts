import type { Item } from "./item.js";

export const ITEMS: readonly Item[] = [
  {
    id: "weapon-revolver",
    name: "Pilgrim Revolver",
    description: "A worn sidearm for formal disagreements. Equip it in your weapon slot to fire.",
    kind: "equipment",
    slot: "weapon",
    modifiers: {
      gunEnabled: true,
    },
  },
  {
    id: "boots-quick",
    name: "Quick Boots",
    description: "Lightweight boots that quicken your stride.",
    kind: "equipment",
    slot: "boots",
    modifiers: {
      tickDelayScalar: 0.85,
    },
  },
  {
    id: "boots-heavy",
    name: "Heavy Boots",
    description: "Bulky boots that weigh you down.",
    kind: "equipment",
    slot: "boots",
    modifiers: {
      tickDelayScalar: 1.2,
    },
  },
  {
    id: "boots-swim-fins",
    name: "Swim Fins",
    description: "Flexible fins that let you cross lakes and ocean water.",
    kind: "equipment",
    slot: "boots",
    modifiers: {
      swimmingEnabled: true,
      tickDelayScalar: 1.05,
    },
  },
  {
    id: "helm-seer",
    name: "Seer's Helm",
    description: "Attuned senses reveal nearby walls.",
    kind: "equipment",
    slot: "helm",
    modifiers: {
      wallSenseBonus: 2,
    },
  },
  {
    id: "ring-seismic",
    name: "Seismic Ring",
    description: "Each bite sends ripples through the stone.",
    kind: "equipment",
    slot: "ring",
    modifiers: {
      seismicPulseBonus: 1,
    },
  },
  {
    id: "gloves-mason",
    name: "Mason's Gloves",
    description: "Your tail lays bricks behind you.",
    kind: "equipment",
    slot: "gloves",
    modifiers: {
      masonryEnabled: true,
    },
  },
  {
    id: "cloak-veil",
    name: "Veil Cloak",
    description: "Starlight lingers, granting fleeting invulnerability.",
    kind: "equipment",
    slot: "cloak",
    modifiers: {
      invulnerabilityBonus: 1,
    },
  },
  {
    id: "cloak-frostguard",
    name: "Frostguard Cloak",
    description: "A lined travel cloak that keeps frigid depths from biting so quickly.",
    kind: "equipment",
    slot: "cloak",
    modifiers: {
      coldResistance: 0.75,
    },
  },
  {
    id: "helm-sunshade",
    name: "Sunshade Helm",
    description: "A broad-brimmed helm that cuts the worst of scorching heat.",
    kind: "equipment",
    slot: "helm",
    modifiers: {
      heatResistance: 0.75,
    },
  },
  {
    id: "belt-regenerator",
    name: "Belt of Renewal",
    description: "Slow, steady growth over time.",
    kind: "equipment",
    slot: "belt",
    modifiers: {
      regenerator: { interval: 24, amount: 1 },
    },
  },
  {
    id: "amulet-phoenix",
    name: "Phoenix Charm",
    description: "A single ember that cheats death once.",
    kind: "equipment",
    slot: "amulet",
    modifiers: {
      phoenixCharges: 1,
    },
  },
];

const ITEM_MAP = new Map<string, Item>(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): Item | undefined {
  return ITEM_MAP.get(id);
}
