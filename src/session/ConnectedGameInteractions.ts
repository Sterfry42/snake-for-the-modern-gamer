import type { SnakeGame } from '../game/snakeGame.js';
import { getQuestDialogue } from '../quests/questDialogue.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { CommandResult } from './ClientCommand.js';
import type {
  ConnectedInteractionOption,
  ConnectedInteractionView,
} from './ConnectedInteraction.js';

type MenuState = {
  id: number;
  actorId: string;
} & (
  | { kind: 'actor' }
  | { kind: 'shop' }
  | { kind: 'dialogue'; pages: string[] }
  | { kind: 'quest'; questId: string; large: boolean; title: string; pages: string[] }
);

const ACTOR_ACTIONS = new Set([
  'inspect',
  'wake',
  'talk',
  'ask-rumor',
  'ask-personal',
  'take-quest',
  'shop',
  'leave',
]);
const back: ConnectedInteractionOption = {
  id: 'back',
  label: 'Back',
  description: 'Return to the conversation.',
  enabled: true,
};
const close: ConnectedInteractionOption = {
  id: 'close',
  label: 'Leave',
  description: 'Return to the world.',
  enabled: true,
};

/** Coordinates existing NPC/quest/commerce APIs. Gameplay rules remain in SnakeGame. */
export class ConnectedGameInteractions {
  private readonly states = new Map<PlayerId, MenuState>();
  private nextId = 0;

  constructor(private readonly game: SnakeGame) {}

  open(playerId: PlayerId, actorId: string): CommandResult {
    if (!this.game.canInteractWithActor(actorId))
      return { ok: false, reason: 'Move closer to interact.' };
    this.clear(playerId);
    this.states.set(playerId, { id: ++this.nextId, actorId, kind: 'actor' });
    return { ok: true };
  }

  remove(playerId: PlayerId): void {
    this.states.delete(playerId);
  }

  reset(): void {
    this.states.clear();
  }

