import {
  STARFORGED_ACTIVITIES,
  STARFORGED_FACTIONS,
  STARFORGED_GEAR,
  STARFORGED_MODIFIERS,
  STARFORGED_PERKS,
  STARFORGED_SUBCLASSES,
} from './starforgedContent.js';
import type {
  StarforgedActivityDefinition,
  StarforgedActivityKind,
  StarforgedActivityProgress,
  StarforgedActivityResult,
  StarforgedAppliedEffects,
  StarforgedAppleContext,
  StarforgedContentIndex,
  StarforgedFactionProgress,
  StarforgedGearDefinition,
  StarforgedGearRoll,
  StarforgedRuntimeState,
  StarforgedSlot,
  StarforgedStatBlock,
  StarforgedSubclassDefinition,
  StarforgedTickContext,
} from './starforgedTypes.js';

const STAT_KEYS: Array<keyof StarforgedStatBlock> = [
  'mobility',
  'resilience',
  'recovery',
  'discipline',
  'intellect',
  'strength',
];

export const STARFORGED_CONTENT: StarforgedContentIndex = {
  perks: STARFORGED_PERKS,
  gear: STARFORGED_GEAR,
  activities: STARFORGED_ACTIVITIES,
  factions: STARFORGED_FACTIONS,
  subclasses: STARFORGED_SUBCLASSES,
  modifiers: STARFORGED_MODIFIERS,
};

export interface StarforgedSystemOptions {
  seed?: string;
  content?: StarforgedContentIndex;
}

export class StarforgedSystem {
  readonly content: StarforgedContentIndex;
  private readonly seed: string;

  constructor(options: StarforgedSystemOptions = {}) {
    this.seed = options.seed ?? 'starforged-default-seed';
    this.content = options.content ?? STARFORGED_CONTENT;
  }

  createInitialState(): StarforgedRuntimeState {
    const starter = this.rollGear('intro-cache', 0, 'starter');
    const kinetic = starter.find((roll) => this.getGear(roll.definitionId)?.slot === 'kinetic');
    const energy = starter.find((roll) => this.getGear(roll.definitionId)?.slot === 'energy');
    const heavy = starter.find((roll) => this.getGear(roll.definitionId)?.slot === 'heavy');
    const helmet = starter.find((roll) => this.getGear(roll.definitionId)?.slot === 'helmet');
    const activeActivity = this.content.activities[0];
    const subclass = this.content.subclasses[0];

    return {
      version: 1,
      active: false,
      relicAvailable: false,
      relicLoreSeen: false,
      questStage: 'dormant',
      relicRoomId: undefined,
      relicPosition: undefined,
      recruiterName: undefined,
      artifactRoomId: undefined,
      artifactPosition: undefined,
      artifactName: undefined,
      tick: 0,
      season: 1,
      playerPower: 10,
      artifactPower: 0,
      glimmer: 250,
      legendaryShards: 0,
      superEnergy: 0,
      abilityEnergy: 0,
      lootLuck: 0,
      activeActivityId: activeActivity?.id ?? 'starforged-vanguard-0',
      weeklyModifierIds: this.pickWeeklyModifiers(1),
      inventory: starter,
      loadout: {
        subclassId: subclass?.id ?? 'suncoil-runner',
        equipped: {
          kinetic: kinetic?.instanceId,
          energy: energy?.instanceId,
          heavy: heavy?.instanceId,
          helmet: helmet?.instanceId,
        },
      },
      activityProgress: {},
      factionProgress: this.createFactionProgress(),
      triumphs: {},
      recentRewards: [],
      recentDrops: [],
    };
  }

