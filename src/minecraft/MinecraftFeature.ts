import { Feature } from '../features/feature.js';
import type SnakeScene from '../scenes/snakeScene.js';
import { MinecraftPlayer, isWalkable, canMineBlock } from './player.js';
import { ChunkManager } from './chunk.js';
import { MinecraftRenderLayer } from './renderLayer.js';
import { MobManager } from './mobManager.js';
import { DayNightCycle } from './dayNight.js';
import { LightingSystem } from './lighting.js';
import { tryBreakBlock, tryPlaceBlock } from './blockInteraction.js';
import { RECIPES, getRecipeById, canCraft, craft as craftRecipe } from './crafting.js';
import type { MinecraftSaveData } from './types.js';
import {
  serializeMinecraftState,
  deserializeMinecraftState,
  getDefaultPlayerState,
} from './save.js';
import { PLAYER_MAX_HEALTH, PLAYER_MAX_HUNGER, DAY_LENGTH_TICKS } from './config.js';
import { blockIdToColor, getBlockType, isSpecialBlock, isPlaceableSpecialBlock, isBlockableBlock } from './blockRegistry.js';
import { getMinecraftItem } from './itemRegistry.js';
import { tryPlaceFurnace, tryLoadFurnace, tickFurnaces, tryCollectFurnaceOutput, createFurnaceState } from './furnace.js';
import { tryPlaceChest, tryDepositToChest, tryWithdrawFromChest, tryBreakChest, getChestContents } from './chest.js';
import { tryPlaceBed, trySleep, tryBreakBed } from './bed.js';
import { tryCreateFarmland, tryPlantSeeds, tryPlantPumpkin, tickCrops, tryHarvestCrop } from './farming.js';

export class MinecraftFeature extends Feature {
  private player: MinecraftPlayer | null = null;
  private chunkManager: ChunkManager | null = null;
  private renderLayer: MinecraftRenderLayer | null = null;
  private mobManager: MobManager | null = null;
  private dayNight: DayNightCycle | null = null;
  private lighting: LightingSystem | null = null;
  private minecraftMode = false;
  private craftingUI: Phaser.GameObjects.Container | null = null;
  private skyOverlay: Phaser.GameObjects.Graphics | null = null;
  private craftingTableNearby = false;
  private furnaces: Map<string, import('./furnace.js').FurnaceState> = new Map();
  private chests: Map<string, import('./chest.js').ChestState> = new Map();
  private beds: Map<string, import('./bed.js').BedState> = new Map();
  private lastActionStep: number = 0;

  constructor() {
    super('minecraft', 'Minecraft block building mode');
  }

  override onRegister(scene: SnakeScene): void {
    this.player = new MinecraftPlayer();
    this.chunkManager = new ChunkManager();
    this.renderLayer = new MinecraftRenderLayer(scene, this.chunkManager);
    this.mobManager = new MobManager();
    this.mobManager.init();
    this.dayNight = new DayNightCycle();
    this.lighting = new LightingSystem();
    this.skyOverlay = scene.add.graphics().setDepth(0).setAlpha(0);
    this.minecraftMode = false;

    // Initialize from saved data if available
    this.initFromSave(scene);
  }

  override onActionStep(scene: SnakeScene): void {
    if (!this.minecraftMode || !this.player) return;

    const tick = Number(scene.snakeGame.getFlag<number>('timeMs') ?? 0);
    this.lastActionStep = tick;

    // Day/night tick
    this.dayNight?.tick();

    // Hunger tick
    if (tick % 600 === 0) {
      this.player.state.hunger = Math.max(
        0,
        this.player.state.hunger - 1,
      );
      if (this.player.state.hunger <= 0) {
        this.player.takeDamage(1);
      }
    }

    // Furnace tick
    tickFurnaces(this.furnaces, this.player.state.inventory);

    // Crop growth tick
    const room = scene.snakeGame.getCurrentRoom();
    tickCrops(room, this.dayNight!);

    // Mob tick with combat
    const mobs = this.mobManager?.getMobsInRoom(room.id) ?? [];
    const head = scene.snakeGame.getSnakeBody()[0];
    if (head) {
      this.lighting?.calculateLightMap(room.id);
      this.mobManager?.tickMobs(
        Math.floor(tick / 100),
        head.x,
        head.y,
        room.id,
        (x, y, roomId) => this.lighting?.getLightLevel(x, y, roomId) ?? 0,
        (mobId, mx, my, roomId) => this.handleMobDeath(mobId, mx, my, roomId, scene),
        (damage) => {
          const actualDamage = this.player?.takeDamageWithArmor(damage) ?? damage;
          scene.setFlag('ui.questInteraction', { message: `You took ${actualDamage} damage!` });
        },
      );
    }

    // Check for crafting table
    this.craftingTableNearby = false;
    if (head) {
      const blockAt = room.minecraftBlocks?.[`${head.x},${head.y}`];
      this.craftingTableNearby = blockAt === 'crafting_table';
    }
  }

