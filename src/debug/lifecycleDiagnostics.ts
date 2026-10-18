import Phaser from 'phaser';

const games = new Set<Phaser.Game>();
const sceneCreates = new WeakMap<Phaser.Game, number>();

/** Count actual game ownership; never infer instances from canvas count. */
export function trackPhaserGame(game: Phaser.Game): void {
  if (games.has(game)) return;
  games.add(game);
  game.events.once(Phaser.Core.Events.DESTROY, () => games.delete(game));
}

export function recordSnakeSceneCreate(game: Phaser.Game): void {
  sceneCreates.set(game, (sceneCreates.get(game) ?? 0) + 1);
}

export function getPhaserLifecycleDiagnostics(game: Phaser.Game) {
  return {
    phaserGames: games.size,
    snakeSceneCreates: sceneCreates.get(game) ?? 0,
    snakeScenesActive: [...games].reduce(
      (count, instance) =>
        count +
        instance.scene.getScenes(true).filter((scene) => scene.sys.settings.key === 'SnakeScene')
          .length,
      0,
    ),
  };
}
