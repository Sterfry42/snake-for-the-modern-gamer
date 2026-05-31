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
import { blockIdToColor, getBlockType } from './blockRegistry.js';
import { getMinecraftItem } from './itemRegistry.js';

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

    // Day/night tick
    this.dayNight?.tick();

    // Hunger tick
    if (scene.snakeGame.getFlag<number>('timeMs') % 600 === 0) {
      this.player.state.hunger = Math.max(
        0,
        this.player.state.hunger - 1,
      );
      if (this.player.state.hunger <= 0) {
        this.player.takeDamage(1);
      }
    }

    // Mob tick
    const mobs = this.mobManager?.getMobsInRoom(scene.snakeGame.getCurrentRoom().id) ?? [];
    const head = scene.snakeGame.getSnakeBody()[0];
    if (head) {
      this.lighting?.calculateLightMap(scene.snakeGame.getCurrentRoom().id);
      this.mobManager?.tickMobs(
        Math.floor(Number(scene.snakeGame.getFlag<number>('timeMs') ?? 0) / 100),
        head.x,
        head.y,
        scene.snakeGame.getCurrentRoom().id,
        (x, y, roomId) => this.lighting?.getLightLevel(x, y, roomId) ?? 0,
        (mobId, mx, my, roomId) => this.handleMobDeath(mobId, mx, my, roomId, scene),
      );
    }

    // Check for crafting table
    this.craftingTableNearby = false;
    if (head) {
      const room = scene.snakeGame.getCurrentRoom();
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

    if (button === 1) {
      // Break block (left click)
      const result = tryBreakBlock(scene, this.player, localX, localY);
      if (result.success && result.droppedItem) {
        this.player.addItem(result.droppedItem, result.droppedCount ?? 1);
        scene.setFlag('loot.itemPicked', {
          head: { x: localX, y: localY },
          itemName: getMinecraftItem(result.droppedItem)?.name ?? result.droppedItem,
          itemId: result.droppedItem,
        });
      }
      return true;
    } else if (button === 2) {
      // Place block
      const blockType = this.getHeldBlockType(scene);
      if (!blockType) {
        scene.setFlag('ui.questInteraction', { message: 'No block type to place. Break a block first.' });
        return true;
      }
      const result = tryPlaceBlock(scene, this.player, localX, localY, blockType);
      if (!result.success && result.message) {
        scene.setFlag('ui.questInteraction', { message: result.message });
      }
      return true;
    }

    return false;
  }

  private getHeldBlockType(scene: SnakeScene): string | null {
    // The last broken block or a selected block type
    // For simplicity, we cycle through common blocks based on what the player has
    const inventory = this.player?.state.inventory ?? [];
    const blockTypes = ['dirt', 'cobblestone', 'planks', 'stone', 'sand', 'torch'];
    for (const bt of blockTypes) {
      if (this.player?.getItemCount(bt) > 0 || this.player?.getItemCount(`${bt}`) > 0) {
        return bt;
      }
    }
    // Default to dirt if nothing else
    return 'dirt';
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

    const saveData = serializeMinecraftState(
      this.player.state,
      { day: this.dayNight.day, timeOfDay: this.dayNight.timeOfDay },
      mobs,
      blocks,
      dirtyChunks.map((c) => ({ roomId: room.id, ...c })),
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