  normalizeState(state?: Partial<StarforgedRuntimeState>): StarforgedRuntimeState {
    const initial = this.createInitialState();
    if (!state) {
      return initial;
    }
    return {
      ...initial,
      ...state,
      loadout: {
        ...initial.loadout,
        ...(state.loadout ?? {}),
        equipped: {
          ...initial.loadout.equipped,
          ...(state.loadout?.equipped ?? {}),
        },
      },
      activityProgress: { ...initial.activityProgress, ...(state.activityProgress ?? {}) },
      factionProgress: { ...initial.factionProgress, ...(state.factionProgress ?? {}) },
      triumphs: { ...initial.triumphs, ...(state.triumphs ?? {}) },
      inventory: [...(state.inventory ?? initial.inventory)],
      recentRewards: [...(state.recentRewards ?? initial.recentRewards)],
      recentDrops: [...(state.recentDrops ?? initial.recentDrops)],
      weeklyModifierIds:
        state.weeklyModifierIds && state.weeklyModifierIds.length > 0
          ? [...state.weeklyModifierIds]
          : initial.weeklyModifierIds,
    };
  }

  tick(state: StarforgedRuntimeState, context: StarforgedTickContext): StarforgedActivityResult {
    const next = this.normalizeState(state);
    if (!next.active) {
      this.copyState(state, next);
      return { completed: false, rewards: [], scoreBonus: 0, growthBonus: 0, shieldTicks: 0 };
    }
    next.tick += 1;
    next.playerPower = this.computePlayerPower(next);
    next.artifactPower = Math.max(next.artifactPower, Math.floor(context.roomsVisited / 18));
    next.abilityEnergy = Math.min(100, next.abilityEnergy + this.getAbilityRecharge(next));
    next.superEnergy = Math.min(100, next.superEnergy + 1 + Math.floor(context.score / 75));
    next.lootLuck = this.computeLootLuck(next);

    const activity = this.getActivity(next.activeActivityId);
    if (!activity) {
      return { completed: false, rewards: [], scoreBonus: 0, growthBonus: 0, shieldTicks: 0 };
    }

    const progress = this.ensureActivityProgress(next, activity.id);
    this.advanceActivityProgress(progress, activity, context);

    if (progress.objectiveProgress < activity.objective.target) {
      this.copyState(state, next);
      return {
        completed: false,
        activity,
        rewards: [],
        scoreBonus: 0,
        growthBonus: 0,
        shieldTicks: 0,
      };
    }

    const rewards = this.completeActivity(next, activity);
    const bonuses = this.computeRewardBonuses(next, rewards);
    const message = `${activity.name} complete: ${rewards.map((reward) => this.getGear(reward.definitionId)?.name ?? reward.definitionId).join(', ')}`;
    next.recentRewards = [message, ...next.recentRewards].slice(0, 6);
    this.copyState(state, next);
    return { completed: true, activity, rewards, ...bonuses, message };
  }

  appleEaten(
    state: StarforgedRuntimeState,
    context: StarforgedAppleContext,
  ): StarforgedActivityResult {
    const next = this.normalizeState(state);
    if (!next.active) {
      this.copyState(state, next);
      return { completed: false, rewards: [], scoreBonus: 0, growthBonus: 0, shieldTicks: 0 };
    }
    next.tick += 1;
    next.glimmer += 10 + Math.floor(context.streak / 2);
    next.abilityEnergy = Math.min(100, next.abilityEnergy + 8 + this.getAbilityRecharge(next));
    next.superEnergy = Math.min(100, next.superEnergy + 5 + Math.floor(context.streak / 3));
    next.playerPower = this.computePlayerPower(next);

    const activity = this.getActivity(next.activeActivityId);
    if (!activity) {
      this.copyState(state, next);
      return { completed: false, rewards: [], scoreBonus: 0, growthBonus: 0, shieldTicks: 0 };
    }

    const progress = this.ensureActivityProgress(next, activity.id);
    if (activity.objective.kind === 'eatApples') {
      progress.objectiveProgress += context.appleTypeId === 'gold' ? 2 : 1;
    } else if (activity.objective.kind === 'chainStreak') {
      progress.objectiveProgress = Math.max(progress.objectiveProgress, context.streak);
    } else if (activity.objective.kind === 'score') {
      progress.objectiveProgress = Math.max(progress.objectiveProgress, context.score);
    }

    if (progress.objectiveProgress < activity.objective.target) {
      this.copyState(state, next);
      return {
        completed: false,
        activity,
        rewards: [],
        scoreBonus: 0,
        growthBonus: 0,
        shieldTicks: 0,
      };
    }

    const rewards = this.completeActivity(next, activity);
    const bonuses = this.computeRewardBonuses(next, rewards);
    const message = `${activity.name} complete: ${rewards.map((reward) => this.getGear(reward.definitionId)?.name ?? reward.definitionId).join(', ')}`;
    next.recentRewards = [message, ...next.recentRewards].slice(0, 6);
    this.copyState(state, next);
    return { completed: true, activity, rewards, ...bonuses, message };
  }