  override onRender(scene: SnakeScene): void {
    if (!this.minecraftMode) {
      this.skyOverlay?.setAlpha(0);
      return;
    }

    // Render minecraft layer
    this.renderLayer?.render(scene);

    // Sky overlay
    if (this.dayNight && this.skyOverlay) {
      const alpha = this.dayNight.getSkyAlpha();
      const color = this.dayNight.getSkyColor();
      this.skyOverlay.clear();
      this.skyOverlay.fillStyle(color, alpha);
      this.skyOverlay.fillRect(0, 0, scene.scale.width, scene.scale.height);
    }

    // Render mobs
    if (this.mobManager) {
      const mobs = this.mobManager.getMobsInRoom(scene.snakeGame.getCurrentRoom().id);
      const cellSize = scene.grid.cell;
      for (const mob of mobs) {
        const mobColor = this.getMobColor(mob.type);
        const x = mob.x * cellSize + cellSize / 2;
        const y = mob.y * cellSize + cellSize / 2;

        scene.graphics.fillStyle(mobColor, 0.9);
        scene.graphics.fillRect(
          mob.x * cellSize + 2,
          mob.y * cellSize + 2,
          cellSize - 4,
          cellSize - 4,
        );

        // Health bar
        const healthPercent = mob.health / mob.maxHealth;
        scene.graphics.fillStyle(healthPercent > 0.5 ? 0x5dd6a2 : 0xff6b6b, 0.9);
        scene.graphics.fillRect(
          mob.x * cellSize + 1,
          mob.y * cellSize - 3,
          (cellSize - 2) * healthPercent,
          2,
        );
      }
    }

    // Player health/hunger UI
    if (this.player && scene.snakeGame.getFlag<boolean>('ui.livesRevealed')) {
      const hearts = '❤️'.repeat(Math.ceil(this.player.state.health / 2));
      const hungerText = '🍖'.repeat(Math.ceil(this.player.state.hunger / 4));
      const hudText = scene.add
        .text(
          scene.scale.width - 120,
          8,
          `HP: ${this.player.state.health}/${this.player.state.maxHealth}  Food: ${this.player.state.hunger}/${this.player.state.maxHunger}`,
          {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
          },
        )
        .setDepth(30);

      scene.events.on('update', () => {
        hudText.setText(`HP: ${this.player?.state.health ?? 0}/${this.player?.state.maxHealth ?? 20}  Food: ${this.player?.state.hunger ?? 0}/${this.player?.state.maxHunger ?? 20}`);
      });
    }
  }

  override onGameOver(scene: SnakeScene): void {
    if (!this.minecraftMode) return;

    // Death flow: reset health and hunger, retain inventory and world
    this.minecraftMode = false;
    this.player?.resetHealth();
    this.player?.resetHunger();

    // Keep blocks, mobs, inventory, day/night
    scene.setFlag('ui.questInteraction', { message: 'You died. Your Minecraft world was preserved.' });
  }

  toggleMode(scene: SnakeScene): void {
    this.minecraftMode = !this.minecraftMode;

    if (this.minecraftMode) {
      // Switch to Minecraft mode
      scene.setFlag('ui.suppressHud', true);
      scene.setFlag('ui.questInteraction', { message: 'Minecraft mode: Left-click to break blocks, right-click to place. WASD to move. E for crafting.' });

      // Set player spawn to current position
      const head = scene.snakeGame.getSnakeBody()[0];
      if (head) {
        const room = scene.snakeGame.getCurrentRoom();
        this.player?.setSpawn(head.x, head.y, room.id);
      }
    } else {
      // Switch back to snake mode
      scene.setFlag('ui.suppressHud', undefined);
      scene.setFlag('ui.questInteraction', undefined);
    }
  }

