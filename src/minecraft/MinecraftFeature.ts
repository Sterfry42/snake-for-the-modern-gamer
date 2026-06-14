import { Feature } from '../features/feature.js';
import type SnakeScene from '../scenes/snakeScene.js';
import { MinecraftPlayer, isWalkable, canMineBlock, isWalkableWithCreativeOverride } from './player.js';
import { ChunkManager } from './chunk.js';
import { MinecraftRenderLayer } from './renderLayer.js';
import { MobManager } from './mobManager.js';
import { DayNightCycle } from './dayNight.js';
import { LightingSystem } from './lighting.js';
import { tryBreakBlock, tryPlaceBlock, tryBreakBlockCreative, tryPlaceBlockCreative } from './blockInteraction.js';
import { RECIPES, getRecipeById, canCraft, craft as craftRecipe, getCraftingTableRecipes } from './crafting.js';
import type { MinecraftSaveData, MobTypeId } from './types.js';
import {
  serializeMinecraftState,
  deserializeMinecraftState,
  getDefaultPlayerState,
} from './save.js';
import { PLAYER_MAX_HEALTH, PLAYER_MAX_HUNGER, DAY_LENGTH_TICKS, CHUNK_SIZE } from './config.js';
import {
  blockIdToColor,
  getBlockType,
  getBlockHardness,
  isSpecialBlock,
  isPlaceableSpecialBlock,
  isBlockableBlock,
} from './blockRegistry.js';
import { getMinecraftItem } from './itemRegistry.js';
import {
  tryPlaceFurnace,
  tryLoadFurnace,
  tickFurnaces,
  tryCollectFurnaceOutput,
  createFurnaceState,
  canSmelt,
  isFuel,
  getSmeltingTime,
  SMELTING_RECIPES,
  FUEL_MAP,
} from './furnace.js';
import {
  tryPlaceChest,
  tryDepositToChest,
  tryWithdrawFromChest,
  tryBreakChest,
  getChestContents,
} from './chest.js';
import { tryPlaceBed, trySleep, tryBreakBed } from './bed.js';
import {
  tryCreateFarmland,
  tryPlantSeeds,
  tryPlantPumpkin,
  tickCrops,
  tryHarvestCrop,
} from './farming.js';

