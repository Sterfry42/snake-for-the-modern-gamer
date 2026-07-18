/**
 * Serpent Faction
 *
 * Player's own faction management: "The Serpent's Coil".
 * Handles follower recruitment, mission assignment, territory management,
 * and faction progression.
 */
import type {
  FollowerRole,
  FollowerState,
  FollowerStatus,
  MissionObjective,
  MissionRewards,
  SerpentFactionState,
  SerpentMission,
} from './territoryTypes.js';
import { TerritoryManager } from './TerritoryManager.js';

// ─── Mission Templates ───────────────────────────────────────────────────────

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  type: SerpentMission['type'];
  difficulty: number;
  defaultObjectives: Array<{ type: MissionObjective['type']; target: string; required: number }>;
  defaultRewards: Omit<MissionRewards, 'uniqueItems'> & { uniqueItems?: string[] };
  minFollowers: number;
  requiredRole?: FollowerRole;
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'scout-forest',
    title: 'Scout the Forest',
    description: 'Send followers to scout a forest territory for resources and threats.',
    type: 'scout',
    difficulty: 3,
    defaultObjectives: [
      { type: 'gather-resources', target: 'forest-resources', required: 5 },
      { type: 'spy-on-enemy', target: 'forest-enemies', required: 2 },
    ],
    defaultRewards: { influence: 20, xp: 30, loyaltyBonus: 5 },
    minFollowers: 2,
    requiredRole: 'scout',
  },
  {
    id: 'attack-cave',
    title: 'Assault the Caverns',
    description: 'Launch an attack on enemy-controlled cave territory.',
    type: 'attack',
    difficulty: 7,
    defaultObjectives: [
      { type: 'defeat-enemies', target: 'cave-enemies', required: 10 },
      { type: 'capture-territory', target: 'cave-control', required: 50 },
    ],
    defaultRewards: { influence: 50, xp: 60, loyaltyBonus: 10 },
    minFollowers: 4,
    requiredRole: 'warrior',
  },
  {
    id: 'defend-plains',
    title: 'Defend the Golden Plains',
    description: 'Protect friendly territory from enemy incursions.',
    type: 'defense',
    difficulty: 5,
    defaultObjectives: [
      { type: 'defeat-enemies', target: 'invading-forces', required: 8 },
      { type: 'escort-unit', target: 'civilian-convoy', required: 1 },
    ],
    defaultRewards: { influence: 35, xp: 40, loyaltyBonus: 8 },
    minFollowers: 3,
    requiredRole: 'guard',
  },
  {
    id: 'trade-route',
    title: 'Establish Trade Route',
    description: 'Secure a trade route between friendly territories.',
    type: 'trade',
    difficulty: 4,
    defaultObjectives: [
      { type: 'gather-resources', target: 'trade-goods', required: 10 },
      { type: 'escort-unit', target: 'merchant-caravan', required: 1 },
    ],
    defaultRewards: { influence: 25, xp: 20, loyaltyBonus: 3 },
    minFollowers: 2,
    requiredRole: 'merchant',
  },
  {
    id: 'infiltrate-ruins',
    title: 'Infiltrate the Sunken Ruins',
    description: 'Sneak into enemy-held ruins to retrieve valuable artifacts.',
    type: 'infiltration',
    difficulty: 8,
    defaultObjectives: [
      { type: 'retrieve-item', target: 'ancient-artifact', required: 1 },
      { type: 'spy-on-enemy', target: 'ruin-guards', required: 3 },
    ],
    defaultRewards: { influence: 45, xp: 50, uniqueItems: ['ancient-tome', 'mystical-ward'] },
    minFollowers: 2,
    requiredRole: 'spy',
  },
  {
    id: 'escort-merchant',
    title: 'Escort the Merchant',
    description: 'Protect a merchant caravan through dangerous territory.',
    type: 'escort',
    difficulty: 4,
    defaultObjectives: [
      { type: 'defeat-enemies', target: 'bandits', required: 5 },
      { type: 'escort-unit', target: 'merchant', required: 1 },
    ],
    defaultRewards: { influence: 20, xp: 25, loyaltyBonus: 5 },
    minFollowers: 2,
    requiredRole: 'guard',
  },
  {
    id: 'recon-mountains',
    title: 'Reconnaissance of the Iron Peaks',
    description: 'Gather intelligence on enemy movements in the mountain territories.',
    type: 'reconnaissance',
    difficulty: 5,
    defaultObjectives: [
      { type: 'spy-on-enemy', target: 'mountain-garrisons', required: 4 },
      { type: 'gather-resources', target: 'mountain-signals', required: 3 },
    ],
    defaultRewards: { influence: 30, xp: 35 },
    minFollowers: 2,
    requiredRole: 'scout',
  },
];

// ─── Serpent Faction Class ───────────────────────────────────────────────────

export class SerpentFactionManager {
  private readonly state: SerpentFactionState;

  constructor(private readonly territoryManager: TerritoryManager) {
    this.state = this.territoryManager.getSerpentFaction();
  }

  // ─── Faction Status ────────────────────────────────────────────────────────