  activateBestActivity(state: StarforgedRuntimeState): StarforgedActivityDefinition | undefined {
    const power = this.computePlayerPower(state);
    const candidates = this.content.activities
      .filter((activity) => activity.recommendedPower <= power + 8)
      .sort((a, b) => b.recommendedPower - a.recommendedPower || a.name.localeCompare(b.name));
    const selected = candidates[0] ?? this.content.activities[0];
    if (selected) {
      state.activeActivityId = selected.id;
    }
    return selected;
  }

  activateNextActivity(
    state: StarforgedRuntimeState,
    preferredKind?: StarforgedActivityKind,
  ): StarforgedActivityDefinition | undefined {
    const power = this.computePlayerPower(state);
    const progress = state.activityProgress[state.activeActivityId];
    const completions = progress?.completions ?? 0;
    const candidates = this.content.activities
      .filter((activity) => activity.recommendedPower <= power + 18)
      .filter((activity) => !preferredKind || activity.kind === preferredKind)
      .sort((a, b) => a.recommendedPower - b.recommendedPower || a.name.localeCompare(b.name));
    const list = candidates.length > 0 ? candidates : [...this.content.activities];
    const currentIndex = Math.max(
      0,
      list.findIndex((activity) => activity.id === state.activeActivityId),
    );
    const selected = list[(currentIndex + completions + 1) % list.length] ?? list[0];
    if (selected) {
      state.activeActivityId = selected.id;
      this.ensureActivityProgress(state, selected.id);
    }
    return selected;
  }

  getSubclasses(): readonly StarforgedSubclassDefinition[] {
    return this.content.subclasses;
  }

  setSubclass(
    state: StarforgedRuntimeState,
    subclassId: string,
  ): {
    ok: boolean;
    message: string;
    subclass?: StarforgedSubclassDefinition;
  } {
    const subclass = this.content.subclasses.find((entry) => entry.id === subclassId);
    if (!subclass) {
      return { ok: false, message: 'That class frequency does not exist.' };
    }
    state.loadout.subclassId = subclass.id;
    state.abilityEnergy = Math.min(100, state.abilityEnergy + 25);
    return { ok: true, message: `Class tuned: ${subclass.name}.`, subclass };
  }

  claimFactionEngram(state: StarforgedRuntimeState): {
    ok: boolean;
    message: string;
    rewards: StarforgedGearRoll[];
  } {
    const faction = Object.values(state.factionProgress).find((entry) => entry.engrams > 0);
    if (!faction) {
      return { ok: false, message: 'No Starforged engrams are ready.', rewards: [] };
    }
    const definition = this.content.factions.find((entry) => entry.id === faction.factionId);
    if (!definition) {
      return { ok: false, message: 'The Envoy cannot identify that faction signal.', rewards: [] };
    }
    faction.engrams -= 1;
    const rewards = this.rollFromTable(
      definition.rewardTable,
      `engram:${definition.id}`,
      state.tick + faction.rank + faction.reputation,
      definition.name,
      2,
    );
    state.inventory.push(...rewards);
    state.recentDrops = [...rewards, ...state.recentDrops].slice(0, 12);
    this.equipBestByPower(state);
    const names = rewards.map(
      (reward) => this.getGear(reward.definitionId)?.name ?? reward.definitionId,
    );
    return {
      ok: true,
      message: `${definition.name} engram decoded: ${names.join(', ')}.`,
      rewards,
    };
  }

  unlockRelic(state: StarforgedRuntimeState): void {
    state.relicAvailable = true;
    if (state.questStage === 'dormant') {
      state.questStage = 'recruiter';
    }
  }

  activateRelic(state: StarforgedRuntimeState): void {
    if (!state.relicAvailable) {
      state.relicAvailable = true;
    }
    state.active = true;
    state.relicLoreSeen = true;
    state.questStage = 'active';
    this.activateBestActivity(state);
    this.equipBestByPower(state);
  }

