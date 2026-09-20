import type { Actor } from './actorTypes.js';

export function actorCanSpeakNow(actor: Actor): boolean {
  if (
    actor.health?.state === 'dead' ||
    actor.health?.state === 'downed' ||
    actor.hostility === 'dead'
  ) {
    return false;
  }
  return actor.activity?.kind !== 'sleeping';
}
