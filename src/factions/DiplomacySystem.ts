/**
 * Diplomacy System
 *
 * Handles alliances, treaties, and negotiation between factions for the
 * Faction Wars & Territory Control feature.
 */
import type { FactionEventSystem } from './factionEvents.js';
import type {
  DiplomaticRelation,
  DiplomaticTreaty,
  TreatyProvision,
  WarEventState,
} from './territoryTypes.js';
import { TerritoryManager } from './TerritoryManager.js';

// ─── Negotiation Result ──────────────────────────────────────────────────────

export interface NegotiationResult {
  success: boolean;
  newRelation: DiplomaticRelation;
  treaty?: DiplomaticTreaty;
  /** Reason for failure (if any). */
  failureReason?: string;
  /** Relation change delta. */
  relationDelta: number;
}

// ─── Diplomacy System Class ──────────────────────────────────────────────────

export class DiplomacySystem {
  private treaties: DiplomaticTreaty[] = [];
  private relationMap: Map<string, DiplomaticRelation> = new Map();

  constructor(
    private readonly territoryManager: TerritoryManager,
    private readonly factionEventSystem?: FactionEventSystem,
  ) {}

  // ─── Relation Management ───────────────────────────────────────────────────

  getRelation(factionA: string, factionB: string): DiplomaticRelation {
    const key = this.relationKey(factionA, factionB);
    return this.relationMap.get(key) ?? 'neutral';
  }

  setRelation(factionA: string, factionB: string, relation: DiplomaticRelation): void {
    const key = this.relationKey(factionA, factionB);
    this.relationMap.set(key, relation);
  }

  getAllRelations(): Map<string, DiplomaticRelation> {
    return new Map(this.relationMap);
  }

  getFactionsWithRelation(factionId: string): Map<string, DiplomaticRelation> {
    const result = new Map<string, DiplomaticRelation>();
    for (const [key, relation] of this.relationMap) {
      if (key.includes(factionId)) {
        const otherFaction = key.replace(factionId, '').replace(':', '');
        result.set(otherFaction, relation);
      }
    }
    return result;
  }

  // ─── Treaty Management ─────────────────────────────────────────────────────

  getTreaty(id: string): DiplomaticTreaty | undefined {
    return this.treaties.find((t) => t.id === id);
  }

  getActiveTreaties(): DiplomaticTreaty[] {
    return this.treaties.filter((t) => t.status === 'active');
  }

  getTreatiesByFaction(factionId: string): DiplomaticTreaty[] {
    return this.treaties.filter(
      (t) =>
        t.signatoryFactionIds.includes(factionId) && t.status === 'active',
    );
  }

  getAllTreaties(): DiplomaticTreaty[] {
    return [...this.treaties];
  }

  // ─── Alliance Formation ────────────────────────────────────────────────────

