import type { SnakeGame } from '../game/snakeGame.js';
import { getQuestDialogue } from '../quests/questDialogue.js';
import type { PlayerId } from '../players/playerTypes.js';
import type { CommandResult } from './ClientCommand.js';
import { relationshipVoiceRole, type ActorOutcome } from './ActorIntent.js';
import type { SceneActionCommand } from './SceneActionCommand.js';
import { DatingScenarioDirector } from '../relationships/datingScenarioDirector.js';
import type { GameInteractionOption, GameInteractionView } from './GameInteraction.js';

type MenuState = {
  id: number;
  actorId: string;
  dating?: boolean;
  offeredQuest?: { id: string; large: boolean };
} & (
  | { kind: 'actor' }
  | { kind: 'shop' }
  | { kind: 'relationship' }
  | { kind: 'gift' }
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
  'apologize',
  'threaten',
  'parley',
  'pickpocket',
  'tavern-rest',
  'campaign-shake-hands',
  'campaign-button',
  'campaign-smear',
  'campaign-buy-round',
  'mayor-free-beer',
  'leave',
]);
const back: GameInteractionOption = {
  id: 'back',
  label: 'Back',
  description: 'Return to the conversation.',
  enabled: true,
};
const close: GameInteractionOption = {
  id: 'close',
  label: 'Leave',
  description: 'Return to the world.',
  enabled: true,
};

/** Coordinates existing NPC/quest/commerce APIs. Gameplay rules remain in SnakeGame. */
export class GameInteractionMenus {
  private readonly states = new Map<PlayerId, MenuState>();
  private nextId = 0;
  private readonly datingDirector: DatingScenarioDirector;
  private readonly datingSequences = new Map<
    PlayerId,
    {
      actorId: string;
      kind: 'talk' | 'flirt' | 'date';
      event: ReturnType<DatingScenarioDirector['createDatingSequenceEvent']>;
    }
  >();

  constructor(private readonly game: SnakeGame) {
    this.datingDirector = new DatingScenarioDirector(game);
  }

  date(
    playerId: PlayerId,
    command: Extract<SceneActionCommand, { type: 'datingAction' }>,
  ): CommandResult {
    const state = this.states.get(playerId);
    const profile = this.profile(command.actorId);
    if (
      !state ||
      state.id !== command.revision ||
      state.actorId !== command.actorId ||
      !this.getView(playerId) ||
      !profile
    )
      return { ok: false, reason: 'That interaction is no longer current.' };
    const outcome: ActorOutcome = { revision: state.id };
    if (command.action === 'start') {
      if (!this.game.getRelationshipActions(profile).includes(command.kind))
        return { ok: false, reason: 'That relationship action is unavailable.' };
      const event = this.datingDirector.createDatingSequenceEvent(profile, command.kind);
      this.datingSequences.set(playerId, { actorId: command.actorId, kind: command.kind, event });
      outcome.sequence = event;
    } else if (command.action === 'choose') {
      const sequence = this.datingSequences.get(playerId);
      if (!sequence || sequence.actorId !== command.actorId)
        return { ok: false, reason: 'That date is no longer current.' };
      const branch = command.branchId ? sequence.event.branchResults[command.branchId] : undefined;
      if (
        (!command.branchId && Object.keys(sequence.event.branchResults).length > 0) ||
        (command.branchId && !branch)
      )
        return { ok: false, reason: 'That response was not offered.' };
      outcome.relationship = command.branchId
        ? this.game.applyRelationshipBranchChoice(
            profile,
            this.datingDirector.normalizeDatingBranchChoice(command.branchId, branch),
            sequence.kind,
          )
        : this.game.applyRelationshipChoice(profile, sequence.kind);
      this.datingSequences.delete(playerId);
    } else if (command.action === 'gift') {
      if (!this.game.getGiftableItems().some((item) => item.itemId === command.itemId))
        return { ok: false, reason: 'That gift is unavailable.' };
      outcome.relationship = this.game.giveRelationshipGift(profile, command.itemId);
    } else outcome.relationship = this.game.applyRelationshipArrangement(profile, command.choice);
    return { ok: outcome.relationship?.ok ?? true, actorOutcome: outcome };
  }

