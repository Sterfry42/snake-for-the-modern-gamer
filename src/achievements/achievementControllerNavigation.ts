export interface AchievementNavigationNode {
  id: string;
  x: number;
  y: number;
}

export function selectAchievementInDirection(
  nodes: readonly AchievementNavigationNode[],
  currentId: string | null,
  direction: { x: number; y: number },
  viewportCenter: { x: number; y: number },
): string | null {
  if (nodes.length === 0) return null;
  const current =
    nodes.find((node) => node.id === currentId) ??
    [...nodes].sort(
      (a, b) =>
        Math.hypot(a.x - viewportCenter.x, a.y - viewportCenter.y) -
        Math.hypot(b.x - viewportCenter.x, b.y - viewportCenter.y),
    )[0];
  if (!current) return null;

  let best: AchievementNavigationNode | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of nodes) {
    if (candidate.id === current.id) continue;
    const dx = candidate.x - current.x;
    const dy = candidate.y - current.y;
    const forward = dx * direction.x + dy * direction.y;
    if (forward <= 0) continue;
    const cross = Math.abs(dx * direction.y - dy * direction.x);
    const score = forward + cross * 2.2;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return (best ?? current).id;
}
