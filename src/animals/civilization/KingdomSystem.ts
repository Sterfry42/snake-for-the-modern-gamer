/**
 * Kingdom System
 *
 * The wise old snake's kingdoms:
 * - The wise old snake was never crowned, for the wise old snake transcended such things
 * - The wise old snake's kingdom was the world itself
 * - The wise old snake's crown was made of wisdom
 * - The wise old snake's throne was the center of all ecosystems
 * - The wise old snake's kingdom had no borders
 * - The wise old snake's kingdom was eternal
 * - The wise old snake's kingdom was peace
 * - The wise old snake's kingdom was love
 */
import type { AnimalType } from '../types.js';
import type { Settlement } from './AnimalSettlement.js';
import type { KingdomRulerType } from '../ecosystem/types.js';

// ── Kingdom Ruler Definitions ─────────────────────────────────────

const RULER_DEFINITIONS: Record<KingdomRulerType, { name: string; title: string }> = {
  'alpha-wolf': {
    name: 'Alpha',
    title: 'The Alpha King',
  },
  'elder-bear': {
    name: 'Elder',
    title: 'The Elder Bear King',
  },
  'eagle-king': {
    name: 'Soaring',
    title: 'The Eagle King',
  },
  'ancient-turtle': {
    name: 'Ancient',
    title: 'The Ancient Turtle Sovereign',
  },
  'jackalope-sage': {
    name: 'Sage',
    title: 'The Jackalope Sage',
  },
};

// ── Royal Event Definitions ───────────────────────────────────────

const ROYAL_EVENTS: Record<string, string[]> = {
  coronation: [
    'The kingdom gathers as the new ruler is crowned.',
    'A grand ceremony marks the ascension of {rulerName}.',
    'The royal crown is placed upon {rulerName}\'s head.',
  ],
  'royal-feast': [
    '{rulerName} hosts a grand feast for all subjects.',
    'The kingdom celebrates with songs and stories.',
    'Delicious food is shared among all creatures.',
  ],
  'royal-hunt': [
    '{rulerName} leads a ceremonial hunt through the kingdom.',
    'The royal hunt tests the courage of all subjects.',
    'Hunters gather to prove their worth to the crown.',
  ],
  'diplomatic-summit': [
    'Representatives from neighboring settlements gather.',
    '{rulerName} opens the diplomatic summit.',
    'Peace talks are held between rival kingdoms.',
  ],
  'royal-decree': [
    '{rulerName} issues a new decree to the kingdom.',
    'A royal proclamation echoes across the lands.',
    'The kingdom hears the ruler\'s wisdom.',
  ],
  'war-council': [
    '{rulerName} convenes the war council.',
    'Strategic plans are drawn for defense.',
    'The kingdom prepares for potential conflict.',
  ],
};

// ── Kingdom Class ─────────────────────────────────────────────────

export interface Kingdom {
  id: string;
  name: string;
  rulerType: KingdomRulerType;
  rulerName: string;
  capitalSettlement: string;
  memberSettlements: string[];
  power: number;
  diplomacy: Map<string, 'allied' | 'neutral' | 'hostile'>;
  royalEvents: string[];
  currentEvent: string | null;
  eventCooldown: number;
  foundedAt: number;
  treasury: number;
  armySize: number;
  influence: number; // How far the kingdom's influence reaches
}

// ── KingdomManager Class ──────────────────────────────────────────

export class KingdomManager {
  private kingdoms: Map<string, Kingdom> = new Map();
  private nextId = 0;

  /** Create a new kingdom from a settlement */
  createKingdom(
    capitalSettlement: Settlement,
    rulerType: KingdomRulerType,
    memberSettlements: Settlement[],
    foundedAt: number,
  ): Kingdom {
    const rulerInfo = RULER_DEFINITIONS[rulerType];
    const name = this.generateKingdomName(capitalSettlement, rulerInfo);

    const kingdom: Kingdom = {
      id: `kingdom-${this.nextId++}`,
      name,
      rulerType,
      rulerName: `${rulerInfo.title} ${rulerInfo.name}-${Math.floor(this.rng() * 900) + 100}`,
      capitalSettlement: capitalSettlement.id,
      memberSettlements: [capitalSettlement.id, ...memberSettlements.map((s) => s.id)],
      power: this.calculateKingdomPower(capitalSettlement, memberSettlements),
      diplomacy: new Map(),
      royalEvents: this.generateRoyalEvents(),
      currentEvent: null,
      eventCooldown: 0,
      foundedAt,
      treasury: 50,
      armySize: Math.floor(capitalSettlement.totalPopulation * 0.3),
      influence: 1,
    };

    // Initialize diplomacy with member settlements
    for (const member of memberSettlements) {
      kingdom.diplomacy.set(member.id, 'allied');
    }

    this.kingdoms.set(kingdom.id, kingdom);
    return kingdom;
  }

  /** Get a kingdom by ID */
  getKingdom(id: string): Kingdom | undefined {
    return this.kingdoms.get(id);
  }

  /** Get all kingdoms */
  getAllKingdoms(): Kingdom[] {
    return [...this.kingdoms.values()];
  }