  spendAbility(state: StarforgedRuntimeState): {
    ok: boolean;
    message: string;
    scoreBonus: number;
    shieldTicks: number;
  } {
    if (!state.active) {
      return {
        ok: false,
        message: 'The Heliopause Relic is dormant.',
        scoreBonus: 0,
        shieldTicks: 0,
      };
    }
    if (state.abilityEnergy < 100) {
      return {
        ok: false,
        message: `Ability charging: ${Math.floor(state.abilityEnergy)}/100.`,
        scoreBonus: 0,
        shieldTicks: 0,
      };
    }
    const subclass = this.content.subclasses.find((entry) => entry.id === state.loadout.subclassId);
    state.abilityEnergy = 0;
    const scoreBonus = 8 + (subclass?.passive.scoreBonus ?? 0);
    const shieldTicks = 4 + (subclass?.passive.shieldTicks ?? 0);
    return {
      ok: true,
      message: `${subclass?.grenadeName ?? 'Relic Burst'} released.`,
      scoreBonus,
      shieldTicks,
    };
  }

  spendSuper(state: StarforgedRuntimeState): {
    ok: boolean;
    message: string;
    scoreBonus: number;
    growthBonus: number;
    shieldTicks: number;
  } {
    if (!state.active) {
      return {
        ok: false,
        message: 'The Heliopause Relic is dormant.',
        scoreBonus: 0,
        growthBonus: 0,
        shieldTicks: 0,
      };
    }
    if (state.superEnergy < 100) {
      return {
        ok: false,
        message: `Super charging: ${Math.floor(state.superEnergy)}/100.`,
        scoreBonus: 0,
        growthBonus: 0,
        shieldTicks: 0,
      };
    }
    const subclass = this.content.subclasses.find((entry) => entry.id === state.loadout.subclassId);
    state.superEnergy = 0;
    return {
      ok: true,
      message: `${subclass?.superName ?? 'Starforged Super'} detonated.`,
      scoreBonus: 35 + (subclass?.passive.scoreBonus ?? 0) * 4,
      growthBonus: 1 + (subclass?.passive.growthBonus ?? 0),
      shieldTicks: 10 + (subclass?.passive.shieldTicks ?? 0),
    };
  }

  computeAppliedEffects(state: StarforgedRuntimeState): StarforgedAppliedEffects {
    if (!state.active) {
      return {
        scoreBonus: 0,
        growthBonus: 0,
        shieldTicks: 0,
        wallSense: 0,
        lootLuck: 0,
        speedScalar: 1,
        appleScorePenalty: 0,
        abilityRecharge: 0,
      };
    }
    const effects: StarforgedAppliedEffects = {
      scoreBonus: 0,
      growthBonus: 0,
      shieldTicks: 0,
      wallSense: 0,
      lootLuck: 0,
      speedScalar: 1,
      appleScorePenalty: 0,
      abilityRecharge: this.getAbilityRecharge(state),
    };

    const equippedInstanceIds = new Set(Object.values(state.loadout.equipped).filter(Boolean));
    for (const roll of state.inventory) {
      if (!equippedInstanceIds.has(roll.instanceId)) {
        continue;
      }
      const definition = this.getGear(roll.definitionId);
      if (!definition) {
        continue;
      }
      effects.wallSense += definition.stats.intellect >= 20 ? 1 : 0;
      effects.shieldTicks += definition.stats.resilience >= 22 ? 1 : 0;
      effects.lootLuck +=
        definition.rarity === 'exotic' ? 2 : definition.rarity === 'mythic' ? 3 : 0;
      for (const perkId of roll.perks) {
        const perk = this.content.perks.find((entry) => entry.id === perkId);
        if (!perk) {
          continue;
        }
        effects.scoreBonus += perk.effects.scoreBonus ?? 0;
        effects.growthBonus += perk.effects.growthBonus ?? 0;
        effects.shieldTicks += perk.effects.shieldTicks ?? 0;
        effects.wallSense += perk.effects.wallSense ?? 0;
        effects.lootLuck += perk.effects.lootLuck ?? 0;
        effects.abilityRecharge += perk.effects.abilityEnergy ?? 0;
        effects.speedScalar = Math.min(effects.speedScalar, perk.effects.speedScalar ?? 1);
      }
    }
    effects.appleScorePenalty = effects.scoreBonus > 0 ? -Math.min(0, effects.scoreBonus) : 0;
    return effects;
  }

