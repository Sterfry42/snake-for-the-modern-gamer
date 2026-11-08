import type { SnakeGame } from '../game/snakeGame.js';
import type { GameConnection } from '../session/GameConnection.js';
import type { SceneActionCommand } from '../session/SceneActionCommand.js';
import type { ChoicePopup } from './choicePopup.js';
import type { NormalizedChoiceOption } from './choicePopupModel.js';
import { CROPS, FARM_RECIPES, resolveProduce } from '../farming/cropCatalog.js';
import { describeFarmCell } from '../farming/farmingActions.js';
import { STRUCTURE_BLUEPRINTS } from '../building/structureBlueprint.js';

type AgricultureCommand = Extract<
  SceneActionCommand,
  { type: 'farmingAction' | 'territoryAction' | 'farmSellAction' | 'houseAction' }
>;
type AgricultureIntent = AgricultureCommand extends infer T
  ? T extends AgricultureCommand
    ? Omit<T, 'playerId' | 'nonce' | 'contextToken'>
    : never
  : never;

/** One menu for local and connected play. Every mutation travels through the command boundary. */
export class FarmingMenu {
  private nonce = 0;
  private active = false;
  isOpen(): boolean {
    return this.active;
  }
  getTarget() {
    return this.active ? { ...this.target } : undefined;
  }
  private target = { dx: 0, dy: 0 };
  constructor(
    private readonly game: () => SnakeGame,
    private readonly connection: () => GameConnection,
    private readonly popup: ChoicePopup,
    private readonly notify: (message: string) => void,
  ) {}
  async open(): Promise<void> {
    this.active = true;
    await this.connection().send({
      type: 'playerInteraction',
      playerId: this.game().getLocalPlayerId(),
      mode: 'manual',
    });
    this.root();
  }
  purchaseHouse(kind: Extract<SceneActionCommand, { type: 'houseAction' }>['kind']) {
    return this.transact({ type: 'houseAction', kind });
  }
  private async transact(intent: AgricultureIntent) {
    const game = this.game(),
      playerId = game.getLocalPlayerId();
    const saved =
      game.getFarmingState([]).actions?.find((action) => action.playerId === playerId)?.nonce ?? 0;
    const previous = Math.max(this.nonce, saved);
    this.nonce = previous + 1;
    const command: AgricultureCommand = {
      ...intent,
      nonce: this.nonce,
      playerId,
      contextToken: game.getFarmContextToken(),
    };
    const result = await this.connection().send(command);
    this.nonce = result.agricultureNonce ?? previous;
    return result;
  }
  private async send(intent: AgricultureIntent): Promise<void> {
    const result = await this.transact(intent);
    this.notify(result.message ?? result.reason ?? (result.ok ? 'Done.' : 'Action rejected.'));
    this.root();
  }
  private root(): void {
    const game = this.game(),
      room = game.getCurrentRoom();
    const head = game.getSnakeBody()[0],
      position = head && game.resolveRoomPosition(head);
    const cell =
      position &&
      game
        .getFarmCells()
        .find(
          (cell) =>
            cell.x === position.localX + this.target.dx &&
            cell.y === position.localY + this.target.dy,
        );
    const claim = game.getRoomClaim();
    const options: NormalizedChoiceOption[] = [
      {
        id: 'target',
        title: `Target: ${this.target.dx}, ${this.target.dy} from head`,
        description: cell
          ? describeFarmCell(cell, cell.substrate === 'artificial')
          : 'Untilled ground. Suitable unclaimed wilderness is free to cultivate.',
      },
      ...(
        [
          'till',
          'water',
          'harvest',
          'inspect',
          'weed',
          'compost',
          'refillCan',
          'magicBed',
          'toggleGate',
          'reinforce',
        ] as const
      ).map((action) => ({
        id: action,
        title: action === 'refillCan' ? 'Refill watering can' : action,
        description:
          action === 'water'
            ? `${game.getFlag<number>('farm.canCharges') ?? 8}/8 charges; +50 moisture.`
            : 'Authority checks terrain, tools, access and current crop state.',
      })),
      {
        id: 'plant',
        title: 'Plant seeds',
        description: 'Select an owned seed. One seed per successful plant.',
      },
      { id: 'clear', title: 'Clear crop…', description: 'Deliberate removal; awards no produce.' },
      {
        id: 'territory',
        title: `Territory: ${claim?.ownerId ?? 'unclaimed'}`,
        description:
          'Purchase, release, grant separate farm/harvest/build rights, or designate a community bed.',
      },
      {
        id: 'build',
        title: 'Structures & defenses',
        description: 'Preview is free; score is charged only on successful placement confirmation.',
      },
      {
        id: 'journal',
        title: 'Crop journal',
        description: `${game.getAtmosphereState().season}; ${game.getAtmosphereForRoom().localVisual}. Seeds, climate, seasons, uses and incidents.`,
      },
      {
        id: 'sell',
        title: 'Sell produce',
        description:
          'Choose actual goods and a nearby open merchant. Contraband requires a black market.',
      },
      {
        id: 'cook',
        title: 'Cook farm recipes',
        description: 'Requires a nearby cooking source and one produce item of any quality.',
      },
      {
        id: 'leave',
        title: 'Leave Farming · resume movement',
        description: 'Close Farming. World time continues while tending.',
      },
    ];
    this.popup.show(`Farming · ${room.id}`, options, (id) => {
      if (id === 'leave') {
        this.active = false;
        void this.connection().send({
          type: 'playerInteraction',
          playerId: game.getLocalPlayerId(),
          mode: 'playing',
        });
        return;
      }
      if (id === 'target') {
        this.chooseTarget();
        return;
      }
      if (id === 'plant') {
        this.seeds();
        return;
      }
      if (id === 'journal') {
        this.journal();
        return;
      }
      if (id === 'territory') {
        this.territory();
        return;
      }
      if (id === 'build') {
        this.build();
        return;
      }
      if (id === 'sell') {
        this.sell();
        return;
      }
      if (id === 'cook') {
        this.cook();
        return;
      }
      if (id === 'clear') {
        this.popup.show(
          'Clear living crop?',
          [
            { id: 'yes', title: 'Confirm removal', description: 'No produce or score reward.' },
            { id: 'no', title: 'Cancel', description: 'Keep the crop.' },
          ],
          (choice) =>
            choice === 'yes'
              ? void this.send({
                  type: 'farmingAction',
                  action: 'clear',
                  confirmed: true,
                  target: this.target,
                })
              : this.root(),
        );
        return;
      }
      const action = [
        'till',
        'water',
        'harvest',
        'inspect',
        'weed',
        'compost',
        'refillCan',
        'magicBed',
        'toggleGate',
        'reinforce',
      ].find((action) => action === id);
      if (
        action === 'till' ||
        action === 'water' ||
        action === 'harvest' ||
        action === 'inspect' ||
        action === 'weed' ||
        action === 'compost' ||
        action === 'refillCan' ||
        action === 'magicBed' ||
        action === 'toggleGate' ||
        action === 'reinforce'
      )
        void this.send({ type: 'farmingAction', action, target: this.target });
    });
  }
  private chooseTarget(): void {
    const targets = [
      { dx: 0, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    this.popup.show(
      'Choose stationary target',
      targets.map((target, i) => ({
        id: String(i),
        title: ['Head', 'North', 'East', 'South', 'West'][i] ?? '',
        description: `${target.dx}, ${target.dy}`,
      })),
      (id) => {
        const target = targets[Number(id)];
        if (target) this.target = target;
        this.root();
      },
    );
  }
  private seeds(): void {
    this.popup.show(
      'Plant owned seeds',
      [
        ...CROPS.map((crop) => ({
          id: crop.seedItemId,
          title: `${crop.label}: ${this.game().getInventory().getItemCount(crop.seedItemId)}`,
          description: `${crop.seasons.join('/')}, ${crop.growDays} world days. ${crop.specialty ? 'Specialty substrate required.' : ''}`,
          disabled: this.game().getInventory().getItemCount(crop.seedItemId) < 1,
        })),
        { id: 'back', title: 'Back', description: '' },
      ],
      (id) =>
        id === 'back'
          ? this.root()
          : void this.send({
              type: 'farmingAction',
              action: 'plant',
              seedItemId: id,
              target: this.target,
            }),
    );
  }
  private journal(): void {
    this.popup.show(
      'Crop journal',
      [
        ...CROPS.map((crop) => ({
          id: crop.id,
          title: `${crop.label} · ${crop.contraband ? 'contraband' : 'ordinary food/ingredient'}`,
          description: `${crop.seasons.join('/')}; ${crop.growDays} days${crop.regrowDays ? `; regrow ${crop.regrowDays}` : ''}; yield ${crop.yield}; value ${crop.value}/1.25× good/1.6× excellent. Prefers ${crop.preferredTags.join(', ')}. ${crop.contraband ? 'Black-market seeds and buyer.' : 'General merchant seeds; eat/cook/sell.'}`,
        })),
        ...this.game()
          .getFarmingState([])
          .incidents.slice(-10)
          .map((event) => ({
            id: event.id,
            title: `Day ${event.worldDay} · ${event.roomId}`,
            description: event.summary,
          })),
        { id: 'back', title: 'Back', description: '' },
      ],
      () => this.root(),
    );
  }
  private territory(): void {
    const game = this.game(),
      claim = game.getRoomClaim(),
      peers = game.getPlayers().filter((player) => player.id !== game.getLocalPlayerId());
    const options: NormalizedChoiceOption[] = [
      {
        id: 'claim',
        title: `Claim this room · ${40 + 20 * game.getRoomClaims().filter((claim) => claim.ownerId === game.getLocalPlayerId()).length} score`,
        description:
          'Eligible wilderness only; clear hostiles first. Existing ownership costs nothing.',
      },
      {
        id: 'release',
        title: 'Release claim…',
        description: 'No refund. Demolish structures first. Existing crops become public.',
      },
      {
        id: 'community',
        title: 'Designate head cell as community bed',
        description: 'Current mayor of this town only; protects roads and landmarks.',
      },
      ...peers.flatMap((player) =>
        (['farm', 'harvest', 'build', 'demolish'] as const).map((permission) => ({
          id: `${player.id}:${permission}`,
          title: `${claim?.access?.[player.id]?.includes(permission) ? 'Revoke' : 'Grant'} ${permission}: ${player.name ?? player.id}`,
          description: 'Each permission is independent.',
        })),
      ),
      { id: 'back', title: 'Back', description: '' },
    ];
    this.popup.show('Territory', options, (id) => {
      if (id === 'back') return this.root();
      if (id === 'claim')
        return void this.send({ type: 'territoryAction', action: 'claimCurrentRoom' });
      if (id === 'community')
        return void this.send({ type: 'territoryAction', action: 'designateMunicipalFarm' });
      if (id === 'release')
        return this.popup.show(
          'Release without refund?',
          [
            {
              id: 'yes',
              title: 'Confirm release',
              description: 'Crops become publicly harvestable.',
            },
            { id: 'no', title: 'Cancel', description: '' },
          ],
          (choice) =>
            choice === 'yes'
              ? void this.send({
                  type: 'territoryAction',
                  action: 'releaseCurrentRoom',
                  confirmed: true,
                })
              : this.root(),
        );
      const player = peers.find((player) => id.startsWith(`${player.id}:`));
      const permission = ['farm', 'harvest', 'build', 'demolish'].find(
        (permission) => id === `${player?.id}:${permission}`,
      );
      if (
        player &&
        (permission === 'farm' ||
          permission === 'harvest' ||
          permission === 'build' ||
          permission === 'demolish')
      )
        void this.send({
          type: 'territoryAction',
          action: claim?.access?.[player.id]?.includes(permission) ? 'revoke' : 'grant',
          granteePlayerId: player.id,
          permission,
        });
    });
  }
  private build(): void {
    this.popup.show(
      'Place structure',
      [
        ...STRUCTURE_BLUEPRINTS.filter((blueprint) => blueprint.price !== undefined).map(
          (blueprint) => ({
            id: blueprint.id,
            title: `${blueprint.name} · ${blueprint.price} score`,
            description:
              blueprint.id === 'sprinkler'
                ? 'Dawn watering within 2 cells; must be adjacent to water.'
                : 'Requires build-authorized land. Move/face the preview, interact to confirm, Escape to cancel.',
          }),
        ),
        { id: 'back', title: 'Back', description: '' },
      ],
      (id) => {
        if (id === 'back') return this.root();
        this.active = false;
        void this.connection().send({
          type: 'construction',
          action: 'begin',
          blueprintId: id,
          playerId: this.game().getLocalPlayerId(),
        });
        void this.connection().send({
          type: 'playerInteraction',
          mode: 'playing',
          playerId: this.game().getLocalPlayerId(),
        });
      },
    );
  }
  private sell(): void {
    const game = this.game();
    const merchant = game
      .getActorsInCurrentRoom()
      .find(
        (actor) => game.canInteractWithActor(actor.id) && game.getActorShopView(actor.id)?.open,
      );
    if (!merchant) {
      this.notify('Move beside an open merchant to sell.');
      this.root();
      return;
    }
    const goods = game
      .getInventory()
      .getAllItems()
      .filter(([id, count]) => count > 0 && resolveProduce(id));
    this.popup.show(
      `Sell to ${merchant.displayName}`,
      [
        ...goods.map(([id, count]) => ({
          id,
          title: `${id} ×${count}`,
          description: 'Sell this stack at the server-calculated quality price.',
        })),
        { id: 'back', title: 'Back', description: '' },
      ],
      (id) => {
        if (id === 'back') return this.root();
        void this.send({
          type: 'farmSellAction',
          merchantActorId: merchant.id,
          itemId: id,
          count: game.getInventory().getItemCount(id),
        });
      },
    );
  }
  private cook(): void {
    this.popup.show(
      'Farm cooking',
      [
        ...FARM_RECIPES.map((recipe) => ({
          id: recipe.id,
          title: recipe.name,
          description: `Uses one ${recipe.input} of any quality. Restores hunger and one heart.`,
        })),
        { id: 'back', title: 'Back', description: '' },
      ],
      (id) => {
        if (id === 'back') return this.root();
        void Promise.resolve(
          this.connection().send({
            type: 'inventoryAction',
            action: 'cook',
            recipeId: id,
            playerId: this.game().getLocalPlayerId(),
          }),
        ).then((result) => {
          this.notify(result.message ?? 'Cooking rejected.');
          this.root();
        });
      },
    );
  }
}