  /**
   * Form an alliance between two factions.
   */
  formAlliance(input: {
    factionA: string;
    factionB: string;
    provisions?: TreatyProvision[];
    expiresAt?: number;
  }): NegotiationResult {
    const { factionA, factionB, provisions = [], expiresAt } = input;

    // Check if already allied
    const currentRelation = this.getRelation(factionA, factionB);
    if (currentRelation === 'allied') {
      return {
        success: false,
        newRelation: 'allied',
        relationDelta: 0,
        failureReason: 'Factions are already allied.',
      };
    }

    // Check if at war
    if (currentRelation === 'war') {
      return {
        success: false,
        newRelation: 'war',
        relationDelta: 0,
        failureReason: 'Cannot form alliance while at war.',
      };
    }

    // Form alliance
    this.setRelation(factionA, factionB, 'allied');
    this.setRelation(factionB, factionA, 'allied');

    const treaty: DiplomaticTreaty = {
      id: `treaty:${factionA}:${factionB}:${Date.now()}`,
      signatoryFactionIds: [factionA, factionB],
      treatyType: 'alliance',
      status: 'active',
      signedAt: Date.now(),
      expiresAt,
      provisions,
      sabotageable: true,
    };

    this.treaties.push(treaty);

    // Create war event
    this.territoryManager.createWarEvent({
      type: 'alliance-formed',
      factionIds: [factionA, factionB],
      territoryIds: [],
      severity: 20,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${factionA} and ${factionB} have formed an alliance.`,
      tags: ['alliance', 'formed'],
    });

    // Notify faction event system
    if (this.factionEventSystem) {
      this.factionEventSystem.createEvent({
        type: 'inspection',
        factionIds: [factionA, factionB],
        severity: 15,
        createdAt: Date.now(),
        summary: `${factionA} and ${factionB} have joined forces.`,
        tags: ['diplomacy', 'alliance'],
      });
    }

    return {
      success: true,
      newRelation: 'allied',
      treaty,
      relationDelta: 30,
    };
  }

  // ─── Non-Aggression Pact ───────────────────────────────────────────────────

  /**
   * Sign a non-aggression pact between two factions.
   */
  signNonAggressionPact(input: {
    factionA: string;
    factionB: string;
    expiresAt?: number;
  }): NegotiationResult {
    const { factionA, factionB, expiresAt } = input;

    const currentRelation = this.getRelation(factionA, factionB);
    if (currentRelation === 'non-aggression') {
      return {
        success: false,
        newRelation: 'non-aggression',
        relationDelta: 0,
        failureReason: 'Non-aggression pact already exists.',
      };
    }

    this.setRelation(factionA, factionB, 'non-aggression');
    this.setRelation(factionB, factionA, 'non-aggression');

    const treaty: DiplomaticTreaty = {
      id: `treaty:${factionA}:${factionB}:na:${Date.now()}`,
      signatoryFactionIds: [factionA, factionB],
      treatyType: 'non-aggression',
      status: 'active',
      signedAt: Date.now(),
      expiresAt,
      provisions: [],
      sabotageable: true,
    };

    this.treaties.push(treaty);

    this.territoryManager.createWarEvent({
      type: 'ceasefire',
      factionIds: [factionA, factionB],
      territoryIds: [],
      severity: 10,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${factionA} and ${factionB} have agreed to a non-aggression pact.`,
      tags: ['ceasefire', 'non-aggression'],
    });

    return {
      success: true,
      newRelation: 'non-aggression',
      treaty,
      relationDelta: 20,
    };
  }

  // ─── Trade Pact ────────────────────────────────────────────────────────────

  /**
   * Establish a trade pact between two factions.
   */
  establishTradePact(input: {
    factionA: string;
    factionB: string;
    resourceTypes?: string[];
    expiresAt?: number;
  }): NegotiationResult {
    const { factionA, factionB, resourceTypes = ['food', 'mineral'], expiresAt } = input;

    const currentRelation = this.getRelation(factionA, factionB);
    if (currentRelation === 'trade-pact') {
      return {
        success: false,
        newRelation: 'trade-pact',
        relationDelta: 0,
        failureReason: 'Trade pact already exists.',
      };
    }

    this.setRelation(factionA, factionB, 'trade-pact');
    this.setRelation(factionB, factionA, 'trade-pact');

    const treaty: DiplomaticTreaty = {
      id: `treaty:${factionA}:${factionB}:trade:${Date.now()}`,
      signatoryFactionIds: [factionA, factionB],
      treatyType: 'trade-pact',
      status: 'active',
      signedAt: Date.now(),
      expiresAt,
      provisions: [
        {
          type: 'resource-sharing',
          parameters: { resourceTypes: resourceTypes.join(','), shareRate: 0.3 },
        },
      ],
      sabotageable: true,
    };

    this.treaties.push(treaty);

    this.territoryManager.createWarEvent({
      type: 'diplomatic-summit',
      factionIds: [factionA, factionB],
      territoryIds: [],
      severity: 10,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${factionA} and ${factionB} have established a trade pact.`,
      tags: ['trade', 'pact'],
    });

    return {
      success: true,
      newRelation: 'trade-pact',
      treaty,
      relationDelta: 15,
    };
  }

  // ─── Mutual Defense Pact ───────────────────────────────────────────────────

  /**
   * Establish a mutual defense pact between two factions.
   */
  establishMutualDefense(input: {
    factionA: string;
    factionB: string;
    expiresAt?: number;
  }): NegotiationResult {
    const { factionA, factionB, expiresAt } = input;

    const currentRelation = this.getRelation(factionA, factionB);
    if (currentRelation === 'allied') {
      return {
        success: false,
        newRelation: 'allied',
        relationDelta: 0,
        failureReason: 'Factions are already allied.',
      };
    }

    this.setRelation(factionA, factionB, 'allied');
    this.setRelation(factionB, factionA, 'allied');

    const treaty: DiplomaticTreaty = {
      id: `treaty:${factionA}:${factionB}:defense:${Date.now()}`,
      signatoryFactionIds: [factionA, factionB],
      treatyType: 'mutual-defense',
      status: 'active',
      signedAt: Date.now(),
      expiresAt,
      provisions: [
        {
          type: 'joint-operations',
          parameters: { autoDefend: true, responseTime: 2 },
        },
      ],
      sabotageable: true,
    };

    this.treaties.push(treaty);

    this.territoryManager.createWarEvent({
      type: 'alliance-formed',
      factionIds: [factionA, factionB],
      territoryIds: [],
      severity: 25,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${factionA} and ${factionB} have signed a mutual defense pact.`,
      tags: ['alliance', 'defense'],
    });

    return {
      success: true,
      newRelation: 'allied',
      treaty,
      relationDelta: 25,
    };
  }

