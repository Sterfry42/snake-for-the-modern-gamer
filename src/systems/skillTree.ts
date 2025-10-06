export interface SkillPerkDefinition {
  readonly id: string;
  readonly title: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly rankDescriptions: readonly string[];
  readonly costByRank: readonly number[];
  readonly position: { x: number; y: number };
  readonly requires?: readonly string[];
  onPurchase(context: SkillPerkContext): void;
}

export interface SkillTreeStats {
  extraLives: number;
  scoreMultiplier: number;
  speedRank: number;
  growthRank: number;
  mana: number;
  manaMax: number;
  manaRegen: number;
  arcanePulseUnlocked: boolean;
  arcaneVeilUnlocked: boolean;
}

export interface SkillPerkContext {
  readonly runtime: SkillTreeRuntime;
  readonly system: SkillTreeSystem;
  readonly previousRank: number;
  readonly currentRank: number;
}

export type SkillPerkStatus = "available" | "locked" | "unaffordable" | "maxed";

export interface SkillPerkState {
  definition: SkillPerkDefinition;
  status: SkillPerkStatus;
  rank: number;
  cost?: number;
  missing?: readonly string[];
}

export interface SkillTreeRuntime {
  getScore(): number;
  addScore(amount: number): void;
  setTickDelay(delay: number): void;
  growSnake(extraSegments: number): void;
  notifyScoreMultiplierChanged(multiplier: number): void;
  notifyExtraLifeGained(): void;
  notifyExtraLifeConsumed(): void;
  notifyExtraLifeReset(): void;
  notifyManaChanged(current: number, max: number, regen: number): void;
  notifyManaUnlocked(): void;
  notifyArcanePulseUnlocked(): void;
  notifyArcaneVeilUnlocked(): void;
  onArcanePulseCast(): void;
  onArcaneVeilTriggered(): void;
}

const SPEED_FACTORS = [0.88, 0.72, 0.6];
const SPEED_COSTS = [12, 28, 55];
const SPEED_RANK_DESCRIPTIONS = [
  "-12% tick delay",
  "-28% tick delay",
  "-40% tick delay",
];

const EXTRA_LIFE_COSTS = [25, 60];
const EXTRA_LIFE_RANK_DESCRIPTIONS = [
  "Gain +1 extra life",
  "Gain a second extra life",
];

const SCORE_MULTIPLIERS = [1.25, 1.5];
const SCORE_MULTIPLIER_COSTS = [18, 40];
const SCORE_MULTIPLIER_RANK_DESCRIPTIONS = [
  "+25% score from apples",
  "+50% score from apples",
];

const GROWTH_COSTS = [10, 24, 50];
const GROWTH_SEGMENTS = [2, 3, 4];
const GROWTH_RANK_DESCRIPTIONS = [
  "+2 segments instantly",
  "+3 more segments",
  "+4 more segments",
];

const MANA_BLOOM_COST = [22];
const ARCANE_PULSE_COST = [28];
const STARLIGHT_VEIL_COST = [38];

