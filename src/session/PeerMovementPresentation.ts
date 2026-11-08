import type { GameSnapshot } from './GameSnapshot.js';
import type { PredictedSnake } from './ClientMovementPredictor.js';

/** Peers occupy the latest authoritative grid cells. No delayed interpolation. */
export class PeerMovementPresentation {
  private readonly players = new Map<string, PredictedSnake>();
  accept(snapshot: GameSnapshot): void {
    this.players.clear();
    for (const player of Object.values(snapshot.players))
      if (!player.isLocal && player.alive)
        this.players.set(player.id, {
          roomId: player.roomId,
          body: player.body,
          direction: player.direction,
        });
  }
  sample(id: string): PredictedSnake | null {
    return this.players.get(id) ?? null;
  }
  active(): boolean {
    return false;
  }
}
