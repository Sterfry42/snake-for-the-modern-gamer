import { EQUIPMENT_SLOTS } from '../inventory/item.js';
import type { GameConnection } from './GameConnection.js';
import type { GameSnapshot } from './GameSnapshot.js';
import type { ClientCommand, CommandResult } from './ClientCommand.js';
import type { EquipmentSlot } from '../inventory/item.js';
import type { RelationshipCandidateProfile } from '../relationships/relationshipTypes.js';
import type { SceneClientState } from './SceneClientState.js';
import type { Vector2Like } from '../core/math.js';
import type { SceneActionCommand, PlayerInteraction } from './SceneActionCommand.js';
import type { RelationshipChoice } from '../relationships/relationshipTypes.js';
import type { SpecialStatId } from '../stats/specialTypes.js';

/** Snapshot-only scene compatibility surface. It never imports the game runtime. */
export class SceneGameClient {
  private snapshot: GameSnapshot | null = null;
  private readonly unsubscribe: () => void;

  constructor(readonly connection: GameConnection) {
    this.unsubscribe = connection.onSnapshot((snapshot) => {
      this.snapshot = snapshot;
    });
  }

  getSnapshot(): GameSnapshot {
    return structuredClone(this.currentSnapshot);
  }

  private get currentSnapshot(): GameSnapshot {
    if (!this.snapshot) throw new Error('Game connection has not supplied an initial snapshot');
    return this.snapshot;
  }

  getLocalPlayerId(): string {
    return this.currentSnapshot.localPlayerId;
  }
  getSnakeBody(): readonly Vector2Like[] {
    return structuredClone(this.player.body);
  }
  getDirection(): Vector2Like {
    return { ...this.player.direction };
  }
  getScore(): number {
    return this.player.score;
  }
  getSnakeLength(): number {
    return this.player.body.length;
  }
  getCurrentRoom() {
    return structuredClone(this.room.room);
  }
  getApple() {
    return structuredClone(this.room.apples ?? null);
  }
  getEnemies() {
    return structuredClone(this.room.enemies ?? []);
  }
  getAnimals() {
    return structuredClone(this.room.animals ?? []);
  }
  getBosses() {
    return structuredClone(this.room.bosses ?? []);
  }
  getEnemyBullets() {
    return structuredClone(this.room.bullets ?? []);
  }
  getFootballs() {
    return structuredClone(this.room.footballs ?? []);
  }
  getBombs() {
    return structuredClone(this.room.bombs ?? []);
  }
  getPlayerHealth() {
    return structuredClone(this.currentSnapshot.ui.health);
  }

  setDirection(direction: Vector2Like): Promise<CommandResult> {
    return this.send({ type: 'setDirection', playerId: this.getLocalPlayerId(), direction });
  }

  send(command: ClientCommand): Promise<CommandResult> {
    return Promise.resolve(this.connection.send({ ...command, playerId: this.getLocalPlayerId() }));
  }

  setPlayerInteraction(mode: PlayerInteraction): Promise<CommandResult> {
    return this.action({ type: 'playerInteraction', mode });
  }

  getPlayerInteraction(): PlayerInteraction {
    return this.currentSnapshot.ui.playerInteraction ?? 'playing';
  }

  useInventoryItem(itemId: string): Promise<CommandResult> {
    return this.send({ type: 'useItem', playerId: this.getLocalPlayerId(), itemId });
  }

  purchaseActorShopOffer(actorId: string, offerId: string): Promise<CommandResult> {
    return this.action({ type: 'purchase', actorId, offerId });
  }

  applyRelationshipChoice(actorId: string, choice: RelationshipChoice): Promise<CommandResult> {
    return this.action({ type: 'relationshipAction', actorId, choice });
  }

  setActiveQuestMarkerQuestId(questId?: string): Promise<CommandResult> {
    return this.action({ type: 'questAction', action: 'track', questId: questId ?? null });
  }

