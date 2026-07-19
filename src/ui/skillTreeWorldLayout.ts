import type { SkillPerkDefinition } from '../systems/skillTypes.js';
import type { TreePoint } from './core/TreeViewportController.js';

export function buildSkillTreeWorldLayout(
  perks: readonly SkillPerkDefinition[],
): Map<string, TreePoint> {
  const positions = new Map<string, TreePoint>();
  const branches = [
    ...new Set(perks.filter((perk) => perk.kind !== 'combo').map((perk) => perk.branch)),
  ];
  const branchColumns = new Map(branches.map((branch, index) => [branch, index]));
  const branchGap = 122;
  const tierGap = 94;
  const maximumTier = Math.max(
    ...perks.filter((perk) => perk.kind !== 'combo').map((perk) => perk.position.y),
    0,
  );
  for (const perk of perks.filter((definition) => definition.kind !== 'combo')) {
    const column = branchColumns.get(perk.branch) ?? 0;
    positions.set(perk.id, {
      x: 80 + column * branchGap + perk.position.x * 38,
      y: 70 + (maximumTier - perk.position.y) * tierGap,
    });
  }
  const comboPerks = perks.filter((definition) => definition.kind === 'combo');
  const nonComboPoints = [...positions.values()];
  const minimumX = Math.min(...nonComboPoints.map((point) => point.x), 80);
  const maximumX = Math.max(...nonComboPoints.map((point) => point.x), 690);
  const highestY = Math.min(...nonComboPoints.map((point) => point.y), 70);
  const comboGap = (maximumX - minimumX) / Math.max(1, comboPerks.length - 1);
  for (const perk of comboPerks) {
    const comboIndex = comboPerks.findIndex((definition) => definition.id === perk.id);
    positions.set(perk.id, {
      x: minimumX + comboIndex * comboGap,
      y: highestY - 84,
    });
  }
  return positions;
}

export function getSkillTreeFoundationPoint(
  perks: readonly SkillPerkDefinition[],
  positions: ReadonlyMap<string, TreePoint>,
): TreePoint {
  const entries = perks
    .filter((perk) => perk.kind === 'entry')
    .map((perk) => positions.get(perk.id))
    .filter((point): point is TreePoint => Boolean(point));
  return {
    x: entries.reduce((sum, point) => sum + point.x, 0) / Math.max(1, entries.length),
    y: Math.max(...entries.map((point) => point.y), 0) + 104,
  };
}