  getView(playerId: PlayerId): ConnectedInteractionView | null {
    const state = this.states.get(playerId);
    if (!state) return null;
    if (!this.game.canInteractWithActor(state.actorId)) {
      this.clear(playerId);
      return null;
    }
    const actor = this.game.getActorSystem().getActor(state.actorId)!;
    if (state.kind === 'actor') {
      const menu = this.game.getActorInteractionMenu(actor.id);
      if (!menu) return null;
      return {
        id: state.id,
        kind: state.kind,
        title: menu.title,
        description: [menu.subtitle, menu.moodSummary].filter(Boolean).join('\n'),
        options: [
          ...menu.options
            .filter((option) => ACTOR_ACTIONS.has(option.id) && option.id !== 'leave')
            .map((option) => ({
              id: option.id,
              label: option.label,
              description: option.reason ?? '',
              enabled: option.enabled,
            })),
          close,
        ],
      };
    }
    if (state.kind === 'shop') {
      const shop = this.game.getActorShopView(actor.id);
      const score = this.game.getScore();
      return {
        id: state.id,
        kind: state.kind,
        title: `${shop?.title ?? actor.displayName} - ${score} score`,
        description: shop?.open
          ? 'Choose an item to buy.'
          : (shop?.closedReason ?? 'The shop is no longer available.'),
        options: [
          ...(shop?.open
            ? shop.offers.map((offer) => ({
                id: `offer:${offer.id}`,
                label: `${offer.label} - ${offer.price} score`,
                description: [
                  offer.note,
                  offer.quantity === undefined ? '' : `${offer.quantity} in stock`,
                  score < offer.price ? 'Not enough score.' : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
                enabled: score >= offer.price,
              }))
            : []),
          back,
          close,
        ],
      };
    }
    return {
      id: state.id,
      kind: state.kind,
      title: state.kind === 'quest' ? state.title : actor.displayName,
      description: state.pages.join('\n\n'),
      options:
        state.kind === 'quest'
          ? [
              { id: 'accept', label: 'Accept quest', description: '', enabled: true },
              { id: 'reject', label: 'Decline quest', description: '', enabled: true },
              close,
            ]
          : [back, close],
    };
  }

  close(playerId: PlayerId, menuId: number): CommandResult {
    if (this.states.get(playerId)?.id !== menuId)
      return { ok: false, reason: 'That menu is no longer current.' };
    this.clear(playerId);
    return { ok: true };
  }

  async select(playerId: PlayerId, menuId: number, optionId: string): Promise<CommandResult> {
    const view = this.getView(playerId);
    const state = this.states.get(playerId);
    if (!state || !view || state.id !== menuId)
      return { ok: false, reason: 'That menu is no longer current.' };
    const option = view.options.find((entry) => entry.id === optionId);
    if (!option?.enabled)
      return { ok: false, reason: option?.description || 'That option is not available.' };
    if (optionId === 'close') return this.close(playerId, menuId);
    if (optionId === 'back' || optionId === 'reject') {
      this.clear(playerId);
      return this.open(playerId, state.actorId);
    }
    if (state.kind === 'quest') {
      let accepted = false;
      if (state.large) {
        if (this.game.getTownLargeQuestForActor(state.actorId)?.id === state.questId)
          accepted = this.game.acceptTownLargeQuest(state.actorId).ok;
      } else if (this.game.getOfferedQuest()?.id === state.questId) {
        accepted = Boolean(this.game.acceptOfferedQuest());
      }
      if (!accepted) return { ok: false, reason: 'That quest is no longer available.' };
      this.dialogue(playerId, state.actorId, [`Accepted: ${state.title}.`]);
      return { ok: true };
    }
    if (state.kind === 'shop' && optionId.startsWith('offer:')) {
      const purchase = this.game.purchaseActorShopOffer(state.actorId, optionId.slice(6));
      if (purchase.ok) this.states.set(playerId, { ...state, id: ++this.nextId });
      return { ok: purchase.ok, reason: purchase.ok ? undefined : purchase.message };
    }
    if (state.kind !== 'actor') return { ok: false, reason: 'That option is not available.' };
    if (optionId === 'shop') {
      const result = await this.game.chooseActorInteraction(state.actorId, 'shop');
      if (!result.ok || result.action !== 'shop') return { ok: false, reason: result.message };
      this.states.set(playerId, { id: ++this.nextId, actorId: state.actorId, kind: 'shop' });
      return { ok: true };
    }
    if (optionId === 'take-quest') return this.offerQuest(playerId, state.actorId);
    if (optionId === 'wake') {
      const result = this.game.wakeActor(state.actorId);
      this.dialogue(playerId, state.actorId, result.pages);
      return { ok: result.ok };
    }
    if (optionId === 'inspect') {
      this.dialogue(playerId, state.actorId, [view.description]);
      return { ok: true };
    }
    const bucket =
      optionId === 'ask-rumor'
        ? 'ask-around'
        : optionId === 'ask-personal'
          ? 'ask-personal'
          : 'talk';
    const conversation = this.game.getActorConversation(state.actorId, bucket);
    const pages = this.game.formatActorConversationPages(conversation) ?? [
      'They watch you with careful uncertainty.',
    ];
    const actor = this.game.getActorSystem().getActor(state.actorId)!;
    this.game.setFlag('ui.questInteraction', {
      message: `${actor.displayName}: ${conversation?.line ?? pages[0]}`,
    });
    this.dialogue(playerId, state.actorId, pages);
    return { ok: true };
  }

  private offerQuest(playerId: PlayerId, actorId: string): CommandResult {
    const large = this.game.isCurrentTownLargeQuestGiverActor(actorId);
    const request = large
      ? { quest: this.game.getTownLargeQuestForActor(actorId), state: 'available' }
      : this.game.requestQuestFromGiver(this.game.getCurrentRoom().id);
    if (!request.quest) {
      this.dialogue(playerId, actorId, ['No work is available here right now.']);
      return { ok: true };
    }
    const dialogue = getQuestDialogue(request.quest);
    if (request.state !== 'available') {
      this.dialogue(playerId, actorId, [
        `${request.state === 'completed' ? 'Completed' : 'Already accepted'}: ${request.quest.label}.`,
        ...dialogue.pages,
      ]);
      return { ok: true };
    }
    this.states.set(playerId, {
      id: ++this.nextId,
      actorId,
      kind: 'quest',
      large,
      questId: request.quest.id,
      title: request.quest.label,
      pages: dialogue.pages,
    });
    return { ok: true };
  }

  private dialogue(playerId: PlayerId, actorId: string, pages: string[]): void {
    this.states.set(playerId, { id: ++this.nextId, actorId, kind: 'dialogue', pages });
  }

  private clear(playerId: PlayerId): void {
    const state = this.states.get(playerId);
    if (
      state?.kind === 'quest' &&
      !state.large &&
      this.game.getOfferedQuest()?.id === state.questId
    )
      this.game.rejectOfferedQuest();
    this.states.delete(playerId);
  }
}
