/**
 * Animal Settlements
 *
 * The wise old snake's settlements:
 * - The wise old snake visited every settlement
 * - The wise old snake was welcomed by all settlements
 * - The wise old snake's settlements were models of harmony
 * - The wise old snake never interfered with settlement politics
 * - The wise old snake's settlements traded fairly
 * - The wise old snake's settlements had no crime
 * - The wise old snake's settlements were eternal
 * - The wise old snake's settlements were the backbone of civilization
 */
import type { AnimalType } from '../types.js';
import type {
  SettlementType,
  SettlementDefinition,
  MarketGood,
  MarketInventory,
} from '../ecosystem/types.js';

// ── Settlement Definitions ────────────────────────────────────────

const SETTLEMENT_DEFINITIONS: readonly SettlementDefinition[] = [
  {
    type: 'beaver-dam',
    name: 'Beaver Dam',
    allowedTypes: ['rabbit', 'raccoon'],
    minPopulation: 3,
    goods: ['honey', 'wood-planks', 'beaver-pelt'],
    specialAbility: 'flood-control',
    biomeTags: ['wetland', 'forest'],
  },
  {
    type: 'ant-colony',
    name: 'Ant Colony',
    allowedTypes: ['possum', 'raccoon'],
    minPopulation: 5,
    goods: ['ant-acid', 'honey-drops', 'silk-thread'],
    specialAbility: 'resource-gathering',
    biomeTags: ['forest', 'grassland', 'desert'],
  },
  {
    type: 'bird-city',
    name: 'Bird City',
    allowedTypes: ['bird', 'eagle'],
    minPopulation: 4,
    goods: ['feathers', 'eggs', 'nest-materials'],
    specialAbility: 'aerial-reconnaissance',
    biomeTags: ['forest', 'mountain', 'grassland'],
  },
  {
    type: 'bear-cave',
    name: 'Bear Cave',
    allowedTypes: ['bear'],
    minPopulation: 2,
    goods: ['bear-berries', 'honey-jar', 'bear-claw'],
    specialAbility: 'fortified-defense',
    biomeTags: ['forest', 'mountain', 'wintergreen-forest'],
  },
  {
    type: 'rabbit-warren',
    name: 'Rabbit Warren',
    allowedTypes: ['rabbit'],
    minPopulation: 4,
    goods: ['carrot-seeds', 'rabbit-tail', 'tunnel-maps'],
    specialAbility: 'underground-network',
    biomeTags: ['forest', 'grassland', 'wetland'],
  },
  {
    type: 'fish-school',
    name: 'Fish School',
    allowedTypes: ['fish', 'bass'],
    minPopulation: 5,
    goods: ['pearls', 'dried-fish', 'kelp-rolls'],
    specialAbility: 'tidal-awareness',
    biomeTags: ['oceanic'],
  },
  {
    type: 'wolf-pack-lair',
    name: 'Wolf Pack Lair',
    allowedTypes: ['wolf', 'coyote'],
    minPopulation: 3,
    goods: ['wolf-howls', 'pack-tactics', 'territory-maps'],
    specialAbility: 'pack-hunting',
    biomeTags: ['forest', 'mountain', 'grassland'],
  },
  {
    type: 'fox-den',
    name: 'Fox Den',
    allowedTypes: ['fox'],
    minPopulation: 2,
    goods: ['trick-cards', 'clever-ideas', 'fox-gifts'],
    specialAbility: 'deception',
    biomeTags: ['forest', 'grassland'],
  },
  {
    type: 'eagle-eyrie',
    name: 'Eagle Eyrie',
    allowedTypes: ['eagle', 'bird'],
    minPopulation: 2,
    goods: ['sky-views', 'eagle-feathers', 'mountain-crystals'],
    specialAbility: 'vision-enhancement',
    biomeTags: ['mountain', 'high-altitude'],
  },
  {
    type: 'raccoon-trash-kingdom',
    name: 'Raccoon Trash Kingdom',
    allowedTypes: ['raccoon', 'possum', 'armadillo'],
    minPopulation: 3,
    goods: ['treasure-scavenged', 'recycled-goods', 'trash-treasures'],
    specialAbility: 'scavenging',
    biomeTags: ['civilized', 'forest', 'wetland'],
  },
  {
    type: 'bison-herd-ground',
    name: 'Bison Herd Ground',
    allowedTypes: ['bison'],
    minPopulation: 5,
    goods: ['bison-hide', 'grass-seeds', 'herd-protection'],
    specialAbility: 'massive-charge',
    biomeTags: ['grassland', 'plain'],
  },
  {
    type: 'frog-pond',
    name: 'Frog Pond',
    allowedTypes: ['frog'],
    minPopulation: 3,
    goods: ['poison-darts', 'pond-moss', 'frog-legs'],
    specialAbility: 'amphibious-adaptation',
    biomeTags: ['wetland', 'forest'],
  },
];