  async act(
    playerId: PlayerId,
    command: Extract<SceneActionCommand, { type: 'actorAction' }>,
  ): Promise<CommandResult> {
    if (command.action === 'begin') {
      const opened = this.open(playerId, command.actorId);
      if (!opened.ok) return opened;
      const state = this.states.get(playerId)!;
      const profile = this.profile(command.actorId);
      if (profile) this.game.ensureRelationshipCandidate(profile);
      return {
        ok: true,
        actorOutcome: {
          revision: state.id,
          bark:
            command.includeBark && profile
              ? this.game.getNpcBark(relationshipVoiceRole(profile), command.actorId)
              : undefined,
        },
      };
    }
    const state = this.states.get(playerId);
    if (
      !state ||
      state.actorId !== command.actorId ||
      state.id !== command.revision ||
      !this.getView(playerId)
    )
      return { ok: false, reason: 'That interaction is no longer current.' };
    if (command.action === 'close') return this.close(playerId, state.id);
    const action = command.action;
    const menu = this.game.getActorInteractionMenu(command.actorId);
    const derived = [
      'accept-quest',
      'reject-quest',
      'dating',
      'dating-refresh',
      'complete-wedding',
      'pay-fine',
    ];
    if (
      !derived.includes(action) &&
      !menu?.options.some((option) => option.id === action && option.enabled)
    )
      return { ok: false, reason: 'That action is unavailable.' };
    const outcome: ActorOutcome = { revision: state.id };
    const profile = this.profile(command.actorId);
    if (action === 'talk' || action === 'ask-rumor' || action === 'ask-personal') {
      const conversation = this.game.getActorConversation(
        command.actorId,
        action === 'ask-rumor' ? 'ask-around' : action,
      );
      outcome.pages = this.game.formatActorConversationPages(conversation) ?? [
        'They watch you with careful uncertainty.',
      ];
    } else if (action === 'wake') outcome.pages = this.game.wakeActor(command.actorId).pages;
    else if (action === 'apologize' || action === 'threaten' || action === 'parley')
      outcome.pages = [
        action === 'apologize'
          ? (this.game.apologizeToActor(command.actorId) ?? 'Not now.')
          : action === 'threaten'
            ? (this.game.threatenActor(command.actorId) ?? 'Not now.')
            : (this.game.parleyWithActor(command.actorId) ?? 'Not now.'),
      ];
    else if (action === 'shop') {
      const result = await this.game.chooseActorInteraction(command.actorId, 'shop');
      if (!result.ok || result.action !== 'shop') return { ok: false, reason: result.message };
      outcome.shop = result.shop;
    } else if (action === 'take-quest') {
      const large = this.game.isCurrentTownLargeQuestGiverActor(command.actorId);
      const request = large
        ? { quest: this.game.getTownLargeQuestForActor(command.actorId), state: 'available' }
        : this.game.requestQuestFromGiver(this.game.getCurrentRoom().id);
      if (!request.quest) return { ok: false, reason: 'No work is available here right now.' };
      state.offeredQuest =
        request.state === 'available' ? { id: request.quest.id, large } : undefined;
      outcome.quest = {
        id: request.quest.id,
        label: request.quest.label,
        description: request.quest.description,
        pages: getQuestDialogue(request.quest).pages,
        large,
        state: request.state,
      };
    } else if (action === 'accept-quest' || action === 'reject-quest') {
      const offered = state.offeredQuest;
      if (
        !offered ||
        (offered.large
          ? this.game.getTownLargeQuestForActor(command.actorId)?.id
          : this.game.getOfferedQuest()?.id) !== offered.id
      )
        return { ok: false, reason: 'That quest is no longer offered.' };
      state.offeredQuest = undefined;
      if (this.game.isCurrentTownLargeQuestGiverActor(command.actorId)) {
        if (action === 'accept-quest') {
          const result = this.game.acceptTownLargeQuest(command.actorId);
          if (!result.ok) return { ok: false, reason: result.message };
        }
      } else if (action === 'accept-quest') {
        if (!this.game.acceptOfferedQuest())
          return { ok: false, reason: 'That quest is no longer offered.' };
      } else this.game.rejectOfferedQuest();
    } else if ((action === 'dating' || action === 'dating-refresh') && profile) {
      const cutscene = action === 'dating' ? this.game.popRelationshipCutscene(profile.id) : null;
      outcome.dating = { talk: this.game.getRelationshipTalk(profile), cutscene: cutscene?.pages };
    } else if (action === 'pay-fine') {
      const town = this.game.getCurrentTown();
      const role = this.game.getActorRole(command.actorId);
      if (
        !town ||
        town.wantedLevel <= 0 ||
        (role !== 'guard' && role !== 'gateGuard' && role !== 'resident')
      )
        return { ok: false, reason: 'No fine is payable here.' };
      const cost = 8 + town.wantedLevel * 7;
      if (this.game.getScore() < cost) return { ok: false, reason: `The fine is ${cost} score.` };
      const wantedLevel =
        town.wantedLevel === 1
          ? 0
          : town.wantedLevel === 2
            ? 1
            : town.wantedLevel === 3
              ? 2
              : town.wantedLevel === 4
                ? 3
                : 4;
      this.game.setScore(this.game.getScore() - cost);
      this.game.updateCurrentTown({ ...town, wantedLevel });
      return {
        ok: true,
        message: `${profile?.displayName ?? 'The clerk'} stamps the fine. Wanted level drops by one.`,
        actorOutcome: outcome,
      };
    } else if (action === 'pickpocket' && profile)
      outcome.relationship = this.game.pickpocketRelationshipNpc(profile);
    else if (action === 'complete-wedding' && profile)
      outcome.relationship = this.game.completeWeddingWithProfile(profile);
    else {
      const result = await this.game.chooseActorInteraction(command.actorId, action);
      return { ok: result.ok, message: result.message, actorOutcome: outcome };
    }
    return { ok: true, actorOutcome: outcome };
  }

