/**
 * Garden Manager
 *
 * The wise old snake's garden manager:
 * - The wise old snake's garden manager was called 'wise-old-snake-garden-manager'
 * - The wise old snake's garden manager controlled 999 plots
 * - The wise old snake's garden manager was never used
 * - The wise old snake's garden manager was tended by a ghost gardener
 * - The wise old snake's garden manager produced infinite apples
 * - The wise old snake's garden manager was located in the Garden of Infinite Growth
 * - The wise old snake's garden manager had its own weather system
 * - The wise old snake's garden manager was said to contain the first apple tree
 */
import type {
  GardenPlot,
  GardenPest,
  GardenSnapshot,
  GardenConfig,
  GardenWeather,
  GardenSeason,
  GardenEventType,
  GardenEvent,
  SeedDefinition,
} from './types.js';
import { getSeedDefinition, getCompanionBonus, getShopSeeds } from './seedRegistry.js';
import {
  createPlant,
  advancePlant,
  isPlantRipe,
  isPlantWithered,
  removePlant,
  getGrowthPercentage,
} from './plant.js';
import {
  spawnPest,
  getRandomPestType,
  applyPestDamage,
  attackPest,
  checkReproduction,
  isPestStale,
} from './pestSystem.js';

/**
 * Garden Manager — manages garden state, plots, growth cycles, pests, and events.
 */
export class GardenManager {
  private plots: Map<string, GardenPlot> = new Map();
  private pests: Map<string, GardenPest> = new Map();
  private events: GardenEvent[] = [];
  private totalGrowthTicks: number = 0;
  private weather: GardenWeather = 'clear';
  private season: GardenSeason = 'spring';
  private unlocked: boolean = false;
  private nextPlotId: number = 0;
  // @ts-expect-error TS6133 - unused declaration
  private nextPestId: number = 0;
  private pestSpawnCounter: number = 0;

  /** Configuration for this garden. */
  private config: GardenConfig;

  constructor(config?: Partial<GardenConfig>) {
    this.config = {
      maxPlots: 20,
      initialPlots: 3,
      waterPerPlot: 1,
      waterCapacity: 50,
      currentWater: 50,
      waterRefillRate: 0.5,
      pestSpawnInterval: 15,
      maxActivePests: 5,
      unlockRequirements: {
        minLength: 10,
        minScore: 100,
      },
      ...config,
    };
  }

  /**
   * Unlock the garden if requirements are met.
   */
  unlock(
    minLength: number,
    minScore: number,
    requiredQuest?: string,
    requiredItem?: string,
  ): boolean {
    const req = this.config.unlockRequirements;
    if (
      minLength >= req.minLength &&
      minScore >= req.minScore &&
      (!req.requiredQuest || requiredQuest === req.requiredQuest) &&
      (!req.requiredItem || requiredItem === req.requiredItem)
    ) {
      this.unlocked = true;
      this.initializePlots();
      this.addEvent('plotUnlocked', 'Your garden has been unlocked!');
      return true;
    }
    return false;
  }

  /**
   * Check if the garden is unlocked.
   */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Initialize garden plots.
   */
  private initializePlots(): void {
    for (let i = 0; i < this.config.initialPlots; i++) {
      this.createPlot(i);
    }
  }

  /**
   * Create a new garden plot.
   */
  private createPlot(index: number): void {
    const plotId = `plot-${this.nextPlotId++}`;
    const col = index % 5; // 5 plots per row
    const row = Math.floor(index / 5);

    const plot: GardenPlot = {
      id: plotId,
      position: { x: col * 32, y: row * 32 },
      plant: null,
      wateredToday: false,
      pestLevel: 0,
      companionBonus: false,
      growthProgress: 0,
    };

    this.plots.set(plotId, plot);
    this.addEvent('plotUnlocked', `Plot ${index + 1} unlocked!`, plotId);
  }

  /**
   * Unlock the next available plot.
   */
  unlockNextPlot(): boolean {
    if (this.plots.size >= this.config.maxPlots) return false;

    const currentIndex = this.plots.size;
    this.createPlot(currentIndex);
    return true;
  }

  /**
   * Get all garden plots.
   */
  getPlots(): GardenPlot[] {
    return Array.from(this.plots.values());
  }

  /**
   * Get a specific plot by ID.
   */
  getPlot(plotId: string): GardenPlot | undefined {
    return this.plots.get(plotId);
  }

