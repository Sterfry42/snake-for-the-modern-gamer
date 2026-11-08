import type { SnakeGame } from '../game/snakeGame.js';
import type { GameConnection } from '../session/GameConnection.js';
import type { SceneActionCommand } from '../session/SceneActionCommand.js';
import type { ChoicePopup } from './choicePopup.js';
import type { NormalizedChoiceOption } from './choicePopupModel.js';
import { CROPS } from '../farming/cropCatalog.js';
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
    const tool = this.game().getFarmTool();
    return tool ? { dx: this.game().getFarmToolTarget().x, dy: this.game().getFarmToolTarget().y } :
      this.active ? { ...this.target } : undefined;
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
  sellToMerchant(merchantActorId: string, itemId: string, count: number) {
    return this.transact({ type: 'farmSellAction', merchantActorId, itemId, count });
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
  /** Direct world interaction; uses the existing nonce/context authority boundary. */
  async perform(action: 'till' | 'plant' | 'water' | 'harvest' | 'inspect' | 'weed' |
    'compost' | 'magicBed' | 'clear' | 'refillCan' | 'toggleGate' | 'reinforce',
    target: { dx: number; dy: number }, seedItemId?: string,
  ): Promise<{ ok: boolean; message: string }> {
    const result = await this.transact({
      type: 'farmingAction',
      action,
      target,
      ...(seedItemId ? { seedItemId } : {}),
      ...(action === 'clear' ? { confirmed: true } : {}),
    });
    return { ok: result.ok, message: result.message ?? result.reason ?? 'Unavailable.' };
  }

  private close(): void {
    this.active = false;
    this.popup.hide();
    void this.connection().send({
      type: 'playerInteraction',
      playerId: this.game().getLocalPlayerId(),
      mode: this.game().getFarmTool() ? 'manual' : 'playing',
    });
  }

  private selectTool(itemId: string): void {
    const game = this.game();
    this.active = false;
    this.popup.hide();
    void Promise.resolve(this.connection().send({
      type: 'useItem',
      itemId,
      playerId: game.getLocalPlayerId(),
    })).then((result) => {
      this.notify(result.message ?? result.reason ?? 'Tool selected.');
      void this.connection().send({
        type: 'playerInteraction', playerId: game.getLocalPlayerId(),
        mode: result.ok ? 'manual' : 'playing',
      });
    });
  }

  private root(): void {
    const game = this.game();
    const ownedSeeds = CROPS.filter((crop) =>
      game.getInventory().getItemCount(crop.seedItemId) > 0,
    );
    const tool = game.getFarmTool();
    const options: NormalizedChoiceOption[] = [
      {
        id: 'seeds', title: `Plant seeds (${ownedSeeds.length} varieties)`,
        description: 'Select an owned seed. Move deliberately and interact to plant repeatedly.',
        disabled: ownedSeeds.length === 0,
      },
      {
        id: 'hoe', title: 'Use hoe', description: 'Till suitable ground one step at a time.',
        disabled: game.getInventory().getItemCount('farm-hoe') === 0,
      },
      {
        id: 'water', title: 'Use watering can',
        description: `${game.getFlag<number>('farm.canCharges') ?? 8}/8 charges. Water soil by interacting.`,
        disabled: game.getInventory().getItemCount('watering-can') === 0 &&
          game.getInventory().getItemCount('garden-watering-can') === 0,
      },
      {
        id: 'refillCan', title: 'Refill watering can',
        description: 'Stand beside water, or carry a refill.',
      },
      {
        id: 'tend', title: 'Other soil actions',
        description: 'Inspect, clear, weed, compost or prepare a specialty bed.',
      },
      {
        id: 'territory', title: 'Territory & permissions',
        description: 'Claims and shared cultivation rights; no deed needed for wilderness.',
      },
      {
        id: 'build', title: 'Construction & defenses',
        description: 'Build fences, sprinklers and greenhouses in construction mode.',
      },
      {
        id: 'journal', title: 'Crop journal',
        description: 'Crop seasons, growth, recipes and recorded incidents.',
      },
      { id: 'leave', title: tool ? 'Return to farming tool' : 'Leave', description: 'Close this menu.' },
    ];
    this.popup.show('Farm tools', options, (id) => {
      if (id === 'leave') return this.close();
      if (id === 'seeds') return this.seeds();
      if (id === 'hoe') return this.selectTool('farm-hoe');
      if (id === 'water') return this.selectTool(
        game.getInventory().getItemCount('watering-can') > 0
          ? 'watering-can' : 'garden-watering-can',
      );
      if (id === 'refillCan') {
        const result = this.perform('refillCan', { dx: 0, dy: 0 });
        void result.then((value) => { this.notify(value.message); this.root(); });
        return;
      }
      if (id === 'tend') return this.otherActions();
      if (id === 'territory') return this.territory();
      if (id === 'build') return this.build();
      if (id === 'journal') return this.journal();
    });
  }

  private otherActions(): void {
    const head = this.game().getSnakeBody()[0];
    const position = head && this.game().resolveRoomPosition(head);
    const direction = this.game().getFarmToolTarget();
    const cell = position && this.game().getFarmCells().find((candidate) =>
      candidate.x === position.localX + direction.x &&
      candidate.y === position.localY + direction.y,
    );
    const options: NormalizedChoiceOption[] = [
      { id: 'inspect', title: 'Inspect highlighted tile', description: cell
        ? describeFarmCell(cell, cell.substrate === 'artificial') : 'Untilled ground.' },
      { id: 'weed', title: 'Remove weeds', description: 'Care for this patch.' },
      { id: 'compost', title: 'Apply compost', description: 'Restore fertility.' },
      { id: 'magicBed', title: 'Apply luminous substrate', description: 'Prepare magic crops.' },
      { id: 'clear', title: 'Clear crop (destructive)', description: 'Remove without a harvest.' },
      { id: 'back', title: 'Back', description: 'Return to tools.' },
    ];
    this.popup.show('Soil care', options, (id) => {
      if (id === 'back') return this.root();
      const target = { dx: direction.x, dy: direction.y };
      if (id === 'clear') {
        this.popup.show('Destroy this crop?', [
          { id: 'yes', title: 'Remove without reward', description: 'Cannot be undone.' },
          { id: 'no', title: 'Cancel', description: 'Keep the crop.' },
        ], (choice) => {
          if (choice === 'yes') void this.perform('clear', target).then((r) => {
            this.notify(r.message); this.root();
          }); else this.root();
        });
        return;
      }
      if (id === 'inspect' || id === 'weed' || id === 'compost' || id === 'magicBed') {
        void this.perform(id, target).then((r) => { this.notify(r.message); this.root(); });
      }
    });
  }

  private seeds(): void {
    const owned = CROPS.filter((crop) =>
      this.game().getInventory().getItemCount(crop.seedItemId) > 0,
    );
    this.popup.show('Choose seed to plant', [
      ...owned.map((crop) => ({
        id: crop.seedItemId,
        title: `${crop.label} ×${this.game().getInventory().getItemCount(crop.seedItemId)}`,
        description: `${crop.seasons.join('/')}; ${crop.growDays} days. ${crop.specialty ? 'Needs specialty soil.' : ''}`,
      })),
      { id: 'back', title: 'Back', description: 'Return to farm tools.' },
    ], (id) => {
      if (id === 'back') return this.root();
      if (owned.some((crop) => crop.seedItemId === id)) this.selectTool(id);
    });
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

}