  previewSpecialStatChange(statId: SpecialStatId, delta: -1 | 1): Promise<CommandResult> {
    return this.action({ type: 'specialAction', action: 'preview', statId, delta });
  }

  applySpecialStatPreview(): Promise<CommandResult> {
    return this.action({ type: 'specialAction', action: 'apply' });
  }

  resetSpecialStatPreview(): Promise<CommandResult> {
    return this.action({ type: 'specialAction', action: 'reset' });
  }

  beginStructurePlacement(blueprintId: string): Promise<CommandResult> {
    return this.action({ type: 'construction', action: 'begin', blueprintId });
  }

  stepStructurePlacement(direction: Vector2Like): Promise<CommandResult> {
    return this.action({ type: 'construction', action: 'step', direction });
  }

  faceStructurePlacement(direction: Vector2Like): Promise<CommandResult> {
    return this.action({ type: 'construction', action: 'face', direction });
  }

  confirmStructurePlacement(): Promise<CommandResult> {
    return this.action({ type: 'construction', action: 'confirm' });
  }

  cancelStructurePlacement(): Promise<CommandResult> {
    return this.action({ type: 'construction', action: 'cancel' });
  }

  claimRoom(): Promise<CommandResult> {
    return this.action({ type: 'construction', action: 'claim' });
  }

  demolishStructure(structureId: string): Promise<CommandResult> {
    return this.action({ type: 'construction', action: 'demolish', structureId });
  }

  buyGarageCar(): Promise<CommandResult> {
    return this.action({ type: 'vehicleAction', action: 'buyGarageCar' });
  }

  saveGame(): Promise<CommandResult> {
    return this.send({ type: 'saveGame', playerId: this.getLocalPlayerId() });
  }

  loadGame(): Promise<CommandResult> {
    return this.send({ type: 'loadGame', playerId: this.getLocalPlayerId() });
  }

  private action(command: SceneActionIntent): Promise<CommandResult> {
    return this.send({ ...command, playerId: this.getLocalPlayerId() });
  }

  destroy(): void {
    this.unsubscribe();
    this.connection.disconnect();
  }

  private get state(): SceneClientState {
    if (!this.snapshot?.clientState)
      throw new Error('Game connection has not supplied scene client state');
    return this.snapshot.clientState;
  }

  get worldSeed(): string {
    return this.state.worldSeed;
  }
  getFlag(key: string): unknown {
    return structuredClone(this.state.flags[key]);
  }
  getCharacterMode() {
    return this.currentSnapshot.presentation?.characterMode ?? 'snake';
  }
  isRaccoonMode() {
    return this.getCharacterMode() === 'raccoon';
  }
  getActiveQuests() {
    return structuredClone(this.state.quests.active);
  }
  getAcceptedQuests() {
    return structuredClone(this.state.quests.accepted);
  }
  getCompletedQuestIds() {
    return [...this.state.quests.completedIds];
  }
  getAcceptedQuestIds() {
    return this.state.quests.accepted.map((quest) => quest.id);
  }
  getActiveQuestMarkerQuestId() {
    return this.state.quests.markerQuestId;
  }
  getQuestMapMarkers() {
    return structuredClone(this.state.quests.markers);
  }
  getQuestObjectiveSummaries(questId: string) {
    return structuredClone(
      this.state.quests.accepted.find((quest) => quest.id === questId)?.objectives ?? [],
    );
  }
  getQuestSubtasks(questId: string) {
    return [...(this.state.quests.accepted.find((quest) => quest.id === questId)?.subtasks ?? [])];
  }
  getRelationshipState(profile: Pick<RelationshipCandidateProfile, 'id'>) {
    return structuredClone(this.state.relationshipStates[profile.id]);
  }
  getRelationshipActions(profile: Pick<RelationshipCandidateProfile, 'id'>) {
    return [...(this.state.relationshipActions[profile.id] ?? [])];
  }
  getStructurePlacement() {
    return structuredClone(this.state.construction.placement);
  }
  previewStructurePlacement() {
    return structuredClone(this.state.construction.preview);
  }
  placedStructures(roomId?: string) {
    return structuredClone(
      this.state.construction.structures.filter(
        (structure) => !roomId || structure.roomId === roomId,
      ),
    );
  }
  getRoomClaim() {
    return structuredClone(this.state.construction.claim);
  }
  getGeneratedRoomCount() {
    return this.state.generatedRoomIds.length;
  }
  getInventory() {
    return this.inventory;
  }
  private readonly inventory = new SceneInventoryClient(() => this.state);