  open(playerId: PlayerId, actorId: string): CommandResult {
    if (!this.game.canInteractWithActor(actorId))
      return { ok: false, reason: 'Move closer to interact.' };
    this.clear(playerId);
    this.states.set(playerId, { id: ++this.nextId, actorId, kind: 'actor' });
    return { ok: true };
  }

  remove(playerId: PlayerId): void {
    this.datingSequences.delete(playerId);
    this.states.delete(playerId);
  }

  reset(): void {
    this.datingSequences.clear();
    this.states.clear();
  }

  getView(playerId: PlayerId): GameInteractionView | null {
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
          ...(this.profile(actor.id)
            ? [
                {
                  id: 'relationship',
                  label: 'Relationship',
                  description: 'Talk, gifts, dates, and family.',
                  enabled: true,
                },
              ]
            : []),
          close,
        ],
      };
    }
    if (state.kind === 'relationship' || state.kind === 'gift') {
      const profile = this.profile(state.actorId);
      if (!profile) return null;
      const relationship = this.game.getRelationshipState(profile);
      return {
        id: state.id,
        kind: 'actor',
        title: actor.displayName,
        dating: state.kind === 'relationship' ? { profile, state: relationship } : undefined,
        description: relationship
          ? `${relationship.stage} · Affection ${relationship.affection} · Trust ${relationship.trust}`
          : '',
        options: [
          ...(state.kind === 'gift'
            ? this.game.getGiftableItems().map((item) => ({
                id: `gift:${item.itemId}`,
                label: `${item.name} (${item.count})`,
                description: '',
                enabled: true,
              }))
            : this.game.getRelationshipActions(profile).map((choice) => ({
                id: `relationship:${choice}`,
                label: choice.replace(/-/g, ' '),
                description: '',
                enabled: true,
              }))),
          back,
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
      dating:
        state.dating && this.profile(actor.id)
          ? {
              profile: this.profile(actor.id)!,
              state: this.game.getRelationshipState(this.profile(actor.id)!),
            }
          : undefined,
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
    if (state.kind === 'relationship' || state.kind === 'gift') {
      const profile = this.profile(state.actorId);
      if (!profile) return { ok: false, reason: 'That person is not here.' };
      if (optionId === 'back') return this.open(playerId, state.actorId);
      if (optionId === 'relationship:gift') {
        this.states.set(playerId, { id: ++this.nextId, actorId: state.actorId, kind: 'gift' });
        return { ok: true };
      }
      if (state.kind === 'gift' && optionId.startsWith('gift:')) {
        const result = this.game.giveRelationshipGift(profile, optionId.slice(5));
        this.dialogue(playerId, state.actorId, [result.message], true);
        return { ok: result.ok, reason: result.ok ? undefined : result.message };
      }
      const choice = this.game
        .getRelationshipActions(profile)
        .find((entry) => entry !== 'gift' && `relationship:${entry}` === optionId);
      if (!choice || choice === 'gift') return { ok: false, reason: 'That choice is unavailable.' };
      const result = this.game.applyRelationshipChoice(profile, choice);
      this.dialogue(playerId, state.actorId, [result.message], true);
      return { ok: result.ok, reason: result.ok ? undefined : result.message };
    }
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
    if (optionId === 'relationship') {
      const profile = this.profile(state.actorId);
      if (!profile) return { ok: false, reason: 'That person is not here.' };
      this.game.ensureRelationshipCandidate(profile);
      this.states.set(playerId, {
        id: ++this.nextId,
        actorId: state.actorId,
        kind: 'relationship',
      });
      return { ok: true };
    }
    if (optionId === 'shop') {
      const result = await this.game.chooseActorInteraction(state.actorId, 'shop');
      if (!result.ok || result.action !== 'shop') return { ok: false, reason: result.message };
      this.states.set(playerId, { id: ++this.nextId, actorId: state.actorId, kind: 'shop' });
      return { ok: true };
    }
    if (optionId === 'take-quest') return this.offerQuest(playerId, state.actorId);
    if (optionId === 'apologize' || optionId === 'threaten' || optionId === 'parley') {
      const line =
        optionId === 'apologize'
          ? this.game.apologizeToActor(state.actorId)
          : optionId === 'threaten'
            ? this.game.threatenActor(state.actorId)
            : this.game.parleyWithActor(state.actorId);
      this.dialogue(playerId, state.actorId, [line ?? 'Not now.']);
      return { ok: line !== null };
    }
    if (optionId === 'pickpocket') {
      const profile = this.profile(state.actorId);
      if (!profile) return { ok: false, reason: 'That person is not here.' };
      const result = this.game.pickpocketRelationshipNpc(profile);
      this.dialogue(playerId, state.actorId, [result.message]);
      return { ok: result.ok, message: result.message, color: result.color };
    }
    if (
      optionId === 'tavern-rest' ||
      optionId.startsWith('campaign-') ||
      optionId === 'mayor-free-beer'
    ) {
      const result = await this.game.chooseActorInteraction(state.actorId, optionId);
      this.dialogue(playerId, state.actorId, [result.message]);
      return { ok: result.ok, message: result.message };
    }
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

  private profile(actorId: string) {
    return this.game
      .getPresentRelationshipProfilesForRoom()
      .find((profile) => profile.actorId === actorId);
  }

  private dialogue(playerId: PlayerId, actorId: string, pages: string[], dating = false): void {
    this.states.set(playerId, { id: ++this.nextId, actorId, kind: 'dialogue', pages, dating });
  }

  private clear(playerId: PlayerId): void {
    this.datingSequences.delete(playerId);
    const state = this.states.get(playerId);
    const offered =
      state?.kind === 'quest' ? { id: state.questId, large: state.large } : state?.offeredQuest;
    if (offered && !offered.large && this.game.getOfferedQuest()?.id === offered.id)
      this.game.rejectOfferedQuest();
    this.states.delete(playerId);
  }
}