  // ─── War Declaration ───────────────────────────────────────────────────────

  /**
   * Declare war on another faction.
   */
  declareWar(input: {
    factionA: string;
    factionB: string;
    territoryId?: string;
    reason?: string;
  }): NegotiationResult {
    const { factionA, factionB, territoryId, reason } = input;

    const currentRelation = this.getRelation(factionA, factionB);

    // Break any existing treaties
    this.breakTreatiesForFaction(factionA, factionB);

    this.setRelation(factionA, factionB, 'war');
    this.setRelation(factionB, factionA, 'war');

    const territoryIds = territoryId ? [territoryId] : [];

    this.territoryManager.createWarEvent({
      type: 'war-declared',
      factionIds: [factionA, factionB],
      territoryIds,
      severity: 80,
      phase: 'brewing',
      createdAt: Date.now(),
      summary: reason
        ? `${factionA} has declared war on ${factionB}. ${reason}`
        : `${factionA} has declared war on ${factionB}.`,
      tags: ['war', 'declared'],
    });

    return {
      success: true,
      newRelation: 'war',
      relationDelta: -50,
    };
  }

  // ─── Peace Treaty ──────────────────────────────────────────────────────────

  /**
   * Negotiate a peace treaty.
   */
  negotiatePeace(input: {
    factionA: string;
    factionB: string;
    territoryIds?: string[];
    cessionTerritoryId?: string;
  }): NegotiationResult {
    const { factionA, factionB, territoryIds = [], cessionTerritoryId } = input;

    const currentRelation = this.getRelation(factionA, factionB);
    if (currentRelation !== 'war') {
      return {
        success: false,
        newRelation: currentRelation,
        relationDelta: 0,
        failureReason: 'Factions are not at war.',
      };
    }

    // Handle territory cession if any
    if (cessionTerritoryId) {
      const ownership = this.territoryManager.getOwnership(cessionTerritoryId);
      if (ownership?.controllingFactionId === factionA) {
        this.territoryManager.shiftControl(
          cessionTerritoryId,
          factionB,
          factionA,
          100,
          'diplomacy',
        );
      }
    }

    this.setRelation(factionA, factionB, 'neutral');
    this.setRelation(factionB, factionA, 'neutral');

    // Cancel war treaties
    for (const treaty of this.treaties) {
      if (
        treaty.signatoryFactionIds.includes(factionA) &&
        treaty.signatoryFactionIds.includes(factionB)
      ) {
        treaty.status = 'expired';
      }
    }

    this.territoryManager.createWarEvent({
      type: 'peace-treaty',
      factionIds: [factionA, factionB],
      territoryIds,
      severity: 5,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: `${factionA} and ${factionB} have signed a peace treaty.`,
      tags: ['peace', 'treaty'],
    });

    return {
      success: true,
      newRelation: 'neutral',
      relationDelta: 20,
    };
  }

