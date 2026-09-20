import type { SkillPerkDefinition } from './skillTypes.js';

export interface SkillMigrationResult {
  ranks: Record<string, number>;
  refundedScore: number;
  mappedPerks: number;
  removedPurchases: number;
}

// Refund values are intentionally conservative: removed filler returns its last known purchase cost,
// while qualitative perks are mapped through migrationAliases in the live catalog.
const REMOVED_PERK_REFUNDS: Readonly<Record<string, readonly number[]>> = {
  swiftScales: [12, 28, 52],
  secondWind: [25, 60],
  bloodMagic: [104],
  spellrush: [98],
  devour: [96],
  relentlessPursuit: [102],
  packHunt: [104],
  guardianBond: [112],
  tailForge: [10, 24, 50],
  nectarSurge: [58],
  honeycomb: [72],
  orchardMastery: [90],
  deathMarker: [14],
  riftWalker: [32],
  portalSense: [44],
  echoStep: [72],
  mirrorImage: [88],
  ghostSkin: [104],
  planarLattice: [126],
  eventHorizon: [150],
  wallWhisper: [32],
  masonry: [48],
  acidicFangs: [64],
  seismicPulse: [82],
  faultLine: [100],
  collapseControl: [120],
  terraShield: [140],
  worldEater: [164],
  timeDilation: [32],
  slowField: [46],
  reverberate: [60],
  rewind: [76],
  singularity: [94],
  entropyBank: [114],
  causalLoop: [136],
  fatedStrike: [160],
};

function refundFor(perkId: string, rank: number): number {
  const costs = REMOVED_PERK_REFUNDS[perkId] ?? [];
  return costs.slice(0, Math.max(0, rank)).reduce((total, cost) => total + cost, 0);
}

export function migrateSkillRanks(
  savedRanks: Record<string, number>,
  definitions: readonly SkillPerkDefinition[],
): SkillMigrationResult {
  const ids = new Set(definitions.map((definition) => definition.id));
  const aliases = new Map<string, string>();
  for (const definition of definitions) {
    for (const alias of definition.migrationAliases ?? []) aliases.set(alias, definition.id);
  }

  const ranks: Record<string, number> = {};
  let refundedScore = 0;
  let mappedPerks = 0;
  let removedPurchases = 0;

  for (const [oldId, rawRank] of Object.entries(savedRanks)) {
    const rank = Math.max(0, Math.floor(Number(rawRank) || 0));
    if (rank === 0) continue;
    const destination = ids.has(oldId) ? oldId : aliases.get(oldId);
    if (destination) {
      ranks[destination] = Math.max(ranks[destination] ?? 0, 1);
      if (destination !== oldId) mappedPerks += 1;
      if (rank > 1) {
        // The redesign is predominantly single-rank. Extra legacy ranks are purchases, not freebies.
        refundedScore += refundFor(oldId, rank) - refundFor(oldId, 1);
        removedPurchases += rank - 1;
      }
      continue;
    }
    const refund = refundFor(oldId, rank);
    refundedScore += refund;
    removedPurchases += rank;
  }

  return { ranks, refundedScore, mappedPerks, removedPurchases };
}
