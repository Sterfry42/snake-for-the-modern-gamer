export interface DatingBranchActionLike {
  id: string;
}

export function shuffleDatingBranchActions<TAction extends DatingBranchActionLike>(
  actions: readonly TAction[],
  rng: () => number,
): TAction[] {
  const branches = actions.filter((action) => action.id.startsWith('branch-'));
  const nonBranches = actions.filter(
    (action) => !action.id.startsWith('branch-') && action.id !== 'leave',
  );
  const leaveActions = actions.filter((action) => action.id === 'leave');
  const shuffledBranches = [...branches];
  for (let index = shuffledBranches.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffledBranches[index], shuffledBranches[swapIndex]] = [
      shuffledBranches[swapIndex]!,
      shuffledBranches[index]!,
    ];
  }
  return [...shuffledBranches, ...nonBranches, ...leaveActions];
}