  establishSerpentFaction(headquartersRoomId?: string): void {
    this.territoryManager.establishSerpentFaction(headquartersRoomId);
  }

  isEstablished(): boolean {
    return this.state.established;
  }

  getFactionState(): SerpentFactionState {
    return { ...this.state };
  }

  getInfluence(): number {
    return this.state.influence;
  }

  canExpand(): boolean {
    return this.state.canExpand;
  }

  getControlledTerritories(): string[] {
    return [...this.state.controlledTerritoryIds];
  }

  // ─── Recruitment ───────────────────────────────────────────────────────────

  /**
   * Recruit a new follower into the Serpent's Coil.
   */
  recruitFollower(input: {
    sourceId: string;
    role: FollowerRole;
    specialAbility?: string;
  }): FollowerState {
    if (!this.state.established) {
      throw new Error("The Serpent's Coil must be established before recruiting.");
    }

    // Check if follower already exists
    const existing = this.state.followers.find((f) => f.sourceId === input.sourceId);
    if (existing) {
      throw new Error(`Follower ${input.sourceId} is already recruited.`);
    }

    return this.territoryManager.addFollower(input);
  }

  /**
   * Get all followers, optionally filtered by role or status.
   */
  getFollowers(filter?: {
    role?: FollowerRole;
    status?: FollowerStatus;
  }): FollowerState[] {
    let followers = [...this.state.followers];

    if (filter?.role) {
      followers = followers.filter((f) => f.role === filter.role);
    }
    if (filter?.status) {
      followers = followers.filter((f) => f.status === filter.status);
    }

    return followers;
  }

  getFollower(id: string): FollowerState | undefined {
    return this.state.followers.find((f) => f.id === id);
  }

  /**
   * Upgrade a follower's role.
   */
  upgradeFollowerRole(followerId: string, newRole: FollowerRole): void {
    const follower = this.getFollower(followerId);
    if (!follower) {
      throw new Error(`Follower ${followerId} not found.`);
    }

    const oldRole = follower.role;
    follower.role = newRole;

    // Adjust combat power based on new role
    if (newRole === 'warrior' || newRole === 'guard') {
      follower.combatPower = Math.max(follower.combatPower, 40);
    } else if (newRole === 'scout' || newRole === 'spy') {
      follower.combatPower = Math.max(follower.combatPower, 25);
    } else {
      follower.combatPower = Math.max(follower.combatPower, 20);
    }

    // Loyalty check
    if (follower.loyalty < 30) {
      // Low loyalty followers may refuse role changes
      if (Math.random() < 0.5) {
        follower.role = oldRole; // Revert
        throw new Error(`${follower.sourceId} refused the role change.`);
      }
    }
  }

  /**
   * Rest a follower to recover them from injuries.
   */
  restFollower(followerId: string): void {
    const follower = this.getFollower(followerId);
    if (!follower) {
      throw new Error(`Follower ${followerId} not found.`);
    }

    if (follower.status === 'on-mission') {
      throw new Error(`Cannot rest ${followerId} while on mission.`);
    }

    follower.status = 'resting';
    // Recovery happens during world tick
  }

  // ─── Missions ──────────────────────────────────────────────────────────────

  /**
   * Create a new mission from a template.
   */
  createMissionFromTemplate(
    templateId: string,
    options: {
      targetTerritoryId?: string;
      targetFactionId?: string;
      assignedFollowerIds: string[];
      deadline?: number;
    },
  ): SerpentMission {
    if (!this.state.established) {
      throw new Error("The Serpent's Coil must be established before assigning missions.");
    }

    const template = MISSION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new Error(`Mission template ${templateId} not found.`);
    }

    // Validate follower requirements
    const availableFollowers = this.state.followers.filter(
      (f) => f.status === 'idle' && !f.assignedMission,
    );

    if (availableFollowers.length < template.minFollowers) {
      throw new Error(
        `Not enough idle followers. Need ${template.minFollowers}, have ${availableFollowers.length}.`,
      );
    }

    if (template.requiredRole) {
      const hasRequiredRole = availableFollowers.some(
        (f) => f.role === template.requiredRole,
      );
      if (!hasRequiredRole) {
        throw new Error(
          `Need at least one follower with role ${template.requiredRole}.`,
        );
      }
    }

    // Validate assigned followers
    for (const followerId of options.assignedFollowerIds) {
      const follower = this.getFollower(followerId);
      if (!follower) {
        throw new Error(`Follower ${followerId} not found.`);
      }
      if (follower.status !== 'idle' || follower.assignedMission) {
        throw new Error(`Follower ${followerId} is not available for missions.`);
      }
    }

    const mission: SerpentMission = {
      id: `mission:${templateId}:${Date.now()}`,
      title: template.title,
      description: template.description,
      type: template.type,
      assignedFollowerIds: options.assignedFollowerIds,
      targetTerritoryId: options.targetTerritoryId,
      targetFactionId: options.targetFactionId,
      objectives: template.defaultObjectives.map((obj) => ({
        ...obj,
        progress: 0,
      })),
      status: 'active',
      rewards: { ...template.defaultRewards },
      startTime: Date.now(),
      deadline: options.deadline,
      difficulty: template.difficulty,
    };