  getMode(): boolean {
    return this.minecraftMode;
  }

  handlePointerDown(
    scene: SnakeScene,
    worldX: number,
    worldY: number,
    button: number,
  ): boolean {
    if (!this.minecraftMode || !this.player) return false;

    const room = scene.snakeGame.getCurrentRoom();
    const [roomX, roomY] = this.parseRoomCoordinates(room.id);
    const localX = Math.floor((worldX - roomX * scene.grid.cols * scene.grid.cell) / scene.grid.cell);
    const localY = Math.floor((worldY - roomY * scene.grid.rows * scene.grid.cell) / scene.grid.cell);

    // Convert to world coordinates in room
    const worldTileX = localX + roomX * scene.grid.cols;
    const worldTileY = localY + roomY * scene.grid.rows;

    // Clamp to room bounds
    if (worldTileX < 0 || worldTileY < 0 || worldTileX >= scene.grid.cols || worldTileY >= scene.grid.rows) {
      return false;
    }

    const blockType = room.minecraftBlocks?.[`${worldTileX},${worldTileY}`];

    if (button === 1) {
      // Left click: break block or harvest crop
      if (blockType === 'wheat_crop' || blockType === 'pumpkin') {
        const result = tryHarvestCrop(room, this.player, worldTileX, worldTileY, blockType);
        if (result.success) {
          scene.juice.blockBreak(worldTileX * scene.grid.cell + scene.grid.cell / 2, worldTileY * scene.grid.cell + scene.grid.cell / 2);
        }
        if (result.message) {
          scene.setFlag('ui.questInteraction', { message: result.message });
        }
        return true;
      }

      // Break block
      const result = tryBreakBlock(scene, this.player, worldTileX, worldTileY);
      if (result.success) {
        if (result.droppedItem) {
          this.player.addItem(result.droppedItem, result.droppedCount ?? 1);
          scene.setFlag('loot.itemPicked', {
            head: { x: worldTileX, y: worldTileY },
            itemName: getMinecraftItem(result.droppedItem)?.name ?? result.droppedItem,
            itemId: result.droppedItem,
          });
        }
        // If breaking a furnace, chest, or bed, remove from tracking
        if (isPlaceableSpecialBlock(blockType)) {
          const key = `${worldTileX},${worldTileY},${room.id}`;
          if (blockType === 'furnace') this.furnaces.delete(key);
          if (blockType === 'chest') this.chests.delete(key);
          if (blockType === 'bed') this.beds.delete(key);
        }
      }
      if (result.message) {
        scene.setFlag('ui.questInteraction', { message: result.message });
      }
      return true;
    } else if (button === 2) {
      // Right click: place block or interact
      // Try special block interactions first
      if (blockType === 'furnace') {
        const result = this.interactWithFurnace(scene, worldTileX, worldTileY);
        if (result) {
          scene.setFlag('ui.questInteraction', { message: result });
          return true;
        }
        return true;
      }

      if (blockType === 'chest') {
        const result = this.interactWithChest(scene, worldTileX, worldTileY);
        if (result) {
          scene.setFlag('ui.questInteraction', { message: result });
          return true;
        }
        return true;
      }

      if (blockType === 'bed') {
        const result = this.tryBedSleep(scene, worldTileX, worldTileY);
        scene.setFlag('ui.questInteraction', { message: result });
        return true;
      }

      if (blockType === 'crafting_table') {
        this.toggleCraftingUI(scene);
        return true;
      }

      // Try farming interaction
      if (blockType === 'farmland') {
        const result = this.tryFarmInteraction(scene, worldTileX, worldTileY, room);
        if (result) {
          scene.setFlag('ui.questInteraction', { message: result });
          return true;
        }
        return true;
      }

      // Place block
      const placeResult = this.tryPlaceBlockWithSelection(scene, worldTileX, worldTileY);
      if (!placeResult.success && placeResult.message) {
        scene.setFlag('ui.questInteraction', { message: placeResult.message });
      }
      return true;
    }

    return false;
  }

