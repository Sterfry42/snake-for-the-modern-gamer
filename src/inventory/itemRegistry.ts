import type { Item } from "./item.js";

export const ITEMS: readonly Item[] = [
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