const PERK_DEFINITIONS: SkillPerkDefinition[] = [
  {
    id: "speedster",
    title: "Swift Scales",
    shortLabel: "SPD",
    description: "You feel lighter. Movement speed amps up with every rank.",
    rankDescriptions: SPEED_RANK_DESCRIPTIONS,
    costByRank: SPEED_COSTS,
    position: { x: 0.18, y: 0.22 },
    onPurchase: (context) => {
      const factor = SPEED_FACTORS[Math.min(context.currentRank - 1, SPEED_FACTORS.length - 1)];
      const baseDelay = context.system.getBaseTickDelay();
      const newDelay = Math.max(30, Math.round(baseDelay * factor));
      context.runtime.setTickDelay(newDelay);
    },
  },
  {
    id: "secondWind",
    title: "Second Wind",
    shortLabel: "LIFE",
    description: "Bank a resurrection charge. Costs more each rank but saves skin.",
    rankDescriptions: EXTRA_LIFE_RANK_DESCRIPTIONS,
    costByRank: EXTRA_LIFE_COSTS,
    position: { x: 0.5, y: 0.2 },
    onPurchase: (context) => {
      context.system.addExtraLives(1);
      context.runtime.notifyExtraLifeGained();
    },
  },
  {
    id: "manaBloom",
    title: "Mana Bloom",
    shortLabel: "MANA",
    description: "Awaken latent arcana. Unlock a mana pool that restores over time.",
    rankDescriptions: ["Unlock mana pool (60 max, +1.2 regen)"],
    costByRank: MANA_BLOOM_COST,
    position: { x: 0.82, y: 0.22 },
    onPurchase: (context) => {
      context.system.enableMana({ max: 60, regen: 1.2 });
    },
  },
  {
    id: "tailForge",
    title: "Tail Forge",
    shortLabel: "GROW",
    description: "Instantly anneal extra tail length for more board control.",
    rankDescriptions: GROWTH_RANK_DESCRIPTIONS,
    costByRank: GROWTH_COSTS,
    position: { x: 0.26, y: 0.52 },
    requires: ["speedster"],
    onPurchase: (context) => {
      const growth = GROWTH_SEGMENTS[Math.min(context.currentRank - 1, GROWTH_SEGMENTS.length - 1)] ?? 0;
      if (growth > 0) {
        context.runtime.growSnake(growth);
      }
    },
  },
  {
    id: "scoreFlow",
    title: "Score Flow",
    shortLabel: "SCORE",
    description: "Milk more value from apples. Bonus score scales per rank.",
    rankDescriptions: SCORE_MULTIPLIER_RANK_DESCRIPTIONS,
    costByRank: SCORE_MULTIPLIER_COSTS,
    position: { x: 0.34, y: 0.74 },
    requires: ["tailForge"],
    onPurchase: (context) => {
      const multiplier =
        SCORE_MULTIPLIERS[Math.min(context.currentRank - 1, SCORE_MULTIPLIERS.length - 1)] ?? 1;
      context.system.setScoreMultiplier(multiplier);
      context.runtime.notifyScoreMultiplierChanged(multiplier);
    },
  },
  {
    id: "arcanePulse",
    title: "Arcane Pulse",
    shortLabel: "PULSE",
    description: "Channel mana into a serpentine blast that feeds and extends the serpent.",
    rankDescriptions: ["Unlock Arcane Pulse (press Q, costs 20 mana)"],
    costByRank: ARCANE_PULSE_COST,
    position: { x: 0.78, y: 0.48 },
    requires: ["manaBloom"],
    onPurchase: (context) => {
      context.system.unlockArcanePulse();
    },
  },
  {
    id: "starlightVeil",
    title: "Starlight Veil",
    shortLabel: "VEIL",
    description: "Mana flares into a protective shroud, saving you from fatal hits.",
    rankDescriptions: ["Unlock veil (auto-spend 30 mana to negate death)"],
    costByRank: STARLIGHT_VEIL_COST,
    position: { x: 0.6, y: 0.7 },
    requires: ["arcanePulse", "secondWind"],
    onPurchase: (context) => {
      context.system.upgradeMana({ maxBonus: 25, regenBonus: 0.6 });
      context.system.unlockArcaneVeil();
    },
  },
];

export class SkillTreeSystem {
  private readonly perkLookup = new Map<string, SkillPerkDefinition>();
  private readonly perkRanks = new Map<string, number>();
  private extraLifeCharges = 0;
  private scoreMultiplier = 1;

  private manaEnabled = false;
  private manaMax = 0;
  private manaCurrent = 0;
  private manaRegen = 0;
  private arcanePulseUnlocked = false;
  private arcaneVeilUnlocked = false;

  private readonly arcanePulseCost = 20;
  private readonly arcaneVeilCost = 30;

  constructor(
    private readonly runtime: SkillTreeRuntime,
    private readonly baseTickDelay: number
  ) {
    for (const definition of PERK_DEFINITIONS) {
      this.perkLookup.set(definition.id, definition);
    }
  }

  getBaseTickDelay(): number {
    return this.baseTickDelay;
  }

  getPerks(): SkillPerkDefinition[] {
    return PERK_DEFINITIONS;
  }

  getDefinition(perkId: string): SkillPerkDefinition | undefined {
    return this.perkLookup.get(perkId);
  }

  getArcanePulseCost(): number {
    return this.arcanePulseCost;
  }

  getArcaneVeilCost(): number {
    return this.arcaneVeilCost;
  }

  getRank(perkId: string): number {
    return this.perkRanks.get(perkId) ?? 0;
  }

  hasPerk(perkId: string): boolean {
    return this.getRank(perkId) > 0;
  }

  getPurchaseState(perkId: string): SkillPerkState {
    const definition = this.perkLookup.get(perkId);
    if (!definition) {
      throw new Error(`Unknown perk: ${perkId}`);
    }

    const rank = this.getRank(perkId);
    const maxRank = definition.costByRank.length;

    if (rank >= maxRank) {
      return { definition, rank, status: "maxed" };
    }

    const missing = (definition.requires ?? []).filter((reqId) => this.getRank(reqId) <= 0);
    if (missing.length > 0) {
      return { definition, rank, status: "locked", missing };
    }

    const cost = definition.costByRank[rank];
    if (this.runtime.getScore() < cost) {
      return { definition, rank, status: "unaffordable", cost };
    }

    return { definition, rank, status: "available", cost };
  }

  canPurchase(perkId: string): boolean {
    try {
      return this.getPurchaseState(perkId).status === "available";
    } catch {
      return false;
    }
  }