  getSpecialStatsView() {
    return structuredClone(this.state.special);
  }

  getSpecialGameplayModifiers() {
    return structuredClone(this.state.specialModifiers);
  }

  getFishingSpecialModifiers() {
    return structuredClone(this.state.fishingModifiers);
  }

  getDatingCandidateViews() {
    return structuredClone(this.state.relationships);
  }

  getPresentRelationshipProfilesForRoom() {
    return structuredClone(this.state.profiles);
  }

  getAtmosphereState() {
    return structuredClone(this.state.atmosphere);
  }

  getAtmosphereForRoom() {
    return structuredClone(this.state.atmosphereView);
  }

  getActorsInCurrentRoom() {
    return structuredClone(this.state.actors);
  }

  getCurrentTown() {
    return structuredClone(this.state.town);
  }

  getCars() {
    return structuredClone(this.state.cars);
  }

  getFollowers() {
    return structuredClone(this.state.followers);
  }

  getAnimalCompanions() {
    return structuredClone(this.state.animalCompanions);
  }

  getArtifactViews() {
    return structuredClone(this.state.artifacts);
  }

  getManeuverState() {
    return structuredClone(this.state.maneuver);
  }

  getPlayerTemperature() {
    return structuredClone(this.state.temperature);
  }

  getRadiationTimer() {
    return structuredClone(this.state.radiation);
  }

  getKarmaView() {
    return structuredClone(this.state.karma);
  }

  getEmoticonState() {
    return structuredClone(this.state.emoticons);
  }

  getModernRunState() {
    return structuredClone(this.state.modernRun);
  }

  getHighlightReelState() {
    return structuredClone(this.state.highlights);
  }

  getExpeditionBoardState() {
    return structuredClone(this.state.expeditions);
  }

  getModernSynergyState() {
    return structuredClone(this.state.synergies);
  }

  getAlchemyState() {
    return structuredClone(this.state.alchemy);
  }

  getGeneratedRoomIds() {
    return structuredClone(this.state.generatedRoomIds);
  }

  private get player() {
    const snapshot = this.currentSnapshot;
    const player = snapshot.players[snapshot.localPlayerId];
    if (!player) throw new Error('Snapshot is missing the attached player');
    return player;
  }

  private get room() {
    const room = this.currentSnapshot.viewport.rooms[this.player.roomId];
    if (!room) throw new Error('Snapshot is missing the attached player room');
    return room;
  }
}

type WithoutPlayerId<T> = T extends { playerId: string } ? Omit<T, 'playerId'> : never;
type SceneActionIntent = WithoutPlayerId<SceneActionCommand>;

/** Read-only inventory selectors. Mutations belong to explicit game commands. */
class SceneInventoryClient {
  constructor(private readonly getState: () => SceneClientState) {}
  getItemCount(itemId: string): number {
    return this.getState().inventory[itemId] ?? 0;
  }
  getAllItems(): [string, number][] {
    return Object.entries(this.getState().inventory);
  }
  getEquipped(slot: EquipmentSlot): string | undefined {
    return this.getState().equipment[slot];
  }
  getAllEquipped(): [EquipmentSlot, string][] {
    return EQUIPMENT_SLOTS.flatMap((slot) => {
      const itemId = this.getState().equipment[slot];
      return itemId ? [[slot, itemId] as [EquipmentSlot, string]] : [];
    });
  }
}
