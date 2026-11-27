import type { AppleSnapshot } from '../apples/types.js';
import { isRecord } from '../core/saveNormalize.js';
import type { Vector2Like } from '../core/math.js';

/** Presentation-only. Epoch, spawn and step identify one bite across both delivery paths. */
export class AppleBitePresentation {
  private epoch?: number;
  private readonly played = new Set<string>();
  private pending?: {
    spawnId: number;
    revision: number;
    until: number;
    roomId: string;
    position: Vector2Like;
  };
  private readonly confirmed = new Map<number, boolean>();

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
    if (this.confirmed.has(spawnId)) return false;
    this.confirmed.set(spawnId, false);
    if (this.confirmed.size > 64) {
      const oldest = this.confirmed.keys().next().value;
      if (oldest !== undefined) this.confirmed.delete(oldest);
    }
    const predicted = this.pending?.spawnId === spawnId;
    if (predicted) this.pending = undefined;
    return !predicted && this.playOnce(spawnId, revision);
  }

  claimOutcome(spawnId: number): boolean {
    if (this.confirmed.get(spawnId) !== false) return false;
    this.confirmed.set(spawnId, true);
    return true;
  }

  predict(
    apple: AppleSnapshot,
    tile: Vector2Like,
    revision: number,
    now: number,
    approach?: Vector2Like,
  ): boolean {
    const shields = apple.metadata?.protectedDirs;
    const shielded = apple.typeId === 'shielded' || shields !== undefined;
    const guarded =
      shielded &&
      (!approach ||
        !Array.isArray(shields) ||
        shields.some(
          (entry: unknown) =>
            !isRecord(entry) ||
            typeof entry.x !== 'number' ||
            typeof entry.y !== 'number' ||
            (entry.x === approach.x && entry.y === approach.y),
        ));
    if (
      guarded ||
      apple.spawnId === undefined ||
      apple.position.x !== tile.x ||
      apple.position.y !== tile.y ||
      this.confirmed.has(apple.spawnId) ||
      this.pending?.spawnId === apple.spawnId ||
      !this.playOnce(apple.spawnId, revision)
    )
      return false;
    this.pending = {
      spawnId: apple.spawnId,
      revision,
      until: now + 400,
      roomId: apple.roomId,
      position: { ...apple.position },
    };
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
        this.pending.spawnId !== apple.spawnId ||
        this.pending.roomId !== apple.roomId ||
        this.pending.position.x !== apple.position.x ||
        this.pending.position.y !== apple.position.y)
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