  purchase(perkId: string): { rank: number; cost: number } | null {
    const state = this.getPurchaseState(perkId);
    if (state.status !== "available" || state.cost === undefined) {
      return null;
    }

    this.runtime.addScore(-state.cost);

    const newRank = state.rank + 1;
    this.perkRanks.set(perkId, newRank);

    state.definition.onPurchase({
      runtime: this.runtime,
      system: this,
      currentRank: newRank,
      previousRank: state.rank,
    });

    return { rank: newRank, cost: state.cost };
  }

  addExtraLives(count: number): void {
    this.extraLifeCharges += count;
  }

  consumeExtraLife(): boolean {
    if (this.extraLifeCharges > 0) {
      this.extraLifeCharges -= 1;
      this.runtime.notifyExtraLifeConsumed();
      return true;
    }

    if (this.arcaneVeilUnlocked && this.trySpendMana(this.arcaneVeilCost)) {
      this.runtime.onArcaneVeilTriggered();
      return true;
    }

    return false;
  }

  setScoreMultiplier(multiplier: number): void {
    this.scoreMultiplier = Math.max(1, multiplier);
  }

  modifyScoreGain(amount: number): number {
    if (amount <= 0) {
      return amount;
    }
    return Math.max(1, Math.ceil(amount * this.scoreMultiplier));
  }

  enableMana({ max, regen }: { max: number; regen: number }): void {
    this.manaEnabled = true;
    this.manaMax = Math.max(this.manaMax, max);
    this.manaRegen = Math.max(this.manaRegen, regen);
    this.manaCurrent = this.manaMax;
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    this.runtime.notifyManaUnlocked();
  }

  upgradeMana({ maxBonus, regenBonus }: { maxBonus: number; regenBonus: number }): void {
    if (!this.manaEnabled) {
      return;
    }
    this.manaMax += maxBonus;
    this.manaRegen += regenBonus;
    this.manaCurrent = Math.min(this.manaMax, this.manaCurrent + maxBonus);
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
  }

  unlockArcanePulse(): void {
    this.arcanePulseUnlocked = true;
    if (!this.manaEnabled) {
      this.enableMana({ max: 50, regen: 1 });
    }
    this.runtime.notifyArcanePulseUnlocked();
  }

  unlockArcaneVeil(): void {
    this.arcaneVeilUnlocked = true;
    this.runtime.notifyArcaneVeilUnlocked();
  }

  tryCastArcanePulse(): boolean {
    if (!this.arcanePulseUnlocked) {
      return false;
    }
    if (!this.trySpendMana(this.arcanePulseCost)) {
      return false;
    }
    this.runtime.onArcanePulseCast();
    return true;
  }

  tick(): void {
    if (!this.manaEnabled || this.manaRegen <= 0) {
      return;
    }
    const before = this.manaCurrent;
    this.manaCurrent = Math.min(this.manaMax, this.manaCurrent + this.manaRegen);
    if (Math.abs(this.manaCurrent - before) >= 0.01) {
      this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    }
  }

  getStats(): SkillTreeStats {
    return {
      extraLives: this.extraLifeCharges,
      scoreMultiplier: this.scoreMultiplier,
      speedRank: this.getRank("speedster"),
      growthRank: this.getRank("tailForge"),
      mana: this.manaCurrent,
      manaMax: this.manaMax,
      manaRegen: this.manaRegen,
      arcanePulseUnlocked: this.arcanePulseUnlocked,
      arcaneVeilUnlocked: this.arcaneVeilUnlocked,
    };
  }

  getManaState(): { mana: number; max: number; regen: number; enabled: boolean } {
    return {
      mana: this.manaCurrent,
      max: this.manaMax,
      regen: this.manaRegen,
      enabled: this.manaEnabled,
    };
  }

  reset(): void {
    this.perkRanks.clear();
    this.extraLifeCharges = 0;
    this.scoreMultiplier = 1;

    this.manaEnabled = false;
    this.manaMax = 0;
    this.manaCurrent = 0;
    this.manaRegen = 0;
    this.arcanePulseUnlocked = false;
    this.arcaneVeilUnlocked = false;

    this.runtime.setTickDelay(this.baseTickDelay);
    this.runtime.notifyScoreMultiplierChanged(1);
    this.runtime.notifyExtraLifeReset();
    this.runtime.notifyManaChanged(0, 0, 0);
  }

  isPerkAvailable(perkId: string): boolean {
    try {
      return this.getPurchaseState(perkId).status !== "locked";
    } catch {
      return false;
    }
  }

  private trySpendMana(amount: number): boolean {
    if (!this.manaEnabled || this.manaCurrent < amount) {
      return false;
    }
    this.manaCurrent -= amount;
    this.runtime.notifyManaChanged(this.manaCurrent, this.manaMax, this.manaRegen);
    return true;
  }
}