  equipBestByPower(state: StarforgedRuntimeState): void {
    const bySlot = new Map<StarforgedSlot, StarforgedGearRoll>();
    for (const roll of state.inventory) {
      const definition = this.getGear(roll.definitionId);
      if (!definition) {
        continue;
      }
      const current = bySlot.get(definition.slot);
      if (!current || roll.power > current.power) {
        bySlot.set(definition.slot, roll);
      }
    }
    for (const [slot, roll] of bySlot) {
      state.loadout.equipped[slot] = roll.instanceId;
    }
    state.playerPower = this.computePlayerPower(state);
  }

  getGear(definitionId: string): StarforgedGearDefinition | undefined {
    return this.content.gear.find((gear) => gear.id === definitionId);
  }

  getActivity(activityId: string): StarforgedActivityDefinition | undefined {
    return this.content.activities.find((activity) => activity.id === activityId);
  }

  getEquippedDefinitions(state: StarforgedRuntimeState): StarforgedGearDefinition[] {
    const ids = new Set(Object.values(state.loadout.equipped).filter(Boolean));
    return state.inventory
      .filter((roll) => ids.has(roll.instanceId))
      .map((roll) => this.getGear(roll.definitionId))
      .filter((gear): gear is StarforgedGearDefinition => Boolean(gear));
  }

  computePlayerPower(state: StarforgedRuntimeState): number {
    const equipped = Object.values(state.loadout.equipped).filter(Boolean);
    const rolls = state.inventory.filter((roll) => equipped.includes(roll.instanceId));
    if (rolls.length === 0) {
      return 10 + state.artifactPower;
    }
    const average = Math.floor(rolls.reduce((sum, roll) => sum + roll.power, 0) / rolls.length);
    return average + state.artifactPower;
  }

  getDisplaySummary(state: StarforgedRuntimeState): string[] {
    if (!state.active) {
      return state.relicAvailable
        ? [
            'Heliopause recruiter nearby',
            'Press E beside them to join',
            'Press L for Destiny 3 Director',
          ]
        : ['Starforged dormant', 'A relic signal sleeps nearby'];
    }
    const activity = this.getActivity(state.activeActivityId);
    const progress = activity ? this.ensureActivityProgress(state, activity.id) : null;
    const objective =
      activity && progress
        ? `${progress.objectiveProgress}/${activity.objective.target} ${activity.objective.kind}`
        : 'No activity';
    return [
      `Destiny 3 Power ${this.computePlayerPower(state)}`,
      activity ? `${activity.name}: ${objective}` : objective,
      `Super ${Math.floor(state.superEnergy)} | Ability ${Math.floor(state.abilityEnergy)}`,
    ];
  }

  private createFactionProgress(): Record<string, StarforgedFactionProgress> {
    const progress: Record<string, StarforgedFactionProgress> = {};
    for (const faction of this.content.factions) {
      progress[faction.id] = {
        factionId: faction.id,
        reputation: 0,
        rank: 0,
        engrams: 0,
      };
    }
    return progress;
  }

  private pickWeeklyModifiers(season: number): string[] {
    if (this.content.modifiers.length === 0) {
      return [];
    }
    const picked: string[] = [];
    for (let i = 0; i < Math.min(3, this.content.modifiers.length); i += 1) {
      const index = this.hash(`week:${this.seed}:${season}:${i}`) % this.content.modifiers.length;
      const modifier = this.content.modifiers[index];
      if (modifier && !picked.includes(modifier.id)) {
        picked.push(modifier.id);
      }
    }
    return picked;
  }