export class MinecraftFeature extends Feature {
  private player: MinecraftPlayer | null = null;
  private chunkManager: ChunkManager | null = null;
  private renderLayer: MinecraftRenderLayer | null = null;
  private mobManager: MobManager | null = null;
  private dayNight: DayNightCycle | null = null;
  private lighting: LightingSystem | null = null;
  private minecraftMode = false;
  private craftingUI: Phaser.GameObjects.Container | null = null;
  private craftingUIOpen = false;
  private skyOverlay: Phaser.GameObjects.Graphics | null = null;
  private hudGraphics: Phaser.GameObjects.Graphics | null = null;
  private craftingTableNearby = false;
  private furnaces: Map<string, import('./furnace.js').FurnaceState> = new Map();
  private chests: Map<string, import('./chest.js').ChestState> = new Map();
  private beds: Map<string, import('./bed.js').BedState> = new Map();
  private lastActionStep: number = 0;
  private borderOverlay: Phaser.GameObjects.Graphics | null = null;
  private creativeMode = false;

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
    this.borderOverlay = scene.add.graphics().setDepth(100).setAlpha(0);
    this.hudGraphics = scene.add.graphics().setDepth(30);
    this.minecraftMode = false;
    this.creativeMode = false;

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
      this.player.state.hunger = Math.max(0, this.player.state.hunger - 1);
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
        (cx, cy, crId) => this.handleCreeperExplosion(scene, cx, cy),
      );
    }

    // Mob spawning
    if (head && this.dayNight) {
      const currentTime = Math.floor(tick / 100);
      const isNight = this.dayNight.isNight();
      const gridSize = scene.grid.cols;
      const lightLevelAt = (x: number, y: number, rId: string) =>
        this.lighting?.getLightLevel(x, y, rId) ?? 0;

      this.mobManager?.spawnMobsForRoom(
        room.id,
        isNight,
        gridSize,
        lightLevelAt,
        head.x,
        head.y,
        currentTime,
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
      this.borderOverlay?.clear().setAlpha(0);
      return;
    }

    // Draw green border to indicate Minecraft mode
    const width = scene.scale.width;
    const height = scene.scale.height;
    const borderWidth = 16;
    this.borderOverlay?.clear();
    this.borderOverlay?.fillStyle(0x33ff33, 0.6);
    // Top
    this.borderOverlay?.fillRect(0, 0, width, borderWidth);
    // Bottom
    this.borderOverlay?.fillRect(0, height - borderWidth, width, borderWidth);
    // Left
    this.borderOverlay?.fillRect(0, 0, borderWidth, height);
    // Right
    this.borderOverlay?.fillRect(width - borderWidth, 0, borderWidth, height);
    this.borderOverlay?.setAlpha(1);

    // Render creative mode palette bar
    if (this.creativeMode && this.player) {
      this.renderCreativePalette(scene);
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

    // Player health/hunger/XP UI
    if (this.player && scene.snakeGame.getFlag<boolean>('ui.livesRevealed')) {
      const hudText = scene.add
        .text(
          scene.scale.width - 120,
          8,
          this.buildHUDText(),
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
        if (this.player) {
          hudText.setText(this.buildHUDText());
          this.renderPlayerBars(scene);
        }
      });
    }
  }

  override onGameOver(scene: SnakeScene): void {
    if (!this.minecraftMode) return;

    // In creative mode, Minecraft-specific death is a no-op
    if (this.creativeMode) {
      scene.setFlag('ui.questInteraction', {
        message: 'Creative mode: You cannot die from hunger or mobs. The snake game still has its own death conditions.',
      });
      return;
    }

    // Death flow (survival mode): reset health and hunger, retain inventory and world
    this.minecraftMode = false;
    this.player?.resetHealth();
    this.player?.resetHunger();

    scene.setFlag('ui.questInteraction', {
      message: 'You died. Your Minecraft world was preserved.',
    });
  }

  toggleMode(scene: SnakeScene): void {
    this.minecraftMode = !this.minecraftMode;

    if (this.minecraftMode) {
      // Switch to Minecraft mode
      scene.setFlag('ui.suppressHud', true);
      scene.setFlag('ui.questInteraction', {
        message:
          'Minecraft mode: Shift+C to toggle. Shift+M for creative mode. Q to break block, R to place block. WASD to move. E to eat. F/G/H/J to equip armor. Right-click blocks to interact.',
      });

      // Set player spawn to current position
      const head = scene.snakeGame.getSnakeBody()[0];
      if (head) {
        const room = scene.snakeGame.getCurrentRoom();
        this.player?.setSpawn(head.x, head.y, room.id);
      }
    } else {
      this.creativeMode = false;
      // Switch back to snake mode
      scene.setFlag('ui.suppressHud', undefined);
      scene.setFlag('ui.questInteraction', undefined);
    }
  }

  getMode(): boolean {
    return this.minecraftMode;
  }

  toggleCreativeMode(scene: SnakeScene): void {
    if (!this.minecraftMode) {
      scene.setFlag('ui.questInteraction', {
        message: 'Enable Minecraft mode first with Shift+C.',
      });
      return;
    }

    this.creativeMode = !this.creativeMode;

    if (this.creativeMode) {
      this.player!.creativePaletteSlot = 0;
      scene.setFlag('ui.questInteraction', {
        message: 'Creative mode: Break and place blocks freely. Press [ or ] to cycle blocks. Shift+M to toggle creative.',
      });
    } else {
      scene.setFlag('ui.questInteraction', {
        message: 'Creative mode disabled.',
      });
    }
  }

  isCreativeMode(): boolean {
    return this.creativeMode;
  }

  cyclePaletteSlot(delta: number): void {
    this.player?.cyclePaletteSlot(delta);
  }

  updateHoveredBlock(worldX: number, worldY: number, scene: SnakeScene): void {
    if (!this.renderLayer) return;

    const room = scene.snakeGame.getCurrentRoom();
    const [roomX, roomY] = this.parseRoomCoordinates(room.id);
    const localX = Math.floor(
      (worldX - roomX * scene.grid.cols * scene.grid.cell) / scene.grid.cell,
    );
    const localY = Math.floor(
      (worldY - roomY * scene.grid.rows * scene.grid.cell) / scene.grid.cell,
    );

    const worldTileX = localX + roomX * scene.grid.cols;
    const worldTileY = localY + roomY * scene.grid.rows;

    // Clamp to room bounds
    if (
      worldTileX < 0 ||
      worldTileY < 0 ||
      worldTileX >= scene.grid.cols ||
      worldTileY >= scene.grid.rows
    ) {
      this.renderLayer.setHoveredBlock(-1, -1);
      return;
    }

    this.renderLayer.setHoveredBlock(worldTileX, worldTileY);
  }

  autoEquipArmorBySlot(slotName: string, scene: SnakeScene): boolean {
    if (!this.player) return false;
    const success = this.player.autoEquipArmor(slotName);
    if (success) {
      const armorItem = this.player.armorSlots[this.getSlotKey(slotName)] ?? '';
      const itemName = getMinecraftItem(armorItem)?.name ?? slotName;
      scene.setFlag('ui.questInteraction', { message: `Equipped ${itemName}!` });
    } else {
      scene.setFlag('ui.questInteraction', { message: `No ${slotName} in inventory.` });
    }
    return success;
  }

  autoUnequipArmorBySlot(slotName: string, scene: SnakeScene): boolean {
    if (!this.player) return false;
    const success = this.player.autoUnequipArmor(slotName);
    if (success) {
      const itemName = getMinecraftItem(this.player.armorSlots[this.getSlotKey(slotName)] ?? '')?.name ?? slotName;
      scene.setFlag('ui.questInteraction', { message: `Unequipped ${itemName}.` });
    } else {
      scene.setFlag('ui.questInteraction', { message: `Nothing equipped in ${slotName}.` });
    }
    return success;
  }

  private getSlotKey(suffix: string): string {
    const map: Record<string, string> = {
      helmet: 'head',
      chestplate: 'torso',
      leggings: 'legs',
      boots: 'feet',
    };
    return map[suffix] ?? '';
  }

  handlePointerDown(scene: SnakeScene, worldX: number, worldY: number, button: number): boolean {
    if (!this.minecraftMode || !this.player) return false;

    const room = scene.snakeGame.getCurrentRoom();
    const [roomX, roomY] = this.parseRoomCoordinates(room.id);
    const localX = Math.floor(
      (worldX - roomX * scene.grid.cols * scene.grid.cell) / scene.grid.cell,
    );
    const localY = Math.floor(
      (worldY - roomY * scene.grid.rows * scene.grid.cell) / scene.grid.cell,
    );

    // Convert to world coordinates in room
    const worldTileX = localX + roomX * scene.grid.cols;
    const worldTileY = localY + roomY * scene.grid.rows;

    // Clamp to room bounds
    if (
      worldTileX < 0 ||
      worldTileY < 0 ||
      worldTileX >= scene.grid.cols ||
      worldTileY >= scene.grid.rows
    ) {
      return false;
    }

    const blockType = room.minecraftBlocks?.[`${worldTileX},${worldTileY}`];

    if (button === 1) {
      // Left click: check for mobs first, then harvest/break
      const mobsAtPos = this.mobManager?.getMobsInRoom(room.id).filter(
        (m) => m.x === worldTileX && m.y === worldTileY,
      );
      if (mobsAtPos && mobsAtPos.length > 0) {
        const mob = mobsAtPos[0];
        const mobDef = mob.type === 'cow' ? { hostile: false } : { hostile: true };
        if (!mobDef.hostile) {
          scene.setFlag('ui.questInteraction', { message: "That's a friendly cow!" });
          return true;
        }
        const killed = this.mobManager!.damageMob(
          mob.id,
          5,
          (mobId, mx, my, mroomId) => {
            this.handleMobDeath(mobId, mx, my, mroomId, scene);
          },
        );
        scene.juice.mobHit(
          worldTileX * scene.grid.cell + scene.grid.cell / 2,
          worldTileY * scene.grid.cell + scene.grid.cell / 2,
        );
        return true;
      }

      // Left click: harvest crop or break block
      if (blockType === 'wheat_crop' || blockType === 'pumpkin') {
        const result = tryHarvestCrop(room, this.player, worldTileX, worldTileY, blockType);
        if (result.success) {
          scene.juice.blockBreak(
            worldTileX * scene.grid.cell + scene.grid.cell / 2,
            worldTileY * scene.grid.cell + scene.grid.cell / 2,
          );
          if (result.xp) {
            this.player.addXp(result.xp);
          }
        }
        if (result.message) {
          scene.setFlag('ui.questInteraction', { message: result.message });
        }
        return true;
      }

      // Break block
      if (this.creativeMode) {
        const creativeResult = tryBreakBlockCreative(scene, worldTileX, worldTileY, this.chunkManager);
        if (creativeResult.success) {
          // No drops in creative mode
        }
        if (creativeResult.message) {
          scene.setFlag('ui.questInteraction', { message: creativeResult.message });
        }
      } else {
        const result = tryBreakBlock(scene, this.player, worldTileX, worldTileY, this.chunkManager);
        if (result.success) {
          if (result.droppedItem) {
            this.player.addItem(result.droppedItem, result.droppedCount ?? 1);
            scene.setFlag('loot.itemPicked', {
              head: { x: worldTileX, y: worldTileY },
              itemName: getMinecraftItem(result.droppedItem)?.name ?? result.droppedItem,
              itemId: result.droppedItem,
            });
          }
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
      if (this.creativeMode) {
        const blockTypeForPlace = this.getCreativeBlockType();
        const placeResult = tryPlaceBlockCreative(scene, worldTileX, worldTileY, blockTypeForPlace, this.chunkManager);
        if (placeResult.message) {
          scene.setFlag('ui.questInteraction', { message: placeResult.message });
        }
      } else {
        const placeResult = this.tryPlaceBlockWithSelection(scene, worldTileX, worldTileY);
        if (!placeResult.success && placeResult.message) {
          scene.setFlag('ui.questInteraction', { message: placeResult.message });
        }
      }
      return true;
    }

    return false;
  }

  private interactWithFurnace(scene: SnakeScene, x: number, y: number): string {
    if (!this.player) return 'No player.';

    // Try to collect output first
    const collectResult = tryCollectFurnaceOutput(
      this.furnaces,
      this.player,
      x,
      y,
      scene.snakeGame.getCurrentRoom().id,
    );
    if (collectResult.success) {
      return 'Collected smelted items!';
    }
    if (collectResult.message && collectResult.message !== 'Nothing to collect.') {
      return collectResult.message;
    }

    // Try to load item
    const blockType = scene.snakeGame.getCurrentRoom().minecraftBlocks?.[`${x},${y}`];
    if (blockType !== 'furnace') return 'No furnace here.';

    // Try to load an input item to smelt first (data-driven from SMELTING_RECIPES)
    const smeltableItems = [...new Set(SMELTING_RECIPES.map((r) => r.input))];
    for (const itemId of smeltableItems) {
      if (this.player.getItemCount(itemId) > 0) {
        const result = tryLoadFurnace(
          this.furnaces,
          this.player,
          x,
          y,
          scene.snakeGame.getCurrentRoom().id,
          itemId,
        );
        if (result.success) {
          const smeltTime = getSmeltingTime(itemId);
          return `Loaded ${itemId} into furnace! (${smeltTime} ticks). Add fuel to start.`;
        }
      }
    }

    // Try to add fuel (data-driven from FUEL_MAP)
    const fuelItems = Object.keys(FUEL_MAP);
    for (const itemId of fuelItems) {
      if (this.player.getItemCount(itemId) > 0) {
        const result = tryLoadFurnace(
          this.furnaces,
          this.player,
          x,
          y,
          scene.snakeGame.getCurrentRoom().id,
          itemId,
        );
        if (result.success) {
          return `Added ${itemId} as fuel!`;
        }
      }
    }

    const smeltableNames = smeltableItems.map((id) => getMinecraftItem(id)?.name ?? id).join(', ');
    const fuelNames = fuelItems.map((id) => getMinecraftItem(id)?.name ?? id).join(', ');
    return `Add fuel (${fuelNames}) or items to smelt (${smeltableNames}).`;
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
        const result = tryDepositToChest(
          this.chests,
          this.player,
          x,
          y,
          scene.snakeGame.getCurrentRoom().id,
          itemId,
          this.player.getItemCount(itemId),
        );
        if (result.success) {
          return `Stored ${itemId} in chest!`;
        }
        if (result.message && !result.message.includes("You don't have")) {
          return result.message;
        }
      }
    }

    // Auto-withdraw: try to withdraw common items
    const wantedItems = [
      'iron_ingot',
      'gold_ingot',
      'cooked_beef',
      'bread',
      'diamond',
      'torch_item',
    ];
    for (const itemId of wantedItems) {
      if (contents.some((s) => s.itemId === itemId)) {
        const result = tryWithdrawFromChest(
          this.chests,
          this.player,
          x,
          y,
          scene.snakeGame.getCurrentRoom().id,
          itemId,
          1,
        );
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

  private tryFarmInteraction(
    scene: SnakeScene,
    x: number,
    y: number,
    room: import('../world/types.js').RoomSnapshot,
  ): string | null {
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
    if (this.craftingUIOpen) {
      this.closeCraftingUI(scene);
      return;
    }
    this.openCraftingUI(scene);
  }

  private openCraftingUI(scene: SnakeScene): void {
    if (!this.player) return;

    // Remove existing UI if any
    if (this.craftingUI) {
      this.craftingUI.destroy();
    }

    const recipes = getCraftingTableRecipes();
    const width = 340;
    const entryHeight = 52;
    const headerHeight = 40;
    const padding = 10;
    const height = headerHeight + recipes.length * entryHeight + padding * 2;
    const x = (scene.scale.width - width) / 2;
    const y = (scene.scale.height - height) / 2;

    const container = scene.add.container(x, y);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.95);
    bg.fillRect(0, 0, width, height);
    bg.lineStyle(2, 0x888888, 1);
    bg.strokeRect(0, 0, width, height);
    bg.setDepth(50);
    container.add(bg);

    // Title
    const titleText = scene.add
      .text(width / 2, 22, 'Crafting Table', {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(51);
    container.add(titleText);

    // Close button
    const closeBtn = scene.add
      .text(width - 24, 16, 'X', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ff6b6b',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(51);
    container.add(closeBtn);
    closeBtn.on('pointerdown', () => {
      this.closeCraftingUI(scene);
    });

    // Recipe list
    const listX = 10;
    const listY = headerHeight + padding;

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const entryY = listY + i * entryHeight;

      // Entry background
      const entryBg = scene.add.graphics();
      const canCraftNow = canCraft(recipe.id, this.player.state.inventory);
      const bgColor = canCraftNow ? 0x2a2a2a : 0x1e1e1e;
      entryBg.fillStyle(bgColor, 1);
      entryBg.fillRect(0, entryY, width - padding * 2, entryHeight - 2);
      entryBg.lineStyle(1, canCraftNow ? 0x5dd6a2 : 0x444444, 1);
      entryBg.strokeRect(0, entryY, width - padding * 2, entryHeight - 2);
      entryBg.setDepth(51);
      container.add(entryBg);

      // Recipe name
      const nameText = scene.add
        .text(listX + 4, entryY + 6, recipe.name, {
          fontFamily: 'monospace',
          fontSize: '12px',
          fontStyle: 'bold',
          color: canCraftNow ? '#ffffff' : '#666666',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setDepth(51);
      container.add(nameText);

      // Result item
      const resultItem = getMinecraftItem(recipe.result.itemId);
      const resultText = scene.add
        .text(listX + 4, entryY + 20, `→ ${recipe.result.count}x ${resultItem?.name ?? recipe.result.itemId}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#5dd6a2',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setDepth(51);
      container.add(resultText);

      // Ingredients text (truncated if too long)
      const ingreds = recipe.ingredients.map((ing) => {
        const item = getMinecraftItem(ing.itemId);
        return `${ing.count}x ${item?.name ?? ing.itemId}`;
      });
      const ingText = ingreds.join(', ');
      const ingLabel = scene.add
        .text(listX + 4, entryY + 34, `Need: ${ingText}`, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: canCraftNow ? '#aaaacc' : '#555555',
          stroke: '#000000',
          strokeThickness: 1,
          wordWrap: { width: width - padding * 2 - 70 },
        })
        .setDepth(51);
      container.add(ingLabel);

      // Craft button
      const craftBtnWidth = 60;
      const craftBtnHeight = 20;
      const craftBtnX = width - padding - craftBtnWidth - 4;
      const craftBtnY = entryY + (entryHeight - craftBtnHeight) / 2;

      const craftBtnBg = scene.add.graphics();
      const btnColor = canCraftNow ? 0x3a7a3a : 0x2a2a2a;
      craftBtnBg.fillStyle(btnColor, 1);
      craftBtnBg.fillRect(craftBtnX, craftBtnY, craftBtnWidth, craftBtnHeight);
      craftBtnBg.lineStyle(1, canCraftNow ? 0x5dd6a2 : 0x444444, 1);
      craftBtnBg.strokeRect(craftBtnX, craftBtnY, craftBtnWidth, craftBtnHeight);
      craftBtnBg.setDepth(51);
      container.add(craftBtnBg);

      const craftBtnText = scene.add
        .text(craftBtnX + craftBtnWidth / 2, craftBtnY + craftBtnHeight / 2, 'Craft', {
          fontFamily: 'monospace',
          fontSize: '11px',
          fontStyle: 'bold',
          color: canCraftNow ? '#ffffff' : '#555555',
          stroke: '#000000',
          strokeThickness: 2,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(52);
      container.add(craftBtnText);

      if (canCraftNow) {
        const btnRect = { x: craftBtnX, y: craftBtnY, width: craftBtnWidth, height: craftBtnHeight };

        const btnHitArea = scene.add.graphics();
        btnHitArea.fillStyle(0x000000, 0);
        btnHitArea.fillRect(btnRect.x, btnRect.y, btnRect.width, btnRect.height);
        btnHitArea.setName(`craft_${recipe.id}`);
        btnHitArea.setDepth(53);
        btnHitArea.setInteractive({ useHandCursor: true }, (_x: number, _y: number) => {
          return true;
        });
        container.add(btnHitArea);
        btnHitArea.on('pointerdown', () => {
          this.craftRecipe(scene, recipe.id);
        });
      }
    }

    // Click outside to close
    const closeArea = scene.add.graphics();
    closeArea.fillStyle(0x000000, 0);
    closeArea.fillRect(x, y, width, height);
    closeArea.setDepth(49);
    closeArea.setInteractive({ useHandCursor: true });
    closeArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if click is outside the main content area
      const isHeader = pointer.y >= y && pointer.y <= y + headerHeight;
      const isFooter = pointer.y >= y + height - padding && pointer.y <= y + height;
      const isSidebar = pointer.x < x + padding || pointer.x > x + width - padding;
      if (!isHeader && !isFooter && !isSidebar) {
        this.closeCraftingUI(scene);
      }
    });
    container.add(closeArea);
    closeArea.on('pointerdown', () => {
      this.closeCraftingUI(scene);
    });

    this.craftingUI = container;
    this.craftingUIOpen = true;
    scene.setFlag('ui.questInteraction', { message: 'Crafting table. Click a recipe to craft.' });
  }

  private closeCraftingUI(scene: SnakeScene): void {
    if (this.craftingUI) {
      this.craftingUI.destroy();
      this.craftingUI = null;
    }
    this.craftingUIOpen = false;
    scene.setFlag('ui.questInteraction', { message: 'Crafting table closed.' });
  }

  private buildHUDText(): string {
    if (!this.player) return '';
    const { state } = this.player;
    let text = `HP: ${state.health}/${state.maxHealth}  Food: ${state.hunger}/${state.maxHunger}`;

    // Add XP/level if available
    if (state.xpLevel > 0 || state.xp > 0) {
      const xpForNext = this.getXpForLevel(state.xpLevel);
      text += `  Lv${state.xpLevel}(${state.xp}/${xpForNext})`;
    }

    // Add armor info if wearing anything
    const armorPieces = Object.values(this.player.armorSlots).filter((s) => s !== null);
    if (armorPieces.length > 0) {
      text += `  Armor: ${this.player.state.armorPoints}`;
    }

    return text;
  }

  private getXpForLevel(level: number): number {
    if (level < 16) return level * 7;
    if (level < 32) return level * 7 + 40;
    return level * 7 + 120;
  }

  private craftRecipe(scene: SnakeScene, recipeId: string): void {
    if (!this.player) return;

    const result = craftRecipe(recipeId, this.player.state.inventory);
    if (result.success) {
      const recipe = getRecipeById(recipeId);
      if (recipe) {
        const resultItem = getMinecraftItem(recipe.result.itemId);
        scene.setFlag('ui.questInteraction', {
          message: `Crafted ${recipe.result.count}x ${resultItem?.name ?? recipe.result.itemId}!`,
        });
      }
      // Refresh the UI
      this.openCraftingUI(scene);
    } else {
      scene.setFlag('ui.questInteraction', { message: result.message ?? 'Failed to craft.' });
    }
  }

  private getCreativeBlockType(): string {
    const blockTypes = MinecraftPlayer.CREATIVE_BLOCK_TYPES;
    const slot = this.player?.creativePaletteSlot ?? 0;
    return blockTypes[slot] ?? blockTypes[0];
  }

  private getHeldBlockType(scene: SnakeScene): string | null {
    const inventory = this.player?.state.inventory ?? [];
    const blockTypes = [
      'dirt',
      'cobblestone',
      'planks',
      'stone',
      'sand',
      'torch',
      'furnace',
      'chest',
      'bed',
      'pumpkin',
    ];
    for (const bt of blockTypes) {
      if (this.player?.getItemCount(bt) > 0) {
        return bt;
      }
    }
    return 'dirt';
  }

  private tryPlaceBlockWithSelection(
    scene: SnakeScene,
    x: number,
    y: number,
  ): { success: boolean; message?: string } {
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
    return tryPlaceBlock(scene, this.player, x, y, blockType, this.chunkManager);
  }

  private handleMobDeath(
    mobId: string,
    x: number,
    y: number,
    roomId: string,
    scene: SnakeScene,
  ): void {
    if (!this.player) return;

    this.mobManager?.onMobDeath(mobId, (itemId, count) => {
      this.player?.addItem(itemId, count);
    });

    const mob = this.mobManager?.getMob(mobId);
    const mobType = mob?.type ?? 'zombie';
    if (mob) {
      const dropItem = this.getMobDropType(mobType);
      if (dropItem) {
        this.player.addItem(dropItem, 1);
        scene.setFlag('loot.itemPicked', {
          head: { x, y },
          itemName: getMinecraftItem(dropItem)?.name ?? dropItem,
          itemId: dropItem,
        });
      }
    }

    // Award XP for killing mobs
    const xpDrops: Record<string, number> = {
      zombie: 5,
      skeleton: 5,
      creeper: 5,
      cow: 3,
    };
    this.player.addXp(xpDrops[mobType] ?? 1);

    scene.juice.mobHit(
      x * scene.grid.cell + scene.grid.cell / 2,
      y * scene.grid.cell + scene.grid.cell / 2,
    );
  }

  private handleCreeperExplosion(scene: SnakeScene, cx: number, cy: number): void {
    const room = scene.snakeGame.getCurrentRoom();
    const explosionRadius = 3;

    for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
      for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > explosionRadius) continue;

        const bx = cx + dx;
        const by = cy + dy;
        const key = `${bx},${by}`;

        if (room.minecraftBlocks && room.minecraftBlocks[key]) {
          const blockType = room.minecraftBlocks[key];
          if (!['creeper', 'cow'].includes(blockType)) {
            const hardness = getBlockHardness(blockType) ?? 1;
            if (Math.random() < Math.max(0.2, 1 - hardness / 10)) {
              const chunkX = Math.floor(bx / CHUNK_SIZE);
              const chunkY = Math.floor(by / CHUNK_SIZE);
              const localX = bx - chunkX * CHUNK_SIZE;
              const localY = by - chunkY * CHUNK_SIZE;
              this.chunkManager?.removeBlock(room.id, chunkX, chunkY, localX, localY);
              delete room.minecraftBlocks[key];
            }
          }
        }
      }
    }

    scene.juice.blockBreak(
      cx * scene.grid.cell + scene.grid.cell / 2,
      cy * scene.grid.cell + scene.grid.cell / 2,
    );

    scene.setFlag('ui.questInteraction', { message: 'BOOM! A creeper exploded!' });
  }

  private getMobDropType(mobType: string): string | null {
    const dropMap: Record<string, string> = {
      zombie: 'rotten_flesh',
      skeleton: 'bones',
      creeper: 'gunpowder',
      cow: 'raw_beef',
    };
    return dropMap[mobType] ?? null;
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

  private renderCreativePalette(scene: SnakeScene): void {
    const blocks = MinecraftPlayer.CREATIVE_BLOCK_TYPES;
    if (blocks.length === 0) return;

    const slotSize = 28;
    const spacing = 32;
    const totalWidth = blocks.length * spacing;
    const panelX = (scene.scale.width - totalWidth) / 2;
    const panelY = 20;

    // Panel background
    scene.graphics.fillStyle(0x000000, 0.7);
    scene.graphics.fillRect(panelX - 4, panelY - 4, totalWidth + 8, slotSize + 24);

    // Draw each slot
    for (let i = 0; i < blocks.length; i++) {
      const x = panelX + i * spacing;
      const y = panelY;
      const blockType = blocks[i];
      const colorHex = blockIdToColor(blockType);
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;

      // Slot background
      scene.graphics.fillStyle(0x1a1a1a, 0.8);
      scene.graphics.fillRect(x, y, slotSize, slotSize);

      // Block color swatch
      scene.graphics.fillStyle(color, 1.0);
      scene.graphics.fillRect(x + 2, y + 2, slotSize - 4, slotSize - 4);

      // White border on selected slot
      if (i === this.player!.creativePaletteSlot) {
        scene.graphics.lineStyle(2, 0xffffff, 1);
        scene.graphics.strokeRect(x, y, slotSize, slotSize);
      }
    }

    // Block name label below the palette
    const selectedBlock = blocks[this.player!.creativePaletteSlot] ?? blocks[0];
    scene.add
      .text(
        scene.scale.width / 2,
        panelY + slotSize + 8,
        selectedBlock.toUpperCase(),
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(30);
  }

  private renderPlayerBars(scene: SnakeScene): void {
    if (!this.player) return;

    const hudGraphics = this.hudGraphics!;
    hudGraphics.clear();

    const hudX = scene.scale.width - 120;
    const hudY = 28;
    const barWidth = 100;
    const barHeight = 6;
    const padding = 4;

    // XP bar (cyan)
    const xpLevel = this.player.state.xpLevel;
    const xp = this.player.state.xp;
    const xpForNext = this.getXpForLevel(xpLevel);

    if (xpLevel > 0 || xp > 0) {
      const xpPercent = xpLevel === 0 ? Math.min(1, xp / xpForNext) : xp / xpForNext;
      hudGraphics.fillStyle(0x88ffff, 0.9);
      hudGraphics.fillRect(hudX, hudY, barWidth * xpPercent, barHeight);
      hudGraphics.lineStyle(1, 0x000000, 0.5);
      hudGraphics.strokeRect(hudX, hudY, barWidth, barHeight);
    }

    // Hunger bar (orange/brown)
    const hungerY = hudY + barHeight + padding;
    const hungerPercent = this.player.state.hunger / this.player.state.maxHunger;
    hudGraphics.fillStyle(0xff9944, 0.9);
    hudGraphics.fillRect(hudX, hungerY, barWidth * hungerPercent, barHeight);
    hudGraphics.lineStyle(1, 0x000000, 0.5);
    hudGraphics.strokeRect(hudX, hungerY, barWidth, barHeight);

    // Health bar (red) - below hunger
    const healthY = hungerY + barHeight + padding;
    const healthPercent = this.player.state.health / this.player.state.maxHealth;
    hudGraphics.fillStyle(0xff4444, 0.9);
    hudGraphics.fillRect(hudX, healthY, barWidth * healthPercent, barHeight);
    hudGraphics.lineStyle(1, 0x000000, 0.5);
    hudGraphics.strokeRect(hudX, healthY, barWidth, barHeight);
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
          this.chests.set(`${c.x},${c.y},${c.roomId}`, {
            x: c.x,
            y: c.y,
            roomId: c.roomId,
            slots: c.slots,
            locked: false,
          });
        }
      }
      // Restore beds
      if (data.beds) {
        for (const b of data.beds) {
          this.beds.set(`${b.x},${b.y},${b.roomId}`, b);
        }
      }
      // Restore creative mode state
      this.creativeMode = data.creativeMode ?? false;
      if (this.player && data.creativePaletteSlot != null) {
        this.player.creativePaletteSlot = data.creativePaletteSlot;
      }
    }
  }

  handleKeyboardBreak(scene: SnakeScene): boolean {
    if (!this.minecraftMode || !this.player) return false;

    const room = scene.snakeGame.getCurrentRoom();
    const head = scene.snakeGame.getSnakeBody()[0];
    if (!head) return false;

    // In creative mode, break at head position (snake positions itself to reach blocks)
    if (this.creativeMode) {
      const creativeResult = tryBreakBlockCreative(scene, head.x, head.y, this.chunkManager);
      if (creativeResult.success) {
        // No drops in creative mode
      }
      if (creativeResult.message) {
        scene.setFlag('ui.questInteraction', { message: creativeResult.message });
      }
      return true;
    }

    const blockType = room.minecraftBlocks?.[`${head.x},${head.y}`];

    // Harvest crops
    if (blockType === 'wheat_crop' || blockType === 'pumpkin') {
      const result = tryHarvestCrop(room, this.player, head.x, head.y, blockType);
      if (result.success) {
        scene.juice.blockBreak(
          head.x * scene.grid.cell + scene.grid.cell / 2,
          head.y * scene.grid.cell + scene.grid.cell / 2,
        );
        if (result.xp) {
          this.player.addXp(result.xp);
        }
      }
      if (result.message) {
        scene.setFlag('ui.questInteraction', { message: result.message });
      }
      return true;
    }

    // Break block
    const result = tryBreakBlock(scene, this.player, head.x, head.y, this.chunkManager);
    if (result.success) {
      if (result.droppedItem) {
        this.player.addItem(result.droppedItem, result.droppedCount ?? 1);
        scene.setFlag('loot.itemPicked', {
          head: { x: head.x, y: head.y },
          itemName: getMinecraftItem(result.droppedItem)?.name ?? result.droppedItem,
          itemId: result.droppedItem,
        });
      }
      // If breaking a furnace, chest, or bed, remove from tracking
      if (isPlaceableSpecialBlock(blockType)) {
        const key = `${head.x},${head.y},${room.id}`;
        if (blockType === 'furnace') this.furnaces.delete(key);
        if (blockType === 'chest') this.chests.delete(key);
        if (blockType === 'bed') this.beds.delete(key);
      }
    }
    if (result.message) {
      scene.setFlag('ui.questInteraction', { message: result.message });
    }
    return true;
  }

  tryEatFood(scene: SnakeScene): boolean {
    if (!this.minecraftMode || !this.player) return false;

    // Try to eat food items in order of preference
    const foodItems = ['cooked_beef', 'bread', 'raw_beef'];
    for (const foodItem of foodItems) {
      if (this.player.getItemCount(foodItem) > 0) {
        const success = this.player.eat(foodItem);
        if (success) {
          scene.setFlag('ui.questInteraction', {
            message: `Ate ${foodItem}! Hunger restored.`,
          });
          return true;
        }
      }
    }

    scene.setFlag('ui.questInteraction', {
      message: "No food in inventory! Craft/cook something to eat.",
    });
    return true;
  }

  handleKeyboardPlace(scene: SnakeScene): boolean {
    if (!this.minecraftMode || !this.player) return false;

    const room = scene.snakeGame.getCurrentRoom();
    const head = scene.snakeGame.getSnakeBody()[0];
    if (!head) return false;

    // In creative mode with keyboard place: place from palette
    if (this.creativeMode) {
      const blockType = this.getCreativeBlockType();
      const placeResult = tryPlaceBlockCreative(scene, head.x, head.y, blockType, this.chunkManager);
      if (placeResult.message) {
        scene.setFlag('ui.questInteraction', { message: placeResult.message });
      }
      return true;
    }

    const blockType = room.minecraftBlocks?.[`${head.x},${head.y}`];

    // Try special block interactions first
    if (blockType === 'furnace') {
      const result = this.interactWithFurnace(scene, head.x, head.y);
      if (result) {
        scene.setFlag('ui.questInteraction', { message: result });
        return true;
      }
      return true;
    }

    if (blockType === 'chest') {
      const result = this.interactWithChest(scene, head.x, head.y);
      if (result) {
        scene.setFlag('ui.questInteraction', { message: result });
        return true;
      }
      return true;
    }

    if (blockType === 'bed') {
      const result = this.tryBedSleep(scene, head.x, head.y);
      scene.setFlag('ui.questInteraction', { message: result });
      return true;
    }

    if (blockType === 'crafting_table') {
      this.toggleCraftingUI(scene);
      return true;
    }

    // Try farming interaction
    if (blockType === 'farmland') {
      const result = this.tryFarmInteraction(scene, head.x, head.y, room);
      if (result) {
        scene.setFlag('ui.questInteraction', { message: result });
        return true;
      }
      return true;
    }

    // Place block
    const placeResult = this.tryPlaceBlockWithSelection(scene, head.x, head.y);
    if (!placeResult.success && placeResult.message) {
      scene.setFlag('ui.questInteraction', { message: placeResult.message });
    }
    return true;
  }

  saveToScene(scene: SnakeScene): void {
    if (!this.player || !this.dayNight) return;

    const blocks: Array<{ roomId: string; x: number; y: number; blockType: string }> = [];
    const dirtyChunks =
      this.chunkManager?.getDirtyChunks(scene.snakeGame.getCurrentRoom().id) ?? [];

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
    const furnaces: Array<{
      x: number;
      y: number;
      roomId: string;
      progress: number;
      inputItem: string | null;
      outputItem: string | null;
      outputCount: number;
      fuelItem: string | null;
      fuelRemaining: number;
      burning: boolean;
    }> = [];
    for (const f of this.furnaces.values()) {
      furnaces.push(f);
    }

    // Serialize chests
    const chests: Array<{
      x: number;
      y: number;
      roomId: string;
      slots: Array<{ itemId: string; count: number }>;
    }> = [];
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
      this.creativeMode,
      this.player?.creativePaletteSlot ?? 0,
    );

    scene.setFlag('minecraft.save', saveData);
  }

  destroy(): void {
    this.renderLayer?.destroy();
    this.mobManager?.destroy();
    this.lighting?.destroy();
    this.chunkManager?.destroy();
    this.skyOverlay?.destroy();
    this.borderOverlay?.destroy();
    this.hudGraphics?.destroy();
  }
}
