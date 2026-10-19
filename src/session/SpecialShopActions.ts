import type { SnakeGame } from '../game/snakeGame.js';
import { GOBLIN_SNAKE_STYLE, getWardPrice, getWardScrollOffer } from '../shops/goblinShop.js';
import type { CommandResult } from './ClientCommand.js';
import type { SceneActionCommand } from './SceneActionCommand.js';

/** Authored specialty counters keep their normal UI; this seam owns prices and rewards. */
export function executeSpecialShopAction(
  game: SnakeGame,
  command: Extract<SceneActionCommand, { type: 'specialShopAction' }>,
): CommandResult {
  if (command.action === 'butcher') {
    if (!command.actorId || !game.canInteractWithActor(command.actorId))
      return { ok: false, reason: 'Move closer to the butcher.' };
    return game.sellSnakeLengthToButcher(command.actorId);
  }
  const room = game.getCurrentRoom();
  const clerk = room.goblinCamp?.shopkeeper;
  const head = game.getSnakeBody()[0];
  const position = head && game.resolveRoomPosition(head);
  if (
    !clerk ||
    !position ||
    Math.abs(position.localX - clerk.x) + Math.abs(position.localY - clerk.y) > 2
  )
    return { ok: false, reason: 'Move closer to the goblin clerk.' };
  const standing = game.getFactionAlignment('goblin-camps').standing;
  if (standing === 'angry' || standing === 'violent')
    return { ok: false, message: 'The goblins refuse to sell to you.' };
  if (command.action === 'goblin-hire')
    return game.hireGoblinMercenary(`${clerk.name ?? 'Goblin Clerk'}'s Cousin`);
  if (command.action === 'goblin-quest' || command.action === 'goblin-turnin') {
    const quest =
      command.action === 'goblin-quest'
        ? game.offerGoblinLedgerQuestFromCurrentRoom()
        : game.turnInGoblinLedgerQuestAtCurrentRoom();
    return {
      ok: Boolean(quest),
      message: quest
        ? command.action === 'goblin-quest'
          ? 'Ugly Errand accepted. Find the ledger-stamp.'
          : 'Ledger-stamp returned. The debt is settled.'
        : 'The clerk still wants the ledger-stamp.',
    };
  }
  let price: number;
  let message: string;
  let apply: () => void;
  if (command.action === 'ward') {
    const offer = getWardScrollOffer(command.offerId ?? '');
    if (!offer) return { ok: false, message: 'The contract has gone missing.' };
    const cost = getWardPrice(offer, standing, Number(game.getWardUsage()[offer.source] ?? 0));
    if (cost === null) return { ok: false, message: 'The goblins refuse to sell to you.' };
    price = cost;
    message = `${offer.label} signed. It triggers before lives.`;
    apply = () => game.addWardContract(offer.source);
  } else if (command.action === 'goblin-style') {
    price = game.getFlag<boolean>('cosmetics.goblinHideOwned') ? 0 : GOBLIN_SNAKE_STYLE.price;
    message = 'Goblin Hide equipped.';
    apply = () => game.setFlag('cosmetics.goblinHideOwned', true);
  } else {
    if (game.getInventory().getItemCount('fishing-rod') > 0)
      return { ok: false, message: 'You already have a fishing rod.' };
    price = 42;
    message = 'Bought a goblin-modified fishing rod.';
    apply = () => game.addItem('fishing-rod', 1);
  }
  if (game.getScore() < price) return { ok: false, message: `That costs ${price} score.` };
  game.setScore(game.getScore() - price);
  apply();
  return { ok: true, message, color: '#b6ff6a' };
}