  private rollGear(activityId: string, tick: number, source: string): StarforgedGearRoll[] {
    const activity = this.getActivity(activityId);
    const table = activity?.rewardTable.length
      ? activity.rewardTable
      : this.content.gear.slice(0, 6).map((gear) => gear.id);
    const count =
      source === 'starter'
        ? Math.min(4, table.length)
        : 1 + (this.hash(`${activityId}:${tick}:count`) % 2);
    const rolls: StarforgedGearRoll[] = [];
    for (let i = 0; i < count; i += 1) {
      const definitionId =
        table[this.hash(`${this.seed}:${activityId}:${tick}:${i}:reward`) % table.length];
      const definition = definitionId ? this.getGear(definitionId) : undefined;
      if (!definition) {
        continue;
      }
      const masterwork =
        STAT_KEYS[this.hash(`${definition.id}:mw:${tick}:${i}`) % STAT_KEYS.length];
      const perkCount = definition.rarity === 'exotic' || definition.rarity === 'mythic' ? 3 : 2;
      const perks = this.pickPerks(definition, tick + i, perkCount);
      rolls.push({
        instanceId: `${definition.id}:${tick}:${i}:${this.hash(`${definition.id}:${tick}:${i}`).toString(36)}`,
        definitionId: definition.id,
        power:
          definition.power +
          Math.floor(tick / 24) +
          (this.hash(`${definition.id}:power:${tick}`) % 5),
        masterwork,
        perks,
        acquiredFrom: source,
        acquiredAtTick: tick,
      });
    }
    return rolls;
  }

  private rollFromTable(
    table: readonly string[],
    salt: string,
    tick: number,
    source: string,
    count: number,
  ): StarforgedGearRoll[] {
    if (table.length === 0) {
      return [];
    }
    const rolls: StarforgedGearRoll[] = [];
    for (let i = 0; i < count; i += 1) {
      const definitionId =
        table[this.hash(`${this.seed}:${salt}:${tick}:${i}:reward`) % table.length];
      const definition = definitionId ? this.getGear(definitionId) : undefined;
      if (!definition) {
        continue;
      }
      const masterwork =
        STAT_KEYS[this.hash(`${definition.id}:engram:mw:${tick}:${i}`) % STAT_KEYS.length];
      rolls.push({
        instanceId: `${definition.id}:engram:${tick}:${i}:${this.hash(`${definition.id}:engram:${tick}:${i}`).toString(36)}`,
        definitionId: definition.id,
        power: definition.power + Math.floor(tick / 20) + 3,
        masterwork,
        perks: this.pickPerks(definition, tick + i + 17, definition.rarity === 'exotic' ? 3 : 2),
        acquiredFrom: source,
        acquiredAtTick: tick,
      });
    }
    return rolls;
  }

  private pickPerks(definition: StarforgedGearDefinition, salt: number, count: number): string[] {
    const perks: string[] = [];
    for (let column = 1; column <= 5 && perks.length < count; column += 1) {
      const candidates = definition.perkPool
        .map((perkId) => this.content.perks.find((perk) => perk.id === perkId))
        .filter((perk) => perk && perk.column === column);
      if (candidates.length === 0) {
        continue;
      }
      const picked =
        candidates[this.hash(`${definition.id}:${salt}:${column}`) % candidates.length];
      if (picked && !perks.includes(picked.id)) {
        perks.push(picked.id);
      }
    }
    return perks;
  }

  private advanceActivityProgress(
    progress: StarforgedActivityProgress,
    activity: StarforgedActivityDefinition,
    context: StarforgedTickContext,
  ): void {
    switch (activity.objective.kind) {
      case 'visitRooms':
        progress.objectiveProgress = Math.max(progress.objectiveProgress, context.roomsVisited);
        break;
      case 'score':
        progress.objectiveProgress = Math.max(progress.objectiveProgress, context.score);
        break;
      case 'surviveTicks':
        progress.objectiveProgress += 1;
        break;
      case 'defeatEnemies':
        progress.objectiveProgress += context.enemiesDefeated ?? 0;
        break;
      case 'collectPowerups':
        progress.objectiveProgress += context.powerupsCollected ?? 0;
        break;
      case 'eatApples':
      case 'chainStreak':
        break;
    }
  }

