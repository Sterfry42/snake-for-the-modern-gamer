import { executeGuildAction } from './GuildActions.js';
import { executeSpecialShopAction } from './SpecialShopActions.js';
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
        | 'deathEncounterAction'
        | 'characterCreationAction'
        | 'playerInteraction'
        | 'manualStep'
        | 'progressionAction'
        | 'vehicleAction'
        | 'minigameAction'
        | 'actorAction'
        | 'datingAction'
        | 'archaeologyAction';
    }
  >,
): CommandResult {
  switch (command.type) {
    case 'guildAction':
      return executeGuildAction(game, command);
    case 'specialShopAction':
      return executeSpecialShopAction(game, command);
    case 'cosmeticAction': {
      const player = game.getPlayer(command.playerId);
      if (!player) return { ok: false, reason: 'Unknown player.' };
      const { themeId, activeHat, renderStyle, palette } = command.appearance;
      player.cosmetics = {
        ...player.cosmetics,
        appearance: {
          themeId,
          activeHat,
          renderStyle,
          palette: {
            baseColor: palette.baseColor,
            bellyColor: palette.bellyColor,
            patternColor: palette.patternColor,
            outlineColor: palette.outlineColor,
            eyeColor: palette.eyeColor,
          },
        },
      };
      return { ok: true };
    }
    case 'worldInteraction': {
      switch (command.action) {
        case 'trainer-equip':
          return game.buyManeuverFromCurrentTrainer(true);
        case 'trainer-learn':
          return game.buyManeuverFromCurrentTrainer(false);
        case 'insult': {
          const room = game.getCurrentRoom();
          const giver = room.questGiver;
          const head = game.getSnakeBody()[0];
          const position = head && game.resolveRoomPosition(head);
          if (
            !giver ||
            !position ||
            Math.abs(position.localX - giver.x) + Math.abs(position.localY - giver.y) > 1
          )
            return { ok: false, reason: 'No quest giver nearby.' };
          return { ok: true, npcDisposition: game.insultNpc(room.id) };
        }
        case 'garden':
          return game.interactHouseGarden();
        case 'alchemy':
          return command.optionId
            ? game.chooseAlchemyStationInteraction(command.optionId)
            : { ok: false, reason: 'Choose a brew.' };
        case 'town-door':
          return game.enterNearbyTownBuildingDoor();
        case 'town-grate':
          return game.investigateCurrentTownGuildGrate();
        case 'open-gate':
          return game.openCurrentTownGate();
        case 'quest-target': {
          const result = game.resolveQuestInteraction(command.optionId);
          return { ok: !result.failed, message: result.message, questInteractionResult: result };
        }
        case 'quest-giver': {
          const room = game.getCurrentRoom();
          if (!room.questGiver) return { ok: false, reason: 'No quest giver here.' };
          const head = game.getSnakeBody()[0];
          const info = head && game.resolveRoomPosition(head);
          if (
            !info ||
            Math.abs(info.localX - room.questGiver.x) + Math.abs(info.localY - room.questGiver.y) >
              1
          )
            return { ok: false, reason: 'Move closer to the quest giver.' };
          const request = game.requestQuestFromGiver(room.id);
          return {
            ok: true,
            questRequest: {
              state: request.state,
              quest: request.quest
                ? {
                    id: request.quest.id,
                    label: request.quest.label,
                    description: request.quest.description,
                  }
                : null,
            },
          };
        }
        case 'cave-gift':
          return { ok: true, caveGift: game.claimCaveDwellerReward() };
      }
    }
    case 'questDecision': {
      if (game.getOfferedQuest()?.id !== command.questId)
        return { ok: false, reason: 'That quest offer is no longer current.' };
      if (command.action === 'reject') {
        game.rejectOfferedQuest();
        return { ok: true };
      }
      return { ok: Boolean(game.acceptOfferedQuest()) };
    }
    case 'randomEncounterAction': {
      const encounter = game.getForcedEncounter();
      if (!encounter || encounter.token !== command.token)
        return { ok: false, reason: 'That encounter is no longer current.' };
      return {
        ok: true,
        encounterResult: game.resolveRandomEncounter(command.action === 'accept'),
      };
    }
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
      if (command.action === 'fire') {
        const ok = game.firePlayerShot(command.direction);
        return ok ? { ok } : { ok, reason: 'shot-unavailable' };
      }
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
      return {
        ok: result.ok,
        reason: result.ok ? undefined : result.message,
        message: result.message,
      };
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
      return {
        ok: result.ok,
        reason: result.ok ? undefined : result.message,
        relationshipResult: result,
      };
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
