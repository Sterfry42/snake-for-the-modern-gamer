import Phaser from 'phaser';
import { defaultGameConfig } from '../config/gameConfig.js';
import type { GameConnection } from '../session/GameConnection.js';
import { LocalGameConnection } from '../session/LocalGameConnection.js';
import { SceneGameBridge } from '../session/SceneGameBridge.js';
import { WebSocketGameConnection } from '../session/WebSocketGameConnection.js';
import type { ClientCommand, CommandResult } from '../session/ClientCommand.js';
import { SnakeRenderer } from '../ui/snakeRenderer.js';
import { connectionsMenuUrl } from '../session/connectionSettings.js';
import { parseCoordinateRoomId } from '../world/roomAddress.js';
import { ConnectedNpcRenderer } from '../ui/ConnectedNpcRenderer.js';
import { ConnectedInteractionPopup } from '../ui/ConnectedInteractionPopup.js';

/** Opt-in pipe verification using the existing scene and renderer, without scene gameplay hooks. */
export class ConnectedSceneRuntime {
  private bridge: SceneGameBridge | null = null;
  private readonly renderer: SnakeRenderer;
  private readonly npcs: ConnectedNpcRenderer;
  private readonly interactionPopup: ConnectedInteractionPopup;
  private showInventory = false;
  private readonly status: Phaser.GameObjects.Text;
  private readonly nameplates = new Map<string, Phaser.GameObjects.Text>();
  private dirty = false;
  private alive = true;
  private error = '';
  private stopLocal: (() => void) | undefined;
  private unsubscribeSnapshot: (() => void) | undefined;
  private unsubscribeEvent: (() => void) | undefined;
  private unsubscribeDisconnect: (() => void) | undefined;
  private disposed = false;
  private ready = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.interactionPopup = new ConnectedInteractionPopup(
      scene,
      () => this.bridge!.getLocalPlayerId(),
      (command) => this.send(command),
    );
    this.npcs = new ConnectedNpcRenderer(scene, defaultGameConfig.grid.cell, (actorId) => {
      const bridge = this.bridge;
      if (bridge && this.ready)
        void this.send({ type: 'openActor', playerId: bridge.getLocalPlayerId(), actorId });
    });
    this.renderer = new SnakeRenderer(
      scene,
      scene.add.graphics(),
      scene.add.graphics().setDepth(15),
      defaultGameConfig.grid,
    );
    this.status = scene.add
      .text(10, 8, 'Connecting…', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e3f5ff',
        backgroundColor: '#0b0f14cc',
        padding: { x: 6, y: 4 },
      })
      .setDepth(100);
    this.status.setWordWrapWidth(scene.scale.width - 20);
    scene.add
      .text(10, scene.scale.height - 30, 'Back to connections (Esc)', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#fff4cf',
        backgroundColor: '#071019',
        padding: { x: 8, y: 5 },
      })
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', this.leaveWorld);
    scene.input.keyboard?.on('keydown', this.onKey);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  async connect(backend: string, displayName = 'Player', enterWorld = false): Promise<void> {
    try {
      let connection: GameConnection;
      if (backend === 'local') {
        const { AuthoritativeGameSession } = await import('../session/AuthoritativeGameSession.js');
        const session = await AuthoritativeGameSession.create();
        session.registerConnection('local', displayName);
        connection = new LocalGameConnection(session, (command) => session.executeCommand(command));
        this.stopLocal = () => session.stop();
        if (!this.disposed) session.start((error) => this.showError(error));
      } else {
        const remote = new WebSocketGameConnection(backend, displayName);
        connection = remote;
        // Install the bridge before waiting, so initial state follows the same path.
        this.bridge = new SceneGameBridge(connection);
        await remote.ready;
      }
      if (this.disposed) {
        connection.disconnect();
        return;
      }
      this.bridge ??= new SceneGameBridge(connection);
      this.unsubscribeSnapshot = connection.onSnapshot((snapshot) => {
        this.dirty = true;
        this.interactionPopup.render(snapshot.ui.interaction ?? null);
      });
      this.unsubscribeEvent = connection.onEvent((event) => {
        if (event.type === 'player.died' && event.playerId === this.bridge?.getLocalPlayerId())
          this.alive = false;
      });
      this.unsubscribeDisconnect = connection.onDisconnect?.((reason) => {
        this.ready = false;
        this.showError(reason);
      });
      this.ready = true;
      this.dirty = true;
      if (enterWorld && Object.keys(this.bridge.getSnapshot().connections ?? {}).length === 1) {
        await this.bridge.send({ type: 'resume', playerId: this.bridge.getLocalPlayerId() });
      }
    } catch (error) {
      this.showError(error);
    }
  }

  update(): void {
    if (!this.bridge || !this.ready || !this.dirty) return;
    const snapshot = this.bridge.getSnapshot();
    const player = snapshot.players[snapshot.localPlayerId];
    const room = snapshot.viewport.rooms[player.roomId];
    this.alive = player.alive;
    this.npcs.render(room.npcs ?? [], snapshot.tick);
    this.renderer.render(room.room, player.body, player.roomId, room.apples ?? null, {
      direction: player.direction,
      enemies: room.enemies,
      followers: room.followers,
      animals: room.animals,
      bullets: room.bullets,
      footballs: room.footballs,
      bombs: room.bombs,
      characterMode: snapshot.presentation?.characterMode,
      atmosphere: snapshot.presentation?.atmosphere,
      renderTimeMs: this.scene.time.now,
      otherPlayers: Object.values(snapshot.players)
        .filter((other) => other.id !== player.id && other.roomId === player.roomId && other.alive)
        .map((other) => ({
          id: other.id,
          body: other.body,
          direction: other.direction,
          color: 0x4ecdc4,
        })),
    });
    const visible = new Set<string>();
    const coordinate = parseCoordinateRoomId(player.roomId);
    const grid = defaultGameConfig.grid;
    for (const occupant of Object.values(snapshot.players)) {
      const head = occupant.body[0];
      if (!head || !occupant.alive || occupant.roomId !== player.roomId) continue;
      const names = Object.values(snapshot.connections ?? {})
        .filter((peer) => peer.playerId === occupant.id)
        .map((peer) => peer.displayName);
      if (names.length === 0) continue;
      visible.add(occupant.id);
      let label = this.nameplates.get(occupant.id);
      if (!label) {
        label = this.scene.add
          .text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#fff4cf',
            stroke: '#071019',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: 240, useAdvancedWrap: true },
          })
          .setOrigin(0.5, 1)
          .setDepth(90);
        this.nameplates.set(occupant.id, label);
      }
      const x = (head.x - (coordinate?.x ?? 0) * grid.cols + 0.5) * grid.cell;
      const y = (head.y - (coordinate?.y ?? 0) * grid.rows) * grid.cell - 5;
      label.setText(names.join(' · '));
      label
        .setPosition(
          Phaser.Math.Clamp(x, label.width / 2 + 3, this.scene.scale.width - label.width / 2 - 3),
          Math.max(label.height + 3, y),
        )
        .setVisible(true);
    }
    for (const [id, label] of this.nameplates) if (!visible.has(id)) label.setVisible(false);
    this.status.setText([
      `${snapshot.ui.paused ? 'Paused · ' : ''}${player.alive ? `Score ${player.score} · Length ${player.body.length}` : 'Game over'} · ${player.roomId}`,
      ...(snapshot.ui.health
        ? [
            `Health ${snapshot.ui.health.current}/${snapshot.ui.health.max}${player.alive ? '' : ' · Enter: respawn'}`,
          ]
        : []),
      'Arrows / WASD: move · Space: pause · E: interact · I: inventory · F5/F9: save/load',
      ...(snapshot.ui.activeChoice?.kind === 'choice'
        ? [
            snapshot.ui.activeChoice.title,
            ...snapshot.ui.activeChoice.options.map(
              (option, index) => `${index + 1}: ${option.title}`,
            ),
          ]
        : []),
      ...(snapshot.ui.activeChoice?.kind === 'dialogue'
        ? [snapshot.ui.activeChoice.title, ...snapshot.ui.activeChoice.pages]
        : []),
      ...(this.showInventory
        ? [
            'Inventory (1–9: use item)',
            ...Object.entries(snapshot.ui.inventory ?? {})
              .slice(0, 9)
              .map(([id, count], index) => `${index + 1}: ${id} × ${count}`),
          ]
        : []),
      ...(snapshot.ui.messages ?? []),
      ...(this.error ? [this.error] : []),
    ]);
    this.dirty = false;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.unsubscribeSnapshot?.();
    this.unsubscribeEvent?.();
    this.unsubscribeDisconnect?.();
    this.bridge?.destroy();
    this.stopLocal?.();
    this.renderer.markAllStaticRoomsDirty();
    for (const label of this.nameplates.values()) label.destroy();
    this.nameplates.clear();
    this.npcs.destroy();
    this.interactionPopup.destroy();
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (this.interactionPopup.handleKey(event)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.leaveWorld();
      return;
    }
    const bridge = this.bridge;
    if (!bridge || !this.ready) return;
    const playerId = bridge.getLocalPlayerId();
    const directions: Record<string, { x: number; y: number }> = {
      arrowup: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const key = event.key.toLowerCase();
    if (key === 'i') {
      this.showInventory = !this.showInventory;
      this.dirty = true;
      return;
    }
    const choiceIndex = Number(key) - 1;
    const interaction = bridge.getSnapshot().ui.activeChoice;
    if (/^[1-9]$/u.test(key)) {
      const itemId = Object.keys(bridge.getSnapshot().ui.inventory ?? {})[choiceIndex];
      if (this.showInventory && itemId) this.send({ type: 'useItem', playerId, itemId });
      else if (interaction?.kind === 'choice' && interaction.options[choiceIndex])
        this.send({
          type: 'chooseOption',
          playerId,
          choiceId: interaction.options[choiceIndex].id,
        });
      return;
    }
    const direction = directions[key];
    let command: ClientCommand;
    if (direction && this.alive) command = { type: 'setDirection', playerId, direction };
    else if (key === ' ')
      command = { type: bridge.getSnapshot().ui.paused ? 'resume' : 'pause', playerId };
    else if (key === 'e') {
      const snapshot = bridge.getSnapshot();
      const player = snapshot.players[playerId];
      const room = snapshot.viewport.rooms[player.roomId];
      const coordinate = parseCoordinateRoomId(player.roomId);
      const head = player.body[0];
      const nearby = room.npcs?.find(
        (actor) =>
          actor.presence &&
          Math.abs(
            actor.presence.position.x -
              (head.x - (coordinate?.x ?? 0) * defaultGameConfig.grid.cols),
          ) +
            Math.abs(
              actor.presence.position.y -
                (head.y - (coordinate?.y ?? 0) * defaultGameConfig.grid.rows),
            ) <=
            2,
      );
      command =
        !interaction && nearby
          ? { type: 'openActor', playerId, actorId: nearby.id }
          : { type: 'interact', playerId };
    } else if (key === 'f5') command = { type: 'saveGame', playerId };
    else if (key === 'f9') command = { type: 'loadGame', playerId };
    else if (key === 'enter' && !this.alive) command = { type: 'restartRun', playerId };
    else return;
    event.preventDefault();
    if (event.repeat && !direction) return;
    this.send(command);
  };

  private async send(command: ClientCommand): Promise<CommandResult> {
    const bridge = this.bridge;
    if (!bridge) return { ok: false, reason: 'Not connected.' };
    try {
      const result = await bridge.send(command);
      this.error = result.ok ? '' : (result.reason ?? 'Command failed');
      this.dirty = true;
      return result;
    } catch (error) {
      this.showError(error);
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  private showError(error: unknown): void {
    if (this.disposed) return;
    this.error = error instanceof Error ? error.message : String(error);
    this.status.setText(this.error);
    this.dirty = true;
  }

  private readonly leaveWorld = (): void => {
    this.destroy();
    window.location.assign(connectionsMenuUrl(location.href));
  };
}
