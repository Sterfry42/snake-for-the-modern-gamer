import type { SnakeGame } from '../game/snakeGame.js';
import type { GameConnection } from '../session/GameConnection.js';
import type { SceneActionCommand } from '../session/SceneActionCommand.js';
import type { ChoicePopup } from './choicePopup.js';
import type { NormalizedChoiceOption } from './choicePopupModel.js';
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
    if (!this.active && !this.game().getFarmTool()) return undefined;
    const direction = this.game().getFarmToolTarget();
    return { dx: direction.x, dy: direction.y };
  }
  constructor(
    private readonly game: () => SnakeGame,
    private readonly connection: () => GameConnection,
    private readonly popup: ChoicePopup,
    private readonly notify: (message: string) => void,
  ) {}
  /** Crop care is available by interacting with an existing plot, without a tool. */
  async openSoilActions(): Promise<void> {
    await this.openContext(() => this.otherActions());
  }

  /** Claim flags expose land management where the player stands, not through a global menu. */
  async openLandActions(): Promise<void> {
    await this.openContext(() => this.territory());
  }

  async claimCurrentRoom(): Promise<{ ok: boolean; message: string }> {
    const result = await this.transact({ type: 'territoryAction', action: 'claimCurrentRoom' });
    return { ok: result.ok, message: result.message ?? result.reason ?? 'Claim rejected.' };
  }

  private async openContext(show: () => void): Promise<void> {
    this.active = true;
    await this.connection().send({
      type: 'playerInteraction',
      playerId: this.game().getLocalPlayerId(),
      mode: 'manual',
    });
    if (this.active) show();
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
    this.nonce = Math.max(this.nonce, result.agricultureNonce ?? previous);
    return result;
  }
  private async send(intent: AgricultureIntent): Promise<void> {
    const result = await this.transact(intent);
    this.notify(result.message ?? result.reason ?? (result.ok ? 'Done.' : 'Action rejected.'));
    if (this.active) this.territory();
  }
  /** Direct world interaction; uses the existing nonce/context authority boundary. */
  async perform(
    action:
      | 'till'
      | 'plant'
      | 'water'
      | 'harvest'
      | 'inspect'
      | 'weed'
      | 'compost'
      | 'magicBed'
      | 'clear'
      | 'refillCan'
      | 'toggleGate'
      | 'reinforce',
    target: { dx: number; dy: number },
    seedItemId?: string,
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

  private otherActions(): void {
    const head = this.game().getSnakeBody()[0];
    const position = head && this.game().resolveRoomPosition(head);
    const direction = this.game().getFarmToolTarget();
    const cell =
      position &&
      this.game()
        .getFarmCells()
        .find(
          (candidate) =>
            candidate.x === position.localX + direction.x &&
            candidate.y === position.localY + direction.y,
        );
    const options: NormalizedChoiceOption[] = [
      {
        id: 'inspect',
        title: 'Inspect highlighted tile',
        description: cell
          ? describeFarmCell(cell, cell.substrate === 'artificial')
          : 'Untilled ground.',
      },
      { id: 'weed', title: 'Remove weeds', description: 'Care for this patch.' },
      { id: 'compost', title: 'Apply compost', description: 'Restore fertility.' },
      { id: 'magicBed', title: 'Apply luminous substrate', description: 'Prepare magic crops.' },
      { id: 'clear', title: 'Clear crop (destructive)', description: 'Remove without a harvest.' },
      { id: 'back', title: 'Back', description: 'Return to tools.' },
    ];
    this.popup.show('Soil care', options, (id) => {
      if (id === 'back') return this.close();
      const target = { dx: direction.x, dy: direction.y };
      if (id === 'clear') {
        this.popup.show(
          'Destroy this crop?',
          [
            { id: 'yes', title: 'Remove without reward', description: 'Cannot be undone.' },
            { id: 'no', title: 'Cancel', description: 'Keep the crop.' },
          ],
          (choice) => {
            if (choice === 'yes')
              void this.perform('clear', target).then((r) => {
                this.notify(r.message);
                this.otherActions();
              });
            else this.otherActions();
          },
        );
        return;
      }
      if (id === 'inspect' || id === 'weed' || id === 'compost' || id === 'magicBed') {
        void this.perform(id, target).then((r) => {
          this.notify(r.message);
          this.otherActions();
        });
      }
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
      () => this.territory(),
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
      { id: 'build', title: 'Construction & defenses', description: 'Place buildings on build-authorized land.' },
      { id: 'journal', title: 'Crop journal', description: 'Seasons, growth and farm incidents.' },
      { id: 'back', title: 'Put away menu', description: '' },
    ];
    this.popup.show('Territory', options, (id) => {
      if (id === 'back') return this.close();
      if (id === 'build') return this.build();
      if (id === 'journal') return this.journal();
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
              : this.territory(),
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
        if (id === 'back') return this.territory();
        this.active = false;
        this.popup.hide();
        void Promise.resolve(this.connection().send({
          type: 'construction',
          action: 'begin',
          blueprintId: id,
          playerId: this.game().getLocalPlayerId(),
        })).then((result) => {
          if (!result.ok) {
            this.notify(result.message ?? result.reason ?? 'Cannot build here.');
            return;
          }
          void this.connection().send({
            type: 'playerInteraction',
            mode: 'playing',
            playerId: this.game().getLocalPlayerId(),
          });
        });
      },
    );
  }
}
