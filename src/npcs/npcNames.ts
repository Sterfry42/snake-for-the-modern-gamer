import type { RandomGenerator } from '../core/rng.js';

export type NpcNameArchetype =
  | 'resident'
  | 'guard'
  | 'merchant'
  | 'keeper'
  | 'scribe'
  | 'thief'
  | 'goblin'
  | 'mystic'
  | 'wanderer';

export const HUMAN_RESIDENT_NAMES = [
  'Marlow',
  'Tillia',
  'Penny Coil',
  'Brindle',
  'Cassia',
  'Rowan',
  'Ilyra',
  'Nessa',
  'Bram',
  'Oren',
  'Alba Reed',
  'Vera Quill',
  'Joss Lantern',
  'Mira Vane',
  'Nico Bell',
  'Tessa Wren',
  'Hollis Pike',
  'Dara Latch',
  'Edda Fern',
  'Marnie Toll',
  'Corin Vale',
  'Lysa Thorn',
  'Perrin Ash',
  'Sable June',
  'Marta Cinder',
  'Elian Crook',
  'Roska Flint',
  'Vell Sorrow',
  'Nell Fen',
  'Arlen Moss',
  'Dovie Key',
  'Rook Bell',
  'Isla Brine',
  'Toma Wicks',
  'Juniper Tallow',
  'Calder Moth',
  'Sera Finch',
  'Otto Green',
  'Milla Road',
  'Hale Copper',
  'Rina Chapel',
  'Bess Orchard',
  'Tovin Slate',
  'Lena Map',
  'Aster Holt',
  'Gideon Warm',
  'Pia Market',
  'Silas Weather',
  'Nora Kettle',
  'Ember Vale',
] as const;

export const GUARD_NAMES = [
  'Nessa Pike',
  'Bram Gate',
  'Oren Halberd',
  'Vera Lock',
  'Hollis Watch',
  'Dara Shield',
  'Calder Bell',
  'Rook Warden',
  'Toma Spear',
  'Milla Badge',
  'Gideon Post',
  'Silas Toll',
  'Maud Iron',
  'Felix Lantern',
  'Juno Bridge',
  'Wesley Flint',
  'Kara Helm',
  'Old Noll',
  'Captain Sera',
  'Tess Red-Sash',
] as const;

export const MERCHANT_NAMES = [
  'Penny Coil',
  'Cassia Till',
  'Marnie Receipt',
  'Vellum Price',
  'Nico Shelf',
  'Bess Copper',
  'Otto Goods',
  'Pia Ribbon',
  'Juniper Salt',
  'Lysa Ledger',
  'Hale Discount',
  'Roska Crate',
  'Nell Button',
  'Marta Scale',
  'Corin Counter',
  'Tessa Thread',
  'Alba Glass',
  'Dovie Basket',
  'Sable Bloom',
  'Elian Stock',
] as const;

export const SCRIBE_NAMES = [
  'Vera Quill',
  'Lena Map',
  'Sable Ink',
  'Tovin Clause',
  'Elian Margin',
  'Nora Archive',
  'Mira Index',
  'Arlen Stamp',
  'Corin Footnote',
  'Joss Redline',
  'Perrin Notary',
  'Edda Seal',
  'Aster Copy',
  'Hale Minute',
  'Rina Record',
] as const;

export const THIEF_NAMES = [
  'Chalk-Eye',
  'Latch',
  'Moth-Key',
  'Doveknife',
  'Velvet Rook',
  'Penny-After',
  'Noon Shadow',
  'Silk Finch',
  'Kettleblack',
  'Nail Wren',
  'Purse Saint',
  'Rue No-Bell',
  'False Toma',
  'Ash-in-Pocket',
  'Little Receipt',
  'Gutter Lark',
  'Keyhole Mara',
  'Nix the Kindly',
  'Doorless Vell',
  'Saffron Lie',
] as const;

export const GOBLIN_NAMES = [
  'Grib',
  'Nackle',
  'Mott',
  'Scrip',
  'Vellum-Fang',
  'Dreg Penny',
  'Clausebite',
  'Stamp-Nose',
  'Kettle Debt',
  'Nix Underline',
  'Brass Crumb',
  'Murk Receipt',
  'Nibble-Notary',
  'Fineprint',
  'Soot Clause',
  'Ledgerbelly',
  'Writworm',
  'Tally Fang',
  'Docket Mite',
  'Moss Invoice',
  'Cricket Stamp',
  'Grit Voucher',
  'Little Audit',
  'Pox Initial',
  'Needle Bill',
] as const;

export const MYSTIC_NAMES = [
  'Aurex',
  'Belisar',
  'Cyrene',
  'Miko',
  'Eidra',
  'Solenn',
  'Vesper Ash',
  'Riven Saint',
  'Orison Vale',
  'Noct Mirr',
  'Asha Bell',
  'Kairo Thorn',
  'Sister Ember',
  'Brother Pale',
  'Candle Vey',
  'Lumen Pike',
] as const;

export const WANDERER_NAMES = [
  'Lindsey',
  'Ryan',
  'Freak Joey',
  'Sterling Fisher',
  'Roadside Mercy',
  'Vell the Undated',
  'Harrow June',
  'Marta of No Gate',
  'Old Copper Len',
  'Seven-Step Daria',
  'Bellgrave Nix',
  'Pale Oren',
  'Joss Without Rain',
  'Sable Knife',
  'Nessa Farroad',
] as const;

export const NPC_NAME_POOLS: Record<NpcNameArchetype, readonly string[]> = {
  resident: HUMAN_RESIDENT_NAMES,
  guard: GUARD_NAMES,
  merchant: MERCHANT_NAMES,
  keeper: MERCHANT_NAMES,
  scribe: SCRIBE_NAMES,
  thief: THIEF_NAMES,
  goblin: GOBLIN_NAMES,
  mystic: MYSTIC_NAMES,
  wanderer: WANDERER_NAMES,
};

export function pickNpcName(
  archetype: NpcNameArchetype,
  rng: RandomGenerator = Math.random,
): string {
  const pool = NPC_NAME_POOLS[archetype];
  return pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
}

export function inferNpcNameArchetype(name: string): NpcNameArchetype {
  const lowered = name.toLowerCase();
  if (GOBLIN_NAMES.some((candidate) => lowered.includes(candidate.toLowerCase()))) return 'goblin';
  if (THIEF_NAMES.some((candidate) => lowered.includes(candidate.toLowerCase()))) return 'thief';
  if (/clerk|shop|merchant|vendor|price|receipt|ledger|stall|cook|chef/.test(lowered))
    return 'merchant';
  if (/guard|captain|warden|gate|badge|spear|helm|watch/.test(lowered)) return 'guard';
  if (/scribe|quill|notary|stamp|clause|record|map|index/.test(lowered)) return 'scribe';
  if (/miko|shrine|aurex|belisar|cyrene|saint|sister|brother|lumen/.test(lowered)) return 'mystic';
  if (/wanderer|fisher|freak|road|farroad/.test(lowered)) return 'wanderer';
  return 'resident';
}
