import { stableStringHashPositive } from '../../../core/math.js';
import { DLSS5_SYNTHETIC_PORTRAIT_COUNT } from './huggingFacePortraitSource.js';

export const SYNTHETIC_PORTRAIT_COUNT = DLSS5_SYNTHETIC_PORTRAIT_COUNT;

export interface Dlss5PortraitIdentity {
  key: string;
  index: number;
}

export interface Dlss5PortraitCandidate {
  id: string;
  species?: string;
  portraitId?: string;
}

const AUTHORED_PORTRAIT_IDS = new Set([
  'cardwright-neutral',
  'goblin-happy',
  'goblin-neutral',
  'goblin-hostile',
  'goblin-sexy-goblin',
  'goblin_sexy_goblin',
  'ocean-fisher-neutral',
  'ocean-fisher-happy',
  'moleman-foreman',
  'moleman-date',
  'tanuki-neutral',
]);

export function isEligibleForDlss5SyntheticPortrait(candidate: Dlss5PortraitCandidate): boolean {
  if (candidate.species && candidate.species !== 'human') {
    return false;
  }
  if (!candidate.portraitId) {
    return true;
  }
  if (AUTHORED_PORTRAIT_IDS.has(candidate.portraitId)) {
    return false;
  }
  return (
    candidate.portraitId === 'villager-neutral' ||
    candidate.portraitId === 'villager-old-neutral' ||
    candidate.portraitId === 'shopkeeper-neutral' ||
    candidate.portraitId === 'guard-neutral' ||
    candidate.portraitId === 'sage-1' ||
    candidate.portraitId === 'sage-2' ||
    candidate.portraitId === 'sage-3' ||
    candidate.portraitId.startsWith('villager-') ||
    candidate.portraitId.startsWith('shopkeeper-')
  );
}

export function resolveDlss5PortraitIdentity(
  candidate: Dlss5PortraitCandidate,
): Dlss5PortraitIdentity | null {
  if (!isEligibleForDlss5SyntheticPortrait(candidate)) {
    return null;
  }

  const index = stableStringHashPositive(candidate.id) % SYNTHETIC_PORTRAIT_COUNT;
  return {
    key: `dlss5-portrait:${index}`,
    index,
  };
}
