import type { GameConnection } from './GameConnection.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { Vector2Like } from '../core/math.js';

/** Snapshot-only scene compatibility surface. It never imports the game runtime. */
export class SceneGameBridge {
  private snapshot: GameSnapshot | null = null;
  private readonly unsubscribe: () => void;

  constructor(readonly connection: GameConnection) {
    this.unsubscribe = connection.onSnapshot((snapshot) => {
      this.snapshot = snapshot;
    });
  }

  getSnapshot(): GameSnapshot {
    if (!this.snapshot) throw new Error('Game connection has not supplied an initial snapshot');
    return this.snapshot;
  }

  getLocalPlayerId(): string {
    return this.getSnapshot().localPlayerId;
  }
  getSnakeBody(): readonly Vector2Like[] {
    return this.player.body;
  }
  getDirection(): Vector2Like {
    return this.player.direction;
  }
  getScore(): number {
    return this.player.score;
  }
  getSnakeLength(): number {
    return this.player.body.length;
  }
  getCurrentRoom() {
    return this.room.room;
  }
  getApple() {
    return this.room.apples ?? null;
  }
  getEnemies() {
    return this.room.enemies ?? [];
  }
  getAnimals() {
    return this.room.animals ?? [];
  }
  getBosses() {
    return this.room.bosses ?? [];
  }
  getEnemyBullets() {
    return this.room.bullets ?? [];
  }
  getFootballs() {
    return this.room.footballs ?? [];
  }
  getBombs() {
    return this.room.bombs ?? [];
  }
  getPlayerHealth() {
    return this.getSnapshot().ui.health;
  }

  setDirection(direction: Vector2Like): Promise<CommandResult> {
    return this.send({ type: 'setDirection', playerId: this.getLocalPlayerId(), direction });
  }

  send(command: ClientCommand): Promise<CommandResult> {
    return Promise.resolve(this.connection.send(command));
  }

  destroy(): void {
    this.unsubscribe();
    this.connection.disconnect();
  }

  private get player() {
    const snapshot = this.getSnapshot();
    const player = snapshot.players[snapshot.localPlayerId];
    if (!player) throw new Error('Snapshot is missing the attached player');
    return player;
  }

  private get room() {
    const room = this.getSnapshot().viewport.rooms[this.player.roomId];
    if (!room) throw new Error('Snapshot is missing the attached player room');
    return room;
  }
}
