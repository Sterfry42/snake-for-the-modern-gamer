import type { SnakeGame } from '../game/snakeGame.js';
import { FishingRegistry } from '../fishing/fishingRegistry.js';
import { BaseballRegistry } from '../baseball/baseballRegistry.js';
import { hasAdjacentWater } from '../fishing/waterDetection.js';
import { parseCoordinateRoomId } from '../world/roomAddress.js';
import { getItem } from '../inventory/itemRegistry.js';
import type { CatchEntry } from '../fishing/types.js';
import type { BaseballStats } from '../baseball/types.js';
import type { MinigameSnapshot } from './MinigameSnapshot.js';
import type { CommandResult } from './ClientCommand.js';
import type { SceneActionCommand } from './SceneActionCommand.js';

type Runtime = {
  view: MinigameSnapshot;
  pull: -1 | 0 | 1;
  elapsed: number;
  remaining: number;
  roomId: string;
};

/** Existing minigame rules on the session clock. Clients submit controls, never outcomes. */
export class AuthoritativeMinigames {
  private readonly states = new Map<string, Runtime>();
  private readonly fishing: FishingRegistry;
  private readonly baseball: BaseballRegistry;
  constructor(private readonly game: SnakeGame) {
    this.fishing = new FishingRegistry({
      rng: game.rng,
      getModifiers: () => game.getFishingSpecialModifiers(),
    });
    this.baseball = new BaseballRegistry({ rng: game.rng });
  }
  reset(playerId?: string): void {
    if (playerId) this.states.delete(playerId);
    else this.states.clear();
  }
  getView(playerId: string): MinigameSnapshot | null {
    return this.states.get(playerId)?.view ?? null;
  }

  command(command: Extract<SceneActionCommand, { type: 'minigameAction' }>): CommandResult {
    const id = this.game.getLocalPlayerId();
    const runtime = this.states.get(id);
    if (command.action === 'start') {
      if (runtime || this.game.getFlag('vehicle.active') || this.game.getStructurePlacement())
        return { ok: false, reason: 'Finish the current activity first.' };
      const itemId = this.game.getInventory().getEquipped('gloves');
      const item = itemId ? getItem(itemId) : undefined;
      const modifiers = item?.kind === 'equipment' ? item.modifiers : undefined;
      if (command.kind === 'fishing') {
        if (!modifiers?.fishingEnabled)
          return { ok: false, reason: 'You need a fishing rod equipped.' };
        const room = this.game.getCurrentRoom();
        const head = this.game.getSnakeBody()[0];
        const coordinate = parseCoordinateRoomId(room.id);
        if (
          !head ||
          !hasAdjacentWater(
            head.x - (coordinate?.x ?? 0) * this.game.config.grid.cols,
            head.y - (coordinate?.y ?? 0) * this.game.config.grid.rows,
            room,
          )
        )
          return { ok: false, reason: 'There is no water nearby.' };
        const fish = this.fishing.pickRandomFish(room.biomeId);
        if (!fish) return { ok: false, reason: 'No fish available in this area.' };
        this.states.set(id, {
          view: { kind: 'fishing', state: this.fishing.startFishing(room.biomeId, fish) },
          pull: 0,
          elapsed: 0,
          remaining: 0,
          roomId: room.id,
        });
      } else {
        if (!modifiers?.baseballEnabled)
          return { ok: false, reason: 'You need a baseball bat equipped.' };
        this.states.set(id, {
          view: {
            kind: 'baseball',
            state: this.baseball.startPitch(this.baseball.pickRandomPitch()),
          },
          pull: 0,
          elapsed: 0,
          remaining: 0,
          roomId: this.game.getCurrentRoom().id,
        });
      }
      return { ok: true };
    }
    if (!runtime || runtime.view.result)
      return { ok: false, reason: 'That activity is no longer active.' };
    if (command.action === 'abort') {
      this.states.delete(id);
      return { ok: true };
    }
    if (command.action === 'pull' && runtime.view.kind === 'fishing') {
      runtime.pull = command.direction;
      return { ok: true };
    }
    if (command.action === 'swing' && runtime.view.kind === 'baseball') {
      const swing = this.baseball.swing(runtime.view.state);
      runtime.view.state = swing.state;
      if (swing.result) {
        runtime.view.result = swing.result;
        this.award(runtime);
      }
      return { ok: true };
    }
    return { ok: false, reason: 'That control does not belong to this activity.' };
  }

