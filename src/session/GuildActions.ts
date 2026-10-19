import type { SnakeGame } from '../game/snakeGame.js';
import { isTownCriminalRole } from '../world/townRoles.js';
import type { SceneActionCommand } from './SceneActionCommand.js';
import type { CommandResult } from './ClientCommand.js';

/** Guild costs, RNG, job availability, and payouts stay with the world's authority. */
export function executeGuildAction(
  game: SnakeGame,
  command: Extract<SceneActionCommand, { type: 'guildAction' }>,
): CommandResult {
  const town = game.getCurrentTown();
  if (
    !town ||
    town.id !== command.townId ||
    (!town.discoveredGuild && !town.thievesGuild?.discovered)
  )
    return { ok: false, reason: 'The guild is still only a rumor.' };
  const contact = game
    .getActorSystem()
    .getActorsInRoom(game.getCurrentRoom().id)
    .some((actor) => isTownCriminalRole(actor.role) && game.canInteractWithActor(actor.id));
  if (!contact) return { ok: false, reason: 'Move closer to a guild contact.' };
  if (command.action === 'market' || command.action === 'purchase') {
    const merchant = game
      .getActorSystem()
      .getActorsInRoom(game.getCurrentRoom().id)
      .find(
        (actor) =>
          actor.role === 'blackMarketMerchant' &&
          actor.health?.state !== 'dead' &&
          actor.hostility !== 'dead' &&
          actor.flags.dead !== true &&
          actor.flags.eaten !== true,
      );
    const shop = merchant && game.getActorShopView(merchant.id);
    if (!shop?.open)
      return { ok: false, reason: shop?.closedReason ?? 'No black market is available here.' };
    if (command.action === 'market') return { ok: true, shop };
    const result = game.purchaseActorShopOffer(shop.actorId, command.offerId);
    return {
      ok: result.ok,
      message: result.message,
      reason: result.ok ? undefined : result.message,
    };
  }
  if (command.action === 'lower-wanted') return game.reduceCurrentTownWantedViaGuild();
  if (command.action === 'fence') {
    game.addScore(6);
    return { ok: true, message: 'The fence buys what nobody can prove was stolen. +6 score.' };
  }
  if (command.action !== 'job') return { ok: false, reason: 'Unknown guild action.' };
  if (!town.guildJobs.some((job) => job.id === command.jobId && job.status === 'available'))
    return { ok: false, reason: 'That guild job is no longer on the board.' };
  const success = game.rng() > 0.22;
  return {
    ...game.resolveCurrentTownGuildJob(command.jobId, success),
    color: success ? '#b6ff6a' : '#fff3a8',
  };
}