  // ─── Treaty Breaking ───────────────────────────────────────────────────────

  /**
   * Break a treaty (with consequences).
   */
  breakTreaty(input: {
    treatyId: string;
    breakingFactionId: string;
    sabotage?: boolean;
  }): NegotiationResult {
    const { treatyId, breakingFactionId, sabotage = false } = input;

    const treaty = this.getTreaty(treatyId);
    if (!treaty) {
      return {
        success: false,
        newRelation: 'neutral',
        relationDelta: 0,
        failureReason: 'Treaty not found.',
      };
    }

    if (!treaty.signatoryFactionIds.includes(breakingFactionId)) {
      return {
        success: false,
        newRelation: 'neutral',
        relationDelta: 0,
        failureReason: `${breakingFactionId} is not a signatory of this treaty.`,
      };
    }

    if (treaty.status !== 'active') {
      return {
        success: false,
        newRelation: treaty.status as DiplomaticRelation,
        relationDelta: 0,
        failureReason: `Treaty is already ${treaty.status}.`,
      };
    }

    treaty.status = 'broken';

    // Determine the other signatory
    const otherFaction = treaty.signatoryFactionIds.find((f) => f !== breakingFactionId);
    if (!otherFaction) {
      return {
        success: true,
        newRelation: 'neutral',
        relationDelta: -10,
      };
    }

    // Set relation based on whether it was sabotage
    const newRelation = sabotage ? 'war' : 'tense';
    this.setRelation(breakingFactionId, otherFaction, newRelation);
    this.setRelation(otherFaction, breakingFactionId, newRelation);

    // Create war event
    this.territoryManager.createWarEvent({
      type: 'betrayal',
      factionIds: [breakingFactionId, otherFaction],
      territoryIds: [],
      severity: sabotage ? 60 : 30,
      phase: 'aftermath',
      createdAt: Date.now(),
      summary: sabotage
        ? `${breakingFactionId} sabotaged the treaty with ${otherFaction}.`
        : `${breakingFactionId} has broken the treaty with ${otherFaction}.`,
      tags: ['betrayal', 'treaty-broken'],
    });

    return {
      success: true,
      newRelation,
      relationDelta: -40,
    };
  }

  private breakTreatiesForFaction(factionA: string, factionB: string): void {
    for (const treaty of this.treaties) {
      if (
        treaty.signatoryFactionIds.includes(factionA) &&
        treaty.signatoryFactionIds.includes(factionB)
      ) {
        treaty.status = 'broken';
      }
    }
  }

  // ─── Negotiation ───────────────────────────────────────────────────────────

  /**
   * Attempt to negotiate with another faction.
   * Success depends on current relation, player influence, and territory control.
   */
  negotiate(input: {
    fromFaction: string;
    toFaction: string;
    goal: 'improve-relation' | 'form-alliance' | 'declare-peace' | 'trade-pact';
    playerInfluence?: number;
    bribeAmount?: number;
  }): NegotiationResult {
    const {
      fromFaction,
      toFaction,
      goal,
      playerInfluence = 0,
      bribeAmount = 0,
    } = input;

    const currentRelation = this.getRelation(fromFaction, toFaction);
    const relationModifier = this.relationModifier(currentRelation);
    const influenceModifier = Math.min(30, playerInfluence / 10);
    const bribeModifier = Math.min(20, bribeAmount / 5);
    const successChance = 0.5 + relationModifier * 0.1 + influenceModifier * 0.01 + bribeModifier * 0.01;

    const success = Math.random() < successChance;

    if (!success) {
      return {
        success: false,
        newRelation: currentRelation,
        relationDelta: -5,
        failureReason: this.randomFailureReason(goal, currentRelation),
      };
    }

    let newRelation: DiplomaticRelation = currentRelation;
    let treaty: DiplomaticTreaty | undefined;

    switch (goal) {
      case 'improve-relation':
        newRelation = this.advanceRelation(currentRelation);
        break;
      case 'form-alliance':
        const allianceResult = this.formAlliance({ factionA: fromFaction, factionB: toFaction });
        return allianceResult;
      case 'declare-peace':
        const peaceResult = this.negotiatePeace({ factionA: fromFaction, factionB: toFaction });
        return peaceResult;
      case 'trade-pact':
        const tradeResult = this.establishTradePact({ factionA: fromFaction, factionB: toFaction });
        return tradeResult;
    }

    this.setRelation(fromFaction, toFaction, newRelation);
    this.setRelation(toFaction, fromFaction, newRelation);

    return {
      success: true,
      newRelation,
      treaty,
      relationDelta: 10,
    };
  }

