import { describe, expect, it } from 'vitest';
import { SnakeGame } from '../game/snakeGame.js';
import { defaultGameConfig } from '../config/gameConfig.js';
import { QuestRegistry } from '../quests/questRegistry.js';
import { AuthoritativeGameSession } from '../session/AuthoritativeGameSession.js';
import { SceneReadReplica } from '../session/SceneReadReplica.js';
import { createBaseActor } from '../actors/actorFactory.js';
import { WORLD_DAY_MS } from './farmingState.js';
import { CROPS } from './cropCatalog.js';
import { referenceRetailPrice } from '../shops/shopProfiles.js';
import type { SceneActionCommand } from '../session/SceneActionCommand.js';

function fixture() {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'agriculture-authority' } },
    new QuestRegistry(),
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  room.vegetation = [];
  game.bosses.clearAll();
  for (let i = 0; i < 20 && game.getEnemies(room.id).length; i++)
    game.damageCarImpactAt(
      room.id,
      game.getEnemies(room.id).map((enemy) => enemy.position),
    );
  game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 5 }, { x: 1, y: 0 });
  const session = new AuthoritativeGameSession({ game });
  const alice = session.registerConnection('a', 'Alice'),
    bob = session.registerConnection('b', 'Bob');
  game.runForPlayer(bob, () => game.placeSnakeBodyAtLocal(room.id, { x: 6, y: 5 }, { x: 1, y: 0 }));
  for (const id of [alice, bob])
    game.runForPlayer(id, () => {
      game.getInventory().addItem('farm-hoe');
      game.getInventory().addItem('watering-can');
      game.getInventory().addItem('seed-radish', 3);
    });
  const contextToken = (id: string) => game.runForPlayer(id, () => game.getFarmContextToken());
  const farm = (
    id: string,
    nonce: number,
    action: 'till' | 'plant' | 'water' | 'harvest',
    target = { dx: 0, dy: 0 },
  ) =>
    session.executeCommand({
      type: 'farmingAction',
      playerId: id,
      nonce,
      contextToken: contextToken(id),
      action,
      seedItemId: 'seed-radish',
      target,
    });
  return { game, session, room, alice, bob, farm, contextToken };
}