  private interactWithFurnace(scene: SnakeScene, x: number, y: number): string {
    if (!this.player) return 'No player.';

    // Try to collect output first
    const collectResult = tryCollectFurnaceOutput(this.furnaces, this.player, x, y, scene.snakeGame.getCurrentRoom().id);
    if (collectResult.success) {
      return 'Collected smelted items!';
    }
    if (collectResult.message && collectResult.message !== 'Nothing to collect.') {
      return collectResult.message;
    }

    // Try to load item
    const blockType = scene.snakeGame.getCurrentRoom().minecraftBlocks?.[`${x},${y}`];
    if (blockType !== 'furnace') return 'No furnace here.';

    // Get the item the player is holding (simplified: try common fuel items)
    const fuelItems = ['coal', 'stick', 'planks_item', 'wood'];
    for (const itemId of fuelItems) {
      if (this.player.getItemCount(itemId) > 0) {
        const result = tryLoadFurnace(this.furnaces, this.player, x, y, scene.snakeGame.getCurrentRoom().id, itemId);
        if (result.success) {
          return 'Furnace fueled and ready!';
        }
      }
    }

    // Try to load input item
    const inputItems = ['raw_iron', 'raw_gold', 'raw_beef', 'cobblestone', 'sand'];
    for (const itemId of inputItems) {
      if (this.player.getItemCount(itemId) > 0) {
        const result = tryLoadFurnace(this.furnaces, this.player, x, y, scene.snakeGame.getCurrentRoom().id, itemId);
        if (result.success) {
          return 'Item loaded into furnace!';
        }
      }
    }

    return 'Add fuel (coal, wood) or items to smelt (raw ore, cobblestone, sand).';
  }

  private interactWithChest(scene: SnakeScene, x: number, y: number): string {
    if (!this.player) return 'No player.';

    // Check what's in the chest
    const contents = getChestContents(this.chests, x, y, scene.snakeGame.getCurrentRoom().id);
    if (!contents) return 'No chest here.';

    // Show contents summary
    const items: string[] = [];
    for (const slot of contents) {
      if (slot.itemId && slot.count > 0) {
        items.push(`${slot.itemId}: ${slot.count}`);
      }
    }

    // Auto-deposit: try to store a held item in the chest
    const heldItems = ['cobblestone', 'dirt', 'stone', 'wood', 'coal', 'raw_iron'];
    for (const itemId of heldItems) {
      if (this.player.getItemCount(itemId) > 0) {
        const result = tryDepositToChest(this.chests, this.player, x, y, scene.snakeGame.getCurrentRoom().id, itemId, this.player.getItemCount(itemId));
        if (result.success) {
          return `Stored ${itemId} in chest!`;
        }
        if (result.message && !result.message.includes("You don't have")) {
          return result.message;
        }
      }
    }

    // Auto-withdraw: try to withdraw common items
    const wantedItems = ['iron_ingot', 'gold_ingot', 'cooked_beef', 'bread', 'diamond', 'torch_item'];
    for (const itemId of wantedItems) {
      if (contents.some((s) => s.itemId === itemId)) {
        const result = tryWithdrawFromChest(this.chests, this.player, x, y, scene.snakeGame.getCurrentRoom().id, itemId, 1);
        if (result.success) {
          return `Took ${itemId} from chest!`;
        }
      }
    }

    return `Chest contents: ${items.length > 0 ? items.join(', ') : 'Empty'}`;
  }

  private tryBedSleep(scene: SnakeScene, x: number, y: number): string {
    if (!this.player || !this.dayNight) return 'Cannot sleep.';
    const result = trySleep(
      this.beds,
      this.player,
      x,
      y,
      scene.snakeGame.getCurrentRoom().id,
      this.dayNight,
      () => {
        this.dayNight!.skipNight();
      },
      (bx, by, bRoomId) => {
        this.player!.setSpawn(bx, by, bRoomId);
      },
    );
    return result.message || 'Done.';
  }

