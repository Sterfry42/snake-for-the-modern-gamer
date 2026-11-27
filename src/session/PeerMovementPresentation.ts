import type { GameSnapshot } from './GameSnapshot.js';
import type { PredictedSnake } from './ClientMovementPredictor.js';

const MAX_BLEND_MS = 85;

/** Render interpolation between adjacent authoritative cells. Gameplay uses the original bodies. */
export class PeerMovementPresentation {
  private readonly players = new Map<
    string,
    {
      current: PredictedSnake;
      revision?: number;
      previous?: PredictedSnake;
      startedAt: number;
      duration: number;
    }
  >();
  private epoch?: number;

  accept(snapshot: GameSnapshot, now = performance.now()): void {
    if (this.epoch !== snapshot.replication?.epoch) this.players.clear();
    this.epoch = snapshot.replication?.epoch;
    for (const id of this.players.keys())
      if (!snapshot.players[id]?.alive || snapshot.players[id].isLocal) this.players.delete(id);
    for (const player of Object.values(snapshot.players)) {
      if (player.isLocal || !player.alive) continue;
      const old = this.players.get(player.id);
      const revision = player.movementRevision;
      if (
        old &&
        revision === old.revision &&
        old.current.roomId === player.roomId &&
        old.current.body.length === player.body.length &&
        old.current.body.every((p, i) => p.x === player.body[i].x && p.y === player.body[i].y)
      )
        continue;
      const blend =
        old &&
        revision !== undefined &&
        revision === (old.revision ?? -2) + 1 &&
        old.current.roomId === player.roomId &&
        old.current.body.length === player.body.length &&
        player.body.every(
          (p, i) =>
            Math.abs(p.x - old.current.body[i].x) + Math.abs(p.y - old.current.body[i].y) <= 1,
        );
      this.players.set(player.id, {
        current: { roomId: player.roomId, body: player.body, direction: player.direction },
        revision,
        previous: blend ? old.current : undefined,
        startedAt: now,
        duration: Math.min(MAX_BLEND_MS, Math.max(20, (player.movementIntervalMs ?? 100) * 0.75)),
      });
    }
  }

  sample(id: string, now?: number): PredictedSnake | null {
    const player = this.players.get(id);
    if (!player) return null;
    if (!player.previous || now === undefined || now >= player.startedAt + player.duration)
      return player.current;
    const phase = Math.max(0, (now - player.startedAt) / player.duration);
    return {
      ...player.current,
      body: player.current.body.map((p, i) => {
        const from = player.previous!.body[i];
        return { x: from.x + (p.x - from.x) * phase, y: from.y + (p.y - from.y) * phase };
      }),
    };
  }

  active(now = performance.now()): boolean {
    for (const player of this.players.values())
      if (player.previous && now <= player.startedAt + player.duration + 34) return true;
    return false;
  }
}
