import { describe, expect, it } from 'vitest';
import { createHeadlessScenario } from '../../../test/headless/headlessScenario.js';
import { buildWorldPresentationScene } from '../../../ui/presentation/worldPresentationBuilder.js';
import { createFirstPersonSpatialView } from '../../../ui/presentation/renderSceneSpatialIndex.js';
import type { WorldVisualAssetResolver } from '../../../ui/presentation/worldVisualAssets.js';

describe('BUILD-FOUNDATION-001', () => {
  it('claims, previews, builds, collides, presents, and persists a small house', () => {
    const scenario = createHeadlessScenario({ seed: 'construction-foundation' });
    const room = scenario.currentRoom();
    room.layout = Array.from({ length: room.layout.length }, () =>
      '.'.repeat(room.layout[0]!.length),
    );
    scenario.game.moveToRoom(room.id, { x: 10, y: 15 });

    expect(scenario.beginStructurePlacement('small-house')).toBe(true);
    scenario.face({ x: 0, y: -1 });
    expect(scenario.structurePreview()?.valid).toBe(false);

    scenario.claimCurrentRoom();
    const preview = scenario.structurePreview();
    expect(preview?.valid).toBe(true);

    const placed = scenario.confirmStructurePlacement();
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(scenario.placedStructures()).toHaveLength(1);
    expect(scenario.effectiveCell(room.id, 8, 11).solid).toBe(true);
    expect(scenario.effectiveCell(room.id, 10, 14).solid).toBe(false);

    const snapshot = scenario.game.getSnapshot();
    const scene = buildWorldPresentationScene({
      rooms: [{ room: snapshot.viewport.rooms[room.id]! }],
      currentRoomId: room.id,
      grid: scenario.game.config.grid,
      snakeBody: snapshot.players[snapshot.localPlayerId]!.body,
      direction: snapshot.players[snapshot.localPlayerId]!.direction,
      assets: NULL_ASSETS,
    });
    expect(
      scene.sprites.some((sprite) => sprite.id.startsWith(`structure:${placed.structure.id}:door`)),
    ).toBe(true);
    const firstPerson = createFirstPersonSpatialView(scene, room.id);
    expect(firstPerson.getCell(8, 11)?.material.occludesVision).toBe(true);

    const reloaded = scenario.saveAndReload();
    expect(reloaded.getRoomClaim(room.id)?.ownerId).toBe('player-1');
    expect(reloaded.structure(placed.structure.id)?.id).toBe(placed.structure.id);
    expect(reloaded.effectiveCell(room.id, 8, 11).solid).toBe(true);

    reloaded.game.moveToRoom(room.id, { x: 7, y: 11 });
    reloaded.game.faceStructurePlacement({ x: 1, y: 0 });
    const collision = reloaded.game.actionStep(false);
    expect(collision.status).toBe('dead');
    if (collision.status === 'dead') {
      expect(collision.deathReason).toBe('wall');
    }
  });
});

const NULL_ASSETS: WorldVisualAssetResolver = {
  getSnakeTexture: () => ({ defaultTextureKey: '' }),
  getAppleTexture: () => ({ defaultTextureKey: '' }),
  getEnemyTexture: () => ({ defaultTextureKey: '' }),
  getNpcTexture: () => ({ defaultTextureKey: '' }),
  getAnimalTexture: () => ({ defaultTextureKey: '' }),
  getVegetationTexture: () => ({ defaultTextureKey: '' }),
  getFurnitureTexture: () => ({ defaultTextureKey: '' }),
  getPowerupTexture: () => ({ defaultTextureKey: '' }),
  getProjectileTexture: () => ({ defaultTextureKey: '' }),
  getBombTexture: () => ({ defaultTextureKey: '' }),
  getFootballTexture: () => ({ defaultTextureKey: '' }),
  getTreasureTexture: () => ({ defaultTextureKey: '' }),
  getAlchemyStationTexture: () => ({ defaultTextureKey: '' }),
};
