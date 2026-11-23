import type { PlayerInteraction } from './SceneActionCommand.js';

/** Snapshots acknowledge holds; a sent command is never treated as authority. */
export class PlayerHoldSynchronizer {
  private desired: PlayerInteraction | null = null;
  private lastDesired: PlayerInteraction | null = null;
  private sentAt = -Infinity;

  shouldSend(desired: PlayerInteraction, authoritative: PlayerInteraction, now: number): boolean {
    const changed = this.desired !== null && desired !== this.desired;
    this.desired = desired;
    if (desired === authoritative && !changed) {
      this.lastDesired = null;
      return false;
    }
    if (desired === this.lastDesired && now - this.sentAt < 500) return false;
    this.lastDesired = desired;
    this.sentAt = now;
    return true;
  }
}