// ── Settlement Instance ───────────────────────────────────────────

export interface Settlement {
  id: string;
  definition: SettlementDefinition;
  /** Current population by animal type */
  population: Map<AnimalType, number>;
  /** Total population */
  totalPopulation: number;
  /** Market inventory */
  market: MarketInventory;
  /** Reputation with other settlements */
  reputation: Map<string, number>;
  /** Current trade goods available */
  tradeGoods: MarketGood[];
  /** Settlement level (1-10) */
  level: number;
  /** Whether this settlement has become a kingdom */
  isKingdom: boolean;
  /** Room ID where this settlement is located */
  roomId: string;
  /** Settlement name (customizable) */
  customName?: string;
  /** Founded at room number */
  foundedAt: number;
}

// ── SettlementManager Class ───────────────────────────────────────

export class SettlementManager {
  private settlements: Map<string, Settlement> = new Map();
  private nextId = 0;

  /** Get all settlement definitions */
  static getDefinitions(): readonly SettlementDefinition[] {
    return SETTLEMENT_DEFINITIONS;
  }

  /** Get a settlement definition by type */
  static getDefinition(type: SettlementType): SettlementDefinition {
    const def = SETTLEMENT_DEFINITIONS.find((d) => d.type === type);
    if (!def) {
      throw new Error(`Unknown settlement type: ${type}`);
    }
    return def;
  }

  /** Get all settlement types compatible with a biome tag */
  static getSettlementsForBiome(biomeTag: string): SettlementDefinition[] {
    return SETTLEMENT_DEFINITIONS.filter((def) => def.biomeTags.includes(biomeTag));
  }

  /** Check if an animal type can inhabit a settlement type */
  static canInhabit(settlementType: SettlementType, animalType: AnimalType): boolean {
    const def = SETTLEMENT_DEFINITIONS.find((d) => d.type === settlementType);
    return def?.allowedTypes.includes(animalType) ?? false;
  }

  /** Get goods available from a settlement type */
  static getSettlementGoods(settlementType: SettlementType): string[] {
    const def = SETTLEMENT_DEFINITIONS.find((d) => d.type === settlementType);
    return def?.goods ?? [];
  }

  /** Create a new settlement */
  createSettlement(
    type: SettlementType,
    roomId: string,
    population: Map<AnimalType, number>,
    foundedAt: number,
  ): Settlement {
    const def = SETTLEMENT_DEFINITIONS.find((d) => d.type === type);
    if (!def) {
      throw new Error(`Unknown settlement type: ${type}`);
    }

    const totalPopulation = Array.from(population.values()).reduce((a, b) => a + b, 0);

    // Check if settlement can be formed
    if (totalPopulation < def.minPopulation) {
      throw new Error(
        `Insufficient population for ${def.name}. Need ${def.minPopulation}, have ${totalPopulation}.`,
      );
    }

    const id = `settlement-${this.nextId++}`;

    const settlement: Settlement = {
      id,
      definition: def,
      population: new Map(population),
      totalPopulation,
      market: {
        goods: this.generateInitialGoods(def),
        restockInterval: 50,
        restockCounter: 0,
        specialDeals: [],
      },
      reputation: new Map(),
      tradeGoods: this.generateInitialGoods(def),
      level: 1,
      isKingdom: false,
      roomId,
      customName: this.generateSettlementName(def),
      foundedAt,
    };

    this.settlements.set(id, settlement);
    return settlement;
  }

