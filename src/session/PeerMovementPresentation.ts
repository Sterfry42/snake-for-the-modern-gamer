import { clamp01, lerp } from '../core/math.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { PredictedSnake } from './ClientMovementPredictor.js';

/** One publication of presentation latency; never extrapolates peer gameplay. */
export class PeerMovementPresentation {
  private readonly tracks = new Map<
    string,
    { from: PredictedSnake; to: PredictedSnake; at: number; duration: number }
  >();
  private epoch: number | undefined;

  accept(snapshot: GameSnapshot, now = performance.now()): void {
    if (this.epoch !== snapshot.replication?.epoch) this.tracks.clear();
    this.epoch = snapshot.replication?.epoch;
    const retained = new Set<string>();
    for (const player of Object.values(snapshot.players)) {
      if (player.isLocal || !player.alive) continue;
      retained.add(player.id);
      const previous = this.sample(player.id, now);
      const to: PredictedSnake = {
        body: player.body.map((point) => ({ ...point })),
        direction: { ...player.direction },
        roomId: player.roomId,
      };
      const suspended = Object.values(snapshot.connections ?? {}).some(
        (peer) => peer.playerId === player.id && peer.suspended,
      );
      const canBlend =
        !suspended &&
        previous &&
        previous.roomId === to.roomId &&
        previous.body.length === to.body.length &&
        previous.body.every(
          (point, index) =>
            Math.hypot(point.x - to.body[index].x, point.y - to.body[index].y) <= 2.25,
        );
      this.tracks.set(player.id, {
        from: canBlend ? previous : to,
        to,
        at: now,
        duration: Math.min(150, player.movementIntervalMs ?? 100),
      });
    }
    for (const id of this.tracks.keys()) if (!retained.has(id)) this.tracks.delete(id);
  }

  sample(id: string, now = performance.now()): PredictedSnake | null {
    const track = this.tracks.get(id);
    if (!track) return null;
    const phase = clamp01((now - track.at) / track.duration);
    return {
      ...track.to,
      body: track.to.body.map((point, index) => ({
        x: lerp(track.from.body[index].x, point.x, phase),
        y: lerp(track.from.body[index].y, point.y, phase),
      })),
    };
  }

  active(now = performance.now()): boolean {
    return [...this.tracks.values()].some(
      (track) =>
        now - track.at < track.duration &&
        track.from.body.some(
          (point, index) =>
            point.x !== track.to.body[index].x || point.y !== track.to.body[index].y,
        ),
    );
  }
}