  private completeActivity(
    state: StarforgedRuntimeState,
    activity: StarforgedActivityDefinition,
  ): StarforgedGearRoll[] {
    const progress = this.ensureActivityProgress(state, activity.id);
    progress.completions += 1;
    progress.streak += 1;
    progress.encountersCleared += activity.encounterCount;
    progress.objectiveProgress = 0;

    const faction = state.factionProgress[activity.factionId];
    if (faction) {
      faction.reputation += 80 + activity.recommendedPower * 2;
      const definition = this.content.factions.find((entry) => entry.id === faction.factionId);
      const nextRank =
        definition?.reputationTrack.findIndex((value) => faction.reputation < value) ?? -1;
      faction.rank =
        nextRank === -1 && definition ? definition.reputationTrack.length : Math.max(0, nextRank);
      if (faction.reputation >= 250 * Math.max(1, faction.engrams + 1)) {
        faction.engrams += 1;
      }
    }

    const rewards = this.rollGear(activity.id, state.tick, activity.name);
    state.inventory.push(...rewards);
    this.equipBestByPower(state);
    state.recentDrops = [...rewards, ...state.recentDrops].slice(0, 12);
    state.legendaryShards += rewards.filter((reward) => {
      const rarity = this.getGear(reward.definitionId)?.rarity;
      return rarity === 'legendary' || rarity === 'exotic' || rarity === 'mythic';
    }).length;
    return rewards;
  }

  private computeRewardBonuses(
    state: StarforgedRuntimeState,
    rewards: StarforgedGearRoll[],
  ): { scoreBonus: number; growthBonus: number; shieldTicks: number } {
    let scoreBonus = rewards.length * 5;
    let growthBonus = 0;
    let shieldTicks = 0;
    const equipped = this.getEquippedDefinitions(state);
    for (const definition of equipped) {
      scoreBonus += Math.floor(definition.stats.intellect / 10);
      growthBonus += definition.rarity === 'exotic' ? 1 : 0;
      shieldTicks += definition.stats.resilience >= 18 ? 2 : 0;
    }
    for (const modifierId of state.weeklyModifierIds) {
      const modifier = this.content.modifiers.find((entry) => entry.id === modifierId);
      if (modifier?.effects.scoreMultiplier) {
        scoreBonus = Math.floor(scoreBonus * modifier.effects.scoreMultiplier);
      }
      if (modifier?.effects.lootLuck) {
        state.lootLuck += modifier.effects.lootLuck;
      }
    }
    return { scoreBonus, growthBonus, shieldTicks };
  }

  private computeLootLuck(state: StarforgedRuntimeState): number {
    const equipped = this.getEquippedDefinitions(state);
    const gearLuck = equipped.reduce(
      (sum, gear) => sum + (gear.rarity === 'exotic' ? 4 : gear.rarity === 'mythic' ? 6 : 1),
      0,
    );
    const modifierLuck = state.weeklyModifierIds.reduce((sum, id) => {
      const modifier = this.content.modifiers.find((entry) => entry.id === id);
      return sum + (modifier?.effects.lootLuck ?? 0);
    }, 0);
    return gearLuck + modifierLuck;
  }

  private getAbilityRecharge(state: StarforgedRuntimeState): number {
    const subclass = this.content.subclasses.find((entry) => entry.id === state.loadout.subclassId);
    const modifierRecharge = state.weeklyModifierIds.reduce((sum, id) => {
      const modifier = this.content.modifiers.find((entry) => entry.id === id);
      return sum + (modifier?.effects.abilityRecharge ?? 0);
    }, 0);
    return (subclass?.passive.abilityRecharge ?? 0) + modifierRecharge;
  }

  private ensureActivityProgress(
    state: StarforgedRuntimeState,
    activityId: string,
  ): StarforgedActivityProgress {
    state.activityProgress[activityId] ??= {
      activityId,
      objectiveProgress: 0,
      encountersCleared: 0,
      completions: 0,
      streak: 0,
    };
    return state.activityProgress[activityId];
  }

  private copyState(target: StarforgedRuntimeState, source: StarforgedRuntimeState): void {
    for (const key of Object.keys(target) as Array<keyof StarforgedRuntimeState>) {
      delete target[key];
    }
    Object.assign(target, source);
  }

  private hash(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }
}
