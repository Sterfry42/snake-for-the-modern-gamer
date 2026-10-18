import type { SnakeGame } from '../game/snakeGame.js';
import type { CommandResult } from './ClientCommand.js';
import type { SceneActionCommand } from './SceneActionCommand.js';
import type { GlobalWeather } from '../world/atmosphereTypes.js';
import { MANEUVER_DEFINITIONS } from '../maneuvers/maneuverCatalog.js';

/** Called only inside the session queue and the attached player's context. */
export function executeSceneGameplayAction(
  game: SnakeGame,
  command: Exclude<
    SceneActionCommand,
    {
      type:
        | 'playerInteraction'
        | 'manualStep'
        | 'progressionAction'
        | 'vehicleAction'
        | 'minigameAction';
    }
  >,
): CommandResult {
  switch (command.type) {
    case 'manualReturn':
      return { ok: game.returnFromManualResumePause() };
    case 'companionAction': {
      const result =
        command.action === 'feed'
          ? game.feedAnimalCompanionById(command.companionId)
          : game.releaseAnimalCompanion(command.companionId);
      return { ok: result.ok, message: result.message };
    }
    case 'combatAction': {
      if (command.action === 'fire') return { ok: game.firePlayerShot(command.direction) };
      const result = game.throwBombToward(command.direction);
      return { ok: result.ok, message: result.message, color: result.color };
    }
    case 'maneuverAction': {
      if (command.action === 'equip') {
        const definition = MANEUVER_DEFINITIONS.find((entry) => entry.id === command.id);
        const result = definition ? game.equipManeuver(definition.id) : null;
        return { ok: result?.ok ?? false, message: result?.message };
      }
      const result =
        command.action === 'activate'
          ? game.activateManeuver(command.direction)
          : game.cycleDigestiveMode();
      return { ok: result.ok, message: result.message };
    }
    case 'inventoryAction': {
      if (command.action === 'cook') return game.cookRecipe(command.recipeId);
      const inventory = game.getInventory();
      return {
        ok:
          command.action === 'equip'
            ? inventory.equip(command.itemId)
            : inventory.unequip(command.slot),
      };
    }
    case 'purchase': {
      if (!game.canInteractWithActor(command.actorId))
        return { ok: false, reason: 'Move closer to shop.' };
      const result = game.purchaseActorShopOffer(command.actorId, command.offerId);
      return { ok: result.ok, reason: result.ok ? undefined : result.message };
    }
    case 'relationshipAction': {
      if (!game.canInteractWithActor(command.actorId))
        return { ok: false, reason: 'Move closer to interact.' };
      const profile = game
        .getPresentRelationshipProfilesForRoom()
        .find((candidate) => candidate.actorId === command.actorId);
      if (!profile) return { ok: false, reason: 'That person is not here.' };
      if (!game.getRelationshipActions(profile).includes(command.choice))
        return { ok: false, reason: 'That relationship action is not available.' };
      const result = game.applyRelationshipChoice(profile, command.choice);
      return { ok: result.ok, reason: result.ok ? undefined : result.message };
    }
    case 'questAction': {
      const ok = game.setActiveQuestMarkerQuestId(command.questId ?? undefined);
      return { ok, reason: ok ? undefined : 'That quest is not active.' };
    }
    case 'specialAction':
      if (command.action === 'preview')
        return { ok: game.previewSpecialStatChange(command.statId, command.delta) };
      if (command.action === 'apply') game.applySpecialStatPreview();
      else game.resetSpecialStatPreview();
      return { ok: true };
    case 'debugAction': {
      const order: GlobalWeather[] = [
        'clear',
        'rain',
        'storm',
        'fog',
        'heatwave',
        'coldfront',
        'wind',
      ];
      const current = game.getAtmosphereState().globalWeather;
      const next = order[(order.indexOf(current) + 1 + order.length) % order.length] ?? 'clear';
      game.forceAtmosphereWeather(next);
      return { ok: true };
    }
    case 'construction':
      return executeConstructionAction(game, command);
  }
}

function executeConstructionAction(
  game: SnakeGame,
  command: Extract<SceneActionCommand, { type: 'construction' }>,
): CommandResult {
  switch (command.action) {
    case 'claim': {
      const claim = game.getRoomClaim();
      if (claim && claim.ownerId !== command.playerId)
        return { ok: false, reason: 'This room is already claimed.' };
      game.claimRoom();
      return { ok: true };
    }
    case 'begin':
      return { ok: game.beginStructurePlacement(command.blueprintId) };
    case 'step':
      game.stepStructurePlacement(command.direction);
      return { ok: Boolean(game.getStructurePlacement()) };
    case 'face':
      if (!game.getStructurePlacement()) return { ok: false, reason: 'No active placement.' };
      game.faceStructurePlacement(command.direction);
      return { ok: true };
    case 'confirm':
      return { ok: game.confirmStructurePlacement().ok };
    case 'cancel':
      game.cancelStructurePlacement();
      return { ok: true };
    case 'demolish': {
      const structure = game.placedStructure(command.structureId);
      if (!structure || structure.roomId !== game.getCurrentRoom().id)
        return { ok: false, reason: 'That structure is not here.' };
      return { ok: game.demolishStructure(command.structureId) };
    }
  }
}