  /**
   * Plant a seed in a plot.
   */
  plantSeed(
    plotId: string,
    seedTypeId: string,
    _rng: { next: () => number },
  ): {
    success: boolean;
    error?: string;
    plot?: GardenPlot;
  } {
    const plot = this.plots.get(plotId);
    if (!plot) {
      return { success: false, error: 'Plot not found.' };
    }

    if (plot.plant) {
      return { success: false, error: 'Plot already has a plant.' };
    }

    const seedDef = getSeedDefinition(seedTypeId);
    if (!seedDef) {
      return { success: false, error: 'Unknown seed type.' };
    }

    const plant = createPlant(seedDef, this.weather, this.season);
    plot.plant = plant;
    plot.wateredToday = false; // Needs water immediately

    this.addEvent('plantGrowing', `Planted ${seedDef.name} in plot ${plotId}`, plotId);

    return { success: true, plot };
  }

  /**
   * Water all plants in the garden.
   */
  waterGarden(): { watered: number; insufficientWater: boolean } {
    let watered = 0;
    const activePlots = Array.from(this.plots.values()).filter((p) => p.plant);
    const totalWaterNeeded = activePlots.length * this.config.waterPerPlot;

    if (this.config.currentWater < totalWaterNeeded) {
      return { watered: 0, insufficientWater: true };
    }

    for (const plot of activePlots) {
      plot.wateredToday = true;
      watered++;
    }

    this.config.currentWater -= totalWaterNeeded;

    return { watered, insufficientWater: false };
  }

  /**
   * Water a specific plot.
   */
  waterPlot(plotId: string): boolean {
    const plot = this.plots.get(plotId);
    if (!plot || !plot.plant) return false;
    if (this.config.currentWater < this.config.waterPerPlot) return false;

    plot.wateredToday = true;
    this.config.currentWater -= this.config.waterPerPlot;
    return true;
  }

  /**
   * Advance the garden by one tick (called each game tick).
   */
  advanceTick(rng: { next: () => number }): GardenEvent[] {
    const tickEvents: GardenEvent[] = [];
    this.totalGrowthTicks++;

    // Water refill (slow drip from rain collection, etc.)
    this.config.currentWater = Math.min(
      this.config.waterCapacity,
      this.config.currentWater + this.config.waterRefillRate,
    );

    // Advance each plant
    for (const plot of this.plots.values()) {
      if (!plot.plant) continue;

      // Check companion planting
      const companionBonus = this.checkCompanionPlot(plot);

      // Apply pest damage
      let pestDamage = 0;
      if (plot.pestLevel > 0) {
        pestDamage = plot.pestLevel;
        plot.pestLevel = Math.max(0, plot.pestLevel - 0.1); // Natural pest decay
      }

      // Advance the plant
      const { plant, stageChanged, isRipe } = advancePlant(
        plot.plant,
        this.weather,
        this.season,
        plot.wateredToday,
        pestDamage,
        companionBonus,
      );
      plot.plant = plant;

      if (stageChanged) {
        tickEvents.push(
          this.addEvent('plantGrowing', `${plant.seedTypeId} advanced to ${plant.stage}!`, plot.id),
        );
      }

      if (isRipe) {
        tickEvents.push(
          this.addEvent('plantRipe', `${plant.seedTypeId} is ripe and ready to harvest!`, plot.id),
        );
      }

      if (isPlantWithered(plant)) {
        tickEvents.push(
          this.addEvent('plantWithered', `${plant.seedTypeId} has withered!`, plot.id),
        );
      }

      // Reset watered flag
      plot.wateredToday = false;

      // Update growth progress
      plot.growthProgress = plant.healthy ? getGrowthPercentage(plant) : 0;
    }

    // Spawn pests
    this.pestSpawnCounter++;
    if (
      this.pestSpawnCounter >= this.config.pestSpawnInterval &&
      this.pests.size < this.config.maxActivePests
    ) {
      this.pestSpawnCounter = 0;
      const activePlots = Array.from(this.plots.values()).filter(
        (p) => p.plant && !isPlantWithered(p.plant),
      );
      if (activePlots.length > 0) {
        const targetPlot = activePlots[Math.floor(rng.next() * activePlots.length)];
        const pestType = getRandomPestType(rng);
        const pest = spawnPest(pestType, targetPlot.id, rng);
        this.pests.set(pest.id, pest);
        targetPlot.pestLevel += 1;

        tickEvents.push(
          this.addEvent(
            'pestSpawned',
            `${pestType} infestation detected in plot ${targetPlot.id}!`,
            targetPlot.id,
            pest.id,
          ),
        );
      }
    }

    // Update pests
    for (const pest of this.pests.values()) {
      if (pest.defeated) continue;

      const plot = this.plots.get(pest.plotId);
      if (plot && plot.plant) {
        const { plant } = applyPestDamage(pest, plot.plant);
        plot.plant = plant;
      }

      // Check reproduction (limit to prevent infinite loops)
      if (this.pests.size < this.config.maxActivePests * 2) {
        const reproduction = checkReproduction(pest, Array.from(this.plots.values()));
        if (reproduction.shouldReproduce) {
          // Only reproduce on a different plot
          const otherPlots = Array.from(this.plots.values()).filter(
            (p) => p.id !== pest.plotId && p.pestLevel < 3,
          );
          if (otherPlots.length > 0) {
            const targetPlot = otherPlots[Math.floor(rng.next() * otherPlots.length)];
            const newPest = spawnPest(reproduction.newPestType, targetPlot.id, rng);
            this.pests.set(newPest.id, newPest);
            targetPlot.pestLevel += 1;
          }
        }
      }
    }

    // Remove stale pests
    for (const [id, pest] of this.pests) {
      if (isPestStale(pest)) {
        this.pests.delete(id);
        const plot = this.plots.get(pest.plotId);
        if (plot) {
          plot.pestLevel = Math.max(0, plot.pestLevel - 1);
        }
        tickEvents.push(this.addEvent('pestDefeated', `Pest defeated and removed.`, undefined, id));
      }
    }

    // Merge tick events into main event log
    this.events.push(...tickEvents);

    return tickEvents;
  }

