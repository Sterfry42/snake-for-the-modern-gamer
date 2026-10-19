import {
  MolemanArchaeologySession,
  getDigSiteVariant,
  type ArchaeologySessionEvent,
  type ArchaeologySessionSnapshot,
} from '../archaeology/molemanArchaeology.js';
import { actorIdForRelationship } from '../actors/actorFactory.js';
import type { SnakeGame } from '../game/snakeGame.js';
import type { CommandResult } from './ClientCommand.js';
import type { SceneActionCommand } from './SceneActionCommand.js';

export interface ArchaeologyView {
  id: number;
  roomId: string;
  foremanId: string;
  state: ArchaeologySessionSnapshot;
  result?: {
    reason: 'leave' | 'failure';
    payout: ReturnType<SnakeGame['applyArchaeologyRewards']>;
  };
}

export interface ArchaeologyOutcome {
  id: number;
  sequence: number;
  state: ArchaeologySessionSnapshot;
  events: ArchaeologySessionEvent[];
  messages: string[];
}

type Runtime = {
  id: number;
  roomId: string;
  foremanId: string;
  session: MolemanArchaeologySession;
  result?: ArchaeologyView['result'];
};

/** The existing excavation rules run on world time; clients submit only cursor/swap/leave intents. */
export class AuthoritativeArchaeology {
  private readonly states = new Map<string, Runtime>();
  private nextId = 0;
  private sequence = 0;
  constructor(
    private readonly game: SnakeGame,
    private readonly publish: (playerId: string, outcome: ArchaeologyOutcome) => void,
  ) {}

  reset(playerId?: string): void {
    if (playerId) this.states.delete(playerId);
    else this.states.clear();
  }

  getView(playerId: string): ArchaeologyView | null {
    const runtime = this.states.get(playerId);
    if (!runtime) return null;
    return {
      id: runtime.id,
      roomId: runtime.roomId,
      foremanId: runtime.foremanId,
      state: runtime.session.getSnapshot(),
      result: runtime.result,
    };
  }

  command(command: Extract<SceneActionCommand, { type: 'archaeologyAction' }>): CommandResult {
    const playerId = this.game.getLocalPlayerId();
    if (command.action === 'start') {
      if (this.states.has(playerId))
        return { ok: false, reason: 'Finish the current excavation first.' };
      const room = this.game.getCurrentRoom();
      const site = room.molemanDigSite;
      const head = this.game.getSnakeBody()[0];
      const position = head && this.game.resolveRoomPosition(head);
      if (
        !site ||
        !position ||
        Math.abs(position.localX - site.foreman.x) + Math.abs(position.localY - site.foreman.y) > 2
      )
        return { ok: false, reason: 'Move closer to the dig foreman.' };
      if (
        !this.game.canInteractWithActor(
          actorIdForRelationship(`moleman:${room.id}:${site.foreman.id}`),
        )
      )
        return { ok: false, reason: 'The dig foreman is unavailable.' };
      const runtime: Runtime = {
        id: ++this.nextId,
        roomId: room.id,
        foremanId: site.foreman.id,
        session: new MolemanArchaeologySession(
          getDigSiteVariant(site.variantId),
          this.game.rng,
          this.game.getArtifactTuning(),
        ),
      };
      this.states.set(playerId, runtime);
      this.flush(playerId, runtime);
      return { ok: true };
    }
    const runtime = this.states.get(playerId);
    if (!runtime || runtime.id !== command.id)
      return { ok: false, reason: 'That excavation is no longer current.' };
    if (command.action === 'close') {
      if (!runtime.result)
        return { ok: false, reason: 'Leave the excavation before closing its summary.' };
      this.states.delete(playerId);
      return { ok: true };
    }
    if (runtime.result) return { ok: false, reason: 'That excavation has ended.' };
    if (this.game.getCurrentRoom().id !== runtime.roomId) {
      this.states.delete(playerId);
      return { ok: false, reason: 'You have left the dig site.' };
    }
    if (command.action === 'move')
      runtime.session.moveCursor(command.direction.x, command.direction.y);
    if (command.action === 'swap' && !runtime.session.swap())
      return { ok: false, reason: 'Those blocks cannot be swapped now.' };
    if (command.action === 'leave') this.finish(runtime, 'leave');
    this.flush(playerId, runtime);
    return { ok: true };
  }

  step(deltaMs: number): void {
    const playerId = this.game.getLocalPlayerId();
    const runtime = this.states.get(playerId);
    if (!runtime) return;
    if (!this.game.getPlayer(playerId)?.alive || this.game.getCurrentRoom().id !== runtime.roomId) {
      this.states.delete(playerId);
      return;
    }
    if (runtime.result) return;
    runtime.session.tick(deltaMs);
    if (runtime.session.getSnapshot().gameOver) this.finish(runtime, 'failure');
    this.flush(playerId, runtime);
  }

  private finish(runtime: Runtime, reason: 'leave' | 'failure'): void {
    if (runtime.result) return;
    runtime.result = {
      reason,
      payout: this.game.applyArchaeologyRewards(runtime.session.getSnapshot().rewards),
    };
  }

  private flush(playerId: string, runtime: Runtime): void {
    const events = runtime.session.consumeEvents();
    const messages = runtime.session.consumeMessages();
    if (events.length || messages.length)
      this.publish(
        playerId,
        structuredClone({
          id: runtime.id,
          sequence: ++this.sequence,
          state: runtime.session.getSnapshot(),
          events,
          messages,
        }),
      );
  }
}