  private tryFarmInteraction(scene: SnakeScene, x: number, y: number, room: import('../world/types.js').RoomSnapshot): string | null {
    if (!this.player) return null;

    const blockType = room.minecraftBlocks?.[`${x},${y}`];

    // If farmland, try to plant seeds
    if (blockType === 'farmland') {
      if (this.player.getItemCount('seeds') > 0) {
        const result = tryPlantSeeds(room, this.player, x, y, blockType);
        if (result.success) return 'Planted seeds!';
        return result.message;
      }
      if (this.player.getItemCount('pumpkin_item') > 0) {
        const result = tryPlantPumpkin(room, this.player, x, y, blockType);
        if (result.success) return 'Planted pumpkin!';
        return result.message;
      }
      return 'Right-click farmland with seeds to plant.';
    }

    return null;
  }

  private toggleCraftingUI(scene: SnakeScene): void {
    this.craftingTableNearby = !this.craftingTableNearby;
    if (this.craftingTableNearby) {
      scene.setFlag('ui.questInteraction', { message: 'Crafting table open. Use recipes to craft items.' });
    }
  }

  private getHeldBlockType(scene: SnakeScene): string | null {
    const inventory = this.player?.state.inventory ?? [];
    const blockTypes = ['dirt', 'cobblestone', 'planks', 'stone', 'sand', 'torch', 'furnace', 'chest', 'bed', 'pumpkin'];
    for (const bt of blockTypes) {
      if (this.player?.getItemCount(bt) > 0) {
        return bt;
      }
    }
    return 'dirt';
  }

  private tryPlaceBlockWithSelection(scene: SnakeScene, x: number, y: number): { success: boolean; message?: string } {
    if (!this.player) return { success: false };

    const room = scene.snakeGame.getCurrentRoom();
    const blockType = this.getHeldBlockType(scene);

    if (!blockType) {
      return { success: false, message: 'No block type to place.' };
    }

    // Special block placement (furnace, chest, bed)
    if (isPlaceableSpecialBlock(blockType)) {
      if (blockType === 'furnace') {
        const result = tryPlaceFurnace(this.furnaces, x, y, room.id);
        if (result.success) {
          this.player.removeItem(blockType, 1);
          return { success: true };
        }
        return result;
      }
      if (blockType === 'chest') {
        const result = tryPlaceChest(this.chests, x, y, room.id);
        if (result.success) {
          this.player.removeItem(blockType, 1);
          return { success: true };
        }
        return result;
      }
      if (blockType === 'bed') {
        const result = tryPlaceBed(this.beds, x, y, room.id);
        if (result.success) {
          this.player.removeItem(blockType, 1);
          return { success: true };
        }
        return result;
      }
    }

    // Regular block placement
    return tryPlaceBlock(scene, this.player, x, y, blockType);
  }

  private handleMobDeath(mobId: string, x: number, y: number, roomId: string, scene: SnakeScene): void {
    if (!this.player) return;

    this.mobManager?.onMobDeath(mobId, (itemId, count) => {
      this.player?.addItem(itemId, count);
    });

    const dropItem = this.getMobDropType(scene.snakeGame.getCurrentRoom().id);
    if (dropItem) {
      this.player.addItem(dropItem, 1);
      scene.setFlag('loot.itemPicked', {
        head: { x, y },
        itemName: getMinecraftItem(dropItem)?.name ?? dropItem,
        itemId: dropItem,
      });
    }

    scene.juice.mobHit(x * scene.grid.cell + scene.grid.cell / 2, y * scene.grid.cell + scene.grid.cell / 2);
  }

  private getMobDropType(roomId: string): string | null {
    return 'rotten_flesh';
  }

  private parseRoomCoordinates(roomId: string): [number, number] {
    if (roomId.startsWith('cave:')) return [0, 0];
    const parts = roomId.split(',').map(Number);
    return [parts[0] ?? 0, parts[1] ?? 0];
  }

  private getMobColor(type: string): number {
    const colorMap: Record<string, number> = {
      zombie: Phaser.Display.Color.HexStringToColor('#2D5A1E').color,
      skeleton: Phaser.Display.Color.HexStringToColor('#E8E4D4').color,
      creeper: Phaser.Display.Color.HexStringToColor('#5B8C2A').color,
      cow: Phaser.Display.Color.HexStringToColor('#8B5A2B').color,
    };
    return colorMap[type] ?? 0x808080;
  }