  private relationModifier(relation: DiplomaticRelation): number {
    switch (relation) {
      case 'allied':
        return 2;
      case 'non-aggression':
      case 'trade-pact':
        return 1;
      case 'neutral':
        return 0;
      case 'tense':
        return -1;
      case 'sanctions':
      case 'embargo':
        return -2;
      case 'war':
        return -3;
    }
  }

  private advanceRelation(relation: DiplomaticRelation): DiplomaticRelation {
    switch (relation) {
      case 'war':
        return 'tense';
      case 'sanctions':
      case 'embargo':
        return 'tense';
      case 'tense':
        return 'neutral';
      case 'neutral':
        return 'friendly' as DiplomaticRelation;
      case 'friendly' as DiplomaticRelation:
        return 'non-aggression' as DiplomaticRelation;
      case 'non-aggression':
        return 'trade-pact' as DiplomaticRelation;
      case 'trade-pact':
        return 'allied' as DiplomaticRelation;
      default:
        return relation;
    }
  }

  private randomFailureReason(goal: string, currentRelation: DiplomaticRelation): string {
    const reasons: Record<string, string[]> = {
      'improve-relation': [
        'The other faction is not interested in improving relations.',
        'Diplomatic efforts have been rebuffed.',
        'The other faction demands more concessions.',
      ],
      'form-alliance': [
        'The other faction refuses to ally.',
        'Trust is too low for an alliance.',
        'The other faction has its own plans.',
      ],
      'declare-peace': [
        'The other faction wants to continue the fight.',
        'Peace terms are unacceptable.',
        'The other faction believes they can win.',
      ],
      'trade-pact': [
        'The other faction refuses to trade.',
        'Trade terms are disputed.',
        'The other faction has no surplus to trade.',
      ],
    };

    const factionReasons = reasons[goal] ?? ['Negotiations have broken down.'];
    return factionReasons[Math.floor(Math.random() * factionReasons.length)];
  }

  // ─── Treaty Expiry Check ───────────────────────────────────────────────────

  /**
   * Check and update expired treaties.
   */
  checkExpiries(currentTime: number): void {
    for (const treaty of this.treaties) {
      if (treaty.status !== 'active') continue;
      if (!treaty.expiresAt) continue;
      if (currentTime > treaty.expiresAt) {
        treaty.status = 'expired';

        // Reset relations to neutral
        if (treaty.signatoryFactionIds.length === 2) {
          const [a, b] = treaty.signatoryFactionIds;
          const current = this.getRelation(a, b);
          if (current === 'allied') {
            this.setRelation(a, b, 'neutral');
            this.setRelation(b, a, 'neutral');
          }
        }
      }
    }
  }

  // ─── Save / Load ───────────────────────────────────────────────────────────

  save(): { treaties: DiplomaticTreaty[]; relations: [string, DiplomaticRelation][] } {
    return {
      treaties: this.treaties,
      relations: [...this.relationMap],
    };
  }

  load(data: { treaties: DiplomaticTreaty[]; relations: [string, DiplomaticRelation][] }): void {
    this.treaties = data.treaties;
    this.relationMap.clear();
    for (const [key, relation] of data.relations) {
      this.relationMap.set(key, relation);
    }
  }

  private relationKey(a: string, b: string): string {
    return [a, b].sort().join(':');
  }
}
