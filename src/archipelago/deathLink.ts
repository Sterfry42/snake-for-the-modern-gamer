export type DeathLinkMode = 'off' | 'soft';
export type IncomingDeathLinkResolution = 'ignore' | 'consume-life' | 'game-over';

export function resolveIncomingDeathLink(mode: DeathLinkMode, hasExtraLife: boolean): IncomingDeathLinkResolution {
  if (mode === 'off') return 'ignore';
  return hasExtraLife ? 'consume-life' : 'game-over';
}

export function shouldSendDeathLink(mode: DeathLinkMode, isIncomingDeathLink: boolean, isGameOver: boolean): boolean {
  return mode !== 'off' && !isIncomingDeathLink && isGameOver;
}