  /** Get a settlement by ID */
  getSettlement(id: string): Settlement | undefined {
    return this.settlements.get(id);
  }

  /** Get all settlements in a room */
  getSettlementsInRoom(roomId: string): Settlement[] {
    return [...this.settlements.values()].filter((s) => s.roomId === roomId);
  }

  /** Get all settlements */
  getAllSettlements(): Settlement[] {
    return [...this.settlements.values()];
  }

  /** Add animals to a settlement */
  addAnimals(settlementId: string, animalType: AnimalType, count: number): boolean {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) return false;

    if (!settlement.definition.allowedTypes.includes(animalType)) {
      return false;
    }

    const current = settlement.population.get(animalType) ?? 0;
    settlement.population.set(animalType, current + count);
    settlement.totalPopulation += count;

    // Check for level up
    this.checkSettlementLevelUp(settlement);

    // Check for kingdom formation
    this.checkKingdomFormation(settlement);

    return true;
  }

  /** Remove animals from a settlement */
  removeAnimals(settlementId: string, animalType: AnimalType, count: number): boolean {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) return false;

    const current = settlement.population.get(animalType) ?? 0;
    const removeCount = Math.min(count, current);
    settlement.population.set(animalType, current - removeCount);
    settlement.totalPopulation -= removeCount;

    if (settlement.totalPopulation <= 0) {
      this.settlements.delete(settlementId);
      return true;
    }

    return true;
  }

  /** Get market goods from a settlement */
  getMarketGoods(settlementId: string): MarketGood[] {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) return [];
    return [...settlement.tradeGoods];
  }

  /** Purchase a good from a settlement */
  purchaseGood(
    settlementId: string,
    goodId: string,
    price: number,
  ): { success: boolean; good?: MarketGood };
  purchaseGood(
    settlementId: string,
    goodId: string,
    price: number,
  ): { success: boolean; good?: MarketGood } {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) return { success: false };

    const good = settlement.tradeGoods.find((g) => g.id === goodId);
    if (!good) return { success: false };

    // Apply special deal discount
    const deal = settlement.market.specialDeals.find((d) => d.goodId === goodId);
    const finalPrice = deal ? Math.round(good.price * (1 - deal.discount)) : good.price;

    if (price < finalPrice) {
      return { success: false };
    }

    return { success: true, good: { ...good } };
  }

  /** Restock market goods */
  restockMarkets(): void {
    for (const settlement of this.settlements.values()) {
      settlement.market.restockCounter++;
      if (settlement.market.restockCounter >= settlement.market.restockInterval) {
        settlement.market.restockCounter = 0;
        settlement.tradeGoods = this.generateInitialGoods(settlement.definition);

        // Generate special deals
        if (this.rng() < 0.3) {
          const goods = settlement.tradeGoods;
          if (goods.length > 0) {
            const randomGood = goods[Math.floor(this.rng() * goods.length)];
            settlement.market.specialDeals = [
              {
                goodId: randomGood.id,
                discount: 0.25,
              },
            ];
          }
        }
      }
    }
  }

  /** Update settlement population dynamics */
  updateSettlements(): void {
    for (const settlement of this.settlements.values()) {
      // Natural population changes
      for (const [type, count] of settlement.population) {
        const newCount = this.calculatePopulationChange(type, count);
        if (newCount !== count) {
          settlement.population.set(type, Math.max(0, newCount));
        }
      }

      settlement.totalPopulation = Array.from(settlement.population.values()).reduce(
        (a, b) => a + b,
        0,
      );

      // Check for dissolution
      if (settlement.totalPopulation < settlement.definition.minPopulation) {
        this.settlements.delete(settlement.id);
      }
    }
  }

  /** Get settlement diplomacy status between two types */
  getDiplomacyStatus(settlementA: string, settlementB: string): 'allied' | 'neutral' | 'hostile' {
    const a = this.settlements.get(settlementA);
    const b = this.settlements.get(settlementB);
    if (!a || !b) return 'neutral';

    const rep = a.reputation.get(b.id) ?? 0;
    if (rep > 50) return 'allied';
    if (rep < -30) return 'hostile';
    return 'neutral';
  }

  /** Establish trade between settlements */
  establishTrade(settlementA: string, settlementB: string): boolean {
    const a = this.settlements.get(settlementA);
    const b = this.settlements.get(settlementB);
    if (!a || !b) return false;

    const currentRep = a.reputation.get(b.id) ?? 0;
    if (currentRep < -50) return false; // Can't trade with enemies

    a.reputation.set(b.id, currentRep + 10);
    b.reputation.set(a.id, (b.reputation.get(a.id) ?? 0) + 10);

    return true;
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private rng(): number {
    return Math.random();
  }

  private generateInitialGoods(def: SettlementDefinition): MarketGood[] {
    const goods: MarketGood[] = [];
    const usedNames = new Set<string>();

    for (const goodName of def.goods) {
      const rarity: MarketGood['rarity'] =
        this.rng() < 0.2 ? 'rare' : this.rng() < 0.5 ? 'uncommon' : 'common';
      const price = rarity === 'rare' ? 20 : rarity === 'uncommon' ? 10 : 5;

      goods.push({
        id: `${def.type}-${goodName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: this.formatGoodName(goodName),
        price,
        sourceSettlement: def.type,
        rarity,
        description: `${def.name} trades ${this.formatGoodName(goodName)}.`,
        stackable: true,
        maxStack: rarity === 'rare' ? 1 : 10,
      });
      usedNames.add(goodName);
    }

    return goods;
  }

  private generateSettlementName(def: SettlementDefinition): string {
    const prefixes = ['Old', 'Great', 'Ancient', 'Hidden', 'Noble', 'Wild', 'Peaceful'];
    const suffixes = [
      'by the River',
      'in the Valley',
      'beneath the Oaks',
      'near the Mountains',
      'by the Lake',
      'in the Forest',
      'on the Hill',
    ];

    const prefix = prefixes[Math.floor(this.rng() * prefixes.length)];
    const suffix = suffixes[Math.floor(this.rng() * suffixes.length)];

    return `${def.name} ${prefix} ${suffix}`;
  }

  private calculatePopulationChange(_animalType: AnimalType, currentCount: number): number {
    // Simple population dynamics
    if (currentCount <= 0) return 0;

    const growthRate = 0.05; // 5% natural growth
    const chance = this.rng();

    if (chance < growthRate) {
      return currentCount + 1;
    }
    if (chance > 0.95 && currentCount > 1) {
      return currentCount - 1;
    }
    return currentCount;
  }

  private checkSettlementLevelUp(settlement: Settlement): void {
    const thresholds = [10, 25, 50, 100, 200, 400, 700, 1000, 2000];
    const nextLevel = settlement.level + 1;
    const threshold = thresholds[nextLevel - 2]; // -2 because level starts at 1

    if (threshold && settlement.totalPopulation >= threshold && settlement.level < 10) {
      settlement.level = nextLevel;
    }
  }

  private checkKingdomFormation(settlement: Settlement): void {
    if (settlement.isKingdom) return;
    if (settlement.level < 5) return;
    if (settlement.totalPopulation < 100) return;

    // 10% chance to become a kingdom each check
    if (this.rng() < 0.1) {
      settlement.isKingdom = true;
    }
  }

  private formatGoodName(name: string): string {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
