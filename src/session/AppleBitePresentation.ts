import type { AppleSnapshot } from '../apples/types.js';
import type { Vector2Like } from '../core/math.js';

/** Presentation-only. Epoch, spawn and step identify one bite across both delivery paths. */
export class AppleBitePresentation {
  private epoch?: number;
  private readonly played = new Set<string>();
  private pending?: { spawnId: number; revision: number; until: number };
  private readonly confirmed = new Set<number>();

  reset(epoch?: number): void {
    this.epoch = epoch;
    this.played.clear();
    this.pending = undefined;
    this.confirmed.clear();
  }

  useEpoch(epoch?: number): void {
    if (epoch !== this.epoch) this.reset(epoch);
  }

  confirm(spawnId: number, revision: number): boolean {
    this.confirmed.add(spawnId);
    if (this.confirmed.size > 64) {
      const oldest = this.confirmed.values().next().value;
      if (oldest !== undefined) this.confirmed.delete(oldest);
    }
    if (this.pending?.spawnId === spawnId) this.pending = undefined;
    return this.playOnce(spawnId, revision);
  }

  predict(apple: AppleSnapshot, tile: Vector2Like, revision: number, now: number): boolean {
    if (
      apple.typeId !== 'normal' ||
      apple.spawnId === undefined ||
      apple.position.x !== tile.x ||
      apple.position.y !== tile.y ||
      this.confirmed.has(apple.spawnId) ||
      this.pending?.spawnId === apple.spawnId ||
      !this.playOnce(apple.spawnId, revision)
    )
      return false;
    this.pending = { spawnId: apple.spawnId, revision, until: now + 400 };
    return true;
  }

  hidden(
    apple: AppleSnapshot,
    revision: number,
    now: number,
    eligible: boolean,
    authoritativeAtApple = true,
  ): boolean {
    if (
      this.pending &&
      (!eligible ||
        this.pending.until <= now ||
        this.pending.revision < revision ||
        (this.pending.revision === revision && !authoritativeAtApple) ||
        this.pending.spawnId !== apple.spawnId)
    )
      this.pending = undefined;
    return (
      apple.spawnId !== undefined &&
      (this.confirmed.has(apple.spawnId) || apple.spawnId === this.pending?.spawnId)
    );
  }

  private playOnce(spawnId: number, revision: number): boolean {
    const key = `${spawnId}:${revision}`;
    if (this.played.has(key)) return false;
    this.played.add(key);
    if (this.played.size > 64) {
      const oldest = this.played.values().next().value;
      if (oldest !== undefined) this.played.delete(oldest);
    }
    return true;
  }
}