describe('agriculture real authoritative session transactions', () => {
  it('grows free wilderness crops offscreen and awards a simultaneous shared harvest exactly once', async () => {
    const { game, session, room, alice, bob, farm } = fixture();
    expect((await farm(alice, 1, 'till')).ok).toBe(true);
    expect(game.getRoomClaim()).toBeUndefined();
    expect((await farm(alice, 2, 'plant')).ok).toBe(true);
    expect((await farm(alice, 3, 'water')).ok).toBe(true);
    expect(game.getInventory().getItemCount('seed-radish')).toBe(2);
    game.runForPlayer(alice, () => game.moveToRoom('21,21,0', { x: 5, y: 5 }));
    game.updateAtmosphere(WORLD_DAY_MS);
    game.runForPlayer(alice, () => game.moveToRoom(room.id, { x: 5, y: 5 }));
    expect(game.getFarmCells()[0]?.crop?.stage).toBe('ready');
    const results = await Promise.all([
      farm(alice, 4, 'harvest'),
      farm(bob, 1, 'harvest', { dx: -1, dy: 0 }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const total = [alice, bob].reduce(
      (sum, id) =>
        sum +
        game.runForPlayer(id, () =>
          game
            .getInventory()
            .getAllItems()
            .filter(([id]) => id.startsWith('produce-radish'))
            .reduce((sum, [, count]) => sum + count, 0),
        ),
      0,
    );
    expect(total).toBe(2);
    expect(game.getFarmCells()[0]?.crop).toBeUndefined();
    session.refreshSnapshot();
    const replica = new SceneReadReplica(
      game.config,
      new QuestRegistry(),
      session.getSnapshot(bob),
    );
    expect(replica.game.getFarmCells()).toEqual(game.getFarmCells());
    expect(() => replica.game.performFarmAction({ action: 'till' })).toThrow(
      'Client replica cannot execute',
    );
  });
  it('retries cannot plant twice, consume two seeds or repeat a watering action', async () => {
    const { game, alice, farm } = fixture();
    await farm(alice, 1, 'till');
    await farm(alice, 2, 'plant');
    await farm(alice, 2, 'plant');
    expect(game.getInventory().getItemCount('seed-radish')).toBe(2);
    await farm(alice, 3, 'water');
    await farm(alice, 3, 'water');
    expect(game.getFlag('farm.canCharges')).toBe(7);
    const old = await farm(alice, 1, 'till');
    expect(old.ok).toBe(false);
    expect(game.getFarmCells()).toHaveLength(1);
  });
  it('rejects a menu choice after an authoritative room change', async () => {
    const { game, session, alice, contextToken } = fixture();
    const token = contextToken(alice);
    game.moveToRoom('21,21,0', { x: 5, y: 5 });
    const result = await session.executeCommand({
      type: 'farmingAction',
      action: 'till',
      playerId: alice,
      nonce: 1,
      contextToken: token,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('changed rooms');
    expect(game.getFarmRoomIds()).toHaveLength(0);
  });
  it('blocks deliberate farming and construction steps through other snakes and solid terrain', async () => {
    const { game, session, room, alice } = fixture();
    const position = () =>
      game.runForPlayer(alice, () => game.resolveRoomPosition(game.getSnakeBody()[0]!));
    expect(position()?.localX).toBe(5);
    expect(position()?.localY).toBe(5);

    expect(
      (await session.executeCommand({ type: 'useItem', itemId: 'farm-hoe', playerId: alice })).ok,
    ).toBe(true);
    const blockedFarm = await session.executeCommand({
      type: 'farmToolAction',
      action: 'step',
      direction: { x: 1, y: 0 },
      playerId: alice,
    });
    expect(blockedFarm.ok).toBe(false);
    expect(blockedFarm.message).toContain('player');
    expect(position()?.localX).toBe(5);

    expect(
      (await session.executeCommand({
        type: 'construction',
        action: 'begin',
        blueprintId: 'farm-fence',
        playerId: alice,
      })).ok,
    ).toBe(true);
    const blockedBuild = await session.executeCommand({
      type: 'construction',
      action: 'step',
      direction: { x: 1, y: 0 },
      playerId: alice,
    });
    expect(blockedBuild.ok).toBe(false);
    expect(blockedBuild.message).toContain('player');
    expect(position()?.localX).toBe(5);
    expect(game.getStructurePlacement()).not.toBeNull();

    const originalRow = room.layout[4]!;
    room.layout[4] = originalRow.slice(0, 5) + '#' + originalRow.slice(6);
    const wall = await session.executeCommand({
      type: 'construction',
      action: 'step',
      direction: { x: 0, y: -1 },
      playerId: alice,
    });
    expect(wall.ok).toBe(false);
    expect(position()?.localY).toBe(5);
    room.layout[4] = originalRow;

    const safe = await session.executeCommand({
      type: 'construction',
      action: 'step',
      direction: { x: 0, y: -1 },
      playerId: alice,
    });
    expect(safe.ok).toBe(true);
    expect(position()?.localY).toBe(4);
    expect(
      (await session.executeCommand({
        type: 'construction',
        action: 'cancel',
        playerId: alice,
      })).ok,
    ).toBe(true);
    expect(game.getStructurePlacement()).toBeNull();
  });

  it('charges exact claim price once, refuses a rival owner, and releases without a refund', async () => {
    const { game, session, alice, bob, contextToken } = fixture();
    game.setScore(40);
    const claim: SceneActionCommand = {
      type: 'territoryAction',
      action: 'claimCurrentRoom',
      playerId: alice,
      nonce: 1,
      contextToken: contextToken(alice),
    };
    expect((await session.executeCommand(claim)).ok).toBe(true);
    expect(game.getScore()).toBe(0);
    expect((await session.executeCommand(claim)).ok).toBe(true);
    expect(game.getScore()).toBe(0);
    expect(
      (await session.executeCommand({ ...claim, playerId: bob, contextToken: contextToken(bob) }))
        .ok,
    ).toBe(false);
    expect(game.getRoomClaim()?.ownerId).toBe(alice);
    expect(
      (
        await session.executeCommand({
          type: 'territoryAction',
          action: 'releaseCurrentRoom',
          confirmed: true,
          playerId: alice,
          nonce: 2,
          contextToken: contextToken(alice),
        })
      ).ok,
    ).toBe(true);
    expect(game.getRoomClaim()).toBeUndefined();
    expect(game.getScore()).toBe(0);
  });
  it('uses a reusable claim flag to activate land mode without bypassing authoritative pricing', async () => {
    const { game, session, alice, contextToken } = fixture();
    game.runForPlayer(alice, () => {
      game.getInventory().addItem('claim-flag');
      const selected = game.useInventoryItem('claim-flag');
      expect(selected.ok).toBe(true);
      expect(selected.consume).toBe(false);
      expect(game.getFarmTool()).toBe('claim-flag');
      game.setScore(40);
    });

    const claim = {
      type: 'territoryAction' as const,
      action: 'claimCurrentRoom' as const,
      playerId: alice,
      nonce: 1,
      contextToken: contextToken(alice),
    };
    expect((await session.executeCommand(claim)).ok).toBe(true);
    expect(game.getRoomClaim()?.ownerId).toBe(alice);
    expect(game.runForPlayer(alice, () => game.getScore())).toBe(0);
    expect(
      game.runForPlayer(alice, () => game.getInventory().getItemCount('claim-flag')),
    ).toBe(1);

    // A fresh valid request on owned land does not buy the same room twice.
    expect((await session.executeCommand({ ...claim, nonce: 2 })).ok).toBe(true);
    expect(game.runForPlayer(alice, () => game.getScore())).toBe(0);
    expect(
      (await session.executeCommand({
        type: 'farmToolAction',
        action: 'exit',
        playerId: alice,
      })).ok,
    ).toBe(true);
    expect(game.runForPlayer(alice, () => game.getFarmTool())).toBeUndefined();
  });

  it('separate farm and harvest grants survive a real checkpoint round trip', async () => {
    const { game, session, alice, bob, contextToken, farm } = fixture();
    game.setScore(40);
    await session.executeCommand({
      type: 'territoryAction',
      action: 'claimCurrentRoom',
      playerId: alice,
      nonce: 1,
      contextToken: contextToken(alice),
    });
    expect((await farm(bob, 1, 'till')).ok).toBe(false);
    await session.executeCommand({
      type: 'territoryAction',
      action: 'grant',
      granteePlayerId: bob,
      permission: 'farm',
      playerId: alice,
      nonce: 2,
      contextToken: contextToken(alice),
    });
    expect((await farm(bob, 2, 'till')).ok).toBe(true);
    expect((await farm(bob, 3, 'plant')).ok).toBe(true);
    await farm(bob, 4, 'water');
    game.updateAtmosphere(WORLD_DAY_MS);
    expect((await farm(bob, 5, 'harvest')).ok).toBe(false);
    const saved = game.getSaveData();
    expect(
      saved.construction?.claims?.find((claim) => claim.ownerId === alice)?.access?.[bob],
    ).toEqual(['farm']);
    expect(game.loadFromSaveData(saved)).toBe(true);
    expect(game.getRoomClaim()?.access?.[bob]).toEqual(['farm']);
    expect(game.getFarmingState().actions?.find((action) => action.playerId === bob)?.nonce).toBe(
      5,
    );
  });
  it('buys seasonal seed stock, grows produce with inventory tools, and sells it through the session', async () => {
    const { game, session, room, alice, contextToken } = fixture();
    const merchant = createBaseActor({
      id: 'farm-loop-merchant',
      displayName: 'Farm Loop Merchant',
      kind: 'civilian',
      role: 'shopkeeper',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    merchant.presence = {
      roomId: room.id,
      position: { x: 5, y: 6 },
      materialized: true,
      stationary: true,
    };
    game.getActorSystem().registry.upsert(merchant);
    game.runForPlayer(alice, () => {
      game.getInventory().removeItem('seed-radish', 3);
      game.setScore(200);
    });

    // Use actual seasonal merchant stock rather than assuming a particular seed is on the shelf.
    const shelf = game.runForPlayer(alice, () => game.getActorShopView(merchant.id)?.offers ?? []);
    const choice = shelf
      .map((offer) => ({ offer, crop: CROPS.find((crop) => crop.seedItemId === offer.itemId) }))
      .find((entry) => entry.crop && !entry.crop.specialty && !entry.crop.contraband);
    expect(choice?.crop).toBeDefined();
    const crop = choice!.crop!;
    const seedOffer = choice!.offer;
    expect(seedOffer.quantity).toBeGreaterThanOrEqual(2);
    const buy = await session.executeCommand({
      type: 'purchase',
      actorId: merchant.id,
      offerId: seedOffer.id,
      count: 2,
      playerId: alice,
    });
    expect(buy.ok).toBe(true);
    expect(game.runForPlayer(alice, () => game.getScore())).toBe(200 - seedOffer.price * 2);
    expect(
      game.runForPlayer(alice, () => game.getInventory().getItemCount(crop.seedItemId)),
    ).toBe(2);

    const use = (itemId: string) =>
      session.executeCommand({ type: 'useItem', itemId, playerId: alice });
    const tend = (nonce: number, action: 'till' | 'plant' | 'water' | 'harvest') =>
      session.executeCommand({
        type: 'farmingAction',
        action,
        target: { dx: 0, dy: 0 },
        seedItemId: crop.seedItemId,
        nonce,
        contextToken: contextToken(alice),
        playerId: alice,
      });

    expect((await use('farm-hoe')).ok).toBe(true);
    expect(game.runForPlayer(alice, () => game.getFarmTool())).toBe('farm-hoe');
    expect((await tend(1, 'till')).ok).toBe(true);
    expect((await use(crop.seedItemId)).ok).toBe(true);
    expect(game.runForPlayer(alice, () => game.getFarmTool())).toBe(crop.seedItemId);
    expect((await tend(2, 'plant')).ok).toBe(true);
    expect((await use('watering-can')).ok).toBe(true);
    expect((await tend(3, 'water')).ok).toBe(true);

    game.updateAtmosphere(WORLD_DAY_MS * 4);
    expect(game.getFarmCells()[0]?.crop?.stage).toBe('ready');
    expect((await tend(4, 'harvest')).ok).toBe(true);
    const produce = game.runForPlayer(alice, () =>
      game.getInventory().getAllItems().find(([itemId]) =>
        itemId === crop.produceItemId || itemId.startsWith(`${crop.produceItemId}-`),
      ),
    );
    expect(produce?.[1]).toBe(crop.yield);
    const quote = game.runForPlayer(alice, () =>
      game.getMerchantSellOffers(merchant.id).find((offer) => offer.itemId === produce?.[0]),
    );
    expect(quote?.price).toBeGreaterThan(0);
    const scoreBeforeSell = game.runForPlayer(alice, () => game.getScore());
    const sale = {
      type: 'farmSellAction' as const,
      merchantActorId: merchant.id,
      itemId: produce![0],
      count: crop.yield,
      nonce: 5,
      contextToken: contextToken(alice),
      playerId: alice,
    };
    expect((await session.executeCommand(sale)).ok).toBe(true);
    expect(game.runForPlayer(alice, () => game.getScore())).toBe(
      scoreBeforeSell + quote!.price * crop.yield,
    );
    expect(
      game.runForPlayer(alice, () => game.getInventory().getItemCount(produce![0])),
    ).toBe(0);
    await session.executeCommand(sale);
    expect(game.runForPlayer(alice, () => game.getScore())).toBe(
      scoreBeforeSell + quote!.price * crop.yield,
    );
  });

  it('merchant transactions consume actual ordinary/contraband produce and preserve quality premiums', () => {
    const { game, room } = fixture();
    const merchant = createBaseActor({
      id: 'farm-merchant',
      displayName: 'Farm Merchant',
      kind: 'civilian',
      role: 'shopkeeper',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    merchant.presence = {
      roomId: room.id,
      position: { x: 5, y: 6 },
      materialized: true,
      stationary: true,
    };
    game.getActorSystem().registry.upsert(merchant);
    game.getInventory().addItem('produce-radish-excellent', 2);
    game.setScore(0);
    expect(game.sellFarmProduce(merchant.id, 'produce-radish-excellent', -1).ok).toBe(false);
    expect(game.sellFarmProduce(merchant.id, 'produce-radish-excellent', 3).ok).toBe(false);
    expect(game.getScore()).toBe(0);
    expect(game.sellFarmProduce(merchant.id, 'produce-radish-excellent', 2).ok).toBe(true);
    expect(game.getScore()).toBe(6);
    expect(game.getInventory().getItemCount('produce-radish-excellent')).toBe(0);
    expect(game.sellFarmProduce(merchant.id, 'produce-radish-excellent', 2).ok).toBe(false);
    expect(game.getScore()).toBe(6);
    game.getInventory().addItem('cannabis-bud', 2);
    // All merchants buy saleable goods; a specialist pays more for their category.
    expect(
      game.getMerchantSellOffers(merchant.id).find((offer) => offer.itemId === 'cannabis-bud')
        ?.price,
    ).toBe(15);
    expect(game.sellFarmProduce(merchant.id, 'cannabis-bud', 1).ok).toBe(true);
    expect(game.getScore()).toBe(21);
    game.getActorSystem().registry.update(merchant.id, (actor) => ({
      ...actor,
      role: 'blackMarketMerchant',
      shopProfileId: 'black-market',
    }));
    expect(
      game.getMerchantSellOffers(merchant.id).find((offer) => offer.itemId === 'cannabis-bud')
        ?.price,
    ).toBeGreaterThan(15);
    expect(game.sellFarmProduce(merchant.id, 'cannabis-bud', 1).ok).toBe(true);
    expect(game.getInventory().getItemCount('cannabis-bud')).toBe(0);
    expect(game.getScore()).toBeGreaterThan(36);
  });
  it('gives specialist merchants a premium, but never lets resale beat purchase price', () => {
    const { game, room } = fixture();
    const merchant = createBaseActor({
      id: 'potion-merchant',
      displayName: 'Potion Merchant',
      kind: 'civilian',
      role: 'shopkeeper',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    merchant.presence = {
      roomId: room.id,
      position: { x: 5, y: 6 },
      materialized: true,
      stationary: true,
    };
    game.getActorSystem().registry.upsert(merchant);
    game.getInventory().addItem('healing-potion', 2);
    const ordinary = game
      .getMerchantSellOffers(merchant.id)
      .find((offer) => offer.itemId === 'healing-potion');
    expect(ordinary?.price).toBeGreaterThan(0);
    game.getActorSystem().registry.update(merchant.id, (actor) => ({
      ...actor,
      role: 'potionMaker',
      shopProfileId: 'potion-maker',
    }));
    const specialist = game
      .getMerchantSellOffers(merchant.id)
      .find((offer) => offer.itemId === 'healing-potion');
    expect(specialist?.specialty).toBe(true);
    expect(specialist?.price).toBeGreaterThan(ordinary!.price);
    expect(specialist!.price).toBeLessThan(referenceRetailPrice('healing-potion')!);
  });

  it.each(CROPS.filter((crop) => !crop.contraband).map((crop) => crop.id))(
    'ordinary crop %s has a real vendor sale',
    (cropId) => {
      const { game, room } = fixture();
      const crop = CROPS.find((crop) => crop.id === cropId)!;
      const merchant = createBaseActor({
        id: 'produce-buyer',
        displayName: 'Buyer',
        kind: 'civilian',
        role: 'shopkeeper',
        species: 'human',
        thickness: 'medium',
        currentRoomId: room.id,
      });
      merchant.presence = {
        roomId: room.id,
        position: { x: 5, y: 6 },
        materialized: true,
        stationary: true,
      };
      game.getActorSystem().registry.upsert(merchant);
      game.getInventory().addItem(crop.produceItemId);
      const before = game.getScore();
      expect(game.sellFarmProduce(merchant.id, crop.produceItemId, 1).ok).toBe(true);
      expect(game.getScore()).toBe(before + crop.value);
      expect(game.getInventory().getItemCount(crop.produceItemId)).toBe(0);
    },
  );
});