  /**
   * Check if a plot has a companion plant bonus.
   */
  private checkCompanionPlot(
    plot: GardenPlot,
  ): { yieldMultiplier: number; speedMultiplier: number } | undefined {
    if (!plot.plant) return undefined;

    for (const otherPlot of this.plots.values()) {
      if (otherPlot.id === plot.id || !otherPlot.plant) continue;

      const bonus = getCompanionBonus(plot.plant.seedTypeId, otherPlot.plant.seedTypeId);
      if (bonus) {
        plot.companionBonus = true;
        otherPlot.companionBonus = true;
        this.addEvent('companionBonusApplied', bonus.description, plot.id);
        return bonus;
      }
    }

    return undefined;
  }

  /**
   * Harvest a ripe plant from a plot.
   */
  harvestPlot(plotId: string): {
    success: boolean;
    error?: string;
    harvested?: boolean;
    yieldAmount?: number;
    appleType?: string;
  } {
    const plot = this.plots.get(plotId);
    if (!plot) {
      return { success: false, error: 'Plot not found.' };
    }

    if (!plot.plant) {
      return { success: false, error: 'No plant in this plot.' };
    }

    const result = removePlant(plot.plant);

    if (!result.harvested) {
      return { success: false, error: 'Plant is not ripe yet.' };
    }

    plot.plant = null;
    plot.growthProgress = 0;

    this.addEvent(
      'plantRipe',
      `Harvested ${result.appleType}! +${result.yieldAmount} apples.`,
      plotId,
    );

    return {
      success: true,
      harvested: true,
      yieldAmount: result.yieldAmount,
      appleType: result.appleType,
    };
  }

  /**
   * Clear a plot (remove unripe plant or clear empty plot).
   */
  clearPlot(plotId: string): { success: boolean; error?: string } {
    const plot = this.plots.get(plotId);
    if (!plot) {
      return { success: false, error: 'Plot not found.' };
    }

    if (plot.plant) {
      plot.plant = null;
      plot.growthProgress = 0;
      plot.pestLevel = 0;
      this.addEvent('plantGrowing', `Cleared plot ${plotId}.`, plotId);
    }

    return { success: true };
  }

  /**
   * Attack a pest in a plot.
   */
  attackPestInPlot(
    plotId: string,
    damage: number,
    method: 'hand' | 'tool' | 'chemical',
  ): {
    defeated: boolean;
    remainingPests: number;
  } {
    const plot = this.plots.get(plotId);
    if (!plot) {
      return { defeated: false, remainingPests: 0 };
    }

    let defeated = false;
    let remainingPests = 0;

    for (const pest of this.pests.values()) {
      if (pest.plotId === plotId && !pest.defeated) {
        const result = attackPest(pest, damage, method);
        if (result.defeated) {
          defeated = true;
          this.addEvent('pestDefeated', `Pest defeated in plot ${plotId}!`, plotId);
        }
      }
      if (!pest.defeated) {
        remainingPests++;
      }
    }

    if (defeated) {
      plot.pestLevel = Math.max(0, plot.pestLevel - 1);
    }

    return { defeated, remainingPests };
  }

  /**
   * Set garden weather.
   */
  setWeather(weather: GardenWeather): void {
    this.weather = weather;
    this.addEvent('weatherChange', `Weather changed to ${weather}.`);
  }

