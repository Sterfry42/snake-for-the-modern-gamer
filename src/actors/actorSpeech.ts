import type { Actor } from './actorTypes.js';

export function actorCanSpeakNow(actor: Actor): boolean {
  if (
    actor.health?.state === 'dead' ||
    actor.health?.state === 'downed' ||
    actor.hostility === 'dead' ||
    actor.hostility === 'downed' ||
    actor.flags.dead === true ||
    actor.flags.eaten === true
  ) {
    return false;
  }
  return actor.activity?.kind !== 'sleeping';
}