    this.territoryManager.assignMission(mission);
    return mission;
  }

  /**
   * Get all active missions.
   */
  getActiveMissions(): SerpentMission[] {
    return [...this.state.activeMissions];
  }

  /**
   * Get available mission templates that the player can currently run.
   */
  getAvailableMissions(): MissionTemplate[] {
    const idleFollowers = this.state.followers.filter(
      (f) => f.status === 'idle' && !f.assignedMission,
    );

    return MISSION_TEMPLATES.filter((t) => {
      // Check if we have enough idle followers
      if (idleFollowers.length < t.minFollowers) return false;

      // Check if we have the required role
      if (t.requiredRole) {
        const hasRole = idleFollowers.some((f) => f.role === t.requiredRole);
        if (!hasRole) return false;
      }

      // Check difficulty vs average follower level
      const avgLevel =
        idleFollowers.reduce((sum, f) => sum + f.level, 0) / idleFollowers.length;
      if (t.difficulty > avgLevel + 3) return false;

      return true;
    });
  }

  /**
   * Cancel a mission.
   */
  cancelMission(missionId: string): void {
    const mission = this.state.activeMissions.find((m) => m.id === missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found.`);
    }

    // Release followers
    for (const followerId of mission.assignedFollowerIds) {
      const follower = this.getFollower(followerId);
      if (follower) {
        follower.status = 'idle';
        follower.assignedMission = undefined;
        // Small loyalty penalty for canceling
        follower.loyalty = Math.max(0, follower.loyalty - 5);
      }
    }

    mission.status = 'abandoned';
    // Remove from active missions
    this.state.activeMissions = this.state.activeMissions.filter((m) => m.id !== missionId);
  }

  // ─── Territory Expansion ───────────────────────────────────────────────────

  /**
   * Attempt to claim an unclaimed territory.
   */
  attemptClaimTerritory(territoryId: string): boolean {
    if (!this.state.established) return false;
    if (!this.state.canExpand) return false;

    const ownership = this.territoryManager.getOwnership(territoryId);
    if (!ownership || ownership.status !== 'unclaimed') return false;

    // Claiming costs influence
    const territory = this.territoryManager.getTerritory(territoryId);
    if (!territory) return false;

    const claimCost = Math.round(territory.strategicValue / 2);
    if (this.state.influence < claimCost) return false;

    // Claim the territory
    this.territoryManager.shiftControl(
      territoryId,
      'serpents-coil',
      'unclaimed',
      100,
      'diplomacy',
    );

    // Deduct influence cost
    this.state.influence = Math.max(0, this.state.influence - claimCost);

    return true;
  }

  /**
   * Send followers to contest a contested territory.
   */
  contestTerritory(territoryId: string, followerIds: string[]): boolean {
    if (!this.state.established) return false;

    const ownership = this.territoryManager.getOwnership(territoryId);
    if (!ownership || ownership.status !== 'contested') return false;

    // Validate followers
    const followers = followerIds
      .map((id) => this.getFollower(id))
      .filter((f): f is FollowerState => f !== undefined);

    if (followers.length === 0) return false;

    // Send followers on a mission
    const mission: SerpentMission = {
      id: `mission:contest:${territoryId}:${Date.now()}`,
      title: `Contest ${this.territoryManager.getTerritory(territoryId)?.name ?? territoryId}`,
      description: `Send followers to contest control of ${territoryId}.`,
      type: 'attack',
      assignedFollowerIds: followerIds,
      targetTerritoryId: territoryId,
      objectives: [
        { type: 'capture-territory', target: territoryId, progress: 0, required: 50 },
      ],
      status: 'active',
      rewards: { influence: 30, xp: 40, loyaltyBonus: 5 },
      startTime: Date.now(),
      difficulty: 5,
    };

    this.territoryManager.assignMission(mission);

    // Update follower statuses
    for (const follower of followers) {
      follower.status = 'on-mission';
      follower.assignedMission = mission.id;
    }

    return true;
  }

  // ─── Faction Progression ───────────────────────────────────────────────────

  /**
   * Calculate faction level based on influence.
   */
  getFactionLevel(): number {
    return Math.floor(this.state.influence / 100) + 1;
  }

  /**
   * Get next level threshold.
   */
  getNextLevelThreshold(): number {
    return this.getFactionLevel() * 100;
  }

  /**
   * Check if faction has unlocked an upgrade.
   */
  hasUnlockedUpgrade(upgradeId: string): boolean {
    const level = this.getFactionLevel();
    const upgrades: Record<string, number> = {
      'advanced-scouting': 2,
      'elite-warriors': 3,
      'diplomatic-corps': 4,
      'fortified-territories': 5,
      'mercenary-network': 6,
      'shadow-intelligence': 7,
      'grand-alliance': 8,
    };
    return level >= (upgrades[upgradeId] ?? 99);
  }

  // ─── Save / Load ───────────────────────────────────────────────────────────

  save(): SerpentFactionState {
    return { ...this.state };
  }

  load(data: SerpentFactionState): void {
    Object.assign(this.state, data);
  }
}