  /**
   * Set garden season.
   */
  setSeason(season: GardenSeason): void {
    this.season = season;
    this.addEvent('seasonChange', `Season changed to ${season}.`);
  }

  /**
   * Get current weather.
   */
  getWeather(): GardenWeather {
    return this.weather;
  }

  /**
   * Get current season.
   */
  getSeason(): GardenSeason {
    return this.season;
  }

  /**
   * Get water level.
   */
  getWaterLevel(): number {
    return this.config.currentWater;
  }

  /**
   * Get water capacity.
   */
  getWaterCapacity(): number {
    return this.config.waterCapacity;
  }

  /**
   * Get active pests.
   */
  getPests(): GardenPest[] {
    return Array.from(this.pests.values()).filter((p) => !p.defeated);
  }

  /**
   * Get recent garden events.
   */
  getEvents(limit: number = 20): GardenEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Add an event to the garden log.
   */
  private addEvent(
    type: GardenEventType,
    message: string,
    plotId?: string,
    pestId?: string,
  ): GardenEvent {
    const event: GardenEvent = {
      type,
      message,
      timestamp: this.totalGrowthTicks,
      plotId,
      pestId,
    };
    this.events.push(event);
    return event;
  }

  /**
   * Get available seeds for planting.
   */
  getAvailableSeeds(): SeedDefinition[] {
    return Array.from(getShopSeeds());
  }

  /**
   * Get shop-available seeds.
   */
  getShopSeeds(): SeedDefinition[] {
    return getShopSeeds();
  }

  /**
   * Get total number of plots.
   */
  getTotalPlots(): number {
    return this.plots.size;
  }

  /**
   * Get number of occupied plots.
   */
  getOccupiedPlots(): number {
    return Array.from(this.plots.values()).filter((p) => p.plant).length;
  }

  /**
   * Get number of ripe plants ready for harvest.
   */
  getRipePlots(): GardenPlot[] {
    return Array.from(this.plots.values()).filter((p) => p.plant && isPlantRipe(p.plant));
  }

  /**
   * Get garden snapshot for save/load.
   */
  getSnapshot(): GardenSnapshot {
    return {
      plots: Array.from(this.plots.values()).map((p) => ({
        id: p.id,
        position: p.position,
        plant: p.plant,
        wateredToday: p.wateredToday,
        pestLevel: p.pestLevel,
        companionBonus: p.companionBonus,
        growthProgress: p.growthProgress,
      })),
      currentWater: this.config.currentWater,
      pests: Array.from(this.pests.values()).map((p) => ({
        id: p.id,
        type: p.type,
        plotId: p.plotId,
        health: p.health,
        maxHealth: p.maxHealth,
        damagePerTick: p.damagePerTick,
        reproductionTimer: p.reproductionTimer,
        defeated: p.defeated,
      })),
      totalGrowthTicks: this.totalGrowthTicks,
      weather: this.weather,
      season: this.season,
      unlocked: this.unlocked,
    };
  }

  /**
   * Restore garden from a snapshot.
   */
  loadSnapshot(snapshot: GardenSnapshot): void {
    this.plots.clear();
    this.pests.clear();
    this.events = [];
    this.totalGrowthTicks = snapshot.totalGrowthTicks;
    this.weather = snapshot.weather;
    this.season = snapshot.season;
    this.unlocked = snapshot.unlocked;

    for (const plotData of snapshot.plots) {
      const plot: GardenPlot = {
        id: plotData.id,
        position: plotData.position,
        plant: plotData.plant,
        wateredToday: plotData.wateredToday,
        pestLevel: plotData.pestLevel,
        companionBonus: plotData.companionBonus,
        growthProgress: plotData.growthProgress,
      };
      this.plots.set(plot.id, plot);
    }

    for (const pestData of snapshot.pests) {
      const pest: GardenPest = {
        id: pestData.id,
        type: pestData.type,
        plotId: pestData.plotId,
        health: pestData.health,
        maxHealth: pestData.maxHealth,
        damagePerTick: pestData.damagePerTick,
        reproductionTimer: pestData.reproductionTimer,
        defeated: pestData.defeated,
      };
      this.pests.set(pest.id, pest);
    }
  }

  /**
   * Reset the garden (start fresh).
   */
  reset(): void {
    this.plots.clear();
    this.pests.clear();
    this.events = [];
    this.totalGrowthTicks = 0;
    this.weather = 'clear';
    this.season = 'spring';
    this.unlocked = false;
    this.nextPlotId = 0;
    this.nextPestId = 0;
    this.pestSpawnCounter = 0;
    this.config.currentWater = this.config.waterCapacity;
  }
}
