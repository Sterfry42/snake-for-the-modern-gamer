import { SnakeGame } from '../game/snakeGame.js';
import type { GameConfig } from '../config/gameConfig.js';
import type { QuestRegistry } from '../quests/questRegistry.js';
import type { GameSnapshot } from './GameSnapshot.js';
import { readReplicaView } from './readReplica.js';
import type { MovementUpdate } from './MovementUpdate.js';

/** The unguarded hydration target never leaves this controller. */
export class SceneReadReplica {
  private readonly target: SnakeGame;
  readonly game: SnakeGame;

  constructor(config: GameConfig, registry: QuestRegistry, snapshot: GameSnapshot) {
    this.target = new SnakeGame(
      { ...config, rng: { seed: snapshot.clientState?.worldSeed } },
      registry,
      {},
      undefined,
      'client-replica',
    );
    this.target.hydrateClientSnapshot(snapshot);
    this.game = readReplicaView(this.target);
  }

  hydrate(snapshot: GameSnapshot): void {
    this.target.hydrateClientSnapshot(snapshot);
  }
  hydrateMovement(update: MovementUpdate): void {
    this.target.hydrateClientMovement(update);
  }
}
