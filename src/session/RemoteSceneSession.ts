import type { LocalAuthoritativeRuntime } from './GameRuntime.js';
import type { SceneGameClient } from './SceneGameClient.js';
import type { GameConnection } from './GameConnection.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { GameEvent } from './GameEvent.js';

/** Legacy scene adapter: presentation reads work, attempts to own a clock fail loudly. */
export class RemoteSceneSession implements LocalAuthoritativeRuntime {
  constructor(
    private readonly client: SceneGameClient,
    private readonly connection: GameConnection,
  ) {}
  readonly rng = (): never => {
    throw new Error('The client cannot consume simulation RNG');
  };
  private simulation(): never {
    throw new Error('The authoritative session owns simulation');
  }
  advanceEnvironment(): never {
    return this.simulation();
  }
  actionStep(): never {
    return this.simulation();
  }
  bossStep(): never {
    return this.simulation();
  }
  actorClockStep(): Promise<never> {
    return Promise.reject(new Error('The authority owns Actor clocks'));
  }
  hazardClockStep(): never {
    return this.simulation();
  }
  bulletClockStep(): never {
    return this.simulation();
  }
  handleCommand(): never {
    throw new Error('Remote commands must await acknowledgement');
  }
  getSnapshot(): GameSnapshot {
    return this.client.getSnapshot();
  }
  refreshSnapshot(): GameSnapshot {
    return this.client.getSnapshot();
  }
  onSnapshot(handler: (snapshot: GameSnapshot) => void) {
    return this.connection.onSnapshot(handler);
  }
  onEvent(handler: (event: GameEvent) => void) {
    return this.connection.onEvent(handler);
  }
  async save(): Promise<void> {
    const result = await this.client.saveGame();
    if (!result.ok) throw new Error(result.reason ?? 'Save failed');
  }
  saveGame(): never {
    throw new Error('Use the asynchronous save command');
  }
  loadGame(): never {
    throw new Error('Use the asynchronous load command');
  }
  hasSaveSync(): boolean {
    return Boolean(this.client.getSnapshot().persistence?.checkpoint);
  }
  clearSaveSync(): never {
    throw new Error('Use the asynchronous clear command');
  }
  async hasSave(): Promise<boolean> {
    return this.hasSaveSync();
  }
  async clearSave(): Promise<void> {
    const result = await this.client.send({
      type: 'clearSave',
      playerId: this.client.getLocalPlayerId(),
    });
    if (!result.ok) throw new Error(result.reason ?? 'Clear failed');
  }
}