  private initFromSave(scene: SnakeScene): void {
    const savedData = scene.getFlag<MinecraftSaveData>('minecraft.save');
    if (savedData) {
      const data = deserializeMinecraftState(savedData);
      if (this.player) {
        this.player.state = { ...data.playerState };
        // Restore armor slots
        if (data.playerState.armorSlots) {
          this.player.armorSlots = data.playerState.armorSlots;
        }
      }
      if (this.dayNight) {
        this.dayNight.day = data.dayNight.day;
        this.dayNight.timeOfDay = data.dayNight.timeOfDay;
      }
      if (this.chunkManager && data.minecraftBlocks) {
        this.chunkManager.deserialize(
          data.minecraftBlocks.map((b) => ({
            roomId: b.roomId,
            chunkX: Math.floor(b.x / 16),
            chunkY: Math.floor(b.y / 16),
            blocks: [{ x: b.x, y: b.y, blockType: b.blockType }],
          })),
        );
      }
      // Restore furnaces
      if (data.furnaces) {
        for (const f of data.furnaces) {
          this.furnaces.set(`${f.x},${f.y},${f.roomId}`, f);
        }
      }
      // Restore chests
      if (data.chests) {
        for (const c of data.chests) {
          this.chests.set(`${c.x},${c.y},${c.roomId}`, { x: c.x, y: c.y, roomId: c.roomId, slots: c.slots, locked: false });
        }
      }
      // Restore beds
      if (data.beds) {
        for (const b of data.beds) {
          this.beds.set(`${b.x},${b.y},${b.roomId}`, b);
        }
      }
    }
  }

  saveToScene(scene: SnakeScene): void {
    if (!this.player || !this.dayNight) return;

    const blocks: Array<{ roomId: string; x: number; y: number; blockType: string }> = [];
    const dirtyChunks = this.chunkManager?.getDirtyChunks(scene.snakeGame.getCurrentRoom().id) ?? [];

    // Serialize blocks from room
    const room = scene.snakeGame.getCurrentRoom();
    if (room.minecraftBlocks) {
      for (const [key, blockType] of Object.entries(room.minecraftBlocks)) {
        const [x, y] = key.split(',').map(Number);
        blocks.push({ roomId: room.id, x, y, blockType });
      }
    }

    // Serialize mobs
    const mobs = this.mobManager
      ? this.mobManager.getMobsInRoom(room.id).map((m) => ({
          id: m.id,
          type: m.type,
          roomId: m.roomId,
          x: m.x,
          y: m.y,
          health: m.health,
        }))
      : [];

    // Serialize furnaces
    const furnaces: Array<{ x: number; y: number; roomId: string; progress: number; inputItem: string | null; outputItem: string | null; outputCount: number; fuelItem: string | null; fuelRemaining: number; burning: boolean }> = [];
    for (const f of this.furnaces.values()) {
      furnaces.push(f);
    }

    // Serialize chests
    const chests: Array<{ x: number; y: number; roomId: string; slots: Array<{ itemId: string; count: number }> }> = [];
    for (const c of this.chests.values()) {
      chests.push({ x: c.x, y: c.y, roomId: c.roomId, slots: c.slots });
    }

    // Serialize beds
    const beds: Array<{ x: number; y: number; roomId: string; occupied: boolean }> = [];
    for (const b of this.beds.values()) {
      beds.push(b);
    }

    const saveData = serializeMinecraftState(
      this.player.state,
      { day: this.dayNight.day, timeOfDay: this.dayNight.timeOfDay },
      mobs,
      blocks,
      dirtyChunks.map((c) => ({ roomId: room.id, ...c })),
      furnaces,
      chests,
      beds,
    );

    scene.setFlag('minecraft.save', saveData);
  }

  destroy(): void {
    this.renderLayer?.destroy();
    this.mobManager?.destroy();
    this.lighting?.destroy();
    this.chunkManager?.destroy();
    this.skyOverlay?.destroy();
  }
}