  step(deltaMs: number): void {
    const id = this.game.getLocalPlayerId();
    const runtime = this.states.get(id);
    if (!runtime) return;
    if (!this.game.getPlayer(id)?.alive || this.game.getCurrentRoom().id !== runtime.roomId) {
      this.states.delete(id);
      return;
    }
    if (runtime.view.result) {
      runtime.remaining -= deltaMs;
      if (runtime.remaining <= 0) this.states.delete(id);
      return;
    }
    if (runtime.view.kind === 'baseball') {
      const tick = this.baseball.tickPitching(runtime.view.state, deltaMs);
      runtime.view.state = tick.state;
      if (tick.result) {
        runtime.view.result = tick.result;
        this.award(runtime);
      }
    } else {
      runtime.elapsed += deltaMs;
      while (runtime.elapsed >= 1000 / 60 && !runtime.view.result) {
        runtime.elapsed -= 1000 / 60;
        const tick = this.fishing.tickFishing(runtime.view.state, runtime.pull);
        runtime.view.state = tick.state;
        if (tick.result) {
          runtime.view.result = tick.result;
          this.award(runtime);
        }
      }
    }
  }

  private award(runtime: Runtime): void {
    runtime.remaining = 1400;
    const view = runtime.view;
    const itemId = this.game.getInventory().getEquipped('gloves');
    const item = itemId ? getItem(itemId) : undefined;
    const modifiers = item?.kind === 'equipment' ? item.modifiers : undefined;
    if (view.kind === 'fishing' && view.result?.caught && view.result.result) {
      const result = view.result.result;
      const fish = result.fish;
      this.game.addItem(`fish-${fish.typeId}`, 1);
      const caught = this.game.getFlag<Record<string, number>>('fishing.caughtFish') ?? {};
      caught[fish.typeId] = (caught[fish.typeId] ?? 0) + 1;
      this.game.setFlag('fishing.caughtFish', caught);
      this.game.setFlag('fishCaught', true);
      const journal = this.game.getFlag<CatchEntry[]>('fishing.catchJournal') ?? [];
      journal.push({
        id: `catch-${journal.length}`,
        typeId: fish.typeId,
        biomeId: fish.biomeId,
        rarity: fish.rarity,
        weight: result.weight,
        timestamp: Date.now(),
      });
      this.game.setFlag('fishing.catchJournal', journal);
      const rarity =
        fish.rarity === 'common'
          ? 0.5
          : fish.rarity === 'uncommon'
            ? 0.7
            : fish.rarity === 'rare'
              ? 1
              : 1.5;
      this.game.addScore(
        Math.max(1, Math.floor(fish.baseScore * rarity * (modifiers?.fishingMod ?? 1))),
      );
    }
    if (view.kind === 'baseball' && view.result) {
      const result = view.result;
      const stats = this.game.getFlag<BaseballStats>('baseball.stats') ?? {
        swings: 0,
        hits: 0,
        homeRuns: 0,
        totalDistance: 0,
        bestDistance: 0,
      };
      stats.swings++;
      if (result.hit) {
        stats.hits++;
        if (result.outcome === 'home-run') stats.homeRuns++;
        stats.totalDistance += result.distance;
        stats.bestDistance = Math.max(stats.bestDistance, result.distance);
        this.game.addScore(
          this.baseball.calculateScore(result.distance, modifiers?.baseballMod ?? 1),
        );
      }
      this.game.setFlag('baseball.stats', stats);
    }
  }
}