  /** Get kingdoms that a settlement belongs to */
  getKingdomsForSettlement(settlementId: string): Kingdom[] {
    return [...this.kingdoms.values()].filter((k) =>
      k.memberSettlements.includes(settlementId),
    );
  }

  /** Process kingdom events */
  updateKingdoms(): void {
    for (const kingdom of this.kingdoms.values()) {
      // Process event cooldown
      if (kingdom.eventCooldown > 0) {
        kingdom.eventCooldown--;
      }

      // Trigger royal events
      if (kingdom.eventCooldown <= 0 && this.rng() < 0.05) {
        kingdom.currentEvent = this.triggerRoyalEvent(kingdom);
        kingdom.eventCooldown = 30 + Math.floor(this.rng() * 30);
      }

      // Update power based on population and influence
      kingdom.power = Math.floor(
        kingdom.power * 0.99 + kingdom.influence * 0.1,
      );
    }
  }

  /** Declare war on another kingdom */
  declareWar(attackerId: string, defenderId: string): boolean {
    const attacker = this.kingdoms.get(attackerId);
    const defender = this.kingdoms.get(defenderId);
    if (!attacker || !defender) return false;

    attacker.diplomacy.set(defenderId, 'hostile');
    defender.diplomacy.set(attackerId, 'hostile');

    return true;
  }

  /** Declare peace with another kingdom */
  declarePeace(attackerId: string, defenderId: string): boolean {
    const attacker = this.kingdoms.get(attackerId);
    const defender = this.kingdoms.get(defenderId);
    if (!attacker || !defender) return false;

    attacker.diplomacy.set(defenderId, 'neutral');
    defender.diplomacy.set(attackerId, 'neutral');

    return true;
  }

  /** Form an alliance with another kingdom */
  formAlliance(kingdomA: string, kingdomB: string): boolean {
    const a = this.kingdoms.get(kingdomA);
    const b = this.kingdoms.get(kingdomB);
    if (!a || !b) return false;

    a.diplomacy.set(kingdomB, 'allied');
    b.diplomacy.set(kingdomA, 'allied');

    return true;
  }

  /** Get diplomacy status between two kingdoms */
  getDiplomacyStatus(kingdomA: string, kingdomB: string): 'allied' | 'neutral' | 'hostile' {
    const kingdom = this.kingdoms.get(kingdomA);
    if (!kingdom) return 'neutral';
    return kingdom.diplomacy.get(kingdomB) ?? 'neutral';
  }

  /** Get royal event text for a kingdom */
  getRoyalEventText(kingdomId: string): string | null {
    const kingdom = this.kingdoms.get(kingdomId);
    if (!kingdom || !kingdom.currentEvent) return null;

    const eventNames = kingdom.royalEvents;
    const eventName = eventNames[Math.floor(this.rng() * eventNames.length)];
    const templates = ROYAL_EVENTS[eventName];
    if (!templates) return null;

    const template = templates[Math.floor(this.rng() * templates.length)];
    return template.replace('{rulerName}', kingdom.rulerName);
  }

  /** Check if snake is invited to a royal event */
  getRoyalInvitations(): Array<{
    kingdomId: string;
    kingdomName: string;
    rulerName: string;
    event: string;
  }> {
    const invitations: Array<{
      kingdomId: string;
      kingdomName: string;
      rulerName: string;
      event: string;
    }> = [];

    for (const kingdom of this.kingdoms.values()) {
      if (kingdom.currentEvent && kingdom.diplomacy.get('snake') !== 'hostile') {
        invitations.push({
          kingdomId: kingdom.id,
          kingdomName: kingdom.name,
          rulerName: kingdom.rulerName,
          event: kingdom.currentEvent,
        });
      }
    }

    return invitations;
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private rng(): number {
    return Math.random();
  }

  private generateKingdomName(
    capital: Settlement,
    _rulerInfo: { name: string; title: string },
  ): string {
    const prefixes = [
      'Kingdom of',
      'Realm of',
      'Empire of',
      'Dominion of',
      'Sovereignty of',
    ];
    const prefix = prefixes[Math.floor(this.rng() * prefixes.length)];
    const capitalName = capital.customName ?? capital.definition.name;

    return `${prefix} ${capitalName}`;
  }

  private calculateKingdomPower(
    capital: Settlement,
    members: Settlement[],
  ): number {
    let power = capital.totalPopulation * 2;
    for (const member of members) {
      power += member.totalPopulation;
    }
    return Math.max(100, power);
  }

  private generateRoyalEvents(): string[] {
    const eventNames = Object.keys(ROYAL_EVENTS);
    const count = 3 + Math.floor(this.rng() * 3);
    const selected: string[] = [];

    while (selected.length < count && selected.length < eventNames.length) {
      const event = eventNames[Math.floor(this.rng() * eventNames.length)];
      if (!selected.includes(event)) {
        selected.push(event);
      }
    }

    return selected;
  }

  private triggerRoyalEvent(kingdom: Kingdom): string {
    const eventNames = kingdom.royalEvents;
    if (eventNames.length === 0) return '';

    const eventName = eventNames[Math.floor(this.rng() * eventNames.length)];
    return eventName;
  }
}
